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
import StepBeidMapping, { type BeidOrgMapping } from "../components/onboarding/StepBeidMapping";
import StepReportMapping, { type ReportDef } from "../components/onboarding/StepReportMapping";
import StepPreview from "../components/onboarding/StepPreview";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import StepFastieAlias from "../components/onboarding/StepFastieAlias";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const STEPS: Step[] = [
  { label: "Client", description: "Name & ID" },
  { label: "Group", description: "Group Setup" },
  { label: "BEIDs", description: "Entity mapping" },
  { label: "Reports", description: "Report mapping" },
  { label: "Fastie", description: "Aliases (optional)" },
  { label: "Review", description: "Preview & confirm" },
];

export default function ClientOnboarding() {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [clientName, setClientName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [beidMappings, setBeidMappings] = useState<BeidOrgMapping[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [fastieAliases, setFastieAliases] = useState<string[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

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

  // Fetch next IDs on mount — use sessionStorage cache to avoid re-fetching on refresh
  useEffect(() => {
    const CACHE_KEY = "onboarding_next_ids";
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setNextIds(JSON.parse(cached));
        setIdsLoading(false);
        return;
      } catch {
        /* fall through to fetch */
      }
    }
    setIdsLoading(true);
    api
      .get("/admin/client-onboarding/next-ids")
      .then((r) => {
        setNextIds(r.data);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(r.data));
      })
      .catch((e) => setGlobalError(e.response?.data?.detail || "Failed to fetch next IDs"))
      .finally(() => setIdsLoading(false));
  }, []);

  // Fetch report definitions when reaching step 4 — cache in sessionStorage
  useEffect(() => {
    if (currentStep >= 3 && reports.length === 0 && !reportsLoading) {
      const CACHE_KEY = "onboarding_reports";
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          setReports(JSON.parse(cached));
          return;
        } catch {
          /* fall through */
        }
      }
      setReportsLoading(true);
      api
        .get("/admin/client-onboarding/report-definitions")
        .then((r) => {
          const reps = r.data.reports || [];
          setReports(reps);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(reps));
        })
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
          if (beidMappings.length === 0) return "At least one BEID mapping is required";
          if (beidMappings.some((m) => m.beid <= 0)) return "All BEIDs must be positive integers";
          if (beidMappings.some((m) => !m.org_id.trim())) return "Org ID is required for all BEIDs";
          return null;
        case 3:
          if (selectedReportIds.length === 0) return "At least one report must be selected";
          return null;
        default:
          return null;
      }
    },
    [clientName, groupName, beidMappings, selectedReportIds],
  );

  const goNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: err }));
      return;
    }
    setStepErrors((prev) => ({ ...prev, [currentStep]: null }));
    // If this step was previously skipped but now has data, un-skip it
    if (skippedSteps.has(currentStep)) {
      setSkippedSteps((prev) => {
        const next = new Set(prev);
        next.delete(currentStep);
        return next;
      });
    }
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
        beid_org_mappings: beidMappings,
        report_ids: selectedReportIds,
        fastie_aliases: fastieAliases,
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
    setBeidMappings([]);
    setSelectedReportIds([]);
    setFastieAliases([]);
    setSkippedSteps(new Set());
    setResult(null);
    setGlobalError(null);
    setStepErrors({});
    // Clear session caches so next onboarding gets fresh IDs
    sessionStorage.removeItem("onboarding_next_ids");
    sessionStorage.removeItem("onboarding_reports");
    // Re-fetch IDs
    setIdsLoading(true);
    api
      .get("/admin/client-onboarding/next-ids")
      .then((r) => {
        setNextIds(r.data);
        sessionStorage.setItem("onboarding_next_ids", JSON.stringify(r.data));
      })
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

          {/* Stats row */}
          <div className="onboarding-success-stats">
            <div className="onboarding-success-stat">
              <span className="onboarding-success-stat-value">{result.executed ?? result.total_statements}</span>
              <span className="onboarding-success-stat-label">Executed</span>
            </div>
            <div className="onboarding-success-stat onboarding-success-stat--warn">
              <span className="onboarding-success-stat-value">{result.skipped ?? 0}</span>
              <span className="onboarding-success-stat-label">Skipped</span>
            </div>
            <div className="onboarding-success-stat">
              <span className="onboarding-success-stat-value">{result.total_statements}</span>
              <span className="onboarding-success-stat-label">Total</span>
            </div>
          </div>

          {/* Summary table */}
          <div className="onboarding-success-table">
            <table className="data-table">
              <tbody>
                <tr>
                  <td>Client ID</td>
                  <td>
                    <strong>{result.client_id}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Client Name</td>
                  <td>
                    <strong>{result.client_name}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Group ID</td>
                  <td>
                    <strong>{result.group_id}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Group Name</td>
                  <td>
                    <strong>{result.group_name}</strong>
                  </td>
                </tr>
                <tr>
                  <td>BEIDs Mapped</td>
                  <td>{result.beids_mapped}</td>
                </tr>
                <tr>
                  <td>Reports Mapped</td>
                  <td>{result.reports_mapped}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="onboarding-success-actions">
            <Button variant="primary" onClick={resetForm}>
              <RestartAltIcon sx={{ fontSize: 16 }} /> Onboard Another Client
            </Button>
            <Button asChild>
              <a href="/home">Go to Home</a>
            </Button>
          </div>
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
        <div className="toolbar-spacer" />
        <Button size="sm" variant="danger" onClick={resetForm} disabled={executing}>
          <RestartAltIcon sx={{ fontSize: 14 }} /> Reset
        </Button>
      </div>

      {globalError && <div className="onboarding-global-error">{globalError}</div>}

      {/* Step progress indicator */}
      <StepProgress steps={STEPS} currentStep={currentStep} onStepClick={goToStep} skippedSteps={skippedSteps} />

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
            mappings={beidMappings}
            setMappings={setBeidMappings}
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
          <StepFastieAlias
            aliases={fastieAliases}
            setAliases={setFastieAliases}
            clientName={clientName}
            error={stepErrors[4] ?? null}
          />
        )}
        {currentStep === 5 && (
          <StepPreview
            clientName={clientName}
            groupName={groupName}
            nextClientId={nextIds?.next_client_id ?? null}
            nextGroupId={nextIds?.next_group_id ?? null}
            beidMappings={beidMappings}
            selectedReports={selectedReports}
            fastieAliases={fastieAliases}
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
        {currentStep === 4 && (
          <Button
            variant="ghost"
            disabled={fastieAliases.length > 0}
            onClick={() => {
              setSkippedSteps((prev) => new Set([...prev, 4]));
              setCurrentStep(5);
            }}
          >
            Skip →
          </Button>
        )}
        {currentStep < STEPS.length - 1 ? (
          <Button variant="primary" onClick={goNext} disabled={currentStep === 4 && fastieAliases.length === 0}>
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
        message={`This will execute ${3 + beidMappings.length * 2 + selectedReportIds.length} INSERT statements on NFC Prod in a single transaction. This action cannot be undone.`}
        confirmLabel="Execute"
        loading={executing}
        onConfirm={handleExecute}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
