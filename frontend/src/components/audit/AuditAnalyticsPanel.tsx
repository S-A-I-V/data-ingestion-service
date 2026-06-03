import BarChartIcon from "@mui/icons-material/BarChart";
import type { AuditMetrics } from "../../types";

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

function fmtTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface Props {
  metrics: AuditMetrics | null;
}

export default function AuditAnalyticsPanel({ metrics }: Props) {
  return (
    <aside className="audit-analytics-panel">
      <div className="panel">
        <div className="panel-header">
          <BarChartIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> Analytics
        </div>
        <div className="audit-analytics-body">
          {metrics ? (
            <>
              <Stat label="Operations" value={metrics.total_operations} />
              <Stat label="Success Rate" value={`${metrics.success_rate}%`} variant="success" />
              <Stat label="Rows Inserted" value={metrics.total_rows_inserted.toLocaleString()} />
              <Stat label="Data Ingested" value={fmtBytes(metrics.total_data_ingested_bytes)} />
              <Stat label="Avg Rows/sec" value={metrics.avg_throughput_rps} />
              <Stat label="Avg Duration" value={fmtTime(metrics.avg_duration_ms)} />
              <Stat label="Avg Quality" value={`${metrics.avg_validation_score}%`} />
              <Stat label="Error Rows" value={metrics.total_error_rows} variant="warn" />
              <Stat label="Duplicates" value={metrics.total_duplicates} />
              <Stat label="Peak Memory" value={fmtBytes(metrics.peak_memory_bytes)} />
              <Stat label="Total CPU" value={`${metrics.total_cpu_time_s}s`} />
              <Stat label="Failed Ops" value={metrics.failed} variant="warn" />
            </>
          ) : (
            <div className="analytics-empty">No metrics yet</div>
          )}
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value, variant }: { label: string; value: string | number; variant?: string }) {
  return (
    <div className={`analytics-stat${variant ? ` ${variant}` : ""}`}>
      <span className="analytics-stat-label">{label}</span>
      <span className="analytics-stat-value">{value}</span>
    </div>
  );
}
