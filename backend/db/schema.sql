-- CanisIntel CCMC Platform Database Schema
-- Prerequisites: PostgreSQL with PostGIS extension installed

-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table (Authentication & Role Management)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'OFFICER', 'FIELD_STAFF')),
    full_name VARCHAR(100),
    department VARCHAR(100) DEFAULT 'Veterinary Department',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Wards Table (Meta-information for Coimbatore East Zone)
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    zone VARCHAR(50) NOT NULL DEFAULT 'East',
    ward_number INTEGER UNIQUE NOT NULL,
    ward_name VARCHAR(100),
    population_census INTEGER DEFAULT 0,
    area_sq_km NUMERIC(8,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ward Boundaries Table (Spatial Polygons linked to Wards)
CREATE TABLE IF NOT EXISTS ward_boundaries (
    id SERIAL PRIMARY KEY,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    ward_number INTEGER UNIQUE NOT NULL,
    geom GEOMETRY(Polygon, 4326) NOT NULL, -- WGS84 Spatial Polygon
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for Spatial Queries on Ward Polygons
CREATE INDEX IF NOT EXISTS idx_ward_boundaries_geom ON ward_boundaries USING gist (geom);

-- 4. Dog Population (Sightings/Census Records)
CREATE TABLE IF NOT EXISTS dog_population (
    id SERIAL PRIMARY KEY,
    sighting_id VARCHAR(50) UNIQUE,
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    ward_number INTEGER,
    sex VARCHAR(10) CHECK (sex IN ('MALE', 'FEMALE', 'UNKNOWN')),
    age_class VARCHAR(10) CHECK (age_class IN ('ADULT', 'PUPPY')),
    lactating BOOLEAN DEFAULT FALSE,
    color VARCHAR(30),
    distinctive_features TEXT,
    sighting_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(Point, 4326), -- Point location of sighting
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dog_pop_geom ON dog_population USING gist (geom);

-- 5. Sterilization Records (ABC - Animal Birth Control)
CREATE TABLE IF NOT EXISTS sterilization_records (
    id SERIAL PRIMARY KEY,
    dog_id INTEGER REFERENCES dog_population(id) ON DELETE CASCADE,
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    sterilization_date DATE NOT NULL,
    clinic_name VARCHAR(100),
    veterinary_surgeon VARCHAR(100),
    ear_notch_verified BOOLEAN DEFAULT TRUE,
    post_op_status VARCHAR(50) DEFAULT 'Healthy',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Vaccination Records (Anti-Rabies Vaccination - ARV)
CREATE TABLE IF NOT EXISTS vaccination_records (
    id SERIAL PRIMARY KEY,
    dog_id INTEGER REFERENCES dog_population(id) ON DELETE CASCADE,
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    vaccination_date DATE NOT NULL,
    vaccine_brand VARCHAR(50) DEFAULT 'Rabigen / Nobivac',
    batch_number VARCHAR(50),
    valid_until DATE NOT NULL,
    vaccination_type VARCHAR(20) DEFAULT 'PRIMARY' CHECK (vaccination_type IN ('PRIMARY', 'BOOSTER')),
    administered_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Dog Bite Incidents (Surveillance from Government Hospitals/Clinics)
CREATE TABLE IF NOT EXISTS dog_bite_incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(50) UNIQUE,
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    ward_number INTEGER,
    incident_time TIMESTAMP WITH TIME ZONE NOT NULL,
    street_name VARCHAR(150),
    victim_age INTEGER,
    victim_gender VARCHAR(10) CHECK (victim_gender IN ('MALE', 'FEMALE', 'OTHER')),
    bite_severity VARCHAR(20) CHECK (bite_severity IN ('GRADE_I', 'GRADE_II', 'GRADE_III')), -- WHO classification
    rabies_vaccine_status VARCHAR(30) DEFAULT 'AWAITING_PEP',
    hospital_name VARCHAR(100) DEFAULT 'Coimbatore Government Hospital',
    geom GEOMETRY(Point, 4326), -- Point coordinates of bite incident
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bite_incidents_geom ON dog_bite_incidents USING gist (geom);

-- 8. Infrastructure: Hospitals / Clinics
CREATE TABLE IF NOT EXISTS hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) DEFAULT 'GENERAL' CHECK (type IN ('GOVERNMENT', 'PRIVATE', 'CLINIC')),
    street VARCHAR(150),
    rabies_pep_stock BOOLEAN DEFAULT TRUE,
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hospitals_geom ON hospitals USING gist (geom);

-- 9. Infrastructure: Schools & Colleges
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('SCHOOL', 'COLLEGE', 'UNIVERSITY')),
    street VARCHAR(150),
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schools_geom ON schools USING gist (geom);

-- 10. Infrastructure: Veterinary Centers
CREATE TABLE IF NOT EXISTS veterinary_centers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    managed_by VARCHAR(100) DEFAULT 'CCMC',
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_veterinary_geom ON veterinary_centers USING gist (geom);

-- 11. Infrastructure: Markets
CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) DEFAULT 'MEAT_VEGETABLE',
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_markets_geom ON markets USING gist (geom);

-- 12. Infrastructure: Parks
CREATE TABLE IF NOT EXISTS parks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parks_geom ON parks USING gist (geom);

-- 13. Data Sources Table (Track External Scrapers & Connections)
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    url VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ONLINE', 'SYNCING', 'RATE_LIMITED', 'ERROR', 'AUTH_REQUIRED')),
    last_attempted TIMESTAMP WITH TIME ZONE,
    last_successful TIMESTAMP WITH TIME ZONE,
    error_logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data Sources for Tracking
INSERT INTO data_sources (name, url, status) VALUES 
('Coimbatore Municipal Corporation (CCMC)', 'https://www.ccmc.gov.in', 'PENDING'),
('National Open Data Portal (data.gov.in)', 'https://www.data.gov.in', 'PENDING'),
('OpenStreetMap Overpass API', 'https://www.openstreetmap.org', 'PENDING'),
('Mission Rabies Reports', 'https://www.missionrabies.com', 'PENDING'),
('DPH Tamil Nadu Disease Surveillance', 'https://dph.tn.gov.in', 'PENDING'),
('National Health Mission TN Portal', 'https://nhm.tn.gov.in', 'PENDING'),
('Government of Tamil Nadu Press Portal', 'https://www.tn.gov.in', 'PENDING')
ON CONFLICT (name) DO NOTHING;

-- 14. Data Sync Logs Table
CREATE TABLE IF NOT EXISTS data_sync_logs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(id) ON DELETE CASCADE,
    sync_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    records_added INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    details TEXT
);

-- 15. Uploaded Datasets Log (Manual CSV/KML files)
CREATE TABLE IF NOT EXISTS uploaded_datasets (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(150) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'CSV', 'GEOJSON', 'KML'
    target_table VARCHAR(50) NOT NULL, -- 'ward_boundaries', 'dog_population', etc.
    imported_rows INTEGER DEFAULT 0,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Notifications (Critical Incident Warnings)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'INFO' CHECK (type IN ('INFO', 'ALERT', 'SUCCESS', 'ERROR')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
