import { Link, useLocation } from "react-router-dom";

interface Props {
  user: { name: string; picture: string; email: string };
}

export default function Nav({ user }: Props) {
  const loc = useLocation();
  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => window.location.reload());
  };

  return (
    <nav className="nav">
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span className="nav-brand">
          <span className="brand-icon">⚡</span>
          NFC Ingestion
        </span>
        <div className="nav-tabs">
          <Link to="/" className={`nav-tab ${loc.pathname === "/" ? "active" : ""}`}>Database</Link>
          <Link to="/ingest" className={`nav-tab ${loc.pathname === "/ingest" ? "active" : ""}`}>Data Transfer</Link>
          <Link to="/audit" className={`nav-tab ${loc.pathname === "/audit" ? "active" : ""}`}>Audit Log</Link>
        </div>
      </div>
      <div className="nav-user">
        <span>{user.email}</span>
        {user.picture && <img src={user.picture} alt={user.name} />}
        <button type="button" className="btn btn-sm" onClick={logout}>Sign out</button>
      </div>
    </nav>
  );
}
