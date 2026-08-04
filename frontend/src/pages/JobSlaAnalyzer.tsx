/**
 * JobSlaAnalyzer — Admin dashboard for analyzing job SLA compliance.
 *
 * Features:
 *   - Job selector in left sidebar
 *   - KPI cards showing 90-day compliance metrics
 *   - Tabbed interface: Overview, Heatmap, History, Artifacts, Proxy
 */

import RefreshIcon from "@mui/icons-material/Refresh";
import { Toast } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import { JobSelector } from "../components/job-sla/JobSelector";
import { KpiCards } from "../components/job-sla/KpiCards";
import { OverviewTab } from "../components/job-sla/tabs/OverviewTab";
import { HeatmapTab } from "../components/job-sla/tabs/HeatmapTab";
import { HistoryTab } from "../components/job-sla/tabs/HistoryTab";
import { ArtifactsTab } from "../components/job-sla/tabs/ArtifactsTab";
import { ProxyTab } from "../components/job-sla/tabs/ProxyTab";
import { useJobSlaData } from "../hooks/useJobSlaData";
import type { JobSlaTab } from "../types/jobSla";

/** UI labels */
const LABELS = {
  PAGE_TITLE: "Job SLA Analyzer",
  REFRESH: "Refresh",
  SELECT_JOB: "Select a job from the list to analyze its SLA compliance",
} as const;

export default function JobSlaAnalyzer() {
  const {
    toast,
    jobs,
    jobsLoading,
    jobsError,
    jobTypes,
    selectedJob,
    compliance,
    slaPolicies,
    summaryLoading,
    activeTab,
    setActiveTab,
    tabs,
    dayOfWeekSlaBars,
    weeklySlaBars,
    trendsLoading,
    calendarData,
    heatmapLoading,
    history,
    incidents,
    overrides,
    historyLoading,
    artifactDefs,
    artifactLiveState,
    artifactEvents,
    artifactsLoading,
    proxyRules,
    triggerRules,
    proxyLoading,
    handleSelectJob,
    handleRefresh,
  } = useJobSlaData();

  return (
    <>
      <Toast toast={toast} />
      <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
        {/* LEFT SIDEBAR */}
        <aside className="lf-sidebar-left">
          <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <JobSelector
              jobs={jobs}
              loading={jobsLoading}
              error={jobsError}
              selectedJobId={selectedJob?.job_id ?? null}
              onSelectJob={handleSelectJob}
              jobTypes={jobTypes}
            />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="lf-main">
          <div style={{ width: "100%" }}>
            <div className="toolbar">
              <span className="toolbar-title">
                <Highlight>{LABELS.PAGE_TITLE}</Highlight>
                {selectedJob && (
                  <>
                    <span style={{ margin: "0 0.5rem", opacity: 0.3 }}>/</span>
                    <Highlight>{selectedJob.job_name}</Highlight>
                  </>
                )}
              </span>
              <div className="toolbar-spacer" />
              <button type="button" className="btn btn-sm" onClick={handleRefresh}>
                <RefreshIcon sx={{ fontSize: 14 }} /> {LABELS.REFRESH}
              </button>
            </div>

            {selectedJob ? (
              <div className="js-analyzer-content">
                <KpiCards compliance={compliance} loading={summaryLoading} />

                <div className="js-tabs">
                  <div className="js-tab-list">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`js-tab-btn ${activeTab === tab.id ? "js-tab-btn--active" : ""}`}
                        onClick={() => setActiveTab(tab.id as JobSlaTab)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="js-tab-content">
                    {activeTab === "overview" && (
                      <OverviewTab
                        slaPolicies={slaPolicies}
                        dayOfWeekSlaBars={dayOfWeekSlaBars}
                        weeklySlaBars={weeklySlaBars}
                        loading={trendsLoading}
                      />
                    )}
                    {activeTab === "heatmap" && <HeatmapTab calendarData={calendarData} loading={heatmapLoading} />}
                    {activeTab === "history" && (
                      <HistoryTab
                        history={history}
                        incidents={incidents}
                        overrides={overrides}
                        loading={historyLoading}
                      />
                    )}
                    {activeTab === "artifacts" && (
                      <ArtifactsTab
                        definitions={artifactDefs}
                        liveState={artifactLiveState}
                        events={artifactEvents}
                        loading={artifactsLoading}
                      />
                    )}
                    {activeTab === "proxy" && (
                      <ProxyTab proxyRules={proxyRules} triggerRules={triggerRules} loading={proxyLoading} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="js-empty-state">
                <p>{LABELS.SELECT_JOB}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
