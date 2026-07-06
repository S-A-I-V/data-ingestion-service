import type { ConnectionForm } from "../../types";
import { FormRow } from "../ui/FormRow";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
}

export default function SslTab({ form, setForm }: Props) {
  return (
    <>
      <div className="form-section">SSL / TLS</div>
      <FormRow label="Use SSL:">
        <input
          type="checkbox"
          checked={form.use_ssl}
          onChange={(e) => setForm({ ...form, use_ssl: e.target.checked })}
          title="Enable SSL"
          style={{ flex: "none" }}
        />
        {form.use_ssl && (
          <span className="form-hint" style={{ margin: 0, flex: "none" }}>
            TLS encryption enabled.
          </span>
        )}
      </FormRow>
    </>
  );
}
