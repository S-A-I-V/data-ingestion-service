/**
 * ReportDetailView — Step 1: Report definition table (Field/Value).
 */
import type { ReportDef } from "../../types/reportPolicies";

interface Props {
  report: ReportDef;
  editMode: boolean;
  onReportChange: (field: string, value: string | boolean) => void;
}

export default function ReportDetailView({ report, editMode, onReportChange }: Props) {
  return (
    <div className="preview-table-wrap" style={{ marginBottom: 20 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Report ID</td>
            <td>
              <code>{report.report_id}</code>
            </td>
          </tr>
          <tr>
            <td>Report Name</td>
            <td>
              {editMode ? (
                <input
                  type="text"
                  defaultValue={report.report_name}
                  onChange={(e) => onReportChange("report_name", e.target.value)}
                  className="beid-org-inline-input"
                />
              ) : (
                report.report_name
              )}
            </td>
          </tr>
          <tr>
            <td>Application</td>
            <td>{report.application_name}</td>
          </tr>
          <tr>
            <td>Is Fastie</td>
            <td>
              {editMode ? (
                <input
                  type="checkbox"
                  defaultChecked={report.is_fastie}
                  onChange={(e) => onReportChange("is_fastie", e.target.checked)}
                />
              ) : report.is_fastie ? (
                "Yes"
              ) : (
                "No"
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
