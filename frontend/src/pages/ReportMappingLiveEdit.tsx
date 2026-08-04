/**
 * ReportMappingLiveEdit — Edit an existing report_job_mapping directly on NFC Prod.
 * Route: /admin/report-mapping/live-edit?report=NAME&app=APP&rid=ID
 */

import "@xyflow/react/dist/style.css";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CircularProgress from "@mui/material/CircularProgress";
import GraphCanvas from "../components/report-mapping/GraphCanvas";
import LiveEditSuccess from "../components/report-mapping/LiveEditSuccess";
import ReportSelector from "../components/report-mapping/ReportSelector";
import PreviewPanel from "../components/report-mapping/PreviewPanel";
import JobSettingsModal from "../components/report-mapping/JobSettingsModal";
import {
  LIVE_EDIT_STEPS,
  TOOLBAR_ICON_SIZE_PX,
  BUTTON_SPINNER_SIZE_PX,
  PREVIEW_BUTTON_MIN_WIDTH_PX,
  DEFAULT_RUN_MODE,
} from "../constants/reportMapping";
import { useLiveEditFlow } from "../hooks/useLiveEditFlow";

export default function ReportMappingLiveEdit() {
  const {
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
  } = useLiveEditFlow();

  // ── Success State ──────────────────────────────────────────────────────────
  if (result) return <LiveEditSuccess result={result} />;

  // ── Report Selection ───────────────────────────────────────────────────────
  if (!reportId)
    return (
      <ReportSelector reports={reports} reportsLoading={reportsLoading} onSelect={handleReportSelect} currentStep={0} />
    );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <ReportSelector reports={[]} reportsLoading={true} onSelect={() => {}} currentStep={1} />;

  // ── Editor ─────────────────────────────────────────────────────────────────
  return (
    <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
      {/* LEFT SIDEBAR */}
      <aside className="lf-sidebar-left">
        <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="rm-sidebar-report-info">
              <p className="rm-sidebar-report-name">{reportName}</p>
              <span className="rm-sidebar-report-app">{appName}</span>
            </div>
            <div className="sidebar-card-title">
              <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">
                Steps
              </h2>
            </div>
            <div className="step-progress-vertical" style={{ flex: 1 }}>
              {LIVE_EDIT_STEPS.map((step, idx) => {
                const isDone = idx < activeStep;
                const isActive = idx === activeStep;
                return (
                  <div key={idx} className={`step-v-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}>
                    <div className="step-v-circle">{isDone ? "✓" : <span>{idx + 1}</span>}</div>
                    <div className="step-v-label">
                      <span className="step-v-title">{step.label}</span>
                      <span className="step-v-desc">{step.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT — Editor */}
      <main className="lf-main rm-editor-main">
        <div className="rm-editor-toolbar">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              previewStatements ? setPreviewStatements(null) : navigate("/admin/report-mapping/live-edit");
            }}
          >
            <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back
          </button>
          <div className="toolbar-spacer" />
          {!previewStatements && (
            <>
              <button type="button" className="btn btn-sm" onClick={addNode}>
                <AddIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Add Job
              </button>
              <button type="button" className="btn btn-sm" onClick={graph.undo} disabled={!graph.canUndo} title="Undo">
                <UndoIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
              </button>
              <button type="button" className="btn btn-sm" onClick={graph.redo} disabled={!graph.canRedo} title="Redo">
                <RedoIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
              </button>
              <button type="button" className="btn btn-sm" onClick={handleRelayout}>
                <AccountTreeIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Layout
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={handleReset}>
                <RestartAltIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Reset
              </button>
            </>
          )}
          {previewStatements && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => navigate("/admin/report-mapping/live-edit")}
            >
              <RestartAltIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Start Over
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={previewStatements ? handleApply : handlePreview}
            disabled={previewStatements ? executing : previewing}
            style={{ minWidth: PREVIEW_BUTTON_MIN_WIDTH_PX }}
          >
            {previewing || executing ? (
              <CircularProgress size={BUTTON_SPINNER_SIZE_PX} sx={{ color: "#fff" }} />
            ) : previewStatements ? (
              <>
                <CheckCircleOutlineIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Confirm & Apply
              </>
            ) : (
              <>
                Next: Preview <ArrowForwardIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} />
              </>
            )}
          </button>
        </div>

        {error && <div className="rm-editor-error">{error}</div>}

        {previewStatements && (
          <PreviewPanel
            statements={previewStatements}
            executing={executing}
            onBackToEdit={() => setPreviewStatements(null)}
            onApply={handleApply}
          />
        )}

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
                panToNodeId={lastAddedNodeId}
                onPanComplete={clearLastAddedNodeId}
              />
            </div>
            <div className="rm-editor-stats">
              <span>{nodes.length} jobs</span>
              <span>{edges.length} connections</span>
              <span>{nodes.filter((n) => n.data.job_id).length} assigned</span>
            </div>
          </>
        )}

        {settingsNode && (
          <JobSettingsModal
            nodeId={settingsNode.id}
            jobName={settingsNode.data.job_name || "Unnamed Job"}
            jobId={settingsNode.data.job_id}
            initialSettings={{
              run_requirement_mode: settingsNode.data.run_requirement_mode || DEFAULT_RUN_MODE,
              required_offsets_json: settingsNode.data.required_offsets_json,
              min_success_count: settingsNode.data.min_success_count,
            }}
            onSave={updateNodeSettings}
            onClose={() => setSettingsNodeId(null)}
          />
        )}
      </main>
    </div>
  );
}
