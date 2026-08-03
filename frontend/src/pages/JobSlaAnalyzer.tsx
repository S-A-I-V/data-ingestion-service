/**
 * JobSlaAnalyzer — Admin dashboard for analyzing job SLA compliance.
 *
 * Features:
 *   - Job selector in left sidebar
 *   - KPI cards showing 90-day compliance metrics
 *   - Tabbed interface: Overview, Heatmap, History
 *   - Additional tabs for Artifact / Proxy jobs
 *
 * All data covers a fixed 90-day rolling window — no date range controls.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../api";
import { useToast, Toast } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import { JobSelector } from "../components/job-sla/JobSelector";
import { KpiCards } from "../components/job-sla/KpiCards";
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
  DayOfWeekSlaBars,
  WeeklySlaBars,
  HeatmapCell,
  DurationBucket,
  Sev1Incident,
  IncidentOverride,
  ArtifactDefinition,
  ArtifactLiveState,
  ArtifactEvent,
  ProxyRule,
  JobSlaTab,
  JobTypeLabel,
} from "../types/jobSla";

/** UI labels */
const LABELS = {
  PAGE_TITLE: "Job SLA Analyzer",
  REFRESH: "Refresh",
  SELECT_JOB: "Select a job from the list to analyze its SLA compliance",
} as const;

/** Error messages */
const ERRORS = {
  LOAD_JOBS: "Failed to load jobs list",
  LOAD_SUMMARY: "Failed to load job summary",
  LOAD_TRENDS: "Failed to load trend data",
  LOAD_HEATMAP: "Failed to load heatmap data",
  LOAD_HISTORY: "Failed to load history",
  LOAD_ARTIFACTS: "Failed to load artifacts",
  LOAD_PROXY: "Failed to load proxy rules",
} as const;

