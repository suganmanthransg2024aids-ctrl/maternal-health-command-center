import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

let db = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDb() {
  const conn = getDb();
  conn.exec(`
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
  `);
}
