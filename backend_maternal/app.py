"""
HIGH RISK MOTHER TRACKER – CCMC
Python Flask Backend
Reads live Excel data, applies risk engine, serves REST API
"""

from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import os
import datetime
import re
import hashlib
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app, origins="*")

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST  = os.path.abspath(os.path.join(BASE_DIR, '..', 'dist'))

# Load config.json from project root (one level above backend_maternal/)
_cfg_file = os.path.abspath(os.path.join(BASE_DIR, '..', 'config.json'))
_cfg = {}
if os.path.exists(_cfg_file):
    try:
        with open(_cfg_file) as _f:
            _cfg = json.load(_f)
    except Exception:
        pass

_default_excel = os.path.join(BASE_DIR, '..', '..', '..', 'Downloads',
                              'ccmc maternal',
                              'Coimbatore Corp Zonewise HR Mother Updation  (1).xlsx')
EXCEL_PATH     = os.path.abspath(_cfg.get('excel_path', _default_excel))
PORT           = int(_cfg.get('port', 8001))
HOST           = _cfg.get('host', '0.0.0.0')
CALLS_FILE     = os.path.join(BASE_DIR, 'call_tracking.json')
FOLLOWUP_FILE  = os.path.join(BASE_DIR, 'followup_data.json')

# ── Auth ───────────────────────────────────────────────────────────────────
USERS = {
    "DMCHO": {"password": "dmcho@2024", "role": "DMCHO", "name": "DMCHO Officer",
              "phcs": [], "full_access": True},
    "CHO":   {"password": "cho@2024",   "role": "CHO",   "name": "CHO Officer",
              "phcs": [], "full_access": True},
    "HRT1":  {"password": "hrt1@2024",  "role": "HRT1",  "name": "Abarna D",
              "phcs": ["CTM", "PATTUNOOL", "NANJUNDAPURAM", "NEELIKONAMPALAYAM"], "full_access": False},
    "HRT2":  {"password": "hrt2@2024",  "role": "HRT2",  "name": "Girija",
              "phcs": ["VVM", "RATHINAPURI", "RK BAI", "TELUNGUPALAYAM", "SOWRIPALAYAM"], "full_access": False},
    "HRT3":  {"password": "hrt3@2024",  "role": "HRT3",  "name": "Nivetha",
              "phcs": ["KK PUDUR", "KURUCHI", "SN PALAYAM", "MM HOME"], "full_access": False},
    "HRT4":  {"password": "hrt4@2024",  "role": "HRT4",  "name": "Pavithraa M",
              "phcs": ["UPPILIPALAYAM", "RAMANATHAPURAM", "SINGANALLUR", "PODANUR"], "full_access": False},
    "HRT5":  {"password": "hrt5@2024",  "role": "HRT5",  "name": "Pavithra",
              "phcs": ["KUNIYAMUTHUR", "VADAVALLI", "THONDAMUTHUR", "KALVEERAMPALAYAM", "JRM"], "full_access": False},
    "HRT6":  {"password": "hrt6@2024",  "role": "HRT6",  "name": "Ishwarya",
              "phcs": ["VILANKURICHI"], "full_access": False},
    "HRT7":  {"password": "hrt7@2024",  "role": "HRT7",  "name": "Swetha",
              "phcs": ["GANAPATHY", "RAJA STREET", "THUDIYALUR", "49 GOUNDAMPALAYAM", "MANIYAKARAMPALAYAM"], "full_access": False},
    "HRT8":  {"password": "hrt8@2024",  "role": "HRT8",  "name": "Abarna V",
              "phcs": ["GANAPATHY MANAGAR UPHC", "SELVAPURAM", "VELLAKINAR", "PEELAMEDU", "SLM"], "full_access": False},
}

