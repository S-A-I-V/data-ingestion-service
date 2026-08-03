/**
 * ProxyTab — Proxy inference rules for proxy-type jobs.
 * Shows rules where this job is the proxy (inferred from triggers)
 * and rules where this job is a trigger (triggers other jobs).
 */

import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Spinner } from "../../ui";
import type { ProxyRule } from "../../../types/jobSla";

/** UI Labels */
const LABELS = {
  LOADING: "Loading proxy rules...",
  NO_DATA: "No proxy rules configured for this job",
  PROXY_RULES: "Proxy Rules (Status Inferred From)",
  TRIGGER_RULES: "Trigger Rules (Triggers Other Jobs)",
  NO_PROXY_RULES: "This job does not have proxy inference rules",
  NO_TRIGGER_RULES: "This job does not trigger other jobs",
  STATUS: "Status",
  COMPLETION: "Completion %",
  WHEN: "When",
  THEN: "Then",
} as const;

interface ProxyTabProps {
  proxyRules: ProxyRule[];
  triggerRules: ProxyRule[];
  loading: boolean;
}

export function ProxyTab({ proxyRules, triggerRules, loading }: ProxyTabProps) {
  if (loading) {
    return (
      <div className="js-tab-loading">
        <Spinner size="md" label={LABELS.LOADING} />
      </div>
    );
  }

  if (proxyRules.length === 0 && triggerRules.length === 0) {
    return <div className="js-tab-empty">{LABELS.NO_DATA}</div>;
  }

  return (
    <div className="js-proxy-tab">
      {/* Proxy Rules - this job's status is inferred from triggers */}
      <div className="js-history-section">
        <h3 className="js-section-title">
          <AccountTreeIcon sx={{ fontSize: 16 }} />
          {LABELS.PROXY_RULES} ({proxyRules.length})
        </h3>
        {proxyRules.length > 0 ? (
          <ProxyRulesTable rules={proxyRules} isProxy />
        ) : (
          <div className="js-empty-section">{LABELS.NO_PROXY_RULES}</div>
        )}
      </div>

      {/* Trigger Rules - this job triggers other jobs */}
      <div className="js-history-section">
        <h3 className="js-section-title">
          <ArrowForwardIcon sx={{ fontSize: 16 }} />
          {LABELS.TRIGGER_RULES} ({triggerRules.length})
        </h3>
        {triggerRules.length > 0 ? (
          <ProxyRulesTable rules={triggerRules} isProxy={false} />
        ) : (
          <div className="js-empty-section">{LABELS.NO_TRIGGER_RULES}</div>
        )}
      </div>
    </div>
  );
}

/** Proxy rules table sub-component */
function ProxyRulesTable({ rules, isProxy }: { rules: ProxyRule[]; isProxy: boolean }) {
  return (
    <div className="js-table-container">
      <table className="js-history-table">
        <thead>
          <tr>
            <th>{isProxy ? "Trigger Job" : "Proxy Job"}</th>
            <th>{LABELS.WHEN}</th>
            <th />
            <th>{LABELS.THEN}</th>
            <th>{LABELS.COMPLETION}</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td className="js-job-name-cell">{isProxy ? rule.trigger_job_name : rule.proxy_job_name}</td>
              <td>
                <span className="js-status-badge js-status-badge--info">{rule.trigger_job_status}</span>
              </td>
              <td className="js-arrow-cell">
                <ArrowForwardIcon sx={{ fontSize: 14, opacity: 0.5 }} />
              </td>
              <td>
                <span className="js-status-badge js-status-badge--success">{rule.proxy_job_status}</span>
              </td>
              <td>{rule.proxy_completion_percentage != null ? `${rule.proxy_completion_percentage}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
