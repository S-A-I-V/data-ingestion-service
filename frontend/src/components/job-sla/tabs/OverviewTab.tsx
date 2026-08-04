/**
 * OverviewTab — SLA performance chart with day-of-week and week-by-week views.
 *
 * Primary chart: grouped bars showing avg expected SLA time vs avg actual end
 * time per day of week (or per week). SLA breach bars are highlighted in amber.
 * A green reference line marks the expected SLA threshold.
 */

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Spinner, Panel, PanelHeader } from "../../ui";
import { DAY_OF_WEEK_LABELS } from "../../../constants/jobSla";
import type { SlaPolicy, DayOfWeekSlaBars, WeeklySlaBars } from "../../../types/jobSla";
// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_ACTUAL_OK = "#3b82f6"; // blue-500  — actual range, within SLA
const COLOR_ACTUAL_BREACH = "#f59e0b"; // amber-500 — actual range, exceeded SLA
const COLOR_GRID = "var(--border)";
const COLOR_AXIS = "var(--text-secondary)";
const AXIS_FONT_SIZE = 11;
const CHART_HEIGHT_PX = 300;
const Y_AXIS_DOMAIN: [number, number] = [0, 1440]; // always full 0–24h
const Y_AXIS_TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440]; // every 3h

/** View mode toggle values */
type ChartView = "day_of_week" | "weekly";

const CHART_VIEW_LABELS: Record<ChartView, string> = {
  day_of_week: "By Day of Week",
  weekly: "By Week",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert minutes-from-midnight to "H:MM AM/PM" */
function minsToTime(mins: number | null): string {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Format an ISO date string as "Mon Jan 6" — kept for future use */
function fmtWeekLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function SlaBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const breached =
    d?.actual_end_minutes != null && d?.expected_sla_minutes != null && d.actual_end_minutes > d.expected_sla_minutes;

  return (
    <div className="js-chart-tooltip">
      <div className="js-tooltip-label">{label}</div>
      {d?.expected_start_minutes != null && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)" }}>
          <span>Expected start:</span>
          <span>{minsToTime(d.expected_start_minutes)}</span>
        </div>
      )}
      {d?.actual_start_minutes != null && (
        <div className="js-tooltip-row" style={{ color: COLOR_ACTUAL_OK }}>
          <span>Actual start:</span>
          <span>{minsToTime(d.actual_start_minutes)}</span>
        </div>
      )}
      {d?.actual_end_minutes != null && (
        <div className="js-tooltip-row" style={{ color: breached ? COLOR_ACTUAL_BREACH : COLOR_ACTUAL_OK }}>
          <span>Actual end:</span>
          <span>{minsToTime(d.actual_end_minutes)}</span>
        </div>
      )}
      {d?.expected_sla_minutes != null && (
        <div className="js-tooltip-row" style={{ color: COLOR_SLA_END_LINE }}>
          <span>SLA deadline:</span>
          <span>{minsToTime(d.expected_sla_minutes)}</span>
        </div>
      )}
      {d?.avg_delay_minutes != null && d.avg_delay_minutes > 0 && (
        <div className="js-tooltip-row" style={{ color: COLOR_ACTUAL_BREACH }}>
          <span>Avg delay:</span>
          <span>+{d.avg_delay_minutes.toFixed(0)} min</span>
        </div>
      )}
      {d?.on_time_percentage != null && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)" }}>
          <span>On-time rate:</span>
          <span>{d.on_time_percentage.toFixed(1)}%</span>
        </div>
      )}
      {d?.total_runs != null && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)" }}>
          <span>{d.occurrence_count != null ? `${d.occurrence_count} occurrences` : "Total runs"}:</span>
          <span>{d.total_runs}</span>
        </div>
      )}
    </div>
  );
}

// ── Combined bar + SLA window lines shape ────────────────────────────────────
// Single shape renders the floating job-window rect AND the two SLA tick lines
// in one pass. Lines sit on top of the bar because they're drawn after the rect
// in the same SVG <g>, with no separate Bar series needed.

