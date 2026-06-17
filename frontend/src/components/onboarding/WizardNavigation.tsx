/**
 * WizardNavigation — Shared navigation footer for onboarding wizards.
 * Handles Back, Skip, Next, and Execute buttons.
 */
import { Button } from "../ui";
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
        <Button onClick={onBack}>
          <ArrowBackIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} /> Back
        </Button>
      )}
      <div className="toolbar-spacer" />
      {skippableStepIndex !== undefined && currentStep === skippableStepIndex && onSkip && (
        <Button variant="ghost" disabled={skipDisabled} onClick={onSkip}>
          Skip →
        </Button>
      )}
      {currentStep < totalSteps - 1 ? (
        <Button variant="primary" onClick={onNext}>
          Next <ArrowForwardIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} />
        </Button>
      ) : (
        <Button variant="primary" onClick={onExecute} disabled={executeDisabled}>
          <CheckCircleOutlineIcon sx={{ fontSize: NAV_ICON_SIZE_PX }} /> {executeLabel}
        </Button>
      )}
    </div>
  );
}
