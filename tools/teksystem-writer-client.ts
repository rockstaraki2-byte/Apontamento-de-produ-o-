import type { TekSystemSyncPayload } from "../api/_lib/teksystemSync.js";

function settings() {
  const url = process.env.TEKSYSTEM_WRITER_API_URL || process.env.TEKSYSTEM_SYNC_API_URL?.replace(/\/sync(?:\?.*)?$/, "/process");
  const token = process.env.TEKSYSTEM_WRITER_API_TOKEN;
  if (!url || !token) throw new Error("URL/token do agente de escrita não configurados localmente.");
  if (new URL(url).protocol !== "https:") throw new Error("O agente de escrita exige HTTPS.");
  return { url, token };
}
export async function callWriter(method: "GET" | "POST", body?: unknown) {
  const { url, token } = settings();
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { method, headers: {
        Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Tenant-Id": "imperio",
        ...(process.env.TEKSYSTEM_VERCEL_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.TEKSYSTEM_VERCEL_BYPASS_SECRET } : {}),
      }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(65_000) });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status < 500 && response.status !== 429) throw new Error(`Escritor recusou a requisição (HTTP ${response.status}).`);
        lastError = new Error(`Escritor indisponível (HTTP ${response.status}).`);
      } else {
        const result = await response.json();
        if (!result.sucesso) throw new Error("Escritor não confirmou o processamento.");
        return result;
      }
    } catch (error: any) {
      if (/recusou|não confirmou/.test(error.message)) throw error;
      lastError = error;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw lastError || new Error("Falha no agente de escrita.");
}
export async function drainWriter() {
  const deadline = Date.now() + 20 * 60_000;
  const summary: Record<string, number> = {};
  let pages = 0;
  while (Date.now() < deadline && pages < 300) {
    const result = await callWriter("POST", { limit: 80 });
    pages++;
    for (const row of result.results || []) {
      const key = `${row.kind}:${row.state}:${row.action || ""}`;
      summary[key] = (summary[key] || 0) + 1;
    }
    console.log(JSON.stringify({ writerPage: pages, kind: result.kind, processed: result.results?.length || 0, busy: result.busy, hasMore: result.hasMore }));
    if (!result.hasMore) return { pages, summary, status: result.status || await callWriter("GET") };
    if (result.busy) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Fila durável permanece pendente após o limite desta rodada; será retomada na próxima verificação.");
}
export async function previewWriter(payload: TekSystemSyncPayload) {
  const result = await callWriter("POST", { dryRun: true, payload });
  const summary: Record<string, number> = {};
  const issues: unknown[] = [];
  for (const row of result.results || []) {
    const key = `${row.kind}:${row.action || row.state}`;
    summary[key] = (summary[key] || 0) + 1;
    if (row.issues) issues.push({ kind: row.kind, codigo: row.codigo, issues: row.issues });
  }
  return { summary, issues };
}
