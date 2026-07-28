/**
 * JobNode — Custom React Flow node with a job selector dropdown.
 * Each node represents one job in the pipeline DAG.
 */

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import Tooltip from "@mui/material/Tooltip";
import type { RunRequirementMode } from "../../constants/reportMapping";

/** Run requirement settings for a job node */
export interface JobRunSettings {
  run_requirement_mode: RunRequirementMode;
  required_offsets_json: number[] | null;
  min_success_count: number | null;
}

// Jobs are passed via a global context (set by parent)
// We use window.__REPORT_MAPPING_JOBS__ as a simple shared store
declare global {
  interface Window {
    __REPORT_MAPPING_JOBS__?: Array<{ job_id: number; job_name: string; category: string | null; is_proxy?: boolean }>;
    __REPORT_MAPPING_NODES__?: Array<{ id: string; data: any }>;
    __REPORT_MAPPING_EDGES__?: Array<{ source: string; target: string }>;
    __REPORT_MAPPING_UPDATE_NODE__?: (
      nodeId: string,
      jobId: number,
      jobName: string,
      category: string,
      isProxy?: boolean,
    ) => void;
    __REPORT_MAPPING_DELETE_NODE__?: (nodeId: string) => void;
    __REPORT_MAPPING_DISCONNECT_RIGHT__?: (nodeId: string) => void;
    __REPORT_MAPPING_BYPASS_DELETE__?: (nodeId: string) => void;
    __REPORT_MAPPING_OPEN_SETTINGS__?: (nodeId: string) => void;
  }
}

function JobNode({ id, data }: NodeProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const jobs = window.__REPORT_MAPPING_JOBS__ || [];
  const allNodes = window.__REPORT_MAPPING_NODES__ || [];
  const allEdges = window.__REPORT_MAPPING_EDGES__ || [];
  const updateNode = window.__REPORT_MAPPING_UPDATE_NODE__;
  const deleteNode = window.__REPORT_MAPPING_DELETE_NODE__;
  const disconnectRight = window.__REPORT_MAPPING_DISCONNECT_RIGHT__;
  const bypassDelete = window.__REPORT_MAPPING_BYPASS_DELETE__;
  const openSettings = window.__REPORT_MAPPING_OPEN_SETTINGS__;

  // Extract run requirement fields from node data
  const runMode = (data as any).run_requirement_mode || "PER_DATA_DATE";
  const minSuccessCount = (data as any).min_success_count;
  const hasCustomSettings = runMode !== "PER_DATA_DATE" || (minSuccessCount != null && minSuccessCount !== 1);

  // Compute prev/next job names from edges
  const prevJobNames = allEdges
    .filter((e) => e.target === id)
    .map((e) => allNodes.find((n) => n.id === e.source)?.data?.job_name)
    .filter(Boolean);
  const nextJobNames = allEdges
    .filter((e) => e.source === id)
    .map((e) => allNodes.find((n) => n.id === e.target)?.data?.job_name)
    .filter(Boolean);

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

  const handleSelect = (job: { job_id: number; job_name: string; category: string | null; is_proxy?: boolean }) => {
    updateNode?.(id, job.job_id, job.job_name, job.category || "", job.is_proxy);
    setOpen(false);
    setSearch("");
  };

  // Short label for run mode
  const runModeLabel = runMode === "ONCE_PER_WINDOW" ? "1×/win" : runMode === "SPECIFIC_OFFSETS" ? "offsets" : null;

  return (
    <div className="job-node">
      <Handle type="target" position={Position.Left} className="job-node-handle" />

      <div className="job-node-header">
        <span className="job-node-label">{(data as any).job_name || "Select a job..."}</span>
        {(prevJobNames.length > 0 || nextJobNames.length > 0) && (
          <Tooltip
            title={
              <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                {prevJobNames.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>← Prev</div>
                    {prevJobNames.map((name, i) => (
                      <div key={i}>• {name}</div>
                    ))}
                  </>
                )}
                {prevJobNames.length > 0 && nextJobNames.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", margin: "4px 0" }} />
                )}
                {nextJobNames.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Next →</div>
                    {nextJobNames.map((name, i) => (
                      <div key={i}>• {name}</div>
                    ))}
                  </>
                )}
              </div>
            }
            arrow
            placement="top"
          >
            <InfoOutlinedIcon className="job-node-info-icon" sx={{ fontSize: 14 }} />
          </Tooltip>
        )}
      </div>

      {(data as any).job_id && (
        <div className="job-node-id">
          <span>ID: {(data as any).job_id}</span>
          {(data as any).is_proxy && <span className="job-node-proxy-chip">PROXY</span>}
          {openSettings && runModeLabel && <span className="job-node-mode-chip">{runModeLabel}</span>}
          {openSettings && minSuccessCount != null && minSuccessCount !== 1 && (
            <span className="job-node-mode-chip">min:{minSuccessCount}</span>
          )}
          {!(data as any).is_proxy && (data as any).job_id < 0 && (
            <button
              className="job-node-proxy-toggle"
              onClick={(e) => {
                e.stopPropagation();
                updateNode?.(id, (data as any).job_id, (data as any).job_name, (data as any).category || "", true);
              }}
              title="Mark as proxy"
            >
              + proxy
            </button>
          )}
        </div>
      )}
      {!(data as any).job_id && (data as any).is_proxy && (
        <div className="job-node-id">
          <span className="job-node-proxy-chip">PROXY</span>
        </div>
      )}

      {/* Action panel */}
      <div className="job-node-actions">
        {openSettings && (data as any).job_id && (
          <Tooltip title="Run settings" arrow placement="top">
            <button
              className={`job-node-action-btn job-node-action-btn--settings${hasCustomSettings ? " job-node-action-btn--active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                openSettings?.(id);
              }}
            >
              <SettingsIcon sx={{ fontSize: 18 }} />
            </button>
          </Tooltip>
        )}
        <button
          className="job-node-action-btn job-node-action-btn--cut"
          onClick={(e) => {
            e.stopPropagation();
            disconnectRight?.(id);
          }}
          title="Disconnect outgoing edges"
        >
          <ContentCutIcon sx={{ fontSize: 18 }} />
        </button>
        <button
          className="job-node-action-btn job-node-action-btn--bypass"
          onClick={(e) => {
            e.stopPropagation();
            bypassDelete?.(id);
          }}
          title="Bypass — connect prev to next, remove this"
        >
          <CallSplitIcon sx={{ fontSize: 18, transform: "rotate(90deg)" }} />
        </button>
        <button
          className="job-node-action-btn job-node-action-btn--delete"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode?.(id);
          }}
          title="Delete node"
        >
          <DeleteIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

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
                <span className="job-node-option-id">
                  #{j.job_id}
                  {j.is_proxy && <span className="job-node-proxy-badge">P</span>}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="job-node-option-empty">
                No jobs found
                <button
                  className="job-node-option job-node-option--custom"
                  onClick={() => {
                    updateNode?.(id, -Date.now(), search, "custom");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="job-node-option-name">Use "{search}"</span>
                  <span className="job-node-option-id">custom</span>
                </button>
              </div>
            )}
            {filtered.length > 20 && <div className="job-node-option-empty">Showing 20 of {filtered.length}...</div>}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="job-node-handle" />
    </div>
  );
}

export default memo(JobNode);
