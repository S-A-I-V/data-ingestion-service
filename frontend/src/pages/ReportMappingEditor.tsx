/**
 * ReportMappingEditor — Visual DAG editor for report→job pipelines.
 * Uses @xyflow/react (React Flow) for the interactive graph.
 *
 * Features:
 *   - Add/remove nodes (each with job dropdown)
 *   - Connect nodes with edges (drag)
 *   - Save to local DB (per-user)
 *   - Export as CSV (job_id, previous_job_ids, next_job_ids)
 *   - Load from existing report mapping (copy mode)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
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
import OutlinedInput from "../components/ui/OutlinedInput";
import { useUndoRedo } from "../hooks/useUndoRedo";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

interface Job {
  job_id: number;
  job_name: string;
  category: string | null;
}

// ── Dagre Sugiyama Layout ────────────────────────────────────────────────────
const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

function applyDagreLayout(nodes: Node[], edges: Edge[], direction = "LR"): Node[] {
  if (nodes.length === 0) return nodes;

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === "LR";

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60, // vertical spacing between nodes in same rank
    ranksep: 200, // horizontal spacing between ranks
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    } as Node;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportMappingEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loadId = searchParams.get("load");
  const copyId = searchParams.get("copy");

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // ── Undo/Redo via hook ─────────────────────────────────────────────────────
  const graph = useUndoRedo<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });

  // Sync hook state → local state (for React Flow)
  useEffect(() => {
    setNodes(graph.state.nodes);
    setEdges(graph.state.edges);
  }, [graph.state]);

  // Commit: call this after any user action to record it
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
  // ──────────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveToast, setSaveToast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mappingId, setMappingId] = useState<number | null>(loadId ? Number(loadId) : null);
  const [mappingName, setMappingName] = useState("");
  const [reportName, setReportName] = useState("");
  const [appName, setAppName] = useState("");

  // Node types registration
  const nodeTypes: NodeTypes = useMemo(() => ({ jobNode: JobNode }), []);

  // Load jobs + optionally load/copy mapping
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const jobsRes = await api.get("/admin/report-mapping/jobs");
        setJobs(jobsRes.data.jobs || []);

        if (loadId) {
          const res = await api.get(`/admin/report-mapping/saved/${loadId}`);
          const data = res.data;
          setMappingName(data.name);
          setReportName(data.report_name || "");
          setAppName(data.application_name || "");
          loadGraphData(data.mapping_data);
          setMappingId(data.id);
        } else if (copyId) {
          const res = await api.get(`/admin/report-mapping/existing/${copyId}`);
          const data = res.data;
          setReportName(data.report_name || "");
          setAppName(data.application_name || "");
          setMappingName(`Copy of ${data.report_name}`);
          loadGraphData(data.mapping_data);
        }
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadGraphData = (data: { nodes: any[]; edges: any[] }) => {
    const flowNodes: Node[] = (data.nodes || []).map((n: any) => ({
      id: n.id,
      type: "jobNode",
      position: n.position || { x: 0, y: 0 },
      data: {
        job_id: n.job_id,
        job_name: n.job_name || "",
        category: n.category || "",
      },
    }));
    const flowEdges: Edge[] = (data.edges || []).map((e: any) => ({
      id: e.id || `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: true,
      style: { stroke: "var(--accent)" },
    }));

    // Apply Dagre Sugiyama layout for proper node placement
    const layoutedNodes = applyDagreLayout(flowNodes, flowEdges, "LR");
    setNodes(layoutedNodes);
    setEdges(flowEdges);
    graph.reset({ nodes: layoutedNodes, edges: flowEdges });
  };

  // React Flow callbacks
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        if (changes.some((c) => c.type === "remove")) {
          commitChange(updated, edges);
        }
        return updated;
      });
    },
    [edges, commitChange],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        if (changes.some((c) => c.type === "remove")) {
          commitChange(nodes, updated);
        }
        return updated;
      });
    },
    [nodes, commitChange],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const updated = addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--accent)" },
          },
          eds,
        );
        commitChange(nodes, updated);
        return updated;
      });
    },
    [nodes, commitChange],
  );

  // Add node
  const addNode = () => {
    const id = `n${Date.now()}`;
    const newNode: Node = {
      id,
      type: "jobNode",
      position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { job_id: null, job_name: "", category: "" },
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    commitChange(newNodes, edges);
  };

  // Update node job selection
  const updateNodeJob = useCallback((nodeId: string, jobId: number, jobName: string, category: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, job_id: jobId, job_name: jobName, category } } : n,
      ),
    );
    setDirty(true);
  }, []);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  // Disconnect outgoing edges only (keep incoming)
  const disconnectRight = useCallback(
    (nodeId: string) => {
      setEdges((prev) => {
        const updated = prev.filter((e) => e.source !== nodeId);
        commitChange(nodes, updated);
        return updated;
      });
    },
    [nodes, commitChange],
  );

  // Expose jobs and callbacks to JobNode via window (React Flow constraint)
  useEffect(() => {
    window.__REPORT_MAPPING_JOBS__ = jobs;
    window.__REPORT_MAPPING_UPDATE_NODE__ = updateNodeJob;
    window.__REPORT_MAPPING_DELETE_NODE__ = deleteNode;
    window.__REPORT_MAPPING_DISCONNECT_RIGHT__ = disconnectRight;
    return () => {
      delete window.__REPORT_MAPPING_JOBS__;
      delete window.__REPORT_MAPPING_UPDATE_NODE__;
      delete window.__REPORT_MAPPING_DELETE_NODE__;
      delete window.__REPORT_MAPPING_DISCONNECT_RIGHT__;
    };
  }, [jobs, updateNodeJob, deleteNode, disconnectRight]);

  // Compute dynamic translate extent from node positions
  const graphExtent = useMemo((): [[number, number], [number, number]] => {
    if (nodes.length === 0) {
      return [
        [-1000, -1000],
        [2000, 2000],
      ];
    }
    const MARGIN = 500;
    const NODE_W = 220;
    const NODE_H = 100;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + NODE_W);
      maxY = Math.max(maxY, node.position.y + NODE_H);
    }
    return [
      [minX - MARGIN, minY - MARGIN],
      [maxX + MARGIN, maxY + MARGIN],
    ];
  }, [nodes]);

  // Re-layout: apply Dagre Sugiyama algorithm to current graph
  const handleRelayout = useCallback(() => {
    setNodes((currentNodes) => applyDagreLayout(currentNodes, edges, "LR"));
  }, [edges]);

  // Save mapping
  const handleSave = async () => {
    if (!mappingName.trim()) {
      setError("Please enter a name for this mapping");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: mappingName.trim(),
      report_name: reportName,
      application_name: appName,
      mapping_data: {
        nodes: nodes.map((n) => ({
          id: n.id,
          job_id: n.data.job_id,
          job_name: n.data.job_name,
          category: n.data.category,
          position: n.position,
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      },
    };

    try {
      if (mappingId) {
        await api.put(`/admin/report-mapping/saved/${mappingId}`, payload);
      } else {
        const res = await api.post("/admin/report-mapping/saved", payload);
        setMappingId(res.data.id);
      }
      setDirty(false);
      setSaveToast(`Saved "${mappingName.trim()}"`);
      setTimeout(() => setSaveToast(""), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Export CSV (client-side — works without saving)
  const handleExport = () => {
    if (nodes.length === 0) {
      setError("Nothing to export — add some jobs first");
      return;
    }

    // Build adjacency maps from edges
    const prevMap: Record<string, string[]> = {};
    const nextMap: Record<string, string[]> = {};

    for (const edge of edges) {
      if (!nextMap[edge.source]) nextMap[edge.source] = [];
      nextMap[edge.source].push(edge.target);
      if (!prevMap[edge.target]) prevMap[edge.target] = [];
      prevMap[edge.target].push(edge.source);
    }

    // Build CSV rows
    const rows = [["job_id", "previous_job_ids", "next_job_ids"]];
    for (const node of nodes) {
      const jobId = node.data.job_id || "";
      const prevNodes = prevMap[node.id] || [];
      const prevJobIds = prevNodes
        .map((pn) => nodes.find((n) => n.id === pn)?.data.job_id)
        .filter(Boolean)
        .join(",");
      const nextNodes = nextMap[node.id] || [];
      const nextJobIds = nextNodes
        .map((nn) => nodes.find((n) => n.id === nn)?.data.job_id)
        .filter(Boolean)
        .join(",");
      rows.push([String(jobId), prevJobIds, nextJobIds]);
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_mapping_${(mappingName || "untitled").replace(/ /g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Report Mapping Editor</span>
        </div>
        <Spinner size="lg" label="Loading editor..." />
      </div>
    );
  }

  return (
    <div className="rm-editor-page">
      {/* Toolbar */}
      <div className="rm-editor-toolbar">
        <Button size="sm" onClick={() => navigate("/admin/report-mapping")}>
          <ArrowBackIcon sx={{ fontSize: 14 }} /> Back
        </Button>
        <OutlinedInput
          label="Mapping Name"
          value={mappingName}
          onChange={(v) => {
            setMappingName(v);
            setDirty(true);
          }}
        />
        <OutlinedInput
          label="Report Name"
          value={reportName}
          onChange={(v) => {
            setReportName(v);
            setDirty(true);
          }}
        />
        <OutlinedInput
          label="Application"
          value={appName}
          onChange={(v) => {
            setAppName(v);
            setDirty(true);
          }}
        />
        <div className="toolbar-spacer" />
        <Button size="sm" onClick={addNode}>
          <AddIcon sx={{ fontSize: 14 }} /> Add Job
        </Button>
        <Button size="sm" onClick={graph.undo} disabled={!graph.canUndo} title="Undo (Ctrl+Z)">
          <UndoIcon sx={{ fontSize: 14 }} />
        </Button>
        <Button size="sm" onClick={graph.redo} disabled={!graph.canRedo} title="Redo (Ctrl+Shift+Z)">
          <RedoIcon sx={{ fontSize: 14 }} />
        </Button>
        <Button size="sm" onClick={handleRelayout} title="Auto-layout (Dagre Sugiyama)">
          <AccountTreeIcon sx={{ fontSize: 14 }} /> Layout
        </Button>
        <Button size="sm" variant="primary" onClick={handleSave} disabled={saving || !dirty}>
          <SaveIcon sx={{ fontSize: 14 }} /> {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" onClick={handleExport}>
          <DownloadIcon sx={{ fontSize: 14 }} /> Export CSV
        </Button>
      </div>

      {error && <div className="rm-editor-error">{error}</div>}

      {saveToast && <div className="rm-save-toast-popup">{saveToast}</div>}

      {/* Graph Canvas */}
      <div className="rm-editor-canvas">
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

      {/* Stats bar */}
      <div className="rm-editor-stats">
        <span>{nodes.length} jobs</span>
        <span>{edges.length} connections</span>
        <span>{nodes.filter((n) => n.data.job_id).length} assigned</span>
        {mappingId && <span className="rm-saved-badge">Saved (#{mappingId})</span>}
      </div>
    </div>
  );
}
