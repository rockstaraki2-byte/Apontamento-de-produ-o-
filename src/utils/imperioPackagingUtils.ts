export function isImperioPackagingUser(
  tenantId: string,
  user: { role?: string },
): boolean {
  return tenantId === "imperio" && user.role === "EMBALAGEM";
}

export function isApprovedPackagingSource(source: {
  status?: string;
  statusQualidade?: string;
  qualityStatus?: string;
  qualidadeAprovada?: boolean;
}): boolean {
  if (source.qualidadeAprovada === true) return true;
  return [source.status, source.statusQualidade, source.qualityStatus].some(
    (status) => String(status || "").trim().toUpperCase() === "APROVADO",
  );
}
