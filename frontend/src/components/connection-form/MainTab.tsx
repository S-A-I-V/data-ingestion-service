import { motion } from "framer-motion";
import { DB_TYPES } from "../../constants/database";
import DbIcon from "../DbIcon";
import type { ConnectionForm } from "../../types";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
  connectBy: "host" | "url";
  setConnectBy: (v: "host" | "url") => void;
}

export default function MainTab({ form, setForm, connectBy, setConnectBy }: Props) {
  const handleType = (t: string) => {
    const d = DB_TYPES.find((x) => x.value === t);
    setForm({ ...form, db_type: t, port: d?.defaultPort || 5432 });
  };

  return (
    <>
      <div className="db-type-grid">
        {DB_TYPES.map((t) => (
          <motion.button
            type="button"
            key={t.value}
            className={`db-type-btn ${form.db_type === t.value ? "active" : ""}`}
            onClick={() => handleType(t.value)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <DbIcon icon={t.icon} size={28} />
            {t.label}
          </motion.button>
        ))}
      </div>
      <div className="form-section">Connection</div>
      <div className="form-row">
        <label>Connect by:</label>
        <div className="input-group">
          <label className="radio-label">
            <input type="radio" name="cby" checked={connectBy === "host"} onChange={() => setConnectBy("host")} /> Host
          </label>
          <label className="radio-label">
            <input type="radio" name="cby" checked={connectBy === "url"} onChange={() => setConnectBy("url")} /> URL
          </label>
        </div>
      </div>
      {connectBy === "url" ? (
        <div className="form-row">
          <label>URL:</label>
          <input
            value={form.jdbc_url}
            onChange={(e) => setForm({ ...form, jdbc_url: e.target.value })}
            placeholder={`jdbc:${form.db_type}://host:${form.port}/db`}
          />
        </div>
      ) : (
        <>
          <div className="form-row">
            <label>Name:</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Database"
            />
          </div>
          <div className="form-row">
            <label>Host:</label>
            <div className="input-group">
              <input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="localhost"
              />
              <span className="input-hint">Port</span>
              <input
                className="input-short"
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: +e.target.value })}
                placeholder="Port"
              />
            </div>
          </div>
          <div className="form-row">
            <label>Database:</label>
            <input
              value={form.database}
              onChange={(e) => setForm({ ...form, database: e.target.value })}
              placeholder="my_database"
            />
          </div>
        </>
      )}
      <div className="form-section">Authentication</div>
      <div className="form-row">
        <label>Username:</label>
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="db_user"
        />
      </div>
      <div className="form-row">
        <label>Password:</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••••"
        />
      </div>
    </>
  );
}
