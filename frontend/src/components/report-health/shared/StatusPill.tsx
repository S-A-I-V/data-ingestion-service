/**
 * StatusPill — Colored badge showing delay or delivery status.
 * Reusable across the Report Health dashboard and drawer tabs.
 */
import { DELAY_STATUS_META, JOB_STATUS_META } from "../../../constants/reportHealth";

interface Props {
  status: string;
  type?: "delay" | "job";
}

export default function StatusPill({ status, type = "delay" }: Props) {
  const meta =
    type === "job"
      ? JOB_STATUS_META[status] ?? JOB_STATUS_META["scheduled"]
      : DELAY_STATUS_META[status] ?? DELAY_STATUS_META["unknown_state"];
  return (
    <span className="rh-pill" style={{ background: meta.bg, color: meta.color }}>
      <span className="rh-pill-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
