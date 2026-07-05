import { ReactNode } from "react";
import { cn } from "../../lib/utils";

/**
 * Highlight — Langfuse's yellow highlight text effect.
 * Renders a yellow background bar behind text using mix-blend-multiply.
 */
interface Props {
  children: ReactNode;
  className?: string;
}

export default function Highlight({ children, className }: Props) {
  return (
    <span className={cn("relative inline-flex items-center whitespace-nowrap px-0.5", className)}>
      <span
        className="absolute inset-x-0 top-1/2 h-[0.76em] -translate-y-[52%] bg-[#FBFF7A] mix-blend-multiply"
        aria-hidden="true"
      />
      <span className="relative z-0">{children}</span>
    </span>
  );
}
