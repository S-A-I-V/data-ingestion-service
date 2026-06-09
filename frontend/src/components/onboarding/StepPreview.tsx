/**
 * Step 5 — Preview & Confirm
 * Shows data in the exact order the user filled it:
 *   1. Client & Group details (inline grid)
 *   2. BEID & Org mapping
 *   3. Report mapping table
 *   4. Transaction summary table + SQL preview
 */

import { Panel, PanelHeader, PanelBody, Badge } from "../ui";
import type { ReportDef } from "./StepReportMapping";
import type { BeidOrgMapping } from "./StepBeidMapping";

interface Props {
  clientName: string;
  groupName: string;
  nextClientId: number | null;
  nextGroupId: number | null;
  beidMappings: BeidOrgMapping[];
  selectedReports: ReportDef[];
  fastieAliases: string[];
}

export default function StepPreview({
  clientName,
  groupName,
  nextClientId,
  nextGroupId,
  beidMappings,
  selectedReports,
  fastieAliases,
}: Props) {
  const totalStatements = 3 + beidMappings.length * 2 + selectedReports.length + fastieAliases.length;

  // Transaction summary rows with full SQL
  const txnSummary = [
    {
      table: "client_details",
      operation: "INSERT",
      rows: 1,
      sql: `INSERT INTO client_details(client_id, client_name, id, created_by, created_at, updated_at, updated_by) VALUES(${nextClientId}, '${clientName}', gen_random_uuid(), 'NFC_Team', now(), now(), 'NFC_Team')`,
    },
    {
      table: "groups",
      operation: "INSERT",
      rows: 1,
      sql: `INSERT INTO "groups"(group_id, group_name, created_at, updated_at, created_by, updated_by) VALUES(${nextGroupId}, '${groupName}', now(), now(), 'NFC_Team', 'NFC_Team')`,
    },
    {
      table: "client_groups",
      operation: "INSERT",
      rows: 1,
      sql: `INSERT INTO client_groups(group_id, client_id, created_at, updated_at, created_by, updated_by) VALUES(${nextGroupId}, ${nextClientId}, now(), now(), 'NFC_Team', 'NFC_Team')`,
    },
    {
      table: "business_entity_client_mapping",
      operation: "INSERT",
      rows: beidMappings.length,
      sql: `INSERT INTO business_entity_client_mapping(business_entity_id, client_id, ...) VALUES(<beid>, ${nextClientId}, ...) -- ×${beidMappings.length}`,
    },
    {
      table: "business_entity_org_mapping",
      operation: "INSERT",
      rows: beidMappings.length,
      sql: `INSERT INTO business_entity_org_mapping(business_entity_id, org_id, ...) VALUES(<beid>, <per-beid org_id>, ...) -- ×${beidMappings.length}`,
    },
    {
      table: "client_report_mapping",
      operation: "INSERT",
      rows: selectedReports.length,
      sql: `INSERT INTO client_report_mapping(client_id, report_name, application_name, report_id, id, ...) VALUES(${nextClientId}, <name>, <app>, <id>, gen_random_uuid(), ...) -- ×${selectedReports.length}`,
    },
    ...(fastieAliases.length > 0
      ? [
          {
            table: "fastie_client_alias_mapping",
            operation: "INSERT",
            rows: fastieAliases.length,
            sql: `INSERT INTO fastie_client_alias_mapping(client_id, fastie_client_name, is_active, ...) VALUES(${nextClientId}, <alias>, true, ...) -- ×${fastieAliases.length}`,
          },
        ]
      : []),
  ];

  return (
    <div className="onboarding-preview">
      <Panel>
        <PanelHeader>
          <span className="step-num">5</span> Review & Confirm
        </PanelHeader>
        <PanelBody>
          {/* All key fields in one row */}
          <div className="preview-info-row">
            <div className="preview-info-cell preview-info-cell--short">
              <span className="preview-info-label">Client ID</span>
              <span className="preview-info-value">{nextClientId ?? "—"}</span>
            </div>
            <div className="preview-info-cell">
              <span className="preview-info-label">Client Name</span>
              <span className="preview-info-value">{clientName}</span>
            </div>
            <div className="preview-info-cell preview-info-cell--short">
              <span className="preview-info-label">Group ID</span>
              <span className="preview-info-value">{nextGroupId ?? "—"}</span>
            </div>
            <div className="preview-info-cell">
              <span className="preview-info-label">Group Name</span>
              <span className="preview-info-value">{groupName}</span>
            </div>
            <div className="preview-info-cell">
              <span className="preview-info-label">BEIDs ({beidMappings.length})</span>
              <div className="preview-beid-chips">
                {beidMappings.map((m) => (
                  <Badge key={m.beid} variant="info">
                    {m.beid}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="preview-info-cell preview-info-cell--short">
              <span className="preview-info-label">Org IDs</span>
              <div className="preview-beid-chips">
                {[...new Set(beidMappings.map((m) => m.org_id))].map((oid) => (
                  <Badge key={oid} variant="info">
                    {oid}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Report Mapping Table */}
          <div className="preview-section-compact">
            <span className="preview-section-label">Report Mapping ({selectedReports.length} reports)</span>
            <div className="preview-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Application</th>
                    <th>Report ID</th>
                    <th>Mapped to Client</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReports.map((r) => (
                    <tr key={r.report_id}>
                      <td>{r.report_name}</td>
                      <td>{r.application_name}</td>
                      <td>{r.report_id}</td>
                      <td>{nextClientId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Fastie Aliases (if any) */}
          {fastieAliases.length > 0 && (
            <div className="preview-section-compact">
              <span className="preview-section-label">Fastie Client Aliases ({fastieAliases.length})</span>
              <div className="preview-beid-chips">
                {fastieAliases.map((alias) => (
                  <Badge key={alias} variant="warning">
                    {alias}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Transaction Summary with inline SQL */}
          <div className="preview-section-compact">
            <span className="preview-section-label">Transaction Summary</span>
            <div className="preview-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Operation</th>
                    <th>Rows</th>
                    <th>SQL Query</th>
                  </tr>
                </thead>
                <tbody>
                  {txnSummary.map((t) => (
                    <tr key={t.table}>
                      <td>
                        <code>{t.table}</code>
                      </td>
                      <td>
                        <Badge variant="info">{t.operation}</Badge>
                      </td>
                      <td>{t.rows}</td>
                      <td>
                        <code className="preview-sql-inline">{t.sql}</code>
                      </td>
                    </tr>
                  ))}
                  <tr className="preview-txn-total">
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td></td>
                    <td>
                      <strong>{totalStatements}</strong>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
