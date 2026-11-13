// Typical specs (approximate) so users can fill the vehicle form quickly.
// Each entry: [make, model, battery kWh, max charge kW, efficiency kWh/100km, connector]
export const EV_PRESETS = [
  ['Tata', 'Tiago EV', 24, 25, 12.5, 'CCS2'],
  ['Tata', 'Punch EV', 35, 50, 14, 'CCS2'],
  ['Tata', 'Nexon EV', 40.5, 50, 15, 'CCS2'],
  ['MG', 'Comet EV', 17.3, 3.3, 9, 'Type 2 (AC)'],
  ['MG', 'Windsor EV', 38, 45, 14, 'CCS2'],
  ['MG', 'ZS EV', 50.3, 76, 16, 'CCS2'],
  ['Mahindra', 'XUV400', 39.4, 50, 15, 'CCS2'],
  ['Hyundai', 'Kona Electric', 39.2, 50, 15, 'CCS2'],
  ['BYD', 'Atto 3', 60.5, 80, 16, 'CCS2'],
  ['Hyundai', 'Ioniq 5', 72.6, 150, 17, 'CCS2'],
];

export const STATION_STATUSES = ['active', 'inactive', 'maintenance'];
export const SLOT_STATUSES = ['available', 'occupied', 'offline'];

// Fallback map centre (India) when the server has no stations yet.
export const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
