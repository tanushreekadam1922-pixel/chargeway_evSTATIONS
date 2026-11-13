// Route navigation using the free public OSRM routing server (no API key needed).

const compass = (bearing) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(bearing / 45) % 8];

/** Turns one OSRM step into a sentence like "Turn left onto MG Road". */
function instruction(step) {
  const m = step.maneuver || {};
  const mod = (m.modifier || '').replace('slight ', 'bear ');
  const road = step.name ? ` onto ${step.name}` : '';
  switch (m.type) {
    case 'depart': return `Head ${compass(m.bearing_after || 0)}${step.name ? ` on ${step.name}` : ''}`;
    case 'arrive': return 'Arrive at the charging station';
    case 'roundabout':
    case 'rotary': return `At the roundabout, take exit ${m.exit || ''}${road}`;
    case 'turn': return `Turn ${mod}${road}`;
    case 'continue': return `Continue ${mod || 'straight'}${step.name ? ` on ${step.name}` : ''}`;
    case 'merge': return `Merge ${mod}${road}`;
    case 'fork': return `Keep ${mod || 'straight'} at the fork${road}`;
    case 'end of road': return `At the end of the road, turn ${mod}${road}`;
    default: return `${mod ? `Go ${mod}` : 'Continue'}${road}`;
  }
}

/** Real road route: { coords: [[lat,lng]...], distanceKm, durationMin, steps: [{text, meters}], estimated: false } */
export async function fetchRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error('No route found');
  const r = json.routes[0];
  return {
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
    steps: r.legs[0].steps
      .filter((s) => s.distance > 0 || s.maneuver?.type === 'arrive')
      .map((s) => ({ text: instruction(s), meters: s.distance })),
    estimated: false,
  };
}

/** Used when the routing server cannot be reached: a straight line with our own estimates. */
export function fallbackRoute(from, station) {
  return {
    coords: [[from.lat, from.lng], [station.lat, station.lng]],
    distanceKm: station.distance_km * 1.3,
    durationMin: station.est_drive_min,
    steps: null,
    estimated: true,
  };
}

export const googleMapsUrl = (from, to) =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;
