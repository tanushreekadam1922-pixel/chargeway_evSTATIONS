import Brand from '../common/Brand.jsx';

/** Split screen used by the driver and admin sign-in pages. */
export default function AuthLayout({ heading, points, footnote, badge, children }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Brand to="/" badge={badge} />
        <div>
          <h1>{heading}</h1>
          <ul>{points.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <p className="small" style={{ color: '#9fb6c4', margin: 0 }}>{footnote}</p>
      </aside>
      <main className="auth-main">
        <div className="auth-box">{children}</div>
      </main>
    </div>
  );
}
