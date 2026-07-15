import { Router } from 'express';
import { CANONICAL_FACTORS, getCanonicalFactors } from '../riskEngine.js';
import { getData } from '../excelLoader.js';
import { loadJson } from '../jsonStore.js';
import { CALLS_FILE, FOLLOWUP_FILE } from '../config.js';
import {
  filterByRole, groupBy, safeInt, safeFloat, todayStr,
} from '../helpers.js';
import { parseDate, formatYYYYMM } from '../parseUtils.js';

const router = Router();
const between = (v, lo, hi) => v !== null && v !== undefined && v >= lo && v <= hi;
const countIf = (arr, pred) => arr.reduce((n, r) => n + (pred(r) ? 1 : 0), 0);

router.get('/alerts', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);
  const today = todayStr();

  const active = records.filter((r) => !r.is_delivered);
  const dueToday = active.filter((r) => r.days_to_edd === 0);
  const due3days = active.filter((r) => between(r.days_to_edd, 1, 3));
  const due4to7 = active.filter((r) => between(r.days_to_edd, 4, 7));
  const overdue = active.filter((r) => r.days_to_edd !== null && r.days_to_edd < 0);
  const dueSoon = active.filter((r) => between(r.days_to_edd, 0, 7));
  const noPhone = records.filter((r) => r.cell_no.trim() === '');

  const alertList = (sub, alertType, priority) => sub.map((r) => ({
    uid: r.uid,
    mother_name: r.mother_name,
    phc_display: r.phc_display,
    hrt_name: r.hrt_name,
    cell_no: r.cell_no,
    alert_type: alertType,
    priority,
    days_to_edd: r.days_to_edd,
    risk_category: r.risk_category,
    risk_score: r.risk_score,
  }));

  const allAlerts = [
    ...alertList(dueToday, 'Due Today', 'P1'),
    ...alertList(due3days, 'Due Next 3 Days', 'P1'),
    ...alertList(due4to7, 'Delivery Due ≤7 Days', 'P1'),
    ...alertList(overdue, 'Overdue EDD', 'P2'),
    ...alertList(noPhone, 'No Contact Number', 'P3'),
  ].slice(0, 500);

  const callsJ = loadJson(CALLS_FILE);
  const NON_CONNECTED = new Set(['No Response', 'Switched Off', 'Busy', 'Wrong Number']);

  const hrtNcAlerts = [];
  for (const [hrtCode, grp] of groupBy(records, (r) => r.hrt_code)) {
    const hrtName = grp[0].hrt_name;
    let ncCount = 0;
    const statBkdn = {};
    for (const uid of grp.map((r) => r.uid)) {
      const hist = callsJ[uid] || [];
      const todayHist = hist.filter((c) => c.date === today);
      if (todayHist.length) {
        const s = todayHist[todayHist.length - 1].status || '';
        if (NON_CONNECTED.has(s)) {
          ncCount += 1;
          statBkdn[s] = (statBkdn[s] || 0) + 1;
        }
      }
    }
    if (ncCount >= 5) {
      hrtNcAlerts.push({
        hrt_code: hrtCode,
        hrt_name: hrtName,
        not_connected: ncCount,
        status_breakdown: statBkdn,
        total_mothers: grp.length,
        phcs: [...new Set(grp.map((r) => r.phc_display))].sort(),
      });
    }
  }
  hrtNcAlerts.sort((a, b) => b.not_connected - a.not_connected);

  const uidSet = new Set(records.map((r) => r.uid));
  const nc5x = [];
  for (const [uid, hist] of Object.entries(callsJ)) {
    if (!uidSet.has(uid)) continue;
    const ncTotal = hist.filter((c) => NON_CONNECTED.has(c.status)).length;
    if (ncTotal >= 5) {
      const r = records.find((x) => x.uid === uid);
      if (r) {
        nc5x.push({
          uid,
          mother_name: r.mother_name,
          phc_display: r.phc_display,
          hrt_name: r.hrt_name,
          cell_no: r.cell_no,
          nc_count: ncTotal,
          edd: String(r.edd || ''),
          days_to_edd: r.days_to_edd,
        });
      }
    }
  }
  nc5x.sort((a, b) => b.nc_count - a.nc_count);

  res.json({
    total: allAlerts.length,
    due_today: dueToday.length,
    due_3days: due3days.length,
    due_soon: dueSoon.length,
    overdue: overdue.length,
    nc_5x_count: nc5x.length,
    hrt_nc_alerts: hrtNcAlerts,
    nc_5x_mothers: nc5x.slice(0, 100),
    alerts: allAlerts,
  });
});

