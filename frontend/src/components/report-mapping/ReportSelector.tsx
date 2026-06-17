/**
 * ReportSelector — Selection phase for choosing a report to live-edit.
 * Displays a searchable/filterable grid of existing reports.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "../ui";
import StepProgress from "../onboarding/StepProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { LIVE_EDIT_STEPS, TOOLBAR_ICON_SIZE_PX } from "../../constants/reportMapping";

interface ExistingReport {
  report_id: number;
  report_name: string;
  application_name: string;
  job_count: number;
}

interface ReportSelectorProps {
  reports: ExistingReport[];
  reportsLoading: boolean;
  onSelect: (report: ExistingReport) => void;
}

export default function ReportSelector({ reports, reportsLoading, onSelect }: ReportSelectorProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("");

  const appNames = [...new Set(reports.map((r) => r.application_name).filter(Boolean))].sort();

  const filtered = reports.filter((r) => {
    const matchesSearch =
      !search ||
      r.report_name.toLowerCase().includes(search.toLowerCase()) ||
      r.application_name.toLowerCase().includes(search.toLowerCase());
    const matchesApp = !appFilter || r.application_name === appFilter;
    return matchesSearch && matchesApp;
  });

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">Edit Existing Report Mapping</span>
        <div className="toolbar-spacer" />
        <Button size="sm" onClick={() => navigate("/admin/report-mapping")}>
          <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back
        </Button>
      </div>

      <StepProgress steps={LIVE_EDIT_STEPS} currentStep={0} onStepClick={() => {}} skippedSteps={new Set()} />

      <p className="rm-selector-description">Select a report to edit its job mapping directly on NFC Prod.</p>

      <div className="rm-filter-bar">
        <input
          type="text"
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rm-filter-search"
        />
        <div className="rm-filter-chips">
          <button
            type="button"
            className={`rm-filter-chip ${!appFilter ? "active" : ""}`}
            onClick={() => setAppFilter("")}
          >
            All
          </button>
          {appNames.map((app) => (
            <button
              type="button"
              key={app}
              className={`rm-filter-chip ${appFilter === app ? "active" : ""}`}
              onClick={() => setAppFilter(appFilter === app ? "" : app)}
            >
              {app}
            </button>
          ))}
        </div>
      </div>

      {reportsLoading ? (
        <Spinner size="lg" label="Loading reports..." />
      ) : (
        <div className="rm-grid">
          {filtered.map((r) => (
            <div key={`${r.report_id}-${r.application_name}`} className="rm-card">
              <div className="rm-card-header">
                <h4>{r.report_name}</h4>
              </div>
              <span className="rm-card-chip">{r.application_name}</span>
              <div className="rm-card-stats">
                <span>{r.job_count} jobs</span>
              </div>
              <Button size="sm" variant="primary" onClick={() => onSelect(r)}>
                Select & Edit
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
