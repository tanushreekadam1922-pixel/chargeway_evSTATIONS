import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/** Only lets signed-in users with the right role through; everyone else goes to the matching login page. */
export default function ProtectedRoute({ role = 'user' }) {
  const { isAuthed, user } = useAuth();
  const location = useLocation();

  if (!isAuthed || user.role !== role) {
    if (role === 'admin') return <Navigate to="/admin/login" replace />;
    // After scanning a charger's QR code, bring the driver back to that charger once they sign in.
    const next = location.pathname.startsWith('/charge/') ? `?next=${encodeURIComponent(location.pathname)}` : '';
    return <Navigate to={`/login${next}`} replace />;
  }
  return <Outlet />;
}
