import { Link } from 'react-router-dom';

export default function ActiveSessionCard({ slot, onFinish, busy }) {
  return (
    <div className="card">
      <h2>You are charging here</h2>
      <p>{slot ? slot.label : 'Your slot'} is reserved for you. When you unplug, tap Finish so the slot shows as free for others.</p>
      <div className="row">
        <button className="btn danger" onClick={onFinish} disabled={busy}>Finish charging</button>
        <Link className="btn ghost" to="/dashboard">See progress</Link>
      </div>
    </div>
  );
}
