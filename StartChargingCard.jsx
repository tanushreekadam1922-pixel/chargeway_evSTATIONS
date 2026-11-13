import { Link } from 'react-router-dom';
import SlotPicker from './SlotPicker.jsx';
import Field from '../common/Field.jsx';

/** Pick a slot + target level, then start. Handles "closed" and "battery full" too. */
export default function StartChargingCard({ station, slots, vehicle, selectedSlot, onSelectSlot, target, minTarget, onTarget, onStart, busy }) {
  if (station.status !== 'active') {
    return (
      <div className="card">
        <h2>Station unavailable</h2>
        <p>This station is currently <b>{station.status}</b>. Try another one.</p>
        <Link className="btn spark" to="/stations">Find another station</Link>
      </div>
    );
  }
  if (vehicle.current_pct >= 99) {
    return (
      <div className="card">
        <h2>Battery is full</h2>
        <p>Update your battery level in your vehicle details if this is wrong.</p>
        <Link className="btn" to="/vehicle">Edit vehicle</Link>
      </div>
    );
  }

  const anyFree = slots.some((s) => s.status === 'available');
  return (
    <div className="card">
      <h2>Pick a slot</h2>
      <SlotPicker slots={slots} selected={selectedSlot} onSelect={onSelectSlot} />
      {!anyFree && <p className="muted" style={{ marginTop: 12 }}>All slots are in use. Check the map for another station.</p>}

      <div style={{ marginTop: 20 }}>
        <Field label={<>Charge up to: <b>{target}</b>%</>} hint={`Your battery is at ${Math.round(vehicle.current_pct)}% now.`}>
          <input type="range" min={minTarget} max="100" value={target} onChange={(e) => onTarget(Number(e.target.value))} />
        </Field>
      </div>
      <button className="btn spark block" onClick={onStart} disabled={!selectedSlot || busy}>Start charging</button>
    </div>
  );
}
