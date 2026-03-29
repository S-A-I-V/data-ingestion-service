import { useState, useEffect } from "react";
import api from "../api";
import { PageTransition, FadeIn, motion } from "../components/Motion";
import type { AuditLog as Log } from "../types";

export default function AuditLog() {
  const [logs, setLogs] = useState<Log[]>([]);
  const refresh = () => api.get("/audit").then((r) => setLogs(r.data));
  useEffect(() => {
    refresh();
  }, []);

  return (
    <PageTransition>
      <div className="container">
        <FadeIn>
          <div className="toolbar">
            <span className="toolbar-title">Audit Log</span>
            <div style={{ flex: 1 }} />
            <motion.button
              type="button"
              className="btn btn-sm"
              onClick={refresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ↻ Refresh
            </motion.button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="panel">
            <div className="panel-header">📋 Execution History</div>
            {logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No operations yet</div>
                <div className="empty-desc">Run a data transfer to see it here.</div>
              </div>
            ) : (
              <div style={{ overflow: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Connection</th>
                      <th>Op</th>
                      <th>Table</th>
                      <th>Rows</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <motion.tr
                        key={l.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                      >
                        <td style={{ whiteSpace: "nowrap" }}>{new Date(l.executed_at).toLocaleString()}</td>
                        <td>{l.user_email}</td>
                        <td>{l.connection_name}</td>
                        <td>
                          <span className="badge badge-info">{l.operation}</span>
                        </td>
                        <td>{l.table_name}</td>
                        <td>{l.row_count}</td>
                        <td>
                          <span className={`badge ${l.status === "success" ? "badge-success" : "badge-failed"}`}>
                            {l.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {l.error_message || l.query_preview}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
