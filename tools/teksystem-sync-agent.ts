import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  validateAndNormalizeTekSystemSync,
  type TekSystemSyncPayload,
} from "../api/_lib/teksystemSync.js";
import { makeSince, splitPayload, type SyncState } from "./teksystem-sync-cycle-utils.js";
import { callWriter, drainWriter, previewWriter } from "./teksystem-writer-client.js";
import { checkpointFollowups, finishFollowups } from "./teksystem-followups.mjs";

const execFileAsync = promisify(execFile);

const DEFAULT_API_PATH = "/api/integration/teksystem/sync";

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function sourceDefaults() {
  return {
    host: process.env.TEKSYSTEM_HOST || "SERVIDOR",
    serverPort: envNumber("TEKSYSTEM_SERVER_PORT", 5700),
    databasePort: envNumber("TEKSYSTEM_DATABASE_PORT", 3055),
    databasePath: process.env.TEKSYSTEM_DATABASE_PATH || "C:\\Tek-System\\Dados\\DadosMC.fdb",
    protocol: process.env.TEKSYSTEM_PROTOCOL || "tcp/ip",
    companyId: process.env.TEKSYSTEM_COMPANY_ID || "1",
  };
}

function printHelp() {
  console.log(`Uso:
  npm run teksystem:health
  npm run teksystem:validate -- --input tools/teksystem-sync.sample.json
  npm run teksystem:push -- --input caminho/lote.json --dry-run
  npm run teksystem:push -- --input caminho/lote.json
  npm run teksystem:sync -- --dry-run

Variáveis principais:
  TEKSYSTEM_HOST, TEKSYSTEM_SERVER_PORT, TEKSYSTEM_DATABASE_PORT
  TEKSYSTEM_DATABASE_PATH, TEKSYSTEM_COMPANY_ID
  TEKSYSTEM_SYNC_API_URL, TEKSYSTEM_SYNC_API_TOKEN
  TEKSYSTEM_VERCEL_BYPASS_SECRET (somente para deployments protegidos)
`);
}

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline?.slice(prefix.length);
}

async function readPayload(filePath: string): Promise<TekSystemSyncPayload> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as TekSystemSyncPayload;
  return {
    ...parsed,
    tenantId: parsed.tenantId || process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio",
    source: { ...sourceDefaults(), ...(parsed.source || {}) },
  };
}

