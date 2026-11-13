import { SLOT_STATUSES } from '../../utils/constants.js';

const DOT = { available: 'green', occupied: 'red', offline: 'grey' };

/** One slot: coloured dot, status dropdown, delete button. */
export default function SlotChip({ slot, onStatus, onDelete }) {
  return (
    <div className="slot-chip">
      <span className={`dot ${DOT[slot.status]}`} />
      {slot.label}
      <select value={slot.status} onChange={(e) => onStatus(slot.id, e.target.value)} aria-label={`${slot.label} status`}>
        {SLOT_STATUSES.map((o) => <option key={o}>{o}</option>)}
      </select>
      <button className="btn sm danger ghost" style={{ padding: '2px 8px' }} onClick={() => onDelete(slot.id)} aria-label={`Delete ${slot.label}`}>×</button>
    </div>
  );
}
