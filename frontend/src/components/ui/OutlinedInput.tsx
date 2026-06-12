/**
 * OutlinedInput — Reusable outlined text field with floating label notch.
 * The label floats above the border and creates a gap (notch) in the border line.
 *
 * Usage:
 *   <OutlinedInput label="Name" value={val} onChange={setVal} />
 */

import { useId } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function OutlinedInput({ label, value, onChange, className = "" }: Props) {
  const id = useId();
  const hasValue = value.length > 0;

  return (
    <div className={`outlined-input ${hasValue ? "outlined-input--filled" : ""} ${className}`}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="outlined-input__field"
        placeholder=" "
      />
      <label htmlFor={id} className="outlined-input__label">
        {label}
      </label>
    </div>
  );
}
