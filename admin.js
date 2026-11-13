'use strict';
const { db, tx, logActivity } = require('../db');
const { HttpError, route, str, optStr, num, oneOf, intId } = require('../lib/util');
const C = require('../lib/charging');

const STATION_STATUS = ['active', 'inactive', 'maintenance'];
const SLOT_STATUS = ['available', 'occupied', 'offline'];

/** Cancel any running session on a slot (used when the admin overrides a slot). */
function cancelActiveOnSlot(slotId) {
  const s = db.prepare("SELECT * FROM sessions WHERE slot_id=? AND status='active'").get(slotId);
  if (s) C.finishSession(s, 'cancelled');
}

/* ---------------- dashboard ---------------- */
route('GET', '/api/admin/stats', 'admin', () => {
  C.expireStaleSessions();
  const one = (sql) => db.prepare(sql).get().c;
  const view = C.stationsView().stations;
  return {
    total_stations: one('SELECT COUNT(*) AS c FROM stations'),
    total_users: one("SELECT COUNT(*) AS c FROM users WHERE role='user'"),
    active_stations: view.filter((s) => s.status === 'active').length,
    available_stations: view.filter((s) => s.state === 'available').length,
    total_slots: one('SELECT COUNT(*) AS c FROM slots'),
    free_slots: one("SELECT COUNT(*) AS c FROM slots WHERE status='available'"),
    active_sessions: one("SELECT COUNT(*) AS c FROM sessions WHERE status='active'"),
    energy_today_kwh: Math.round(db.prepare(
      "SELECT COALESCE(SUM(energy_kwh),0) AS e FROM sessions WHERE status!='active' AND end_ts >= ?")
      .get(new Date().setHours(0, 0, 0, 0)).e * 10) / 10,
    blocked_users: one("SELECT COUNT(*) AS c FROM users WHERE role='user' AND status='blocked'"),
  };
});

route('GET', '/api/admin/activity', 'admin', () => {
  C.expireStaleSessions();
  return {
    activity: db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 60').all(),
    active_sessions: db.prepare(`
      SELECT s.id, s.start_ts, s.start_pct, s.target_pct, s.expected_min, u.name AS user_name,
             st.name AS station_name, sl.label AS slot_label
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN stations st ON st.id=s.station_id JOIN slots sl ON sl.id=s.slot_id
      WHERE s.status='active' ORDER BY s.start_ts DESC`).all(),
  };
});

/* ---------------- stations ---------------- */
route('GET', '/api/admin/stations', 'admin', () => {
  C.expireStaleSessions();
  const stations = C.stationsView().stations;
  const slots = db.prepare('SELECT id,station_id,label,status,occupied_until FROM slots ORDER BY id').all();
  return { stations: stations.map((s) => ({ ...s, slots: slots.filter((x) => x.station_id === s.id) })) };
});

function stationFields(body) {
  return {
    name: str(body.name, 'Station name', 2, 100),
    address: optStr(body.address, 'Address', 200),
    lat: num(body.lat, 'Latitude', -90, 90),
    lng: num(body.lng, 'Longitude', -180, 180),
    price_per_kwh: num(body.price_per_kwh, 'Price per kWh', 0, 1000),
    power_kw: num(body.power_kw, 'Charger power (kW)', 1, 1000),
    status: oneOf(body.status || 'active', 'Status', STATION_STATUS),
  };
}

route('POST', '/api/admin/stations', 'admin', ({ user, body, ctx }) => {
  const f = stationFields(body);
  const count = Math.round(num(body.slot_count ?? 2, 'Number of slots', 1, 50));
  const id = tx(() => {
    const r = db.prepare(`INSERT INTO stations (name,address,lat,lng,price_per_kwh,power_kw,status,created_at)
                          VALUES (@name,@address,@lat,@lng,@price_per_kwh,@power_kw,@status,@now)`)
      .run({ ...f, now: Date.now() });
    for (let i = 1; i <= count; i++)
      db.prepare("INSERT INTO slots (station_id,label,status) VALUES (?,?, 'available')").run(r.lastInsertRowid, `Slot ${i}`);
    return r.lastInsertRowid;
  });
  logActivity(user.email, 'station_added', f.name);
  return { id };
});

route('PUT', '/api/admin/stations/:id', 'admin', ({ user, params, body }) => {
  const id = intId(params.id);
  if (!db.prepare('SELECT 1 FROM stations WHERE id=?').get(id)) throw new HttpError(404, 'Station not found');
  const f = stationFields(body);
  db.prepare(`UPDATE stations SET name=@name,address=@address,lat=@lat,lng=@lng,price_per_kwh=@price_per_kwh,
              power_kw=@power_kw,status=@status WHERE id=@id`).run({ ...f, id });
  logActivity(user.email, 'station_updated', f.name);
  return { ok: true };
});

route('PUT', '/api/admin/stations/:id/price', 'admin', ({ user, params, body }) => {
  const id = intId(params.id);
  const price = num(body.price_per_kwh, 'Price per kWh', 0, 1000);
  const st = db.prepare('SELECT name, price_per_kwh FROM stations WHERE id=?').get(id);
  if (!st) throw new HttpError(404, 'Station not found');
  db.prepare('UPDATE stations SET price_per_kwh=? WHERE id=?').run(price, id);
  logActivity(user.email, 'price_updated', `${st.name}: Rs ${st.price_per_kwh} -> Rs ${price}/kWh`);
  return { ok: true };
});

