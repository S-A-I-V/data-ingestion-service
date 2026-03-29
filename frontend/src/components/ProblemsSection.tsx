import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FadeIn } from "./Motion";
import { PROBLEMS } from "../constants/problems";
import ProblemPopup from "./ProblemPopup";

export default function ProblemsSection() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <>
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
                onKeyDown={(e) => e.key === "Enter" && setSelected(i)}
              >
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
        {selected !== null && <ProblemPopup problem={PROBLEMS[selected]} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}
