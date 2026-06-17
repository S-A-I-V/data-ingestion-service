/**
 * NewClientStepContent — Renders the correct step form for new client onboarding
 * based on the currentStep index.
 */
import StepClientDetails from "./StepClientDetails";
import StepGroupDetails from "./StepGroupDetails";
import StepBeidMapping, { type BeidOrgMapping } from "./StepBeidMapping";
import StepReportMapping, { type ReportDef } from "./StepReportMapping";
import StepPreview from "./StepPreview";
import StepFastieAlias from "./StepFastieAlias";

interface NewClientStepContentProps {
  currentStep: number;
  clientName: string;
  setClientName: (v: string) => void;
  groupName: string;
  setGroupName: (v: string) => void;
  beidMappings: BeidOrgMapping[];
  setBeidMappings: (v: BeidOrgMapping[]) => void;
  selectedReportIds: number[];
  setSelectedReportIds: (v: number[]) => void;
  fastieAliases: string[];
  setFastieAliases: (v: string[]) => void;
  nextClientId: number | null;
  nextGroupId: number | null;
  reports: ReportDef[];
  reportsLoading: boolean;
  selectedReports: ReportDef[];
  stepErrors: Record<number, string | null>;
}

export default function NewClientStepContent({
  currentStep,
  clientName,
  setClientName,
  groupName,
  setGroupName,
  beidMappings,
  setBeidMappings,
  selectedReportIds,
  setSelectedReportIds,
  fastieAliases,
  setFastieAliases,
  nextClientId,
  nextGroupId,
  reports,
  reportsLoading,
  selectedReports,
  stepErrors,
}: NewClientStepContentProps) {
  return (
    <div className="onboarding-step-content">
      {currentStep === 0 && (
        <StepClientDetails
          clientName={clientName}
          setClientName={setClientName}
          nextClientId={nextClientId}
          error={stepErrors[0] ?? null}
        />
      )}
      {currentStep === 1 && (
        <StepGroupDetails
          groupName={groupName}
          setGroupName={setGroupName}
          nextGroupId={nextGroupId}
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
          nextClientId={nextClientId}
          nextGroupId={nextGroupId}
          beidMappings={beidMappings}
          selectedReports={selectedReports}
          fastieAliases={fastieAliases}
        />
      )}
    </div>
  );
}
