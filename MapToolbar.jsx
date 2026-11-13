const RADII = [5, 10, 25, 50, 200];

export default function MapToolbar({ radius, onRadius, onLocate, note }) {
  return (
    <>
      <div className="row">
        <label className="small" style={{ flex: 1 }}>
          <span className="muted">Search radius</span>
          <select value={radius} onChange={(e) => onRadius(e.target.value)}>
            {RADII.map((r) => <option key={r} value={r}>{r} km</option>)}
          </select>
        </label>
        <button className="btn sm ghost" style={{ alignSelf: 'flex-end' }} onClick={onLocate}>Use my location</button>
      </div>
      {note && <p className="small muted" style={{ margin: 0 }}>{note}</p>}
    </>
  );
}
