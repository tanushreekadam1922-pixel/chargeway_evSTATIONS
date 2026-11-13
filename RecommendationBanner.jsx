export default function RecommendationBanner({ message, rangeKm }) {
  if (!message) return null;
  return (
    <div className="rec-banner">
      <b>Recommended</b><br />{message}
      {rangeKm != null && <div className="small" style={{ marginTop: 6, color: '#b9cdd8' }}>Estimated range: {rangeKm} km</div>}
    </div>
  );
}
