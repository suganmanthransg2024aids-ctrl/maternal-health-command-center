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
import sqlite3
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
EXCEL_URL = os.environ.get('EXCEL_URL', '').strip()

_bundled_excel = os.path.join(BASE_DIR, 'data.xlsx')
if EXCEL_URL:
    EXCEL_PATH = os.path.join(BASE_DIR, 'ccmc_data_cache.xlsx')
elif os.path.exists(_bundled_excel):
    # Docker/Render: bundled data.xlsx inside backend_maternal/
    EXCEL_PATH = _bundled_excel
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
DB_PATH       = os.path.join(BASE_DIR, 'logs.db')

# ── DEO Call Performance — MCH Call Center June 2026 ──────────────────────
DEO_PERFORMANCE = {
    "month": "June 2026",
    "dates": ["15.06.26","16.06.26","17.06.26","18.06.26","19.06.26","20.06.26","22.06.26"],
    "deos": [
        {"sno":1,"name":"M. Pavithraa","calls":{"15.06.26":37,"16.06.26":11,"17.06.26":36,"18.06.26":27,"19.06.26":37,"20.06.26":38,"22.06.26":37}},
        {"sno":2,"name":"M. Ishwarya", "calls":{"15.06.26":33,"16.06.26":31,"17.06.26":30,"18.06.26":27,"19.06.26":35,"20.06.26":30,"22.06.26":31}},
        {"sno":3,"name":"Swetha",      "calls":{"15.06.26":38,"16.06.26":30,"17.06.26":31,"18.06.26":26,"19.06.26":35,"20.06.26":38,"22.06.26":37}},
        {"sno":4,"name":"D. Abarna",   "calls":{"15.06.26":37,"16.06.26":32,"17.06.26":29,"18.06.26":35,"19.06.26":35,"20.06.26":35,"22.06.26":36}},
        {"sno":5,"name":"V. Abarna",   "calls":{"15.06.26":38,"16.06.26":30,"17.06.26":30,"18.06.26":29,"19.06.26":35,"20.06.26":38,"22.06.26":35}},
        {"sno":6,"name":"Nivetha",     "calls":{"15.06.26":36,"16.06.26":31,"17.06.26":31,"18.06.26":33,"19.06.26":36,"20.06.26":37,"22.06.26":35}},
        {"sno":7,"name":"Girija",      "calls":{"15.06.26":34,"16.06.26":30,"17.06.26":15,"18.06.26":0, "19.06.26":0, "20.06.26":32,"22.06.26":32}},
        {"sno":8,"name":"K. Pavithra", "calls":{"15.06.26":37,"16.06.26":31,"17.06.26":33,"18.06.26":29,"19.06.26":36,"20.06.26":34,"22.06.26":37}},
    ],
}

# HRT code → DEO name (for cross-referencing MCH call center records)
HRT_TO_DEO = {
    "HRT1": "D. Abarna",
    "HRT2": "Girija",
    "HRT3": "Nivetha",
    "HRT4": "M. Pavithraa",
    "HRT5": "K. Pavithra",
    "HRT6": "M. Ishwarya",
    "HRT7": "Swetha",
    "HRT8": "V. Abarna",
}
# Build quick lookup: deo_name → {deo_date_str: count}
_DEO_CALLS_BY_NAME = {d["name"]: d["calls"] for d in DEO_PERFORMANCE["deos"]}

def _deo_calls_for(hrt_code, iso_date):
    """Return DEO connected-calls count for a given HRT on an ISO date, or None."""
    deo_name = HRT_TO_DEO.get(hrt_code)
    if not deo_name:
        return None
    try:
        dt       = datetime.datetime.strptime(iso_date, "%Y-%m-%d")
        deo_date = dt.strftime("%d.%m.%y")          # "15.06.26"
    except Exception:
        return None
    return _DEO_CALLS_BY_NAME.get(deo_name, {}).get(deo_date)  # None if not in range

