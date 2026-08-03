/**
 * HeatmapTab — Day-of-week × hour heatmap for job completion patterns.
 * Shows when jobs typically complete and highlights problem areas.
 */

import { useMemo, useState } from "react";
import { Spinner } from "../../ui";
import {
  DAY_OF_WEEK_LABELS,
  HOUR_LABELS,
  HEATMAP_COLOR_SCALE,
  HEATMAP_DELAY_COLOR_SCALE,
} from "../../../constants/jobSla";
import type { HeatmapCell, DurationBucket } from "../../../types/jobSla";

/** UI Labels */
const LABELS = {
  LOADING: "Loading heatmap...",
  NO_DATA:
    "No heatmap data available for this date range. This may occur if the job has no completed runs with recorded end times.",
  VIEW_MODE: "View Mode",
  RUN_COUNT: "Run Count",
  ON_TIME_RATE: "On-Time Rate",
  DELAY_COUNT: "Delays",
  AVG_DURATION: "Avg Duration",
  DURATION_DIST: "Duration Distribution",
  LEGEND_LOW: "Low",
  LEGEND_HIGH: "High",
  AXIS_HOUR: "Hour of Day (UTC)",
  AXIS_DAY: "Day",
  HEATMAP_HELP:
    "Shows job completion patterns by day of week and hour. Darker cells indicate higher values. Hover for details.",
  DURATION_HELP: "Distribution of job run durations in the selected date range",
} as const;

/** View mode options */
type ViewMode = "run_count" | "on_time_rate" | "delay_count" | "avg_duration";

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "run_count", label: LABELS.RUN_COUNT },
  { value: "on_time_rate", label: LABELS.ON_TIME_RATE },
  { value: "delay_count", label: LABELS.DELAY_COUNT },
  { value: "avg_duration", label: LABELS.AVG_DURATION },
];

interface HeatmapTabProps {
  cells: HeatmapCell[];
  durationBuckets: DurationBucket[];
  loading: boolean;
}

/** Get value from cell based on view mode */
function getCellValue(cell: HeatmapCell, mode: ViewMode): number {
  switch (mode) {
    case "run_count":
      return cell.run_count;
    case "on_time_rate":
      return cell.run_count > 0 ? (cell.on_time_count / cell.run_count) * 100 : 0;
    case "delay_count":
      return cell.delayed_count;
    case "avg_duration":
      return cell.avg_duration_minutes ?? 0;
    default:
      return 0;
  }
}

/** Get color for cell based on value and mode */
function getCellColor(value: number, maxValue: number, mode: ViewMode): string {
  if (maxValue === 0) return HEATMAP_COLOR_SCALE[0];

  const ratio = Math.min(value / maxValue, 1);
  const scale = mode === "delay_count" ? HEATMAP_DELAY_COLOR_SCALE : HEATMAP_COLOR_SCALE;
  const index = Math.floor(ratio * (scale.length - 1));

  return scale[index];
}

/** Format cell value for display */
function formatCellValue(value: number, mode: ViewMode): string {
  if (value === 0) return "—";
  switch (mode) {
    case "on_time_rate":
      return `${value.toFixed(0)}%`;
    case "avg_duration":
      return `${value.toFixed(0)}m`;
    default:
      return value.toString();
  }
}

