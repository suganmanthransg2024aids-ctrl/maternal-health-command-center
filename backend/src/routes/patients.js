import { Router } from 'express';
import fs from 'fs';
import XLSX from 'xlsx';
import { EXCEL_PATH } from '../config.js';
import { PHC_MAP } from '../constants.js';
import { getData } from '../excelLoader.js';
import { getCanonicalFactors } from '../riskEngine.js';
import { loadJson } from '../jsonStore.js';
import { CALLS_FILE, FOLLOWUP_FILE } from '../config.js';
import { filterByRole, groupBy, sortedCountBy } from '../helpers.js';
import { runValidation } from '../validation.js';

const router = Router();
const between = (v, lo, hi) => v !== null && v !== undefined && v >= lo && v <= hi;
const countIf = (arr, pred) => arr.reduce((n, r) => n + (pred(r) ? 1 : 0), 0);

router.get('/patients', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const phc = req.query.phc || '';
  const hrt = req.query.hrt || '';
  const search = String(req.query.search || '').trim().toLowerCase();
  const riskCat = req.query.risk_category || '';
  const riskFactor = String(req.query.risk_factor || '').trim();
  const page = parseInt(req.query.page || '1', 10);
  const perPage = parseInt(req.query.per_page || '50', 10);

  let records = filterByRole(getData(), role);
  if (phc) records = records.filter((r) => r.phc_key === phc.toUpperCase());
  if (hrt) records = records.filter((r) => r.hrt_code === hrt.toUpperCase());
  if (riskCat) records = records.filter((r) => r.risk_category === riskCat);
  if (riskFactor) records = records.filter((r) => getCanonicalFactors(r).includes(riskFactor));
  if (search) {
    records = records.filter((r) => r.mother_name.toLowerCase().includes(search)
      || r.cell_no.includes(search)
      || r.rch_id.toLowerCase().includes(search)
      || r.phc_display.toLowerCase().includes(search));
  }

  const total = records.length;
  const pageRecords = records.slice((page - 1) * perPage, page * perPage);
  res.json({ total, page, per_page: perPage, patients: pageRecords });
});

router.get('/patients/:uid', (req, res) => {
  const records = getData();
  const row = records.find((r) => r.uid === req.params.uid);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const calls = loadJson(CALLS_FILE);
  const followups = loadJson(FOLLOWUP_FILE);
  res.json({
    ...row,
    call_history: calls[req.params.uid] || [],
    followup_history: followups[req.params.uid] || [],
  });
});

router.get('/stats', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);
  const todayStr = new Date().toISOString().slice(0, 10);

  const total = records.length;
  const delivered = countIf(records, (r) => r.is_delivered);
  const active = total - delivered;

  const riskCounts = {};
  for (const r of records) riskCounts[r.risk_category] = (riskCounts[r.risk_category] || 0) + 1;
  const critical = riskCounts.Critical || 0;
  const veryHigh = riskCounts['Very High'] || 0;
  const highCount = riskCounts.High || 0;

  const due7 = countIf(records, (r) => between(r.days_to_edd, 0, 7));
  const due30 = countIf(records, (r) => between(r.days_to_edd, 0, 30));
  const dueToday = countIf(records, (r) => r.days_to_edd === 0);
  const overdue = countIf(records, (r) => r.days_to_edd !== null && r.days_to_edd < 0);
  const postdatedEdd = countIf(records, (r) => !r.is_delivered && r.days_to_edd !== null && r.days_to_edd < 0);

  const missingPhone = countIf(records, (r) => r.cell_no.trim() === '');
  const missingName = countIf(records, (r) => r.mother_name.trim() === '');
  const phoneRe = /^\d{10}$/;
  const invalidPhoneCnt = countIf(records, (r) => r.cell_no.trim() !== '' && !phoneRe.test(r.cell_no.trim()));
  const validationIssues = missingPhone + missingName + invalidPhoneCnt;

  const calls = loadJson(CALLS_FILE);
  const followups = loadJson(FOLLOWUP_FILE);
  const roleUids = new Set(records.map((r) => r.uid));

  let followupsDueToday = 0;
  for (const [uid, hist] of Object.entries(followups)) {
    if (!roleUids.has(uid)) continue;
    for (const entry of hist) if (entry.next_visit_date === todayStr) followupsDueToday += 1;
  }
  let callsPendingToday = 0;
  for (const [uid, hist] of Object.entries(calls)) {
    if (!roleUids.has(uid)) continue;
    for (const entry of hist) if (entry.next_followup_date === todayStr) callsPendingToday += 1;
  }

  const phcDist = sortedCountBy(records, (r) => r.phc_display);
  const hrtDist = sortedCountBy(records, (r) => r.hrt_name);
  const riskDist = {
    Low: riskCounts.Low || 0,
    Moderate: riskCounts.Moderate || 0,
    High: highCount,
    'Very High': veryHigh,
    Critical: critical,
  };

  res.json({
    total_mothers: total,
    active_mothers: active,
    delivered,
    high_risk: highCount + veryHigh + critical,
    critical,
    very_high: veryHigh,
    due_7_days: due7,
    due_30_days: due30,
    due_today: dueToday,
    overdue_edd: overdue,
    postdated_edd: postdatedEdd,
    missing_phone: missingPhone,
    missing_name: missingName,
    validation_issues: validationIssues,
    followups_due_today: followupsDueToday,
    calls_pending_today: callsPendingToday,
    phc_distribution: phcDist,
    hrt_distribution: hrtDist,
    risk_distribution: riskDist,
  });
});

