import { Link } from "react-router-dom";

interface Props {
  isAuthenticated: boolean;
}

/**
 * CTA Banner — Langfuse style "Start improving" section.
 * Dark background, clean typography, prominent CTAs.
 */
export default function CtaBanner({ isAuthenticated }: Props) {
  return (
    <div className="cta-banner lf-bracket-box">
      <div className="cta-banner-inner">
        <div>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "12px" }}>
            Get Started — Free tier: unlimited connections. No credit card required.
          </p>
          <h2 className="cta-banner-title">
            Start improving
            <br />
            your pipelines
            <br />
            in under 5 minutes.
          </h2>
        </div>
        <div className="cta-banner-text">
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <Link to={isAuthenticated ? "/ingest" : "/login"} style={{ textDecoration: "none" }}>
              <button
                className="home-btn-primary"
                style={{ background: "#fff", color: "#1a1a1a", border: "1px solid #fff" }}
              >
                Start free
              </button>
            </Link>
            <Link to="/home" style={{ textDecoration: "none" }}>
              <button className="home-btn-secondary" style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}>
                Documentation
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
