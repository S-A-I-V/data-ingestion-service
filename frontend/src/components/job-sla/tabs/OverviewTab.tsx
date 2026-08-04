/**
 * OverviewTab — SLA performance chart with day-of-week and week-by-week views.
 *
 * Primary chart: grouped bars showing avg expected SLA time vs avg actual end
 * time per day of week (or per week). SLA breach bars are highlighted in amber.
 * A green reference line marks the expected SLA threshold.
 */

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Spinner, Panel, PanelHeader } from "../../ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { DAY_OF_WEEK_LABELS, TREND_TIMEZONE_OPTIONS, TREND_DEFAULT_TIMEZONE } from "../../../constants/jobSla";
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

/** Chart style: bars + lines (default) or lines only */
type ChartStyle = "bar_line" | "line_only";

const CHART_VIEW_LABELS: Record<ChartView, string> = {
  day_of_week: "By Day of Week",
  weekly: "By Week",
};

const CHART_STYLE_LABELS: Record<ChartStyle, string> = {
  bar_line: "Bar + Line",
  line_only: "Line Only",
};

/** Line colors for overlay trends */
const COLOR_LINE_ACTUAL = "#f97316"; // orange-500 — actual midpoint (distinct from blue bars)
const COLOR_LINE_EXPECTED = "#a855f7"; // purple-500 — expected SLA midpoint (distinct from green start lines)

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert minutes-from-midnight (UTC) to "H:MM AM/PM" in the given timezone.
 * tzOffsetMinutes is the signed offset from UTC (e.g. -300 for ET, +330 for IST).
 * Wraps around midnight correctly.
 */
