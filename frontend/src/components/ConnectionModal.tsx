import { useState } from "react";
import { ModalWrapper, motion } from "./Motion";
import { DB_TYPES, EMPTY_CONNECTION_FORM, MODAL_TABS } from "../constants/database";
import DbIcon from "./DbIcon";
import api from "../api";
import MainTab from "./connection-form/MainTab";
import SshTab from "./connection-form/SshTab";
import SslTab from "./connection-form/SslTab";
import AdvancedTab from "./connection-form/AdvancedTab";
import type { ConnectionForm } from "../types";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  onToast: (toast: { ok: boolean; msg: string }) => void;
  editId?: number | null;
  initialData?: Partial<ConnectionForm>;
}

export default function ConnectionModal({ onClose, onSaved, onToast, editId, initialData }: Props) {
  const [form, setForm] = useState<ConnectionForm>({ ...EMPTY_CONNECTION_FORM, ...initialData });
  const [tab, setTab] = useState("main");
  const [connectBy, setConnectBy] = useState<"host" | "url">("host");
  const [saving, setSaving] = useState(false);

  const isEditing = editId != null;
  const dbInfo = DB_TYPES.find((d) => d.value === form.db_type);

  const save = async () => {
    if (!form.name.trim()) return alert("Connection name is required");
    if (!form.host.trim()) return alert("Host is required");
    if (!form.database.trim()) return alert("Database name is required");
    if (!form.username.trim()) return alert("Username is required");
    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/connections/${editId}`, form);
      } else {
        await api.post("/connections/", form);
      }
      onClose();
      onSaved();
      onToast({ ok: true, msg: isEditing ? "Connection updated" : "Connection saved" });
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed");
    }
    setSaving(false);
  };

  const testNew = async () => {
    if (!form.host.trim() || !form.database.trim() || !form.username.trim()) return alert("Fill required fields");
    setSaving(true);
    try {
      const r = await api.post("/connections/", form);
      const tr = await api.post(`/connections/${r.data.id}/test`);
      onToast({ ok: tr.data.ok, msg: tr.data.ok ? "Connection successful!" : tr.data.message });
      onSaved();
    } catch (e: any) {
      onToast({ ok: false, msg: e.response?.data?.detail || "Failed" });
    }
    setSaving(false);
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="modal-header">
        <span className="modal-header-title">
          <DbIcon icon={dbInfo?.icon || ""} size={20} /> {isEditing ? "Edit" : "New"} Connection — {dbInfo?.label}
        </span>
        <button type="button" className="close-btn" onClick={onClose}>
          ✕
        </button>
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
              <span>{t.icon}</span> {t.label}
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
          onClick={testNew}
          disabled={saving}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Test Connection
        </motion.button>
        <div className="modal-footer-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {saving ? "Saving..." : "Save"}
          </motion.button>
        </div>
      </div>
    </ModalWrapper>
  );
}
