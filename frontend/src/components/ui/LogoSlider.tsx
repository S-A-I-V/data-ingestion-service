import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useVelocity, useTransform, useSpring, useAnimationFrame, wrap } from "framer-motion";

interface LogoItem {
  icon: string;
  label: string;
}

interface Props {
  logos: LogoItem[];
  baseVelocity?: number;
  direction?: "left" | "right";
}

export function LogoSlider({ logos, baseVelocity = 60, direction = "left" }: Props) {
  const baseX = useRef(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });

  const [x, setX] = useState(0);
  const dirSign = direction === "left" ? -1 : 1;

  const groupRef = useRef<HTMLDivElement>(null);
  const [groupWidth, setGroupWidth] = useState(0);

  useEffect(() => {
    if (!groupRef.current) return;
    const ro = new ResizeObserver(() => {
      setGroupWidth(groupRef.current?.offsetWidth ?? 0);
    });
    ro.observe(groupRef.current);
    return () => ro.disconnect();
  }, [logos]);

  useAnimationFrame((_, delta) => {
    if (groupWidth === 0) return;
    const dt = delta / 1000;
    const move = dirSign * baseVelocity * dt + dirSign * baseVelocity * velocityFactor.get() * dt;
    baseX.current = wrap(-groupWidth, 0, baseX.current + move);
    setX(baseX.current);
  });

  const renderCards = (keyPrefix: string, ariaHidden: boolean) =>
    logos.map((db) => (
      <div className="logo-slider__card" key={keyPrefix + db.label}>
        <img
          src={db.icon}
          alt={ariaHidden ? "" : db.label}
          width={48}
          height={48}
          className="logo-slider__img"
          loading="eager"
          decoding="async"
        />
        <span className="logo-slider__name">{db.label}</span>
      </div>
    ));

  return (
    <div className="logo-slider">
      <div className="logo-slider__container">
        <motion.div className="logo-slider__track" style={{ x }}>
          <div className="logo-slider__group" ref={groupRef}>
            {renderCards("g0-", false)}
          </div>
          <div className="logo-slider__group" aria-hidden="true">
            {renderCards("g1-", true)}
          </div>
          <div className="logo-slider__group" aria-hidden="true">
            {renderCards("g2-", true)}
          </div>
          <div className="logo-slider__group" aria-hidden="true">
            {renderCards("g3-", true)}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
