import type { TekSystemSyncPayload, TekSystemEntityType } from "../api/_lib/teksystemSync.js";

export interface SyncState {
  lastSuccessfulWatermark?: string;
  lastSuccessfulRunId?: string;
}

export const ENTITY_NAMES: TekSystemEntityType[] = ["clientes", "produtos", "pedidos", "faturamentos", "romaneios"];
export const MAX_RECORDS_PER_REQUEST = 1000;

export function splitPayload(
  payload: TekSystemSyncPayload,
  maxRecords = MAX_RECORDS_PER_REQUEST,
): TekSystemSyncPayload[] {
  if (!Number.isInteger(maxRecords) || maxRecords < 1) throw new Error("maxRecords deve ser um inteiro positivo.");
  const entities = payload.entities || {};
  const records = ENTITY_NAMES.flatMap((entity) =>
    (entities[entity] || []).map((row) => ({ entity, row })),
  );
  if (!records.length) return [{ ...payload, entities: Object.fromEntries(ENTITY_NAMES.map((name) => [name, []])) }];

  const chunks: TekSystemSyncPayload[] = [];
  for (let offset = 0; offset < records.length; offset += maxRecords) {
    const chunk = records.slice(offset, offset + maxRecords);
    const chunkEntities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, [] as unknown[]])) as Record<TekSystemEntityType, unknown[]>;
    for (const { entity, row } of chunk) chunkEntities[entity].push(row);
    chunks.push({ ...payload, entities: chunkEntities });
  }
  return chunks;
}

export function makeSince(
  state: SyncState,
  now: Date,
  initialLookbackHours: number,
  overlapMinutes: number,
): Date {
  const previous = state.lastSuccessfulWatermark ? new Date(state.lastSuccessfulWatermark) : undefined;
  const base = previous && !Number.isNaN(previous.getTime())
    ? previous
    : new Date(now.getTime() - initialLookbackHours * 60 * 60 * 1000);
  return new Date(base.getTime() - overlapMinutes * 60 * 1000);
}
