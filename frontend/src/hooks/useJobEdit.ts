/**
 * useJobEdit — Custom hook for the JobEdit page.
 * Encapsulates all state, data loading, form handling, and save logic.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useToast } from "../components/ui";
import type { JobFormData, JobFormErrors, TriggerJob } from "../types/jobOnboarding";

export function useJobEdit() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [jobs, setJobs] = useState<{ job_id: number; job_name: string }[]>([]);
  const [triggerJobs, setTriggerJobs] = useState<TriggerJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobId, setJobId] = useState(0);
  const [originalData, setOriginalData] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<JobFormData>({
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
  });
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useToast();
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load jobs and trigger jobs on mount
  useEffect(() => {
    api
      .get("/admin/job-onboarding/jobs")
      .then((r) => setJobs(r.data.jobs?.map((j: any) => ({ job_id: j.job_id, job_name: j.job_name })) || []))
      .finally(() => setLoadingJobs(false));
    api
      .get("/admin/job-onboarding/trigger-jobs")
      .then((r) => setTriggerJobs(r.data.jobs || []))
      .catch(() => {});
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const selectJob = async (jobIdStr: string) => {
    const id = Number(jobIdStr);
    if (!id) return;
    setStep(1);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/admin/job-onboarding/jobs/${id}`);
      const d = res.data;
      setJobId(id);
      setOriginalData(d);
      setForm({
        jobName: d.job_name || "",
        ownerEmail: d.owner_email || "",
        oncallProjectName: d.oncall_project_name || "",
        oncallContact: d.oncall_contact || "",
        l3OwnerEmail: d.l3_owner_name || "",
        l2OwnerEmail: d.l2_owner_name || "",
        supportTeamDl: d.support_team_dl || "",
        jobDescription: d.job_description || "",
        isProxy: d.is_proxy || false,
        slaPolicies: d.sla_policies || [],
        proxyRules: d.proxy_rules || [],
        artifacts: d.artifact_definitions || [],
      });
    } catch {
      setToast({ ok: false, msg: "Failed to load job details" });
      setStep(0);
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateField = (field: keyof JobFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setFieldError = (field: keyof JobFormData, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { job_id: jobId };
      const o = originalData as any;
      if (form.ownerEmail !== o?.owner_email) payload.owner_email = form.ownerEmail.trim();
      if (form.oncallContact !== o?.oncall_contact) payload.oncall_contact = form.oncallContact.trim();
      if (form.l2OwnerEmail !== o?.l2_owner_name) payload.l2_owner_name = form.l2OwnerEmail.trim();
      if (form.l3OwnerEmail !== o?.l3_owner_name) payload.l3_owner_name = form.l3OwnerEmail.trim();
      if (form.supportTeamDl !== o?.support_team_dl) payload.support_team_dl = form.supportTeamDl.trim();
      if (form.jobDescription !== o?.job_description) payload.job_description = form.jobDescription.trim();
      const res = await api.put("/admin/job-onboarding/update", payload);
      if (res.data.success) setSuccess(`Job "${form.jobName}" updated — ${res.data.executed} change(s).`);
    } catch (err: unknown) {
      setToast({ ok: false, msg: (err as any)?.response?.data?.detail || "Update failed" });
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  return {
    navigate,
    toast,
    step,
    setStep,
    jobs,
    triggerJobs,
    loadingJobs,
    form,
    errors,
    originalData,
    saving,
    success,
    setSuccess,
    showConfirm,
    setShowConfirm,
    loadingDetails,
    selectJob,
    updateField,
    setFieldError,
    handleSave,
  };
}
