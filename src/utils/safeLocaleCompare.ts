/** Compare persisted labels even when older records contain missing or non-string values. */
export function compareSafeLocaleText(
  left: unknown,
  right: unknown,
  options?: Intl.CollatorOptions,
): number {
  return String(left ?? "").localeCompare(String(right ?? ""), "pt-BR", options);
}
