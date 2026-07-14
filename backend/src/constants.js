// ── DEO Call Performance — MCH Call Center June 2026 ──────────────────────
export const DEO_PERFORMANCE = {
  month: 'June 2026',
  dates: ['15.06.26', '16.06.26', '17.06.26', '18.06.26', '19.06.26', '20.06.26', '22.06.26'],
  deos: [
    { sno: 1, name: 'M. Pavithraa', calls: { '15.06.26': 37, '16.06.26': 11, '17.06.26': 36, '18.06.26': 27, '19.06.26': 37, '20.06.26': 38, '22.06.26': 37 } },
    { sno: 2, name: 'M. Ishwarya', calls: { '15.06.26': 33, '16.06.26': 31, '17.06.26': 30, '18.06.26': 27, '19.06.26': 35, '20.06.26': 30, '22.06.26': 31 } },
    { sno: 3, name: 'Swetha', calls: { '15.06.26': 38, '16.06.26': 30, '17.06.26': 31, '18.06.26': 26, '19.06.26': 35, '20.06.26': 38, '22.06.26': 37 } },
    { sno: 4, name: 'D. Abarna', calls: { '15.06.26': 37, '16.06.26': 32, '17.06.26': 29, '18.06.26': 35, '19.06.26': 35, '20.06.26': 35, '22.06.26': 36 } },
    { sno: 5, name: 'V. Abarna', calls: { '15.06.26': 38, '16.06.26': 30, '17.06.26': 30, '18.06.26': 29, '19.06.26': 35, '20.06.26': 38, '22.06.26': 35 } },
    { sno: 6, name: 'Nivetha', calls: { '15.06.26': 36, '16.06.26': 31, '17.06.26': 31, '18.06.26': 33, '19.06.26': 36, '20.06.26': 37, '22.06.26': 35 } },
    { sno: 7, name: 'Girija', calls: { '15.06.26': 34, '16.06.26': 30, '17.06.26': 15, '18.06.26': 0, '19.06.26': 0, '20.06.26': 32, '22.06.26': 32 } },
    { sno: 8, name: 'K. Pavithra', calls: { '15.06.26': 37, '16.06.26': 31, '17.06.26': 33, '18.06.26': 29, '19.06.26': 36, '20.06.26': 34, '22.06.26': 37 } },
  ],
};

// HRT code → DEO name (for cross-referencing MCH call center records)
export const HRT_TO_DEO = {
  HRT1: 'D. Abarna',
  HRT2: 'Girija',
  HRT3: 'Nivetha',
  HRT4: 'M. Pavithraa',
  HRT5: 'K. Pavithra',
  HRT6: 'M. Ishwarya',
  HRT7: 'Swetha',
  HRT8: 'V. Abarna',
};

const DEO_CALLS_BY_NAME = Object.fromEntries(
  DEO_PERFORMANCE.deos.map((d) => [d.name, d.calls])
);

/** Return DEO connected-calls count for a given HRT on an ISO date, or null. */
export function deoCallsFor(hrtCode, isoDate) {
  const deoName = HRT_TO_DEO[hrtCode];
  if (!deoName) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || '');
  if (!m) return null;
  const deoDate = `${m[3]}.${m[2]}.${m[1].slice(2)}`; // "15.06.26"
  const calls = DEO_CALLS_BY_NAME[deoName];
  return calls ? (calls[deoDate] ?? null) : null;
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const USERS = {
  DMCHO: { password: 'dmcho@2026', role: 'DMCHO', name: 'DMCHO Officer', phcs: [], full_access: true },
  CHO: { password: 'cho@2026', role: 'CHO', name: 'City Health Officer', phcs: [], full_access: true },
  HRT1: { password: 'hrt1@2026', role: 'HRT1', name: 'Abarna D', phcs: ['CTM', 'PATTUNOOL', 'NANJUNDAPURAM', 'NEELIKONAMPALAYAM'], full_access: false },
  HRT2: { password: 'hrt2@2026', role: 'HRT2', name: 'Girija', phcs: ['VVM', 'RATHINAPURI', 'RK BAI', 'TELUNGUPALAYAM', 'SOWRIPALAYAM'], full_access: false },
  HRT3: { password: 'hrt3@2026', role: 'HRT3', name: 'Nivetha', phcs: ['KK PUDUR', 'KURUCHI', 'SN PALAYAM', 'MM HOME', 'MM', 'MM PHC', 'MPHC'], full_access: false },
  HRT4: { password: 'hrt4@2026', role: 'HRT4', name: 'Pavithraa M', phcs: ['UPPILIPALAYAM', 'RAMANATHAPURAM', 'SINGANALLUR', 'PODANUR'], full_access: false },
  HRT5: { password: 'hrt5@2026', role: 'HRT5', name: 'Pavithra', phcs: ['KUNIYAMUTHUR', 'VADAVALLI', 'THONDAMUTHUR', 'JRM', 'KALVEERAMPALAYAM'], full_access: false },
  HRT6: { password: 'hrt6@2026', role: 'HRT6', name: 'Ishwarya', phcs: ['VILANKURICHI'], full_access: false },
  HRT7: { password: 'hrt7@2026', role: 'HRT7', name: 'Swetha', phcs: ['GANAPATHY', 'RAJA STREET', 'THUDIYALUR', '49 GOUNDAMPALAYAM', 'MANIYAKARAMPALAYAM'], full_access: false },
  HRT8: { password: 'hrt8@2026', role: 'HRT8', name: 'Abarna V', phcs: ['GANAPATHY MANAGAR UPHC', 'SELVAPURAM', 'VELLAKINAR', 'PEELAMEDU', 'SLM'], full_access: false },
};

