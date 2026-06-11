/**
 * StepEditPreview — Shows a diff of what will change for an existing client.
 * Green = additions, Red = removals, Yellow = modifications.
 */

import type { BeidOrgMapping } from "./StepBeidMapping";
import type { ReportDef } from "./StepReportMapping";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

interface DiffSection<T> {
  added: T[];
  removed: T[];
}

interface Props {
  clientId: number;
  clientName: string;
  oldGroupName: string;
  newGroupName: string;
  beidDiff: DiffSection<BeidOrgMapping>;
  reportDiff: { added: number[]; removed: number[] };
  aliasDiff: DiffSection<string>;
  reports: ReportDef[];
  totalStatements: number;
}

export default function StepEditPreview({
  clientId,
  clientName,
  oldGroupName,
  newGroupName,
  beidDiff,
  reportDiff,
  aliasDiff,
  reports,
  totalStatements,
}: Props) {
  const groupChanged = oldGroupName !== newGroupName;
  const hasChanges =
    groupChanged ||
    beidDiff.added.length > 0 ||
    beidDiff.removed.length > 0 ||
    reportDiff.added.length > 0 ||
    reportDiff.removed.length > 0 ||
    aliasDiff.added.length > 0 ||
    aliasDiff.removed.length > 0;

  const getReportName = (rid: number) => {
    const r = reports.find((rep) => rep.report_id === rid);
    return r ? `${r.report_name} (${r.application_name})` : `Report #${rid}`;
  };

  if (!hasChanges) {
    return (
      <div className="edit-preview edit-preview--empty">
        <div className="edit-preview-empty-card">
          <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "var(--success)" }} />
          <h3>No Changes Detected</h3>
          <p>The current configuration matches what you've entered. Nothing to update.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-preview">
      <div className="edit-preview-header">
        <h3>
          Edit Preview — <strong>{clientName}</strong> (#{clientId})
        </h3>
        <p className="edit-preview-summary">
          {totalStatements} statement{totalStatements !== 1 ? "s" : ""} will be executed
        </p>
      </div>

      {/* Group name change */}
      {groupChanged && (
        <div className="edit-preview-section">
          <h4>
            <EditIcon sx={{ fontSize: 16 }} /> Group Name
          </h4>
          <div className="edit-preview-change edit-preview-change--modify">
            <span className="edit-preview-old">{oldGroupName}</span>
            <span className="edit-preview-arrow">→</span>
            <span className="edit-preview-new">{newGroupName}</span>
          </div>
        </div>
      )}

      {/* BEID changes */}
      {(beidDiff.added.length > 0 || beidDiff.removed.length > 0) && (
        <div className="edit-preview-section">
          <h4>Business Entity Mappings</h4>
          {beidDiff.removed.map((b) => (
            <div key={`rm-${b.beid}`} className="edit-preview-change edit-preview-change--remove">
              <RemoveCircleOutlineIcon sx={{ fontSize: 14, color: "var(--danger)" }} />
              <span>
                BEID {b.beid} (org: {b.org_id})
              </span>
            </div>
          ))}
          {beidDiff.added.map((b) => (
            <div key={`add-${b.beid}`} className="edit-preview-change edit-preview-change--add">
              <AddCircleOutlineIcon sx={{ fontSize: 14, color: "var(--success)" }} />
              <span>
                BEID {b.beid} (org: {b.org_id})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Report changes */}
      {(reportDiff.added.length > 0 || reportDiff.removed.length > 0) && (
        <div className="edit-preview-section">
          <h4>Report Mappings</h4>
          {reportDiff.removed.map((rid) => (
            <div key={`rm-${rid}`} className="edit-preview-change edit-preview-change--remove">
              <RemoveCircleOutlineIcon sx={{ fontSize: 14, color: "var(--danger)" }} />
              <span>{getReportName(rid)}</span>
            </div>
          ))}
          {reportDiff.added.map((rid) => (
            <div key={`add-${rid}`} className="edit-preview-change edit-preview-change--add">
              <AddCircleOutlineIcon sx={{ fontSize: 14, color: "var(--success)" }} />
              <span>{getReportName(rid)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alias changes */}
      {(aliasDiff.added.length > 0 || aliasDiff.removed.length > 0) && (
        <div className="edit-preview-section">
          <h4>Fastie Aliases</h4>
          {aliasDiff.removed.map((a) => (
            <div key={`rm-${a}`} className="edit-preview-change edit-preview-change--remove">
              <RemoveCircleOutlineIcon sx={{ fontSize: 14, color: "var(--danger)" }} />
              <span>{a}</span>
            </div>
          ))}
          {aliasDiff.added.map((a) => (
            <div key={`add-${a}`} className="edit-preview-change edit-preview-change--add">
              <AddCircleOutlineIcon sx={{ fontSize: 14, color: "var(--success)" }} />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
