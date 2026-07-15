import { loadJson, saveJson } from './jsonStore.js';
import { OVERRIDES_FILE } from './config.js';
import { parseDate, daysToEdd, formatDDMMYYYY } from './parseUtils.js';
import { parseRisk } from './riskEngine.js';

/**
 * App-side patient overrides, keyed by uid:
 * {
 *   "<uid>": {
 *     fields:   { edd: "...", hb: "...", ... },          // manual field edits
 *     delivery: { delivered: true, delivery_date: "...", // app-assigned delivery
 *                 delivery_mode, delivery_place, remarks,
 *                 marked_by, marked_at },
 *     abortion: { aborted: true, abortion_date: "...",   // app-assigned abortion
 *                 abortion_type, abortion_place, remarks,
 *                 marked_by, marked_at },
 *     updated_by, updated_at,
 *   }
 * }
 * The Excel/Google Sheets download is the base source of truth and is rebuilt
 * on every sync; overrides are merged on top at read time so app edits survive
 * each re-download.
 */

// Bumped on every save so getData() knows its merged cache is stale.
let version = 0;
export function overridesVersion() {
  return version;
}

export function loadOverrides() {
  return loadJson(OVERRIDES_FILE);
}

export function saveOverrides(data) {
  saveJson(OVERRIDES_FILE, data);
  version += 1;
}

/** Fields a portal user may edit. Derived fields (days_to_edd, risk_*) are recomputed. */
export const EDITABLE_FIELDS = [
  'mother_name', 'cell_no', 'husband_name', 'address',
  'gravida', 'para', 'lmp', 'edd', 'weeks',
  'high_risk_raw',
  'height', 'weight', 'bp', 'hb', 'blood_group',
  'gct', 'ppbs', 'tsh', 'echo_ecg', 'usg', 'sputum_afb', 'urine_routine',
  'birth_plan', 'referral', 'last_visit_date', 'next_visit_date',
];

function todayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function applyOverrides(records) {
  const ov = loadOverrides();
  if (!ov || Object.keys(ov).length === 0) return records;
  const today0 = todayUTC();

  return records.map((r) => {
    const o = ov[r.uid];
    if (!o) return r;
    const merged = { ...r };

    if (o.fields) {
      for (const [k, v] of Object.entries(o.fields)) {
        if (EDITABLE_FIELDS.includes(k)) merged[k] = v;
      }
      if ('edd' in o.fields) merged.days_to_edd = daysToEdd(merged.edd);
      if ('high_risk_raw' in o.fields) {
        const { score, factors, category } = parseRisk(merged.high_risk_raw);
        merged.risk_score = score;
        merged.risk_factors = factors;
        merged.risk_category = category;
      }
      merged.edited_fields = Object.keys(o.fields);
      merged.last_edited_by = o.updated_by || '';
      merged.last_edited_at = o.updated_at || '';
    }

    // Abortion and delivery are mutually exclusive; the routes clear one when
    // setting the other, so at most one of these blocks applies.
    if (o.abortion && o.abortion.aborted) {
      const a = o.abortion;
      merged.is_aborted = true;
      merged.is_delivered = false;
      merged.abortion_marked_by = a.marked_by || '';
      merged.abortion_marked_at = a.marked_at || '';
      const ad = parseDate(a.abortion_date);
      merged.abortion_date = ad ? formatDDMMYYYY(ad) : String(a.abortion_date || '');
      merged.days_since_abortion = ad
        ? Math.max(0, Math.round((today0.getTime() - ad.getTime()) / 86400000))
        : null;
      merged.abortion_type = a.abortion_type || '';
      const bits = ['ABORTION', merged.abortion_date, a.abortion_type, a.abortion_place]
        .filter((x) => x && String(x).trim());
      merged.abortion_info = bits.join(' / ') + (a.remarks ? ` — ${a.remarks}` : '');
      // Pregnancy ended: no days-to-EDD, so she drops out of every due/overdue/
      // AN-timeline calculation across the app (they all test days_to_edd).
      merged.days_to_edd = null;
      merged.delivery_date = '';
      merged.days_since_delivery = null;
    } else if (o.delivery) {
      const d = o.delivery;
      merged.is_delivered = Boolean(d.delivered);
      merged.delivery_source = 'app';
      merged.delivery_marked_by = d.marked_by || '';
      merged.delivery_marked_at = d.marked_at || '';
      if (merged.is_delivered) {
        const dd = parseDate(d.delivery_date);
        merged.delivery_date = dd ? formatDDMMYYYY(dd) : String(d.delivery_date || '');
        if (dd) {
          merged.days_since_delivery = Math.max(0, Math.round((today0.getTime() - dd.getTime()) / 86400000));
        } else if (merged.days_to_edd !== null && merged.days_to_edd !== undefined && merged.days_to_edd < 0) {
          merged.days_since_delivery = Math.abs(merged.days_to_edd);
        } else {
          merged.days_since_delivery = 0;
        }
        const bits = ['DELIVERED', merged.delivery_date, d.delivery_mode, d.delivery_place]
          .filter((x) => x && String(x).trim());
        merged.delivery_info = bits.join(' / ') + (d.remarks ? ` — ${d.remarks}` : '');
      } else {
        merged.delivery_date = '';
        merged.days_since_delivery = null;
        merged.delivery_info = '';
      }
    }

    return merged;
  });
}
