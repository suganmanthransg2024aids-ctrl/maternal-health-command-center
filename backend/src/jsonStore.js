import fs from 'fs';

/**
 * Crash-safe JSON persistence for the runtime stores (call tracking,
 * follow-ups, patient overrides). All HRT portals write through these
 * concurrently, so the history files must never be lost:
 *
 *  - saveJson writes to a temp file first, keeps the previous good version
 *    as <file>.bak, then atomically renames the temp over the live file —
 *    a crash mid-write can no longer corrupt the store.
 *  - loadJson, on a corrupt/unreadable main file, quarantines it as
 *    <file>.corrupt-<ts> and recovers from <file>.bak instead of silently
 *    returning {} (which the next save would have persisted, erasing
 *    every HRT's records).
 */

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function loadJson(filePath) {
  const main = readJsonFile(filePath);
  if (main !== null) return main;

  // Main file missing or corrupt — quarantine what's there and try the backup.
  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, `${filePath}.corrupt-${Date.now()}`);
      console.log(`[JSONSTORE] Corrupt file quarantined: ${filePath}`);
    } catch { /* best effort */ }
  }
  const bak = readJsonFile(`${filePath}.bak`);
  if (bak !== null) {
    console.log(`[JSONSTORE] Recovered from backup: ${filePath}.bak`);
    return bak;
  }
  return {};
}

export function saveJson(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');

  // Preserve the current good version before replacing it.
  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, `${filePath}.bak`);
    } catch { /* best effort */ }
  }

  try {
    fs.renameSync(tmp, filePath); // atomic on the same volume
  } catch {
    // Windows can briefly lock the target (antivirus/OneDrive) — fall back
    // to copy+delete rather than losing the write.
    fs.copyFileSync(tmp, filePath);
    try { fs.unlinkSync(tmp); } catch { /* best effort */ }
  }
}
