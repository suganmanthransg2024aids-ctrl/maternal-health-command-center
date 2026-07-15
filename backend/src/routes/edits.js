import { Router } from 'express';
import { getData } from '../excelLoader.js';
import { loadOverrides, saveOverrides, EDITABLE_FIELDS } from '../overrides.js';
import { parseDate } from '../parseUtils.js';
import { filterByRole, groupBy } from '../helpers.js';

const router = Router();

const nowIso = () => new Date().toISOString();

function findPatient(uid) {
  return getData().find((r) => r.uid === uid);
}

/** Edit patient details (EDD, Hb, BP, phone…). Stored as an override merged over sheet data. */
router.patch('/patients/:uid', (req, res) => {
  const { uid } = req.params;
  const body = req.body || {};
  const updates = body.updates || {};
  const updatedBy = String(body.updated_by || '').trim();

  if (!findPatient(uid)) return res.status(404).json({ error: 'Patient not found' });

  const clean = {};
  const rejected = [];
  for (const [k, v] of Object.entries(updates)) {
    if (!EDITABLE_FIELDS.includes(k)) { rejected.push(k); continue; }
    clean[k] = String(v ?? '').trim();
  }
  if (Object.keys(clean).length === 0) {
    return res.status(400).json({ error: 'No editable fields supplied', rejected, editable: EDITABLE_FIELDS });
  }
  for (const dateField of ['edd', 'lmp']) {
    if (dateField in clean && clean[dateField] !== '' && !parseDate(clean[dateField])) {
      return res.status(400).json({
        error: `Invalid ${dateField.toUpperCase()} date "${clean[dateField]}" — use DD-MM-YYYY or YYYY-MM-DD`,
      });
    }
  }

  const ov = loadOverrides();
  const entry = ov[uid] || {};
  entry.fields = { ...(entry.fields || {}), ...clean };
  entry.updated_by = updatedBy || entry.updated_by || '';
  entry.updated_at = nowIso();
  ov[uid] = entry;
  saveOverrides(ov);

  console.log(`[EDIT] ${updatedBy || '?'} updated ${uid}: ${Object.keys(clean).join(', ')}`);
  res.json({ success: true, rejected, patient: findPatient(uid) });
});

/** Assign (or un-assign) a mother to delivery. Delivered mothers flow into dashboard stats + PN monitoring. */
router.post('/patients/:uid/delivery', (req, res) => {
  const { uid } = req.params;
  const b = req.body || {};
  if (!findPatient(uid)) return res.status(404).json({ error: 'Patient not found' });

  const delivered = b.delivered === undefined ? true : Boolean(b.delivered);
  const markedBy = String(b.marked_by || '').trim();

  const ov = loadOverrides();
  const entry = ov[uid] || {};

  if (delivered) {
    const dateStr = String(b.delivery_date || '').trim();
    const parsed = dateStr ? parseDate(dateStr) : null;
    if (dateStr && !parsed) {
      return res.status(400).json({ error: `Invalid delivery date "${dateStr}" — use DD-MM-YYYY or YYYY-MM-DD` });
    }
    const now = new Date();
    const today0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (parsed && parsed.getTime() > today0) {
      return res.status(400).json({ error: 'Delivery date cannot be in the future' });
    }
    entry.delivery = {
      delivered: true,
      delivery_date: dateStr,
      delivery_mode: String(b.delivery_mode || '').trim(),
      delivery_place: String(b.delivery_place || '').trim(),
      remarks: String(b.remarks || '').trim(),
      marked_by: markedBy,
      marked_at: nowIso(),
    };
    delete entry.abortion; // outcomes are mutually exclusive
  } else {
    entry.delivery = { delivered: false, marked_by: markedBy, marked_at: nowIso() };
  }

  ov[uid] = entry;
  saveOverrides(ov);

  console.log(`[DELIVERY] ${markedBy || '?'} marked ${uid} delivered=${delivered}`);
  res.json({ success: true, patient: findPatient(uid) });
});

