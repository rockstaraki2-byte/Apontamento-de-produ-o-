function normalizeUnit(value?: string | null): string {
  const unit = String(value || "").trim().toUpperCase();
  if (!unit) return "";
  if (unit === "MM" || unit === "CM") return "UN";
  if (unit === "PAR" || unit === "PARES" || unit === "PR") return "PAR";
  if (unit === "UNIDADE" || unit === "UNIDADES") return "UN";
  return unit;
}

export function getItemUnit(
  item?: { unit?: string; name?: string; code?: string; notes?: string } | null,
  order?: { unit?: string; variation?: string; color?: string; notes?: string } | null
): string {
  // When the product exists, its catalog unit is authoritative. Do not let an
  // imported order unit override an empty or legacy product unit.
  const explicitUnit = normalizeUnit(item ? item.unit : order?.unit);
  if (explicitUnit) return explicitUnit;

  const textToCheck = [
    item?.name,
    item?.code,
    item?.notes,
    item ? undefined : order?.variation,
    item ? undefined : order?.color,
    item ? undefined : order?.notes
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  // Match word PAR or PARES or (PAR)
  if (
    /\bPAR(ES)?\b|\(PAR\)/i.test(textToCheck) ||
    textToCheck.includes(" PAR") ||
    textToCheck.includes("PAR ")
  ) {
    return "PAR";
  }

  return "UN";
}
