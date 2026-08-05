import { parentPort } from 'worker_threads';
import XLSX from 'xlsx';
import fs from 'fs';

XLSX.set_fs(fs);

parentPort.on('message', (filePath) => {
  let currentStep = 'reading file';
  try {
    const wb = XLSX.readFile(filePath, { cellDates: true });
    
    const sheetsData = [];
    currentStep = 'parsing sheets';
    
    for (const sheetName of wb.SheetNames) {
      const sheetKey = sheetName.toUpperCase().trim();
      // Skip obvious non-PHC sheets to save conversion time
      if (sheetKey.startsWith('SHEET') || sheetKey === 'DASHBOARD' || sheetKey === 'SUMMARY') {
        continue;
      }
      
      let rows;
      try {
        currentStep = `converting sheet ${sheetName}`;
        rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
          header: 1, raw: true, defval: '',
        });
      } catch (innerErr) {
        console.error(`[WORKER] Inner sheet conversion error on ${sheetName}:`, innerErr);
        continue;
      }
      
      if (!rows || rows.length === 0) continue;
      
      const headerIdx = rows.findIndex((r) => r.some((v) => (v === null || v === undefined ? '' : String(v).trim()) !== ''));
      if (headerIdx === -1) continue;
      
      sheetsData.push({
        sheetName,
        headerRow: rows[headerIdx],
        dataRows: rows.slice(headerIdx + 1)
      });
    }
    
    parentPort.postMessage({ success: true, sheetsData });
  } catch (err) {
    console.error(`[WORKER] Fatal error at step [${currentStep}]:`, err);
    parentPort.postMessage({ success: false, error: err.message, step: currentStep });
  }
});
