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
  const num = Number(trimmed);
  if (!Number.isFinite(num) || !Number.isInteger(num)) return `${label} must be an integer`;
  if (num <= 0) return `${label} must be a positive integer`;
  if (num > MAX_BEID) return `${label} is out of range`;
  return null;
}
