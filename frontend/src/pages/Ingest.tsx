import { useState, useEffect, useRef } from "react";
import api from "../api";
import { PageTransition, FadeIn, ScaleIn, motion } from "../components/Motion";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import BarChartIcon from "@mui/icons-material/BarChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import type { Connection, ColInfo } from "../types";

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

export default function Ingest() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [connId, setConnId] = useState<number | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [table, setTable] = useState("");
  const [dbCols, setDbCols] = useState<ColInfo[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [csvFileSize, setCsvFileSize] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [operation, setOperation] = useState("INSERT");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [execStats, setExecStats] = useState<ExecStats | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/connections").then((r) => setConns(r.data));
  }, []);
  useEffect(() => {
    if (connId) api.get(`/connections/${connId}/tables`).then((r) => setTables(r.data));
  }, [connId]);
  useEffect(() => {
    if (connId && table)
      api.get(`/connections/${connId}/tables/${table}/columns`).then((r) => setDbCols(r.data));
  }, [connId, table]);
  useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(null), 8000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleFile = async (f: File) => {
    setFile(f);
    setExecStats(null);
    const fd = new FormData();
    fd.append("file", f);
    const r = await api.post("/ingestion/preview", fd);
    setCsvHeaders(r.data.headers);
    setCsvPreview(r.data.preview);
    setCsvTotalRows(r.data.total_rows);
    setCsvFileSize(r.data.file_size_bytes);
    const autoMap: Record<string, string> = {};
    for (const h of r.data.headers) {
      const match = dbCols.find((c) => c.name.toLowerCase() === h.toLowerCase());
      if (match) autoMap[h] = match.name;
    }
    setMapping(autoMap);
  };

  const analyze = async () => {
    if (!connId) return;
    setAiLoading(true);
    const conn = conns.find((c) => c.id === connId);
    const r = await api.post("/ai/analyze", {
      operation,
      table_name: table,
      columns: Object.values(mapping),
      row_count: csvPreview.length,
      db_type: conn?.db_type || "postgres",
      sample_data: csvPreview.slice(0, 3),
    });
    setAiResult(r.data.analysis);
    setAiLoading(false);
  };

  const execute = async () => {
    if (!file || !connId) return;
    setLoading(true);
    setStatus(null);
    setExecStats(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("connection_id", String(connId));
    fd.append("table_name", table);
    fd.append("column_mapping", JSON.stringify(mapping));
    fd.append("operation", operation);
    try {
      const r = await api.post("/ingestion/execute", fd);
      const d = r.data as ExecStats;
      setExecStats(d);
      const msg = d.rows_skipped
        ? `Inserted ${d.rows_inserted} rows (${d.rows_skipped} duplicates skipped)`
        : `Inserted ${d.rows_inserted} rows`;
      setStatus({ ok: true, msg });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.response?.data?.detail || "Failed" });
    }
    setLoading(false);
  };

  const mappedCount = Object.values(mapping).filter((v) => v).length;
  const isLocked = loading;

  return (
    <PageTransition>
      <div className={`container ${isLocked ? "ingest-locked" : ""}`}>
        <FadeIn>
          <div className="toolbar">
            <span className="toolbar-title">Data Transfer</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <fieldset disabled={isLocked} className="panel-fieldset">
            <div className="panel">
              <div className="panel-header">
                <span className="step-num">1</span> Select Target
              </div>
              <div className="panel-body">
                <div className="form-row">
                  <label>Connection:</label>
                  <select
                    title="Connection"
                    value={connId || ""}
                    onChange={(e) => {
                      setConnId(+e.target.value);
                      setTable("");
                      setDbCols([]);
                      setCsvHeaders([]);
                      setFile(null);
                      setMapping({});
                      setExecStats(null);
                    }}
                  >
                    <option value="">Choose a connection...</option>
                    {conns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.db_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Table:</label>
                  <select
                    title="Table"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    disabled={!connId}
                  >
                    <option value="">Choose a table...</option>
                    {tables.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Operation:</label>
                  <select
                    title="Operation"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                  >
                    <option value="INSERT">INSERT</option>
                    <option value="INSERT_SKIP">INSERT (Skip Duplicates)</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="UPSERT">UPSERT</option>
                  </select>
                </div>
              </div>
            </div>
          </fieldset>
        </FadeIn>

        {table && (
          <ScaleIn>
            <fieldset disabled={isLocked} className="panel-fieldset">
              <div className="panel">
                <div className="panel-header">
                  <span className="step-num">2</span> Upload CSV
                </div>
                <div className="panel-body">
                  <motion.div
                    className="file-drop"
                    onClick={() => !isLocked && fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!isLocked && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                    }}
                    whileHover={isLocked ? {} : { scale: 1.01, borderColor: "var(--accent)" }}
                    whileTap={isLocked ? {} : { scale: 0.99 }}
                  >
                    <span className="drop-icon">{file ? <InsertDriveFileIcon sx={{ fontSize: 32 }} /> : <CloudUploadIcon sx={{ fontSize: 32 }} />}</span>
                    {file ? file.name : "Drop your CSV file here, or click to browse"}
                    <span className="drop-hint">
                      {file ? `${csvTotalRows.toLocaleString()} rows · ${fmtBytes(csvFileSize)}` : ".csv files"}
                    </span>
                  </motion.div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    }}
                  />
                </div>
              </div>
            </fieldset>
          </ScaleIn>
        )}

        {/* ── Pre-execution: File Stats ── */}
        {file && csvTotalRows > 0 && (
          <FadeIn delay={0.05}>
            <div className="exec-stats-panel pre-stats">
              <div className="panel-header"><FolderOpenIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> File Overview</div>
              <div className="exec-stats-grid">
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{csvTotalRows.toLocaleString()}</span>
                  <span className="exec-stat-label">Total Rows</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{csvHeaders.length}</span>
                  <span className="exec-stat-label">Columns</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{fmtBytes(csvFileSize)}</span>
                  <span className="exec-stat-label">File Size</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{mappedCount}/{csvHeaders.length}</span>
                  <span className="exec-stat-label">Mapped</span>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        {csvHeaders.length > 0 && dbCols.length > 0 && (
          <FadeIn>
            <fieldset disabled={isLocked} className="panel-fieldset">
              <div className="panel">
                <div className="panel-header">
                  <span className="step-num">3</span> Column Mapping
                  <span className="badge badge-info mapper-badge">
                    {mappedCount}/{csvHeaders.length} mapped
                  </span>
                </div>
                <div className="panel-body">
                  <div className="mapper-header">
                    <span className="mapper-col-label">CSV Column</span>
                    <span className="mapper-arrow-spacer" />
                    <span className="mapper-col-label">Database Column</span>
                  </div>
                  {csvHeaders.map((h, i) => (
                    <motion.div
                      className="mapper-row"
                      key={h}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <span className="mapper-csv-name">{h}</span>
                      <span className="mapper-arrow">→</span>
                      <select
                        title={`Map ${h}`}
                        className="mapper-select"
                        value={mapping[h] || ""}
                        onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                      >
                        <option value="">(skip)</option>
                        {dbCols.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name} ({c.type})
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  ))}
                </div>
              </div>
            </fieldset>
          </FadeIn>
        )}

        {mappedCount > 0 && (
          <FadeIn>
            <fieldset disabled={isLocked} className="panel-fieldset">
              <div className="ai-panel">
                <div className="ai-panel-header"><AutoFixHighIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> AI Query Analysis</div>
                <motion.button
                  type="button"
                  className="btn btn-sm"
                  onClick={analyze}
                  disabled={aiLoading || isLocked}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {aiLoading ? "Analyzing..." : "Analyze before executing"}
                </motion.button>
                {aiResult && (
                  <motion.div
                    className="ai-result"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    {aiResult}
                  </motion.div>
                )}
              </div>
            </fieldset>
          </FadeIn>
        )}

        {mappedCount > 0 && (
          <FadeIn>
            <div className="exec-action-bar">
              <motion.button
                type="button"
                className="btn btn-primary"
                onClick={execute}
                disabled={isLocked}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {loading ? (
                  <span className="exec-spinner-wrap">
                    <span className="exec-spinner" /> Executing...
                  </span>
                ) : (
                  <><PlayArrowIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> Execute {operation}</>
                )}
              </motion.button>
              {status && (
                <motion.span
                  className={`badge ${status.ok ? "badge-success" : "badge-failed"}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {status.msg}
                </motion.span>
              )}
            </div>
          </FadeIn>
        )}

        {/* ── Post-execution Stats Dashboard ── */}
        {execStats && (
          <FadeIn>
            <div className="exec-stats-panel">
              <div className="panel-header"><BarChartIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> Execution Stats</div>

              {/* Ingestion Performance */}
              <div className="stats-section-label">Ingestion Performance</div>
              <div className="exec-stats-grid">
                <div className="exec-stat-card accent">
                  <span className="exec-stat-value">{execStats.rows_inserted.toLocaleString()}</span>
                  <span className="exec-stat-label">Rows Inserted</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{execStats.throughput_rps.toLocaleString()}</span>
                  <span className="exec-stat-label">Rows / sec</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{fmtBytes(execStats.file_size_bytes)}</span>
                  <span className="exec-stat-label">CSV File Size</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{fmtBytes(execStats.data_size_bytes)}</span>
                  <span className="exec-stat-label">Data Payload</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{execStats.compression_ratio}x</span>
                  <span className="exec-stat-label">CSV Overhead</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{fmtBytes(execStats.peak_memory_bytes)}</span>
                  <span className="exec-stat-label">Peak Memory</span>
                </div>
              </div>

              {/* Data Quality */}
              <div className="stats-section-label">Data Quality</div>
              <div className="exec-stats-grid">
                <div className={`exec-stat-card ${execStats.validation_score === 100 ? "success" : "warn"}`}>
                  <span className="exec-stat-value">{execStats.validation_score}%</span>
                  <span className="exec-stat-label">Validation Score</span>
                </div>
                <div className={`exec-stat-card ${execStats.error_rows > 0 ? "danger" : ""}`}>
                  <span className="exec-stat-value">{execStats.error_rows}</span>
                  <span className="exec-stat-label">Error Rows</span>
                </div>
                <div className={`exec-stat-card ${execStats.duplicate_count > 0 ? "warn" : ""}`}>
                  <span className="exec-stat-value">{execStats.duplicate_count}</span>
                  <span className="exec-stat-label">Duplicates</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{execStats.empty_cells}</span>
                  <span className="exec-stat-label">Empty Cells</span>
                </div>
              </div>

              {/* Timing & Resources */}
              <div className="stats-section-label">Timing &amp; Resources</div>
              <div className="exec-stats-grid">
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{fmtTime(execStats.parse_time_ms)}</span>
                  <span className="exec-stat-label">Parse Time</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{fmtTime(execStats.ingestion_time_ms)}</span>
                  <span className="exec-stat-label">Ingestion Time</span>
                </div>
                <div className="exec-stat-card accent">
                  <span className="exec-stat-value">{fmtTime(execStats.total_time_ms)}</span>
                  <span className="exec-stat-label">Total Time</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{execStats.cpu_time_s} s</span>
                  <span className="exec-stat-label">CPU Time</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{execStats.columns_mapped}</span>
                  <span className="exec-stat-label">Columns Mapped</span>
                </div>
                <div className="exec-stat-card">
                  <span className="exec-stat-value">{fmtBytes(Math.abs(execStats.memory_delta_bytes))}</span>
                  <span className="exec-stat-label">Memory Delta</span>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        {csvPreview.length > 0 && (
          <FadeIn delay={0.15}>
            <div className="panel csv-preview-panel">
              <div className="panel-header"><TableChartIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> CSV Preview</div>
              <div className="csv-preview-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {csvHeaders.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        {csvHeaders.map((h) => (
                          <td key={h}>{row[h]}</td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
