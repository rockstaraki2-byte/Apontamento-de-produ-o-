import fs from "node:fs/promises";
import process from "node:process";
import * as Firebird from "node-firebird";
import type { Database, Options } from "node-firebird";
import { validateAndNormalizeTekSystemSync, type TekSystemSyncPayload } from "../api/_lib/teksystemSync.js";
import { readCompleteEntities } from "./teksystem-firebird-v2.js";

type EntityName = "clientes" | "produtos" | "pedidos" | "faturamentos" | "romaneios";

const ALL_ENTITIES: EntityName[] = ["clientes", "produtos", "pedidos", "faturamentos", "romaneios"];

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function sourceDefaults() {
  const companyIds = (process.env.TEKSYSTEM_COMPANY_IDS || "0,1")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0);
  return {
    host: process.env.TEKSYSTEM_HOST || "SERVIDOR",
    databasePort: envNumber("TEKSYSTEM_DATABASE_PORT", 3055),
    databasePath: process.env.TEKSYSTEM_DATABASE_PATH || "C:\\Tek-System\\Dados\\DadosMC.fdb",
    companyId: envNumber("TEKSYSTEM_COMPANY_ID", 1),
    companyIds: companyIds.length ? [...new Set(companyIds)] : [0, 1],
    protocol: process.env.TEKSYSTEM_PROTOCOL || "tcp/ip",
  };
}

function databaseOptions(): Options {
  const source = sourceDefaults();
  const user = process.env.TEKSYSTEM_DB_USER;
  const password = process.env.TEKSYSTEM_DB_PASSWORD;
  if (!user || !password) {
    throw new Error(
      "Configure TEKSYSTEM_DB_USER e TEKSYSTEM_DB_PASSWORD localmente. " +
        "Use uma credencial Firebird somente leitura; não envie a senha pelo chat.",
    );
  }

  return {
    host: source.host,
    port: source.databasePort,
    database: source.databasePath,
    user,
    password,
    lowercase_keys: true,
    encoding: "UTF8",
    connectTimeout: 10000,
  };
}

function sinceValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`--since inválido: ${value}`);
  return parsed;
}

function changedSince(alias: string, fields: string[], since: Date | undefined) {
  if (!since) return { clause: "", params: [] as unknown[] };
  return {
    clause: ` AND (${fields.map((field) => `${alias}.${field} >= ?`).join(" OR ")})`,
    params: fields.map(() => since),
  };
}

async function queryRows<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const transaction = await db.transactionAsync(Firebird.ISOLATION_READ_COMMITTED_READ_ONLY);
  try {
    const rows = await transaction.queryAsync<T>(sql, params);
    await transaction.commitAsync();
    return rows;
  } catch (error) {
    await transaction.rollbackAsync().catch(() => undefined);
    throw error;
  }
}

function rowValue(row: Record<string, unknown>, key: string) {
  return row[key] ?? row[key.toLowerCase()];
}

function withExternalIds(entity: EntityName, rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const codigo = String(rowValue(row, "codigo") ?? rowValue(row, "codigoPedido") ?? rowValue(row, "numeroNota") ?? rowValue(row, "id") ?? "");
    const item = entity === "pedidos"
      ? rowValue(row, "detalheId") ?? rowValue(row, "itemId")
      : entity === "romaneios"
        ? rowValue(row, "cargaItemId")
        : rowValue(row, "itemId") ?? rowValue(row, "item") ?? rowValue(row, "codigoItem") ?? rowValue(row, "item_id");
    const itemSuffix = item === undefined || item === null || item === "" ? "cabecalho" : String(item);
    const externalId =
      entity === "clientes"
        ? `cliente:${codigo}`
        : entity === "produtos"
          ? `produto:${codigo}`
        : entity === "pedidos"
            ? `pedido:${codigo}:${itemSuffix}`
            : entity === "faturamentos"
              ? `faturamento:${codigo}:${itemSuffix}`
              : `romaneio:${String(rowValue(row, "cargaId") ?? "")}:${itemSuffix}`;
    return { ...row, externalId };
  });
}

function dateRange(value: string | undefined): { value: string } | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`--date inválido: ${value}; use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`--date inválido: ${value}; use uma data real no formato YYYY-MM-DD.`);
  }
  return { value };
}


function printHelp() {
  console.log(`Uso:
  npm run teksystem:firebird -- probe
  npm run teksystem:firebird -- export --output caminho/lote.json --since 2026-01-01T00:00:00.000Z
  npm run teksystem:firebird -- export --output caminho/lote.json --entities pedidos,romaneios --date 2026-10-05

Variáveis obrigatórias (somente locais):
  TEKSYSTEM_DB_USER, TEKSYSTEM_DB_PASSWORD

Variáveis de conexão:
  TEKSYSTEM_HOST, TEKSYSTEM_DATABASE_PORT, TEKSYSTEM_DATABASE_PATH
  TEKSYSTEM_COMPANY_ID, TEKSYSTEM_PROTOCOL
  TEKSYSTEM_COMPANY_IDS (padrão: 0,1)
`);
}

async function attach(): Promise<Database> {
  return Firebird.attachAsync(databaseOptions());
}

async function runProbe() {
  const db = await attach();
  try {
    const rows = await queryRows<{ ok: number }>(db, "SELECT 1 AS ok FROM RDB$DATABASE");
    console.log(JSON.stringify({ ok: rows[0]?.ok === 1, source: sourceDefaults() }, null, 2));
  } finally {
    await db.detachAsync();
  }
}

async function runExport(args: string[]) {
  const output = argumentValue(args, "--output");
  if (!output) throw new Error("Informe --output caminho/lote.json para evitar salvar dados reais por engano.");
  const requested = argumentValue(args, "--entities");
  const entities = (requested ? requested.split(",") : ALL_ENTITIES).map((name) => name.trim()) as EntityName[];
  const invalid = entities.filter((entity) => !ALL_ENTITIES.includes(entity));
  if (invalid.length) throw new Error(`Entidades inválidas: ${invalid.join(", ")}`);

  const db = await attach();
  try {
    const rows = await readCompleteEntities(
      db,
      entities,
      sourceDefaults().companyIds,
      sinceValue(argumentValue(args, "--since")),
      dateRange(argumentValue(args, "--date")),
      args.includes("--catalog-snapshot"),
      args.includes("--customer-snapshot"),
    );
    const payload: TekSystemSyncPayload = {
      syncId: `teksystem-firebird-${Date.now()}`,
      tenantId: process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio",
      generatedAt: new Date().toISOString(),
      source: { ...sourceDefaults(), readerVersion: 2, completeOrderSnapshots: entities.includes("pedidos") && entities.includes("romaneios") },
      entities: rows,
    };
    const validation = validateAndNormalizeTekSystemSync(payload);
    if (!validation.ok || !validation.payload) {
      throw new Error(`Dados extraídos não passaram na validação: ${JSON.stringify(validation.issues)}`);
    }
    await fs.writeFile(output, `${JSON.stringify(validation.payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify({ ok: true, output, counts: validation.counts, payloadHash: validation.payload.payloadHash }, null, 2));
  } finally {
    await db.detachAsync();
  }
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "help" || command === "--help") return printHelp();
  if (command === "probe") return runProbe();
  if (command === "export") return runExport(args);
  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error: any) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
