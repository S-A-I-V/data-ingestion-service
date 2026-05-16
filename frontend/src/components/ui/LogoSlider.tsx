import { useEffect, useRef } from "react";

interface LogoItem {
  icon: string;
  label: string;
}

interface Props {
  logos: LogoItem[];
  /** pixels per second — default 80 */
  speed?: number;
  direction?: "left" | "right";
}

export function LogoSlider({ logos, speed = 80, direction = "left" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    const group = groupRef.current;
    if (!track || !group) return;

    const dir = direction === "left" ? 1 : -1;

    function step(ts: number) {
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = ts;

      const groupWidth = group!.offsetWidth;
      if (groupWidth === 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      offsetRef.current += speed * dt * dir;

      // Seamless reset: once we've scrolled one full group width, snap back
      if (dir === 1 && offsetRef.current >= groupWidth) {
        offsetRef.current -= groupWidth;
      } else if (dir === -1 && offsetRef.current <= -groupWidth) {
        offsetRef.current += groupWidth;
      }

      track.style.transform = `translateX(${-offsetRef.current}px)`;
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [speed, direction]);

  const renderCards = (keyPrefix: string) =>
    logos.map((db) => (
      <div className="logo-slider__card" key={keyPrefix + db.label}>
        <img
          src={db.icon}
          alt={keyPrefix === "a-" ? db.label : ""}
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
        <div className="logo-slider__track" ref={trackRef}>
          <div className="logo-slider__group" ref={groupRef}>
            {renderCards("a-")}
          </div>
          <div className="logo-slider__group" aria-hidden="true">
            {renderCards("b-")}
          </div>
        </div>
      </div>
    </div>
  );
}
