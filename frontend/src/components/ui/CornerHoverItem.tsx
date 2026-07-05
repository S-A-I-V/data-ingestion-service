import { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * CornerHoverItem — Langfuse's signature hover effect.
 * Shows corner bracket marks on hover with diagonal stripe background.
 * Use this for list items, sidebar links, nav items, table rows — anywhere
 * you want the Langfuse on-hover corner reveal effect.
 */

const CORNER_MASK = [
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 0V1H3C1.89543 1 1 1.89543 1 3V8H0V0H8Z' fill='black'/%3E%3C/svg%3E")`,
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M8 8V7H3C1.89543 7 1 6.10457 1 5V0H0V8H8Z' fill='black'/%3E%3C/svg%3E")`,
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 8V7H5C6.10457 7 7 6.10457 7 5V0H8V8H0Z' fill='black'/%3E%3C/svg%3E")`,
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' fill='none'%3E%3Cpath d='M0 0V1H5C6.10457 1 7 1.89543 7 3V8H8V0H0Z' fill='black'/%3E%3C/svg%3E")`,
].join(", ");

const STRIPES_BG =
  "repeating-linear-gradient(315deg, rgb(246, 246, 243), rgb(246, 246, 243) 2px, rgba(108, 103, 96, 0.1) 4px, rgb(246, 246, 243) 4px)";

interface Props {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  stripes?: boolean;
}

export default function CornerHoverItem({ children, className, href = "#", onClick, stripes = true }: Props) {
  return (
    <a
      href={href}
      onClick={
        onClick
          ? (e) => {
              e.preventDefault();
              onClick();
            }
          : undefined
      }
      className={cn(
        "group relative block w-full px-4 py-3 transition-colors hover:bg-white/40 no-underline",
        className,
      )}
      style={stripes ? { backgroundImage: STRIPES_BG } : undefined}
    >
      {/* Corner marks — hidden by default, visible on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{
          backgroundColor: "rgb(64, 64, 57)",
          maskImage: CORNER_MASK,
          WebkitMaskImage: CORNER_MASK,
          maskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
          WebkitMaskPosition: "0px 0px, 0px 100%, 100% 100%, 100% 0px",
          maskSize: "8px 8px",
          WebkitMaskSize: "8px 8px",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
      {children}
    </a>
  );
}
