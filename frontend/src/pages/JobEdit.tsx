/**
 * JobEdit — Edit existing job with left sidebar step progress.
 */

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Highlight from "../components/ui/Highlight";
import ConfirmDialog from "../components/onboarding/ConfirmDialog";
import StepJobDefinition from "../components/job-onboarding/StepJobDefinition";
import StepSlaProxy from "../components/job-onboarding/StepSlaProxy";
import StepArtifacts from "../components/job-onboarding/StepArtifacts";
import SearchableSelect from "../components/job-onboarding/SearchableSelect";
import { Toast } from "../components/ui";
import { useJobEdit } from "../hooks/useJobEdit";

const STEPS = [
  { label: "Select Job", desc: "Search & choose" },
  { label: "Edit Details", desc: "Ownership & support" },
  { label: "SLA & Proxy", desc: "Policies or trigger" },
  { label: "Artifacts", desc: "Output files" },
  { label: "Preview", desc: "Review & apply" },
];

export default function JobEdit() {
  const {
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
  } = useJobEdit();

  // ── Success State ──────────────────────────────────────────────────────────
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
      {/* Left sidebar */}
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
              showSlaBelowProxy
            />
          )}

          {/* Step 3: Artifacts */}
          {step === 3 && (
            <StepArtifacts artifacts={form.artifacts} onArtifactsChange={(a) => updateField("artifacts", a)} />
          )}

          {/* Step 4: Preview */}
          {step === 4 && <JobEditPreview form={form} originalData={originalData} />}
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

// ── Preview Section ──────────────────────────────────────────────────────────

function JobEditPreview({ form, originalData }: { form: any; originalData: any }) {
  const o = originalData as any;
  const changes = [
    {
      field: "Owner Email",
      current: o?.owner_email,
      next: form.ownerEmail,
      changed: form.ownerEmail !== o?.owner_email,
    },
    {
      field: "L2 Owner",
      current: o?.l2_owner_name,
      next: form.l2OwnerEmail,
      changed: form.l2OwnerEmail !== o?.l2_owner_name,
    },
    {
      field: "L3 Owner",
      current: o?.l3_owner_name,
      next: form.l3OwnerEmail,
      changed: form.l3OwnerEmail !== o?.l3_owner_name,
    },
    {
      field: "On-Call",
      current: o?.oncall_contact,
      next: form.oncallContact,
      changed: form.oncallContact !== o?.oncall_contact,
    },
    {
      field: "Support DL",
      current: o?.support_team_dl,
      next: form.supportTeamDl,
      changed: form.supportTeamDl !== o?.support_team_dl,
    },
    {
      field: "Description",
      current: o?.job_description?.slice(0, 40),
      next: form.jobDescription.slice(0, 40),
      changed: form.jobDescription !== o?.job_description,
    },
  ].filter((c) => c.changed);

  if (changes.length === 0) {
    return (
      <div className="onboarding-step-content" style={{ textAlign: "center", padding: "48px 24px" }}>
        <CheckCircleIcon sx={{ fontSize: 36, color: "var(--success)", marginBottom: 1 }} />
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No changes detected</h4>
        <p className="onboarding-hint" style={{ margin: 0 }}>
          Go back and modify fields to see a diff here.
        </p>
      </div>
    );
  }

  return (
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
            {changes.map((c) => (
              <tr key={c.field}>
                <td>{c.field}</td>
                <td>{c.current}</td>
                <td>
                  <strong>{c.next}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
