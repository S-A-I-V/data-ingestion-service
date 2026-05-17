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
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const dir = direction === "left" ? 1 : -1;

    // Reset state when effect re-runs (speed/direction change)
    offsetRef.current = 0;
    lastTimeRef.current = null;

    function step(ts: number) {
      if (!track) return;

      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.1); // cap dt to avoid jumps after tab switch
      lastTimeRef.current = ts;

      // Measure the first group each frame so we always have the real width
      const firstGroup = track.children[0] as HTMLElement | undefined;
      const groupWidth = firstGroup ? firstGroup.offsetWidth : 0;

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
  }, [speed, direction, logos]);

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
        <div className="logo-slider__track" ref={trackRef}>
          <div className="logo-slider__group">{renderCards("g0-", false)}</div>
          <div className="logo-slider__group" aria-hidden="true">
            {renderCards("g1-", true)}
          </div>
          <div className="logo-slider__group" aria-hidden="true">
            {renderCards("g2-", true)}
          </div>
          <div className="logo-slider__group" aria-hidden="true">
            {renderCards("g3-", true)}
          </div>
        </div>
      </div>
    </div>
  );
}
