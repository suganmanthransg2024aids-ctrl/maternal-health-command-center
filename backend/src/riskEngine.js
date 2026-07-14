// ── Risk Engine ────────────────────────────────────────────────────────────
export const HIGH_RISK_WEIGHTS = {
  pih: 4, 'pre-eclampsia': 4, eclampsia: 5, hypertension: 4,
  gdm: 3, 'gestational diabetes': 3, diabetes: 3, gct: 2,
  'severe anemia': 4, anemia: 2, hb: 2,
  'heart disease': 5, cardiac: 5,
  'prev.lscs': 2, 'previous lscs': 2, lscs: 2, 'c-section': 2,
  'short primi': 2, 'height less than 145': 2,
  'elderly primi': 2, '>35': 2, 'age >35': 2,
  'rh isoimmunization': 3, 'rh negative': 3,
  hypothyroidism: 2, thyroid: 2, tsh: 1,
  'weight below 40': 2, 'weight above 90': 2, 'weight above 70': 1,
  'multiple pregnancy': 3, twin: 3, triplet: 4,
  'bad obstetric history': 3, boh: 3,
  'antepartum hemorrhage': 4, aph: 4, 'placenta previa': 4,
  iufd: 4, iud: 3, stillbirth: 3,
  preterm: 2, premature: 2,
  oligohydramnios: 2, polyhydramnios: 2,
  'deep vein thrombosis': 3, dvt: 3,
  'mal-presentation': 2, malpresentation: 2, breech: 2,
  fgr: 2, iugr: 2, 'growth restriction': 2,
  epilepsy: 2, seizure: 2,
  'renal disease': 3, kidney: 2,
  'liver disease': 3, jaundice: 2,
  'sickle cell': 3, thalassemia: 3,
  hiv: 4, hepatitis: 3, syphilis: 3, vdrl: 2,
  referred: 2, refer: 1,
  emergency: 4, critical: 5,
};

