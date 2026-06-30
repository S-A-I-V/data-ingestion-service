/**
 * TimelineTab — chronological job list sorted by start time.
 */
import Pill from "../shared/Pill";
import { fmt } from "../shared/formatters";
import type { ReportJob } from "../../../types/reportHealth";

interface Props {
  jobs: ReportJob[];
}

export default function TimelineTab({ jobs }: Props) {
  const sorted = [...jobs].sort((a, b) => {
    const ta = a.start_time ? new Date(a.start_time).getTime() : Infinity;
    const tb = b.start_time ? new Date(b.start_time).getTime() : Infinity;
    return ta - tb;
  });

  function cls(job: ReportJob) {
    if (job.current_status === "failed" || job.current_status === "error") return "rh-tl-job rh-tl-job--error";
    if (job.delay_status === "client_delayed" || job.delay_status === "internal_delayed")
      return "rh-tl-job rh-tl-job--delayed";
    if (job.current_status === "success") return "rh-tl-job rh-tl-job--ok";
    if (job.current_status === "scheduled") return "rh-tl-job rh-tl-job--sched";
    return "rh-tl-job";
  }

  return (
    <div className="rh-tl">
      {sorted.map((job) => (
        <div key={job.job_id} className={cls(job)}>
          <div className="rh-tl-name">
            {job.job_name}
            {job.is_final_step && <span className="rh-final-badge">FINAL</span>}
          </div>
          <div className="rh-tl-times">
            {job.start_time ? (
              <span>Start {fmt(job.start_time)}</span>
            ) : (
              <span>Exp. {fmt(job.expected_start_time)}</span>
            )}
            {job.end_time ? (
              <span style={{ color: "var(--success)" }}>End {fmt(job.end_time)}</span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>SLA {fmt(job.job_expected_sla)}</span>
            )}
            <Pill status={job.delay_status} />
          </div>
          {(job.previous_jobs_list || job.next_jobs_list) && (
            <div className="rh-tl-deps">
              {job.previous_jobs_list && <span>← {job.previous_jobs_list}</span>}
              {job.previous_jobs_list && job.next_jobs_list && " · "}
              {job.next_jobs_list && <span>→ {job.next_jobs_list}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
