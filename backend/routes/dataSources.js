import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import db, { localMemoryDb } from '../db/index.js';

const router = express.Router();

// 1. Get Source Connection Monitor Statuses
router.get('/status', async (req, res, next) => {
  try {
    if (db.isConnected()) {
      const result = await db.query('SELECT * FROM data_sources ORDER BY id ASC');
      return res.json(result.rows);
    } else {
      return res.json(localMemoryDb.data_sources);
    }
  } catch (error) {
    next(error);
  }
});

// 2. Trigger Active Synchronization for a Specific Source
router.post('/trigger-sync', async (req, res, next) => {
  const { sourceId } = req.body;

  if (!sourceId) {
    return res.status(400).json({ error: 'Source ID is required.' });
  }

  try {
    let source = null;
    if (db.isConnected()) {
      const result = await db.query('SELECT * FROM data_sources WHERE id = $1', [sourceId]);
      if (result.rows.length > 0) source = result.rows[0];
    } else {
      source = localMemoryDb.data_sources.find(s => s.id === parseInt(sourceId, 10));
    }

    if (!source) {
      return res.status(404).json({ error: 'Data source not found.' });
    }

    // Set status to SYNCING
    await updateSourceStatus(source.id, 'SYNCING', null);

    console.log(`📡 ETL: Initiating sync for source: ${source.name} (${source.url})`);

    let syncResult = { status: 'SUCCESS', recordsAdded: 0, details: '' };

    try {
      if (source.name === 'OpenStreetMap Overpass API') {
        // Query OpenStreetMap Overpass API for Coimbatore East Zone features
        syncResult = await syncOpenStreetMap();
      } else {
        // Run scraper/crawler diagnostic check on the source URL
        syncResult = await runCrawlerDiagnostic(source);
      }

      // Sync completed successfully
      await updateSourceStatus(source.id, syncResult.status, null, syncResult.recordsAdded);
      await logSyncEvent(source.id, syncResult.recordsAdded, syncResult.status, syncResult.details);

      res.json({
        message: `Sync completed for ${source.name}`,
        status: syncResult.status,
        recordsAdded: syncResult.recordsAdded,
        details: syncResult.details
      });

    } catch (syncError) {
      console.error(`❌ Sync thread failure for source ${source.name}:`, syncError.message);
      
      const errorMsg = `HTTP Connection/Parser Error: ${syncError.message}`;
      await updateSourceStatus(source.id, 'ERROR', errorMsg);
      await logSyncEvent(source.id, 0, 'ERROR', errorMsg);

      res.status(502).json({
        error: `Failed to fetch data from ${source.name}`,
        details: errorMsg
      });
    }

  } catch (error) {
    next(error);
  }
});

// Helper Function: Update Status in Database or Local Memory
async function updateSourceStatus(id, status, errorLogs = null, recordsCount = 0) {
  const time = new Date();
  if (db.isConnected()) {
    const queryText = `
      UPDATE data_sources 
      SET status = $1, 
          last_attempted = $2, 
          last_successful = CASE WHEN $1 = 'ONLINE' OR $1 = 'SUCCESS' THEN $2 ELSE last_successful END,
          error_logs = $3
      WHERE id = $4
    `;
    await db.query(queryText, [status, time, errorLogs, id]);
  } else {
    const s = localMemoryDb.data_sources.find(src => src.id === id);
    if (s) {
      s.status = status;
      s.last_attempted = time;
      if (status === 'ONLINE' || status === 'SUCCESS') {
        s.last_successful = time;
      }
      s.error_logs = errorLogs;
    }
  }
}

// Helper Function: Log Sync Event
async function logSyncEvent(sourceId, recordsAdded, status, details) {
  if (db.isConnected()) {
    const queryText = `
      INSERT INTO data_sync_logs (source_id, records_added, status, details)
      VALUES ($1, $2, $3, $4)
    `;
    await db.query(queryText, [sourceId, recordsAdded, status, details]);
  } else {
    localMemoryDb.data_sync_logs.push({
      id: localMemoryDb.data_sync_logs.length + 1,
      source_id: sourceId,
      sync_time: new Date(),
      records_added: recordsAdded,
      status,
      details
    });
  }
}

// Scraper: Crawler Diagnostic for Public Health Portals
async function runCrawlerDiagnostic(source) {
  const startTime = Date.now();
  
  // Custom fetch timeout (5 seconds) to avoid freezing backend thread
  const response = await axios.get(source.url, { 
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CanisIntel/1.0' },
    timeout: 5000 
  });

  const duration = Date.now() - startTime;
  const $ = cheerio.load(response.data);
  const pageTitle = $('title').text().trim() || 'No Title Found';
  
  let details = `Successfully pinged in ${duration}ms. Resolved Page Title: "${pageTitle}". `;
  
  // Scraper extraction details by website
  if (source.url.includes('ccmc.gov.in')) {
    const links = $('a').length;
    details += `Detected ${links} navigational indices on Coimbatore Corporation homepage. Ready for Document parsing.`;
  } else if (source.url.includes('data.gov.in')) {
    details += `National Open Data catalog is reachable. Public API endpoints active. API Key authentication pending.`;
  } else if (source.url.includes('missionrabies.com')) {
    const headings = $('h1, h2').length;
    details += `Retrieved campaign markers and public notices indices. Found ${headings} active sections.`;
  } else {
    details += `Direct connection established. Status: ${response.status} ${response.statusText}.`;
  }

  // Under CCMC strict instructions: since no dog populations are simulated, scrapers do not synthesize records.
  // We return status 'ONLINE' to show connection works, but 0 records are injected since no census tables exist on CCMC mainpage.
  return {
    status: 'ONLINE',
    recordsAdded: 0,
    details
  };
}

