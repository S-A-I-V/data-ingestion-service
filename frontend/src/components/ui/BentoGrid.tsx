import { useRef, type ReactNode } from "react";

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

  // Note: GSAP ScrollTrigger animations are disabled because MAF's shell
  // uses a non-window scroll container, preventing triggers from firing.
  // Cards render immediately without entrance animation.

  return (
    <div ref={ref} className={`bento-grid ${className}`}>
      {children}
    </div>
  );
}
