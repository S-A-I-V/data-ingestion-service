/**
 * IconCloud — 3D rotating sphere of database icons.
 * Lightweight implementation inspired by Magic UI's IconCloud.
 * Uses CSS 3D transforms + requestAnimationFrame for smooth rotation.
 */
import { useEffect, useRef, useMemo } from "react";

/** Fibonacci sphere point distribution for even icon placement */
function fibonacciSphere(count: number, radius: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push([x * radius, y * radius, z * radius]);
  }
  return points;
}

interface Props {
  images: string[];
  /** Sphere radius in px */
  radius?: number;
  /** Icon size in px */
  iconSize?: number;
}

export default function IconCloud({ images, radius = 140, iconSize = 36 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const angleRef = useRef({ x: 0, y: 0 });
  const speedRef = useRef({ x: 0.002, y: 0.003 });
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const points = useMemo(() => fibonacciSphere(images.length, radius), [images.length, radius]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const icons = container.querySelectorAll<HTMLElement>(".icon-cloud-item");

    const animate = () => {
      if (mouseRef.current.active) {
        angleRef.current.x += mouseRef.current.y * 0.00003;
        angleRef.current.y += mouseRef.current.x * 0.00003;
      } else {
        angleRef.current.x += speedRef.current.x;
        angleRef.current.y += speedRef.current.y;
      }

      const cosX = Math.cos(angleRef.current.x);
      const sinX = Math.sin(angleRef.current.x);
      const cosY = Math.cos(angleRef.current.y);
      const sinY = Math.sin(angleRef.current.y);

      icons.forEach((icon, i) => {
        const [px, py, pz] = points[i];

        // Rotate around Y axis
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;

        // Rotate around X axis
        const y1 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        // Perspective + depth-based opacity
        const scale = (z2 + radius * 1.5) / (radius * 3);
        const opacity = Math.max(0.25, Math.min(1, scale * 1.5));

        icon.style.transform = `translate3d(${x1}px, ${y1}px, ${z2}px) scale(${0.6 + scale * 0.6})`;
        icon.style.opacity = String(opacity);
        icon.style.zIndex = String(Math.round(z2 + radius));
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left - rect.width / 2;
      mouseRef.current.y = e.clientY - rect.top - rect.height / 2;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animRef.current);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [points, radius]);

  return (
    <div className="icon-cloud" ref={containerRef}>
      {images.map((src, i) => (
        <div key={i} className="icon-cloud-item">
          <img src={src} alt="" width={iconSize} height={iconSize} loading="lazy" />
        </div>
      ))}
    </div>
  );
}