export default function JobSlaAnalyzer() {
  const [toast, setToast] = useToast();

  // ── Jobs list ──────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<JobDefinition[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobTypes, setJobTypes] = useState<Record<number, JobTypeLabel>>({});

  // ── Selected job ───────────────────────────────────────────────────────────
  const [selectedJob, setSelectedJob] = useState<JobDefinition | null>(null);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicy[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<JobSlaTab>("overview");

  // ── Overview tab data ──────────────────────────────────────────────────────
  const [weeklyTrend, setWeeklyTrend] = useState<TrendPoint[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<TrendPoint[]>([]);
  const [slaTimeline, setSlaTimeline] = useState<SlaTimelinePoint[]>([]);
  const [trendInsights, setTrendInsights] = useState<TrendInsights | null>(null);
  const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStats[] | null>(null);
  const [dayOfWeekSlaBars, setDayOfWeekSlaBars] = useState<DayOfWeekSlaBars[]>([]);
  const [weeklySlaBars, setWeeklySlaBars] = useState<WeeklySlaBars[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  // ── Heatmap tab data ───────────────────────────────────────────────────────
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  const [durationBuckets, setDurationBuckets] = useState<DurationBucket[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // ── History tab data ───────────────────────────────────────────────────────
  const [history, setHistory] = useState<JobLiveState[]>([]);
  const [incidents, setIncidents] = useState<Sev1Incident[]>([]);
  const [overrides, setOverrides] = useState<IncidentOverride[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Artifacts tab data ─────────────────────────────────────────────────────
  const [artifactDefs, setArtifactDefs] = useState<ArtifactDefinition[]>([]);
  const [artifactLiveState, setArtifactLiveState] = useState<ArtifactLiveState[]>([]);
  const [artifactEvents, setArtifactEvents] = useState<ArtifactEvent[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);

  // ── Proxy tab data ─────────────────────────────────────────────────────────
  const [proxyRules, setProxyRules] = useState<ProxyRule[]>([]);
  const [triggerRules, setTriggerRules] = useState<ProxyRule[]>([]);
  const [proxyLoading, setProxyLoading] = useState(false);

  // ── Abort controllers ─────────────────────────────────────────────────────
  // One controller per logical fetch group. On job change both are replaced.
  // On tab switch only tabAbortRef is replaced, summary is left untouched.
  const summaryAbortRef = useRef<AbortController | null>(null);
  const tabAbortRef = useRef<AbortController | null>(null);
  // Track the last job_id that triggered a full (summary + tab) load so we can
  // distinguish a job change from a tab switch inside the unified effect.
  const loadedJobIdRef = useRef<number | null>(null);

  // ── Jobs list loader ───────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const res = await api.get(`${JOB_SLA_API_BASE}/jobs`);
      const jobsList: JobDefinition[] = res.data.jobs;
      setJobs(jobsList);
      const typesMap: Record<number, JobTypeLabel> = {};
      jobsList.forEach((job) => {
        if (job.job_type) typesMap[job.job_id] = job.job_type;
      });
      setJobTypes(typesMap);
    } catch {
      setJobsError(ERRORS.LOAD_JOBS);
      setToast({ ok: false, msg: ERRORS.LOAD_JOBS });
    } finally {
      setJobsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Summary loader — fires only on job change ──────────────────────────────
  // Tab switches never re-run this, avoiding unnecessary KPI card reloads.

  const loadSummary = useCallback(async (job: JobDefinition, signal: AbortSignal) => {
    setSummaryLoading(true);
    try {
      const res = await api.get<JobSummaryResponse>(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/summary`, { signal });
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab data loader — fires on job change or tab switch ────────────────────
  // jobType intentionally excluded from deps: it is set by loadSummary and
  // must never cause this loader to re-run after summary completes.

  const loadTabData = useCallback(async (job: JobDefinition, tab: JobSlaTab, signal: AbortSignal) => {
    if (tab === "overview") {
      setTrendsLoading(true);
      try {
        const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/trends`, { signal });
        if (signal.aborted) return;
        setWeeklyTrend(res.data.weekly);
        setMonthlyTrend(res.data.monthly);
        setSlaTimeline(res.data.sla_timeline || []);
        setTrendInsights(res.data.insights || null);
        setDayOfWeekStats(res.data.day_of_week_stats || null);
        setDayOfWeekSlaBars(res.data.day_of_week_sla_bars || []);
        setWeeklySlaBars(res.data.weekly_sla_bars || []);
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
          api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/heatmap`, { signal }),
          api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/duration-distribution`, { signal }),
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
          api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/history`, { signal }),
          api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/incidents`, {
            params: { job_name: job.job_name },
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
          params: { job_name: job.job_name },
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchJobs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Unified effect: one dep array covers both job changes and tab switches.
  //
  // Job change  → summary + tabData fire in Promise.all so both resolve before
  //               any state is written. The page paints once, fully populated.
  // Tab switch  → job_id hasn't changed, so only tabData fires. Summary is
  //               left completely untouched (no KPI card reload).
  //
  // This collapses the old two-effect architecture which caused two separate
  // React render cycles (one when summary resolved, one when tabData resolved).
  useEffect(() => {
    if (!selectedJob) return;

    const jobChanged = loadedJobIdRef.current !== selectedJob.job_id;

    if (jobChanged) {
      // Cancel any in-flight requests from the previous job
      summaryAbortRef.current?.abort();
      tabAbortRef.current?.abort();

      const sumCtrl = new AbortController();
      const tabCtrl = new AbortController();
      summaryAbortRef.current = sumCtrl;
      tabAbortRef.current = tabCtrl;
      loadedJobIdRef.current = selectedJob.job_id;

      // Fire both in parallel, write state only after both resolve.
      // A single Promise.all means React flushes one batch, not two.
      Promise.all([loadSummary(selectedJob, sumCtrl.signal), loadTabData(selectedJob, activeTab, tabCtrl.signal)]);

      return () => {
        sumCtrl.abort();
        tabCtrl.abort();
      };
    } else {
      // Tab switch — only reload the tab content, leave summary/KPIs alone
      tabAbortRef.current?.abort();
      const tabCtrl = new AbortController();
      tabAbortRef.current = tabCtrl;
      loadTabData(selectedJob, activeTab, tabCtrl.signal);

      return () => {
        tabCtrl.abort();
      };
    }
  }, [selectedJob?.job_id, selectedJob?.job_name, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Job selection ──────────────────────────────────────────────────────────

  const handleSelectJob = (job: JobDefinition) => {
    // Clear stale data immediately so old job's content never flashes
    setJobType(null);
    setCompliance(null);
    setSlaPolicies([]);
    setWeeklyTrend([]);
    setMonthlyTrend([]);
    setSlaTimeline([]);
    setTrendInsights(null);
    setDayOfWeekStats(null);
    setDayOfWeekSlaBars([]);
    setWeeklySlaBars([]);
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
    // Batch both state updates so effects fire only once
    setSelectedJob(job);
    setActiveTab("overview");
  };

  // ── Tabs list ──────────────────────────────────────────────────────────────
  // Built from selectedJob fields (populated by the jobs list API) so the
  // correct tabs appear immediately without waiting for summary to resolve.

  const tabs = useMemo(() => {
    const base: { id: JobSlaTab; label: string }[] = [...JOB_SLA_TABS];
    if (selectedJob?.has_artifacts || jobType?.has_artifacts) base.push(ARTIFACT_TAB);
    if (selectedJob?.is_proxy || selectedJob?.is_trigger || jobType?.is_proxy || jobType?.is_trigger)
      base.push(PROXY_TAB);
    return base;
  }, [
    selectedJob?.has_artifacts,
    selectedJob?.is_proxy,
    selectedJob?.is_trigger,
    jobType?.has_artifacts,
    jobType?.is_proxy,
    jobType?.is_trigger,
  ]);

  // ── Refresh ────────────────────────────────────────────────────────────────

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!selectedJob || refreshTick === 0) return;
    // Reset the tracked job ID so the unified effect treats this as a fresh
    // job load and fires Promise.all(summary + tabData) together.
    loadedJobIdRef.current = null;
    summaryAbortRef.current?.abort();
    tabAbortRef.current?.abort();
    const sumCtrl = new AbortController();
    const tabCtrl = new AbortController();
    summaryAbortRef.current = sumCtrl;
    tabAbortRef.current = tabCtrl;
    loadedJobIdRef.current = selectedJob.job_id;
    Promise.all([loadSummary(selectedJob, sumCtrl.signal), loadTabData(selectedJob, activeTab, tabCtrl.signal)]);
    return () => {
      sumCtrl.abort();
      tabCtrl.abort();
    };
  }, [refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    fetchJobs();
    if (selectedJob) setRefreshTick((t) => t + 1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
                        job={selectedJob}
                        jobType={jobType}
                        slaPolicies={slaPolicies}
                        weeklyTrend={weeklyTrend}
                        monthlyTrend={monthlyTrend}
                        slaTimeline={slaTimeline}
                        insights={trendInsights}
                        dayOfWeekStats={dayOfWeekStats}
                        dayOfWeekSlaBars={dayOfWeekSlaBars}
                        weeklySlaBars={weeklySlaBars}
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