// ── PHC → HRT Mapping ──────────────────────────────────────────────────────
export const PHC_MAP = {
  CTM: { hrt_code: 'HRT1', hrt_name: 'Abarna D', phc_display: 'CTM Home' },
  PATTUNOOL: { hrt_code: 'HRT1', hrt_name: 'Abarna D', phc_display: 'Pattunool' },
  NANJUNDAPURAM: { hrt_code: 'HRT1', hrt_name: 'Abarna D', phc_display: 'Nanjundapuram' },
  NEELIKONAMPALAYAM: { hrt_code: 'HRT1', hrt_name: 'Abarna D', phc_display: 'Neelikonampalayam' },
  VVM: { hrt_code: 'HRT2', hrt_name: 'Girija', phc_display: 'VVM Home' },
  RATHINAPURI: { hrt_code: 'HRT2', hrt_name: 'Girija', phc_display: 'Rathinapuri' },
  'RK BAI': { hrt_code: 'HRT2', hrt_name: 'Girija', phc_display: 'RK Bhai' },
  TELUNGUPALAYAM: { hrt_code: 'HRT2', hrt_name: 'Girija', phc_display: 'Telungupalayam' },
  SOWRIPALAYAM: { hrt_code: 'HRT2', hrt_name: 'Girija', phc_display: 'Sowripalayam' },
  'KK PUDUR': { hrt_code: 'HRT3', hrt_name: 'Nivetha', phc_display: 'KK Pudur' },
  KURUCHI: { hrt_code: 'HRT3', hrt_name: 'Nivetha', phc_display: 'Kuruchi' },
  'SN PALAYAM': { hrt_code: 'HRT3', hrt_name: 'Nivetha', phc_display: 'Seeranaikenpalayam' },
  'MM HOME': { hrt_code: 'HRT3', hrt_name: 'Nivetha', phc_display: 'MM Home' },
  MM: { hrt_code: 'HRT3', hrt_name: 'Nivetha', phc_display: 'MM Home' },
  'MM PHC': { hrt_code: 'HRT3', hrt_name: 'Nivetha', phc_display: 'MM Home' },
  MPHC: { hrt_code: 'HRT3', hrt_name: 'Nivetha', phc_display: 'MM Home' },
  UPPILIPALAYAM: { hrt_code: 'HRT4', hrt_name: 'Pavithraa M', phc_display: 'Uppilipalayam' },
  RAMANATHAPURAM: { hrt_code: 'HRT4', hrt_name: 'Pavithraa M', phc_display: 'Ramanathapuram' },
  SINGANALLUR: { hrt_code: 'HRT4', hrt_name: 'Pavithraa M', phc_display: 'Singanallur' },
  PODANUR: { hrt_code: 'HRT4', hrt_name: 'Pavithraa M', phc_display: 'Podanur' },
  KUNIYAMUTHUR: { hrt_code: 'HRT5', hrt_name: 'Pavithra', phc_display: 'Kuniyamuthur' },
  VADAVALLI: { hrt_code: 'HRT5', hrt_name: 'Pavithra', phc_display: 'Vadavalli' },
  THONDAMUTHUR: { hrt_code: 'HRT5', hrt_name: 'Pavithra', phc_display: 'Thondamuthur' },
  JRM: { hrt_code: 'HRT5', hrt_name: 'Pavithra', phc_display: 'JRM Centre' },
  KALVEERAMPALAYAM: { hrt_code: 'HRT5', hrt_name: 'Pavithra', phc_display: 'Kalveerampalayam' },
  VILANKURICHI: { hrt_code: 'HRT6', hrt_name: 'Ishwarya', phc_display: 'Vilankuruchi' },
  GANAPATHY: { hrt_code: 'HRT7', hrt_name: 'Swetha', phc_display: 'Ganapathy' },
  'RAJA STREET': { hrt_code: 'HRT7', hrt_name: 'Swetha', phc_display: 'Raja Street' },
  THUDIYALUR: { hrt_code: 'HRT7', hrt_name: 'Swetha', phc_display: 'Thudiyalur' },
  '49 GOUNDAMPALAYAM': { hrt_code: 'HRT7', hrt_name: 'Swetha', phc_display: 'Goundampalayam' },
  MANIYAKARAMPALAYAM: { hrt_code: 'HRT7', hrt_name: 'Swetha', phc_display: 'Maniyakaranpalayam' },
  'GANAPATHY MANAGAR UPHC': { hrt_code: 'HRT8', hrt_name: 'Abarna V', phc_display: 'Ganapathy Managar' },
  SELVAPURAM: { hrt_code: 'HRT8', hrt_name: 'Abarna V', phc_display: 'Selvapuram' },
  VELLAKINAR: { hrt_code: 'HRT8', hrt_name: 'Abarna V', phc_display: 'Vellakinar' },
  PEELAMEDU: { hrt_code: 'HRT8', hrt_name: 'Abarna V', phc_display: 'Peelamedu' },
  SLM: { hrt_code: 'HRT8', hrt_name: 'Abarna V', phc_display: 'SLM Home' },
  SHEET45: { hrt_code: 'UNASSIGNED', hrt_name: 'Unassigned', phc_display: 'Other' },
};

