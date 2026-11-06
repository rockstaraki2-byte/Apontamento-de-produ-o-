import { canManageExpedition } from "../../src/expeditionAccess.js";
import type { User } from "../../src/types.js";
import { requireSession } from "./firebaseAdmin.js";

export async function requireCalendarManager(req: any) {
  const claims = await requireSession(req) as Record<string, any>;
  const tenantId = String(claims.tenantId || "").trim().toLowerCase();
  if (tenantId !== "imperio") throw new Error("FORBIDDEN");

  const user = {
    id: String(claims.uid || claims.userId || ""),
    name: String(claims.name || ""),
    role: String(claims.role || ""),
    tenantId,
  } as User;
  if (!canManageExpedition(tenantId, user)) throw new Error("FORBIDDEN");
  return { claims, tenantId };
}
