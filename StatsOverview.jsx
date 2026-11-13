import StatCard from '../common/StatCard.jsx';

export default function StatsOverview({ stats: s }) {
  return (
    <>
      <div className="grid g4">
        <StatCard variant="hot" value={s.total_stations} label="Total charging stations" />
        <StatCard variant="tile" value={s.total_users} label="Registered users" />
        <StatCard variant="tile" value={s.active_stations} label="Active stations" />
        <StatCard variant="tile" value={s.available_stations} label="Stations with a free slot" />
      </div>
      <div className="grid g4" style={{ marginTop: 16 }}>
        <StatCard variant="tile" value={s.free_slots} unit={`/ ${s.total_slots}`} label="Free slots" />
        <StatCard variant="tile" value={s.active_sessions} label="Charging right now" />
        <StatCard variant="tile" value={s.energy_today_kwh} unit="kWh" label="Energy delivered today" />
        <StatCard variant="tile" value={s.blocked_users} label="Blocked users" />
      </div>
    </>
  );
}
