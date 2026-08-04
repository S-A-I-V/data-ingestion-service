/**
 * Constants and helpers shared across SLA chart components.
 */

// ── Chart Colors ──────────────────────────────────────────────────────────────

/** Blue — actual run window, within SLA */
export const COLOR_ACTUAL_OK = "#3b82f6";
/** Amber — actual run window, exceeded SLA */
export const COLOR_ACTUAL_BREACH = "#f59e0b";
/** Grid line color */
export const COLOR_GRID = "var(--border)";
/** Axis text color */
export const COLOR_AXIS = "var(--text-secondary)";
/** Green — SLA start window line */
export const COLOR_SLA_START_LINE = "#4ade80";
/** Red — SLA deadline line */
export const COLOR_SLA_END_LINE = "#ef4444";
/** Orange — actual midpoint trend line */
export const COLOR_LINE_ACTUAL = "#f97316";
/** Purple — expected SLA midpoint trend line */
export const COLOR_LINE_EXPECTED = "#a855f7";

// ── Chart Dimensions ──────────────────────────────────────────────────────────

/** Font size for axis tick labels (px) */
export const AXIS_FONT_SIZE = 11;
/** Chart container height (px) */
export const CHART_HEIGHT_PX = 300;
/** Y-axis domain: full 24h (0 to 1440 minutes) */
export const Y_AXIS_DOMAIN: [number, number] = [0, 1440];
/** Y-axis ticks: every 3 hours */
export const Y_AXIS_TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];

// ── SLA Line Shape Constants ──────────────────────────────────────────────────

/** Stroke width for SLA start/deadline dashed lines (px) */
export const SLA_LINE_STROKE_WIDTH = 5;
/** Dash pattern for SLA lines */
export const SLA_LINE_DASH = "8 4";
/** Inset from bar edges so adjacent lines don't overlap (px) */
export const SLA_LINE_INSET_PX = 3;

// ── View Types ────────────────────────────────────────────────────────────────

/** View mode: day-of-week aggregation or per-day weekly */
export type ChartView = "day_of_week" | "weekly";

/** Chart style: bars + lines (default) or lines only */
export type ChartStyle = "bar_line" | "line_only";

export const CHART_VIEW_LABELS: Record<ChartView, string> = {
  day_of_week: "By Day of Week",
  weekly: "By Week",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert minutes-from-midnight to "H:MM AM/PM".
 * tzOffsetMinutes shifts the display (e.g. -300 for ET, +330 for IST).
 * Wraps around midnight correctly.
 */
export function minsToTime(mins: number | null, tzOffsetMinutes = 0): string {
  if (mins == null) return "—";
  const shifted = (((mins + tzOffsetMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(shifted / 60);
  const m = Math.round(shifted % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
