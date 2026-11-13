import { useState } from 'react';
import { adminApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { STATION_STATUSES } from '../../utils/constants.js';
import Pill from '../common/Pill.jsx';
import SlotChip from './SlotChip.jsx';

function stateBadge(s) {
  if (s.state === 'available') return <Pill tone="green">Free slot</Pill>;
  if (s.state === 'busy') return <Pill tone="red">Busy</Pill>;
  return <Pill tone="grey">Closed</Pill>;
}

/** One station in the admin list: status, price, slots, edit / QR / delete. */
export default function AdminStationCard({ station: s, onChanged, onEdit, onQr }) {
  const toast = useToast();
  const [priceDraft, setPriceDraft] = useState(null);      // null = show the saved price

  // Run an API call, show the result, then refresh the list (also after errors, so the UI never lies).
  const run = async (fn, okMessage) => {
    try {
      await fn();
      if (okMessage) toast(okMessage, 'good');
    } catch (e) {
      toast(e.message, 'bad');
    }
    await onChanged();
  };

  const savePrice = () => run(async () => {
    await adminApi.setPrice(s.id, priceDraft);
    setPriceDraft(null);
  }, 'Price updated');

  const remove = () => {
    if (confirm(`Delete "${s.name}" and all of its slots and session history?`)) run(() => adminApi.deleteStation(s.id), 'Station deleted');
  };
  const removeSlot = (slotId) => {
    if (confirm('Delete this slot? Any session running on it will be cancelled.')) run(() => adminApi.deleteSlot(slotId), 'Slot deleted');
  };

  return (
    <article className="st-card">
      <div className="row between">
        <div>
          <h3 style={{ margin: 0 }}>{s.name} {stateBadge(s)}</h3>
          <div className="small muted">{s.address} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</div>
        </div>
        <div className="row">
          <select style={{ width: 'auto' }} value={s.status} aria-label="Station status"
            onChange={(e) => run(() => adminApi.setStationStatus(s.id, e.target.value), 'Updated')}>
            {STATION_STATUSES.map((o) => <option key={o}>{o}</option>)}
          </select>
          <button className="btn sm ghost" onClick={() => onQr(s)}>QR code</button>
          <button className="btn sm ghost" onClick={() => onEdit(s)}>Edit</button>
          <button className="btn sm danger ghost" onClick={remove}>Delete</button>
        </div>
      </div>

      <div className="row" style={{ margin: '14px 0' }}>
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Price ₹/kWh
          <input type="number" step="0.1" min="0" style={{ width: 90 }}
            value={priceDraft ?? s.price_per_kwh} onChange={(e) => setPriceDraft(e.target.value)} />
        </label>
        <button className="btn sm" onClick={savePrice} disabled={priceDraft === null}>Update price</button>
        <span className="small muted">{s.power_kw} kW charger</span>
      </div>

      <div className="row" style={{ gap: 8 }}>
        {s.slots.map((slot) => (
          <SlotChip key={slot.id} slot={slot}
            onStatus={(slotId, status) => run(() => adminApi.setSlotStatus(slotId, status), 'Updated')}
            onDelete={removeSlot} />
        ))}
        <button className="btn sm ghost" onClick={() => run(() => adminApi.addSlot(s.id), 'Slot added')}>Add slot</button>
      </div>
    </article>
  );
}
