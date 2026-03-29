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
      <Link to="/home" style={{ textDecoration: "none" }}>
        <span className="nav-brand">
          <img src="/images/logo.jpeg" alt="NFC Logo" className="brand-logo" />
          NFC Ingestion
        </span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="nav-tabs">
          <Link to="/home" className={`nav-tab ${loc.pathname === "/home" ? "active" : ""}`}>
            Home
          </Link>
          <Link to="/connections" className={`nav-tab ${loc.pathname === "/connections" ? "active" : ""}`}>
            Database
          </Link>
          <Link to="/ingest" className={`nav-tab ${loc.pathname === "/ingest" ? "active" : ""}`}>
            Data Transfer
          </Link>
          <Link to="/audit" className={`nav-tab ${loc.pathname === "/audit" ? "active" : ""}`}>
            Audit Log
          </Link>
        </div>
        <div className="nav-user">
          {user.picture && <img src={user.picture} alt={user.name} />}
          <button type="button" className="btn btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
