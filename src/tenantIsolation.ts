export interface TenantScopedRecord {
  tenantId?: string;
  companyId?: string;
}

export function tenantIdMatches(
  recordTenantId: string | undefined | null,
  activeTenantId: string | undefined | null,
): boolean {
  const recordTenant = String(recordTenantId || "").trim();
  const activeTenant = String(activeTenantId || "").trim();
  return activeTenant.length > 0 && activeTenant !== "global" && recordTenant === activeTenant;
}

export function filterTenantRecords<T extends TenantScopedRecord>(
  records: T[],
  activeTenantId: string | undefined | null,
): T[] {
  return records.filter((record) =>
    tenantIdMatches(record.tenantId || record.companyId, activeTenantId),
  );
}

export function tenantScopedCacheKey(collectionName: string, tenantId: string): string {
  return `${collectionName}:${encodeURIComponent(tenantId.trim())}`;
}
