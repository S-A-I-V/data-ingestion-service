/**
 * ClientEdit — Multi-step wizard for editing an existing client.
 *
 * Steps:
 *   1. Search & Select Client → loads current data
 *   2. Group Details (editable)
 *   3. BEID Mapping (add/remove)
 *   4. Report Mapping (add/remove)
 *   5. Fastie Aliases (add/remove)
 *   6. Diff Preview & Confirm
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Button, Spinner } from "../components/ui";
import StepProgress, { type Step } from "../components/onboarding/StepProgress";
import StepGroupDetails from "../components/onboarding/StepGroupDetails";
import StepBeidMapping, { type BeidOrgMapping } from "../components/onboarding/StepBeidMapping";
import StepReportMapping, { type ReportDef } from "../components/onboarding/StepReportMapping";
import StepEditPreview from "../components/onboarding/StepEditPreview";
import ClientSearch from "../components/onboarding/ClientSearch";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import StepFastieAlias from "../components/onboarding/StepFastieAlias";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import EditIcon from "@mui/icons-material/Edit";

const STEPS: Step[] = [
  { label: "Group", description: "Group name" },
  { label: "BEIDs", description: "Entity mapping" },
  { label: "Reports", description: "Report mapping" },
  { label: "Fastie", description: "Aliases (optional)" },
  { label: "Review", description: "Diff & confirm" },
];

export default function ClientEdit() {
  const navigate = useNavigate();

  // Phase: "search" (pick client) or "edit" (modify wizard)
  const [phase, setPhase] = useState<"search" | "edit">("search");
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [groupName, setGroupName] = useState("");
  const [beidMappings, setBeidMappings] = useState<BeidOrgMapping[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [fastieAliases, setFastieAliases] = useState<string[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  // Original state (for diff)
  const [editClientId, setEditClientId] = useState<number | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [originalGroup, setOriginalGroup] = useState("");
  const [originalBeids, setOriginalBeids] = useState<BeidOrgMapping[]>([]);
  const [originalReports, setOriginalReports] = useState<number[]>([]);
  const [originalAliases, setOriginalAliases] = useState<string[]>([]);

  // Server data
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, string | null>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Fetch reports when reaching step 2
  useEffect(() => {
    if (phase === "edit" && currentStep >= 2 && reports.length === 0 && !reportsLoading) {
      setReportsLoading(true);
      api
        .get("/admin/client-onboarding/report-definitions")
        .then((r) => setReports(r.data.reports || []))
        .catch((e) => setStepErrors((prev) => ({ ...prev, 2: e.response?.data?.detail || "Failed to load reports" })))
        .finally(() => setReportsLoading(false));
    }
  }, [currentStep, phase]);

  // Handle client selection
  const handleClientSelect = async (clientId: number) => {
    setLoading(true);
    setGlobalError(null);
    try {
      const r = await api.get(`/admin/client-onboarding/client/${clientId}`);
      const data = r.data;
      setEditClientId(data.client_id);
      setEditClientName(data.client_name);
      setEditGroupId(data.group_id);
      setGroupName(data.group_name || "");
      setOriginalGroup(data.group_name || "");
      setBeidMappings(data.beid_mappings || []);
      setOriginalBeids(data.beid_mappings || []);
      setSelectedReportIds(data.report_ids || []);
      setOriginalReports(data.report_ids || []);
      setFastieAliases(data.fastie_aliases || []);
      setOriginalAliases(data.fastie_aliases || []);
      setPhase("edit");
      setCurrentStep(0);
    } catch (e: any) {
      setGlobalError(e.response?.data?.detail || "Failed to load client details");
    } finally {
      setLoading(false);
    }
  };

  // Validation per step
  const validateStep = useCallback(
    (step: number): string | null => {
      switch (step) {
        case 0:
          if (!groupName.trim()) return "Group name is required";
          return null;
        case 1:
          if (beidMappings.length === 0) return "At least one BEID mapping is required";
          if (beidMappings.some((m) => m.beid <= 0)) return "All BEIDs must be positive integers";
          if (beidMappings.some((m) => !m.org_id.trim())) return "Org ID is required for all BEIDs";
          return null;
        case 2:
          if (selectedReportIds.length === 0) return "At least one report must be selected";
          return null;
        default:
          return null;
      }
    },
    [groupName, beidMappings, selectedReportIds],
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
    }
    setCurrentStep(idx);
  };

  // Compute diff
  const computeDiff = () => {
    const currentBeidSet = new Set(originalBeids.map((b) => `${b.beid}:${b.org_id}`));
    const newBeidSet = new Set(beidMappings.map((b) => `${b.beid}:${b.org_id}`));
    const beidsAdded = beidMappings.filter((b) => !currentBeidSet.has(`${b.beid}:${b.org_id}`));
    const beidsRemoved = originalBeids.filter((b) => !newBeidSet.has(`${b.beid}:${b.org_id}`));

    const currentReportSet = new Set(originalReports);
    const newReportSet = new Set(selectedReportIds);
    const reportsAdded = selectedReportIds.filter((r) => !currentReportSet.has(r));
    const reportsRemoved = originalReports.filter((r) => !newReportSet.has(r));

    const currentAliasSet = new Set(originalAliases);
    const newAliasSet = new Set(fastieAliases);
    const aliasesAdded = fastieAliases.filter((a) => !currentAliasSet.has(a));
    const aliasesRemoved = originalAliases.filter((a) => !newAliasSet.has(a));

    const groupChanged = groupName.trim() !== originalGroup;
    const totalStatements =
      (groupChanged ? 1 : 0) +
      beidsAdded.length * 2 +
      beidsRemoved.length * 2 +
      reportsAdded.length +
      reportsRemoved.length +
      aliasesAdded.length +
      aliasesRemoved.length;

    return {
      beidsAdded,
      beidsRemoved,
      reportsAdded,
      reportsRemoved,
      aliasesAdded,
      aliasesRemoved,
      groupChanged,
      totalStatements,
    };
  };

  const handleExecute = async () => {
    setExecuting(true);
    setGlobalError(null);
    try {
      const r = await api.put("/admin/client-onboarding/update", {
        client_id: editClientId,
        group_name: groupName.trim(),
        beid_org_mappings: beidMappings,
        report_ids: selectedReportIds,
        fastie_aliases: fastieAliases,
      });
      setResult(r.data);
      setShowConfirm(false);
    } catch (e: any) {
      setGlobalError(e.response?.data?.detail || "Edit failed. Please try again.");
      setShowConfirm(false);
    } finally {
      setExecuting(false);
    }
  };

  // Success state
  if (result) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Edit Client</span>
        </div>
        <div className="onboarding-success">
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "var(--success)" }} />
          <h2 className="onboarding-success-title">Client Updated Successfully</h2>
          <div className="onboarding-success-stats">
            <div className="onboarding-success-stat">
              <span className="onboarding-success-stat-value">{result.executed ?? 0}</span>
              <span className="onboarding-success-stat-label">Executed</span>
            </div>
            <div className="onboarding-success-stat onboarding-success-stat--warn">
              <span className="onboarding-success-stat-value">{result.skipped ?? 0}</span>
              <span className="onboarding-success-stat-label">Skipped</span>
            </div>
            <div className="onboarding-success-stat">
              <span className="onboarding-success-stat-value">{result.total_statements ?? 0}</span>
              <span className="onboarding-success-stat-label">Total</span>
            </div>
          </div>
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
                {result.message && (
                  <tr>
                    <td>Status</td>
                    <td>{result.message}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="onboarding-success-actions">
            <Button variant="primary" onClick={() => navigate("/admin/client-onboarding")}>
              <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Hub
            </Button>
            <Button
              onClick={() => {
                setResult(null);
                setPhase("search");
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} /> Edit Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Search phase
  if (phase === "search") {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">Edit Existing Client</span>
          <div className="toolbar-spacer" />
          <Button size="sm" onClick={() => navigate("/admin/client-onboarding")}>
            <ArrowBackIcon sx={{ fontSize: 14 }} /> Back
          </Button>
        </div>

        {globalError && <div className="onboarding-global-error">{globalError}</div>}
        {loading && <Spinner size="lg" label="Loading client data..." />}
        {!loading && (
          <ClientSearch onSelect={handleClientSelect} onCancel={() => navigate("/admin/client-onboarding")} />
        )}
      </div>
    );
  }

  // Edit wizard
  const diff = computeDiff();

  return (
    <div className="container audit-container">
      <div className="toolbar">
        <span className="toolbar-title">
          Editing — {editClientName} (#{editClientId})
        </span>
        <div className="toolbar-spacer" />
        <Button size="sm" variant="danger" onClick={() => setPhase("search")} disabled={executing}>
          <RestartAltIcon sx={{ fontSize: 14 }} /> Start Over
        </Button>
      </div>

      {globalError && <div className="onboarding-global-error">{globalError}</div>}

      <StepProgress steps={STEPS} currentStep={currentStep} onStepClick={goToStep} skippedSteps={skippedSteps} />

      <div className="onboarding-step-content">
        {currentStep === 0 && (
          <StepGroupDetails
            groupName={groupName}
            setGroupName={setGroupName}
            nextGroupId={editGroupId}
            error={stepErrors[0] ?? null}
          />
        )}
        {currentStep === 1 && (
          <StepBeidMapping
            mappings={beidMappings}
            setMappings={setBeidMappings}
            clientName={editClientName}
            error={stepErrors[1] ?? null}
          />
        )}
        {currentStep === 2 && (
          <StepReportMapping
            reports={reports}
            reportsLoading={reportsLoading}
            selectedReportIds={selectedReportIds}
            setSelectedReportIds={setSelectedReportIds}
            clientName={editClientName}
            error={stepErrors[2] ?? null}
          />
        )}
        {currentStep === 3 && (
          <StepFastieAlias
            aliases={fastieAliases}
            setAliases={setFastieAliases}
            clientName={editClientName}
            error={stepErrors[3] ?? null}
          />
        )}
        {currentStep === 4 && (
          <StepEditPreview
            clientId={editClientId!}
            clientName={editClientName}
            oldGroupName={originalGroup}
            newGroupName={groupName}
            beidDiff={{ added: diff.beidsAdded, removed: diff.beidsRemoved }}
            reportDiff={{ added: diff.reportsAdded, removed: diff.reportsRemoved }}
            aliasDiff={{ added: diff.aliasesAdded, removed: diff.aliasesRemoved }}
            reports={reports}
            totalStatements={diff.totalStatements}
          />
        )}
      </div>

      <div className="onboarding-nav-buttons">
        {currentStep > 0 && (
          <Button onClick={goBack}>
            <ArrowBackIcon sx={{ fontSize: 16 }} /> Back
          </Button>
        )}
        <div className="toolbar-spacer" />
        {currentStep === 3 && (
          <Button
            variant="ghost"
            disabled={fastieAliases.length > 0}
            onClick={() => {
              setSkippedSteps((prev) => new Set([...prev, 3]));
              setCurrentStep(4);
            }}
          >
            Skip →
          </Button>
        )}
        {currentStep < STEPS.length - 1 ? (
          <Button variant="primary" onClick={goNext}>
            Next <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setShowConfirm(true)} disabled={diff.totalStatements === 0}>
            <CheckCircleOutlineIcon sx={{ fontSize: 16 }} /> Apply Changes
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm Client Edit"
        message={`This will execute ${diff.totalStatements} statements on NFC Prod to update "${editClientName}". This action cannot be undone.`}
        confirmLabel="Apply Changes"
        loading={executing}
        onConfirm={handleExecute}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
