import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] },
});

interface Props {
  isAuthenticated: boolean;
}

export default function HeroSection({ isAuthenticated }: Props) {
  return (
    <div className="home-hero">
      <motion.div className="home-subtitle" {...fadeUp(0.1)}>
        THE UNIVERSAL DATA INGESTION PLATFORM
      </motion.div>
      <motion.h1 className="home-title" {...fadeUp(0.25)}>
        <span className="home-title-bold">DATA</span>
        <span className="home-title-accent">ingest</span>
        <span className="home-title-bold">HUB</span>
      </motion.h1>
      <motion.div className="home-byline-fade" {...fadeUp(0.4)}>
        <div className="home-byline-wrap">
          <div className="home-byline">
            by <img src="/images/logo.jpeg" alt="NFC Logo" className="byline-logo" /> <strong>NFC Team</strong>
          </div>
        </div>
      </motion.div>
      <motion.div className="home-ctas" {...fadeUp(0.55)}>
        <Link to={isAuthenticated ? "/ingest" : "/login"}>
          <motion.button
            type="button"
            className="home-btn-primary"
            whileHover={{ scale: 1.05, boxShadow: "0 8px 30px rgba(15,177,178,0.5)" }}
            whileTap={{ scale: 0.97 }}
          >
            Start Ingesting Data
          </motion.button>
        </Link>
        {isAuthenticated && (
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
        )}
      </motion.div>
    </div>
  );
}