// Sheet name → PHC key normalisation
export const SHEET_TO_PHC = {
  CTM: 'CTM',
  PATTUNOOL: 'PATTUNOOL',
  NANJUNDAPURAM: 'NANJUNDAPURAM',
  NEELIKONAMPALAYAM: 'NEELIKONAMPALAYAM',
  'KK PUDUR': 'KK PUDUR',
  'MM HOME': 'MM HOME',
  'SN PALAYAM': 'SN PALAYAM',
  KURUCHI: 'KURUCHI',
  UPPILIPALAYAM: 'UPPILIPALAYAM',
  VILANKURICHI: 'VILANKURICHI',
  SINGANALLUR: 'SINGANALLUR',
  SLM: 'SLM',
  SOWRIPALAYAM: 'SOWRIPALAYAM',
  RATHINAPURI: 'RATHINAPURI',
  PEELAMEDU: 'PEELAMEDU',
  RAMANATHAPURAM: 'RAMANATHAPURAM',
  KALVEERAMPALAYAM: 'KALVEERAMPALAYAM',
  JRM: 'JRM',
  THONDAMUTHUR: 'THONDAMUTHUR',
  VADAVALLI: 'VADAVALLI',
  KUNIYAMUTHUR: 'KUNIYAMUTHUR',
  VVM: 'VVM',
  'RK BAI': 'RK BAI',
  VELLAKINAR: 'VELLAKINAR',
  MANIYAKARAMPALAYAM: 'MANIYAKARAMPALAYAM',
  PODANUR: 'PODANUR',
  THUDIYALUR: 'THUDIYALUR',
  GANAPATHY: 'GANAPATHY',
  '49 GOUNDAMPALAYAM': '49 GOUNDAMPALAYAM',
  'RAJA STREET': 'RAJA STREET',
  TELUNGUPALAYAM: 'TELUNGUPALAYAM',
  SELVAPURAM: 'SELVAPURAM',
  'GANAPATHY MANAGAR UPHC': 'GANAPATHY MANAGAR UPHC',
  MM: 'MM',
  'MM PHC': 'MM PHC',
  MPHC: 'MPHC',
  SHEET45: 'SHEET45',
};
