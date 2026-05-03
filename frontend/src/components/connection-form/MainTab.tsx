import { motion } from "framer-motion";
import type { ConnectionForm } from "../../types";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
  connectBy: "host" | "url";
  setConnectBy: (v: "host" | "url") => void;
}

export default function MainTab({ form, setForm, connectBy, setConnectBy }: Props) {
  return (
    <>
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
                onBlur={(e) => {
                  // Auto-parse if user pastes a full host string like "host:5432/dbname"
                  const raw = e.target.value.trim().replace(/[/:]+$/, ""); // strip trailing : or /
                  const match = raw.match(/^([^:/]+)(?::(\d+))?(?:\/(.+))?$/);
                  if (match) {
                    const [, parsedHost, parsedPort, parsedDb] = match;
                    setForm({
                      ...form,
                      host: parsedHost,
                      ...(parsedPort ? { port: parseInt(parsedPort, 10) } : {}),
                      ...(parsedDb ? { database: parsedDb } : {}),
                    });
                  }
                }}
                placeholder="localhost"
              />
              <span className="input-hint">Port</span>
              <input
                className="input-short"
                type="number"
                value={form.port || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setForm({ ...form, port: isNaN(val) ? 0 : val });
                }}
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
