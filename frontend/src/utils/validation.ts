/**
 * Reusable input validation utilities.
 * Returns null if valid, or an error message string if invalid.
 */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const MAX_EMAIL_LENGTH = 254;
const MAX_BEID = 2_147_483_647;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required";
  if (trimmed.length > MAX_EMAIL_LENGTH) return "Email exceeds maximum length (254 chars)";
  if (!EMAIL_RE.test(trimmed)) return "Invalid email format";
  return null;
}

export function validatePositiveInt(value: string, label = "Value"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  // Support comma-separated values
  const parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return `${label} is required`;
  if (parts.length > 50) return `Maximum 50 ${label}s per request`;
  for (const part of parts) {
    const num = Number(part);
    if (!Number.isFinite(num) || !Number.isInteger(num)) return `Invalid ${label}: "${part}" is not an integer`;
    if (num <= 0) return `Invalid ${label}: "${part}" must be positive`;
    if (num > MAX_BEID) return `Invalid ${label}: "${part}" is out of range`;
  }
  return null;
}
