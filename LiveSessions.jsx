import { fmtTime } from '../../utils/format.js';

export default function LiveSessions({ sessions }) {
  return (
    <div className="card">
      <h2>Live charging sessions</h2>
      {!sessions.length ? <p className="muted">Nobody is charging at the moment.</p> : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Driver</th><th>Station</th><th>Started</th><th>Battery</th></tr></thead>
            <tbody>
              {sessions.map((x) => (
                <tr key={x.id}>
                  <td>{x.user_name}</td>
                  <td>{x.station_name} · {x.slot_label}</td>
                  <td>{fmtTime(x.start_ts)}</td>
                  <td>{Math.round(x.start_pct)}% to {x.target_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
