import { FadeIn } from "./Motion";
import { Link } from "react-router-dom";

interface Props {
  isAuthenticated: boolean;
}

export default function CtaBanner({ isAuthenticated }: Props) {
  return (
    <div className="cta-banner">
      <FadeIn>
        <div className="cta-banner-inner">
          <h2 className="cta-banner-title">
            START
            <br />
            INGESTING
            <br />
            NOW
          </h2>
          <div className="cta-banner-text">
            <p className="cta-banner-cta">
              Data ingestion is full of problems worth solving.
              <br />
              Now, they're all in one place.
              <br />
            </p>
            <p className="cta-banner-cta">
              Want to start building?
              <br />
              Start where data itches.
            </p>
            <Link to={isAuthenticated ? "/ingest" : "/login"} className="cta-banner-btn">
              Start Ingesting Data →
            </Link>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
