import Pill from '../common/Pill.jsx';

/** Green = a free slot, red = busy, grey = closed. `detailed` adds the free-slot count. */
export default function AvailabilityPill({ station, detailed = false }) {
  if (station.state === 'available')
    return <Pill tone="green">{detailed ? `Available · ${station.available_slots}/${station.total_slots} free` : 'Available'}</Pill>;
  if (station.state === 'busy')
    return <Pill tone="red">{detailed ? 'Busy · all slots in use' : 'Busy'}</Pill>;
  return <Pill tone="grey">{station.status === 'active' ? 'No working slots' : station.status}</Pill>;
}
