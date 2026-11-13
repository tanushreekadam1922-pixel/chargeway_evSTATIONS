import { battColor } from '../../utils/format.js';

export default function BatteryGauge({ percent, charging = false }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <svg viewBox="0 0 220 110" role="img" aria-label={`Battery at ${Math.round(p)} percent`}>
      <rect x="4" y="10" width="190" height="90" rx="16" fill="#fff" stroke="#0F2A3D" strokeWidth="5" />
      <rect x="198" y="38" width="14" height="34" rx="4" fill="#0F2A3D" />
      <rect className={charging ? 'charging-pulse' : ''} x="13" y="19" width={p * 1.74} height="72" rx="9" fill={battColor(p)} />
    </svg>
  );
}
