/**
 * ReportHealthDashboard
 *
 * Dense admin cockpit showing pipeline health for every report on a
 * given DELIVERY DATE. The primary filter is delivery_date (from
 * nfc_prod.report_live_state / reports_delivery_schedule) — the date
 * a report is due to clients. Each row also surfaces data_date,
 * coverage window, SLA, delay attribution, and step progress at a glance.
 *
 * Permission: admin:report_health
 */
import "../styles/report-health.css";
import { useState, useCallback, useMemo, useEffect } from "react";
import { format } from "date-fns";

import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import api from "../api";
import { Button, Toast, useToast } from "../components/ui";
import type { ReportHealthPayload } from "../types/reportHealth";
import { DELAY_STATUS_META, JOB_STATUS_META, APP_FILTER_ALL_VALUE } from "../constants/reportHealth";
import ReportDetailDrawer from "../components/report-health/ReportDetailDrawer";
import ReportHealthFilters from "../components/report-health/ReportHealthFilters";
import type { DateFieldMode } from "../components/report-health/ReportHealthFilters";

// ── Helpers ────────────────────────────────────────────────

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Format UTC time — always shows UTC, never locale */
function fmtUtc(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon}, ${hh}:${mm}`;
}

function fmtDelay(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function StatusPill({ status, type = "delay" }: { status: string; type?: "delay" | "job" }) {
  const meta =
    type === "job"
      ? JOB_STATUS_META[status] ?? JOB_STATUS_META["scheduled"]
      : DELAY_STATUS_META[status] ?? DELAY_STATUS_META["unknown_state"];
  return (
    <span className="rh-pill" style={{ background: meta.bg, color: meta.color }}>
      <span className="rh-pill-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function MiniBar({
  completed,
  total,
  delayed,
  status,
}: {
  completed: number;
  total: number;
  delayed: number;
  status: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const cls =
    status === "client_delayed"
      ? "rh-mini-fill--delayed"
      : status === "internal_delayed"
        ? "rh-mini-fill--warn"
        : pct === 100
          ? "rh-mini-fill--ok"
          : "rh-mini-fill--prog";
  return (
    <div className="rh-mini-bar">
      <div className="rh-mini-track">
        <div className={`rh-mini-fill ${cls}`} style={{ width: `${pct}%` }} aria-label={`${pct}%`} />
      </div>
      <div className="rh-mini-numbers">
        {completed}/{total}
        {delayed > 0 && (
          <>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span style={{ color: "var(--warning)" }}>{delayed} delayed</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export default function ReportHealthDashboard() {
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

  // ── Filter state ──
  const [dateFilterMode, setDateFilterMode] = useState<DateFieldMode>("delivery_date");
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());

  const [reportFilter, setReportFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [sev1Filter, setSev1Filter] = useState("");
  const [appFilter, setAppFilter] = useState<string>(APP_FILTER_ALL_VALUE);

  const [selected, setSelected] = useState<ReportHealthPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useToast();

  // ── Available filter options (fetched on mount from report_definitions) ──
  const [availableReportNames, setAvailableReportNames] = useState<string[]>([]);
  const [availableAppNames, setAvailableAppNames] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  useEffect(() => {
    setFiltersLoading(true);
    api
      .get<{ report_names: string[]; application_names: string[] }>("/admin/report-health/filters")
      .then((res) => {
        setAvailableReportNames(res.data.report_names ?? []);
        setAvailableAppNames(res.data.application_names ?? []);
      })
      .catch(() => {
        // Non-fatal — dropdowns will just be empty
      })
      .finally(() => setFiltersLoading(false));
  }, []);

  // Delivery date range — always uses dateFrom/dateTo directly
  const resolvedDateRange = useMemo(() => {
    return { from: dateFrom, to: dateTo };
  }, [dateFrom, dateTo]);

  // ── Fetch (manual trigger only — all filtering done server-side) ──

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { delivery_date: resolvedDateRange.from };
      if (resolvedDateRange.to !== resolvedDateRange.from) {
        params.delivery_date_to = resolvedDateRange.to;
      }
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
    } catch (e: any) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail;
      if (status === 404) {
        setReports([]);
        setCounts({ total: 0, in_progress: 0, client_delayed: 0, internal_delayed: 0, completed: 0 });
      } else if (status === 403) {
        setError("Permission denied — requires admin:report_health.");
      } else {
        setError(detail || "Failed to load.");
        setToast({ ok: false, msg: detail || "Failed to load." });
      }
    }
    setLoading(false);
  }, [resolvedDateRange, reportFilter, clientFilter, appFilter, sev1Filter, setToast]);

  // NO auto-fetch on mount — user must click Search

  // ── Detail fetch (on-demand when report row is clicked) ──

  const fetchDetail = useCallback(
    async (payload: ReportHealthPayload) => {
      const r = payload.report;
      // Open drawer immediately with report-level data (no jobs yet)
      setSelected(payload);
      setDetailLoading(true);
      try {
        const res = await api.get<ReportHealthPayload>(`/admin/report-health/${r.report_id}/detail`, {
          params: {
            data_date: r.data_date,
            delivery_date: r.delivery_date,
            client_name: r.client_name ?? "",
          },
        });
        setSelected(res.data);
      } catch (e: any) {
        const detail = e.response?.data?.detail;
        setToast({ ok: false, msg: detail || "Failed to load report detail." });
        // Keep drawer open with report-level data
      }
      setDetailLoading(false);
    },
    [setToast],
  );

  // ── Derived ──────────────────────────────────────────────
  // Frontend is dumb — no filtering, no counting. Just display what the API returns.

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="rh-page">
      {/* ── Top bar ── */}
      <div className="rh-topbar">
        <div className="rh-topbar-title">
          <MonitorHeartIcon sx={{ fontSize: 15 }} />
          Report Health
        </div>

        {/* Status strip — display only */}
        <div className="rh-status-strip">
          {[
            { cls: "rh-strip-cell--total", num: counts.total, lbl: "Total" },
            { cls: "rh-strip-cell--prog", num: counts.in_progress, lbl: "In Progress" },
            { cls: "rh-strip-cell--delayed", num: counts.client_delayed, lbl: "Client Delayed" },
            { cls: "rh-strip-cell--warn", num: counts.internal_delayed, lbl: "Internal Delay" },
            { cls: "rh-strip-cell--ok", num: counts.completed, lbl: "Completed" },
          ].map((s) => (
            <div key={s.lbl} className={`rh-strip-cell ${s.cls}`}>
              <span className="rh-strip-num">{s.num}</span>
              <span className="rh-strip-label">{s.lbl}</span>
            </div>
          ))}
        </div>

        <div className="rh-topbar-spacer" />
        {lastRefreshed && (
          <span className="rh-last-updated">
            {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {error && (
        <div className="lookup-error-badge" style={{ marginBottom: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ── Filter panel ── */}
      <ReportHealthFilters
        filters={{ dateFilterMode, dateFrom, dateTo, reportFilter, clientFilter, sev1Filter, appFilter }}
        onChange={(patch) => {
          if (patch.dateFilterMode !== undefined) setDateFilterMode(patch.dateFilterMode);
          if (patch.dateFrom !== undefined) setDateFrom(patch.dateFrom);
          if (patch.dateTo !== undefined) setDateTo(patch.dateTo);
          if (patch.reportFilter !== undefined) setReportFilter(patch.reportFilter);
          if (patch.clientFilter !== undefined) setClientFilter(patch.clientFilter);
          if (patch.sev1Filter !== undefined) setSev1Filter(patch.sev1Filter);
          if (patch.appFilter !== undefined) setAppFilter(patch.appFilter);
        }}
        onSearch={() => fetch_()}
        onReset={() => {
          setDateFilterMode("delivery_date");
          setDateFrom(todayIso());
          setDateTo(todayIso());
          setReportFilter("");
          setClientFilter("");
          setSev1Filter("");
          setAppFilter(APP_FILTER_ALL_VALUE);
        }}
        loading={loading}
        filtersLoading={filtersLoading}
        appNames={availableAppNames}
        reportNames={availableReportNames}
        appFilterAllValue={APP_FILTER_ALL_VALUE}
      />

      {/* ── Column headers ── */}
      {!loading && reports.length > 0 && (
        <div className="rh-col-headers">
          <span className="rh-col--name">Report · App · Client</span>
          <span className="rh-col--status">Delivery Status</span>
          <span className="rh-col--delay">Delay Status</span>
          <span className="rh-col--bar">Steps Progress</span>
          <span className="rh-col--dur">Delay Duration</span>
          <span className="rh-col--sla">BAM Deadline</span>
          <span className="rh-col--time">Report Start</span>
          <span className="rh-col--time">Report End</span>
          <span className="rh-col--date">Data Date · Coverage</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="rh-empty">
          <div className="rh-spin" />
          Loading delivery data for {fmtDate(resolvedDateRange.from)}…
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && reports.length === 0 && (
        <div className="rh-empty">
          <SearchOffIcon sx={{ fontSize: 32, opacity: 0.3 }} />
          <span>
            {reports.length === 0
              ? `No reports scheduled for delivery on ${fmtDate(resolvedDateRange.from)}`
              : "No reports match current filters"}
          </span>
        </div>
      )}

      {/* ── Report rows ── */}
      {!loading &&
        reports.map((payload) => {
          const r = payload.report;
          const isSel = selected?.report.report_id === r.report_id && selected.report.data_date === r.data_date;
          const isCrit = r.report_delay_status === "client_delayed";
          const isWarn = r.report_delay_status === "internal_delayed";
          const slaOver = r.bam_sla && new Date(r.bam_sla) < new Date() && r.report_delivery_status !== "success";

          return (
            <div
              key={`${r.report_id}-${r.data_date}-${r.client_name}`}
              className={`rh-row${isSel ? " rh-row--selected" : ""}${isCrit ? " rh-row--critical" : isWarn ? " rh-row--warning" : ""}`}
              onClick={() => fetchDetail(payload)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fetchDetail(payload)}
            >
              {/* Name + meta */}
              <div className="rh-col--name">
                <div className="rh-report-name" title={r.report_name}>
                  {r.report_name}
                </div>
                <div className="rh-report-meta">
                  {r.application_name}
                  {r.client_name ? ` · ${r.client_name}` : ""}
                </div>
              </div>

              {/* Delivery status */}
              <div className="rh-col--status">
                <StatusPill status={r.report_delivery_status} type="job" />
              </div>

              {/* Delay status */}
              <div className="rh-col--delay">
                <StatusPill status={r.report_delay_status} type="delay" />
              </div>

              {/* Progress bar */}
              <div className="rh-col--bar">
                <MiniBar
                  completed={r.no_of_completed_steps}
                  total={r.total_no_of_steps}
                  delayed={r.no_of_delayed_steps}
                  status={r.report_delay_status}
                />
              </div>

              {/* Delay duration */}
              <div
                className="rh-col--dur"
                style={{
                  color: r.report_delay_duration_minutes > 0 ? "var(--warning)" : undefined,
                  fontWeight: r.report_delay_duration_minutes > 0 ? 600 : 400,
                }}
              >
                {fmtDelay(r.report_delay_duration_minutes)}
              </div>

              {/* BAM SLA — UTC only */}
              <div className="rh-col--sla" style={{ color: slaOver ? "var(--danger)" : undefined, fontSize: 11 }}>
                {r.bam_sla ? fmtUtc(r.bam_sla) : "—"}
              </div>

              {/* Report Start */}
              <div className="rh-col--time" style={{ fontSize: 11 }}>
                {r.report_start_time ? fmtUtc(r.report_start_time) : "—"}
              </div>

              {/* Report End */}
              <div
                className="rh-col--time"
                style={{ fontSize: 11, color: r.report_end_time ? "var(--success)" : undefined }}
              >
                {r.report_end_time ? fmtUtc(r.report_end_time) : "—"}
              </div>

              {/* Data date + coverage window */}
              <div className="rh-col--date" style={{ fontSize: 11 }}>
                {r.data_date}
                {r.coverage_end_date && r.coverage_end_date !== r.data_date ? (
                  <span style={{ opacity: 0.7 }}> →{r.coverage_end_date}</span>
                ) : null}
              </div>
            </div>
          );
        })}

      {/* ── Detail drawer ── */}
      {selected && <ReportDetailDrawer payload={selected} loading={detailLoading} onClose={() => setSelected(null)} />}

      <Toast toast={toast} />
    </div>
  );
}
