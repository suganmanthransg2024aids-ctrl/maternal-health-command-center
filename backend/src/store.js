import fs from 'fs';
import { loadJson } from './jsonStore.js';
import { CALLS_FILE, FOLLOWUP_FILE, OVERRIDES_FILE, DB_PATH } from './config.js';
import { USERS } from './constants.js';
import {
  getDb, initDb, migrateJsonStores,
  getCallsMap as sqliteCallsMap,
  getFollowupsMap as sqliteFollowupsMap,
  getOverridesMap as sqliteOverridesMap,
  addCallEntry, addFollowupEntry, putOverrideRow, removeOverrideRows,
  getSetting as sqliteGetSetting,
  setSetting as sqliteSetSetting,
  getUser as sqliteGetUser,
  getUserByRole as sqliteGetUserByRole,
  recordLogin as sqliteRecordLogin,
} from './activityDb.js';

/**
 * Unified persistence for everything the portals write: call tracking,
 * follow-ups, patient overrides (edits / delivery / abortion status), the
 * activity call log, the status-update approval queue, app settings, user
 * accounts and login history.
 *
 * Two backends:
 *  - DATABASE_URL set  → PostgreSQL. Every write is committed to Postgres
 *    before the API responds, so HRT updates survive Render restarts,
 *    redeployments and crashes (Render's own disk is wiped on every deploy).
 *    Calls/follow-ups/overrides/users are mirrored in memory so the many
 *    read paths stay synchronous.
 *  - no DATABASE_URL   → local SQLite (logs.db) via activityDb.js.
 *
 * Mother identity: rows in the Google Sheet move around, and the legacy
 * uid embeds the row index (PHC_<row>_<rch>), so HRT updates were pinned to
 * a position, not a person. All new data is keyed by stableKey():
 * "RCH_<rch id>" whenever the mother has a valid RCH ID, uid otherwise.
 * Reads check the stable key first and fall back to the legacy uid, so
 * pre-existing data still resolves.
 */

export const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
export const usingPostgres = Boolean(DATABASE_URL);

// ── Stable mother identity ─────────────────────────────────────────────────
const RCH_RE = /^\d{10,13}$/;

export function stableKey(record) {
  const rch = String(record?.rch_id || '').trim();
  return RCH_RE.test(rch) ? `RCH_${rch}` : String(record?.uid || '');
}

/** Re-key a legacy uid (PHC_<row>_<rch>) without needing the record. */
export function uidToKey(uid) {
  const m = /_(\d{10,13})$/.exec(String(uid || ''));
  return m ? `RCH_${m[1]}` : String(uid || '');
}

/** History lookup that merges stable-key and legacy-uid entries. */
export function histFor(map, record) {
  const a = map[stableKey(record)];
  const b = map[record.uid];
  if (a && b && a !== b) return [...b, ...a];
  return a || b || [];
}

/** Override lookup: stable key first, legacy uid fallback. */
export function overrideFor(map, record) {
  return map[stableKey(record)] || map[record.uid];
}

// ── In-memory mirrors (Postgres mode) ──────────────────────────────────────
const mem = { calls: {}, followups: {}, overrides: {}, users: {} };
let pool = null;
let overridesVer = 0;

export function overridesVersion() {
  return overridesVer;
}

// ── Synchronous reads ──────────────────────────────────────────────────────
export function getCallsMap() {
  return usingPostgres ? mem.calls : sqliteCallsMap();
}

export function getFollowupsMap() {
  return usingPostgres ? mem.followups : sqliteFollowupsMap();
}

export function getOverridesMap() {
  return usingPostgres ? mem.overrides : sqliteOverridesMap();
}

// ── Durable writes (awaited by the routes before responding) ───────────────
export async function addCall(key, entry) {
  if (usingPostgres) {
    await pool.query('INSERT INTO mother_calls (mother_key, entry) VALUES ($1, $2)', [key, entry]);
    if (!mem.calls[key]) mem.calls[key] = [];
    mem.calls[key].push(entry);
    return mem.calls[key].length;
  }
  return addCallEntry(key, entry);
}

export async function addFollowup(key, entry) {
  if (usingPostgres) {
    await pool.query('INSERT INTO mother_followups (mother_key, entry) VALUES ($1, $2)', [key, entry]);
    if (!mem.followups[key]) mem.followups[key] = [];
    mem.followups[key].push(entry);
    return mem.followups[key].length;
  }
  return addFollowupEntry(key, entry);
}