const COLOR_SLA_START_LINE = "#4ade80"; // green-400 — bright green, start window
const COLOR_SLA_END_LINE = "#ef4444"; // red-500   — deadline
const SLA_LINE_STROKE_WIDTH = 5;
const SLA_LINE_DASH = "8 4";
// Inset so adjacent same-value lines have a small visible gap between columns
const SLA_LINE_INSET_PX = 3;

function JobWindowShape(props: any) {
  const { x, y, width, height, background, payload, fill } = props;
  if (!background || !payload || width <= 0) return null;

  const { expected_start_minutes, expected_sla_minutes, yDomainMin, yDomainMax } = payload;
  const plotTop = background.y;
  const plotHeight = background.height;
  const domainMin = yDomainMin ?? 0;
  const domainMax = yDomainMax ?? 1440;
  const domainRange = domainMax - domainMin;

  const toPixelY = (mins: number) => plotTop + plotHeight * (1 - (mins - domainMin) / domainRange);

  const lx1 = x + SLA_LINE_INSET_PX;
  const lx2 = x + width - SLA_LINE_INSET_PX;
  const labelX = x + width + 4;

  return (
    <g>
      {/* SLA window band — light grey background from start to deadline */}
      {expected_start_minutes != null &&
        expected_sla_minutes != null &&
        (() => {
          const yTop = toPixelY(expected_sla_minutes) - SLA_LINE_STROKE_WIDTH / 2; // outer top edge of deadline line
          const yBot = toPixelY(expected_start_minutes) + SLA_LINE_STROKE_WIDTH / 2; // outer bottom edge of start line
          const bandHeight = yBot - yTop;
          if (bandHeight <= 0) return null;
          return (
            <rect
              x={x}
              y={yTop}
              width={width}
              height={bandHeight}
              fill="rgba(180, 180, 180, 0.15)"
              stroke="rgba(0, 0, 0, 0.35)"
              strokeWidth={0.75}
            />
          );
        })()}
      {/* Job run window rect */}
      {height > 0 && <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} ry={2} />}
      {/* SLA start line — drawn over the rect */}
      {expected_start_minutes != null &&
        (() => {
          const ly = toPixelY(expected_start_minutes);
          return (
            <g>
              <line
                x1={lx1}
                x2={lx2}
                y1={ly}
                y2={ly}
                stroke={COLOR_SLA_START_LINE}
                strokeWidth={SLA_LINE_STROKE_WIDTH}
                strokeDasharray={SLA_LINE_DASH}
              />
            </g>
          );
        })()}
      {/* SLA deadline line — drawn over the rect */}
      {expected_sla_minutes != null &&
        (() => {
          const ly = toPixelY(expected_sla_minutes);
          return (
            <g>
              <line
                x1={lx1}
                x2={lx2}
                y1={ly}
                y2={ly}
                stroke={COLOR_SLA_END_LINE}
                strokeWidth={SLA_LINE_STROKE_WIDTH}
                strokeDasharray={SLA_LINE_DASH}
              />
            </g>
          );
        })()}
    </g>
  );
}

interface SlaBarChartProps {
  view: ChartView;
  dowData: DayOfWeekSlaBars[];
  weeklyData: WeeklySlaBars[];
}

