import fs from 'fs';
import crypto from 'crypto';
import XLSX from 'xlsx';
import {
  EXCEL_PATH, EXCEL_URL, AUTO_SYNC_INTERVAL, CLOUD_SYNC_INTERVAL,
} from './config.js';

// SheetJS's ESM build doesn't auto-detect Node's fs module — wire it up explicitly
// (https://docs.sheetjs.com/docs/getting-started/installation/nodejs#esm)
XLSX.set_fs(fs);
import { SHEET_TO_PHC, PHC_MAP } from './constants.js';
import { saveSheetSnapshot, loadSheetSnapshot } from './activityDb.js';
import { usingPostgres, getWorkbookMeta, getWorkbookBytes, saveWorkbookBytes } from './store.js';
import { parseRisk } from './riskEngine.js';
import { parseDate, daysToEdd, parseDeliveryDate, splitNameAddress, formatDDMMYYYY } from './parseUtils.js';
import { applyOverrides, overridesVersion } from './overrides.js';

export const cache = { records: null, ts: null };

export const syncState = {
  lastMtime: null,
  lastSyncTime: null,
  syncing: false,
  syncCount: 0,
  autoEnabled: true,
  usingStoredSheet: false,
};

// Data-hash of a download the sheet guard rejected as stale — repeated
// downloads of the same stale copy are skipped instead of thrashing.
let knownStaleHash = null;

function getFileMtime() {
  try {
    return fs.statSync(EXCEL_PATH).mtimeMs;
  } catch {
    return null;
  }
}

function trimStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/**
 * Convert a raw cell value (from sheet_to_json with raw:true) to the string
 * form pandas' dtype=str would produce. Using raw:true + this converter (instead
 * of SheetJS's raw:false display-formatting) avoids Excel's "General" number
 * format switching large IDs (e.g. RCH ID) into scientific notation.
 */
function cellToStr(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    // SheetJS builds date cells with the local Date(y,m,d) constructor (not Date.UTC),
    // so the calendar date must be recovered with local getters, not UTC ones.
    const y = v.getFullYear();
    // A handful of source cells are corrupted (e.g. year 20256) from bad manual entry.
    // Python's datetime (max year 9999) fails to construct these and the value silently
    // becomes NaN -> "" via fillna(""); replicate that instead of leaking garbage dates.
    if (y > 9999 || y < 1) return '';
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    // pandas dtype=str renders date-only Excel cells as a full "YYYY-MM-DD 00:00:00" string
    return `${y}-${m}-${d} 00:00:00`;
  }
  if (typeof v === 'number') return String(v);
  return String(v).trim();
}

/** Build a normalized header -> first-column-index map (case+space tolerant). */
function buildColIndex(headerRow) {
  const map = {};
  headerRow.forEach((h, idx) => {
    const key = trimStr(h).toUpperCase();
    if (!(key in map)) map[key] = idx;
  });
  return map;
}

function findColIndex(colIndex, candidates) {
  for (const cand of candidates) {
    const key = String(cand).trim().toUpperCase();
    if (key in colIndex) return colIndex[key];
  }
  return -1;
}

function col(dataRows, idx, defaultVal = '') {
  if (idx < 0) return dataRows.map(() => defaultVal);
  return dataRows.map((r) => trimStr(r[idx]));
}

const HEADER_SKIP_NAMES = new Set([
  'NAME AND ADD', 'MOTHER NAME AND ADDRESS', 'NAME AND ADDRESS', 'MOTHER NAME',
  'MOTHERNAME', 'NAME AND AD', 'NAME',
]);
const DELIVERY_KEYWORDS = ['DELIVERED', 'DOD', 'LSCS', 'NVD', 'FCH', 'MCH'];
const DELIVERY_KW_RES = DELIVERY_KEYWORDS.map((kw) => new RegExp(`\\b${kw}\\b`));