export async function putOverride(key, entry) {
  if (usingPostgres) {
    await pool.query(
      `INSERT INTO patient_overrides (mother_key, data, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (mother_key) DO UPDATE SET data = $2, updated_at = now()`,
      [key, entry],
    );
    mem.overrides[key] = entry;
  } else {
    putOverrideRow(key, entry);
  }
  overridesVer += 1;
}

export async function removeOverride(...keys) {
  let removed = false;
  if (usingPostgres) {
    for (const key of keys) {
      const r = await pool.query('DELETE FROM patient_overrides WHERE mother_key = $1', [key]);
      if (r.rowCount > 0) removed = true;
      delete mem.overrides[key];
    }
  } else {
    removed = removeOverrideRows(keys);
  }
  if (removed) overridesVer += 1;
  return removed;
}

// ── App settings ───────────────────────────────────────────────────────────
export async function getSettingValue(key, defaultValue = null) {
  if (usingPostgres) {
    const q = await pool.query('SELECT value FROM app_settings WHERE key=$1', [key]);
    return q.rows.length ? q.rows[0].value : defaultValue;
  }
  return sqliteGetSetting(key, defaultValue);
}

export async function setSettingValue(key, value, updatedBy = '') {
  if (usingPostgres) {
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_by, updated_at) VALUES ($1,$2,$3,now())
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_by=$3, updated_at=now()`,
      [key, String(value), updatedBy],
    );
    return;
  }
  sqliteSetSetting(key, value, updatedBy);
}

// ── Best-known workbook (Postgres mode only) ───────────────────────────────
export async function getWorkbookMeta() {
  if (!usingPostgres || !pool) return null;
  const q = await pool.query('SELECT record_count, source, saved_at FROM sheet_workbook WHERE id=1');
  return q.rows.length ? q.rows[0] : null;
}

export async function getWorkbookBytes() {
  if (!usingPostgres || !pool) return null;
  const q = await pool.query('SELECT bytes FROM sheet_workbook WHERE id=1');
  return q.rows.length ? q.rows[0].bytes : null;
}

export async function saveWorkbookBytes(buf, recordCount, source) {
  if (!usingPostgres || !pool) return;
  await pool.query(
    `INSERT INTO sheet_workbook (id, bytes, record_count, source, saved_at) VALUES (1,$1,$2,$3,now())
     ON CONFLICT (id) DO UPDATE SET bytes=$1, record_count=$2, source=$3, saved_at=now()`,
    [buf, recordCount, source],
  );
}

// ── Auth ───────────────────────────────────────────────────────────────────
function pgRowToUser(r) {
  let phcs = [];
  try { phcs = JSON.parse(r.phcs || '[]'); } catch { /* keep [] */ }
  return {
    username: r.username,
    password: r.password,
    role: r.role,
    name: r.name || '',
    phcs,
    full_access: Boolean(r.full_access),
  };
}

export function getUserRecord(username) {
  const uname = String(username || '').trim().toUpperCase();
  return usingPostgres ? (mem.users[uname] || null) : sqliteGetUser(uname);
}

export function getUserByRoleRecord(role) {
  const r = String(role || '').toUpperCase();
  if (usingPostgres) return Object.values(mem.users).find((u) => u.role === r) || null;
  return sqliteGetUserByRole(r);
}

/** Append a login attempt. Fire-and-forget in Postgres mode so the login
 *  response never waits on (or fails because of) the audit write. */
export function recordLoginAttempt(username, role, success) {
  if (usingPostgres) {
    pool.query('INSERT INTO login_history (username, role, success) VALUES ($1,$2,$3)',
      [String(username || ''), String(role || ''), success ? 1 : 0])
      .catch((e) => console.log(`[STORE] login_history write failed: ${e.message}`));
    return;
  }
  sqliteRecordLogin(username, role, success);
}

// ── Activity log + approval queue ──────────────────────────────────────────
export async function addCallLog(r) {
  if (usingPostgres) {
    const q = await pool.query(
      `INSERT INTO call_logs (mother_id, mother_key, mother_name, phc, hrt_user, call_date, call_time, outcome, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [r.motherId, r.motherKey, r.motherName, r.phc, r.hrtUser, r.callDate, r.callTime, r.outcome, r.notes],
    );
    return q.rows[0].id;
  }
  const info = getDb().prepare(
    'INSERT INTO call_logs (mother_id,mother_key,mother_name,phc,hrt_user,call_date,call_time,outcome,notes) VALUES (?,?,?,?,?,?,?,?,?)',
  ).run(r.motherId, r.motherKey, r.motherName, r.phc, r.hrtUser, r.callDate, r.callTime, r.outcome, r.notes);
  return info.lastInsertRowid;
}

