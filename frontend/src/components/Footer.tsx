import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          NFC Data Ingestion Hub
          <span className="footer-copy"> &copy; {new Date().getFullYear()}</span>
        </div>
        <div className="footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="mailto:[email]">Contact</a>
          <a href="https://github.com/S-A-I-V/data-ingestion-service/issues" target="_blank" rel="noopener noreferrer">
            Report a Bug
          </a>
        </div>
      </div>
    </footer>
  );
}
