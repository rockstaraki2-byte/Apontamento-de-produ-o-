export interface StockAvailabilityRecord {
  quantity?: unknown;
  reservedQuantity?: unknown;
  planningReservedQuantity?: unknown;
}

function nonNegativeQuantity(value: unknown): number {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
}

export function getPlanningReservedQuantity(stock: StockAvailabilityRecord | null | undefined): number {
  return nonNegativeQuantity(stock?.planningReservedQuantity);
}

export function getAvailableQuantityAfterPlanningReservations(
  stock: StockAvailabilityRecord | null | undefined,
): number {
  const physical = nonNegativeQuantity(stock?.quantity);
  return Math.max(0, physical - getPlanningReservedQuantity(stock));
}

export function getAvailableQuantityAfterAllReservations(
  stock: StockAvailabilityRecord | null | undefined,
): number {
  const physical = nonNegativeQuantity(stock?.quantity);
  const salesReserved = nonNegativeQuantity(stock?.reservedQuantity);
  return Math.max(0, physical - salesReserved - getPlanningReservedQuantity(stock));
}

export function exceedsPlanningReservation(
  stock: StockAvailabilityRecord | null | undefined,
  outgoingQuantity: number,
): boolean {
  const physical = Number(stock?.quantity);
  const outgoing = Number(outgoingQuantity);
  if (!Number.isFinite(physical) || !Number.isFinite(outgoing) || outgoing < 0) return true;
  return physical - outgoing + 0.0001 < getPlanningReservedQuantity(stock);
}

export function exceedsReservationCapacity(
  stock: StockAvailabilityRecord | null | undefined,
  additionalReservedQuantity: number,
): boolean {
  const physical = Number(stock?.quantity);
  const reserved = nonNegativeQuantity(stock?.reservedQuantity);
  const additional = Number(additionalReservedQuantity);
  if (!Number.isFinite(physical) || !Number.isFinite(additional) || additional < 0) return true;
  return reserved + getPlanningReservedQuantity(stock) + additional > physical + 0.0001;
}

export function planningReservationWarning(stock: StockAvailabilityRecord | null | undefined): string {
  const reserved = getPlanningReservedQuantity(stock);
  return `A operação não pode consumir esse saldo: ${reserved} unidade(s) estão reservadas para lotes de produção.`;
}
