import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CELL = 60;
const GLOW_RADIUS = 200;
const GLOW_COLOR = [15, 177, 178] as const;

export default function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const glow = { x: -9999, y: -9999 };

    const xTo = gsap.quickTo(glow, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(glow, "y", { duration: 0.5, ease: "power3.out" });

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const onMouseMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    let st: ScrollTrigger | undefined;

    const hero = document.querySelector(".home-hero");
    if (hero) {
      st = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          gsap.set(canvas, { opacity: 1 - self.progress });
        },
        onLeave: () => gsap.set(canvas, { opacity: 0 }),
        onEnterBack: () => gsap.set(canvas, { opacity: 1 }),
      });
    }

    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas.width / CELL) + 1;
      const rows = Math.ceil(canvas.height / CELL) + 1;
      const mx = glow.x;
      const my = glow.y;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c * CELL;
          const cy = r * CELL;
          const dist = Math.hypot(cx - mx, cy - my);
          const t = Math.max(0, 1 - dist / GLOW_RADIUS);
          const alpha = 0.03 + t * 0.2;
          ctx.fillStyle = `rgba(${GLOW_COLOR[0]},${GLOW_COLOR[1]},${GLOW_COLOR[2]},${alpha})`;
          ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;

      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, canvas.height);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(canvas.width, r * CELL);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      gsap.killTweensOf(glow);
      gsap.killTweensOf(canvas);
      st?.kill();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="interactive-grid-canvas" />;
}
