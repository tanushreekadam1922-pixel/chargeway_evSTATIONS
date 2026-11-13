import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Brand from '../common/Brand.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    navigate('/login', { replace: true });
    logout();
  };

  return (
    <header className="topbar">
      <div className="wrap">
        <Brand to="/dashboard" />
        <nav aria-label="Main">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/stations">Find stations</NavLink>
          <NavLink to="/vehicle">My vehicle</NavLink>
        </nav>
        <span className="who">{user?.name}</span>
        <button className="btn sm ghost" onClick={signOut}>Sign out</button>
      </div>
    </header>
  );
}
