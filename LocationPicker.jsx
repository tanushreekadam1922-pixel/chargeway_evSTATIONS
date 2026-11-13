import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TILE_ATTRIBUTION, TILE_URL } from '../../utils/mapIcons.js';

/** Small map: click it to choose a station's position. lat/lng are the current form values (strings). */
export default function LocationPicker({ lat, lng, center, zoom, onPick }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    const hasPoint = Number.isFinite(la) && Number.isFinite(ln);
    const map = L.map(elRef.current).setView(hasPoint ? [la, ln] : [center.lat, center.lng], hasPoint ? 14 : zoom);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    map.on('click', (e) => pickRef.current(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    const timer = setTimeout(() => map.invalidateSize(), 50);      // the map sits inside a modal
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!map || !Number.isFinite(la) || !Number.isFinite(ln)) return;
    if (!markerRef.current) markerRef.current = L.marker([la, ln]).addTo(map);
    else markerRef.current.setLatLng([la, ln]);
    if (!map.getBounds().contains([la, ln])) map.panTo([la, ln]);
  }, [lat, lng]);

  return <div ref={elRef} id="pickmap" />;
}
