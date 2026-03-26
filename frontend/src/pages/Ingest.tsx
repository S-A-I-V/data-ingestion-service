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

  useEffect(() => {
    if (!connId) return;
    api.get(`/connections/${connId}/tables`).then(r => setTables(r.data));
  }, [connId]);

  useEffect(() => {
    if (!connId || !table) return;
    api.get(`/connections/${connId}/tables/${table}/columns`).then(r => setDbCols(r.data));
  }, [connId, table]);

  const handleFile = async (f: File) => {
    setFile(f);
    const form = new FormData();
    form.append("file", f);
    const r = await api.post("/ingestion/preview", form);
    setCsvHeaders(r.data.headers);
    setCsvPreview(r.data.preview);
    // Auto-map matching names
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
    const form = new FormData();
    form.append("file", file);
    form.append("connection_id", String(connId));
    form.append("table_name", table);
    form.append("column_mapping", JSON.stringify(mapping));
    form.append("operation", operation);
    try {
      const r = await api.post("/ingestion/execute", form);
      setStatus({ ok: true, msg: `Inserted ${r.data.rows_inserted} rows.` });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.response?.data?.detail || "Execution failed" });
    }
    setLoading(false);
  };

  const selectedConn = conns.find(c => c.id === connId);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Data Ingestion</h2>

      {/* Step 1: Connection + Table */}
      <div className="card">
        <div className="card-header">1. Select Target</div>
        <div className="grid-2">
          <div className="form-group">
            <label>Connection</label>
            <select title="Connection" value={connId || ""} onChange={e => { setConnId(+e.target.value); setTable(""); setDbCols([]); }}>
              <option value="">Select a connection...</option>
              {conns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.db_type})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Table</label>
            <select title="Table" value={table} onChange={e => setTable(e.target.value)} disabled={!connId}>
              <option value="">Select a table...</option>
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Operation</label>
          <select title="Operation" value={operation} onChange={e => setOperation(e.target.value)}>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="UPSERT">UPSERT</option>
          </select>
        </div>
      </div>

      {/* Step 2: Upload CSV */}
      {table && (
        <div className="card">
          <div className="card-header">2. Upload CSV</div>
          <div className="file-drop" onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}>
            {file ? `📄 ${file.name}` : "Click or drag a CSV file here"}
          </div>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </div>
      )}

      {/* Step 3: Column Mapping */}
      {csvHeaders.length > 0 && dbCols.length > 0 && (
        <div className="card">
          <div className="card-header">3. Map Columns</div>
          {csvHeaders.map(h => (
            <div className="mapper-row" key={h}>
              <span style={{ flex: 1, fontFamily: "monospace" }}>{h}</span>
              <span className="mapper-arrow">→</span>
              <select title={`Map ${h}`} style={{ flex: 1 }} value={mapping[h] || ""} onChange={e => setMapping({ ...mapping, [h]: e.target.value })}>
                <option value="">Skip</option>
                {dbCols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* AI Analysis */}
      {Object.keys(mapping).length > 0 && (
        <div className="ai-panel">
          <div className="ai-panel-header">🤖 AI Query Analysis</div>
          <button className="btn btn-secondary" onClick={analyze} disabled={aiLoading}>
            {aiLoading ? "Analyzing..." : "Analyze Before Executing"}
          </button>
          {aiResult && <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, color: "#c9d1d9" }}>{aiResult}</pre>}
        </div>
      )}

      {/* Execute */}
      {Object.values(mapping).some(v => v) && (
        <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn btn-primary" onClick={execute} disabled={loading}>
            {loading ? "Executing..." : `Execute ${operation}`}
          </button>
          {status && (
            <span className={`badge ${status.ok ? "badge-success" : "badge-failed"}`}>{status.msg}</span>
          )}
        </div>
      )}

      {/* Preview */}
      {csvPreview.length > 0 && (
        <div className="card" style={{ marginTop: 20, overflowX: "auto" }}>
          <div className="card-header">CSV Preview (first 10 rows)</div>
          <table className="data-table">
            <thead><tr>{csvHeaders.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {csvPreview.map((row, i) => (
                <tr key={i}>{csvHeaders.map(h => <td key={h}>{row[h]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
