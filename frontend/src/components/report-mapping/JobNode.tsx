/**
 * JobNode — Custom React Flow node with a job selector dropdown.
 * Each node represents one job in the pipeline DAG.
 */

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import DeleteIcon from "@mui/icons-material/Delete";

// Jobs are passed via a global context (set by parent)
// We use window.__REPORT_MAPPING_JOBS__ as a simple shared store
declare global {
  interface Window {
    __REPORT_MAPPING_JOBS__?: Array<{ job_id: number; job_name: string; category: string | null }>;
    __REPORT_MAPPING_UPDATE_NODE__?: (nodeId: string, jobId: number, jobName: string, category: string) => void;
    __REPORT_MAPPING_DELETE_NODE__?: (nodeId: string) => void;
    __REPORT_MAPPING_DISCONNECT_RIGHT__?: (nodeId: string) => void;
  }
}

function JobNode({ id, data }: NodeProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const jobs = window.__REPORT_MAPPING_JOBS__ || [];
  const updateNode = window.__REPORT_MAPPING_UPDATE_NODE__;
  const deleteNode = window.__REPORT_MAPPING_DELETE_NODE__;
  const disconnectRight = window.__REPORT_MAPPING_DISCONNECT_RIGHT__;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = jobs.filter(
    (j) => j.job_name.toLowerCase().includes(search.toLowerCase()) || String(j.job_id).includes(search),
  );

  const handleSelect = (job: { job_id: number; job_name: string; category: string | null }) => {
    updateNode?.(id, job.job_id, job.job_name, job.category || "");
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="job-node">
      <Handle type="target" position={Position.Left} className="job-node-handle" />

      <div className="job-node-header">
        <span className="job-node-label">{(data as any).job_name || "Select a job..."}</span>
        <button
          className="job-node-action"
          onClick={(e) => {
            e.stopPropagation();
            disconnectRight?.(id);
          }}
          title="Disconnect outgoing edges (→)"
        >
          ✂
        </button>
        <button
          className="job-node-delete"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode?.(id);
          }}
          title="Delete node"
        >
          <DeleteIcon sx={{ fontSize: 12 }} />
        </button>
      </div>

      {(data as any).job_id && <div className="job-node-id">ID: {(data as any).job_id}</div>}
      {(data as any).category && <div className="job-node-category">{(data as any).category}</div>}

      {/* Dropdown trigger */}
      <button className="job-node-select-btn" onClick={() => setOpen(!open)}>
        {(data as any).job_id ? "Change Job" : "Select Job ▾"}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="job-node-dropdown" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
          <input
            className="job-node-search"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="job-node-options" onWheel={(e) => e.stopPropagation()}>
            {filtered.slice(0, 20).map((j) => (
              <button key={j.job_id} className="job-node-option" onClick={() => handleSelect(j)}>
                <span className="job-node-option-name">{j.job_name}</span>
                <span className="job-node-option-id">#{j.job_id}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="job-node-option-empty">No jobs found</div>}
            {filtered.length > 20 && <div className="job-node-option-empty">Showing 20 of {filtered.length}...</div>}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="job-node-handle" />
    </div>
  );
}

export default memo(JobNode);
