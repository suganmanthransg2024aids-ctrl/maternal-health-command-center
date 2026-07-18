import fs from 'fs';
import Database from 'better-sqlite3';
import { DB_PATH, CALLS_FILE, FOLLOWUP_FILE, OVERRIDES_FILE } from './config.js';
import { loadJson } from './jsonStore.js';
import { USERS } from './constants.js';

let db = null;

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS call_logs (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        mother_id    TEXT NOT NULL,
        mother_name  TEXT,
        phc          TEXT,
        hrt_user     TEXT NOT NULL,
        call_date    TEXT NOT NULL,
        call_time    TEXT NOT NULL,
        outcome      TEXT NOT NULL,
        notes        TEXT
    );
    CREATE TABLE IF NOT EXISTS status_updates (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        mother_id        TEXT NOT NULL,
        mother_name      TEXT,
        phc              TEXT,
        hrt_user         TEXT NOT NULL,
        new_status       TEXT NOT NULL,
        notes            TEXT,
        submitted_at     TEXT NOT NULL,
        approved_by      TEXT,
        approved_at      TEXT,
        is_approved      INTEGER DEFAULT 0,
        rejection_reason TEXT
    );
    CREATE TABLE IF NOT EXISTS call_tracking (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        uid                TEXT NOT NULL,
        mother_name        TEXT,
        phc_key            TEXT,
        hrt_code           TEXT,
        date               TEXT,
        time               TEXT,
        status             TEXT,
        caller_name        TEXT,
        remarks            TEXT,
        outcome            TEXT,
        next_followup_date TEXT,
        next_followup_time TEXT,
        recorded_at        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_call_tracking_uid ON call_tracking(uid);
    CREATE TABLE IF NOT EXISTS followup_tracking (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        uid               TEXT NOT NULL,
        mother_name       TEXT,
        phc_key           TEXT,
        hrt_code          TEXT,
        visit_date        TEXT,
        status            TEXT,
        remarks           TEXT,
        escalation_status TEXT,
        next_visit_date   TEXT,
        recorded_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_followup_tracking_uid ON followup_tracking(uid);

    -- Mirror of the parsed spreadsheet — replaced on every sheet load, so the
    -- full patient dataset always survives in the DB even if the sheet or its
    -- cache file is lost.
    CREATE TABLE IF NOT EXISTS sheet_records (
        uid       TEXT PRIMARY KEY,
        data      TEXT NOT NULL,
        synced_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        synced_at    TEXT NOT NULL,
        record_count INTEGER NOT NULL
    );

    -- Website edits (patient detail edits, delivery/abortion assignments),
    -- merged over sheet data at read time.
    CREATE TABLE IF NOT EXISTS patient_overrides (
        uid        TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        updated_by TEXT,
        updated_at TEXT
    );
    -- Append-only audit of every website change — kept even when an override
    -- is later removed or reverted.
    CREATE TABLE IF NOT EXISTS edit_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        uid         TEXT NOT NULL,
        action      TEXT NOT NULL,
        data        TEXT,
        updated_by  TEXT,
        recorded_at TEXT NOT NULL
    );

    -- App configuration that must survive restarts (e.g. auto-sync mode).
    CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_by TEXT,
        updated_at TEXT
    );

    -- Auth: portal accounts + append-only login history.
    CREATE TABLE IF NOT EXISTS users (
        username    TEXT PRIMARY KEY,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL,
        name        TEXT,
        phcs        TEXT,
        full_access INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS login_history (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        role     TEXT,
        success  INTEGER NOT NULL,
        at       TEXT NOT NULL
    );
`;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA);
    // mother_key = stable RCH-based identity (survives sheet row reordering)
    for (const table of ['call_logs', 'status_updates']) {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      if (!cols.some((c) => c.name === 'mother_key')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN mother_key TEXT`);
      }
    }
    seedUsers(db);
  }
  return db;
}

/** Insert accounts from constants.js that the DB doesn't have yet. Existing
 *  rows are left alone so password/name changes made in the DB stick. */
function seedUsers(conn) {
  const ins = conn.prepare(
    'INSERT OR IGNORE INTO users (username,password,role,name,phcs,full_access) VALUES (?,?,?,?,?,?)'
  );
  const tx = conn.transaction(() => {
    for (const [username, u] of Object.entries(USERS)) {
      ins.run(username, u.password, u.role, u.name, JSON.stringify(u.phcs || []), u.full_access ? 1 : 0);
    }
  });
  tx();
}

export function initDb() {
  getDb();
}

// ── HRT call tracking (append-only history, one row per status update) ─────

const CALL_ENTRY_FIELDS = ['date', 'time', 'status', 'caller_name', 'remarks',
  'outcome', 'next_followup_date', 'next_followup_time', 'recorded_at'];
const FU_ENTRY_FIELDS = ['visit_date', 'status', 'remarks', 'escalation_status',
  'next_visit_date', 'recorded_at'];

function rowToEntry(row, fields) {
  const e = {};
  for (const f of fields) e[f] = row[f] === null ? '' : row[f];
  return e;
}

