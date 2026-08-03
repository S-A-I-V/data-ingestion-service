/**
 * ArtifactsTab — Artifact definitions and live state for artifact-type jobs.
 * Shows expected artifacts, their current status, and event history.
 */

import { useMemo, useState } from "react";
import FolderIcon from "@mui/icons-material/Folder";
import { Spinner } from "../../ui";
import { ARTIFACT_COLUMN_LABELS, STATUS_COLORS } from "../../../constants/jobSla";
import type { ArtifactDefinition, ArtifactLiveState, ArtifactEvent } from "../../../types/jobSla";

/** UI Labels */
const LABELS = {
  LOADING: "Loading artifacts...",
  NO_DATA: "No artifact data available",
  DEFINITIONS: "Artifact Definitions",
  LIVE_STATE: "Artifact Status",
  EVENTS: "Recent Events",
  NO_DEFINITIONS: "No artifact definitions configured",
  NO_LIVE_STATE: "No artifact status data for this date range",
  NO_EVENTS: "No artifact events",
  SHOW_MORE: "Show more",
} as const;

/** Rows to show initially */
const INITIAL_ROWS = 15;
const ROWS_INCREMENT = 15;

interface ArtifactsTabProps {
  definitions: ArtifactDefinition[];
  liveState: ArtifactLiveState[];
  events: ArtifactEvent[];
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

/** Get status badge class */
function getStatusClass(status: string | null): string {
  if (!status) return "muted";
  const lower = status.toLowerCase();
  return STATUS_COLORS[lower] || "muted";
}

export function ArtifactsTab({ definitions, liveState, events, loading }: ArtifactsTabProps) {
  const [visibleLiveState, setVisibleLiveState] = useState(INITIAL_ROWS);
  const [visibleEvents, setVisibleEvents] = useState(INITIAL_ROWS);

  // Sort live state by date descending
  const sortedLiveState = useMemo(
    () => [...liveState].sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime()),
    [liveState],
  );

  // Sort events by created_at descending
  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }),
    [events],
  );

  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label={LABELS.LOADING} />
      </div>
    );
  }

  if (definitions.length === 0 && liveState.length === 0) {
    return <div className="js-tab-empty">{LABELS.NO_DATA}</div>;
  }

  return (
    <div className="js-artifacts-tab">
      {/* Artifact Definitions */}
      <div className="js-history-section">
        <h3 className="js-section-title">
          <FolderIcon sx={{ fontSize: 16 }} />
          {LABELS.DEFINITIONS} ({definitions.length})
        </h3>
        {definitions.length > 0 ? (
          <DefinitionsTable definitions={definitions} />
        ) : (
          <div className="js-empty-section">{LABELS.NO_DEFINITIONS}</div>
        )}
      </div>

      {/* Artifact Live State */}
      <div className="js-history-section">
        <h3 className="js-section-title">{LABELS.LIVE_STATE}</h3>
        {sortedLiveState.length > 0 ? (
          <>
            <LiveStateTable liveState={sortedLiveState.slice(0, visibleLiveState)} />
            {visibleLiveState < sortedLiveState.length && (
              <button
                type="button"
                className="js-show-more-btn"
                onClick={() => setVisibleLiveState((v) => v + ROWS_INCREMENT)}
              >
                {LABELS.SHOW_MORE}
              </button>
            )}
          </>
        ) : (
          <div className="js-empty-section">{LABELS.NO_LIVE_STATE}</div>
        )}
      </div>

      {/* Artifact Events */}
      {sortedEvents.length > 0 && (
        <div className="js-history-section">
          <h3 className="js-section-title">{LABELS.EVENTS}</h3>
          <EventsTable events={sortedEvents.slice(0, visibleEvents)} />
          {visibleEvents < sortedEvents.length && (
            <button
              type="button"
              className="js-show-more-btn"
              onClick={() => setVisibleEvents((v) => v + ROWS_INCREMENT)}
            >
              {LABELS.SHOW_MORE}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Definitions table sub-component */
function DefinitionsTable({ definitions }: { definitions: ArtifactDefinition[] }) {
  return (
    <div className="js-table-container">
      <table className="js-history-table">
        <thead>
          <tr>
            <th>Pattern</th>
            <th>Type</th>
            <th>Expected Count</th>
            <th>Completion Trigger</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {definitions.map((def) => (
            <tr key={def.definition_id}>
              <td className="js-mono">{def.artifact_pattern || "—"}</td>
              <td>{def.type || "—"}</td>
              <td>{def.expected_count ?? "—"}</td>
              <td>{def.completion_trigger || "—"}</td>
              <td>{def.source_type || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Live state table sub-component */
function LiveStateTable({ liveState }: { liveState: ArtifactLiveState[] }) {
  return (
    <div className="js-table-container">
      <table className="js-history-table">
        <thead>
          <tr>
            <th>{ARTIFACT_COLUMN_LABELS.data_date}</th>
            <th>{ARTIFACT_COLUMN_LABELS.actual_filename}</th>
            <th>{ARTIFACT_COLUMN_LABELS.status}</th>
            <th>{ARTIFACT_COLUMN_LABELS.received_time}</th>
            <th>{ARTIFACT_COLUMN_LABELS.release_time}</th>
            <th>{ARTIFACT_COLUMN_LABELS.completion_percent}</th>
          </tr>
        </thead>
        <tbody>
          {liveState.map((row) => (
            <tr key={row.artifact_id}>
              <td>{row.data_date}</td>
              <td className="js-mono js-truncate" title={row.actual_filename || ""}>
                {row.actual_filename || "—"}
              </td>
              <td>
                <span className={`js-status-badge js-status-badge--${getStatusClass(row.status)}`}>
                  {row.status || "—"}
                </span>
              </td>
              <td>{formatDateTime(row.received_time)}</td>
              <td>{formatDateTime(row.release_time)}</td>
              <td>{row.completion_percent != null ? `${row.completion_percent}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Events table sub-component */
function EventsTable({ events }: { events: ArtifactEvent[] }) {
  return (
    <div className="js-table-container">
      <table className="js-history-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>File</th>
            <th>Status</th>
            <th>Source</th>
            <th>Report</th>
          </tr>
        </thead>
        <tbody>
          {events.map((evt) => (
            <tr key={evt.event_id}>
              <td>{formatDateTime(evt.event_timestamp || evt.created_at)}</td>
              <td className="js-mono js-truncate" title={evt.file_name || ""}>
                {evt.file_name || "—"}
              </td>
              <td>
                <span className={`js-status-badge js-status-badge--${getStatusClass(evt.status)}`}>
                  {evt.status || "—"}
                </span>
              </td>
              <td>{evt.source_type || "—"}</td>
              <td>{evt.report_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
