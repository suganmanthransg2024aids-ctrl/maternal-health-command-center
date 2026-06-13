import express from 'express';
import db, { localMemoryDb } from '../db/index.js';

const router = express.Router();

// 1. Get Aggregated Report Summary by Wards
router.get('/summary', async (req, res, next) => {
  const { reportType } = req.query; // 'WARD', 'STERILIZATION', 'VACCINATION', 'RISK'

  try {
    let reportData = [];

    if (db.isConnected()) {
      const queryText = `
        SELECT 
          w.ward_number,
          w.ward_name,
          w.population_census,
          COALESCE(pop.total_pop, 0) as population_count,
          COALESCE(ster.total_ster, 0) as sterilized_count,
          COALESCE(vac.total_vac, 0) as vaccinated_count,
          COALESCE(bite.total_bites, 0) as bite_count
        FROM wards w
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_pop FROM dog_population GROUP BY ward_id) pop ON w.id = pop.ward_id
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_ster FROM sterilization_records GROUP BY ward_id) ster ON w.id = ster.ward_id
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_vac FROM vaccination_records GROUP BY ward_id) vac ON w.id = vac.ward_id
        LEFT JOIN (SELECT ward_id, COUNT(*) as total_bites FROM dog_bite_incidents GROUP BY ward_id) bite ON w.id = bite.ward_id
        ORDER BY w.ward_number ASC
      `;
      const result = await db.query(queryText);
      reportData = result.rows.map(row => compileReportRow(row, reportType));
    } else {
      // Memory Fallback Aggregation
      reportData = localMemoryDb.wards.map(ward => {
        const population_count = localMemoryDb.dog_population.filter(d => d.ward_id === ward.id).length;
        const sterilized_count = localMemoryDb.sterilization_records.filter(s => s.ward_id === ward.id).length;
        const vaccinated_count = localMemoryDb.vaccination_records.filter(v => v.ward_id === ward.id).length;
        const bite_count = localMemoryDb.dog_bite_incidents.filter(b => b.ward_id === ward.id).length;

        const row = {
          ward_number: ward.ward_number,
          ward_name: ward.ward_name,
          population_census: ward.population_census,
          population_count,
          sterilized_count,
          vaccinated_count,
          bite_count
        };
        return compileReportRow(row, reportType);
      });
    }

    res.json({
      reportType,
      timestamp: new Date(),
      data: reportData
    });

  } catch (error) {
    next(error);
  }
});

// Helper: Compile Report Formatting Row
function compileReportRow(row, type) {
  const pop = parseInt(row.population_count, 10);
  const ster = parseInt(row.sterilized_count, 10);
  const vac = parseInt(row.vaccinated_count, 10);
  const bites = parseInt(row.bite_count, 10);

  const sterPercent = pop > 0 ? Math.round((ster / pop) * 100) : 0;
  const vacPercent = pop > 0 ? Math.round((vac / pop) * 100) : 0;
  
  const base = {
    wardNumber: row.ward_number,
    wardName: row.ward_name,
    totalPopulation: pop,
    sterilizedCount: ster,
    sterilizationCoverage: `${sterPercent}%`,
    vaccinatedCount: vac,
    vaccinationCoverage: `${vacPercent}%`,
    biteIncidents: bites,
  };

  if (type === 'STERILIZATION') {
    return {
      wardNumber: base.wardNumber,
      wardName: base.wardName,
      totalPopulation: base.totalPopulation,
      sterilizedCount: base.sterilizedCount,
      sterilizationCoverage: base.sterilizationCoverage,
      pendingTargets: Math.max(0, Math.round(pop * 0.80) - ster), // Target 80%
      status: sterPercent >= 80 ? 'COMPLETE' : sterPercent >= 50 ? 'MODERATE' : 'CRITICAL'
    };
  }

  if (type === 'VACCINATION') {
    return {
      wardNumber: base.wardNumber,
      wardName: base.wardName,
      totalPopulation: base.totalPopulation,
      vaccinatedCount: base.vaccinatedCount,
      vaccinationCoverage: base.vaccinationCoverage,
      herdImmunityReached: vacPercent >= 70 ? 'YES' : 'NO',
      campsRecommended: vacPercent < 70 ? 'SCHEDULE_CAMP' : 'MONITOR'
    };
  }

  // Default Full Ward Report
  return base;
}

// 2. Export and Download Report as physical CSV payload
router.get('/export/csv', async (req, res, next) => {
  const { reportType } = req.query;

  try {
    let reportData = [];
    
    // Aggregation query
    if (db.isConnected()) {
      const result = await db.query(
        `SELECT 
          w.ward_number, w.ward_name,
          COALESCE(pop.total_pop, 0) as population_count,
          COALESCE(ster.total_ster, 0) as sterilized_count,
          COALESCE(vac.total_vac, 0) as vaccinated_count,
          COALESCE(bite.total_bites, 0) as bite_count
         FROM wards w
         LEFT JOIN (SELECT ward_id, COUNT(*) as total_pop FROM dog_population GROUP BY ward_id) pop ON w.id = pop.ward_id
         LEFT JOIN (SELECT ward_id, COUNT(*) as total_ster FROM sterilization_records GROUP BY ward_id) ster ON w.id = ster.ward_id
         LEFT JOIN (SELECT ward_id, COUNT(*) as total_vac FROM vaccination_records GROUP BY ward_id) vac ON w.id = vac.ward_id
         LEFT JOIN (SELECT ward_id, COUNT(*) as total_bites FROM dog_bite_incidents GROUP BY ward_id) bite ON w.id = bite.ward_id
         ORDER BY w.ward_number ASC`
      );
      reportData = result.rows;
    } else {
      reportData = localMemoryDb.wards.map(w => ({
        ward_number: w.ward_number,
        ward_name: w.ward_name,
        population_count: localMemoryDb.dog_population.filter(d => d.ward_id === w.id).length,
        sterilized_count: localMemoryDb.sterilization_records.filter(s => s.ward_id === w.id).length,
        vaccinated_count: localMemoryDb.vaccination_records.filter(v => v.ward_id === w.id).length,
        bite_count: localMemoryDb.dog_bite_incidents.filter(b => b.ward_id === w.id).length,
      }));
    }

    // Build CSV Content
    let csvContent = 'Ward Number,Ward Name,Dog Population,Sterilized Dogs,Sterilization Coverage,Vaccinated Dogs,Vaccination Coverage,Bite Incidents\n';
    
    reportData.forEach(row => {
      const pop = parseInt(row.population_count, 10);
      const ster = parseInt(row.sterilized_count, 10);
      const vac = parseInt(row.vaccinated_count, 10);
      const bites = parseInt(row.bite_count, 10);

      const sterPct = pop > 0 ? Math.round((ster / pop) * 100) : 0;
      const vacPct = pop > 0 ? Math.round((vac / pop) * 100) : 0;

      csvContent += `${row.ward_number},"${row.ward_name}",${pop},${ster},${sterPct}%,${vac},${vacPct}%,${bites}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=CCMC_CanisIntel_${reportType || 'Ward'}_Report.csv`);
    res.status(200).send(csvContent);

  } catch (error) {
    next(error);
  }
});

export default router;
