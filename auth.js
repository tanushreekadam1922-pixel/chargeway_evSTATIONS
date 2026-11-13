'use strict';
const { db, logActivity } = require('../db');
const { signToken, hashPassword, verifyPassword } = require('../lib/auth');
const { HttpError, route, str, optStr } = require('../lib/util');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Simple in-memory brute-force protection: 8 failed attempts / 15 min per IP + email. */
const attempts = new Map();
function throttle(key) {
  const now = Date.now();
  const rec = (attempts.get(key) || []).filter((t) => now - t < 15 * 60000);
  attempts.set(key, rec);
  if (rec.length >= 8) throw new HttpError(429, 'Too many failed attempts. Please try again in 15 minutes.');
}
const fail = (key) => attempts.get(key).push(Date.now());

function session(user) {
  const isAdmin = user.role === 'admin';
  return {
    token: signToken({ uid: user.id, role: user.role }, isAdmin ? 2 * 3600 : 8 * 3600),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

route('POST', '/api/auth/register', null, ({ body, req }) => {
  const name = str(body.name, 'Name', 2, 80);
  const email = str(body.email, 'Email', 5, 120).toLowerCase();
  const phone = optStr(body.phone, 'Phone', 20);
  const password = str(body.password, 'Password', 8, 100);
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
  if (phone && !/^[0-9+\-\s]{7,20}$/.test(phone)) throw new HttpError(400, 'Enter a valid phone number');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    throw new HttpError(400, 'Password must contain at least one letter and one number');
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email))
    throw new HttpError(409, 'An account with this email already exists');

  const r = db.prepare("INSERT INTO users (name,email,phone,password_hash,role,created_at) VALUES (?,?,?,?, 'user', ?)")
    .run(name, email, phone, hashPassword(password), Date.now());
  logActivity(email, 'user_registered', `New user ${name}`);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
  return { ...session(user), has_vehicle: false };
});

route('POST', '/api/auth/login', null, ({ body, req }) => {
  const email = str(body.email, 'Email', 3, 120).toLowerCase();
  const password = str(body.password, 'Password', 1, 100);
  const key = `${req.socket.remoteAddress}|${email}`;
  throttle(key);

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  // Admin accounts cannot sign in through the user login (they have their own page)
  if (!user || user.role !== 'user' || !verifyPassword(password, user.password_hash)) {
    fail(key);
    throw new HttpError(401, 'Invalid email or password');
  }
  if (user.status === 'blocked') throw new HttpError(403, 'Your account has been blocked. Contact support.');
  logActivity(email, 'user_login');
  const hasVehicle = !!db.prepare('SELECT 1 FROM vehicles WHERE user_id=?').get(user.id);
  return { ...session(user), has_vehicle: hasVehicle };
});

route('POST', '/api/admin/login', null, ({ body, req }) => {
  const email = str(body.email, 'Email', 3, 120).toLowerCase();
  const password = str(body.password, 'Password', 1, 100);
  const key = `admin|${req.socket.remoteAddress}|${email}`;
  throttle(key);

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || user.role !== 'admin' || !verifyPassword(password, user.password_hash)) {
    fail(key);
    logActivity(email, 'admin_login_failed', `from ${req.socket.remoteAddress}`);
    throw new HttpError(401, 'Invalid admin credentials');
  }
  logActivity(email, 'admin_login');
  return session(user);
});
