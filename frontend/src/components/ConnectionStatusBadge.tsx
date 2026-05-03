/**
 * ConnectionStatusBadge
 *
 * A small status dot rendered at the top-right corner of a connection card.
 *   "ok"      → green tick
 *   "error"   → nothing (same as DBeaver for failed/timed-out)
 *   "unknown" → nothing (untested)
 */

import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export type ConnStatus = "ok" | "error" | "unknown";

interface Props {
  status: ConnStatus;
}

export default function ConnectionStatusBadge({ status }: Props) {
  if (status !== "ok") return null;
  return (
    <span className="conn-status-badge conn-status-ok" aria-label="Connected" title="Connected">
      <CheckCircleIcon sx={{ fontSize: 18, color: "#22c55e", filter: "drop-shadow(0 0 4px rgba(34,197,94,0.6))" }} />
    </span>
  );
}
