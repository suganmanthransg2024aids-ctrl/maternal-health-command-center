# CanisIntel | CCMC Municipal Analytics & Public Health Intelligence Platform

**CanisIntel** is a professional, production-ready municipal analytics and public health decision-support system designed specifically for the **Coimbatore City Municipal Corporation (CCMC) East Zone** (covering Wards 7, 8, 9, 10, 11, etc.).

The platform is designed to resemble modern ArcGIS Dashboards and Power BI Command Centers. It provides veterinary medical officers, sanitary inspectors, public health commissioners, and field surveyors with spatial mapping, target benchmarks, and biological risk indices.

---

## 🛡️ Strict Real-Data Mandate

In strict compliance with municipal presentation requirements:
* **Zero Mock Datasets**: There are no artificial, generated, or simulated dog population statistics, clinical vaccinations, or bite counts.
* **Pending States Fallback**: By default, all analytical cards and comparison tables remain empty and render the notice: `"DATA NOT AVAILABLE – AWAITING CCMC IMPORT"`.
* **Database Ingestion**: The system operates purely on verified official records imported via GeoJSON ward boundaries and CSV clinical registers.

---

## 🏗️ Technical Architecture & Stack

### Frontend Client
* **Core**: React (Vite) + Tailwind CSS (v4 CSS-first themes).
* **GIS Engine**: **Leaflet.js + OpenStreetMap** loaded via CDN. Centered on Peelamedu (`11.0180° N, 77.0220° E`).
* **Dynamic OSM Sync**: Direct Overpass API spatial query clients to synchronize real Coimbatore school boundaries, hospitals, veterinary posts, and markets.
* **Device GPS**: Hardware Geolocation API integration to capture coordinates on mobile phone sensors.
* **Resilient Emulator**: Gracefully catches backend outages, falling back to local client-side memory states to ensure a 100% stable presentation experience.

### Backend Node API
* **Core**: Node.js + Express.js.
* **ETL pipelines**: Stream parsed CSV datasets and dynamic Overpass node generators.
* **Scrapers**: Axios + Cheerio scrapers checking connection statuses and diagnostic indicators of official health portals.

### Database
* **Core**: PostgreSQL + **PostGIS** Spatial extension.
* **Spatial Polygons**: `GEOMETRY(Polygon, 4326)` for Coimbatore Ward boundaries.
* **Spatial Points**: `GEOMETRY(Point, 4326)` for dog population sightings and bite incidents.

---

## 🚀 Step-by-Step Developer Setup

### 1. Database Setup (PostgreSQL + PostGIS)
1. Ensure PostgreSQL is installed on your system.
2. Enable the spatial extension and create the CCMC database:
   ```sql
   CREATE DATABASE canisintel_ccmc;
   \c canisintel_ccmc;
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Initialize the spatial tables using the provided database schema:
   ```bash
   psql -U postgres -d canisintel_ccmc -f backend/db/schema.sql
   ```

### 2. Launching the Backend Server
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy the configuration template and create your environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install package dependencies:
   ```bash
   npm install
   ```
4. Start the Express server:
   ```bash
   npm run dev
   ```
*If PostgreSQL is offline, the backend server will automatically log a warning and run in local memory simulation mode, keeping the API online.*

### 3. Launching the Frontend Client
1. In the root directory, install npm packages:
   ```bash
   npm install
   ```
2. Start the Vite React client:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 📊 Ingestion Guidelines & CSV Columns

CCMC operators can load spreadsheets directly using the **Data Import Center**. Custom template files can be downloaded directly from the dashboard:

1. **Dog Population Sighting (`dog_population`):**
   * Format: `sighting_id,sex,age_class,color,lat,lng,ward_number`
   * Example: `SIGHT101,MALE,ADULT,Brown,11.0182,77.0253,7`

2. **Sterilization abc Register (`sterilization_records`):**
   * Format: `sighting_id,sterilization_date,clinic_name,veterinary_surgeon,ear_notch_verified,post_op_status`
   * Example: `SIGHT101,2026-05-12,Peelamedu ABC Post,Dr. Soundar,true,Healthy`

3. **Vaccination arv Register (`vaccination_records`):**
   * Format: `sighting_id,vaccination_date,valid_until,vaccine_brand,vaccination_type,administered_by`
   * Example: `SIGHT101,2026-05-12,2027-05-12,Nobivac ARV,PRIMARY,CCMC Team`

4. **Dog Bite Surveillance (`dog_bite_incidents`):**
   * Format: `incident_id,incident_time,street_name,victim_age,victim_gender,bite_severity,hospital_name,lat,lng,ward_number`
   * Example: `INC5001,2026-05-20 18:30:00,Avinashi Road Peelamedu,24,MALE,GRADE_II,Coimbatore GH,11.0210,77.0280,7`
