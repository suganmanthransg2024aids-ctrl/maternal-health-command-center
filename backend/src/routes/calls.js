import { Router } from 'express';
import { getData } from '../excelLoader.js';
import {
  addCallEntry, addFollowupEntry, getCallsMap, getFollowupsMap, getCallHistory,
} from '../activityDb.js';
import { filterByRole, groupBy } from '../helpers.js';
import { DEO_PERFORMANCE, deoCallsFor } from '../constants.js';

const router = Router();

function pad2(n) { return String(n).padStart(2, '0'); }
function nowDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function nowTimeStr() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ── Call Tracking ──────────────────────────────────────────────────────────
router.get('/calls', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const hrt = req.query.hrt || '';
  const status = req.query.status || '';
  const phc = req.query.phc || '';
  const dateFilter = req.query.date || '';

  const df = filterByRole(getData(), role);
  const calls = getCallsMap();

  let records = df.map((row) => {
    const uid = row.uid;
    const hist = calls[uid] || [];
    const latest = hist.length ? hist[hist.length - 1] : {};
    return {
      uid,
      mother_name: row.mother_name,
      phc_display: row.phc_display,
      phc_key: row.phc_key,
      hrt_code: row.hrt_code,
      hrt_name: row.hrt_name,
      cell_no: row.cell_no,
      risk_category: row.risk_category,
      call_status: latest.status !== undefined ? latest.status : (row.cell_no ? 'Pending' : 'No Number'),
      last_call_date: latest.date !== undefined ? latest.date : row.call_date,
      last_call_time: latest.time !== undefined ? latest.time : '',
      caller_name: latest.caller_name !== undefined ? latest.caller_name : row.hrt_name,
      remarks: latest.remarks !== undefined ? latest.remarks : '',
      outcome: latest.outcome !== undefined ? latest.outcome : '',
      next_followup_date: latest.next_followup_date !== undefined ? latest.next_followup_date : row.next_visit_date,
      call_count: hist.length,
    };
  });

  if (hrt) records = records.filter((r) => r.hrt_code === hrt.toUpperCase());
  if (phc) records = records.filter((r) => r.phc_key === phc.toUpperCase());
  if (status) records = records.filter((r) => r.call_status === status);
  if (dateFilter) records = records.filter((r) => r.last_call_date === dateFilter);

  const statusCounts = {};
  for (const r of records) statusCounts[r.call_status] = (statusCounts[r.call_status] || 0) + 1;

  res.json({ total: records.length, records: records.slice(0, 500), status_counts: statusCounts });
});

router.post('/calls/:uid', (req, res) => {
  const { uid } = req.params;
  const body = req.body || {};
  const entry = {
    date: body.date || nowDateStr(),
    time: body.time || nowTimeStr(),
    status: body.status || 'Connected',
    caller_name: body.caller_name || '',
    remarks: body.remarks || '',
    outcome: body.outcome || '',
    next_followup_date: body.next_followup_date || '',
    next_followup_time: body.next_followup_time || '',
    recorded_at: new Date().toISOString(),
  };
  // Snapshot the mother's identity into the row so the record stays
  // attributable even if her spreadsheet row later moves or is removed.
  const row = getData().find((r) => r.uid === uid);
  const meta = row
    ? { mother_name: row.mother_name, phc_key: row.phc_key, hrt_code: row.hrt_code }
    : {};
  const totalCalls = addCallEntry(uid, entry, meta);
  res.json({ success: true, entry, total_calls: totalCalls });
});

router.get('/calls/:uid/history', (req, res) => {
  res.json(getCallHistory(req.params.uid));
});

