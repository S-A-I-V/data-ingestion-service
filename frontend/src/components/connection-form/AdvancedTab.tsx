import type { ConnectionForm } from "../../types";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
}

export default function AdvancedTab({ form, setForm }: Props) {
  return (
    <>
      <div className="form-section">Options</div>
      <div className="form-row">
        <label>Timeout (s):</label>
        <input
          className="input-short"
          type="number"
          value={form.connection_timeout}
          onChange={(e) => setForm({ ...form, connection_timeout: +e.target.value })}
          placeholder="30"
        />
      </div>
    </>
  );
}
