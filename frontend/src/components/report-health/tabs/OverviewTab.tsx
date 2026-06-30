/**
 * OverviewTab — verdict, KPI row, SLA block, delay attribution,
 * missing events, past-SLA jobs, and coverage dates.
 */
import Pill from "../shared/Pill";
import { fmt, fmtMins } from "../shared/formatters";
import type { ReportHealthPayload } from "../../../types/reportHealth";

interface Props {
  payload: ReportHealthPayload;
}

export default function OverviewTab({ payload }: Props) {
  const r = payload.report;
  const slaOver = r.bam_sla && new Date(r.bam_sla) < new Date() && r.report_delivery_status !== "success";
  const delayedJobs =
    r.delayed_job_name
      ?.split(",")
      .map((j) => j.trim())
      .filter(Boolean) ?? [];
  const alertCls = r.report_delay_status === "client_delayed" ? "rh-alert rh-alert--danger" : "rh-alert rh-alert--warn";

  const isDelivered = r.report_delivery_status === "success";
  let verdict: string;
  let verdictColor: string;
  if (isDelivered) {
    verdict = "Report delivered successfully.";
    verdictColor = "var(--success)";
  } else if (!slaOver && r.report_delay_status === "on_track") {
    verdict = "On track — SLA not breached.";
    verdictColor = "var(--success)";
  } else if (slaOver) {
    verdict = "SLA BREACHED — report not delivered by BAM SLA time.";
    verdictColor = "var(--danger)";
  } else if (r.report_delay_status === "client_delayed") {
    verdict = "Client-side delay — upstream data late.";
    verdictColor = "var(--danger)";
  } else if (r.report_delay_status === "internal_delayed") {
    verdict = "Internal delay — pipeline jobs behind.";
    verdictColor = "var(--warning)";
  } else {
    verdict = "Status unclear.";
    verdictColor = "var(--text-secondary)";
  }

  const nowUtc = new Date();
  const missingEventJobs = payload.jobs.filter((j) => j.current_status === "scheduled" && !j.start_time);
  const pastSlaJobs = payload.jobs.filter(
    (j) => j.current_status !== "success" && j.job_expected_sla && new Date(j.job_expected_sla) < nowUtc,
  );

  return (
    <div>
      <div
        className="rh-alert"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", marginBottom: 12 }}
      >
        <div style={{ fontWeight: 600, color: verdictColor, fontSize: 12 }}>{verdict}</div>
      </div>
      <div className="rh-kpi-row">
        <div className="rh-kpi">
          <div className="rh-kpi-val">{r.total_no_of_steps}</div>
          <div className="rh-kpi-lbl">Total Steps</div>
        </div>
        <div className="rh-kpi">
          <div className="rh-kpi-val" style={{ color: "var(--success)" }}>
            {r.no_of_completed_steps}
          </div>
          <div className="rh-kpi-lbl">Completed</div>
        </div>
        <div className="rh-kpi">
          <div className="rh-kpi-val" style={{ color: "var(--accent)" }}>
            {r.no_of_running_steps}
          </div>
          <div className="rh-kpi-lbl">Running</div>
        </div>
        <div className="rh-kpi">
          <div
            className="rh-kpi-val"
            style={{ color: r.no_of_delayed_steps > 0 ? "var(--warning)" : "var(--text-muted)" }}
          >
            {r.no_of_delayed_steps}
          </div>
          <div className="rh-kpi-lbl">Delayed Steps</div>
        </div>
        <div className="rh-kpi">
          <div
            className="rh-kpi-val"
            style={{ color: r.report_delay_duration_minutes > 0 ? "var(--danger)" : "var(--text-muted)" }}
          >
            {r.report_delay_duration_minutes > 0 ? fmtMins(r.report_delay_duration_minutes) : "—"}
          </div>
          <div className="rh-kpi-lbl">Total Delay</div>
        </div>
      </div>
      <div className="rh-sla-block">
        <div className="rh-sla-item">
          <span className="rh-sla-lbl">BAM SLA</span>
          <span className={`rh-sla-val${slaOver ? " rh-sla-val--over" : ""}`}>{fmt(r.bam_sla)}</span>
        </div>
        <div className="rh-sla-item">
          <span className="rh-sla-lbl">Report Start</span>
          <span className="rh-sla-val">{fmt(r.report_start_time)}</span>
        </div>
        <div className="rh-sla-item">
          <span className="rh-sla-lbl">Report End</span>
          <span className={`rh-sla-val${r.report_end_time ? " rh-sla-val--safe" : ""}`}>{fmt(r.report_end_time)}</span>
        </div>
        <div className="rh-sla-item">
          <span className="rh-sla-lbl">Delivery Date</span>
          <span className="rh-sla-val">{r.delivery_date}</span>
        </div>
        <div className="rh-sla-item">
          <span className="rh-sla-lbl">Data Date</span>
          <span className="rh-sla-val">{r.data_date}</span>
        </div>
        <div className="rh-sla-item">
          <span className="rh-sla-lbl">Coverage Window</span>
          <span className="rh-sla-val">
            {payload.coverage_start_date} → {payload.coverage_end_date}
          </span>
        </div>
      </div>
      {delayedJobs.length > 0 && (
        <div className={alertCls}>
          <div className="rh-alert-title">
            {r.report_delay_status === "client_delayed" ? "Client Delayed" : "Internal Delay"} · {delayedJobs.length}{" "}
            blocking job{delayedJobs.length > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            These jobs are causing or contributing to the delay:
          </div>
          <div className="rh-alert-tags">
            {delayedJobs.map((j) => (
              <span
                key={j}
                className={`rh-tag${r.report_delay_status === "client_delayed" ? " rh-tag--danger" : " rh-tag--warn"}`}
              >
                {j}
              </span>
            ))}
          </div>
        </div>
      )}
      {r.sev1_numbers && (
        <div className="rh-alert rh-alert--danger">
          <div className="rh-alert-title">🚨 SEV1 Active — {r.sev1_numbers}</div>
          {r.sev1_urls && (
            <a href={r.sev1_urls} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--danger)" }}>
              View Incident ↗
            </a>
          )}
        </div>
      )}
      {missingEventJobs.length > 0 && (
        <div className="rh-alert rh-alert--warn">
          <div className="rh-alert-title">Missing Events ({missingEventJobs.length} jobs with no start signal)</div>
          <div className="rh-alert-tags">
            {missingEventJobs.slice(0, 12).map((j) => (
              <span key={j.job_id} className="rh-tag rh-tag--neutral">
                {j.job_name}
              </span>
            ))}
            {missingEventJobs.length > 12 && (
              <span className="rh-tag rh-tag--neutral">+{missingEventJobs.length - 12} more</span>
            )}
          </div>
        </div>
      )}
      {pastSlaJobs.length > 0 && (
        <div className="rh-alert rh-alert--danger">
          <div className="rh-alert-title">Jobs Past Their SLA ({pastSlaJobs.length})</div>
          <div className="rh-alert-tags">
            {pastSlaJobs.slice(0, 10).map((j) => (
              <span key={j.job_id} className="rh-tag rh-tag--danger">
                {j.job_name}
              </span>
            ))}
            {pastSlaJobs.length > 10 && <span className="rh-tag rh-tag--danger">+{pastSlaJobs.length - 10} more</span>}
          </div>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
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
          Coverage Dates ({payload.covered_data_dates.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {payload.covered_data_dates.map((d) => (
            <span key={String(d)} className="rh-tag rh-tag--neutral">
              {String(d)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
