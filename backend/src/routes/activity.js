import { Router } from 'express';
import { getData } from '../excelLoader.js';
import {
  stableKey, addCallLog, callLogsToday, callLogsForMother,
  addStatusUpdate, approvalsList, setApproval, dailySummaryRows,
} from '../store.js';
import { getDataForRole, asyncRoute } from '../helpers.js';
import { parseDate } from '../parseUtils.js';

const router = Router();

function pad2(n) { return String(n).padStart(2, '0'); }
function nowParts() {
  const d = new Date();
  return {
    dateStr: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    isoSeconds: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  };
}

router.post('/calls/log', asyncRoute(async (req, res) => {
  const b = req.body || {};
  const motherId = String(b.mother_id || '').trim();
  const hrtUser = String(b.hrt_user || '').trim();
  const outcome = String(b.outcome || '').trim();
  const notes = String(b.notes || '').trim();
  if (!(motherId && hrtUser && outcome)) {
    return res.status(400).json({ error: 'mother_id, hrt_user and outcome are required' });
  }

  const df = getData();
  const row = df.find((r) => r.uid === motherId);
  const motherName = row ? String(row.mother_name || '') : '';
  const phc = row ? String(row.phc_key || '') : '';
  const motherKey = row ? stableKey(row) : motherId;

  const { dateStr, isoSeconds } = nowParts();
  const id = await addCallLog({
    motherId, motherKey, motherName, phc, hrtUser,
    callDate: dateStr, callTime: isoSeconds, outcome, notes,
  });
  res.json({ success: true, id });
}));

router.get('/calls/today', asyncRoute(async (req, res) => {
  const role = String(req.query.role || '').toUpperCase();
  const date = req.query.date || nowParts().dateStr;
  const rows = await callLogsToday(date, role === 'CHO' || role === 'DMCHO' ? null : role);
  res.json(rows);
}));

router.get('/calls/history/:uid', asyncRoute(async (req, res) => {
  const uid = req.params.uid;
  const row = getData().find((r) => r.uid === uid);
  const rows = await callLogsForMother(row ? stableKey(row) : uid, uid);
  res.json(rows);
}));

function fromIsoDateOnly(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1]; const mo = +m[2]; const d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

router.get('/tasks/today', asyncRoute(async (req, res) => {
  const role = String(req.query.role || '').toUpperCase();
  const today = new Date();
  const today0 = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const todayStr = `${today0.getUTCFullYear()}-${pad2(today0.getUTCMonth() + 1)}-${pad2(today0.getUTCDate())}`;

  const df = getDataForRole(role);
  if (!df || df.length === 0) return res.json([]);

  const DATE_COL_CANDIDATES = ['next_followup_date', 'followup_date', 'next_visit', 'edd'];
  const dateCol = DATE_COL_CANDIDATES.find((c) => c in df[0]);
  if (!dateCol) return res.json([]);

  const dueToday = df.filter((r) => {
    const due = fromIsoDateOnly(r[dateCol]);
    return due && due.getTime() === today0.getTime();
  });

  const logged = await callLogsToday(todayStr, role);
  const loggedMap = {};
  for (const r of logged) {
    loggedMap[r.mother_id] = r;
    if (r.mother_key) loggedMap[r.mother_key] = r;
  }

  const NAME_CANDS = ['mother_name', 'name', 'patient_name'];
  const PHC_CANDS = ['phc_key', 'phc', 'phc_name'];
  const PHONE_CANDS = ['phone', 'mobile', 'contact', 'phone_number'];
  const nameCol = NAME_CANDS.find((c) => c in df[0]);
  const phcCol = PHC_CANDS.find((c) => c in df[0]);
  const phCol = PHONE_CANDS.find((c) => c in df[0]);
  const uidCol = 'uid' in df[0] ? 'uid' : null;

  const result = dueToday.map((r) => {
    const uidVal = uidCol ? String(r[uidCol]) : '';
    const log = loggedMap[stableKey(r)] || loggedMap[uidVal] || {};
    return {
      uid: uidVal,
      name: nameCol ? String(r[nameCol]) : '',
      phc: phcCol ? String(r[phcCol]) : '',
      phone: phCol ? String(r[phCol]) : '',
      due_date: todayStr,
      called: stableKey(r) in loggedMap || uidVal in loggedMap,
      outcome: log.outcome ?? null,
      notes: log.notes ?? null,
      call_time: log.call_time ?? null,
    };
  });

  result.sort((a, b) => (a.called === b.called ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : (a.called ? 1 : -1)));
  res.json(result);
}));

