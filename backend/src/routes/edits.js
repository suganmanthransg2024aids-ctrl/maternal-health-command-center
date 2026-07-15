import { Router } from 'express';
import { getData } from '../excelLoader.js';
import { loadOverrides, saveOverrides, EDITABLE_FIELDS } from '../overrides.js';
import { parseDate } from '../parseUtils.js';

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
  } else {
    entry.delivery = { delivered: false, marked_by: markedBy, marked_at: nowIso() };
  }

  ov[uid] = entry;
  saveOverrides(ov);

  console.log(`[DELIVERY] ${markedBy || '?'} marked ${uid} delivered=${delivered}`);
  res.json({ success: true, patient: findPatient(uid) });
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
