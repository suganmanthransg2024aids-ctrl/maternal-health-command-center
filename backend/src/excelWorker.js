import { parentPort } from 'worker_threads';
import { executeParseAndStore } from './excelLoader.js';

parentPort.on('message', async (msg) => {
  if (msg !== 'start') return;
  try {
    const records = await executeParseAndStore();
    parentPort.postMessage({ success: true, count: records ? records.length : 0 });
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message });
  }
});
