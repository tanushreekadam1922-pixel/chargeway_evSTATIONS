import { fmtMin } from '../../utils/format.js';
import { googleMapsUrl } from '../../utils/routing.js';

/** Distance, time and turn-by-turn steps for the selected station. */
export default function RoutePanel({ station, from, route, loading, onClose }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>Route to {station.name}</h3>
        <button className="btn sm ghost" onClick={onClose}>Close</button>
      </div>

      {loading && <p className="muted" style={{ margin: '8px 0 0' }}>Finding the best route...</p>}

      {route && (
        <>
          <p style={{ margin: '8px 0' }}>
            <b>{route.estimated ? 'About ' : ''}{route.distanceKm.toFixed(1)} km</b> · <b>{route.estimated ? '~' : ''}{fmtMin(route.durationMin)}</b>
            {route.estimated ? ' (estimate)' : ' by road'}
          </p>
          {route.steps ? (
            <ol className="steps">
              {route.steps.map((s, i) => (
                <li key={i}>
                  {s.text}
                  {s.meters > 0 && <span className="muted"> ({s.meters >= 1000 ? `${(s.meters / 1000).toFixed(1)} km` : `${Math.round(s.meters)} m`})</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="small muted">Turn-by-turn directions are unavailable right now. The dashed line is a straight path.</p>
          )}
          <a className="btn sm spark" style={{ marginTop: 10 }} target="_blank" rel="noopener noreferrer" href={googleMapsUrl(from, station)}>
            Open in Google Maps
          </a>
        </>
      )}
    </div>
  );
}
