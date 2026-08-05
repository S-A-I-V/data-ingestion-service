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
      {/* Actual start — always shown; "Not received" when null */}
      <div
        className="js-tooltip-row"
        style={{ color: d?.actual_start_minutes != null ? COLOR_ACTUAL_OK : "var(--text-muted)" }}
      >
        <span>Actual start:</span>
        <span>{d?.actual_start_minutes != null ? minsToTime(d.actual_start_minutes, 0) : "Not received"}</span>
      </div>
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
      {d?.actual_end_minutes != null &&
        d?.expected_sla_minutes != null &&
        d.actual_end_minutes > d.expected_sla_minutes && (
          <div className="js-tooltip-row" style={{ color: COLOR_ACTUAL_BREACH }}>
            <span>Delay:</span>
            <span>+{(d.actual_end_minutes - d.expected_sla_minutes).toFixed(0)} min</span>
          </div>
        )}
      {d?.occurrence_count != null && d.occurrence_count > 1 && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)" }}>
          <span>Occurrences:</span>
          <span>{d.occurrence_count}</span>
        </div>
      )}
    </div>
  );
}
