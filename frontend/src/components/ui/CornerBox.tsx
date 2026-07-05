import { ReactNode } from "react";
import type React from "react";
import { cn } from "../../lib/utils";

/**
 * CornerBox — Langfuse's signature decorative container.
 * Uses SVG mask to render small rounded L-shaped corner marks at all 4 corners.
 * Supports optional diagonal stripe background and hover state.
 */
interface Props {
  children: ReactNode;
  className?: string;
  stripes?: boolean;
  hover?: boolean;
  id?: string;
}

const CORNER_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 0V1H3C1.89543 1 1 1.89543 1 3V8H0V0H8Z' fill='black'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 8V7H3C1.89543 7 1 6.10457 1 5V0H0V8H8Z' fill='black'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 8V7H5C6.10457 7 7 6.10457 7 5V0H8V8H0Z' fill='black'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 0V1H5C6.10457 1 7 1.89543 7 3V8H8V0H0Z' fill='black'/%3E%3C/svg%3E")`;

const STRIPES_BG =
  "repeating-linear-gradient(315deg, #F6F6F3, #F6F6F3 2px, rgba(108, 103, 96, 0.08) 2px, rgba(108, 103, 96, 0.08) 4px)";

export default function CornerBox({
  children,
  className,
  stripes = false,
  hover = false,
  id,
  style,
}: Props & { style?: React.CSSProperties }) {
  return (
    <div
      id={id}
      className={cn(
        "relative border border-[#E5E5E0] bg-[#F6F6F3]",
        hover && "group cursor-pointer transition-colors duration-200 hover:bg-[#F0F0EB]",
        className,
      )}
      style={{ backgroundImage: stripes ? STRIPES_BG : undefined, ...style }}
    >
      {/* Corner marks layer */}
      <span
        className="pointer-events-none absolute -inset-[1px] z-10 block"
        style={{
          maskImage: CORNER_MASK,
          WebkitMaskImage: CORNER_MASK,
          maskPosition: "0% 0%, 0% 100%, 100% 100%, 100% 0%",
          WebkitMaskPosition: "0% 0%, 0% 100%, 100% 100%, 100% 0%",
          maskSize: "8px 8px",
          WebkitMaskSize: "8px 8px",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          backgroundColor: "rgb(64, 64, 57)",
        }}
      />
      {children}
    </div>
  );
}
