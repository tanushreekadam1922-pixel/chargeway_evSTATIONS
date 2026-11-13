import { adminApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtDate } from '../../utils/format.js';
import Pill from '../common/Pill.jsx';

export default function UserTable({ users, onChanged }) {
  const toast = useToast();

  const run = async (fn, okMessage) => {
    try {
      await fn();
      toast(okMessage, 'good');
    } catch (e) {
      toast(e.message, 'bad');
    }
    await onChanged();
  };

  const toggle = (u) => {
    const status = u.status === 'active' ? 'blocked' : 'active';
    run(() => adminApi.setUserStatus(u.id, status), status === 'blocked' ? 'User blocked' : 'User unblocked');
  };
  const remove = (u) => {
    if (confirm('Delete this user and all of their data? This cannot be undone.')) run(() => adminApi.deleteUser(u.id), 'User deleted');
  };

  if (!users.length) return <p className="muted">No users have registered yet.</p>;

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Vehicle</th><th>Sessions</th><th>Joined</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.phone || '-'}</td>
              <td>{u.vehicle || '-'}</td>
              <td>{u.sessions}</td>
              <td>{fmtDate(u.created_at)}</td>
              <td><Pill tone={u.status === 'active' ? 'green' : 'red'}>{u.status}</Pill></td>
              <td className="right" style={{ whiteSpace: 'nowrap' }}>
                <button className="btn sm ghost" onClick={() => toggle(u)}>{u.status === 'active' ? 'Block' : 'Unblock'}</button>{' '}
                <button className="btn sm danger ghost" onClick={() => remove(u)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
