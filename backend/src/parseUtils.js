const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function makeDate(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * Parse a date value into a UTC Date (date-only), or null.
 * Mirrors app.py's _parse_date: a handful of strict formats, then pandas'
 * lenient dayfirst=True fallback (via dateutil), which tolerates trailing
 * punctuation ("17-11-26,") and mixed separators ("24-08.2026") that sheets
 * full of manual data entry accumulate.
 */
export function parseDate(val) {
  if (val === null || val === undefined) return null;
  const raw = String(val).trim();
  if (!raw || ['nan', 'NaT'].includes(raw)) return null;
  // Strip a bare trailing comma (e.g. "17-11-26,") the lenient pandas fallback
  // would ignore. Deliberately narrow: stripping more (e.g. trailing words) would
  // also "recover" dates out of ambiguous multi-date text like "27.11.26 SCAN EDD
  // 17.10.26" that pandas' fallback correctly refuses to parse.
  const s = raw.slice(0, 10).replace(/,+$/, '');

  // Year-first: YYYY-MM-DD (separators may be -, . or / and needn't match each other)
  let m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(s);
  if (m) { const d = makeDate(+m[1], +m[2], +m[3]); if (d) return d; }

  // Day-first: D-M-Y or D-M-YY, separators may be mixed (-, ., /).
  // Year must be exactly 2 or exactly 4 digits — a bare \d{2,4} would also accept
  // corrupted 3-digit years (e.g. "16-11-202", a typo for 2026) as literal year 202.
  m = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4}|\d{2})$/.exec(s);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    const d = makeDate(year, +m[2], +m[1]);
    if (d) return d;
  }

  // Lenient day-first fallback (e.g. "1 Mar 2026", "01 March 26")
  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s-]+(\d{2,4})$/.exec(raw);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) {
      let year = +m[3];
      if (year < 100) year += 2000;
      const d = makeDate(year, mon, +m[1]);
      if (d) return d;
    }
  }

  return null;
}

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function daysToEdd(eddVal) {
  const d = parseDate(eddVal);
  if (d === null) return null;
  const diffMs = d.getTime() - todayUTC().getTime();
  return Math.round(diffMs / 86400000);
}

const DELIVERY_DATE_RE = /^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/;

/** Extract actual delivery date from uphc_response text e.g. '31.3.26 AT:5PM/LSCS...' */
export function parseDeliveryDate(text) {
  const raw = text === null || text === undefined ? '' : String(text).trim();
  if (!raw || ['nan', 'NaT'].includes(raw)) return null;
  const m = DELIVERY_DATE_RE.exec(raw);
  if (!m) return null;
  let [, day, month, year] = m;
  day = +day; month = +month; year = +year;
  if (year < 100) year += 2000;
  const d = makeDate(year, month, day);
  if (!d) return null;
  const today = todayUTC();
  const twoYearsAgo = new Date(Date.UTC(today.getUTCFullYear() - 2, 0, 1));
  if (d >= twoYearsAgo && d <= today) return d;
  return null;
}

export function formatDDMMYYYY(date) {
  if (!date) return '';
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

export function formatYYYYMM(date) {
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${m}`;
}

// ── Name/address splitting ───────────────────────────────────────────────
const NAME_RELATION_RE = /W\s*\/\s*O|S\s*\/\s*O|D\s*\/\s*O|L\s*\/\s*O/i;
const NAME_ADDR_KEYWORD_RE = /\b(STREET|ST|NAGAR|NAGER|COLONY|ROAD|RD|SECTOR|EXTENSION|EXTN|LAYOUT|LANE)\b/i;

/**
 * Split a combined 'name, address' or 'name/husband' cell into { name, address }.
 * Sheets mix delimiters inconsistently (comma, newline, slash, W/O) and often append a
 * house number or address keyword with no delimiter at all, so cut at whichever comes first.
 */
export function splitNameAddress(nameRaw) {
  if (!nameRaw) return { name: '', address: '' };
  let cut = nameRaw.length;

  let m = /[,\n/]/.exec(nameRaw);
  if (m) cut = Math.min(cut, m.index);

  const rm = NAME_RELATION_RE.exec(nameRaw);
  if (rm) cut = Math.min(cut, rm.index);

  let head = nameRaw.slice(0, cut);
  const dm = /\d/.exec(head);
  if (dm) {
    cut = Math.min(cut, dm.index);
    head = nameRaw.slice(0, cut);
  }

  const km = NAME_ADDR_KEYWORD_RE.exec(head);
  if (km) cut = Math.min(cut, km.index);

  const cleanName = nameRaw.slice(0, cut).replace(/\s+/g, ' ').replace(/^[\s,/-]+|[\s,/-]+$/g, '');
  const address = nameRaw.slice(cut).trim().replace(/^[,/]+/, '').trim();
  return { name: cleanName, address };
}
