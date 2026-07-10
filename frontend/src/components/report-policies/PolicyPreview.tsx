/**
 * PolicyPreview — Step 2: Shows formatted SQL statements before execution.
 */
import { format } from "sql-formatter";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import type { PreviewStatement } from "../../types/reportPolicies";
import { TOOLBAR_ICON_SIZE_PX } from "../../constants/reportPolicies";

interface Props {
  statements: PreviewStatement[];
  executing: boolean;
  onBack: () => void;
  onApply: () => void;
}

function formatSql(raw: string): string {
  try {
    return format(raw, { language: "postgresql", tabWidth: 2, keywordCase: "upper" });
  } catch {
    return raw;
  }
}

export default function PolicyPreview({ statements, executing, onBack, onApply }: Props) {
  return (
    <div className="rm-preview-panel" style={{ border: "none", flex: "unset" }}>
      <div className="rm-preview-header">
        <h4>
          {statements.length} statement{statements.length !== 1 ? "s" : ""} will be executed
        </h4>
      </div>
      <div className="rm-preview-statements">
        {statements.map((s, i) => (
          <div key={i} className="rm-preview-stmt">
            <span className="rm-preview-stmt-num">#{i + 1}</span>
            <div>
              <code>{formatSql(s.sql)}</code>
              <div className="rm-preview-stmt-params">
                {Object.entries(s.params)
                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                  .join("  |  ")}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 16, display: "flex", gap: 10, justifyContent: "center" }}>
        <button type="button" className="btn btn-sm" onClick={onBack}>
          <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back to Edit
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={onApply} disabled={executing}>
          <CheckCircleOutlineIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />{" "}
          {executing ? "Applying..." : "Confirm & Apply"}
        </button>
      </div>
    </div>
  );
}
