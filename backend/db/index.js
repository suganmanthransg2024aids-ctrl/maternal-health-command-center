import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Establish database configuration with defaults for local deployment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'canisintel_ccmc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum pool clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

let pool;
let isConnected = false;

try {
  pool = new Pool(dbConfig);
  
  // Test connection on load
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.warn('⚠️ PostgreSQL server connection failed. Running in Dynamic Local Memory Fallback Mode.');
      console.warn('Reason:', err.message);
      console.warn('Please ensure PostgreSQL + PostGIS is running and database "canisintel_ccmc" is created.');
    } else {
      isConnected = true;
      console.log('✅ PostgreSQL + PostGIS Database Connected successfully at:', res.rows[0].now);
    }
  });
} catch (error) {
  console.warn('⚠️ Failed to initialize PostgreSQL pool. Falling back to local memory simulation.');
  console.warn('Error details:', error.message);
}

// In-Memory Database Fallback Store (Matches PostgreSQL Schema structure)
// Used when DB connection is not present, persisting in-memory for testing frontend endpoints.
export const localMemoryDb = {
  wards: [
    { id: 1, zone: 'East', ward_number: 7, ward_name: 'Peelamedu North', population_census: 0, area_sq_km: 4.2 },
    { id: 2, zone: 'East', ward_number: 8, ward_name: 'Peelamedu South', population_census: 0, area_sq_km: 3.8 },
    { id: 3, zone: 'East', ward_number: 9, ward_name: 'Singanallur West', population_census: 0, area_sq_km: 5.1 },
    { id: 4, zone: 'East', ward_number: 10, ward_name: 'Singanallur East', population_census: 0, area_sq_km: 4.7 },
    { id: 5, zone: 'East', ward_number: 11, ward_name: 'Ondipudur North', population_census: 0, area_sq_km: 5.5 },
  ],
  ward_boundaries: [],
  dog_population: [],
  sterilization_records: [],
  vaccination_records: [],
  dog_bite_incidents: [],
  hospitals: [],
  schools: [],
  veterinary_centers: [],
  markets: [],
  parks: [],
  data_sources: [
    { id: 1, name: 'Coimbatore Municipal Corporation (CCMC)', url: 'https://www.ccmc.gov.in', status: 'PENDING', last_attempted: null, last_successful: null, error_logs: null },
    { id: 2, name: 'National Open Data Portal (data.gov.in)', url: 'https://www.data.gov.in', status: 'PENDING', last_attempted: null, last_successful: null, error_logs: null },
    { id: 3, name: 'OpenStreetMap Overpass API', url: 'https://www.openstreetmap.org', status: 'PENDING', last_attempted: null, last_successful: null, error_logs: null },
    { id: 4, name: 'Mission Rabies Reports', url: 'https://www.missionrabies.com', status: 'PENDING', last_attempted: null, last_successful: null, error_logs: null },
    { id: 5, name: 'DPH Tamil Nadu Disease Surveillance', url: 'https://dph.tn.gov.in', status: 'PENDING', last_attempted: null, last_successful: null, error_logs: null },
    { id: 6, name: 'National Health Mission TN Portal', url: 'https://nhm.tn.gov.in', status: 'PENDING', last_attempted: null, last_successful: null, error_logs: null },
    { id: 7, name: 'Government of Tamil Nadu Press Portal', url: 'https://www.tn.gov.in', status: 'PENDING', last_attempted: null, last_successful: null, error_logs: null },
  ],
  data_sync_logs: [],
  uploaded_datasets: [],
  notifications: [
    { id: 1, title: 'Platform Initialized', message: 'CanisIntel CCMC East Zone portal is online and ready for official data ingestion.', type: 'INFO', is_read: false, created_at: new Date() }
  ],
  users: [
    { id: 1, username: 'admin', email: 'admin@ccmc.gov.in', password_hash: '$2a$10$CCMC_TEMP_HASH', role: 'ADMIN', full_name: 'CCMC Admin' }
  ]
};

// Unified Database Query Handler with Automatic Local Fallback
export const query = async (text, params) => {
  if (isConnected && pool) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('❌ PostgreSQL Query Error:', err.message);
      throw err;
    }
  } else {
    // Return empty results or simple lookups matching local memory model
    return executeLocalQuery(text, params);
  }
};

// Emulates simple relational lookups for demo/development when DB is offline
const executeLocalQuery = (text, params) => {
  const normText = text.toUpperCase().replace(/\s+/g, ' ');
  
  if (normText.includes('SELECT * FROM DATA_SOURCES')) {
    return { rows: localMemoryDb.data_sources };
  }
  
  if (normText.includes('SELECT * FROM NOTIFICATIONS')) {
    return { rows: localMemoryDb.notifications };
  }

  if (normText.includes('SELECT COUNT(*)') || normText.includes('COUNT(ID)')) {
    const table = normText.match(/FROM\s+(\w+)/)?.[1]?.toLowerCase() || '';
    const records = localMemoryDb[table] || [];
    return { rows: [{ count: String(records.length) }] };
  }

  if (normText.includes('SELECT * FROM WARDS')) {
    return { rows: localMemoryDb.wards };
  }

  if (normText.includes('SELECT * FROM WARD_BOUNDARIES')) {
    return { rows: localMemoryDb.ward_boundaries };
  }

  if (normText.includes('SELECT * FROM DOG_POPULATION')) {
    return { rows: localMemoryDb.dog_population };
  }

  if (normText.includes('SELECT * FROM DOG_BITE_INCIDENTS')) {
    return { rows: localMemoryDb.dog_bite_incidents };
  }

  if (normText.includes('SELECT * FROM HOSPITALS')) {
    return { rows: localMemoryDb.hospitals };
  }
  
  if (normText.includes('SELECT * FROM SCHOOLS')) {
    return { rows: localMemoryDb.schools };
  }

  if (normText.includes('SELECT * FROM VETERINARY_CENTERS')) {
    return { rows: localMemoryDb.veterinary_centers };
  }

  if (normText.includes('SELECT * FROM MARKETS')) {
    return { rows: localMemoryDb.markets };
  }

  if (normText.includes('SELECT * FROM PARKS')) {
    return { rows: localMemoryDb.parks };
  }

  // General empty result fallback for database inserts/updates
  return { rows: [], rowCount: 0 };
};

export default {
  query,
  isConnected: () => isConnected,
  dbConfig,
};
