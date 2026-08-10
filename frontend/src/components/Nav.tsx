import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  PERM_ADMIN_CONNECTIONS,
  PERM_ADMIN_CONNECTIONS_VIEW,
  PERM_ADMIN_DATA_TRANSFER,
  PERM_ADMIN_DATA_TRANSFER_PREVIEW,
  PERM_ADMIN_AUDIT,
} from "../constants/permissions";

interface Props {
  user: { name: string; picture: string; email: string; permissions?: string[] };
}

/** Permission requirements for each nav tab */
const TAB_PERMISSIONS: Record<string, string[]> = {
  "/connections": [PERM_ADMIN_CONNECTIONS, PERM_ADMIN_CONNECTIONS_VIEW],
  "/ingest": [PERM_ADMIN_DATA_TRANSFER, PERM_ADMIN_DATA_TRANSFER_PREVIEW],
  "/audit": [PERM_ADMIN_AUDIT],
};

const NAV_TABS = [
  { label: "Home", to: "/home", screenId: "nfc-admin" },
  { label: "Connections", to: "/connections", screenId: "dashboard" },
  { label: "Data Transfer", to: "/ingest", screenId: "ingest" },
  { label: "Audit Log", to: "/audit", screenId: "audit-log" },
];

const ADMIN_PERMISSIONS = [
  "admin:associate_lookup",
  "admin:client_onboarding",
  "admin:job_onboarding",
  "admin:report_mapping",
  "admin:email_discrepancy_audit",
  "admin:report_health",
  "admin:manage_users",
  "admin:job_sla_analyzer",
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

  // Use permissions from user prop (already fetched in App.tsx)
  const userPerms = user.permissions || [];
  const hasAnyAdmin = ADMIN_PERMISSIONS.some((p) => userPerms.includes(p));

  // Filter tabs based on user permissions
  const visibleTabs = NAV_TABS.filter((tab) => {
    const requiredPerms = TAB_PERMISSIONS[tab.to];
    // If no permissions required (e.g., Home), always show
    if (!requiredPerms) return true;
    // Show if user has any of the required permissions
    return requiredPerms.some((p) => userPerms.includes(p));
  });

  // Add Admin tab if user has any admin permissions
  if (hasAnyAdmin) {
    visibleTabs.push({ label: "Admin", to: "/admin" });
  }

  const isOnAdminPage = loc.pathname.startsWith("/admin");

  const logout = () => {
    // In MAF mode: use MAF's logout which handles session clearing + redirect
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maf = (window as any).maf;
    if (maf?.useMAFContext) {
      try {
        const ctx = maf.useMAFContext();
        if (ctx?.actions?.logout) {
          ctx.actions.logout();
          return;
        }
      } catch {
        // Fall through to legacy logout
      }
    }
    // Legacy fallback (Vite standalone mode)
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

  // Detect MAF shell
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mafContext = (window as any).maf?.useMAFContext?.();
  const mafNavigate = mafContext?.actions?.navigate;

  const handleNavClick = (tab: (typeof NAV_TABS)[0]) => {
    if (mafNavigate && tab.screenId) {
      // MAF mode — navigate between screens
      mafNavigate({ screenId: tab.screenId });
    }
    // In Vite standalone, the <Link> handles navigation via React Router
  };

  return (
    <nav className="nav">
      {/* Left column — logo */}
      <Link to="/home" className="nav-brand-link" onClick={() => mafNavigate?.({ screenId: "nfc-admin" })}>
        <span className="nav-brand">
          <span
            className="brand-logo"
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "#1a1a1a",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            N
          </span>
          <span className="nav-brand-name">NFC Data Hub</span>
        </span>
      </Link>

      {/* Center column — tabs */}
      <div className="nav-center-links">
        {visibleTabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            onClick={(e) => {
              if (mafNavigate && tab.screenId) {
                e.preventDefault();
                mafNavigate({ screenId: tab.screenId });
              }
            }}
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
