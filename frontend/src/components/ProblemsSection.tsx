import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROBLEMS } from "../constants/problems";
import ProblemPopup from "./ProblemPopup";

gsap.registerPlugin(ScrollTrigger);

export default function ProblemsSection() {
  const [selected, setSelected] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const title = sectionRef.current?.querySelector(".problems-title");
      const cards = sectionRef.current?.querySelectorAll(".problems-grid > *");

      if (title) {
        gsap.from(title, {
          y: 60,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: title,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      }

      if (cards?.length) {
        gsap.from(cards, {
          y: 48,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.07,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
            toggleActions: "play none none none",
          },
        });
      }
    },
    { scope: sectionRef },
  );

  return (
    <>
      <div className="problems-section" ref={sectionRef}>
        <h2 className="problems-title">TOP 10 PROBLEMS</h2>
        <div className="problems-grid">
          {PROBLEMS.map((item, i) => {
            const isWide = i < 2;
            const whiteIndices = [3, 6, 8];
            let cardClass = "problem-card";
            if (item.highlight) {
              cardClass += " problem-card-highlight";
            } else if (whiteIndices.includes(i)) {
              cardClass += " problem-card-white";
            }
            return (
              <div key={i} className={isWide ? "problem-card-wide" : ""}>
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
