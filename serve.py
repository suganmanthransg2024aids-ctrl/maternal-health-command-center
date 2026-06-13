"""
Single-command launcher: starts Flask backend + localtunnel public URL
Run: python serve.py
"""
import subprocess, threading, time, sys, os, signal, re

BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(BASE, "backend_maternal")

def stream(proc, prefix):
    for line in proc.stdout:
        print(f"[{prefix}] {line}", end="")

# ── 1. Start Flask ──────────────────────────────────────────────────────────
print("[CCMC] Starting Flask backend (loading Excel – ~6s)...")
flask_proc = subprocess.Popen(
    [sys.executable, "app.py"],
    cwd=BACKEND,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
)
threading.Thread(target=stream, args=(flask_proc, "API"), daemon=True).start()
time.sleep(8)

# ── 2. Start localtunnel ────────────────────────────────────────────────────
print("[CCMC] Starting localtunnel on port 8000...")
lt_proc = subprocess.Popen(
    ["npx", "localtunnel", "--port", "8000"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    text=True, bufsize=1,
    shell=True,
)

tunnel_url = None
for line in lt_proc.stdout:
    line = line.strip()
    print(f"[TUN] {line}")
    m = re.search(r"https://[a-z0-9\-]+\.loca\.lt", line)
    if m:
        tunnel_url = m.group(0)
        break

if tunnel_url:
    print()
    print("=" * 60)
    print(f"  APP LIVE AT: {tunnel_url}")
    print()
    print("  Credentials:")
    print("    DMCHO / dmcho@2024  (Full Access)")
    print("    CHO   / cho@2024    (Full Access)")
    print("    HRT1  / hrt1@2024  ... HRT8 / hrt8@2024")
    print("=" * 60)
    print()
else:
    print("[CCMC] Localtunnel URL not captured. App running at http://localhost:8000")

# Keep both processes alive
print("[CCMC] Press Ctrl+C to stop.")
try:
    lt_proc.wait()
except KeyboardInterrupt:
    flask_proc.terminate()
    lt_proc.terminate()
    print("\n[CCMC] Stopped.")