router.get('/postdated-edd', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);

  const pdf = records.filter((r) => !r.is_delivered && r.days_to_edd !== null && r.days_to_edd < 0);

  const calls = loadJson(CALLS_FILE);
  const followups = loadJson(FOLLOWUP_FILE);

  const result = pdf.map((row) => {
    const uid = row.uid;
    const callHist = calls[uid] || [];
    const lastCall = callHist.length ? callHist[callHist.length - 1] : null;
    const callStatus = lastCall ? (lastCall.status || 'No Call') : 'No Call';
    const lastCallDate = lastCall ? (lastCall.date || '') : '';

    const fuHist = followups[uid] || [];
    const lastFu = fuHist.length ? fuHist[fuHist.length - 1] : null;
    const fuStatus = lastFu ? (lastFu.status || 'No Follow-Up') : 'No Follow-Up';
    const lastFuDate = lastFu ? (lastFu.visit_date || '') : '';

    const daysPast = Math.abs(row.days_to_edd);

    return {
      uid,
      rch_id: row.rch_id || '',
      mother_name: row.mother_name || '',
      cell_no: row.cell_no || '',
      phc_display: row.phc_display || '',
      hrt_code: row.hrt_code || '',
      hrt_name: row.hrt_name || '',
      hsc_name: row.hsc_name || '',
      edd: row.edd || '',
      days_past_edd: daysPast,
      risk_category: row.risk_category || '',
      call_status: callStatus,
      last_call_date: lastCallDate,
      followup_status: fuStatus,
      last_followup_date: lastFuDate,
      high_risk_raw: row.high_risk_raw || '',
      gravida: row.gravida || '',
      address: row.address || '',
    };
  });

  result.sort((a, b) => b.days_past_edd - a.days_past_edd);
  res.json({ total: result.length, mothers: result });
});

