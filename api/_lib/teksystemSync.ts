import crypto from "node:crypto";

export const TEKSYSTEM_SYNC_SCHEMA_VERSION = 1;
export const DEFAULT_TEKSYSTEM_TENANT_ID = "imperio";

export type TekSystemEntityType = "clientes" | "produtos" | "pedidos" | "faturamentos" | "romaneios" | "faturamentoDiario";

export interface TekSystemSourceInfo {
  readerVersion?: number;
  completeOrderSnapshots?: boolean;
  host?: string;
  serverPort?: number;
  databasePort?: number;
  databasePath?: string;
  protocol?: string;
  companyId?: string | number;
  companyIds?: Array<string | number>;
}

export interface TekSystemSyncPayload {
  schemaVersion?: number;
  syncId?: string;
  origem?: string;
  tenantId?: string;
  solicitadoPor?: string;
  modo?: "snapshot" | "delta";
  generatedAt?: string;
  source?: TekSystemSourceInfo;
  entities?: Partial<Record<TekSystemEntityType, unknown[]>>;
}

export interface NormalizedTekSystemSyncPayload {
  schemaVersion: number;
  syncId: string;
  origem: string;
  tenantId: string;
  solicitadoPor: string;
  modo: "snapshot" | "delta";
  generatedAt: string;
  source: TekSystemSourceInfo;
  entities: Record<TekSystemEntityType, Record<string, unknown>[]>;
  payloadHash: string;
}

export interface TekSystemSyncValidationIssue {
  field: string;
  message: string;
}

export interface TekSystemSyncValidationResult {
  ok: boolean;
  payload: NormalizedTekSystemSyncPayload | null;
  issues: TekSystemSyncValidationIssue[];
  counts: Record<TekSystemEntityType, number>;
}

const ENTITY_TYPES: TekSystemEntityType[] = [
  "clientes",
  "produtos",
  "pedidos",
  "faturamentos",
  "romaneios",
  "faturamentoDiario",
];

function cleanText(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function payloadHash(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function safeExternalId(value: unknown, fallbackIndex: number): string {
  const candidate = cleanText(value);
  return candidate || `linha-${fallbackIndex + 1}`;
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateDailyBillingRows(rows: Record<string, unknown>[], issues: TekSystemSyncValidationIssue[]) {
  if (!rows.length) return;
  const dates = new Set<string>();
  const monthRows = new Map<string, { throughDates: Set<string>; dates: Set<string>; count: number }>();
  rows.forEach((row, index) => {
    const date = row.date;
    const monthKey = row.monthKey;
    const throughDate = row.completeThroughDate;
    const amountCents = row.amountCents;
    const invoiceCount = row.invoiceCount;
    if (!isDateOnly(date)) {
      issues.push({ field: `entities.faturamentoDiario[${index}].date`, message: "Informe uma data válida em YYYY-MM-DD." });
      return;
    }
    if (dates.has(date)) {
      issues.push({ field: `entities.faturamentoDiario[${index}].date`, message: `Data duplicada no resumo: ${date}.` });
    }
    dates.add(date);
    if (typeof monthKey !== "string" || !/^\d{4}-\d{2}$/.test(monthKey) || date.slice(0, 7) !== monthKey) {
      issues.push({ field: `entities.faturamentoDiario[${index}].monthKey`, message: "O mês deve corresponder à data do resumo." });
    }
    if (!isDateOnly(throughDate) || (isDateOnly(date) && throughDate < date)) {
      issues.push({ field: `entities.faturamentoDiario[${index}].completeThroughDate`, message: "Informe até qual data este resumo mensal está completo." });
    } else {
      if (typeof monthKey === "string" && throughDate.slice(0, 7) !== monthKey) {
        issues.push({ field: `entities.faturamentoDiario[${index}].completeThroughDate`, message: "A data de cobertura deve estar no mesmo mês do resumo." });
      }
    }
    if (!Number.isSafeInteger(amountCents)) {
      issues.push({ field: `entities.faturamentoDiario[${index}].amountCents`, message: "O valor deve ser informado em centavos inteiros." });
    }
    if (!Number.isSafeInteger(invoiceCount) || Number(invoiceCount) < 0) {
      issues.push({ field: `entities.faturamentoDiario[${index}].invoiceCount`, message: "A quantidade de notas deve ser um inteiro não negativo." });
    }
    if (typeof monthKey === "string" && /^\d{4}-\d{2}$/.test(monthKey) && isDateOnly(date) && isDateOnly(throughDate)) {
      const group = monthRows.get(monthKey) || { throughDates: new Set<string>(), dates: new Set<string>(), count: 0 };
      group.throughDates.add(throughDate);
      group.dates.add(date);
      group.count += 1;
      monthRows.set(monthKey, group);
    }
  });
  for (const [monthKey, group] of monthRows) {
    if (group.throughDates.size !== 1) {
      issues.push({ field: `entities.faturamentoDiario.${monthKey}`, message: "Todas as datas do mês precisam ter a mesma cobertura do resumo." });
      continue;
    }
    const throughDate = [...group.throughDates][0];
    const expectedCount = Number(throughDate.slice(8, 10));
    if (monthKey !== throughDate.slice(0, 7) || group.count !== expectedCount) {
      issues.push({ field: "entities.faturamentoDiario", message: "O resumo precisa conter todas as datas do mês até a cobertura informada." });
    }
    for (let day = 1; day <= expectedCount; day += 1) {
      const date = monthKey + "-" + String(day).padStart(2, "0");
      if (!group.dates.has(date)) issues.push({ field: "entities.faturamentoDiario", message: `Falta o total do dia ${date}.` });
    }
  }
}

function normalizeEntityRows(
  value: unknown,
  entity: TekSystemEntityType,
  issues: TekSystemSyncValidationIssue[],
): Record<string, unknown>[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.push({ field: `entities.${entity}`, message: "Deve ser uma lista." });
    return [];
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      issues.push({
        field: `entities.${entity}[${index}]`,
        message: "Cada registro deve ser um objeto.",
      });
      return { externalId: `linha-${index + 1}` };
    }

    const row = stableValue(entry) as Record<string, unknown>;
    const externalId = safeExternalId(
      row.externalId ?? row.codigo ?? row.codigoPedido ?? row.numeroNota ?? row.id,
      index,
    );

    return { ...row, externalId };
  });
}

