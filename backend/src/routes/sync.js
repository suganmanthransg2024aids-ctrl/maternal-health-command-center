import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import XLSX from 'xlsx';
import { EXCEL_PATH, EXCEL_URL, AUTO_SYNC_INTERVAL, CLOUD_SYNC_INTERVAL } from '../config.js';
import { cache, syncState, loadExcel, downloadExcel, replaceFile } from '../excelLoader.js';
import { setSettingValue } from '../store.js';
import { asyncRoute } from '../helpers.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/refresh', async (req, res) => {
  cache.records = null;
  syncState.syncing = true;
  let downloaded = false;
  try {
    if (EXCEL_URL) {
      console.log('[REFRESH] Force-downloading from Google Sheets…');
      downloaded = await downloadExcel();
      console.log(`[REFRESH] Download ${downloaded ? 'changed' : 'no change'}`);
    }
    loadExcel();
    syncState.lastSyncTime = new Date().toISOString();
    syncState.syncCount += 1;
    syncState.lastMtime = fs.existsSync(EXCEL_PATH) ? fs.statSync(EXCEL_PATH).mtimeMs : null;
  } finally {
    syncState.syncing = false;
  }
  const records = cache.records ? cache.records.length : 0;
  res.json({
    success: true,
    records,
    ts: cache.ts,
    downloaded,
    source: EXCEL_URL ? 'google_sheets' : 'local_file',
  });
});

router.post('/upload-excel', upload.single('file'), async (req, res) => {
  const role = req.body.role || '';
  if (!['CHO', 'DMCHO'].includes(role)) {
    return res.status(403).json({ error: 'Only CHO or DMCHO can upload data' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  const filename = req.file.originalname || '';
  if (!(filename.endsWith('.xlsx') || filename.endsWith('.xls'))) {
    return res.status(400).json({ error: 'Only Excel files (.xlsx / .xls) are accepted' });
  }

  const tmp = `${EXCEL_PATH}.upload_tmp`;
  let sheetCount = 0;
  try {
    fs.writeFileSync(tmp, req.file.buffer);
    const wb = XLSX.readFile(tmp);
    sheetCount = wb.SheetNames.length;
    if (sheetCount < 5) {
      fs.unlinkSync(tmp);
      return res.status(400).json({ error: 'File appears invalid — fewer than 5 sheets found' });
    }
    await replaceFile(tmp, EXCEL_PATH);
  } catch (e) {
    if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp); } catch { /* tmp may be locked too */ }
    if (['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) {
      return res.status(500).json({
        error: 'Upload failed: the Excel data file is locked by another program. '
          + 'Close it in Microsoft Excel (or pause OneDrive sync) and try again.',
      });
    }
    return res.status(500).json({ error: `Upload failed: ${e.message}` });
  }

  cache.records = null;
  syncState.syncing = true;
  try {
    loadExcel();
    syncState.lastSyncTime = new Date().toISOString();
    syncState.syncCount += 1;
    syncState.lastMtime = fs.existsSync(EXCEL_PATH) ? fs.statSync(EXCEL_PATH).mtimeMs : null;
  } finally {
    syncState.syncing = false;
  }

  const records = cache.records ? cache.records.length : 0;
  res.json({
    success: true,
    records,
    sheets: sheetCount,
    ts: cache.ts,
    message: `Data updated — ${records.toLocaleString()} mother records loaded from ${sheetCount} PHC sheets`,
  });
});

/** Switch between automatic (every 60s) and manual-only spreadsheet sync.
 *  Admin only. The choice is stored in the DB so it survives restarts. */
router.post('/sync-auto', asyncRoute(async (req, res) => {
  const b = req.body || {};
  const role = String(b.role || '').toUpperCase();
  if (!['CHO', 'DMCHO'].includes(role)) {
    return res.status(403).json({ error: 'Only CHO or DMCHO can change the sync mode' });
  }
  if (typeof b.enabled !== 'boolean') {
    return res.status(400).json({ error: '"enabled" must be true or false' });
  }
  syncState.autoEnabled = b.enabled;
  await setSettingValue('auto_sync_enabled', b.enabled ? '1' : '0', role);
  console.log(`[SYNC] ${role} set sync mode: ${b.enabled ? 'AUTO (interval)' : 'MANUAL only'}`);
  res.json({ success: true, auto_enabled: syncState.autoEnabled });
}));

/** Returns real-time sync state for the frontend auto-refresh polling. */
router.get('/sync-status', (req, res) => {
  res.json({
    last_sync_time: syncState.lastSyncTime || cache.ts,
    syncing: syncState.syncing,
    sync_count: syncState.syncCount,
    auto_enabled: syncState.autoEnabled,
    interval_sec: EXCEL_URL ? CLOUD_SYNC_INTERVAL : AUTO_SYNC_INTERVAL,
    records: cache.records ? cache.records.length : 0,
    excel_modified: syncState.lastMtime,
    // Which source this instance is actually pulling from — surfaced so a
    // wrong EXCEL_URL on a deployment is visible without server-log access.
    excel_url: EXCEL_URL || null,
  });
});

export default router;
