import { FadeIn } from "./Motion";

export default function CtaBanner() {
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
            <p>
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
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