// ── Canonical Risk Factor Definitions (Official CCMC Classification) ──────────
// Based on official Tamil Nadu maternal health risk register categories.
// Keywords matched against high_risk_raw column (lowercased). Order preserved.
// Exclude: Typhoid (excluded per reporting policy)
export const CANONICAL_FACTORS = [
  // ── Surgical / Obstetric History ──────────────────────────────────────────
  { name: 'Previous LSCS / Assisted', group: 'Surgical', color: '#7C3AED',
    keywords: ['previous lscs', 'prev.lscs', 'prev lscs', 'prelscs', 'pre lscs', 'lscs',
      'previous lscs/assisted', 'previous lscs / assisted', 'assisted delivery',
      'forceps', 'vacuum extraction'] },
  { name: 'Previous Bad Obstetric History (BOH)', group: 'Obstetric', color: '#9333EA',
    keywords: ['previous bad obstetric history', 'bad obstetric history', 'boh', ' hob',
      'multipara (>/ gravida 4 ) / hob', 'hob,'] },
  { name: 'Intra Uterine Death (IUD)', group: 'Obstetric', color: '#6D28D9',
    keywords: ['intra uterine death', 'intrauterine death', 'iufd', ' iud ', 'iud,', ',iud',
      'intra-uterine death', 'still birth', 'stillbirth'] },
  { name: 'Multiple Pregnancy', group: 'Obstetric', color: '#8B5CF6',
    keywords: ['multiple pregnancy', 'twin pregnancy', 'triplet', 'twin gestation'] },
  { name: 'IVF / Pregnancy After Prolonged Infertility', group: 'Obstetric', color: '#A78BFA',
    keywords: ['ivf', 'in vitro', 'prolonged infertility', 'infertility treatment',
      'pregnancy after prolonged infertility', 'subfertility'] },
  { name: 'Ectopic Pregnancy', group: 'Obstetric', color: '#C4B5FD',
    keywords: ['ectopic pregnancy', 'ectopic', 'ectopic gestation'] },
  { name: 'Vesicular Mole', group: 'Obstetric', color: '#DDD6FE',
    keywords: ['vesicular mole', 'hydatidiform mole', 'molar pregnancy', 'vesicular'] },
  { name: 'Congenital Malformation', group: 'Fetal', color: '#5B21B6',
    keywords: ['congenital malformation', 'congenital anomaly', 'congenital defect',
      'birth defect', 'neural tube defect', 'malformation'] },
  { name: 'IUGR (Intra Uterine Growth Restriction)', group: 'Fetal', color: '#4C1D95',
    keywords: ['iugr', 'fgr', 'growth restriction', 'intrauterine growth restriction',
      'intra uterine growth restriction', 'foetal growth restriction'] },
  { name: 'APH - Placenta Previa / Abruptio Placenta', group: 'Hemorrhage', color: '#7F1D1D',
    keywords: ['antepartum hemorrhage', 'antepartum haemorrhage', 'aph', 'placenta previa',
      'placenta praevia', 'abruptio placenta', 'placental abruption'] },
  { name: 'Abnormal Presentation (>37 Weeks)', group: 'Obstetric', color: '#6D28D9',
    keywords: ['malpresentation', 'mal-presentation', 'transverse lie', 'abnormal presentation',
      'transverse', 'oblique lie', 'face presentation'] },
  { name: 'Post Dated Pregnancy (>42 Weeks)', group: 'Obstetric', color: '#8B5CF6',
    keywords: ['post dated pregnancy', 'post-dated', 'postdated', 'beyond 42 weeks',
      'post dated', 'post date', 'postdate', 'prolonged pregnancy',
      'post term pregnancy', 'post-term'] },
  { name: 'Hydramnios > 28 Weeks (Poly / Oligo)', group: 'Obstetric', color: '#A78BFA',
    keywords: ['hydramnios', 'oligohydramnios', 'polyhydramnios', 'poly hydro',
      'oligo hydro', 'poly / oligo', 'polyhydramnois'] },

  // ── Maternal Factors ──────────────────────────────────────────────────────
  { name: 'Multipara (>= Gravida 4) / HOB', group: 'Maternal', color: '#EA580C',
    keywords: ['multipara', 'gravida 4', 'gravida 5', 'gravida 6', 'gravida 7', 'gravida 8',
      'gravida 9', 'multipara (>/ gravida 4', ' hob', 'hob,', ',hob',
      'high obstetric background'] },
  { name: 'Elderly Primi (>35yrs)', group: 'Maternal', color: '#C2410C',
    keywords: ['elderly primi', 'elderly primigravida', '>35yrs', '>35 yrs', 'age >35',
      'age>35', 'age above 35', 'elderly primi (>35', 'elderly'] },
  { name: 'Teenage Pregnancy (<19yrs)', group: 'Maternal', color: '#D97706',
    keywords: ['teenage pregnancy', 'teenage', '<19years', '<19yrs', '<19 years',
      'teen age', 'adolescent pregnancy', 'age <19', 'age below 19'] },
  { name: 'Short Primi (Height < 145 cm)', group: 'Maternal', color: '#92400E',
    keywords: ['short primi', 'height less than 145', 'short stature', 'height < 145',
      'height below 145', 'short primigravida'] },
  { name: 'Weight Above 70 Kg', group: 'Maternal', color: '#B45309',
    keywords: ['weight above 70', 'wt above 70', 'weight > 70', 'weight above 70 kg',
      'obesity', 'obese', 'overweight', 'weight above70', 'wt > 70'] },
  { name: 'Weight Below 40 Kg', group: 'Maternal', color: '#78350F',
    keywords: ['weight below 40', 'wt below 40', 'underweight', 'under weight', 'under wt',
      'weight below 40 kg', 'weight < 40', 'low weight', 'under weight'] },
  { name: 'Differently Abled Mother', group: 'Maternal', color: '#713F12',
    keywords: ['differently abled', 'handicapped', 'disabled', 'physically challenged',
      'hearing impaired', 'visually impaired', 'deaf', 'mute', 'blind', 'disability'] },

  // ── Hypertensive Disorders ────────────────────────────────────────────────
  { name: 'PIH / Preeclampsia', group: 'Hypertensive', color: '#DC2626',
    keywords: ['pih/', 'pih,', 'pih ', ' pih', 'pre-eclampsia', 'eclampsia',
      'preeclampsia', 'pre eclampsia', 'pih/ preeclampsia',
      'pregnancy induced hypertension', 'gestational hypertension'] },

  // ── Metabolic / Endocrine ─────────────────────────────────────────────────
  { name: 'Hypothyroidism', group: 'Metabolic', color: '#0F766E',
    keywords: ['hypothyroidism', 'hypothyrodism', 'hypothyroid', 'hypothyrodsim',
      'hypothyroidsm', 'hypotyroid', 'hypothrodisam', 'hypothyridism',
      'hypothyrodisam', 'hypothyoriodism', 'hypothyroisam', 'hypo thyroid'] },
  { name: 'Hyperthyroidism', group: 'Metabolic', color: '#0891B2',
    keywords: ['hyperthyroidism', 'hyperthyroid', 'hyper thyroid', 'thyrotoxicosis',
      'graves disease'] },
  { name: 'GDM', group: 'Metabolic', color: '#0E7490',
    keywords: ['gdm', 'gestational diabetes mellitus', 'gestational diabetes',
      'gdm on', 'gdm /', 'gct positive', 'impaired glucose'] },
  { name: 'Diabetes Mellitus', group: 'Metabolic', color: '#155E75',
    keywords: ['diabetes mellitus', 'pre-existing diabetes', 'type 1 diabetes',
      'type 2 diabetes', 'diabetic', 't2dm', 'type ii diabetes'] },

  // ── Blood Disorders ───────────────────────────────────────────────────────
  { name: 'Severe Anaemia (< 7 gm)', group: 'Blood', color: '#991B1B',
    keywords: [], anemia_severity: 'severe', hb_max: 7.0 },
  { name: 'Rh Isoimmunization', group: 'Blood', color: '#EF4444',
    keywords: ['rh isoimmunization', 'rh negative', 'rh -ve', 'rh-ve', 'rh -negative',
      'rh negative blood', 'isoimmunization', 'rh iso', 'rh(d) negative',
      'rh incompatibility'] },
  { name: 'Haemoglobinopathy', group: 'Blood', color: '#B91C1C',
    keywords: ['haemoglobinopathy', 'hemoglobinopathy', 'thalassemia', 'sickle cell',
      'thalassaemia', 'beta thalassemia', 'thalassemia trait', 'hb s', 'hba2'] },

  // ── Cardiac Disorders ─────────────────────────────────────────────────────
  { name: 'Heart Diseases Complicating Pregnancy', group: 'Cardiac', color: '#BE185D',
    keywords: ['heart diseases complicating', 'heart disease', 'cardiac', 'rheumatic heart',
      'congenital heart', 'valvular heart', 'cardiomyopathy', 'heart failure',
      'atrial', 'ventricular defect'] },

  // ── Neurological ──────────────────────────────────────────────────────────
  { name: 'Epilepsy', group: 'Neurological', color: '#312E81',
    keywords: ['epilepsy', 'epileptic', 'seizure disorder', 'convulsion', 'fits'] },

  // ── Infectious Diseases ───────────────────────────────────────────────────
  { name: 'HIV / AIDS', group: 'Infection', color: '#1D4ED8',
    keywords: ['hiv', 'aids', 'hiv positive', 'hiv/aids', 'human immunodeficiency'] },
  { name: 'Scrub Typhus', group: 'Infection', color: '#2563EB',
    keywords: ['scrub typhus', 'scrub typhus fever', 'orientia'] },
  { name: 'H1N1', group: 'Infection', color: '#3B82F6',
    keywords: ['h1n1', 'swine flu', 'influenza h1n1', 'pandemic influenza'] },

  // ── Renal / Hepatic / Respiratory ─────────────────────────────────────────
  { name: 'Renal Diseases Complicating Pregnancy', group: 'Renal', color: '#1E40AF',
    keywords: ['renal disease', 'renal diseases complicating', 'kidney disease',
      'renal failure', 'chronic kidney', 'ckd', 'nephropathy', 'nephrotic',
      'glomerulonephritis'] },
  { name: 'Jaundice / Hepatitis B', group: 'Hepatic', color: '#0E7490',
    keywords: ['jaundice', 'hepatitis b', 'hepatitis c', 'viral hepatitis',
      'hepatitis', 'obstetric cholestasis', 'intrahepatic cholestasis'] },
  { name: 'Respiratory Disorders in Pregnancy', group: 'Respiratory', color: '#0369A1',
    keywords: ['asthma', 'bronchial asthma', 'respiratory disorder', 'copd',
      'respiratory diseases', 'bronchitis', 'respiratory'] },

  // ── Autoimmune / Other ────────────────────────────────────────────────────
  { name: 'Auto Immune Diseases', group: 'Autoimmune', color: '#64748B',
    keywords: ['autoimmune', 'auto immune', 'rheumatoid arthritis', 'sle', 'lupus',
      'systemic lupus', 'anti-phospholipid', 'antiphospholipid'] },

  // ── Mental Health ─────────────────────────────────────────────────────────
  { name: 'Mental Disorder Complicating Pregnancies', group: 'Mental', color: '#4C1D95',
    keywords: ['mental disorder', 'mental disorder complicating', 'mental health',
      'anxiety disorder', 'depression', 'psychiatric', 'psychosis',
      'schizophrenia', 'bipolar'] },
];

