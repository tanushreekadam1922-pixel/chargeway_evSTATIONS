import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TILE_ATTRIBUTION, TILE_URL, meIcon, pinIcon, popupNode } from '../../utils/mapIcons.js';

/**
 * Interactive Leaflet map. React owns the data (props); this component draws it.
 *  me            { lat, lng } the driver's position (the blue dot can be dragged)
 *  stations      stations to show as green / red / grey pins
 *  recommendedId gets a gold ring
 *  route         { coords, estimated } line to draw, or null
 *  fitKey        change this number to zoom the map to "me + nearest stations"
 *  focus         { id, lat, lng, seq } fly to a station and open its popup
 */
export default function StationMap({ me, stations, recommendedId, route, fitKey, focus, onMeMoved, onRoute, onSelect }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const meMarkerRef = useRef(null);
  const stationLayerRef = useRef(null);
  const markersRef = useRef(new Map());
  const callbacks = useRef({});
  callbacks.current = { onMeMoved, onRoute, onSelect };       // always the latest handlers

  // 1. create the map once
  useEffect(() => {
    const map = L.map(elRef.current).setView([20.59, 78.96], 5);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    stationLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      meMarkerRef.current = null;
      stationLayerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // 2. the driver's own (draggable) marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !me) return;
    if (!meMarkerRef.current) {
      const marker = L.marker([me.lat, me.lng], { draggable: true, zIndexOffset: 1000, title: 'You are here (drag to move)', icon: meIcon() }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        callbacks.current.onMeMoved(p.lat, p.lng);
      });
      meMarkerRef.current = marker;
      map.setView([me.lat, me.lng], 13);
    } else {
      meMarkerRef.current.setLatLng([me.lat, me.lng]);
    }
  }, [me]);

  // 3. station pins
  useEffect(() => {
    const layer = stationLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    stations.forEach((s) => {
      const marker = L.marker([s.lat, s.lng], {
        icon: pinIcon(s, s.id === recommendedId),
        title: s.name,
        zIndexOffset: s.id === recommendedId ? 500 : 0,
      });
      marker.bindPopup(() => popupNode(s, (id) => callbacks.current.onRoute(id)));
      marker.on('click', () => callbacks.current.onSelect(s.id));
      marker.addTo(layer);
      markersRef.current.set(s.id, marker);
    });
  }, [stations, recommendedId]);

  // 4. zoom to the driver + nearest stations whenever fitKey changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !me || !fitKey) return;
    const points = [[me.lat, me.lng], ...stations.slice(0, 5).map((s) => [s.lat, s.lng])];
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    else map.setView([me.lat, me.lng], 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // 5. fly to a station chosen from the list
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo([focus.lat, focus.lng], 15);
    const marker = markersRef.current.get(focus.id);
    if (marker) marker.openPopup();
  }, [focus]);

  // 6. route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return undefined;
    const style = route.estimated
      ? { color: '#1B5E75', weight: 5, dashArray: '8 10' }
      : { color: '#1B5E75', weight: 6, opacity: 0.85 };
    const line = L.polyline(route.coords, style).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [50, 50] });
    return () => { line.remove(); };
  }, [route]);

  return <div ref={elRef} id="map" role="application" aria-label="Map of charging stations" />;
}
