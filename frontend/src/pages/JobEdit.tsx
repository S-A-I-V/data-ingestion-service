/**
 * JobEdit — Edit existing job with left sidebar step progress.
 *
 * Layout: LangfuseSidebar | Vertical Steps | Main Content
 *
 * Steps:
 *   0. Select Job (search)
 *   1. Edit Details (ownership & support)
 *   2. SLA & Proxy
 *   3. Artifacts
 *   4. Preview Changes
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import api from "../api";
import Highlight from "../components/ui/Highlight";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import StepJobDefinition from "../components/job-onboarding/StepJobDefinition";
import StepSlaProxy from "../components/job-onboarding/StepSlaProxy";
import StepArtifacts from "../components/job-onboarding/StepArtifacts";
import SearchableSelect from "../components/job-onboarding/SearchableSelect";
import { useToast, Toast } from "../components/ui";
import type { JobFormData, JobFormErrors, TriggerJob } from "../types/jobOnboarding";

const STEPS = [
  { label: "Select Job", desc: "Search & choose" },
  { label: "Edit Details", desc: "Ownership & support" },
  { label: "SLA & Proxy", desc: "Policies or trigger" },
  { label: "Artifacts", desc: "Output files" },
  { label: "Preview", desc: "Review & apply" },
];

export default function JobEdit() {
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

  if (success) {
    return (
      <div className="container audit-container">
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
                setSuccess("");
                setStep(0);
              }}
            >
              Edit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-layout" style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr" }}>
      {/* Left sidebar — steps only */}
      <aside className="lf-sidebar-left">
        <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="sidebar-card-title">
              <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900">
                Steps
              </h2>
            </div>
            <div className="step-progress-vertical" style={{ flex: 1 }}>
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`step-v-item${i === step ? " active" : ""}${i < step ? " done" : ""}`}
                  onClick={() => {
                    if (i <= step) setStep(i);
                  }}
                  role="button"
                  tabIndex={i <= step ? 0 : -1}
                >
                  <div className="step-v-circle">{i < step ? "✓" : <span>{i + 1}</span>}</div>
                  <div className="step-v-label">
                    <span className="step-v-title">{s.label}</span>
                    <span className="step-v-desc">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lf-main">
        <div style={{ width: "100%" }}>
          <div className="toolbar">
            <button className="btn btn-sm btn--ghost" onClick={() => navigate("/admin/job-onboarding")}>
              <ArrowBackIcon sx={{ fontSize: 14 }} /> Back to Job Onboarding Admin
            </button>
            <span className="toolbar-title">
              <Highlight>{step === 0 ? "Edit Existing Job" : `Editing: ${form.jobName}`}</Highlight>
              {step === 0 && (
                <span className="toolbar-subtitle">— Start typing to search and select a job for editing.</span>
              )}
            </span>
            <div style={{ flex: 1 }} />
            {step > 0 && (
              <button className="btn btn-sm btn-danger" onClick={() => setStep(0)} style={{ marginRight: 8 }}>
                Start Over
              </button>
            )}
            {step > 0 && (
              <button className="btn btn-sm" onClick={() => setStep(step - 1)}>
                ← Previous
              </button>
            )}
            {step > 0 && step < 4 && (
              <button className="btn btn-sm" onClick={() => setStep(step + 1)} style={{ marginLeft: 8 }}>
                Next →
              </button>
            )}
            {step === 4 && (
              <button className="btn btn-sm" onClick={() => setShowConfirm(true)} style={{ marginLeft: 8 }}>
                Apply Changes
              </button>
            )}
          </div>

          {/* Step 0: Select */}
          {step === 0 && (
            <div style={{ margin: "40px 0" }}>
              <SearchableSelect
                options={jobs.map((j) => ({ value: String(j.job_id), label: j.job_name }))}
                value=""
                onChange={selectJob}
                placeholder="Type to search jobs..."
                loading={loadingJobs}
              />
            </div>
          )}

          {/* Step 1: Edit Details */}
          {step === 1 &&
            (loadingDetails ? (
              <p style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading job details...</p>
            ) : (
              <StepJobDefinition
                form={form}
                errors={errors}
                onChange={(f, v) => updateField(f, v)}
                onValidate={setFieldError}
              />
            ))}

          {/* Step 2: SLA & Proxy */}
          {step === 2 && (
            <StepSlaProxy
              isProxy={form.isProxy}
              onToggleProxy={(v) => updateField("isProxy", v)}
              slaPolicies={form.slaPolicies}
              onSlaPoliciesChange={(p) => updateField("slaPolicies", p)}
              proxyRules={form.proxyRules}
              onProxyRulesChange={(r) => updateField("proxyRules", r)}
              triggerJobs={triggerJobs}
            />
          )}

          {/* Step 3: Artifacts */}
          {step === 3 && (
            <StepArtifacts artifacts={form.artifacts} onArtifactsChange={(a) => updateField("artifacts", a)} />
          )}

          {/* Step 4: Preview */}
          {step === 4 && (
            <div className="onboarding-step-content">
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Changes to Apply</h4>
              <div className="preview-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Current</th>
                      <th>New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.ownerEmail !== (originalData as any)?.owner_email && (
                      <tr>
                        <td>Owner Email</td>
                        <td>{(originalData as any)?.owner_email}</td>
                        <td>
                          <strong>{form.ownerEmail}</strong>
                        </td>
                      </tr>
                    )}
                    {form.l2OwnerEmail !== (originalData as any)?.l2_owner_name && (
                      <tr>
                        <td>L2 Owner</td>
                        <td>{(originalData as any)?.l2_owner_name}</td>
                        <td>
                          <strong>{form.l2OwnerEmail}</strong>
                        </td>
                      </tr>
                    )}
                    {form.l3OwnerEmail !== (originalData as any)?.l3_owner_name && (
                      <tr>
                        <td>L3 Owner</td>
                        <td>{(originalData as any)?.l3_owner_name}</td>
                        <td>
                          <strong>{form.l3OwnerEmail}</strong>
                        </td>
                      </tr>
                    )}
                    {form.oncallContact !== (originalData as any)?.oncall_contact && (
                      <tr>
                        <td>On-Call</td>
                        <td>{(originalData as any)?.oncall_contact}</td>
                        <td>
                          <strong>{form.oncallContact}</strong>
                        </td>
                      </tr>
                    )}
                    {form.supportTeamDl !== (originalData as any)?.support_team_dl && (
                      <tr>
                        <td>Support DL</td>
                        <td>{(originalData as any)?.support_team_dl}</td>
                        <td>
                          <strong>{form.supportTeamDl}</strong>
                        </td>
                      </tr>
                    )}
                    {form.jobDescription !== (originalData as any)?.job_description && (
                      <tr>
                        <td>Description</td>
                        <td>{(originalData as any)?.job_description?.slice(0, 40)}</td>
                        <td>
                          <strong>{form.jobDescription.slice(0, 40)}</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {form.ownerEmail === (originalData as any)?.owner_email &&
                form.l2OwnerEmail === (originalData as any)?.l2_owner_name &&
                form.l3OwnerEmail === (originalData as any)?.l3_owner_name &&
                form.oncallContact === (originalData as any)?.oncall_contact &&
                form.supportTeamDl === (originalData as any)?.support_team_dl &&
                form.jobDescription === (originalData as any)?.job_description && (
                  <div style={{ textAlign: "center", padding: "48px 24px" }}>
                    <CheckCircleIcon sx={{ fontSize: 36, color: "var(--success)", marginBottom: 1 }} />
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No changes detected</h4>
                    <p className="onboarding-hint" style={{ margin: 0 }}>
                      Go back and modify fields to see a diff here.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </main>

      {showConfirm && (
        <ConfirmDialog
          open={showConfirm}
          title="Apply Changes?"
          message={`Update job "${form.jobName}" in NFC Prod. This is permanent.`}
          confirmLabel="Confirm"
          loading={saving}
          onConfirm={handleSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
