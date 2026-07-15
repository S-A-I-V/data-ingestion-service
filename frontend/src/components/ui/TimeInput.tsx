/**
 * TimeInput — Styled time picker input (HH:MM:SS).
 * Uses ref to read the DOM value and only propagates valid (non-empty) changes.
 */
import { useRef, useEffect, useCallback } from "react";
import { cn } from "../../lib/utils";

interface TimeInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  id?: string;
}

export default function TimeInput({ value, defaultValue, onChange, className, id }: TimeInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync external value changes to the DOM input
  useEffect(() => {
    if (value && ref.current && ref.current.value !== value) {
      ref.current.value = value;
    }
  }, [value]);

  // Polling approach: check the DOM value periodically while focused
  // This handles the AM/PM toggle which doesn't fire onChange reliably
  const handleBlur = useCallback(() => {
    const v = ref.current?.value;
    if (v) onChangeRef.current?.(v);
  }, []);

  return (
    <input
      ref={ref}
      type="time"
      step="1"
      id={id}
      defaultValue={value || defaultValue}
      onChange={(e) => {
        // Only propagate valid non-empty values
        if (e.target.value) onChangeRef.current?.(e.target.value);
      }}
      onBlur={handleBlur}
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
