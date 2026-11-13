export default function ErrorBox({ message }) {
  if (!message) return null;
  return <div className="err" role="alert">{message}</div>;
}
