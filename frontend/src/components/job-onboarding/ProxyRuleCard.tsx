/**
 * ProxyRuleCard — Form card for a single proxy inference rule.
 * Shows trigger job search, trigger/proxy status selects, and inline SLA table.
 */

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { ProxyRule, TriggerJob } from "../../types/jobOnboarding";
import { PROXY_TRIGGER_STATUSES, PROXY_JOB_STATUSES } from "../../constants/jobOnboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import SearchableSelect from "./SearchableSelect";

// ── Style Constants ───────────────────────────────────────────────────────────

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

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted)",
  marginBottom: 4,
  display: "block",
};

// ── Trigger SLA Table ─────────────────────────────────────────────────────────

interface TriggerSlaInfo {
  loading: boolean;
  policies: any[];
  jobName: string;
}

function TriggerSlaTable({ info }: { info: TriggerSlaInfo }) {
  if (info.loading) {
    return (
      <p className="onboarding-hint" style={{ margin: 0, textAlign: "center" }}>
        Loading SLA for "{info.jobName}"...
      </p>
    );
  }

  if (info.policies.length === 0) {
    return (
      <p className="onboarding-hint" style={{ margin: 0, fontStyle: "italic" }}>
        No SLA found for this trigger job.
      </p>
    );
  }

  return (
    <>
      <p className="onboarding-hint" style={{ margin: "0 0 8px", fontSize: 11 }}>
        <strong>SLA of "{info.jobName}"</strong> — will be copied.
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
            {info.policies.map((p: any, i: number) => (
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
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ProxyRuleCardProps {
  rule: ProxyRule;
  index: number;
  triggerJobs: TriggerJob[];
  triggerSlaInfo?: TriggerSlaInfo;
  onUpdate: (idx: number, field: keyof ProxyRule, value: string | number) => void;
  onRemove: (idx: number) => void;
}

export function ProxyRuleCard({ rule, index, triggerJobs, triggerSlaInfo, onUpdate, onRemove }: ProxyRuleCardProps) {
  return (
    <div>
      <div style={CARD_STYLE} className="job-input-wrap">
        <div style={CARD_HEADER}>
          <span style={CARD_TITLE}>Rule {index + 1}</span>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => onRemove(index)}
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
              onChange={(v) => onUpdate(index, "trigger_job_id", Number(v))}
              placeholder="Type to search jobs..."
            />
          </div>
          <div>
            <label style={LABEL}>Trigger Status</label>
            <Select value={rule.trigger_job_status} onValueChange={(v) => onUpdate(index, "trigger_job_status", v)}>
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
            <Select value={rule.proxy_job_status} onValueChange={(v) => onUpdate(index, "proxy_job_status", v)}>
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

      {/* Inline SLA for trigger job */}
      {rule.trigger_job_id > 0 && triggerSlaInfo && (
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
          <TriggerSlaTable info={triggerSlaInfo} />
        </div>
      )}
    </div>
  );
}
