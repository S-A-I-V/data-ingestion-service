import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FadeIn } from "../components/Motion";

const bgItems = [
  // Text cards only
  { type: "card", content: "WHY IS DATA\nINGESTION\nSO HARD?", x: "1%", y: "18%", rotate: -14, blur: 0, opacity: 0.2 },
  { type: "card", content: "CSV TO\nDATABASE\nIN SECONDS", x: "76%", y: "12%", rotate: 11, blur: 0, opacity: 0.18 },
  { type: "card", content: "COLUMN\nMAPPING\nMADE EASY", x: "-2%", y: "62%", rotate: 16, blur: 0, opacity: 0.18 },
  { type: "card", content: "AI POWERED\nQUERY\nANALYSIS", x: "78%", y: "48%", rotate: -9, blur: 0, opacity: 0.2 },
  { type: "card", content: "MULTI DB\nSUPPORT", x: "55%", y: "85%", rotate: 13, blur: 0, opacity: 0.16 },
  { type: "card", content: "FULL AUDIT\nTRAIL", x: "5%", y: "78%", rotate: -8, blur: 0, opacity: 0.15 },
  { type: "card", content: "BULK\nINSERT", x: "82%", y: "72%", rotate: 10, blur: 0, opacity: 0.14 },
  { type: "card", content: "SSH\nTUNNEL", x: "40%", y: "2%", rotate: -5, blur: 0, opacity: 0.12 },
];

export default function Home() {
  return (
    <div className="home-page">
      {/* Floating background */}
      <div className="home-floating">
        {bgItems.map((item, i) => (
          <motion.div key={i}
            className="floating-card"
            style={{
              left: item.x, top: item.y,
              rotate: item.rotate,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: item.opacity, scale: 1 }}
            transition={{
              delay: 0.15 + i * 0.1,
              duration: 1.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ opacity: Math.min((item.opacity || 0.2) + 0.15, 0.5), scale: 1.04 }}
          >
            <div className="floating-card-inner">
              {(item.content || "").split("\n").map((line, j) => (
                <div key={j}>{line}</div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hero */}
      <div className="home-hero">
        <FadeIn>
          <div className="home-subtitle">THE UNIVERSAL DATA INGESTION PLATFORM</div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <h1 className="home-title">
            <span className="home-title-bold glitch">
              DATA
              <span>DATA</span>
              <span>DATA</span>
            </span>
            <span className="home-title-accent">ingest</span>
            <span className="home-title-bold glitch">
              HUB
              <span>HUB</span>
              <span>HUB</span>
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="home-byline-wrap">
            <div className="home-byline">
              by <img src="/images/logo.jpeg" alt="NFC Logo" className="byline-logo" /> <strong>NFC Team</strong>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.45}>
          <div className="home-ctas">
            <Link to="/ingest">
              <motion.button type="button" className="home-btn-primary"
                whileHover={{ scale: 1.05, boxShadow: "0 8px 30px rgba(99,102,241,0.5)" }}
                whileTap={{ scale: 0.97 }}>
                Start Ingesting Data
              </motion.button>
            </Link>
            <Link to="/connections">
              <motion.button type="button" className="home-btn-secondary"
                whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.4)" }}
                whileTap={{ scale: 0.97 }}>
                Manage Connections
              </motion.button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="home-stats">
            <div className="home-stat">
              <div className="home-stat-num">5+</div>
              <div className="home-stat-label">Database Engines</div>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <div className="home-stat-num">AI</div>
              <div className="home-stat-label">Query Analysis</div>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <div className="home-stat-num">100%</div>
              <div className="home-stat-label">Audit Trail</div>
            </div>
          </div>
        </FadeIn>
      </div>

      <motion.div className="home-scroll-hint"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
        ↓
      </motion.div>
    </div>
  );
}
