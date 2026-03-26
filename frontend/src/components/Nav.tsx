import { Link, useLocation } from "react-router-dom";

interface Props {
  user: { name: string; picture: string; email: string };
}

export default function Nav({ user }: Props) {
  const loc = useLocation();
  return (
    <nav className="nav">
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <span className="nav-brand">NFC Ingestion</span>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
          <Link to="/" className={`tab ${loc.pathname === "/" ? "active" : ""}`}>Connections</Link>
          <Link to="/ingest" className={`tab ${loc.pathname === "/ingest" ? "active" : ""}`}>Ingest</Link>
          <Link to="/audit" className={`tab ${loc.pathname === "/audit" ? "active" : ""}`}>Audit Log</Link>
        </div>
      </div>
      <div className="nav-user">
        <span style={{ fontSize: 13, color: "#8b949e" }}>{user.email}</span>
        {user.picture && <img src={user.picture} alt={user.name} />}
      </div>
    </nav>
  );
}
