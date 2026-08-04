/**
 * HeatmapTab — 90-day calendar view of job run status.
 *
 * Each cell is one calendar day coloured by aggregate outcome:
 *   Green  = all runs on-time
 *   Amber  = at least one run breached SLA
 *   Red    = at least one run failed
 *   Grey   = no data
 */

import { useMemo } from "react";
import { Spinner } from "../../ui";
import type { CalendarDay } from "../../../types/jobSla";

// ── Constants ─────────────────────────────────────────────────────────────────

const CAL_COLS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_COLOR: Record<string, string> = {
  on_time: "#22c55e",
  late: "#f59e0b",
  failed: "#ef4444",
  running: "#3b82f6",
  unknown: "var(--bg-glass-hover)",
};

const STATUS_LABEL: Record<string, string> = {
  on_time: "On-time",
  late: "Late",
  failed: "Failed",
  running: "Running",
  unknown: "No data",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMonFirstDow(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function fmtDateFull(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function buildWeeks(days: CalendarDay[]): (CalendarDay | null)[][] {
  if (!days.length) return [];

  const byDate: Record<string, CalendarDay> = {};
  days.forEach((d) => {
    byDate[d.data_date] = d;
  });

  const first = parseDate(days[0].data_date);
  const last = parseDate(days[days.length - 1].data_date);

  const startPad = toMonFirstDow(first.getDay());
  const cur = new Date(first);
  cur.setDate(cur.getDate() - startPad);

  const weeks: (CalendarDay | null)[][] = [];
  let week: (CalendarDay | null)[] = [];

  while (cur <= last || week.length > 0) {
    const iso = cur.toISOString().split("T")[0];
    week.push(byDate[iso] ?? null);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cur.setDate(cur.getDate() + 1);
    if (cur > last && week.length > 0 && week.length < 7) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
      break;
    }
  }

  return weeks;
}

function weekMonthLabel(week: (CalendarDay | null)[]): string | null {
  const first = week.find((d) => d !== null);
  if (!first) return null;
  const d = parseDate(first.data_date);
  if (d.getDate() <= 7) {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return null;
}

function buildTooltip(d: CalendarDay): string {
  const lines = [fmtDateFull(d.data_date), `Status: ${STATUS_LABEL[d.status] ?? d.status}`];
  if (d.total_runs > 0) {
    lines.push(
      `Runs: ${d.total_runs}  ·  On-time: ${d.on_time_count}  ·  Late: ${d.late_count}  ·  Failed: ${d.failed_count}`,
    );
  }
  if (d.max_overrun_minutes != null && d.max_overrun_minutes > 0) {
    lines.push(`Max overrun: ${d.max_overrun_minutes.toFixed(0)} min`);
  }
  return lines.join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────

interface HeatmapTabProps {
  calendarData: CalendarDay[];
  loading: boolean;
}

export function HeatmapTab({ calendarData, loading }: HeatmapTabProps) {
  const weeks = useMemo(() => buildWeeks(calendarData), [calendarData]);

  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label="Loading calendar..." />
      </div>
    );
  }

  if (calendarData.length === 0) {
    return <div className="js-tab-empty">No run data available for the last 90 days.</div>;
  }

  return (
    <div className="js-heatmap-tab">
      <div className="js-overview-section">
        <h3 className="js-section-title">90-Day Run Calendar</h3>
        <p className="js-section-help">
          Each cell is one calendar day. Green = all runs on-time · Amber = SLA breached · Red = failed · Grey = no
          data.
        </p>

        <div className="js-chart-container" style={{ overflowX: "auto" }}>
          {/* Legend */}
          <div className="js-cal-legend">
            {Object.entries(STATUS_LABEL).map(([status, label]) => (
              <span key={status} className="js-cal-legend-item">
                <span className="js-cal-legend-dot" style={{ background: STATUS_COLOR[status] }} />
                {label}
              </span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="js-cal-grid">
            <div className="js-cal-month-col" />
            {CAL_COLS.map((col) => (
              <div key={col} className="js-cal-col-header">
                {col}
              </div>
            ))}

            {weeks.map((week, wi) => {
              const monthLabel = weekMonthLabel(week);
              return (
                <div key={wi} className="js-cal-week-row">
                  <div className="js-cal-month-label">{monthLabel ?? ""}</div>
                  {week.map((day, di) => {
                    if (!day) {
                      return <div key={di} className="js-cal-cell js-cal-cell--empty" />;
                    }
                    return (
                      <div
                        key={di}
                        className="js-cal-cell"
                        style={{ background: STATUS_COLOR[day.status] ?? STATUS_COLOR.unknown }}
                        title={buildTooltip(day)}
                      >
                        <span className="js-cal-cell-date">{parseDate(day.data_date).getDate()}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
