import { ReactNode } from "react";

/**
 * BracketBox — Langfuse corner bracket decorative container.
 * Renders 4 L-shaped crop marks at the corners of any section.
 * Reusable across the entire app for that Langfuse engineering aesthetic.
 */
interface Props {
  children: ReactNode;
  className?: string;
}

export default function BracketBox({ children, className = "" }: Props) {
  return <div className={`lf-bracket-box ${className}`}>{children}</div>;
}
