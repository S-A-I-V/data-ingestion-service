import { useEffect, useRef, useState } from "react";

interface AnimatedBeamProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fromRef: React.RefObject<HTMLDivElement | null>;
  toRef: React.RefObject<HTMLDivElement | null>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 2,
}: AnimatedBeamProps) {
  const [path, setPath] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (!container || !from || !to) return;

      const cr = container.getBoundingClientRect();
      const fr = from.getBoundingClientRect();
      const tr = to.getBoundingClientRect();

      const x1 = fr.left - cr.left + fr.width / 2;
      const y1 = fr.top - cr.top + fr.height / 2;
      const x2 = tr.left - cr.left + tr.width / 2;
      const y2 = tr.top - cr.top + tr.height / 2;

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 + curvature;

      setPath(`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [containerRef, fromRef, toRef, curvature]);

  const gradientId = `beam-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg ref={svgRef} className="animated-beam__svg" fill="none">
      <path d={path} stroke="rgba(15,177,178,0.12)" strokeWidth="1.5" />
      <path d={path} stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round">
        <animate
          attributeName="stroke-dashoffset"
          from={reverse ? "0" : "200"}
          to={reverse ? "200" : "0"}
          dur={`${duration}s`}
          repeatCount="indefinite"
        />
      </path>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0fb1b2" stopOpacity="0" />
          <stop offset="50%" stopColor="#0fb1b2" stopOpacity="1" />
          <stop offset="100%" stopColor="#0fb1b2" stopOpacity="0" />
          <animate
            attributeName="x1"
            from={reverse ? "100%" : "-100%"}
            to={reverse ? "-100%" : "100%"}
            dur={`${duration}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="x2"
            from={reverse ? "200%" : "0%"}
            to={reverse ? "0%" : "200%"}
            dur={`${duration}s`}
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
    </svg>
  );
}
