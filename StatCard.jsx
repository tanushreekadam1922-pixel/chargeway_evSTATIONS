/**
 * A big number with a label.
 * variant: "plain" (inline in a card), "tile" (own white box) or "hot" (dark highlighted tile)
 */
export default function StatCard({ value, unit, label, variant = 'plain' }) {
  const cls = variant === 'plain' ? 'stat' : `stat tile${variant === 'hot' ? ' hot' : ''}`;
  return (
    <div className={cls}>
      <div className="v">{value}{unit && <small>{unit}</small>}</div>
      <div className="l">{label}</div>
    </div>
  );
}
