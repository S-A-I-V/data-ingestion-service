/**
 * useJobSlaData — Custom hook encapsulating all state, effects, and data fetching
 * for the Job SLA Analyzer page. Handles job selection, tab switching, refresh,
 * abort controllers, and per-tab caching.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../api";
import { useToast } from "../components/ui";
import { JOB_SLA_API_BASE, JOB_SLA_TABS, ARTIFACT_TAB, PROXY_TAB } from "../constants/jobSla";
import type {
  JobDefinition,
  JobSummaryResponse,
  JobType,
  ComplianceSummary,
  SlaPolicy,
  JobLiveState,
  CalendarDay,
  DayOfWeekSlaBars,
  WeeklySlaBars,
  Sev1Incident,
  IncidentOverride,
  ArtifactDefinition,
  ArtifactLiveState,
  ArtifactEvent,
  ProxyRule,
  JobSlaTab,
  JobTypeLabel,
} from "../types/jobSla";

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

function isAbortError(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  return name === "CanceledError" || name === "AbortError";
}

export function useJobSlaData() {
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

  // ── Tab data ───────────────────────────────────────────────────────────────
  const [dayOfWeekSlaBars, setDayOfWeekSlaBars] = useState<DayOfWeekSlaBars[]>([]);
  const [weeklySlaBars, setWeeklySlaBars] = useState<WeeklySlaBars[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
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

  // ── Abort controllers ──────────────────────────────────────────────────────
  const summaryAbortRef = useRef<AbortController | null>(null);
  const tabAbortRef = useRef<AbortController | null>(null);
  const loadedJobIdRef = useRef<number | null>(null);
  const loadedTabsRef = useRef<Set<JobSlaTab>>(new Set());

  // ── Fetchers ───────────────────────────────────────────────────────────────

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

  const loadSummary = useCallback(async (job: JobDefinition, signal: AbortSignal) => {
    setSummaryLoading(true);
    try {
      const res = await api.get<JobSummaryResponse>(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/summary`, { signal });
      if (signal.aborted) return;
      setJobType(res.data.job_type);
      setCompliance(res.data.compliance);
      setSlaPolicies(res.data.sla_policies);
      setJobTypes((prev) => ({ ...prev, [job.job_id]: res.data.job_type.type }));
    } catch (err) {
      if (isAbortError(err)) return;
      setToast({ ok: false, msg: ERRORS.LOAD_SUMMARY });
    } finally {
      if (!signal.aborted) setSummaryLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTabData = useCallback(async (job: JobDefinition, tab: JobSlaTab, signal: AbortSignal) => {
    if (tab === "overview") {
      setTrendsLoading(true);
      try {
        const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/trends`, { signal });
        if (signal.aborted) return;
        setDayOfWeekSlaBars(res.data.day_of_week_sla_bars || []);
        setWeeklySlaBars(res.data.weekly_sla_bars || []);
      } catch (err) {
        if (!isAbortError(err)) setToast({ ok: false, msg: ERRORS.LOAD_TRENDS });
      } finally {
        if (!signal.aborted) setTrendsLoading(false);
      }
    } else if (tab === "heatmap") {
      setHeatmapLoading(true);
      try {
        const res = await api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/calendar`, { signal });
        if (signal.aborted) return;
        setCalendarData(res.data.days);
      } catch (err) {
        if (!isAbortError(err)) setToast({ ok: false, msg: ERRORS.LOAD_HEATMAP });
      } finally {
        if (!signal.aborted) setHeatmapLoading(false);
      }
    } else if (tab === "history") {
      setHistoryLoading(true);
      try {
        const [histRes, incRes] = await Promise.all([
          api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/history`, { signal }),
          api.get(`${JOB_SLA_API_BASE}/jobs/${job.job_id}/incidents`, { params: { job_name: job.job_name }, signal }),
        ]);
        if (signal.aborted) return;
        setHistory(histRes.data.history);
        setIncidents(incRes.data.sev1_incidents);
        setOverrides(incRes.data.overrides);
      } catch (err) {
        if (!isAbortError(err)) setToast({ ok: false, msg: ERRORS.LOAD_HISTORY });
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
      } catch (err) {
        if (!isAbortError(err)) setToast({ ok: false, msg: ERRORS.LOAD_ARTIFACTS });
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
      } catch (err) {
        if (!isAbortError(err)) setToast({ ok: false, msg: ERRORS.LOAD_PROXY });
      } finally {
        if (!signal.aborted) setProxyLoading(false);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchJobs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedJob) return;
    const jobChanged = loadedJobIdRef.current !== selectedJob.job_id;

    if (jobChanged) {
      summaryAbortRef.current?.abort();
      tabAbortRef.current?.abort();
      const sumCtrl = new AbortController();
      const tabCtrl = new AbortController();
      summaryAbortRef.current = sumCtrl;
      tabAbortRef.current = tabCtrl;
      loadedJobIdRef.current = selectedJob.job_id;
      loadedTabsRef.current = new Set();

      Promise.all([loadSummary(selectedJob, sumCtrl.signal), loadTabData(selectedJob, activeTab, tabCtrl.signal)]).then(
        () => {
          if (!sumCtrl.signal.aborted && !tabCtrl.signal.aborted) loadedTabsRef.current.add(activeTab);
        },
      );
      return () => {
        sumCtrl.abort();
        tabCtrl.abort();
      };
    } else {
      if (loadedTabsRef.current.has(activeTab)) return;
      tabAbortRef.current?.abort();
      const tabCtrl = new AbortController();
      tabAbortRef.current = tabCtrl;
      loadTabData(selectedJob, activeTab, tabCtrl.signal).then(() => {
        if (!tabCtrl.signal.aborted) loadedTabsRef.current.add(activeTab);
      });
      return () => {
        tabCtrl.abort();
      };
    }
  }, [selectedJob?.job_id, selectedJob?.job_name, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectJob = (job: JobDefinition) => {
    setJobType(null);
    setCompliance(null);
    setSlaPolicies([]);
    setDayOfWeekSlaBars([]);
    setWeeklySlaBars([]);
    setCalendarData([]);
    setHistory([]);
    setIncidents([]);
    setOverrides([]);
    setArtifactDefs([]);
    setArtifactLiveState([]);
    setArtifactEvents([]);
    setProxyRules([]);
    setTriggerRules([]);
    setSelectedJob(job);
    setActiveTab("overview");
  };

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!selectedJob || refreshTick === 0) return;
    loadedJobIdRef.current = null;
    summaryAbortRef.current?.abort();
    tabAbortRef.current?.abort();
    const sumCtrl = new AbortController();
    const tabCtrl = new AbortController();
    summaryAbortRef.current = sumCtrl;
    tabAbortRef.current = tabCtrl;
    loadedJobIdRef.current = selectedJob.job_id;
    loadedTabsRef.current = new Set();
    Promise.all([loadSummary(selectedJob, sumCtrl.signal), loadTabData(selectedJob, activeTab, tabCtrl.signal)]).then(
      () => {
        if (!sumCtrl.signal.aborted && !tabCtrl.signal.aborted) loadedTabsRef.current.add(activeTab);
      },
    );
    return () => {
      sumCtrl.abort();
      tabCtrl.abort();
    };
  }, [refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    fetchJobs();
    if (selectedJob) setRefreshTick((t) => t + 1);
  };

  // ── Tabs list ──────────────────────────────────────────────────────────────

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

  return {
    toast,
    // Jobs list
    jobs,
    jobsLoading,
    jobsError,
    jobTypes,
    // Selected job
    selectedJob,
    jobType,
    compliance,
    slaPolicies,
    summaryLoading,
    // Tab state
    activeTab,
    setActiveTab,
    tabs,
    // Tab data
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
    // Actions
    handleSelectJob,
    handleRefresh,
  };
}
