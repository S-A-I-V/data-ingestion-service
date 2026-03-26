import { useState, useEffect } from "react";
import api from "../api";

interface Connection {
  id: number;
  name: string;
  db_type: string;
  host: string;
  port: number;
  database: string;
  username: string;
}

const DB_TYPES = [
  { value: "postgres", label: "PostgreSQL", defaultPort: 5432 },
  { value: "clickhouse", label: "ClickHouse", defaultPort: 443 },
  { value: "sybase", label: "Sybase", defaultPort: 5000 },
];

export default function Dashboard() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", db_type: "postgres", host: "", port: 5432, database: "", username: "", password: "" });
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = () => api.get("/connections").then(r => setConns(r.data));
  useEffect(() => { load(); }, []);

  const handleTypeChange = (t: string) => {
    const def = DB_TYPES.find(d => d.value === t);
    setForm({ ...form, db_type: t, port: def?.defaultPort || 5432 });
  };

  const submit = async () => {
    await api.post("/connections", form);
    setShowForm(false);
    setForm({ name: "", db_type: "postgres", host: "", port: 5432, database: "", username: "", password: "" });
    load();
  };

  const testConn = async (id: number) => {
    setTestResult(null);
    const r = await api.post(`/connections/${id}/test`);
    setTestResult(r.data.ok ? `✓ Connection ${id} OK` : `✗ ${r.data.message}`);
  };

  const deleteConn = async (id: number) => {
    if (!confirm("Delete this connection?")) return;
    await api.delete(`/connections/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Database Connections</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Connection"}
        </button>
      </div>

      {testResult && <div className="card" style={{ borderColor: testResult.startsWith("✓") ? "#238636" : "#da3633" }}>{testResult}</div>}

      {showForm && (
        <div className="card">
          <div className="card-header">New Connection</div>
          <div className="grid-2">
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Postgres DB" />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select title="Database type" value={form.db_type} onChange={e => handleTypeChange(e.target.value)}>
                {DB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Host</label>
              <input value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="localhost" />
            </div>
            <div className="form-group">
              <label>Port</label>
              <input type="number" value={form.port} onChange={e => setForm({ ...form, port: +e.target.value })} placeholder="5432" />
            </div>
            <div className="form-group">
              <label>Database</label>
              <input value={form.database} onChange={e => setForm({ ...form, database: e.target.value })} placeholder="my_database" />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="db_user" />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={submit}>Save Connection</button>
        </div>
      )}

      {conns.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#8b949e" }}>
          No connections yet. Add one to get started.
        </div>
      )}

      {conns.map(c => (
        <div className="card" key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 13, color: "#8b949e" }}>{c.db_type} — {c.host}:{c.port}/{c.database}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => testConn(c.id)}>Test</button>
            <button className="btn btn-danger" onClick={() => deleteConn(c.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
