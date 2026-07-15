import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import {
  PORT, HOST, EXCEL_URL, EXCEL_PATH, FRONTEND_DIST, DB_PATH, CLOUD_SYNC_INTERVAL,
} from './src/config.js';
import { loadExcel, downloadExcel, startAutoSync, cache, syncState } from './src/excelLoader.js';
import { initDb } from './src/activityDb.js';

import healthRouter from './src/routes/health.js';
import authRouter from './src/routes/auth.js';
import syncRouter from './src/routes/sync.js';
import patientsRouter from './src/routes/patients.js';
import editsRouter from './src/routes/edits.js';
import alertsRouter from './src/routes/alerts.js';
import callsRouter from './src/routes/calls.js';
import activityRouter from './src/routes/activity.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', syncRouter);
app.use('/api', patientsRouter);
app.use('/api', editsRouter);
app.use('/api', alertsRouter);
// activityRouter must be mounted before callsRouter: unlike Flask's routing
// (which always prefers a static rule like /calls/log over a dynamic
// /calls/<uid>), Express matches in registration order, so callsRouter's
// POST /calls/:uid would otherwise swallow POST /calls/log first.
app.use('/api', activityRouter);
app.use('/api', callsRouter);

// ── Static React frontend ──────────────────────────────────────────────────
app.use(express.static(FRONTEND_DIST));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const full = path.join(FRONTEND_DIST, req.path);
  if (req.path !== '/' && fs.existsSync(full) && fs.statSync(full).isFile()) {
    return res.sendFile(full);
  }
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

async function main() {
  console.log('HIGH RISK MOTHER TRACKER - CCMC Backend');
  if (EXCEL_URL) {
    console.log(`Mode  : CLOUD — Google Sheets sync every ${CLOUD_SYNC_INTERVAL}s`);
    console.log(`URL   : ${EXCEL_URL}`);
    console.log(`Cache : ${EXCEL_PATH}`);
    console.log('Downloading initial data from Google Sheets…');
    await downloadExcel();
  } else {
    console.log('Mode  : LOCAL — mtime watch every 5s');
    console.log(`Excel : ${EXCEL_PATH}`);
  }
  console.log(`Dist  : ${FRONTEND_DIST}`);

  loadExcel();
  syncState.lastMtime = fs.existsSync(EXCEL_PATH) ? fs.statSync(EXCEL_PATH).mtimeMs : null;
  console.log(`Loaded ${cache.records ? cache.records.length : 0} records`);

  startAutoSync();

  initDb();
  console.log(`Activity DB: ${DB_PATH}`);
  console.log('Auto-sync : ON');
  console.log(`Open      : http://localhost:${PORT}`);

  app.listen(PORT, HOST, () => {
    console.log('Node backend ready on', PORT);
  });
}

main();
