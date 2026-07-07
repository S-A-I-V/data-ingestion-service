/**
 * ReportSelector — Selection phase for choosing a report to live-edit.
 * Uses 2-column layout with vertical step timeline sidebar (same as Data Transfer).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../ui";
import Highlight from "../ui/Highlight";
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
  currentStep?: number;
}

export default function ReportSelector({ reports, reportsLoading, onSelect, currentStep = 0 }: ReportSelectorProps) {
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
    <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
      {/* LEFT SIDEBAR — Step Timeline */}
      <aside className="lf-sidebar-left">
        <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="sidebar-card-title">
              <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">
                Steps
              </h2>
            </div>
            <div className="step-progress-vertical" style={{ flex: 1 }}>
              {LIVE_EDIT_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <div key={idx} className={`step-v-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}>
                    <div className="step-v-circle">{isDone ? "✓" : <span>{idx + 1}</span>}</div>
                    <div className="step-v-label">
                      <span className="step-v-title">{step.label}</span>
                      <span className="step-v-desc">{step.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER CONTENT */}
      <main className="lf-main">
        <div style={{ width: "100%" }}>
          <div className="toolbar">
            <span className="toolbar-title">
              <Highlight>Edit Existing Report Mapping</Highlight>
            </span>
            <span className="toolbar-subtitle">Select a report to edit its job mapping directly on NFC Prod.</span>
            <div className="toolbar-spacer" />
            <button type="button" className="btn btn-sm" onClick={() => navigate("/admin/report-mapping")}>
              <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back
            </button>
          </div>

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
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => onSelect(r)}>
                    Select & Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
