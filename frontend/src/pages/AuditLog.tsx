import { useState, useEffect } from "react";
import api from "../api";

interface Log {
  id: number; user_email: string; connection_name: string;
  operation: string; table_name: string; row_count: number;
  query_preview: string; status: string; error_message: string | null;
  executed_at: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const refresh = () => api.get("/audit").then(r => setLogs(r.data));
  useEffect(() => { refresh(); }, []);

  return (
    <div className="container">
      <div className="toolbar">
        <span className="toolbar-title">Audit Log</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn btn-sm" onClick={refresh}>↻ Refresh</button>
      </div>
      <div className="panel">
        <div className="panel-header">📋 Query Execution History</div>
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No operations yet</div>
            <div className="empty-desc">Execute a data transfer to see it here.</div>
          </div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>User</th><th>Connection</th><th>Op</th><th>Table</th><th>Rows</th><th>Status</th><th>Details</th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(l.executed_at).toLocaleString()}</td>
                    <td>{l.user_email}</td><td>{l.connection_name}</td>
                    <td><span className="badge badge-info">{l.operation}</span></td>
                    <td>{l.table_name}</td><td>{l.row_count}</td>
                    <td><span className={`badge ${l.status==="success"?"badge-success":"badge-failed"}`}>{l.status}</span></td>
                    <td style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis"}}>{l.error_message||l.query_preview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
