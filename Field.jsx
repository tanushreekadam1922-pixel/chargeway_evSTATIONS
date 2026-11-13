/** Label + input wrapper: <Field label="Email" hint="..."><input .../></Field> */
export default function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
