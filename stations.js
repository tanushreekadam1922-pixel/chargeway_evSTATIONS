
'use strict';

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { db, tx, logActivity } = require('../db');
const { HttpError, route, num, intId } = require('../lib/util');
const C = require('../lib/charging');

const OCM_API_URL = 'https://api.openchargemap.io/v3/poi/';
const OCM_MAX_RESULTS = 200;
const DEFAULT_RADIUS_KM = 50;
const MAX_RADIUS_KM = 500;
const STATION_ID_OFFSET = 800000000;
const CACHE_DURATION = 60 * 1000;

const stationCache = new Map();

/* =====================================================
   BASIC HELPERS
===================================================== */

function calculateDistance(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371;
  const toRad = value => value * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  return earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getFallbackStations() {
  return [
    {
      id: STATION_ID_OFFSET + 1,
      ocm_id: 1,
      name: 'Tata Power EV Charging Hub',
      address: 'Bandra Kurla Complex, Mumbai, Maharashtra',
      lat: 19.0657,
      lng: 72.8680,
      total_ports: 4,
      price_per_kwh: 18,
      power_kw: 60,
      status: 'active',
      operator: 'Tata Power',
      connections: [],
      is_external: true
    },
    {
      id: STATION_ID_OFFSET + 2,
      ocm_id: 2,
      name: 'Zeon Fast Charging Station',
      address: 'Pune-Mumbai Expressway, Pune, Maharashtra',
      lat: 18.5204,
      lng: 73.8567,
      total_ports: 2,
      price_per_kwh: 15,
      power_kw: 50,
      status: 'active',
      operator: 'Zeon',
      connections: [],
      is_external: true
    },
    {
      id: STATION_ID_OFFSET + 3,
      ocm_id: 3,
      name: 'Statiq Charging Hub',
      address: 'Connaught Place, New Delhi',
      lat: 28.6280,
      lng: 77.2090,
      total_ports: 6,
      price_per_kwh: 16,
      power_kw: 50,
      status: 'active',
      operator: 'Statiq',
      connections: [],
      is_external: true
    },
    {
      id: STATION_ID_OFFSET + 4,
      ocm_id: 4,
      name: 'Ather Grid Charging Point',
      address: 'Koramangala, Bengaluru, Karnataka',
      lat: 12.9352,
      lng: 77.6245,
      total_ports: 3,
      price_per_kwh: 14,
      power_kw: 30,
      status: 'active',
      operator: 'Ather',
      connections: [],
      is_external: true
    },
    {
      id: STATION_ID_OFFSET + 5,
      ocm_id: 5,
      name: 'Magenta ChargeGrid',
      address: 'Banjara Hills, Hyderabad, Telangana',
      lat: 17.4156,
      lng: 78.4347,
      total_ports: 4,
      price_per_kwh: 15,
      power_kw: 30,
      status: 'active',
      operator: 'Magenta',
      connections: [],
      is_external: true
    }
  ];
}

/* =====================================================
   DATABASE STATION AND PORT REGISTRATION

   IMPORTANT:
   Port IDs are taken from the actual slots table.
   Never generate fake IDs for sessions.slot_id.
===================================================== */

function ensureStationAndPorts(station) {
  const now = Date.now();

  const stationId = intId(station.id, 'station_id');
  const totalPorts = Math.min(
    999,
    Math.max(1, Number(station.total_ports) || 4)
  );

  const stationStatus =
    station.status === 'offline' ||
    station.status === 'inactive'
      ? 'inactive'
      : station.status === 'maintenance'
        ? 'maintenance'
        : 'active';

  tx(() => {
    const existing = db.prepare(
      'SELECT id FROM stations WHERE id = ?'
    ).get(stationId);

    if (!existing) {
      db.prepare(`
        INSERT INTO stations (
          id,
          name,
          address,
          lat,
          lng,
          price_per_kwh,
          power_kw,
          status,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        stationId,
        station.name || 'EV Charging Station',
        station.address || 'India',
        Number(station.lat) || 20.5937,
        Number(station.lng) || 78.9629,
        Number(station.price_per_kwh) || 15,
        Number(station.power_kw) || 30,
        stationStatus,
        now
      );
    } else {
      db.prepare(`
        UPDATE stations
        SET name = ?,
            address = ?,
            lat = ?,
            lng = ?,
            price_per_kwh = ?,
            power_kw = ?,
            status = ?
        WHERE id = ?
      `).run(
        station.name || 'EV Charging Station',
        station.address || 'India',
        Number(station.lat) || 20.5937,
        Number(station.lng) || 78.9629,
        Number(station.price_per_kwh) || 15,
        Number(station.power_kw) || 30,
        stationStatus,
        stationId
      );
    }

    const insertPort = db.prepare(`
      INSERT INTO slots (
        station_id,
        label,
        status,
        occupied_until
      )
      VALUES (?, ?, ?, NULL)
    `);

    for (let i = 1; i <= totalPorts; i++) {
      const label = `Port ${i}`;

      const existingPort = db.prepare(`
        SELECT id FROM slots
        WHERE station_id = ? AND label = ?
      `).get(stationId, label);

      if (!existingPort) {
        insertPort.run(
          stationId,
          label,
          stationStatus === 'active' ? 'available' : 'offline'
        );
      }
    }

    if (stationStatus !== 'active') {
      db.prepare(`
        UPDATE slots
        SET status = 'offline',
            occupied_until = NULL
        WHERE station_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.slot_id = slots.id
              AND sessions.status = 'active'
          )
      `).run(stationId);
    } else {
      db.prepare(`
        UPDATE slots
        SET status = 'available'
        WHERE station_id = ?
          AND status = 'offline'
          AND NOT EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.slot_id = slots.id
              AND sessions.status = 'active'
          )
      `).run(stationId);
    }
  });

  return db.prepare(
    'SELECT * FROM stations WHERE id = ?'
  ).get(stationId);
}

/* =====================================================
   OPEN CHARGE MAP API
===================================================== */

async function fetchAllIndiaStations(lat, lng, radiusKm) {
  const apiKey = process.env.EV_API_KEY;

  if (!apiKey) {
    return getFallbackStations();
  }

  const cacheKey = [
    Number(lat).toFixed(3),
    Number(lng).toFixed(3),
    Number(radiusKm).toFixed(1)
  ].join('_');

  const cached = stationCache.get(cacheKey);

  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return cached.stations;
  }

  try {
    const params = new URLSearchParams({
      output: 'json',
      countrycode: 'IN',
      latitude: String(lat),
      longitude: String(lng),
      distance: String(radiusKm),
      distanceunit: 'KM',
      maxresults: String(OCM_MAX_RESULTS),
      compact: 'false',
      verbose: 'false'
    });

    const response = await fetch(
      `${OCM_API_URL}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'ChargeWay/1.0'
        }
      }
    );

    if (!response.ok) {
      return getFallbackStations();
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
      return getFallbackStations();
    }

    const stations = data.filter(item => {
      const address = item.AddressInfo;

      return address &&
        Number.isFinite(Number(address.Latitude)) &&
        Number.isFinite(Number(address.Longitude));
    }).map(item => {
      const address = item.AddressInfo;
      const connections = Array.isArray(item.Connections)
        ? item.Connections
        : [];

      const totalPorts = Math.min(
        999,
        Math.max(
          1,
          Number(item.NumberOfPoints) ||
          connections.reduce(
            (total, connection) =>
              total + (Number(connection.Quantity) || 1),
            0
          ) ||
          4
        )
      );

      return {
        id: STATION_ID_OFFSET + Number(item.ID),
        ocm_id: Number(item.ID),
        name: address.Title || 'EV Charging Station',
        address: [
          address.AddressLine1,
          address.Town,
          address.StateOrProvince,
          address.Country?.Title
        ].filter(Boolean).join(', ') || 'India',
        lat: Number(address.Latitude),
        lng: Number(address.Longitude),
        total_ports: totalPorts,
        price_per_kwh: 15,
        power_kw: 50,
        status: item.StatusType?.IsOperational === false
          ? 'offline'
          : 'active',
        operator: item.OperatorInfo?.Title || 'Public Network',
        connections: connections.map(connection => ({
          id: connection.ID,
          type: connection.ConnectionType?.Title || 'Connector',
          power_kw: connection.PowerKW || 50,
          quantity: connection.Quantity || 1
        })),
        is_external: true
      };
    });

    if (!stations.length) {
      return getFallbackStations();
    }

    stationCache.set(cacheKey, {
      time: Date.now(),
      stations
    });

    return stations;

  } catch (error) {
    console.error('[OPEN CHARGE MAP ERROR]', error.message);
    return getFallbackStations();
  }
}

