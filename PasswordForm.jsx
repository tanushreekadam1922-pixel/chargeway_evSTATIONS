import { useState } from 'react';
import { userApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import Field from '../common/Field.jsx';
import ErrorBox from '../common/ErrorBox.jsx';

export default function PasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await userApi.changePassword({ current_password: current, new_password: next });
      setCurrent('');
      setNext('');
      toast('Password updated', 'good');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Change password</h2>
      <form onSubmit={submit} noValidate>
        <ErrorBox message={error} />
        <Field label="Current password">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label="New password" hint="At least 8 characters, with a letter and a number.">
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </Field>
        <button className="btn" type="submit" disabled={busy}>Update password</button>
      </form>
    </section>
  );
}
