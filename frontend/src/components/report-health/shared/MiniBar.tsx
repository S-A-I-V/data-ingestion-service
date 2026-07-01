/**
 * MiniBar — Compact progress bar with step counts.
 * Shows completed/total with colored fill based on delay status.
 */

interface Props {
  completed: number;
  total: number;
  delayed: number;
  status: string;
}

export default function MiniBar({ completed, total, delayed, status }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const cls =
    status === "client_delayed"
      ? "rh-mini-fill--delayed"
      : status === "internal_delayed"
        ? "rh-mini-fill--warn"
        : pct === 100
          ? "rh-mini-fill--ok"
          : "rh-mini-fill--prog";
  return (
    <div className="rh-mini-bar">
      <div className="rh-mini-track">
        <div className={`rh-mini-fill ${cls}`} style={{ width: `${pct}%` }} aria-label={`${pct}%`} />
      </div>
      <div className="rh-mini-numbers">
        {completed}/{total}
        {delayed > 0 && (
          <>
            <span className="rh-mini-sep">·</span>
            <span className="rh-mini-delayed">{delayed} delayed</span>
          </>
        )}
      </div>
    </div>
  );
}