/**
 * Insert one call status update. `meta` is a snapshot of the mother's
 * identity at the time of the call (kept in the row so history remains
 * attributable even if the spreadsheet row later moves or disappears).
 * Returns the total number of calls recorded for this uid.
 */
export function addCallEntry(uid, entry, meta = {}) {
  const conn = getDb();
  conn.prepare(`INSERT INTO call_tracking
      (uid, mother_name, phc_key, hrt_code, date, time, status, caller_name,
       remarks, outcome, next_followup_date, next_followup_time, recorded_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(uid, meta.mother_name || '', meta.phc_key || '', meta.hrt_code || '',
      entry.date || '', entry.time || '', entry.status || '', entry.caller_name || '',
      entry.remarks || '', entry.outcome || '', entry.next_followup_date || '',
      entry.next_followup_time || '', entry.recorded_at || new Date().toISOString());
  return conn.prepare('SELECT COUNT(*) AS c FROM call_tracking WHERE uid=?').get(uid).c;
}

export function addFollowupEntry(uid, entry, meta = {}) {
  const conn = getDb();
  conn.prepare(`INSERT INTO followup_tracking
      (uid, mother_name, phc_key, hrt_code, visit_date, status, remarks,
       escalation_status, next_visit_date, recorded_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(uid, meta.mother_name || '', meta.phc_key || '', meta.hrt_code || '',
      entry.visit_date || '', entry.status || '', entry.remarks || '',
      entry.escalation_status || '', entry.next_visit_date || '',
      entry.recorded_at || new Date().toISOString());
  return conn.prepare('SELECT COUNT(*) AS c FROM followup_tracking WHERE uid=?').get(uid).c;
}

/** All call history as { uid: [entries in chronological order] } — the same
 *  shape the old call_tracking.json store had, so analytics code is unchanged. */
export function getCallsMap() {
  const map = {};
  for (const row of getDb().prepare('SELECT * FROM call_tracking ORDER BY id').all()) {
    (map[row.uid] = map[row.uid] || []).push(rowToEntry(row, CALL_ENTRY_FIELDS));
  }
  return map;
}

export function getFollowupsMap() {
  const map = {};
  for (const row of getDb().prepare('SELECT * FROM followup_tracking ORDER BY id').all()) {
    (map[row.uid] = map[row.uid] || []).push(rowToEntry(row, FU_ENTRY_FIELDS));
  }
  return map;
}

export function getCallHistory(uid) {
  return getDb().prepare('SELECT * FROM call_tracking WHERE uid=? ORDER BY id').all(uid)
    .map((row) => rowToEntry(row, CALL_ENTRY_FIELDS));
}

// ── Spreadsheet mirror ─────────────────────────────────────────────────────

/** Replace the sheet_records mirror with the freshly parsed dataset. */
export function saveSheetSnapshot(records) {
  const conn = getDb();
  const now = new Date().toISOString();
  const ins = conn.prepare('INSERT INTO sheet_records (uid, data, synced_at) VALUES (?,?,?)');
  const tx = conn.transaction(() => {
    conn.prepare('DELETE FROM sheet_records').run();
    for (const r of records) ins.run(String(r.uid), JSON.stringify(r), now);
    conn.prepare('INSERT INTO sync_log (synced_at, record_count) VALUES (?,?)').run(now, records.length);
  });
  tx();
}

/** Last good dataset from the DB, or null if none stored yet. Used as a
 *  fallback when the spreadsheet/cache file is unavailable. */
export function loadSheetSnapshot() {
  const rows = getDb().prepare('SELECT data FROM sheet_records').all();
  if (rows.length === 0) return null;
  const out = [];
  for (const row of rows) {
    try { out.push(JSON.parse(row.data)); } catch { /* skip corrupt row */ }
  }
  return out.length ? out : null;
}

// ── Website edits (patient overrides) ──────────────────────────────────────

export function getOverridesMap() {
  const map = {};
  for (const row of getDb().prepare('SELECT uid, data FROM patient_overrides').all()) {
    try { map[row.uid] = JSON.parse(row.data); } catch { /* skip corrupt row */ }
  }
  return map;
}

/**
 * Persist the full overrides map (same shape the routes already build) and
 * append what changed to edit_history so no website edit is ever lost —
 * even ones later reverted or removed.
 */
export function saveOverridesMap(map) {
  const conn = getDb();
  const now = new Date().toISOString();
  const before = getOverridesMap();
  const ins = conn.prepare(
    'INSERT OR REPLACE INTO patient_overrides (uid, data, updated_by, updated_at) VALUES (?,?,?,?)'
  );
  const del = conn.prepare('DELETE FROM patient_overrides WHERE uid=?');
  const hist = conn.prepare(
    'INSERT INTO edit_history (uid, action, data, updated_by, recorded_at) VALUES (?,?,?,?,?)'
  );
  const tx = conn.transaction(() => {
    for (const [uid, entry] of Object.entries(map)) {
      const json = JSON.stringify(entry);
      if (JSON.stringify(before[uid]) === json) continue; // unchanged
      ins.run(uid, json, entry.updated_by || '', entry.updated_at || now);
      hist.run(uid, 'saved', json, entry.updated_by || '', now);
    }
    for (const uid of Object.keys(before)) {
      if (!(uid in map)) {
        del.run(uid);
        hist.run(uid, 'removed', JSON.stringify(before[uid]), '', now);
      }
    }
  });
  tx();
}

/** Upsert one override row + append to the edit_history audit. */
export function putOverrideRow(key, entry) {
  const conn = getDb();
  const now = new Date().toISOString();
  const json = JSON.stringify(entry);
  conn.prepare(
    'INSERT OR REPLACE INTO patient_overrides (uid, data, updated_by, updated_at) VALUES (?,?,?,?)'
  ).run(key, json, entry.updated_by || '', entry.updated_at || now);
  conn.prepare(
    'INSERT INTO edit_history (uid, action, data, updated_by, recorded_at) VALUES (?,?,?,?,?)'
  ).run(key, 'saved', json, entry.updated_by || '', now);
}

/** Delete override rows (audited); returns true if anything was removed. */
export function removeOverrideRows(keys) {
  const conn = getDb();
  const now = new Date().toISOString();
  let removed = false;
  for (const key of keys) {
    const row = conn.prepare('SELECT data FROM patient_overrides WHERE uid=?').get(key);
    if (!row) continue;
    conn.prepare('DELETE FROM patient_overrides WHERE uid=?').run(key);
    conn.prepare(
      'INSERT INTO edit_history (uid, action, data, updated_by, recorded_at) VALUES (?,?,?,?,?)'
    ).run(key, 'removed', row.data, '', now);
    removed = true;
  }
  return removed;
}

// ── App settings ───────────────────────────────────────────────────────────

export function getSetting(key, defaultValue = null) {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key=?').get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value, updatedBy = '') {
  getDb().prepare(`INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES (?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .run(key, String(value), updatedBy, new Date().toISOString());
}

// ── Auth ───────────────────────────────────────────────────────────────────

function rowToUser(row) {
  let phcs = [];
  try { phcs = JSON.parse(row.phcs || '[]'); } catch { /* keep [] */ }
  return {
    username: row.username,
    password: row.password,
    role: row.role,
    name: row.name || '',
    phcs,
    full_access: Boolean(row.full_access),
  };
}

export function getUser(username) {
  const row = getDb().prepare('SELECT * FROM users WHERE username=?').get(String(username).toUpperCase());
  return row ? rowToUser(row) : null;
}

export function getUserByRole(role) {
  const row = getDb().prepare('SELECT * FROM users WHERE role=?').get(String(role).toUpperCase());
  return row ? rowToUser(row) : null;
}

export function recordLogin(username, role, success) {
  getDb().prepare('INSERT INTO login_history (username, role, success, at) VALUES (?,?,?,?)')
    .run(String(username || ''), String(role || ''), success ? 1 : 0, new Date().toISOString());
}

// ── Legacy JSON migration ──────────────────────────────────────────────────

/**
 * One-time import of the legacy JSON stores (call_tracking.json /
 * followup_data.json / patient_overrides.json) into SQLite. Each import runs
 * only while its target table is still empty, so restarting never duplicates
 * history. The JSON files are left on disk untouched as an extra backup of
 * the pre-migration data.
 */
export function migrateJsonStores() {
  const conn = getDb();
  const result = { calls: 0, followups: 0, overrides: 0 };

  const migrate = (table, file, insertFn) => {
    if (conn.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c > 0) return 0;
    if (!fs.existsSync(file)) return 0;
    const data = loadJson(file);
    let n = 0;
    const tx = conn.transaction(() => {
      for (const [uid, hist] of Object.entries(data)) {
        if (!Array.isArray(hist)) continue;
        for (const entry of hist) { insertFn(uid, entry); n += 1; }
      }
    });
    tx();
    return n;
  };

  result.calls = migrate('call_tracking', CALLS_FILE, (uid, e) => addCallEntry(uid, e));
  result.followups = migrate('followup_tracking', FOLLOWUP_FILE, (uid, e) => addFollowupEntry(uid, e));

  if (conn.prepare('SELECT COUNT(*) AS c FROM patient_overrides').get().c === 0
      && fs.existsSync(OVERRIDES_FILE)) {
    const ov = loadJson(OVERRIDES_FILE);
    if (ov && typeof ov === 'object') {
      saveOverridesMap(ov);
      result.overrides = Object.keys(ov).length;
    }
  }
  return result;
}

/** Online snapshot of the whole DB to <DB_PATH>.bak (safe under WAL). */
export function backupDb() {
  return getDb().backup(`${DB_PATH}.bak`)
    .then(() => console.log(`[DB] Backup written: ${DB_PATH}.bak`))
    .catch((e) => console.log(`[DB] Backup failed: ${e.message}`));
}
