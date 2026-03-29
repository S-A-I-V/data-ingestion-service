import { useState, useEffect } from "react";
import api from "../api";
import { PageTransition, FadeIn, Stagger, StaggerItem, ModalWrapper, HoverCard, motion } from "../components/Motion";

interface Connection {
  id: number; name: string; db_type: string; host: string;
  port: number; database: string; username: string;
  use_ssl: boolean; ssh_enabled: boolean; connection_timeout: number;
}

const DB_TYPES = [
  { value: "postgres", label: "PostgreSQL", defaultPort: 5432, icon: "🐘" },
  { value: "clickhouse", label: "ClickHouse", defaultPort: 443, icon: "🏠" },
  { value: "mysql", label: "MySQL", defaultPort: 3306, icon: "🐬" },
  { value: "mssql", label: "SQL Server", defaultPort: 1433, icon: "🔷" },
  { value: "sybase", label: "Sybase", defaultPort: 5000, icon: "📊" },
];

const EMPTY = {
  name: "", db_type: "postgres", host: "", port: 5432, database: "",
  username: "", password: "", use_ssl: false, ssh_enabled: false,
  ssh_host: "", ssh_port: 22, ssh_username: "", ssh_password: "",
  connection_timeout: 30, jdbc_url: "",
};

export default function Dashboard() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [tab, setTab] = useState("main");
  const [connectBy, setConnectBy] = useState<"host"|"url">("host");
  const [toast, setToast] = useState<{ok:boolean;msg:string}|null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/connections").then(r => setConns(r.data));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const openNew = () => { setForm({...EMPTY}); setTab("main"); setShowModal(true); };
  const close = () => setShowModal(false);

  const handleType = (t: string) => { const d = DB_TYPES.find(x => x.value === t); setForm({...form, db_type: t, port: d?.defaultPort || 5432}); };

  const save = async () => {
    if (!form.name.trim()) return alert("Connection name is required");
    if (!form.host.trim()) return alert("Host is required");
    if (!form.database.trim()) return alert("Database name is required");
    if (!form.username.trim()) return alert("Username is required");
    setSaving(true);
    try { await api.post("/connections/", form); close(); load(); setToast({ ok: true, msg: "Connection saved" }); }
    catch (e: any) { alert(e.response?.data?.detail || "Failed"); }
    setSaving(false);
  };

  const testConn = async (id: number) => {
    const r = await api.post(`/connections/${id}/test`);
    setToast({ ok: r.data.ok, msg: r.data.ok ? "Connection successful!" : r.data.message });
  };

  const testNew = async () => {
    if (!form.host.trim() || !form.database.trim() || !form.username.trim()) return alert("Fill required fields");
    setSaving(true);
    try {
      const r = await api.post("/connections/", form);
      const tr = await api.post(`/connections/${r.data.id}/test`);
      setToast({ ok: tr.data.ok, msg: tr.data.ok ? "Connection successful!" : tr.data.message });
      load();
    } catch (e: any) { setToast({ ok: false, msg: e.response?.data?.detail || "Failed" }); }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this connection?")) return;
    await api.delete(`/connections/${id}`); load(); setToast({ ok: true, msg: "Deleted" });
  };

  const dbInfo = DB_TYPES.find(d => d.value === form.db_type);

  return (
    <PageTransition>
      <div className="container">
        <FadeIn>
          <div className="toolbar">
            <span className="toolbar-title">Database Connections</span>
            <div style={{ flex: 1 }} />
            <motion.button type="button" className="btn btn-primary" onClick={openNew}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              + New Connection
            </motion.button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="panel">
            {conns.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗄️</div>
                <div className="empty-title">No connections yet</div>
                <div className="empty-desc">Add a database connection to get started.</div>
              </div>
            ) : (
              <Stagger>
                {conns.map(c => {
                  const info = DB_TYPES.find(d => d.value === c.db_type);
                  return (
                    <StaggerItem key={c.id}>
                      <HoverCard className="conn-card">
                        <div className="conn-icon">{info?.icon || "🗄️"}</div>
                        <div className="conn-info">
                          <div className="conn-name">{c.name}</div>
                          <div className="conn-detail">
                            {info?.label} · {c.host}:{c.port}/{c.database}
                            {c.use_ssl && " · 🔒"}{c.ssh_enabled && " · 🔑"}
                          </div>
                        </div>
                        <div className="conn-actions">
                          <motion.button type="button" className="btn btn-sm btn-success" onClick={() => testConn(c.id)}
                            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>Test</motion.button>
                          <motion.button type="button" className="btn btn-sm btn-danger" onClick={() => del(c.id)}
                            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>Delete</motion.button>
                        </div>
                      </HoverCard>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </div>
        </FadeIn>

        {toast && (
          <motion.div className={`toast ${toast.ok ? "toast-success" : "toast-error"}`}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
            {toast.ok ? "✓" : "✗"} {toast.msg}
          </motion.div>
        )}

        {showModal && (
          <ModalWrapper onClose={close}>
            <div className="modal-header">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{dbInfo?.icon} New Connection — {dbInfo?.label}</span>
              <button type="button" className="close-btn" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-sidebar">
                {[{id:"main",label:"General",icon:"🔌"},{id:"ssh",label:"SSH Tunnel",icon:"🔑"},{id:"ssl",label:"SSL / TLS",icon:"🔒"},{id:"advanced",label:"Advanced",icon:"⚙️"}].map(t => (
                  <motion.div key={t.id} className={`modal-sidebar-item ${tab===t.id?"active":""}`}
                    onClick={() => setTab(t.id)} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                    <span>{t.icon}</span> {t.label}
                  </motion.div>
                ))}
              </div>
              <div className="modal-content">
                {tab === "main" && (<>
                  <div className="db-type-grid">
                    {DB_TYPES.map(t => (
                      <motion.button type="button" key={t.value}
                        className={`db-type-btn ${form.db_type===t.value?"active":""}`}
                        onClick={() => handleType(t.value)}
                        whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}>
                        <span className="icon">{t.icon}</span>{t.label}
                      </motion.button>
                    ))}
                  </div>
                  <div className="form-section">Connection</div>
                  <div className="form-row">
                    <label>Connect by:</label>
                    <div className="input-group">
                      <label style={{width:"auto",textAlign:"left"}}><input type="radio" name="cby" checked={connectBy==="host"} onChange={() => setConnectBy("host")} /> Host</label>
                      <label style={{width:"auto",textAlign:"left"}}><input type="radio" name="cby" checked={connectBy==="url"} onChange={() => setConnectBy("url")} /> URL</label>
                    </div>
                  </div>
                  {connectBy==="url" ? (
                    <div className="form-row"><label>URL:</label><input value={form.jdbc_url} onChange={e => setForm({...form, jdbc_url: e.target.value})} placeholder={`jdbc:${form.db_type}://host:${form.port}/db`} /></div>
                  ) : (<>
                    <div className="form-row"><label>Name:</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="My Database" /></div>
                    <div className="form-row"><label>Host:</label><div className="input-group"><input value={form.host} onChange={e => setForm({...form, host: e.target.value})} placeholder="localhost" /><span style={{color:"var(--text-muted)",fontSize:12}}>Port</span><input className="input-short" type="number" value={form.port} onChange={e => setForm({...form, port: +e.target.value})} /></div></div>
                    <div className="form-row"><label>Database:</label><input value={form.database} onChange={e => setForm({...form, database: e.target.value})} placeholder="my_database" /></div>
                  </>)}
                  <div className="form-section">Authentication</div>
                  <div className="form-row"><label>Username:</label><input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="db_user" /></div>
                  <div className="form-row"><label>Password:</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" /></div>
                </>)}
                {tab === "ssh" && (<>
                  <div className="form-section">SSH Tunnel</div>
                  <div className="form-row"><label>Enable:</label><input type="checkbox" checked={form.ssh_enabled} onChange={e => setForm({...form, ssh_enabled: e.target.checked})} /></div>
                  {form.ssh_enabled && (<>
                    <div className="form-row"><label>SSH Host:</label><div className="input-group"><input value={form.ssh_host} onChange={e => setForm({...form, ssh_host: e.target.value})} placeholder="bastion.example.com" /><span style={{color:"var(--text-muted)",fontSize:12}}>Port</span><input className="input-short" type="number" value={form.ssh_port} onChange={e => setForm({...form, ssh_port: +e.target.value})} /></div></div>
                    <div className="form-row"><label>SSH User:</label><input value={form.ssh_username} onChange={e => setForm({...form, ssh_username: e.target.value})} /></div>
                    <div className="form-row"><label>SSH Pass:</label><input type="password" value={form.ssh_password} onChange={e => setForm({...form, ssh_password: e.target.value})} /></div>
                  </>)}
                </>)}
                {tab === "ssl" && (<>
                  <div className="form-section">SSL / TLS</div>
                  <div className="form-row"><label>Use SSL:</label><input type="checkbox" checked={form.use_ssl} onChange={e => setForm({...form, use_ssl: e.target.checked})} /></div>
                  {form.use_ssl && <div className="form-hint">TLS encryption enabled.</div>}
                </>)}
                {tab === "advanced" && (<>
                  <div className="form-section">Options</div>
                  <div className="form-row"><label>Timeout (s):</label><input className="input-short" type="number" value={form.connection_timeout} onChange={e => setForm({...form, connection_timeout: +e.target.value})} /></div>
                </>)}
              </div>
            </div>
            <div className="modal-footer">
              <motion.button type="button" className="btn" onClick={testNew} disabled={saving} whileHover={{scale:1.03}} whileTap={{scale:0.97}}>Test Connection</motion.button>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn" onClick={close}>Cancel</button>
                <motion.button type="button" className="btn btn-primary" onClick={save} disabled={saving} whileHover={{scale:1.03}} whileTap={{scale:0.97}}>{saving ? "Saving..." : "Save"}</motion.button>
              </div>
            </div>
          </ModalWrapper>
        )}

      </div>
    </PageTransition>
  );
}