router.get('/drill-down', (req, res) => {
  const metric = req.query.metric || 'total';
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);
  const today = todayStr();

  let sub;
  if (metric === 'total') sub = records;
  else if (metric === 'critical') sub = records.filter((r) => r.risk_category === 'Critical');
  else if (metric === 'very_high') sub = records.filter((r) => r.risk_category === 'Very High');
  else if (metric === 'high') sub = records.filter((r) => r.risk_category === 'High');
  else if (metric === 'high_risk') sub = records.filter((r) => ['High', 'Very High', 'Critical'].includes(r.risk_category));
  else if (metric === 'moderate') sub = records.filter((r) => r.risk_category === 'Moderate');
  else if (metric === 'low') sub = records.filter((r) => r.risk_category === 'Low');
  else if (metric === 'due_today') sub = records.filter((r) => !r.is_delivered && r.days_to_edd === 0);
  else if (metric === 'due_7_days') sub = records.filter((r) => !r.is_delivered && between(r.days_to_edd, 0, 7));
  else if (metric === 'due_30_days') sub = records.filter((r) => !r.is_delivered && between(r.days_to_edd, 0, 30));
  else if (metric === 'delivered') sub = records.filter((r) => r.is_delivered);
  else if (metric === 'postdated_edd') sub = records.filter((r) => !r.is_delivered && r.days_to_edd !== null && r.days_to_edd < 0);
  else if (metric === 'missing_phone') sub = records.filter((r) => r.cell_no.trim() === '');
  else if (metric === 'missing_name') sub = records.filter((r) => r.mother_name.trim() === '');
  else if (metric === 'followups_today') {
    const fu = loadJson(FOLLOWUP_FILE);
    const roleUids = new Set(records.map((r) => r.uid));
    const uidsToday = new Set();
    for (const [uid, hist] of Object.entries(fu)) {
      if (!roleUids.has(uid)) continue;
      for (const entry of hist) if (entry.next_visit_date === today) uidsToday.add(uid);
    }
    sub = records.filter((r) => uidsToday.has(r.uid));
  } else if (metric === 'calls_pending') {
    const callsJ = loadJson(CALLS_FILE);
    const roleUids = new Set(records.map((r) => r.uid));
    const uidsToday = new Set();
    for (const [uid, hist] of Object.entries(callsJ)) {
      if (!roleUids.has(uid)) continue;
      for (const entry of hist) if (entry.next_followup_date === today) uidsToday.add(uid);
    }
    sub = records.filter((r) => uidsToday.has(r.uid));
  } else if (metric.startsWith('phc:')) {
    const phcKey = metric.slice(4).toUpperCase();
    sub = records.filter((r) => r.phc_key === phcKey);
  } else {
    sub = records;
  }

  const totalCount = sub.length;

  const callsData = loadJson(CALLS_FILE);
  const followupsData = loadJson(FOLLOWUP_FILE);

  const result = sub.map((row) => {
    const uid = row.uid;
    const callHist = callsData[uid] || [];
    const lastCall = callHist.length ? callHist[callHist.length - 1] : null;
    const callStatus = lastCall ? (lastCall.status || 'No Call') : 'No Call';
    const lastCallD = lastCall ? (lastCall.date || '') : '';

    const fuHist = followupsData[uid] || [];
    const lastFu = fuHist.length ? fuHist[fuHist.length - 1] : null;
    const fuStatus = lastFu ? (lastFu.status || 'No Follow-Up') : 'No Follow-Up';
    const lastFuD = lastFu ? (lastFu.visit_date || '') : '';

    return {
      uid,
      rch_id: row.rch_id || '',
      mother_name: row.mother_name || '',
      cell_no: row.cell_no || '',
      phc_display: row.phc_display || '',
      phc_key: row.phc_key || '',
      hrt_code: row.hrt_code || '',
      hrt_name: row.hrt_name || '',
      hsc_name: row.hsc_name || '',
      risk_category: row.risk_category || '',
      risk_score: safeFloat(row.risk_score),
      edd: row.edd || '',
      days_to_edd: safeInt(row.days_to_edd),
      gravida: row.gravida || '',
      is_delivered: Boolean(row.is_delivered),
      delivery_date: row.delivery_date || '',
      days_since_delivery: safeInt(row.days_since_delivery),
      high_risk_raw: row.high_risk_raw || '',
      address: row.address || '',
      call_status: callStatus,
      last_call_date: lastCallD,
      followup_status: fuStatus,
      last_followup_date: lastFuD,
    };
  });

  res.json({ metric, total: totalCount, returned: result.length, mothers: result });
});

router.get('/deliveries', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);

  const cols = ['uid', 'mother_name', 'phc_display', 'hrt_name', 'hrt_code', 'cell_no',
    'edd', 'days_to_edd', 'risk_category', 'birth_plan',
    'referral', 'delivery_info', 'is_delivered', 'weeks', 'rch_id',
    'delivery_date', 'days_since_delivery'];

  const toRecords = (sub) => sub.slice(0, 200).map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));

  const phcSummary = (sub) => {
    if (sub.length === 0) return [];
    const res_ = [];
    for (const [phc, grp] of groupBy(sub, (r) => r.phc_display)) {
      res_.push({
        phc,
        hrt: grp[0].hrt_code || '',
        count: grp.length,
        critical: countIf(grp, (r) => r.risk_category === 'Critical'),
        high: countIf(grp, (r) => ['High', 'Very High', 'Critical'].includes(r.risk_category)),
      });
    }
    res_.sort((a, b) => b.count - a.count);
    return res_;
  };

  const an = records.filter((r) => !r.is_delivered && r.days_to_edd !== null);
  const anToday = an.filter((r) => r.days_to_edd === 0);
  const anW7 = an.filter((r) => between(r.days_to_edd, 1, 7));
  const an8_14 = an.filter((r) => between(r.days_to_edd, 8, 14));
  const an15_30 = an.filter((r) => between(r.days_to_edd, 15, 30));
  const an31_60 = an.filter((r) => between(r.days_to_edd, 31, 60));
  const an61_90 = an.filter((r) => between(r.days_to_edd, 61, 90));
  const an90plus = an.filter((r) => r.days_to_edd > 90);

  const pn = records.filter((r) => r.is_delivered).map((r) => {
    const actual = r.days_since_delivery;
    const proxy = r.days_to_edd !== null && r.days_to_edd < 0 ? Math.abs(r.days_to_edd) : null;
    return { ...r, _pn_days: actual !== null && actual !== undefined ? actual : proxy };
  });

  const pnBetween = (lo, hi) => pn.filter((r) => between(r._pn_days, lo, hi));
  // Day 0 (delivered today, e.g. just assigned in the app) belongs in the first bucket
  const pn1_7 = pnBetween(0, 7);
  const pn8_14 = pnBetween(8, 14);
  const pn15_21 = pnBetween(15, 21);
  const pn21_28 = pnBetween(22, 28);
  const pn28_42 = pnBetween(29, 42);
  const pn42plus = pn.filter((r) => r._pn_days !== null && r._pn_days > 42);

  const anUpcoming = an.filter((r) => between(r.days_to_edd, 0, 30));

  res.json({
    an_today: toRecords(anToday),
    an_w7: toRecords(anW7),
    an_8_14: toRecords(an8_14),
    an_15_30: toRecords(an15_30),
    an_31_60: toRecords(an31_60),
    an_61_90: toRecords(an61_90),
    an_90plus: toRecords(an90plus),
    pn_1_7: toRecords(pn1_7),
    pn_8_14: toRecords(pn8_14),
    pn_15_21: toRecords(pn15_21),
    pn_21_28: toRecords(pn21_28),
    pn_28_42: toRecords(pn28_42),
    pn_42plus: toRecords(pn42plus),
    counts: {
      an_today: anToday.length,
      an_w7: anW7.length,
      an_8_14: an8_14.length,
      an_15_30: an15_30.length,
      an_31_60: an31_60.length,
      an_61_90: an61_90.length,
      an_90plus: an90plus.length,
      pn_1_7: pn1_7.length,
      pn_8_14: pn8_14.length,
      pn_15_21: pn15_21.length,
      pn_21_28: pn21_28.length,
      pn_28_42: pn28_42.length,
      pn_42plus: pn42plus.length,
    },
    an_phc_summary: phcSummary(anUpcoming),
    pn_phc_summary: phcSummary(pn),
  });
});

