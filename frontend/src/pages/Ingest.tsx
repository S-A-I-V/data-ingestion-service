/**
 * Ingest — Data transfer page with multi-step form flow.
 *
 * Steps:
 *   1. Configure — Select connection/table/operation, upload CSV, map columns
 *   2. Preview — Review data + optional AI analysis
 *   3. Execute — Running the transfer
 *   4. Results — Execution stats + actions
 */
import ExecStatsPanel from "../components/ingest/ExecStatsPanel";
import CsvPreview from "../components/ingest/CsvPreview";
import TargetSelector from "../components/ingest/TargetSelector";
import FileUploader from "../components/ingest/FileUploader";
import ColumnMapper from "../components/ingest/ColumnMapper";
import { ExecutionPlanPanel } from "../components/ingest/ExecutionPlanPanel";
import WizardNavigation from "../components/onboarding/WizardNavigation";
import Highlight from "../components/ui/Highlight";
import AccessDenied from "../components/AccessDenied";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { Spinner } from "../components/ui";
import { PERM_ADMIN_CONNECTIONS_VIEW, PERM_ADMIN_DATA_TRANSFER } from "../constants/permissions";
import { useIngestFlow } from "../hooks/useIngestFlow";
import type { User } from "../types";

interface Props {
  user: User;
}

const INGEST_STEPS = [
  { label: "Configure", description: "Upload & map columns" },
  { label: "Preview", description: "Review data" },
  { label: "Execute", description: "Transfer data" },
  { label: "Results", description: "View stats" },
];

export default function Ingest({ user }: Props) {
  const {
    currentStep,
    setCurrentStep,
    conns,
    connsLoading,
    connId,
    setConnId,
    tables,
    tablesLoading,
    table,
    setTable,
    dbCols,
    operation,
    setOperation,
    csvHeaders,
    csvPreview,
    csvTotalRows,
    csvFileSize,
    mapping,
    setMapping,
    file,
    aiResult,
    aiLoading,
    analyze,
    status,
    loading,
    execStats,
    handleFile,
    execute,
    resetAll,
    mappedCount,
    executionPlanRows,
    columnMappingRows,
  } = useIngestFlow();

  // Permission check
  const userPerms = user.permissions || [];
  const canAccessIngest = userPerms.some((p) => [PERM_ADMIN_CONNECTIONS_VIEW, PERM_ADMIN_DATA_TRANSFER].includes(p));

  if (!canAccessIngest) {
    return (
      <div
        className="container"
        style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}
      >
        <AccessDenied feature="Data Transfer" />
      </div>
    );
  }

  return (
    <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
      {/* LEFT SIDEBAR — Step Timeline */}
      <aside className="lf-sidebar-left">
        <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="sidebar-card-title">
              <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">
                Steps
              </h2>
            </div>
            <div className="step-progress-vertical" style={{ flex: 1 }}>
              {INGEST_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                const isClickable = idx <= currentStep && idx < 3;
                return (
                  <div
                    key={idx}
                    className={`step-v-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                    onClick={() => isClickable && setCurrentStep(idx)}
                    role="button"
                    tabIndex={isClickable ? 0 : -1}
                  >
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

      {/* CENTER CONTENT */}
      <main className="lf-main">
        <div style={{ width: "100%" }}>
          <div className="toolbar">
            <span className="toolbar-title">
              <Highlight>Data Transfer</Highlight>
            </span>
            <span className="toolbar-subtitle">Upload CSV data into any connected database</span>
            <div className="toolbar-spacer" />
          </div>

          {/* Navigation bar */}
          {currentStep < 3 && (
            <WizardNavigation
              currentStep={currentStep}
              totalSteps={3}
              onBack={() => setCurrentStep((s) => Math.max(s - 1, 0))}
              onNext={() => setCurrentStep((s) => s + 1)}
              onExecute={execute}
              executeLabel={`Execute ${operation}`}
              executeDisabled={loading}
            />
          )}
          {currentStep === 3 && (
            <WizardNavigation
              currentStep={2}
              totalSteps={3}
              onBack={() => {}}
              onNext={() => {}}
              onExecute={resetAll}
              executeLabel="Transfer Another"
            />
          )}

          <div className="onboarding-step-content">
            {/* Step 0: Configure */}
            {currentStep === 0 && (
              <>
                <div className="ingest-configure-grid">
                  <fieldset className="panel-fieldset">
                    <TargetSelector
                      connections={conns}
                      connectionsLoading={connsLoading}
                      selectedConnectionId={connId}
                      onConnectionChange={setConnId}
                      tables={tables}
                      tablesLoading={tablesLoading}
                      selectedTable={table}
                      onTableChange={setTable}
                      operation={operation}
                      onOperationChange={setOperation}
                    />
                  </fieldset>
                  <fieldset className="panel-fieldset" disabled={!table}>
                    <FileUploader
                      file={file}
                      csvTotalRows={csvTotalRows}
                      csvFileSize={csvFileSize}
                      disabled={!table}
                      onFileSelect={handleFile}
                    />
                  </fieldset>
                </div>

                {csvHeaders.length > 0 && dbCols.length > 0 && (
                  <fieldset className="panel-fieldset">
                    <ColumnMapper
                      csvHeaders={csvHeaders}
                      dbColumns={dbCols}
                      mapping={mapping}
                      onMappingChange={setMapping}
                      mappedCount={mappedCount}
                      totalRows={csvTotalRows}
                      fileSize={csvFileSize}
                    />
                  </fieldset>
                )}
              </>
            )}

            {/* Step 1: Preview & AI */}
            {currentStep === 1 && (
              <>
                <CsvPreview headers={csvHeaders} rows={csvPreview} />
                <div className="gemini-ai-section">
                  {aiResult && (
                    <div className="gemini-response">
                      <div className="gemini-response-header">
                        <AutoFixHighIcon sx={{ fontSize: 16 }} />
                        <span>AI Analysis</span>
                      </div>
                      <div className="gemini-response-body">{aiResult}</div>
                    </div>
                  )}
                  <div className="gemini-input-bar">
                    <button
                      type="button"
                      className="gemini-input-action"
                      title="Analyze data"
                      onClick={analyze}
                      disabled={aiLoading}
                    >
                      <AutoFixHighIcon sx={{ fontSize: 20 }} />
                    </button>
                    <span className="gemini-input-placeholder">
                      {aiLoading ? "Analyzing your data..." : "Ask about your data before executing..."}
                    </span>
                    <div className="gemini-input-right">
                      <button
                        type="button"
                        className="gemini-input-send"
                        onClick={analyze}
                        disabled={aiLoading}
                        title="Run analysis"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Execute */}
            {currentStep === 2 && !loading && (
              <>
                <ExecutionPlanPanel planRows={executionPlanRows} mappingRows={columnMappingRows} tableName={table} />
                {status && <div className="lookup-error-badge">{status.msg}</div>}
              </>
            )}
            {currentStep === 2 && loading && <Spinner size="lg" label={`Executing ${operation} into ${table}...`} />}

            {/* Step 3: Results */}
            {currentStep === 3 && (
              <>
                {status && (
                  <span className={`status-pill ${status.ok ? "status-pill--success" : "status-pill--danger"}`}>
                    {status.msg}
                  </span>
                )}
                {execStats && <ExecStatsPanel stats={execStats} />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
