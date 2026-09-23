import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, 'crash.log');

// Overwrite console.log and console.error to also write to a file
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => {
  origLog(...args);
  try { fs.appendFileSync(logPath, `[LOG] ${args.join(' ')}\n`); } catch(e){}
};
console.error = (...args) => {
  origErr(...args);
  try { fs.appendFileSync(logPath, `[ERR] ${args.join(' ')}\n`); } catch(e){}
};

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

import {
  PORT, HOST, EXCEL_URL, EXCEL_PATH, FRONTEND_DIST, DB_PATH, CLOUD_SYNC_INTERVAL,
} from './src/config.js';
import { loadExcel, loadExcelAsync, downloadExcel, startAutoSync, ensureFreshest, cache, syncState } from './src/excelLoader.js';
import { initStore, usingPostgres, getSettingValue, loadParsedSnapshot } from './src/store.js';
import { backupDb } from './src/activityDb.js';

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
app.use(compression());

app.get('/health', (req, res) => res.status(200).send('OK'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // Increased to 3000 to accommodate frontend 10s/15s/30s polling loops
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

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

// Last: surface async route failures as JSON instead of crashing the process.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(`[API] ${req.method} ${req.path} failed:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  console.log('HIGH RISK MOTHER TRACKER - CCMC Backend');

  // Durable HRT-update store must be ready before we accept requests.
  await initStore();
  console.log(`HRT store : ${usingPostgres ? 'PostgreSQL (persistent)' : `SQLite (${DB_PATH})`}`);
  if (!usingPostgres) {
    // Local SQLite is the only copy — snapshot it daily. In Postgres mode the
    // managed database has its own durability and the local disk is ephemeral.
    backupDb();
    setInterval(backupDb, 24 * 3600 * 1000);
  }
  syncState.autoEnabled = (await getSettingValue('auto_sync_enabled', '1')) === '1';

  // Bind port immediately so Render health checks pass without waiting for Excel
  app.listen(PORT, HOST, () => {
    console.log('Node backend ready on', PORT);
  });

  // Heavy lifting in the background
  const initData = async () => {
    if (usingPostgres) {
      const snap = await loadParsedSnapshot();
      if (snap && snap.length > 0) {
        cache.records = snap;
        cache.ts = new Date().toISOString();
        syncState.lastSyncTime = cache.ts;
        console.log(`[BOOT] Preloaded ${snap.length} records from Postgres fallback`);
      }
    }

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

    await loadExcelAsync();
    syncState.lastMtime = fs.existsSync(EXCEL_PATH) ? fs.statSync(EXCEL_PATH).mtimeMs : null;
    console.log(`Loaded ${cache.records ? cache.records.length : 0} records`);

    // Swap in the DB's best-known workbook if the boot download was stale.
    await ensureFreshest();
    console.log(`Serving   : ${cache.records ? cache.records.length : 0} records`);
    console.log(`Sync mode : ${syncState.autoEnabled ? 'AUTO' : 'MANUAL only'}`);
    console.log('Auto-sync : ON');
    console.log(`Open      : http://localhost:${PORT}`);
    
    startAutoSync();
  };

  initData().catch(e => console.error("Initial data load failed:", e));
}

main();
