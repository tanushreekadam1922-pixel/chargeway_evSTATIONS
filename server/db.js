'use strict';
/**
 * Database layer - SQLite via Node's built-in `node:sqlite` module (Node 22.5+).
 * No npm packages needed. The database file is created in ./data/chargeway.db
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('./lib/auth');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'chargeway.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user'   CHECK (role   IN ('user','admin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  make           TEXT NOT NULL,
  model          TEXT NOT NULL,
  year           INTEGER,
  plate          TEXT,
  connector      TEXT,
  battery_kwh    REAL NOT NULL,          -- total battery capacity
  current_pct    REAL NOT NULL,          -- current battery level 0-100
  max_charge_kw  REAL NOT NULL,          -- max charging power the car accepts
  efficiency     REAL NOT NULL DEFAULT 16, -- kWh per 100 km (used for range)
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  address       TEXT,
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  price_per_kwh REAL NOT NULL,
  power_kw      REAL NOT NULL DEFAULT 30,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS slots (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id     INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','offline')),
  occupied_until INTEGER,                -- estimated time (ms) the slot becomes free
  UNIQUE (station_id, label)
);

CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  station_id    INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  slot_id       INTEGER NOT NULL REFERENCES slots(id)    ON DELETE CASCADE,
  start_ts      INTEGER NOT NULL,
  end_ts        INTEGER,
  start_pct     REAL NOT NULL,
  target_pct    REAL NOT NULL,
  end_pct       REAL,
  expected_min  REAL NOT NULL,
  energy_kwh    REAL,
  price_per_kwh REAL NOT NULL,
  cost          REAL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','expired','cancelled'))
);

CREATE TABLE IF NOT EXISTS activity (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     INTEGER NOT NULL,
  actor  TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_slots_station    ON slots(station_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_slot    ON sessions(slot_id, status);
`);

/** Run fn inside a transaction; rolls back if it throws. */
function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function logActivity(actor, action, detail = '') {
  db.prepare('INSERT INTO activity (ts, actor, action, detail) VALUES (?,?,?,?)')
    .run(Date.now(), String(actor), String(action), String(detail));
}

/* ---------------- Seed data (only on a brand-new database) ---------------- */
function seed() {
  const now = Date.now();
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE role='admin'").get();
  if (!hasAdmin) {
    const email = process.env.ADMIN_EMAIL || 'admin@chargeway.com';
    const pass = process.env.ADMIN_PASSWORD || 'Admin@123';
    db.prepare("INSERT INTO users (name,email,phone,password_hash,role,created_at) VALUES (?,?,?,?, 'admin', ?)")
      .run('Administrator', email, '', hashPassword(pass), now);
    console.log(`[seed] Admin account created: ${email} / ${pass}  (change this for real use!)`);
  }

  if (db.prepare('SELECT COUNT(*) AS c FROM stations').get().c === 0) {
    // Demo stations are placed around this point. Change with SEED_LAT / SEED_LNG
    // (before the first run) to put demo stations in YOUR city.
    const lat0 = parseFloat(process.env.SEED_LAT) || 18.5204;
    const lng0 = parseFloat(process.env.SEED_LNG) || 73.8567;
    const kmLat = (km) => km / 110.57;
    const kmLng = (km) => km / (111.32 * Math.cos((lat0 * Math.PI) / 180));

    const demo = [
      ['ChargeWay Hub - City Centre', 'Demo address 1, City Centre',    0.8,  0.6, 16, 60, 'active', 4, 2],
      ['GreenVolt Fast Charge',       'Demo address 2, Main Road',     -1.9,  1.2, 18, 50, 'active', 3, 3],
      ['EcoPlug Station',             'Demo address 3, Market Area',    2.4, -1.6, 14, 30, 'active', 6, 1],
      ['VoltPoint Mall Charging',     'Demo address 4, Shopping Mall',  3.6,  2.8, 20, 120, 'active', 4, 4],
      ['PowerGrid Express',           'Demo address 5, Highway Exit',  -4.2, -2.1, 17, 60, 'active', 2, 0],
      ['SunCharge Station',           'Demo address 6, Tech Park',      5.5, -3.9, 15, 30, 'active', 5, 2],
      ['QuickAmp Charging Point',     'Demo address 7, Railway Stn.',  -2.7,  4.4, 19, 50, 'maintenance', 2, 0],
      ['EV Oasis',                    'Demo address 8, Ring Road',      7.8,  5.1, 13, 22, 'active', 3, 1],
    ];

    const insStation = db.prepare(
      'INSERT INTO stations (name,address,lat,lng,price_per_kwh,power_kw,status,created_at) VALUES (?,?,?,?,?,?,?,?)');
    const insSlot = db.prepare(
      'INSERT INTO slots (station_id,label,status,occupied_until) VALUES (?,?,?,?)');

    tx(() => {
      for (const [name, addr, dN, dE, price, kw, status, nSlots, nBusy] of demo) {
        const r = insStation.run(name, addr, +(lat0 + kmLat(dN)).toFixed(6), +(lng0 + kmLng(dE)).toFixed(6),
          price, kw, status, now);
        for (let i = 1; i <= nSlots; i++) {
          const busy = i <= nBusy;
          insSlot.run(r.lastInsertRowid, `Slot ${i}`, busy ? 'occupied' : 'available',
            busy ? now + (10 + Math.floor(Math.random() * 35)) * 60000 : null);
        }
      }
    });
    console.log('[seed] 8 demo charging stations created around', lat0, lng0);
  }

  if (!db.prepare("SELECT 1 FROM users WHERE email='demo@chargeway.com'").get()) {
    const r = db.prepare("INSERT INTO users (name,email,phone,password_hash,role,created_at) VALUES (?,?,?,?, 'user', ?)")
      .run('Demo Driver', 'demo@chargeway.com', '9999999999', hashPassword('Demo@1234'), now);
    db.prepare(`INSERT INTO vehicles (user_id,make,model,year,plate,connector,battery_kwh,current_pct,max_charge_kw,efficiency,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(r.lastInsertRowid, 'Tata', 'Nexon EV', 2024, 'MH12AB1234', 'CCS2', 40.5, 28, 50, 15, now);
    console.log('[seed] Demo user created: demo@chargeway.com / Demo@1234');
  }
}

module.exports = { db, tx, logActivity, seed };
