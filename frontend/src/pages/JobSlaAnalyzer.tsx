/**
 * JobSlaAnalyzer — Admin dashboard for analyzing job SLA compliance.
 *
 * Features:
 *   - Job selector in left sidebar
 *   - KPI cards showing compliance metrics
 *   - Tabbed interface: Overview, Heatmap, History
 *   - Additional tabs for Artifacts/Proxy jobs
 *   - Date range picker for historical analysis
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../api";
import { useToast } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import { JobSelector } from "../components/job-sla/JobSelector";
import { KpiCards } from "../components/job-sla/KpiCards";
import { DateRangePicker, useDefaultDateRange } from "../components/job-sla/DateRangePicker";
import { OverviewTab } from "../components/job-sla/tabs/OverviewTab";
import { HeatmapTab } from "../components/job-sla/tabs/HeatmapTab";
import { HistoryTab } from "../components/job-sla/tabs/HistoryTab";
import { ArtifactsTab } from "../components/job-sla/tabs/ArtifactsTab";
import { ProxyTab } from "../components/job-sla/tabs/ProxyTab";
import { JOB_SLA_API_BASE, JOB_SLA_TABS, ARTIFACT_TAB, PROXY_TAB } from "../constants/jobSla";
import type {
  JobDefinition,
  JobSummaryResponse,
  JobType,
  ComplianceSummary,
  SlaPolicy,
  JobLiveState,
  TrendPoint,
  TrendInsights,
  DayOfWeekStats,
  SlaTimelinePoint,
  HeatmapCell,
  DurationBucket,
  Sev1Incident,
  IncidentOverride,
  ArtifactDefinition,
  ArtifactLiveState,
  ArtifactEvent,
  ProxyRule,
  DateRange,
  JobSlaTab,
  JobTypeLabel,
} from "../types/jobSla";

/** UI Labels */
const LABELS = {
  PAGE_TITLE: "Job SLA Analyzer",
  REFRESH: "Refresh",
  SELECT_JOB: "Select a job from the list to analyze its SLA compliance",
  LOADING_JOBS: "Loading jobs...",
  ERROR_LOADING: "Failed to load data",
} as const;

/** Error messages */
const ERRORS = {
  LOAD_JOBS: "Failed to load jobs list",
  LOAD_SUMMARY: "Failed to load job summary",
  LOAD_TRENDS: "Failed to load trend data",
  LOAD_HEATMAP: "Failed to load heatmap data",
  LOAD_HISTORY: "Failed to load history",
  LOAD_INCIDENTS: "Failed to load incidents",
  LOAD_ARTIFACTS: "Failed to load artifacts",
  LOAD_PROXY: "Failed to load proxy rules",
} as const;

