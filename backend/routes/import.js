import express from 'express';
import multer from 'multer';
import fs from 'fs';
import db, { localMemoryDb } from '../db/index.js';

const router = express.Router();
const upload = multer({ dest: 'backend/uploads/' });

// 1. Get History of Uploaded Datasets
router.get('/history', async (req, res, next) => {
  try {
    if (db.isConnected()) {
      const result = await db.query('SELECT * FROM uploaded_datasets ORDER BY uploaded_at DESC');
      return res.json(result.rows);
    } else {
      return res.json(localMemoryDb.uploaded_datasets);
    }
  } catch (error) {
    next(error);
  }
});

// 2. Upload and Process Datasets (GeoJSON Wards, CSV Census / Bites / Clinical)
router.post('/upload', upload.single('file'), async (req, res, next) => {
  const { fileType, targetTable } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  if (!fileType || !targetTable) {
    // Delete temp file
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Missing fileType or targetTable specification.' });
  }

  console.log(`📂 Ingesting file: ${file.originalname} (${file.size} bytes) for table: ${targetTable}`);

  try {
    const fileContent = fs.readFileSync(file.path, 'utf-8');
    let rowsProcessed = 0;

    if (fileType === 'GEOJSON' && targetTable === 'ward_boundaries') {
      rowsProcessed = await parseAndIngestGeoJSON(fileContent);
    } else if (fileType === 'CSV') {
      rowsProcessed = await parseAndIngestCSV(fileContent, targetTable);
    } else {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: `Unsupported ingestion type: ${fileType} for table ${targetTable}` });
    }

    // Log upload in historical records
    await logUploadedDataset(file.originalname, fileType, targetTable, rowsProcessed);

    // Delete temp file after completion
    fs.unlinkSync(file.path);

    res.json({
      message: 'Ingestion completed successfully.',
      fileName: file.originalname,
      targetTable,
      rowsProcessed
    });

  } catch (err) {
    console.error(`❌ Ingestion pipeline failure for file ${file.originalname}:`, err.message);
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(422).json({
      error: 'Ingestion parsing failed',
      details: err.message
    });
  }
});

// Ingest GeoJSON Wards Boundary File
async function parseAndIngestGeoJSON(content) {
  const geojson = JSON.parse(content);
  if (!geojson.features || !Array.isArray(geojson.features)) {
    throw new Error('Invalid GeoJSON format. Root object must contain "features" array.');
  }

  let count = 0;

  // Clear existing boundaries first to represent clean imports
  if (db.isConnected()) {
    await db.query('TRUNCATE ward_boundaries, wards CASCADE');
  } else {
    localMemoryDb.ward_boundaries = [];
    localMemoryDb.wards = [];
  }

  for (const feature of geojson.features) {
    const properties = feature.properties || {};
    // Look for common ward key labels
    const wardNumber = parseInt(properties.ward_no || properties.ward_number || properties.ward || properties.id, 10);
    const wardName = properties.name || properties.ward_name || `Ward ${wardNumber}`;
    const censusPop = parseInt(properties.population || properties.census_pop || 0, 10);
    const area = parseFloat(properties.area || properties.sq_km || 0.00);

    if (isNaN(wardNumber)) {
      console.warn('Skipping GeoJSON feature due to missing Ward Identifier (ward_no).');
      continue;
    }

    // Capture geometry string representation for PostGIS conversion
    const geometryString = JSON.stringify(feature.geometry);

    if (db.isConnected()) {
      // 1. Insert/Update Ward meta-info
      const wardResult = await db.query(
        `INSERT INTO wards (zone, ward_number, ward_name, population_census, area_sq_km)
         VALUES ('East', $1, $2, $3, $4)
         ON CONFLICT (ward_number) DO UPDATE 
         SET ward_name = EXCLUDED.ward_name, population_census = EXCLUDED.population_census, area_sq_km = EXCLUDED.area_sq_km
         RETURNING id`,
        [wardNumber, wardName, censusPop, area]
      );
      const wardId = wardResult.rows[0].id;

      // 2. Insert Spatial Polygon using PostGIS ST_GeomFromGeoJSON
      await db.query(
        `INSERT INTO ward_boundaries (ward_id, ward_number, geom)
         VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
         ON CONFLICT (ward_number) DO UPDATE SET geom = EXCLUDED.geom`,
        [wardId, wardNumber, geometryString]
      );
    } else {
      // Local Memory mock insert
      const wardId = localMemoryDb.wards.length + 1;
      localMemoryDb.wards.push({
        id: wardId,
        zone: 'East',
        ward_number: wardNumber,
        ward_name: wardName,
        population_census: censusPop,
        area_sq_km: area
      });

      localMemoryDb.ward_boundaries.push({
        id: localMemoryDb.ward_boundaries.length + 1,
        ward_id: wardId,
        ward_number: wardNumber,
        geojson: feature // Store raw GeoJSON feature directly
      });
    }
    count++;
  }

  return count;
}

