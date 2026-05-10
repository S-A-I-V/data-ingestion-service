import type { ConnectionForm } from "../../types";
import { FormRow, Input } from "../ui";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
}

export default function SshTab({ form, setForm }: Props) {
  return (
    <>
      <div className="form-section">SSH Tunnel</div>
      <FormRow label="Enable:">
        <input
          type="checkbox"
          checked={form.ssh_enabled}
          onChange={(e) => setForm({ ...form, ssh_enabled: e.target.checked })}
          title="Enable SSH"
        />
      </FormRow>
      {form.ssh_enabled && (
        <>
          <FormRow label="SSH Host:">
            <div className="input-group">
              <Input
                value={form.ssh_host}
                onChange={(e) => setForm({ ...form, ssh_host: e.target.value })}
                placeholder="bastion.example.com"
              />
              <span className="input-hint">Port</span>
              <Input
                short
                type="number"
                value={form.ssh_port}
                onChange={(e) => setForm({ ...form, ssh_port: +e.target.value })}
                placeholder="Port"
              />
            </div>
          </FormRow>
          <FormRow label="SSH User:">
            <Input
              value={form.ssh_username}
              onChange={(e) => setForm({ ...form, ssh_username: e.target.value })}
              placeholder="ssh_user"
            />
          </FormRow>
          <FormRow label="SSH Pass:">
            <Input
              type="password"
              value={form.ssh_password}
              onChange={(e) => setForm({ ...form, ssh_password: e.target.value })}
              placeholder="••••••••"
            />
          </FormRow>
        </>
      )}
    </>
  );
}
