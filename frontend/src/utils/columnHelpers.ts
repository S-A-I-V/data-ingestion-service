import { COLUMN_LABELS, DEFAULT_VISIBLE_COLUMNS } from "../constants/associateLookup";

/**
 * Normalizes to lowercase + trim for matching.
 */
export function getColumnLabel(col: string): string {
  const key = col.trim().toLowerCase();
  return COLUMN_LABELS[key] || col;
}

/**
 * Check if a column is in the default visible set.
 * Case-insensitive + trimmed comparison.
 */
export function isDefaultColumn(col: string): boolean {
  const key = col.trim().toLowerCase();
  return DEFAULT_VISIBLE_COLUMNS.includes(key);
}