function minsToTime(mins: number | null, tzOffsetMinutes = 0): string {
  if (mins == null) return "—";
  const shifted = (((mins + tzOffsetMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(shifted / 60);
  const m = Math.round(shifted % 60);
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

function SlaBarTooltip({ active, payload, label, tzOffset = 0 }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const breached =
    d?.actual_end_minutes != null && d?.expected_sla_minutes != null && d.actual_end_minutes > d.expected_sla_minutes;

  // Data values are already shifted by tzOffset in chartDataWithDomain,
  // so we format with offset=0 here to avoid double-shifting.
  return (
    <div className="js-chart-tooltip">
      <div className="js-tooltip-label">{label}</div>
      {d?.expected_start_minutes != null && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)" }}>
          <span>Expected start:</span>
          <span>{minsToTime(d.expected_start_minutes, 0)}</span>
        </div>
      )}
      {d?.actual_start_minutes != null && (
        <div className="js-tooltip-row" style={{ color: COLOR_ACTUAL_OK }}>
          <span>Actual start:</span>
          <span>{minsToTime(d.actual_start_minutes, 0)}</span>
        </div>
      )}
      {d?.actual_end_minutes != null && (
        <div className="js-tooltip-row" style={{ color: breached ? COLOR_ACTUAL_BREACH : COLOR_ACTUAL_OK }}>
          <span>Actual end:</span>
          <span>{minsToTime(d.actual_end_minutes, 0)}</span>
        </div>
      )}
      {d?.expected_sla_minutes != null && (
        <div className="js-tooltip-row" style={{ color: COLOR_SLA_END_LINE }}>
          <span>SLA deadline:</span>
          <span>{minsToTime(d.expected_sla_minutes, 0)}</span>
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
  tzOffset: number;
  chartStyle: ChartStyle;
}

function SlaBarChart({ view, dowData, weeklyData, tzOffset, chartStyle }: SlaBarChartProps) {
  // Bind the offset into a stable tick formatter for the Y-axis
  // Y-axis always shows 12AM–12AM; the timezone shifts DATA positions instead
  const tickFormatter = (mins: number) => minsToTime(mins, 0);
  const showBars = chartStyle === "bar_line";
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
                actual_midpoint:
                  d.actual_start_minutes != null && d.actual_end_minutes != null
                    ? (d.actual_start_minutes + d.actual_end_minutes) / 2
                    : null,
                expected_midpoint:
                  d.expected_start_minutes != null && d.expected_sla_minutes != null
                    ? (d.expected_start_minutes + d.expected_sla_minutes) / 2
                    : null,
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
              actual_midpoint:
                d.actual_start_minutes != null && d.actual_end_minutes != null
                  ? (d.actual_start_minutes + d.actual_end_minutes) / 2
                  : null,
              expected_midpoint:
                d.expected_start_minutes != null && d.expected_sla_minutes != null
                  ? (d.expected_start_minutes + d.expected_sla_minutes) / 2
                  : null,
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

  // Y-axis always shows full 0–1440 (12:00 AM to 12:00 AM).
  // Timezone shifting moves the data, not the axis.
  const yDomain = Y_AXIS_DOMAIN;
  const yTicks = Y_AXIS_TICKS;

  // Stamp the active domain bounds into each payload row so JobWindowShape
  // can interpolate SLA line positions correctly when the domain is zoomed.
  // Also shift all minute-based values by tzOffset so the bars/lines physically
  // move on the fixed 0–1440 Y-axis when timezone changes.
  const shiftMins = (v: number | null | undefined) => (v != null ? (((v + tzOffset) % 1440) + 1440) % 1440 : v);

  const chartDataWithDomain = useMemo(
    () =>
      chartData.map((d) => {
        const shiftedBase = shiftMins(d.base) ?? 0;
        const shiftedActualStart = shiftMins(d.actual_start_minutes);
        const shiftedActualEnd = shiftMins(d.actual_end_minutes);
        const shiftedExpStart = shiftMins(d.expected_start_minutes);
        const shiftedExpSla = shiftMins(d.expected_sla_minutes);
        const shiftedActualMidpoint = shiftMins(d.actual_midpoint);
        const shiftedExpMidpoint = shiftMins(d.expected_midpoint);
        const shiftedRangeHeight =
          shiftedActualStart != null && shiftedActualEnd != null
            ? Math.max(0, shiftedActualEnd - shiftedActualStart)
            : d.range_height;

        return {
          ...d,
          base: shiftedBase,
          range_height: shiftedRangeHeight,
          actual_start_minutes: shiftedActualStart,
          actual_end_minutes: shiftedActualEnd,
          expected_start_minutes: shiftedExpStart,
          expected_sla_minutes: shiftedExpSla,
          actual_midpoint: shiftedActualMidpoint,
          expected_midpoint: shiftedExpMidpoint,
          yDomainMin: yDomain[0],
          yDomainMax: yDomain[1],
        };
      }),
    [chartData, yDomain, tzOffset],
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
      <ComposedChart
        data={chartDataWithDomain}
        margin={{ top: 12, right: 60, left: 8, bottom: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: AXIS_FONT_SIZE }} stroke={COLOR_AXIS} />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          tickFormatter={tickFormatter}
          tick={{ fontSize: AXIS_FONT_SIZE }}
          stroke={COLOR_AXIS}
          width={72}
        />
        <Tooltip content={<SlaBarTooltip tzOffset={tzOffset} />} cursor={{ fill: "rgba(0,0,0,0.06)" }} />
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
                flexWrap: "wrap",
              }}
            >
              {showBars && (
                <>
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
                </>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="20" height="4">
                  <line x1="0" x2="20" y1="2" y2="2" stroke={COLOR_LINE_ACTUAL} strokeWidth="2" />
                </svg>
                Actual (midpoint)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="20" height="4">
                  <line x1="0" x2="20" y1="2" y2="2" stroke={COLOR_LINE_EXPECTED} strokeWidth="2" />
                </svg>
                Expected SLA
              </span>
            </div>
          )}
        />
        {/* Bars — only when chartStyle includes bars */}
        {showBars && (
          <>
            <Bar dataKey="base" stackId="sla" fill="transparent" legendType="none" isAnimationActive={false} />
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
          </>
        )}
        {/* Line: actual midpoint (orange) */}
        <Line
          dataKey="actual_midpoint"
          name="Actual (midpoint)"
          type="linear"
          stroke={COLOR_LINE_ACTUAL}
          strokeWidth={2}
          dot={{ r: 3, fill: COLOR_LINE_ACTUAL }}
          connectNulls
          isAnimationActive={false}
          legendType="none"
        />
        {/* Line: expected SLA midpoint (purple) */}
        <Line
          dataKey="expected_midpoint"
          name="Expected SLA"
          type="linear"
          stroke={COLOR_LINE_EXPECTED}
          strokeWidth={2}
          dot={{ r: 3, fill: COLOR_LINE_EXPECTED }}
          connectNulls
          isAnimationActive={false}
          legendType="none"
        />
      </ComposedChart>
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
              = breached. The dashed lines per bar mark the SLA window — light green at the start, green at the
              deadline.
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
