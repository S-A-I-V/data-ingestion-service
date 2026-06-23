import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface BentoCardProps {
  Icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  cta?: string;
  href?: string;
  background: ReactNode;
  className?: string;
}

export function BentoCard({ Icon, name, description, cta, href, background, className = "" }: BentoCardProps) {
  return (
    <div className={`bento-card ${className}`}>
      <div className="bento-card__bg">{background}</div>
      <div className="bento-card__body">
        <div className="bento-card__header">
          <Icon className="bento-card__icon" />
          <h3 className="bento-card__name">{name}</h3>
        </div>
        <p className="bento-card__desc">{description}</p>
      </div>
    </div>
  );
}

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className = "" }: BentoGridProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const cards = ref.current?.querySelectorAll(".bento-card");
      if (!cards?.length) return;
      gsap.from(cards, {
        y: 52,
        opacity: 0,
        duration: 0.65,
        ease: "power2.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 78%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={`bento-grid ${className}`}>
      {children}
    </div>
  );
}
