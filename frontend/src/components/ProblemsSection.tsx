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
          {PROBLEMS.map((item, i) => {
            const isWide = i < 2;
            let cardClass = "problem-card";
            if (item.highlight) {
              cardClass += " problem-card-highlight";
            } else if (!isWide && i % 2 === 1) {
              cardClass += " problem-card-white";
            }
            return (
              <FadeIn key={i} delay={0.05 * i} className={isWide ? "problem-card-wide" : ""}>
                <div
                  className={cardClass}
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
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected !== null && <ProblemPopup problem={PROBLEMS[selected]} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}