/** Parse numeric HB value from the hb column or raw text. */
export function extractHbValue(row) {
  const hbStr = String(row.hb || '');
  let m = /([0-9]+\.?[0-9]*)/.exec(hbStr);
  if (m) {
    const v = parseFloat(m[1]);
    if (!isNaN(v) && v > 3.0 && v < 20.0) return v;
  }
  const raw = String(row.high_risk_raw || '').toLowerCase();
  m = /hb[:\s\-.]*([0-9]+\.?[0-9]*)/.exec(raw);
  if (m) {
    const v = parseFloat(m[1]);
    if (!isNaN(v) && v > 3.0 && v < 20.0) return v;
  }
  return null;
}

/** Return canonical anemia sub-category string, or null if no anemia. */
export function anemiaBucket(raw, hbVal) {
  const hasAnemia = raw.includes('anemia') || raw.includes('anaemia');
  if (!hasAnemia) return null;
  if (raw.includes('severe')) return 'Severe Anemia';
  if (raw.includes('moderate')) return 'Moderate Anemia';
  if (raw.includes('mild')) return 'Mild Anemia';
  if (hbVal !== null) {
    if (hbVal < 7.0) return 'Severe Anaemia (< 7 gm)';
    if (hbVal < 10.0) return 'Moderate Anaemia';
    if (hbVal < 11.0) return 'Mild Anaemia';
  }
  return 'Anaemia (Unclassified)';
}

