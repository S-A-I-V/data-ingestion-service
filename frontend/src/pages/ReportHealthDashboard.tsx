/**
 * ReportHealthDashboard — Dense admin cockpit showing pipeline health
 * for every report on a given delivery date.
 */
import "../styles/report-health.css";

import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import Tooltip from "@mui/material/Tooltip";
import { Toast } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import { APP_FILTER_ALL_VALUE } from "../constants/reportHealth";
import ReportDetailDrawer from "../components/report-health/ReportDetailDrawer";
import ReportHealthFilters from "../components/report-health/ReportHealthFilters";
import StatusPill from "../components/report-health/shared/StatusPill";
import MiniBar from "../components/report-health/shared/MiniBar";
import Sev1Icon from "../components/report-health/shared/Sev1Icon";
import { fmt, fmtMins, fmtDateDmy } from "../components/report-health/shared/formatters";
import { useReportHealth } from "../hooks/useReportHealth";

export default function ReportHealthDashboard() {
  const {
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
  } = useReportHealth();

  return (
    <div className="rh-page">
      {/* Top bar */}
      <div className="rh-topbar">
        <div className="rh-topbar-title">
          <MonitorHeartIcon sx={{ fontSize: 15 }} />
          <Highlight>Report Health</Highlight>
        </div>
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

      {/* Filters */}
      <ReportHealthFilters
        filters={{ dateFilterMode, dateFrom, dateTo, reportFilter, clientFilter, sev1Filter, appFilter }}
        onChange={handleFilterChange}
        onSearch={fetch_}
        onReset={handleReset}
        loading={loading}
        filtersLoading={filtersLoading}
        appNames={availableAppNames}
        reportNames={availableReportNames}
        appFilterAllValue={APP_FILTER_ALL_VALUE}
      />

      {/* Column headers */}
      {!loading && reports.length > 0 && (
        <div className="rh-col-headers">
          <span className="rh-col--name">Report · App · Client</span>
          <span className="rh-col--status">Delivery Status</span>
          <span className="rh-col--delay">Delay Status</span>
          <span className="rh-col--bar">Steps Progress</span>
          <span className="rh-col--dur">Delay</span>
          <span className="rh-col--sla">BAM Deadline</span>
          <span className="rh-col--time">Report Start</span>
          <span className="rh-col--time">Report End</span>
          <span className="rh-col--sev1">SEV1</span>
          <span className="rh-col--date">Data Date · Coverage</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rh-empty">
          <div className="rh-spin" />
          Loading delivery data for {fmtDateDmy(resolvedDateRange.from)}…
        </div>
      )}

      {/* Empty */}
      {!loading && !error && reports.length === 0 && (
        <div className="rh-empty">
          <SearchOffIcon sx={{ fontSize: 32, opacity: 0.3 }} />
          <span>
            {hasSearched
              ? "No reports found for the selected filters"
              : "Select filters and click Search to load report health data"}
          </span>
        </div>
      )}

      {/* Report rows */}
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
              <div className="rh-col--name">
                <div className="rh-report-name" title={r.report_name}>
                  {r.report_name}
                </div>
                <div className="rh-report-meta">
                  {r.application_name}
                  {r.client_name ? ` · ${r.client_name}` : ""}
                </div>
              </div>
              <div className="rh-col--status">
                <StatusPill status={r.report_delivery_status} type="job" />
              </div>
              <div className="rh-col--delay">
                <StatusPill status={r.report_delay_status} type="delay" />
              </div>
              <div className="rh-col--bar">
                <MiniBar
                  completed={r.no_of_completed_steps}
                  total={r.total_no_of_steps}
                  delayed={r.no_of_delayed_steps}
                  status={r.report_delay_status}
                />
              </div>
              <div
                className="rh-col--dur"
                style={{
                  color: r.report_delay_duration_minutes > 0 ? "var(--warning)" : undefined,
                  fontWeight: r.report_delay_duration_minutes > 0 ? 600 : 400,
                }}
              >
                {fmtMins(r.report_delay_duration_minutes)}
              </div>
              <div className="rh-col--sla" style={{ color: slaOver ? "var(--danger)" : undefined, fontSize: 11 }}>
                {r.bam_sla ? fmt(r.bam_sla) : "—"}
              </div>
              <div className="rh-col--time" style={{ fontSize: 11 }}>
                {r.report_start_time ? fmt(r.report_start_time) : "—"}
              </div>
              <div
                className="rh-col--time"
                style={{ fontSize: 11, color: r.report_end_time ? "var(--success)" : undefined }}
              >
                {r.report_end_time ? fmt(r.report_end_time) : "—"}
              </div>
              <div className="rh-col--sev1">
                {r.sev1_numbers ? (
                  (() => {
                    const nums = r
                      .sev1_numbers!.split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const urls = r.sev1_urls?.split(",").map((s) => s.trim()) ?? [];
                    return (
                      <Tooltip
                        title={
                          <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                            {nums.map((num, i) => (
                              <div key={num}>
                                {urls[i] ? (
                                  <a href={urls[i]} target="_blank" rel="noreferrer" style={{ color: "#f87171" }}>
                                    {num} ↗
                                  </a>
                                ) : (
                                  num
                                )}
                              </div>
                            ))}
                          </div>
                        }
                        arrow
                        placement="left"
                      >
                        <div className="rh-sev1-chip">
                          <Sev1Icon size={14} />
                          <span>{nums.length > 1 ? `+${nums.length}` : nums[0]}</span>
                        </div>
                      </Tooltip>
                    );
                  })()
                ) : (
                  <span className="rh-text-muted">—</span>
                )}
              </div>
              <div className="rh-col--date" style={{ fontSize: 11 }}>
                {r.data_date}
                {r.coverage_end_date && r.coverage_end_date !== r.data_date ? (
                  <span style={{ opacity: 0.7 }}> →{r.coverage_end_date}</span>
                ) : null}
              </div>
            </div>
          );
        })}

      {/* Detail drawer */}
      {selected && <ReportDetailDrawer payload={selected} loading={detailLoading} onClose={() => setSelected(null)} />}
      <Toast toast={toast} />
    </div>
  );
}
