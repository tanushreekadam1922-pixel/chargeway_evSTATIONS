import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const TOTAL_MS = 5000;           // the brief: show the landing page for 5 seconds

export default function Landing() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf;
    const frame = (now) => {
      const e = Math.min(TOTAL_MS, now - start);
      setElapsed(e);
      if (e < TOTAL_MS) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const timer = setTimeout(() => navigate('/login', { replace: true }), TOTAL_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [navigate]);

  const percent = Math.round(12 + (88 * elapsed) / TOTAL_MS);
  const seconds = Math.max(0, Math.ceil((TOTAL_MS - elapsed) / 1000));

  return (
    <main className="landing">
      <div>
        <h1>ChargeWay</h1>
        <p className="tag">Find a free charger before you run low, and get there.</p>
        <div className="count" aria-live="polite">
          <span>Taking you to sign in in <b>{seconds}</b>s</span>
          <Link to="/login" replace>Skip</Link>
        </div>
      </div>

      <div className="visual">
        <svg viewBox="0 0 520 440" role="img" aria-label="A route from your location to a charging station while a battery charges">
          <g stroke="#ffffff" strokeOpacity=".08" strokeWidth="2" fill="none">
            <path d="M0 330H520M0 210H520M0 90H520M110 0V440M290 0V440M450 0V440" />
          </g>
          <path id="route" d="M40 370 C150 370 140 250 250 250 S370 110 470 90" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeWidth="10" strokeLinecap="round" />
          <path className="route-line" pathLength="1" d="M40 370 C150 370 140 250 250 250 S370 110 470 90" fill="none" stroke="#F2B134" strokeWidth="6" strokeLinecap="round" />
          <circle cx="40" cy="370" r="9" fill="#fff" />
          <circle cx="40" cy="370" r="18" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
          <g transform="translate(470 90)">
            <circle r="30" fill="#17A56B" fillOpacity=".25" />
            <circle r="22" fill="#17A56B" stroke="#fff" strokeWidth="4" />
            <path d="M2 -12 -8 3h7l-1 10 10-15h-7z" fill="#fff" />
          </g>
          <circle r="9" fill="#F2B134" stroke="#0F2A3D" strokeWidth="3">
            <animateMotion dur="5s" begin="0s" fill="freeze" calcMode="linear"><mpath href="#route" /></animateMotion>
          </circle>
          <g transform="translate(250 330)">
            <rect x="0" y="0" width="230" height="84" rx="16" fill="#0F2A3D" stroke="#fff" strokeWidth="5" />
            <rect x="236" y="26" width="14" height="32" rx="4" fill="#fff" />
            <rect className="batt-fill" x="10" y="10" width="210" height="64" rx="9" fill="#F2B134" />
            <text x="250" y="-16" textAnchor="end" fontFamily="Bricolage Grotesque, system-ui, sans-serif" fontWeight="800" fontSize="40" fill="#fff">{percent}%</text>
          </g>
        </svg>
      </div>
    </main>
  );
}