export async function callLogsToday(date, roleOrNull) {
  if (usingPostgres) {
    const q = roleOrNull
      ? await pool.query('SELECT * FROM call_logs WHERE call_date=$1 AND hrt_user=$2 ORDER BY call_time DESC', [date, roleOrNull])
      : await pool.query('SELECT * FROM call_logs WHERE call_date=$1 ORDER BY call_time DESC', [date]);
    return q.rows;
  }
  return roleOrNull
    ? getDb().prepare('SELECT * FROM call_logs WHERE call_date=? AND hrt_user=? ORDER BY call_time DESC').all(date, roleOrNull)
    : getDb().prepare('SELECT * FROM call_logs WHERE call_date=? ORDER BY call_time DESC').all(date);
}

export async function callLogsForMother(key, uid) {
  if (usingPostgres) {
    const q = await pool.query(
      'SELECT * FROM call_logs WHERE mother_key=$1 OR mother_id=$2 ORDER BY call_time DESC LIMIT 30', [key, uid],
    );
    return q.rows;
  }
  return getDb().prepare(
    'SELECT * FROM call_logs WHERE mother_key=? OR mother_id=? ORDER BY call_time DESC LIMIT 30',
  ).all(key, uid);
}

export async function addStatusUpdate(r) {
  if (usingPostgres) {
    const q = await pool.query(
      `INSERT INTO status_updates (mother_id, mother_key, mother_name, phc, hrt_user, new_status, notes, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [r.motherId, r.motherKey, r.motherName, r.phc, r.hrtUser, r.newStatus, r.notes, r.submittedAt],
    );
    return q.rows[0].id;
  }
  const info = getDb().prepare(
    'INSERT INTO status_updates (mother_id,mother_key,mother_name,phc,hrt_user,new_status,notes,submitted_at) VALUES (?,?,?,?,?,?,?,?)',
  ).run(r.motherId, r.motherKey, r.motherName, r.phc, r.hrtUser, r.newStatus, r.notes, r.submittedAt);
  return info.lastInsertRowid;
}

export async function approvalsList() {
  if (usingPostgres) {
    const pending = await pool.query('SELECT * FROM status_updates WHERE is_approved=0 ORDER BY submitted_at DESC');
    const recent = await pool.query('SELECT * FROM status_updates WHERE is_approved!=0 ORDER BY approved_at DESC LIMIT 30');
    return { pending: pending.rows, recent: recent.rows };
  }
  const db = getDb();
  return {
    pending: db.prepare('SELECT * FROM status_updates WHERE is_approved=0 ORDER BY submitted_at DESC').all(),
    recent: db.prepare('SELECT * FROM status_updates WHERE is_approved!=0 ORDER BY approved_at DESC LIMIT 30').all(),
  };
}

export async function setApproval(id, approve, by, at, reason = '') {
  if (usingPostgres) {
    await pool.query(
      'UPDATE status_updates SET is_approved=$1, approved_by=$2, approved_at=$3, rejection_reason=$4 WHERE id=$5',
      [approve ? 1 : -1, by, at, reason, id],
    );
    return;
  }
  getDb().prepare('UPDATE status_updates SET is_approved=?, approved_by=?, approved_at=?, rejection_reason=? WHERE id=?')
    .run(approve ? 1 : -1, by, at, reason, id);
}

export async function dailySummaryRows(date) {
  if (usingPostgres) {
    const rows = await pool.query(
      'SELECT hrt_user, outcome, COUNT(*)::int AS cnt FROM call_logs WHERE call_date=$1 GROUP BY hrt_user, outcome', [date],
    );
    const pending = await pool.query('SELECT COUNT(*)::int AS c FROM status_updates WHERE is_approved=0');
    return { rows: rows.rows, pendingCount: pending.rows[0].c };
  }
  const db = getDb();
  return {
    rows: db.prepare('SELECT hrt_user, outcome, COUNT(*) as cnt FROM call_logs WHERE call_date=? GROUP BY hrt_user, outcome').all(date),
    pendingCount: db.prepare('SELECT COUNT(*) as c FROM status_updates WHERE is_approved=0').get().c,
  };
}

// ── Boot ───────────────────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS mother_calls (
  id          BIGSERIAL PRIMARY KEY,
  mother_key  TEXT NOT NULL,
  entry       JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mother_calls_key ON mother_calls(mother_key);

CREATE TABLE IF NOT EXISTS mother_followups (
  id          BIGSERIAL PRIMARY KEY,
  mother_key  TEXT NOT NULL,
  entry       JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mother_followups_key ON mother_followups(mother_key);

CREATE TABLE IF NOT EXISTS patient_overrides (
  mother_key  TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id           BIGSERIAL PRIMARY KEY,
  mother_id    TEXT NOT NULL,
  mother_key   TEXT,
  mother_name  TEXT,
  phc          TEXT,
  hrt_user     TEXT NOT NULL,
  call_date    TEXT NOT NULL,
  call_time    TEXT NOT NULL,
  outcome      TEXT NOT NULL,
  notes        TEXT
);
CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date);
CREATE INDEX IF NOT EXISTS idx_call_logs_key ON call_logs(mother_key);

CREATE TABLE IF NOT EXISTS status_updates (
  id               BIGSERIAL PRIMARY KEY,
  mother_id        TEXT NOT NULL,
  mother_key       TEXT,
  mother_name      TEXT,
  phc              TEXT,
  hrt_user         TEXT NOT NULL,
  new_status       TEXT NOT NULL,
  notes            TEXT,
  submitted_at     TEXT NOT NULL,
  approved_by      TEXT,
  approved_at      TEXT,
  is_approved      INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Best-known copy of the source spreadsheet (single row). Google sometimes
-- serves cloud egress IPs a stale export revision; keeping the best workbook
-- here lets a fresh boot reject an obviously stale download.
CREATE TABLE IF NOT EXISTS sheet_workbook (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  bytes        BYTEA NOT NULL,
  record_count INTEGER NOT NULL,
  source       TEXT,
  saved_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  username    TEXT PRIMARY KEY,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL,
  name        TEXT,
  phcs        TEXT,
  full_access INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS login_history (
  id        BIGSERIAL PRIMARY KEY,
  username  TEXT NOT NULL,
  role      TEXT,
  success   INTEGER NOT NULL,
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function loadMirrors() {
  mem.calls = {};
  mem.followups = {};
  mem.overrides = {};
  mem.users = {};
  const calls = await pool.query('SELECT mother_key, entry FROM mother_calls ORDER BY id');
  for (const r of calls.rows) {
    if (!mem.calls[r.mother_key]) mem.calls[r.mother_key] = [];
    mem.calls[r.mother_key].push(r.entry);
  }
  const fu = await pool.query('SELECT mother_key, entry FROM mother_followups ORDER BY id');
  for (const r of fu.rows) {
    if (!mem.followups[r.mother_key]) mem.followups[r.mother_key] = [];
    mem.followups[r.mother_key].push(r.entry);
  }
  const ov = await pool.query('SELECT mother_key, data FROM patient_overrides');
  for (const r of ov.rows) mem.overrides[r.mother_key] = r.data;
  const users = await pool.query('SELECT * FROM users');
  for (const r of users.rows) mem.users[r.username] = pgRowToUser(r);
}

/** Seed portal accounts Postgres doesn't have yet; existing rows win, so
 *  password changes made in the database stick. */
async function seedPgUsers() {
  for (const [username, u] of Object.entries(USERS)) {
    await pool.query(
      `INSERT INTO users (username, password, role, name, phcs, full_access)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (username) DO NOTHING`,
      [username, u.password, u.role, u.name, JSON.stringify(u.phcs || []), u.full_access ? 1 : 0],
    );
  }
}

/**
 * One-time import of local legacy stores into empty Postgres tables.
 * The local SQLite store is preferred (it is the newer local backend);
 * the JSON files remain as the pre-SQLite fallback source.
 */
async function migrateLegacy() {
  const count = async (t) => (await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`)).rows[0].c;
  const sqliteExists = fs.existsSync(DB_PATH);

  const histSource = (sqliteReader, file, label) => {
    if (sqliteExists) {
      try {
        const map = sqliteReader();
        if (Object.keys(map).length) return { map, src: `logs.db (${label})` };
      } catch { /* fall through to JSON */ }
    }
    if (fs.existsSync(file)) return { map: loadJson(file), src: file.split(/[\\/]/).pop() };
    return null;
  };

  if ((await count('mother_calls')) === 0) {
    const source = histSource(sqliteCallsMap, CALLS_FILE, 'call_tracking');
    if (source) {
      let n = 0;
      for (const [uid, entries] of Object.entries(source.map)) {
        for (const e of entries || []) {
          await pool.query('INSERT INTO mother_calls (mother_key, entry) VALUES ($1, $2)', [uidToKey(uid), e]);
          n += 1;
        }
      }
      if (n) console.log(`[STORE] Migrated ${n} call entries from ${source.src}`);
    }
  }
  if ((await count('mother_followups')) === 0) {
    const source = histSource(sqliteFollowupsMap, FOLLOWUP_FILE, 'followup_tracking');
    if (source) {
      let n = 0;
      for (const [uid, entries] of Object.entries(source.map)) {
        for (const e of entries || []) {
          await pool.query('INSERT INTO mother_followups (mother_key, entry) VALUES ($1, $2)', [uidToKey(uid), e]);
          n += 1;
        }
      }
      if (n) console.log(`[STORE] Migrated ${n} follow-up entries from ${source.src}`);
    }
  }
  if ((await count('patient_overrides')) === 0) {
    const source = histSource(sqliteOverridesMap, OVERRIDES_FILE, 'patient_overrides');
    if (source) {
      let n = 0;
      for (const [uid, data] of Object.entries(source.map)) {
        await pool.query(
          `INSERT INTO patient_overrides (mother_key, data) VALUES ($1, $2)
           ON CONFLICT (mother_key) DO NOTHING`,
          [uidToKey(uid), data],
        );
        n += 1;
      }
      if (n) console.log(`[STORE] Migrated ${n} patient overrides from ${source.src}`);
    }
  }
  if (sqliteExists && (await count('call_logs')) === 0) {
    try {
      initDb();
      const rows = getDb().prepare('SELECT * FROM call_logs ORDER BY id').all();
      for (const r of rows) {
        await pool.query(
          `INSERT INTO call_logs (mother_id, mother_key, mother_name, phc, hrt_user, call_date, call_time, outcome, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [r.mother_id, r.mother_key || uidToKey(r.mother_id), r.mother_name, r.phc, r.hrt_user, r.call_date, r.call_time, r.outcome, r.notes],
        );
      }
      if (rows.length) console.log(`[STORE] Migrated ${rows.length} call logs from logs.db`);
      const su = getDb().prepare('SELECT * FROM status_updates ORDER BY id').all();
      for (const r of su) {
        await pool.query(
          `INSERT INTO status_updates (mother_id, mother_key, mother_name, phc, hrt_user, new_status, notes, submitted_at, approved_by, approved_at, is_approved, rejection_reason)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [r.mother_id, r.mother_key || uidToKey(r.mother_id), r.mother_name, r.phc, r.hrt_user, r.new_status, r.notes, r.submitted_at, r.approved_by, r.approved_at, r.is_approved, r.rejection_reason],
        );
      }
      if (su.length) console.log(`[STORE] Migrated ${su.length} status updates from logs.db`);
    } catch (e) {
      console.log(`[STORE] SQLite migration skipped: ${e.message}`);
    }
  }
}