router.post('/status/update', asyncRoute(async (req, res) => {
  const b = req.body || {};
  const motherId = String(b.mother_id || '').trim();
  const hrtUser = String(b.hrt_user || '').trim();
  const newStatus = String(b.new_status || '').trim();
  const notes = String(b.notes || '').trim();
  if (!(motherId && hrtUser && newStatus)) {
    return res.status(400).json({ error: 'mother_id, hrt_user and new_status required' });
  }

  const df = getData();
  const row = df.find((r) => r.uid === motherId);
  const motherName = row ? String(row.mother_name || '') : '';
  const phc = row ? String(row.phc_key || '') : '';
  const motherKey = row ? stableKey(row) : motherId;

  const { isoSeconds } = nowParts();
  const id = await addStatusUpdate({
    motherId, motherKey, motherName, phc, hrtUser,
    newStatus, notes, submittedAt: isoSeconds,
  });
  res.json({ success: true, id });
}));

router.get('/approvals', asyncRoute(async (req, res) => {
  res.json(await approvalsList());
}));

router.post('/approvals/:aid/approve', asyncRoute(async (req, res) => {
  const b = req.body || {};
  const approvedBy = String(b.approved_by || 'CHO').trim();
  const { isoSeconds } = nowParts();
  await setApproval(req.params.aid, true, approvedBy, isoSeconds);
  res.json({ success: true });
}));

router.post('/approvals/:aid/reject', asyncRoute(async (req, res) => {
  const b = req.body || {};
  const rejectedBy = String(b.rejected_by || 'CHO').trim();
  const reason = String(b.reason || '').trim();
  const { isoSeconds } = nowParts();
  await setApproval(req.params.aid, false, rejectedBy, isoSeconds, reason);
  res.json({ success: true });
}));

