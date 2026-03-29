import type { ConnectionForm } from "../../types";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
}

export default function SslTab({ form, setForm }: Props) {
  return (
    <>
      <div className="form-section">SSL / TLS</div>
      <div className="form-row">
        <label>Use SSL:</label>
        <input
          type="checkbox"
          checked={form.use_ssl}
          onChange={(e) => setForm({ ...form, use_ssl: e.target.checked })}
          title="Enable SSL"
        />
      </div>
      {form.use_ssl && <div className="form-hint">TLS encryption enabled.</div>}
    </>
  );
}
