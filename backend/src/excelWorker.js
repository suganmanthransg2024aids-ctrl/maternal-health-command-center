import { parentPort } from 'worker_threads';
import { executeParseAndStore } from './excelLoader.js';

parentPort.on('message', async (msg) => {
  if (msg !== 'start') return;
  try {
    const count = await executeParseAndStore();
    parentPort.postMessage({ success: true, count });
  } catch (err) {
    console.error(`[WORKER] Fatal error:`, err);
    parentPort.postMessage({ success: false, error: err.message });
  }
});