export async function initStore() {
  if (!usingPostgres) {
    initDb();
    const migrated = migrateJsonStores();
    if (migrated.calls || migrated.followups || migrated.overrides) {
      console.log(`[STORE] Migrated legacy JSON — calls: ${migrated.calls}, follow-ups: ${migrated.followups}, overrides: ${migrated.overrides}`);
    }
    console.log('[STORE] Local mode — SQLite logs.db (set DATABASE_URL for PostgreSQL)');
    return;
  }

  const { default: pg } = await import('pg');
  // Render's *internal* connection string has a bare hostname (no dots) and
  // its private network speaks plain TCP — asking for SSL there stalls the
  // connection instead of erroring. Only external hosts get SSL.
  let hostname = '';
  try { hostname = new URL(DATABASE_URL).hostname; } catch { /* keep '' */ }
  const plainTcp = !hostname.includes('.') || /^(localhost|127\.0\.0\.1)$/.test(hostname);
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      pool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: plainTcp ? undefined : { rejectUnauthorized: false },
        max: 5,
        // Without this a dead/misconfigured host hangs the connect forever,
        // which blocks boot before app.listen and fails the whole deploy.
        connectionTimeoutMillis: 10000,
      });
      await pool.query('SELECT 1');
      break;
    } catch (e) {
      console.log(`[STORE] PostgreSQL connect attempt ${attempt}/${maxAttempts} failed: ${e.message}`);
      try { await pool?.end(); } catch { /* ignore */ }
      pool = null;
      if (attempt === maxAttempts) {
        console.log('[STORE] FATAL: DATABASE_URL is set but PostgreSQL is unreachable — exiting so the platform restarts us.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }

  await pool.query(SCHEMA);
  await seedPgUsers();
  await migrateLegacy();
  await loadMirrors();
  const nCalls = Object.values(mem.calls).reduce((s, a) => s + a.length, 0);
  const nFu = Object.values(mem.followups).reduce((s, a) => s + a.length, 0);
  console.log(`[STORE] PostgreSQL ready — ${nCalls} calls, ${nFu} follow-ups, ${Object.keys(mem.overrides).length} overrides, ${Object.keys(mem.users).length} users loaded`);
}
