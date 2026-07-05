import { Link, useLocation } from "react-router-dom";

/**
 * Public navigation — Langfuse UX template.
 * Grid: Logo (left) | empty center spacer | Sign In (right).
 * Center column is intentionally empty — same 3-column grid alignment
 * as the rest of the page layout.
 */
export default function PublicNav() {
  const loc = useLocation();

  const goHome = () => {
    if (loc.pathname === "/home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav className="nav">
      {/* Left: Logo */}
      <Link to="/home" className="nav-brand-link" onClick={goHome}>
        <span className="nav-brand">
          <img src="/images/logo.jpeg" alt="NFC Logo" className="brand-logo" />
          <span className="nav-brand-name">NFC Data Hub</span>
          <span className="nav-brand-sub">by NFC Team</span>
        </span>
      </Link>

      {/* Center: empty — matches page grid alignment */}
      <div className="nav-center-links" />

      {/* Right: Sign In */}
      <div className="nav-right-ctas">
        <Link to="/login" className="btn btn-primary btn-sm no-underline">
          Sign In <span className="nav-cta-kbd">S</span>
        </Link>
      </div>
    </nav>
  );
}
