export const MAX_SYNC_QUEUE_ATTEMPTS = 5;
export type SyncQueueStatus = "pending" | "needs_attention";

export function compareQueueStatus(
  statusA: SyncQueueStatus | undefined,
  statusB: SyncQueueStatus | undefined,
): number {
  const rankA = statusA === "needs_attention" ? 1 : 0;
  const rankB = statusB === "needs_attention" ? 1 : 0;
  return rankA - rankB;
}

export function isPermanentSyncQueueError(error: unknown): boolean {
  const code = String((error as { code?: unknown } | null)?.code || "").toLowerCase();
  return code.endsWith("permission-denied") || code.endsWith("unauthenticated");
}

export function shouldParkSyncItem(error: unknown, attempts: number): boolean {
  return isPermanentSyncQueueError(error) || attempts >= MAX_SYNC_QUEUE_ATTEMPTS;
}
