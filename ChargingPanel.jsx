import { useState } from 'react';
import { Link } from 'react-router-dom';
import { stationApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtMin, fmtTime, rs } from '../../utils/format.js';
import StatCard from '../common/StatCard.jsx';
import ProgressBar from '../common/ProgressBar.jsx';
import Pill from '../common/Pill.jsx';

/** Shows the live session when charging, otherwise the estimated time to a full battery. */
export default function ChargingPanel({ dash, live, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const c = dash.charging;

  const finish = async () => {
    setBusy(true);
    try {
      const r = await stationApi.finishCharging();
      toast(`Charging finished: ${r.energy_kwh} kWh, ${rs(r.cost)}`, 'good');
      await onChanged();
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  if (!c) {
    return (
      <section className="card" aria-label="Charging">
        <h2>Charging</h2>
        <div className="grid g3">
          <StatCard value={fmtMin(dash.est_full_charge_min)} label="Estimated time to charge to 100%" />
          <StatCard value="0" unit="%" label="Charging progress (not charging)" />
          <StatCard value="-" label="Time to finish (no active session)" />
        </div>
        <div style={{ margin: '18px 0' }}><ProgressBar percent={0} big label="Charging progress" /></div>
        <p className="muted">
          {dash.battery_pct < 20 ? 'Your battery is low. ' : ''}
          Find a station with a free slot, then scan its QR code and tap Start Charging.
        </p>
        <Link className="btn spark" to="/stations">Find nearby stations</Link>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Charging">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Charging at {c.station_name}</h2>
        <Pill tone="green">{c.slot_label}</Pill>
      </div>

      <div className="grid g4" style={{ margin: '16px 0' }}>
        <StatCard value={Math.round(live.frac * 100)} unit="%" label="Charging progress" />
        <StatCard value={live.done ? 'Target reached' : fmtMin(live.remainingMin)} label={`Time to finish (done at ${fmtTime(c.eta_ts)})`} />
        <StatCard value={fmtMin(dash.est_full_charge_min)} label="Time to reach 100%" />
        <StatCard value={rs(live.cost)} label={`Cost so far (${(Math.round(live.energyAdded * 100) / 100)} kWh at ${rs(c.price_per_kwh)}/kWh)`} />
      </div>

      <ProgressBar percent={live.frac * 100} big label="Charging progress" />
      <p className="muted small" style={{ marginTop: 8 }}>
        {Math.round(c.start_pct)}% to {c.target_pct}% target. Tap Finish when you unplug so the next driver sees this slot as free.
      </p>
      <button className="btn danger" onClick={finish} disabled={busy}>Finish charging</button>
    </section>
  );
}
