/**
 * KpiCards — Summary KPI cards for job SLA compliance.
 * Shows on-time %, total runs, delays, failures with color-coded status.
 */

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningIcon from "@mui/icons-material/Warning";
import {
  ON_TIME_PERCENTAGE_GOOD_THRESHOLD,
  ON_TIME_PERCENTAGE_WARNING_THRESHOLD,
  AVG_DELAY_GOOD_THRESHOLD_MINUTES,
  AVG_DELAY_WARNING_THRESHOLD_MINUTES,
} from "../../constants/jobSla";
import type { ComplianceSummary } from "../../types/jobSla";

/** KPI card labels */
const KPI_LABELS = {
  ON_TIME_RATE: "On-Time Rate",
  TOTAL_RUNS: "Total Runs",
  DELAYED: "Delayed",
  FAILED: "Failed",
  AVG_DELAY: "Avg Delay",
  MAX_DELAY: "Max Delay",
} as const;

interface KpiCardsProps {
  compliance: ComplianceSummary | null;
  loading?: boolean;
}

/** Get status class based on on-time percentage */
function getOnTimeStatus(percentage: number | null): "good" | "warning" | "danger" {
  if (percentage === null) return "warning";
  if (percentage >= ON_TIME_PERCENTAGE_GOOD_THRESHOLD) return "good";
  if (percentage >= ON_TIME_PERCENTAGE_WARNING_THRESHOLD) return "warning";
  return "danger";
}

/** Get status class based on average delay */
function getDelayStatus(minutes: number | null): "good" | "warning" | "danger" {
  if (minutes === null || minutes === 0) return "good";
  if (minutes <= AVG_DELAY_GOOD_THRESHOLD_MINUTES) return "good";
  if (minutes <= AVG_DELAY_WARNING_THRESHOLD_MINUTES) return "warning";
  return "danger";
}

/** Format minutes to human readable */
function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function KpiCards({ compliance, loading }: KpiCardsProps) {
  if (loading) {
    return (
      <div className="js-kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="js-kpi-card js-kpi-card--loading">
            <div className="js-kpi-skeleton" />
          </div>
        ))}
      </div>
    );
  }

  if (!compliance) {
    return <div className="js-kpi-empty">Select a job to view SLA metrics</div>;
  }

  const onTimeStatus = getOnTimeStatus(compliance.on_time_percentage);
  const delayStatus = getDelayStatus(compliance.avg_delay_minutes);

  return (
    <div className="js-kpi-grid">
      {/* On-Time Rate */}
      <div className={`js-kpi-card js-kpi-card--${onTimeStatus}`}>
        <div className="js-kpi-icon">
          {onTimeStatus === "good" ? <CheckCircleIcon /> : onTimeStatus === "warning" ? <WarningIcon /> : <ErrorIcon />}
        </div>
        <div className="js-kpi-content">
          <div className="js-kpi-value">
            {compliance.on_time_percentage !== null ? `${compliance.on_time_percentage.toFixed(1)}%` : "—"}
          </div>
          <div className="js-kpi-label">{KPI_LABELS.ON_TIME_RATE}</div>
        </div>
      </div>

      {/* Total Runs */}
      <div className="js-kpi-card">
        <div className="js-kpi-icon">
          <TrendingUpIcon />
        </div>
        <div className="js-kpi-content">
          <div className="js-kpi-value">{compliance.total_runs}</div>
          <div className="js-kpi-label">{KPI_LABELS.TOTAL_RUNS}</div>
        </div>
      </div>

      {/* Delayed */}
      <div className={`js-kpi-card ${compliance.delayed_count > 0 ? "js-kpi-card--warning" : ""}`}>
        <div className="js-kpi-icon">
          <ScheduleIcon />
        </div>
        <div className="js-kpi-content">
          <div className="js-kpi-value">{compliance.delayed_count}</div>
          <div className="js-kpi-label">{KPI_LABELS.DELAYED}</div>
        </div>
      </div>

      {/* Failed */}
      <div className={`js-kpi-card ${compliance.failed_count > 0 ? "js-kpi-card--danger" : ""}`}>
        <div className="js-kpi-icon">
          <ErrorIcon />
        </div>
        <div className="js-kpi-content">
          <div className="js-kpi-value">{compliance.failed_count}</div>
          <div className="js-kpi-label">{KPI_LABELS.FAILED}</div>
        </div>
      </div>

      {/* Avg Delay */}
      <div className={`js-kpi-card js-kpi-card--${delayStatus}`}>
        <div className="js-kpi-icon">
          <ScheduleIcon />
        </div>
        <div className="js-kpi-content">
          <div className="js-kpi-value">{formatMinutes(compliance.avg_delay_minutes)}</div>
          <div className="js-kpi-label">{KPI_LABELS.AVG_DELAY}</div>
        </div>
      </div>

      {/* Max Delay */}
      <div className="js-kpi-card">
        <div className="js-kpi-icon">
          <ScheduleIcon />
        </div>
        <div className="js-kpi-content">
          <div className="js-kpi-value">{formatMinutes(compliance.max_delay_minutes)}</div>
          <div className="js-kpi-label">{KPI_LABELS.MAX_DELAY}</div>
        </div>
      </div>
    </div>
  );
}
