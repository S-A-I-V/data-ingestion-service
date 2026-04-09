import { Link, useLocation } from "react-router-dom";

export default function PublicNav() {
  const loc = useLocation();

  const goHome = () => {
    if (loc.pathname === "/home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
        </div>
        <Link to="/login" className="btn btn-sm nav-signin-btn">
          SIGN IN
        </Link>
      </div>
    </nav>
  );
}
