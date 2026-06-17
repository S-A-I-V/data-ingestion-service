/**
 * ClientOnboarding — Multi-step wizard for NEW client onboarding.
 *
 * Route: /admin/client-onboarding/new
 *
 * Steps:
 *   1. Client Details (name → auto client_id)
 *   2. Group Details (name → auto group_id, linked to client)
 *   3. BEID Mapping (BEIDs + org_id)
 *   4. Report Mapping (select reports from report_definitions)
 *   5. Fastie Aliases (optional)
 *   6. Preview & Confirm (review all, then atomic execute)
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Button, Spinner } from "../components/ui";
import StepProgress from "../components/onboarding/StepProgress";
import { type BeidOrgMapping } from "../components/onboarding/StepBeidMapping";
import { type ReportDef } from "../components/onboarding/StepReportMapping";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import OnboardingSuccess from "../components/onboarding/OnboardingSuccess";
import WizardNavigation from "../components/onboarding/WizardNavigation";
import NewClientStepContent from "../components/onboarding/NewClientStepContent";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  NEW_CLIENT_STEPS,
  CACHE_KEY_NEXT_IDS,
  CACHE_KEY_REPORTS,
  MIN_NAME_LENGTH,
  NAV_ICON_SIZE_PX,
  TOOLBAR_ICON_SIZE_PX,
  NEW_CLIENT_FASTIE_STEP_INDEX,
} from "../constants/onboarding";

export default function ClientOnboarding() {
  const navigate = useNavigate();

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

  // Fetch next IDs on mount
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY_NEXT_IDS);
    if (cached) {
      try {
        setNextIds(JSON.parse(cached));
        setIdsLoading(false);
        return;
      } catch {
        /* fall through */
      }
    }
    setIdsLoading(true);
    api
      .get("/admin/client-onboarding/next-ids")
      .then((r) => {
        setNextIds(r.data);
        sessionStorage.setItem(CACHE_KEY_NEXT_IDS, JSON.stringify(r.data));
      })
      .catch((e) => setGlobalError(e.response?.data?.detail || "Failed to fetch next IDs"))
      .finally(() => setIdsLoading(false));
  }, []);

  // Fetch report definitions when reaching step 3
  useEffect(() => {
    if (currentStep >= 3 && reports.length === 0 && !reportsLoading) {
      const cached = sessionStorage.getItem(CACHE_KEY_REPORTS);
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
          sessionStorage.setItem(CACHE_KEY_REPORTS, JSON.stringify(reps));
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
          if (clientName.trim().length < MIN_NAME_LENGTH)
            return `Client name must be at least ${MIN_NAME_LENGTH} characters`;
          return null;
        case 1:
          if (!groupName.trim()) return "Group name is required";
          if (groupName.trim().length < MIN_NAME_LENGTH)
            return `Group name must be at least ${MIN_NAME_LENGTH} characters`;
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
    if (skippedSteps.has(currentStep)) {
      setSkippedSteps((prev) => {
        const next = new Set(prev);
        next.delete(currentStep);
        return next;
      });
    }
    setCurrentStep((s) => Math.min(s + 1, NEW_CLIENT_STEPS.length - 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const goToStep = (idx: number) => {
    if (idx < currentStep) {
      setCurrentStep(idx);
      return;
    }
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
    sessionStorage.removeItem(CACHE_KEY_NEXT_IDS);
    sessionStorage.removeItem(CACHE_KEY_REPORTS);
    setIdsLoading(true);
    api
      .get("/admin/client-onboarding/next-ids")
      .then((r) => {
        setNextIds(r.data);
        sessionStorage.setItem(CACHE_KEY_NEXT_IDS, JSON.stringify(r.data));
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
        <OnboardingSuccess
          title="Client Onboarded Successfully"
          executed={result.executed ?? result.total_statements}
          skipped={result.skipped ?? 0}
          total={result.total_statements}
          tableRows={[
            { label: "Client ID", value: result.client_id, bold: true },
            { label: "Client Name", value: result.client_name, bold: true },
            { label: "Group ID", value: result.group_id, bold: true },
            { label: "Group Name", value: result.group_name, bold: true },
            { label: "BEIDs Mapped", value: result.beids_mapped },
            { label: "Reports Mapped", value: result.reports_mapped },
          ]}
          actions={
            <>
              <Button variant="primary" onClick={resetForm}>
                <RestartAltIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} /> Onboard Another
              </Button>
              <Button onClick={() => navigate("/admin/client-onboarding")}>
                <ArrowBackIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} /> Back to Hub
              </Button>
            </>
          }
        />
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
        <span className="toolbar-title">New Client Onboarding</span>
        <div className="toolbar-spacer" />
        <Button size="sm" onClick={() => navigate("/admin/client-onboarding")}>
          <ArrowBackIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Back
        </Button>
        <Button size="sm" variant="danger" onClick={resetForm} disabled={executing}>
          <RestartAltIcon sx={{ fontSize: TOOLBAR_ICON_SIZE_PX }} /> Reset
        </Button>
      </div>

      {globalError && <div className="onboarding-global-error">{globalError}</div>}

      <StepProgress
        steps={NEW_CLIENT_STEPS}
        currentStep={currentStep}
        onStepClick={goToStep}
        skippedSteps={skippedSteps}
      />

      <NewClientStepContent
        currentStep={currentStep}
        clientName={clientName}
        setClientName={setClientName}
        groupName={groupName}
        setGroupName={setGroupName}
        beidMappings={beidMappings}
        setBeidMappings={setBeidMappings}
        selectedReportIds={selectedReportIds}
        setSelectedReportIds={setSelectedReportIds}
        fastieAliases={fastieAliases}
        setFastieAliases={setFastieAliases}
        nextClientId={nextIds?.next_client_id ?? null}
        nextGroupId={nextIds?.next_group_id ?? null}
        reports={reports}
        reportsLoading={reportsLoading}
        selectedReports={selectedReports}
        stepErrors={stepErrors}
      />

      <WizardNavigation
        currentStep={currentStep}
        totalSteps={NEW_CLIENT_STEPS.length}
        onBack={goBack}
        onNext={goNext}
        onExecute={() => setShowConfirm(true)}
        executeLabel="Execute Onboarding"
        skippableStepIndex={NEW_CLIENT_FASTIE_STEP_INDEX}
        skipDisabled={fastieAliases.length > 0}
        onSkip={() => {
          setSkippedSteps((prev) => new Set([...prev, NEW_CLIENT_FASTIE_STEP_INDEX]));
          setCurrentStep(NEW_CLIENT_FASTIE_STEP_INDEX + 1);
        }}
      />

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
