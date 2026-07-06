/**
 * Ingest — Data transfer page with multi-step form flow.
 *
 * Steps:
 *   1. Configure — Select connection/table/operation, upload CSV, map columns
 *   2. Preview — Review data + optional AI analysis
 *   3. Execute — Running the transfer
 *   4. Results — Execution stats + actions
 */
import { useState, useEffect, useRef, useMemo } from "react";
import api from "../api";
import ExecStatsPanel, { fmtBytes, type ExecStats } from "../components/ingest/ExecStatsPanel";
import CsvPreview from "../components/ingest/CsvPreview";
import TargetSelector from "../components/ingest/TargetSelector";
import FileUploader from "../components/ingest/FileUploader";
import ColumnMapper from "../components/ingest/ColumnMapper";
import StepProgress from "../components/onboarding/StepProgress";
import WizardNavigation from "../components/onboarding/WizardNavigation";
import Highlight from "../components/ui/Highlight";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Spinner } from "../components/ui";
import { STATUS_AUTO_DISMISS_MS, INGESTION_OPERATIONS, AI_SAMPLE_ROW_COUNT } from "../constants/ingest";
import type { Connection, ColInfo } from "../types";

const INGEST_STEPS = [
  { label: "Configure", description: "Upload & map columns" },
  { label: "Preview", description: "Review data" },
  { label: "Execute", description: "Transfer data" },
  { label: "Results", description: "View stats" },
];

