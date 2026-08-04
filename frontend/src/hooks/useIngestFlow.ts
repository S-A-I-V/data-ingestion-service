/**
 * useIngestFlow — Custom hook encapsulating all state and side effects
 * for the Data Transfer (Ingest) page multi-step wizard.
 */

import { useState, useEffect, useMemo } from "react";
import api from "../api";
import { fmtBytes, type ExecStats } from "../components/ingest/ExecStatsPanel";
import { STATUS_AUTO_DISMISS_MS, INGESTION_OPERATIONS, AI_SAMPLE_ROW_COUNT } from "../constants/ingest";
import type { Connection, ColInfo } from "../types";

export function useIngestFlow() {
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

  // ── Effects ───────────────────────────────────────────────────────────────

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

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  // ── Derived values ────────────────────────────────────────────────────────

  const mappedCount = Object.values(mapping).filter((v) => v).length;
  const canAdvanceToPreview = file && mappedCount > 0 && csvPreview.length > 0;

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
        .map(([csv, db]) => ({ csv, db })),
    [mapping],
  );

  return {
    currentStep,
    setCurrentStep,
    conns,
    connsLoading,
    connId,
    setConnId,
    tables,
    tablesLoading,
    table,
    setTable,
    dbCols,
    operation,
    setOperation,
    csvHeaders,
    csvPreview,
    csvTotalRows,
    csvFileSize,
    mapping,
    setMapping,
    file,
    aiResult,
    aiLoading,
    analyze,
    status,
    loading,
    execStats,
    handleFile,
    execute,
    resetAll,
    mappedCount,
    canAdvanceToPreview,
    executionPlanRows,
    columnMappingRows,
  };
}
