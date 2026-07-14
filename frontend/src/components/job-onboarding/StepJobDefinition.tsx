/**
 * StepJobDefinition — Step 1: Job identity & ownership.
 *
 * Layout:
 *   Row 1: Job Name (full width, required)
 *   Row 2: Description (full width, optional)
 *   Row 3: Owner Email | L2 Email | L3 Email (3-col, all required)
 *   Row 4: On-Call Contact | Support DL | On-Call Project (3-col)
 *
 * Error UX: red border + hover icon tooltip (no layout shifts).
 */

import { useState } from "react";
import type { JobFormData, JobFormErrors } from "../../types/jobOnboarding";
import { EMAIL_REGEX, JOB_NAME_MIN_LENGTH, VALIDATION_MESSAGES } from "../../constants/jobOnboarding";
import ValidatedInput from "./ValidatedInput";

interface Props {
  form: JobFormData;
  errors: JobFormErrors;
  onChange: (field: keyof JobFormData, value: string) => void;
  onValidate: (field: keyof JobFormData, error: string | undefined) => void;
  /** When true, show errors on all fields regardless of touch state (e.g. after "Next" click) */
  showAllErrors?: boolean;
}

const SECTION_BOX: React.CSSProperties = {
  border: "1px dashed var(--border)",
  borderRadius: 0,
  padding: "20px 24px",
  marginBottom: 20,
};
const FIRST_SECTION_TITLE: React.CSSProperties = { margin: "0 0 4px", fontSize: 13, fontWeight: 600 };
const FIELD_LABEL: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
  marginBottom: 6,
};

export default function StepJobDefinition({ form, errors, onChange, onValidate, showAllErrors = false }: Props) {
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const blur = (field: keyof JobFormData) => {
    setTouched((prev) => new Set(prev).add(field));
    let error: string | undefined;

    switch (field) {
      case "jobName":
        if (!form.jobName.trim()) error = VALIDATION_MESSAGES.JOB_NAME_REQUIRED;
        else if (form.jobName.trim().length < JOB_NAME_MIN_LENGTH) error = VALIDATION_MESSAGES.JOB_NAME_TOO_SHORT;
        break;
      case "ownerEmail":
        if (!form.ownerEmail.trim()) error = VALIDATION_MESSAGES.OWNER_EMAIL_REQUIRED;
        else if (!EMAIL_REGEX.test(form.ownerEmail.trim())) error = VALIDATION_MESSAGES.OWNER_EMAIL_INVALID;
        break;
      case "l2OwnerEmail":
        if (!form.l2OwnerEmail.trim()) error = "L2 owner email is required";
        else if (!EMAIL_REGEX.test(form.l2OwnerEmail.trim())) error = VALIDATION_MESSAGES.L2_OWNER_INVALID;
        break;
      case "l3OwnerEmail":
        if (!form.l3OwnerEmail.trim()) error = "L3 owner email is required";
        else if (!EMAIL_REGEX.test(form.l3OwnerEmail.trim())) error = VALIDATION_MESSAGES.L3_OWNER_INVALID;
        break;
      case "oncallContact":
        if (!form.oncallContact.trim()) error = VALIDATION_MESSAGES.ONCALL_CONTACT_REQUIRED;
        else if (!EMAIL_REGEX.test(form.oncallContact.trim())) error = VALIDATION_MESSAGES.ONCALL_CONTACT_INVALID;
        break;
      case "supportTeamDl":
        if (!form.supportTeamDl.trim()) error = "Support team DL is required";
        else if (!EMAIL_REGEX.test(form.supportTeamDl.trim())) error = VALIDATION_MESSAGES.SUPPORT_DL_INVALID;
        break;
    }
    onValidate(field, error);
  };

  const fieldError = (field: keyof JobFormData) => (showAllErrors || touched.has(field) ? errors[field] : undefined);

  return (
    <div className="onboarding-step-content">
      {/* ── Section 1: Job Identity ───────────────────────────────────────── */}
      <div style={SECTION_BOX}>
        <h4 style={FIRST_SECTION_TITLE}>Job Identity</h4>
        <p className="onboarding-hint" style={{ marginTop: 0, marginBottom: 16 }}>
          A unique job name and optional description.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={FIELD_LABEL}>
            Job Name <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <ValidatedInput
            value={form.jobName}
            onChange={(v) => onChange("jobName", v)}
            onBlur={() => blur("jobName")}
            placeholder="e.g. nielsen_raw_data_ingestion"
            error={fieldError("jobName")}
          />
        </div>

        <div>
          <label style={FIELD_LABEL}>Description</label>
          <textarea
            className="onboarding-textarea"
            value={form.jobDescription}
            onChange={(e) => onChange("jobDescription", e.target.value)}
            rows={2}
            placeholder="What this job does and its role in the pipeline"
          />
        </div>
      </div>

      {/* ── Section 2: Ownership & Support ────────────────────────────────── */}
      <div style={SECTION_BOX}>
        <h4 style={FIRST_SECTION_TITLE}>Ownership & Support</h4>
        <p className="onboarding-hint" style={{ marginTop: 0, marginBottom: 16 }}>
          All five contacts are required. Owner, escalation chain (L2/L3), on-call, and support DL.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <div>
            <label style={FIELD_LABEL}>
              Owner Email <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <ValidatedInput
              type="email"
              value={form.ownerEmail}
              onChange={(v) => onChange("ownerEmail", v)}
              onBlur={() => blur("ownerEmail")}
              placeholder="owner@nielsen.com"
              error={fieldError("ownerEmail")}
            />
          </div>
          <div>
            <label style={FIELD_LABEL}>
              L2 Owner Email <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <ValidatedInput
              type="email"
              value={form.l2OwnerEmail}
              onChange={(v) => onChange("l2OwnerEmail", v)}
              onBlur={() => blur("l2OwnerEmail")}
              placeholder="l2@nielsen.com"
              error={fieldError("l2OwnerEmail")}
            />
          </div>
          <div>
            <label style={FIELD_LABEL}>
              L3 Owner Email <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <ValidatedInput
              type="email"
              value={form.l3OwnerEmail}
              onChange={(v) => onChange("l3OwnerEmail", v)}
              onBlur={() => blur("l3OwnerEmail")}
              placeholder="l3@nielsen.com"
              error={fieldError("l3OwnerEmail")}
            />
          </div>
          <div>
            <label style={FIELD_LABEL}>
              On-Call Contact <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <ValidatedInput
              type="email"
              value={form.oncallContact}
              onChange={(v) => onChange("oncallContact", v)}
              onBlur={() => blur("oncallContact")}
              placeholder="oncall@nielsen.com"
              error={fieldError("oncallContact")}
            />
          </div>
          <div>
            <label style={FIELD_LABEL}>
              Support Team DL <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <ValidatedInput
              type="email"
              value={form.supportTeamDl}
              onChange={(v) => onChange("supportTeamDl", v)}
              onBlur={() => blur("supportTeamDl")}
              placeholder="support-dl@nielsen.com"
              error={fieldError("supportTeamDl")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
