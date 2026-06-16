/**
 * ReportMappingLiveEdit — Edit an existing report_job_mapping directly on NFC Prod.
 *
 * Flow:
 *   1. Load current mapping from DB into React Flow editor
 *   2. Make changes (same editor as ReportMappingEditor)
 *   3. Click "Preview Changes" → see SQL diff
 *   4. Confirm → execute atomically on NFC Prod
 *   5. Audit logged
 *
 * Route: /admin/report-mapping/live-edit?report=NAME&app=APP&rid=ID
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  Position,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import api from "../api";
import { Button, Spinner } from "../components/ui";
import JobNode from "../components/report-mapping/JobNode";
import { useUndoRedo } from "../hooks/useUndoRedo";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import PreviewIcon from "@mui/icons-material/Preview";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import CircularProgress from "@mui/material/CircularProgress";
import StepProgress, { type Step } from "../components/onboarding/StepProgress";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

interface Job {
  job_id: number;
  job_name: string;
  category: string | null;
}

interface ExistingReport {
  report_id: number;
  report_name: string;
  application_name: string;
  job_count: number;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 160;

const STEPS: Step[] = [
  { label: "Select", description: "Choose report" },
  { label: "Edit", description: "Modify mapping" },
  { label: "Preview", description: "Review changes" },
  { label: "Confirm", description: "Apply to Prod" },
];

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 250, marginx: 40, marginy: 40 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    } as Node;
  });
}

export default function ReportMappingLiveEdit() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportName = searchParams.get("report") || "";
  const appName = searchParams.get("app") || "";
  const reportId = Number(searchParams.get("rid") || 0);

  // Selection phase (when no params)
  const [reports, setReports] = useState<ExistingReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(!reportId);
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("");

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview/Execute state
  const [previewStatements, setPreviewStatements] = useState<any[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");
  const initialStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const graph = useUndoRedo<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const nodeTypes: NodeTypes = useMemo(() => ({ jobNode: JobNode }), []);

  useEffect(() => {
    setNodes(graph.state.nodes);
    setEdges(graph.state.edges);
  }, [graph.state]);

  const commitChange = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      graph.set({ nodes: newNodes, edges: newEdges });
      setDirty(true);
    },
    [graph],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) graph.redo();
        else graph.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        graph.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [graph]);

  // Load report list when no report selected
  useEffect(() => {
    if (!reportId) {
      setReportsLoading(true);
      api
        .get("/admin/report-mapping/existing")
        .then((r) => setReports(r.data.reports || []))
        .catch((e) => setError(e.response?.data?.detail || "Failed to load reports"))
        .finally(() => setReportsLoading(false));
    }
  }, [reportId]);

  // Load data when report is selected
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [jobsRes, mappingRes] = await Promise.all([
          api.get("/admin/report-mapping/jobs"),
          api.get(`/admin/report-mapping/existing/${reportId}`),
        ]);
        setJobs(jobsRes.data.jobs || []);
        const data = mappingRes.data.mapping_data;
        const flowNodes: Node[] = (data.nodes || []).map((n: any) => ({
          id: n.id,
          type: "jobNode",
          position: n.position || { x: 0, y: 0 },
          data: { job_id: n.job_id, job_name: n.job_name || "" },
        }));
        const flowEdges: Edge[] = (data.edges || []).map((e: any) => ({
          id: e.id || `e-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: true,
          style: { stroke: "var(--accent)" },
        }));
        const layouted = applyDagreLayout(flowNodes, flowEdges);
        setNodes(layouted);
        setEdges(flowEdges);
        graph.reset({ nodes: layouted, edges: flowEdges });
        initialStateRef.current = { nodes: layouted, edges: flowEdges };
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load mapping");
      } finally {
        setLoading(false);
      }
    };
    if (reportId) init();
  }, [reportId]);

  // React Flow callbacks
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        if (changes.some((c) => c.type === "remove")) commitChange(updated, edges);
        return updated;
      });
    },
    [edges, commitChange],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        if (changes.some((c) => c.type === "remove")) commitChange(nodes, updated);
        return updated;
      });
    },
    [nodes, commitChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const updated = addEdge(
          { ...connection, type: "smoothstep", animated: true, style: { stroke: "var(--accent)" } },
          eds,
        );
        commitChange(nodes, updated);
        return updated;
      });
    },
    [nodes, commitChange],
  );

  const addNode = () => {
    const id = `n${Date.now()}`;
    const newNode: Node = {
      id,
      type: "jobNode",
      position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { job_id: null, job_name: "" },
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    commitChange(newNodes, edges);
  };

  const updateNodeJob = useCallback((nodeId: string, jobId: number, jobName: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, job_id: jobId, job_name: jobName } } : n)),
    );
    setDirty(true);
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  const disconnectRight = useCallback((nodeId: string) => {
    setEdges((prev) => prev.filter((e) => e.source !== nodeId));
  }, []);

  const bypassDelete = useCallback(
    (nodeId: string) => {
      const incoming = edges.filter((e) => e.target === nodeId);
      const outgoing = edges.filter((e) => e.source === nodeId);
      const bypassEdges: Edge[] = [];
      for (const src of incoming.map((e) => e.source)) {
        for (const tgt of outgoing.map((e) => e.target)) {
          bypassEdges.push({
            id: `e${src}-${tgt}`,
            source: src,
            target: tgt,
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--accent)" },
          });
        }
      }
      const updatedNodes = nodes.filter((n) => n.id !== nodeId);
      const updatedEdges = [...edges.filter((e) => e.source !== nodeId && e.target !== nodeId), ...bypassEdges];
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      commitChange(updatedNodes, updatedEdges);
    },
    [nodes, edges, commitChange],
  );

  // Expose to JobNode
  useEffect(() => {
    window.__REPORT_MAPPING_JOBS__ = jobs;
    window.__REPORT_MAPPING_UPDATE_NODE__ = updateNodeJob;
    window.__REPORT_MAPPING_DELETE_NODE__ = deleteNode;
    window.__REPORT_MAPPING_DISCONNECT_RIGHT__ = disconnectRight;
    window.__REPORT_MAPPING_BYPASS_DELETE__ = bypassDelete;
    return () => {
      delete window.__REPORT_MAPPING_JOBS__;
      delete window.__REPORT_MAPPING_UPDATE_NODE__;
      delete window.__REPORT_MAPPING_DELETE_NODE__;
      delete window.__REPORT_MAPPING_DISCONNECT_RIGHT__;
      delete window.__REPORT_MAPPING_BYPASS_DELETE__;
    };
  }, [jobs, updateNodeJob, deleteNode, disconnectRight, bypassDelete]);

  const handleRelayout = useCallback(() => {
    setNodes((cur) => applyDagreLayout(cur, edges));
  }, [edges]);

  const handleReset = () => {
    if (!initialStateRef.current) return;
    const { nodes: initNodes, edges: initEdges } = initialStateRef.current;
    setNodes(JSON.parse(JSON.stringify(initNodes)));
    setEdges(JSON.parse(JSON.stringify(initEdges)));
    graph.reset({ nodes: initNodes, edges: initEdges });
    setDirty(false);
    setToast("Reset to original mapping");
    setTimeout(() => setToast(""), 3000);
  };

  // Preview changes
  const handlePreview = async () => {
    const unassigned = nodes.filter((n) => !n.data.job_id);
    if (unassigned.length > 0) {
      setError("All nodes must have a job assigned before previewing");
      return;
    }
    setPreviewing(true);
    setError(null);
    try {
      const res = await api.post("/admin/report-mapping/preview-changes", {
        report_name: reportName,
        application_name: appName,
        report_id: reportId,
        nodes: nodes.map((n) => ({ id: n.id, job_id: n.data.job_id, job_name: n.data.job_name })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      });
      if (res.data.total === 0) {
        setToast("No changes detected — mapping is identical to database");
        setTimeout(() => setToast(""), 3000);
      } else {
        setPreviewStatements(res.data.statements);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  // Apply changes
  const handleApply = async () => {
    setExecuting(true);
    setError(null);
    try {
      const res = await api.post("/admin/report-mapping/apply-changes", {
        report_name: reportName,
        application_name: appName,
        report_id: reportId,
        nodes: nodes.map((n) => ({ id: n.id, job_id: n.data.job_id, job_name: n.data.job_name })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      });
      setResult(res.data);
      setPreviewStatements(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Apply failed");
    } finally {
      setExecuting(false);
    }
  };

  const graphExtent = useMemo((): [[number, number], [number, number]] => {
    if (nodes.length === 0)
      return [
        [-1000, -1000],
        [2000, 2000],
      ];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, n.position.y + NODE_HEIGHT);
    }
    return [
      [minX - 500, minY - 500],
      [maxX + 500, maxY + 500],
    ];
  }, [nodes]);

  if (result) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Edit Mapping</span>
        </div>
        <div className="onboarding-success">
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "var(--success)" }} />
          <h2 className="onboarding-success-title">Mapping Updated Successfully</h2>
          <div className="onboarding-success-stats">
            <div className="onboarding-success-stat">
              <span className="onboarding-success-stat-value">{result.executed}</span>
              <span className="onboarding-success-stat-label">Executed</span>
            </div>
            <div className="onboarding-success-stat onboarding-success-stat--warn">
              <span className="onboarding-success-stat-value">{result.skipped}</span>
              <span className="onboarding-success-stat-label">Skipped</span>
            </div>
            <div className="onboarding-success-stat">
              <span className="onboarding-success-stat-value">{result.total_statements}</span>
              <span className="onboarding-success-stat-label">Total</span>
            </div>
          </div>
          <div className="onboarding-success-actions">
            <Button variant="primary" onClick={() => navigate("/admin/report-mapping")}>
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportId) {
    const appNames = [...new Set(reports.map((r) => r.application_name).filter(Boolean))].sort();
    const filtered = reports.filter((r) => {
      const matchesSearch =
        !search ||
        r.report_name.toLowerCase().includes(search.toLowerCase()) ||
        r.application_name.toLowerCase().includes(search.toLowerCase());
      const matchesApp = !appFilter || r.application_name === appFilter;
      return matchesSearch && matchesApp;
    });
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Edit Existing Report Mapping</span>
          <div className="toolbar-spacer" />
          <Button size="sm" onClick={() => navigate("/admin/report-mapping")}>
            <ArrowBackIcon sx={{ fontSize: 14 }} /> Back
          </Button>
        </div>

        <StepProgress steps={STEPS} currentStep={0} onStepClick={() => {}} skippedSteps={new Set()} />

        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
          Select a report to edit its job mapping directly on NFC Prod.
        </p>
        <div className="rm-filter-bar">
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rm-filter-search"
          />
          <div className="rm-filter-chips">
            <button className={`rm-filter-chip ${!appFilter ? "active" : ""}`} onClick={() => setAppFilter("")}>
              All
            </button>
            {appNames.map((app) => (
              <button
                key={app}
                className={`rm-filter-chip ${appFilter === app ? "active" : ""}`}
                onClick={() => setAppFilter(appFilter === app ? "" : app)}
              >
                {app}
              </button>
            ))}
          </div>
        </div>
        {reportsLoading ? (
          <Spinner size="lg" label="Loading reports..." />
        ) : (
          <div className="rm-grid">
            {filtered.map((r) => (
              <div key={`${r.report_id}-${r.application_name}`} className="rm-card">
                <div className="rm-card-header">
                  <h4>{r.report_name}</h4>
                </div>
                <span className="rm-card-chip">{r.application_name}</span>
                <div className="rm-card-stats">
                  <span>{r.job_count} jobs</span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSearchParams({ report: r.report_name, app: r.application_name, rid: String(r.report_id) });
                  }}
                >
                  Select & Edit
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading)
    return (
      <div className="container audit-container">
        <Spinner size="lg" label="Loading mapping from NFC Prod..." />
      </div>
    );

  return (
    <div className="rm-editor-page">
      <div className="rm-editor-toolbar">
        <Button size="sm" onClick={() => navigate("/admin/report-mapping/live-edit")}>
          <ArrowBackIcon sx={{ fontSize: 14 }} /> Back
        </Button>
        <span className="rm-edit-title">
          Editing: <strong>{reportName}</strong> ({appName})
        </span>
        <div className="toolbar-spacer" />
        <Button size="sm" onClick={addNode}>
          <AddIcon sx={{ fontSize: 14 }} /> Add Job
        </Button>
        <Button size="sm" onClick={graph.undo} disabled={!graph.canUndo}>
          <UndoIcon sx={{ fontSize: 14 }} />
        </Button>
        <Button size="sm" onClick={graph.redo} disabled={!graph.canRedo}>
          <RedoIcon sx={{ fontSize: 14 }} />
        </Button>
        <Button size="sm" onClick={handleRelayout}>
          <AccountTreeIcon sx={{ fontSize: 14 }} /> Layout
        </Button>
        <Button size="sm" variant="danger" onClick={handleReset}>
          <RestartAltIcon sx={{ fontSize: 14 }} /> Reset
        </Button>
        <Button size="sm" variant="primary" onClick={handlePreview} disabled={previewing} style={{ minWidth: 150 }}>
          {previewing ? (
            <CircularProgress size={14} sx={{ color: "#fff" }} />
          ) : (
            <>
              Next: Preview <ArrowForwardIcon sx={{ fontSize: 14 }} />
            </>
          )}
        </Button>
      </div>

      {/* Step Progress */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
        <StepProgress
          steps={STEPS}
          currentStep={previewStatements ? 2 : 1}
          onStepClick={() => {}}
          skippedSteps={new Set()}
        />
      </div>

      {error && <div className="rm-editor-error">{error}</div>}

      {/* Preview Panel */}
      {previewStatements && (
        <div className="rm-preview-panel">
          <div className="rm-preview-header">
            <h4>
              {previewStatements.length} statement{previewStatements.length !== 1 ? "s" : ""} will be executed
            </h4>
            <div className="rm-preview-actions">
              <Button size="sm" onClick={() => setPreviewStatements(null)}>
                <ArrowBackIcon sx={{ fontSize: 14 }} /> Back to Edit
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleApply}
                disabled={executing || previewStatements.length === 0}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> {executing ? "Applying..." : "Confirm & Apply"}
              </Button>
            </div>
          </div>
          <div className="rm-preview-statements">
            {previewStatements.map((s, i) => (
              <div key={i} className="rm-preview-stmt">
                <span className="rm-preview-stmt-num">#{i + 1}</span>
                <div>
                  <code>{s.sql}</code>
                  <div
                    style={{ marginTop: 4, fontSize: 10, color: "var(--accent)", fontFamily: "'Fira Code', monospace" }}
                  >
                    {Object.entries(s.params)
                      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                      .join("  |  ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph Canvas */}
      {!previewStatements && (
        <>
          <div className="rm-editor-canvas">
            {toast && (
              <div className="rm-save-toast-popup" style={{ top: 16 }}>
                {toast}
              </div>
            )}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={2}
              translateExtent={graphExtent}
              deleteKeyCode="Delete"
              connectionLineType={ConnectionLineType.SmoothStep}
              proOptions={{ hideAttribution: true }}
              className="report-flow-graph"
            >
              <Controls showInteractive={false} />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.05)" />
            </ReactFlow>
          </div>
          <div className="rm-editor-stats">
            <span>{nodes.length} jobs</span>
            <span>{edges.length} connections</span>
            <span>{nodes.filter((n) => n.data.job_id).length} assigned</span>
          </div>
        </>
      )}
    </div>
  );
}