async function fetchSingleStation(ocmId) {
  const apiKey = process.env.EV_API_KEY;

  if (!apiKey) {
    return getFallbackStations().find(
      station => station.ocm_id === Number(ocmId)
    ) || null;
  }

  try {
    const params = new URLSearchParams({
      output: 'json',
      chargepointid: String(ocmId),
      compact: 'false',
      verbose: 'true'
    });

    const response = await fetch(
      `${OCM_API_URL}?${params.toString()}`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'ChargeWay/1.0'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
      return null;
    }

    const item = data[0];
    const address = item.AddressInfo || {};
    const connections = Array.isArray(item.Connections)
      ? item.Connections
      : [];

    return {
      id: STATION_ID_OFFSET + Number(item.ID),
      ocm_id: Number(item.ID),
      name: address.Title || 'EV Charging Station',
      address: [
        address.AddressLine1,
        address.Town,
        address.StateOrProvince,
        address.Country?.Title
      ].filter(Boolean).join(', ') || 'India',
      lat: Number(address.Latitude),
      lng: Number(address.Longitude),
      total_ports: Math.min(
        999,
        Math.max(
          1,
          Number(item.NumberOfPoints) ||
          connections.reduce(
            (total, connection) =>
              total + (Number(connection.Quantity) || 1),
            0
          ) ||
          4
        )
      ),
      price_per_kwh: 15,
      power_kw: 50,
      status: item.StatusType?.IsOperational === false
        ? 'offline'
        : 'active',
      operator: item.OperatorInfo?.Title || 'Public Network',
      connections,
      is_external: true
    };

  } catch (error) {
    console.error('[STATION DETAILS ERROR]', error.message);
    return null;
  }
}

