import express from 'express';
import db, { localMemoryDb } from '../db/index.js';

const router = express.Router();

// 1. Fetch Ward Boundaries in Standard GeoJSON format
router.get('/ward-boundaries', async (req, res, next) => {
  try {
    if (db.isConnected()) {
      // Query PostGIS and compile polygons into a standard GeoJSON FeatureCollection
      const queryText = `
        SELECT wb.id, wb.ward_number, w.ward_name, w.population_census, w.area_sq_km,
               ST_AsGeoJSON(wb.geom)::json as geometry
        FROM ward_boundaries wb
        JOIN wards w ON wb.ward_id = w.id
      `;
      const result = await db.query(queryText);
      
      const features = result.rows.map(row => ({
        type: 'Feature',
        id: row.id,
        properties: {
          ward_number: row.ward_number,
          ward_name: row.ward_name,
          population: row.population_census,
          area_sq_km: row.area_sq_km
        },
        geometry: row.geometry
      }));

      return res.json({
        type: 'FeatureCollection',
        features
      });
    } else {
      // Return local memory ward boundaries
      const features = localMemoryDb.ward_boundaries.map(wb => {
        const ward = localMemoryDb.wards.find(w => w.id === wb.ward_id);
        return {
          ...wb.geojson,
          properties: {
            ...wb.geojson.properties,
            ward_number: wb.ward_number,
            ward_name: ward?.ward_name || `Ward ${wb.ward_number}`,
            population: ward?.population_census || 0,
            area_sq_km: ward?.area_sq_km || 0
          }
        };
      });

      return res.json({
        type: 'FeatureCollection',
        features
      });
    }
  } catch (error) {
    next(error);
  }
});

// 2. Fetch GIS Point Markers (Schools, Clinics, Incidents, Sightings)
router.get('/markers', async (req, res, next) => {
  const { layer } = req.query;

  try {
    if (db.isConnected()) {
      let queryText = '';
      let result = null;

      switch (layer) {
        case 'schools':
          queryText = 'SELECT id, name, type, street, ST_Y(geom) as lat, ST_X(geom) as lng FROM schools';
          break;
        case 'hospitals':
          queryText = 'SELECT id, name, type, street, ST_Y(geom) as lat, ST_X(geom) as lng FROM hospitals';
          break;
        case 'veterinary_centers':
          queryText = 'SELECT id, name, managed_by, ST_Y(geom) as lat, ST_X(geom) as lng FROM veterinary_centers';
          break;
        case 'markets':
          queryText = 'SELECT id, name, type, ST_Y(geom) as lat, ST_X(geom) as lng FROM markets';
          break;
        case 'parks':
          queryText = 'SELECT id, name, ST_Y(geom) as lat, ST_X(geom) as lng FROM parks';
          break;
        case 'sightings':
          queryText = 'SELECT id, sighting_id, ward_number, sex, age_class, ST_Y(geom) as lat, ST_X(geom) as lng FROM dog_population';
          break;
        case 'bites':
          queryText = 'SELECT id, incident_id, ward_number, street_name, bite_severity, ST_Y(geom) as lat, ST_X(geom) as lng FROM dog_bite_incidents';
          break;
        default:
          return res.status(400).json({ error: 'Valid layer parameter is required.' });
      }

      result = await db.query(queryText);
      return res.json(result.rows);

    } else {
      // In-Memory fallback returns
      if (['schools', 'hospitals', 'veterinary_centers', 'markets', 'parks', 'dog_population', 'dog_bite_incidents'].includes(layer === 'sightings' ? 'dog_population' : layer === 'bites' ? 'dog_bite_incidents' : layer)) {
        const memTable = layer === 'sightings' ? 'dog_population' : layer === 'bites' ? 'dog_bite_incidents' : layer;
        return res.json(localMemoryDb[memTable] || []);
      }
      return res.json([]);
    }
  } catch (error) {
    next(error);
  }
});

