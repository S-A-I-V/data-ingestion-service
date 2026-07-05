import { cn } from "../../lib/utils";

/**
 * Chip — Langfuse-style small tag/pill with optional icon.
 * Used for integration badges, language tags, etc.
 */
interface Props {
  label: string;
  icon?: string;
  href?: string;
  className?: string;
}

export default function Chip({ label, icon, href = "#", className }: Props) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-2 px-2 py-1 border border-[#E5E5E0] bg-[#F6F6F3] rounded-[2px] text-[13px] font-normal text-[#404039] hover:bg-[#F0F0EB] transition-colors",
        className,
      )}
    >
      {icon && <img src={icon} alt="" className="w-3.5 h-3.5 object-contain" />}
      <span>{label}</span>
    </a>
  );
}