// ── Follow-Up Tracking ─────────────────────────────────────────────────────
router.get('/followups', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const status = req.query.status || '';
  const hrt = req.query.hrt || '';
  const phc = req.query.phc || '';

  const df = filterByRole(getData(), role);
  const followups = getFollowupsMap();

  let records = df.map((row) => {
    const uid = row.uid;
    const hist = followups[uid] || [];
    const latest = hist.length ? hist[hist.length - 1] : {};
    const fuStatus = latest.status !== undefined ? latest.status : 'Pending';
    return {
      uid,
      mother_name: row.mother_name,
      phc_display: row.phc_display,
      phc_key: row.phc_key,
      hrt_code: row.hrt_code,
      hrt_name: row.hrt_name,
      cell_no: row.cell_no,
      risk_category: row.risk_category,
      followup_status: fuStatus,
      last_visit_date: latest.visit_date !== undefined ? latest.visit_date : row.last_visit_date,
      next_visit_date: latest.next_visit_date !== undefined ? latest.next_visit_date : row.next_visit_date,
      remarks: latest.remarks !== undefined ? latest.remarks : row.uphc_response,
      escalation_status: latest.escalation_status !== undefined ? latest.escalation_status : '',
      followup_count: hist.length,
    };
  });

  if (hrt) records = records.filter((r) => r.hrt_code === hrt.toUpperCase());
  if (phc) records = records.filter((r) => r.phc_key === phc.toUpperCase());
  if (status) records = records.filter((r) => r.followup_status === status);

  const statusCounts = {};
  for (const r of records) statusCounts[r.followup_status] = (statusCounts[r.followup_status] || 0) + 1;

  res.json({ total: records.length, records: records.slice(0, 500), status_counts: statusCounts });
});

router.post('/followups/:uid', (req, res) => {
  const { uid } = req.params;
  const body = req.body || {};
  const entry = {
    visit_date: body.visit_date || nowDateStr(),
    status: body.status || 'Completed',
    remarks: body.remarks || '',
    escalation_status: body.escalation_status || '',
    next_visit_date: body.next_visit_date || '',
    recorded_at: new Date().toISOString(),
  };
  const row = getData().find((r) => r.uid === uid);
  const meta = row
    ? { mother_name: row.mother_name, phc_key: row.phc_key, hrt_code: row.hrt_code }
    : {};
  addFollowupEntry(uid, entry, meta);
  res.json({ success: true, entry });
});

router.get('/deo-performance', (req, res) => {
  const { dates, deos } = DEO_PERFORMANCE;
  const totals = {};
  for (const d of dates) totals[d] = deos.reduce((sum, deo) => sum + (deo.calls[d] || 0), 0);
  res.json({ month: DEO_PERFORMANCE.month, dates, deos, totals });
});

/** Per-HRT daily call activity analytics. */
router.get('/hrt-call-performance', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const dateFilter = req.query.date || '';

  const df = filterByRole(getData(), role);
  const callsJ = getCallsMap();
  const followupsJ = getFollowupsMap();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const fuDate = dateFilter || todayStr;

  const result = [];
  for (const [hrtCode, grp] of groupBy(df, (r) => r.hrt_code)) {
    const hrtName = grp[0].hrt_name;
    const totalMothers = grp.length;
    const phcs = [...new Set(grp.map((r) => r.phc_display))].sort();

    let attempted = 0; let connected = 0; let noResponse = 0; let switchedOff = 0;
    let wrongNumber = 0; let callBackLater = 0; let followupRequired = 0; let resolved = 0; let pending = 0;
    let lastCallDate = ''; let lastCallTime = '';

    for (const uid of grp.map((r) => r.uid)) {
      const hist = callsJ[uid] || [];
      if (!hist.length) { pending += 1; continue; }
      const dayHist = dateFilter ? hist.filter((c) => c.date === dateFilter) : hist;
      if (!dayHist.length) { pending += 1; continue; }
      const last = dayHist[dayHist.length - 1];
      attempted += 1;
      const s = last.status || '';
      const d = last.date || '';
      const t = last.time || '';
      if (d > lastCallDate) { lastCallDate = d; lastCallTime = t; }
      if (s === 'Connected') connected += 1;
      else if (s === 'No Response') noResponse += 1;
      else if (s === 'Switched Off') switchedOff += 1;
      else if (s === 'Wrong Number') wrongNumber += 1;
      else if (s === 'Call Back Later') callBackLater += 1;
      else if (s === 'Follow-Up Required') followupRequired += 1;
      else if (s === 'Resolved') resolved += 1;
    }

    let fuDue = 0;
    for (const uid of grp.map((r) => r.uid)) {
      for (const entry of (followupsJ[uid] || [])) {
        if (entry.next_visit_date === fuDate) fuDue += 1;
      }
    }

    const deoC = deoCallsFor(hrtCode, dateFilter || todayStr);
    let deoSource = false;
    if (deoC !== null && attempted === 0) {
      connected = deoC;
      attempted = deoC;
      pending = Math.max(0, totalMothers - deoC);
      deoSource = true;
    }

    result.push({
      hrt_code: hrtCode,
      hrt_name: hrtName,
      total_mothers: totalMothers,
      phcs,
      calls_attempted: attempted,
      calls_connected: connected,
      no_response: noResponse,
      switched_off: switchedOff,
      wrong_number: wrongNumber,
      call_back_later: callBackLater,
      followup_required: followupRequired,
      resolved,
      calls_pending: pending,
      followups_due: fuDue,
      last_call_date: lastCallDate,
      last_call_time: lastCallTime,
      deo_calls: deoC,
      deo_source: deoSource,
    });
  }

  result.sort((a, b) => (a.hrt_code < b.hrt_code ? -1 : a.hrt_code > b.hrt_code ? 1 : 0));
  res.json({ date: dateFilter || todayStr, hrts: result, total_hrts: result.length });
});