router.get('/validation', (req, res) => {
  res.json(runValidation(getData()));
});

router.get('/phc-analytics', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);

  const groups = groupBy(records, (r) => r.phc_key);
  const result = [];
  for (const [phcKey, group] of groups) {
    const hrtInfo = PHC_MAP[phcKey] || {};
    const total = group.length;
    const critical = countIf(group, (r) => r.risk_category === 'Critical');
    const veryH = countIf(group, (r) => r.risk_category === 'Very High');
    const high = countIf(group, (r) => r.risk_category === 'High');
    const low = countIf(group, (r) => r.risk_category === 'Low');
    const mod = countIf(group, (r) => r.risk_category === 'Moderate');
    const delivered = countIf(group, (r) => r.is_delivered);
    const dueSoon = countIf(group, (r) => between(r.days_to_edd, 0, 7));
    const noPhone = countIf(group, (r) => r.cell_no.trim() === '');
    result.push({
      phc_key: phcKey,
      phc_display: hrtInfo.phc_display || phcKey,
      hrt_code: hrtInfo.hrt_code || '',
      hrt_name: hrtInfo.hrt_name || '',
      total,
      critical,
      very_high: veryH,
      high,
      moderate: mod,
      low,
      delivered,
      due_soon: dueSoon,
      no_phone: noPhone,
      risk_pct: total ? Math.round(((critical + veryH + high) / total) * 1000) / 10 : 0,
    });
  }
  result.sort((a, b) => b.total - a.total);
  res.json(result);
});

