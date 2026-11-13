// Small formatting helpers shared by many components.

export function fmtMin(minutes) {
  const m = Math.round(minutes);
  if (m < 1) return '< 1 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (ts) => new Date(ts).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const rs = (n) => `₹${Math.round(n * 100) / 100}`;

/** Battery colour: red under 20%, amber under 50%, green otherwise. */
export const battColor = (pct) => (pct < 20 ? '#D2433D' : pct < 50 ? '#F2B134' : '#17A56B');

/** Escape text before putting it into an HTML string (only needed for Leaflet popups). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Plain-text availability, e.g. "Available (2/4 free)". */
export function availabilityText(s) {
  if (s.state === 'available') return `Available (${s.available_slots}/${s.total_slots} free)`;
  if (s.state === 'busy') return 'Busy (all slots in use)';
  return s.status === 'active' ? 'No working slots' : s.status;
}

/** Only allow redirects to our own pages, e.g. "/charge/3". */
export function safeNext(value) {
  return typeof value === 'string' && /^\/[a-z0-9\-_/]*$/i.test(value) && !value.startsWith('//') ? value : null;
}
