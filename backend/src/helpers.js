import { USERS } from './constants.js';
import { getData } from './excelLoader.js';

export function filterByRole(records, role) {
  const user = USERS[role] || {};
  if (user.full_access) return records;
  const allowed = new Set((user.phcs || []).map((p) => p.toUpperCase()));
  return records.filter((r) => allowed.has(r.phc_key));
}

export function getDataForRole(role) {
  const records = getData();
  if (!records || records.length === 0) return records;
  if (role === 'CHO' || role === 'DMCHO') return records;
  const user = Object.values(USERS).find((u) => u.role === role);
  if (!user) return [];
  const allowed = new Set(user.phcs || []);
  return records.filter((r) => allowed.has(r.phc_key));
}

/**
 * Groups records by key, iterating groups in ascending key order — matching
 * pandas' df.groupby(...) default (sort=True), which every port of app.py's
 * groupby() calls relies on for tie-break ordering after a later .sort().
 */
export function groupBy(records, keyFn) {
  const map = new Map();
  for (const r of records) {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  const sorted = new Map([...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
  return sorted;
}

export function safeInt(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  return Math.trunc(n);
}

export function safeFloat(val) {
  if (val === null || val === undefined) return 0.0;
  const n = Number(val);
  return Number.isNaN(n) ? 0.0 : n;
}

export function today() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function todayStr() {
  const d = today();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Sort a plain-object count map by value descending, returned as an object (like pandas value_counts().to_dict()). */
export function countBy(records, keyFn) {
  const counts = {};
  for (const r of records) {
    const k = keyFn(r);
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

export function sortedCountBy(records, keyFn) {
  const counts = countBy(records, keyFn);
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}
