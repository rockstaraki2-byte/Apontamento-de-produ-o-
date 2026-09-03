import type { User } from "../types";

export function isRetratilMechanism(name?: string): boolean {
  const normalized = (name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\bmecanismo\s+retratil\b/.test(normalized);
}

export function restrictToRetratilMechanisms(tenantId: string, user: Pick<User, "id" | "role">, sectorNames: string[]): boolean {
  if (tenantId !== "imperio") return false;
  return user.role === "MONTAGEM_RETRATIL" ||
    /^montagem[ _-]retratil(?:[.@]|$)/i.test(user.id) ||
    sectorNames.some((name) => /retratil/i.test(name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
}
