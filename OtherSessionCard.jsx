import { Link } from 'react-router-dom';

export default function OtherSessionCard() {
  return (
    <div className="card">
      <h2>You already have a session</h2>
      <p>Finish your current charging session before starting another one.</p>
      <Link className="btn" to="/dashboard">Go to dashboard</Link>
    </div>
  );
}
