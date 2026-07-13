/**
 * StepSlaProxy — Step 2: SLA policies (standard) or proxy rules (proxy).
 *
 * Uses the project's Radix Select component and TimeInput for consistency.
 * Timezone options match the report policies editor.
 */

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { SLAPolicy, ProxyRule, TriggerJob } from "../../types/jobOnboarding";
import { DAYS_OF_WEEK, DEFAULT_SCHEDULE_FREQUENCY } from "../../constants/jobOnboarding";
import { TIMEZONES } from "../../constants/reportPolicies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import TimeInput from "../ui/TimeInput";
import ValidatedInput from "./ValidatedInput";
import SearchableSelect from "./SearchableSelect";

/** Schedule frequency values from prod */
const FREQUENCIES = ["daily", "weekly", "manual"] as const;

interface Props {
  isProxy: boolean;
  onToggleProxy: (value: boolean) => void;
  slaPolicies: SLAPolicy[];
  onSlaPoliciesChange: (policies: SLAPolicy[]) => void;
  proxyRules: ProxyRule[];
  onProxyRulesChange: (rules: ProxyRule[]) => void;
  triggerJobs: TriggerJob[];
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
}: Props) {
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
        trigger_job_status: "COMPLETED",
        proxy_job_status: "COMPLETED",
        proxy_completion_percentage: 100,
      },
    ]);
  };

  const updateProxy = (idx: number, field: keyof ProxyRule, value: string | number) => {
    const updated = proxyRules.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    if (field === "trigger_job_id") {
      const job = triggerJobs.find((j) => j.job_id === Number(value));
      if (job) updated[idx] = { ...updated[idx], trigger_job_name: job.job_name };
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
          Standard Job (own SLA)
        </button>
        <button className={`onboarding-mode-btn${isProxy ? " active" : ""}`} onClick={() => onToggleProxy(true)}>
          Proxy Job (inherits SLA)
        </button>
      </div>

      {/* ── Standard: SLA Policy Cards ────────────────────────────────────── */}
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
            <button className="btn btn-sm" onClick={addSlaPolicy}>
              + Add SLA Policy
            </button>
          </div>

          {slaPolicies.map((policy, idx) => (
            <div key={idx} style={CARD_STYLE} className="job-input-wrap">
              {/* Card header */}
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
              <strong>Proxy Inference Rules</strong> — link this proxy to a trigger job. SLA is inherited at runtime.
            </p>
            <button className="btn btn-sm" onClick={addProxyRule}>
              + Add Proxy Rule
            </button>
          </div>

          {proxyRules.map((rule, idx) => (
            <div key={idx} style={CARD_STYLE} className="job-input-wrap">
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

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
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
                  <ValidatedInput
                    value={rule.trigger_job_status}
                    onChange={(v) => updateProxy(idx, "trigger_job_status", v)}
                    placeholder="COMPLETED"
                  />
                </div>
                <div>
                  <label style={LABEL}>Proxy Status</label>
                  <ValidatedInput
                    value={rule.proxy_job_status}
                    onChange={(v) => updateProxy(idx, "proxy_job_status", v)}
                    placeholder="COMPLETED"
                  />
                </div>
              </div>
            </div>
          ))}

          {proxyRules.length === 0 && (
            <p className="onboarding-hint" style={{ fontStyle: "italic", textAlign: "center", padding: 32 }}>
              No rules yet. Click "+ Add Proxy Rule" to link to a trigger job.
            </p>
          )}
        </>
      )}
    </div>
  );
}