router.get('/phc/ai-insights', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);

  const groups = groupBy(records, (r) => r.phc_key);
  const insights = [];
  for (const [phcKey, group] of groups) {
    const hrtInfo = PHC_MAP[phcKey] || {};
    const total = group.length;
    if (total === 0) continue;

    const critical = countIf(group, (r) => r.risk_category === 'Critical');
    const veryH = countIf(group, (r) => r.risk_category === 'Very High');
    const high = countIf(group, (r) => r.risk_category === 'High');
    const delivered = countIf(group, (r) => r.is_delivered);
    const dueSoon = countIf(group, (r) => between(r.days_to_edd, 0, 7));
    const due14 = countIf(group, (r) => between(r.days_to_edd, 0, 14));
    const noPhone = countIf(group, (r) => r.cell_no.trim() === '');
    const overdue = countIf(group, (r) => r.days_to_edd !== null && r.days_to_edd < 0);
    const riskPct = Math.round(((critical + veryH + high) / total) * 1000) / 10;

    let score = riskPct * 0.35;
    score += (dueSoon / total * 100) * 0.25;
    score += (noPhone / total * 100) * 0.20;
    score += (overdue / total * 100) * 0.20;
    score = Math.round(Math.min(100, score) * 10) / 10;

    let grade;
    if (score < 20) grade = 'A';
    else if (score < 40) grade = 'B';
    else if (score < 60) grade = 'C';
    else grade = 'D';

    let alert;
    if (due14 >= 8) alert = 'Delivery Surge';
    else if (noPhone >= 5 && riskPct > 35) alert = 'Intervention Needed';
    else if (riskPct > 50 || overdue >= 5) alert = 'At-Risk';
    else alert = 'Stable';

    const factorCounts = {};
    for (const row of group) {
      for (const f of getCanonicalFactors(row)) factorCounts[f] = (factorCounts[f] || 0) + 1;
    }
    const topFactors = Object.entries(factorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const phcName = hrtInfo.phc_display || phcKey;
    const hrtName = hrtInfo.hrt_name || '';
    const lines = [];

    if (grade === 'A') {
      lines.push(`${phcName} is currently stable with ${total} registered mothers and a low intervention burden.`);
    } else if (grade === 'B') {
      lines.push(`${phcName} has ${total} mothers under monitoring with moderate risk activity requiring routine follow-up.`);
    } else if (grade === 'C') {
      lines.push(`${phcName} is showing elevated risk patterns across ${total} mothers — active intervention is advised.`);
    } else {
      lines.push(`${phcName} is a high-priority PHC with ${total} mothers and critical risk indicators that need immediate attention.`);
    }

    if (critical + veryH > 0) {
      lines.push(`${critical + veryH} mother${critical + veryH > 1 ? 's' : ''} are in the Critical or Very High risk tier (${riskPct.toFixed(1)}% overall risk burden).`);
    } else if (riskPct > 0) {
      lines.push(`Overall risk burden stands at ${riskPct.toFixed(1)}%, primarily in the High category.`);
    }

    if (dueSoon > 0) {
      lines.push(`${dueSoon} mother${dueSoon > 1 ? 's are' : ' is'} expected to deliver within 7 days — priority contact required.`);
    }
    if (overdue > 0) {
      lines.push(`${overdue} mother${overdue > 1 ? 's have' : ' has'} passed their EDD and ${overdue > 1 ? 'are' : 'is'} awaiting delivery confirmation.`);
    }

    if (noPhone >= 5) {
      lines.push(`${noPhone} mothers have no registered phone number — field visits are essential for these cases.`);
    } else if (noPhone > 0) {
      lines.push(`${noPhone} mother${noPhone > 1 ? 's have' : ' has'} no phone contact and ${noPhone > 1 ? 'require' : 'requires'} field follow-up.`);
    }

    if (topFactors.length) {
      const factorStr = topFactors.map(([f, c]) => `${f} (${c})`).join(', ');
      lines.push(`Dominant risk conditions: ${factorStr}.`);
    }

    if (['Delivery Surge', 'Intervention Needed', 'At-Risk'].includes(alert)) {
      lines.push(`Assigned HRT (${hrtName}) should prioritise this PHC in today's workflow.`);
    }

    const summary = lines.join(' ');

    insights.push({
      phc_key: phcKey,
      phc_display: phcName,
      hrt_code: hrtInfo.hrt_code || '',
      hrt_name: hrtName,
      total,
      risk_score: score,
      grade,
      alert,
      risk_pct: riskPct,
      due_soon: dueSoon,
      due_14: due14,
      no_phone: noPhone,
      overdue,
      critical,
      very_high: veryH,
      high,
      top_factors: topFactors.map(([name, count]) => ({ name, count })),
      summary,
    });
  }

  insights.sort((a, b) => b.risk_score - a.risk_score);
  res.json(insights);
});

router.get('/phc/:phcKey/mothers', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);

  const group = records.filter((r) => r.phc_key === req.params.phcKey);
  if (group.length === 0) return res.json([]);

  const mothers = group.map((row) => {
    const days = row.days_to_edd !== null && row.days_to_edd !== undefined ? Math.trunc(row.days_to_edd) : null;
    const hbRaw = row.hb || '';
    const hbStr = hbRaw && !['', 'nan'].includes(String(hbRaw).trim()) ? String(hbRaw).trim() : '—';

    return {
      uid: row.uid || '',
      row_no: row.row_no || '',
      mother_name: row.mother_name || '',
      cell_no: String(row.cell_no || '').trim(),
      husband_name: String(row.husband_name || '').trim(),
      address: String(row.address || '').trim(),
      edd: row.edd || '',
      days_to_edd: days,
      weeks: row.weeks || '',
      hb: hbStr,
      blood_group: String(row.blood_group || '').trim(),
      risk_category: row.risk_category || '',
      risk_score: row.risk_score || 0,
      high_risk_raw: String(row.high_risk_raw || '').trim(),
      is_delivered: Boolean(row.is_delivered),
      delivery_date: row.delivery_date || '',
      last_visit_date: String(row.last_visit_date || '').trim(),
      next_visit_date: String(row.next_visit_date || '').trim(),
      bp: String(row.bp || '').trim(),
      gravida: String(row.gravida || '').trim(),
      para: String(row.para || '').trim(),
      lmp: String(row.lmp || '').trim(),
      height: String(row.height || '').trim(),
      weight: String(row.weight || '').trim(),
      gct: String(row.gct || '').trim(),
      ppbs: String(row.ppbs || '').trim(),
      tsh: String(row.tsh || '').trim(),
      echo_ecg: String(row.echo_ecg || '').trim(),
      usg: String(row.usg || '').trim(),
      sputum_afb: String(row.sputum_afb || '').trim(),
      urine_routine: String(row.urine_routine || '').trim(),
      birth_plan: String(row.birth_plan || '').trim(),
      action_taken: String(row.action_taken || '').trim(),
      uphc_response: String(row.uphc_response || '').trim(),
      delivery_info: String(row.delivery_info || '').trim(),
      referral: String(row.referral || '').trim(),
    };
  });

  // Sort: overdue first, then by days_to_edd ascending, delivered last
  mothers.sort((a, b) => {
    const keyOf = (m) => {
      if (m.is_delivered) return [2, 0];
      if (m.days_to_edd === null) return [1, 9999];
      if (m.days_to_edd < 0) return [0, m.days_to_edd];
      return [1, m.days_to_edd];
    };
    const ka = keyOf(a);
    const kb = keyOf(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });

  res.json(mothers);
});

