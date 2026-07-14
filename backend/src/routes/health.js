import { Router } from 'express';
import fs from 'fs';
import { EXCEL_PATH } from '../config.js';
import { getData, cache } from '../excelLoader.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    excel: fs.existsSync(EXCEL_PATH),
    records: getData().length,
    ts: cache.ts,
  });
});

export default router;
