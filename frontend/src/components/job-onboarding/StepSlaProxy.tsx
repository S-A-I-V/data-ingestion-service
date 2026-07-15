/**
 * StepSlaProxy — Step 2: SLA policies (standard) or proxy rules (proxy).
 *
 * Uses the project's Radix Select component and TimeInput for consistency.
 * Timezone options match the report policies editor.
 */

import { useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Tooltip from "@mui/material/Tooltip";
import type { SLAPolicy, ProxyRule, TriggerJob } from "../../types/jobOnboarding";
import {
  DAYS_OF_WEEK,
  DEFAULT_SCHEDULE_FREQUENCY,
  PROXY_TRIGGER_STATUSES,
  PROXY_JOB_STATUSES,
} from "../../constants/jobOnboarding";
import { TIMEZONES } from "../../constants/reportPolicies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import TimeInput from "../ui/TimeInput";
import ValidatedInput from "./ValidatedInput";
import SearchableSelect from "./SearchableSelect";

/** Schedule frequency values from prod */
const FREQUENCIES = ["daily", "weekly", "manual"] as const;

/** Day names in order for offset calculations */
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Generates a human-readable explanation of what a job SLA policy means.
 */
function explainPolicy(p: SLAPolicy): string {
  const day = p.day_of_week || "—";
  const sla = p.expected_sla_time || "—";
  const start = p.expected_start_time || "—";
  const tz = p.timezone || "EST";
  const addSla = p.days_addition_sla || 0;
  const addStart = p.days_addition_start_time || 0;
  const dur = p.expected_duration_minutes;
  const freq = p.schedule_frequency || "daily";

  // Compute the delivery day (data_date + days_addition_sla)
  const dataIdx = DAY_NAMES.indexOf(day);
  const slaDay = dataIdx >= 0 ? DAY_NAMES[(dataIdx + addSla) % 7] : "?";
  const startDay = dataIdx >= 0 ? DAY_NAMES[(dataIdx + addStart) % 7] : "?";

  let text = `For ${day} data (${freq}):`;
  if (addStart > 0) {
    text += `\n• Job expected to start on ${startDay} (+${addStart}d) at ${start} ${tz}`;
  } else {
    text += `\n• Job expected to start on ${day} at ${start} ${tz}`;
  }
  if (addSla > 0) {
    text += `\n• Must finish by ${slaDay} (+${addSla}d) at ${sla} ${tz}`;
  } else {
    text += `\n• Must finish by ${day} at ${sla} ${tz}`;
  }
  if (dur) {
    text += `\n• Expected runtime: ~${dur} min`;
  }
  return text;
}

interface Props {
  isProxy: boolean;
  onToggleProxy: (value: boolean) => void;
  slaPolicies: SLAPolicy[];
  onSlaPoliciesChange: (policies: SLAPolicy[]) => void;
  proxyRules: ProxyRule[];
  onProxyRulesChange: (rules: ProxyRule[]) => void;
  triggerJobs: TriggerJob[];
  onTriggerJobSelected?: (jobId: number) => void;
  /** When true, show the SLA policy cards even in proxy mode (used in edit flow) */
  showSlaBelowProxy?: boolean;
  /** Callback to copy SLA from a report — parent handles the API call */
  onCopyFromReport?: () => void;
}

const CARD_STYLE: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 0,
  padding: "16px 20px",
  marginBottom: 16,
  position: "relative",
};

const CARD_HEADER: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const CARD_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "var(--text-secondary)",
};

const GRID_8: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 };
const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted)",
  marginBottom: 4,
  display: "block",
};

