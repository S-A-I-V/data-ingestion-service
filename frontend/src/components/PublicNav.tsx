import { Link, useLocation } from "react-router-dom";

/**
 * Public navigation — minimal template.
 * Grid: Logo (left) | empty center spacer | User name or Sign In (right).
 * In MAF mode, the user is always authenticated so we show their name.
 */

interface Props {
  userName?: string;
  userEmail?: string;
}

export default function PublicNav({ userName, userEmail }: Props) {
  const loc = useLocation();

  const goHome = () => {
    if (loc.pathname === "/home" || loc.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "");

  return (
    <nav className="nav">
      {/* Left: Logo */}
      <Link to="/home" className="nav-brand-link" onClick={goHome}>
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
          <span className="nav-brand-sub">by NFC Team</span>
        </span>
      </Link>

      {/* Center: nav links */}
      <div className="nav-center-links">
        <Link to="/home" className="btn btn-sm btn--active no-underline" onClick={goHome}>
          Home
        </Link>
      </div>

      {/* Right: User name (MAF mode) or Sign In fallback */}
      <div className="nav-right-ctas">
        {displayName ? (
          <span className="btn btn-sm">{displayName}</span>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm no-underline">
            Sign In <span className="nav-cta-kbd">S</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