export function HeatmapTab({ cells, durationBuckets, loading }: HeatmapTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("run_count");

  // Build heatmap grid (7 days × 24 hours)
  const { grid, maxValue } = useMemo(() => {
    const gridData: (HeatmapCell | null)[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => null));

    let max = 0;
    cells.forEach((cell) => {
      const dayIndex = cell.day_of_week; // 0=Sunday
      const hourIndex = cell.hour_of_day;
      if (dayIndex >= 0 && dayIndex < 7 && hourIndex >= 0 && hourIndex < 24) {
        gridData[dayIndex][hourIndex] = cell;
        const val = getCellValue(cell, viewMode);
        if (val > max) max = val;
      }
    });

    return { grid: gridData, maxValue: max };
  }, [cells, viewMode]);

  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label={LABELS.LOADING} />
      </div>
    );
  }

  if (cells.length === 0) {
    return <div className="js-tab-empty">{LABELS.NO_DATA}</div>;
  }

  return (
    <div className="js-heatmap-tab">
      {/* View mode selector */}
      <div className="js-heatmap-controls">
        <label className="js-control-label">{LABELS.VIEW_MODE}</label>
        <div className="js-view-mode-buttons">
          {VIEW_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`js-view-mode-btn ${viewMode === opt.value ? "js-view-mode-btn--active" : ""}`}
              onClick={() => setViewMode(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="js-section-help">{LABELS.HEATMAP_HELP}</p>

      {/* Heatmap grid */}
      <div className="js-heatmap-container">
        {/* X-axis title */}
        <div className="js-heatmap-axis-title js-heatmap-axis-title--x">{LABELS.AXIS_HOUR}</div>

        <div className="js-heatmap-grid-wrapper">
          {/* Y-axis title */}
          <div className="js-heatmap-axis-title js-heatmap-axis-title--y">{LABELS.AXIS_DAY}</div>

          <div className="js-heatmap-grid">
            {/* Hour labels (top) */}
            <div className="js-heatmap-row js-heatmap-header">
              <div className="js-heatmap-day-label" />
              {HOUR_LABELS.map((hour) => (
                <div key={hour} className="js-heatmap-hour-label">
                  {hour}
                </div>
              ))}
            </div>

            {/* Grid rows (one per day) */}
            {DAY_OF_WEEK_LABELS.map((dayLabel, dayIndex) => (
              <div key={dayLabel} className="js-heatmap-row">
                <div className="js-heatmap-day-label">{dayLabel}</div>
                {HOUR_LABELS.map((_, hourIndex) => {
                  const cell = grid[dayIndex][hourIndex];
                  const value = cell ? getCellValue(cell, viewMode) : 0;
                  const color = getCellColor(value, maxValue, viewMode);

                  return (
                    <div
                      key={hourIndex}
                      className="js-heatmap-cell"
                      style={{ backgroundColor: color }}
                      title={cell ? buildTooltip(cell, viewMode) : "No data"}
                    >
                      {cell && value > 0 && (
                        <span className="js-heatmap-cell-value">{formatCellValue(value, viewMode)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="js-heatmap-legend">
          <span className="js-legend-label">{LABELS.LEGEND_LOW}</span>
          <div className="js-legend-gradient">
            {(viewMode === "delay_count" ? HEATMAP_DELAY_COLOR_SCALE : HEATMAP_COLOR_SCALE).map((color, i) => (
              <div key={i} className="js-legend-stop" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="js-legend-label">{LABELS.LEGEND_HIGH}</span>
        </div>
      </div>

      {/* Duration distribution histogram */}
      {durationBuckets.length > 0 && (
        <div className="js-duration-dist">
          <h4 className="js-section-title">{LABELS.DURATION_DIST}</h4>
          <p className="js-section-help">{LABELS.DURATION_HELP}</p>
          <DurationHistogram buckets={durationBuckets} />
        </div>
      )}
    </div>
  );
}

/** Build tooltip text for heatmap cell */
function buildTooltip(cell: HeatmapCell, mode: ViewMode): string {
  const day = DAY_OF_WEEK_LABELS[cell.day_of_week];
  const hour = HOUR_LABELS[cell.hour_of_day];
  const lines = [
    `${day} ${hour}:00`,
    `Runs: ${cell.run_count}`,
    `On-time: ${cell.on_time_count}`,
    `Late: ${cell.late_count}`,
    `Delayed: ${cell.delayed_count}`,
    `Failed: ${cell.failed_count}`,
  ];
  if (cell.avg_duration_minutes) {
    lines.push(`Avg duration: ${cell.avg_duration_minutes.toFixed(1)}m`);
  }
  return lines.join("\n");
}

/** Duration histogram sub-component */
function DurationHistogram({ buckets }: { buckets: DurationBucket[] }) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="js-histogram">
      {buckets.map((bucket, i) => {
        const heightPercent = (bucket.count / maxCount) * 100;
        return (
          <div key={i} className="js-histogram-bar-container">
            <div
              className="js-histogram-bar"
              style={{ height: `${heightPercent}%` }}
              title={`${bucket.bucket_start}m: ${bucket.count} runs`}
            />
            <div className="js-histogram-label">{bucket.bucket_start}m</div>
          </div>
        );
      })}
    </div>
  );
}
