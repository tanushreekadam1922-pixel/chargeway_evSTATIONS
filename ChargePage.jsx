import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { stationApi, userApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { fmtMin } from '../utils/format.js';
import useLoader from '../hooks/useLoader.js';
import StationHeader from '../components/charge/StationHeader.jsx';
import StartChargingCard from '../components/charge/StartChargingCard.jsx';
import ActiveSessionCard from '../components/charge/ActiveSessionCard.jsx';
import OtherSessionCard from '../components/charge/OtherSessionCard.jsx';
import FinishedCard from '../components/charge/FinishedCard.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorBox from '../components/common/ErrorBox.jsx';

/** The page a driver lands on after scanning the QR code at a charger: /charge/:stationId */
export default function ChargePage() {
  const { stationId } = useParams();
  const id = Number(stationId);
  const valid = Number.isInteger(id) && id > 0;
  const toast = useToast();

  const { data, error, reload } = useLoader(
    () => Promise.all([userApi.me(), stationApi.get(id)]),
    { deps: [id], enabled: valid, pollMs: 20000 },
  );
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(null);

  if (!valid) {
    return (
      <main className="wrap page" style={{ maxWidth: 720 }}>
        <ErrorBox message="This QR code does not point to a charging station. Scan the code on the charger again." />
      </main>
    );
  }
  if (error && !data) {
    return (
      <main className="wrap page stack" style={{ maxWidth: 720 }}>
        <ErrorBox message={error} />
        <Link className="btn" to="/stations">Back to map</Link>
      </main>
    );
  }
  if (!data) return <main className="wrap page"><Loading text="Loading station..." /></main>;

  const [me, detail] = data;
  const vehicle = me.vehicle;
  if (!vehicle) return <Navigate to={`/vehicle?next=${encodeURIComponent(`/charge/${id}`)}`} replace />;
  if (finished) return <main className="wrap page" style={{ maxWidth: 720 }}><FinishedCard result={finished} /></main>;

  const { station, slots, my_session: mine } = detail;
  const mineHere = mine && mine.station_id === station.id;
  const slotId = slots.some((s) => s.id === selectedSlot && s.status === 'available') ? selectedSlot : null;
  const minTarget = Math.min(100, Math.floor(vehicle.current_pct) + 1);
  const targetValue = Math.min(100, Math.max(minTarget, target ?? 80));

  const start = async () => {
    setBusy(true);
    try {
      const r = await stationApi.startCharging({ station_id: id, slot_id: slotId, target_pct: targetValue });
      toast(`Charging started. About ${fmtMin(r.expected_min)} to reach your target.`, 'good');
      setSelectedSlot(null);
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      await reload();
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      setFinished(await stationApi.finishCharging());
    } catch (e) {
      toast(e.message, 'bad');
      setBusy(false);
    }
  };

  return (
    <main className="wrap page stack" style={{ maxWidth: 720 }}>
      <StationHeader station={station} />

      {mineHere ? (
        <ActiveSessionCard slot={slots.find((s) => s.id === mine.slot_id)} onFinish={finish} busy={busy} />
      ) : mine ? (
        <OtherSessionCard />
      ) : (
        <StartChargingCard
          station={station} slots={slots} vehicle={vehicle}
          selectedSlot={slotId} onSelectSlot={setSelectedSlot}
          target={targetValue} minTarget={minTarget} onTarget={setTarget}
          onStart={start} busy={busy}
        />
      )}

      <p className="small muted">
        Availability is reported by drivers who tap Start and Finish charging, so it may not always be exact.
        Slots are released automatically if a session is left open.
      </p>
    </main>
  );
}
