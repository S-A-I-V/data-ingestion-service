/**
 * Step 3 — BEID & Org Mapping
 * Each BEID can have its own org_id.
 * Supports: add rows individually, or bulk-add BEIDs with a default org.
 */

import { useState } from "react";
import { Panel, PanelHeader, PanelBody, Button, Badge } from "../ui";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export interface BeidOrgMapping {
  beid: number;
  org_id: string;
}

interface Props {
  mappings: BeidOrgMapping[];
  setMappings: (v: BeidOrgMapping[]) => void;
  clientName: string;
  error: string | null;
}

export default function StepBeidMapping({ mappings, setMappings, clientName, error }: Props) {
  const [bulkBeids, setBulkBeids] = useState("");
  const [defaultOrgId, setDefaultOrgId] = useState("");

  const addBulk = () => {
    const parsed = bulkBeids
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && /^\d+$/.test(s))
      .map(Number)
      .filter((n) => n > 0);

    if (parsed.length === 0) return;

    const orgToUse = defaultOrgId.replace(/\s/g, "");
    const newMappings = parsed
      .filter((beid) => !mappings.some((m) => m.beid === beid))
      .map((beid) => ({ beid, org_id: orgToUse }));

    setMappings([...mappings, ...newMappings]);
    setBulkBeids("");
  };

  const updateOrgId = (index: number, org_id: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], org_id: org_id.replace(/\s/g, "") };
    setMappings(updated);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const clearAll = () => setMappings([]);

  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">3</span> Business Entity Mapping
        <Badge variant="info" className="mapper-badge">
          {mappings.length} BEID{mappings.length !== 1 ? "s" : ""}
        </Badge>
        {mappings.length > 0 && (
          <Button size="sm" variant="danger" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </PanelHeader>
      <PanelBody>
        {/* Bulk add section */}
        <div className="beid-bulk-row">
          <div className="beid-bulk-input">
            <label htmlFor="bulk-beids">BEIDs (comma-separated):</label>
            <input
              id="bulk-beids"
              type="text"
              value={bulkBeids}
              onChange={(e) => setBulkBeids(e.target.value.replace(/[^0-9, ]/g, ""))}
              placeholder="1001, 1002, 1003"
            />
          </div>
          <div className="beid-bulk-input">
            <label htmlFor="default-org">Default Org ID:</label>
            <input
              id="default-org"
              type="text"
              value={defaultOrgId}
              onChange={(e) => setDefaultOrgId(e.target.value.replace(/\s/g, ""))}
              placeholder="org_id for all above"
            />
          </div>
          <Button size="sm" variant="primary" onClick={addBulk} disabled={!bulkBeids.trim()}>
            <AddIcon sx={{ fontSize: 14 }} /> Add
          </Button>
        </div>

        {/* Mapping table */}
        {mappings.length > 0 && (
          <div className="beid-mapping-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>BEID</th>
                  <th>Org ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <code>{m.beid}</code>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="beid-org-inline-input"
                        value={m.org_id}
                        onChange={(e) => updateOrgId(idx, e.target.value)}
                        placeholder="Enter org ID"
                      />
                    </td>
                    <td>
                      <Button size="icon" variant="ghost" onClick={() => removeMapping(idx)}>
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

        <p className="onboarding-hint">
          Each BEID will be mapped to client <strong>{clientName || "(unnamed)"}</strong> with its own org ID.
        </p>
      </PanelBody>
    </Panel>
  );
}