/* =====================================================
   CONFIGURATION
===================================================== */

route('GET', '/api/config', 'user', async () => ({
  center: {
    lat: 20.5937,
    lng: 78.9629
  },
  zoom: 5,
  map: {
    provider: 'OpenStreetMap',
    routing: 'OSRM'
  },
  stationSource: 'Open Charge Map',
  features: {
    gps: true,
    navigation: true,
    liveAvailability: true,
    qrCodes: true
  }
}));

/* =====================================================
   NEARBY STATIONS
===================================================== */

route('GET', '/api/stations/nearby', 'user', async ({ query }) => {
  const lat = num(query.lat, 'lat', -90, 90);
  const lng = num(query.lng, 'lng', -180, 180);

  const radiusKm = query.radius
    ? num(query.radius, 'radius', 1, MAX_RADIUS_KM)
    : DEFAULT_RADIUS_KM;

  C.expireStaleSessions();

  const stations = await fetchAllIndiaStations(
    lat,
    lng,
    radiusKm
  );

  const processedStations = [];

  for (const station of stations) {
    const distanceKm = calculateDistance(
      lat,
      lng,
      station.lat,
      station.lng
    );

    let savedStation;

    try {
      savedStation = ensureStationAndPorts(station);
    } catch (error) {
      console.error(
        '[STATION REGISTRATION ERROR]',
        station.id,
        error.message
      );
      continue;
    }

    const ports = db.prepare(`
      SELECT
        sl.id,
        sl.status,
        EXISTS (
          SELECT 1 FROM sessions s
          WHERE s.slot_id = sl.id
            AND s.status = 'active'
        ) AS has_active_session
      FROM slots sl
      WHERE sl.station_id = ?
    `).all(station.id);

    const occupiedCount = ports.filter(
      port => Number(port.has_active_session) === 1 ||
              port.status === 'occupied'
    ).length;

    const availableCount = savedStation.status !== 'active'
      ? 0
      : ports.filter(
          port =>
            port.status === 'available' &&
            Number(port.has_active_session) === 0
        ).length;

    const offlineCount = ports.filter(
      port => port.status === 'offline'
    ).length;

    const stationStatus =
      savedStation.status !== 'active'
        ? 'offline'
        : availableCount > 0
          ? 'active'
          : 'busy';

    processedStations.push({
      id: station.id,
      ocm_id: station.ocm_id,
      name: savedStation.name,
      address: savedStation.address,
      lat: savedStation.lat,
      lng: savedStation.lng,
      distance_km: Math.round(distanceKm * 10) / 10,
      total_ports: ports.length,
      available_ports: availableCount,
      occupied_ports: occupiedCount,
      offline_ports: offlineCount,
      price_per_kwh: savedStation.price_per_kwh,
      power_kw: savedStation.power_kw,
      status: stationStatus,
      operator: station.operator || 'Public Network',
      connections: station.connections || [],
      is_external: Boolean(station.is_external),
      score: 1000 - distanceKm + availableCount * 10
    });
  }

  processedStations.sort(
    (a, b) => a.distance_km - b.distance_km
  );

  const recommended = processedStations.find(
    station => station.available_ports > 0
  );

  return {
    stations: processedStations,
    total: processedStations.length,
    recommended_id: recommended?.id || null,
    user_location: {
      lat,
      lng
    },
    radius_km: radiusKm,
    source: 'Open Charge Map',
    message: processedStations.length
      ? 'Charging stations loaded successfully.'
      : 'No stations found.'
  };
});

