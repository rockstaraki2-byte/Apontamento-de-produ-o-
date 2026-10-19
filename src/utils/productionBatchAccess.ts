import type { ProductionBatch, User } from "../types";

export function getAssignableBatchOperators(
  users: User[] | undefined,
  activeTenantId: string | undefined,
): User[] {
  const tenantId = String(activeTenantId || "").trim();
  if (!tenantId || tenantId === "global") return [];

  return (users || []).filter(
    (user) =>
      user.tenantId === tenantId &&
      user.role !== "ADMIN" &&
      user.role !== "GERENCIA" &&
      user.id !== "gerencia",
  );
}

export function getVisibleProductionBatches(
  batches: ProductionBatch[] | undefined,
  currentUser: User | null | undefined,
  activeTenantId: string | undefined,
): ProductionBatch[] {
  const tenantId = String(activeTenantId || "").trim();
  if (
    !currentUser ||
    !tenantId ||
    tenantId === "global" ||
    currentUser.tenantId !== tenantId
  ) {
    return [];
  }

  const tenantBatches = (batches || []).filter(
    (batch) => batch.tenantId === tenantId,
  );

  if (
    currentUser.role === "ADMIN" ||
    currentUser.role === "PCP" ||
    currentUser.role === "GERENCIA" ||
    currentUser.id === "gerencia"
  ) {
    return tenantBatches;
  }

  return tenantBatches.filter((batch) => {
    const isGerenciaBatch = batch.isGerenciaLote === true || batch.sectorId === 999;
    if (!isGerenciaBatch) return true;
    return Array.isArray(batch.assignedOperatorIds) &&
      batch.assignedOperatorIds.includes(currentUser.id);
  });
}
