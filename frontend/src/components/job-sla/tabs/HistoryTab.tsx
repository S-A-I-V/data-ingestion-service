/**
 * HistoryTab — Job live state history, SEV1 incidents, and overrides.
 * Uses the same Panel + data-table + pagination pattern as the Audit Log page.
 */

import { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WarningIcon from "@mui/icons-material/Warning";
import { Spinner, Panel, PanelHeader } from "../../ui";
import { STATUS_COLORS, DELAY_STATUS_COLORS } from "../../../constants/jobSla";
import type { JobLiveState, Sev1Incident, IncidentOverride } from "../../../types/jobSla";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function statusClass(s: string | null) {
  return STATUS_COLORS[(s ?? "").toLowerCase()] || "muted";
}
function delayClass(s: string | null) {
  return DELAY_STATUS_COLORS[(s ?? "").toLowerCase()] || "muted";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface HistoryTabProps {
  history: JobLiveState[];
  incidents: Sev1Incident[];
  overrides: IncidentOverride[];
  loading: boolean;
}

// ── Main component ────────────────────────────────────────────────────────────

export function HistoryTab({ history, incidents, overrides, loading }: HistoryTabProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime()),
    [history],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (r) =>
        r.data_date?.includes(q) ||
        r.current_status?.toLowerCase().includes(q) ||
        r.delay_status?.toLowerCase().includes(q) ||
        r.client_name?.toLowerCase().includes(q) ||
        r.sev1_numbers?.toLowerCase().includes(q),
    );
  }, [sorted, search]);

  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label="Loading history..." />
      </div>
    );
  }

  if (history.length === 0) {
    return <div className="js-tab-empty">No history data available for this job.</div>;
  }

  return (
    <div className="js-history-tab">
      {/* ── Run History ──────────────────────────────────────────────────── */}
      <Panel>
        <PanelHeader>
          Run History
          <span className="status-pill status-pill--info" style={{ marginLeft: "auto" }}>
            {totalFiltered}/{sorted.length} runs
          </span>
        </PanelHeader>

        {/* Search toolbar */}
        <div className="csv-toolbar">
          <div className="csv-search-wrap">
            <SearchIcon sx={{ fontSize: 16, color: "var(--text-secondary)" }} />
            <input
              className="csv-search-input"
              placeholder="Search by date, status, delay, client…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {search && (
            <div className="csv-filter-wrap">
              <button type="button" className="btn btn-sm" onClick={() => handleSearch("")}>
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="csv-preview-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data Date</th>
                <th>Status</th>
                <th>Delay Status</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>SLA Deadline</th>
                <th>Duration</th>
                <th>Delay (min)</th>
                <th>SEV1</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="csv-no-results">
                    No matching entries
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={`${row.data_date}-${row.client_name}-${i}`}>
                    <td>{fmtDate(row.data_date)}</td>
                    <td>
                      <span className={`js-status-badge js-status-badge--${statusClass(row.current_status)}`}>
                        {row.current_status || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`js-status-badge js-status-badge--${delayClass(row.delay_status)}`}>
                        {row.delay_status || "on_track"}
                      </span>
                    </td>
                    <td>{fmtDateTime(row.start_time)}</td>
                    <td>{fmtDateTime(row.end_time)}</td>
                    <td>{fmtDateTime(row.job_expected_sla)}</td>
                    <td>{fmtDuration(row.observed_duration_seconds)}</td>
                    <td>{row.delay_duration_minutes ? `${row.delay_duration_minutes}m` : "—"}</td>
                    <td>{row.sev1_numbers ? <Sev1Link numbers={row.sev1_numbers} urls={row.sev1_urls} /> : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — identical structure to AuditLog.tsx */}
        {totalFiltered > 0 && (
          <div className="csv-pagination">
            <div className="csv-page-size">
              <span>Rows per page:</span>
              {[25, 50, 100].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn btn-sm ${pageSize === s ? "btn-primary" : ""}`}
                  onClick={() => {
                    setPageSize(s);
                    setPage(0);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="csv-page-info">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalFiltered)} of {totalFiltered}
            </div>
            <div className="csv-page-nav">
              <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => setPage(0)}>
                ««
              </button>
              <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                ‹
              </button>
              <span className="csv-page-current">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                ›
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
              >
                »»
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* ── SEV1 Incidents ───────────────────────────────────────────────── */}
      <Panel>
        <PanelHeader>
          <WarningIcon sx={{ fontSize: 14, color: "var(--danger)", mr: 0.5 }} />
          SEV1 Incidents ({incidents.length})
        </PanelHeader>
        {incidents.length > 0 ? (
          <div className="csv-preview-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data Date</th>
                  <th>SEV1 #</th>
                  <th>Ticket</th>
                  <th>GSpace</th>
                  <th>Created At</th>
                  <th>Created By</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.incident_id}>
                    <td>{fmtDate(inc.data_date)}</td>
                    <td>
                      <span className="js-sev1-badge">{inc.sev1_number || "—"}</span>
                    </td>
                    <td>
                      {inc.sev1_url ? (
                        <a href={inc.sev1_url} target="_blank" rel="noopener noreferrer" className="js-link">
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {inc.gspace_url ? (
                        <a href={inc.gspace_url} target="_blank" rel="noopener noreferrer" className="js-link">
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{fmtDateTime(inc.created_at)}</td>
                    <td>{inc.created_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="js-empty-section">No SEV1 incidents in the last 90 days.</div>
        )}
      </Panel>

      {/* ── Incident Overrides ───────────────────────────────────────────── */}
      {overrides.length > 0 && (
        <Panel>
          <PanelHeader>Incident Overrides ({overrides.length})</PanelHeader>
          <div className="csv-preview-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data Date</th>
                  <th>Proposed End Time</th>
                  <th>Ticket</th>
                  <th>Created At</th>
                  <th>Created By</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((ovr) => (
                  <tr key={ovr.override_id}>
                    <td>{fmtDate(ovr.data_date)}</td>
                    <td>{fmtDateTime(ovr.proposed_end_time)}</td>
                    <td>
                      {ovr.ticket_url ? (
                        <a href={ovr.ticket_url} target="_blank" rel="noopener noreferrer" className="js-link">
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{fmtDateTime(ovr.created_at)}</td>
                    <td>{ovr.created_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── SEV1 link helper ──────────────────────────────────────────────────────────

function Sev1Link({ numbers, urls }: { numbers: string; urls: string | null }) {
  const numList = numbers.split(",").map((n) => n.trim());
  const urlList = (urls ?? "").split(",").map((u) => u.trim());
  return (
    <div className="js-sev1-links">
      {numList.map((num, i) =>
        urlList[i] ? (
          <a key={i} href={urlList[i]} target="_blank" rel="noopener noreferrer" className="js-sev1-link">
            {num}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </a>
        ) : (
          <span key={i} className="js-sev1-number">
            {num}
          </span>
        ),
      )}
    </div>
  );
}