/* =====================================================
   STATION DETAILS AND INDIVIDUAL PORTS
===================================================== */

route('GET', '/api/stations/:id', 'user', async ({ user, params }) => {
  const id = intId(params.id);

  C.expireStaleSessions();

  let station = db.prepare(
    'SELECT * FROM stations WHERE id = ?'
  ).get(id);

  if (!station && id >= STATION_ID_OFFSET) {
    station = await fetchSingleStation(
      id - STATION_ID_OFFSET
    );
  }

  if (!station) {
    throw new HttpError(404, 'Charging station not found.');
  }

  const savedStation = ensureStationAndPorts(station);

  const slots = db.prepare(`
    SELECT
      sl.*,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM sessions s
          WHERE s.slot_id = sl.id
            AND s.status = 'active'
        ) THEN 'occupied'
        ELSE sl.status
      END AS current_status
    FROM slots sl
    WHERE sl.station_id = ?
    ORDER BY sl.id
  `).all(id);

  const mine = db.prepare(`
    SELECT *
    FROM sessions
    WHERE user_id = ?
      AND status = 'active'
    ORDER BY start_ts DESC
    LIMIT 1
  `).get(user.id);

  return {
    station: {
      id: savedStation.id,
      name: savedStation.name,
      address: savedStation.address,
      lat: savedStation.lat,
      lng: savedStation.lng,
      total_ports: slots.length,
      price_per_kwh: savedStation.price_per_kwh,
      power_kw: savedStation.power_kw,
      status: savedStation.status,
      operator: station.operator || 'ChargeWay',
      connections: station.connections || []
    },

    slots: slots.map((slot, index) => ({
      id: slot.id,
      port_number: index + 1,
      label: slot.label,
      qr_code: `CHARGEWAY-${id}-PORT-${index + 1}`,
      status: savedStation.status !== 'active'
        ? 'offline'
        : slot.current_status,
      occupied_until: slot.occupied_until
    })),

    my_session: mine
      ? {
          id: mine.id,
          station_id: mine.station_id,
          slot_id: mine.slot_id
        }
      : null
  };
});

