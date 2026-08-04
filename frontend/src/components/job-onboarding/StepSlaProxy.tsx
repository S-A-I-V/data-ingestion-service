/**
 * StepSlaProxy — Step 2: SLA policies (standard) or proxy rules (proxy).
 * Orchestrates SlaPolicyCard and ProxyRuleCard sub-components.
 */

import { useState } from "react";
import type { SLAPolicy, ProxyRule, TriggerJob } from "../../types/jobOnboarding";
import { DEFAULT_SCHEDULE_FREQUENCY } from "../../constants/jobOnboarding";
import { SlaPolicyCard } from "./SlaPolicyCard";
import { ProxyRuleCard } from "./ProxyRuleCard";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isProxy: boolean;
  onToggleProxy: (value: boolean) => void;
  slaPolicies: SLAPolicy[];
  onSlaPoliciesChange: (policies: SLAPolicy[]) => void;
  proxyRules: ProxyRule[];
  onProxyRulesChange: (rules: ProxyRule[]) => void;
  triggerJobs: TriggerJob[];
  onTriggerJobSelected?: (jobId: number) => void;
  /** When true, show SLA policy cards below proxy rules (edit flow) */
  showSlaBelowProxy?: boolean;
  /** Callback to copy SLA from a report — parent handles the API call */
  onCopyFromReport?: () => void;
}

// ── Default policy template ───────────────────────────────────────────────────

const EMPTY_SLA_POLICY: SLAPolicy = {
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
};

// ── Component ─────────────────────────────────────────────────────────────────

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
  // Trigger job SLA cache (keyed by job_id)
  const [triggerSlaMap, setTriggerSlaMap] = useState<
    Record<number, { loading: boolean; policies: any[]; jobName: string }>
  >({});

  // ── SLA Policy Handlers ───────────────────────────────────────────────────

  const addSlaPolicy = () => onSlaPoliciesChange([...slaPolicies, { ...EMPTY_SLA_POLICY }]);

  const updateSla = (idx: number, field: keyof SLAPolicy, value: string | number | null) => {
    onSlaPoliciesChange(slaPolicies.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const updateSlaTime = (idx: number, value: string) => {
    onSlaPoliciesChange(
      slaPolicies.map((p, i) => (i === idx ? { ...p, expected_sla_time: value, expected_time: value } : p)),
    );
  };

  const duplicatePolicy = (idx: number) => onSlaPoliciesChange([...slaPolicies, { ...slaPolicies[idx] }]);
  const removeSla = (idx: number) => onSlaPoliciesChange(slaPolicies.filter((_, i) => i !== idx));

  // ── Proxy Rule Handlers ───────────────────────────────────────────────────

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
        setTriggerSlaMap((prev) => ({ ...prev, [jobId]: { loading: true, policies: [], jobName: job.job_name } }));
        import("../../api").then(({ default: api }) => {
          api
            .get(`/admin/job-onboarding/trigger-jobs/${jobId}/sla`)
            .then((res) => {
              const policies = res.data.sla_policies || [];
              setTriggerSlaMap((prev) => ({ ...prev, [jobId]: { loading: false, policies, jobName: job.job_name } }));
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

  const removeProxy = (idx: number) => onProxyRulesChange(proxyRules.filter((_, i) => i !== idx));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="onboarding-step-content">
      {/* Mode toggle */}
      <div className="onboarding-mode-toggle">
        <button className={`onboarding-mode-btn${!isProxy ? " active" : ""}`} onClick={() => onToggleProxy(false)}>
          Standard Job
        </button>
        <button className={`onboarding-mode-btn${isProxy ? " active" : ""}`} onClick={() => onToggleProxy(true)}>
          Proxy Job (+ inference rules)
        </button>
      </div>

      {/* ── Standard: SLA Policy Cards ── */}
      {!isProxy && (
        <SlaPolicySection
          policies={slaPolicies}
          onAdd={addSlaPolicy}
          onUpdate={updateSla}
          onUpdateSlaTime={updateSlaTime}
          onDuplicate={duplicatePolicy}
          onRemove={removeSla}
          onCopyFromReport={onCopyFromReport}
          showRequired
        />
      )}

      {/* ── Proxy: Inference Rules ── */}
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
            <ProxyRuleCard
              key={idx}
              rule={rule}
              index={idx}
              triggerJobs={triggerJobs}
              triggerSlaInfo={rule.trigger_job_id > 0 ? triggerSlaMap[rule.trigger_job_id] : undefined}
              onUpdate={updateProxy}
              onRemove={removeProxy}
            />
          ))}

          {proxyRules.length === 0 && (
            <p className="onboarding-hint" style={{ fontStyle: "italic", textAlign: "center", padding: 32 }}>
              No rules yet. Click "+ Add Proxy Rule" to link to a trigger job.
            </p>
          )}
        </>
      )}

      {/* ── SLA below proxy (edit mode) ── */}
      {isProxy && showSlaBelowProxy && (
        <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 20, marginTop: 32 }}>
          <SlaPolicySection
            policies={slaPolicies}
            onAdd={addSlaPolicy}
            onUpdate={updateSla}
            onUpdateSlaTime={updateSlaTime}
            onDuplicate={duplicatePolicy}
            onRemove={removeSla}
            showRequired={false}
            headerText="SLA Policies — delivery time expectations inherited or defined for this proxy job."
          />
        </div>
      )}
    </div>
  );
}

// ── SLA Policy Section (shared between standard and proxy-below modes) ───────

interface SlaPolicySectionProps {
  policies: SLAPolicy[];
  onAdd: () => void;
  onUpdate: (idx: number, field: keyof SLAPolicy, value: string | number | null) => void;
  onUpdateSlaTime: (idx: number, value: string) => void;
  onDuplicate: (idx: number) => void;
  onRemove: (idx: number) => void;
  onCopyFromReport?: () => void;
  showRequired: boolean;
  headerText?: string;
}

function SlaPolicySection({
  policies,
  onAdd,
  onUpdate,
  onUpdateSlaTime,
  onDuplicate,
  onRemove,
  onCopyFromReport,
  showRequired,
  headerText = "SLA Policies — define expected delivery times per day of week.",
}: SlaPolicySectionProps) {
  return (
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
          <strong>{headerText.split("—")[0].trim()}</strong>
          {headerText.includes("—") ? ` — ${headerText.split("—")[1].trim()}` : ""}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {onCopyFromReport && (
            <button className="btn btn-sm btn--ghost" onClick={onCopyFromReport}>
              Copy from Report SLA
            </button>
          )}
          <button className="btn btn-sm" onClick={onAdd}>
            + Add SLA Policy
          </button>
        </div>
      </div>

      {policies.map((policy, idx) => (
        <SlaPolicyCard
          key={idx}
          policy={policy}
          index={idx}
          onUpdate={onUpdate}
          onUpdateSlaTime={onUpdateSlaTime}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          showRequired={showRequired}
        />
      ))}

      {policies.length === 0 && (
        <p className="onboarding-hint" style={{ fontStyle: "italic", textAlign: "center", padding: 32 }}>
          No policies yet. Click "+ Add SLA Policy" to define expected delivery times.
        </p>
      )}
    </>
  );
}
