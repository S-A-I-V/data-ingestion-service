import { useState, useEffect } from "react";
import api from "../api";

interface Log {
  id: number;
  user_email: string;
  connection_name: string;
  operation: string;
  table_name: string;
  row_count: number;
  query_preview: string;
  ai_suggestion: string | null;
  status: string;
  error_message: string | null;
  executed_at: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => { api.get("/audit").then(r => setLogs(r.data)); }, []);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Audit Log</h2>
      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#8b949e" }}>
          No operations recorded yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Connection</th>
                <th>Operation</th>
                <th>Table</th>
                <th>Rows</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(l.executed_at).toLocaleString()}</td>
                  <td>{l.user_email}</td>
                  <td>{l.connection_name}</td>
                  <td>{l.operation}</td>
                  <td style={{ fontFamily: "monospace" }}>{l.table_name}</td>
                  <td>{l.row_count}</td>
                  <td><span className={`badge ${l.status === "success" ? "badge-success" : "badge-failed"}`}>{l.status}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {l.error_message || l.query_preview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
