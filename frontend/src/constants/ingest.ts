/**
 * Constants for the Data Ingestion page.
 */

/** Duration a status message stays visible before auto-dismissing (ms) */
export const STATUS_AUTO_DISMISS_MS = 8000;

/** Database operations available for ingestion */
export const INGESTION_OPERATIONS = {
  INSERT: "INSERT",
  INSERT_SKIP: "INSERT_SKIP",
  UPDATE: "UPDATE",
  UPSERT: "UPSERT",
} as const;

/** Labels displayed for each operation in the dropdown */
export const OPERATION_LABELS: Record<string, string> = {
  [INGESTION_OPERATIONS.INSERT]: "INSERT",
  [INGESTION_OPERATIONS.INSERT_SKIP]: "INSERT (Skip Duplicates)",
  [INGESTION_OPERATIONS.UPDATE]: "UPDATE",
  [INGESTION_OPERATIONS.UPSERT]: "UPSERT",
};

/** Placeholder value used for "none selected" in Select components */
export const SELECT_NONE_VALUE = "__none__";

/** Placeholder value used for "skip column" in mapping */
export const SKIP_COLUMN_VALUE = "__skip__";

/** Number of sample rows sent to AI analysis */
export const AI_SAMPLE_ROW_COUNT = 3;
