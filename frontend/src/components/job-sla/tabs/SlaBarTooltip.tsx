/**
 * SlaBarTooltip — Custom Recharts tooltip for the SLA performance chart.
 * Shows expected/actual start/end times, delay, on-time rate, and run count.
 */

import { minsToTime, COLOR_ACTUAL_OK, COLOR_ACTUAL_BREACH, COLOR_SLA_END_LINE } from "./slaChartConstants";

export function SlaBarTooltip({ active, payload, label }: any) {
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
