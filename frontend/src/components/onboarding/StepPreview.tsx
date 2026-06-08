/**
 * Step 5 — Preview & Confirm
 * Shows a summary of all data to be inserted before final execution.
 */

import { Panel, PanelHeader, PanelBody, Badge } from "../ui";
import type { ReportDef } from "./StepReportMapping";

interface Props {
  clientName: string;
  groupName: string;
  nextClientId: number | null;
  nextGroupId: number | null;
  beids: number[];
  orgId: string;
  selectedReports: ReportDef[];
}

export default function StepPreview({
  clientName,
  groupName,
  nextClientId,
  nextGroupId,
  beids,
  orgId,
  selectedReports,
}: Props) {
  const totalStatements = 3 + beids.length * 2 + selectedReports.length;

  return (
    <div className="onboarding-preview">
      <Panel>
        <PanelHeader>
          <span className="step-num">5</span> Review & Confirm
        </PanelHeader>
        <PanelBody>
          <p className="onboarding-preview-intro">
            Review the onboarding details below. On confirm, <strong>{totalStatements} SQL statements</strong> will
            execute in a single atomic transaction.
          </p>

          {/* Client & Group */}
          <div className="onboarding-preview-section">
            <h4 className="onboarding-preview-section-title">Client & Group</h4>
            <div className="onboarding-preview-grid">
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">Client ID</span>
                <span className="onboarding-preview-value">{nextClientId ?? "—"}</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">Client Name</span>
                <span className="onboarding-preview-value">{clientName}</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">Group ID</span>
                <span className="onboarding-preview-value">{nextGroupId ?? "—"}</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">Group Name</span>
                <span className="onboarding-preview-value">{groupName}</span>
              </div>
            </div>
          </div>

          {/* BEID Mapping */}
          <div className="onboarding-preview-section">
            <h4 className="onboarding-preview-section-title">
              Business Entity Mapping
              <Badge variant="info">{beids.length} BEIDs</Badge>
            </h4>
            <div className="onboarding-preview-row">
              <span className="onboarding-preview-label">Org ID</span>
              <span className="onboarding-preview-value">{orgId}</span>
            </div>
            <div className="onboarding-beid-chips onboarding-preview-chips">
              {beids.slice(0, 30).map((b) => (
                <Badge key={b} variant="info">
                  {b}
                </Badge>
              ))}
              {beids.length > 30 && <Badge variant="warning">+{beids.length - 30} more</Badge>}
            </div>
          </div>

          {/* Report Mapping */}
          <div className="onboarding-preview-section">
            <h4 className="onboarding-preview-section-title">
              Report Mapping
              <Badge variant="info">{selectedReports.length} reports</Badge>
            </h4>
            <div className="onboarding-preview-report-list">
              {selectedReports.map((r) => (
                <div key={r.report_id} className="onboarding-preview-report-item">
                  <span className="onboarding-preview-report-name">{r.report_name}</span>
                  <span className="onboarding-preview-report-app">{r.application_name}</span>
                  <Badge>#{r.report_id}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* SQL Summary */}
          <div className="onboarding-preview-section">
            <h4 className="onboarding-preview-section-title">Transaction Summary</h4>
            <div className="onboarding-preview-grid">
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">INSERT client_details</span>
                <span className="onboarding-preview-value">1</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">INSERT groups</span>
                <span className="onboarding-preview-value">1</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">INSERT client_groups</span>
                <span className="onboarding-preview-value">1</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">INSERT business_entity_client_mapping</span>
                <span className="onboarding-preview-value">{beids.length}</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">INSERT business_entity_org_mapping</span>
                <span className="onboarding-preview-value">{beids.length}</span>
              </div>
              <div className="onboarding-preview-row">
                <span className="onboarding-preview-label">INSERT client_report_mapping</span>
                <span className="onboarding-preview-value">{selectedReports.length}</span>
              </div>
              <div className="onboarding-preview-row onboarding-preview-total">
                <span className="onboarding-preview-label">Total Statements</span>
                <span className="onboarding-preview-value">{totalStatements}</span>
              </div>
            </div>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
