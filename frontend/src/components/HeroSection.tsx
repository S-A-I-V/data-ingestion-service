import { Link } from "react-router-dom";

interface Props {
  isAuthenticated: boolean;
}

export default function HeroSection({ isAuthenticated }: Props) {
  return (
    <>
      {/* Stats ticker bar */}
      <div className="home-stats-ticker">
        <span className="home-stats-ticker-item">
          Used by <strong>50+</strong> internal teams
        </span>
        <span className="home-stats-ticker-dot" />
        <span className="home-stats-ticker-item">
          <strong>10M+</strong> rows ingested/month
        </span>
        <span className="home-stats-ticker-dot" />
        <span className="home-stats-ticker-item">
          <strong>30+</strong> connectors supported
        </span>
      </div>

      {/* Hero content */}
      <div className="home-hero">
        <h1 className="home-title">
          Universal Data <span className="home-title-accent">Ingestion</span> Platform
        </h1>
        <p className="home-description">
          Connect to any database, transfer data seamlessly, and monitor your pipelines in real-time. Collaborate with
          your team to continuously improve quality, reliability and speed of your data operations.
        </p>
        <div className="home-ctas">
          <Link to={isAuthenticated ? "/ingest" : "/login"} style={{ textDecoration: "none" }}>
            <button className="home-btn-primary">
              Start free <span className="btn-kbd">S</span>
            </button>
          </Link>
          <Link to={isAuthenticated ? "/connections" : "/home"} style={{ textDecoration: "none" }}>
            <button className="home-btn-secondary">
              Documentation <span className="btn-kbd">D</span>
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
