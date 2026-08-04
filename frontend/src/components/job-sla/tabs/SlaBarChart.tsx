/**
 * SlaBarChart — ComposedChart (bars + lines) for SLA performance trend.
 * Renders floating bars for job run windows with overlaid trend lines
 * for actual midpoint and expected SLA midpoint.
 */

import { useMemo } from "react";
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
import { DAY_OF_WEEK_LABELS } from "../../../constants/jobSla";
import type { DayOfWeekSlaBars, WeeklySlaBars } from "../../../types/jobSla";
import { JobWindowShape } from "./JobWindowShape";
import { SlaBarTooltip } from "./SlaBarTooltip";
import {
  COLOR_ACTUAL_OK,
  COLOR_ACTUAL_BREACH,
  COLOR_GRID,
  COLOR_AXIS,
  COLOR_SLA_START_LINE,
  COLOR_SLA_END_LINE,
  COLOR_LINE_ACTUAL,
  COLOR_LINE_EXPECTED,
  AXIS_FONT_SIZE,
  CHART_HEIGHT_PX,
  Y_AXIS_DOMAIN,
  Y_AXIS_TICKS,
  minsToTime,
  type ChartView,
  type ChartStyle,
} from "./slaChartConstants";

// ── Data Row Builder ──────────────────────────────────────────────────────────

function buildDowRows(dowData: DayOfWeekSlaBars[]) {
  const MON_FIRST = (dow: number) => (dow === 0 ? 7 : dow);
  return [...dowData]
    .sort((a, b) => MON_FIRST(a.day_of_week) - MON_FIRST(b.day_of_week))
    .map((d) => {
      const dayName = DAY_OF_WEEK_LABELS[d.day_of_week] ?? `Day ${d.day_of_week}`;
      const dateSuffix = d.most_recent_date
        ? new Date(d.most_recent_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null;
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
        isBreach:
          d.actual_end_minutes != null &&
          d.expected_sla_minutes != null &&
          d.actual_end_minutes > d.expected_sla_minutes,
      };
    });
}

function buildWeeklyRows(weeklyData: WeeklySlaBars[]) {
  return weeklyData.map((d) => ({
    label: new Date(d.data_date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    base: d.actual_start_minutes ?? d.expected_start_minutes ?? 0,
    range_height: Math.max(
      0,
      (d.actual_end_minutes ?? d.expected_sla_minutes ?? 0) - (d.actual_start_minutes ?? d.expected_start_minutes ?? 0),
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
    isBreach:
      d.actual_end_minutes != null && d.expected_sla_minutes != null && d.actual_end_minutes > d.expected_sla_minutes,
  }));
}

// ── Chart Legend ───────────────────────────────────────────────────────────────

function SlaChartLegend({ showBars }: { showBars: boolean }) {
  return (
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
              style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: COLOR_ACTUAL_OK }}
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
              <line x1="0" x2="20" y1="2" y2="2" stroke={COLOR_SLA_START_LINE} strokeWidth="3" strokeDasharray="5 2" />
            </svg>
            SLA start
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="20" height="4">
              <line x1="0" x2="20" y1="2" y2="2" stroke={COLOR_SLA_END_LINE} strokeWidth="3" strokeDasharray="5 2" />
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
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface SlaBarChartProps {
  view: ChartView;
  dowData: DayOfWeekSlaBars[];
  weeklyData: WeeklySlaBars[];
  tzOffset: number;
  chartStyle: ChartStyle;
}

export function SlaBarChart({ view, dowData, weeklyData, tzOffset, chartStyle }: SlaBarChartProps) {
  const tickFormatter = (mins: number) => minsToTime(mins, 0);
  const showBars = chartStyle === "bar_line";

  const chartData = useMemo(
    () => (view === "day_of_week" ? buildDowRows(dowData) : buildWeeklyRows(weeklyData)),
    [view, dowData, weeklyData],
  );

  // Shift all minute-based values by tzOffset so bars/lines physically
  // move on the fixed 0–1440 Y-axis when timezone changes.
  const shiftMins = (v: number | null | undefined) => (v != null ? (((v + tzOffset) % 1440) + 1440) % 1440 : v);

  const chartDataWithDomain = useMemo(
    () =>
      chartData.map((d) => {
        const shiftedActualStart = shiftMins(d.actual_start_minutes);
        const shiftedActualEnd = shiftMins(d.actual_end_minutes);
        return {
          ...d,
          base: shiftMins(d.base) ?? 0,
          range_height:
            shiftedActualStart != null && shiftedActualEnd != null
              ? Math.max(0, shiftedActualEnd - shiftedActualStart)
              : d.range_height,
          actual_start_minutes: shiftedActualStart,
          actual_end_minutes: shiftedActualEnd,
          expected_start_minutes: shiftMins(d.expected_start_minutes),
          expected_sla_minutes: shiftMins(d.expected_sla_minutes),
          actual_midpoint: shiftMins(d.actual_midpoint),
          expected_midpoint: shiftMins(d.expected_midpoint),
          yDomainMin: Y_AXIS_DOMAIN[0],
          yDomainMax: Y_AXIS_DOMAIN[1],
        };
      }),
    [chartData, tzOffset],
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
          domain={Y_AXIS_DOMAIN}
          ticks={Y_AXIS_TICKS}
          tickFormatter={tickFormatter}
          tick={{ fontSize: AXIS_FONT_SIZE }}
          stroke={COLOR_AXIS}
          width={72}
        />
        <Tooltip content={<SlaBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.06)" }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} content={() => <SlaChartLegend showBars={showBars} />} />

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
