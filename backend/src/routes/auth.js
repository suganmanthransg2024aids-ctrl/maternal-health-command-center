import { Router } from 'express';
import { USERS, PHC_MAP } from '../constants.js';

const router = Router();

router.post('/login', (req, res) => {
  const body = req.body || {};
  const username = String(body.username || '').trim().toUpperCase();
  const password = String(body.password || '').trim();
  const user = USERS[username];

  if (user && user.password === password) {
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
  console.log(`[LOGIN FAILED] username=${username}`);
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

/** Return identity of the currently specified role (used for session validation). */
router.get('/me', (req, res) => {
  const role = String(req.query.role || '').toUpperCase();
  const user = Object.values(USERS).find((u) => u.role === role);
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