# ── PHC → HRT Mapping ──────────────────────────────────────────────────────
PHC_MAP = {
    "CTM":                    {"hrt_code": "HRT1", "hrt_name": "Abarna D",    "phc_display": "CTM Home"},
    "PATTUNOOL":              {"hrt_code": "HRT1", "hrt_name": "Abarna D",    "phc_display": "Pattunool"},
    "NANJUNDAPURAM":          {"hrt_code": "HRT1", "hrt_name": "Abarna D",    "phc_display": "Nanjundapuram"},
    "NEELIKONAMPALAYAM":      {"hrt_code": "HRT1", "hrt_name": "Abarna D",    "phc_display": "Neelikonampalayam"},
    "VVM":                    {"hrt_code": "HRT2", "hrt_name": "Girija",      "phc_display": "VVM Home"},
    "RATHINAPURI":            {"hrt_code": "HRT2", "hrt_name": "Girija",      "phc_display": "Rathinapuri"},
    "RK BAI":                 {"hrt_code": "HRT2", "hrt_name": "Girija",      "phc_display": "RK Bhai"},
    "TELUNGUPALAYAM":         {"hrt_code": "HRT2", "hrt_name": "Girija",      "phc_display": "Telungupalayam"},
    "SOWRIPALAYAM":           {"hrt_code": "HRT2", "hrt_name": "Girija",      "phc_display": "Sowripalayam"},
    "KK PUDUR":               {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "KK Pudur"},
    "KURUCHI":                {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "Kuruchi"},
    "SN PALAYAM":             {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "Seeranaikenpalayam"},
    "MM HOME":                {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "NM Home"},
    "UPPILIPALAYAM":          {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Uppilipalayam"},
    "RAMANATHAPURAM":         {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Ramanathapuram"},
    "SINGANALLUR":            {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Singanallur"},
    "PODANUR":                {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Podanur"},
    "KUNIYAMUTHUR":           {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Kuniyamuthur"},
    "VADAVALLI":              {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Vadavalli"},
    "THONDAMUTHUR":           {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Thondamuthur"},
    "KALVEERAMPALAYAM":       {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Kalveerampalayam"},
    "JRM":                    {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "JRM Center"},
    "VILANKURICHI":           {"hrt_code": "HRT6", "hrt_name": "Ishwarya",    "phc_display": "Vilankurichi"},
    "GANAPATHY":              {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Ganapathy"},
    "RAJA STREET":            {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Raja Street"},
    "THUDIYALUR":             {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Thudiyalur"},
    "49 GOUNDAMPALAYAM":      {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Goundampalayam"},
    "MANIYAKARAMPALAYAM":     {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Maniyakarampalayam"},
    "GANAPATHY MANAGAR UPHC": {"hrt_code": "HRT8", "hrt_name": "Abarna V",   "phc_display": "Ganapathy Managar"},
    "SELVAPURAM":             {"hrt_code": "HRT8", "hrt_name": "Abarna V",   "phc_display": "Selvapuram"},
    "VELLAKINAR":             {"hrt_code": "HRT8", "hrt_name": "Abarna V",   "phc_display": "Vellakinar"},
    "PEELAMEDU":              {"hrt_code": "HRT8", "hrt_name": "Abarna V",   "phc_display": "Peelamedu"},
    "SLM":                    {"hrt_code": "HRT8", "hrt_name": "Abarna V",   "phc_display": "SLM Home"},
    "SHEET45":                {"hrt_code": "UNASSIGNED", "hrt_name": "Unassigned", "phc_display": "Other"},
}

# Sheet name → PHC key normalisation
SHEET_TO_PHC = {
    "CTM":                    "CTM",
    "PATTUNOOL":              "PATTUNOOL",
    "NANJUNDAPURAM":          "NANJUNDAPURAM",
    "NEELIKONAMPALAYAM":      "NEELIKONAMPALAYAM",
    "KK PUDUR":               "KK PUDUR",
    "MM HOME":                "MM HOME",
    "SN PALAYAM":             "SN PALAYAM",
    "KURUCHI":                "KURUCHI",
    "UPPILIPALAYAM":          "UPPILIPALAYAM",
    "VILANKURICHI":           "VILANKURICHI",
    "SINGANALLUR":            "SINGANALLUR",
    "SLM":                    "SLM",
    "SOWRIPALAYAM":           "SOWRIPALAYAM",
    "RATHINAPURI":            "RATHINAPURI",
    "PEELAMEDU":              "PEELAMEDU",
    "RAMANATHAPURAM":         "RAMANATHAPURAM",
    "KALVEERAMPALAYAM":       "KALVEERAMPALAYAM",
    "JRM":                    "JRM",
    "THONDAMUTHUR":           "THONDAMUTHUR",
    "VADAVALLI":              "VADAVALLI",
    "KUNIYAMUTHUR":           "KUNIYAMUTHUR",
    "VVM":                    "VVM",
    "RK BAI":                 "RK BAI",
    "VELLAKINAR":             "VELLAKINAR",
    "MANIYAKARAMPALAYAM":     "MANIYAKARAMPALAYAM",
    "PODANUR":                "PODANUR",
    "THUDIYALUR":             "THUDIYALUR",
    "GANAPATHY":              "GANAPATHY",
    "49 GOUNDAMPALAYAM":      "49 GOUNDAMPALAYAM",
    "RAJA STREET":            "RAJA STREET",
    "TELUNGUPALAYAM":         "TELUNGUPALAYAM",
    "SELVAPURAM":             "SELVAPURAM",
    "GANAPATHY MANAGAR UPHC": "GANAPATHY MANAGAR UPHC",
    "SHEET45":                "SHEET45",
}

# ── In-memory cache ────────────────────────────────────────────────────────
_cache = {"df": None, "ts": None}

def _load_json(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except Exception:
                return {}
    return {}

def _save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, default=str, indent=2)

# ── Risk Engine ────────────────────────────────────────────────────────────
HIGH_RISK_WEIGHTS = {
    "pih": 4, "pre-eclampsia": 4, "eclampsia": 5, "hypertension": 4,
    "gdm": 3, "gestational diabetes": 3, "diabetes": 3, "gct": 2,
    "severe anemia": 4, "anemia": 2, "hb": 2,
    "heart disease": 5, "cardiac": 5,
    "prev.lscs": 2, "previous lscs": 2, "lscs": 2, "c-section": 2,
    "short primi": 2, "height less than 145": 2,
    "elderly primi": 2, ">35": 2, "age >35": 2,
    "rh isoimmunization": 3, "rh negative": 3,
    "hypothyroidism": 2, "thyroid": 2, "tsh": 1,
    "weight below 40": 2, "weight above 90": 2, "weight above 70": 1,
    "multiple pregnancy": 3, "twin": 3, "triplet": 4,
    "bad obstetric history": 3, "boh": 3,
    "antepartum hemorrhage": 4, "aph": 4, "placenta previa": 4,
    "iufd": 4, "iud": 3, "stillbirth": 3,
    "preterm": 2, "premature": 2,
    "oligohydramnios": 2, "polyhydramnios": 2,
    "deep vein thrombosis": 3, "dvt": 3,
    "mal-presentation": 2, "malpresentation": 2, "breech": 2,
    "fgr": 2, "iugr": 2, "growth restriction": 2,
    "epilepsy": 2, "seizure": 2,
    "renal disease": 3, "kidney": 2,
    "liver disease": 3, "jaundice": 2,
    "sickle cell": 3, "thalassemia": 3,
    "hiv": 4, "hepatitis": 3, "syphilis": 3, "vdrl": 2,
    "referred": 2, "refer": 1,
    "emergency": 4, "critical": 5,
}

def _parse_risk(high_risk_text):
    if not high_risk_text or str(high_risk_text).strip() in ("", "nan", "NIL", "Nil", "-"):
        return 0, [], "Low"
    text = str(high_risk_text).lower()
    score = 0
    factors = []
    for keyword, weight in HIGH_RISK_WEIGHTS.items():
        if keyword in text:
            score += weight
            factors.append(keyword.upper())
    # Remove duplicates, keep highest-weight matches
    factors = list(dict.fromkeys(factors))[:6]
    # Normalise to 0-10
    max_possible = 20
    norm = round(min(10, (score / max_possible) * 10), 1)
    if norm < 2:   cat = "Low"
    elif norm < 4: cat = "Moderate"
    elif norm < 6: cat = "High"
    elif norm < 8: cat = "Very High"
    else:          cat = "Critical"
    return norm, factors, cat

def _parse_date(val):
    if not val or str(val).strip() in ("", "nan", "NaT"):
        return None
    s = str(val).strip()
    for fmt in ("%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y",
                "%d-%m-%y", "%d.%m.%y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.datetime.strptime(s[:10], fmt[:len(fmt)]).date()
        except Exception:
            pass
    # Try pandas
    try:
        parsed = pd.to_datetime(val, dayfirst=True, errors="coerce")
        if pd.isna(parsed):
            return None
        return parsed.date()
    except Exception:
        return None

def _days_to_edd(edd_val):
    d = _parse_date(edd_val)
    if d is None or str(d) in ('NaT', 'None'):
        return None
    try:
        return (d - datetime.date.today()).days
    except Exception:
        return None

def _normalise_col(df, candidates, default=""):
    for c in candidates:
        if c in df.columns:
            return df[c].fillna("").astype(str).str.strip()
    return pd.Series([default] * len(df), index=df.index)

# ── Excel Reader ───────────────────────────────────────────────────────────
def load_excel():
    global _cache
    if not os.path.exists(EXCEL_PATH):
        return pd.DataFrame()
    xl  = pd.ExcelFile(EXCEL_PATH)
    frames = []
    for sheet in xl.sheet_names:
        sheet_key = sheet.upper().strip()
        if sheet_key.startswith("SHEET") and sheet_key not in SHEET_TO_PHC:
            continue
        phc_key = SHEET_TO_PHC.get(sheet_key, sheet_key)
        hrt_info = PHC_MAP.get(phc_key, {"hrt_code": "UNASSIGNED", "hrt_name": "Unassigned", "phc_display": sheet})
        try:
            raw = pd.read_excel(EXCEL_PATH, sheet_name=sheet, dtype=str)
        except Exception:
            continue
        raw = raw.dropna(how="all")
        raw = raw.fillna("")
        if len(raw) == 0:
            continue
        # Strip all values
        for col in raw.columns:
            raw[col] = raw[col].astype(str).str.strip()

        # Build normalised record
        row_no       = _normalise_col(raw, ["-", "S.NO", "S NO", "SNO", "SL NO"])
        uphc_name    = _normalise_col(raw, ["UPHC NAME", "UPHC"])
        hsc_name     = _normalise_col(raw, ["HSC NAME", "HSC"])
        res_type     = _normalise_col(raw, ["RESIDENT/VISITOR", "RESIDENT"])
        rch_id       = _normalise_col(raw, ["RCH ID"])
        mother_name  = _normalise_col(raw, ["MOTHER NAME AND ADDRESS", "NAME AND ADD",
                                            "NAME AND ADDRESS", "NAME"])
        cell_no      = _normalise_col(raw, ["CELL NO", "MOBILE", "PHONE"])
        husband      = _normalise_col(raw, ["HUSBAND NAME ", "HUSBAND NAME", "HUSBAND"])
        gravida      = _normalise_col(raw, ["GRAVIDA"])
        lmp          = _normalise_col(raw, ["LMP"])
        edd          = _normalise_col(raw, ["EDD"])
        weeks        = _normalise_col(raw, ["WEEKS"])
        high_risk    = _normalise_col(raw, ["HIGH RISK ", "HIGH RISK", "HIGH RISK FACTORS"])
        height       = _normalise_col(raw, ["HEIGHT"])
        weight       = _normalise_col(raw, ["WT", "WEIGHT"])
        bp           = _normalise_col(raw, ["BP", "BLOOD PRESSURE"])
        hb           = _normalise_col(raw, ["HB", "HAEMOGLOBIN", "HEMOGLOBIN"])
        gct          = _normalise_col(raw, ["GCT"])
        ppbs         = _normalise_col(raw, ["PPBS"])
        echo         = _normalise_col(raw, ["ECHO/ECG", "ECHO"])
        usg          = _normalise_col(raw, ["USG"])
        tsh          = _normalise_col(raw, ["TSH"])
        blood_grp    = _normalise_col(raw, ["BLOOD GROUP"])
        sputum       = _normalise_col(raw, ["SPUTUM AFB", "SPUTUM"])
        urine        = _normalise_col(raw, ["URINE ROUTINE", "URINE"])
        birth_plan   = _normalise_col(raw, ["BIRTH PLAN", "REGULAR FOLLOW UP"])
        referral     = _normalise_col(raw, ["REFERRAL DETAILS"])
        last_visit   = _normalise_col(raw, ["UPHC LAST VISIT DATE", "LAST VISIT DATE"])
        action_taken = _normalise_col(raw, ["UPHC ACTION TAKEN \n(1st follow up)",
                                            "UPHC ACTION TAKEN", "ACTION TAKEN"])
        call_date    = _normalise_col(raw, ["CALL DATE"])
        next_visit   = _normalise_col(raw, ["NEXT VISIT DATE \nONLY FILL BY UPHC",
                                            "NEXT VISIT DATE", "NEXT VISIT"])
        uphc_response= _normalise_col(raw, ["UPHC RESPONSE AS PER NEXT VISIT", "UPHC RESPONSE"])
        next_plan    = _normalise_col(raw, ["NEXT PLAN OF VISIT PLACE AND TIME "])

        for i in range(len(raw)):
            hr_text  = high_risk.iloc[i]
            score, factors, category = _parse_risk(hr_text)
            name_raw = mother_name.iloc[i]
            # Skip header-repeat rows
            if name_raw.upper() in ("NAME AND ADD", "MOTHER NAME AND ADDRESS",
                                    "NAME AND ADDRESS", "NAME", ""):
                continue
            # Extract name vs address (often combined with comma or newline)
            name_parts = re.split(r",|W/O|w/o|\n", name_raw, maxsplit=1)
            clean_name = name_parts[0].strip() if name_parts else name_raw
            address    = name_raw[len(clean_name):].strip().lstrip(",").strip()

            edd_val = edd.iloc[i]
            # EDD sometimes has extra text like "22-03-26 / Scan Edd 22.04.26"
            edd_clean = re.split(r"/|Scan|scan", edd_val)[0].strip()
            days_left = _days_to_edd(edd_clean)

            # Determine delivery status
            delivery_info = next_plan.iloc[i] if next_plan.iloc[i] else uphc_response.iloc[i]
            is_delivered  = any(kw in str(delivery_info).upper()
                                for kw in ["DELIVERED", "DOD", "LSCS", "NVD", "FCH", "MCH"])

            rch = rch_id.iloc[i]
            uid = f"{phc_key}_{i}_{rch}" if rch else f"{phc_key}_{i}"

            frames.append({
                "uid":          uid,
                "row_no":       row_no.iloc[i],
                "phc_key":      phc_key,
                "phc_display":  hrt_info["phc_display"],
                "hrt_code":     hrt_info["hrt_code"],
                "hrt_name":     hrt_info["hrt_name"],
                "uphc_name":    uphc_name.iloc[i] or hrt_info["phc_display"],
                "hsc_name":     hsc_name.iloc[i],
                "resident_type":res_type.iloc[i],
                "rch_id":       rch,
                "mother_name":  clean_name,
                "address":      address,
                "cell_no":      cell_no.iloc[i],
                "husband_name": husband.iloc[i],
                "gravida":      gravida.iloc[i],
                "lmp":          lmp.iloc[i],
                "edd":          edd_clean,
                "days_to_edd":  days_left,
                "weeks":        weeks.iloc[i],
                "high_risk_raw":hr_text,
                "risk_score":   score,
                "risk_factors": factors,
                "risk_category":category,
                "height":       height.iloc[i],
                "weight":       weight.iloc[i],
                "bp":           bp.iloc[i],
                "hb":           hb.iloc[i],
                "gct":          gct.iloc[i],
                "ppbs":         ppbs.iloc[i],
                "echo_ecg":     echo.iloc[i],
                "usg":          usg.iloc[i],
                "tsh":          tsh.iloc[i],
                "blood_group":  blood_grp.iloc[i],
                "sputum_afb":   sputum.iloc[i],
                "urine_routine":urine.iloc[i],
                "birth_plan":   birth_plan.iloc[i],
                "referral":     referral.iloc[i],
                "last_visit_date": last_visit.iloc[i],
                "action_taken": action_taken.iloc[i],
                "call_date":    call_date.iloc[i],
                "next_visit_date": next_visit.iloc[i],
                "uphc_response":uphc_response.iloc[i],
                "delivery_info":delivery_info,
                "is_delivered": is_delivered,
            })

    df = pd.DataFrame(frames)
    _cache["df"] = df
    _cache["ts"] = datetime.datetime.now().isoformat()
    return df

def get_data():
    if _cache["df"] is None:
        load_excel()
    return _cache["df"]

# ── Validation Engine ──────────────────────────────────────────────────────
def run_validation(df):
    issues = []
    missing_name  = df[df["mother_name"].str.strip() == ""]
    missing_phone = df[df["cell_no"].str.strip() == ""]
    missing_rch   = df[df["rch_id"].str.strip() == ""]
    missing_edd   = df[df["edd"].str.strip() == ""]
    missing_risk  = df[df["high_risk_raw"].str.strip().isin(["", "nan"])]

    invalid_phone = df[
        df["cell_no"].str.strip().ne("") &
        ~df["cell_no"].str.match(r"^\d{10}$")
    ]
    dup_phone = df[df["cell_no"].str.strip().ne("") &
                   df["cell_no"].duplicated(keep=False)]
    dup_rch   = df[df["rch_id"].str.strip().ne("") &
                   df["rch_id"].duplicated(keep=False)]

    total = len(df)
    valid = total - len(missing_name) - len(missing_phone) - len(invalid_phone)
    quality_score = round(max(0, (valid / total) * 100), 1) if total > 0 else 0

    def to_list(sub_df):
        return sub_df[["uid","mother_name","phc_display","hrt_name",
                        "cell_no","rch_id"]].head(200).to_dict(orient="records")

    return {
        "total_records":        total,
        "missing_name":         len(missing_name),
        "missing_phone":        len(missing_phone),
        "missing_rch":          len(missing_rch),
        "missing_edd":          len(missing_edd),
        "missing_risk_entry":   len(missing_risk),
        "invalid_phone":        len(invalid_phone),
        "duplicate_phone":      len(dup_phone),
        "duplicate_rch":        len(dup_rch),
        "quality_score":        quality_score,
        "missing_name_records": to_list(missing_name),
        "missing_phone_records":to_list(missing_phone),
        "invalid_phone_records":to_list(invalid_phone),
        "duplicate_phone_records":to_list(dup_phone),
        "duplicate_rch_records":to_list(dup_rch),
    }

# ── Helper ─────────────────────────────────────────────────────────────────
def filter_by_role(df, role):
    user = USERS.get(role, {})
    if user.get("full_access"):
        return df
    allowed_phcs = [p.upper() for p in user.get("phcs", [])]
    return df[df["phc_key"].isin(allowed_phcs)]

def safe_json(obj):
    if isinstance(obj, (pd.Timestamp, datetime.date, datetime.datetime)):
        return str(obj)
    if isinstance(obj, float) and np.isnan(obj):
        return None
    return obj

def df_to_list(df):
    return [{k: safe_json(v) for k, v in row.items()}
            for row in df.to_dict(orient="records")]

# ── Routes ─────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ONLINE", "excel": os.path.exists(EXCEL_PATH),
                    "records": len(get_data()), "ts": _cache["ts"]})

@app.route("/api/login", methods=["POST"])
def login():
    body = request.get_json() or {}
    username = body.get("username", "").strip().upper()
    password = body.get("password", "").strip()
    user = USERS.get(username)
    if user and user["password"] == password:
        return jsonify({
            "success": True,
            "role":    user["role"],
            "name":    user["name"],
            "phcs":    user["phcs"],
            "full_access": user["full_access"],
            "username": username,
        })
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/api/refresh", methods=["POST"])
def refresh():
    _cache["df"] = None
    load_excel()
    return jsonify({"success": True, "records": len(_cache["df"]), "ts": _cache["ts"]})

@app.route("/api/patients")
def patients():
    role    = request.args.get("role", "DMCHO")
    phc     = request.args.get("phc", "")
    hrt     = request.args.get("hrt", "")
    search  = request.args.get("search", "").strip().lower()
    risk_cat= request.args.get("risk_category", "")
    page    = int(request.args.get("page", 1))
    per_page= int(request.args.get("per_page", 50))

    df = filter_by_role(get_data(), role)
    if phc:
        df = df[df["phc_key"] == phc.upper()]
    if hrt:
        df = df[df["hrt_code"] == hrt.upper()]
    if risk_cat:
        df = df[df["risk_category"] == risk_cat]
    if search:
        mask = (df["mother_name"].str.lower().str.contains(search, na=False) |
                df["cell_no"].str.contains(search, na=False) |
                df["rch_id"].str.lower().str.contains(search, na=False) |
                df["phc_display"].str.lower().str.contains(search, na=False))
        df = df[mask]

    total = len(df)
    df_page = df.iloc[(page-1)*per_page : page*per_page]
    return jsonify({
        "total": total,
        "page": page,
        "per_page": per_page,
        "patients": df_to_list(df_page),
    })

@app.route("/api/patients/<uid>")
def patient_detail(uid):
    df    = get_data()
    row   = df[df["uid"] == uid]
    if row.empty:
        return jsonify({"error": "Not found"}), 404
    data  = row.iloc[0].to_dict()
    data  = {k: safe_json(v) for k, v in data.items()}

    # Attach call & follow-up history
    calls   = _load_json(CALLS_FILE)
    followups = _load_json(FOLLOWUP_FILE)
    data["call_history"]    = calls.get(uid, [])
    data["followup_history"]= followups.get(uid, [])
    return jsonify(data)

@app.route("/api/stats")
def stats():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    today = datetime.date.today()
    today_str = today.strftime("%Y-%m-%d")

    total      = len(df)
    delivered  = df["is_delivered"].sum()
    active     = total - delivered

    risk_counts = df["risk_category"].value_counts().to_dict()
    critical   = risk_counts.get("Critical", 0)
    very_high  = risk_counts.get("Very High", 0)
    high_count = risk_counts.get("High", 0)

    due_7     = int(df["days_to_edd"].between(0, 7).sum())
    due_30    = int(df["days_to_edd"].between(0, 30).sum())
    due_today = int((df["days_to_edd"] == 0).sum())
    overdue   = int((df["days_to_edd"] < 0).sum())

    missing_phone = int((df["cell_no"].str.strip() == "").sum())
    missing_name  = int((df["mother_name"].str.strip() == "").sum())
    invalid_phone_cnt = int(df[
        df["cell_no"].str.strip().ne("") &
        ~df["cell_no"].str.match(r"^\d{10}$")
    ].shape[0])
    validation_issues = missing_phone + missing_name + invalid_phone_cnt

    calls     = _load_json(CALLS_FILE)
    followups = _load_json(FOLLOWUP_FILE)

    role_uids = set(df["uid"].tolist())
    followups_due_today = sum(
        1 for uid, hist in followups.items()
        if uid in role_uids
        for entry in hist
        if entry.get("next_visit_date") == today_str
    )
    calls_pending_today = sum(
        1 for uid, hist in calls.items()
        if uid in role_uids
        for entry in hist
        if entry.get("next_followup_date") == today_str
    )

    # PHC distribution
    phc_dist = df.groupby("phc_display").size().sort_values(ascending=False).to_dict()
    # HRT distribution
    hrt_dist = df.groupby("hrt_name").size().sort_values(ascending=False).to_dict()
    # Risk dist
    risk_dist = {
        "Low":      risk_counts.get("Low", 0),
        "Moderate": risk_counts.get("Moderate", 0),
        "High":     high_count,
        "Very High":very_high,
        "Critical": critical,
    }

    return jsonify({
        "total_mothers":       int(total),
        "active_mothers":      int(active),
        "delivered":           int(delivered),
        "high_risk":           int(high_count + very_high + critical),
        "critical":            int(critical),
        "very_high":           int(very_high),
        "due_7_days":          due_7,
        "due_30_days":         due_30,
        "due_today":           due_today,
        "overdue_edd":         overdue,
        "missing_phone":       missing_phone,
        "missing_name":        missing_name,
        "validation_issues":   validation_issues,
        "followups_due_today": followups_due_today,
        "calls_pending_today": calls_pending_today,
        "phc_distribution":    phc_dist,
        "hrt_distribution":    hrt_dist,
        "risk_distribution":   risk_dist,
    })

@app.route("/api/validation")
def validation():
    df = get_data()
    return jsonify(run_validation(df))

@app.route("/api/alerts")
def alerts():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    today= datetime.date.today()

    # Critical risk
    critical  = df[df["risk_category"] == "Critical"]
    very_high = df[df["risk_category"] == "Very High"]
    # EDD within 7 days
    due_soon  = df[df["days_to_edd"].between(0, 7)]
    # Overdue EDD
    overdue   = df[df["days_to_edd"] < 0]
    # Missing phone
    no_phone  = df[df["cell_no"].str.strip() == ""]

    def alert_list(sub_df, alert_type, priority):
        return [{
            "uid":          r["uid"],
            "mother_name":  r["mother_name"],
            "phc_display":  r["phc_display"],
            "hrt_name":     r["hrt_name"],
            "cell_no":      r["cell_no"],
            "alert_type":   alert_type,
            "priority":     priority,
            "days_to_edd":  r["days_to_edd"],
            "risk_category":r["risk_category"],
            "risk_score":   r["risk_score"],
        } for _, r in sub_df.iterrows()]

    all_alerts = (
        alert_list(critical,  "Critical Risk Mother",   "P1") +
        alert_list(due_soon,  "Delivery Due ≤7 Days",   "P1") +
        alert_list(overdue,   "Overdue EDD",            "P2") +
        alert_list(very_high, "Very High Risk",         "P2") +
        alert_list(no_phone,  "No Contact Number",      "P3")
    )[:500]

    return jsonify({
        "total":    len(all_alerts),
        "critical": len(critical),
        "due_soon": len(due_soon),
        "overdue":  len(overdue),
        "alerts":   all_alerts,
    })

@app.route("/api/deliveries")
def deliveries():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)

    cols = ["uid","mother_name","phc_display","hrt_name","hrt_code","cell_no",
            "edd","days_to_edd","risk_category","birth_plan",
            "referral","delivery_info","is_delivered","weeks","rch_id"]

    def to_records(sub_df):
        available = [c for c in cols if c in sub_df.columns]
        return df_to_list(sub_df[available].head(200))

    def phc_summary(sub_df):
        if len(sub_df) == 0:
            return []
        res = []
        for phc, grp in sub_df.groupby("phc_display"):
            res.append({
                "phc":      phc,
                "hrt":      grp["hrt_code"].iloc[0] if "hrt_code" in grp.columns else "",
                "count":    int(len(grp)),
                "critical": int((grp["risk_category"] == "Critical").sum()),
                "high":     int(grp["risk_category"].isin(["High","Very High","Critical"]).sum()),
            })
        res.sort(key=lambda x: x["count"], reverse=True)
        return res

    # ── AN Mothers (not yet delivered, EDD known) ───────────────
    an = df[(df["is_delivered"] == False) & df["days_to_edd"].notna()]
    an_today  = an[an["days_to_edd"] == 0]
    an_1_3    = an[an["days_to_edd"].between(1, 3)]
    an_4_7    = an[an["days_to_edd"].between(4, 7)]
    an_8_14   = an[an["days_to_edd"].between(8, 14)]
    an_15_30  = an[an["days_to_edd"].between(15, 30)]
    an_30plus = an[an["days_to_edd"] > 30]

    # ── PN Mothers (delivered; days_to_edd < 0 = past EDD) ─────
    pn = df[df["is_delivered"] == True]
    pn_0_7   = pn[pn["days_to_edd"].between(-7, 0)]
    pn_8_14  = pn[pn["days_to_edd"].between(-14, -8)]
    pn_15_42 = pn[pn["days_to_edd"] <= -15]

    an_upcoming = an[an["days_to_edd"].between(0, 30)]

    return jsonify({
        "an_today":   to_records(an_today),
        "an_1_3":     to_records(an_1_3),
        "an_4_7":     to_records(an_4_7),
        "an_8_14":    to_records(an_8_14),
        "an_15_30":   to_records(an_15_30),
        "an_30plus":  to_records(an_30plus),
        "pn_0_7":     to_records(pn_0_7),
        "pn_8_14":    to_records(pn_8_14),
        "pn_15_42":   to_records(pn_15_42),
        "counts": {
            "an_today":   int(len(an_today)),
            "an_1_3":     int(len(an_1_3)),
            "an_4_7":     int(len(an_4_7)),
            "an_8_14":    int(len(an_8_14)),
            "an_15_30":   int(len(an_15_30)),
            "an_30plus":  int(len(an_30plus)),
            "pn_0_7":     int(len(pn_0_7)),
            "pn_8_14":    int(len(pn_8_14)),
            "pn_15_42":   int(len(pn_15_42)),
        },
        "an_phc_summary": phc_summary(an_upcoming),
        "pn_phc_summary": phc_summary(pn),
    })

@app.route("/api/phc-analytics")
def phc_analytics():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)

    result = []
    for phc_key, group in df.groupby("phc_key"):
        hrt_info = PHC_MAP.get(phc_key, {})
        total   = len(group)
        critical= (group["risk_category"] == "Critical").sum()
        very_h  = (group["risk_category"] == "Very High").sum()
        high    = (group["risk_category"] == "High").sum()
        low     = (group["risk_category"] == "Low").sum()
        mod     = (group["risk_category"] == "Moderate").sum()
        delivered = group["is_delivered"].sum()
        due_soon  = (group["days_to_edd"].between(0, 7)).sum()
        no_phone  = (group["cell_no"].str.strip() == "").sum()
        result.append({
            "phc_key":      phc_key,
            "phc_display":  hrt_info.get("phc_display", phc_key),
            "hrt_code":     hrt_info.get("hrt_code", ""),
            "hrt_name":     hrt_info.get("hrt_name", ""),
            "total":        int(total),
            "critical":     int(critical),
            "very_high":    int(very_h),
            "high":         int(high),
            "moderate":     int(mod),
            "low":          int(low),
            "delivered":    int(delivered),
            "due_soon":     int(due_soon),
            "no_phone":     int(no_phone),
            "risk_pct":     round((critical+very_h+high)/total*100, 1) if total else 0,
        })
    result.sort(key=lambda x: x["total"], reverse=True)
    return jsonify(result)

# ── Executive Analytics ────────────────────────────────────────────────────
@app.route("/api/executive-analytics")
def executive_analytics():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    today = datetime.date.today()

    # ── High Risk + Critical by PHC ────────────────────────────
    phc_data = []
    for phc, grp in df.groupby("phc_display"):
        total = len(grp)
        hr    = int(grp["risk_category"].isin(["High","Very High","Critical"]).sum())
        crit  = int((grp["risk_category"] == "Critical").sum())
        vh    = int((grp["risk_category"] == "Very High").sum())
        hrt   = grp["hrt_code"].iloc[0] if len(grp) > 0 else ""
        hrt_n = grp["hrt_name"].iloc[0] if len(grp) > 0 else ""
        phc_data.append({"phc": phc, "hrt": hrt, "hrt_name": hrt_n,
                         "total": total, "high_risk": hr, "critical": crit, "very_high": vh})
    phc_data.sort(key=lambda x: x["high_risk"], reverse=True)

    # ── Risk + Critical by HRT ─────────────────────────────────
    hrt_data = []
    for hrt, grp in df.groupby("hrt_code"):
        total = len(grp)
        hr    = int(grp["risk_category"].isin(["High","Very High","Critical"]).sum())
        crit  = int((grp["risk_category"] == "Critical").sum())
        vh    = int((grp["risk_category"] == "Very High").sum())
        hrt_n = grp["hrt_name"].iloc[0] if len(grp) > 0 else ""
        phcs  = grp["phc_display"].unique().tolist()
        rk    = grp["risk_category"].value_counts().to_dict()
        hrt_data.append({"hrt": hrt, "hrt_name": hrt_n, "total": total,
                         "high_risk": hr, "critical": crit, "very_high": vh,
                         "phcs": phcs, "risk_dist": rk})
    hrt_data.sort(key=lambda x: x["hrt"])

    # ── Monthly delivery timeline (EDD-based, 8-month window) ──
    monthly_edd = {}
    monthly_hr  = {}
    hr_active   = df[df["risk_category"].isin(["High","Very High","Critical"]) & (df["is_delivered"] == False)]
    for _, row in df.iterrows():
        d = _parse_date(row.get("edd",""))
        if d:
            k = d.strftime("%Y-%m")
            monthly_edd[k] = monthly_edd.get(k, 0) + 1
    for _, row in hr_active.iterrows():
        d = _parse_date(row.get("edd",""))
        if d:
            k = d.strftime("%Y-%m")
            monthly_hr[k] = monthly_hr.get(k, 0) + 1

    months = []
    for i in range(-2, 7):
        m = (today.replace(day=1) + datetime.timedelta(days=32*i)).replace(day=1)
        months.append(m.strftime("%Y-%m"))
    monthly_trend = [{"month": m, "deliveries": monthly_edd.get(m, 0),
                      "high_risk": monthly_hr.get(m, 0)} for m in months]

    # ── Upcoming deliveries by PHC (due in 30 days) ────────────
    upcoming = df[(df["is_delivered"] == False) & df["days_to_edd"].between(0, 30)]
    upcoming_phc = []
    for phc, grp in upcoming.groupby("phc_display"):
        upcoming_phc.append({
            "phc":      phc,
            "count":    int(len(grp)),
            "critical": int((grp["risk_category"] == "Critical").sum()),
            "due_7":    int(grp["days_to_edd"].between(0, 7).sum()),
            "hrt":      grp["hrt_code"].iloc[0] if len(grp) > 0 else "",
        })
    upcoming_phc.sort(key=lambda x: x["count"], reverse=True)

    risk_dist = df["risk_category"].value_counts().to_dict()

    return jsonify({
        "phc_data":          phc_data[:20],
        "hrt_data":          hrt_data,
        "monthly_trend":     monthly_trend,
        "upcoming_phc":      upcoming_phc[:15],
        "risk_dist":         risk_dist,
        "total":             int(len(df)),
        "total_high_risk":   int(df["risk_category"].isin(["High","Very High","Critical"]).sum()),
        "total_critical":    int((df["risk_category"] == "Critical").sum()),
        "total_very_high":   int((df["risk_category"] == "Very High").sum()),
        "total_phcs":        int(df["phc_display"].nunique()),
        "total_hrts":        int(df["hrt_code"].nunique()),
    })

# ── Call Tracking ──────────────────────────────────────────────────────────
@app.route("/api/calls", methods=["GET"])
def get_calls():
    role    = request.args.get("role", "DMCHO")
    hrt     = request.args.get("hrt", "")
    status  = request.args.get("status", "")
    phc     = request.args.get("phc", "")
    date_filter = request.args.get("date", "")

    df      = filter_by_role(get_data(), role)
    calls   = _load_json(CALLS_FILE)

    # Merge call data with patient data
    records = []
    for _, row in df.iterrows():
        uid = row["uid"]
        hist = calls.get(uid, [])
        latest = hist[-1] if hist else {}
        records.append({
            "uid":          uid,
            "mother_name":  row["mother_name"],
            "phc_display":  row["phc_display"],
            "phc_key":      row["phc_key"],
            "hrt_code":     row["hrt_code"],
            "hrt_name":     row["hrt_name"],
            "cell_no":      row["cell_no"],
            "risk_category":row["risk_category"],
            "call_status":  latest.get("status", row["cell_no"] and "Pending" or "No Number"),
            "last_call_date":latest.get("date", row["call_date"]),
            "last_call_time":latest.get("time", ""),
            "caller_name":  latest.get("caller_name", row["hrt_name"]),
            "remarks":      latest.get("remarks", ""),
            "outcome":      latest.get("outcome", ""),
            "next_followup_date": latest.get("next_followup_date", row["next_visit_date"]),
            "call_count":   len(hist),
        })

    if hrt:
        records = [r for r in records if r["hrt_code"] == hrt.upper()]
    if phc:
        records = [r for r in records if r["phc_key"] == phc.upper()]
    if status:
        records = [r for r in records if r["call_status"] == status]
    if date_filter:
        records = [r for r in records if r["last_call_date"] == date_filter]

    # Analytics
    all_statuses = [r["call_status"] for r in records]
    status_counts = {}
    for s in all_statuses:
        status_counts[s] = status_counts.get(s, 0) + 1

    return jsonify({
        "total": len(records),
        "records": records[:500],
        "status_counts": status_counts,
    })

@app.route("/api/calls/<uid>", methods=["POST"])
def add_call(uid):
    body  = request.get_json() or {}
    calls = _load_json(CALLS_FILE)
    now   = datetime.datetime.now()
    entry = {
        "date":             body.get("date", now.strftime("%Y-%m-%d")),
        "time":             body.get("time", now.strftime("%H:%M")),
        "status":           body.get("status", "Connected"),
        "caller_name":      body.get("caller_name", ""),
        "remarks":          body.get("remarks", ""),
        "outcome":          body.get("outcome", ""),
        "next_followup_date": body.get("next_followup_date", ""),
        "next_followup_time": body.get("next_followup_time", ""),
        "recorded_at":      now.isoformat(),
    }
    if uid not in calls:
        calls[uid] = []
    calls[uid].append(entry)
    _save_json(CALLS_FILE, calls)
    return jsonify({"success": True, "entry": entry, "total_calls": len(calls[uid])})

@app.route("/api/calls/<uid>/history", methods=["GET"])
def call_history(uid):
    calls = _load_json(CALLS_FILE)
    return jsonify(calls.get(uid, []))

# ── Follow-Up Tracking ─────────────────────────────────────────────────────
@app.route("/api/followups", methods=["GET"])
def get_followups():
    role   = request.args.get("role", "DMCHO")
    status = request.args.get("status", "")
    hrt    = request.args.get("hrt", "")
    phc    = request.args.get("phc", "")

    df      = filter_by_role(get_data(), role)
    followups = _load_json(FOLLOWUP_FILE)

    records = []
    for _, row in df.iterrows():
        uid  = row["uid"]
        hist = followups.get(uid, [])
        latest = hist[-1] if hist else {}
        fu_status = latest.get("status", "Pending")
        records.append({
            "uid":          uid,
            "mother_name":  row["mother_name"],
            "phc_display":  row["phc_display"],
            "phc_key":      row["phc_key"],
            "hrt_code":     row["hrt_code"],
            "hrt_name":     row["hrt_name"],
            "cell_no":      row["cell_no"],
            "risk_category":row["risk_category"],
            "followup_status": fu_status,
            "last_visit_date": latest.get("visit_date", row["last_visit_date"]),
            "next_visit_date": latest.get("next_visit_date", row["next_visit_date"]),
            "remarks":         latest.get("remarks", row["uphc_response"]),
            "escalation_status": latest.get("escalation_status", ""),
            "followup_count":   len(hist),
        })

    if hrt:    records = [r for r in records if r["hrt_code"] == hrt.upper()]
    if phc:    records = [r for r in records if r["phc_key"] == phc.upper()]
    if status: records = [r for r in records if r["followup_status"] == status]

    status_counts = {}
    for r in records:
        s = r["followup_status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    return jsonify({
        "total": len(records),
        "records": records[:500],
        "status_counts": status_counts,
    })

@app.route("/api/followups/<uid>", methods=["POST"])
def add_followup(uid):
    body      = request.get_json() or {}
    followups = _load_json(FOLLOWUP_FILE)
    now       = datetime.datetime.now()
    entry = {
        "visit_date":         body.get("visit_date", now.strftime("%Y-%m-%d")),
        "status":             body.get("status", "Completed"),
        "remarks":            body.get("remarks", ""),
        "escalation_status":  body.get("escalation_status", ""),
        "next_visit_date":    body.get("next_visit_date", ""),
        "recorded_at":        now.isoformat(),
    }
    if uid not in followups:
        followups[uid] = []
    followups[uid].append(entry)
    _save_json(FOLLOWUP_FILE, followups)
    return jsonify({"success": True, "entry": entry})

# ── Static React frontend ──────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    full = os.path.join(FRONTEND_DIST, path)
    if path and os.path.exists(full):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")

if __name__ == "__main__":
    print("HIGH RISK MOTHER TRACKER - CCMC Backend")
    print(f"Excel : {EXCEL_PATH}")
    print(f"Dist  : {FRONTEND_DIST}")
    load_excel()
    print(f"Loaded {len(_cache['df'])} records")
    print(f"Open   : http://localhost:{PORT}")
    print("Flask ready on", PORT)
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)
