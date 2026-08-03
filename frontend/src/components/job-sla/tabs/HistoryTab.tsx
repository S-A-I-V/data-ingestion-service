/**
 * HistoryTab — Job live state history and SEV1 incidents table.
 * Shows historical runs with status, timing, and linked incidents.
 */

import { useMemo, useState } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WarningIcon from "@mui/icons-material/Warning";
import { Spinner } from "../../ui";
import {
  HISTORY_COLUMN_LABELS,
  INCIDENT_COLUMN_LABELS,
  STATUS_COLORS,
  DELAY_STATUS_COLORS,
} from "../../../constants/jobSla";
import type { JobLiveState, Sev1Incident, IncidentOverride } from "../../../types/jobSla";

/** UI Labels */
const LABELS = {
  LOADING: "Loading history...",
  NO_DATA: "No history data available for this date range",
  RUN_HISTORY: "Run History",
  SEV1_INCIDENTS: "SEV1 Incidents",
  OVERRIDES: "Incident Overrides",
  NO_INCIDENTS: "No SEV1 incidents in this date range",
  NO_OVERRIDES: "No incident overrides",
  SHOW_MORE: "Show more",
  SHOWING: "Showing",
  OF: "of",
} as const;

/** Initial rows to show before "show more" */
const INITIAL_ROWS_VISIBLE = 20;
const ROWS_INCREMENT = 20;

interface HistoryTabProps {
  history: JobLiveState[];
  incidents: Sev1Incident[];
  overrides: IncidentOverride[];
  loading: boolean;
}

/** Format datetime for display */
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format date only */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Format duration from seconds */
function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

/** Get status badge class */
function getStatusClass(status: string | null): string {
  if (!status) return "muted";
  return STATUS_COLORS[status.toLowerCase()] || "muted";
}

/** Get delay status badge class */
function getDelayClass(delayStatus: string | null): string {
  if (!delayStatus) return "muted";
  return DELAY_STATUS_COLORS[delayStatus.toLowerCase()] || "muted";
}

export function HistoryTab({ history, incidents, overrides, loading }: HistoryTabProps) {
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS_VISIBLE);

  // Sort history by date descending
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime()),
    [history],
  );

  const displayedHistory = sortedHistory.slice(0, visibleRows);
  const hasMoreRows = visibleRows < sortedHistory.length;

  const handleShowMore = () => {
    setVisibleRows((prev) => prev + ROWS_INCREMENT);
  };

  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label={LABELS.LOADING} />
      </div>
    );
  }

  if (history.length === 0) {
    return <div className="js-tab-empty">{LABELS.NO_DATA}</div>;
  }

  return (
    <div className="js-history-tab">
      {/* Run History Table */}
      <div className="js-history-section">
        <h3 className="js-section-title">{LABELS.RUN_HISTORY}</h3>
        <div className="js-table-container">
          <table className="js-history-table">
            <thead>
              <tr>
                <th>{HISTORY_COLUMN_LABELS.data_date}</th>
                <th>{HISTORY_COLUMN_LABELS.current_status}</th>
                <th>{HISTORY_COLUMN_LABELS.delay_status}</th>
                <th>{HISTORY_COLUMN_LABELS.start_time}</th>
                <th>{HISTORY_COLUMN_LABELS.end_time}</th>
                <th>{HISTORY_COLUMN_LABELS.job_expected_sla}</th>
                <th>{HISTORY_COLUMN_LABELS.observed_duration_seconds}</th>
                <th>{HISTORY_COLUMN_LABELS.delay_duration_minutes}</th>
                <th>{HISTORY_COLUMN_LABELS.sev1_numbers}</th>
              </tr>
            </thead>
            <tbody>
              {displayedHistory.map((row, i) => (
                <tr key={`${row.data_date}-${row.client_name}-${i}`}>
                  <td>{formatDate(row.data_date)}</td>
                  <td>
                    <span className={`js-status-badge js-status-badge--${getStatusClass(row.current_status)}`}>
                      {row.current_status || "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`js-status-badge js-status-badge--${getDelayClass(row.delay_status)}`}>
                      {row.delay_status || "on_track"}
                    </span>
                  </td>
                  <td>{formatDateTime(row.start_time)}</td>
                  <td>{formatDateTime(row.end_time)}</td>
                  <td>{formatDateTime(row.job_expected_sla)}</td>
                  <td>{formatDuration(row.observed_duration_seconds)}</td>
                  <td>{row.delay_duration_minutes ? `${row.delay_duration_minutes}m` : "—"}</td>
                  <td>{row.sev1_numbers ? <Sev1Link numbers={row.sev1_numbers} urls={row.sev1_urls} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show more / pagination info */}
        <div className="js-table-footer">
          <span className="js-table-count">
            {LABELS.SHOWING} {displayedHistory.length} {LABELS.OF} {sortedHistory.length}
          </span>
          {hasMoreRows && (
            <button type="button" className="js-show-more-btn" onClick={handleShowMore}>
              {LABELS.SHOW_MORE}
            </button>
          )}
        </div>
      </div>

      {/* SEV1 Incidents Section */}
      <div className="js-history-section">
        <h3 className="js-section-title">
          <WarningIcon sx={{ fontSize: 16, color: "var(--danger)" }} />
          {LABELS.SEV1_INCIDENTS} ({incidents.length})
        </h3>
        {incidents.length > 0 ? (
          <IncidentsTable incidents={incidents} />
        ) : (
          <div className="js-empty-section">{LABELS.NO_INCIDENTS}</div>
        )}
      </div>

      {/* Incident Overrides Section */}
      {overrides.length > 0 && (
        <div className="js-history-section">
          <h3 className="js-section-title">{LABELS.OVERRIDES}</h3>
          <OverridesTable overrides={overrides} />
        </div>
      )}
    </div>
  );
}

/** SEV1 link component */
function Sev1Link({ numbers, urls }: { numbers: string; urls: string | null }) {
  const numberList = numbers.split(",").map((n) => n.trim());
  const urlList = urls?.split(",").map((u) => u.trim()) || [];

  return (
    <div className="js-sev1-links">
      {numberList.map((num, i) => {
        const url = urlList[i];
        return url ? (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="js-sev1-link">
            {num}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </a>
        ) : (
          <span key={i} className="js-sev1-number">
            {num}
          </span>
        );
      })}
    </div>
  );
}

/** Incidents table sub-component */
function IncidentsTable({ incidents }: { incidents: Sev1Incident[] }) {
  return (
    <div className="js-table-container">
      <table className="js-history-table">
        <thead>
          <tr>
            <th>{INCIDENT_COLUMN_LABELS.data_date}</th>
            <th>{INCIDENT_COLUMN_LABELS.sev1_number}</th>
            <th>URL</th>
            <th>GSpace</th>
            <th>{INCIDENT_COLUMN_LABELS.created_at}</th>
            <th>{INCIDENT_COLUMN_LABELS.created_by}</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr key={inc.incident_id}>
              <td>{formatDate(inc.data_date)}</td>
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
              <td>{formatDateTime(inc.created_at)}</td>
              <td>{inc.created_by || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Overrides table sub-component */
function OverridesTable({ overrides }: { overrides: IncidentOverride[] }) {
  return (
    <div className="js-table-container">
      <table className="js-history-table">
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
              <td>{formatDate(ovr.data_date)}</td>
              <td>{formatDateTime(ovr.proposed_end_time)}</td>
              <td>
                {ovr.ticket_url ? (
                  <a href={ovr.ticket_url} target="_blank" rel="noopener noreferrer" className="js-link">
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>{formatDateTime(ovr.created_at)}</td>
              <td>{ovr.created_by || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
