import { Router } from 'express';
import { PHC_MAP } from '../constants.js';
import { getUserRecord, getUserByRoleRecord, recordLoginAttempt } from '../store.js';

const router = Router();

router.post('/login', (req, res) => {
  const body = req.body || {};
  const username = String(body.username || '').trim().toUpperCase();
  const password = String(body.password || '').trim();
  const user = getUserRecord(username);

  if (user && user.password === password) {
    recordLoginAttempt(username, user.role, true);
    console.log(`[LOGIN] username=${username} role=${user.role} name=${user.name} full_access=${user.full_access} phcs=${user.phcs}`);
    return res.json({
      success: true,
      role: user.role,
      name: user.name,
      phcs: user.phcs,
      full_access: user.full_access,
      username,
    });
  }
  recordLoginAttempt(username, user ? user.role : '', false);
  console.log(`[LOGIN FAILED] username=${username}`);
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

/** Return identity of the currently specified role (used for session validation). */
router.get('/me', (req, res) => {
  const role = String(req.query.role || '').toUpperCase();
  const user = getUserByRoleRecord(role);
  if (!user) return res.status(404).json({ error: 'Unknown role' });

  const phcInfo = (user.phcs || []).map((p) => ({
    phc_key: p,
    phc_display: (PHC_MAP[p] || {}).phc_display || p,
  }));
  res.json({
    role: user.role,
    name: user.name,
    full_access: user.full_access,
    phcs: phcInfo,
    hrt_code: user.role,
  });
});

export default router;