/** Smart AI call prioritisation — returns top mothers to call today, ranked by urgency. */
router.get('/daily-priority', asyncRoute(async (req, res) => {
  const role = String(req.query.role || '').toUpperCase();
  const limit = parseInt(req.query.limit || '30', 10);
  const today0 = new Date();
  const todayUTC = new Date(Date.UTC(today0.getFullYear(), today0.getMonth(), today0.getDate()));
  const todayStr = `${todayUTC.getUTCFullYear()}-${pad2(todayUTC.getUTCMonth() + 1)}-${pad2(todayUTC.getUTCDate())}`;

  const df = getDataForRole(role);
  if (!df || df.length === 0) return res.json([]);

  const sint = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Math.trunc(Number(v)));
  const sfloat = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? 0.0 : Number(v));

  const calledRows = await callLogsToday(todayStr, role === 'CHO' || role === 'DMCHO' ? null : role);
  const calledToday = new Set();
  for (const r of calledRows) {
    calledToday.add(r.mother_id);
    if (r.mother_key) calledToday.add(r.mother_key);
  }

  function score(row) {
    const uid = String(row.uid || '');
    if (calledToday.has(uid) || calledToday.has(stableKey(row))) return { sc: -1, reasons: [] };

    let sc = 0;
    const reasons = [];
    const isDel = Boolean(row.is_delivered);
    const dLeft = sint(row.days_to_edd);
    const dSince = sint(row.days_since_delivery);

    if (isDel) {
      if (dSince !== null) {
        if (dSince <= 7) { sc += 35; reasons.push(`Postnatal ${dSince}d ago`); }
        else if (dSince <= 14) { sc += 28; reasons.push(`Postnatal ${dSince}d ago`); }
        else if (dSince <= 28) { sc += 18; reasons.push(`Postnatal ${dSince}d ago`); }
        else { sc += 8; reasons.push(`Postnatal ${dSince}d ago`); }
      }
    } else if (dLeft !== null) {
      if (dLeft < 0) { sc += 40; reasons.push(`Overdue ${Math.abs(dLeft)}d`); }
      else if (dLeft === 0) { sc += 40; reasons.push('Due TODAY'); }
      else if (dLeft <= 3) { sc += 38; reasons.push(`Due in ${dLeft}d`); }
      else if (dLeft <= 7) { sc += 32; reasons.push(`Due in ${dLeft}d`); }
      else if (dLeft <= 14) { sc += 22; reasons.push(`Due in ${dLeft}d`); }
      else if (dLeft <= 30) { sc += 12; reasons.push(`Due in ${dLeft}d`); }
    }

    const cat = String(row.risk_category || '').trim();
    if (cat === 'Critical') { sc += 30; reasons.push('Critical'); }
    else if (cat === 'Very High') { sc += 22; reasons.push('Very High Risk'); }
    else if (cat === 'High') { sc += 14; reasons.push('High Risk'); }
    else if (cat === 'Moderate') { sc += 6; }

    const hbStr = String(row.hb || '').trim();
    const m = /(\d+\.?\d*)/.exec(hbStr);
    if (m) {
      const hb = parseFloat(m[1]);
      if (hb < 7) { sc += 10; reasons.push(`Severe anaemia Hb ${hb.toFixed(1)}`); }
      else if (hb < 9) { sc += 6; reasons.push(`Low Hb ${hb.toFixed(1)}`); }
      else if (hb < 11) { sc += 2; }
    }

    const callDt = parseDate(String(row.call_date || '').trim());
    if (callDt) {
      const gap = Math.round((todayUTC.getTime() - callDt.getTime()) / 86400000);
      if (gap > 21) { sc += 15; reasons.push(`Not contacted ${gap}d`); }
      else if (gap > 14) { sc += 10; reasons.push(`Not contacted ${gap}d`); }
      else if (gap > 7) { sc += 5; }
    } else {
      sc += 15; reasons.push('Never called');
    }

    const phone = String(row.cell_no || '').trim();
    if (['', 'nan', 'NaN', 'None'].includes(phone)) { sc += 5; reasons.push('No phone – field visit'); }

    return { sc, reasons };
  }

  const rowsOut = [];
  for (const row of df) {
    const { sc, reasons } = score(row);
    if (sc < 0) continue;
    const phone = String(row.cell_no || '').trim();
    rowsOut.push({
      uid: String(row.uid || ''),
      name: String(row.mother_name || ''),
      phc: String(row.phc_display || row.phc_key || ''),
      phc_key: String(row.phc_key || ''),
      hrt_code: String(row.hrt_code || ''),
      phone,
      edd: String(row.edd || ''),
      days_to_edd: sint(row.days_to_edd),
      risk_category: String(row.risk_category || ''),
      risk_score: sfloat(row.risk_score),
      hb: String(row.hb || ''),
      is_delivered: Boolean(row.is_delivered),
      days_since_delivery: sint(row.days_since_delivery),
      high_risk_raw: String(row.high_risk_raw || ''),
      priority_score: sc,
      reasons,
    });
  }

  rowsOut.sort((a, b) => b.priority_score - a.priority_score);
  const top = rowsOut.slice(0, limit);
  top.forEach((r, i) => {
    r.rank = i + 1;
    r.priority_tier = r.priority_score >= 60 ? 'P1' : (r.priority_score >= 35 ? 'P2' : 'P3');
  });

  res.json(top);
}));

router.get('/daily-summary', asyncRoute(async (req, res) => {
  const date = req.query.date || nowParts().dateStr;
  const { rows, pendingCount } = await dailySummaryRows(date);

  const summary = {};
  for (const r of rows) {
    const u = r.hrt_user;
    if (!summary[u]) summary[u] = { total: 0, contacted: 0, unreachable: 0, no_answer: 0, busy: 0 };
    summary[u].total += Number(r.cnt);
    summary[u][r.outcome.toLowerCase().replace(/ /g, '_')] = Number(r.cnt);
  }
  res.json({ by_hrt: summary, pending_approvals: pendingCount, date });
}));

export default router;
