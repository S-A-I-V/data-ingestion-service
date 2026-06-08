/**
 * Step 1 — Client Details
 * Collects client_name. Displays the auto-generated client_id.
 */

import { Panel, PanelHeader, PanelBody, FormRow } from "../ui";

interface Props {
  clientName: string;
  setClientName: (v: string) => void;
  nextClientId: number | null;
  error: string | null;
}

export default function StepClientDetails({ clientName, setClientName, nextClientId, error }: Props) {
  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">1</span> Client Details
      </PanelHeader>
      <PanelBody>
        <div className="onboarding-inline-row">
          <FormRow label="Client ID (auto-assigned):" htmlFor="client-id">
            <input
              id="client-id"
              type="text"
              value={nextClientId !== null ? String(nextClientId) : "Loading..."}
              disabled
              className="input-readonly"
              title="Auto-assigned client ID"
            />
          </FormRow>
          <FormRow label="Client Name:" htmlFor="client-name">
            <input
              id="client-name"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onBlur={(e) => setClientName(e.target.value.trim())}
              placeholder="Enter client name (e.g. Acme Corp)"
              maxLength={200}
            />
          </FormRow>
        </div>
        {error && <div className="onboarding-field-error">{error}</div>}
      </PanelBody>
    </Panel>
  );
}
