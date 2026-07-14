/**
 * JobOnboarding — Multi-step wizard for onboarding a new job to NFC Prod.
 * Thin UI shell — all logic lives in useJobOnboardingForm hook.
 */

import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import api from "../api";
import Highlight from "../components/ui/Highlight";
import StepProgress from "../components/onboarding/StepProgress";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import StepJobDefinition from "../components/job-onboarding/StepJobDefinition";
import StepSlaProxy from "../components/job-onboarding/StepSlaProxy";
import StepArtifacts from "../components/job-onboarding/StepArtifacts";
import StepJobPreview from "../components/job-onboarding/StepJobPreview";
import { JOB_ONBOARDING_STEPS, JOB_PREVIEW_STEP_INDEX } from "../constants/jobOnboarding";
import useJobOnboardingForm from "../hooks/useJobOnboardingForm";

export default function JobOnboarding() {
  const navigate = useNavigate();
  const {
    step,
    setStep,
    form,
    updateField,
    setFieldError,
    errors,
    skippedSteps,
    setSkippedSteps,
    triggerJobs,
    loading,
    submitError,
    success,
    showConfirm,
    setShowConfirm,
    toast,
    handleNext,
    handleSubmit,
    reset,
    fetchTriggerSla,
    stepAttempted,
  } = useJobOnboardingForm();

  // Success screen
  if (success) {
    return (
      <div className="container audit-container">
        <div className="toolbar">
          <span className="toolbar-title">
            <Highlight>Job Onboarded</Highlight>
          </span>
        </div>
        <div className="onboarding-success">
          <CheckCircleIcon sx={{ fontSize: 48, color: "var(--success)" }} />
          <h2 className="onboarding-success-title">{success}</h2>
          <div className="onboarding-success-actions">
            <button className="btn btn-sm" onClick={() => navigate("/admin/job-onboarding")}>
              ← Back to Hub
            </button>
            <button className="btn btn-sm" onClick={reset}>
              Onboard Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container audit-container">
      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-sm btn--ghost" onClick={() => navigate("/admin/job-onboarding")}>
          <ArrowBackIcon sx={{ fontSize: 14 }} /> Back
        </button>
        <span className="toolbar-title">
          <Highlight>Onboard New Job</Highlight>
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm btn-danger" onClick={reset}>
          <RestartAltIcon sx={{ fontSize: 14 }} /> Reset
        </button>
      </div>

      {/* Step Progress */}
      <StepProgress
        steps={JOB_ONBOARDING_STEPS}
        currentStep={step}
        onStepClick={(idx) => {
          if (idx < step) setStep(idx);
        }}
        skippedSteps={skippedSteps}
      />

      {/* Toast — floats below progress */}
      <div style={{ position: "relative", height: 0, zIndex: 50 }}>
        {toast && (
          <div
            className="rm-save-toast-popup"
            style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)" }}
          >
            {toast.msg}
          </div>
        )}
      </div>

      {/* Error */}
      {submitError && <div className="onboarding-global-error">{submitError}</div>}

      {/* Step Content */}
      {step === 0 && (
        <StepJobDefinition
          form={form}
          errors={errors}
          onChange={(f, v) => updateField(f, v)}
          onValidate={setFieldError}
          showAllErrors={stepAttempted}
        />
      )}
      {step === 1 && (
        <StepSlaProxy
          isProxy={form.isProxy}
          onToggleProxy={(v) => {
            updateField("isProxy", v);
            if (!v) updateField("slaPolicies", []);
          }}
          slaPolicies={form.slaPolicies}
          onSlaPoliciesChange={(p) => updateField("slaPolicies", p)}
          proxyRules={form.proxyRules}
          onProxyRulesChange={(r) => updateField("proxyRules", r)}
          triggerJobs={triggerJobs}
          onTriggerJobSelected={fetchTriggerSla}
        />
      )}
      {step === 2 && (
        <StepArtifacts
          artifacts={form.artifacts}
          onArtifactsChange={(a) => {
            updateField("artifacts", a);
            setSkippedSteps((s) => {
              const n = new Set(s);
              n.delete(2);
              return n;
            });
          }}
        />
      )}
      {step === JOB_PREVIEW_STEP_INDEX && <StepJobPreview form={form} />}

      {/* Navigation */}
      <div className="onboarding-nav-buttons">
        {step > 0 && (
          <button className="btn btn-sm" onClick={() => setStep(step - 1)}>
            ← Previous
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step === 2 && (
          <button
            className="btn btn-sm btn--ghost"
            onClick={() => {
              setSkippedSteps((s) => new Set(s).add(2));
              setStep(step + 1);
            }}
            style={{ marginRight: 8 }}
          >
            Skip →
          </button>
        )}
        {step < JOB_PREVIEW_STEP_INDEX && (
          <button className="btn btn-sm" onClick={handleNext}>
            Next →
          </button>
        )}
        {step === JOB_PREVIEW_STEP_INDEX && (
          <button className="btn btn-sm" onClick={() => setShowConfirm(true)}>
            Execute Onboarding
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmDialog
          open={showConfirm}
          title="Execute Job Onboarding?"
          message={`This will create job "${form.jobName}" in NFC Prod with ${form.isProxy ? "proxy rules" : `${form.slaPolicies.length} SLA policies`}${form.artifacts.length > 0 ? ` and ${form.artifacts.length} artifact definitions` : ""}. This action is permanent.`}
          confirmLabel="Confirm & Execute"
          loading={loading}
          onConfirm={() => {
            setShowConfirm(false);
            handleSubmit();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
