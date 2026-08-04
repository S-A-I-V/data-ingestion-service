/**
 * useReportHealth — Custom hook for the Report Health Dashboard page.
 * Encapsulates all state, filter logic, data fetching, and detail loading.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import api from "../api";
import { useToast } from "../components/ui";
import type { ReportHealthPayload } from "../types/reportHealth";
import { APP_FILTER_ALL_VALUE } from "../constants/reportHealth";
import type { DateFieldMode } from "../components/report-health/ReportHealthFilters";
import { todayIso } from "../components/report-health/shared/formatters";

export function useReportHealth() {
  const [reports, setReports] = useState<ReportHealthPayload[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    in_progress: 0,
    client_delayed: 0,
    internal_delayed: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filter state
  const [dateFilterMode, setDateFilterMode] = useState<DateFieldMode>("delivery_date");
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [reportFilter, setReportFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [sev1Filter, setSev1Filter] = useState("");
  const [appFilter, setAppFilter] = useState<string>(APP_FILTER_ALL_VALUE);

  // Detail state
  const [selected, setSelected] = useState<ReportHealthPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useToast();

  // Available filter options
  const [availableReportNames, setAvailableReportNames] = useState<string[]>([]);
  const [availableAppNames, setAvailableAppNames] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Load filter options on mount
  useEffect(() => {
    setFiltersLoading(true);
    api
      .get<{ report_names: string[]; application_names: string[] }>("/admin/report-health/filters")
      .then((res) => {
        setAvailableReportNames(res.data.report_names ?? []);
        setAvailableAppNames(res.data.application_names ?? []);
      })
      .catch(() => {})
      .finally(() => setFiltersLoading(false));
  }, []);

  const resolvedDateRange = useMemo(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { delivery_date: resolvedDateRange.from };
      if (resolvedDateRange.to !== resolvedDateRange.from) params.delivery_date_to = resolvedDateRange.to;
      if (reportFilter) params.report_name = reportFilter;
      if (clientFilter) params.client_name = clientFilter;
      if (appFilter && appFilter !== APP_FILTER_ALL_VALUE) params.application_name = appFilter;
      if (sev1Filter) params.sev1 = sev1Filter;

      const res = await api.get<{
        reports: ReportHealthPayload[];
        summary: {
          total: number;
          in_progress: number;
          client_delayed: number;
          internal_delayed: number;
          completed: number;
        };
      }>("/admin/report-health/", { params });
      setReports(res.data.reports ?? []);
      setCounts(res.data.summary ?? { total: 0, in_progress: 0, client_delayed: 0, internal_delayed: 0, completed: 0 });
      setLastRefreshed(new Date());
      setHasSearched(true);
    } catch (e: any) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail;
      if (status === 404) {
        setReports([]);
        setCounts({ total: 0, in_progress: 0, client_delayed: 0, internal_delayed: 0, completed: 0 });
      } else if (status === 403) setError("Permission denied — requires admin:report_health.");
      else {
        setError(detail || "Failed to load.");
        setToast({ ok: false, msg: detail || "Failed to load." });
      }
    }
    setLoading(false);
  }, [resolvedDateRange, reportFilter, clientFilter, appFilter, sev1Filter, setToast]);

  // ── Detail fetch ───────────────────────────────────────────────────────────

  const fetchDetail = useCallback(
    async (payload: ReportHealthPayload) => {
      const r = payload.report;
      setSelected(payload);
      setDetailLoading(true);
      try {
        const res = await api.get<ReportHealthPayload>(`/admin/report-health/${r.report_id}/detail`, {
          params: { data_date: r.data_date, delivery_date: r.delivery_date, client_name: r.client_name ?? "" },
        });
        setSelected(res.data);
      } catch (e: any) {
        setToast({ ok: false, msg: e.response?.data?.detail || "Failed to load report detail." });
      }
      setDetailLoading(false);
    },
    [setToast],
  );

  // ── Filter change handler (for ReportHealthFilters component) ──────────────

  const handleFilterChange = useCallback((patch: any) => {
    if (patch.dateFilterMode !== undefined) setDateFilterMode(patch.dateFilterMode);
    if (patch.dateFrom !== undefined) setDateFrom(patch.dateFrom);
    if (patch.dateTo !== undefined) setDateTo(patch.dateTo);
    if (patch.reportFilter !== undefined) setReportFilter(patch.reportFilter);
    if (patch.clientFilter !== undefined) setClientFilter(patch.clientFilter);
    if (patch.sev1Filter !== undefined) setSev1Filter(patch.sev1Filter);
    if (patch.appFilter !== undefined) setAppFilter(patch.appFilter);
  }, []);

  const handleReset = useCallback(() => {
    setDateFilterMode("delivery_date");
    setDateFrom(todayIso());
    setDateTo(todayIso());
    setReportFilter("");
    setClientFilter("");
    setSev1Filter("");
    setAppFilter(APP_FILTER_ALL_VALUE);
    setReports([]);
    setCounts({ total: 0, in_progress: 0, client_delayed: 0, internal_delayed: 0, completed: 0 });
    setHasSearched(false);
  }, []);

  return {
    toast,
    reports,
    counts,
    loading,
    error,
    lastRefreshed,
    hasSearched,
    dateFilterMode,
    dateFrom,
    dateTo,
    reportFilter,
    clientFilter,
    sev1Filter,
    appFilter,
    selected,
    setSelected,
    detailLoading,
    availableReportNames,
    availableAppNames,
    filtersLoading,
    resolvedDateRange,
    fetch_,
    fetchDetail,
    handleFilterChange,
    handleReset,
  };
}
