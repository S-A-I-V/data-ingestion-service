/**
 * EmailDiscrepancyAudit — Admin panel for identifying and resolving email
 * discrepancies between CPR (Sybase) and NFC Prod (Postgres).
 */
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { Spinner, Panel, PanelHeader, ToggleGroup, ToggleGroupItem, DownloadButton, Toast } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import MismatchTable from "../components/email-discrepancy/MismatchTable";
import FixStep from "../components/email-discrepancy/FixStep";
import { COLUMN_LABELS, NOT_ONBOARDED_COLUMNS, TABS } from "../constants/emailDiscrepancy";
import { useEmailDiscrepancy, type ActiveTab } from "../hooks/useEmailDiscrepancy";

// Step definitions for the sidebar progress
const AUDIT_STEPS = [
  { label: "Scan", description: "Load discrepancies" },
  { label: "Select", description: "Pick entries to fix" },
  { label: "Fix", description: "Preview & apply" },
  { label: "Done", description: "Results" },
];

export default function EmailDiscrepancyAudit() {
  const {
    toast,
    scanning,
    scanned,
    scanError,
    mismatches,
    notOnboarded,
    summary,
    runScan,
    activeTab,
    setActiveTab,
    selectedIds,
    toggleSelection,
    selectAllMismatches,
    clearSelection,
    fixStep,
    setFixStep,
    previewResults,
    previewHeaders,
    fixResults,
    fixError,
    selectedMismatches,
    readyCount,
    runPreview,
    executeFix,
    resetFixAndRescan,
    currentStep,
    downloadMismatchesCsv,
  } = useEmailDiscrepancy();

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
              {AUDIT_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <div
                    key={idx}
                    className={`step-v-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                    role="button"
                    tabIndex={-1}
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
              <Highlight>Email Discrepancy Audit</Highlight>
            </span>
            <span className="toolbar-subtitle">Compares CPR AssociateEmailAccount against NFC Prod users table</span>
            <div className="toolbar-spacer" />
            {mismatches.length > 0 && (
              <DownloadButton onClick={downloadMismatchesCsv} label="Download" doneLabel="Done" />
            )}
            <button className="btn btn-primary" onClick={runScan} disabled={scanning}>
              <SyncIcon sx={{ fontSize: 16, mr: 0.5 }} /> {scanning ? "Scanning..." : "Re-scan"}
            </button>
          </div>

          {scanning && <Spinner size="lg" label="Querying CPR + NFC Prod..." />}
          {scanError && <div className="lookup-error-badge">{scanError}</div>}

          {/* Summary Cards */}
          {summary && fixStep === "idle" && (
            <div className="email-disc-summary">
              <div className="email-disc-stat">
                <span className="email-disc-stat-value">{summary.total_nfc_users}</span>
                <span className="email-disc-stat-label">NFC Users</span>
              </div>
              <div className="email-disc-stat">
                <span className="email-disc-stat-value">{summary.matched_in_cpr}</span>
                <span className="email-disc-stat-label">Found in CPR</span>
              </div>
              <div className="email-disc-stat">
                <span className="email-disc-stat-value">{summary.emails_in_sync_count}</span>
                <span className="email-disc-stat-label">Emails In Sync</span>
              </div>
              <div className="email-disc-stat email-disc-stat--warning">
                <span className="email-disc-stat-value">{summary.email_mismatches_count}</span>
                <span className="email-disc-stat-label">Email Mismatches</span>
              </div>
              <div className="email-disc-stat email-disc-stat--info">
                <span className="email-disc-stat-value">{summary.not_found_in_cpr_count}</span>
                <span className="email-disc-stat-label">Not in CPR</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          {scanned && !scanning && fixStep === "idle" && (
            <>
              <div style={{ margin: "16px 0" }}>
                <ToggleGroup
                  type="single"
                  value={activeTab}
                  onValueChange={(val) => {
                    if (val) setActiveTab(val as ActiveTab);
                  }}
                >
                  <ToggleGroupItem value={TABS.MISMATCHES}>Email Mismatches ({mismatches.length})</ToggleGroupItem>
                  <ToggleGroupItem value={TABS.NOT_ONBOARDED}>Not in CPR ({notOnboarded.length})</ToggleGroupItem>
                </ToggleGroup>
              </div>

              {activeTab === TABS.MISMATCHES &&
                (mismatches.length === 0 ? (
                  <Panel className="lookup-empty">
                    <CheckCircleIcon sx={{ fontSize: 36, color: "#22c55e" }} />
                    <span>All NFC user emails match their CPR primary email.</span>
                  </Panel>
                ) : (
                  <MismatchTable
                    mismatches={mismatches}
                    selectedIds={selectedIds}
                    onToggle={toggleSelection}
                    onSelectAll={selectAllMismatches}
                    onClearSelection={clearSelection}
                    onPreview={runPreview}
                  />
                ))}

              {activeTab === TABS.NOT_ONBOARDED &&
                (notOnboarded.length === 0 ? (
                  <Panel className="lookup-empty">
                    <CheckCircleIcon sx={{ fontSize: 36, color: "#22c55e" }} />
                    <span>All NFC users have matching CPR associate records.</span>
                  </Panel>
                ) : (
                  <Panel>
                    <PanelHeader>Not Found in CPR — {notOnboarded.length} NFC users with no CPR match</PanelHeader>
                    <div className="csv-preview-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {NOT_ONBOARDED_COLUMNS.map((col) => (
                              <th key={col}>{COLUMN_LABELS[col] || col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {notOnboarded.map((row) => (
                            <tr key={row.associate_id}>
                              {NOT_ONBOARDED_COLUMNS.map((col) => (
                                <td key={col}>{(row as any)[col] ?? ""}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                ))}
            </>
          )}

          {/* Fix Step */}
          {fixStep !== "idle" && (
            <FixStep
              fixStep={fixStep as any}
              fixError={fixError}
              selectedCount={selectedMismatches.length}
              readyCount={readyCount}
              previewHeaders={previewHeaders}
              previewResults={previewResults}
              fixResults={fixResults}
              onBack={() => setFixStep("idle")}
              onConfirm={executeFix}
              onBackAndRescan={resetFixAndRescan}
            />
          )}

          {/* Empty state */}
          {scanned && !scanning && mismatches.length === 0 && notOnboarded.length === 0 && fixStep === "idle" && (
            <Panel className="lookup-empty">
              <SearchOffIcon sx={{ fontSize: 36, opacity: 0.5 }} />
              <span>No discrepancies found. All emails are in sync.</span>
            </Panel>
          )}

          <Toast toast={toast} />
        </div>
      </main>
    </div>
  );
}