function SlaBarChart({ view, dowData, weeklyData }: SlaBarChartProps) {
  const chartData = useMemo(() => {
    // Sort Mon(1)→Tue(2)→…→Sat(6)→Sun(0) regardless of API return order
    const MON_FIRST = (dow: number) => (dow === 0 ? 7 : dow);
    const rows =
      view === "day_of_week"
        ? [...dowData]
            .sort((a, b) => MON_FIRST(a.day_of_week) - MON_FIRST(b.day_of_week))
            .map((d) => {
              const dayName = DAY_OF_WEEK_LABELS[d.day_of_week] ?? `Day ${d.day_of_week}`;
              const dateSuffix = d.most_recent_date
                ? new Date(d.most_recent_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : null;
              const base = d.expected_start_minutes ?? 0;
              const end = d.actual_end_minutes ?? d.expected_sla_minutes ?? base;
              return {
                label: dateSuffix ? `${dayName} · ${dateSuffix}` : dayName,
                base: d.actual_start_minutes ?? d.expected_start_minutes ?? 0,
                range_height: Math.max(
                  0,
                  (d.actual_end_minutes ?? d.expected_sla_minutes ?? 0) -
                    (d.actual_start_minutes ?? d.expected_start_minutes ?? 0),
                ),
                expected_start_minutes: d.expected_start_minutes,
                actual_start_minutes: d.actual_start_minutes,
                expected_sla_minutes: d.expected_sla_minutes,
                actual_end_minutes: d.actual_end_minutes,
                avg_delay_minutes: d.avg_delay_minutes,
                on_time_percentage: d.on_time_percentage,
                total_runs: d.total_runs,
                occurrence_count: d.occurrence_count,
                breach_count: d.breach_count,
                isLast: false,
                isBreach:
                  d.actual_end_minutes != null &&
                  d.expected_sla_minutes != null &&
                  d.actual_end_minutes > d.expected_sla_minutes,
              };
            })
        : weeklyData.map((d) => {
            return {
              label: new Date(d.data_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
              base: d.actual_start_minutes ?? d.expected_start_minutes ?? 0,
              range_height: Math.max(
                0,
                (d.actual_end_minutes ?? d.expected_sla_minutes ?? 0) -
                  (d.actual_start_minutes ?? d.expected_start_minutes ?? 0),
              ),
              expected_start_minutes: d.expected_start_minutes,
              actual_start_minutes: d.actual_start_minutes,
              expected_sla_minutes: d.expected_sla_minutes,
              actual_end_minutes: d.actual_end_minutes,
              avg_delay_minutes: d.avg_delay_minutes,
              on_time_percentage: d.on_time_percentage,
              total_runs: 1,
              occurrence_count: null,
              breach_count: d.breach_count,
              isLast: false,
              isBreach:
                d.actual_end_minutes != null &&
                d.expected_sla_minutes != null &&
                d.actual_end_minutes > d.expected_sla_minutes,
            };
          });

    if (rows.length) rows[rows.length - 1].isLast = true;
    return rows;
  }, [view, dowData, weeklyData]);

  // Avg expected SLA deadline is no longer needed for a global ReferenceLine —
  // per-bar lines are drawn by JobWindowShape via custom Bar shape instead.

  // Y-axis domain: for the daily view, zoom into the actual data range with
  // 60-min padding and 3-hour tick boundaries so the axis stays readable.
  // For the day-of-week view keep the full 0–1440 range (fewer bars, wider spread).
  const { yDomain, yTicks } = useMemo(() => {
    if (view !== "weekly" || !chartData.length) {
      return { yDomain: Y_AXIS_DOMAIN, yTicks: Y_AXIS_TICKS };
    }
    const allVals = chartData.flatMap((d) =>
      [d.expected_start_minutes, d.actual_start_minutes, d.expected_sla_minutes, d.actual_end_minutes].filter(
        (v): v is number => v != null,
      ),
    );
    if (!allVals.length) return { yDomain: Y_AXIS_DOMAIN, yTicks: Y_AXIS_TICKS };
    const PAD_MINS = 60; // one hour padding
    const TICK_STEP = 180; // 3-hour ticks
    const lo = Math.max(0, Math.floor((Math.min(...allVals) - PAD_MINS) / TICK_STEP) * TICK_STEP);
    const hi = Math.min(1440, Math.ceil((Math.max(...allVals) + PAD_MINS) / TICK_STEP) * TICK_STEP);
    const ticks: number[] = [];
    for (let t = lo; t <= hi; t += TICK_STEP) ticks.push(t);
    return { yDomain: [lo, hi] as [number, number], yTicks: ticks };
  }, [view, chartData]);

  // Stamp the active domain bounds into each payload row so JobWindowShape
  // can interpolate SLA line positions correctly when the domain is zoomed.
  const chartDataWithDomain = useMemo(
    () => chartData.map((d) => ({ ...d, yDomainMin: yDomain[0], yDomainMax: yDomain[1] })),
    [chartData, yDomain],
  );

  if (!chartData.length) {
    return (
      <div className="js-chart-empty">
        No SLA data available — expected SLA times may not be configured for this job.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
      {/*
        Floating bar technique: two stacked bars per group.
          1. "base" — transparent, lifts the visible bar to start at expected_start_minutes
          2. "range_height" — colored, spans from expected_start to actual_end
        The SLA deadline is a ReferenceLine cutting across all bars.
      */}
      <BarChart data={chartDataWithDomain} margin={{ top: 12, right: 60, left: 8, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: AXIS_FONT_SIZE }} stroke={COLOR_AXIS} />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          tickFormatter={minsToTime}
          tick={{ fontSize: AXIS_FONT_SIZE }}
          stroke={COLOR_AXIS}
          width={72}
        />
        <Tooltip content={<SlaBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          content={() => (
            <div
              style={{
                display: "flex",
                gap: "1.25rem",
                justifyContent: "center",
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: COLOR_ACTUAL_OK,
                  }}
                />
                On-time run
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: COLOR_ACTUAL_BREACH,
                  }}
                />
                SLA breached
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="20" height="4">
                  <line
                    x1="0"
                    x2="20"
                    y1="2"
                    y2="2"
                    stroke={COLOR_SLA_START_LINE}
                    strokeWidth="3"
                    strokeDasharray="5 2"
                  />
                </svg>
                SLA start
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="20" height="4">
                  <line
                    x1="0"
                    x2="20"
                    y1="2"
                    y2="2"
                    stroke={COLOR_SLA_END_LINE}
                    strokeWidth="3"
                    strokeDasharray="5 2"
                  />
                </svg>
                SLA deadline
              </span>
            </div>
          )}
        />
        {/* Invisible base — lifts the visible bar to start at expected_start_minutes */}
        <Bar dataKey="base" stackId="sla" fill="transparent" legendType="none" isAnimationActive={false} />
        {/* Job run window + SLA lines drawn together in one custom shape */}
        <Bar
          dataKey="range_height"
          name="Job run window"
          stackId="sla"
          isAnimationActive={false}
          shape={<JobWindowShape />}
        >
          {chartDataWithDomain.map((d, i) => (
            <Cell key={i} fill={d.isBreach ? COLOR_ACTUAL_BREACH : COLOR_ACTUAL_OK} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

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
              = breached. The dashed lines per bar mark the SLA window — light green at the start, green at the
              deadline.
            </p>
          </div>
          {/* View toggle */}
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
        </div>

        <div className="js-chart-container">
          {hasChartData ? (
            <SlaBarChart view={chartView} dowData={dayOfWeekSlaBars} weeklyData={weeklySlaBars} />
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

// ── SLA Policies Table ────────────────────────────────────────────────────────
// Uses the same Panel + data-table structure as the audit log page.

function SlaPoliciesTable({ policies }: { policies: SlaPolicy[] }) {
  const fmt = (t: string | null | undefined) => {
    if (!t) return "—";
    const parts = String(t).split(":");
    return `${parts[0]}:${parts[1]}`; // HH:MM, drop seconds
  };

  if (!policies.length) return null;

  return (
    <Panel>
      <div className="csv-preview-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data Day</th>
              <th>Frequency</th>
              <th>Timezone</th>
              <th>Duration (min)</th>
              <th>Start Time</th>
              <th>SLA Time</th>
              <th>Days +Start</th>
              <th>Days +SLA</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.policy_id}>
                <td>{p.day_of_week ?? "All"}</td>
                <td>{p.schedule_frequency ?? "—"}</td>
                <td>{p.timezone ?? "—"}</td>
                <td>{p.expected_duration_minutes ?? "—"}</td>
                <td>{fmt(p.expected_start_time as unknown as string)}</td>
                <td>{fmt(p.expected_sla_time as unknown as string)}</td>
                <td>{p.days_addition_start_time != null ? `+${p.days_addition_start_time}d` : "—"}</td>
                <td>{p.days_addition_sla != null ? `+${p.days_addition_sla}d` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
