import { fmtMin } from '../../utils/format.js';

const CAPTION = {
  available: () => 'Free',
  occupied: (s) => `In use${s.free_in_min ? ` · free in ~${fmtMin(s.free_in_min)}` : ''}`,
  offline: () => 'Out of service',
};

/** Grid of slot buttons. Only free slots can be picked. */
export default function SlotPicker({ slots, selected, onSelect }) {
  return (
    <div className="slotgrid" role="group" aria-label="Charging slots">
      {slots.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`slotbtn ${s.status}`}
          disabled={s.status !== 'available'}
          aria-pressed={selected === s.id}
          onClick={() => onSelect(s.id)}
        >
          {s.label}
          <small>{CAPTION[s.status](s)}</small>
        </button>
      ))}
    </div>
  );
}
