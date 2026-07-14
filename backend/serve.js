/**
 * Single-command launcher: starts the Node backend + localtunnel public URL
 * Run: node serve.js
 */
import { spawn } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const BACKEND = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8001;

console.log('[CCMC] Starting Node backend (loading Excel)...');
const serverProc = spawn(process.execPath, ['server.js'], { cwd: BACKEND, shell: false });
readline.createInterface({ input: serverProc.stdout }).on('line', (line) => console.log(`[API] ${line}`));
readline.createInterface({ input: serverProc.stderr }).on('line', (line) => console.log(`[API] ${line}`));

await new Promise((resolve) => setTimeout(resolve, 4000));

console.log(`[CCMC] Starting localtunnel on port ${PORT}...`);
const ltProc = spawn('npx', ['localtunnel', '--port', String(PORT)], { shell: true });

let tunnelUrl = null;
const ltOut = readline.createInterface({ input: ltProc.stdout });
readline.createInterface({ input: ltProc.stderr }).on('line', (line) => console.log(`[TUN] ${line}`));

for await (const rawLine of ltOut) {
  const line = rawLine.trim();
  console.log(`[TUN] ${line}`);
  const m = /https:\/\/[a-z0-9-]+\.loca\.lt/.exec(line);
  if (m) { tunnelUrl = m[0]; break; }
}

if (tunnelUrl) {
  console.log();
  console.log('='.repeat(60));
  console.log(`  APP LIVE AT: ${tunnelUrl}`);
  console.log();
  console.log('  Credentials:');
  console.log('    DMCHO / dmcho@2026  (Full Access)');
  console.log('    CHO   / cho@2026    (Full Access)');
  console.log('    HRT1  / hrt1@2026  ... HRT8 / hrt8@2026');
  console.log('='.repeat(60));
  console.log();
} else {
  console.log(`[CCMC] Localtunnel URL not captured. App running at http://localhost:${PORT}`);
}

console.log('[CCMC] Press Ctrl+C to stop.');
process.on('SIGINT', () => {
  serverProc.kill();
  ltProc.kill();
  console.log('\n[CCMC] Stopped.');
  process.exit(0);
});
