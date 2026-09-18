import { getServerDb, collection, getDocs, writeBatch } from "../server_firebase";

const RETIRED_TENANT_IDS = new Set(["cyrnedecor", "cirnedecor"]);

const normalize = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

function isCyrneTenant(idValue: unknown, nameValue: unknown) {
  const id = normalize(idValue);
  const name = normalize(nameValue);
  return (
    RETIRED_TENANT_IDS.has(id) ||
    name.includes("cyrne decor") ||
    name.includes("cirne decor")
  );
}

export default async function handler(req: any, res: any) {
  try {
    const db = getServerDb();
    const [usersSnap, tenantsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "tenants")),
    ]);

    const tenantMatches: Array<{ id: string; name: string }> = [];
    const userMatches: Array<{ id: string; name: string; tenantId: string }> = [];

    tenantsSnap.forEach((tenantDoc: any) => {
      const tenant = tenantDoc.data() || {};
      if (isCyrneTenant(tenantDoc.id || tenant.id, tenant.name)) {
        tenantMatches.push({ id: tenantDoc.id, name: String(tenant.name || "") });
      }
    });

    usersSnap.forEach((userDoc: any) => {
      const user = userDoc.data() || {};
      const tenantId = normalize(user.tenantId || user.companyId);
      const userId = normalize(userDoc.id);
      const userName = normalize(user.name);

      const belongsToCyrne =
        RETIRED_TENANT_IDS.has(tenantId) ||
        userId.includes("cyrnedecor") ||
        userId.includes("cirnedecor") ||
        userName.includes("cyrne decor") ||
        userName.includes("cirne decor");

      if (belongsToCyrne) {
        userMatches.push({
          id: userDoc.id,
          name: String(user.name || ""),
          tenantId: String(user.tenantId || user.companyId || ""),
        });
      }
    });

    const allTenants: Array<{ id: string; name: string }> = [];
    tenantsSnap.forEach((tenantDoc: any) => {
      const tenant = tenantDoc.data() || {};
      allTenants.push({ id: tenantDoc.id, name: String(tenant.name || "") });
    });

    if (String(req.query?.confirm || "") !== "remover-cyrne-decor-agora") {
      return res.status(200).json({
        success: true,
        mode: "preview",
        tenantMatches,
        userMatches,
        allTenants,
        tenantMatchCount: tenantMatches.length,
        userMatchCount: userMatches.length,
      });
    }

    const batch = writeBatch(db);

    usersSnap.forEach((userDoc: any) => {
      const user = userDoc.data() || {};
      const tenantId = normalize(user.tenantId || user.companyId);
      const userId = normalize(userDoc.id);
      const userName = normalize(user.name);

      if (
        RETIRED_TENANT_IDS.has(tenantId) ||
        userId.includes("cyrnedecor") ||
        userId.includes("cirnedecor") ||
        userName.includes("cyrne decor") ||
        userName.includes("cirne decor")
      ) {
        batch.delete(userDoc.ref);
      }
    });

    tenantsSnap.forEach((tenantDoc: any) => {
      const tenant = tenantDoc.data() || {};
      if (isCyrneTenant(tenantDoc.id || tenant.id, tenant.name)) {
        batch.delete(tenantDoc.ref);
      }
    });

    if (tenantMatches.length || userMatches.length) {
      await batch.commit();
    }

    return res.status(200).json({
      success: true,
      mode: "deleted",
      deletedTenants: tenantMatches.map((x) => x.id),
      deletedUsers: userMatches.map((x) => x.id),
      deletedTenantCount: tenantMatches.length,
      deletedUserCount: userMatches.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || String(error),
    });
  }
}
