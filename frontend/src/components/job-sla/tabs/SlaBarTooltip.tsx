/**
 * SlaBarTooltip — Custom Recharts tooltip for the SLA performance chart.
 * Shows timestamps with full dates (from raw timestamps when available).
 */

import { minsToTime, COLOR_ACTUAL_OK, COLOR_ACTUAL_BREACH, COLOR_SLA_END_LINE } from "./slaChartConstants";

/** Format an ISO timestamp to "Jul 8, 4:30 PM UTC" */
function fmtTs(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

/** Format minutes-from-midnight as time with optional "+1d" */
function fmtMinsWithDay(mins: number, startMins: number | null): string {
  const time = minsToTime(mins % 1440, 0);
  if (mins >= 1440 || (startMins != null && mins < startMins)) return `${time} (+1d)`;
  return time;
}

export function SlaBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const breached =
    d?.actual_end_minutes != null && d?.expected_sla_minutes != null && d.actual_end_minutes > d.expected_sla_minutes;

  const expStart = d?.expected_start_minutes;
  const actStart = d?.actual_start_minutes;

  // Use full timestamps when available (weekly view with _ts fields),
  // otherwise fall back to minutes-from-midnight display
  const expStartDisplay = fmtTs(d?.expected_start_ts) ?? (expStart != null ? fmtMinsWithDay(expStart, null) : null);
  const actStartDisplay = fmtTs(d?.actual_start_ts) ?? (actStart != null ? fmtMinsWithDay(actStart, null) : null);
  const actEndDisplay =
    fmtTs(d?.actual_end_ts) ?? (d?.actual_end_minutes != null ? fmtMinsWithDay(d.actual_end_minutes, actStart) : null);
  const expSlaDisplay =
    fmtTs(d?.expected_sla_ts) ??
    (d?.expected_sla_minutes != null ? fmtMinsWithDay(d.expected_sla_minutes, expStart) : null);

  return (
    <div className="js-chart-tooltip">
      <div className="js-tooltip-label">{label}</div>
      {d?.data_date && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)", fontSize: 10 }}>
          <span>Data date:</span>
          <span>{d.data_date}</span>
        </div>
      )}
      {expStartDisplay && (
        <div className="js-tooltip-row" style={{ color: "var(--text-muted)" }}>
          <span>Expected start:</span>
          <span>{expStartDisplay}</span>
        </div>
      )}
      {/* Actual start — always shown; "Not received" when null */}
      <div className="js-tooltip-row" style={{ color: actStartDisplay ? COLOR_ACTUAL_OK : "var(--text-muted)" }}>
        <span>Actual start:</span>
        <span>{actStartDisplay ?? "Not received"}</span>
      </div>
      {actEndDisplay && (
        <div className="js-tooltip-row" style={{ color: breached ? COLOR_ACTUAL_BREACH : COLOR_ACTUAL_OK }}>
          <span>Actual end:</span>
          <span>{actEndDisplay}</span>
        </div>
      )}
      {expSlaDisplay && (
        <div className="js-tooltip-row" style={{ color: COLOR_SLA_END_LINE }}>
          <span>SLA deadline:</span>
          <span>{expSlaDisplay}</span>
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
