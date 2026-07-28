/**
 * JobSettingsModal — Modal for editing job run requirement settings.
 * Allows configuring run_requirement_mode, required_offsets_json, and min_success_count.
 */

import { useState, useEffect, useCallback } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { RUN_MODE_OPTIONS, DEFAULT_RUN_MODE, type RunRequirementMode } from "../../constants/reportMapping";

export interface JobSettings {
  run_requirement_mode: RunRequirementMode;
  required_offsets_json: number[] | null;
  min_success_count: number | null;
}

interface JobSettingsModalProps {
  nodeId: string;
  jobName: string;
  jobId: number;
  initialSettings: JobSettings;
  onSave: (nodeId: string, settings: JobSettings) => void;
  onClose: () => void;
}

export default function JobSettingsModal({
  nodeId,
  jobName,
  jobId,
  initialSettings,
  onSave,
  onClose,
}: JobSettingsModalProps) {
  const [runMode, setRunMode] = useState<RunRequirementMode>(initialSettings.run_requirement_mode || DEFAULT_RUN_MODE);
  const [minSuccessCount, setMinSuccessCount] = useState<number>(initialSettings.min_success_count ?? 0);
  const [offsetsInput, setOffsetsInput] = useState<string>(() => {
    const offsets = initialSettings.required_offsets_json;
    const parsed = Array.isArray(offsets) ? offsets : [];
    return parsed.length > 0 ? parsed.join(", ") : "";
  });
  const [offsetsError, setOffsetsError] = useState<string | null>(null);

  // Reset form when modal opens with new node
  useEffect(() => {
    setRunMode(initialSettings.run_requirement_mode || DEFAULT_RUN_MODE);
    setMinSuccessCount(initialSettings.min_success_count ?? 0);
    const offsets = initialSettings.required_offsets_json;
    const parsed = Array.isArray(offsets) ? offsets : typeof offsets === "string" ? JSON.parse(offsets || "[]") : [];
    setOffsetsInput(parsed.length > 0 ? parsed.join(", ") : "");
    setOffsetsError(null);
  }, [nodeId, initialSettings]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const parseOffsets = (input: string): number[] | null => {
    if (!input.trim()) return null;
    const parts = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const nums: number[] = [];
    for (const p of parts) {
      const n = parseInt(p, 10);
      if (isNaN(n)) {
        setOffsetsError(`Invalid number: "${p}"`);
        return null;
      }
      nums.push(n);
    }
    setOffsetsError(null);
    return nums.length > 0 ? nums : null;
  };

  const handleSave = () => {
    const offsets = runMode === "SPECIFIC_OFFSETS" ? parseOffsets(offsetsInput) : null;
    if (runMode === "SPECIFIC_OFFSETS" && offsetsError) return;

    onSave(nodeId, {
      run_requirement_mode: runMode,
      required_offsets_json: offsets,
      min_success_count: minSuccessCount > 0 ? minSuccessCount : null,
    });
    onClose();
  };

  const handleReset = () => {
    setRunMode(DEFAULT_RUN_MODE);
    setMinSuccessCount(0);
    setOffsetsInput("");
    setOffsetsError(null);
  };

  return (
    <div className="job-settings-backdrop" onClick={onClose}>
      <div className="job-settings-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="job-settings-header">
          <h3>Job Run Settings</h3>
          <button className="btn btn-sm btn-danger job-settings-close" onClick={onClose} title="Close">
            <CloseIcon sx={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Job info banner */}
        <div className="job-settings-banner">
          <span className="job-settings-banner-name">{jobName}</span>
          <span className="job-settings-banner-id">ID: {jobId}</span>
        </div>

        {/* Body */}
        <div className="job-settings-body">
          {/* Run Mode Selection */}
          <div className="job-settings-section">
            <label className="job-settings-label">Run Requirement Mode</label>
            <div className="job-settings-options">
              {RUN_MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`job-settings-option${runMode === opt.value ? " job-settings-option--selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="runMode"
                    value={opt.value}
                    checked={runMode === opt.value}
                    onChange={() => setRunMode(opt.value)}
                  />
                  <div className="job-settings-option-content">
                    <span className="job-settings-option-title">{opt.label}</span>
                    <span className="job-settings-option-desc">{opt.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Offsets input (only for SPECIFIC_OFFSETS) */}
          {runMode === "SPECIFIC_OFFSETS" && (
            <div className="job-settings-section">
              <label className="job-settings-label">
                Required Offsets
                <span className="job-settings-hint">Comma-separated day offsets (e.g., 0, -1, -7)</span>
              </label>
              <input
                type="text"
                className={`job-settings-input${offsetsError ? " job-settings-input--error" : ""}`}
                value={offsetsInput}
                onChange={(e) => {
                  setOffsetsInput(e.target.value);
                  if (offsetsError) parseOffsets(e.target.value);
                }}
                placeholder="0, -1, -7"
              />
              {offsetsError && <span className="job-settings-error">{offsetsError}</span>}
            </div>
          )}

          {/* Min Success Count */}
          <div className="job-settings-section">
            <label className="job-settings-label">
              Minimum Success Count
              <span className="job-settings-hint">
                How many successful runs are required (leave 0 for default/null)
              </span>
            </label>
            <input
              type="number"
              className="job-settings-input job-settings-input--narrow"
              value={minSuccessCount}
              onChange={(e) => setMinSuccessCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="job-settings-footer">
          <button className="btn btn-sm btn-danger" onClick={handleReset}>
            Reset
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
