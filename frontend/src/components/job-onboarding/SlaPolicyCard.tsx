/**
 * SlaPolicyCard — Reusable form card for a single SLA policy row.
 * Renders 8 fields in a grid: Day, Frequency, Timezone, Duration, Start, SLA, Days+Start, Days+SLA.
 */

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Tooltip from "@mui/material/Tooltip";
import type { SLAPolicy } from "../../types/jobOnboarding";
import { DAYS_OF_WEEK } from "../../constants/jobOnboarding";
import { TIMEZONES } from "../../constants/reportPolicies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import TimeInput from "../ui/TimeInput";
import ValidatedInput from "./ValidatedInput";

// ── Constants ─────────────────────────────────────────────────────────────────

const FREQUENCIES = ["daily", "weekly", "manual"] as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generates a human-readable explanation of a policy for the info tooltip. */
function explainPolicy(p: SLAPolicy): string {
  const day = p.day_of_week || "—";
  const sla = p.expected_sla_time || "—";
  const start = p.expected_start_time || "—";
  const tz = p.timezone || "EST";
  const addSla = p.days_addition_sla || 0;
  const addStart = p.days_addition_start_time || 0;
  const dur = p.expected_duration_minutes;
  const freq = p.schedule_frequency || "daily";

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

// ── Component ─────────────────────────────────────────────────────────────────

interface SlaPolicyCardProps {
  policy: SLAPolicy;
  index: number;
  onUpdate: (idx: number, field: keyof SLAPolicy, value: string | number | null) => void;
  onUpdateSlaTime: (idx: number, value: string) => void;
  onDuplicate: (idx: number) => void;
  onRemove: (idx: number) => void;
  /** Show info tooltip and required markers (true for standard mode) */
  showRequired?: boolean;
}

export function SlaPolicyCard({
  policy,
  index,
  onUpdate,
  onUpdateSlaTime,
  onDuplicate,
  onRemove,
  showRequired = true,
}: SlaPolicyCardProps) {
  const req = showRequired ? <span style={{ color: "var(--danger)" }}>*</span> : null;

  return (
    <div style={CARD_STYLE} className="job-input-wrap">
      <div style={CARD_HEADER}>
        <span style={CARD_TITLE}>Policy {index + 1}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {showRequired && (
            <Tooltip
              title={
                <span style={{ whiteSpace: "pre-line", fontSize: 11, lineHeight: 1.6 }}>{explainPolicy(policy)}</span>
              }
              arrow
              placement="top"
            >
              <InfoOutlinedIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
            </Tooltip>
          )}
          <button
            className="btn btn-sm btn--ghost"
            onClick={() => onDuplicate(index)}
            title="Duplicate"
            style={{ padding: "4px 6px" }}
          >
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => onRemove(index)}
            title="Remove"
            style={{ padding: "4px 6px" }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      <div style={GRID_8}>
        <div>
          <label style={LABEL}>Data Day {req}</label>
          <Select value={policy.day_of_week} onValueChange={(v) => onUpdate(index, "day_of_week", v)}>
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
          <label style={LABEL}>Frequency {req}</label>
          <Select value={policy.schedule_frequency} onValueChange={(v) => onUpdate(index, "schedule_frequency", v)}>
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
          <label style={LABEL}>Timezone {req}</label>
          <Select value={policy.timezone} onValueChange={(v) => onUpdate(index, "timezone", v)}>
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
          <label style={LABEL}>Duration (min) {req}</label>
          <ValidatedInput
            type="number"
            value={String(policy.expected_duration_minutes ?? "")}
            onChange={(v) => onUpdate(index, "expected_duration_minutes", v ? Number(v) : null)}
            placeholder="0"
          />
        </div>
        <div>
          <label style={LABEL}>Start Time {req}</label>
          <TimeInput
            value={policy.expected_start_time}
            onChange={(v) => onUpdate(index, "expected_start_time", v)}
            className="w-full h-8"
          />
        </div>
        <div>
          <label style={LABEL}>SLA Time {req}</label>
          <TimeInput
            value={policy.expected_sla_time}
            onChange={(v) => onUpdateSlaTime(index, v)}
            className="w-full h-8"
          />
        </div>
        <div>
          <label style={LABEL}>Days +Start</label>
          <ValidatedInput
            type="number"
            value={String(policy.days_addition_start_time)}
            onChange={(v) => onUpdate(index, "days_addition_start_time", Number(v) || 0)}
            placeholder="0"
          />
        </div>
        <div>
          <label style={LABEL}>Days +SLA</label>
          <ValidatedInput
            type="number"
            value={String(policy.days_addition_sla)}
            onChange={(v) => onUpdate(index, "days_addition_sla", Number(v) || 0)}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}