export default function StepSlaProxy({
  isProxy,
  onToggleProxy,
  slaPolicies,
  onSlaPoliciesChange,
  proxyRules,
  onProxyRulesChange,
  triggerJobs,
  onTriggerJobSelected,
  showSlaBelowProxy = false,
  onCopyFromReport,
}: Props) {
  // Store SLA per trigger job (keyed by job_id)
  const [triggerSlaMap, setTriggerSlaMap] = useState<
    Record<number, { loading: boolean; policies: any[]; jobName: string }>
  >({});
  const addSlaPolicy = () => {
    onSlaPoliciesChange([
      ...slaPolicies,
      {
        day_of_week: "Monday",
        schedule_frequency: DEFAULT_SCHEDULE_FREQUENCY,
        expected_start_time: "",
        expected_sla_time: "",
        expected_time: "",
        timezone: "EST",
        days_addition_start_time: 0,
        days_addition_sla: 0,
        expected_duration_minutes: null,
        data_date_formula: null,
      },
    ]);
  };

  const duplicatePolicy = (idx: number) => {
    onSlaPoliciesChange([...slaPolicies, { ...slaPolicies[idx] }]);
  };

  const updateSla = (idx: number, field: keyof SLAPolicy, value: string | number | null) => {
    onSlaPoliciesChange(slaPolicies.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const removeSla = (idx: number) => {
    onSlaPoliciesChange(slaPolicies.filter((_, i) => i !== idx));
  };

  const addProxyRule = () => {
    onProxyRulesChange([
      ...proxyRules,
      {
        trigger_job_id: 0,
        trigger_job_name: "",
        trigger_job_status: "success",
        proxy_job_status: "success",
        proxy_completion_percentage: 100,
      },
    ]);
  };

  const updateProxy = (idx: number, field: keyof ProxyRule, value: string | number) => {
    const updated = proxyRules.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    if (field === "trigger_job_id") {
      const jobId = Number(value);
      const job = triggerJobs.find((j) => j.job_id === jobId);
      if (job) {
        updated[idx] = { ...updated[idx], trigger_job_name: job.job_name };
        // Fetch SLA for this trigger job (displayed inline)
        setTriggerSlaMap((prev) => ({ ...prev, [jobId]: { loading: true, policies: [], jobName: job.job_name } }));
        import("../../api").then(({ default: api }) => {
          api
            .get(`/admin/job-onboarding/trigger-jobs/${jobId}/sla`)
            .then((res) => {
              const policies = res.data.sla_policies || [];
              setTriggerSlaMap((prev) => ({
                ...prev,
                [jobId]: { loading: false, policies, jobName: job.job_name },
              }));
              // Also update parent form so preview step shows inherited SLA
              if (policies.length > 0) onSlaPoliciesChange(policies);
            })
            .catch(() =>
              setTriggerSlaMap((prev) => ({
                ...prev,
                [jobId]: { loading: false, policies: [], jobName: job.job_name },
              })),
            );
        });
      }
    }
    onProxyRulesChange(updated);
  };

  const removeProxy = (idx: number) => {
    onProxyRulesChange(proxyRules.filter((_, i) => i !== idx));
  };

  return (
    <div className="onboarding-step-content">
      {/* Toggle */}
      <div className="onboarding-mode-toggle">
        <button className={`onboarding-mode-btn${!isProxy ? " active" : ""}`} onClick={() => onToggleProxy(false)}>
          Standard Job
        </button>
        <button className={`onboarding-mode-btn${isProxy ? " active" : ""}`} onClick={() => onToggleProxy(true)}>
          Proxy Job (+ inference rules)
        </button>
      </div>

      {/* ── SLA Policy Cards (only for standard jobs) ── */}
      {!isProxy && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              marginTop: 8,
            }}
          >
            <p className="onboarding-hint" style={{ margin: 0 }}>
              <strong>SLA Policies</strong> — define expected delivery times per day of week.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {onCopyFromReport && (
                <button className="btn btn-sm btn--ghost" onClick={onCopyFromReport}>
                  Copy from Report SLA
                </button>
              )}
              <button className="btn btn-sm" onClick={addSlaPolicy}>
                + Add SLA Policy
              </button>
            </div>
          </div>

          {slaPolicies.map((policy, idx) => (
            <div key={idx} style={CARD_STYLE} className="job-input-wrap">
              {/* Card header */}
              <div style={CARD_HEADER}>
                <span style={CARD_TITLE}>Policy {idx + 1}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Tooltip
                    title={
                      <span style={{ whiteSpace: "pre-line", fontSize: 11, lineHeight: 1.6 }}>
                        {explainPolicy(policy)}
                      </span>
                    }
                    arrow
                    placement="top"
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
                  </Tooltip>
                  <button
                    className="btn btn-sm btn--ghost"
                    onClick={() => duplicatePolicy(idx)}
                    title="Duplicate"
                    style={{ padding: "4px 6px" }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeSla(idx)}
                    title="Remove"
                    style={{ padding: "4px 6px" }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>

              {/* All 8 fields in one row */}
              <div style={GRID_8}>
                <div>
                  <label style={LABEL}>
                    Data Day <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <Select value={policy.day_of_week} onValueChange={(v) => updateSla(idx, "day_of_week", v)}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={LABEL}>
                    Frequency <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <Select
                    value={policy.schedule_frequency}
                    onValueChange={(v) => updateSla(idx, "schedule_frequency", v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Freq" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={LABEL}>
                    Timezone <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <Select value={policy.timezone} onValueChange={(v) => updateSla(idx, "timezone", v)}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="TZ" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={LABEL}>
                    Duration (min) <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <ValidatedInput
                    type="number"
                    value={String(policy.expected_duration_minutes ?? "")}
                    onChange={(v) => updateSla(idx, "expected_duration_minutes", v ? Number(v) : null)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={LABEL}>
                    Start Time <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <TimeInput
                    value={policy.expected_start_time}
                    onChange={(v) => updateSla(idx, "expected_start_time", v)}
                    className="w-full h-8"
                  />
                </div>
                <div>
                  <label style={LABEL}>
                    SLA Time <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <TimeInput
                    value={policy.expected_sla_time}
                    onChange={(v) => {
                      updateSla(idx, "expected_sla_time", v);
                      updateSla(idx, "expected_time", v);
                    }}
                    className="w-full h-8"
                  />
                </div>
                <div>
                  <label style={LABEL}>Days +Start</label>
                  <ValidatedInput
                    type="number"
                    value={String(policy.days_addition_start_time)}
                    onChange={(v) => updateSla(idx, "days_addition_start_time", Number(v) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={LABEL}>Days +SLA</label>
                  <ValidatedInput
                    type="number"
                    value={String(policy.days_addition_sla)}
                    onChange={(v) => updateSla(idx, "days_addition_sla", Number(v) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ))}

          {slaPolicies.length === 0 && (
            <p className="onboarding-hint" style={{ fontStyle: "italic", textAlign: "center", padding: 32 }}>
              No policies yet. Click "+ Add SLA Policy" to define expected delivery times.
            </p>
          )}
        </>
      )}

      {/* ── Proxy: Inference Rules ────────────────────────────────────────── */}
      {isProxy && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              marginTop: 8,
            }}
          >
            <p className="onboarding-hint" style={{ margin: 0 }}>
              <strong>Proxy Inference Rules</strong> — link this proxy to a trigger job for status inference.
            </p>
            <button className="btn btn-sm" onClick={addProxyRule}>
              + Add Proxy Rule
            </button>
          </div>

          {proxyRules.map((rule, idx) => (
            <div key={idx}>
              <div style={CARD_STYLE} className="job-input-wrap">
                <div style={CARD_HEADER}>
                  <span style={CARD_TITLE}>Rule {idx + 1}</span>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeProxy(idx)}
                    title="Remove"
                    style={{ padding: "4px 6px" }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={LABEL}>
                      Trigger Job <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <SearchableSelect
                      options={triggerJobs.map((j) => ({ value: String(j.job_id), label: j.job_name }))}
                      value={rule.trigger_job_id ? String(rule.trigger_job_id) : ""}
                      onChange={(v) => updateProxy(idx, "trigger_job_id", Number(v))}
                      placeholder="Type to search jobs..."
                    />
                  </div>
                  <div>
                    <label style={LABEL}>Trigger Status</label>
                    <Select
                      value={rule.trigger_job_status}
                      onValueChange={(v) => updateProxy(idx, "trigger_job_status", v)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROXY_TRIGGER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label style={LABEL}>Proxy Status</label>
                    <Select
                      value={rule.proxy_job_status}
                      onValueChange={(v) => updateProxy(idx, "proxy_job_status", v)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROXY_JOB_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Inline SLA for this trigger job */}
              {rule.trigger_job_id > 0 && triggerSlaMap[rule.trigger_job_id] && (
                <div
                  style={{
                    marginLeft: 16,
                    marginRight: 16,
                    marginBottom: 16,
                    padding: "12px 16px",
                    border: "1px dashed var(--border)",
                    borderRadius: 0,
                  }}
                >
                  {triggerSlaMap[rule.trigger_job_id].loading ? (
                    <p className="onboarding-hint" style={{ margin: 0, textAlign: "center" }}>
                      Loading SLA for "{triggerSlaMap[rule.trigger_job_id].jobName}"...
                    </p>
                  ) : triggerSlaMap[rule.trigger_job_id].policies.length > 0 ? (
                    <>
                      <p className="onboarding-hint" style={{ margin: "0 0 8px", fontSize: 11 }}>
                        <strong>SLA of "{triggerSlaMap[rule.trigger_job_id].jobName}"</strong> — will be copied.
                      </p>
                      <div className="preview-table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Day</th>
                              <th>Start</th>
                              <th>SLA</th>
                              <th>TZ</th>
                              <th>Duration</th>
                              <th>Days +Start</th>
                              <th>Days +SLA</th>
                              <th>Freq</th>
                            </tr>
                          </thead>
                          <tbody>
                            {triggerSlaMap[rule.trigger_job_id].policies.map((p: any, i: number) => (
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
                    </>
                  ) : (
                    <p className="onboarding-hint" style={{ margin: 0, fontStyle: "italic" }}>
                      No SLA found for this trigger job.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {proxyRules.length === 0 && (
            <p className="onboarding-hint" style={{ fontStyle: "italic", textAlign: "center", padding: 32 }}>
              No rules yet. Click "+ Add Proxy Rule" to link to a trigger job.
            </p>
          )}
        </>
      )}

      {/* Show SLA policies below proxy rules in edit mode */}
      {isProxy && showSlaBelowProxy && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              marginTop: 32,
              borderTop: "1px dashed var(--border)",
              paddingTop: 20,
            }}
          >
            <p className="onboarding-hint" style={{ margin: 0 }}>
              <strong>SLA Policies</strong> — delivery time expectations inherited or defined for this proxy job.
            </p>
            <button className="btn btn-sm" onClick={addSlaPolicy}>
              + Add SLA Policy
            </button>
          </div>

          {slaPolicies.map((policy, idx) => (
            <div key={idx} style={CARD_STYLE} className="job-input-wrap">
              <div style={CARD_HEADER}>
                <span style={CARD_TITLE}>Policy {idx + 1}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-sm btn--ghost"
                    onClick={() => duplicatePolicy(idx)}
                    title="Duplicate"
                    style={{ padding: "4px 6px" }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeSla(idx)}
                    title="Remove"
                    style={{ padding: "4px 6px" }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>

              <div style={GRID_8}>
                <div>
                  <label style={LABEL}>Data Day</label>
                  <Select value={policy.day_of_week} onValueChange={(v) => updateSla(idx, "day_of_week", v)}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={LABEL}>Frequency</label>
                  <Select
                    value={policy.schedule_frequency}
                    onValueChange={(v) => updateSla(idx, "schedule_frequency", v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Freq" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={LABEL}>Timezone</label>
                  <Select value={policy.timezone} onValueChange={(v) => updateSla(idx, "timezone", v)}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="TZ" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={LABEL}>Duration (min)</label>
                  <ValidatedInput
                    type="number"
                    value={String(policy.expected_duration_minutes ?? "")}
                    onChange={(v) => updateSla(idx, "expected_duration_minutes", v ? Number(v) : null)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={LABEL}>Start Time</label>
                  <TimeInput
                    value={policy.expected_start_time}
                    onChange={(v) => updateSla(idx, "expected_start_time", v)}
                    className="w-full h-8"
                  />
                </div>
                <div>
                  <label style={LABEL}>SLA Time</label>
                  <TimeInput
                    value={policy.expected_sla_time}
                    onChange={(v) => {
                      updateSla(idx, "expected_sla_time", v);
                      updateSla(idx, "expected_time", v);
                    }}
                    className="w-full h-8"
                  />
                </div>
                <div>
                  <label style={LABEL}>Days +Start</label>
                  <ValidatedInput
                    type="number"
                    value={String(policy.days_addition_start_time)}
                    onChange={(v) => updateSla(idx, "days_addition_start_time", Number(v) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label style={LABEL}>Days +SLA</label>
                  <ValidatedInput
                    type="number"
                    value={String(policy.days_addition_sla)}
                    onChange={(v) => updateSla(idx, "days_addition_sla", Number(v) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ))}

          {slaPolicies.length === 0 && (
            <p className="onboarding-hint" style={{ fontStyle: "italic", textAlign: "center", padding: 32 }}>
              No SLA policies. Click "+ Add SLA Policy" to define delivery times.
            </p>
          )}
        </>
      )}
    </div>
  );
}
