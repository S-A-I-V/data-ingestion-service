import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FadeIn } from "../components/Motion";

const PROBLEMS = [
  { tag: "ETL", question: "Why can't teams ingest CSV data into databases without writing custom scripts every time?", description: "Engineering teams waste hours writing one-off scripts for every data import, leading to inconsistent pipelines and repeated effort.", severity: 82, tam: 9, frequency: 8, whitespace: 7.5, itch: 72, highlight: false },
  { tag: "Infrastructure", question: "Why is connecting to remote databases through SSH tunnels still so painful and error-prone?", description: "Developers struggle with SSH tunnel configuration, key management, and connection timeouts when accessing production databases.", severity: 75, tam: 7, frequency: 6, whitespace: 8, itch: 65, highlight: true },
  { tag: "Data Quality", question: "Why do column type mismatches cause silent data corruption during bulk imports?", description: "Type coercion failures go undetected during ingestion, corrupting downstream analytics and reporting.", severity: 88, tam: 8, frequency: 7, whitespace: 9, itch: 78, highlight: false },
  { tag: "Security", question: "Why can't organizations track who ingested what data and when with a full audit trail?", description: "Lack of audit logging makes compliance impossible and leaves teams blind to unauthorized data changes.", severity: 79, tam: 8, frequency: 5, whitespace: 8.5, itch: 68, highlight: false },
  { tag: "Scalability", question: "Why is ingesting millions of rows still unreliable and crashes halfway through?", description: "Bulk insert operations fail silently or timeout on large datasets, requiring manual retry and data reconciliation.", severity: 85, tam: 9, frequency: 7, whitespace: 7, itch: 74, highlight: false },
  { tag: "Multi-DB", question: "Why do teams need different tools for PostgreSQL, MySQL, ClickHouse and other databases?", description: "Each database engine requires its own tooling, forcing teams to maintain multiple ingestion workflows.", severity: 77, tam: 9, frequency: 8, whitespace: 8.5, itch: 71, highlight: true },
  { tag: "Mapping", question: "Why is mapping CSV columns to database schemas still a manual, repetitive process?", description: "Column mapping is tedious and error-prone, especially when CSV headers don't match database column names.", severity: 73, tam: 8, frequency: 9, whitespace: 7, itch: 66, highlight: true },
  { tag: "AI", question: "Why can't developers get instant AI-powered analysis of their data before ingesting it?", description: "Teams ingest data blindly without understanding quality issues, schema conflicts, or optimization opportunities.", severity: 70, tam: 7, frequency: 4, whitespace: 9.5, itch: 62, highlight: false },
];

export default function Home() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="home-page">
      <div className="home-grain" />

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
      </div>

      <motion.div className="home-scroll-hint"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
        ↓
      </motion.div>

      <div className="problems-section">
        <FadeIn>
          <h2 className="problems-title">TOP 10 PROBLEMS</h2>
        </FadeIn>
        <div className="problems-grid">
          {PROBLEMS.map((item, i) => (
            <FadeIn key={i} delay={0.05 * i}>
              <div
                className={`problem-card ${item.highlight ? "problem-card-highlight" : ""}`}
                onClick={() => setSelected(i)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === "Enter" && setSelected(i)}>
                <div className="problem-card-header">
                  <span className="problem-tag">{item.tag}</span>
                  <span className="problem-arrow">›</span>
                </div>
                <p className="problem-question">{item.question}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.div className="problem-popup-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}>
            <motion.div className="problem-popup"
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}>
              <span className="problem-popup-tag">{PROBLEMS[selected].tag}</span>
              <h3 className="problem-popup-question">{PROBLEMS[selected].question}</h3>
              <p className="problem-popup-desc">{PROBLEMS[selected].description}</p>
              <div className="problem-popup-divider" />
              <div className="problem-popup-scores">
                <div className="problem-popup-score-row">
                  <span className="problem-popup-score-label">Severity Score</span>
                  <span className="problem-popup-score-value">{PROBLEMS[selected].severity}/100</span>
                </div>
                <div className="problem-popup-score-row">
                  <span className="problem-popup-score-label">TAM Score</span>
                  <span className="problem-popup-score-value">{PROBLEMS[selected].tam}/10</span>
                </div>
                <div className="problem-popup-score-row">
                  <span className="problem-popup-score-label">Frequency Score</span>
                  <span className="problem-popup-score-value">{PROBLEMS[selected].frequency}/10</span>
                </div>
                <div className="problem-popup-score-row">
                  <span className="problem-popup-score-label">Whitespace Score</span>
                  <span className="problem-popup-score-value">{PROBLEMS[selected].whitespace}/10</span>
                </div>
              </div>
              <div className="problem-popup-divider" />
              <div className="problem-popup-score-row problem-popup-total">
                <span className="problem-popup-score-label">Overall Itch Score</span>
                <span className="problem-popup-score-value problem-popup-itch">{PROBLEMS[selected].itch}/100</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
