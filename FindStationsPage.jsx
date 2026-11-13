import { useEffect, useMemo, useRef, useState } from 'react';
import { stationApi, userApi } from '../api/endpoints.js';
import { DEFAULT_CENTER } from '../utils/constants.js';
import { fetchRoute, fallbackRoute } from '../utils/routing.js';
import useLoader from '../hooks/useLoader.js';
import StationMap from '../components/map/StationMap.jsx';
import MapToolbar from '../components/map/MapToolbar.jsx';
import RecommendationBanner from '../components/map/RecommendationBanner.jsx';
import StationCard from '../components/map/StationCard.jsx';
import RoutePanel from '../components/map/RoutePanel.jsx';
import ErrorBox from '../components/common/ErrorBox.jsx';

export default function FindStationsPage() {
  const [me, setMe] = useState(null);                    // driver position { lat, lng }
  const [note, setNote] = useState('');
  const [radius, setRadius] = useState('50');
  const [demoCenter, setDemoCenter] = useState(DEFAULT_CENTER);
  const [fitKey, setFitKey] = useState(0);
  const [focus, setFocus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);   // station highlighted in the list
  const [routeState, setRouteState] = useState(null);    // { station, loading, route }
  const needsFit = useRef(false);
  const focusSeq = useRef(0);

  // Stations near "me", refreshed every 30 s so availability stays current.
  const { data, error } = useLoader(
    () => stationApi.nearby(me.lat, me.lng, radius),
    { deps: [me?.lat, me?.lng, radius], enabled: Boolean(me), pollMs: 30000 },
  );
  const stations = useMemo(() => data?.stations ?? [], [data]);

  // After new results arrive for a new position / radius, zoom the map to them once.
  useEffect(() => {
    if (data && needsFit.current) { needsFit.current = false; setFitKey((k) => k + 1); }
  }, [data]);

  /* ---------- driver location ---------- */
  const moveTo = (lat, lng, message) => {
    needsFit.current = true;
    setRouteState(null);
    setMe({ lat, lng });
    setNote(message);
  };

  const goDemo = (reason, center = demoCenter) => moveTo(center.lat, center.lng, `${reason} Showing the demo area. Drag the blue dot to change your position.`);

  const locate = (center = demoCenter) => {
    if (!navigator.geolocation) return goDemo('Your browser has no location support.', center);
    setNote('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      (p) => moveTo(p.coords.latitude, p.coords.longitude, 'Using your current location. Drag the blue dot to try another spot.'),
      () => goDemo('Location is blocked or unavailable (browsers only allow it on https or localhost).', center),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // On arrival: learn where the demo stations are, then try the real location.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let center = DEFAULT_CENTER;
      try { center = (await userApi.config()).center; } catch { /* keep default */ }
      if (cancelled) return;
      setDemoCenter(center);
      locate(center);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- route navigation ---------- */
  const showRoute = async (id) => {
    const station = stations.find((s) => s.id === id);
    if (!station || !me) return;
    setRouteState({ station, loading: true, route: null });
    let route;
    try { route = await fetchRoute(me, station); } catch { route = fallbackRoute(me, station); }
    setRouteState((s) => (s && s.station.id === id ? { station, loading: false, route } : s));
  };

  const selectStation = (s) => {
    focusSeq.current += 1;
    setSelectedId(s.id);
    setFocus({ id: s.id, lat: s.lat, lng: s.lng, seq: focusSeq.current });
  };

  const sorted = useMemo(
    () => [...stations].sort((a, b) => (b.id === data?.recommended_id) - (a.id === data?.recommended_id) || a.distance_km - b.distance_km),
    [stations, data],
  );

  return (
    <div className="mapwrap">
      <aside className="side" aria-label="Nearby charging stations">
        <MapToolbar
          radius={radius}
          onRadius={(r) => { needsFit.current = true; setRadius(r); }}
          onLocate={() => locate()}
          note={note}
        />
        <ErrorBox message={error} />

        {routeState && (
          <RoutePanel
            station={routeState.station} from={me} route={routeState.route} loading={routeState.loading}
            onClose={() => setRouteState(null)}
          />
        )}

        {data && <RecommendationBanner message={data.message} rangeKm={data.range_km} />}

        <div className="stack">
          {!data && me && !error && <p className="muted">Finding stations...</p>}
          {data && !sorted.length && (
            <div className="card">
              <p><b>No stations within {radius} km.</b></p>
              <p className="muted small">Try a larger radius, or jump to the demo area where the sample stations are.</p>
              <button className="btn sm spark" onClick={() => { setRadius('50'); goDemo('Moved to the demo area.'); }}>Go to demo area</button>
            </div>
          )}
          {sorted.map((s) => (
            <StationCard key={s.id} station={s} recommended={s.id === data.recommended_id} selected={s.id === selectedId} onSelect={selectStation} onRoute={showRoute} />
          ))}
        </div>
      </aside>

      <StationMap
        me={me}
        stations={stations}
        recommendedId={data?.recommended_id ?? null}
        route={routeState?.route ?? null}
        fitKey={fitKey}
        focus={focus}
        onMeMoved={(lat, lng) => moveTo(lat, lng, 'Using the position you chose on the map.')}
        onRoute={showRoute}
        onSelect={setSelectedId}
      />
    </div>
  );
}