// ETL: Query and parse Coimbatore East Zone features from OpenStreetMap Overpass API
async function syncOpenStreetMap() {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  // Peelamedu, Singanallur, Ondipudur Bounding Box
  // bbox: [min_lat, min_lon, max_lat, max_lon]
  const qlQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="school"](10.98,76.98,11.06,77.06);
      node["amenity"="hospital"](10.98,76.98,11.06,77.06);
      node["amenity"="clinic"](10.98,76.98,11.06,77.06);
      node["amenity"="veterinary"](10.98,76.98,11.06,77.06);
      node["amenity"="marketplace"](10.98,76.98,11.06,77.06);
      node["leisure"="park"](10.98,76.98,11.06,77.06);
      node["amenity"="bus_station"](10.98,76.98,11.06,77.06);
    );
    out body;
  `;

  console.log('📡 Overpass API Requesting with QL query...');

  const response = await axios.post(overpassUrl, qlQuery, {
    headers: { 'Content-Type': 'text/plain' },
    timeout: 20000 // 20s timeout for Overpass server processing
  });

  if (!response.data || !response.data.elements) {
    throw new Error('OSM Overpass returned an invalid or empty payload.');
  }

  const elements = response.data.elements;
  let addedCount = 0;

  console.log(`✅ Received ${elements.length} elements from OpenStreetMap! Processing and saving...`);

  // Clear existing POI records to avoid duplicates on sync
  if (db.isConnected()) {
    await db.query('TRUNCATE schools, hospitals, veterinary_centers, markets, parks CASCADE');
  } else {
    localMemoryDb.schools = [];
    localMemoryDb.hospitals = [];
    localMemoryDb.veterinary_centers = [];
    localMemoryDb.markets = [];
    localMemoryDb.parks = [];
  }

  // Iterate over each Node element from Overpass Response
  for (const element of elements) {
    if (element.type === 'node' && element.lat && element.lon) {
      const name = element.tags?.name || `${capitalize(element.tags?.amenity || element.tags?.leisure || 'POI')} - Coimbatore East`;
      const lat = element.lat;
      const lon = element.lon;
      const tags = element.tags || {};
      
      const amenity = tags.amenity;
      const leisure = tags.leisure;

      if (amenity === 'school') {
        addedCount += await insertPOI('schools', name, 'SCHOOL', tags.street || tags['addr:street'] || 'Coimbatore East Street', lat, lon);
      } else if (amenity === 'hospital' || amenity === 'clinic') {
        addedCount += await insertPOI('hospitals', name, amenity === 'hospital' ? 'GOVERNMENT' : 'CLINIC', tags.street || tags['addr:street'] || 'Coimbatore East Street', lat, lon);
      } else if (amenity === 'veterinary') {
        addedCount += await insertPOI('veterinary_centers', name, 'CCMC / Private Vet', null, lat, lon);
      } else if (amenity === 'marketplace') {
        addedCount += await insertPOI('markets', name, 'MEAT_VEGETABLE', null, lat, lon);
      } else if (leisure === 'park') {
        addedCount += await insertPOI('parks', name, null, null, lat, lon);
      }
    }
  }

  return {
    status: 'ONLINE',
    recordsAdded: addedCount,
    details: `Sync success! Queried Overpass. Synchronized and wrote ${addedCount} real geographic assets (Schools, Hospitals, Markets, Vet Centers, Parks) in Peelamedu/Singanallur Zone.`
  };
}

// Database / Memory Insert helper
async function insertPOI(table, name, typeValue, streetValue, lat, lon) {
  try {
    if (db.isConnected()) {
      let queryText = '';
      let values = [];
      
      if (table === 'schools') {
        queryText = `INSERT INTO schools (name, type, street, geom) VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326))`;
        values = [name, typeValue, streetValue, lon, lat];
      } else if (table === 'hospitals') {
        queryText = `INSERT INTO hospitals (name, type, street, geom) VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326))`;
        values = [name, typeValue, streetValue, lon, lat];
      } else if (table === 'veterinary_centers') {
        queryText = `INSERT INTO veterinary_centers (name, managed_by, geom) VALUES ($1, $2, ST_SetSRID(ST_Point($3, $4), 4326))`;
        values = [name, typeValue || 'CCMC', lon, lat];
      } else if (table === 'markets') {
        queryText = `INSERT INTO markets (name, type, geom) VALUES ($1, $2, ST_SetSRID(ST_Point($3, $4), 4326))`;
        values = [name, typeValue || 'MEAT_VEGETABLE', lon, lat];
      } else if (table === 'parks') {
        queryText = `INSERT INTO parks (name, geom) VALUES ($1, ST_SetSRID(ST_Point($2, $3), 4326))`;
        values = [name, lon, lat];
      }
      
      await db.query(queryText, values);
      return 1;
    } else {
      // In Memory Fallback injection
      const newPOI = {
        id: localMemoryDb[table].length + 1,
        name,
        type: typeValue,
        street: streetValue,
        managed_by: typeValue,
        lat,
        lng: lon
      };
      localMemoryDb[table].push(newPOI);
      return 1;
    }
  } catch (err) {
    console.error(`Error inserting into ${table}:`, err.message);
    return 0;
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default router;
