import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui";

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
        <Button asChild size="sm" className="nav-signin-btn">
          <Link to="/login">SIGN IN</Link>
        </Button>
      </div>
    </nav>
  );
}
