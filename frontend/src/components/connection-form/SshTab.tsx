import type { ConnectionForm } from "../../types";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
}

export default function SshTab({ form, setForm }: Props) {
  return (
    <>
      <div className="form-section">SSH Tunnel</div>
      <div className="form-row">
        <label>Enable:</label>
        <input
          type="checkbox"
          checked={form.ssh_enabled}
          onChange={(e) => setForm({ ...form, ssh_enabled: e.target.checked })}
          title="Enable SSH"
        />
      </div>
      {form.ssh_enabled && (
        <>
          <div className="form-row">
            <label>SSH Host:</label>
            <div className="input-group">
              <input
                value={form.ssh_host}
                onChange={(e) => setForm({ ...form, ssh_host: e.target.value })}
                placeholder="bastion.example.com"
              />
              <span className="input-hint">Port</span>
              <input
                className="input-short"
                type="number"
                value={form.ssh_port}
                onChange={(e) => setForm({ ...form, ssh_port: +e.target.value })}
                placeholder="Port"
              />
            </div>
          </div>
          <div className="form-row">
            <label>SSH User:</label>
            <input
              value={form.ssh_username}
              onChange={(e) => setForm({ ...form, ssh_username: e.target.value })}
              placeholder="ssh_user"
            />
          </div>
          <div className="form-row">
            <label>SSH Pass:</label>
            <input
              type="password"
              value={form.ssh_password}
              onChange={(e) => setForm({ ...form, ssh_password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </>
      )}
    </>
  );
}