function buildRecordsFromSheet(sheetName, headerRow, rawDataRows) {
  // ── Normalize column headers ──────────────────────────────────────
  const headers = headerRow.map((h) => trimStr(h));

  // Rename unnamed column immediately after RCH ID as MOTHER NAME
  // (handles sheets like MM HOME where the name column has no header)
  for (const rchCand of ['RCH ID', 'RCH  ID']) {
    const rchUp = rchCand.toUpperCase();
    const colsUp = headers.map((c) => c.toUpperCase());
    const rchPos = colsUp.indexOf(rchUp);
    if (rchPos !== -1) {
      if (rchPos + 1 < headers.length && headers[rchPos + 1] === '') {
        headers[rchPos + 1] = 'MOTHER NAME';
      }
      break;
    }
  }

  // Drop fully-empty rows, stringify all cells
  const dataRows = rawDataRows
    .map((r) => headers.map((_, i) => cellToStr(r[i])))
    .filter((r) => r.some((v) => v !== ''));
  if (dataRows.length === 0) return [];

  const colIndex = buildColIndex(headers);
  const idx = (candidates) => findColIndex(colIndex, candidates);

  const rowNo = col(dataRows, idx(['S.NO', 'S.NO.', 'S NO', 'SNO', 'SL NO', '-']));
  const uphcName = col(dataRows, idx(['UPHC NAME', 'UPHC']));
  const hscName = col(dataRows, idx(['HSC NAME', 'HSC', 'SECTOR', 'sector']));
  const resType = col(dataRows, idx(['RESIDENT/VISITOR', 'RESIDENT / VISITORS', 'RESIDENT / VISITOR', 'RESIDENT']));
  const rchId = col(dataRows, idx(['RCH ID', 'RCH  ID']));
  const motherName = col(dataRows, idx(['MOTHER NAME AND ADDRESS', 'NAME AND ADD', 'NAME AND ADDRESS',
    'MOTHER NAME', 'MOTHERNAME', 'NAME AND AD', 'NAME']));
  const cellNo = col(dataRows, idx(['CELL NO', 'PHONE NO', 'MOBILE NO', 'MOBILE NUMBER', 'MOBILE', 'PHONE']));
  const husband = col(dataRows, idx(['HUSBAND NAME', 'HUSBAND']));
  const gravida = col(dataRows, idx(['GRAVIDA', 'GRAVIDA  PARA', 'GRAVIDA PARA']));
  const para = col(dataRows, idx(['PARA']));
  const lmp = col(dataRows, idx(['LMP']));
  const edd = col(dataRows, idx(['EDD']));
  const weeks = col(dataRows, idx(['WEEKS', 'WKS', 'weeks']));
  const highRisk = col(dataRows, idx(['HIGH RISK', 'HIGH RISK ', 'HIGH RISH', 'HIGH RISK FACTORS']));
  const height = col(dataRows, idx(['HEIGHT']));
  const weight = col(dataRows, idx(['WT', 'WEIGHT']));
  const bp = col(dataRows, idx(['BP', 'BLOOD PRESSURE']));
  const hb = col(dataRows, idx(['HB', 'HAEMOGLOBIN', 'HEMOGLOBIN']));
  const gct = col(dataRows, idx(['GCT']));
  const ppbs = col(dataRows, idx(['PPBS', 'FBS/PPBS', 'FBS/PPBS ', 'FBS']));
  const echo = col(dataRows, idx(['ECHO/ECG', 'ECG/ECHO', 'ECG/ECO', 'ECHO']));
  const usg = col(dataRows, idx(['USG']));
  const tsh = col(dataRows, idx(['TSH']));
  const bloodGrp = col(dataRows, idx(['BLOOD GROUP', 'BLLOD GROUP']));
  const sputum = col(dataRows, idx(['SPUTUM AFB', 'AFB SP', 'SPUTUM']));
  const urine = col(dataRows, idx(['URINE ROUTINE', 'URINE RE', 'URINE']));
  const birthPlan = col(dataRows, idx(['BIRTH PLAN', 'BIRTH  PLAN', 'BIRTHPLAN', 'REGULAR FOLLOW UP']));
  const referral = col(dataRows, idx(['REFERRAL DETAILS', 'REFERAL DETAILS', 'REFERAL', 'REMARKS']));
  const lastVisit = col(dataRows, idx(['UPHC LAST VISIT DATE', 'LAST VISIT DATE']));
  const actionTaken = col(dataRows, idx(['UPHC ACTION TAKEN \n(1st follow up)', 'UPHC ACTION TAKEN',
    'ACTION TAKEN', 'UPHC ACTION TAKEN \n(1ST FOLLOW UP)']));
  const callDate = col(dataRows, idx(['CALL DATE', 'CALL DT']));
  const nextVisit = col(dataRows, idx(['NEXT VISIT DATE \nONLY FILL BY UPHC', 'NEXT VISIT DATE', 'NEXT VISIT']));
  const uphcResponse = col(dataRows, idx(['UPHC RESPONSE AS PER NEXT VISIT', 'UPHC RESPONSE']));
  const nextPlan = col(dataRows, idx(['NEXT PLAN OF VISIT PLACE AND TIME ', 'NEXT PLAN OF VISIT PLACE AND TIME',
    'PLAN OF NEXT VISIT DATE AND PLACE', 'PLAN OF NEXT VISIT DATE & PLACE ']));
  const deliveryOutcomeCol = col(dataRows, idx(['DELIVERY OUTCOME', 'DELIVERY DETAILS', 'DELIVARY DETAILS',
    'DELIVERY OUTCOME ', ' DELIVERY OUTCOME', 'M,,,']));

  const sheetKey = sheetName.toUpperCase().trim();
  const phcKey = SHEET_TO_PHC[sheetKey] || sheetKey;
  const hrtInfo = PHC_MAP[phcKey] || { hrt_code: 'UNASSIGNED', hrt_name: 'Unassigned', phc_display: sheetName };

  const todayD = new Date();
  const today0 = new Date(Date.UTC(todayD.getFullYear(), todayD.getMonth(), todayD.getDate()));

  const out = [];
  for (let i = 0; i < dataRows.length; i++) {
    const nameRaw = motherName[i];
    if (HEADER_SKIP_NAMES.has(nameRaw.toUpperCase())) continue;

    const rchValRaw = rchId[i];
    // A lone "0" in EDD is a spreadsheet fill-down artifact (RAJA STREET has
    // hundreds of otherwise-empty rows like this), not a real record.
    const eddValRaw = edd[i] === '0' ? '' : edd[i];
    if (!nameRaw && !rchValRaw && !eddValRaw) continue;

    let { name: cleanName, address } = splitNameAddress(nameRaw);
    if (!cleanName) {
      cleanName = rowNo[i] && !['', 'nan'].includes(rowNo[i]) ? `Entry #${rowNo[i]}` : `Row ${i + 1}`;
    }

    const eddClean = edd[i].split(/\/|Scan|scan/)[0].trim();
    const daysLeft = daysToEdd(eddClean);

    const delOutcomeVal = deliveryOutcomeCol[i];
    const deliveryInfo = delOutcomeVal || (nextPlan[i] || uphcResponse[i]);
    const isDelivered = Boolean(delOutcomeVal.trim())
      || DELIVERY_KW_RES.some((re) => re.test(String(deliveryInfo).toUpperCase()));

    const uphcRespVal = delOutcomeVal || uphcResponse[i];
    const actualDdate = isDelivered ? parseDeliveryDate(uphcRespVal) : null;
    let daysSinceDel = null;
    if (actualDdate) {
      daysSinceDel = Math.round((today0.getTime() - actualDdate.getTime()) / 86400000);
    } else if (isDelivered && daysLeft !== null && daysLeft < 0) {
      daysSinceDel = Math.abs(daysLeft);
    }

    const rch = rchId[i];
    const uid = rch ? `${phcKey}_${i}_${rch}` : `${phcKey}_${i}`;

    const { score, factors, category } = parseRisk(highRisk[i]);

    out.push({
      uid,
      row_no: rowNo[i],
      phc_key: phcKey,
      phc_display: hrtInfo.phc_display,
      hrt_code: hrtInfo.hrt_code,
      hrt_name: hrtInfo.hrt_name,
      uphc_name: uphcName[i] || hrtInfo.phc_display,
      hsc_name: hscName[i],
      resident_type: resType[i],
      rch_id: rch,
      mother_name: cleanName,
      address,
      cell_no: cellNo[i],
      husband_name: husband[i],
      gravida: gravida[i],
      para: para[i],
      lmp: lmp[i],
      edd: eddClean,
      days_to_edd: daysLeft,
      weeks: weeks[i],
      high_risk_raw: highRisk[i],
      risk_score: score,
      risk_factors: factors,
      risk_category: category,
      height: height[i],
      weight: weight[i],
      bp: bp[i],
      hb: hb[i],
      gct: gct[i],
      ppbs: ppbs[i],
      echo_ecg: echo[i],
      usg: usg[i],
      tsh: tsh[i],
      blood_group: bloodGrp[i],
      sputum_afb: sputum[i],
      urine_routine: urine[i],
      birth_plan: birthPlan[i],
      referral: referral[i],
      last_visit_date: lastVisit[i],
      action_taken: actionTaken[i],
      call_date: callDate[i],
      next_visit_date: nextVisit[i],
      uphc_response: uphcResponse[i],
      delivery_info: deliveryInfo,
      delivery_date: actualDdate ? formatDDMMYYYY(actualDdate) : '',
      days_since_delivery: daysSinceDel,
      is_delivered: isDelivered,
    });
  }
  return out;
}