export function validateAndNormalizeTekSystemSync(
  input: unknown,
  allowedTenantId = process.env.TEKSYSTEM_ALLOWED_TENANT_ID || DEFAULT_TEKSYSTEM_TENANT_ID,
): TekSystemSyncValidationResult {
  const issues: TekSystemSyncValidationIssue[] = [];
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? (input as TekSystemSyncPayload)
    : {};

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    issues.push({ field: "body", message: "O corpo deve ser um objeto JSON." });
  }

  const schemaVersion = Number(source.schemaVersion ?? TEKSYSTEM_SYNC_SCHEMA_VERSION);
  if (schemaVersion !== TEKSYSTEM_SYNC_SCHEMA_VERSION) {
    issues.push({
      field: "schemaVersion",
      message: `Versão não suportada. Use ${TEKSYSTEM_SYNC_SCHEMA_VERSION}.`,
    });
  }

  const tenantId = cleanText(source.tenantId || allowedTenantId);
  if (!tenantId) issues.push({ field: "tenantId", message: "Tenant obrigatório." });
  if (tenantId !== allowedTenantId) {
    issues.push({
      field: "tenantId",
      message: `Este conector está autorizado somente para o tenant ${allowedTenantId}.`,
    });
  }

  const entitiesInput = source.entities || {};
  if (!entitiesInput || typeof entitiesInput !== "object" || Array.isArray(entitiesInput)) {
    issues.push({ field: "entities", message: "Informe as entidades de sincronização." });
  }

  const entities = Object.fromEntries(
    ENTITY_TYPES.map((entity) => [
      entity,
      normalizeEntityRows(
        (entitiesInput as Record<string, unknown>)?.[entity],
        entity,
        issues,
      ),
    ]),
  ) as Record<TekSystemEntityType, Record<string, unknown>[]>;

  validateDailyBillingRows(entities.faturamentoDiario, issues);

  for (const entity of ENTITY_TYPES) {
    const seen = new Set<string>();
    entities[entity].forEach((row, index) => {
      const id = String(row.externalId || "");
      if (seen.has(id)) {
        issues.push({
          field: `entities.${entity}[${index}].externalId`,
          message: `externalId duplicado no mesmo lote: ${id}.`,
        });
      }
      seen.add(id);
    });
  }

  const normalizedBase = {
    schemaVersion: TEKSYSTEM_SYNC_SCHEMA_VERSION,
    syncId: cleanText(source.syncId) || crypto.randomUUID(),
    origem: cleanText(source.origem, "TEKSYSTEM"),
    tenantId,
    solicitadoPor: cleanText(source.solicitadoPor, "teksystem-sync-agent"),
    modo: source.modo === "delta" ? "delta" : "snapshot",
    generatedAt: cleanText(source.generatedAt) || new Date().toISOString(),
    source: (stableValue(source.source || {}) || {}) as TekSystemSourceInfo,
    entities,
  } satisfies Omit<NormalizedTekSystemSyncPayload, "payloadHash">;

  return {
    ok: issues.length === 0,
    payload: issues.length === 0
      ? { ...normalizedBase, payloadHash: payloadHash(normalizedBase) }
      : null,
    issues,
    counts: Object.fromEntries(
      ENTITY_TYPES.map((entity) => [entity, entities[entity].length]),
    ) as Record<TekSystemEntityType, number>,
  };
}

export function syncRecordKey(
  tenantId: string,
  entityType: TekSystemEntityType,
  externalId: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${tenantId}:${entityType}:${externalId}`)
    .digest("hex");
}

export function getTekSystemEntityTypes(): TekSystemEntityType[] {
  return [...ENTITY_TYPES];
}
