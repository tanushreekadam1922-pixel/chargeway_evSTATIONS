import { Link } from 'react-router-dom';
import { fmtMin, rs } from '../../utils/format.js';
import StatCard from '../common/StatCard.jsx';

export default function FinishedCard({ result }) {
  return (
    <div className="card">
      <h1 style={{ fontSize: '1.8rem' }}>Charging finished</h1>
      <div className="grid g3 keep3">
        <StatCard value={result.end_pct} unit="%" label="Battery now" />
        <StatCard value={result.energy_kwh} unit="kWh" label="Energy added" />
        <StatCard value={rs(result.cost)} label={`Cost (${fmtMin(result.duration_min)})`} />
      </div>
      <div className="row" style={{ marginTop: 20 }}>
        <Link className="btn spark" to="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}
