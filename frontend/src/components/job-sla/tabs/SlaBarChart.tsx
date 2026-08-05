/**
 * SlaBarChart — ComposedChart (bars + lines) for SLA performance trend.
 *
 * All minute values come pre-computed from the backend (anchored to
 * expected_start_time's midnight). Frontend does NO computation —
 * just maps API response directly to Recharts data points.
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
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { WeeklySlaBars } from "../../../types/jobSla";
import type { SlaPolicy } from "../../../types/jobSla";
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
  minsToTime,
  type ChartView,
  type ChartStyle,
} from "./slaChartConstants";

// ── Timestamp → Minutes Conversion ────────────────────────────────────────────

/**
 * Convert an ISO timestamp to minutes-from-midnight-UTC of a reference date.
 * If the timestamp is on a different day than refDate, the result will be >1440.
 * Returns null if either input is null.
 */
function tsToMinutes(ts: string | null, refDate: string | null): number | null {
  if (!ts || !refDate) return null;
  const d = new Date(ts);
  // Reference = midnight UTC of the expected_start_ts day (or data_date + 1 day as fallback)
  const ref = new Date(refDate);
  const refMidnight = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  return (d.getTime() - refMidnight.getTime()) / 60000;
}

/** Get midnight reference from expected_start_ts (preferred) or data_date + 1 day */
function getRefDate(d: WeeklySlaBars): string | null {
  if (d.expected_start_ts) return d.expected_start_ts;
  // Fallback: data_date is the "processing date", run happens on data_date + 1
  return d.data_date ? `${d.data_date}T00:00:00Z` : null;
}

/** Get the Monday of the current week (ISO week starts Monday) */
function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

/** Map JS Date.getUTCDay() (0=Sun) to policy day_of_week string */
const DAY_INDEX_TO_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Common EST/EDT offsets — used to convert policy times to UTC minutes */
const TZ_OFFSETS_HOURS: Record<string, number> = {
  EST: -5,
  EDT: -4,
  CST: -6,
  CDT: -5,
  MST: -7,
  MDT: -6,
  PST: -8,
  PDT: -7,
  UTC: 0,
  GMT: 0,
  IST: 5.5,
  CET: 1,
  CEST: 2,
};

/** Convert policy time "HH:MM:SS" in a given timezone to UTC minutes-from-midnight */
function policyTimeToUtcMinutes(timeStr: string | null, timezone: string | null): number | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const localMins = h * 60 + m;
  const offset = TZ_OFFSETS_HOURS[timezone ?? "EST"] ?? -5;
  const utcMins = localMins - offset * 60;
  return ((utcMins % 1440) + 1440) % 1440;
}

function buildDowRows(weeklyData: WeeklySlaBars[], slaPolicies: SlaPolicy[]) {
  // Show all 7 days of the current week (Mon–Sun), filling from weeklyData
  const weekStart = getCurrentWeekMonday();
  const days: ReturnType<typeof buildWeeklyRows> = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const match = weeklyData.find((d) => d.data_date === dateStr);

    if (match) {
      const ref = getRefDate(match);
      const actStart = tsToMinutes(match.actual_start_ts, ref);
      const actEnd = tsToMinutes(match.actual_end_ts, ref);
      const expStart = tsToMinutes(match.expected_start_ts, ref);
      const expSla = tsToMinutes(match.expected_sla_ts, ref);
      days.push({
        label: new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        data_date: dateStr,
        base: actStart ?? expStart ?? 0,
        range_height: actStart != null && actEnd != null ? Math.max(0, actEnd - actStart) : 0,
        expected_start_minutes: expStart,
        actual_start_minutes: actStart,
        expected_sla_minutes: expSla,
        actual_end_minutes: actEnd,
        actual_midpoint: actStart != null && actEnd != null ? (actStart + actEnd) / 2 : null,
        expected_midpoint: expStart != null && expSla != null ? (expStart + expSla) / 2 : null,
        delay_duration_minutes: match.delay_duration_minutes,
        total_runs: 1,
        occurrence_count: null,
        breach_count: match.breach_count,
        actual_start_ts: match.actual_start_ts,
        actual_end_ts: match.actual_end_ts,
        expected_start_ts: match.expected_start_ts,
        expected_sla_ts: match.expected_sla_ts,
        isBreach: match.breach_count > 0,
      });
    } else {
      // No run data — derive SLA window from policies
      const dayName = DAY_INDEX_TO_NAME[date.getUTCDay()];
      const policy = slaPolicies.find((p) => p.day_of_week === dayName);
      const expStart = policy ? policyTimeToUtcMinutes(policy.expected_start_time, policy.timezone) : null;
      const expSla = policy ? policyTimeToUtcMinutes(policy.expected_sla_time, policy.timezone) : null;

      days.push({
        label: new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        data_date: dateStr,
        base: 0,
        range_height: 0,
        expected_start_minutes: expStart,
        actual_start_minutes: null,
        expected_sla_minutes: expSla,
        actual_end_minutes: null,
        actual_midpoint: null,
        expected_midpoint: expStart != null && expSla != null ? (expStart + expSla) / 2 : null,
        delay_duration_minutes: null,
        total_runs: 0,
        occurrence_count: null,
        breach_count: 0,
        actual_start_ts: null,
        actual_end_ts: null,
        expected_start_ts: null,
        expected_sla_ts: null,
        isBreach: false,
      });
    }
  }

  return days;
}

