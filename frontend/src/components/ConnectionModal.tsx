import { useState } from "react";
import { ModalWrapper, motion, AnimatePresence } from "./Motion";
import { DB_TYPES, EMPTY_CONNECTION_FORM, MODAL_TABS } from "../constants/database";
import DbIcon from "./DbIcon";
import DbPicker from "./DbPicker";
import api from "../api";
import MainTab from "./connection-form/MainTab";
import SshTab from "./connection-form/SshTab";
import SslTab from "./connection-form/SslTab";
import AdvancedTab from "./connection-form/AdvancedTab";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import LockIcon from "@mui/icons-material/Lock";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import type { ConnectionForm, DbType } from "../types";

const TAB_ICONS: Record<string, React.ReactNode> = {
  settings_ethernet: <SettingsEthernetIcon sx={{ fontSize: 16 }} />,
  vpn_key: <VpnKeyIcon sx={{ fontSize: 16 }} />,
  lock: <LockIcon sx={{ fontSize: 16 }} />,
  tune: <TuneIcon sx={{ fontSize: 16 }} />,
};

interface Props {
  onClose: () => void;
  onSaved: () => void;
  onToast: (toast: { ok: boolean; msg: string }) => void;
  editId?: number | null;
  initialData?: Partial<ConnectionForm>;
}

interface TestResult {
  ok: boolean;
  message: string;
  elapsed?: number;
}

export default function ConnectionModal({ onClose, onSaved, onToast, editId, initialData }: Props) {
  const [form, setForm] = useState<ConnectionForm>({ ...EMPTY_CONNECTION_FORM, ...initialData });
  const [tab, setTab] = useState("main");
  const [connectBy, setConnectBy] = useState<"host" | "url">("host");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showPicker, setShowPicker] = useState(!editId && !initialData?.db_type);
  const [tempConnId, setTempConnId] = useState<number | null>(null);

  const isEditing = editId != null;
  const dbInfo = DB_TYPES.find((d) => d.value === form.db_type);

  const handleDbSelect = (db: DbType) => {
    setForm({ ...form, db_type: db.value, port: db.defaultPort });
    setShowPicker(false);
  };

  const save = async () => {
    if (!form.name.trim()) return alert("Connection name is required");
    if (!form.host.trim()) return alert("Host is required");
    if (!form.database.trim()) return alert("Database name is required");
    if (!form.username.trim()) return alert("Username is required");
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/connections/${editId}`, form);
      } else if (tempConnId) {
        await api.put(`/connections/${tempConnId}`, form);
      } else {
        await api.post("/connections/", form);
      }
      onSaved();
      onClose();
      onToast({ ok: true, msg: isEditing ? "Connection updated" : "Connection saved" });
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed");
    }
    setSaving(false);
  };

  const testConnection = async () => {
    if (!form.host.trim() || !form.database.trim() || !form.username.trim()) return alert("Fill required fields");
    setTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      let connId = editId ?? tempConnId;
      if (!connId) {
        const r = await api.post("/connections/", form);
        connId = r.data.id;
        setTempConnId(connId);
        onSaved(); // refresh list so the card appears
      } else if (!isEditing) {
        // Subsequent test clicks — update the existing temp record with latest form values
        await api.put(`/connections/${connId}`, form);
      }
      const tr = await api.post(`/connections/${connId}/test`);
      const elapsed = Date.now() - start;
      setTestResult({
        ok: tr.data.ok,
        message: tr.data.ok ? "Connection successful" : tr.data.message,
        elapsed,
      });
    } catch (e: any) {
      const elapsed = Date.now() - start;
      setTestResult({
        ok: false,
        message: e.response?.data?.detail || "Connection failed",
        elapsed,
      });
    }
    setTesting(false);
  };

  if (showPicker) {
    return (
      <ModalWrapper onClose={onClose}>
        <DbPicker onSelect={handleDbSelect} onCancel={onClose} />
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper onClose={onClose}>
      <div className="modal-header">
        <span className="modal-header-title">
          <DbIcon icon={dbInfo?.icon || ""} size={20} /> {isEditing ? "Edit" : "New"} Connection — {dbInfo?.label}
        </span>
        <div className="modal-header-actions">
          {!isEditing && (
            <button type="button" className="btn btn-sm" onClick={() => setShowPicker(true)}>
              ← Change DB
            </button>
          )}
          <button type="button" className="close-btn" title="Close" onClick={onClose}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
      <div className="modal-body">
        <div className="modal-sidebar">
          {MODAL_TABS.map((t) => (
            <motion.div
              key={t.id}
              className={`modal-sidebar-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.15 }}
            >
              <span>{TAB_ICONS[t.icon] || t.icon}</span> {t.label}
            </motion.div>
          ))}
        </div>
        <div className="modal-content">
          {tab === "main" && (
            <MainTab form={form} setForm={setForm} connectBy={connectBy} setConnectBy={setConnectBy} />
          )}
          {tab === "ssh" && <SshTab form={form} setForm={setForm} />}
          {tab === "ssl" && <SslTab form={form} setForm={setForm} />}
          {tab === "advanced" && <AdvancedTab form={form} setForm={setForm} />}
        </div>
      </div>
      <div className="modal-footer">
        <motion.button
          type="button"
          className="btn"
          onClick={testConnection}
          disabled={saving || testing}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {testing ? "Testing..." : "Test Connection"}
        </motion.button>
        <div className="modal-footer-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving || testing}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {saving ? "Saving..." : "Save"}
          </motion.button>
        </div>
      </div>

      {/* Test Result Modal (DBeaver-style centered) */}
      <AnimatePresence>
        {(testing || testResult) && (
          <div className="test-result-overlay" onClick={() => !testing && setTestResult(null)}>
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
                    <span>Testing connection to {dbInfo?.label}...</span>
                  </div>
                ) : testResult ? (
                  <>
                    <div className={`test-result-icon ${testResult.ok ? "success" : "error"}`}>
                      {testResult.ok ? <CheckCircleIcon sx={{ fontSize: 32 }} /> : <CancelIcon sx={{ fontSize: 32 }} />}
                    </div>
                    <div className="test-result-status">
                      {testResult.ok ? "Connected" : "Connection Failed"}
                      {testResult.elapsed != null && (
                        <span className="test-result-time"> ({testResult.elapsed} ms)</span>
                      )}
                    </div>
                    {testResult.ok ? (
                      <div className="test-result-details">
                        <div className="test-result-row">
                          <span className="test-result-label">Server:</span>
                          <span>{dbInfo?.label}</span>
                        </div>
                        <div className="test-result-row">
                          <span className="test-result-label">Host:</span>
                          <span>
                            {form.host}:{form.port}
                          </span>
                        </div>
                        <div className="test-result-row">
                          <span className="test-result-label">Database:</span>
                          <span>{form.database}</span>
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
                  <button type="button" className="btn btn-primary" onClick={() => setTestResult(null)}>
                    OK
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalWrapper>
  );
}
