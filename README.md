# CCMC Maternal Health Tracker

**High Risk Mother Tracker** for the **Coimbatore City Municipal Corporation (CCMC)** — a maternal health monitoring and decision-support platform used by DMCHO/CHO officers and HRT field teams to track high-risk pregnancies across 33 PHC/UPHCs.

## Project Structure

```
├── frontend/          # React (Vite) + Tailwind CSS client
│   ├── src/           #   components, app shell, theme
│   ├── public/        #   PWA assets, icons, images
│   └── dist/          #   production build (served by the backend)
├── backend/           # Node.js + Express API server
│   ├── server.js      #   entrypoint — serves API + frontend/dist
│   ├── src/           #   config, Excel loader, risk engine, routes
│   ├── config.json    #   port / host / local Excel path
│   ├── SETUP_CCMC.bat #   first-time setup (installs deps, checks Excel)
│   ├── start.bat      #   start server + open browser
│   └── STOP_CCMC.bat  #   stop the server
├── Dockerfile         # container build (frontend build + backend runtime)
├── render.yaml        # Render deployment (Google Sheets synced)
└── railway.json       # Railway deployment
```

## How It Works

- **Data source**: the live CCMC Google Sheet (34 PHC sheets), auto-downloaded as xlsx and re-checked every 60 seconds — only reloading when actual cell data changed. Configure in `backend/config.json`:
  - `excel_url` — Google Sheets export URL (leave empty to use a local file at `excel_path` instead)
  - `sync_interval_sec` — how often to re-check the sheet (default 120; env vars `EXCEL_URL` / `SYNC_INTERVAL_SEC` override both)
- **Backend** parses every sheet, applies the CCMC risk-scoring engine (canonical Tamil Nadu risk-factor classification), and serves ~40 REST endpoints (`/api/stats`, `/api/patients`, `/api/alerts`, `/api/deliveries`, …).
- **Frontend** is a role-aware dashboard (DMCHO / CHO full access; HRT1–8 restricted to assigned PHCs) with patient explorer, risk intelligence, delivery monitoring, call/follow-up tracking, PHC analytics, and reports. Mobile-friendly PWA.

## Quick Start (Windows)

1. Run `backend/SETUP_CCMC.bat` (first time only)
2. Run `backend/start.bat` → opens http://localhost:8001

## Development

```bash
# Backend (port 8001)
cd backend
npm install
node server.js

# Frontend dev server (port 5173, proxies /api → 8001)
cd frontend
npm install
npm run dev

# Production frontend build (output: frontend/dist, served by backend)
cd frontend && npm run build
```

## Deployment

The `Dockerfile` builds the frontend and runs the backend as a single container. `render.yaml` deploys to Render with `EXCEL_URL` pointed at the live Google Sheet (re-synced daily and on manual refresh).
