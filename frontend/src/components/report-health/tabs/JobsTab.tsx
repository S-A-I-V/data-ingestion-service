/**
 * JobsTab — compact job table with expandable rows showing heatmap + per-run details.
 */
import React, { useState, useCallback } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import Tooltip from "@mui/material/Tooltip";
import Pill from "../shared/Pill";
import Heatmap from "../shared/Heatmap";
import SrcBadge from "../shared/SrcBadge";
import { fmt } from "../shared/formatters";
import type { ReportJob } from "../../../types/reportHealth";
import { RUN_MODE_LABELS } from "../../../constants/reportHealth";

interface Props {
  jobs: ReportJob[];
}

export default function JobsTab({ jobs }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const toggle = useCallback((id: number) => setExpanded((p) => (p === id ? null : id)), []);

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
        {jobs.length} jobs · click row to expand heatmap + run details
      </div>
      <div className="rh-jobs-wrap">
        <table className="rh-jobs-tbl">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Delay</th>
              <th>Progress</th>
              <th>Actual Start</th>
              <th>Actual End</th>
              <th>Expected End (SLA)</th>
              <th>Mode</th>
              <th>Source</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <React.Fragment key={job.job_id}>
                <tr onClick={() => toggle(job.job_id)}>
                  <td>
                    <div className="rh-job-name-cell" title={job.job_name}>
                      {job.job_name}
                      {job.is_final_step && <span className="rh-final-badge">FINAL</span>}
                    </div>
                    {job.previous_jobs_list && (
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>
                        ← {job.previous_jobs_list.split(",").length} dep(s)
                      </div>
                    )}
                  </td>
                  <td>
                    <Pill status={job.delay_status} />
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                      <div
                        style={{
                          height: 3,
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.07)",
                          width: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 2,
                            width: `${job.required_runs > 0 ? Math.round((job.completed_required_runs / job.required_runs) * 100) : 0}%`,
                            background:
                              job.delay_status === "client_delayed"
                                ? "var(--danger)"
                                : job.delay_status === "internal_delayed"
                                  ? "var(--warning)"
                                  : "var(--success)",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {job.completed_required_runs}/{job.required_runs}
                        {job.delayed_required_runs > 0 && (
                          <>
                            <span style={{ color: "var(--text-muted)" }}> · </span>
                            <span style={{ color: "var(--warning)" }}>{job.delayed_required_runs} delayed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 10, whiteSpace: "nowrap" }}>{fmt(job.start_time)}</td>
                  <td style={{ fontSize: 10, whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {fmt(job.end_time)}
                  </td>
                  <td style={{ fontSize: 10, whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {fmt(job.job_expected_sla)}
                  </td>
                  <td style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {RUN_MODE_LABELS[job.run_requirement_mode] ?? job.run_requirement_mode}
                  </td>
                  <td>
                    <SrcBadge src={job.message_source} />
                  </td>
                  <td>
                    <Tooltip
                      title={
                        <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                          <div>Owner: {job.job_owner_name || "null"}</div>
                          <div>On-Call: {job.oncall_name || "null"}</div>
                          <div>L3: {job.L3_owner_name || "null"}</div>
                          <div>DL: {job.support_team_DL || "null"}</div>
                        </div>
                      }
                      arrow
                      placement="left"
                    >
                      <ContactPhoneIcon sx={{ fontSize: 14, color: "var(--text-muted)", cursor: "default" }} />
                    </Tooltip>
                  </td>
                </tr>
                {expanded === job.job_id && (
                  <tr>
                    <td colSpan={9} style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px" }}>
                      <div style={{ marginBottom: 10 }}>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.4px",
                            marginBottom: 5,
                            fontWeight: 600,
                          }}
                        >
                          Run Heatmap · {job.run_statuses.length} dates
                        </div>
                        <Heatmap job={job} />
                      </div>
                      <PerRunTable job={job} />
                      {job.job_url && (
                        <div style={{ marginTop: 6 }}>
                          <a
                            href={job.job_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "var(--accent-light)",
                              fontSize: 10,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 10 }} />
                            {job.orchestrator_name ?? "Open in orchestrator"}
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Per-run detail table showing timestamps, duration, SLA for each data_date */
function PerRunTable({ job }: { job: ReportJob }) {
  const th: React.CSSProperties = {
    padding: "4px 8px",
    textAlign: "left",
    color: "var(--text-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };
  return (
    <div style={{ overflowX: "auto", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.025)" }}>
            <th style={th}>Data Date</th>
            <th style={th}>Status</th>
            <th style={th}>Actual Start</th>
            <th style={th}>Actual End</th>
            <th style={th}>Duration</th>
            <th style={th}>Expected Start</th>
            <th style={th}>Expected End (SLA)</th>
            <th style={th}>Delay</th>
          </tr>
        </thead>
        <tbody>
          {job.run_statuses.map((run) => {
            const dur =
              run.start_time && run.end_time
                ? Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 60000)
                : null;
            return (
              <tr key={String(run.data_date)} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "4px 8px", color: "var(--text-primary)" }}>
                  {String(run.data_date).slice(0, 10)}
                </td>
                <td style={{ padding: "4px 8px" }}>
                  <Pill status={run.delay_status} />
                </td>
                <td style={{ padding: "4px 8px", color: "var(--text-primary)" }}>
                  {run.start_time ? fmt(run.start_time) : "—"}
                </td>
                <td style={{ padding: "4px 8px", color: "var(--text-primary)" }}>
                  {run.end_time ? fmt(run.end_time) : "—"}
                </td>
                <td style={{ padding: "4px 8px", color: dur ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {dur !== null ? (dur >= 60 ? `${Math.floor(dur / 60)}h ${dur % 60}m` : `${dur}m`) : "—"}
                </td>
                <td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>
                  {job.expected_start_time ? fmt(job.expected_start_time) : "—"}
                </td>
                <td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>
                  {job.job_expected_sla ? fmt(job.job_expected_sla) : "—"}
                </td>
                <td
                  style={{
                    padding: "4px 8px",
                    color: run.delay_status.includes("delayed") ? "var(--warning)" : "var(--text-muted)",
                  }}
                >
                  {run.delay_status.includes("delayed") ? run.delay_status.replace("_", " ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