/** Spreadsheet file unusable — serve the last good dataset from the DB. */
function loadFromDbFallback(reason) {
  let records = null;
  try {
    records = loadSheetSnapshot();
  } catch (e) {
    console.log(`[DB] Snapshot read failed: ${e.message}`);
  }
  if (records) {
    console.log(`[DB] ${reason} — serving ${records.length} records from database snapshot`);
  }
  cache.records = records || [];
  cache.ts = new Date().toISOString();
  return cache.records;
}

export function loadExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    return loadFromDbFallback('Spreadsheet file missing');
  }

  let wb;
  try {
    wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  } catch (e) {
    return loadFromDbFallback(`Spreadsheet unreadable (${e.message})`);
  }
  const records = [];

  for (const sheetName of wb.SheetNames) {
    const sheetKey = sheetName.toUpperCase().trim();
    if (sheetKey.startsWith('SHEET') && !(sheetKey in SHEET_TO_PHC)) continue;

    let rows;
    try {
      rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
        header: 1, raw: true, defval: '',
      });
    } catch {
      continue;
    }
    if (!rows || rows.length === 0) continue;
    // Some tabs (e.g. SN PALAYAM) have blank rows above the real header row.
    // Taking row 0 as the header would make every column lookup miss and the
    // whole tab silently load as zero records.
    const headerIdx = rows.findIndex((r) => r.some((v) => trimStr(v) !== ''));
    if (headerIdx === -1) continue;
    const headerRow = rows[headerIdx];
    const dataRows = rows.slice(headerIdx + 1);
    records.push(...buildRecordsFromSheet(sheetName, headerRow, dataRows));
  }

  // A workbook that parses to zero records is a bad download, not real data —
  // don't let it replace the last good snapshot.
  if (records.length === 0) {
    return loadFromDbFallback('Spreadsheet parsed to 0 records');
  }

  cache.records = records;
  cache.ts = new Date().toISOString();
  syncState.lastSyncTime = cache.ts;

  // Mirror every successful sheet load into the DB so the full dataset
  // survives even if the sheet or its cache file is lost.
  try {
    saveSheetSnapshot(records);
  } catch (e) {
    console.log(`[DB] Snapshot save failed: ${e.message}`);
  }
  return records;
}

