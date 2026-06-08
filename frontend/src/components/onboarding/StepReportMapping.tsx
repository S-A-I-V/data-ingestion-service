/**
 * Step 4 — Report Mapping
 * Fetches available reports from report_definitions.
 * User selects which reports to map to the new client.
 * Features:
 *   - Application filter chips (multi-select)
 *   - Text search filter
 *   - Full report names (no truncation)
 *   - Pannable dagre graph visualization
 */

import { useState, useMemo } from "react";
import { Panel, PanelHeader, PanelBody, Badge, Button, Spinner } from "../ui";
import ReportGraph from "./ReportGraph";
import SearchIcon from "@mui/icons-material/Search";

export interface ReportDef {
  report_id: number;
  report_name: string;
  application_name: string;
  is_fastie: boolean | null;
}

interface Props {
  reports: ReportDef[];
  reportsLoading: boolean;
  selectedReportIds: number[];
  setSelectedReportIds: (v: number[]) => void;
  clientName: string;
  error: string | null;
}

export default function StepReportMapping({
  reports,
  reportsLoading,
  selectedReportIds,
  setSelectedReportIds,
  clientName,
  error,
}: Props) {
  const [search, setSearch] = useState("");
  const [activeApps, setActiveApps] = useState<Set<string>>(new Set());

  // Unique application names for filter chips
  const allApps = useMemo(() => {
    const apps = new Set<string>();
    for (const r of reports) {
      apps.add(r.application_name || "Unknown");
    }
    return [...apps].sort();
  }, [reports]);

  const toggleApp = (app: string) => {
    setActiveApps((prev) => {
      const next = new Set(prev);
      if (next.has(app)) next.delete(app);
      else next.add(app);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = reports;
    // Filter by active app chips (if any selected)
    if (activeApps.size > 0) {
      list = list.filter((r) => activeApps.has(r.application_name || "Unknown"));
    }
    // Filter by search text
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.report_name.toLowerCase().includes(q) || r.application_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [reports, search, activeApps]);

  const toggleReport = (id: number) => {
    setSelectedReportIds(
      selectedReportIds.includes(id) ? selectedReportIds.filter((r) => r !== id) : [...selectedReportIds, id],
    );
  };

  const selectAll = () => setSelectedReportIds(filtered.map((r) => r.report_id));
  const selectNone = () => setSelectedReportIds([]);

  const selectedReports = reports.filter((r) => selectedReportIds.includes(r.report_id));

  // Group filtered results by application_name
  const grouped = useMemo(() => {
    const map = new Map<string, ReportDef[]>();
    for (const r of filtered) {
      const app = r.application_name || "Unknown";
      if (!map.has(app)) map.set(app, []);
      map.get(app)!.push(r);
    }
    return map;
  }, [filtered]);

  if (reportsLoading) {
    return <Spinner size="lg" label="Loading report definitions..." />;
  }

  return (
    <div className="onboarding-report-layout">
      {/* Report selection panel */}
      <Panel className="onboarding-report-list-panel">
        <PanelHeader>
          <span className="step-num">4</span> Report Mapping
          <Badge variant="info" className="mapper-badge onboarding-header-badge">
            {selectedReportIds.length}/{reports.length} selected
          </Badge>
          <Button size="sm" variant="danger" disabled={selectedReportIds.length === 0} onClick={selectNone}>
            Clear Selection
          </Button>
        </PanelHeader>
        <PanelBody>
          {/* Application filter chips */}
          <div className="onboarding-app-chips">
            {allApps.map((app) => (
              <button
                key={app}
                type="button"
                className={`onboarding-app-chip${activeApps.has(app) ? " active" : ""}`}
                onClick={() => toggleApp(app)}
              >
                {app}
              </button>
            ))}
          </div>

          {/* Search + actions */}
          <div className="onboarding-report-toolbar">
            <div className="onboarding-report-search">
              <SearchIcon sx={{ fontSize: 16, color: "var(--text-secondary)" }} />
              <input
                placeholder="Filter by report name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="onboarding-report-actions">
              <Button size="sm" variant="ghost" onClick={selectAll}>
                All
              </Button>
              <Button size="sm" variant="ghost" onClick={selectNone}>
                None
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!search && activeApps.size === 0}
                onClick={() => {
                  setSearch("");
                  setActiveApps(new Set());
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Report list */}
          <div className="onboarding-report-list">
            {[...grouped.entries()].map(([app, reps]) => (
              <div key={app} className="onboarding-report-group">
                <div className="onboarding-report-group-label">{app}</div>
                {reps.map((r) => (
                  <div
                    key={r.report_id}
                    className={`onboarding-report-item${selectedReportIds.includes(r.report_id) ? " active" : ""}`}
                    onClick={() => toggleReport(r.report_id)}
                  >
                    <span className="onboarding-report-name">{r.report_name}</span>
                    <span className="onboarding-report-id">#{r.report_id}</span>
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && <div className="onboarding-report-empty">No reports match your filter.</div>}
          </div>

          {error && <div className="onboarding-field-error">{error}</div>}
        </PanelBody>
      </Panel>

      {/* Visual mapping graph — React Flow */}
      {selectedReports.length > 0 && (
        <Panel className="onboarding-report-graph-panel">
          <PanelHeader>Mapping Preview</PanelHeader>
          <PanelBody>
            <ReportGraph key={selectedReportIds.join(",")} clientName={clientName} reports={selectedReports} />
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
