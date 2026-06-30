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
import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";

/** Date range type matching react-day-picker v9 range mode callback */
interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import api from "../api";
import { Button, Toast, useToast, Popover, PopoverTrigger, PopoverContent, Calendar } from "../components/ui";
import type { ReportHealthPayload } from "../types/reportHealth";
import {
  DELAY_STATUS_META,
  JOB_STATUS_META,
  STATUS_FILTERS,
  APP_FILTER_ALL_VALUE,
  REPORT_HEALTH_POLL_INTERVAL_MS,
} from "../constants/reportHealth";
import ReportDetailDrawer from "../components/report-health/ReportDetailDrawer";

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

function isDelayed(r: ReportHealthPayload) {
  return r.report.report_delay_status === "client_delayed" || r.report.report_delay_status === "internal_delayed";
}

function matchFilter(r: ReportHealthPayload, f: string) {
  if (f === "all") return true;
  if (f === "delayed") return isDelayed(r);
  if (f === "in_progress") return r.report.report_delivery_status === "in_progress";
  if (f === "success") return r.report.report_delivery_status === "success";
  if (f === "scheduled") return r.report.report_delivery_status === "scheduled";
  return true;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Date range — from = delivery start, to = delivery end (inclusive).
  // API queries delivery_date BETWEEN from AND to.
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(todayIso() + "T12:00:00"),
    to: new Date(todayIso() + "T12:00:00"),
  });
  const [calOpen, setCalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState(APP_FILTER_ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState("all");

  const [selected, setSelected] = useState<ReportHealthPayload | null>(null);
  const [toast, setToast] = useToast();

  // Derived delivery date strings from range
  const deliveryDateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : todayIso();
  const deliveryDateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : deliveryDateFrom;

  // ── Fetch ────────────────────────────────────────────────

  const fetch_ = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await api.get<ReportHealthPayload[]>("/admin/report-health/", {
          params: { delivery_date: deliveryDateFrom },
        });
        setReports(res.data ?? []);
        setLastRefreshed(new Date());
      } catch (e: any) {
        const status = e.response?.status;
        const detail = e.response?.data?.detail;
        if (status === 404) {
          setReports([]);
        } else if (status === 403) {
          setError("Permission denied — requires admin:report_health.");
        } else {
          setError(detail || "Failed to load.");
          if (!silent) setToast({ ok: false, msg: detail || "Failed to load." });
        }
      }
      if (!silent) setLoading(false);
    },
    [deliveryDateFrom, setToast],
  );

  // Initial load + re-fetch on date change
  useEffect(() => {
    fetch_();
  }, [fetch_]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!REPORT_HEALTH_POLL_INTERVAL_MS) return;
    const id = setInterval(() => fetch_(true), REPORT_HEALTH_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch_]);

  // ── Derived ──────────────────────────────────────────────

  const appNames = useMemo(() => {
    const s = new Set(reports.map((r) => r.report.application_name).filter(Boolean));
    return Array.from(s).sort();
  }, [reports]);

  const filtered = useMemo(() => {
    let list = reports;
    if (appFilter !== APP_FILTER_ALL_VALUE) list = list.filter((r) => r.report.application_name === appFilter);
    list = list.filter((r) => matchFilter(r, statusFilter));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.report.report_name.toLowerCase().includes(q) ||
          r.report.application_name.toLowerCase().includes(q) ||
          (r.report.client_name ?? "").toLowerCase().includes(q) ||
          (r.report.delayed_job_name ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [reports, appFilter, statusFilter, search]);

  // Status strip counts
  const counts = useMemo(
    () => ({
      total: reports.length,
      prog: reports.filter((r) => r.report.report_delivery_status === "in_progress").length,
      delayed: reports.filter((r) => isDelayed(r)).length,
      warn: reports.filter((r) => r.report.report_delay_status === "internal_delayed").length,
      ok: reports.filter((r) => r.report.report_delivery_status === "success").length,
    }),
    [reports],
  );

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="rh-page">
      {/* ── Top bar ── */}
      <div className="rh-topbar">
        <div className="rh-topbar-title">
          <MonitorHeartIcon sx={{ fontSize: 15 }} />
          Report Health
        </div>

        {/* Inline status strip — clickable to set filter */}
        <div className="rh-status-strip">
          {[
            { key: "all", cls: "rh-strip-cell--total", num: counts.total, lbl: "Total" },
            { key: "in_progress", cls: "rh-strip-cell--prog", num: counts.prog, lbl: "In Progress" },
            { key: "delayed", cls: "rh-strip-cell--delayed", num: counts.delayed, lbl: "Client Delayed" },
            { key: "internal", cls: "rh-strip-cell--warn", num: counts.warn, lbl: "Internal Delay" },
            { key: "success", cls: "rh-strip-cell--ok", num: counts.ok, lbl: "Completed" },
          ].map((s) => (
            <div
              key={s.key}
              className={`rh-strip-cell ${s.cls}${statusFilter === s.key ? " active" : ""}`}
              onClick={() => setStatusFilter(s.key === "internal" ? "internal_delayed" : s.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setStatusFilter(s.key)}
            >
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
        <Button variant="ghost" size="sm" onClick={() => fetch_()} disabled={loading}>
          <RefreshIcon sx={{ fontSize: 13 }} />
          {loading ? "…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="lookup-error-badge" style={{ marginBottom: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="rh-filterbar">
        <input
          type="search"
          className="rh-search"
          placeholder="Search report name, app, client, delayed job…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search reports"
        />

        {/* Date range picker — delivery date filter */}
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`rh-date-btn${calOpen ? " rh-date-btn--active" : ""}`}
              aria-label="Select delivery date range"
            >
              <span className="rh-date-label">Delivery</span>
              <CalendarTodayIcon sx={{ fontSize: 12, opacity: 0.6 }} />
              {deliveryDateFrom === deliveryDateTo
                ? fmtDate(deliveryDateFrom)
                : `${fmtDate(deliveryDateFrom)} – ${fmtDate(deliveryDateTo)}`}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 rh-cal-popover" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                if (range?.from && range?.to) setTimeout(() => setCalOpen(false), 200);
              }}
              numberOfMonths={2}
              className="rounded-lg border border-white/10"
            />
          </PopoverContent>
        </Popover>

        {/* App name filter */}
        {appNames.length > 0 && (
          <select
            className="rh-select"
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            aria-label="Filter by application"
          >
            <option value={APP_FILTER_ALL_VALUE}>All Apps</option>
            {appNames.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}

        {/* Status tabs */}
        <div className="rh-status-tabs">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`rh-status-tab${statusFilter === f.value ? (f.value === "delayed" ? " active-delayed" : " active") : ""}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
              {f.value !== "all" && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  (
                  {f.value === "delayed"
                    ? counts.delayed
                    : f.value === "in_progress"
                      ? counts.prog
                      : f.value === "success"
                        ? counts.ok
                        : reports.filter((r) => r.report.report_delivery_status === f.value).length}
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Column headers ── */}
      {!loading && filtered.length > 0 && (
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
          Loading delivery data for {fmtDate(deliveryDateFrom)}…
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="rh-empty">
          <SearchOffIcon sx={{ fontSize: 32, opacity: 0.3 }} />
          <span>
            {reports.length === 0
              ? `No reports scheduled for delivery on ${fmtDate(deliveryDateFrom)}`
              : "No reports match current filters"}
          </span>
        </div>
      )}

      {/* ── Report rows ── */}
      {!loading &&
        filtered.map((payload) => {
          const r = payload.report;
          const isSel = selected?.report.report_id === r.report_id && selected.report.data_date === r.data_date;
          const isCrit = r.report_delay_status === "client_delayed";
          const isWarn = r.report_delay_status === "internal_delayed";
          const slaOver = r.bam_sla && new Date(r.bam_sla) < new Date() && r.report_delivery_status !== "success";

          return (
            <div
              key={`${r.report_id}-${r.data_date}-${r.client_name}`}
              className={`rh-row${isSel ? " rh-row--selected" : ""}${isCrit ? " rh-row--critical" : isWarn ? " rh-row--warning" : ""}`}
              onClick={() => setSelected(payload)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelected(payload)}
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
      {selected && <ReportDetailDrawer payload={selected} onClose={() => setSelected(null)} />}

      <Toast toast={toast} />
    </div>
  );
}
