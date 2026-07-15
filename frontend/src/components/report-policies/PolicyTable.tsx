/**
 * PolicyTable — Editable SLA policies table.
 * Uses appropriate input types: dropdowns, time pickers, number steppers.
 */
import type { SlaPolicy } from "../../types/reportPolicies";
import { DAYS_OF_WEEK, SCHEDULE_FREQUENCIES, WINDOW_MODES, TIMEZONES } from "../../constants/reportPolicies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import TimeInput from "../ui/TimeInput";

/** Min-width for the scrollable table */
const TABLE_MIN_WIDTH_PX = 1100;

interface Props {
  policies: SlaPolicy[];
  editMode: boolean;
  onPolicyChange: (policyId: string, field: string, value: string | number | null) => void;
}

export default function PolicyTable({ policies, editMode, onPolicyChange }: Props) {
  const upd = (policyId: string, field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onPolicyChange(policyId, field, e.target.value || null);
  };

  const updNum = (policyId: string, field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onPolicyChange(policyId, field, e.target.value ? Number(e.target.value) : null);
  };

  /** Dropdown cell using Radix Select component */
  const selectCell = (policyId: string, field: string, value: string | null, options: readonly string[]) => {
    if (!editMode)
      return (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
          {value ?? "—"}
        </span>
      );
    // Ensure the current DB value is always an option
    const allOptions = value && !options.includes(value as any) ? [value, ...options] : [...options];
    return (
      <Select defaultValue={value || ""} onValueChange={(v) => onPolicyChange(policyId, field, v || null)}>
        <SelectTrigger className="h-7 text-[11px] min-w-0 w-full">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="min-w-[160px]">
          {allOptions.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  /** Time picker cell (HH:MM:SS) */
  const timeCell = (policyId: string, field: string, value: string | null) => {
    if (!editMode) return <>{value ?? "—"}</>;
    return (
      <TimeInput
        defaultValue={value || ""}
        onChange={(v) => onPolicyChange(policyId, field, v || null)}
        className="w-[100px]"
      />
    );
  };

  /** Number stepper cell */
  const numCell = (policyId: string, field: string, value: number | null) => {
    if (!editMode) return <>{value ?? "—"}</>;
    return (
      <input
        type="number"
        defaultValue={value ?? ""}
        onChange={updNum(policyId, field)}
        className="beid-org-inline-input"
        style={{ width: 50 }}
      />
    );
  };

  return (
    <div className="lf-corners-always" style={{ position: "relative" }}>
      <div style={{ overflowX: "auto", border: "1px solid var(--border)" }}>
        <table className="data-table" style={{ width: "100%", fontSize: 11 }}>
          <thead>
            <tr>
              <th>Day</th>
              <th>Frequency</th>
              <th>Expected SLA Time</th>
              <th>Expected Time</th>
              <th>Timezone</th>
              <th>Data Date Formula</th>
              <th>Window Mode</th>
              <th>Window Start Offset</th>
              <th>Window End Offset</th>
              <th>Anchor Type</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.policy_id}>
                <td>{selectCell(p.policy_id, "day_of_week", p.day_of_week, DAYS_OF_WEEK)}</td>
                <td>{selectCell(p.policy_id, "schedule_frequency", p.schedule_frequency, SCHEDULE_FREQUENCIES)}</td>
                <td>{timeCell(p.policy_id, "expected_sla_time", p.expected_sla_time)}</td>
                <td>{timeCell(p.policy_id, "expected_time", p.expected_time)}</td>
                <td>{selectCell(p.policy_id, "timezone", p.timezone, TIMEZONES)}</td>
                <td>{numCell(p.policy_id, "data_date_formula", p.data_date_formula)}</td>
                <td>{selectCell(p.policy_id, "window_mode", p.window_mode, WINDOW_MODES)}</td>
                <td>{numCell(p.policy_id, "window_start_offset_days", p.window_start_offset_days)}</td>
                <td>{numCell(p.policy_id, "window_end_offset_days", p.window_end_offset_days)}</td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      defaultValue={p.anchor_type || ""}
                      onChange={upd(p.policy_id, "anchor_type")}
                      className="beid-org-inline-input"
                    />
                  ) : (
                    p.anchor_type || "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
