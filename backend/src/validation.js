function duplicatedValues(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([v]) => v));
}

function toList(records) {
  return records.slice(0, 200).map((r) => ({
    uid: r.uid,
    mother_name: r.mother_name,
    phc_display: r.phc_display,
    hrt_name: r.hrt_name,
    cell_no: r.cell_no,
    rch_id: r.rch_id,
  }));
}

export function runValidation(records) {
  const missingName = records.filter((r) => r.mother_name.trim() === '');
  const missingPhone = records.filter((r) => r.cell_no.trim() === '');
  const missingRch = records.filter((r) => r.rch_id.trim() === '');
  const missingEdd = records.filter((r) => r.edd.trim() === '');
  const missingRisk = records.filter((r) => ['', 'nan'].includes(r.high_risk_raw.trim()));

  const phoneRe = /^\d{10}$/;
  const invalidPhone = records.filter((r) => r.cell_no.trim() !== '' && !phoneRe.test(r.cell_no.trim()));

  const dupPhoneSet = duplicatedValues(records.filter((r) => r.cell_no.trim() !== '').map((r) => r.cell_no));
  const dupPhone = records.filter((r) => r.cell_no.trim() !== '' && dupPhoneSet.has(r.cell_no));

  const dupRchSet = duplicatedValues(records.filter((r) => r.rch_id.trim() !== '').map((r) => r.rch_id));
  const dupRch = records.filter((r) => r.rch_id.trim() !== '' && dupRchSet.has(r.rch_id));

  const total = records.length;
  const valid = total - missingName.length - missingPhone.length - invalidPhone.length;
  const qualityScore = total > 0 ? Math.round(Math.max(0, (valid / total) * 100) * 10) / 10 : 0;

  return {
    total_records: total,
    missing_name: missingName.length,
    missing_phone: missingPhone.length,
    missing_rch: missingRch.length,
    missing_edd: missingEdd.length,
    missing_risk_entry: missingRisk.length,
    invalid_phone: invalidPhone.length,
    duplicate_phone: dupPhone.length,
    duplicate_rch: dupRch.length,
    quality_score: qualityScore,
    missing_name_records: toList(missingName),
    missing_phone_records: toList(missingPhone),
    invalid_phone_records: toList(invalidPhone),
    duplicate_phone_records: toList(dupPhone),
    duplicate_rch_records: toList(dupRch),
  };
}
