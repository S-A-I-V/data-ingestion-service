/**
 * WizardNavigation — Shared navigation bar for onboarding wizards.
 * Handles Back, Skip, Next, and Execute buttons.
 */
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { NAV_ICON_SIZE_PX } from "../../constants/onboarding";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onExecute: () => void;
  executeLabel: string;
  executeDisabled?: boolean;
  /** Step index that can be skipped (optional) */
  skippableStepIndex?: number;
  /** Whether the skip button should be disabled */
  skipDisabled?: boolean;
  /** Called when the user skips */
  onSkip?: () => void;
}

export default function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onExecute,
  executeLabel,
  executeDisabled = false,
  skippableStepIndex,
  skipDisabled = false,
  onSkip,
}: WizardNavigationProps) {
  return (
    <div className="onboarding-nav-buttons">
      {currentStep > 0 && (
        <button type="button" className="btn btn-sm" onClick={onBack}>
          <ArrowBackIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} /> Back
        </button>
      )}
      <div className="toolbar-spacer" />
      {skippableStepIndex !== undefined && currentStep === skippableStepIndex && onSkip && (
        <button type="button" className="btn btn-sm btn--ghost" disabled={skipDisabled} onClick={onSkip}>
          Skip →
        </button>
      )}
      {currentStep < totalSteps - 1 ? (
        <button type="button" className="btn btn-sm btn-primary" onClick={onNext}>
          Next <ArrowForwardIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} />
        </button>
      ) : (
        <button type="button" className="btn btn-sm btn-primary" onClick={onExecute} disabled={executeDisabled}>
          <CheckCircleOutlineIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} /> {executeLabel}
        </button>
      )}
    </div>
  );
}