/** Next 30 days, day-by-day counts. */
router.get('/delivery-timeline', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);
  const today = new Date();
  const today0 = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const anDf = records.filter((r) => !r.is_delivered && between(r.days_to_edd, 0, 30));

  const timeline = [];
  for (let day = 0; day <= 30; day++) {
    const dayDf = anDf.filter((r) => r.days_to_edd === day);
    const dateObj = new Date(today0.getTime() + day * 86400000);
    timeline.push({
      day,
      date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      weekday: dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      count: dayDf.length,
      critical: countIf(dayDf, (r) => r.risk_category === 'Critical'),
      very_high: countIf(dayDf, (r) => r.risk_category === 'Very High'),
      high: countIf(dayDf, (r) => r.risk_category === 'High'),
    });
  }
  res.json({ timeline, total: anDf.length });
});

/** Return canonical risk factor counts with per-tier breakdown. */
router.get('/risk-factor-analytics', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);
  if (!records || records.length === 0) return res.json([]);

  const TIERS = ['Critical', 'Very High', 'High', 'Moderate', 'Low'];
  const factorTotal = {};
  const factorByTier = {};

  for (const row of records) {
    const cat = row.risk_category || 'Low';
    for (const fname of getCanonicalFactors(row)) {
      factorTotal[fname] = (factorTotal[fname] || 0) + 1;
      factorByTier[fname] = factorByTier[fname] || {};
      factorByTier[fname][cat] = (factorByTier[fname][cat] || 0) + 1;
    }
  }

  const result = [];
  const seen = new Set();
  for (const fdef of CANONICAL_FACTORS) {
    const name = fdef.name;
    if (seen.has(name) || !factorTotal[name]) continue;
    seen.add(name);
    result.push({
      factor: name,
      group: fdef.group,
      color: fdef.color,
      total: factorTotal[name],
      tier_counts: Object.fromEntries(TIERS.map((t) => [t, (factorByTier[name] || {})[t] || 0])),
    });
  }

  result.sort((a, b) => b.total - a.total);
  res.json(result);
});

