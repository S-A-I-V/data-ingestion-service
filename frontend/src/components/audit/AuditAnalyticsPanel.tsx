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
    <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="sidebar-card-title flex items-center justify-between">
          <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">
            <BarChartIcon sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} /> Analytics
          </h2>
        </div>
        <div className="sidebar-card-list" style={{ flex: 1, justifyContent: "space-evenly" }}>
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
            </>
          ) : (
            <div className="analytics-empty">No metrics yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, variant }: { label: string; value: string | number; variant?: string }) {
  return (
    <div className="flex w-full items-center justify-between px-2 py-1.5">
      <span className="font-sans text-[12px] font-normal text-neutral-500">{label}</span>
      <span
        className={`font-sans text-[12px] font-normal tabular-nums ${variant === "success" ? "text-green-700" : variant === "warn" ? "text-red-600" : "text-neutral-900"}`}
      >
        {value}
      </span>
    </div>
  );
}
