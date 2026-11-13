import { fmtDate } from '../../utils/format.js';

export default function ActivityList({ rows, title = 'Recent activity' }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {!rows.length ? <p className="muted">Nothing yet.</p> : (
        <div className="divided">
          {rows.map((r) => (
            <div key={r.id} style={{ padding: '8px 0' }}>
              <b>{r.action.replace(/_/g, ' ')}</b> <span className="muted small">{fmtDate(r.ts)}</span>
              <div className="small muted">{r.actor}{r.detail ? ` · ${r.detail}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
