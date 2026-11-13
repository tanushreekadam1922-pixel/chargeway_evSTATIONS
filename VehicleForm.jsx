import { EV_PRESETS } from '../../utils/constants.js';
import Field from '../common/Field.jsx';
import ErrorBox from '../common/ErrorBox.jsx';

/** Controlled form for the EV battery details. The page owns the values; this only draws them. */
export default function VehicleForm({ values, onChange, onFill, connectors, onSubmit, busy, error, onCancel }) {
  const input = (name, extra = {}) => (
    <input name={name} value={values[name]} onChange={(e) => onChange(name, e.target.value)} {...extra} />
  );

  const applyPreset = (e) => {
    const p = EV_PRESETS[e.target.value];
    if (!p) return;
    onFill({ make: p[0], model: p[1], battery_kwh: p[2], max_charge_kw: p[3], efficiency: p[4], connector: p[5] });
  };

  const readFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      onFill(JSON.parse(await file.text()), 'Details loaded. Review them, then save.');
    } catch {
      onFill(null, '', 'That file is not valid JSON.');
    }
  };

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <ErrorBox message={error} />

      <div className="grid g2">
        <Field label="Quick fill from a common model" hint="Typical values. Check your owner's manual and edit if needed.">
          <select defaultValue="" onChange={applyPreset}>
            <option value="">Choose a model (optional)</option>
            {EV_PRESETS.map((p, i) => <option key={p[1]} value={i}>{`${p[0]} ${p[1]} (${p[2]} kWh)`}</option>)}
          </select>
        </Field>
        <Field label="Or upload vehicle details (JSON file)">
          <input type="file" accept="application/json,.json" onChange={readFile} />
        </Field>
      </div>

      <div className="grid g2">
        <Field label="Make">{input('make', { placeholder: 'Tata', required: true })}</Field>
        <Field label="Model">{input('model', { placeholder: 'Nexon EV', required: true })}</Field>
        <Field label="Year">{input('year', { type: 'number', min: 2000, max: 2100, placeholder: '2024' })}</Field>
        <Field label="Number plate">{input('plate', { placeholder: 'MH12AB1234' })}</Field>
        <Field label="Connector type">
          <select value={values.connector} onChange={(e) => onChange('connector', e.target.value)}>
            {connectors.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Max charging power (kW)" hint="The fastest your car can charge.">
          {input('max_charge_kw', { type: 'number', step: '0.1', min: 2, max: 400, required: true })}
        </Field>
        <Field label="Battery capacity (kWh)">
          {input('battery_kwh', { type: 'number', step: '0.1', min: 5, max: 250, required: true })}
        </Field>
        <Field label="Efficiency (kWh per 100 km)" hint="Used to estimate your range.">
          {input('efficiency', { type: 'number', step: '0.1', min: 5, max: 60 })}
        </Field>
      </div>

      <Field label={<>Current battery level: <b>{Math.round(values.current_pct)}</b>%</>}>
        <input type="range" min="0" max="100" step="1" value={values.current_pct} onChange={(e) => onChange('current_pct', e.target.value)} />
      </Field>

      <div className="row">
        <button className="btn spark" type="submit" disabled={busy}>Save vehicle</button>
        {onCancel && <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>}
      </div>

      <details style={{ marginTop: 18 }} className="small muted">
        <summary>Example JSON file</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{`{ "make": "Tata", "model": "Nexon EV", "year": 2024, "plate": "MH12AB1234",
  "connector": "CCS2", "battery_kwh": 40.5, "current_pct": 35, "max_charge_kw": 50, "efficiency": 15 }`}</pre>
      </details>
    </form>
  );
}