/** Assign (or un-assign) abortion status. Aborted mothers leave AN/due lists and show on the Abortions page. */
router.post('/patients/:uid/abortion', (req, res) => {
  const { uid } = req.params;
  const b = req.body || {};
  if (!findPatient(uid)) return res.status(404).json({ error: 'Patient not found' });

  const aborted = b.aborted === undefined ? true : Boolean(b.aborted);
  const markedBy = String(b.marked_by || '').trim();

  const ov = loadOverrides();
  const entry = ov[uid] || {};

  if (aborted) {
    const dateStr = String(b.abortion_date || '').trim();
    const parsed = dateStr ? parseDate(dateStr) : null;
    if (dateStr && !parsed) {
      return res.status(400).json({ error: `Invalid abortion date "${dateStr}" — use DD-MM-YYYY or YYYY-MM-DD` });
    }
    const now = new Date();
    const today0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (parsed && parsed.getTime() > today0) {
      return res.status(400).json({ error: 'Abortion date cannot be in the future' });
    }
    entry.abortion = {
      aborted: true,
      abortion_date: dateStr,
      abortion_type: String(b.abortion_type || '').trim(),
      abortion_place: String(b.abortion_place || '').trim(),
      remarks: String(b.remarks || '').trim(),
      marked_by: markedBy,
      marked_at: nowIso(),
    };
    delete entry.delivery; // outcomes are mutually exclusive
  } else {
    delete entry.abortion;
    if (Object.keys(entry).length === 0) {
      delete ov[uid];
      saveOverrides(ov);
      return res.json({ success: true, patient: findPatient(uid) });
    }
  }

  ov[uid] = entry;
  saveOverrides(ov);

  console.log(`[ABORTION] ${markedBy || '?'} marked ${uid} aborted=${aborted}`);
  res.json({ success: true, patient: findPatient(uid) });
});

/** Abortions grouped by PHC, role-scoped — feeds the sidebar Abortions page. */
router.get('/abortions', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);
  const aborted = records.filter((r) => r.is_aborted);

  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  let monthCount = 0;
  for (const r of aborted) {
    // abortion_date is DD-MM-YYYY
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(r.abortion_date || '');
    if (m && `${m[3]}-${m[2]}` === thisMonth) monthCount += 1;
  }

  const typeCounts = {};
  for (const r of aborted) {
    const t = r.abortion_type || 'Unspecified';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const byPhc = [];
  for (const [phcKey, grp] of groupBy(aborted, (r) => r.phc_key)) {
    byPhc.push({
      phc_key: phcKey,
      phc_display: grp[0].phc_display,
      hrt_code: grp[0].hrt_code,
      hrt_name: grp[0].hrt_name,
      count: grp.length,
      mothers: grp.map((r) => ({
        uid: r.uid,
        mother_name: r.mother_name,
        rch_id: r.rch_id,
        cell_no: r.cell_no,
        edd: r.edd,
        weeks: r.weeks,
        risk_category: r.risk_category,
        abortion_date: r.abortion_date || '',
        days_since_abortion: r.days_since_abortion ?? null,
        abortion_type: r.abortion_type || '',
        abortion_info: r.abortion_info || '',
        marked_by: r.abortion_marked_by || '',
      })),
    });
  }
  byPhc.sort((a, b) => b.count - a.count);

  res.json({
    total: aborted.length,
    this_month: monthCount,
    phcs_affected: byPhc.length,
    type_counts: typeCounts,
    by_phc: byPhc,
  });
});

/** Remove all app overrides for a patient — reverts to spreadsheet values. */
router.delete('/patients/:uid/overrides', (req, res) => {
  const { uid } = req.params;
  const ov = loadOverrides();
  if (!(uid in ov)) return res.json({ success: true, removed: false });
  delete ov[uid];
  saveOverrides(ov);
  res.json({ success: true, removed: true, patient: findPatient(uid) });
});

export default router;
