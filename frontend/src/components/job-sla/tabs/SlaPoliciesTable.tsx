/**
 * SlaPoliciesTable — Displays SLA policy rules for a job in a data table.
 */

import { Panel } from "../../ui";
import type { SlaPolicy } from "../../../types/jobSla";

function fmtTime(t: string | null | undefined): string {
  if (!t) return "—";
  const parts = String(t).split(":");
  return `${parts[0]}:${parts[1]}`; // HH:MM, drop seconds
}

interface SlaPoliciesTableProps {
  policies: SlaPolicy[];
}

export function SlaPoliciesTable({ policies }: SlaPoliciesTableProps) {
  if (!policies.length) return null;

  return (
    <Panel>
      <div className="csv-preview-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data Day</th>
              <th>Frequency</th>
              <th>Timezone</th>
              <th>Duration (min)</th>
              <th>Start Time</th>
              <th>SLA Time</th>
              <th>Days +Start</th>
              <th>Days +SLA</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.policy_id}>
                <td>{p.day_of_week ?? "All"}</td>
                <td>{p.schedule_frequency ?? "—"}</td>
                <td>{p.timezone ?? "—"}</td>
                <td>{p.expected_duration_minutes ?? "—"}</td>
                <td>{fmtTime(p.expected_start_time as unknown as string)}</td>
                <td>{fmtTime(p.expected_sla_time as unknown as string)}</td>
                <td>{p.days_addition_start_time != null ? `+${p.days_addition_start_time}d` : "—"}</td>
                <td>{p.days_addition_sla != null ? `+${p.days_addition_sla}d` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
