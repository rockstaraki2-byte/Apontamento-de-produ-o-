import type { User } from "./types";

const TORNO_WILLIAN_LOGIN = /^torno_cnc_willia[mn](\.imperio)?$/i;

/** Keeps the historical Willian account reachable when someone types William. */
export function getLoginIdentifierCandidates(identifier: string): string[] {
  const normalized = identifier.trim().toLowerCase();
  const candidates = new Set([normalized]);
  if (TORNO_WILLIAN_LOGIN.test(normalized)) {
    candidates.add(normalized.replace(/m(?=\.imperio$|$)/i, "n"));
    candidates.add(normalized.replace(/n(?=\.imperio$|$)/i, "m"));
  }
  return Array.from(candidates);
}

export function isImperioTornoWillianUser(user: Pick<User, "id" | "role" | "tenantId">): boolean {
  const tenantId = user.tenantId || "imperio";
  const id = String(user.id || "").trim().toLowerCase();
  return tenantId === "imperio" && TORNO_WILLIAN_LOGIN.test(id);
}

export function normalizeTornoWillianUser<T extends User>(user: T): T {
  if (!isImperioTornoWillianUser(user)) return user;

  const role = String(user.role || "").trim().toUpperCase();
  if (role === "ADMIN" || role === "GERENCIA") return user;
  return { ...user, role: "TORNO_CNC_WILLIAN", tenantId: "imperio" } as T;
}
