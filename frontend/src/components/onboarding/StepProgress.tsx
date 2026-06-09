/**
 * StepProgress — Reusable multi-step progress indicator.
 * Shows numbered steps with labels, active/done/pending states.
 */

import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export interface Step {
  label: string;
  description?: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  skippedSteps?: Set<number>;
}

export default function StepProgress({ steps, currentStep, onStepClick, skippedSteps }: Props) {
  return (
    <div className="step-progress">
      {steps.map((step, idx) => {
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;
        const isSkipped = skippedSteps?.has(idx) ?? false;
        const isClickable = onStepClick && idx <= currentStep;

        return (
          <div
            key={idx}
            className={`step-progress-item${isActive ? " active" : ""}${isDone ? " done" : ""}${isSkipped ? " skipped" : ""}`}
            onClick={() => isClickable && onStepClick(idx)}
            {...(isClickable ? { role: "button", tabIndex: 0 } : {})}
            onKeyDown={(e) => {
              if (isClickable && (e.key === "Enter" || e.key === " ")) onStepClick(idx);
            }}
          >
            <div className="step-progress-circle">
              {isSkipped ? <span>—</span> : isDone ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <span>{idx + 1}</span>}
            </div>
            <div className="step-progress-label">
              <span className="step-progress-title">{step.label}</span>
              {step.description && <span className="step-progress-desc">{step.description}</span>}
            </div>
            {idx < steps.length - 1 && <div className="step-progress-connector" />}
          </div>
        );
      })}
    </div>
  );
}
