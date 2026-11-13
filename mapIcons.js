import L from 'leaflet';
import { availabilityText, esc, fmtMin, rs } from './format.js';

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';

/** Station marker: green = free slot, red = busy, grey = closed. The recommended one gets a gold ring. */
export function pinIcon(station, recommended = false) {
  const tone = station.state === 'available' ? 'green' : station.state === 'busy' ? 'red' : 'grey';
  return L.divIcon({
    className: '',
    html: `<div class="pin ${tone}${recommended ? ' rec' : ''}">${BOLT}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export const meIcon = () => L.divIcon({ className: '', html: '<div class="me-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

/** Popup content as a DOM node so the "Show route" button can have a real click handler. */
export function popupNode(station, onRoute) {
  const div = document.createElement('div');
  div.innerHTML =
    `<b>${esc(station.name)}</b><br>${esc(availabilityText(station))}<br>` +
    `${station.distance_km} km · ${esc(rs(station.price_per_kwh))}/kWh<br>` +
    (station.wait_min ? `Wait ~${esc(fmtMin(station.wait_min))}<br>` : '');
  const btn = document.createElement('button');
  btn.className = 'btn sm';
  btn.textContent = 'Show route';
  btn.onclick = () => onRoute(station.id);
  div.append(btn);
  return div;
}
