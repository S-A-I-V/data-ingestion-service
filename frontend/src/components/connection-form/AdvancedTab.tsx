import type { ConnectionForm } from "../../types";
import { FormRow, Input } from "../ui";

interface Props {
  form: ConnectionForm;
  setForm: (f: ConnectionForm) => void;
}

export default function AdvancedTab({ form, setForm }: Props) {
  return (
    <>
      <div className="form-section">Options</div>
      <FormRow label="Timeout (s):">
        <Input
          short
          type="number"
          value={form.connection_timeout}
          onChange={(e) => setForm({ ...form, connection_timeout: +e.target.value })}
          placeholder="30"
        />
      </FormRow>
    </>
  );
}
