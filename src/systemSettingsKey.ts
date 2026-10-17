/**
 * Keeps legacy Império system-setting document ids stable while giving every
 * other tenant a separate Firestore document namespace.
 */
export function systemSettingsDocumentId(tenantId: string, logicalId: string): string {
  const tenantKey = String(tenantId || "").trim().toLowerCase();
  const settingKey = String(logicalId || "default").trim();

  if (!tenantKey || tenantKey === "global") {
    throw new Error("A tenant operacional é obrigatório para salvar configurações.");
  }
  if (!settingKey || settingKey.includes("/")) {
    throw new Error("Identificador de configuração inválido.");
  }

  return tenantKey === "imperio" ? settingKey : `tenant_${tenantKey}__${settingKey}`;
}
