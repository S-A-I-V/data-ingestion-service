import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PROBLEMS } from "../constants/problems";
import ProblemPopup from "./ProblemPopup";

/**
 * Problems/Features Section — "All the tools, one integrated platform" style.
 * Clean card grid with subtle borders and minimal colors.
 */
import Highlight from "./ui/Highlight";

export default function ProblemsSection() {
  const [selected, setSelected] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="problems-section" ref={sectionRef}>
        <p className="problems-title">The full data engineering loop</p>
        <h2 className="problems-heading">
          All the tools, <Highlight>one</Highlight> <Highlight>integrated platform.</Highlight>
        </h2>
        <div className="problems-grid">
          {PROBLEMS.map((item, i) => {
            let cardClass = "problem-card";
            if (item.highlight) {
              cardClass += " problem-card-highlight";
            }
            return (
              <div
                key={i}
                className={cardClass}
                onClick={() => setSelected(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(i)}
              >
                <div className="problem-card-header">
                  <span className="problem-tag">{item.tag}</span>
                  <span className="problem-arrow">→</span>
                </div>
                <p className="problem-question">{item.question}</p>
              </div>
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
