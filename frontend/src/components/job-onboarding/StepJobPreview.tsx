/**
 * StepJobPreview — Step 4: Review all job onboarding data before execution.
 */

import type { JobFormData } from "../../types/jobOnboarding";

interface Props {
  form: JobFormData;
}

export default function StepJobPreview({ form }: Props) {
  return (
    <div className="onboarding-step-content">
      {/* Summary strip */}
      <div
        className="job-input-wrap"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginBottom: 16 }}
      >
        <div style={{ padding: "8px 16px", textAlign: "center", borderRight: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{form.isProxy ? "Proxy" : "Standard"}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>Job Type</span>
        </div>
        <div style={{ padding: "8px 16px", textAlign: "center", borderRight: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{form.isProxy ? "inherited" : form.slaPolicies.length}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>SLA Policies</span>
        </div>
        <div style={{ padding: "8px 16px", textAlign: "center", borderRight: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{form.proxyRules.length}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>Proxy Rules</span>
        </div>
        <div style={{ padding: "8px 16px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{form.artifacts.length}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>Artifacts</span>
        </div>
      </div>

      {/* Job info — only fields we collect */}
      <div className="preview-info-row">
        <div className="preview-info-cell">
          <span className="preview-info-label">Job Name</span>
          <span className="preview-info-value">{form.jobName}</span>
        </div>
        <div className="preview-info-cell">
          <span className="preview-info-label">Description</span>
          <span className="preview-info-value">{form.jobDescription || "—"}</span>
        </div>
      </div>

      <div className="preview-info-row">
        <div className="preview-info-cell">
          <span className="preview-info-label">Owner Email</span>
          <span className="preview-info-value">{form.ownerEmail}</span>
        </div>
        <div className="preview-info-cell">
          <span className="preview-info-label">L2 Owner</span>
          <span className="preview-info-value">{form.l2OwnerEmail}</span>
        </div>
        <div className="preview-info-cell">
          <span className="preview-info-label">L3 Owner</span>
          <span className="preview-info-value">{form.l3OwnerEmail}</span>
        </div>
        <div className="preview-info-cell">
          <span className="preview-info-label">On-Call Contact</span>
          <span className="preview-info-value">{form.oncallContact}</span>
        </div>
        <div className="preview-info-cell">
          <span className="preview-info-label">Support DL</span>
          <span className="preview-info-value">{form.supportTeamDl}</span>
        </div>
      </div>

      {/* SLA Policies detail */}
      {!form.isProxy && form.slaPolicies.length > 0 && (
        <div className="preview-section-compact">
          <span className="preview-section-label">SLA Policies</span>
          <div className="preview-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Start</th>
                  <th>SLA</th>
                  <th>Timezone</th>
                  <th>Duration (min)</th>
                  <th>Days +Start</th>
                  <th>Days +SLA</th>
                  <th>Frequency</th>
                </tr>
              </thead>
              <tbody>
                {form.slaPolicies.map((p, i) => (
                  <tr key={i}>
                    <td>{p.day_of_week}</td>
                    <td>{p.expected_start_time || "—"}</td>
                    <td>{p.expected_sla_time || "—"}</td>
                    <td>{p.timezone}</td>
                    <td>{p.expected_duration_minutes ?? "—"}</td>
                    <td>{p.days_addition_start_time ?? 0}</td>
                    <td>{p.days_addition_sla ?? 0}</td>
                    <td>{p.schedule_frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proxy Rules detail */}
      {form.proxyRules.length > 0 && (
        <div className="preview-section-compact">
          <span className="preview-section-label">Proxy Inference Rules</span>
          <div className="preview-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trigger Job</th>
                  <th>Trigger Status</th>
                  <th>→ Proxy Status</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {form.proxyRules.map((r, i) => (
                  <tr key={i}>
                    <td>{r.trigger_job_name}</td>
                    <td>{r.trigger_job_status}</td>
                    <td>{r.proxy_job_status}</td>
                    <td>{r.proxy_completion_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inherited SLA for proxy jobs */}
      {form.isProxy && form.slaPolicies.length > 0 && (
        <div className="preview-section-compact">
          <span className="preview-section-label">Inherited SLA Policies (from trigger job)</span>
          <div className="preview-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Start</th>
                  <th>SLA</th>
                  <th>Timezone</th>
                  <th>Duration (min)</th>
                  <th>Days +Start</th>
                  <th>Days +SLA</th>
                  <th>Frequency</th>
                </tr>
              </thead>
              <tbody>
                {form.slaPolicies.map((p, i) => (
                  <tr key={i}>
                    <td>{p.day_of_week}</td>
                    <td>{p.expected_start_time || "—"}</td>
                    <td>{p.expected_sla_time || "—"}</td>
                    <td>{p.timezone}</td>
                    <td>{p.expected_duration_minutes ?? "—"}</td>
                    <td>{p.days_addition_start_time ?? 0}</td>
                    <td>{p.days_addition_sla ?? 0}</td>
                    <td>{p.schedule_frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Artifacts detail */}
      {form.artifacts.length > 0 && (
        <div className="preview-section-compact">
          <span className="preview-section-label">Artifact Definitions</span>
          <div className="preview-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pattern</th>
                  <th>Type</th>
                  <th>Count</th>
                  <th>Trigger</th>
                </tr>
              </thead>
              <tbody>
                {form.artifacts.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <code>{a.artifact_pattern}</code>
                    </td>
                    <td>{a.type}</td>
                    <td>{a.expected_count}</td>
                    <td>{a.completion_trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
