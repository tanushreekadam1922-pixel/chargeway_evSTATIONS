import { useState } from 'react';
import { userApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Field from '../common/Field.jsx';
import ErrorBox from '../common/ErrorBox.jsx';

export default function ProfileForm({ user }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await userApi.updateProfile({ name, phone });
      updateUser({ name: name.trim() });
      toast('Profile saved', 'good');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Profile</h2>
      <form onSubmit={submit} noValidate>
        <ErrorBox message={error} />
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Email"><input value={user.email} disabled /></Field>
        <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <button className="btn" type="submit" disabled={busy}>Save profile</button>
      </form>
    </section>
  );
}
