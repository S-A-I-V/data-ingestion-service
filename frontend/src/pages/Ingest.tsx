import { useState, useEffect, useRef } from "react";
import api from "../api";

interface Connection { id: number; name: string; db_type: string; }
interface ColInfo { name: string; type: string; nullable: boolean; }

export default function Ingest() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [connId, setConnId] = useState<number | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [table, setTable] = useState("");
  const [dbCols, setDbCols] = useState<ColInfo[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [operation, setOperation] = useState("INSERT");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.get("/connections").then(r => setConns(r.data)); }, []);
  useEffect(() => { if (connId) api.get(`/connections/${connId}/tables`).then(r => setTables(r.data)); }, [connId]);
  useEffect(() => { if (connId && table) api.get(`/connections/${connId}/tables/${table}/columns`).then(r => setDbCols(r.data)); }, [connId, table]);
  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(null), 5000); return () => clearTimeout(t); } }, [status]);

  const handleFile = async (f: File) => {
    setFile(f);
    const fd = new FormData(); fd.append("file", f);
    const r = await api.post("/ingestion/preview", fd);
    setCsvHeaders(r.data.headers); setCsvPreview(r.data.preview);
    const autoMap: Record<string, string> = {};
    for (const h of r.data.headers) {
      const match = dbCols.find(c => c.name.toLowerCase() === h.toLowerCase());
      if (match) autoMap[h] = match.name;
    }
    setMapping(autoMap);
  };

  const analyze = async () => {
    if (!connId) return;
    setAiLoading(true);
    const conn = conns.find(c => c.id === connId);
    const r = await api.post("/ai/analyze", {
      operation, table_name: table, columns: Object.values(mapping),
      row_count: csvPreview.length, db_type: conn?.db_type || "postgres",
      sample_data: csvPreview.slice(0, 3),
    });
    setAiResult(r.data.analysis); setAiLoading(false);
  };

  const execute = async () => {
    if (!file || !connId) return;
    setLoading(true); setStatus(null);
    const fd = new FormData();
    fd.append("file", file); fd.append("connection_id", String(connId));
    fd.append("table_name", table); fd.append("column_mapping", JSON.stringify(mapping));
    fd.append("operation", operation);
    try {
      const r = await api.post("/ingestion/execute", fd);
      setStatus({ ok: true, msg: `Successfully inserted ${r.data.rows_inserted} rows` });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.response?.data?.detail || "Execution failed" });
    }
    setLoading(false);
  };

  const mappedCount = Object.values(mapping).filter(v => v).length;

  return (
    <div className="container">
      <div className="toolbar">
        <span className="toolbar-title">Data Transfer</span>
      </div>

      {/* Step 1 */}
      <div className="panel">
        <div className="panel-header"><span className="step-num">1</span> Select Target</div>
        <div className="panel-body">
          <div className="form-row">
            <label>Connection:</label>
            <select title="Connection" value={connId || ""}
              onChange={e => { setConnId(+e.target.value); setTable(""); setDbCols([]); setCsvHeaders([]); setFile(null); setMapping({}); }}>
              <option value="">Choose a connection...</option>
              {conns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.db_type})</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Table:</label>
            <select title="Table" value={table} onChange={e => setTable(e.target.value)} disabled={!connId}>
              <option value="">Choose a table...</option>
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Operation:</label>
            <select title="Operation" value={operation} onChange={e => setOperation(e.target.value)}>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="UPSERT">UPSERT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      {table && (
        <div className="panel">
          <div className="panel-header"><span className="step-num">2</span> Upload CSV</div>
          <div className="panel-body">
            <div className="file-drop" onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}>
              <span className="drop-icon">{file ? "📄" : "☁️"}</span>
              {file ? file.name : "Drop your CSV file here, or click to browse"}
              <span className="drop-hint">{file ? `${csvPreview.length}+ rows detected` : "Supports .csv files"}</span>
            </div>
            <input ref={fileRef} type="file" accept=".csv" hidden onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          </div>
        </div>
      )}

      {/* Step 3 */}
      {csvHeaders.length > 0 && dbCols.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <span className="step-num">3</span> Column Mapping
            <span className="badge badge-info" style={{ marginLeft: "auto" }}>{mappedCount}/{csvHeaders.length} mapped</span>
          </div>
          <div className="panel-body">
            <div className="mapper-header">
              <span style={{ flex: 1 }}>CSV Column</span>
              <span style={{ width: 30 }} />
              <span style={{ flex: 1 }}>Database Column</span>
            </div>
            {csvHeaders.map(h => (
              <div className="mapper-row" key={h}>
                <span style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{h}</span>
                <span className="mapper-arrow">→</span>
                <select title={`Map ${h}`} style={{ flex: 1 }} value={mapping[h] || ""}
                  onChange={e => setMapping({ ...mapping, [h]: e.target.value })}>
                  <option value="">(skip)</option>
                  {dbCols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Panel */}
      {mappedCount > 0 && (
        <div className="ai-panel">
          <div className="ai-panel-header">✨ AI Query Analysis</div>
          <button type="button" className="btn btn-sm" onClick={analyze} disabled={aiLoading}>
            {aiLoading ? "Analyzing..." : "Analyze before executing"}
          </button>
          {aiResult && <div className="ai-result">{aiResult}</div>}
        </div>
      )}

      {/* Execute */}
      {mappedCount > 0 && (
        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" className="btn btn-primary" onClick={execute} disabled={loading}>
            {loading ? "Executing..." : `▶ Execute ${operation}`}
          </button>
          {status && <span className={`badge ${status.ok ? "badge-success" : "badge-failed"}`}>{status.msg}</span>}
        </div>
      )}

      {/* Preview */}
      {csvPreview.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header">📋 CSV Preview</div>
          <div style={{ overflow: "auto" }}>
            <table className="data-table">
              <thead><tr>{csvHeaders.map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {csvPreview.map((row, i) => (
                  <tr key={i}>{csvHeaders.map(h => <td key={h}>{row[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
