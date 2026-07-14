/**
 * useJobOnboardingForm — Custom hook for job onboarding wizard state & logic.
 *
 * Powered by react-hook-form + zod for robust validation.
 * Manages: form data, per-step validation, trigger jobs fetch, submit, toast, step navigation.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api";
import { useToast } from "../components/ui";
import {
  jobOnboardingSchema,
  jobDefinitionSchema,
  slaProxySchema,
  validateSlaProxyStep,
  type JobOnboardingValues,
} from "../schemas/jobOnboarding";
import type { JobFormData, JobFormErrors, TriggerJob } from "../types/jobOnboarding";

const DEFAULT_VALUES: JobOnboardingValues = {
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

/** Step 0 field names for partial validation */
const STEP_0_FIELDS: (keyof JobOnboardingValues)[] = [
  "jobName",
  "jobDescription",
  "ownerEmail",
  "l2OwnerEmail",
  "l3OwnerEmail",
  "oncallContact",
  "supportTeamDl",
  "oncallProjectName",
];

export default function useJobOnboardingForm() {
  const [step, setStep] = useState(0);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [triggerJobs, setTriggerJobs] = useState<TriggerJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useToast();
  /** Tracks whether user attempted to advance from the current step (shows all errors) */
  const [stepAttempted, setStepAttempted] = useState(false);

  // React Hook Form with Zod resolver
  const {
    watch,
    setValue,
    getValues,
    trigger: triggerValidation,
    formState: { errors: rhfErrors },
    reset: rhfReset,
    clearErrors,
  } = useForm<JobOnboardingValues>({
    resolver: zodResolver(jobOnboardingSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Watch the full form — cast to JobFormData for backwards compatibility
  const form = watch() as unknown as JobFormData;

  // Fetch trigger jobs on mount
  useEffect(() => {
    api
      .get("/admin/job-onboarding/trigger-jobs")
      .then((r) => setTriggerJobs(r.data.jobs || []))
      .catch(() => {});
  }, []);

  /**
   * Update a single field — thin wrapper over setValue.
   * Clears the error for that field on change.
   */
  const updateField = (field: keyof JobFormData, value: unknown) => {
    setValue(field as keyof JobOnboardingValues, value as any, { shouldValidate: false, shouldDirty: true });
    clearErrors(field as keyof JobOnboardingValues);
  };

  /**
   * Set an external error on a field (e.g. from backend response).
   */
  const setFieldError = (field: keyof JobFormData, error: string | undefined) => {
    if (error) {
      triggerValidation(field as keyof JobOnboardingValues);
    } else {
      clearErrors(field as keyof JobOnboardingValues);
    }
  };

  /**
   * Flatten RHF nested errors into the simple Record<field, string> shape
   * expected by existing child components.
   */
  const errors: JobFormErrors = {};
  for (const [key, value] of Object.entries(rhfErrors)) {
    if (value?.message) {
      errors[key as keyof JobFormData] = value.message as string;
    }
  }

  /**
   * Validate only the fields for the current step.
   */
  const validateCurrentStep = async (): Promise<boolean> => {
    if (step === 0) {
      return await triggerValidation(STEP_0_FIELDS as any);
    }
    if (step === 1) {
      const data = getValues();
      // First validate the individual SLA/proxy field shapes
      const schemaResult = slaProxySchema.safeParse({
        isProxy: data.isProxy,
        slaPolicies: data.slaPolicies,
        proxyRules: data.proxyRules,
      });
      if (!schemaResult.success) return false;
      // Then check the cross-field rule (non-empty arrays)
      const crossFieldError = validateSlaProxyStep(schemaResult.data);
      return crossFieldError === null;
    }
    // Step 2 (artifacts) and Step 3 (preview) don't block
    return true;
  };

  const showToastMsg = (msg: string) => setToast({ ok: false, msg });

  const handleNext = async () => {
    setStepAttempted(true);
    const valid = await validateCurrentStep();
    if (!valid) {
      if (step === 0) showToastMsg("Please fix all validation errors before proceeding.");
      else if (step === 1) {
        const data = getValues();
        showToastMsg(
          data.isProxy
            ? "Add at least one proxy rule with a trigger job."
            : "Add at least one SLA policy with valid times.",
        );
      }
      return;
    }
    setStepAttempted(false);
    setStep(step + 1);
  };

  const canAdvance = (): boolean => {
    const data = getValues();
    if (step === 0) {
      return jobDefinitionSchema.safeParse(data).success;
    }
    if (step === 1) {
      const result = slaProxySchema.safeParse({
        isProxy: data.isProxy,
        slaPolicies: data.slaPolicies,
        proxyRules: data.proxyRules,
      });
      if (!result.success) return false;
      return validateSlaProxyStep(result.data) === null;
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const data = getValues();
      const payload = {
        job_name: data.jobName.trim(),
        owner_email: data.ownerEmail.trim(),
        category: "",
        oncall_project_name: data.oncallProjectName?.trim() || "",
        oncall_contact: data.oncallContact.trim(),
        job_owner_name: data.ownerEmail.trim(),
        l3_owner_name: data.l3OwnerEmail.trim(),
        l2_owner_name: data.l2OwnerEmail.trim(),
        support_team_dl: data.supportTeamDl.trim(),
        oncall_name: data.oncallContact.trim(),
        oncall_flag: true,
        job_description: data.jobDescription?.trim() || "No description available.",
        is_proxy: data.isProxy,
        sla_policies: data.slaPolicies,
        proxy_rules: data.proxyRules,
        artifact_definitions: data.artifacts,
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

  const reset = () => {
    rhfReset(DEFAULT_VALUES);
    setStep(0);
    setSubmitError("");
    setSkippedSteps(new Set());
    setSuccess(null);
    setShowConfirm(false);
  };

  const fetchTriggerSla = async (jobId: number) => {
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
      /* silently fail */
    }
  };

  return {
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
    canAdvance,
    handleNext,
    handleSubmit,
    reset,
    fetchTriggerSla,
    INITIAL_FORM: DEFAULT_VALUES as unknown as JobFormData,
    /** True after user clicked "Next" and validation failed — forces all errors to show */
    stepAttempted,
    // Expose for manual field-level validation in child components (onBlur)
    triggerValidation,
  };
}
