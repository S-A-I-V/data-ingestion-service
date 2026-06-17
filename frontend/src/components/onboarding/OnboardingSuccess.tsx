/**
 * OnboardingSuccess — Shared success state view for client onboarding/edit operations.
 * Displays execution stats and a summary table of the results.
 */
import { Button } from "../ui";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { SUCCESS_ICON_SIZE_PX, NAV_ICON_SIZE_PX } from "../../constants/onboarding";

interface StatRow {
  label: string;
  value: string | number;
  bold?: boolean;
}

interface OnboardingSuccessProps {
  title: string;
  executed: number;
  skipped: number;
  total: number;
  tableRows: StatRow[];
  actions: React.ReactNode;
}

export default function OnboardingSuccess({
  title,
  executed,
  skipped,
  total,
  tableRows,
  actions,
}: OnboardingSuccessProps) {
  return (
    <div className="onboarding-success">
      <CheckCircleOutlineIcon sx={{ fontSize: SUCCESS_ICON_SIZE_PX, color: "var(--success)" }} />
      <h2 className="onboarding-success-title">{title}</h2>
      <div className="onboarding-success-stats">
        <div className="onboarding-success-stat">
          <span className="onboarding-success-stat-value">{executed}</span>
          <span className="onboarding-success-stat-label">Executed</span>
        </div>
        <div className="onboarding-success-stat onboarding-success-stat--warn">
          <span className="onboarding-success-stat-value">{skipped}</span>
          <span className="onboarding-success-stat-label">Skipped</span>
        </div>
        <div className="onboarding-success-stat">
          <span className="onboarding-success-stat-value">{total}</span>
          <span className="onboarding-success-stat-label">Total</span>
        </div>
      </div>
      <div className="onboarding-success-table">
        <table className="data-table">
          <tbody>
            {tableRows.map((row, i) => (
              <tr key={i}>
                <td>{row.label}</td>
                <td>{row.bold ? <strong>{row.value}</strong> : row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="onboarding-success-actions">{actions}</div>
    </div>
  );
}