// Ingest CSV records (Census, Sterilization, Vaccination, Bite logs)
async function parseAndIngestCSV(content, targetTable) {
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing header rows.');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  let insertedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle standard CSV commas, ignoring commas inside quotes
    const values = parseCSVRow(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, '') || null;
    });

    // Ingest based on target table mapping
    const success = await insertCSVRecord(targetTable, row);
    if (success) insertedCount++;
  }

  return insertedCount;
}

// Helper: Custom CSV row parsing to support commas in quotes
function parseCSVRow(text) {
  const result = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  result.push(cell);
  return result;
}

// Ingest Individual CSV Row
async function insertCSVRecord(table, row) {
  try {
    if (table === 'dog_population') {
      const { sighting_id, sex, age_class, color, lat, lng, ward_number } = row;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const wardNum = parseInt(ward_number, 10);

      if (db.isConnected()) {
        const wardRes = await db.query('SELECT id FROM wards WHERE ward_number = $1', [wardNum]);
        const wardId = wardRes.rows[0]?.id || null;

        await db.query(
          `INSERT INTO dog_population (sighting_id, ward_id, ward_number, sex, age_class, color, geom)
           VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_Point($7, $8), 4326))
           ON CONFLICT (sighting_id) DO NOTHING`,
          [sighting_id, wardId, wardNum, sex?.toUpperCase(), age_class?.toUpperCase(), color, longitude, latitude]
        );
      } else {
        const wardId = localMemoryDb.wards.find(w => w.ward_number === wardNum)?.id || null;
        localMemoryDb.dog_population.push({
          id: localMemoryDb.dog_population.length + 1,
          sighting_id,
          ward_id: wardId,
          ward_number: wardNum,
          sex: sex?.toUpperCase(),
          age_class: age_class?.toUpperCase(),
          color,
          lat: latitude,
          lng: longitude
        });
      }
      return true;
    }

    if (table === 'sterilization_records') {
      const { sighting_id, sterilization_date, clinic_name, veterinary_surgeon, ear_notch_verified, post_op_status } = row;
      
      if (db.isConnected()) {
        const dogRes = await db.query('SELECT id, ward_id FROM dog_population WHERE sighting_id = $1', [sighting_id]);
        if (dogRes.rows.length === 0) return false; // Sighting reference must exist (relational integrity)
        const dogId = dogRes.rows[0].id;
        const wardId = dogRes.rows[0].ward_id;

        await db.query(
          `INSERT INTO sterilization_records (dog_id, ward_id, sterilization_date, clinic_name, veterinary_surgeon, ear_notch_verified, post_op_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [dogId, wardId, sterilization_date, clinic_name, veterinary_surgeon, ear_notch_verified === 'true', post_op_status || 'Healthy']
        );
      } else {
        const dog = localMemoryDb.dog_population.find(d => d.sighting_id === sighting_id);
        if (!dog) return false;

        localMemoryDb.sterilization_records.push({
          id: localMemoryDb.sterilization_records.length + 1,
          dog_id: dog.id,
          ward_id: dog.ward_id,
          sterilization_date,
          clinic_name,
          veterinary_surgeon,
          ear_notch_verified: ear_notch_verified === 'true',
          post_op_status: post_op_status || 'Healthy'
        });
      }
      return true;
    }

    if (table === 'vaccination_records') {
      const { sighting_id, vaccination_date, valid_until, vaccine_brand, vaccination_type, administered_by } = row;
      
      if (db.isConnected()) {
        const dogRes = await db.query('SELECT id, ward_id FROM dog_population WHERE sighting_id = $1', [sighting_id]);
        if (dogRes.rows.length === 0) return false;
        const dogId = dogRes.rows[0].id;
        const wardId = dogRes.rows[0].ward_id;

        await db.query(
          `INSERT INTO vaccination_records (dog_id, ward_id, vaccination_date, valid_until, vaccine_brand, vaccination_type, administered_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [dogId, wardId, vaccination_date, valid_until, vaccine_brand || 'Nobivac ARV', vaccination_type?.toUpperCase() || 'PRIMARY', administered_by]
        );
      } else {
        const dog = localMemoryDb.dog_population.find(d => d.sighting_id === sighting_id);
        if (!dog) return false;

        localMemoryDb.vaccination_records.push({
          id: localMemoryDb.vaccination_records.length + 1,
          dog_id: dog.id,
          ward_id: dog.ward_id,
          vaccination_date,
          valid_until,
          vaccine_brand,
          vaccination_type: vaccination_type?.toUpperCase(),
          administered_by
        });
      }
      return true;
    }

    if (table === 'dog_bite_incidents') {
      const { incident_id, incident_time, street_name, victim_age, victim_gender, bite_severity, hospital_name, lat, lng, ward_number } = row;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const wardNum = parseInt(ward_number, 10);
      const ageVal = parseInt(victim_age, 10);

      if (db.isConnected()) {
        const wardRes = await db.query('SELECT id FROM wards WHERE ward_number = $1', [wardNum]);
        const wardId = wardRes.rows[0]?.id || null;

        await db.query(
          `INSERT INTO dog_bite_incidents (incident_id, ward_id, ward_number, incident_time, street_name, victim_age, victim_gender, bite_severity, hospital_name, geom)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_Point($10, $11), 4326))
           ON CONFLICT (incident_id) DO NOTHING`,
          [incident_id, wardId, wardNum, incident_time, street_name, isNaN(ageVal) ? null : ageVal, victim_gender?.toUpperCase(), bite_severity?.toUpperCase(), hospital_name, longitude, latitude]
        );
      } else {
        const wardId = localMemoryDb.wards.find(w => w.ward_number === wardNum)?.id || null;
        localMemoryDb.dog_bite_incidents.push({
          id: localMemoryDb.dog_bite_incidents.length + 1,
          incident_id,
          ward_id: wardId,
          ward_number: wardNum,
          incident_time,
          street_name,
          victim_age: ageVal,
          victim_gender: victim_gender?.toUpperCase(),
          bite_severity: bite_severity?.toUpperCase(),
          hospital_name,
          lat: latitude,
          lng: longitude
        });
      }
      return true;
    }

    return false;
  } catch (err) {
    console.error(`Failed row insertion on ${table}:`, err.message);
    return false;
  }
}

// Log Dataset Ingestion in DB or Local Memory
async function logUploadedDataset(fileName, fileType, targetTable, rows) {
  if (db.isConnected()) {
    await db.query(
      `INSERT INTO uploaded_datasets (file_name, file_type, target_table, imported_rows)
       VALUES ($1, $2, $3, $4)`,
      [fileName, fileType, targetTable, rows]
    );
  } else {
    localMemoryDb.uploaded_datasets.push({
      id: localMemoryDb.uploaded_datasets.length + 1,
      file_name: fileName,
      file_type: fileType,
      target_table: targetTable,
      imported_rows: rows,
      uploaded_at: new Date()
    });
  }
  
  // Also push a global notification
  const notifyMessage = `Successfully uploaded dataset "${fileName}". Ingested ${rows} rows into target: ${targetTable}.`;
  if (db.isConnected()) {
    await db.query(`INSERT INTO notifications (title, message, type) VALUES ($1, $2, 'SUCCESS')`, ['Data Sync Complete', notifyMessage]);
  } else {
    localMemoryDb.notifications.push({
      id: localMemoryDb.notifications.length + 1,
      title: 'Data Sync Complete',
      message: notifyMessage,
      type: 'SUCCESS',
      is_read: false,
      created_at: new Date()
    });
  }
}

export default router;
