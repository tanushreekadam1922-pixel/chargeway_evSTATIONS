import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Brand from '../common/Brand.jsx';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    navigate('/admin/login', { replace: true });
    logout();
  };

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Brand to="/admin" badge="Admin" />
          <nav aria-label="Account" />
          <span className="who">{user?.email}</span>
          <button className="btn sm ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="wrap page">
        <nav className="tabs" aria-label="Admin sections">
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/stations">Stations</NavLink>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/activity">Activity</NavLink>
        </nav>
        <Outlet />
      </main>
    </>
  );
}
