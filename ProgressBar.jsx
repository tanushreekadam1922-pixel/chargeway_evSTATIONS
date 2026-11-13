export default function ProgressBar({ percent, big = false, label = 'Progress' }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`bar${big ? ' big' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
      <i style={{ width: `${p}%` }} />
    </div>
  );
}
