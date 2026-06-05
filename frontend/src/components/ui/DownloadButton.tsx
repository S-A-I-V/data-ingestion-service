import * as React from "react";
import { useState, useCallback } from "react";
import DownloadIcon from "@mui/icons-material/Download";

interface DownloadButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  doneLabel?: string;
}

/**
 * Animated download button inspired by Uiverse.io (Na3ar-17).
 * Shows a progress animation on click, then a "Done" state.
 */
export function DownloadButton({ onClick, disabled, label = "Download", doneLabel = "Done" }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleClick = useCallback(() => {
    if (downloading || disabled) return;
    setDownloading(true);
    onClick();
    // Reset after animation completes (~3.9s) + hold "Done" for 3s
    setTimeout(() => setDownloading(false), 7000);
  }, [downloading, disabled, onClick]);

  return (
    <div className="download-btn-container">
      <label className={`download-btn-label${downloading ? " active" : ""}${disabled ? " disabled" : ""}`}>
        <input
          className="download-btn-input"
          type="checkbox"
          checked={downloading}
          onChange={handleClick}
          disabled={disabled}
        />
        <span className="download-btn-circle">
          <DownloadIcon className="download-btn-icon" />
          <span className="download-btn-square" />
        </span>
        <span className="download-btn-title">{label}</span>
        <span className="download-btn-title download-btn-title-done">{doneLabel}</span>
      </label>
    </div>
  );
}
