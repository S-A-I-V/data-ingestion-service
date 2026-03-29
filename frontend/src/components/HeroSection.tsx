import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function HeroSection() {
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
        <Link to="/ingest">
          <motion.button
            type="button"
            className="home-btn-primary"
            whileHover={{ scale: 1.05, boxShadow: "0 8px 30px rgba(99,102,241,0.5)" }}
            whileTap={{ scale: 0.97 }}
          >
            Start Ingesting Data
          </motion.button>
        </Link>
        <Link to="/connections">
          <motion.button
            type="button"
            className="home-btn-secondary"
            whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.4)" }}
            whileTap={{ scale: 0.97 }}
          >
            Manage Connections
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
