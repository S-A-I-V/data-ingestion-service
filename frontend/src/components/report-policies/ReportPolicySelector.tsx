/**
 * ReportPolicySelector — Step 0: searchable/filterable grid of reports.
 */
import { useState } from "react";
import { Spinner } from "../ui";
import type { ReportDef } from "../../types/reportPolicies";

interface Props {
  reports: ReportDef[];
  loading: boolean;
  onSelect: (report: ReportDef) => void;
}

export default function ReportPolicySelector({ reports, loading, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("");

  const appNames = [...new Set(reports.map((r) => r.application_name).filter(Boolean))].sort();
  const filtered = reports.filter((r) => {
    const matchesSearch = !search || r.report_name.toLowerCase().includes(search.toLowerCase());
    const matchesApp = !appFilter || r.application_name === appFilter;
    return matchesSearch && matchesApp;
  });

  return (
    <>
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
      {loading ? (
        <Spinner size="lg" label="Loading reports..." />
      ) : (
        <div className="rm-grid">
          {filtered.map((r) => (
            <div key={r.report_id} className="rm-card">
              <div className="rm-card-header">
                <h4>{r.report_name}</h4>
              </div>
              <span className="rm-card-chip">{r.application_name}</span>
              {r.is_fastie && <span className="status-pill status-pill--warning">Fastie</span>}
              <button type="button" className="btn btn-sm btn-primary" onClick={() => onSelect(r)}>
                View Policies
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