export default function Ingest() {
  const [currentStep, setCurrentStep] = useState(0);

  // Connection & target state
  const [conns, setConns] = useState<Connection[]>([]);
  const [connsLoading, setConnsLoading] = useState(true);
  const [connId, setConnId] = useState<number | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [table, setTable] = useState("");
  const [dbCols, setDbCols] = useState<ColInfo[]>([]);
  const [operation, setOperation] = useState<string>(INGESTION_OPERATIONS.INSERT);

  // CSV state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [csvFileSize, setCsvFileSize] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);

  // AI & execution state
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [execStats, setExecStats] = useState<ExecStats | null>(null);

  // Load connections on mount
  useEffect(() => {
    api
      .get("/connections")
      .then((r) => setConns(r.data))
      .catch(() => {})
      .finally(() => setConnsLoading(false));
  }, []);

  // Load tables when connection changes
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

  // Load columns when table changes
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

  // Auto-dismiss status
  useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(null), STATUS_AUTO_DISMISS_MS);
      return () => clearTimeout(t);
    }
  }, [status]);

  // ── Handlers ─────────────────────────────────────────────────────────────

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
      setCurrentStep(3);
    } catch (e: any) {
      setStatus({ ok: false, msg: e.response?.data?.detail || "Failed" });
    }
    setLoading(false);
  };

  const resetAll = () => {
    setCurrentStep(0);
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
  };

  const mappedCount = Object.values(mapping).filter((v) => v).length;
  const canAdvanceToPreview = file && mappedCount > 0 && csvPreview.length > 0;

  // Build table rows for the Execute step
  const executionPlanRows = useMemo(() => {
    const conn = conns.find((c) => c.id === connId);
    return [
      { Property: "Operation", Value: operation },
      { Property: "Target Table", Value: table },
      { Property: "Connection", Value: conn?.name || "—" },
      { Property: "Database Type", Value: conn?.db_type || "—" },
      { Property: "Total Rows", Value: csvTotalRows.toLocaleString() },
      { Property: "File Size", Value: fmtBytes(csvFileSize) },
      { Property: "Mapped Columns", Value: `${mappedCount} / ${csvHeaders.length}` },
    ];
  }, [operation, table, conns, connId, csvTotalRows, csvFileSize, mappedCount, csvHeaders.length]);

  const columnMappingRows = useMemo(
    () =>
      Object.entries(mapping)
        .filter(([, v]) => v)
        .map(([csv, db]) => ({ "CSV Column": csv, "→": "→", "Database Column": db })),
    [mapping],
  );

  return (
    <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
      {/* LEFT SIDEBAR — Step Timeline */}
      <aside className="lf-sidebar-left">
        <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="sidebar-card-title">
              <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">
                Steps
              </h2>
            </div>
            <div className="step-progress-vertical" style={{ flex: 1 }}>
              {INGEST_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                const isClickable = idx <= currentStep && idx < 3;
                return (
                  <div
                    key={idx}
                    className={`step-v-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                    onClick={() => isClickable && setCurrentStep(idx)}
                    role="button"
                    tabIndex={isClickable ? 0 : -1}
                  >
                    <div className="step-v-circle">{isDone ? "✓" : <span>{idx + 1}</span>}</div>
                    <div className="step-v-label">
                      <span className="step-v-title">{step.label}</span>
                      <span className="step-v-desc">{step.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER CONTENT */}
      <main className="lf-main">
        <div style={{ width: "100%" }}>
          <div className="toolbar">
            <span className="toolbar-title">
              <Highlight>Data Transfer</Highlight>
            </span>
            <span className="toolbar-subtitle">Upload CSV data into any connected database</span>
            <div className="toolbar-spacer" />
          </div>

          {/* Navigation bar — always at top below title */}
          {currentStep < 3 && (
            <WizardNavigation
              currentStep={currentStep}
              totalSteps={3}
              onBack={() => setCurrentStep((s) => Math.max(s - 1, 0))}
              onNext={() => setCurrentStep((s) => s + 1)}
              onExecute={execute}
              executeLabel={`Execute ${operation}`}
              executeDisabled={loading}
            />
          )}
          {currentStep === 3 && (
            <WizardNavigation
              currentStep={2}
              totalSteps={3}
              onBack={() => {}}
              onNext={() => {}}
              onExecute={resetAll}
              executeLabel="Transfer Another"
            />
          )}

          <div className="onboarding-step-content">
            {/* ═══ Step 0: Configure ═══ */}
            {currentStep === 0 && (
              <>
                <div className="ingest-configure-grid">
                  {/* Left: Select Target */}
                  <fieldset className="panel-fieldset">
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

                  {/* Right: Upload CSV — always visible, disabled until table selected */}
                  <fieldset className="panel-fieldset" disabled={!table}>
                    <FileUploader
                      file={file}
                      csvTotalRows={csvTotalRows}
                      csvFileSize={csvFileSize}
                      disabled={!table}
                      onFileSelect={handleFile}
                    />
                  </fieldset>
                </div>

                {csvHeaders.length > 0 && dbCols.length > 0 && (
                  <fieldset className="panel-fieldset">
                    <ColumnMapper
                      csvHeaders={csvHeaders}
                      dbColumns={dbCols}
                      mapping={mapping}
                      onMappingChange={setMapping}
                      mappedCount={mappedCount}
                      totalRows={csvTotalRows}
                      fileSize={csvFileSize}
                    />
                  </fieldset>
                )}

                {/* Step 0 has no separate nav — handled by bottom bar */}
              </>
            )}

            {/* ═══ Step 1: Preview & AI ═══ */}
            {currentStep === 1 && (
              <>
                <CsvPreview headers={csvHeaders} rows={csvPreview} />

                {/* AI Analysis — Gemini-style input */}
                <div className="gemini-ai-section">
                  {aiResult && (
                    <div className="gemini-response">
                      <div className="gemini-response-header">
                        <AutoFixHighIcon sx={{ fontSize: 16 }} />
                        <span>AI Analysis</span>
                      </div>
                      <div className="gemini-response-body">{aiResult}</div>
                    </div>
                  )}
                  <div className="gemini-input-bar">
                    <button
                      type="button"
                      className="gemini-input-action"
                      title="Analyze data"
                      onClick={analyze}
                      disabled={aiLoading}
                    >
                      <AutoFixHighIcon sx={{ fontSize: 20 }} />
                    </button>
                    <span className="gemini-input-placeholder">
                      {aiLoading ? "Analyzing your data..." : "Ask about your data before executing..."}
                    </span>
                    <div className="gemini-input-right">
                      <button
                        type="button"
                        className="gemini-input-send"
                        onClick={analyze}
                        disabled={aiLoading}
                        title="Run analysis"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ Step 2: Execute ═══ */}
            {currentStep === 2 && !loading && (
              <>
                <div className="ingest-execute-grid">
                  {/* Execution Plan */}
                  <div className="panel csv-preview-panel">
                    <div className="panel-header">Execution Plan</div>
                    <div className="csv-preview-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Property</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {executionPlanRows.map((row) => (
                            <tr key={row.Property}>
                              <td>{row.Property}</td>
                              <td>
                                <strong>{row.Value}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Column Mapping */}
                  <div className="panel csv-preview-panel">
                    <div className="panel-header">Column Mapping — CSV{table}</div>
                    <div className="csv-preview-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>CSV Column</th>
                            <th>→</th>
                            <th>Database Column ({table})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columnMappingRows.map((row) => (
                            <tr key={row["CSV Column"]}>
                              <td>{row["CSV Column"]}</td>
                              <td>→</td>
                              <td>
                                <strong>{row["Database Column"]}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {status && <div className="lookup-error-badge">{status.msg}</div>}
              </>
            )}

            {/* Executing spinner */}
            {currentStep === 2 && loading && <Spinner size="lg" label={`Executing ${operation} into ${table}...`} />}

            {/* ═══ Step 3: Results ═══ */}
            {currentStep === 3 && (
              <>
                {status && (
                  <span className={`status-pill ${status.ok ? "status-pill--success" : "status-pill--danger"}`}>
                    {status.msg}
                  </span>
                )}

                {execStats && <ExecStatsPanel stats={execStats} />}
              </>
            )}
          </div>

          {/* Bottom navigation removed — now at top */}
        </div>
      </main>
    </div>
  );
}
