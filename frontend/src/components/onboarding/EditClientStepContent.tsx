/**
 * EditClientStepContent — Renders the correct step form for client editing
 * based on the currentStep index.
 */
import StepGroupDetails from "./StepGroupDetails";
import StepBeidMapping, { type BeidOrgMapping } from "./StepBeidMapping";
import StepReportMapping, { type ReportDef } from "./StepReportMapping";
import StepEditPreview from "./StepEditPreview";
import StepFastieAlias from "./StepFastieAlias";

interface DiffResult {
  beidsAdded: BeidOrgMapping[];
  beidsRemoved: BeidOrgMapping[];
  reportsAdded: number[];
  reportsRemoved: number[];
  aliasesAdded: string[];
  aliasesRemoved: string[];
  totalStatements: number;
}

interface EditClientStepContentProps {
  currentStep: number;
  editClientId: number;
  editClientName: string;
  editGroupId: number | null;
  groupName: string;
  setGroupName: (v: string) => void;
  beidMappings: BeidOrgMapping[];
  setBeidMappings: (v: BeidOrgMapping[]) => void;
  selectedReportIds: number[];
  setSelectedReportIds: (v: number[]) => void;
  fastieAliases: string[];
  setFastieAliases: (v: string[]) => void;
  reports: ReportDef[];
  reportsLoading: boolean;
  stepErrors: Record<number, string | null>;
  diff: DiffResult;
  originalGroup: string;
}

export default function EditClientStepContent({
  currentStep,
  editClientId,
  editClientName,
  editGroupId,
  groupName,
  setGroupName,
  beidMappings,
  setBeidMappings,
  selectedReportIds,
  setSelectedReportIds,
  fastieAliases,
  setFastieAliases,
  reports,
  reportsLoading,
  stepErrors,
  diff,
  originalGroup,
}: EditClientStepContentProps) {
  return (
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
          clientId={editClientId}
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
  );
}
