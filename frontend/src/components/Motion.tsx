import { ReactNode } from "react";

export function FadeIn({ children, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function ScaleIn({ children }: { children: ReactNode; delay?: number }) {
  return <>{children}</>;
}

export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function HoverCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function AnimatedNumber({ value }: { value: number }) {
  return <span>{value}</span>;
}

// Keep motion and AnimatePresence exported for the few places that use them
// directly (modals, login card) — those don't affect glassmorphism panels.
export { motion, AnimatePresence } from "framer-motion";

export function ModalWrapper({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
