import { Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import UserLayout from './components/layout/UserLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';

import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import VehiclePage from './pages/VehiclePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import FindStationsPage from './pages/FindStationsPage.jsx';
import ChargePage from './pages/ChargePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminStations from './pages/admin/AdminStations.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminActivity from './pages/admin/AdminActivity.jsx';

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* signed-in drivers */}
      <Route element={<ProtectedRoute role="user" />}>
        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vehicle" element={<VehiclePage />} />
          <Route path="/stations" element={<FindStationsPage />} />
          <Route path="/charge/:stationId" element={<ChargePage />} />
        </Route>
      </Route>

      {/* administrator */}
      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="stations" element={<AdminStations />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="activity" element={<AdminActivity />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
