/**
 * Step 5 (Optional) — Fastie Client Alias Mapping
 * Allows adding one or more fastie_client_name values for the client being onboarded.
 * These get inserted into public.fastie_client_alias_mapping.
 * This step is optional — can be skipped if not applicable.
 */

import { useState } from "react";
import { Panel, PanelHeader, PanelBody, Button, Badge } from "../ui";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface Props {
  aliases: string[];
  setAliases: (v: string[]) => void;
  clientName: string;
  error: string | null;
}

export default function StepFastieAlias({ aliases, setAliases, clientName, error }: Props) {
  const [input, setInput] = useState("");

  const addAlias = () => {
    const val = input.trim();
    if (!val) return;
    if (aliases.includes(val)) return; // no duplicates
    setAliases([...aliases, val]);
    setInput("");
  };

  const removeAlias = (index: number) => {
    setAliases(aliases.filter((_, i) => i !== index));
  };

  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">5</span> Fastie Aliases
        <Badge variant="warning" className="mapper-badge">
          Optional
        </Badge>
        {aliases.length > 0 && (
          <Badge variant="info">
            {aliases.length} alias{aliases.length !== 1 ? "es" : ""}
          </Badge>
        )}
      </PanelHeader>
      <PanelBody>
        <p className="onboarding-hint onboarding-hint--top">
          Add Fastie client alias names for <strong>{clientName || "(client)"}</strong>. Skip this step if not
          applicable.
        </p>

        {/* Add alias input */}
        <div className="beid-bulk-row">
          <div className="beid-bulk-input beid-bulk-input--wide">
            <label htmlFor="fastie-alias-input">Fastie Client Name:</label>
            <input
              id="fastie-alias-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAlias();
                }
              }}
              placeholder="Enter fastie client alias name"
              maxLength={255}
            />
          </div>
          <Button size="sm" variant="primary" onClick={addAlias} disabled={!input.trim()}>
            <AddIcon sx={{ fontSize: 14 }} /> Add
          </Button>
        </div>

        {/* Alias list */}
        {aliases.length > 0 && (
          <div className="beid-mapping-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fastie Client Name</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {aliases.map((alias, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <code>{alias}</code>
                    </td>
                    <td>
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td>
                      <Button size="icon" variant="ghost" onClick={() => removeAlias(idx)}>
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <div className="onboarding-field-error">{error}</div>}
      </PanelBody>
    </Panel>
  );
}
