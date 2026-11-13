export default function VehicleSummary({ vehicle: v }) {
  return (
    <section className="card">
      <h2>Vehicle details</h2>
      <dl className="kv">
        <dt>Vehicle</dt><dd>{v.make} {v.model} {v.year ? `(${v.year})` : ''}</dd>
        <dt>Connector</dt><dd>{v.connector || '-'}</dd>
        <dt>Max charging power</dt><dd>{v.max_charge_kw} kW</dd>
        <dt>Efficiency</dt><dd>{v.efficiency} kWh / 100 km</dd>
      </dl>
    </section>
  );
}