/** Per-HRT weekly call activity — Mon–Sun of current week, daily breakdown. */
router.get('/hrt-weekly-performance', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const df = filterByRole(getData(), role);
  const callsJ = getCallsMap();

  const today = new Date();
  const today0 = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const weekday = (today0.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const weekStart = new Date(today0.getTime() - weekday * 86400000);
  const weekDates = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000));
  const todayStr = `${today0.getUTCFullYear()}-${pad2(today0.getUTCMonth() + 1)}-${pad2(today0.getUTCDate())}`;
  const NON_CONNECTED = new Set(['No Response', 'Switched Off', 'Busy', 'Wrong Number']);
  const dstr = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

  const result = [];
  for (const [hrtCode, grp] of groupBy(df, (r) => r.hrt_code)) {
    const hrtName = grp[0].hrt_name;
    const uids = grp.map((r) => r.uid);
    const totalMothers = uids.length;

    const daily = [];
    let weekAttempted = 0; let weekConnected = 0; let weekNotConnected = 0;

    for (const d of weekDates) {
      const dateStr = dstr(d);
      let attempted = 0; let connected = 0; let notConnected = 0;
      for (const uid of uids) {
        const hist = callsJ[uid] || [];
        const dayCalls = hist.filter((c) => c.date === dateStr);
        if (dayCalls.length) {
          const s = dayCalls[dayCalls.length - 1].status || '';
          attempted += 1;
          if (s === 'Connected') connected += 1;
          else if (NON_CONNECTED.has(s)) notConnected += 1;
        }
      }
      daily.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        is_today: dateStr === todayStr,
        is_future: d > today0,
        attempted,
        connected,
        not_connected: notConnected,
        deo_calls: deoCallsFor(hrtCode, dateStr),
      });
      weekAttempted += attempted;
      weekConnected += connected;
      weekNotConnected += notConnected;
    }

    result.push({
      hrt_code: hrtCode,
      hrt_name: hrtName,
      phcs: [...new Set(grp.map((r) => r.phc_display))].sort(),
      total_mothers: totalMothers,
      daily,
      week_attempted: weekAttempted,
      week_connected: weekConnected,
      week_not_connected: weekNotConnected,
    });
  }

  result.sort((a, b) => (a.hrt_code < b.hrt_code ? -1 : a.hrt_code > b.hrt_code ? 1 : 0));
  res.json({
    week_start: dstr(weekStart),
    week_end: dstr(new Date(weekStart.getTime() + 6 * 86400000)),
    hrts: result,
  });
});

export default router;
