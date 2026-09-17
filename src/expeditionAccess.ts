import type { User } from "./types";

const normalize = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function canManageExpedition(
  activeTenantId: string | undefined,
  user: User | null | undefined,
): boolean {
  if (!user || activeTenantId !== "imperio") return false;

  const id = normalize(user.id);
  const name = normalize(user.name);

  if (id === "raul") return true;

  const explicitIds = new Set([
    "gerencia",
    "gerencia.imperio",
    "pcp",
    "pcp.imperio",
    "dinei",
    "encarregado_dinei",
    "encarregado.dinei",
    "romario",
    "romario.imperio",
  ]);

  if (explicitIds.has(id)) return true;
  if (user.role === "ENCARREGADO" && name.includes("dinei")) return true;
  if (name.includes("romario") && user.tenantId === "imperio") return true;
  if (name.includes("gerencia") && user.tenantId === "imperio") return true;

  return false;
}

export function canViewExpeditionTV(
  activeTenantId: string | undefined,
  user: User | null | undefined,
): boolean {
  if (!user || activeTenantId !== "imperio") return false;
  return canManageExpedition(activeTenantId, user) || user.role === "EMBALAGEM";
}
