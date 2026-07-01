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

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import api from "../api";
import { Button, Spinner } from "../components/ui";
import OutlinedInput from "../components/ui/OutlinedInput";
import { useGraphEditor } from "../hooks/useGraphEditor";
import { applyDagreLayout } from "../utils/dagreLayout";
import GraphCanvas from "../components/report-mapping/GraphCanvas";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import CircularProgress from "@mui/material/CircularProgress";
import { TOOLBAR_ICON_SIZE_PX, BUTTON_SPINNER_SIZE_PX, TOAST_DISPLAY_DURATION_MS } from "../constants/reportMapping";

interface Job {
  job_id: number;
  job_name: string;
  category: string | null;
}

export default function ReportMappingEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loadId = searchParams.get("load");
  const copyId = searchParams.get("copy");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mappingId, setMappingId] = useState<number | null>(loadId ? Number(loadId) : null);
  const [mappingName, setMappingName] = useState("");
  const [reportName, setReportName] = useState("");
  const [appName, setAppName] = useState("");

  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    dirty,
    setDirty,
    graph,
    nodeTypes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    lastAddedNodeId,
    clearLastAddedNodeId,
    handleRelayout,
  } = useGraphEditor({ jobs });

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
    const layoutedNodes = applyDagreLayout(flowNodes, flowEdges, "LR");
    setNodes(layoutedNodes);
    setEdges(flowEdges);
    graph.reset({ nodes: layoutedNodes, edges: flowEdges });
  };

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
      setSaveToast(`Saved changes to "${mappingName.trim()}"`);
      setTimeout(() => setSaveToast(""), TOAST_DISPLAY_DURATION_MS);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const handleExport = useCallback(() => {
    if (nodes.length === 0) {
      setError("Nothing to export — add some jobs first");
      return;
    }

    const prevMap: Record<string, string[]> = {};
    const nextMap: Record<string, string[]> = {};

    for (const edge of edges) {
      if (!nextMap[edge.source]) nextMap[edge.source] = [];
      nextMap[edge.source].push(edge.target);
      if (!prevMap[edge.target]) prevMap[edge.target] = [];
      prevMap[edge.target].push(edge.source);
    }

    const rows: string[][] = [];
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
      if (!prevJobIds && !nextJobIds) continue;
      rows.push([String(jobId), prevJobIds, nextJobIds]);
    }

    const csv = rows.map((r) => r.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_mapping_${(mappingName || "untitled").replace(/ /g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, mappingName]);

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
          <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back
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
          <AddIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Add Job
        </Button>
        <Button size="sm" onClick={graph.undo} disabled={!graph.canUndo} title="Undo (Ctrl+Z)">
          <UndoIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
        </Button>
        <Button size="sm" onClick={graph.redo} disabled={!graph.canRedo} title="Redo (Ctrl+Shift+Z)">
          <RedoIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
        </Button>
        <Button size="sm" onClick={handleRelayout} title="Auto-layout (Dagre Sugiyama)">
          <AccountTreeIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Layout
        </Button>
        <Button size="sm" variant="primary" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <CircularProgress size={BUTTON_SPINNER_SIZE_PX} sx={{ color: "#fff" }} />
          ) : (
            <SaveIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
          )}{" "}
          Save
        </Button>
        <Button size="sm" onClick={handleExport}>
          <DownloadIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Export CSV
        </Button>
      </div>

      {error && <div className="rm-editor-error">{error}</div>}
      {saveToast && <div className="rm-save-toast-popup">{saveToast}</div>}

      {/* Graph Canvas */}
      <div className="rm-editor-canvas">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          panToNodeId={lastAddedNodeId}
          onPanComplete={clearLastAddedNodeId}
        />
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
