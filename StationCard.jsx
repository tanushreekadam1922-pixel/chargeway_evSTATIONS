import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fmtMin, rs } from '../../utils/format.js';
import AvailabilityPill from '../stations/AvailabilityPill.jsx';
import Pill from '../common/Pill.jsx';

/** One station in the side list: distance, wait, price, speed and the Route / Charge buttons. */
export default function StationCard({ station: s, recommended, selected, onSelect, onRoute }) {
  const ref = useRef(null);
  useEffect(() => {
    if (selected && ref.current) ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  const wait = s.wait_min == null ? '-' : s.wait_min === 0 ? 'None' : `~${fmtMin(s.wait_min)}`;
  return (
    <article ref={ref} className={`scard${recommended ? ' rec' : ''}${selected ? ' selected' : ''}`} onClick={() => onSelect(s)}>
      <div className="row between">
        <h3>{s.name}</h3>
        {recommended && <span className="badge-rec">Best match</span>}
      </div>
      <div className="small muted">{s.address}</div>
      <div style={{ marginTop: 8 }}>
        <AvailabilityPill station={s} detailed />{' '}
        {s.reachable === false && <Pill tone="amber">May be out of range</Pill>}
      </div>
      <div className="meta">
        <div><b>{s.distance_km} km</b><span>distance</span></div>
        <div><b>{wait}</b><span>wait</span></div>
        <div><b>{rs(s.price_per_kwh)}</b><span>per kWh</span></div>
        <div><b>{s.power_kw} kW</b><span>speed</span></div>
      </div>
      <div className="row">
        <button className="btn sm" onClick={(e) => { e.stopPropagation(); onRoute(s.id); }}>Route · {fmtMin(s.est_drive_min)}</button>
        <Link className="btn sm ghost" to={`/charge/${s.id}`} onClick={(e) => e.stopPropagation()}>Open charge page</Link>
      </div>
    </article>
  );
}
