/**
 * OverviewTab — SLA performance chart with day-of-week and week-by-week views.
 * Orchestrates the chart controls, SlaBarChart, and SlaPoliciesTable.
 */

import { useMemo, useState } from "react";
import { Spinner } from "../../ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { TREND_TIMEZONE_OPTIONS, TREND_DEFAULT_TIMEZONE } from "../../../constants/jobSla";
import type { SlaPolicy, DayOfWeekSlaBars, WeeklySlaBars } from "../../../types/jobSla";
import { SlaBarChart } from "./SlaBarChart";
import { SlaPoliciesTable } from "./SlaPoliciesTable";
import { CHART_VIEW_LABELS, type ChartView, type ChartStyle } from "./slaChartConstants";

// ── Props ─────────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  slaPolicies: SlaPolicy[];
  dayOfWeekSlaBars: DayOfWeekSlaBars[];
  weeklySlaBars: WeeklySlaBars[];
  loading: boolean;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function OverviewTab({ slaPolicies, dayOfWeekSlaBars, weeklySlaBars, loading }: OverviewTabProps) {
  const [chartView, setChartView] = useState<ChartView>("day_of_week");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("bar_line");
  const [tzValue, setTzValue] = useState(TREND_DEFAULT_TIMEZONE);

  const tzOffset = useMemo(
    () => TREND_TIMEZONE_OPTIONS.find((o) => o.value === tzValue)?.offsetMinutes ?? 0,
    [tzValue],
  );

  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label="Loading trends..." />
      </div>
    );
  }

  const hasChartData = dayOfWeekSlaBars.length > 0 || weeklySlaBars.length > 0;

  return (
    <div className="js-overview-tab">
      {/* Primary SLA chart */}
      <div className="js-overview-section">
        <div className="js-section-header">
          <div>
            <h3 className="js-section-title">SLA Performance — Last 90 Days</h3>
            <p className="js-section-help">
              Each bar is the job's avg run window (bottom = expected start, top = actual end). Blue = within SLA; amber
              = breached. The dashed lines per bar mark the SLA window — light green at the start, red at the deadline.
            </p>
          </div>
          {/* Controls row: view toggles + chart style + timezone picker */}
          <div className="js-trend-controls">
            <div className="js-view-mode-buttons">
              {(Object.keys(CHART_VIEW_LABELS) as ChartView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`js-view-mode-btn${chartView === v ? " js-view-mode-btn--active" : ""}`}
                  onClick={() => setChartView(v)}
                >
                  {CHART_VIEW_LABELS[v]}
                </button>
              ))}
            </div>
            <div className="js-view-mode-buttons">
              <button
                type="button"
                className={`js-view-mode-btn${chartStyle === "line_only" ? " js-view-mode-btn--active" : ""}`}
                onClick={() => setChartStyle(chartStyle === "line_only" ? "bar_line" : "line_only")}
              >
                Line Only
              </button>
            </div>
            <Select value={tzValue} onValueChange={setTzValue}>
              <SelectTrigger
                className="js-tz-select !rounded-none !border-[var(--text-primary)] !bg-[var(--bg-surface)]"
                aria-label="Chart timezone"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TREND_TIMEZONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="js-chart-container">
          {hasChartData ? (
            <SlaBarChart
              view={chartView}
              dowData={dayOfWeekSlaBars}
              weeklyData={weeklySlaBars}
              tzOffset={tzOffset}
              chartStyle={chartStyle}
            />
          ) : (
            <div className="js-chart-empty">
              No SLA data available — expected SLA times may not be configured for this job.
            </div>
          )}
        </div>
      </div>

      {/* SLA Policies */}
      <div className="js-overview-section">
        <h3 className="js-section-title">SLA Policies</h3>
        {slaPolicies.length > 0 ? (
          <SlaPoliciesTable policies={slaPolicies} />
        ) : (
          <div className="js-empty-section">No SLA policies configured for this job.</div>
        )}
      </div>
    </div>
  );
}
