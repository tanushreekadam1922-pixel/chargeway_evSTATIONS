import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

/** Top bar + the current page. */
export default function UserLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
