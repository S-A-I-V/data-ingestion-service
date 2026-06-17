/**
 * PreviewPanel — Shows the SQL statements that will be executed
 * before applying changes to the production database.
 */
import { Button } from "../ui";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { TOOLBAR_ICON_SIZE_PX } from "../../constants/reportMapping";

interface PreviewStatement {
  sql: string;
  params: Record<string, unknown>;
}

interface PreviewPanelProps {
  statements: PreviewStatement[];
  executing: boolean;
  onBackToEdit: () => void;
  onApply: () => void;
}

export default function PreviewPanel({ statements, executing, onBackToEdit, onApply }: PreviewPanelProps) {
  return (
    <div className="rm-preview-panel">
      <div className="rm-preview-header">
        <h4>
          {statements.length} statement{statements.length !== 1 ? "s" : ""} will be executed
        </h4>
        <div className="rm-preview-actions">
          <Button size="sm" onClick={onBackToEdit}>
            <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back to Edit
          </Button>
          <Button size="sm" variant="primary" onClick={onApply} disabled={executing || statements.length === 0}>
            <CheckCircleOutlineIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />{" "}
            {executing ? "Applying..." : "Confirm & Apply"}
          </Button>
        </div>
      </div>
      <div className="rm-preview-statements">
        {statements.map((s, i) => (
          <div key={i} className="rm-preview-stmt">
            <span className="rm-preview-stmt-num">#{i + 1}</span>
            <div>
              <code>{s.sql}</code>
              <div className="rm-preview-stmt-params">
                {Object.entries(s.params)
                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                  .join("  |  ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