/** Full PHC mapping validation report — compares configured vs detected PHCs. */
router.get('/phc-audit', (req, res) => {
  const records = getData();

  const configured = Object.fromEntries(
    Object.entries(PHC_MAP).filter(([k, v]) => v.hrt_code !== 'UNASSIGNED'
      && !['MM', 'MM PHC', 'MPHC', 'SHEET45'].includes(k))
  );

  const detectedInDb = {};
  for (const [phcKey, grp] of groupBy(records, (r) => r.phc_key)) {
    detectedInDb[phcKey] = {
      count: grp.length,
      phc_display: grp[0].phc_display,
      hrt_code: grp[0].hrt_code,
      hrt_name: grp[0].hrt_name,
    };
  }

  let xlSheets = [];
  try {
    if (fs.existsSync(EXCEL_PATH)) {
      const wb = XLSX.readFile(EXCEL_PATH, { bookSheets: true });
      xlSheets = wb.SheetNames;
    }
  } catch {
    xlSheets = [];
  }

  const missing = [];
  for (const [k, v] of Object.entries(configured)) {
    if (!(k in detectedInDb)) {
      missing.push({
        phc_key: k,
        phc_display: v.phc_display,
        hrt_code: v.hrt_code,
        hrt_name: v.hrt_name,
        in_excel: xlSheets.some((s) => s.toUpperCase().trim() === k),
      });
    }
  }

  const unmapped = [];
  for (const [k, v] of Object.entries(detectedInDb)) {
    if (!(k in PHC_MAP)) unmapped.push({ phc_key: k, count: v.count });
  }

  const correct = Object.keys(configured)
    .filter((k) => k in detectedInDb)
    .map((k) => ({
      phc_key: k,
      phc_display: detectedInDb[k].phc_display,
      hrt_code: detectedInDb[k].hrt_code,
      count: detectedInDb[k].count,
    }));
  correct.sort((a, b) => (a.hrt_code < b.hrt_code ? -1 : a.hrt_code > b.hrt_code ? 1 : 0));

  const hrtSummary = {};
  for (const [hrtCode, grp] of groupBy(records, (r) => r.hrt_code)) {
    hrtSummary[hrtCode] = {
      hrt_name: grp[0].hrt_name,
      total: grp.length,
      phc_count: new Set(grp.map((r) => r.phc_key)).size,
      phcs: [...new Set(grp.map((r) => r.phc_display))].sort(),
    };
  }

  res.json({
    summary: {
      configured_phcs: Object.keys(configured).length,
      detected_in_db: Object.keys(detectedInDb).length,
      correct_mapped: correct.length,
      missing_phcs: missing.length,
      unmapped_phcs: unmapped.length,
      total_records: records.length,
      excel_sheets: xlSheets.length,
    },
    missing,
    unmapped,
    correct,
    hrt_summary: hrtSummary,
    all_detected: Object.entries(detectedInDb).sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => ({ phc_key: k, ...v })),
  });
});

/** PHC list for filter dropdowns, scoped to role. */
router.get('/phcs', (req, res) => {
  const role = req.query.role || 'DMCHO';
  const records = filterByRole(getData(), role);

  const phcs = [];
  const seen = new Set();
  for (const r of records) {
    if (seen.has(r.phc_key)) continue;
    seen.add(r.phc_key);
    const phcInfo = PHC_MAP[r.phc_key] || {};
    phcs.push({
      phc_key: r.phc_key,
      phc_display: phcInfo.phc_display || r.phc_key,
      hrt_code: phcInfo.hrt_code || '',
      count: countIf(records, (x) => x.phc_key === r.phc_key),
    });
  }
  phcs.sort((a, b) => (a.phc_display < b.phc_display ? -1 : a.phc_display > b.phc_display ? 1 : 0));
  res.json(phcs);
});

export default router;
