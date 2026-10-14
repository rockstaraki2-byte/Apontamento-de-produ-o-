import type { TekSystemSyncPayload, TekSystemEntityType } from "../api/_lib/teksystemSync.js";

export interface SyncState {
  lastSuccessfulWatermark?: string;
  lastSuccessfulRunId?: string;
  pipelineVersion?: number;
  billingHistorySnapshotVersion?: number;
  billingRepresentativeHistorySnapshotVersion?: number;
}

export const ENTITY_NAMES: TekSystemEntityType[] = ["clientes", "produtos", "pedidos", "faturamentos", "romaneios", "faturamentoDiario", "faturamentoPorRepresentante"];
export const MAX_RECORDS_PER_REQUEST = 250;

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

  if (payload.source?.readerVersion === 2 && payload.source.completeOrderSnapshots) {
    const groups = new Map<string, typeof records>();
    for (const record of records) {
      const row = record.row as Record<string, any>;
      const get = (name: string) => String(row[Object.keys(row).find((key) => key.toLowerCase() === name.toLowerCase()) || name] ?? "");
      const key = record.entity === "pedidos" || record.entity === "romaneios"
        ? `pedido:${get("codigoPedido")}`
        : record.entity === "produtos" ? `produto:${get("codigo").replace(/\..*$/, "")}`
        : record.entity === "faturamentoDiario" ? `faturamento-diario:${get("monthKey")}`
        : `${record.entity}:${get("externalId") || get("codigo")}`;
      groups.set(key, [...(groups.get(key) || []), record]);
    }
    const result: TekSystemSyncPayload[] = [];
    let page: typeof records = [];
    let bytes = 0;
    const emit = () => {
      if (!page.length) return;
      const chunkEntities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, [] as unknown[]])) as Record<TekSystemEntityType, unknown[]>;
      for (const record of page) chunkEntities[record.entity].push(record.row);
      result.push({ ...payload, entities: chunkEntities });
      page = []; bytes = 0;
    };
    for (const [key, group] of groups) {
      const size = Buffer.byteLength(JSON.stringify(group));
      if (group.length > maxRecords || size > 3_000_000) throw new Error(`Snapshot ${key} excede o limite seguro; não pode ser dividido.`);
      if (page.length + group.length > maxRecords || bytes + size > 3_000_000) emit();
      page.push(...group); bytes += size;
    }
    emit();
    return result;
  }

  const billingGroups = new Map<string, typeof records>();
  const units: typeof records[] = [];
  for (const record of records) {
    if (record.entity !== "faturamentoDiario") {
      units.push([record]);
      continue;
    }
    const row = record.row as Record<string, unknown>;
    const monthKey = String(row.monthKey || "");
    billingGroups.set(monthKey, [...(billingGroups.get(monthKey) || []), record]);
  }
  units.push(...billingGroups.values());

  const chunks: TekSystemSyncPayload[] = [];
  let page: typeof records = [];
  const emit = () => {
    if (!page.length) return;
    const chunkEntities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, [] as unknown[]])) as Record<TekSystemEntityType, unknown[]>;
    for (const { entity, row } of page) chunkEntities[entity].push(row);
    chunks.push({ ...payload, entities: chunkEntities });
    page = [];
  };
  for (const unit of units) {
    if (unit.length > maxRecords) throw new Error("O resumo de faturamento diário de um mês excede o limite seguro de lote.");
    if (page.length + unit.length > maxRecords) emit();
    page.push(...unit);
  }
  emit();
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
