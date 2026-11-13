import BatteryGauge from '../battery/BatteryGauge.jsx';
import StatCard from '../common/StatCard.jsx';

export default function BatteryPanel({ percent, charging, energyKwh, capacityKwh, rangeKm }) {
  return (
    <section className="card battery-hero" aria-label="Battery">
      <div><BatteryGauge percent={percent} charging={charging} /></div>
      <div>
        <div className="pct">{Math.round(percent)}<small>%</small></div>
        <p className="muted" style={{ margin: '6px 0 18px' }}>{charging ? 'Charging now' : 'Battery level'}</p>
        <div className="grid g3">
          <StatCard value={energyKwh.toFixed(1)} unit="kWh" label="Current energy" />
          <StatCard value={capacityKwh} unit="kWh" label="Total capacity" />
          <StatCard value={Math.round(rangeKm)} unit="km" label="Estimated range" />
        </div>
      </div>
    </section>
  );
}
