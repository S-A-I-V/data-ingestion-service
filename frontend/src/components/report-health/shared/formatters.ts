/**
 * Shared formatting helpers for the Report Health feature.
 * All timestamps are rendered in UTC — no locale conversion.
 */

/** Format a UTC timestamp as "22 Jun, 19:30" */
export function fmt(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const day = d.getUTCDate();
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon}, ${hh}:${mm}`;
}

/** Format minutes as "Xh Ym" or "Ym" */
export function fmtMins(m: number | null | undefined): string {
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

/** Get today's date as ISO string (YYYY-MM-DD) */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format ISO date "2026-06-30" as "30/06/2026" */
export function fmtDateDmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
