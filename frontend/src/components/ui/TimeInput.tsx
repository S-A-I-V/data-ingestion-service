/**
 * TimeInput — Styled time picker input (HH:MM:SS).
 * Hides the native calendar picker indicator for a cleaner look.
 * Uses our UX system (sharp corners, border on focus).
 */
import { cn } from "../../lib/utils";

interface TimeInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  id?: string;
}

export default function TimeInput({ value, defaultValue, onChange, className, id }: TimeInputProps) {
  return (
    <input
      type="time"
      step="1"
      id={id}
      value={value}
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        "appearance-none bg-white border border-[var(--border)] rounded-none px-2 py-1 text-[11px] font-mono",
        "text-[var(--text-primary)] outline-none transition-[border-color] duration-150",
        "focus:border-[var(--text-primary)]",
        "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
        className,
      )}
    />
  );
}
