import { useState, useEffect } from "react";
import api from "../api";
import { AnimatePresence, motion } from "../components/Motion";
import ConnectionList, { type ViewMode } from "../components/ConnectionList";
import ConnectionModal from "../components/ConnectionModal";
import { DB_TYPES } from "../constants/database";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { LayoutGrid, List } from "lucide-react";
import { Button, Toast, useToast, Spinner } from "../components/ui";
import type { Connection } from "../types";
import type { ConnStatus } from "../components/ConnectionStatusBadge";

// How long (ms) before a successful test result is considered stale (DBeaver-style idle timeout)
const STALE_MS = 30 * 60 * 1000; // 30 minutes

const VIEW_KEY = "conn_view_mode";

function deriveStatuses(conns: Connection[]): Record<number, ConnStatus> {
  const now = Date.now();
  const result: Record<number, ConnStatus> = {};
  for (const c of conns) {
    if (c.last_tested_at === null || c.last_test_ok === null) {
      result[c.id] = "unknown";
    } else {
      const age = now - new Date(c.last_tested_at).getTime();
      if (age > STALE_MS) {
        result[c.id] = "unknown"; // stale — treat as disconnected
      } else {
        result[c.id] = c.last_test_ok ? "ok" : "error";
      }
    }
  }
  return result;
}

interface TestResult {
  ok: boolean;
  message: string;
  elapsed?: number;
  conn?: Connection;
}

export default function Dashboard() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [connStatuses, setConnStatuses] = useState<Record<number, ConnStatus>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editConn, setEditConn] = useState<Connection | null>(null);
  const [toast, setToast] = useToast();
  const [testing, setTesting] = useState<Connection | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem(VIEW_KEY) as ViewMode | null) ?? "grid");

  const switchView = (v: ViewMode) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const load = () =>
    api
      .get("/connections")
      .then((r) => {
        const loaded: Connection[] = r.data;
        setConns(loaded);
        setConnStatuses(deriveStatuses(loaded));
      })
      .catch(() => setToast({ ok: false, msg: "Failed to load connections" }))
      .finally(() => setPageLoading(false));

  useEffect(() => {
    load();
    // Re-evaluate staleness every minute so the UI reflects idle-disconnect
    const interval = setInterval(() => {
      setConns((prev) => {
        setConnStatuses(deriveStatuses(prev));
        return prev;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const testConn = async (id: number) => {
    const conn = conns.find((c) => c.id === id);
    if (!conn) return;
    setTesting(conn);
    setTestResult(null);
    const start = Date.now();
    const now = new Date().toISOString();
    try {
      const r = await api.post(`/connections/${id}/test`);
      const elapsed = Date.now() - start;
      const ok = r.data.ok as boolean;
      // Update local conn state so staleness timer has the fresh timestamp
      setConns((prev) => prev.map((c) => (c.id === id ? { ...c, last_test_ok: ok, last_tested_at: now } : c)));
      setConnStatuses((prev) => ({ ...prev, [id]: ok ? "ok" : "error" }));
      setTestResult({
        ok,
        message: ok ? "Connection successful" : r.data.message,
        elapsed,
        conn,
      });
    } catch (e: any) {
      const elapsed = Date.now() - start;
      setConns((prev) => prev.map((c) => (c.id === id ? { ...c, last_test_ok: false, last_tested_at: now } : c)));
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
    <>
      <div className="container">
        <>
          <div className="toolbar">
            <span className="toolbar-title">Database Connections</span>
            <div className="toolbar-spacer" />
            {/* View toggle */}
            <div className="view-toggle">
              <button
                className={`view-toggle-btn${view === "grid" ? " active" : ""}`}
                onClick={() => switchView("grid")}
                aria-label="Grid view"
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={`view-toggle-btn${view === "list" ? " active" : ""}`}
                onClick={() => switchView("list")}
                aria-label="List view"
                title="List view"
              >
                <List size={15} />
              </button>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditConn(null);
                setShowModal(true);
              }}
            >
              + New Connection
            </Button>
          </div>
        </>

        <>
          <div className="panel">
            {pageLoading ? (
              <Spinner size="lg" label="Loading connections..." />
            ) : (
              <ConnectionList
                connections={conns}
                statuses={connStatuses}
                onTest={testConn}
                onDelete={del}
                onEdit={(c) => {
                  setEditConn(c);
                  setShowModal(true);
                }}
                view={view}
              />
            )}
          </div>
        </>

        <Toast toast={toast} />

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
                    <Button variant="primary" onClick={closeTestResult}>
                      OK
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
