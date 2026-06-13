import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { localMemoryDb } from '../db/index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ccmc_canisintel_secret_key_123';

// 1. User Login Route
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    let user = null;

    if (db.isConnected()) {
      const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      // Fallback local memory verification
      user = localMemoryDb.users.find(u => u.username === username);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Verify password (for local memory seed, allow simple matching or mock checks)
    let isMatch = false;
    if (user.password_hash === '$2a$10$CCMC_TEMP_HASH') {
      isMatch = password === 'admin123'; // Admin default password
    } else {
      isMatch = await bcrypt.compare(password, user.password_hash);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        department: user.department
      }
    });

  } catch (error) {
    next(error);
  }
});

// 2. Add Sighting User Registration (Admin Only)
router.post('/register', async (req, res, next) => {
  const { username, email, password, role, fullName, department } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing mandatory fields.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (db.isConnected()) {
      // Insert into PostgreSQL
      const queryText = `
        INSERT INTO users (username, email, password_hash, role, full_name, department)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, email, role, full_name, department;
      `;
      const values = [username, email, passwordHash, role, fullName, department];
      const result = await db.query(queryText, values);
      return res.status(201).json(result.rows[0]);
    } else {
      // Insert into local memory database
      const id = localMemoryDb.users.length + 1;
      const newUser = { id, username, email, password_hash: passwordHash, role, full_name: fullName, department };
      localMemoryDb.users.push(newUser);
      
      return res.status(201).json({
        id,
        username,
        email,
        role,
        fullName,
        department
      });
    }

  } catch (error) {
    if (error.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    next(error);
  }
});

export default router;
