/**
 * Heatmap — colored cells showing per-data-date run status for a job.
 * Each cell shows ✓ (100%), · (scheduled), or completion % number.
 */
import type { ReportJob } from "../../../types/reportHealth";
import { DELAY_STATUS_META } from "../../../constants/reportHealth";

interface Props {
  job: ReportJob;
}

export default function Heatmap({ job }: Props) {
  return (
    <div className="rh-heatmap">
      {job.run_statuses.map((r) => {
        const meta = DELAY_STATUS_META[r.delay_status] ?? DELAY_STATUS_META["unknown_state"];
        return (
          <div
            key={String(r.data_date)}
            className="rh-hm-cell"
            style={{ background: meta.bg, color: meta.color }}
            title={`${String(r.data_date).slice(0, 10)} · ${r.status} · ${meta.label} · ${r.completion_percentage}%`}
          >
            {r.completion_percentage === 100 ? "✓" : r.status === "scheduled" ? "·" : r.completion_percentage}
          </div>
        );
      })}
    </div>
  );
}
