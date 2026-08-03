/**
 * JobSelector — Searchable list of jobs for the left sidebar.
 * Shows job name and type badges.
 */

import { useState, useMemo } from "react";
import WorkIcon from "@mui/icons-material/Work";
import SearchIcon from "@mui/icons-material/Search";
import { Spinner } from "../ui";
import { JOB_TYPE_LABELS, JOB_SEARCH_DEBOUNCE_MS } from "../../constants/jobSla";
import type { JobDefinition, JobTypeLabel } from "../../types/jobSla";

/** Labels for UI text */
const LABELS = {
  SECTION_TITLE: "Jobs",
  SEARCH_PLACEHOLDER: "Search jobs...",
  NO_JOBS: "No jobs found",
  LOADING: "Loading jobs...",
} as const;

interface JobSelectorProps {
  jobs: JobDefinition[];
  loading: boolean;
  error: string | null;
  selectedJobId: number | null;
  onSelectJob: (job: JobDefinition) => void;
  /** Optional: job type info for badges */
  jobTypes?: Record<number, JobTypeLabel>;
}

export function JobSelector({ jobs, loading, error, selectedJobId, onSelectJob, jobTypes }: JobSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [hoveredJob, setHoveredJob] = useState<JobDefinition | null>(null);

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), JOB_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  // Filter jobs by search
  const filteredJobs = useMemo(() => {
    if (!debouncedSearch.trim()) return jobs;
    const q = debouncedSearch.toLowerCase();
    return jobs.filter((job) => job.job_name.toLowerCase().includes(q) || job.owner_email?.toLowerCase().includes(q));
  }, [jobs, debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Immediate update for responsiveness, debounce handles actual filtering
    const timer = setTimeout(() => setDebouncedSearch(value), JOB_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, job: JobDefinition) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
    setHoveredJob(job);
  };

  const handleMouseLeave = () => {
    setTooltipPos(null);
    setHoveredJob(null);
  };

  return (
    <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="sidebar-card-title">
        <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900 flex items-center gap-2">
          <WorkIcon sx={{ fontSize: 16 }} /> {LABELS.SECTION_TITLE} ({filteredJobs.length})
        </h2>
      </div>

      {/* Search */}
      <div className="js-search">
        <SearchIcon sx={{ fontSize: 14, opacity: 0.5 }} />
        <input
          type="text"
          placeholder={LABELS.SEARCH_PLACEHOLDER}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Job List */}
      <div className="js-jobs-list sidebar-card-list">
        {loading ? (
          <div className="js-loading">
            <Spinner size="sm" label={LABELS.LOADING} />
          </div>
        ) : error ? (
          <div className="js-error">{error}</div>
        ) : filteredJobs.length === 0 ? (
          <div className="js-empty">{LABELS.NO_JOBS}</div>
        ) : (
          filteredJobs.map((job) => {
            const jobType = jobTypes?.[job.job_id];
            return (
              <div
                key={job.job_id}
                className={`js-job-item lf-corners-hover ${selectedJobId === job.job_id ? "js-job-selected" : ""}`}
                onClick={() => onSelectJob(job)}
                onMouseEnter={(e) => handleMouseEnter(e, job)}
                onMouseLeave={handleMouseLeave}
                role="button"
                tabIndex={0}
              >
                <div className="js-job-info">
                  <div className="js-job-name">{job.job_name}</div>
                  <div className="js-job-meta">
                    {jobType && jobType !== "standard" && (
                      <span className={`js-job-type js-job-type--${jobType}`}>{JOB_TYPE_LABELS[jobType]}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fixed position tooltip */}
      {tooltipPos && hoveredJob && (
        <div
          className="js-job-tooltip"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: "translateY(-50%)",
          }}
        >
          <div className="js-tooltip-name">{hoveredJob.job_name}</div>
          {hoveredJob.owner_email && <div className="js-tooltip-owner">Owner: {hoveredJob.owner_email}</div>}
        </div>
      )}
    </div>
  );
}