# ── Auth ───────────────────────────────────────────────────────────────────
USERS = {
    "DMCHO": {"password": "dmcho@2026", "role": "DMCHO", "name": "DMCHO Officer",
              "phcs": [], "full_access": True},
    "CHO":   {"password": "cho@2026",   "role": "CHO",   "name": "City Health Officer",
              "phcs": [], "full_access": True},
    "HRT1":  {"password": "hrt1@2026",  "role": "HRT1",  "name": "Abarna D",
              "phcs": ["CTM", "PATTUNOOL", "NANJUNDAPURAM", "NEELIKONAMPALAYAM"], "full_access": False},
    "HRT2":  {"password": "hrt2@2026",  "role": "HRT2",  "name": "Girija",
              "phcs": ["VVM", "RATHINAPURI", "RK BAI", "TELUNGUPALAYAM", "SOWRIPALAYAM"], "full_access": False},
    "HRT3":  {"password": "hrt3@2026",  "role": "HRT3",  "name": "Nivetha",
              "phcs": ["KK PUDUR", "KURUCHI", "SN PALAYAM", "MM HOME", "MM", "MM PHC", "MPHC"], "full_access": False},
    "HRT4":  {"password": "hrt4@2026",  "role": "HRT4",  "name": "Pavithraa M",
              "phcs": ["UPPILIPALAYAM", "RAMANATHAPURAM", "SINGANALLUR", "PODANUR"], "full_access": False},
    "HRT5":  {"password": "hrt5@2026",  "role": "HRT5",  "name": "Pavithra",
              "phcs": ["KUNIYAMUTHUR", "VADAVALLI", "THONDAMUTHUR", "JRM", "KALVEERAMPALAYAM"], "full_access": False},
    "HRT6":  {"password": "hrt6@2026",  "role": "HRT6",  "name": "Ishwarya",
              "phcs": ["VILANKURICHI"], "full_access": False},
    "HRT7":  {"password": "hrt7@2026",  "role": "HRT7",  "name": "Swetha",
              "phcs": ["GANAPATHY", "RAJA STREET", "THUDIYALUR", "49 GOUNDAMPALAYAM", "MANIYAKARAMPALAYAM"], "full_access": False},
    "HRT8":  {"password": "hrt8@2026",  "role": "HRT8",  "name": "Abarna V",
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
AUTO_SYNC_INTERVAL  = 5    # seconds — local mtime check interval
CLOUD_SYNC_INTERVAL = 60   # seconds — cloud spreadsheet re-download interval (1 min)

def _get_file_mtime():
    try:
        return os.path.getmtime(EXCEL_PATH)
    except Exception:
        return None

def _download_excel():
    """Download Excel from EXCEL_URL. Supports GitHub release assets and Google Sheets."""
    if not EXCEL_URL:
        return False
    try:
        import urllib.request
        tmp = EXCEL_PATH + '.download'
        github_token = os.environ.get('GITHUB_TOKEN', '').strip()

        if github_token and 'api.github.com' in EXCEL_URL:
            # GitHub release asset — needs token auth
            req = urllib.request.Request(EXCEL_URL, headers={
                'Authorization': f'token {github_token}',
                'Accept': 'application/octet-stream',
                'User-Agent': 'CCMC-Tracker/1.0'
            })
            with urllib.request.urlopen(req) as resp, open(tmp, 'wb') as f:
                f.write(resp.read())
        elif 'docs.google.com' in EXCEL_URL:
            # Google Sheets export — follow redirects, browser User-Agent
            # Append cache-buster so Google serves a fresh export each poll
            import urllib.parse
            bust_url = EXCEL_URL + ('&' if '?' in EXCEL_URL else '?') + f'cachebuster={int(time.time())}'
            opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())
            opener.addheaders = [
                ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'),
                ('Accept', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*'),
                ('Cache-Control', 'no-cache, no-store'),
                ('Pragma', 'no-cache'),
            ]
            with opener.open(bust_url, timeout=30) as resp, open(tmp, 'wb') as f:
                f.write(resp.read())
            # Verify it's a real Excel file (not an HTML error page)
            with open(tmp, 'rb') as f:
                header = f.read(4)
            if header[:2] == b'PK':  # ZIP/XLSX magic bytes
                pass  # valid
            else:
                os.remove(tmp)
                print("[CLOUD-SYNC] Google Sheets returned non-Excel content (possibly blocked)", flush=True)
                return False
        else:
            opener = urllib.request.build_opener()
            opener.addheaders = [('User-Agent', 'Mozilla/5.0 CCMC-Tracker')]
            urllib.request.install_opener(opener)
            urllib.request.urlretrieve(EXCEL_URL, tmp)

        # Compare data-level hash (row count + content sample) not raw bytes,
        # because Google Sheets xlsx zip metadata changes even when data is unchanged
        def _xlsx_data_hash(path):
            try:
                import zipfile, hashlib
                h = hashlib.md5()
                with zipfile.ZipFile(path, 'r') as z:
                    # Hash the actual sheet XML files, not zip metadata
                    for name in sorted(z.namelist()):
                        if name.startswith('xl/worksheets/') or name == 'xl/sharedStrings.xml':
                            h.update(z.read(name))
                return h.hexdigest()
            except Exception:
                return None

        changed = True
        if os.path.exists(EXCEL_PATH):
            old_hash = _xlsx_data_hash(EXCEL_PATH)
            new_hash = _xlsx_data_hash(tmp)
            if old_hash and new_hash and old_hash == new_hash:
                changed = False

        if changed:
            os.replace(tmp, EXCEL_PATH)
            print(f"[CLOUD-SYNC] Data changed — new spreadsheet downloaded", flush=True)
        else:
            os.remove(tmp)
            print(f"[CLOUD-SYNC] No data change detected", flush=True)
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

# ── Canonical Risk Factor Definitions (Official CCMC Classification) ──────────
# Based on official Tamil Nadu maternal health risk register categories.
# Keywords matched against high_risk_raw column (lowercased). Order preserved.
# Exclude: Typhoid (excluded per reporting policy)
CANONICAL_FACTORS = [
    # ── Surgical / Obstetric History ──────────────────────────────────────────
    {"name": "Previous LSCS / Assisted",
     "group": "Surgical", "color": "#7C3AED",
     "keywords": ["previous lscs","prev.lscs","prev lscs","prelscs","pre lscs","lscs",
                  "previous lscs/assisted","previous lscs / assisted","assisted delivery",
                  "forceps","vacuum extraction"]},
    {"name": "Previous Bad Obstetric History (BOH)",
     "group": "Obstetric", "color": "#9333EA",
     "keywords": ["previous bad obstetric history","bad obstetric history","boh"," hob",
                  "multipara (>/ gravida 4 ) / hob","hob,"]},
    {"name": "Intra Uterine Death (IUD)",
     "group": "Obstetric", "color": "#6D28D9",
     "keywords": ["intra uterine death","intrauterine death","iufd"," iud ","iud,",",iud",
                  "intra-uterine death","still birth","stillbirth"]},
    {"name": "Multiple Pregnancy",
     "group": "Obstetric", "color": "#8B5CF6",
     "keywords": ["multiple pregnancy","twin pregnancy","triplet","twin gestation"]},
    {"name": "IVF / Pregnancy After Prolonged Infertility",
     "group": "Obstetric", "color": "#A78BFA",
     "keywords": ["ivf","in vitro","prolonged infertility","infertility treatment",
                  "pregnancy after prolonged infertility","subfertility"]},
    {"name": "Ectopic Pregnancy",
     "group": "Obstetric", "color": "#C4B5FD",
     "keywords": ["ectopic pregnancy","ectopic","ectopic gestation"]},
    {"name": "Vesicular Mole",
     "group": "Obstetric", "color": "#DDD6FE",
     "keywords": ["vesicular mole","hydatidiform mole","molar pregnancy","vesicular"]},
    {"name": "Congenital Malformation",
     "group": "Fetal", "color": "#5B21B6",
     "keywords": ["congenital malformation","congenital anomaly","congenital defect",
                  "birth defect","neural tube defect","malformation"]},
    {"name": "IUGR (Intra Uterine Growth Restriction)",
     "group": "Fetal", "color": "#4C1D95",
     "keywords": ["iugr","fgr","growth restriction","intrauterine growth restriction",
                  "intra uterine growth restriction","foetal growth restriction"]},
    {"name": "APH - Placenta Previa / Abruptio Placenta",
     "group": "Hemorrhage", "color": "#7F1D1D",
     "keywords": ["antepartum hemorrhage","antepartum haemorrhage","aph","placenta previa",
                  "placenta praevia","abruptio placenta","placental abruption"]},
    {"name": "Abnormal Presentation (>37 Weeks)",
     "group": "Obstetric", "color": "#6D28D9",
     "keywords": ["malpresentation","mal-presentation","transverse lie","abnormal presentation",
                  "transverse","oblique lie","face presentation"]},
    {"name": "Post Dated Pregnancy (>42 Weeks)",
     "group": "Obstetric", "color": "#8B5CF6",
     "keywords": ["post dated pregnancy","post-dated","postdated","beyond 42 weeks",
                  "post dated","post date","postdate","prolonged pregnancy",
                  "post term pregnancy","post-term"]},
    {"name": "Hydramnios > 28 Weeks (Poly / Oligo)",
     "group": "Obstetric", "color": "#A78BFA",
     "keywords": ["hydramnios","oligohydramnios","polyhydramnios","poly hydro",
                  "oligo hydro","poly / oligo","polyhydramnois"]},

    # ── Maternal Factors ──────────────────────────────────────────────────────
    {"name": "Multipara (>= Gravida 4) / HOB",
     "group": "Maternal", "color": "#EA580C",
     "keywords": ["multipara","gravida 4","gravida 5","gravida 6","gravida 7","gravida 8",
                  "gravida 9","multipara (>/ gravida 4"," hob","hob,",",hob",
                  "high obstetric background"]},
    {"name": "Elderly Primi (>35yrs)",
     "group": "Maternal", "color": "#C2410C",
     "keywords": ["elderly primi","elderly primigravida",">35yrs",">35 yrs","age >35",
                  "age>35","age above 35","elderly primi (>35","elderly"]},
    {"name": "Teenage Pregnancy (<19yrs)",
     "group": "Maternal", "color": "#D97706",
     "keywords": ["teenage pregnancy","teenage","<19years","<19yrs","<19 years",
                  "teen age","adolescent pregnancy","age <19","age below 19"]},
    {"name": "Short Primi (Height < 145 cm)",
     "group": "Maternal", "color": "#92400E",
     "keywords": ["short primi","height less than 145","short stature","height < 145",
                  "height below 145","short primigravida"]},
    {"name": "Weight Above 70 Kg",
     "group": "Maternal", "color": "#B45309",
     "keywords": ["weight above 70","wt above 70","weight > 70","weight above 70 kg",
                  "obesity","obese","overweight","weight above70","wt > 70"]},
    {"name": "Weight Below 40 Kg",
     "group": "Maternal", "color": "#78350F",
     "keywords": ["weight below 40","wt below 40","underweight","under weight","under wt",
                  "weight below 40 kg","weight < 40","low weight","under weight"]},
    {"name": "Differently Abled Mother",
     "group": "Maternal", "color": "#713F12",
     "keywords": ["differently abled","handicapped","disabled","physically challenged",
                  "hearing impaired","visually impaired","deaf","mute","blind","disability"]},

    # ── Hypertensive Disorders ────────────────────────────────────────────────
    {"name": "PIH / Preeclampsia",
     "group": "Hypertensive", "color": "#DC2626",
     "keywords": ["pih/","pih,","pih "," pih","pre-eclampsia","eclampsia",
                  "preeclampsia","pre eclampsia","pih/ preeclampsia",
                  "pregnancy induced hypertension","gestational hypertension"]},

    # ── Metabolic / Endocrine ─────────────────────────────────────────────────
    {"name": "Hypothyroidism",
     "group": "Metabolic", "color": "#0F766E",
     "keywords": ["hypothyroidism","hypothyrodism","hypothyroid","hypothyrodsim",
                  "hypothyroidsm","hypotyroid","hypothrodisam","hypothyridism",
                  "hypothyrodisam","hypothyoriodism","hypothyroisam","hypo thyroid"]},
    {"name": "Hyperthyroidism",
     "group": "Metabolic", "color": "#0891B2",
     "keywords": ["hyperthyroidism","hyperthyroid","hyper thyroid","thyrotoxicosis",
                  "graves disease"]},
    {"name": "GDM",
     "group": "Metabolic", "color": "#0E7490",
     "keywords": ["gdm","gestational diabetes mellitus","gestational diabetes",
                  "gdm on","gdm /","gct positive","impaired glucose"]},
    {"name": "Diabetes Mellitus",
     "group": "Metabolic", "color": "#155E75",
     "keywords": ["diabetes mellitus","pre-existing diabetes","type 1 diabetes",
                  "type 2 diabetes","diabetic","t2dm","type ii diabetes"]},

    # ── Blood Disorders ───────────────────────────────────────────────────────
    {"name": "Severe Anaemia (< 7 gm)",
     "group": "Blood", "color": "#991B1B",
     "keywords": [], "anemia_severity": "severe", "hb_max": 7.0},
    {"name": "Rh Isoimmunization",
     "group": "Blood", "color": "#EF4444",
     "keywords": ["rh isoimmunization","rh negative","rh -ve","rh-ve","rh -negative",
                  "rh negative blood","isoimmunization","rh iso","rh(d) negative",
                  "rh incompatibility"]},
    {"name": "Haemoglobinopathy",
     "group": "Blood", "color": "#B91C1C",
     "keywords": ["haemoglobinopathy","hemoglobinopathy","thalassemia","sickle cell",
                  "thalassaemia","beta thalassemia","thalassemia trait","hb s","hba2"]},

    # ── Cardiac Disorders ─────────────────────────────────────────────────────
    {"name": "Heart Diseases Complicating Pregnancy",
     "group": "Cardiac", "color": "#BE185D",
     "keywords": ["heart diseases complicating","heart disease","cardiac","rheumatic heart",
                  "congenital heart","valvular heart","cardiomyopathy","heart failure",
                  "atrial","ventricular defect"]},

    # ── Neurological ──────────────────────────────────────────────────────────
    {"name": "Epilepsy",
     "group": "Neurological", "color": "#312E81",
     "keywords": ["epilepsy","epileptic","seizure disorder","convulsion","fits"]},

    # ── Infectious Diseases ───────────────────────────────────────────────────
    {"name": "HIV / AIDS",
     "group": "Infection", "color": "#1D4ED8",
     "keywords": ["hiv","aids","hiv positive","hiv/aids","human immunodeficiency"]},
    {"name": "Scrub Typhus",
     "group": "Infection", "color": "#2563EB",
     "keywords": ["scrub typhus","scrub typhus fever","orientia"]},
    {"name": "H1N1",
     "group": "Infection", "color": "#3B82F6",
     "keywords": ["h1n1","swine flu","influenza h1n1","pandemic influenza"]},

    # ── Renal / Hepatic / Respiratory ─────────────────────────────────────────
    {"name": "Renal Diseases Complicating Pregnancy",
     "group": "Renal", "color": "#1E40AF",
     "keywords": ["renal disease","renal diseases complicating","kidney disease",
                  "renal failure","chronic kidney","ckd","nephropathy","nephrotic",
                  "glomerulonephritis"]},
    {"name": "Jaundice / Hepatitis B",
     "group": "Hepatic", "color": "#0E7490",
     "keywords": ["jaundice","hepatitis b","hepatitis c","viral hepatitis",
                  "hepatitis","obstetric cholestasis","intrahepatic cholestasis"]},
    {"name": "Respiratory Disorders in Pregnancy",
     "group": "Respiratory", "color": "#0369A1",
     "keywords": ["asthma","bronchial asthma","respiratory disorder","copd",
                  "respiratory diseases","bronchitis","respiratory"]},

    # ── Autoimmune / Other ────────────────────────────────────────────────────
    {"name": "Auto Immune Diseases",
     "group": "Autoimmune", "color": "#64748B",
     "keywords": ["autoimmune","auto immune","rheumatoid arthritis","sle","lupus",
                  "systemic lupus","anti-phospholipid","antiphospholipid"]},

    # ── Mental Health ─────────────────────────────────────────────────────────
    {"name": "Mental Disorder Complicating Pregnancies",
     "group": "Mental", "color": "#4C1D95",
     "keywords": ["mental disorder","mental disorder complicating","mental health",
                  "anxiety disorder","depression","psychiatric","psychosis",
                  "schizophrenia","bipolar"]},
]

import re as _re

def _extract_hb_value(row):
    """Parse numeric HB value from the hb column or raw text."""
    hb_str = str(row.get("hb", "") or "")
    m = _re.search(r"([0-9]+\.?[0-9]*)", hb_str)
    if m:
        try:
            v = float(m.group(1))
            if 3.0 < v < 20.0:   # sanity range for HB
                return v
        except Exception:
            pass
    raw = str(row.get("high_risk_raw", "") or "").lower()
    m = _re.search(r"hb[:\s\-\.]*([0-9]+\.?[0-9]*)", raw)
    if m:
        try:
            v = float(m.group(1))
            if 3.0 < v < 20.0:
                return v
        except Exception:
            pass
    return None

def _anemia_bucket(raw, hb_val):
    """Return canonical anemia sub-category string, or None if no anemia."""
    has_anemia = "anemia" in raw or "anaemia" in raw
    if not has_anemia:
        return None
    # Text-based severity (most reliable)
    if "severe" in raw:
        return "Severe Anemia"
    if "moderate" in raw:
        return "Moderate Anemia"
    if "mild" in raw:
        return "Mild Anemia"
    # HB-based severity
    if hb_val is not None:
        if hb_val < 7.0:
            return "Severe Anaemia (< 7 gm)"
        if hb_val < 10.0:
            return "Moderate Anaemia"
        if hb_val < 11.0:
            return "Mild Anaemia"
    return "Anaemia (Unclassified)"

def _get_canonical_factors(row):
    """Return list of canonical factor names that apply to this patient row."""
    raw = str(row.get("high_risk_raw", "") or "").lower().strip()
    if not raw or raw in ("nan", "nil", "-"):
        return []

    hb_val  = _extract_hb_value(row)
    matched = []
    anemia_done = False

    for fdef in CANONICAL_FACTORS:
        name = fdef["name"]
        sev  = fdef.get("anemia_severity")

        if sev is not None:
            # Anemia sub-classification — one bucket per patient
            if anemia_done:
                continue
            bucket = _anemia_bucket(raw, hb_val)
            if bucket is None:
                continue
            # Does this fdef's severity match the bucket?
            bucket_matches = {
                "severe":        "Severe Anaemia (< 7 gm)",
                "moderate":      "Moderate Anaemia",
                "mild":          "Mild Anaemia",
                "unclassified":  "Anaemia (Unclassified)",
            }
            if bucket == bucket_matches.get(sev):
                matched.append(name)
                anemia_done = True
            continue

        # Standard keyword match
        if any(kw in raw for kw in fdef["keywords"]):
            matched.append(name)

    return matched


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
        _cache["df"] = pd.DataFrame()
        _cache["ts"] = datetime.datetime.now().isoformat()
        return
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

        # ── Build normalised columns (_normalise_col is case+strip tolerant) ──
        row_no       = _normalise_col(raw, ["S.NO", "S.NO.", "S NO", "SNO", "SL NO", "-"])
        uphc_name    = _normalise_col(raw, ["UPHC NAME", "UPHC"])
        hsc_name     = _normalise_col(raw, ["HSC NAME", "HSC", "SECTOR", "sector"])
        res_type     = _normalise_col(raw, ["RESIDENT/VISITOR", "RESIDENT / VISITORS",
                                            "RESIDENT / VISITOR", "RESIDENT"])
        rch_id       = _normalise_col(raw, ["RCH ID", "RCH  ID"])
        mother_name  = _normalise_col(raw, ["MOTHER NAME AND ADDRESS", "NAME AND ADD",
                                            "NAME AND ADDRESS", "MOTHER NAME",
                                            "MOTHERNAME", "NAME AND AD", "NAME"])
        # KURUCHI uses PHONE NO; some sheets use MOBILE NO
        cell_no      = _normalise_col(raw, ["CELL NO", "PHONE NO", "MOBILE NO",
                                            "MOBILE NUMBER", "MOBILE", "PHONE"])
        husband      = _normalise_col(raw, ["HUSBAND NAME", "HUSBAND"])
        # KURUCHI has "GRAVIDA  PARA" as combined column
        gravida      = _normalise_col(raw, ["GRAVIDA", "GRAVIDA  PARA", "GRAVIDA PARA"])
        para         = _normalise_col(raw, ["PARA"])
        lmp          = _normalise_col(raw, ["LMP"])
        edd          = _normalise_col(raw, ["EDD"])
        # KURUCHI uses WKS
        weeks        = _normalise_col(raw, ["WEEKS", "WKS", "weeks"])
        # PODANUR has typo "HIGH RISH"; RATHINAPURI header is garbled
        high_risk    = _normalise_col(raw, ["HIGH RISK", "HIGH RISK ", "HIGH RISH",
                                            "HIGH RISK FACTORS"])
        height       = _normalise_col(raw, ["HEIGHT"])
        weight       = _normalise_col(raw, ["WT", "WEIGHT"])
        bp           = _normalise_col(raw, ["BP", "BLOOD PRESSURE"])
        hb           = _normalise_col(raw, ["HB", "HAEMOGLOBIN", "HEMOGLOBIN"])
        gct          = _normalise_col(raw, ["GCT"])
        ppbs         = _normalise_col(raw, ["PPBS", "FBS/PPBS", "FBS/PPBS ", "FBS"])
        # ECG/ECO is another variation found in vadavalli and KALVEERAMPALAYAM
        echo         = _normalise_col(raw, ["ECHO/ECG", "ECG/ECHO", "ECG/ECO", "ECHO"])
        usg          = _normalise_col(raw, ["USG"])
        tsh          = _normalise_col(raw, ["TSH"])
        # BLLOD GROUP is a typo in 49 goundampalayam
        blood_grp    = _normalise_col(raw, ["BLOOD GROUP", "BLLOD GROUP"])
        # AFB SP is a variation in one sheet
        sputum       = _normalise_col(raw, ["SPUTUM AFB", "AFB SP", "SPUTUM"])
        urine        = _normalise_col(raw, ["URINE ROUTINE", "URINE RE", "URINE"])
        # BIRTH  PLAN (double space) and BIRTHPLAN (no space) found in some sheets
        birth_plan   = _normalise_col(raw, ["BIRTH PLAN", "BIRTH  PLAN", "BIRTHPLAN",
                                            "REGULAR FOLLOW UP"])
        # REFERAL (misspelled in 3 sheets)
        referral     = _normalise_col(raw, ["REFERRAL DETAILS", "REFERAL DETAILS",
                                            "REFERAL", "REMARKS"])
        last_visit   = _normalise_col(raw, ["UPHC LAST VISIT DATE", "LAST VISIT DATE"])
        action_taken = _normalise_col(raw, ["UPHC ACTION TAKEN \n(1st follow up)",
                                            "UPHC ACTION TAKEN", "ACTION TAKEN",
                                            "UPHC ACTION TAKEN \n(1ST FOLLOW UP)"])
        call_date    = _normalise_col(raw, ["CALL DATE", "CALL DT"])
        next_visit   = _normalise_col(raw, ["NEXT VISIT DATE \nONLY FILL BY UPHC",
                                            "NEXT VISIT DATE", "NEXT VISIT"])
        uphc_response   = _normalise_col(raw, ["UPHC RESPONSE AS PER NEXT VISIT",
                                               "UPHC RESPONSE"])
        next_plan       = _normalise_col(raw, ["NEXT PLAN OF VISIT PLACE AND TIME ",
                                               "NEXT PLAN OF VISIT PLACE AND TIME",
                                               "PLAN OF NEXT VISIT DATE AND PLACE",
                                               "PLAN OF NEXT VISIT DATE & PLACE "])
        # Dedicated delivery outcome columns (varies by PHC)
        # M,,, is a garbled header found in Singanallur-type sheets with delivery info
        delivery_outcome_col = _normalise_col(raw, [
            "DELIVERY OUTCOME", "DELIVERY DETAILS", "DELIVARY DETAILS",
            "DELIVERY OUTCOME ", " DELIVERY OUTCOME", "M,,,",
        ])

        for i in range(len(raw)):
            hr_text  = high_risk.iloc[i]
            score, factors, category = _parse_risk(hr_text)
            name_raw = mother_name.iloc[i]
            # Skip header-repeat rows
            if name_raw.upper() in ("NAME AND ADD", "MOTHER NAME AND ADDRESS",
                                    "NAME AND ADDRESS", "MOTHER NAME", "MOTHERNAME",
                                    "NAME AND AD", "NAME"):
                continue
            # Skip genuinely empty rows — no name AND no RCH ID AND no EDD
            # (keeps mothers with missing name but real data like RCH/EDD)
            rch_val_raw = str(rch_id.iloc[i]).strip()
            edd_val_raw = str(edd.iloc[i]).strip()
            if (not name_raw and
                    rch_val_raw in ('', 'nan', 'NaN') and
                    edd_val_raw in ('', 'nan', 'NaN')):
                continue
            # Extract name vs address (often combined with comma or newline)
            name_parts = re.split(r",|W/O|w/o|\n", name_raw, maxsplit=1)
            clean_name = name_parts[0].strip() if name_parts else name_raw
            if not clean_name:
                clean_name = f"Entry #{row_no.iloc[i]}" if str(row_no.iloc[i]).strip() not in ("", "nan") else f"Row {i+1}"
            address    = name_raw[len(clean_name):].strip().lstrip(",").strip()

            edd_val = edd.iloc[i]
            # EDD sometimes has extra text like "22-03-26 / Scan Edd 22.04.26"
            edd_clean = re.split(r"/|Scan|scan", edd_val)[0].strip()
            days_left = _days_to_edd(edd_clean)

            # Determine delivery status — check dedicated outcome column first
            del_outcome_val = delivery_outcome_col.iloc[i]
            delivery_info   = del_outcome_val or (next_plan.iloc[i] if next_plan.iloc[i] else uphc_response.iloc[i])
            is_delivered    = bool(del_outcome_val.strip()) or any(
                                kw in str(delivery_info).upper()
                                for kw in ["DELIVERED", "DOD", "LSCS", "NVD", "FCH", "MCH"])

            # Parse actual delivery date — prefer dedicated outcome col, fall back to uphc_response
            uphc_resp_val = del_outcome_val or uphc_response.iloc[i]
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
                "para":         para.iloc[i],
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


@app.route("/api/upload-excel", methods=["POST"])
def upload_excel():
    role = request.form.get("role", "")
    if role not in ("CHO", "DMCHO"):
        return jsonify({"error": "Only CHO or DMCHO can upload data"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    if not f.filename.endswith((".xlsx", ".xls")):
        return jsonify({"error": "Only Excel files (.xlsx / .xls) are accepted"}), 400

    # Save to EXCEL_PATH (overwrites current data source)
    tmp = EXCEL_PATH + ".upload_tmp"
    try:
        f.save(tmp)
        # Quick sanity check — must be a valid Excel file
        xl = pd.ExcelFile(tmp)
        if len(xl.sheet_names) < 5:
            os.remove(tmp)
            return jsonify({"error": "File appears invalid — fewer than 5 sheets found"}), 400
        os.replace(tmp, EXCEL_PATH)
    except Exception as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        return jsonify({"error": f"Upload failed: {e}"}), 500

    # Reload data
    _cache["df"] = None
    _sync_state["syncing"] = True
    try:
        load_excel()
        _sync_state["last_sync_time"] = datetime.datetime.now().isoformat()
        _sync_state["sync_count"]    += 1
        _sync_state["last_mtime"]     = _get_file_mtime()
    finally:
        _sync_state["syncing"] = False

    records = len(_cache["df"]) if _cache["df"] is not None else 0
    return jsonify({
        "success":  True,
        "records":  records,
        "sheets":   len(xl.sheet_names),
        "ts":       _cache["ts"],
        "message":  f"Data updated — {records:,} mother records loaded from {len(xl.sheet_names)} PHC sheets",
    })

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
    risk_factor = request.args.get("risk_factor", "").strip()
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
        # Support both legacy raw keywords AND canonical factor names
        df = df[df.apply(lambda row: risk_factor in _get_canonical_factors(row), axis=1)]
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

@app.route("/api/deo-performance")
def deo_performance():
    dates  = DEO_PERFORMANCE["dates"]
    deos   = DEO_PERFORMANCE["deos"]
    totals = {d: sum(deo["calls"].get(d, 0) for deo in deos) for d in dates}
    return jsonify({
        "month":  DEO_PERFORMANCE["month"],
        "dates":  dates,
        "deos":   deos,
        "totals": totals,
    })

@app.route("/api/alerts")
def alerts():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    today= datetime.date.today()

    # EDD categories — non-overlapping
    active = df[df["is_delivered"] == False]
    due_today  = active[active["days_to_edd"] == 0]
    due_3days  = active[active["days_to_edd"].between(1, 3)]
    due_4to7   = active[active["days_to_edd"].between(4, 7)]
    overdue    = active[(active["days_to_edd"].notna()) & (active["days_to_edd"] < 0)]
    # Legacy broad bucket (for counts)
    due_soon   = active[active["days_to_edd"].between(0, 7)]
    # Missing phone
    no_phone   = df[df["cell_no"].str.strip() == ""]

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
        alert_list(due_today,  "Due Today",             "P1") +
        alert_list(due_3days,  "Due Next 3 Days",       "P1") +
        alert_list(due_4to7,   "Delivery Due ≤7 Days",  "P1") +
        alert_list(overdue,    "Overdue EDD",            "P2") +
        alert_list(no_phone,   "No Contact Number",      "P3")
    )[:500]

    # ── Calls data for non-connected analysis ─────────────────────────────
    calls_j      = _load_json(CALLS_FILE)
    today_str    = today.strftime("%Y-%m-%d")
    NON_CONNECTED = {"No Response", "Switched Off", "Busy", "Wrong Number"}

    # HRT non-connected call alerts (≥5 non-connected today)
    hrt_nc_alerts = []
    for hrt_code, grp in df.groupby("hrt_code"):
        hrt_name  = grp["hrt_name"].iloc[0]
        nc_count  = 0
        stat_bkdn = {}
        for uid in grp["uid"].tolist():
            hist       = calls_j.get(uid, [])
            today_hist = [c for c in hist if c.get("date") == today_str]
            if today_hist:
                s = today_hist[-1].get("status", "")
                if s in NON_CONNECTED:
                    nc_count += 1
                    stat_bkdn[s] = stat_bkdn.get(s, 0) + 1
        if nc_count >= 5:
            hrt_nc_alerts.append({
                "hrt_code":         hrt_code,
                "hrt_name":         hrt_name,
                "not_connected":    nc_count,
                "status_breakdown": stat_bkdn,
                "total_mothers":    int(len(grp)),
                "phcs":             sorted(grp["phc_display"].unique().tolist()),
            })
    hrt_nc_alerts.sort(key=lambda x: x["not_connected"], reverse=True)

    # Mothers with 5+ cumulative non-connected attempts
    uid_set = set(df["uid"].tolist())
    nc_5x   = []
    for uid, hist in calls_j.items():
        if uid not in uid_set:
            continue
        nc_total = sum(1 for c in hist if c.get("status") in NON_CONNECTED)
        if nc_total >= 5:
            row = df[df["uid"] == uid]
            if not row.empty:
                r = row.iloc[0]
                nc_5x.append({
                    "uid":         uid,
                    "mother_name": r["mother_name"],
                    "phc_display": r["phc_display"],
                    "hrt_name":    r["hrt_name"],
                    "cell_no":     r["cell_no"],
                    "nc_count":    nc_total,
                    "edd":         str(r.get("edd", "")),
                    "days_to_edd": r.get("days_to_edd"),
                })
    nc_5x.sort(key=lambda x: x["nc_count"], reverse=True)

    return jsonify({
        "total":         len(all_alerts),
        "due_today":     int(len(due_today)),
        "due_3days":     int(len(due_3days)),
        "due_soon":      int(len(due_soon)),
        "overdue":       int(len(overdue)),
        "nc_5x_count":   len(nc_5x),
        "hrt_nc_alerts": hrt_nc_alerts,
        "nc_5x_mothers": nc_5x[:100],
        "alerts":        all_alerts,
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


@app.route("/api/phc/ai-insights")
def phc_ai_insights():
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    today = datetime.date.today()

    insights = []
    for phc_key, group in df.groupby("phc_key"):
        hrt_info   = PHC_MAP.get(phc_key, {})
        total      = len(group)
        if total == 0:
            continue

        critical   = int((group["risk_category"] == "Critical").sum())
        very_h     = int((group["risk_category"] == "Very High").sum())
        high       = int((group["risk_category"] == "High").sum())
        delivered  = int(group["is_delivered"].sum())
        due_soon   = int((group["days_to_edd"].between(0, 7)).sum())
        due_14     = int((group["days_to_edd"].between(0, 14)).sum())
        no_phone   = int((group["cell_no"].str.strip() == "").sum())
        overdue    = int((group["days_to_edd"] < 0).sum())
        risk_pct   = round((critical + very_h + high) / total * 100, 1)

        # ── AI Risk Score (0–100) ────────────────────────────────────────────
        score  = risk_pct                          * 0.35   # max 35
        score += (due_soon / total * 100)          * 0.25   # max 25
        score += (no_phone / total * 100)          * 0.20   # max 20
        score += (overdue  / total * 100)          * 0.20   # max 20
        score  = round(min(100, score), 1)

        # ── Grade ────────────────────────────────────────────────────────────
        if   score < 20: grade = "A"
        elif score < 40: grade = "B"
        elif score < 60: grade = "C"
        else:            grade = "D"

        # ── Alert type ───────────────────────────────────────────────────────
        if   due_14 >= 8:                         alert = "Delivery Surge"
        elif no_phone >= 5 and risk_pct > 35:     alert = "Intervention Needed"
        elif risk_pct > 50 or overdue >= 5:       alert = "At-Risk"
        else:                                      alert = "Stable"

        # ── Top risk factors for this PHC ────────────────────────────────────
        factor_counts = {}
        for _, row in group.iterrows():
            for f in _get_canonical_factors(row):
                factor_counts[f] = factor_counts.get(f, 0) + 1
        top_factors = sorted(factor_counts.items(), key=lambda x: x[1], reverse=True)[:3]

        # ── AI-generated summary (template-based, real data) ─────────────────
        phc_name = hrt_info.get("phc_display", phc_key)
        hrt_name = hrt_info.get("hrt_name", "")

        lines = []

        # Opening sentence
        if grade == "A":
            lines.append(f"{phc_name} is currently stable with {total} registered mothers and a low intervention burden.")
        elif grade == "B":
            lines.append(f"{phc_name} has {total} mothers under monitoring with moderate risk activity requiring routine follow-up.")
        elif grade == "C":
            lines.append(f"{phc_name} is showing elevated risk patterns across {total} mothers — active intervention is advised.")
        else:
            lines.append(f"{phc_name} is a high-priority PHC with {total} mothers and critical risk indicators that need immediate attention.")

        # Risk detail
        if critical + very_h > 0:
            lines.append(f"{critical + very_h} mother{'s' if critical+very_h>1 else ''} are in the Critical or Very High risk tier ({risk_pct}% overall risk burden).")
        elif risk_pct > 0:
            lines.append(f"Overall risk burden stands at {risk_pct}%, primarily in the High category.")

        # Delivery urgency
        if due_soon > 0:
            lines.append(f"{due_soon} mother{'s are' if due_soon>1 else ' is'} expected to deliver within 7 days — priority contact required.")
        if overdue > 0:
            lines.append(f"{overdue} mother{'s have' if overdue>1 else ' has'} passed their EDD and {'are' if overdue>1 else 'is'} awaiting delivery confirmation.")

        # Unreachable
        if no_phone >= 5:
            lines.append(f"{no_phone} mothers have no registered phone number — field visits are essential for these cases.")
        elif no_phone > 0:
            lines.append(f"{no_phone} mother{'s have' if no_phone>1 else ' has'} no phone contact and {'require' if no_phone>1 else 'requires'} field follow-up.")

        # Top factors
        if top_factors:
            factor_str = ", ".join(f"{f} ({c})" for f, c in top_factors)
            lines.append(f"Dominant risk conditions: {factor_str}.")

        # HRT recommendation
        if alert in ("Delivery Surge", "Intervention Needed", "At-Risk"):
            lines.append(f"Assigned HRT ({hrt_name}) should prioritise this PHC in today's workflow.")

        summary = " ".join(lines)

        insights.append({
            "phc_key":     phc_key,
            "phc_display": phc_name,
            "hrt_code":    hrt_info.get("hrt_code", ""),
            "hrt_name":    hrt_name,
            "total":       total,
            "risk_score":  score,
            "grade":       grade,
            "alert":       alert,
            "risk_pct":    risk_pct,
            "due_soon":    due_soon,
            "due_14":      due_14,
            "no_phone":    no_phone,
            "overdue":     overdue,
            "critical":    critical,
            "very_high":   very_h,
            "high":        high,
            "top_factors": [{"name": f, "count": c} for f, c in top_factors],
            "summary":     summary,
        })

    insights.sort(key=lambda x: x["risk_score"], reverse=True)
    return jsonify(insights)


@app.route("/api/phc/<phc_key>/mothers")
def phc_mothers(phc_key):
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)

    group = df[df["phc_key"] == phc_key]
    if group.empty:
        return jsonify([])

    mothers = []
    for _, row in group.iterrows():
        days = row.get("days_to_edd", None)
        try:
            days = int(days) if days is not None and not pd.isna(days) else None
        except Exception:
            days = None

        hb_raw = row.get("hb", "")
        hb_str = str(hb_raw).strip() if hb_raw and str(hb_raw).strip() not in ("", "nan") else "—"

        mothers.append({
            "uid":            row.get("uid", ""),
            "row_no":         row.get("row_no", ""),
            "mother_name":    row.get("mother_name", ""),
            "cell_no":        str(row.get("cell_no", "")).strip(),
            "husband_name":   str(row.get("husband_name", "")).strip(),
            "address":        str(row.get("address", "")).strip(),
            "edd":            row.get("edd", ""),
            "days_to_edd":    days,
            "weeks":          row.get("weeks", ""),
            "hb":             hb_str,
            "blood_group":    str(row.get("blood_group", "")).strip(),
            "risk_category":  row.get("risk_category", ""),
            "risk_score":     row.get("risk_score", 0),
            "high_risk_raw":  str(row.get("high_risk_raw", "")).strip(),
            "is_delivered":   bool(row.get("is_delivered", False)),
            "delivery_date":  row.get("delivery_date", ""),
            "last_visit_date":str(row.get("last_visit_date", "")).strip(),
            "next_visit_date":str(row.get("next_visit_date", "")).strip(),
            "bp":              str(row.get("bp", "")).strip(),
            "gravida":         str(row.get("gravida", "")).strip(),
            "para":            str(row.get("para", "")).strip(),
            "lmp":             str(row.get("lmp", "")).strip(),
            "height":          str(row.get("height", "")).strip(),
            "weight":          str(row.get("weight", "")).strip(),
            "gct":             str(row.get("gct", "")).strip(),
            "ppbs":            str(row.get("ppbs", "")).strip(),
            "tsh":             str(row.get("tsh", "")).strip(),
            "echo_ecg":        str(row.get("echo_ecg", "")).strip(),
            "usg":             str(row.get("usg", "")).strip(),
            "sputum_afb":      str(row.get("sputum_afb", "")).strip(),
            "urine_routine":   str(row.get("urine_routine", "")).strip(),
            "birth_plan":      str(row.get("birth_plan", "")).strip(),
            "action_taken":    str(row.get("action_taken", "")).strip(),
            "uphc_response":   str(row.get("uphc_response", "")).strip(),
            "delivery_info":   str(row.get("delivery_info", "")).strip(),
            "referral":        str(row.get("referral", "")).strip(),
        })

    # Sort: overdue first, then by days_to_edd ascending, delivered last
    def sort_key(m):
        d = m["days_to_edd"]
        if m["is_delivered"]:
            return (2, 0)
        if d is None:
            return (1, 9999)
        if d < 0:
            return (0, d)
        return (1, d)

    mothers.sort(key=sort_key)
    return jsonify(mothers)


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

        deo_c      = _deo_calls_for(hrt_code, date_filter or today_str)
        deo_source = False
        # Use DEO record when no system calls are logged for this date
        if deo_c is not None and attempted == 0:
            connected  = deo_c
            attempted  = deo_c
            pending    = max(0, total_mothers - deo_c)
            deo_source = True
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
            "deo_calls":          deo_c,
            "deo_source":         deo_source,
        })

    result.sort(key=lambda x: x["hrt_code"])
    return jsonify({"date": date_filter or today_str, "hrts": result, "total_hrts": len(result)})


@app.route("/api/hrt-weekly-performance")
def hrt_weekly_performance():
    """Per-HRT weekly call activity — Mon–Sun of current week, daily breakdown."""
    role = request.args.get("role", "DMCHO")
    df   = filter_by_role(get_data(), role)
    calls_j = _load_json(CALLS_FILE)

    today      = datetime.date.today()
    week_start = today - datetime.timedelta(days=today.weekday())          # Monday
    week_dates = [week_start + datetime.timedelta(days=i) for i in range(7)]
    today_str  = today.strftime("%Y-%m-%d")
    NON_CONNECTED = {"No Response", "Switched Off", "Busy", "Wrong Number"}

    result = []
    for hrt_code, grp in df.groupby("hrt_code"):
        hrt_name      = grp["hrt_name"].iloc[0]
        uids          = grp["uid"].tolist()
        total_mothers = len(uids)

        daily = []
        week_attempted = week_connected = week_not_connected = 0

        for d in week_dates:
            date_str  = d.strftime("%Y-%m-%d")
            attempted = connected = not_connected = 0
            for uid in uids:
                hist      = calls_j.get(uid, [])
                day_calls = [c for c in hist if c.get("date") == date_str]
                if day_calls:
                    s = day_calls[-1].get("status", "")
                    attempted += 1
                    if s == "Connected":
                        connected += 1
                    elif s in NON_CONNECTED:
                        not_connected += 1
            daily.append({
                "date":          date_str,
                "day":           d.strftime("%a"),
                "is_today":      date_str == today_str,
                "is_future":     d > today,
                "attempted":     attempted,
                "connected":     connected,
                "not_connected": not_connected,
                "deo_calls":     _deo_calls_for(hrt_code, date_str),
            })
            week_attempted     += attempted
            week_connected     += connected
            week_not_connected += not_connected

        result.append({
            "hrt_code":           hrt_code,
            "hrt_name":           hrt_name,
            "phcs":               sorted(grp["phc_display"].unique().tolist()),
            "total_mothers":      total_mothers,
            "daily":              daily,
            "week_attempted":     week_attempted,
            "week_connected":     week_connected,
            "week_not_connected": week_not_connected,
        })

    result.sort(key=lambda x: x["hrt_code"])
    return jsonify({
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end":   (week_start + datetime.timedelta(days=6)).strftime("%Y-%m-%d"),
        "hrts":       result,
    })


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
        ds    = int(grp["days_to_edd"].between(0, 7).sum())
        hrt   = grp["hrt_code"].iloc[0] if len(grp) > 0 else ""
        hrt_n = grp["hrt_name"].iloc[0] if len(grp) > 0 else ""
        phc_data.append({"phc": phc, "hrt": hrt, "hrt_name": hrt_n,
                         "total": total, "high_risk": hr, "critical": crit, "very_high": vh,
                         "due_soon": ds})
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
    """Return canonical risk factor counts with per-tier breakdown."""
    role = request.args.get("role", "DMCHO")
    df = filter_by_role(get_data(), role)
    if df is None or df.empty:
        return jsonify([])

    from collections import defaultdict
    TIERS = ["Critical", "Very High", "High", "Moderate", "Low"]
    factor_total      = defaultdict(int)
    factor_by_tier    = defaultdict(lambda: defaultdict(int))

    for _, row in df.iterrows():
        cat = row.get("risk_category", "Low")
        for fname in _get_canonical_factors(row):
            factor_total[fname]          += 1
            factor_by_tier[fname][cat]   += 1

    # Return in display order of CANONICAL_FACTORS (skip zero-count factors)
    result = []
    seen   = set()
    for fdef in CANONICAL_FACTORS:
        name = fdef["name"]
        if name in seen or factor_total.get(name, 0) == 0:
            continue
        seen.add(name)
        result.append({
            "factor":      name,
            "group":       fdef["group"],
            "color":       fdef["color"],
            "total":       factor_total[name],
            "tier_counts": {t: factor_by_tier[name].get(t, 0) for t in TIERS},
        })

    result.sort(key=lambda x: -x["total"])
    return jsonify(result)


# ── Activity Log DB (SQLite) ───────────────────────────────────────────────

def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with _db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS call_logs (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            mother_id    TEXT NOT NULL,
            mother_name  TEXT,
            phc          TEXT,
            hrt_user     TEXT NOT NULL,
            call_date    TEXT NOT NULL,
            call_time    TEXT NOT NULL,
            outcome      TEXT NOT NULL,
            notes        TEXT
        );
        CREATE TABLE IF NOT EXISTS status_updates (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            mother_id        TEXT NOT NULL,
            mother_name      TEXT,
            phc              TEXT,
            hrt_user         TEXT NOT NULL,
            new_status       TEXT NOT NULL,
            notes            TEXT,
            submitted_at     TEXT NOT NULL,
            approved_by      TEXT,
            approved_at      TEXT,
            is_approved      INTEGER DEFAULT 0,
            rejection_reason TEXT
        );
        """)

# ── Activity endpoints ─────────────────────────────────────────────────────

@app.route("/api/calls/log", methods=["POST"])
def log_call():
    b = request.get_json() or {}
    mother_id   = b.get("mother_id", "").strip()
    hrt_user    = b.get("hrt_user", "").strip()
    outcome     = b.get("outcome", "").strip()
    notes       = b.get("notes", "").strip()
    if not (mother_id and hrt_user and outcome):
        return jsonify({"error": "mother_id, hrt_user and outcome are required"}), 400

    df = get_data()
    row = df[df["uid"] == mother_id] if "uid" in df.columns else pd.DataFrame()
    mother_name = str(row.iloc[0].get("mother_name", "")) if len(row) else ""
    phc         = str(row.iloc[0].get("phc_key", ""))     if len(row) else ""

    now = datetime.datetime.now()
    with _db() as conn:
        cur = conn.execute(
            "INSERT INTO call_logs (mother_id,mother_name,phc,hrt_user,call_date,call_time,outcome,notes) VALUES (?,?,?,?,?,?,?,?)",
            (mother_id, mother_name, phc, hrt_user, now.strftime("%Y-%m-%d"), now.isoformat(timespec="seconds"), outcome, notes)
        )
        new_id = cur.lastrowid
    return jsonify({"success": True, "id": new_id})

@app.route("/api/calls/today")
def calls_today():
    role = request.args.get("role", "").upper()
    date = request.args.get("date", datetime.date.today().isoformat())
    with _db() as conn:
        if role in ("CHO", "DMCHO"):
            rows = conn.execute("SELECT * FROM call_logs WHERE call_date=? ORDER BY call_time DESC", (date,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM call_logs WHERE call_date=? AND hrt_user=? ORDER BY call_time DESC", (date, role)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/calls/history/<uid>")
def app_call_history(uid):
    with _db() as conn:
        rows = conn.execute("SELECT * FROM call_logs WHERE mother_id=? ORDER BY call_time DESC LIMIT 30", (uid,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/tasks/today")
def tasks_today():
    role = request.args.get("role", "").upper()
    today = datetime.date.today()
    today_str = today.isoformat()

    df = get_data_for_role(role)
    if df is None or df.empty:
        return jsonify([])

    date_col = None
    for c in ["next_followup_date", "followup_date", "next_visit", "edd"]:
        if c in df.columns:
            date_col = c
            break
    if not date_col:
        return jsonify([])

    def parse_date(v):
        try:
            if pd.isna(v): return None
            if isinstance(v, (datetime.date, datetime.datetime)): return v if isinstance(v, datetime.date) else v.date()
            return datetime.date.fromisoformat(str(v)[:10])
        except: return None

    df["_due"] = df[date_col].apply(parse_date)
    due_today = df[df["_due"] == today]

    with _db() as conn:
        logged = conn.execute("SELECT mother_id, outcome, notes, call_time FROM call_logs WHERE call_date=? AND hrt_user=?", (today_str, role)).fetchall()
    logged_map = {r["mother_id"]: dict(r) for r in logged}

    result = []
    name_col = next((c for c in ["mother_name","name","patient_name"] if c in df.columns), None)
    phc_col  = next((c for c in ["phc_key","phc","phc_name"] if c in df.columns), None)
    ph_col   = next((c for c in ["phone","mobile","contact","phone_number"] if c in df.columns), None)
    uid_col  = "uid" if "uid" in df.columns else None

    for _, r in due_today.iterrows():
        uid_val = str(r[uid_col]) if uid_col else ""
        log = logged_map.get(uid_val, {})
        result.append({
            "uid":      uid_val,
            "name":     str(r[name_col]) if name_col else "",
            "phc":      str(r[phc_col])  if phc_col  else "",
            "phone":    str(r[ph_col])   if ph_col   else "",
            "due_date": today_str,
            "called":   uid_val in logged_map,
            "outcome":  log.get("outcome"),
            "notes":    log.get("notes"),
            "call_time":log.get("call_time"),
        })

    result.sort(key=lambda x: (x["called"], x["name"]))
    return jsonify(result)

@app.route("/api/status/update", methods=["POST"])
def submit_status_update():
    b = request.get_json() or {}
    mother_id  = b.get("mother_id", "").strip()
    hrt_user   = b.get("hrt_user", "").strip()
    new_status = b.get("new_status", "").strip()
    notes      = b.get("notes", "").strip()
    if not (mother_id and hrt_user and new_status):
        return jsonify({"error": "mother_id, hrt_user and new_status required"}), 400

    df = get_data()
    row = df[df["uid"] == mother_id] if "uid" in df.columns else pd.DataFrame()
    mother_name = str(row.iloc[0].get("mother_name", "")) if len(row) else ""
    phc         = str(row.iloc[0].get("phc_key", ""))     if len(row) else ""

    now = datetime.datetime.now().isoformat(timespec="seconds")
    with _db() as conn:
        cur = conn.execute(
            "INSERT INTO status_updates (mother_id,mother_name,phc,hrt_user,new_status,notes,submitted_at) VALUES (?,?,?,?,?,?,?)",
            (mother_id, mother_name, phc, hrt_user, new_status, notes, now)
        )
        new_id = cur.lastrowid
    return jsonify({"success": True, "id": new_id})

@app.route("/api/approvals")
def get_approvals():
    with _db() as conn:
        pending = conn.execute("SELECT * FROM status_updates WHERE is_approved=0 ORDER BY submitted_at DESC").fetchall()
        recent  = conn.execute("SELECT * FROM status_updates WHERE is_approved!=0 ORDER BY approved_at DESC LIMIT 30").fetchall()
    return jsonify({"pending": [dict(r) for r in pending], "recent": [dict(r) for r in recent]})

@app.route("/api/approvals/<int:aid>/approve", methods=["POST"])
def approve_status(aid):
    b = request.get_json() or {}
    approved_by = b.get("approved_by", "CHO").strip()
    now = datetime.datetime.now().isoformat(timespec="seconds")
    with _db() as conn:
        conn.execute("UPDATE status_updates SET is_approved=1, approved_by=?, approved_at=? WHERE id=?", (approved_by, now, aid))
    return jsonify({"success": True})

@app.route("/api/approvals/<int:aid>/reject", methods=["POST"])
def reject_status(aid):
    b = request.get_json() or {}
    rejected_by = b.get("rejected_by", "CHO").strip()
    reason      = b.get("reason", "").strip()
    now = datetime.datetime.now().isoformat(timespec="seconds")
    with _db() as conn:
        conn.execute("UPDATE status_updates SET is_approved=-1, approved_by=?, approved_at=?, rejection_reason=? WHERE id=?", (rejected_by, now, reason, aid))
    return jsonify({"success": True})

@app.route("/api/daily-summary")
def daily_summary():
    date = request.args.get("date", datetime.date.today().isoformat())
    with _db() as conn:
        rows = conn.execute(
            "SELECT hrt_user, outcome, COUNT(*) as cnt FROM call_logs WHERE call_date=? GROUP BY hrt_user, outcome",
            (date,)
        ).fetchall()
        pending_count = conn.execute("SELECT COUNT(*) FROM status_updates WHERE is_approved=0").fetchone()[0]
    summary = {}
    for r in rows:
        u = r["hrt_user"]
        if u not in summary:
            summary[u] = {"total": 0, "contacted": 0, "unreachable": 0, "no_answer": 0, "busy": 0}
        summary[u]["total"]          += r["cnt"]
        summary[u][r["outcome"].lower().replace(" ", "_")] = r["cnt"]
    return jsonify({"by_hrt": summary, "pending_approvals": pending_count, "date": date})

def get_data_for_role(role):
    df = get_data()
    if df is None or df.empty: return df
    if role in ("CHO", "DMCHO"): return df
    user = next((u for u in USERS.values() if u.get("role") == role), None)
    if not user: return pd.DataFrame()
    allowed_phcs = user.get("phcs", [])
    if "phc_key" not in df.columns: return pd.DataFrame()
    return df[df["phc_key"].isin(allowed_phcs)]

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
    n = len(_cache["df"]) if _cache.get("df") is not None else 0
    print(f"Loaded {n} records")
    _sync_thread = threading.Thread(
        target=_auto_sync_worker, daemon=True, name="ExcelAutoSync"
    )
    _sync_thread.start()
    init_db()
    print(f"Activity DB: {DB_PATH}")
    print(f"Auto-sync : ON")
    print(f"Open      : http://localhost:{PORT}")
    print("Flask ready on", PORT)
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)
