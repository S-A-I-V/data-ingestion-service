import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Problem } from "../types";

interface Props {
  problem: Problem;
  onClose: () => void;
}

export default function ProblemPopup({ problem, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  return (
    <motion.div
      className="problem-popup-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="problem-popup"
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="problem-popup-tag">{problem.tag}</span>
        <h3 className="problem-popup-question">{problem.question}</h3>
        <p className="problem-popup-desc">{problem.description}</p>
        <div className="problem-popup-divider" />
        <div className="problem-popup-scores">
          {[
            { label: "Severity Score", value: `${problem.severity}/100` },
            { label: "TAM Score", value: `${problem.tam}/10` },
            { label: "Frequency Score", value: `${problem.frequency}/10` },
            { label: "Whitespace Score", value: `${problem.whitespace}/10` },
          ].map((s) => (
            <div className="problem-popup-score-row" key={s.label}>
              <span className="problem-popup-score-label">{s.label}</span>
              <span className="problem-popup-score-value">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="problem-popup-divider" />
        <div className="problem-popup-score-row problem-popup-total">
          <span className="problem-popup-score-label">Overall Itch Score</span>
          <span className="problem-popup-score-value problem-popup-itch">{problem.itch}/100</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
