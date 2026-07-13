/**
 * ValidatedInput — Input with visible bordered box, corner brackets, and inline error icon.
 *
 * Normal state: visible border + black corner edges (consistent with app UX)
 * Error state: red border + red corner edges + error icon with hover tooltip
 * No layout shifts.
 */

import { useState } from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface Props {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  style?: React.CSSProperties;
}

export default function ValidatedInput({ type = "text", value, onChange, onBlur, placeholder, error, style }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasError = Boolean(error);

  return (
    <div className={hasError ? "job-input-wrap job-input-wrap--error" : "job-input-wrap"} style={style}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="job-input"
        style={hasError ? { paddingRight: 32 } : undefined}
      />
      {hasError && (
        <span
          className="job-input-error-icon"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label={error}
        >
          <ErrorOutlineIcon sx={{ fontSize: 15 }} />
          {showTooltip && <span className="job-input-tooltip">{error}</span>}
        </span>
      )}
    </div>
  );
}
