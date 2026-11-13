import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="center-msg">
      <h1>Page not found</h1>
      <p className="muted">That address does not exist.</p>
      <div><Link className="btn spark" to="/dashboard">Go to dashboard</Link></div>
    </main>
  );
}
