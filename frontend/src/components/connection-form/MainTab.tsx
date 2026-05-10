import type { ConnectionForm } from "../../types";
import { FormRow, Input } from "../ui";

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
      <FormRow label="Connect by:">
        <div className="input-group">
          <label className="radio-label">
            <input type="radio" name="cby" checked={connectBy === "host"} onChange={() => setConnectBy("host")} /> Host
          </label>
          <label className="radio-label">
            <input type="radio" name="cby" checked={connectBy === "url"} onChange={() => setConnectBy("url")} /> URL
          </label>
        </div>
      </FormRow>
      {connectBy === "url" ? (
        <FormRow label="URL:">
          <Input
            value={form.jdbc_url}
            onChange={(e) => setForm({ ...form, jdbc_url: e.target.value })}
            placeholder={`jdbc:${form.db_type}://host:${form.port}/db`}
          />
        </FormRow>
      ) : (
        <>
          <FormRow label="Name:">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Database"
            />
          </FormRow>
          <FormRow label="Host:">
            <div className="input-group">
              <Input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                onBlur={(e) => {
                  const raw = e.target.value.trim().replace(/[/:]+$/, "");
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
              <Input
                short
                type="number"
                value={form.port || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setForm({ ...form, port: isNaN(val) ? 0 : val });
                }}
                placeholder="Port"
              />
            </div>
          </FormRow>
          <FormRow label="Database:">
            <Input
              value={form.database}
              onChange={(e) => setForm({ ...form, database: e.target.value })}
              placeholder="my_database"
            />
          </FormRow>
        </>
      )}
      <div className="form-section">Authentication</div>
      <FormRow label="Username:">
        <Input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="db_user"
        />
      </FormRow>
      <FormRow label="Password:">
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••••"
        />
      </FormRow>
    </>
  );
}
