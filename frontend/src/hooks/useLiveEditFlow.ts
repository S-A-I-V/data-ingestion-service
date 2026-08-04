/**
 * useLiveEditFlow — Custom hook encapsulating all state, effects, and handlers
 * for the Report Mapping Live Edit page.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Node, Edge } from "@xyflow/react";
import api from "../api";
import { useGraphEditor } from "./useGraphEditor";
import { applyDagreLayout } from "../utils/dagreLayout";
import { TOAST_DISPLAY_DURATION_MS, DEFAULT_RUN_MODE } from "../constants/reportMapping";

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

export function useLiveEditFlow() {
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

  // Settings modal state
  const [settingsNodeId, setSettingsNodeId] = useState<string | null>(null);

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
    lastAddedNodeId,
    clearLastAddedNodeId,
    handleRelayout,
    updateNodeSettings,
  } = useGraphEditor({ jobs, onOpenSettings: (nodeId) => setSettingsNodeId(nodeId) });

  const settingsNode = settingsNodeId ? nodes.find((n) => n.id === settingsNodeId) : null;

  // ── Effects ────────────────────────────────────────────────────────────────

  // Load report list when no report selected
  useEffect(() => {
    if (!reportId) {
      setPreviewStatements(null);
      setError(null);
      setLoading(true);
      initDoneRef.current = false;
      setReportsLoading(true);
      api
        .get("/admin/report-mapping/existing")
        .then((r) => setReports(r.data.reports || []))
        .catch((e) => setError(e.response?.data?.detail || "Failed to load reports"))
        .finally(() => setReportsLoading(false));
    }
  }, [reportId]);

  // Load data when report is selected
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (!reportId || initDoneRef.current) return;
    let cancelled = false;
    const controller = new AbortController();

    const init = async () => {
      setLoading(true);
      try {
        const [jobsRes, mappingRes] = await Promise.all([
          api.get("/admin/report-mapping/jobs", { signal: controller.signal }),
          api.get(`/admin/report-mapping/existing/${reportId}`, { signal: controller.signal }),
        ]);
        if (cancelled) return;
        initDoneRef.current = true;
        setJobs(jobsRes.data.jobs || []);
        const data = mappingRes.data.mapping_data;
        const jobsList = jobsRes.data.jobs || [];
        const proxyJobIds = new Set(jobsList.filter((j: any) => j.is_proxy).map((j: any) => j.job_id));
        const flowNodes: Node[] = (data.nodes || []).map((n: any) => ({
          id: n.id,
          type: "jobNode",
          position: n.position || { x: 0, y: 0 },
          data: {
            job_id: n.job_id,
            job_name: n.job_name || "",
            is_proxy: proxyJobIds.has(n.job_id),
            run_requirement_mode: n.run_requirement_mode || DEFAULT_RUN_MODE,
            required_offsets_json: n.required_offsets_json,
            min_success_count: n.min_success_count,
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
        const layouted = applyDagreLayout(flowNodes, flowEdges);
        setNodes(layouted);
        setEdges(flowEdges);
        graph.reset({ nodes: layouted, edges: flowEdges });
        initialStateRef.current = { nodes: layouted, edges: flowEdges };
      } catch (e: any) {
        if (!cancelled) setError(e.response?.data?.detail || "Failed to load mapping");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reportId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

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
        nodes: nodes.map((n) => ({
          id: n.id,
          job_id: n.data.job_id,
          job_name: n.data.job_name,
          run_requirement_mode: n.data.run_requirement_mode || DEFAULT_RUN_MODE,
          required_offsets_json: n.data.required_offsets_json,
          min_success_count: n.data.min_success_count,
        })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
      });
      if (res.data.total === 0) {
        setToast("No changes detected — mapping is identical to database");
        setTimeout(() => setToast(""), TOAST_DISPLAY_DURATION_MS);
      } else setPreviewStatements(res.data.statements);
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
        nodes: nodes.map((n) => ({
          id: n.id,
          job_id: n.data.job_id,
          job_name: n.data.job_name,
          run_requirement_mode: n.data.run_requirement_mode || DEFAULT_RUN_MODE,
          required_offsets_json: n.data.required_offsets_json,
          min_success_count: n.data.min_success_count,
        })),
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
      setPreviewStatements(null);
      setError(null);
      setResult(null);
      initDoneRef.current = false;
      setSearchParams({ report: report.report_name, app: report.application_name, rid: String(report.report_id) });
    },
    [setSearchParams],
  );

  // Derived
  const activeStep = previewStatements ? 2 : 1;

  return {
    navigate,
    reportName,
    appName,
    reportId,
    reports,
    reportsLoading,
    loading,
    error,
    previewStatements,
    setPreviewStatements,
    previewing,
    executing,
    result,
    toast,
    settingsNodeId,
    setSettingsNodeId,
    settingsNode,
    nodes,
    edges,
    nodeTypes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    lastAddedNodeId,
    clearLastAddedNodeId,
    handleRelayout,
    updateNodeSettings,
    graph,
    handleReset,
    handlePreview,
    handleApply,
    handleReportSelect,
    activeStep,
  };
}
