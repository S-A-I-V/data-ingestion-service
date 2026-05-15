/**
 * LogoSlider — truly seamless infinite marquee.
 *
 * Approach:
 * - Renders 4 copies of the list so there's always content visible
 * - Uses Framer Motion's `animate` with `x` to scroll by exactly one copy width
 * - `repeat: Infinity` with `repeatType: "loop"` gives a perfect seamless loop
 * - Images are preloaded via <link rel="preload"> to eliminate flicker on first pass
 */

import { useRef, useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";

interface LogoItem {
  icon: string;
  label: string;
}

interface Props {
  logos: LogoItem[];
  /** Pixels per second */
  speed?: number;
  direction?: "left" | "right";
}

export function LogoSlider({ logos, speed = 80, direction = "left" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();

  // Preload all images so they're in cache before the animation starts
  useEffect(() => {
    const links: HTMLLinkElement[] = logos.map((db) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = db.icon;
      document.head.appendChild(link);
      return link;
    });
    return () => links.forEach((l) => document.head.removeChild(l));
  }, [logos]);

  // Start animation once the track has rendered and we know its width
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Wait one frame for layout to settle
    const raf = requestAnimationFrame(() => {
      // Width of one copy of the list (track has 4 copies, so divide by 4)
      const singleWidth = track.scrollWidth / 4;
      const duration = singleWidth / speed;
      const xTarget = direction === "left" ? -singleWidth : singleWidth;

      controls.start({
        x: [0, xTarget],
        transition: {
          duration,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [logos, speed, direction, controls]);

  // 4 copies: enough to fill any viewport width and loop seamlessly
  const items = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="logo-slider">
      <div className="logo-slider__container">
        <motion.div ref={trackRef} className="logo-slider__track" animate={controls}>
          {items.map((db, i) => (
            <div key={`${db.label}-${i}`} className="logo-slider__card">
              <img src={db.icon} alt={db.label} className="logo-slider__img" loading="eager" decoding="async" />
              <span className="logo-slider__name">{db.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
