/**
 * Step 2 — Group Details
 * Collects group_name. Displays the auto-generated group_id.
 */

import { Panel, PanelHeader, PanelBody, FormRow } from "../ui";

interface Props {
  groupName: string;
  setGroupName: (v: string) => void;
  nextGroupId: number | null;
  error: string | null;
}

export default function StepGroupDetails({ groupName, setGroupName, nextGroupId, error }: Props) {
  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">2</span> Group Details
      </PanelHeader>
      <PanelBody>
        <div className="onboarding-inline-row">
          <FormRow label="Group ID (auto-assigned):" htmlFor="group-id">
            <input
              id="group-id"
              type="text"
              value={nextGroupId !== null ? String(nextGroupId) : "—"}
              disabled
              className="input-readonly"
              title="Auto-assigned group ID"
            />
          </FormRow>
          <FormRow label="Group Name:" htmlFor="group-name">
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onBlur={(e) => setGroupName(e.target.value.trim())}
              placeholder="Enter group name (e.g. Acme Group)"
              maxLength={200}
            />
          </FormRow>
        </div>
        {error && <div className="onboarding-field-error">{error}</div>}
        <p className="onboarding-hint">This group will be linked to the client above via client_groups.</p>
      </PanelBody>
    </Panel>
  );
}
