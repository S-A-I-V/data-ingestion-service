import { FadeIn } from "../Motion";
import BarChartIcon from "@mui/icons-material/BarChart";

interface ExecStats {
  rows_inserted: number;
  rows_skipped: number;
  total_rows: number;
  columns_mapped: number;
  throughput_rps: number;
  file_size_bytes: number;
  data_size_bytes: number;
  compression_ratio: number;
  peak_memory_bytes: number;
  memory_delta_bytes: number;
  parse_time_ms: number;
  ingestion_time_ms: number;
  total_time_ms: number;
  error_rows: number;
  empty_cells: number;
  duplicate_count: number;
  validation_score: number;
  cpu_time_s: number;
}

export type { ExecStats };

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(2)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

function fmtTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export { fmtBytes, fmtTime };

export default function ExecStatsPanel({ stats }: { stats: ExecStats }) {
  return (
    <FadeIn>
      <div className="exec-stats-panel">
        <div className="panel-header">
          <BarChartIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> Execution Stats
        </div>
        <div className="stats-section-label">Ingestion Performance</div>
        <div className="exec-stats-grid">
          <div className="exec-stat-card accent">
            <span className="exec-stat-value">{stats.rows_inserted.toLocaleString()}</span>
            <span className="exec-stat-label">Rows Inserted</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{stats.throughput_rps.toLocaleString()}</span>
            <span className="exec-stat-label">Rows / sec</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{fmtBytes(stats.file_size_bytes)}</span>
            <span className="exec-stat-label">CSV File Size</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{fmtBytes(stats.data_size_bytes)}</span>
            <span className="exec-stat-label">Data Payload</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{stats.compression_ratio}x</span>
            <span className="exec-stat-label">CSV Overhead</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{fmtBytes(stats.peak_memory_bytes)}</span>
            <span className="exec-stat-label">Peak Memory</span>
          </div>
        </div>
        <div className="stats-section-label">Data Quality</div>
        <div className="exec-stats-grid">
          <div className={`exec-stat-card ${stats.validation_score === 100 ? "success" : "warn"}`}>
            <span className="exec-stat-value">{stats.validation_score}%</span>
            <span className="exec-stat-label">Validation Score</span>
          </div>
          <div className={`exec-stat-card ${stats.error_rows > 0 ? "danger" : ""}`}>
            <span className="exec-stat-value">{stats.error_rows}</span>
            <span className="exec-stat-label">Error Rows</span>
          </div>
          <div className={`exec-stat-card ${stats.duplicate_count > 0 ? "warn" : ""}`}>
            <span className="exec-stat-value">{stats.duplicate_count}</span>
            <span className="exec-stat-label">Duplicates</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{stats.empty_cells}</span>
            <span className="exec-stat-label">Empty Cells</span>
          </div>
        </div>
        <div className="stats-section-label">Timing &amp; Resources</div>
        <div className="exec-stats-grid">
          <div className="exec-stat-card">
            <span className="exec-stat-value">{fmtTime(stats.parse_time_ms)}</span>
            <span className="exec-stat-label">Parse Time</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{fmtTime(stats.ingestion_time_ms)}</span>
            <span className="exec-stat-label">Ingestion Time</span>
          </div>
          <div className="exec-stat-card accent">
            <span className="exec-stat-value">{fmtTime(stats.total_time_ms)}</span>
            <span className="exec-stat-label">Total Time</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{stats.cpu_time_s} s</span>
            <span className="exec-stat-label">CPU Time</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{stats.columns_mapped}</span>
            <span className="exec-stat-label">Columns Mapped</span>
          </div>
          <div className="exec-stat-card">
            <span className="exec-stat-value">{fmtBytes(Math.abs(stats.memory_delta_bytes))}</span>
            <span className="exec-stat-label">Memory Delta</span>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
