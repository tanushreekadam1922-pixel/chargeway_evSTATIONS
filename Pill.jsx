/** tone: green | red | grey | amber */
export default function Pill({ tone = 'grey', children }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
