import { userApi } from '../../api/endpoints.js';
import { fmtDate, rs } from '../../utils/format.js';
import useLoader from '../../hooks/useLoader.js';
import Pill from '../common/Pill.jsx';
import Loading from '../common/Loading.jsx';

/** Past charging sessions. Re-fetches whenever `refreshKey` changes (e.g. a session started or finished). */
export default function HistoryTable({ refreshKey }) {
  const { data, loading } = useLoader(() => userApi.history(), { deps: [refreshKey] });
  const sessions = data?.sessions ?? [];

  return (
    <section className="card">
      <h2>Charging history</h2>
      {loading && !data ? <Loading /> : !sessions.length ? (
        <p className="muted">No charging sessions yet. Your first one will show up here.</p>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Station</th><th>Battery</th><th>Energy</th><th>Cost</th><th>Result</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.start_ts)}</td>
                  <td>{s.station_name}</td>
                  <td>{Math.round(s.start_pct)}% to {Math.round(s.end_pct ?? s.start_pct)}%</td>
                  <td>{(s.energy_kwh ?? 0).toFixed(1)} kWh</td>
                  <td>{rs(s.cost ?? 0)}</td>
                  <td><Pill tone={s.status === 'completed' ? 'green' : 'grey'}>{s.status === 'expired' ? 'auto-released' : s.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
