/**
 * JobOnboarding — Multi-step wizard for onboarding a new job to NFC Prod.
 *
 * Orchestrates 4 steps via modular components:
 *   1. StepJobDefinition — identity, ownership, support
 *   2. StepSlaProxy — SLA policies or proxy inference rules
 *   3. StepArtifacts — expected output files
 *   4. StepJobPreview — review & execute
 *
 * Validation blocks navigation until required fields are filled.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import api from "../api";
import Highlight from "../components/ui/Highlight";
import { Toast, useToast } from "../components/ui";
import StepProgress from "../components/onboarding/StepProgress";
import StepJobDefinition from "../components/job-onboarding/StepJobDefinition";
import StepSlaProxy from "../components/job-onboarding/StepSlaProxy";
import StepArtifacts from "../components/job-onboarding/StepArtifacts";
import StepJobPreview from "../components/job-onboarding/StepJobPreview";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import {
  JOB_ONBOARDING_STEPS,
  JOB_PREVIEW_STEP_INDEX,
  EMAIL_REGEX,
  JOB_NAME_MIN_LENGTH,
} from "../constants/jobOnboarding";
import type { JobFormData, JobFormErrors, TriggerJob } from "../types/jobOnboarding";

const INITIAL_FORM: JobFormData = {
  jobName: "",
  ownerEmail: "",
  oncallProjectName: "",
  oncallContact: "",
  l3OwnerEmail: "",
  l2OwnerEmail: "",
  supportTeamDl: "",
  jobDescription: "",
  isProxy: false,
  slaPolicies: [],
  proxyRules: [],
  artifacts: [],
};

export default function JobOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<JobFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [triggerJobs, setTriggerJobs] = useState<TriggerJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [toast, setToast] = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api
      .get("/admin/job-onboarding/trigger-jobs")
      .then((r) => setTriggerJobs(r.data.jobs || []))
      .catch(() => {});
  }, []);

  const updateField = (field: keyof JobFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setFieldError = (field: keyof JobFormData, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  /** Validate all required fields for step 0 */
  const validateStep0 = (): boolean => {
    const newErrors: JobFormErrors = {};
    if (!form.jobName.trim() || form.jobName.trim().length < JOB_NAME_MIN_LENGTH)
      newErrors.jobName = "Job name is required (min 3 chars)";
    if (!form.ownerEmail.trim() || !EMAIL_REGEX.test(form.ownerEmail.trim()))
      newErrors.ownerEmail = "Valid owner email is required";
    if (!form.l2OwnerEmail.trim() || !EMAIL_REGEX.test(form.l2OwnerEmail.trim()))
      newErrors.l2OwnerEmail = "Valid L2 email is required";
    if (!form.l3OwnerEmail.trim() || !EMAIL_REGEX.test(form.l3OwnerEmail.trim()))
      newErrors.l3OwnerEmail = "Valid L3 email is required";
    if (!form.oncallContact.trim() || !EMAIL_REGEX.test(form.oncallContact.trim()))
      newErrors.oncallContact = "Valid on-call contact email is required";
    if (!form.supportTeamDl.trim() || !EMAIL_REGEX.test(form.supportTeamDl.trim()))
      newErrors.supportTeamDl = "Valid support DL email is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Validate step 1: SLA or proxy config */
  const validateStep1 = (): boolean => {
    if (form.isProxy && form.proxyRules.length === 0) return false;
    return form.slaPolicies.length > 0;
  };

  const canAdvance = (): boolean => {
    if (step === 0) {
      // Quick check without setting errors (for disabled state)
      return (
        form.jobName.trim().length >= JOB_NAME_MIN_LENGTH &&
        EMAIL_REGEX.test(form.ownerEmail.trim()) &&
        EMAIL_REGEX.test(form.l2OwnerEmail.trim()) &&
        EMAIL_REGEX.test(form.l3OwnerEmail.trim()) &&
        EMAIL_REGEX.test(form.oncallContact.trim()) &&
        EMAIL_REGEX.test(form.supportTeamDl.trim())
      );
    }
    if (step === 1) return validateStep1();
    return true;
  };

  const showToast = (msg: string) => {
    setToast({ ok: false, msg });
  };

  const handleNext = () => {
    if (step === 0) {
      if (!validateStep0()) {
        showToast("Please fill all required fields before proceeding.");
        return;
      }
    }
    if (step === 1) {
      if (!validateStep1()) {
        showToast(form.isProxy ? "Add at least one proxy rule with a trigger job." : "Add at least one SLA policy.");
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const payload = {
        job_name: form.jobName.trim(),
        owner_email: form.ownerEmail.trim(),
        category: "",
        oncall_project_name: form.oncallProjectName.trim(),
        oncall_contact: form.oncallContact.trim(),
        job_owner_name: form.ownerEmail.trim(),
        l3_owner_name: form.l3OwnerEmail.trim(),
        l2_owner_name: form.l2OwnerEmail.trim(),
        support_team_dl: form.supportTeamDl.trim(),
        oncall_name: form.oncallContact.trim(),
        oncall_flag: true,
        job_description: form.jobDescription.trim() || "No description available.",
        is_proxy: form.isProxy,
        sla_policies: form.slaPolicies,
        proxy_rules: form.proxyRules,
        artifact_definitions: form.artifacts,
      };
      const res = await api.post("/admin/job-onboarding/execute", payload);
      setSuccess(`Job "${res.data.job_name}" onboarded successfully (ID: ${res.data.job_id})`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Onboarding failed";
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
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
            <button
              className="btn btn-sm"
              onClick={() => {
                setSuccess(null);
                setForm(INITIAL_FORM);
                setErrors({});
                setStep(0);
              }}
            >
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
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            setForm(INITIAL_FORM);
            setErrors({});
            setStep(0);
            setSubmitError("");
            setSkippedSteps(new Set());
          }}
        >
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

      {/* Toast — floats below progress, no layout shift */}
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

      {/* Inline toast — centered below progress, above content */}
      {/* Error */}
      {submitError && <div className="onboarding-global-error">{submitError}</div>}

      {/* Step Content */}
      {step === 0 && (
        <StepJobDefinition
          form={form}
          errors={errors}
          onChange={(field, value) => updateField(field, value)}
          onValidate={setFieldError}
        />
      )}
      {step === 1 && (
        <StepSlaProxy
          isProxy={form.isProxy}
          onToggleProxy={(v) => updateField("isProxy", v)}
          slaPolicies={form.slaPolicies}
          onSlaPoliciesChange={(p) => updateField("slaPolicies", p)}
          proxyRules={form.proxyRules}
          onProxyRulesChange={(r) => updateField("proxyRules", r)}
          triggerJobs={triggerJobs}
          onTriggerJobSelected={async (jobId) => {
            try {
              const res = await api.get(`/admin/job-onboarding/trigger-jobs/${jobId}/sla`);
              const policies = (res.data.sla_policies || []).map((p: any) => ({
                day_of_week: p.day_of_week || "Monday",
                schedule_frequency: p.schedule_frequency || "daily",
                expected_start_time: p.expected_start_time || "",
                expected_sla_time: p.expected_sla_time || "",
                expected_time: p.expected_time || "",
                timezone: p.timezone || "EST",
                days_addition_start_time: p.days_addition_start_time ?? 0,
                days_addition_sla: p.days_addition_sla ?? 0,
                expected_duration_minutes: p.expected_duration_minutes ?? null,
                data_date_formula: p.data_date_formula ?? null,
              }));
              if (policies.length > 0) updateField("slaPolicies", policies);
            } catch {
              /* silently fail — user can add manually */
            }
          }}
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
          <button className="btn btn-sm" onClick={() => setShowConfirm(true)} disabled={loading}>
            {loading ? "Executing..." : "Execute Onboarding"}
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
