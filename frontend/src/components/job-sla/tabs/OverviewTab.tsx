/**
 * OverviewTab — Timeline chart and trend visualization for job SLA.
 * Shows SLA deviation timeline, weekly/monthly trends, and actionable insights.
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { Spinner } from "../../ui";
import { CHART_COLORS, DAY_OF_WEEK_LABELS } from "../../../constants/jobSla";
import type {
  TrendPoint,
  JobDefinition,
  JobType,
  SlaPolicy,
  TrendInsights,
  DayOfWeekStats,
  SlaTimelinePoint,
} from "../../../types/jobSla";

/** Chart styling constants */
const CHART_STYLE = {
  EXPECTED_SLA_COLOR: "#22c55e", // Green for ideal/expected
  ACTUAL_COLOR: "#3b82f6", // Blue for actual
  DEVIATION_FILL: "rgba(239, 68, 68, 0.15)", // Red tint for late deviation area
  EARLY_FILL: "rgba(34, 197, 94, 0.1)", // Green tint for early area
  GRID_STROKE: "var(--border)",
  AXIS_STROKE: "var(--text-secondary)",
  AXIS_FONT_SIZE: 11,
} as const;

/** UI Labels */
const LABELS = {
  SLA_DEVIATION: "SLA Deviation Timeline",
  SLA_DEVIATION_HELP:
    "Green line shows expected SLA time, blue line shows actual completion. The gap shows how much the job deviated from schedule.",
  WEEKLY_TREND: "Weekly Performance",
  MONTHLY_TREND: "Monthly Summary",
  ON_TIME_RATE: "On-Time %",
  TOTAL_RUNS: "Total Runs",
  LATE: "Late",
  FAILED: "Failed",
  ON_TIME: "On Time",
  NO_DATA: "No trend data available for this date range.",
  NO_TIMELINE_DATA: "No SLA timeline data available. This job may not have expected SLA times configured.",
  JOB_INFO: "Job Information",
  SLA_POLICIES: "SLA Policies",
  LOADING: "Loading trends...",
  WEEKLY_HELP: "Weekly on-time percentage trend",
  MONTHLY_HELP: "Monthly breakdown of on-time, late, and failed runs",
  INSIGHTS: "Trend Insights",
  EXPECTED_SLA: "Expected SLA",
  ACTUAL_END: "Actual End",
} as const;

interface OverviewTabProps {
  job: JobDefinition | null;
  jobType: JobType | null;
  slaPolicies: SlaPolicy[];
  weeklyTrend: TrendPoint[];
  monthlyTrend: TrendPoint[];
  slaTimeline?: SlaTimelinePoint[];
  insights?: TrendInsights | null;
  dayOfWeekStats?: DayOfWeekStats[] | null;
  loading: boolean;
}

