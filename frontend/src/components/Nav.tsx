import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { animate } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

interface Props {
  user: { name: string; picture: string; email: string; permissions?: string[] };
}

const NAV_TABS = [
  { label: "Home", to: "/home" },
  { label: "Database Connections", to: "/connections" },
  { label: "Data Transfer", to: "/ingest" },
  { label: "Audit Log", to: "/audit" },
];

const ADMIN_TABS = [{ label: "Associate Lookup", to: "/admin/associate-lookup", permission: "admin:associate_lookup" }];

function getDisplayName(name: string, email: string): string {
  if (name && name.trim().length > 1) return name.trim().split(/\s+/)[0];
  return email.split("@")[0];
}

export default function Nav({ user }: Props) {
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  const userPerms = user.permissions || [];
  const visibleTabs = [...NAV_TABS, ...ADMIN_TABS.filter((t) => userPerms.includes(t.permission))];

  const activeIndex = visibleTabs.findIndex((t) => t.to === loc.pathname);

  const logout = () => {
    localStorage.removeItem("token");
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .catch(() => {})
      .finally(() => window.location.reload());
  };

  const goHome = () => {
    if (loc.pathname === "/home") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Spotlight follows mouse
  useEffect(() => {
    const nav = tabsRef.current;
    if (!nav) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHoverX(null);
      const activeEl = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = (activeEl as HTMLElement).getBoundingClientRect();
        const targetX = itemRect.left - navRect.left + itemRect.width / 2;
        animate(spotlightX.current, targetX, {
          type: "spring",
          stiffness: 200,
          damping: 20,
          onUpdate: (v) => {
            spotlightX.current = v;
            nav.style.setProperty("--spotlight-x", `${v}px`);
          },
        });
      }
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  // Ambience springs to active tab
  useEffect(() => {
    const nav = tabsRef.current;
    if (!nav) return;
    const activeEl = nav.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      const navRect = nav.getBoundingClientRect();
      const itemRect = (activeEl as HTMLElement).getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;
      animate(ambienceX.current, targetX, {
        type: "spring",
        stiffness: 200,
        damping: 20,
        onUpdate: (v) => {
          ambienceX.current = v;
          nav.style.setProperty("--ambience-x", `${v}px`);
        },
      });
    }
  }, [activeIndex]);

  return (
    <nav className="nav">
      <Link to="/home" className="nav-brand-link" onClick={goHome}>
        <span className="nav-brand">
          <img src="/images/logo.jpeg" alt="NFC Logo" className="brand-logo" />
          NFC Data Ingestion
        </span>
      </Link>

      <div className="nav-right">
        {/* Spotlight tab strip */}
        <div className="nav-spotlight-wrap" ref={tabsRef}>
          {visibleTabs.map((tab, idx) => (
            <Link
              key={tab.to}
              to={tab.to}
              data-index={idx}
              className={`nav-tab ${loc.pathname === tab.to ? "active" : ""}`}
              onClick={tab.to === "/home" ? goHome : undefined}
            >
              {tab.label}
            </Link>
          ))}
          {/* Spotlight layer — follows mouse */}
          <div className={`nav-spotlight-glow${hoverX !== null ? " nav-spotlight-glow--visible" : ""}`} />
          {/* Ambience layer — stays on active */}
          <div className="nav-ambience-line" />
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
