import { Link } from 'react-router-dom';
import { BoltIcon } from './Icons.jsx';

export default function Brand({ to = '/', badge }) {
  return (
    <Link className="brand" to={to}>
      <BoltIcon />
      <span>ChargeWay</span>
      {badge && <small>{badge}</small>}
    </Link>
  );
}
