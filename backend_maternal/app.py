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
import threading
import time
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

# ── Cloud / Local data source ───────────────────────────────────────────────
# EXCEL_URL: set this env var to the Google Sheets XLSX export URL for cloud sync.
# When set, the app downloads the sheet on startup and every 5 minutes automatically.
# Leave unset (or empty) to use the local Excel file via config.json / default path.
EXCEL_URL = os.environ.get('EXCEL_URL', '').strip()

if EXCEL_URL:
    # Cloud mode: Windows-safe temp path
    EXCEL_PATH = os.path.join(BASE_DIR, 'ccmc_data_cache.xlsx')
else:
    _default_excel = os.path.join(BASE_DIR, '..', '..', '..', 'Downloads',
                                  'ccmc maternal',
                                  'Coimbatore Corp Zonewise HR Mother Updation  (1).xlsx')
    EXCEL_PATH = os.path.abspath(_cfg.get('excel_path', os.environ.get('EXCEL_PATH', _default_excel)))

# PORT: Render (and most PaaS platforms) inject PORT via env var at runtime.
PORT = int(os.environ.get('PORT', _cfg.get('port', 8001)))
HOST = _cfg.get('host', '0.0.0.0')
CALLS_FILE    = os.path.join(BASE_DIR, 'call_tracking.json')
FOLLOWUP_FILE = os.path.join(BASE_DIR, 'followup_data.json')

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
              "phcs": ["KK PUDUR", "KURUCHI", "SN PALAYAM", "MM HOME", "MM", "MM PHC", "MPHC"], "full_access": False},
    "HRT4":  {"password": "hrt4@2024",  "role": "HRT4",  "name": "Pavithraa M",
              "phcs": ["UPPILIPALAYAM", "RAMANATHAPURAM", "SINGANALLUR", "PODANUR"], "full_access": False},
    "HRT5":  {"password": "hrt5@2024",  "role": "HRT5",  "name": "Pavithra",
              "phcs": ["KUNIYAMUTHUR", "VADAVALLI", "THONDAMUTHUR", "JRM", "KALVEERAMPALAYAM"], "full_access": False},
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
    "MM HOME":                {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "MM Home"},
    "MM":                     {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "MM Home"},
    "MM PHC":                 {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "MM Home"},
    "MPHC":                   {"hrt_code": "HRT3", "hrt_name": "Nivetha",     "phc_display": "MM Home"},
    "UPPILIPALAYAM":          {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Uppilipalayam"},
    "RAMANATHAPURAM":         {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Ramanathapuram"},
    "SINGANALLUR":            {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Singanallur"},
    "PODANUR":                {"hrt_code": "HRT4", "hrt_name": "Pavithraa M", "phc_display": "Podanur"},
    "KUNIYAMUTHUR":           {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Kuniyamuthur"},
    "VADAVALLI":              {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Vadavalli"},
    "THONDAMUTHUR":           {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Thondamuthur"},
    "JRM":                    {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "JRM Centre"},
    "KALVEERAMPALAYAM":       {"hrt_code": "HRT5", "hrt_name": "Pavithra",    "phc_display": "Kalveerampalayam"},
    "VILANKURICHI":           {"hrt_code": "HRT6", "hrt_name": "Ishwarya",    "phc_display": "Vilankuruchi"},
    "GANAPATHY":              {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Ganapathy"},
    "RAJA STREET":            {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Raja Street"},
    "THUDIYALUR":             {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Thudiyalur"},
    "49 GOUNDAMPALAYAM":      {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Goundampalayam"},
    "MANIYAKARAMPALAYAM":     {"hrt_code": "HRT7", "hrt_name": "Swetha",      "phc_display": "Maniyakaranpalayam"},
    "GANAPATHY MANAGAR UPHC": {"hrt_code": "HRT8", "hrt_name": "Abarna V",    "phc_display": "Ganapathy Managar"},
    "SELVAPURAM":             {"hrt_code": "HRT8", "hrt_name": "Abarna V",    "phc_display": "Selvapuram"},
    "VELLAKINAR":             {"hrt_code": "HRT8", "hrt_name": "Abarna V",    "phc_display": "Vellakinar"},
    "PEELAMEDU":              {"hrt_code": "HRT8", "hrt_name": "Abarna V",    "phc_display": "Peelamedu"},
    "SLM":                    {"hrt_code": "HRT8", "hrt_name": "Abarna V",    "phc_display": "SLM Home"},
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
    "MM":                     "MM",
    "MM PHC":                 "MM PHC",
    "MPHC":                   "MPHC",
    "SHEET45":                "SHEET45",
}

# ── In-memory cache ────────────────────────────────────────────────────────
_cache = {"df": None, "ts": None}

# ── Auto-sync state ────────────────────────────────────────────────────────
_sync_state = {
    "last_mtime":     None,
    "last_sync_time": None,
    "syncing":        False,
    "sync_count":     0,
    "auto_enabled":   True,
}
AUTO_SYNC_INTERVAL  = 30   # seconds — local mtime check interval
CLOUD_SYNC_INTERVAL = 300  # seconds — Google Sheets re-download interval (5 min)

def _get_file_mtime():
    try:
        return os.path.getmtime(EXCEL_PATH)
    except Exception:
        return None

def _download_excel():
    """Download Excel from EXCEL_URL (Google Sheets export). Returns True if data changed."""
    if not EXCEL_URL:
        return False
    try:
        import urllib.request
        tmp = EXCEL_PATH + '.download'
        urllib.request.urlretrieve(EXCEL_URL, tmp)
        # Compare with existing to detect real changes
        changed = True
        if os.path.exists(EXCEL_PATH):
            with open(EXCEL_PATH, 'rb') as f_old, open(tmp, 'rb') as f_new:
                changed = f_old.read() != f_new.read()
        if changed:
            os.replace(tmp, EXCEL_PATH)
        else:
            os.remove(tmp)
        return changed
    except Exception as e:
        print(f"[CLOUD-SYNC] Download error: {e}", flush=True)
        return False

def _auto_sync_worker():
    """Background daemon: local mtime check (every 30s) or cloud re-download (every 5 min)."""
    time.sleep(20)
    _sync_state["last_mtime"] = _get_file_mtime()
    _cloud_elapsed = 0

    while True:
        try:
            time.sleep(AUTO_SYNC_INTERVAL)
            if not _sync_state["auto_enabled"] or _sync_state["syncing"]:
                continue

            should_reload = False

            if EXCEL_URL:
                _cloud_elapsed += AUTO_SYNC_INTERVAL
                if _cloud_elapsed >= CLOUD_SYNC_INTERVAL:
                    _cloud_elapsed = 0
                    print("[CLOUD-SYNC] Checking Google Sheets for updates…", flush=True)
                    if _download_excel():
                        print("[CLOUD-SYNC] Data changed — reloading…", flush=True)
                        should_reload = True
                    else:
                        print("[CLOUD-SYNC] No change.", flush=True)
            else:
                current_mtime = _get_file_mtime()
                if current_mtime and current_mtime != _sync_state["last_mtime"]:
                    print("[AUTO-SYNC] Excel file changed — reloading…", flush=True)
                    should_reload = True

            if should_reload:
                _sync_state["syncing"] = True
                try:
                    load_excel()
                    _sync_state["last_mtime"]     = _get_file_mtime()
                    _sync_state["last_sync_time"] = datetime.datetime.now().isoformat()
                    _sync_state["sync_count"]    += 1
                    n = len(_cache["df"]) if _cache["df"] is not None else 0
                    print(f"[SYNC] Done — {n} records live", flush=True)
                except Exception as e:
                    print(f"[SYNC] Reload error: {e}", flush=True)
                finally:
                    _sync_state["syncing"] = False
        except Exception as e:
            print(f"[AUTO-SYNC] Worker error: {e}", flush=True)


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

_DELIVERY_DATE_RE = re.compile(r'^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})')

def _parse_delivery_date(text):
    """Extract actual delivery date from uphc_response text e.g. '31.3.26 AT:5PM/LSCS...'"""
    if not text or str(text).strip() in ("", "nan", "NaT"):
        return None
    m = _DELIVERY_DATE_RE.match(str(text).strip())
    if not m:
        return None
    day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if year < 100:
        year += 2000
    try:
        d = datetime.date(year, month, day)
        today = datetime.date.today()
        # Sanity: must be within last 2 years and not in future
        if datetime.date(today.year - 2, 1, 1) <= d <= today:
            return d
    except ValueError:
        pass
    return None

def _normalise_col(df, candidates, default=""):
    # Case-insensitive, whitespace-stripped column lookup
    col_norm = {}
    for c in df.columns:
        key = str(c).strip().upper()
        if key not in col_norm:
            col_norm[key] = c
    for cand in candidates:
        key = str(cand).strip().upper()
        if key in col_norm:
            return df[col_norm[key]].fillna("").astype(str).str.strip()
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
            raw = xl.parse(sheet, dtype=str)
        except Exception:
            continue
        raw = raw.dropna(how="all")
        raw = raw.fillna("")
        if len(raw) == 0:
            continue

        # ── Normalize column headers ──────────────────────────────────────
        # Strip whitespace and convert integer/float headers to strings
        raw.columns = [str(c).strip() for c in raw.columns]
        # Rename unnamed column immediately after RCH ID as MOTHER NAME
        # (handles sheets like MM HOME where the name column has no header)
        cols = list(raw.columns)
        for _rch_cand in ("RCH ID", "RCH  ID"):
            _rch_up = _rch_cand.upper()
            _cols_up = [c.upper() for c in cols]
            if _rch_up in _cols_up:
                _rch_pos = _cols_up.index(_rch_up)
                if _rch_pos + 1 < len(cols):
                    _nc = cols[_rch_pos + 1]
                    if _nc.startswith("Unnamed:") or _nc == "":
                        cols[_rch_pos + 1] = "MOTHER NAME"
                        raw.columns = cols
                break

        # Strip all cell values (use positional indexing to avoid duplicate-column issues)
        for i in range(len(raw.columns)):
            raw.iloc[:, i] = raw.iloc[:, i].astype(str).str.strip()

        # ── Build normalised columns (_normalise_col is now case+strip tolerant) ──
        row_no       = _normalise_col(raw, ["S.NO", "S.NO.", "S NO", "SNO", "SL NO", "-"])
        uphc_name    = _normalise_col(raw, ["UPHC NAME", "UPHC"])
        hsc_name     = _normalise_col(raw, ["HSC NAME", "HSC"])
        res_type     = _normalise_col(raw, ["RESIDENT/VISITOR", "RESIDENT / VISITORS",
                                            "RESIDENT / VISITOR", "RESIDENT"])
        rch_id       = _normalise_col(raw, ["RCH ID"])
        mother_name  = _normalise_col(raw, ["MOTHER NAME AND ADDRESS", "NAME AND ADD",
                                            "NAME AND ADDRESS", "MOTHER NAME",
                                            "MOTHERNAME", "NAME AND AD", "NAME"])
        cell_no      = _normalise_col(raw, ["CELL NO", "MOBILE", "PHONE"])
        husband      = _normalise_col(raw, ["HUSBAND NAME", "HUSBAND"])
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
        ppbs         = _normalise_col(raw, ["PPBS", "FBS/PPBS", "FBS"])
        echo         = _normalise_col(raw, ["ECHO/ECG", "ECG/ECHO", "ECHO"])
        usg          = _normalise_col(raw, ["USG"])
        tsh          = _normalise_col(raw, ["TSH"])
        blood_grp    = _normalise_col(raw, ["BLOOD GROUP"])
        sputum       = _normalise_col(raw, ["SPUTUM AFB", "SPUTUM"])
        urine        = _normalise_col(raw, ["URINE ROUTINE", "URINE RE", "URINE"])
        birth_plan   = _normalise_col(raw, ["BIRTH PLAN", "REGULAR FOLLOW UP"])
        referral     = _normalise_col(raw, ["REFERRAL DETAILS"])
        last_visit   = _normalise_col(raw, ["UPHC LAST VISIT DATE", "LAST VISIT DATE"])
        action_taken = _normalise_col(raw, ["UPHC ACTION TAKEN \n(1st follow up)",
                                            "UPHC ACTION TAKEN", "ACTION TAKEN"])
        call_date    = _normalise_col(raw, ["CALL DATE"])
        next_visit   = _normalise_col(raw, ["NEXT VISIT DATE \nONLY FILL BY UPHC",
                                            "NEXT VISIT DATE", "NEXT VISIT"])
        uphc_response= _normalise_col(raw, ["UPHC RESPONSE AS PER NEXT VISIT", "UPHC RESPONSE"])
        next_plan    = _normalise_col(raw, ["NEXT PLAN OF VISIT PLACE AND TIME ",
                                            "NEXT PLAN OF VISIT PLACE AND TIME",
                                            "PLAN OF NEXT VISIT DATE AND PLACE",
                                            "PLAN OF NEXT VISIT DATE & PLACE "])

        for i in range(len(raw)):
            hr_text  = high_risk.iloc[i]
            score, factors, category = _parse_risk(hr_text)
            name_raw = mother_name.iloc[i]
            # Skip header-repeat rows and blank rows
            if name_raw.upper() in ("NAME AND ADD", "MOTHER NAME AND ADDRESS",
                                    "NAME AND ADDRESS", "MOTHER NAME", "MOTHERNAME",
                                    "NAME AND AD", "NAME", ""):
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

            # Parse actual delivery date from uphc_response (e.g. "31.3.26 AT:5PM/LSCS...")
            uphc_resp_val = uphc_response.iloc[i]
            actual_ddate  = _parse_delivery_date(uphc_resp_val) if is_delivered else None
            today_d       = datetime.date.today()
            if actual_ddate:
                days_since_del = (today_d - actual_ddate).days
            elif is_delivered and days_left is not None and days_left < 0:
                days_since_del = int(abs(days_left))   # EDD proxy fallback
            else:
                days_since_del = None

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
                "delivery_info":    delivery_info,
                "delivery_date":    actual_ddate.strftime("%d-%m-%Y") if actual_ddate else "",
                "days_since_delivery": days_since_del,
                "is_delivered": is_delivered,
            })

    df = pd.DataFrame(frames)
    _cache["df"] = df
    _cache["ts"] = datetime.datetime.now().isoformat()
    _sync_state["last_sync_time"] = _cache["ts"]
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
        phc_displays = [PHC_MAP.get(p, {}).get("phc_display", p) for p in user["phcs"]
                        if PHC_MAP.get(p, {}).get("hrt_code") == user["role"]]
        print(f"[LOGIN] username={username} role={user['role']} name={user['name']} "
              f"full_access={user['full_access']} phcs={user['phcs']}", flush=True)
        return jsonify({
            "success":     True,
            "role":        user["role"],
            "name":        user["name"],
            "phcs":        user["phcs"],
            "full_access": user["full_access"],
            "username":    username,
        })
    print(f"[LOGIN FAILED] username={username}", flush=True)
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/api/me")
def me():
    """Return identity of the currently specified role (used for session validation)."""
    role = request.args.get("role", "").upper()
    user = next((u for u in USERS.values() if u["role"] == role), None)
    if not user:
        return jsonify({"error": "Unknown role"}), 404
    phc_info = [{"phc_key": p, "phc_display": PHC_MAP.get(p, {}).get("phc_display", p)}
                for p in user["phcs"]]
    return jsonify({
        "role":        user["role"],
        "name":        user["name"],
        "full_access": user["full_access"],
        "phcs":        phc_info,
        "hrt_code":    user["role"],
    })

@app.route("/api/refresh", methods=["POST"])
def refresh():
    _cache["df"] = None
    _sync_state["syncing"] = True
    try:
        load_excel()
        _sync_state["last_sync_time"] = datetime.datetime.now().isoformat()
        _sync_state["sync_count"]    += 1
        _sync_state["last_mtime"]     = _get_file_mtime()
    finally:
        _sync_state["syncing"] = False
    return jsonify({"success": True, "records": len(_cache["df"]), "ts": _cache["ts"]})

@app.route("/api/sync-status")
def sync_status_api():
    """Returns real-time sync state for the frontend auto-refresh polling."""
    return jsonify({
        "last_sync_time": _sync_state["last_sync_time"] or _cache.get("ts"),
        "syncing":        _sync_state["syncing"],
        "sync_count":     _sync_state["sync_count"],
        "auto_enabled":   _sync_state["auto_enabled"],
        "interval_sec":   AUTO_SYNC_INTERVAL,
        "records":        len(_cache["df"]) if _cache["df"] is not None else 0,
        "excel_modified": _sync_state["last_mtime"],
    })

@app.route("/api/patients")
def patients():
    role        = request.args.get("role", "DMCHO")
    phc         = request.args.get("phc", "")
    hrt         = request.args.get("hrt", "")
    search      = request.args.get("search", "").strip().lower()
    risk_cat    = request.args.get("risk_category", "")
    risk_factor = request.args.get("risk_factor", "").strip().upper()
    page        = int(request.args.get("page", 1))
    per_page    = int(request.args.get("per_page", 50))

    df = filter_by_role(get_data(), role)
    if phc:
        df = df[df["phc_key"] == phc.upper()]
    if hrt:
        df = df[df["hrt_code"] == hrt.upper()]
    if risk_cat:
        df = df[df["risk_category"] == risk_cat]
    if risk_factor:
        df = df[df["risk_factors"].apply(
            lambda fl: any(str(f).strip().upper() == risk_factor for f in (fl or []))
        )]
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
    # Postdated EDD: AN mothers whose EDD passed but delivery not recorded
    postdated_edd = int(((df["is_delivered"] == False) & (df["days_to_edd"] < 0)).sum())

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
        "postdated_edd":       postdated_edd,
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

@app.route("/api/postdated-edd")
def postdated_edd_list():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)

    # AN mothers whose EDD has passed but delivery not recorded
    mask = (df["is_delivered"] == False) & (df["days_to_edd"].notna()) & (df["days_to_edd"] < 0)
    pdf  = df[mask].copy()

    calls     = _load_json(CALLS_FILE)
    followups = _load_json(FOLLOWUP_FILE)

    result = []
    for _, row in pdf.iterrows():
        uid = row["uid"]

        call_hist  = calls.get(uid, [])
        last_call  = call_hist[-1] if call_hist else None
        call_status = last_call.get("status", "No Call") if last_call else "No Call"
        last_call_date = last_call.get("date", "") if last_call else ""

        fu_hist   = followups.get(uid, [])
        last_fu   = fu_hist[-1] if fu_hist else None
        fu_status = last_fu.get("status", "No Follow-Up") if last_fu else "No Follow-Up"
        last_fu_date = last_fu.get("visit_date", "") if last_fu else ""

        days_past = int(abs(row["days_to_edd"]))

        result.append({
            "uid":               uid,
            "rch_id":            row.get("rch_id", ""),
            "mother_name":       row.get("mother_name", ""),
            "cell_no":           row.get("cell_no", ""),
            "phc_display":       row.get("phc_display", ""),
            "hrt_code":          row.get("hrt_code", ""),
            "hrt_name":          row.get("hrt_name", ""),
            "hsc_name":          row.get("hsc_name", ""),
            "edd":               row.get("edd", ""),
            "days_past_edd":     days_past,
            "risk_category":     row.get("risk_category", ""),
            "call_status":       call_status,
            "last_call_date":    last_call_date,
            "followup_status":   fu_status,
            "last_followup_date":last_fu_date,
            "high_risk_raw":     row.get("high_risk_raw", ""),
            "gravida":           row.get("gravida", ""),
            "address":           row.get("address", ""),
        })

    # Sort by days past EDD descending (most overdue first)
    result.sort(key=lambda x: x["days_past_edd"], reverse=True)

    return jsonify({"total": len(result), "mothers": result})


# ── Universal Drill-Down ────────────────────────────────────────────────────
@app.route("/api/drill-down")
def drill_down():
    metric    = request.args.get("metric", "total")
    role      = request.args.get("role", "DMCHO")
    df        = filter_by_role(get_data(), role)
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    # ── Apply metric filter ────────────────────────────────────────────────
    if metric == "total":
        sub = df
    elif metric == "critical":
        sub = df[df["risk_category"] == "Critical"]
    elif metric == "very_high":
        sub = df[df["risk_category"] == "Very High"]
    elif metric == "high":
        sub = df[df["risk_category"] == "High"]
    elif metric == "high_risk":
        sub = df[df["risk_category"].isin(["High", "Very High", "Critical"])]
    elif metric == "moderate":
        sub = df[df["risk_category"] == "Moderate"]
    elif metric == "low":
        sub = df[df["risk_category"] == "Low"]
    elif metric == "due_today":
        sub = df[(df["is_delivered"] == False) & (df["days_to_edd"] == 0)]
    elif metric == "due_7_days":
        sub = df[(df["is_delivered"] == False) & (df["days_to_edd"].between(0, 7))]
    elif metric == "due_30_days":
        sub = df[(df["is_delivered"] == False) & (df["days_to_edd"].between(0, 30))]
    elif metric == "delivered":
        sub = df[df["is_delivered"] == True]
    elif metric == "postdated_edd":
        sub = df[(df["is_delivered"] == False) & (df["days_to_edd"].notna()) & (df["days_to_edd"] < 0)]
    elif metric == "missing_phone":
        sub = df[df["cell_no"].str.strip() == ""]
    elif metric == "missing_name":
        sub = df[df["mother_name"].str.strip() == ""]
    elif metric == "followups_today":
        fu = _load_json(FOLLOWUP_FILE)
        role_uids = set(df["uid"].tolist())
        uids_today = {uid for uid, hist in fu.items()
                      if uid in role_uids
                      for entry in hist
                      if entry.get("next_visit_date") == today_str}
        sub = df[df["uid"].isin(uids_today)]
    elif metric == "calls_pending":
        calls_j = _load_json(CALLS_FILE)
        role_uids = set(df["uid"].tolist())
        uids_today = {uid for uid, hist in calls_j.items()
                      if uid in role_uids
                      for entry in hist
                      if entry.get("next_followup_date") == today_str}
        sub = df[df["uid"].isin(uids_today)]
    elif metric.startswith("phc:"):
        phc_key = metric[4:].upper()
        sub = df[df["phc_key"] == phc_key]
    else:
        sub = df

    total_count = len(sub)

    # ── Enrich with call/follow-up status ─────────────────────────────────
    calls_data     = _load_json(CALLS_FILE)
    followups_data = _load_json(FOLLOWUP_FILE)

    def _safe_int(val):
        try:
            if val is None or (isinstance(val, float) and np.isnan(val)):
                return None
            return int(val)
        except (TypeError, ValueError):
            return None

    def _safe_float(val):
        try:
            if val is None or (isinstance(val, float) and np.isnan(val)):
                return 0.0
            return float(val)
        except (TypeError, ValueError):
            return 0.0

    result = []
    for _, row in sub.iterrows():
        uid = row["uid"]

        call_hist   = calls_data.get(uid, [])
        last_call   = call_hist[-1] if call_hist else None
        call_status = last_call.get("status",     "No Call")       if last_call else "No Call"
        last_call_d = last_call.get("date",        "")             if last_call else ""

        fu_hist     = followups_data.get(uid, [])
        last_fu     = fu_hist[-1] if fu_hist else None
        fu_status   = last_fu.get("status",        "No Follow-Up") if last_fu else "No Follow-Up"
        last_fu_d   = last_fu.get("visit_date",    "")             if last_fu else ""

        result.append({
            "uid":                 uid,
            "rch_id":              row.get("rch_id", ""),
            "mother_name":         row.get("mother_name", ""),
            "cell_no":             row.get("cell_no", ""),
            "phc_display":         row.get("phc_display", ""),
            "phc_key":             row.get("phc_key", ""),
            "hrt_code":            row.get("hrt_code", ""),
            "hrt_name":            row.get("hrt_name", ""),
            "hsc_name":            row.get("hsc_name", ""),
            "risk_category":       row.get("risk_category", ""),
            "risk_score":          _safe_float(row.get("risk_score")),
            "edd":                 row.get("edd", ""),
            "days_to_edd":         _safe_int(row.get("days_to_edd")),
            "gravida":             row.get("gravida", ""),
            "is_delivered":        bool(row.get("is_delivered", False)),
            "delivery_date":       row.get("delivery_date", ""),
            "days_since_delivery": _safe_int(row.get("days_since_delivery")),
            "high_risk_raw":       row.get("high_risk_raw", ""),
            "address":             row.get("address", ""),
            "call_status":         call_status,
            "last_call_date":      last_call_d,
            "followup_status":     fu_status,
            "last_followup_date":  last_fu_d,
        })

    return jsonify({"metric": metric, "total": total_count, "returned": len(result), "mothers": result})


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
    an_w7     = an[an["days_to_edd"].between(1, 7)]
    an_8_14   = an[an["days_to_edd"].between(8, 14)]
    an_15_30  = an[an["days_to_edd"].between(15, 30)]
    an_31_60  = an[an["days_to_edd"].between(31, 60)]
    an_61_90  = an[an["days_to_edd"].between(61, 90)]
    an_90plus = an[an["days_to_edd"] > 90]

    # ── PN Mothers — use actual delivery date; fall back to EDD proxy ─
    pn = df[df["is_delivered"] == True].copy()
    # _pn_days: prefer days_since_delivery (from parsed delivery date),
    # fall back to abs(days_to_edd) as proxy
    pn_days_actual = pd.to_numeric(pn["days_since_delivery"], errors="coerce")
    pn_days_proxy  = pn["days_to_edd"].apply(
        lambda x: abs(x) if pd.notna(x) and x < 0 else np.nan
    )
    pn["_pn_days"] = pn_days_actual.fillna(pn_days_proxy)

    pn_1_7    = pn[pn["_pn_days"].between(1,  7)]
    pn_8_14   = pn[pn["_pn_days"].between(8,  14)]
    pn_15_21  = pn[pn["_pn_days"].between(15, 21)]
    pn_21_28  = pn[pn["_pn_days"].between(22, 28)]
    pn_28_42  = pn[pn["_pn_days"].between(29, 42)]
    pn_42plus = pn[pn["_pn_days"] > 42]

    an_upcoming = an[an["days_to_edd"].between(0, 30)]

    return jsonify({
        "an_today":   to_records(an_today),
        "an_w7":      to_records(an_w7),
        "an_8_14":    to_records(an_8_14),
        "an_15_30":   to_records(an_15_30),
        "an_31_60":   to_records(an_31_60),
        "an_61_90":   to_records(an_61_90),
        "an_90plus":  to_records(an_90plus),
        "pn_1_7":     to_records(pn_1_7),
        "pn_8_14":    to_records(pn_8_14),
        "pn_15_21":   to_records(pn_15_21),
        "pn_21_28":   to_records(pn_21_28),
        "pn_28_42":   to_records(pn_28_42),
        "pn_42plus":  to_records(pn_42plus),
        "counts": {
            "an_today":   int(len(an_today)),
            "an_w7":      int(len(an_w7)),
            "an_8_14":    int(len(an_8_14)),
            "an_15_30":   int(len(an_15_30)),
            "an_31_60":   int(len(an_31_60)),
            "an_61_90":   int(len(an_61_90)),
            "an_90plus":  int(len(an_90plus)),
            "pn_1_7":     int(len(pn_1_7)),
            "pn_8_14":    int(len(pn_8_14)),
            "pn_15_21":   int(len(pn_15_21)),
            "pn_21_28":   int(len(pn_21_28)),
            "pn_28_42":   int(len(pn_28_42)),
            "pn_42plus":  int(len(pn_42plus)),
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

@app.route("/api/phc-audit")
def phc_audit():
    """Full PHC mapping validation report — compares configured vs detected PHCs."""
    df = get_data()

    # 1. Configured PHCs (from PHC_MAP, excluding aliases and SHEET45/UNASSIGNED)
    configured = {
        k: v for k, v in PHC_MAP.items()
        if v["hrt_code"] not in ("UNASSIGNED",)
        and k not in ("MM", "MM PHC", "MPHC", "SHEET45")   # aliases
    }

    # 2. Detected PHCs (actually in the loaded dataframe)
    detected_in_db = {}
    for phc_key, grp in df.groupby("phc_key"):
        detected_in_db[phc_key] = {
            "count":       int(len(grp)),
            "phc_display": grp["phc_display"].iloc[0],
            "hrt_code":    grp["hrt_code"].iloc[0],
            "hrt_name":    grp["hrt_name"].iloc[0],
        }

    # 3. Excel sheet names
    xl_sheets = []
    try:
        xl = pd.ExcelFile(EXCEL_PATH)
        xl_sheets = xl.sheet_names
    except Exception:
        pass

    # 4. Missing: configured but not in DB
    missing = []
    for k, v in configured.items():
        if k not in detected_in_db:
            missing.append({
                "phc_key":     k,
                "phc_display": v["phc_display"],
                "hrt_code":    v["hrt_code"],
                "hrt_name":    v["hrt_name"],
                "in_excel":    any(s.upper().strip() == k for s in xl_sheets),
            })

    # 5. Unmapped: in DB but not in PHC_MAP
    unmapped = []
    for k, v in detected_in_db.items():
        if k not in PHC_MAP:
            unmapped.append({"phc_key": k, "count": v["count"]})

    # 6. Correctly mapped
    correct = [
        {"phc_key": k, "phc_display": detected_in_db[k]["phc_display"],
         "hrt_code": detected_in_db[k]["hrt_code"], "count": detected_in_db[k]["count"]}
        for k in configured if k in detected_in_db
    ]
    correct.sort(key=lambda x: x["hrt_code"])

    # 7. HRT-wise summary
    hrt_summary = {}
    for hrt_code, grp in df.groupby("hrt_code"):
        hrt_summary[hrt_code] = {
            "hrt_name":   grp["hrt_name"].iloc[0],
            "total":      int(len(grp)),
            "phc_count":  int(grp["phc_key"].nunique()),
            "phcs":       sorted(grp["phc_display"].unique().tolist()),
        }

    return jsonify({
        "summary": {
            "configured_phcs":  len(configured),
            "detected_in_db":   len(detected_in_db),
            "correct_mapped":   len(correct),
            "missing_phcs":     len(missing),
            "unmapped_phcs":    len(unmapped),
            "total_records":    int(len(df)),
            "excel_sheets":     len(xl_sheets),
        },
        "missing":    missing,
        "unmapped":   unmapped,
        "correct":    correct,
        "hrt_summary":hrt_summary,
        "all_detected": [
            {"phc_key": k, **v} for k, v in sorted(detected_in_db.items())
        ],
    })

@app.route("/api/phcs")
def phc_list_api():
    """PHC list for filter dropdowns, scoped to role."""
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    phcs = []
    seen = set()
    for phc_key in df["phc_key"].unique():
        if phc_key in seen:
            continue
        seen.add(phc_key)
        phc_info = PHC_MAP.get(phc_key, {})
        phcs.append({
            "phc_key":     phc_key,
            "phc_display": phc_info.get("phc_display", phc_key),
            "hrt_code":    phc_info.get("hrt_code", ""),
            "count":       int((df["phc_key"] == phc_key).sum()),
        })
    phcs.sort(key=lambda x: x["phc_display"])
    return jsonify(phcs)

@app.route("/api/hrt-call-performance")
def hrt_call_performance():
    """Per-HRT daily call activity analytics."""
    role        = request.args.get("role", "DMCHO")
    date_filter = request.args.get("date", "")

    df        = filter_by_role(get_data(), role)
    calls_j   = _load_json(CALLS_FILE)
    followups_j = _load_json(FOLLOWUP_FILE)
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    fu_date   = date_filter or today_str

    result = []
    for hrt_code, grp in df.groupby("hrt_code"):
        hrt_name      = grp["hrt_name"].iloc[0]
        total_mothers = int(len(grp))
        phcs          = sorted(grp["phc_display"].unique().tolist())

        attempted = connected = no_response = switched_off = 0
        wrong_number = call_back_later = followup_required = resolved = pending = 0
        last_call_date = ""
        last_call_time = ""

        for uid in grp["uid"].tolist():
            hist = calls_j.get(uid, [])
            if not hist:
                pending += 1
                continue
            day_hist = [c for c in hist if c.get("date") == date_filter] if date_filter else hist
            if not day_hist:
                pending += 1
                continue
            last = day_hist[-1]
            attempted += 1
            s = last.get("status", "")
            d = last.get("date", "")
            t = last.get("time", "")
            if d > last_call_date:
                last_call_date = d
                last_call_time = t
            if s == "Connected":            connected += 1
            elif s == "No Response":        no_response += 1
            elif s == "Switched Off":       switched_off += 1
            elif s == "Wrong Number":       wrong_number += 1
            elif s == "Call Back Later":    call_back_later += 1
            elif s == "Follow-Up Required": followup_required += 1
            elif s == "Resolved":           resolved += 1

        fu_due = sum(
            1 for uid in grp["uid"].tolist()
            for entry in followups_j.get(uid, [])
            if entry.get("next_visit_date") == fu_date
        )

        result.append({
            "hrt_code":           hrt_code,
            "hrt_name":           hrt_name,
            "total_mothers":      total_mothers,
            "phcs":               phcs,
            "calls_attempted":    attempted,
            "calls_connected":    connected,
            "no_response":        no_response,
            "switched_off":       switched_off,
            "wrong_number":       wrong_number,
            "call_back_later":    call_back_later,
            "followup_required":  followup_required,
            "resolved":           resolved,
            "calls_pending":      pending,
            "followups_due":      fu_due,
            "last_call_date":     last_call_date,
            "last_call_time":     last_call_time,
        })

    result.sort(key=lambda x: x["hrt_code"])
    return jsonify({"date": date_filter or today_str, "hrts": result, "total_hrts": len(result)})

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

# ── Delivery Timeline — next 30 days, day-by-day counts ───────────────────
@app.route("/api/delivery-timeline")
def delivery_timeline():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    today = datetime.date.today()

    # Only antenatal mothers with EDD in the next 30 days
    an_df = df[(df["is_delivered"] == False) & (df["days_to_edd"].between(0, 30))]

    timeline = []
    for day in range(0, 31):
        day_df    = an_df[an_df["days_to_edd"] == day]
        count     = int(len(day_df))
        critical  = int((day_df["risk_category"] == "Critical").sum())
        very_high = int((day_df["risk_category"] == "Very High").sum())
        high      = int((day_df["risk_category"] == "High").sum())
        date_obj  = today + datetime.timedelta(days=day)
        timeline.append({
            "day":       day,
            "date":      date_obj.strftime("%d %b"),
            "weekday":   date_obj.strftime("%a"),
            "count":     count,
            "critical":  critical,
            "very_high": very_high,
            "high":      high,
        })
    return jsonify({"timeline": timeline, "total": int(len(an_df))})


@app.route("/api/risk-factor-analytics")
def api_risk_factor_analytics():
    """Return per-risk-factor patient counts, grouped by risk tier, for charts."""
    role = request.args.get("role", "DMCHO")
    df = filter_by_role(get_data(), role)
    if df is None or df.empty:
        return jsonify([])

    from collections import Counter, defaultdict

    # Aggregate factors across all tiers
    factor_total  = Counter()
    factor_by_tier = defaultdict(lambda: defaultdict(int))
    TIERS = ["Critical", "Very High", "High", "Moderate", "Low"]

    for _, row in df.iterrows():
        factors = row.get("risk_factors") or []
        cat     = row.get("risk_category", "Low")
        if isinstance(factors, str):
            try:
                import json as _json
                factors = _json.loads(factors)
            except Exception:
                factors = [f.strip() for f in factors.split(",") if f.strip()]
        for f in (factors or []):
            fn = str(f).strip().upper()
            if fn:
                factor_total[fn] += 1
                factor_by_tier[fn][cat] += 1

    result = []
    for factor, total in sorted(factor_total.items(), key=lambda x: -x[1]):
        tier_counts = {t: factor_by_tier[factor].get(t, 0) for t in TIERS}
        result.append({
            "factor":     factor,
            "total":      total,
            "tier_counts": tier_counts,
        })
    return jsonify(result)


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
    if EXCEL_URL:
        print(f"Mode  : CLOUD — Google Sheets sync every {CLOUD_SYNC_INTERVAL}s")
        print(f"URL   : {EXCEL_URL}")
        print(f"Cache : {EXCEL_PATH}")
        print("Downloading initial data from Google Sheets…", flush=True)
        _download_excel()
    else:
        print(f"Mode  : LOCAL — mtime watch every {AUTO_SYNC_INTERVAL}s")
        print(f"Excel : {EXCEL_PATH}")
    print(f"Dist  : {FRONTEND_DIST}")
    load_excel()
    _sync_state["last_mtime"] = _get_file_mtime()
    print(f"Loaded {len(_cache['df'])} records")
    _sync_thread = threading.Thread(
        target=_auto_sync_worker, daemon=True, name="ExcelAutoSync"
    )
    _sync_thread.start()
    print(f"Auto-sync : ON")
    print(f"Open      : http://localhost:{PORT}")
    print("Flask ready on", PORT)
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)
