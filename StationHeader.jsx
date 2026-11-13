import { rs } from '../../utils/format.js';
import StatCard from '../common/StatCard.jsx';
import AvailabilityPill from '../stations/AvailabilityPill.jsx';

export default function StationHeader({ station: s }) {
  return (
    <div className="card">
      <div className="row between">
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{s.name}</h1>
        <AvailabilityPill station={s} />
      </div>
      <p className="muted" style={{ margin: '6px 0 16px' }}>{s.address}</p>
      <div className="grid g3 keep3">
        <StatCard value={rs(s.price_per_kwh)} unit="/kWh" label="Charging cost" />
        <StatCard value={s.power_kw} unit="kW" label="Charger power" />
        <StatCard value={s.available_slots} unit={`/ ${s.total_slots}`} label="Free slots" />
      </div>
    </div>
  );
}
