/**
 * Ingest — Data transfer page for uploading CSV data into database tables.
 *
 * Steps:
 *   1. Select target (connection + table + operation)
 *   2. Upload CSV file
 *   3. Map CSV columns to database columns
 *   4. (Optional) AI analysis
 *   5. Execute the transfer
 */
import { useState, useEffect, useRef } from "react";
import api from "../api";
import ExecStatsPanel, { fmtBytes, type ExecStats } from "../components/ingest/ExecStatsPanel";
import CsvPreview from "../components/ingest/CsvPreview";
import TargetSelector from "../components/ingest/TargetSelector";
import FileUploader from "../components/ingest/FileUploader";
import ColumnMapper from "../components/ingest/ColumnMapper";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import { Button } from "../components/ui";
import { STATUS_AUTO_DISMISS_MS, INGESTION_OPERATIONS, AI_SAMPLE_ROW_COUNT } from "../constants/ingest";
import type { Connection, ColInfo } from "../types";

export default function Ingest() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [connsLoading, setConnsLoading] = useState(true);
  const [connId, setConnId] = useState<number | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [table, setTable] = useState("");
  const [dbCols, setDbCols] = useState<ColInfo[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [csvFileSize, setCsvFileSize] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [operation, setOperation] = useState<string>(INGESTION_OPERATIONS.INSERT);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [execStats, setExecStats] = useState<ExecStats | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get("/connections")
      .then((r) => setConns(r.data))
      .catch(() => {})
      .finally(() => setConnsLoading(false));
  }, []);

  useEffect(() => {
    if (!connId) {
      setTables([]);
      setTablesLoading(false);
      return;
    }
    const abortCtrl = new AbortController();
    setTablesLoading(true);
    setTables([]);
    setTable("");
    setDbCols([]);
    api
      .get(`/connections/${connId}/tables`, { signal: abortCtrl.signal })
      .then((r) => {
        if (!abortCtrl.signal.aborted) setTables(r.data);
      })
      .catch(() => {
        if (!abortCtrl.signal.aborted) setStatus({ ok: false, msg: "Failed to load tables" });
      })
      .finally(() => {
        if (!abortCtrl.signal.aborted) setTablesLoading(false);
      });
    return () => abortCtrl.abort();
  }, [connId]);

  useEffect(() => {
    if (!connId || !table) {
      setDbCols([]);
      return;
    }
    const abortCtrl = new AbortController();
    api
      .get(`/connections/${connId}/tables/${table}/columns`, { signal: abortCtrl.signal })
      .then((r) => {
        if (!abortCtrl.signal.aborted) setDbCols(r.data);
      })
      .catch(() => {
        if (!abortCtrl.signal.aborted) setDbCols([]);
      });
    return () => abortCtrl.abort();
  }, [connId, table]);

  useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(null), STATUS_AUTO_DISMISS_MS);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleFile = async (f: File) => {
    setFile(f);
    setExecStats(null);
    try {
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
    } catch {
      setStatus({ ok: false, msg: "Failed to parse CSV file" });
    }
  };

  const clearAll = () => {
    setConnId(null);
    setTables([]);
    setTable("");
    setDbCols([]);
    setCsvHeaders([]);
    setCsvPreview([]);
    setCsvTotalRows(0);
    setCsvFileSize(0);
    setMapping({});
    setFile(null);
    setOperation(INGESTION_OPERATIONS.INSERT);
    setAiResult(null);
    setStatus(null);
    setExecStats(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const analyze = async () => {
    if (!connId) return;
    setAiLoading(true);
    try {
      const conn = conns.find((c) => c.id === connId);
      const r = await api.post("/ai/analyze", {
        operation,
        table_name: table,
        columns: Object.values(mapping),
        row_count: csvPreview.length,
        db_type: conn?.db_type || "postgres",
        sample_data: csvPreview.slice(0, AI_SAMPLE_ROW_COUNT),
      });
      setAiResult(r.data.analysis);
    } catch {
      setAiResult("Analysis failed. Try again later.");
    }
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
      setStatus({
        ok: true,
        msg: d.rows_skipped
          ? `Inserted ${d.rows_inserted} rows (${d.rows_skipped} duplicates skipped)`
          : `Inserted ${d.rows_inserted} rows`,
      });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.response?.data?.detail || "Failed" });
    }
    setLoading(false);
  };

  const mappedCount = Object.values(mapping).filter((v) => v).length;
  const isLocked = loading;
  const hasAnyState = connId !== null || file !== null || execStats !== null;

  return (
    <>
      <div className={`container ${isLocked ? "ingest-locked" : ""}`}>
        <div className="toolbar">
          <span className="toolbar-title">Data Transfer</span>
          <div className="toolbar-spacer" />
          {hasAnyState && (
            <Button size="sm" onClick={clearAll} disabled={isLocked}>
              <ClearAllIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} /> Clear All
            </Button>
          )}
        </div>

        {/* Step 1: Select Target */}
        <fieldset disabled={isLocked} className="panel-fieldset">
          <TargetSelector
            connections={conns}
            connectionsLoading={connsLoading}
            selectedConnectionId={connId}
            onConnectionChange={setConnId}
            tables={tables}
            tablesLoading={tablesLoading}
            selectedTable={table}
            onTableChange={setTable}
            operation={operation}
            onOperationChange={setOperation}
          />
        </fieldset>

        {/* Step 2: Upload CSV */}
        {table && (
          <fieldset disabled={isLocked} className="panel-fieldset">
            <FileUploader
              file={file}
              csvTotalRows={csvTotalRows}
              csvFileSize={csvFileSize}
              disabled={isLocked}
              onFileSelect={handleFile}
            />
          </fieldset>
        )}

        {/* File Overview */}
        {file && csvTotalRows > 0 && (
          <div className="exec-stats-panel pre-stats">
            <div className="panel-header">
              <FolderOpenIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> File Overview
            </div>
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
                <span className="exec-stat-value">
                  {mappedCount}/{csvHeaders.length}
                </span>
                <span className="exec-stat-label">Mapped</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Column Mapping */}
        {csvHeaders.length > 0 && dbCols.length > 0 && (
          <fieldset disabled={isLocked} className="panel-fieldset">
            <ColumnMapper
              csvHeaders={csvHeaders}
              dbColumns={dbCols}
              mapping={mapping}
              onMappingChange={setMapping}
              mappedCount={mappedCount}
            />
          </fieldset>
        )}

        {/* AI Analysis */}
        {mappedCount > 0 && (
          <fieldset disabled={isLocked} className="panel-fieldset">
            <div className="ai-panel">
              <div className="ai-panel-header">
                <AutoFixHighIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> AI Query Analysis
              </div>
              <Button
                size="sm"
                onClick={analyze}
                disabled={aiLoading || isLocked}
                loading={aiLoading}
                loadingText="Analyzing..."
              >
                Analyze before executing
              </Button>
              {aiResult && <div className="ai-result">{aiResult}</div>}
            </div>
          </fieldset>
        )}

        {/* Execute */}
        {mappedCount > 0 && (
          <div className="exec-action-bar">
            <Button
              variant="primary"
              onClick={execute}
              disabled={isLocked}
              loading={loading}
              loadingText="Executing..."
            >
              <PlayArrowIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} /> Execute {operation}
            </Button>
            {status && <span className={`badge ${status.ok ? "badge-success" : "badge-failed"}`}>{status.msg}</span>}
          </div>
        )}

        {execStats && <ExecStatsPanel stats={execStats} />}
        {csvPreview.length > 0 && <CsvPreview headers={csvHeaders} rows={csvPreview} />}
      </div>
    </>
  );
}
