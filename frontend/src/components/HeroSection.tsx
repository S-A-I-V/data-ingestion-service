import { Link } from "react-router-dom";
import { Button } from "./ui";

interface Props {
  isAuthenticated: boolean;
}

export default function HeroSection({ isAuthenticated }: Props) {
  return (
    <div className="home-hero">
      <div className="home-subtitle">THE UNIVERSAL DATA INGESTION PLATFORM</div>
      <h1 className="home-title">
        <span className="home-title-bold">DATA</span>
        <span className="home-title-accent">ingest</span>
        <span className="home-title-bold">HUB</span>
      </h1>
      <div className="home-byline-fade">
        <div className="home-byline-wrap">
          <div className="home-byline">
            by <img src="/images/logo.jpeg" alt="NFC Logo" className="byline-logo" /> <strong>NFC Team</strong>
          </div>
        </div>
      </div>
      <div className="home-ctas">
        <Link to={isAuthenticated ? "/ingest" : "/login"}>
          <Button variant="primary" size="lg" className="home-btn-primary">
            Start Ingesting Data
          </Button>
        </Link>
        {isAuthenticated && (
          <Link to="/connections">
            <Button size="lg" className="home-btn-secondary">
              Manage Connections
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
