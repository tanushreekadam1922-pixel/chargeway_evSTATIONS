// Live numbers for an active charging session, computed from the server's start/ETA times.

export function liveCharging(charging, vehicle, now = Date.now()) {
  const total = charging.eta_ts - charging.started_ts;
  const frac = total > 0 ? Math.min(1, Math.max(0, (now - charging.started_ts) / total)) : 1;
  const pct = charging.start_pct + (charging.target_pct - charging.start_pct) * frac;
  const energyAdded = (vehicle.battery_kwh * (pct - charging.start_pct)) / 100;
  return {
    frac,
    pct,
    energyKwh: (vehicle.battery_kwh * pct) / 100,
    rangeKm: ((vehicle.battery_kwh * pct) / 100 / vehicle.efficiency) * 100,
    energyAdded,
    cost: energyAdded * charging.price_per_kwh,
    remainingMin: Math.max(0, Math.ceil((charging.eta_ts - now) / 60000)),
    done: frac >= 1,
  };
}