function probe(host: string, port: number, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function runHealth() {
  const source = sourceDefaults();
  const ports = [source.serverPort, source.databasePort, 5793];
  const results = await Promise.all(
    ports.map(async (port) => ({
      host: source.host,
      port,
      reachable: await probe(source.host || "SERVIDOR", port),
    })),
  );
  console.log(JSON.stringify({ ok: results.every((result) => result.reachable), source, ports: results }, null, 2));
  if (results.some((result) => !result.reachable)) process.exitCode = 2;
}

async function runValidate(args: string[]) {
  const input = argumentValue(args, "--input");
  if (!input) throw new Error("Informe --input caminho/do/lote.json.");

  const validation = validateAndNormalizeTekSystemSync(await readPayload(input));
  console.log(JSON.stringify({
    ok: validation.ok,
    counts: validation.counts,
    issues: validation.issues,
    syncId: validation.payload?.syncId,
    payloadHash: validation.payload?.payloadHash,
    tenantId: validation.payload?.tenantId,
  }, null, 2));
  if (!validation.ok) process.exitCode = 2;
}

async function runPush(args: string[]) {
  const input = argumentValue(args, "--input");
  if (!input) throw new Error("Informe --input caminho/do/lote.json.");

  const apiUrl = process.env.TEKSYSTEM_SYNC_API_URL;
  const apiToken =
    process.env.TEKSYSTEM_SYNC_API_TOKEN ||
    process.env.ORDER_IMPORT_API_TOKEN ||
    process.env.INTEGRATION_TOKEN;
  if (!apiUrl) throw new Error("TEKSYSTEM_SYNC_API_URL não está configurada.");
  if (!apiToken) throw new Error("TEKSYSTEM_SYNC_API_TOKEN não está configurada.");

  const payload = await readPayload(input);
  const localValidation = validateAndNormalizeTekSystemSync(payload);
  if (!localValidation.ok) {
    console.error(JSON.stringify({ ok: false, issues: localValidation.issues }, null, 2));
    process.exitCode = 2;
    return;
  }

  const dryRun = args.includes("--dry-run");
  const separator = apiUrl.includes("?") ? "&" : "?";
  const url = `${apiUrl}${dryRun ? `${separator}dryRun=true` : ""}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "X-Tenant-Id": String(payload.tenantId || "imperio"),
      "X-Integration-User": "teksystem-sync-agent",
      ...(process.env.TEKSYSTEM_VERCEL_BYPASS_SECRET
        ? { "x-vercel-protection-bypass": process.env.TEKSYSTEM_VERCEL_BYPASS_SECRET }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  let parsed: unknown = body;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Mantém a resposta textual para facilitar diagnóstico de proxy/deploy.
  }
  console.log(JSON.stringify({ httpStatus: response.status, response: parsed }, null, 2));
  if (!response.ok) process.exitCode = 3;
}

function stateDirectory(): string {
  const base = process.env.LOCALAPPDATA || process.env.APPDATA || os.homedir();
  return path.join(base, "ApontaPRO", "TekSystem");
}

async function postStagingPayload(apiUrl: string, apiToken: string, bypassSecret: string, payload: TekSystemSyncPayload, dryRun: boolean) {
  const validation = validateAndNormalizeTekSystemSync(payload);
  if (!validation.ok || !validation.payload) {
    throw new Error(`Lote local inválido: ${JSON.stringify(validation.issues)}`);
  }
  const separator = apiUrl.includes("?") ? "&" : "?";
  const url = `${apiUrl}${dryRun ? `${separator}dryRun=true` : ""}`;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "X-Tenant-Id": validation.payload.tenantId,
        "X-Integration-User": "teksystem-sync-agent",
        "x-vercel-protection-bypass": bypassSecret,
      },
      body: JSON.stringify(validation.payload),
      signal: AbortSignal.timeout(45_000),
    });
    lastStatus = response.status;
    if (response.ok) {
      const responseText = await response.text();
      let parsed: any;
      try { parsed = JSON.parse(responseText); } catch { parsed = {}; }
      if (parsed?.sucesso !== true) throw new Error(`A API não confirmou o lote (HTTP ${response.status}).`);
      return { status: response.status, count: Object.values(validation.counts).reduce((sum, count) => sum + count, 0) };
    }
    if (![408, 425, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
      throw new Error(`Falha ao enviar lote de staging (HTTP ${response.status}).`);
    }
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error(`Falha ao enviar lote de staging (HTTP ${lastStatus}).`);
}

async function runSync(args: string[]) {
  const apiUrl = process.env.TEKSYSTEM_SYNC_API_URL;
  const apiToken = process.env.TEKSYSTEM_SYNC_API_TOKEN || process.env.ORDER_IMPORT_API_TOKEN || process.env.INTEGRATION_TOKEN;
  const bypassSecret = process.env.TEKSYSTEM_VERCEL_BYPASS_SECRET;
  if (!apiUrl) throw new Error("TEKSYSTEM_SYNC_API_URL não está configurada.");
  if (!apiToken) throw new Error("Token da API do ApontaPRO não configurado.");
  if (!bypassSecret) throw new Error("Bypass dedicado do Vercel não está configurado localmente.");
  const parsedUrl = new URL(apiUrl);
  if (parsedUrl.protocol !== "https:") throw new Error("A URL de staging precisa usar HTTPS.");
  const user = process.env.TEKSYSTEM_DB_USER;
  const password = process.env.TEKSYSTEM_DB_PASSWORD;
  if (!user || !password) throw new Error("Credencial local de leitura do Firebird não configurada.");

  // The Firebird reader runs every statement in a server-enforced READ ONLY transaction.
  const lookbackHours = envNumber("TEKSYSTEM_INITIAL_LOOKBACK_HOURS", 24);
  const overlapMinutes = envNumber("TEKSYSTEM_SYNC_OVERLAP_MINUTES", 5);
  const appDirectory = stateDirectory();
  await fs.mkdir(appDirectory, { recursive: true });
  const lockPath = path.join(appDirectory, "sync.lock");
  let lockHandle;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      lockHandle = await fs.open(lockPath, "wx");
      await lockHandle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      break;
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      let stale = false;
      try {
        const lock = JSON.parse(await fs.readFile(lockPath, "utf8")) as { pid?: number; startedAt?: string };
        const ageMs = Date.now() - new Date(lock.startedAt || "").getTime();
        if (Number.isInteger(lock.pid) && ageMs > 60 * 60 * 1000) {
          try { process.kill(lock.pid as number, 0); }
          catch (error: any) { stale = error?.code === "ESRCH"; }
        }
      } catch {
        // An empty/new lock may still be initializing; never remove it based on a partial read.
      }
      if (stale && attempt === 0) {
        await fs.rm(lockPath, { force: true });
        continue;
      }
      throw new Error("Já existe uma execução do agente em andamento; esta rodada foi ignorada.");
    }
  }
  if (!lockHandle) throw new Error("Não foi possível reservar a execução do agente.");

  const startedAt = new Date();
  const runId = `teksystem-${startedAt.toISOString().replace(/[-:.TZ]/g, "")}`;
  const statePath = path.join(appDirectory, "sync-state.json");
  const tempExport = path.join(os.tmpdir(), `${runId}-${process.pid}.json`);
  const logPath = path.join(appDirectory, `sync-${startedAt.toISOString().slice(0, 10)}.jsonl`);
  let outcome: Record<string, unknown> = { runId, startedAt: startedAt.toISOString(), ok: false,
    mode: args.includes("--dry-run") ? "dry-run" : "collect-and-process" };
  try {
    let state: SyncState = {};
    try { state = JSON.parse(await fs.readFile(statePath, "utf8")) as SyncState; }
    catch (error: any) { if (error?.code !== "ENOENT") throw new Error("Arquivo de estado inválido; não avanço o cursor."); }

    const bootstrap = state.pipelineVersion !== 2;
    const since = makeSince(bootstrap ? {} : state, startedAt, lookbackHours, overlapMinutes);
    const projectRoot = path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), "..");
    const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
    const reader = path.join(projectRoot, "tools", "teksystem-firebird-reader.ts");
    await execFileAsync(process.execPath, [tsxCli, reader, "export", "--output", tempExport, "--since", since.toISOString(), ...(bootstrap ? ["--customer-snapshot"] : [])], {
      cwd: projectRoot,
      windowsHide: true,
      timeout: 20 * 60 * 1000,
      maxBuffer: 2 * 1024 * 1024,
    });

    const exported = JSON.parse(await fs.readFile(tempExport, "utf8")) as TekSystemSyncPayload;
    const payloadBase: TekSystemSyncPayload = {
      ...exported,
      syncId: runId,
      modo: "delta",
      solicitadoPor: "teksystem-sync-agent",
      generatedAt: new Date().toISOString(),
    };
    const chunks = splitPayload(payloadBase);
    let stagedRecords = 0;
    let stagedBatches = 0;
    for (let index = 0; index < chunks.length; index += 1) {
      const payload = {
        ...chunks[index],
        syncId: `${runId}-${String(index + 1).padStart(3, "0")}`,
      };
      const result = await postStagingPayload(apiUrl, apiToken, bypassSecret, payload, args.includes("--dry-run"));
      stagedRecords += result.count;
      stagedBatches += 1;
      outcome.stagedRecords = stagedRecords;
      outcome.stagedBatches = stagedBatches;
    }

    if (!args.includes("--dry-run")) {
      const nextState: SyncState = {
        lastSuccessfulWatermark: startedAt.toISOString(),
        lastSuccessfulRunId: runId,
        pipelineVersion: 2,
      };
      const stateTemp = `${statePath}.${process.pid}.tmp`;
      await fs.writeFile(stateTemp, `${JSON.stringify(nextState, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await fs.rename(stateTemp, statePath);
    }
    const writer = args.includes("--dry-run")
      ? { enabled: (await callWriter("GET")).enabled, note: "Simulação: nenhum trabalho enfileirado/aplicado; cursor preservado." }
      : await drainWriter(async (page, progress) => {
        outcome.writerProgress = { ...progress, status: page.status };
        await checkpointFollowups(runId, startedAt.toISOString(), page.results || []);
      });
    outcome = {
      runId,
      startedAt: startedAt.toISOString(),
      ok: true,
      mode: args.includes("--dry-run") ? "dry-run" : "collect-and-process",
      since: since.toISOString(),
      finishedAt: new Date().toISOString(),
      stagedBatches,
      stagedRecords,
      bootstrap, writer,
    };
    console.log(JSON.stringify(outcome));
  } catch (error: any) {
    outcome = { ...outcome, finishedAt: new Date().toISOString(), error: error?.message || "Falha não identificada" };
    console.error(JSON.stringify(outcome));
    process.exitCode = 1;
  } finally {
    try { outcome.followups = await finishFollowups(outcome); }
    catch { outcome.followups = { error: "Falha ao salvar fila de PDFs/relatório; consulte o log local." }; process.exitCode = 1; }
    await fs.rm(tempExport, { force: true }).catch(() => undefined);
    await lockHandle.close().catch(() => undefined);
    await fs.rm(lockPath, { force: true }).catch(() => undefined);
    await fs.appendFile(logPath, `${JSON.stringify(outcome)}\n`, "utf8").catch(() => undefined);
  }
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "help" || command === "--help") return printHelp();
  if (command === "health") return runHealth();
  if (command === "validate") return runValidate(args);
  if (command === "push") return runPush(args);
  if (command === "sync") return runSync(args);
  if (command === "writer-status") return console.log(JSON.stringify(await callWriter("GET"), null, 2));
  if (command === "writer-process") return console.log(JSON.stringify(await drainWriter(), null, 2));
  if (command === "writer-preview") {
    const input = argumentValue(args, "--input");
    if (!input) throw new Error("Informe --input arquivo.json.");
    return console.log(JSON.stringify(await previewWriter(await readPayload(input)), null, 2));
  }
  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error: any) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
