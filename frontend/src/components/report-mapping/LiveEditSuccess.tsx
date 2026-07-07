/**
 * Success view shown after a live edit mapping is applied successfully.
 */
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Highlight from "../ui/Highlight";
import { SUCCESS_ICON_SIZE_PX, TOOLBAR_ICON_SIZE_PX } from "../../constants/reportMapping";

interface LiveEditSuccessProps {
  result: {
    executed: number;
    skipped: number;
    total_statements: number;
  };
}

export default function LiveEditSuccess({ result }: LiveEditSuccessProps) {
  const navigate = useNavigate();

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">
          <Highlight>Edit Mapping</Highlight>
        </span>
      </div>
      <div className="onboarding-success">
        <CheckCircleOutlineIcon sx={{ fontSize: SUCCESS_ICON_SIZE_PX, color: "var(--success)" }} />
        <h2 className="onboarding-success-title">Mapping Updated Successfully</h2>
        <div className="onboarding-success-stats">
          <div className="onboarding-success-stat">
            <span className="onboarding-success-stat-value">{result.executed}</span>
            <span className="onboarding-success-stat-label">Executed</span>
          </div>
          <div className="onboarding-success-stat onboarding-success-stat--warn">
            <span className="onboarding-success-stat-value">{result.skipped}</span>
            <span className="onboarding-success-stat-label">Skipped</span>
          </div>
          <div className="onboarding-success-stat">
            <span className="onboarding-success-stat-value">{result.total_statements}</span>
            <span className="onboarding-success-stat-label">Total</span>
          </div>
        </div>
        <div className="onboarding-success-actions">
          <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate("/admin/report-mapping")}>
            <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX + 2 }} /> Back to Hub
          </button>
        </div>
      </div>
    </div>
  );
}
