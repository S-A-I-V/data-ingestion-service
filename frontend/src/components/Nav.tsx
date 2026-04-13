import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

interface Props {
  user: { name: string; picture: string; email: string };
}

function getDisplayName(name: string, email: string): string {
  if (name && name.trim().length > 1) return name.trim().split(/\s+/)[0];
  return email.split("@")[0];
}

export default function Nav({ user }: Props) {
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const logout = () => {
    localStorage.removeItem("token");
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .catch(() => {})
      .finally(() => window.location.reload());
  };

  const goHome = () => {
    if (loc.pathname === "/home") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="nav">
      <Link to="/home" className="nav-brand-link" onClick={goHome}>
        <span className="nav-brand">
          <img src="/images/logo.jpeg" alt="NFC Logo" className="brand-logo" />
          NFC Data Ingestion
        </span>
      </Link>
      <div className="nav-right">
        <div className="nav-tabs">
          <Link to="/home" className={`nav-tab ${loc.pathname === "/home" ? "active" : ""}`} onClick={goHome}>
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

        {/* User Menu */}
        <div className="nav-user-menu" ref={menuRef}>
          <button type="button" className="nav-user-trigger" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="nav-username">{getDisplayName(user.name, user.email)}</span>
          </button>

          {menuOpen && (
            <div className="nav-dropdown">
              <div className="nav-dropdown-header">
                <span className="nav-dropdown-name">{user.name || user.email}</span>
                <span className="nav-dropdown-email">{user.email}</span>
              </div>
              <div className="nav-dropdown-divider" />
              <button type="button" className="nav-dropdown-item">
                <PersonIcon sx={{ fontSize: 16 }} /> Profile
              </button>
              <button type="button" className="nav-dropdown-item">
                <SettingsIcon sx={{ fontSize: 16 }} /> Settings
              </button>
              <div className="nav-dropdown-divider" />
              <button type="button" className="nav-dropdown-item nav-dropdown-danger" onClick={logout}>
                <LogoutIcon sx={{ fontSize: 16 }} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
