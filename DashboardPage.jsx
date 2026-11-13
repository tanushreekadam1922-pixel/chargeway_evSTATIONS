import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { userApi } from '../api/endpoints.js';
import { liveCharging } from '../utils/charging.js';
import useLoader from '../hooks/useLoader.js';
import useInterval from '../hooks/useInterval.js';
import BatteryPanel from '../components/dashboard/BatteryPanel.jsx';
import ChargingPanel from '../components/dashboard/ChargingPanel.jsx';
import VehicleSummary from '../components/dashboard/VehicleSummary.jsx';
import ProfileForm from '../components/dashboard/ProfileForm.jsx';
import PasswordForm from '../components/dashboard/PasswordForm.jsx';
import HistoryTable from '../components/dashboard/HistoryTable.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorBox from '../components/common/ErrorBox.jsx';

export default function DashboardPage() {
  // Refresh from the server every 15 s; between refreshes the numbers tick locally once a second.
  const { data, error, reload } = useLoader(() => Promise.all([userApi.dashboard(), userApi.me()]), { pollMs: 15000 });
  const [now, setNow] = useState(Date.now());
  const dash = data?.[0];
  const me = data?.[1];
  useInterval(() => setNow(Date.now()), dash?.charging ? 1000 : null);

  if (error && !data) return <main className="wrap page"><ErrorBox message={error} /></main>;
  if (!data) return <main className="wrap page"><Loading text="Loading your dashboard..." /></main>;
  if (!dash.vehicle) return <Navigate to="/vehicle" replace />;

  const v = dash.vehicle;
  const live = dash.charging ? liveCharging(dash.charging, v, now) : null;
  const percent = live ? live.pct : dash.battery_pct;

  return (
    <main className="wrap page stack">
      <div className="row between">
        <div>
          <h1 style={{ margin: 0 }}>Hi, {me.user.name.split(' ')[0]}</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {v.make} {v.model}{v.plate ? ` · ${v.plate}` : ''} · {v.connector}
          </p>
        </div>
        <div className="row">
          <Link className="btn spark" to="/stations">Find a charger</Link>
          <Link className="btn ghost" to="/vehicle">Edit vehicle</Link>
        </div>
      </div>

      <BatteryPanel
        percent={percent}
        charging={Boolean(live)}
        energyKwh={live ? live.energyKwh : dash.energy_kwh}
        capacityKwh={dash.capacity_kwh}
        rangeKm={live ? live.rangeKm : dash.range_km}
      />

      <ChargingPanel dash={dash} live={live} onChanged={reload} />

      <div className="grid g2">
        <ProfileForm user={me.user} />
        <PasswordForm />
      </div>

      <VehicleSummary vehicle={v} />
      <HistoryTable refreshKey={dash.charging ? dash.charging.session_id : 0} />
    </main>
  );
}
