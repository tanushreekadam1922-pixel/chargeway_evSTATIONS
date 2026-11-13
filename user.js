'use strict';
const { db, logActivity } = require('../db');
const { hashPassword, verifyPassword } = require('../lib/auth');
const { HttpError, route, str, optStr, num, oneOf, round1 } = require('../lib/util');
const C = require('../lib/charging');

const CONNECTORS = ['CCS2', 'Type 2 (AC)', 'CHAdeMO', 'Bharat DC-001', 'Bharat AC-001', 'GB/T', 'Other'];
const getVehicle = (uid) => db.prepare('SELECT * FROM vehicles WHERE user_id=?').get(uid) || null;
const activeSession = (uid) => db.prepare("SELECT * FROM sessions WHERE user_id=? AND status='active'").get(uid) || null;

/* ---------- profile ---------- */
route('GET', '/api/me', 'user', ({ user }) => {
  C.expireStaleSessions();
  return { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, created_at: user.created_at },
           vehicle: getVehicle(user.id), connectors: CONNECTORS };
});

route('PUT', '/api/me', 'user', ({ user, body }) => {
  const name = str(body.name, 'Name', 2, 80);
  const phone = optStr(body.phone, 'Phone', 20);
  if (phone && !/^[0-9+\-\s]{7,20}$/.test(phone)) throw new HttpError(400, 'Enter a valid phone number');
  db.prepare('UPDATE users SET name=?, phone=? WHERE id=?').run(name, phone, user.id);
  return { ok: true };
});

route('PUT', '/api/me/password', 'user', ({ user, body }) => {
  const current = str(body.current_password, 'Current password', 1, 100);
  const next = str(body.new_password, 'New password', 8, 100);
  if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next))
    throw new HttpError(400, 'Password must contain at least one letter and one number');
  if (!verifyPassword(current, user.password_hash)) throw new HttpError(400, 'Current password is incorrect');
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(next), user.id);
  logActivity(user.email, 'password_changed');
  return { ok: true };
});

/* ---------- vehicle / battery details ---------- */
route('PUT', '/api/vehicle', 'user', ({ user, body }) => {
  if (activeSession(user.id))
    throw new HttpError(409, 'Finish your current charging session before editing battery details.');
  const v = {
    make: str(body.make, 'Make', 1, 50),
    model: str(body.model, 'Model', 1, 50),
    year: body.year === '' || body.year == null ? null : Math.round(num(body.year, 'Year', 2000, 2100)),
    plate: optStr(body.plate, 'Number plate', 20).toUpperCase(),
    connector: oneOf(body.connector || 'Other', 'Connector', CONNECTORS),
    battery_kwh: num(body.battery_kwh, 'Battery capacity (kWh)', 5, 250),
    current_pct: num(body.current_pct, 'Current battery level (%)', 0, 100),
    max_charge_kw: num(body.max_charge_kw, 'Max charging power (kW)', 2, 400),
    efficiency: body.efficiency === '' || body.efficiency == null ? 16 : num(body.efficiency, 'Efficiency (kWh/100 km)', 5, 60),
  };
  db.prepare(`
    INSERT INTO vehicles (user_id,make,model,year,plate,connector,battery_kwh,current_pct,max_charge_kw,efficiency,updated_at)
    VALUES (@uid,@make,@model,@year,@plate,@connector,@battery_kwh,@current_pct,@max_charge_kw,@efficiency,@now)
    ON CONFLICT(user_id) DO UPDATE SET make=@make, model=@model, year=@year, plate=@plate, connector=@connector,
      battery_kwh=@battery_kwh, current_pct=@current_pct, max_charge_kw=@max_charge_kw,
      efficiency=@efficiency, updated_at=@now`)
    .run({ uid: user.id, ...v, now: Date.now() });
  logActivity(user.email, 'vehicle_saved', `${v.make} ${v.model}`);
  return { vehicle: getVehicle(user.id) };
});

/* ---------- dashboard ---------- */
route('GET', '/api/dashboard', 'user', ({ user }) => {
  C.expireStaleSessions();
  const vehicle = getVehicle(user.id);
  if (!vehicle) return { vehicle: null };

  const s = activeSession(user.id);
  let charging = null, pct = vehicle.current_pct, estFullMin;

  if (s) {
    const st = db.prepare('SELECT name, power_kw FROM stations WHERE id=?').get(s.station_id);
    const slot = db.prepare('SELECT label FROM slots WHERE id=?').get(s.slot_id);
    const p = C.sessionProgress(s);
    pct = p.pct;
    const energyAdded = (vehicle.battery_kwh * (p.pct - s.start_pct)) / 100;
    charging = {
      session_id: s.id, station_id: s.station_id, station_name: st.name, slot_label: slot.label,
      start_pct: round1(s.start_pct), target_pct: s.target_pct, current_pct: round1(p.pct),
      progress_pct: Math.round(p.frac * 100),          // how far through THIS session (0-100)
      remaining_min: p.remaining_min, eta_ts: p.eta_ts, started_ts: s.start_ts,
      price_per_kwh: s.price_per_kwh, energy_added_kwh: Math.round(energyAdded * 100) / 100,
      cost_so_far: Math.round(energyAdded * s.price_per_kwh * 100) / 100,
    };
    estFullMin = Math.round(C.minutesToCharge(vehicle.battery_kwh, pct, 100, C.effectiveKw(vehicle, st)));
  } else {
    estFullMin = Math.round(C.minutesToCharge(vehicle.battery_kwh, pct, 100, C.effectiveKw(vehicle, null)));
  }

  const energy = (vehicle.battery_kwh * pct) / 100;
  return {
    vehicle,
    battery_pct: round1(pct),
    capacity_kwh: vehicle.battery_kwh,
    energy_kwh: Math.round(energy * 10) / 10,
    range_km: Math.round((energy / vehicle.efficiency) * 100),
    est_full_charge_min: estFullMin,          // time to reach 100% (at the charger in use, or at the car's max speed)
    charging,
  };
});

route('GET', '/api/charging/history', 'user', ({ user }) => {
  const rows = db.prepare(`
    SELECT s.id, s.start_ts, s.end_ts, s.start_pct, s.end_pct, s.energy_kwh, s.cost, s.status, st.name AS station_name
    FROM sessions s JOIN stations st ON st.id = s.station_id
    WHERE s.user_id=? AND s.status != 'active' ORDER BY s.start_ts DESC LIMIT 15`).all(user.id);
  return { sessions: rows };
});
