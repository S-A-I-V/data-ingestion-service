import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

interface Props {
  user: { name: string; picture: string; email: string; permissions?: string[] };
}

const NAV_TABS = [
  { label: "Home", to: "/home" },
  { label: "Connections", to: "/connections" },
  { label: "Data Transfer", to: "/ingest" },
  { label: "Audit Log", to: "/audit" },
];

const ADMIN_PERMISSIONS = [
  "admin:associate_lookup",
  "admin:client_onboarding",
  "admin:report_mapping",
  "admin:email_discrepancy_audit",
  "admin:report_health",
];

function getDisplayName(name: string, email: string): string {
  if (name && name.trim().length > 1) return name.trim().split(/\s+/)[0];
  return email.split("@")[0];
}

/**
 * Authenticated Nav — same grid layout as PublicNav (180px | 1fr | 200px).
 * Logo in left column, tabs in center, user menu in right column.
 */
export default function Nav({ user }: Props) {
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userPerms = user.permissions || [];
  const hasAnyAdmin = ADMIN_PERMISSIONS.some((p) => userPerms.includes(p));
  const visibleTabs = hasAnyAdmin ? [...NAV_TABS, { label: "Admin", to: "/admin" }] : [...NAV_TABS];
  const isOnAdminPage = loc.pathname.startsWith("/admin");

  const logout = () => {
    localStorage.removeItem("token");
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .catch(() => {})
      .finally(() => window.location.reload());
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="nav">
      {/* Left column — logo */}
      <Link to="/home" className="nav-brand-link">
        <span className="nav-brand">
          <img src="/images/logo.jpeg" alt="NFC Logo" className="brand-logo" />
          <span className="nav-brand-name">NFC Data Hub</span>
        </span>
      </Link>

      {/* Center column — tabs */}
      <div className="nav-center-links">
        {visibleTabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={`btn btn-sm no-underline ${(tab.to === "/admin" ? isOnAdminPage : loc.pathname === tab.to) ? "btn--active" : "btn--ghost"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Right column — user menu */}
      <div className="nav-right" ref={menuRef}>
        <button type="button" className="btn btn-sm" onClick={() => setMenuOpen(!menuOpen)}>
          {getDisplayName(user.name, user.email)}
        </button>

        {menuOpen && (
          <div className="nav-dropdown">
            <div className="nav-dropdown-header">
              <span className="nav-dropdown-name">{user.name || user.email}</span>
              <span className="nav-dropdown-email">{user.email}</span>
            </div>
            <div className="nav-dropdown-divider" />
            <button type="button" className="nav-dropdown-item">
              <PersonIcon sx={{ fontSize: 14 }} /> Profile
            </button>
            <button type="button" className="nav-dropdown-item">
              <SettingsIcon sx={{ fontSize: 14 }} /> Settings
            </button>
            <div className="nav-dropdown-divider" />
            <button type="button" className="nav-dropdown-item nav-dropdown-danger" onClick={logout}>
              <LogoutIcon sx={{ fontSize: 14 }} /> Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
