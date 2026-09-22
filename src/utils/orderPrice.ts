/**
 * Converts a user/document price to a positive numeric unit price.
 * A missing, malformed, or zero price is intentionally rejected.
 */
export function parsePositiveUnitPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  let normalized = String(value).trim().replace(/^R\$\s*/i, "");
  if (!normalized) return null;

  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