// 3. AI Proximity & Public Health Risk Scoring Engine
router.get('/risk-analysis', async (req, res, next) => {
  const schoolWeight = parseFloat(req.query.schoolWeight || 0.25);
  const marketWeight = parseFloat(req.query.marketWeight || 0.15);
  const vaccinationWeight = parseFloat(req.query.vaccinationWeight || 0.30);
  const populationWeight = parseFloat(req.query.populationWeight || 0.30);

  try {
    if (db.isConnected()) {
      // Runs spatial PostGIS joins to count dog populations, bites, and POIs in proximity (500m)
      // Risk calculated on real geography!
      const queryText = `
        SELECT 
          w.id as ward_id, 
          w.ward_number, 
          w.ward_name,
          COALESCE(pop.total_pop, 0) as population_count,
          COALESCE(bite.total_bites, 0) as bite_count,
          COALESCE(vac.total_vac, 0) as vaccinated_count,
          COALESCE(ster.total_ster, 0) as sterilized_count,
          -- Proximity infrastructure counts (within ward boundaries)
          COALESCE(sch.school_count, 0) as school_count,
          COALESCE(mkt.market_count, 0) as market_count
        FROM wards w
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_pop FROM dog_population GROUP BY ward_id) pop ON w.id = pop.ward_id
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_bites FROM dog_bite_incidents GROUP BY ward_id) bite ON w.id = bite.ward_id
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_vac FROM vaccination_records GROUP BY ward_id) vac ON w.id = vac.ward_id
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_ster FROM sterilization_records GROUP BY ward_id) ster ON w.id = ster.ward_id
        -- PostGIS spatial POI count intersections
        LEFT JOIN (
          SELECT wb.ward_id, COUNT(s.id) as school_count 
          FROM ward_boundaries wb 
          JOIN schools s ON ST_Intersects(wb.geom, s.geom)
          GROUP BY wb.ward_id
        ) sch ON w.id = sch.ward_id
        LEFT JOIN (
          SELECT wb.ward_id, COUNT(m.id) as market_count 
          FROM ward_boundaries wb 
          JOIN markets m ON ST_Intersects(wb.geom, m.geom)
          GROUP BY wb.ward_id
        ) mkt ON w.id = mkt.ward_id
        ORDER BY w.ward_number ASC
      `;

      const result = await db.query(queryText);
      const riskScores = computeRiskScores(result.rows, schoolWeight, marketWeight, vaccinationWeight, populationWeight);
      
      return res.json(riskScores);

    } else {
      // In-Memory Risk calculator based on uploaded memory state
      const rows = localMemoryDb.wards.map(ward => {
        const population_count = localMemoryDb.dog_population.filter(d => d.ward_id === ward.id).length;
        const bite_count = localMemoryDb.dog_bite_incidents.filter(d => d.ward_id === ward.id).length;
        const vaccinated_count = localMemoryDb.vaccination_records.filter(d => d.ward_id === ward.id).length;
        const sterilized_count = localMemoryDb.sterilization_records.filter(d => d.ward_id === ward.id).length;
        const school_count = localMemoryDb.schools.filter(s => s.ward_id === ward.id).length; // Simulated intersect
        const market_count = localMemoryDb.markets.filter(m => m.ward_id === ward.id).length;

        return {
          ward_id: ward.id,
          ward_number: ward.ward_number,
          ward_name: ward.ward_name,
          population_count,
          bite_count,
          vaccinated_count,
          sterilized_count,
          school_count,
          market_count
        };
      });

      const riskScores = computeRiskScores(rows, schoolWeight, marketWeight, vaccinationWeight, populationWeight);
      return res.json(riskScores);
    }
  } catch (error) {
    next(error);
  }
});

// Risk Calculation Formula Engine
function computeRiskScores(rows, schoolWeight, marketWeight, vaccinationWeight, populationWeight) {
  return rows.map(row => {
    const pop = parseInt(row.population_count, 10);
    const vac = parseInt(row.vaccinated_count, 10);
    const bites = parseInt(row.bite_count, 10);
    const schools = parseInt(row.school_count, 10);
    const markets = parseInt(row.market_count, 10);

    // Calculate vaccination coverage rate
    const vacRate = pop > 0 ? (vac / pop) : 1.0; // Assume 100% (ideal) if zero population logged
    const vacGap = Math.max(0, 0.70 - vacRate) / 0.70; // Target threshold is 70% (WHO Herd Immunity)

    // Normalize density factor (relative to 50 max sightings per ward in this system)
    const popFactor = Math.min(1.0, pop / 30);
    
    // Proximity Risk factor checks
    const schoolFactor = Math.min(1.0, schools / 3);
    const marketFactor = Math.min(1.0, markets / 2);

    // Dynamic AI Weight Formula
    let rawScore = (
      (schoolFactor * schoolWeight) +
      (marketFactor * marketWeight) +
      (vacGap * vaccinationWeight) +
      (popFactor * populationWeight)
    ) * 100;

    // Amplify slightly if active bites exist in the area (multiplier of severity)
    if (bites > 0) {
      rawScore += Math.min(15, bites * 3);
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Categorize
    let level = 'LOW';
    if (finalScore >= 70) level = 'CRITICAL';
    else if (finalScore >= 40) level = 'MODERATE';

    return {
      wardId: row.ward_id,
      wardNumber: row.ward_number,
      wardName: row.ward_name,
      score: finalScore,
      level,
      metrics: {
        populationCount: pop,
        biteCount: bites,
        vaccinatedCount: vac,
        sterilizedCount: parseInt(row.sterilized_count, 10),
        schoolCount: schools,
        marketCount: markets,
        vaccinationCoverage: Math.round(vacRate * 100)
      }
    };
  });
}

export default router;
