/**
 * HeatmapTab — 90-day calendar view of job run status.
 *
 * Each cell is one calendar day coloured by aggregate outcome:
 *   Green  = all runs on-time
 *   Amber  = at least one run breached SLA
 *   Red    = at least one run failed
 *   Grey   = no data
 */

import { useMemo, useState } from "react";
import { Spinner } from "../../ui";
import type { CalendarDay } from "../../../types/jobSla";

// ── Constants ─────────────────────────────────────────────────────────────────

const CAL_COLS = ["S", "M", "T", "W", "T", "F", "S"];

const STATUS_COLOR: Record<string, string> = {
  on_time: "#22c55e",
  late: "#f59e0b",
  failed: "#ef4444",
  running: "#3b82f6",
  unknown: "transparent",
};

const STATUS_LABEL: Record<string, string> = {
  on_time: "On-time",
  late: "Late",
  failed: "Failed",
  running: "Running",
  unknown: "No data",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthBlock {
  year: number;
  month: number;
  label: string;
  weeks: (CalendarDay | null | "pad")[][];
}

interface TooltipState {
  x: number;
  y: number;
  day: CalendarDay;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateFull(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildMonthBlocks(days: CalendarDay[]): MonthBlock[] {
  if (!days.length) return [];

  const byDate: Record<string, CalendarDay> = {};
  days.forEach((d) => {
    byDate[d.data_date] = d;
  });

  const firstDate = parseDate(days[0].data_date);
  const lastDate = parseDate(days[days.length - 1].data_date);

  const months: { year: number; month: number }[] = [];
  const cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  while (cur <= lastDate) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }

  return months.map(({ year, month }) => {
    const label = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startPad = firstOfMonth.getDay();
    const totalCells = startPad + lastOfMonth.getDate();
    const endPad = (7 - (totalCells % 7)) % 7;

    const cells: (CalendarDay | null | "pad")[] = [...Array(startPad).fill("pad")];

    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      const iso = isoFromDate(new Date(year, month, d));
      const date = new Date(year, month, d, 12);
      const inRange = date >= firstDate && date <= lastDate;
      cells.push(inRange ? byDate[iso] ?? null : "pad");
    }

    cells.push(...Array(endPad).fill("pad"));

    const weeks: (CalendarDay | null | "pad")[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return { year, month, label, weeks };
  });
}

// ── Floating tooltip ──────────────────────────────────────────────────────────

function CalTooltip({ tt }: { tt: TooltipState }) {
  const d = tt.day;
  const breached = d.status === "late" || d.status === "failed";
  return (
    <div className="js-job-tooltip" style={{ top: tt.y + 12, left: tt.x + 12, pointerEvents: "none", zIndex: 9999 }}>
      <div className="js-tooltip-name">{fmtDateFull(d.data_date)}</div>
      <div className="js-tooltip-desc">
        Status: <strong style={{ color: STATUS_COLOR[d.status] }}>{STATUS_LABEL[d.status]}</strong>
      </div>
      {d.total_runs > 0 && (
        <div className="js-tooltip-owner">
          Runs: {d.total_runs}&nbsp;·&nbsp; On-time: {d.on_time_count}&nbsp;·&nbsp; Late: {d.late_count}&nbsp;·&nbsp;
          Failed: {d.failed_count}
        </div>
      )}
      {breached && d.max_overrun_minutes != null && d.max_overrun_minutes > 0 && (
        <div className="js-tooltip-owner" style={{ color: "#f59e0b" }}>
          Delay: +{d.max_overrun_minutes.toFixed(0)} min past SLA
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface HeatmapTabProps {
  calendarData: CalendarDay[];
  loading: boolean;
}

export function HeatmapTab({ calendarData, loading }: HeatmapTabProps) {
  const monthBlocks = useMemo(() => buildMonthBlocks(calendarData), [calendarData]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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

        {/* Legend */}
        <div className="js-cal-legend">
          {Object.entries(STATUS_LABEL).map(([status, label]) => (
            <span key={status} className="js-cal-legend-item">
              <span
                className="js-cal-legend-dot"
                style={{
                  background: STATUS_COLOR[status],
                  border: status === "unknown" ? "1px dashed var(--border)" : "none",
                }}
              />
              {label}
            </span>
          ))}
        </div>

        {/* Month grid */}
        <div className="js-cal-months">
          {monthBlocks.map((block) => (
            <div key={`${block.year}-${block.month}`} className="js-cal-month-wrapper js-chart-container">
              <div className="js-cal-month">
                <div className="js-cal-month-title">{block.label}</div>

                {/* Day-of-week headers */}
                <div className="js-cal-dow-row">
                  {CAL_COLS.map((d, i) => (
                    <div key={i} className="js-cal-dow-label">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Weeks */}
                {block.weeks.map((week, wi) => (
                  <div key={wi} className="js-cal-month-week">
                    {week.map((cell, di) => {
                      if (cell === "pad") {
                        return <div key={di} className="js-cal-month-cell js-cal-month-cell--pad" />;
                      }
                      if (cell === null) {
                        return <div key={di} className="js-cal-month-cell js-cal-month-cell--empty" />;
                      }
                      const dayNum = parseDate(cell.data_date).getDate();
                      return (
                        <div
                          key={di}
                          className="js-cal-month-cell"
                          style={{
                            background: STATUS_COLOR[cell.status] ?? STATUS_COLOR.unknown,
                            border: "1px dashed rgba(0,0,0,0.15)",
                          }}
                          onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, day: cell })}
                          onMouseMove={(e) => setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null))}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="js-cal-month-date">{dayNum}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && <CalTooltip tt={tooltip} />}
    </div>
  );
}