/* =====================================================
   START CHARGING

   Uses actual slots.id and an atomic UPDATE.
   A port cannot be allocated twice.
===================================================== */

route('POST', '/api/charging/start', 'user', ({ user, body }) => {
  const stationId = intId(body.station_id, 'station_id');
  const slotId = intId(body.slot_id, 'slot_id');

  const station = db.prepare(`
    SELECT * FROM stations WHERE id = ?
  `).get(stationId);

  if (!station) {
    throw new HttpError(404, 'Charging station not found.');
  }

  if (station.status !== 'active') {
    throw new HttpError(409, 'This charging station is offline.');
  }

  const vehicle = db.prepare(`
    SELECT * FROM vehicles WHERE user_id = ?
  `).get(user.id);

  if (!vehicle) {
    throw new HttpError(
      400,
      'Please add your vehicle before starting charging.'
    );
  }

  const slot = db.prepare(`
    SELECT * FROM slots
    WHERE id = ? AND station_id = ?
  `).get(slotId, stationId);

  if (!slot) {
    throw new HttpError(
      400,
      'Invalid charging port selected.'
    );
  }

  if (slot.status !== 'available') {
    throw new HttpError(
      409,
      'This charging port is not available.'
    );
  }

  const batteryKwh = Number(vehicle.battery_kwh);
  const currentPct = Number(vehicle.current_pct);
  const targetPct = 80;

  if (
    !Number.isFinite(batteryKwh) ||
    batteryKwh <= 0 ||
    !Number.isFinite(currentPct) ||
    currentPct < 0 ||
    currentPct >= targetPct
  ) {
    throw new HttpError(
      400,
      'Please check your vehicle battery details before charging.'
    );
  }

  const effectivePower = C.effectiveKw(vehicle, station);

  if (!Number.isFinite(effectivePower) || effectivePower <= 0) {
    throw new HttpError(
      400,
      'Invalid charging power configuration.'
    );
  }

  const expectedMin = C.minutesToCharge(
    batteryKwh,
    currentPct,
    targetPct,
    effectivePower
  );

  const now = Date.now();
  let sessionId;

  try {
    tx(() => {
      const activeUserSession = db.prepare(`
        SELECT id FROM sessions
        WHERE user_id = ?
          AND status = 'active'
        LIMIT 1
      `).get(user.id);

      if (activeUserSession) {
        throw new HttpError(
          409,
          'You already have an active charging session.'
        );
      }

      // Only one request can successfully change
      // this port from available to occupied.

      const allocation = db.prepare(`
        UPDATE slots
        SET status = 'occupied',
            occupied_until = ?
        WHERE id = ?
          AND station_id = ?
          AND status = 'available'
      `).run(
        now + expectedMin * 60000,
        slotId,
        stationId
      );

      if (allocation.changes !== 1) {
        throw new HttpError(
          409,
          'This charging port has just been occupied by another user.'
        );
      }

      const result = db.prepare(`
        INSERT INTO sessions (
          user_id,
          station_id,
          slot_id,
          start_ts,
          start_pct,
          target_pct,
          expected_min,
          price_per_kwh,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        user.id,
        stationId,
        slotId,
        now,
        currentPct,
        targetPct,
        expectedMin,
        station.price_per_kwh
      );

      sessionId = result.lastInsertRowid;
    });

  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    console.error('[CHARGING START ERROR]', error);

    throw new HttpError(
      500,
      'Database error while starting charging.'
    );
  }

  logActivity(
    user.email,
    'charging_started',
    `Station ${stationId}, Port ${slot.label}`
  );

  return {
    ok: true,
    session_id: sessionId,
    station_id: stationId,
    slot_id: slotId,
    port_number: Number(slot.label.replace('Port ', '')),
    status: 'occupied',
    expected_min: Math.round(expectedMin),
    message: 'Charging session started successfully.'
  };
});

/* =====================================================
   FINISH CHARGING
===================================================== */

route('POST', '/api/charging/finish', 'user', ({ user }) => {
  const session = db.prepare(`
    SELECT *
    FROM sessions
    WHERE user_id = ?
      AND status = 'active'
    ORDER BY start_ts DESC
    LIMIT 1
  `).get(user.id);

  if (!session) {
    throw new HttpError(
      409,
      'You have no active charging session.'
    );
  }

  const slot = db.prepare(`
    SELECT * FROM slots WHERE id = ?
  `).get(session.slot_id);

  if (!slot) {
    throw new HttpError(
      409,
      'Charging port record was not found.'
    );
  }

  const result = C.finishSession(session, 'completed');

  const station = db.prepare(`
    SELECT status FROM stations WHERE id = ?
  `).get(session.station_id);

  // Do not mark a port available if its station is offline.
  if (station && station.status !== 'active') {
    db.prepare(`
      UPDATE slots
      SET status = 'offline',
          occupied_until = NULL
      WHERE id = ?
    `).run(session.slot_id);
  }

  const portNumber = Number(
    slot.label.replace('Port ', '')
  );

  logActivity(
    user.email,
    'charging_finished',
    `Station: ${session.station_id}, Port: ${portNumber}, Energy: ${result.energy_kwh} kWh, Cost: Rs ${result.cost}`
  );

  return {
    ok: true,
    session_id: session.id,
    station_id: session.station_id,
    slot_id: session.slot_id,
    port_number: portNumber,
    status: station && station.status !== 'active'
      ? 'offline'
      : 'available',
    ...result,
    message: 'Charging session completed successfully.'
  };
});

/* =====================================================
   CHARGING HISTORY
===================================================== */

route('GET', '/api/charging/history', 'user', ({ user }) => {
  const sessions = db.prepare(`
    SELECT
      s.*,
      st.name AS station_name,
      st.address AS station_address,
      sl.label AS port_label
    FROM sessions s
    LEFT JOIN stations st ON st.id = s.station_id
    LEFT JOIN slots sl ON sl.id = s.slot_id
    WHERE s.user_id = ?
    ORDER BY s.start_ts DESC
  `).all(user.id);

  return {
    sessions,
    total: sessions.length
  };
});

/* =====================================================
   PORT AVAILABILITY
===================================================== */

route('GET', '/api/stations/:id/ports', 'user', ({ params }) => {
  const stationId = intId(params.id);

  C.expireStaleSessions();

  const station = db.prepare(`
    SELECT * FROM stations WHERE id = ?
  `).get(stationId);

  if (!station) {
    throw new HttpError(404, 'Charging station not found.');
  }

  const ports = db.prepare(`
    SELECT
      sl.id AS slot_id,
      sl.label,
      sl.status,
      sl.occupied_until,
      s.start_ts,
      CASE
        WHEN s.id IS NOT NULL THEN 'occupied'
        ELSE sl.status
      END AS current_status
    FROM slots sl
    LEFT JOIN sessions s
      ON s.slot_id = sl.id
      AND s.status = 'active'
    WHERE sl.station_id = ?
    ORDER BY sl.id
  `).all(stationId);

  const occupiedPorts = ports.filter(
    port => port.current_status === 'occupied'
  );

  return {
    station_id: stationId,

    occupied_ports: occupiedPorts.map(port => ({
      slot_id: port.slot_id,
      label: port.label,
      status: 'occupied',
      start_ts: port.start_ts
    })),

    ports: ports.map(port => ({
      id: port.slot_id,
      label: port.label,
      status: station.status !== 'active'
        ? 'offline'
        : port.current_status,
      occupied_until: port.occupied_until
    })),

    total_ports: ports.length,
    occupied_count: occupiedPorts.length,

    available_count: ports.filter(
      port =>
        station.status === 'active' &&
        port.current_status === 'available'
    ).length,

    checked_at: Date.now()
  };
});
