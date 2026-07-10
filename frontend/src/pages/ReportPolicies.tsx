/**
 * ReportPolicies — Admin page for viewing/editing report definitions & SLA policies.
 *
 * Route: /admin/report-policies
 *
 * Flow: Select → View/Edit → Preview → Confirm
 */

import { useState, useCallback } from "react";
import api from "../api";
import { Spinner } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ReportPolicySelector from "../components/report-policies/ReportPolicySelector";
import ReportDetailView from "../components/report-policies/ReportDetailView";
import PolicyTable from "../components/report-policies/PolicyTable";
import PolicyPreview from "../components/report-policies/PolicyPreview";
import { POLICY_EDIT_STEPS, TOOLBAR_ICON_SIZE_PX } from "../constants/reportPolicies";
import type { ReportDef, SlaPolicy, PreviewStatement } from "../types/reportPolicies";

export default function ReportPolicies() {
  // Flow state
  const [step, setStep] = useState(0);
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Selected report state
  const [selectedReport, setSelectedReport] = useState<ReportDef | null>(null);
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Edit state
  const [editedReport, setEditedReport] = useState<Partial<ReportDef>>({});
  const [editedPolicies, setEditedPolicies] = useState<Record<string, Partial<SlaPolicy>>>({});

  // Preview/Apply state
  const [previewStatements, setPreviewStatements] = useState<PreviewStatement[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // Load reports on mount
  useState(() => {
    api
      .get("/admin/report-policies/reports")
      .then((r) => setReports(r.data.reports || []))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load reports"))
      .finally(() => setReportsLoading(false));
  });

  const handleSelectReport = useCallback(async (report: ReportDef) => {
    setSelectedReport(report);
    setStep(1);
    setDetailLoading(true);
    setError(null);
    setEditMode(false);
    setEditedReport({});
    setEditedPolicies({});
    setPreviewStatements(null);
    try {
      const r = await api.get(`/admin/report-policies/reports/${report.report_id}`);
      setPolicies(r.data.policies || []);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to load report details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handlePolicyChange = useCallback((policyId: string, field: string, value: string | number | null) => {
    setEditedPolicies((prev) => ({ ...prev, [policyId]: { ...prev[policyId], [field]: value } }));
  }, []);

  const handleReportChange = useCallback((field: string, value: string | boolean) => {
    setEditedReport((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePreview = async () => {
    if (!selectedReport) return;
    setPreviewing(true);
    setError(null);
    try {
      const payload = {
        report_id: selectedReport.report_id,
        report_changes: Object.keys(editedReport).length > 0 ? editedReport : null,
        policy_changes: Object.entries(editedPolicies)
          .filter(([, v]) => Object.keys(v).length > 0)
          .map(([policyId, changes]) => ({ policy_id: policyId, ...changes })),
      };
      const r = await api.post("/admin/report-policies/preview", payload);
      if (r.data.total === 0) {
        setToast("No changes detected — mapping is identical to database");
        setTimeout(() => setToast(""), 3000);
      } else {
        setPreviewStatements(r.data.statements);
        setStep(2);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!selectedReport) return;
    setExecuting(true);
    setError(null);
    try {
      const payload = {
        report_id: selectedReport.report_id,
        report_changes: Object.keys(editedReport).length > 0 ? editedReport : null,
        policy_changes: Object.entries(editedPolicies)
          .filter(([, v]) => Object.keys(v).length > 0)
          .map(([policyId, changes]) => ({ policy_id: policyId, ...changes })),
      };
      const r = await api.post("/admin/report-policies/apply", payload);
      setResult(r.data);
      setStep(3);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Apply failed");
    } finally {
      setExecuting(false);
    }
  };

  const activeStep = result ? 3 : previewStatements ? 2 : selectedReport ? 1 : 0;

  return (
    <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
      {/* LEFT SIDEBAR */}
      <aside className="lf-sidebar-left">
        <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {selectedReport && (
              <div className="rm-sidebar-report-info">
                <p className="rm-sidebar-report-name">{selectedReport.report_name}</p>
                <span className="rm-sidebar-report-app">{selectedReport.application_name}</span>
              </div>
            )}
            <div className="sidebar-card-title">
              <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">
                Steps
              </h2>
            </div>
            <div className="step-progress-vertical" style={{ flex: 1 }}>
              {POLICY_EDIT_STEPS.map((s, idx) => (
                <div
                  key={idx}
                  className={`step-v-item${idx === activeStep ? " active" : ""}${idx < activeStep ? " done" : ""}`}
                >
                  <div className="step-v-circle">{idx < activeStep ? "✓" : <span>{idx + 1}</span>}</div>
                  <div className="step-v-label">
                    <span className="step-v-title">{s.label}</span>
                    <span className="step-v-desc">{s.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="lf-main">
        <div style={{ width: "100%" }}>
          <div className="toolbar">
            <span className="toolbar-title">
              <Highlight>Report Policies</Highlight>
            </span>
            <span className="toolbar-subtitle">View and edit report definitions & SLA policies</span>
            <div className="toolbar-spacer" />
          </div>

          {error && <div className="onboarding-global-error">{error}</div>}

          {/* Step 0: Select */}
          {step === 0 && (
            <ReportPolicySelector reports={reports} loading={reportsLoading} onSelect={handleSelectReport} />
          )}

          {/* Step 1: View/Edit */}
          {step === 1 && selectedReport && (
            <>
              {detailLoading ? (
                <Spinner size="lg" label="Loading policies..." />
              ) : (
                <>
                  <div className="toolbar" style={{ marginBottom: 16, position: "relative" }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setStep(0);
                        setSelectedReport(null);
                      }}
                    >
                      <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back to List
                    </button>
                    {toast && (
                      <div className="rm-save-toast-popup" style={{ top: "50%", marginTop: -12 }}>
                        {toast}
                      </div>
                    )}
                    <div className="toolbar-spacer" />
                    {!editMode && (
                      <button type="button" className="btn btn-sm" onClick={() => setEditMode(true)}>
                        <EditIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Edit
                      </button>
                    )}
                    {editMode && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            setEditMode(false);
                            setEditedReport({});
                            setEditedPolicies({});
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={handlePreview}
                          disabled={previewing}
                        >
                          {previewing ? "Generating..." : "Preview Changes"}
                        </button>
                      </>
                    )}
                  </div>

                  <ReportDetailView report={selectedReport} editMode={editMode} onReportChange={handleReportChange} />

                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>SLA Policies ({policies.length})</h3>
                  <PolicyTable policies={policies} editMode={editMode} onPolicyChange={handlePolicyChange} />
                </>
              )}
            </>
          )}

          {/* Step 2: Preview */}
          {step === 2 && previewStatements && (
            <PolicyPreview
              statements={previewStatements}
              executing={executing}
              onBack={() => {
                setPreviewStatements(null);
                setStep(1);
              }}
              onApply={handleApply}
            />
          )}

          {/* Step 3: Success */}
          {step === 3 && result && (
            <div className="onboarding-success">
              <CheckCircleOutlineIcon sx={{ fontSize: 48, color: "var(--success)" }} />
              <h2 className="onboarding-success-title">Policies Updated</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {result.executed} statement{result.executed !== 1 ? "s" : ""} executed on NFC Prod
              </p>
              <div className="onboarding-success-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setStep(0);
                    setSelectedReport(null);
                    setResult(null);
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