export default function JobSlaAnalyzer() {
  const { showToast } = useToast();
  const defaultDateRange = useDefaultDateRange();

  // Jobs state
  const [jobs, setJobs] = useState<JobDefinition[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobTypes, setJobTypes] = useState<Record<number, JobTypeLabel>>({});

  // Selected job state
  const [selectedJob, setSelectedJob] = useState<JobDefinition | null>(null);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicy[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);

  // Tab state
  const [activeTab, setActiveTab] = useState<JobSlaTab>("overview");

  // Tab-specific data
  const [weeklyTrend, setWeeklyTrend] = useState<TrendPoint[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<TrendPoint[]>([]);
  const [slaTimeline, setSlaTimeline] = useState<SlaTimelinePoint[]>([]);
  const [trendInsights, setTrendInsights] = useState<TrendInsights | null>(null);
  const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStats[] | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  const [durationBuckets, setDurationBuckets] = useState<DurationBucket[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const [history, setHistory] = useState<JobLiveState[]>([]);
  const [incidents, setIncidents] = useState<Sev1Incident[]>([]);
  const [overrides, setOverrides] = useState<IncidentOverride[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [artifactDefs, setArtifactDefs] = useState<ArtifactDefinition[]>([]);
  const [artifactLiveState, setArtifactLiveState] = useState<ArtifactLiveState[]>([]);
  const [artifactEvents, setArtifactEvents] = useState<ArtifactEvent[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);

  const [proxyRules, setProxyRules] = useState<ProxyRule[]>([]);
  const [triggerRules, setTriggerRules] = useState<ProxyRule[]>([]);
  const [proxyLoading, setProxyLoading] = useState(false);

  // Format date for API
  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  // Fetch jobs list
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const res = await api.get(`${JOB_SLA_API_BASE}/jobs`);
      const jobsList = res.data.jobs;
      setJobs(jobsList);

      // Build job types map from the jobs list (now includes type info)
      const typesMap: Record<number, JobTypeLabel> = {};
      jobsList.forEach((job: JobDefinition) => {
        if (job.job_type) {
          typesMap[job.job_id] = job.job_type;
        }
      });
      setJobTypes(typesMap);
    } catch {
      setJobsError(ERRORS.LOAD_JOBS);
      showToast({ type: "error", message: ERRORS.LOAD_JOBS });
    } finally {
      setJobsLoading(false);
    }
  }, [showToast]);

  // Fetch job summary (type, compliance, policies)
  const fetchJobSummary = useCallback(
    async (jobId: number) => {
      setSummaryLoading(true);
      try {
        const res = await api.get<JobSummaryResponse>(`${JOB_SLA_API_BASE}/jobs/${jobId}/summary`, {
          params: { date_from: formatDate(dateRange.from), date_to: formatDate(dateRange.to) },
        });
        setJobType(res.data.job_type);
        setCompliance(res.data.compliance);
        setSlaPolicies(res.data.sla_policies);

        // Update job types cache
        setJobTypes((prev) => ({ ...prev, [jobId]: res.data.job_type.type }));
      } catch {
        showToast({ type: "error", message: ERRORS.LOAD_SUMMARY });
      } finally {
        setSummaryLoading(false);
      }
    },
    [dateRange, showToast],
  );

  // Fetch trends (for Overview tab)
  const fetchTrends = useCallback(
    async (jobId: number) => {
      setTrendsLoading(true);
      try {
        const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${jobId}/trends`, {
          params: {
            date_from: formatDate(dateRange.from),
            date_to: formatDate(dateRange.to),
            include_insights: true,
          },
        });
        setWeeklyTrend(res.data.weekly);
        setMonthlyTrend(res.data.monthly);
        setSlaTimeline(res.data.sla_timeline || []);
        setTrendInsights(res.data.insights || null);
        setDayOfWeekStats(res.data.day_of_week_stats || null);
      } catch {
        showToast({ type: "error", message: ERRORS.LOAD_TRENDS });
      } finally {
        setTrendsLoading(false);
      }
    },
    [dateRange, showToast],
  );

  // Fetch heatmap data
  const fetchHeatmap = useCallback(
    async (jobId: number) => {
      setHeatmapLoading(true);
      try {
        const [heatmapRes, distRes] = await Promise.all([
          api.get(`${JOB_SLA_API_BASE}/jobs/${jobId}/heatmap`, {
            params: { date_from: formatDate(dateRange.from), date_to: formatDate(dateRange.to) },
          }),
          api.get(`${JOB_SLA_API_BASE}/jobs/${jobId}/duration-distribution`, {
            params: { date_from: formatDate(dateRange.from), date_to: formatDate(dateRange.to) },
          }),
        ]);
        setHeatmapCells(heatmapRes.data.cells);
        setDurationBuckets(distRes.data.buckets);
      } catch {
        showToast({ type: "error", message: ERRORS.LOAD_HEATMAP });
      } finally {
        setHeatmapLoading(false);
      }
    },
    [dateRange, showToast],
  );

  // Fetch history and incidents
  const fetchHistory = useCallback(
    async (jobId: number, jobName: string) => {
      setHistoryLoading(true);
      try {
        const [histRes, incRes] = await Promise.all([
          api.get(`${JOB_SLA_API_BASE}/jobs/${jobId}/history`, {
            params: { date_from: formatDate(dateRange.from), date_to: formatDate(dateRange.to) },
          }),
          api.get(`${JOB_SLA_API_BASE}/jobs/${jobId}/incidents`, {
            params: {
              job_name: jobName,
              date_from: formatDate(dateRange.from),
              date_to: formatDate(dateRange.to),
            },
          }),
        ]);
        setHistory(histRes.data.history);
        setIncidents(incRes.data.sev1_incidents);
        setOverrides(incRes.data.overrides);
      } catch {
        showToast({ type: "error", message: ERRORS.LOAD_HISTORY });
      } finally {
        setHistoryLoading(false);
      }
    },
    [dateRange, showToast],
  );

  // Fetch artifacts
  const fetchArtifacts = useCallback(
    async (jobId: number, jobName: string) => {
      setArtifactsLoading(true);
      try {
        const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${jobId}/artifacts`, {
          params: {
            job_name: jobName,
            date_from: formatDate(dateRange.from),
            date_to: formatDate(dateRange.to),
          },
        });
        setArtifactDefs(res.data.definitions);
        setArtifactLiveState(res.data.live_state);
        setArtifactEvents(res.data.events);
      } catch {
        showToast({ type: "error", message: ERRORS.LOAD_ARTIFACTS });
      } finally {
        setArtifactsLoading(false);
      }
    },
    [dateRange, showToast],
  );

  // Fetch proxy rules
  const fetchProxyRules = useCallback(
    async (jobId: number) => {
      setProxyLoading(true);
      try {
        const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${jobId}/proxy`);
        setProxyRules(res.data.proxy_rules);
        setTriggerRules(res.data.trigger_rules);
      } catch {
        showToast({ type: "error", message: ERRORS.LOAD_PROXY });
      } finally {
        setProxyLoading(false);
      }
    },
    [showToast],
  );

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, []); // Only run once on mount

  // Load job summary when job or date range changes
  useEffect(() => {
    if (!selectedJob) return;
    fetchJobSummary(selectedJob.job_id);
  }, [selectedJob?.job_id, dateRange.from.getTime(), dateRange.to.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load tab-specific data when tab changes or date range changes
  useEffect(() => {
    if (!selectedJob) return;

    if (activeTab === "overview") {
      fetchTrends(selectedJob.job_id);
    } else if (activeTab === "heatmap") {
      fetchHeatmap(selectedJob.job_id);
    } else if (activeTab === "history") {
      fetchHistory(selectedJob.job_id, selectedJob.job_name);
    } else if (activeTab === "artifacts" && (selectedJob.has_artifacts || jobType?.has_artifacts)) {
      fetchArtifacts(selectedJob.job_id, selectedJob.job_name);
    } else if (
      activeTab === "proxy" &&
      (selectedJob.is_proxy || selectedJob.is_trigger || jobType?.is_proxy || jobType?.is_trigger)
    ) {
      fetchProxyRules(selectedJob.job_id);
    }
  }, [
    selectedJob?.job_id,
    selectedJob?.job_name,
    activeTab,
    dateRange.from.getTime(),
    dateRange.to.getTime(),
    selectedJob?.has_artifacts,
    selectedJob?.is_proxy,
    selectedJob?.is_trigger,
    jobType?.has_artifacts,
    jobType?.is_proxy,
    jobType?.is_trigger,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle job selection
  const handleSelectJob = (job: JobDefinition) => {
    setSelectedJob(job);
    setActiveTab("overview");
    // Reset tab data
    setWeeklyTrend([]);
    setMonthlyTrend([]);
    setSlaTimeline([]);
    setTrendInsights(null);
    setDayOfWeekStats(null);
    setHeatmapCells([]);
    setDurationBuckets([]);
    setHistory([]);
    setIncidents([]);
    setOverrides([]);
    setArtifactDefs([]);
    setArtifactLiveState([]);
    setArtifactEvents([]);
    setProxyRules([]);
    setTriggerRules([]);
  };

  // Build tabs list based on selected job's type (from jobs list, not separate fetch)
  const tabs = useMemo(() => {
    const baseTabs = [...JOB_SLA_TABS];
    // Use job type from the selected job directly (populated in jobs list)
    if (selectedJob?.has_artifacts || jobType?.has_artifacts) {
      baseTabs.push(ARTIFACT_TAB);
    }
    if (selectedJob?.is_proxy || selectedJob?.is_trigger || jobType?.is_proxy || jobType?.is_trigger) {
      baseTabs.push(PROXY_TAB);
    }
    return baseTabs;
  }, [selectedJob?.has_artifacts, selectedJob?.is_proxy, selectedJob?.is_trigger, jobType]);

  // Refresh all data
  const handleRefresh = () => {
    fetchJobs();
    if (selectedJob) {
      fetchJobSummary(selectedJob.job_id);
      if (activeTab === "overview") fetchTrends(selectedJob.job_id);
      if (activeTab === "heatmap") fetchHeatmap(selectedJob.job_id);
      if (activeTab === "history") fetchHistory(selectedJob.job_id, selectedJob.job_name);
      if (activeTab === "artifacts") fetchArtifacts(selectedJob.job_id, selectedJob.job_name);
      if (activeTab === "proxy") fetchProxyRules(selectedJob.job_id);
    }
  };

  return (
    <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
      {/* LEFT SIDEBAR — Job Selector */}
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
          {/* Toolbar */}
          <div className="toolbar">
            <span className="toolbar-title">
              <Highlight>{LABELS.PAGE_TITLE}</Highlight>
            </span>
            <div className="toolbar-spacer" />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button type="button" className="btn btn-sm" onClick={handleRefresh}>
              <RefreshIcon sx={{ fontSize: 14 }} /> {LABELS.REFRESH}
            </button>
          </div>

          {/* Content */}
          {selectedJob ? (
            <div className="js-analyzer-content">
              {/* KPI Cards */}
              <KpiCards compliance={compliance} loading={summaryLoading} />

              {/* Tabs */}
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
                      job={selectedJob}
                      jobType={jobType}
                      slaPolicies={slaPolicies}
                      weeklyTrend={weeklyTrend}
                      monthlyTrend={monthlyTrend}
                      slaTimeline={slaTimeline}
                      insights={trendInsights}
                      dayOfWeekStats={dayOfWeekStats}
                      loading={trendsLoading}
                    />
                  )}
                  {activeTab === "heatmap" && (
                    <HeatmapTab cells={heatmapCells} durationBuckets={durationBuckets} loading={heatmapLoading} />
                  )}
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
  );
}
