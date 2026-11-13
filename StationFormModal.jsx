import { useState } from 'react';
import { adminApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { DEFAULT_CENTER, STATION_STATUSES } from '../../utils/constants.js';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';
import ErrorBox from '../common/ErrorBox.jsx';
import LocationPicker from './LocationPicker.jsx';

/** Add a new station (station = null) or edit an existing one. */
export default function StationFormModal({ station, stations, onClose, onSaved }) {
  const toast = useToast();
  const edit = Boolean(station);
  const [form, setForm] = useState({
    name: station?.name ?? '',
    address: station?.address ?? '',
    lat: station?.lat ?? '',
    lng: station?.lng ?? '',
    price_per_kwh: station?.price_per_kwh ?? 15,
    power_kw: station?.power_kw ?? 30,
    status: station?.status ?? 'active',
    slot_count: 2,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pick = (lat, lng) => setForm((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));

  // Map starts on the first existing station, or on India when there are none.
  const center = stations.length ? { lat: stations[0].lat, lng: stations[0].lng } : DEFAULT_CENTER;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (edit) await adminApi.updateStation(station.id, form);
      else await adminApi.addStation(form);
      toast(edit ? 'Station updated' : 'Station added', 'good');
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={edit ? 'Edit station' : 'Add station'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <ErrorBox message={error} />
        <Field label="Station name"><input value={form.name} onChange={set('name')} required /></Field>
        <Field label="Address"><input value={form.address} onChange={set('address')} /></Field>
        <p className="small muted" style={{ margin: '0 0 6px' }}>Click the map to place the station, or type the coordinates.</p>
        <LocationPicker lat={form.lat} lng={form.lng} center={center} zoom={stations.length ? 14 : 5} onPick={pick} />
        <div className="grid g2">
          <Field label="Latitude"><input type="number" step="any" value={form.lat} onChange={set('lat')} required /></Field>
          <Field label="Longitude"><input type="number" step="any" value={form.lng} onChange={set('lng')} required /></Field>
          <Field label="Price (₹ per kWh)"><input type="number" step="0.1" min="0" value={form.price_per_kwh} onChange={set('price_per_kwh')} required /></Field>
          <Field label="Charger power (kW)"><input type="number" step="0.1" min="1" value={form.power_kw} onChange={set('power_kw')} required /></Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')}>{STATION_STATUSES.map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          {!edit && <Field label="Number of slots"><input type="number" min="1" max="50" value={form.slot_count} onChange={set('slot_count')} /></Field>}
        </div>
        <div className="row">
          <button className="btn spark" type="submit" disabled={busy}>{edit ? 'Save changes' : 'Add station'}</button>
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
