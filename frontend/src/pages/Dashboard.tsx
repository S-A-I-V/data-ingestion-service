import { useState, useEffect } from "react";
import api from "../api";
import { PageTransition, FadeIn, motion, AnimatePresence } from "../components/Motion";
import ConnectionList from "../components/ConnectionList";
import ConnectionModal from "../components/ConnectionModal";
import { DB_TYPES } from "../constants/database";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import type { Connection } from "../types";
import type { ConnStatus } from "../components/ConnectionStatusBadge";

interface TestResult {
  ok: boolean;
  message: string;
  elapsed?: number;
  conn?: Connection;
}

export default function Dashboard() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [connStatuses, setConnStatuses] = useState<Record<number, ConnStatus>>({});
  const [showModal, setShowModal] = useState(false);
  const [editConn, setEditConn] = useState<Connection | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState<Connection | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const load = () =>
    api
      .get("/connections")
      .then((r) => setConns(r.data))
      .catch(() => setToast({ ok: false, msg: "Failed to load connections" }));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const testConn = async (id: number) => {
    const conn = conns.find((c) => c.id === id);
    if (!conn) return;
    setTesting(conn);
    setTestResult(null);
    const start = Date.now();
    try {
      const r = await api.post(`/connections/${id}/test`);
      const elapsed = Date.now() - start;
      const ok = r.data.ok as boolean;
      setConnStatuses((prev) => ({ ...prev, [id]: ok ? "ok" : "error" }));
      setTestResult({
        ok,
        message: ok ? "Connection successful" : r.data.message,
        elapsed,
        conn,
      });
    } catch (e: any) {
      const elapsed = Date.now() - start;
      setConnStatuses((prev) => ({ ...prev, [id]: "error" }));
      setTestResult({
        ok: false,
        message: e.response?.data?.detail || "Connection failed",
        elapsed,
        conn,
      });
    }
    setTesting(null);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this connection?")) return;
    await api.delete(`/connections/${id}`);
    load();
    setToast({ ok: true, msg: "Deleted" });
  };

  const closeTestResult = () => {
    setTesting(null);
    setTestResult(null);
  };

  const testingConn = testing || testResult?.conn;
  const testDbInfo = testingConn ? DB_TYPES.find((d) => d.value === testingConn.db_type) : null;

  return (
    <PageTransition>
      <div className="container">
        <FadeIn>
          <div className="toolbar">
            <span className="toolbar-title">Database Connections</span>
            <div className="toolbar-spacer" />
            <motion.button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditConn(null);
                setShowModal(true);
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              + New Connection
            </motion.button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="panel">
            <ConnectionList
              connections={conns}
              statuses={connStatuses}
              onTest={testConn}
              onDelete={del}
              onEdit={(c) => {
                setEditConn(c);
                setShowModal(true);
              }}
            />
          </div>
        </FadeIn>

        {toast && (
          <motion.div
            className={`toast ${toast.ok ? "toast-success" : "toast-error"}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
          >
            {toast.ok ? (
              <CheckCircleIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
            ) : (
              <CancelIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
            )}{" "}
            {toast.msg}
          </motion.div>
        )}

        {showModal && (
          <ConnectionModal
            onClose={() => {
              setShowModal(false);
              setEditConn(null);
            }}
            onSaved={load}
            onToast={setToast}
            editId={editConn?.id}
            initialData={
              editConn
                ? {
                    name: editConn.name,
                    db_type: editConn.db_type,
                    host: editConn.host,
                    port: editConn.port,
                    database: editConn.database,
                    username: editConn.username,
                    use_ssl: editConn.use_ssl,
                    ssh_enabled: editConn.ssh_enabled,
                    connection_timeout: editConn.connection_timeout,
                  }
                : undefined
            }
          />
        )}

        {/* Centered Test Result Modal (DBeaver-style) */}
        <AnimatePresence>
          {(testing || testResult) && (
            <div className="test-result-overlay" onClick={() => !testing && closeTestResult()}>
              <motion.div
                className="test-result-modal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="test-result-header">Connection Test</div>
                <div className="test-result-body">
                  {testing ? (
                    <div className="test-result-loading">
                      <div className="spinner" />
                      <span>Testing connection to {testDbInfo?.label}...</span>
                    </div>
                  ) : testResult ? (
                    <>
                      <div className={`test-result-icon ${testResult.ok ? "success" : "error"}`}>
                        {testResult.ok ? (
                          <CheckCircleIcon sx={{ fontSize: 32 }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 32 }} />
                        )}
                      </div>
                      <div className="test-result-status">
                        {testResult.ok ? "Connected" : "Connection Failed"}
                        {testResult.elapsed != null && (
                          <span className="test-result-time"> ({testResult.elapsed} ms)</span>
                        )}
                      </div>
                      {testResult.ok && testResult.conn ? (
                        <div className="test-result-details">
                          <div className="test-result-row">
                            <span className="test-result-label">Server:</span>
                            <span>{testDbInfo?.label}</span>
                          </div>
                          <div className="test-result-row">
                            <span className="test-result-label">Host:</span>
                            <span>
                              {testResult.conn.host}:{testResult.conn.port}
                            </span>
                          </div>
                          <div className="test-result-row">
                            <span className="test-result-label">Database:</span>
                            <span>{testResult.conn.database}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="test-result-error-msg">{testResult.message}</div>
                      )}
                    </>
                  ) : null}
                </div>
                {!testing && (
                  <div className="test-result-footer">
                    <button type="button" className="btn btn-primary" onClick={closeTestResult}>
                      OK
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