route('PUT', '/api/admin/stations/:id/status', 'admin', ({ user, params, body }) => {
  const id = intId(params.id);
  const status = oneOf(body.status, 'Status', STATION_STATUS);
  const st = db.prepare('SELECT name FROM stations WHERE id=?').get(id);
  if (!st) throw new HttpError(404, 'Station not found');
  db.prepare('UPDATE stations SET status=? WHERE id=?').run(status, id);
  logActivity(user.email, 'station_status', `${st.name} -> ${status}`);
  return { ok: true };
});

route('DELETE', '/api/admin/stations/:id', 'admin', ({ user, params }) => {
  const id = intId(params.id);
  const st = db.prepare('SELECT name FROM stations WHERE id=?').get(id);
  if (!st) throw new HttpError(404, 'Station not found');
  db.prepare('DELETE FROM stations WHERE id=?').run(id);   // slots + sessions removed by ON DELETE CASCADE
  logActivity(user.email, 'station_deleted', st.name);
  return { ok: true };
});

/* ---------------- slots ---------------- */
route('POST', '/api/admin/stations/:id/slots', 'admin', ({ user, params }) => {
  const id = intId(params.id);
  const st = db.prepare('SELECT name FROM stations WHERE id=?').get(id);
  if (!st) throw new HttpError(404, 'Station not found');
  const n = db.prepare('SELECT COUNT(*) AS c FROM slots WHERE station_id=?').get(id).c;
  if (n >= 50) throw new HttpError(400, 'Maximum 50 slots per station');
  let label = `Slot ${n + 1}`;
  while (db.prepare('SELECT 1 FROM slots WHERE station_id=? AND label=?').get(id, label)) label += '+';
  db.prepare("INSERT INTO slots (station_id,label,status) VALUES (?,?, 'available')").run(id, label);
  logActivity(user.email, 'slot_added', `${st.name}: ${label}`);
  return { ok: true };
});

route('PUT', '/api/admin/slots/:id', 'admin', ({ user, params, body }) => {
  const id = intId(params.id);
  const status = oneOf(body.status, 'Slot status', SLOT_STATUS);
  const slot = db.prepare('SELECT sl.*, st.name AS station_name FROM slots sl JOIN stations st ON st.id=sl.station_id WHERE sl.id=?').get(id);
  if (!slot) throw new HttpError(404, 'Slot not found');
  tx(() => {
    if (status !== 'occupied') cancelActiveOnSlot(id);        // admin override ends a running user session
    db.prepare('UPDATE slots SET status=?, occupied_until=? WHERE id=?')
      .run(status, status === 'occupied' ? (slot.occupied_until || Date.now() + 20 * 60000) : null, id);
  });
  logActivity(user.email, 'slot_status', `${slot.station_name} / ${slot.label} -> ${status}`);
  return { ok: true };
});

route('DELETE', '/api/admin/slots/:id', 'admin', ({ user, params }) => {
  const id = intId(params.id);
  const slot = db.prepare('SELECT sl.*, st.name AS station_name FROM slots sl JOIN stations st ON st.id=sl.station_id WHERE sl.id=?').get(id);
  if (!slot) throw new HttpError(404, 'Slot not found');
  tx(() => { cancelActiveOnSlot(id); db.prepare('DELETE FROM slots WHERE id=?').run(id); });
  logActivity(user.email, 'slot_deleted', `${slot.station_name} / ${slot.label}`);
  return { ok: true };
});

/* ---------------- users ---------------- */
route('GET', '/api/admin/users', 'admin', () => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
           v.make || ' ' || v.model AS vehicle,
           (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.status!='active') AS sessions
    FROM users u LEFT JOIN vehicles v ON v.user_id=u.id
    WHERE u.role='user' ORDER BY u.id DESC`).all();
  return { users };
});

route('PUT', '/api/admin/users/:id', 'admin', ({ user, params, body }) => {
  const id = intId(params.id);
  const status = oneOf(body.status, 'Status', ['active', 'blocked']);
  const target = db.prepare("SELECT * FROM users WHERE id=? AND role='user'").get(id);
  if (!target) throw new HttpError(404, 'User not found');
  db.prepare('UPDATE users SET status=? WHERE id=?').run(status, id);
  if (status === 'blocked') {
    const s = db.prepare("SELECT * FROM sessions WHERE user_id=? AND status='active'").get(id);
    if (s) C.finishSession(s, 'cancelled');
  }
  logActivity(user.email, status === 'blocked' ? 'user_blocked' : 'user_unblocked', target.email);
  return { ok: true };
});

route('DELETE', '/api/admin/users/:id', 'admin', ({ user, params }) => {
  const id = intId(params.id);
  const target = db.prepare("SELECT * FROM users WHERE id=? AND role='user'").get(id);
  if (!target) throw new HttpError(404, 'User not found');
  tx(() => {
    const s = db.prepare("SELECT * FROM sessions WHERE user_id=? AND status='active'").get(id);
    if (s) C.finishSession(s, 'cancelled');
    db.prepare('DELETE FROM users WHERE id=?').run(id);
  });
  logActivity(user.email, 'user_deleted', target.email);
  return { ok: true };
});