/** Format date for chart axis */
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Convert minutes from midnight to time string */
function formatMinutesToTime(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  const ampm = hrs >= 12 ? "PM" : "AM";
  const h12 = hrs === 0 ? 12 : hrs > 12 ? hrs - 12 : hrs;
  return `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

/** Custom tooltip for SLA deviation chart */
function SlaDeviationTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const deviation = data?.deviation_minutes;
  const isLate = deviation && deviation > 0;

  return (
    <div className="js-chart-tooltip">
      <div className="js-tooltip-label">{label}</div>
      <div className="js-tooltip-row" style={{ color: CHART_STYLE.EXPECTED_SLA_COLOR }}>
        <span>Expected SLA:</span>
        <span>{formatMinutesToTime(data?.expected_sla_minutes)}</span>
      </div>
      <div className="js-tooltip-row" style={{ color: CHART_STYLE.ACTUAL_COLOR }}>
        <span>Actual End:</span>
        <span>{formatMinutesToTime(data?.actual_end_minutes)}</span>
      </div>
      {deviation !== null && (
        <div className="js-tooltip-row" style={{ color: isLate ? "#ef4444" : "#22c55e" }}>
          <span>Deviation:</span>
          <span>
            {isLate ? "+" : ""}
            {Math.round(deviation)} min
          </span>
        </div>
      )}
      {data?.current_status && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)" }}>
          <span>Status:</span>
          <span style={{ textTransform: "capitalize" }}>{data.current_status}</span>
        </div>
      )}
    </div>
  );
}

/** Custom tooltip for other charts */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="js-chart-tooltip">
      <div className="js-tooltip-label">{label}</div>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="js-tooltip-row" style={{ color: entry.color }}>
          <span>{entry.name}:</span>
          <span>
            {typeof entry.value === "number"
              ? entry.name.includes("%")
                ? `${entry.value.toFixed(1)}%`
                : entry.value
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OverviewTab({
  job,
  jobType,
  slaPolicies,
  weeklyTrend,
  monthlyTrend,
  slaTimeline = [],
  insights,
  dayOfWeekStats,
  loading,
}: OverviewTabProps) {
  // Prepare SLA timeline data
  const timelineData = useMemo(
    () =>
      slaTimeline.map((p) => ({
        ...p,
        label: formatDateLabel(p.data_date),
        // Keep minutes for Y-axis comparison
        expectedSla: p.expected_sla_minutes,
        actualEnd: p.actual_end_minutes,
      })),
    [slaTimeline],
  );

  // Calculate Y-axis domain for timeline chart
  const timelineDomain = useMemo(() => {
    if (timelineData.length === 0) return [0, 1440]; // Default 0-24 hours

    const allValues = timelineData.flatMap((d) =>
      [d.expectedSla, d.actualEnd].filter((v): v is number => v !== null && v !== undefined),
    );

    if (allValues.length === 0) return [0, 1440];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 60; // 10% padding or 1 hour

    return [Math.max(0, min - padding), Math.min(1440, max + padding)];
  }, [timelineData]);

  // Prepare weekly chart data
  const weeklyData = useMemo(
    () =>
      weeklyTrend.map((p) => ({
        ...p,
        label: formatWeekLabel(p.period_start),
        onTimeRate: p.on_time_percentage ?? 0,
      })),
    [weeklyTrend],
  );

  // Prepare monthly chart data
  const monthlyData = useMemo(
    () =>
      monthlyTrend.map((p) => ({
        ...p,
        label: formatMonthLabel(p.period_start),
      })),
    [monthlyTrend],
  );

  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label={LABELS.LOADING} />
      </div>
    );
  }

  if (!job) {
    return <div className="js-tab-empty">Select a job to view overview</div>;
  }

  const hasTimelineData = timelineData.length > 0;
  const hasWeeklyData = weeklyData.length > 0;
  const hasMonthlyData = monthlyData.length > 0;

  return (
    <div className="js-overview-tab">
      {/* Job Info Section */}
      <div className="js-overview-section">
        <h3 className="js-section-title">{LABELS.JOB_INFO}</h3>
        <JobInfoCard job={job} jobType={jobType} slaPolicies={slaPolicies} />
      </div>

      {/* Trend Insights Section */}
      {insights && (
        <div className="js-overview-section">
          <h3 className="js-section-title">{LABELS.INSIGHTS}</h3>
          <TrendInsightsCard insights={insights} dayOfWeekStats={dayOfWeekStats} />
        </div>
      )}

      {/* SLA Deviation Timeline Chart - Primary chart */}
      <div className="js-overview-section">
        <h3 className="js-section-title">{LABELS.SLA_DEVIATION}</h3>
        <p className="js-section-help">{LABELS.SLA_DEVIATION_HELP}</p>
        {hasTimelineData ? (
          <div className="js-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={timelineData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.GRID_STROKE} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: CHART_STYLE.AXIS_FONT_SIZE }}
                  stroke={CHART_STYLE.AXIS_STROKE}
                />
                <YAxis
                  domain={timelineDomain}
                  tickFormatter={(val) => formatMinutesToTime(val)}
                  tick={{ fontSize: CHART_STYLE.AXIS_FONT_SIZE }}
                  stroke={CHART_STYLE.AXIS_STROKE}
                  width={70}
                />
                <Tooltip content={<SlaDeviationTooltip />} />
                <Legend />
                {/* Expected SLA line - Green (ideal) */}
                <Line
                  type="monotone"
                  dataKey="expectedSla"
                  name={LABELS.EXPECTED_SLA}
                  stroke={CHART_STYLE.EXPECTED_SLA_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_STYLE.EXPECTED_SLA_COLOR }}
                  activeDot={{ r: 5 }}
                />
                {/* Actual completion line - Blue */}
                <Line
                  type="monotone"
                  dataKey="actualEnd"
                  name={LABELS.ACTUAL_END}
                  stroke={CHART_STYLE.ACTUAL_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_STYLE.ACTUAL_COLOR }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="js-chart-container">
            <div className="js-chart-empty">{LABELS.NO_TIMELINE_DATA}</div>
          </div>
        )}
      </div>

      {/* Weekly Trend Chart */}
      <div className="js-overview-section">
        <h3 className="js-section-title">{LABELS.WEEKLY_TREND}</h3>
        <p className="js-section-help">{LABELS.WEEKLY_HELP}</p>
        {hasWeeklyData ? (
          <div className="js-chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.GRID_STROKE} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: CHART_STYLE.AXIS_FONT_SIZE }}
                  stroke={CHART_STYLE.AXIS_STROKE}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: CHART_STYLE.AXIS_FONT_SIZE }}
                  stroke={CHART_STYLE.AXIS_STROKE}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="onTimeRate"
                  name={LABELS.ON_TIME_RATE}
                  stroke={CHART_COLORS.onTime}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="js-chart-container">
            <div className="js-chart-empty">{LABELS.NO_DATA}</div>
          </div>
        )}
      </div>

      {/* Monthly Trend Chart */}
      <div className="js-overview-section">
        <h3 className="js-section-title">{LABELS.MONTHLY_TREND}</h3>
        <p className="js-section-help">{LABELS.MONTHLY_HELP}</p>
        {hasMonthlyData ? (
          <div className="js-chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.GRID_STROKE} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: CHART_STYLE.AXIS_FONT_SIZE }}
                  stroke={CHART_STYLE.AXIS_STROKE}
                />
                <YAxis tick={{ fontSize: CHART_STYLE.AXIS_FONT_SIZE }} stroke={CHART_STYLE.AXIS_STROKE} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="on_time_count" name={LABELS.ON_TIME} fill={CHART_COLORS.onTime} stackId="a" />
                <Bar dataKey="late_count" name={LABELS.LATE} fill={CHART_COLORS.late} stackId="a" />
                <Bar dataKey="failed_count" name={LABELS.FAILED} fill={CHART_COLORS.failed} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="js-chart-container">
            <div className="js-chart-empty">{LABELS.NO_DATA}</div>
          </div>
        )}
      </div>

      {/* SLA Policies */}
      {slaPolicies.length > 0 && (
        <div className="js-overview-section">
          <h3 className="js-section-title">{LABELS.SLA_POLICIES}</h3>
          <SlaPoliciesTable policies={slaPolicies} />
        </div>
      )}
    </div>
  );
}

/** Trend Insights Card - Shows actionable insights */
function TrendInsightsCard({
  insights,
  dayOfWeekStats,
}: {
  insights: TrendInsights;
  dayOfWeekStats?: DayOfWeekStats[] | null;
}) {
  const {
    current_period,
    duration_trend_percentage,
    duration_trend_direction,
    on_time_trend_change,
    on_time_trend_direction,
    worst_day_of_week,
    worst_day_late_percentage,
  } = insights;

  const worstDayName = worst_day_of_week !== null ? DAY_OF_WEEK_LABELS[worst_day_of_week] : null;

  return (
    <div className="js-insights-card">
      <div className="js-insights-grid">
        {/* Duration trend */}
        {duration_trend_percentage !== null && duration_trend_direction && (
          <div className={`js-insight-item js-insight--${duration_trend_direction === "faster" ? "good" : "warning"}`}>
            <div className="js-insight-icon">{duration_trend_direction === "faster" ? "↓" : "↑"}</div>
            <div className="js-insight-content">
              <div className="js-insight-value">
                {Math.abs(duration_trend_percentage).toFixed(1)}% {duration_trend_direction}
              </div>
              <div className="js-insight-label">
                vs previous{" "}
                {Math.ceil(
                  (new Date(current_period.date_to).getTime() - new Date(current_period.date_from).getTime()) /
                    (1000 * 60 * 60 * 24),
                )}{" "}
                days
              </div>
            </div>
          </div>
        )}

        {/* On-time trend */}
        {on_time_trend_change !== null && on_time_trend_direction && (
          <div className={`js-insight-item js-insight--${on_time_trend_direction === "improving" ? "good" : "danger"}`}>
            <div className="js-insight-icon">{on_time_trend_direction === "improving" ? "↑" : "↓"}</div>
            <div className="js-insight-content">
              <div className="js-insight-value">
                {on_time_trend_change > 0 ? "+" : ""}
                {on_time_trend_change.toFixed(1)}% on-time rate
              </div>
              <div className="js-insight-label">
                {on_time_trend_direction === "improving" ? "Improving" : "Declining"} trend
              </div>
            </div>
          </div>
        )}

        {/* Late runs in period */}
        {current_period.late_count > 0 && (
          <div className="js-insight-item js-insight--warning">
            <div className="js-insight-icon">!</div>
            <div className="js-insight-content">
              <div className="js-insight-value">{current_period.late_count} runs above SLA</div>
              <div className="js-insight-label">in this period ({current_period.total_runs} total)</div>
            </div>
          </div>
        )}

        {/* Worst day */}
        {worstDayName && worst_day_late_percentage !== null && worst_day_late_percentage > 0 && (
          <div className="js-insight-item js-insight--info">
            <div className="js-insight-icon">📅</div>
            <div className="js-insight-content">
              <div className="js-insight-value">{worstDayName} has highest delay rate</div>
              <div className="js-insight-label">
                {worst_day_late_percentage.toFixed(1)}% late on {worstDayName}s
              </div>
            </div>
          </div>
        )}

        {/* P95 latency */}
        {current_period.p95_duration_minutes !== null && (
          <div className="js-insight-item js-insight--neutral">
            <div className="js-insight-icon">P95</div>
            <div className="js-insight-content">
              <div className="js-insight-value">{current_period.p95_duration_minutes.toFixed(1)} min</div>
              <div className="js-insight-label">95th percentile duration</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Job info card sub-component - shows SLA schedule */
function JobInfoCard({
  job,
  jobType,
  slaPolicies,
}: {
  job: JobDefinition;
  jobType: JobType | null;
  slaPolicies: SlaPolicy[];
}) {
  // Format SLA time for display
  const formatSlaTime = (time: string | null) => {
    if (!time) return "—";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Get schedule summary from SLA policies
  const getScheduleSummary = () => {
    if (!slaPolicies || slaPolicies.length === 0) {
      return { frequency: "No SLA configured", slaTime: "—", timezone: "—" };
    }

    const uniqueDays = new Set(slaPolicies.map((p) => p.day_of_week?.toLowerCase()).filter(Boolean));
    const firstPolicy = slaPolicies[0];

    let frequency = "Daily";
    if (uniqueDays.size === 1) {
      const day = Array.from(uniqueDays)[0];
      frequency = day ? `Weekly (${day.charAt(0).toUpperCase() + day.slice(1)})` : "Daily";
    } else if (uniqueDays.size > 1 && uniqueDays.size < 7) {
      frequency = `${uniqueDays.size} days/week`;
    }

    return {
      frequency: firstPolicy.schedule_frequency || frequency,
      slaTime: formatSlaTime(firstPolicy.expected_sla_time),
      startTime: formatSlaTime(firstPolicy.expected_start_time),
      timezone: firstPolicy.timezone || "UTC",
    };
  };

  const schedule = getScheduleSummary();

  return (
    <div className="js-job-info-card">
      <div className="js-info-row">
        <span className="js-info-label">Job Name</span>
        <span className="js-info-value">{job.job_name}</span>
      </div>
      <div className="js-info-row">
        <span className="js-info-label">Type</span>
        <span className="js-info-value">
          {jobType?.type || "standard"}
          {jobType?.has_artifacts && <span className="js-badge js-badge--artifact">Artifacts</span>}
          {jobType?.is_proxy && <span className="js-badge js-badge--proxy">Proxy</span>}
        </span>
      </div>
      <div className="js-info-row">
        <span className="js-info-label">Schedule</span>
        <span className="js-info-value">{schedule.frequency}</span>
      </div>
      <div className="js-info-row">
        <span className="js-info-label">Expected SLA</span>
        <span className="js-info-value">
          {schedule.slaTime} {schedule.timezone !== "—" && `(${schedule.timezone})`}
        </span>
      </div>
    </div>
  );
}

/** SLA policies table sub-component */
function SlaPoliciesTable({ policies }: { policies: SlaPolicy[] }) {
  return (
    <div className="js-table-container">
      <table className="js-history-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Start Time</th>
            <th>SLA Time</th>
            <th>Duration</th>
            <th>Timezone</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.policy_id}>
              <td>{policy.day_of_week || "All"}</td>
              <td>{policy.expected_start_time || "—"}</td>
              <td>{policy.expected_sla_time || "—"}</td>
              <td>{policy.expected_duration_minutes ? `${policy.expected_duration_minutes}m` : "—"}</td>
              <td>{policy.timezone || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