// Merged view = Excel base data + app-side patient overrides. Recomputed only
// when the Excel cache reloads or an override is saved.
const merged = { records: null, baseTs: null, version: -1 };

export function getData() {
  if (cache.records === null) loadExcel();
  if (merged.records === null || merged.baseTs !== cache.ts || merged.version !== overridesVersion()) {
    merged.records = applyOverrides(cache.records);
    merged.baseTs = cache.ts;
    merged.version = overridesVersion();
  }
  return merged.records;
}

/**
 * Hash only the worksheet data inside the xlsx (zip entry CRC32s of
 * xl/worksheets/* and xl/sharedStrings.xml). Google Sheets' export rewrites
 * zip metadata/timestamps on every download, so hashing raw bytes would
 * report "changed" every sync cycle even when no cell was edited.
 */
function xlsxDataHash(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    // End Of Central Directory record — search backwards (sig 0x06054b50)
    let eocd = -1;
    const minEocd = Math.max(0, buf.length - 65557);
    for (let i = buf.length - 22; i >= minEocd; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return null;
    const count = buf.readUInt16LE(eocd + 10);
    let off = buf.readUInt32LE(eocd + 16);
    const entries = [];
    for (let n = 0; n < count; n++) {
      if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break;
      const crc = buf.readUInt32LE(off + 16);
      const nameLen = buf.readUInt16LE(off + 28);
      const extraLen = buf.readUInt16LE(off + 30);
      const commentLen = buf.readUInt16LE(off + 32);
      const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
      if (name.startsWith('xl/worksheets/') || name === 'xl/sharedStrings.xml') {
        entries.push(`${name}:${crc}`);
      }
      off += 46 + nameLen + extraLen + commentLen;
    }
    if (entries.length === 0) return null;
    entries.sort();
    return crypto.createHash('md5').update(entries.join('|')).digest('hex');
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Replace dest with src. On Windows the destination is often briefly locked
 * (file open in Excel, antivirus scan, OneDrive sync) and rename throws
 * EPERM/EBUSY — retry with backoff, then fall back to copy+delete.
 */
export async function replaceFile(src, dest) {
  let lastErr;
  for (let i = 0; i < 5; i++) {
    try {
      fs.renameSync(src, dest);
      return;
    } catch (e) {
      lastErr = e;
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      await sleep(200 * (i + 1));
    }
  }
  try {
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
  } catch {
    throw lastErr;
  }
}

/** Download Excel from EXCEL_URL. Supports GitHub release assets and Google Sheets. */
export async function downloadExcel() {
  if (!EXCEL_URL) return false;
  const tmp = `${EXCEL_PATH}.download`;
  const githubToken = (process.env.GITHUB_TOKEN || '').trim();

  try {
    let resp;
    if (githubToken && EXCEL_URL.includes('api.github.com')) {
      resp = await fetch(EXCEL_URL, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/octet-stream',
          'User-Agent': 'CCMC-Tracker/1.0',
        },
      });
    } else if (EXCEL_URL.includes('docs.google.com')) {
      const bustUrl = EXCEL_URL + (EXCEL_URL.includes('?') ? '&' : '?') + `cachebuster=${Date.now()}`;
      resp = await fetch(bustUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*',
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
    } else {
      resp = await fetch(EXCEL_URL, { headers: { 'User-Agent': 'Mozilla/5.0 CCMC-Tracker' } });
    }

    if (!resp.ok) {
      console.log(`[CLOUD-SYNC] Download failed: HTTP ${resp.status}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());

    if (EXCEL_URL.includes('docs.google.com')) {
      if (!(buf[0] === 0x50 && buf[1] === 0x4b)) { // 'PK' ZIP/XLSX magic bytes
        console.log('[CLOUD-SYNC] Google Sheets returned non-Excel content (possibly blocked)');
        return false;
      }
    }
    fs.writeFileSync(tmp, buf);

    let changed = true;
    if (fs.existsSync(EXCEL_PATH)) {
      const oldHash = xlsxDataHash(EXCEL_PATH);
      const newHash = xlsxDataHash(tmp);
      if (oldHash && newHash && oldHash === newHash) changed = false;
    }

    if (changed && knownStaleHash) {
      const newHash = xlsxDataHash(tmp);
      if (newHash && newHash === knownStaleHash) {
        fs.unlinkSync(tmp);
        console.log('[SHEET-GUARD] Source is still serving the known-stale copy — ignored');
        return false;
      }
    }

    if (changed) {
      await replaceFile(tmp, EXCEL_PATH);
      console.log('[CLOUD-SYNC] Data changed — new spreadsheet downloaded');
    } else {
      fs.unlinkSync(tmp);
      console.log('[CLOUD-SYNC] No data change detected');
    }
    return changed;
  } catch (e) {
    console.log(`[CLOUD-SYNC] Download error: ${e.message}`);
    return false;
  }
}

/**
 * Postgres mode: keep the best-known workbook in the DB and reject stale
 * downloads. The configured source can serve an outdated copy (a frozen
 * GitHub release asset, or Google's export cache); if the current parse has
 * ≥3% fewer records than the stored best, swap the stored workbook in.
 * Fresher parses become the new stored best. `forceStore` (admin upload)
 * always replaces the stored best — explicit admin intent wins.
 */
export async function ensureFreshest({ forceStore = false } = {}) {
  if (!usingPostgres) return;
  try {
    const cur = cache.records ? cache.records.length : 0;

    if (forceStore && cur > 0) {
      await saveWorkbookBytes(fs.readFileSync(EXCEL_PATH), cur, 'admin-upload');
      syncState.usingStoredSheet = false;
      knownStaleHash = null;
      console.log(`[SHEET-GUARD] Admin upload stored as best-known workbook (${cur} records)`);
      return;
    }

    const meta = await getWorkbookMeta();
    if (meta && cur < meta.record_count * 0.97) {
      const bytes = await getWorkbookBytes();
      if (bytes && bytes.length) {
        knownStaleHash = xlsxDataHash(EXCEL_PATH);
        fs.writeFileSync(EXCEL_PATH, bytes);
        loadExcel();
        syncState.lastMtime = getFileMtime();
        syncState.usingStoredSheet = true;
        console.log(`[SHEET-GUARD] Source copy had ${cur} records vs ${meta.record_count} best-known `
          + `(${meta.source}, ${meta.saved_at}) — serving stored workbook (${cache.records.length} records)`);
      }
      return;
    }

    if (cur > 0 && (!meta || cur >= meta.record_count)) {
      await saveWorkbookBytes(fs.readFileSync(EXCEL_PATH), cur, 'download');
      syncState.usingStoredSheet = false;
    }
  } catch (e) {
    console.log(`[SHEET-GUARD] Check failed: ${e.message}`);
  }
}

/** Background loop: local mtime check (every 5s) or cloud re-download (every 24h). */
export function startAutoSync() {
  let cloudElapsed = 0;

  setTimeout(() => {
    syncState.lastMtime = getFileMtime();

    setInterval(async () => {
      if (!syncState.autoEnabled || syncState.syncing) return;

      let shouldReload = false;

      if (EXCEL_URL) {
        cloudElapsed += AUTO_SYNC_INTERVAL;
        if (cloudElapsed >= CLOUD_SYNC_INTERVAL) {
          cloudElapsed = 0;
          console.log('[CLOUD-SYNC] Checking Google Sheets for updates…');
          if (await downloadExcel()) {
            console.log('[CLOUD-SYNC] Data changed — reloading…');
            shouldReload = true;
          } else {
            console.log('[CLOUD-SYNC] No change.');
          }
        }
      } else {
        const currentMtime = getFileMtime();
        if (currentMtime && currentMtime !== syncState.lastMtime) {
          console.log('[AUTO-SYNC] Excel file changed — reloading…');
          shouldReload = true;
        }
      }

      if (shouldReload) {
        syncState.syncing = true;
        try {
          loadExcel();
          await ensureFreshest();
          syncState.lastMtime = getFileMtime();
          syncState.lastSyncTime = new Date().toISOString();
          syncState.syncCount += 1;
          console.log(`[SYNC] Done — ${cache.records ? cache.records.length : 0} records live`);
        } catch (e) {
          console.log(`[SYNC] Reload error: ${e.message}`);
        } finally {
          syncState.syncing = false;
        }
      }
    }, AUTO_SYNC_INTERVAL * 1000);
  }, 20000);
}
