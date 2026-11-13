import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { safeNext } from '../utils/format.js';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import LoginForm from '../components/auth/LoginForm.jsx';
import RegisterForm from '../components/auth/RegisterForm.jsx';

/** Sign in / create account. mode = "login" | "register" (two tabs, two URLs). */
export default function AuthPage({ mode }) {
  const { isAuthed, user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const query = next ? `?next=${encodeURIComponent(next)}` : '';

  // Already signed in when you open this page? Skip the form (checked once, on arrival).
  useEffect(() => {
    if (isAuthed && user.role === 'user') navigate(next || '/dashboard', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = (res) => {
    login(res);
    // New drivers (or drivers without a vehicle) add their battery details first.
    navigate(res.has_vehicle ? next || '/dashboard' : `/vehicle${query}`, { replace: true });
  };

  return (
    <AuthLayout
      heading="Charge without the guesswork."
      points={[
        'See which stations have a free slot right now',
        'Get the best match for distance, wait and price',
        'Follow the route and track your charging',
      ]}
      footnote="Station availability is reported by drivers who scan the QR code at the charger."
    >
      <nav className="tabs" aria-label="Account">
        <Link to={`/login${query}`} aria-current={mode === 'login' ? 'page' : undefined}>Sign in</Link>
        <Link to={`/register${query}`} aria-current={mode === 'register' ? 'page' : undefined}>Create account</Link>
      </nav>

      {mode === 'login' ? <LoginForm onSuccess={handleSuccess} /> : <RegisterForm onSuccess={handleSuccess} />}
    </AuthLayout>
  );
}