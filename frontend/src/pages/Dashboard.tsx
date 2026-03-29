import { useState, useEffect } from "react";
import api from "../api";
import { PageTransition, FadeIn, motion } from "../components/Motion";
import ConnectionList from "../components/ConnectionList";
import ConnectionModal from "../components/ConnectionModal";
import type { Connection } from "../types";

export default function Dashboard() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = () => api.get("/connections").then((r) => setConns(r.data));
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
    const r = await api.post(`/connections/${id}/test`);
    setToast({ ok: r.data.ok, msg: r.data.ok ? "Connection successful!" : r.data.message });
  };

  const del = async (id: number) => {
    if (!confirm("Delete this connection?")) return;
    await api.delete(`/connections/${id}`);
    load();
    setToast({ ok: true, msg: "Deleted" });
  };

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
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              + New Connection
            </motion.button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="panel">
            <ConnectionList connections={conns} onTest={testConn} onDelete={del} />
          </div>
        </FadeIn>

        {toast && (
          <motion.div
            className={`toast ${toast.ok ? "toast-success" : "toast-error"}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
          >
            {toast.ok ? "✓" : "✗"} {toast.msg}
          </motion.div>
        )}

        {showModal && <ConnectionModal onClose={() => setShowModal(false)} onSaved={load} onToast={setToast} />}
      </div>
    </PageTransition>
  );
}
