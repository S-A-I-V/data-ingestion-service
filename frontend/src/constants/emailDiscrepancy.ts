/**
 * Constants for the Email Discrepancy Audit admin panel.
 * Column labels, default sort, and status display config.
 */

/** Column keys returned by the /scan endpoint for email mismatches */
export const MISMATCH_COLUMNS = [
  "associate_id",
  "business_entity_id",
  "first_name",
  "last_name",
  "dmzid",
  "cpr_current_email",
  "nfc_email",
] as const;

/** Column keys returned for NFC users not found in CPR */
export const NOT_ONBOARDED_COLUMNS = [
  "associate_id",
  "business_entity_id",
  "first_name",
  "last_name",
  "nfc_email",
] as const;

/** Human-readable column labels */
export const COLUMN_LABELS: Record<string, string> = {
  associate_id: "Associate ID",
  business_entity_id: "BEID",
  first_name: "First Name",
  last_name: "Last Name",
  dmzid: "DMZID (Onboarded As)",
  cpr_current_email: "CPR Current Email",
  nfc_email: "NFC Email (Current)",
  nfc_updated_at: "NFC Last Updated",
};

/** Status badge labels for the fix-emails verification */
export const FIX_STATUS_LABELS: Record<string, string> = {
  ready: "Ready to Fix",
  not_found: "User Not Found in NFC",
};

/** Maximum fixes allowed per batch (matches backend limit) */
export const MAX_BATCH_FIX_SIZE = 1000;

/** Tab identifiers for the discrepancy panel */
export const TABS = {
  MISMATCHES: "mismatches",
  NOT_ONBOARDED: "not_found_in_cpr",
} as const;