router.get('/executive-analytics', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);
  const today = new Date();

  const phcData = [];
  for (const [phc, grp] of groupBy(records, (r) => r.phc_display)) {
    const total = grp.length;
    const hr = countIf(grp, (r) => ['High', 'Very High', 'Critical'].includes(r.risk_category));
    const crit = countIf(grp, (r) => r.risk_category === 'Critical');
    const vh = countIf(grp, (r) => r.risk_category === 'Very High');
    const ds = countIf(grp, (r) => between(r.days_to_edd, 0, 7));
    phcData.push({
      phc, hrt: grp[0].hrt_code || '', hrt_name: grp[0].hrt_name || '',
      total, high_risk: hr, critical: crit, very_high: vh, due_soon: ds,
    });
  }
  phcData.sort((a, b) => b.high_risk - a.high_risk);

  const hrtData = [];
  for (const [hrt, grp] of groupBy(records, (r) => r.hrt_code)) {
    const total = grp.length;
    const hr = countIf(grp, (r) => ['High', 'Very High', 'Critical'].includes(r.risk_category));
    const crit = countIf(grp, (r) => r.risk_category === 'Critical');
    const vh = countIf(grp, (r) => r.risk_category === 'Very High');
    const riskDist = {};
    for (const r of grp) riskDist[r.risk_category] = (riskDist[r.risk_category] || 0) + 1;
    hrtData.push({
      hrt, hrt_name: grp[0].hrt_name || '', total,
      high_risk: hr, critical: crit, very_high: vh,
      phcs: [...new Set(grp.map((r) => r.phc_display))],
      risk_dist: riskDist,
    });
  }
  hrtData.sort((a, b) => (a.hrt < b.hrt ? -1 : a.hrt > b.hrt ? 1 : 0));

  const monthlyEdd = {};
  const monthlyHr = {};
  const hrActive = records.filter((r) => ['High', 'Very High', 'Critical'].includes(r.risk_category) && !r.is_delivered);
  for (const row of records) {
    const d = parseDate(row.edd);
    if (d) { const k = formatYYYYMM(d); monthlyEdd[k] = (monthlyEdd[k] || 0) + 1; }
  }
  for (const row of hrActive) {
    const d = parseDate(row.edd);
    if (d) { const k = formatYYYYMM(d); monthlyHr[k] = (monthlyHr[k] || 0) + 1; }
  }

  // Mirrors app.py's (today.replace(day=1) + timedelta(days=32*i)).replace(day=1):
  // a single 32*i-day jump (not iterative per-month steps), which systematically
  // drifts one extra month back for negative i since 32 days always overshoots a
  // single month boundary — replicated exactly rather than "corrected".
  const firstOfMonth = Date.UTC(today.getFullYear(), today.getMonth(), 1);
  const months = [];
  for (let i = -2; i <= 6; i++) {
    const jumped = new Date(firstOfMonth + i * 32 * 86400000);
    const m = new Date(Date.UTC(jumped.getUTCFullYear(), jumped.getUTCMonth(), 1));
    months.push(formatYYYYMM(m));
  }
  const monthlyTrend = months.map((m) => ({
    month: m, deliveries: monthlyEdd[m] || 0, high_risk: monthlyHr[m] || 0,
  }));

  const upcoming = records.filter((r) => !r.is_delivered && between(r.days_to_edd, 0, 30));
  const upcomingPhc = [];
  for (const [phc, grp] of groupBy(upcoming, (r) => r.phc_display)) {
    upcomingPhc.push({
      phc,
      count: grp.length,
      critical: countIf(grp, (r) => r.risk_category === 'Critical'),
      due_7: countIf(grp, (r) => between(r.days_to_edd, 0, 7)),
      hrt: grp[0].hrt_code || '',
    });
  }
  upcomingPhc.sort((a, b) => b.count - a.count);

  const riskDist = {};
  for (const r of records) riskDist[r.risk_category] = (riskDist[r.risk_category] || 0) + 1;

  res.json({
    phc_data: phcData.slice(0, 20),
    hrt_data: hrtData,
    monthly_trend: monthlyTrend,
    upcoming_phc: upcomingPhc.slice(0, 15),
    risk_dist: riskDist,
    total: records.length,
    total_high_risk: countIf(records, (r) => ['High', 'Very High', 'Critical'].includes(r.risk_category)),
    total_critical: countIf(records, (r) => r.risk_category === 'Critical'),
    total_very_high: countIf(records, (r) => r.risk_category === 'Very High'),
    total_phcs: new Set(records.map((r) => r.phc_display)).size,
    total_hrts: new Set(records.map((r) => r.hrt_code)).size,
  });
});

export default router;
