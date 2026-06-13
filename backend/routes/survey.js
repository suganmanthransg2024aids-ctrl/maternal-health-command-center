import express from 'express';
import multer from 'multer';
import path from 'path';
import db, { localMemoryDb } from '../db/index.js';

const router = express.Router();

// Setup Multer Disk Storage for Sighting Photographs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backend/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'sighting-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 1. Get List of Field Surveys / Sightings
router.get('/sightings', async (req, res, next) => {
  try {
    if (db.isConnected()) {
      const queryText = `
        SELECT id, sighting_id, ward_number, sex, age_class, color, 
               ST_Y(geom) as lat, ST_X(geom) as lng, sighting_time
        FROM dog_population
        ORDER BY sighting_time DESC
        LIMIT 50
      `;
      const result = await db.query(queryText);
      return res.json(result.rows);
    } else {
      return res.json(localMemoryDb.dog_population.slice(-50).reverse());
    }
  } catch (error) {
    next(error);
  }
});

// 2. Submit Sighting from the Field
router.post('/sighting', upload.single('photo'), async (req, res, next) => {
  const { sex, ageClass, color, lat, lng, wardNumber, distinctiveFeatures } = req.body;
  const photo = req.file;

  if (!sex || !ageClass || !lat || !lng || !wardNumber) {
    return res.status(400).json({ error: 'Mandatory fields sex, ageClass, coordinates, and wardNumber are required.' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const wardNum = parseInt(wardNumber, 10);
  const sightingId = 'SIGHT-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

  try {
    let resultRow = null;

    if (db.isConnected()) {
      // Find ward ID matching ward number
      const wardRes = await db.query('SELECT id FROM wards WHERE ward_number = $1', [wardNum]);
      const wardId = wardRes.rows[0]?.id || null;

      const queryText = `
        INSERT INTO dog_population (sighting_id, ward_id, ward_number, sex, age_class, color, distinctive_features, geom)
        VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_Point($8, $9), 4326))
        RETURNING id, sighting_id, ward_number, sex, age_class, color, sighting_time;
      `;
      const values = [
        sightingId,
        wardId,
        wardNum,
        sex.toUpperCase(),
        ageClass.toUpperCase(),
        color,
        distinctiveFeatures,
        longitude,
        latitude
      ];

      const resInsert = await db.query(queryText, values);
      resultRow = resInsert.rows[0];
      resultRow.lat = latitude;
      resultRow.lng = longitude;

    } else {
      // Insert to local memory database
      const wardId = localMemoryDb.wards.find(w => w.ward_number === wardNum)?.id || null;
      
      const newSighting = {
        id: localMemoryDb.dog_population.length + 1,
        sighting_id: sightingId,
        ward_id: wardId,
        ward_number: wardNum,
        sex: sex.toUpperCase(),
        age_class: ageClass.toUpperCase(),
        color,
        distinctive_features: distinctiveFeatures,
        lat: latitude,
        lng: longitude,
        sighting_time: new Date(),
        photo_url: photo ? `/uploads/${photo.filename}` : null
      };

      localMemoryDb.dog_population.push(newSighting);
      resultRow = newSighting;
    }

    // Push notification to notify operators of live survey additions
    const messageText = `New dog sighting ${sightingId} recorded by field staff in Ward ${wardNum}. Location coordinates: [${latitude.toFixed(5)}, ${longitude.toFixed(5)}].`;
    await pushNotification('New Sighting Sourced', messageText, 'INFO');

    res.status(201).json({
      message: 'Field survey sighting saved successfully.',
      sighting: resultRow
    });

  } catch (error) {
    next(error);
  }
});

// Helper: Push Global Notification
async function pushNotification(title, message, type) {
  if (db.isConnected()) {
    await db.query(
      'INSERT INTO notifications (title, message, type) VALUES ($1, $2, $3)',
      [title, message, type]
    );
  } else {
    localMemoryDb.notifications.push({
      id: localMemoryDb.notifications.length + 1,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date()
    });
  }
}

export default router;
