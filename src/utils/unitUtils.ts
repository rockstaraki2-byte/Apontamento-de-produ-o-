export function getItemUnit(
  item?: { unit?: string; name?: string; code?: string; notes?: string } | null,
  order?: { unit?: string; variation?: string; color?: string; notes?: string } | null
): string {
  const explicitUnit = (item?.unit || order?.unit || "").trim().toUpperCase();
  if (explicitUnit === "PAR" || explicitUnit === "PARES" || explicitUnit === "PR") {
    return "PAR";
  }
  if (explicitUnit && explicitUnit !== "UN" && explicitUnit !== "UNIDADE") {
    return explicitUnit;
  }

  const textToCheck = [
    item?.name,
    item?.code,
    item?.notes,
    order?.variation,
    order?.color,
    order?.notes
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
