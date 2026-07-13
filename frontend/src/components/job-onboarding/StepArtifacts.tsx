/**
 * StepArtifacts — Step 3: Define expected output artifacts for the job.
 * Same card-based UX pattern as SLA policies.
 */

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { ArtifactDef } from "../../types/jobOnboarding";
import { ARTIFACT_TYPES } from "../../constants/jobOnboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import ValidatedInput from "./ValidatedInput";

interface Props {
  artifacts: ArtifactDef[];
  onArtifactsChange: (artifacts: ArtifactDef[]) => void;
}

const CARD_STYLE: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 0,
  padding: "16px 20px",
  marginBottom: 16,
  position: "relative",
};

const CARD_HEADER: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const CARD_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "var(--text-secondary)",
};

const GRID_3: React.CSSProperties = { display: "grid", gridTemplateColumns: "3fr 1fr 2fr", gap: 10 };
const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted)",
  marginBottom: 4,
  display: "block",
};

export default function StepArtifacts({ artifacts, onArtifactsChange }: Props) {
  const addArtifact = () => {
    onArtifactsChange([
      ...artifacts,
      {
        artifact_pattern: "",
        type: "C2C",
        expected_count: 1,
        completion_trigger: "ALL_PRESENT",
        triggers_job_status: "",
        source_type: "C2C",
        job_name: "",
      },
    ]);
  };

  const duplicate = (idx: number) => {
    onArtifactsChange([...artifacts, { ...artifacts[idx] }]);
  };

  const update = (idx: number, field: keyof ArtifactDef, value: string | number) => {
    const updated = artifacts.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
    // Keep type and source_type in sync (they're always identical in prod)
    if (field === "type") {
      updated[idx] = { ...updated[idx], source_type: value as string };
    }
    onArtifactsChange(updated);
  };

  const remove = (idx: number) => {
    onArtifactsChange(artifacts.filter((_, i) => i !== idx));
  };

  return (
    <div className="onboarding-step-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p className="onboarding-hint" style={{ margin: 0 }}>
          <strong>Artifact Definitions</strong> — expected output files (e.g. .mit.gz deliveries). Optional step.
        </p>
        <button className="btn btn-sm" onClick={addArtifact}>
          + Add Artifact
        </button>
      </div>

      {artifacts.map((art, idx) => (
        <div key={idx} style={CARD_STYLE} className="job-input-wrap">
          {/* Card header */}
          <div style={CARD_HEADER}>
            <span style={CARD_TITLE}>Artifact {idx + 1}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-sm btn--ghost"
                onClick={() => duplicate(idx)}
                title="Duplicate"
                style={{ padding: "4px 6px" }}
              >
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => remove(idx)}
                title="Remove"
                style={{ padding: "4px 6px" }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          </div>

          {/* Fields in one row: Pattern | Type | Job Name */}
          <div style={GRID_3}>
            <div>
              <label style={LABEL}>
                Artifact Pattern <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <ValidatedInput
                value={art.artifact_pattern}
                onChange={(v) => update(idx, "artifact_pattern", v)}
                placeholder="e.g. NHI_AGNDLY_D_YYYY_MM_DD_LS_R0.mit.gz"
              />
            </div>
            <div>
              <label style={LABEL}>
                Type <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <Select value={art.type} onValueChange={(v) => update(idx, "type", v)}>
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTIFACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={LABEL}>Job Name (child step)</label>
              <ValidatedInput
                value={art.job_name}
                onChange={(v) => update(idx, "job_name", v)}
                placeholder="e.g. Cable Agency Daily - Live SD"
              />
            </div>
          </div>
        </div>
      ))}

      {artifacts.length === 0 && (
        <p className="onboarding-hint" style={{ fontStyle: "italic", textAlign: "center", padding: 32 }}>
          No artifacts defined. Click "+ Add Artifact" or skip this step if not needed.
        </p>
      )}
    </div>
  );
}