const ANEMIA_BUCKET_MATCHES = {
  severe: 'Severe Anaemia (< 7 gm)',
  moderate: 'Moderate Anaemia',
  mild: 'Mild Anaemia',
  unclassified: 'Anaemia (Unclassified)',
};

/** Return list of canonical factor names that apply to this patient row. */
export function getCanonicalFactors(row) {
  const raw = String(row.high_risk_raw || '').toLowerCase().trim();
  if (!raw || raw === 'nan' || raw === 'nil' || raw === '-') return [];

  const hbVal = extractHbValue(row);
  const matched = [];
  let anemiaDone = false;

  for (const fdef of CANONICAL_FACTORS) {
    const sev = fdef.anemia_severity;
    if (sev !== undefined) {
      if (anemiaDone) continue;
      const bucket = anemiaBucket(raw, hbVal);
      if (bucket === null) continue;
      if (bucket === ANEMIA_BUCKET_MATCHES[sev]) {
        matched.push(fdef.name);
        anemiaDone = true;
      }
      continue;
    }
    if (fdef.keywords.some((kw) => raw.includes(kw))) {
      matched.push(fdef.name);
    }
  }
  return matched;
}

export function parseRisk(highRiskText) {
  const s = highRiskText === null || highRiskText === undefined ? '' : String(highRiskText).trim();
  if (!s || ['', 'nan', 'NIL', 'Nil', '-'].includes(s)) {
    return { score: 0, factors: [], category: 'Low' };
  }
  const text = s.toLowerCase();
  let score = 0;
  const factors = [];
  for (const [keyword, weight] of Object.entries(HIGH_RISK_WEIGHTS)) {
    if (text.includes(keyword)) {
      score += weight;
      factors.push(keyword.toUpperCase());
    }
  }
  const dedupedFactors = [...new Set(factors)].slice(0, 6);
  const maxPossible = 20;
  const norm = Math.round(Math.min(10, (score / maxPossible) * 10) * 10) / 10;
  let cat;
  if (norm < 2) cat = 'Low';
  else if (norm < 4) cat = 'Moderate';
  else if (norm < 6) cat = 'High';
  else if (norm < 8) cat = 'Very High';
  else cat = 'Critical';
  return { score: norm, factors: dedupedFactors, category: cat };
}
