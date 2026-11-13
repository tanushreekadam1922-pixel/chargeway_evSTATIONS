import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { userApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { safeNext } from '../utils/format.js';
import useLoader from '../hooks/useLoader.js';
import VehicleForm from '../components/vehicle/VehicleForm.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorBox from '../components/common/ErrorBox.jsx';

const EMPTY = {
  make: '', model: '', year: '', plate: '', connector: 'CCS2',
  battery_kwh: '', current_pct: 50, max_charge_kw: '', efficiency: 16,
};
const FIELDS = Object.keys(EMPTY);

/** Add or edit the EV battery details (first step after registering). */
export default function VehiclePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const { data: me, error: loadError } = useLoader(() => userApi.me());
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(me?.vehicle);

  // Fill the form once with the saved vehicle (if there is one).
  useEffect(() => {
    if (me?.vehicle) setValues((v) => ({ ...v, ...Object.fromEntries(FIELDS.map((k) => [k, me.vehicle[k] ?? v[k]])) }));
  }, [me?.vehicle]);

  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  // Used by the model picker and the JSON upload. A message is shown as a toast.
  const fill = (data, okMessage, errMessage) => {
    if (errMessage) return setError(errMessage);
    setError('');
    setValues((v) => {
      const merged = { ...v };
      FIELDS.forEach((k) => { if (data[k] !== undefined && data[k] !== null) merged[k] = data[k]; });
      return merged;
    });
    if (okMessage) toast(okMessage, 'good');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await userApi.saveVehicle(values);
      toast('Vehicle saved', 'good');
      navigate(next || '/dashboard');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="wrap page" style={{ maxWidth: 760 }}>
      <h1>{isEdit ? 'Edit your vehicle' : 'Your electric vehicle'}</h1>
      <p className="muted">We use your battery details to estimate range, charging time and the best station for you.</p>
      <ErrorBox message={loadError} />
      {!me && !loadError ? <Loading /> : me && (
        <VehicleForm
          values={values} onChange={change} onFill={fill} connectors={me.connectors}
          onSubmit={submit} busy={busy} error={error}
          onCancel={isEdit ? () => navigate('/dashboard') : undefined}
        />
      )}
    </main>
  );
}
