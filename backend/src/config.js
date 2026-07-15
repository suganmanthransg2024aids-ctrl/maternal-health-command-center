import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_DIR = path.resolve(__dirname, '..');
export const FRONTEND_DIST = path.resolve(BASE_DIR, '..', 'frontend', 'dist');

const cfgFile = path.join(BASE_DIR, 'config.json');
let cfg = {};
if (fs.existsSync(cfgFile)) {
  try {
    cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf-8'));
  } catch {
    cfg = {};
  }
}

// Cloud data source: env var wins, then config.json's excel_url
export const EXCEL_URL = (process.env.EXCEL_URL || cfg.excel_url || '').trim();

const bundledExcel = path.join(BASE_DIR, 'data.xlsx');
let excelPath;
if (EXCEL_URL) {
  excelPath = path.join(BASE_DIR, 'ccmc_data_cache.xlsx');
} else if (fs.existsSync(bundledExcel)) {
  excelPath = bundledExcel;
} else {
  const defaultExcel = path.join(
    BASE_DIR, '..', '..', '..', 'Downloads',
    'ccmc maternal',
    'Coimbatore Corp Zonewise HR Mother Updation .xlsx'
  );
  excelPath = path.resolve(cfg.excel_path || process.env.EXCEL_PATH || defaultExcel);
}
export const EXCEL_PATH = excelPath;

export const PORT = parseInt(process.env.PORT || cfg.port || 8001, 10);
export const HOST = cfg.host || '0.0.0.0';

export const CALLS_FILE = path.join(BASE_DIR, 'call_tracking.json');
export const FOLLOWUP_FILE = path.join(BASE_DIR, 'followup_data.json');
export const OVERRIDES_FILE = path.join(BASE_DIR, 'patient_overrides.json');
export const DB_PATH = path.join(BASE_DIR, 'logs.db');

export const AUTO_SYNC_INTERVAL = 5; // seconds — local mtime check interval

// Cloud spreadsheet re-download interval (seconds). Overridable via
// SYNC_INTERVAL_SEC env var or config.json's sync_interval_sec.
export const CLOUD_SYNC_INTERVAL = Math.max(
  30,
  parseInt(process.env.SYNC_INTERVAL_SEC || cfg.sync_interval_sec || 120, 10) || 120
);
