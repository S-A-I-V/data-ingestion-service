/**
 * Step 3 — BEID & Org Mapping
 * Collects business entity IDs (comma-separated) and org_id.
 * Each BEID gets mapped to both the client_id and the org_id.
 */

import { useState } from "react";
import { Panel, PanelHeader, PanelBody, FormRow, Badge } from "../ui";

interface Props {
  beids: number[];
  setBeids: (v: number[]) => void;
  orgId: string;
  setOrgId: (v: string) => void;
  clientName: string;
  error: string | null;
}

export default function StepBeidMapping({ beids, setBeids, orgId, setOrgId, clientName, error }: Props) {
  const [beidInput, setBeidInput] = useState(beids.join(", "));

  const handleBeidChange = (raw: string) => {
    setBeidInput(raw);
    // Parse comma-separated values only
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && /^\d+$/.test(s))
      .map(Number)
      .filter((n) => n > 0);
    setBeids(parsed);
  };

  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">3</span> Business Entity Mapping
      </PanelHeader>
      <PanelBody>
        <div className="onboarding-inline-row">
          <FormRow label="Business Entity IDs:" htmlFor="beid-input">
            <input
              id="beid-input"
              type="text"
              value={beidInput}
              onChange={(e) => handleBeidChange(e.target.value)}
              placeholder="Enter BEIDs separated by commas (e.g. 1001, 1002, 1003)"
            />
          </FormRow>
          <FormRow label="Org ID:" htmlFor="org-id">
            <input
              id="org-id"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="Enter organization ID"
              maxLength={100}
            />
          </FormRow>
        </div>
        {beids.length > 0 && (
          <div className="onboarding-beid-preview">
            <span className="onboarding-beid-count">
              {beids.length} BEID{beids.length !== 1 ? "s" : ""} parsed:
            </span>
            <div className="onboarding-beid-chips">
              {beids.slice(0, 20).map((b) => (
                <Badge key={b} variant="info">
                  {b}
                </Badge>
              ))}
              {beids.length > 20 && <Badge variant="warning">+{beids.length - 20} more</Badge>}
            </div>
          </div>
        )}

        {error && <div className="onboarding-field-error">{error}</div>}

        <p className="onboarding-hint">
          Each BEID will be mapped to client <strong>{clientName || "(unnamed)"}</strong> and org{" "}
          <strong>{orgId || "(id)"}</strong>
        </p>
      </PanelBody>
    </Panel>
  );
}
