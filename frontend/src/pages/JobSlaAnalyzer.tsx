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

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../api";
import { useToast, Toast } from "../components/ui";
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
  const [toast, setToast] = useToast();
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

  // Separate abort controllers: summary is independent of tab, so tab switches
  // never cancel or re-fire the summary request.
  const summaryAbortRef = useRef<AbortController | null>(null);
  const tabAbortRef = useRef<AbortController | null>(null);

  // Fetch jobs list — stable, no deps that change per-job
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const res = await api.get(`${JOB_SLA_API_BASE}/jobs`);
      const jobsList = res.data.jobs;
      setJobs(jobsList);

      // Build job types map from the jobs list (includes type info from server)
      const typesMap: Record<number, JobTypeLabel> = {};
      jobsList.forEach((job: JobDefinition) => {
        if (job.job_type) {
          typesMap[job.job_id] = job.job_type;
        }
      });
      setJobTypes(typesMap);
    } catch {
      setJobsError(ERRORS.LOAD_JOBS);
      setToast({ ok: false, msg: ERRORS.LOAD_JOBS });
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // ── Summary loader ─────────────────────────────────────────────────────────
  // Fires only on job / date range change. Tab switches do NOT re-run this.

  const loadSummary = useCallback(async (job: JobDefinition, dateFrom: string, dateTo: string, signal: AbortSignal) => {
    setSummaryLoading(true);
    try {
      const res = await api.get<JobSummaryResponse>(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/summary`, {
        params: { date_from: dateFrom, date_to: dateTo },
        signal,
      });
      if (signal.aborted) return;
      setJobType(res.data.job_type);
      setCompliance(res.data.compliance);
      setSlaPolicies(res.data.sla_policies);
      setJobTypes((prev) => ({ ...prev, [job.job_id]: res.data.job_type.type }));
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError")
        return;
      setToast({ ok: false, msg: ERRORS.LOAD_SUMMARY });
    } finally {
      if (!signal.aborted) setSummaryLoading(false);
    }
  }, []);

  // ── Tab data loader ────────────────────────────────────────────────────────
  // Fires on job / date range / active tab change. Never re-fetches summary.
  // jobType is intentionally not used here — selectedJob already carries
  // has_artifacts/is_proxy/is_trigger from the jobs list API.

  const loadTabData = useCallback(
    async (job: JobDefinition, tab: JobSlaTab, dateFrom: string, dateTo: string, signal: AbortSignal) => {
      const params = { date_from: dateFrom, date_to: dateTo };

      if (tab === "overview") {
        setTrendsLoading(true);
        try {
          const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/trends`, {
            params: { ...params, include_insights: true },
            signal,
          });
          if (signal.aborted) return;
          setWeeklyTrend(res.data.weekly);
          setMonthlyTrend(res.data.monthly);
          setSlaTimeline(res.data.sla_timeline || []);
          setTrendInsights(res.data.insights || null);
          setDayOfWeekStats(res.data.day_of_week_stats || null);
        } catch (err: unknown) {
          if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError")
            return;
          setToast({ ok: false, msg: ERRORS.LOAD_TRENDS });
        } finally {
          if (!signal.aborted) setTrendsLoading(false);
        }
      } else if (tab === "heatmap") {
        setHeatmapLoading(true);
        try {
          const [heatmapRes, distRes] = await Promise.all([
            api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/heatmap`, { params, signal }),
            api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/duration-distribution`, { params, signal }),
          ]);
          if (signal.aborted) return;
          setHeatmapCells(heatmapRes.data.cells);
          setDurationBuckets(distRes.data.buckets);
        } catch (err: unknown) {
          if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError")
            return;
          setToast({ ok: false, msg: ERRORS.LOAD_HEATMAP });
        } finally {
          if (!signal.aborted) setHeatmapLoading(false);
        }
      } else if (tab === "history") {
        setHistoryLoading(true);
        try {
          const [histRes, incRes] = await Promise.all([
            api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/history`, { params, signal }),
            api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/incidents`, {
              params: { ...params, job_name: job.job_name },
              signal,
            }),
          ]);
          if (signal.aborted) return;
          setHistory(histRes.data.history);
          setIncidents(incRes.data.sev1_incidents);
          setOverrides(incRes.data.overrides);
        } catch (err: unknown) {
          if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError")
            return;
          setToast({ ok: false, msg: ERRORS.LOAD_HISTORY });
        } finally {
          if (!signal.aborted) setHistoryLoading(false);
        }
      } else if (
        tab === "artifacts" &&
        (job.has_artifacts || job.job_type === "artifact" || job.job_type === "artifact_proxy")
      ) {
        setArtifactsLoading(true);
        try {
          const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/artifacts`, {
            params: { ...params, job_name: job.job_name },
            signal,
          });
          if (signal.aborted) return;
          setArtifactDefs(res.data.definitions);
          setArtifactLiveState(res.data.live_state);
          setArtifactEvents(res.data.events);
        } catch (err: unknown) {
          if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError")
            return;
          setToast({ ok: false, msg: ERRORS.LOAD_ARTIFACTS });
        } finally {
          if (!signal.aborted) setArtifactsLoading(false);
        }
      } else if (tab === "proxy" && (job.is_proxy || job.is_trigger)) {
        setProxyLoading(true);
        try {
          const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/proxy`, { signal });
          if (signal.aborted) return;
          setProxyRules(res.data.proxy_rules);
          setTriggerRules(res.data.trigger_rules);
        } catch (err: unknown) {
          if ((err as { name?: string })?.name === "CanceledError" || (err as { name?: string })?.name === "AbortError")
            return;
          setToast({ ok: false, msg: ERRORS.LOAD_PROXY });
        } finally {
          if (!signal.aborted) setProxyLoading(false);
        }
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 1 — summary: fires only when job or date range changes.
  // Tab switches do NOT trigger this.
  useEffect(() => {
    if (!selectedJob) return;
    summaryAbortRef.current?.abort();
    const controller = new AbortController();
    summaryAbortRef.current = controller;
    loadSummary(selectedJob, formatDate(dateRange.from), formatDate(dateRange.to), controller.signal);
    return () => {
      controller.abort();
    };
  }, [
    // eslint-disable-line react-hooks/exhaustive-deps
    selectedJob?.job_id,
    dateRange.from.getTime(),
    dateRange.to.getTime(),
  ]);

  // Effect 2 — tab data: fires when job, date range, or active tab changes.
  // jobType is intentionally excluded from deps — it is set by the summary
  // response and must never cause this effect to re-run after load completes.
  useEffect(() => {
    if (!selectedJob) return;
    tabAbortRef.current?.abort();
    const controller = new AbortController();
    tabAbortRef.current = controller;
    loadTabData(selectedJob, activeTab, formatDate(dateRange.from), formatDate(dateRange.to), controller.signal);
    return () => {
      controller.abort();
    };
  }, [
    // eslint-disable-line react-hooks/exhaustive-deps
    selectedJob?.job_id,
    selectedJob?.job_name,
    activeTab,
    dateRange.from.getTime(),
    dateRange.to.getTime(),
  ]);

  // Handle job selection — resets all tab data and switches to overview
  const handleSelectJob = (job: JobDefinition) => {
    // Reset stale data immediately so the UI doesn't flash old job's content
    setJobType(null);
    setCompliance(null);
    setSlaPolicies([]);
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
    // Setting selectedJob + activeTab together in the same synchronous block
    // lets React batch these into a single render before the effect fires.
    setSelectedJob(job);
    setActiveTab("overview");
  };

  // Build tabs list based on selected job's type fields (populated from jobs list).
  // jobType from summary is intentionally excluded — selectedJob already carries
  // has_artifacts/is_proxy/is_trigger from the batch jobs API, so there's no
  // need to wait for summary to resolve before showing the correct tab set.
  const tabs = useMemo(() => {
    // Widen the array type explicitly so ARTIFACT_TAB / PROXY_TAB can be pushed
    const baseTabs: { id: JobSlaTab; label: string }[] = [...JOB_SLA_TABS];
    if (selectedJob?.has_artifacts || jobType?.has_artifacts) {
      baseTabs.push(ARTIFACT_TAB);
    }
    if (selectedJob?.is_proxy || selectedJob?.is_trigger || jobType?.is_proxy || jobType?.is_trigger) {
      baseTabs.push(PROXY_TAB);
    }
    return baseTabs;
  }, [
    selectedJob?.has_artifacts,
    selectedJob?.is_proxy,
    selectedJob?.is_trigger,
    jobType?.has_artifacts,
    jobType?.is_proxy,
    jobType?.is_trigger,
  ]);

  // Refresh — re-run both loaders immediately using the bump-counter pattern
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!selectedJob || refreshTick === 0) return;
    summaryAbortRef.current?.abort();
    tabAbortRef.current?.abort();
    const sumCtrl = new AbortController();
    const tabCtrl = new AbortController();
    summaryAbortRef.current = sumCtrl;
    tabAbortRef.current = tabCtrl;
    const dateFrom = formatDate(dateRange.from);
    const dateTo = formatDate(dateRange.to);
    loadSummary(selectedJob, dateFrom, dateTo, sumCtrl.signal);
    loadTabData(selectedJob, activeTab, dateFrom, dateTo, tabCtrl.signal);
    return () => {
      sumCtrl.abort();
      tabCtrl.abort();
    };
  }, [refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    fetchJobs();
    if (selectedJob) setRefreshTick((t) => t + 1);
  };

  return (
    <>
      <Toast toast={toast} />
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
    </>
  );
}
