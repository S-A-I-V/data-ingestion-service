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

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import api from "../api";
import { Button, Spinner } from "../components/ui";
import { useGraphEditor } from "../hooks/useGraphEditor";
import { applyDagreLayout } from "../utils/dagreLayout";
import GraphCanvas from "../components/report-mapping/GraphCanvas";
import LiveEditSuccess from "../components/report-mapping/LiveEditSuccess";
import ReportSelector from "../components/report-mapping/ReportSelector";
import PreviewPanel from "../components/report-mapping/PreviewPanel";
import StepProgress from "../components/onboarding/StepProgress";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CircularProgress from "@mui/material/CircularProgress";
import {
  LIVE_EDIT_STEPS,
  TOOLBAR_ICON_SIZE_PX,
  BUTTON_SPINNER_SIZE_PX,
  PREVIEW_BUTTON_MIN_WIDTH_PX,
  TOAST_DISPLAY_DURATION_MS,
} from "../constants/reportMapping";

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

export default function ReportMappingLiveEdit() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportName = searchParams.get("report") || "";
  const appName = searchParams.get("app") || "";
  const reportId = Number(searchParams.get("rid") || 0);

  // Selection phase state
  const [reports, setReports] = useState<ExistingReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(!reportId);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview/Execute state
  const [previewStatements, setPreviewStatements] = useState<any[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [toast, setToast] = useState("");
  const initialStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  // Graph editor hook
  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    graph,
    nodeTypes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    handleRelayout,
  } = useGraphEditor({ jobs });

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

  const handleReset = () => {
    if (!initialStateRef.current) return;
    const { nodes: initNodes, edges: initEdges } = initialStateRef.current;
    setNodes(JSON.parse(JSON.stringify(initNodes)));
    setEdges(JSON.parse(JSON.stringify(initEdges)));
    graph.reset({ nodes: initNodes, edges: initEdges });
    setToast("Reset to original mapping");
    setTimeout(() => setToast(""), TOAST_DISPLAY_DURATION_MS);
  };

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
        setTimeout(() => setToast(""), TOAST_DISPLAY_DURATION_MS);
      } else {
        setPreviewStatements(res.data.statements);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

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

  const handleReportSelect = useCallback(
    (report: ExistingReport) => {
      setSearchParams({
        report: report.report_name,
        app: report.application_name,
        rid: String(report.report_id),
      });
    },
    [setSearchParams],
  );

  // ── Render: Success State ──────────────────────────────────────────────────
  if (result) {
    return <LiveEditSuccess result={result} />;
  }

  // ── Render: Report Selection ───────────────────────────────────────────────
  if (!reportId) {
    return <ReportSelector reports={reports} reportsLoading={reportsLoading} onSelect={handleReportSelect} />;
  }

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container audit-container">
        <Spinner size="lg" label="Loading mapping from NFC Prod..." />
      </div>
    );
  }

  // ── Render: Editor ─────────────────────────────────────────────────────────
  return (
    <div className="rm-editor-page">
      <div className="rm-editor-toolbar">
        <Button size="sm" onClick={() => navigate("/admin/report-mapping/live-edit")}>
          <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back
        </Button>
        <span className="rm-edit-title">
          Editing: <strong>{reportName}</strong> ({appName})
        </span>
        <div className="toolbar-spacer" />
        <Button size="sm" onClick={addNode}>
          <AddIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Add Job
        </Button>
        <Button size="sm" onClick={graph.undo} disabled={!graph.canUndo}>
          <UndoIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
        </Button>
        <Button size="sm" onClick={graph.redo} disabled={!graph.canRedo}>
          <RedoIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
        </Button>
        <Button size="sm" onClick={handleRelayout}>
          <AccountTreeIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Layout
        </Button>
        <Button size="sm" variant="danger" onClick={handleReset}>
          <RestartAltIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Reset
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handlePreview}
          disabled={previewing}
          style={{ minWidth: PREVIEW_BUTTON_MIN_WIDTH_PX }}
        >
          {previewing ? (
            <CircularProgress size={BUTTON_SPINNER_SIZE_PX} sx={{ color: "#fff" }} />
          ) : (
            <>
              Next: Preview <ArrowForwardIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
            </>
          )}
        </Button>
      </div>

      {/* Step Progress */}
      <div className="rm-editor-step-bar">
        <StepProgress
          steps={LIVE_EDIT_STEPS}
          currentStep={previewStatements ? 2 : 1}
          onStepClick={() => {}}
          skippedSteps={new Set()}
        />
      </div>

      {error && <div className="rm-editor-error">{error}</div>}

      {/* Preview Panel */}
      {previewStatements && (
        <PreviewPanel
          statements={previewStatements}
          executing={executing}
          onBackToEdit={() => setPreviewStatements(null)}
          onApply={handleApply}
        />
      )}

      {/* Graph Canvas */}
      {!previewStatements && (
        <>
          <div className="rm-editor-canvas">
            {toast && <div className="rm-save-toast-popup rm-toast-top">{toast}</div>}
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
            />
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
