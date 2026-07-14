/**
 * ReportSlaPicker — Modal dialog for selecting a report and converting its SLA to job format.
 *
 * Flow: Select report → Click "Convert" → Policies loaded → Dialog closes.
 */

import { useState, useEffect } from "react";
import api from "../../api";
import SearchableSelect from "./SearchableSelect";

interface ReportOption {
  report_id: number;
  report_name: string;
  application_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPoliciesLoaded: (policies: any[]) => void;
}

export default function ReportSlaPicker({ open, onClose, onPoliciesLoaded }: Props) {
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [includeWeekends, setIncludeWeekends] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setSelectedReportId("");
    api
      .get("/admin/job-onboarding/report-sla-options")
      .then((r) => setReports(r.data.reports || []))
      .catch(() => setError("Failed to load reports"))
      .finally(() => setLoading(false));
  }, [open]);

  const handleConvert = async () => {
    const id = Number(selectedReportId);
    if (!id) return;
    setConverting(true);
    setError("");
    try {
      const res = await api.get(`/admin/job-onboarding/report-sla/${id}/convert`, {
        params: { include_weekends: includeWeekends },
      });
      onPoliciesLoaded(res.data.job_sla_policies || []);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  if (!open) return null;

  const selectedLabel = reports.find((r) => String(r.report_id) === selectedReportId);

  return (
    <div className="confirm-dialog-overlay" onClick={converting ? undefined : onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, textAlign: "left" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Copy SLA from Report</h3>
        <p className="onboarding-hint" style={{ marginTop: 0, marginBottom: 16 }}>
          Select a report to auto-generate job SLA policies from its delivery schedule.
        </p>

        {error && (
          <div className="onboarding-field-error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <SearchableSelect
          options={reports.map((r) => ({
            value: String(r.report_id),
            label: `${r.report_name} — ${r.application_name}`,
          }))}
          value={selectedReportId}
          onChange={(v) => setSelectedReportId(v)}
          placeholder={loading ? "Loading reports..." : "Search reports..."}
          loading={loading}
        />

        {selectedLabel && (
          <p className="onboarding-hint" style={{ marginTop: 10, marginBottom: 0 }}>
            Selected: <strong>{selectedLabel.report_name}</strong> ({selectedLabel.application_name})
          </p>
        )}

        <label
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 12, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={includeWeekends}
            onChange={(e) => setIncludeWeekends(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: "var(--accent)" }}
          />
          Include weekends (Saturday & Sunday)
        </label>

        {/* Footer: Cancel left, Convert right */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="btn btn-sm" onClick={onClose} disabled={converting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleConvert}
            disabled={!selectedReportId || converting}
          >
            {converting ? "Converting..." : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}