function buildWeeklyRows(weeklyData: WeeklySlaBars[]) {
  return weeklyData.map((d) => {
    const ref = getRefDate(d);
    const actStart = tsToMinutes(d.actual_start_ts, ref);
    const actEnd = tsToMinutes(d.actual_end_ts, ref);
    const expStart = tsToMinutes(d.expected_start_ts, ref);
    const expSla = tsToMinutes(d.expected_sla_ts, ref);
    return {
      label: new Date(d.data_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      data_date: d.data_date,
      base: actStart ?? expStart ?? 0,
      range_height: actStart != null && actEnd != null ? Math.max(0, actEnd - actStart) : 0,
      expected_start_minutes: expStart,
      actual_start_minutes: actStart,
      expected_sla_minutes: expSla,
      actual_end_minutes: actEnd,
      actual_midpoint: actStart != null && actEnd != null ? (actStart + actEnd) / 2 : null,
      expected_midpoint: expStart != null && expSla != null ? (expStart + expSla) / 2 : null,
      delay_duration_minutes: d.delay_duration_minutes,
      total_runs: 1,
      occurrence_count: null,
      breach_count: d.breach_count,
      actual_start_ts: d.actual_start_ts,
      actual_end_ts: d.actual_end_ts,
      expected_start_ts: d.expected_start_ts,
      expected_sla_ts: d.expected_sla_ts,
      isBreach: d.breach_count > 0,
    };
  });
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
  weeklyData: WeeklySlaBars[];
  slaPolicies: SlaPolicy[];
  tzOffset: number;
  chartStyle: ChartStyle;
}

export function SlaBarChart({ view, weeklyData, slaPolicies, tzOffset, chartStyle }: SlaBarChartProps) {
  const showBars = chartStyle === "bar_line";

  // Build chart rows — direct passthrough from API, no computation
  const chartData = useMemo(
    () => (view === "day_of_week" ? buildDowRows(weeklyData, slaPolicies) : buildWeeklyRows(weeklyData)),
    [view, weeklyData, slaPolicies],
  );

  // Shift data by timezone offset so bars/lines physically move on the fixed axis
  const chartDataShifted = useMemo(
    () =>
      chartData.map((d) => {
        const shift = (v: number | null) => (v != null ? v + tzOffset : null);
        const shiftedBase = shift(d.base as number) ?? 0;
        const shiftedActStart = shift(d.actual_start_minutes);
        const shiftedActEnd = shift(d.actual_end_minutes);
        const shiftedExpStart = shift(d.expected_start_minutes);
        const shiftedExpSla = shift(d.expected_sla_minutes);
        const shiftedActMid = shift(d.actual_midpoint);
        const shiftedExpMid = shift(d.expected_midpoint);
        const rangeHeight =
          shiftedActStart != null && shiftedActEnd != null
            ? Math.max(0, shiftedActEnd - shiftedActStart)
            : d.range_height;
        return {
          ...d,
          base: shiftedBase,
          range_height: rangeHeight,
          actual_start_minutes: shiftedActStart,
          actual_end_minutes: shiftedActEnd,
          expected_start_minutes: shiftedExpStart,
          expected_sla_minutes: shiftedExpSla,
          actual_midpoint: shiftedActMid,
          expected_midpoint: shiftedExpMid,
        };
      }),
    [chartData, tzOffset],
  );

  // Dynamic Y-axis: default 0–1440, extends only when data needs it
  // Max range: -360 (6hrs before midnight) to 4320 (2 full days after midnight)
  const Y_MIN_LIMIT = -480; // 8hrs before SOD
  const Y_MAX_LIMIT = 1440 + 2880; // 2 full days after SOD = 4320
  const TICK_STEP = 180; // 3-hour ticks

  const { yDomain, yTicks } = useMemo(() => {
    let minVal = 0;
    let maxVal = 1440;
    for (const d of chartDataShifted) {
      const vals = [
        d.base as number,
        (d.base as number) + (d.range_height as number),
        d.expected_start_minutes,
        d.expected_sla_minutes,
        d.actual_start_minutes,
        d.actual_end_minutes,
        d.actual_midpoint,
        d.expected_midpoint,
      ].filter((v): v is number => v != null);
      for (const v of vals) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    const lo = Math.max(Y_MIN_LIMIT, Math.floor((minVal - TICK_STEP) / TICK_STEP) * TICK_STEP);
    const hi = Math.min(Y_MAX_LIMIT, Math.ceil((maxVal + TICK_STEP) / TICK_STEP) * TICK_STEP);
    const ticks: number[] = [];
    for (let t = lo; t <= hi; t += TICK_STEP) ticks.push(t);
    return { yDomain: [lo, hi] as [number, number], yTicks: ticks };
  }, [chartDataShifted]);

  // Stamp yDomain into rows for JobWindowShape pixel calculations
  const chartDataFinal = useMemo(
    () => chartDataShifted.map((d) => ({ ...d, yDomainMin: yDomain[0], yDomainMax: yDomain[1] })),
    [chartDataShifted, yDomain],
  );

  // Y-axis tick formatter — shows time labels (wraps around midnight)
  const tickFormatter = (mins: number) => minsToTime(((mins % 1440) + 1440) % 1440, 0);

  if (!chartData.length) {
    return (
      <div className="js-chart-empty">
        No SLA data available — expected SLA times may not be configured for this job.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT_PX}>
      <ComposedChart data={chartDataFinal} margin={{ top: 12, right: 60, left: 8, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_GRID} vertical={false} />
        {/* Day boundary reference lines — only show when within visible range */}
        {yDomain[0] < 0 && (
          <ReferenceLine
            y={0}
            stroke="var(--text-muted)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: "SOD", position: "right", fontSize: 10, fill: "var(--text-muted)" }}
          />
        )}
        {yDomain[1] > 1440 && (
          <ReferenceLine
            y={1440}
            stroke="var(--text-muted)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: "EOD", position: "right", fontSize: 10, fill: "var(--text-muted)" }}
          />
        )}
        <XAxis dataKey="label" tick={{ fontSize: AXIS_FONT_SIZE }} stroke={COLOR_AXIS} />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          tickFormatter={tickFormatter}
          tick={{ fontSize: AXIS_FONT_SIZE }}
          stroke={COLOR_AXIS}
          width={72}
          allowDataOverflow
        />
        <Tooltip content={<SlaBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.06)" }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} content={() => <SlaChartLegend showBars={showBars} />} />

        {/* Bars */}
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
              {chartDataFinal.map((d, i) => (
                <Cell key={i} fill={d.isBreach ? COLOR_ACTUAL_BREACH : COLOR_ACTUAL_OK} />
              ))}
            </Bar>
          </>
        )}

        {/* Line: actual midpoint */}
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
        {/* Line: expected SLA midpoint */}
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
