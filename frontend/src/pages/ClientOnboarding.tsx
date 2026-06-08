/**
 * ClientOnboarding — Multi-step wizard for RBAC client onboarding.
 *
 * Steps:
 *   1. Client Details (name → auto client_id)
 *   2. Group Details (name → auto group_id, linked to client)
 *   3. BEID Mapping (BEIDs + org_id)
 *   4. Report Mapping (select reports from report_definitions)
 *   5. Preview & Confirm (review all, then atomic execute)
 */

import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { Button, Spinner } from "../components/ui";
import StepProgress, { type Step } from "../components/onboarding/StepProgress";
import StepClientDetails from "../components/onboarding/StepClientDetails";
import StepGroupDetails from "../components/onboarding/StepGroupDetails";
import StepBeidMapping from "../components/onboarding/StepBeidMapping";
import StepReportMapping, { type ReportDef } from "../components/onboarding/StepReportMapping";
import StepPreview from "../components/onboarding/StepPreview";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const STEPS: Step[] = [
  { label: "Client", description: "Name & ID" },
  { label: "Group", description: "Group setup" },
  { label: "BEIDs", description: "Entity mapping" },
  { label: "Reports", description: "Report mapping" },
  { label: "Review", description: "Preview & confirm" },
];

export default function ClientOnboarding() {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [clientName, setClientName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [beids, setBeids] = useState<number[]>([]);
  const [orgId, setOrgId] = useState("");
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);

  // Server-fetched data
  const [nextIds, setNextIds] = useState<{
    next_client_id: number;
    next_group_id: number;
    next_detail_id: number;
    next_crm_id: number;
  } | null>(null);
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [idsLoading, setIdsLoading] = useState(true);

  // UI state
  const [stepErrors, setStepErrors] = useState<Record<number, string | null>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Fetch next IDs on mount
  useEffect(() => {
    setIdsLoading(true);
    api
      .get("/admin/client-onboarding/next-ids")
      .then((r) => setNextIds(r.data))
      .catch((e) => setGlobalError(e.response?.data?.detail || "Failed to fetch next IDs"))
      .finally(() => setIdsLoading(false));
  }, []);

  // Fetch report definitions when reaching step 4
  useEffect(() => {
    if (currentStep >= 3 && reports.length === 0 && !reportsLoading) {
      setReportsLoading(true);
      api
        .get("/admin/client-onboarding/report-definitions")
        .then((r) => setReports(r.data.reports || []))
        .catch((e) => setStepErrors((prev) => ({ ...prev, 3: e.response?.data?.detail || "Failed to load reports" })))
        .finally(() => setReportsLoading(false));
    }
  }, [currentStep]);

  // Validation per step
  const validateStep = useCallback(
    (step: number): string | null => {
      switch (step) {
        case 0:
          if (!clientName.trim()) return "Client name is required";
          if (clientName.trim().length < 2) return "Client name must be at least 2 characters";
          return null;
        case 1:
          if (!groupName.trim()) return "Group name is required";
          if (groupName.trim().length < 2) return "Group name must be at least 2 characters";
          return null;
        case 2:
          if (beids.length === 0) return "At least one Business Entity ID is required";
          if (beids.some((b) => b <= 0)) return "All BEIDs must be positive integers";
          if (!orgId.trim()) return "Org ID is required";
          return null;
        case 3:
          if (selectedReportIds.length === 0) return "At least one report must be selected";
          return null;
        default:
          return null;
      }
    },
    [clientName, groupName, beids, orgId, selectedReportIds],
  );

  const goNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: err }));
      return;
    }
    setStepErrors((prev) => ({ ...prev, [currentStep]: null }));
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const goToStep = (idx: number) => {
    // Allow going back freely, going forward requires validation of intermediate steps
    if (idx < currentStep) {
      setCurrentStep(idx);
      return;
    }
    // Validate all steps up to target
    for (let i = currentStep; i < idx; i++) {
      const err = validateStep(i);
      if (err) {
        setStepErrors((prev) => ({ ...prev, [i]: err }));
        setCurrentStep(i);
        return;
      }
      setStepErrors((prev) => ({ ...prev, [i]: null }));
    }
    setCurrentStep(idx);
  };

  const handleExecute = async () => {
    setExecuting(true);
    setGlobalError(null);
    try {
      const r = await api.post("/admin/client-onboarding/execute", {
        client_name: clientName.trim(),
        group_name: groupName.trim(),
        business_entity_ids: beids,
        org_id: orgId.trim(),
        report_ids: selectedReportIds,
      });
      setResult(r.data);
      setShowConfirm(false);
    } catch (e: any) {
      setGlobalError(e.response?.data?.detail || "Onboarding failed. Please try again.");
      setShowConfirm(false);
    } finally {
      setExecuting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setClientName("");
    setGroupName("");
    setBeids([]);
    setOrgId("");
    setSelectedReportIds([]);
    setResult(null);
    setGlobalError(null);
    setStepErrors({});
    // Re-fetch IDs
    setIdsLoading(true);
    api
      .get("/admin/client-onboarding/next-ids")
      .then((r) => setNextIds(r.data))
      .finally(() => setIdsLoading(false));
  };

  const selectedReports = reports.filter((r) => selectedReportIds.includes(r.report_id));

  // Success state
  if (result) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Client Onboarding</span>
        </div>
        <div className="onboarding-success">
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "var(--success)" }} />
          <h2 className="onboarding-success-title">Client Onboarded Successfully</h2>
          <div className="onboarding-success-details">
            <div className="onboarding-preview-row">
              <span className="onboarding-preview-label">Client ID</span>
              <span className="onboarding-preview-value">{result.client_id}</span>
            </div>
            <div className="onboarding-preview-row">
              <span className="onboarding-preview-label">Client Name</span>
              <span className="onboarding-preview-value">{result.client_name}</span>
            </div>
            <div className="onboarding-preview-row">
              <span className="onboarding-preview-label">Group ID</span>
              <span className="onboarding-preview-value">{result.group_id}</span>
            </div>
            <div className="onboarding-preview-row">
              <span className="onboarding-preview-label">BEIDs Mapped</span>
              <span className="onboarding-preview-value">{result.beids_mapped}</span>
            </div>
            <div className="onboarding-preview-row">
              <span className="onboarding-preview-label">Reports Mapped</span>
              <span className="onboarding-preview-value">{result.reports_mapped}</span>
            </div>
            <div className="onboarding-preview-row">
              <span className="onboarding-preview-label">Total SQL Statements</span>
              <span className="onboarding-preview-value">{result.total_statements}</span>
            </div>
          </div>
          <Button variant="primary" onClick={resetForm}>
            <RestartAltIcon sx={{ fontSize: 16 }} /> Onboard Another Client
          </Button>
        </div>
      </div>
    );
  }

  if (idsLoading) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Client Onboarding</span>
        </div>
        <Spinner size="lg" label="Connecting to NFC Database (PROD)..." />
      </div>
    );
  }

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">Client Onboarding</span>
      </div>

      {globalError && <div className="onboarding-global-error">{globalError}</div>}

      {/* Step progress indicator */}
      <StepProgress steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {/* Step content */}
      <div className="onboarding-step-content">
        {currentStep === 0 && (
          <StepClientDetails
            clientName={clientName}
            setClientName={setClientName}
            nextClientId={nextIds?.next_client_id ?? null}
            error={stepErrors[0] ?? null}
          />
        )}
        {currentStep === 1 && (
          <StepGroupDetails
            groupName={groupName}
            setGroupName={setGroupName}
            nextGroupId={nextIds?.next_group_id ?? null}
            error={stepErrors[1] ?? null}
          />
        )}
        {currentStep === 2 && (
          <StepBeidMapping
            beids={beids}
            setBeids={setBeids}
            orgId={orgId}
            setOrgId={setOrgId}
            clientName={clientName}
            error={stepErrors[2] ?? null}
          />
        )}
        {currentStep === 3 && (
          <StepReportMapping
            reports={reports}
            reportsLoading={reportsLoading}
            selectedReportIds={selectedReportIds}
            setSelectedReportIds={setSelectedReportIds}
            clientName={clientName}
            error={stepErrors[3] ?? null}
          />
        )}
        {currentStep === 4 && (
          <StepPreview
            clientName={clientName}
            groupName={groupName}
            nextClientId={nextIds?.next_client_id ?? null}
            nextGroupId={nextIds?.next_group_id ?? null}
            beids={beids}
            orgId={orgId}
            selectedReports={selectedReports}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="onboarding-nav-buttons">
        {currentStep > 0 && (
          <Button onClick={goBack}>
            <ArrowBackIcon sx={{ fontSize: 16 }} /> Back
          </Button>
        )}
        <div className="toolbar-spacer" />
        {currentStep < STEPS.length - 1 ? (
          <Button variant="primary" onClick={goNext}>
            Next <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setShowConfirm(true)}>
            <CheckCircleOutlineIcon sx={{ fontSize: 16 }} /> Execute Onboarding
          </Button>
        )}
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={showConfirm}
        title="Confirm Client Onboarding"
        message={`This will execute ${3 + beids.length * 2 + selectedReportIds.length} INSERT statements on NFC Prod in a single transaction. This action cannot be undone.`}
        confirmLabel="Execute"
        loading={executing}
        onConfirm={handleExecute}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
