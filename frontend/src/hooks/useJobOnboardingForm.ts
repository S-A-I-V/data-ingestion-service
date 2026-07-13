/**
 * useJobOnboardingForm — Custom hook for job onboarding wizard state & logic.
 *
 * Manages: form data, errors, validation, trigger jobs fetch, submit, toast, step navigation.
 */

import { useState, useEffect } from "react";
import api from "../api";
import { useToast } from "../components/ui";
import { EMAIL_REGEX, JOB_NAME_MIN_LENGTH } from "../constants/jobOnboarding";
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

export default function useJobOnboardingForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<JobFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [triggerJobs, setTriggerJobs] = useState<TriggerJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useToast();

  useEffect(() => {
    api
      .get("/admin/job-onboarding/trigger-jobs")
      .then((r) => setTriggerJobs(r.data.jobs || []))
      .catch(() => {});
  }, []);

  const updateField = (field: keyof JobFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setFieldError = (field: keyof JobFormData, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

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

  const validateStep1 = (): boolean => {
    if (form.isProxy && form.proxyRules.length === 0) return false;
    if (!form.isProxy) return form.slaPolicies.length > 0;
    return true;
  };

  const canAdvance = (): boolean => {
    if (step === 0) {
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

  const showToast = (msg: string) => setToast({ ok: false, msg });

  const handleNext = () => {
    if (step === 0 && !validateStep0()) {
      showToast("Please fill all required fields before proceeding.");
      return;
    }
    if (step === 1 && !validateStep1()) {
      showToast(form.isProxy ? "Add at least one proxy rule with a trigger job." : "Add at least one SLA policy.");
      return;
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

  const reset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
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
    INITIAL_FORM,
  };
}
