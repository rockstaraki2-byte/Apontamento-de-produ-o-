import crypto from "node:crypto";
import { getTekSystemOrderPresenceTargets, reconcileTekSystemOrderPresence } from "../../_lib/teksystemOrderPresence.js";

export const maxDuration = 60;
export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

function bearerToken(req: any): string {
  const match = String(req.headers?.authorization || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}
function secureEquals(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
function validSnapshotId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,120}$/.test(value);
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" }); }
  const expected = process.env.ORDER_IMPORT_API_TOKEN || process.env.INTEGRATION_TOKEN || "";
  if (!secureEquals(bearerToken(req), expected)) return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  const tenantId = process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio";
  if (req.method === "GET") {
    if (req.headers?.["x-tenant-id"] !== tenantId) return res.status(403).json({ sucesso: false, erro: "TENANT_INVALIDO" });
    try { return res.status(200).json({ sucesso: true, ...await getTekSystemOrderPresenceTargets(tenantId) }); }
    catch (error: any) {
      console.error("[TekSystem order presence targets]", error?.message || "Falha ao preparar alvos");
      return res.status(500).json({ sucesso: false, erro: error?.message || "ERRO_INTERNO" });
    }
  }
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  if (body.dryRun !== true && process.env.TEKSYSTEM_WRITER_ENABLED !== "true") {
    return res.status(503).json({ sucesso: false, erro: "WRITER_DISABLED", mensagem: "Escritor desativado; nenhum estado de reconciliação foi alterado." });
  }
  if (body.tenantId !== tenantId || req.headers?.["x-tenant-id"] !== tenantId) return res.status(403).json({ sucesso: false, erro: "TENANT_INVALIDO" });
  if (body.completeSnapshot !== true || !validSnapshotId(body.snapshotId) || typeof body.generatedAt !== "string" || !Number.isFinite(Date.parse(body.generatedAt)) ||
    !Array.isArray(body.checkedOrderCodes) || body.checkedOrderCodes.length > 25_000 || !/^[a-f0-9]{64}$/.test(body.targetHash || "")) {
    return res.status(400).json({ sucesso: false, erro: "SNAPSHOT_INCOMPLETO", mensagem: "A reconciliação exige um snapshot completo identificado e datado." });
  }
  if (!Array.isArray(body.companyIds) || body.companyIds.map(Number).sort().join(",") !== "0,1") {
    return res.status(400).json({ sucesso: false, erro: "ESCOPO_EMPRESA_INVALIDO", mensagem: "O snapshot deve cobrir integralmente as empresas 0 e 1." });
  }
  if (!Array.isArray(body.orders) || body.orders.length > 100_000) return res.status(413).json({ sucesso: false, erro: "SNAPSHOT_MUITO_GRANDE" });
  const seen = new Set<string>();
  const checkedCodes = new Set<string>();
  for (const rawCode of body.checkedOrderCodes) {
    const code = String(rawCode ?? "").trim();
    if (!code || code.length > 80 || checkedCodes.has(code)) return res.status(400).json({ sucesso: false, erro: "ALVOS_INVALIDOS" });
    checkedCodes.add(code);
  }
  const orders: Array<{ empresa: number; codigoPedido: string; lifecycle?: "CANCELADO" | "CANCELAMENTO_PARCIAL" }> = [];
  for (const row of body.orders) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return res.status(400).json({ sucesso: false, erro: "SNAPSHOT_INVALIDO", mensagem: "O snapshot contém linha inválida." });
    }
    const empresa = Number(row?.empresa);
    const codigoPedido = String(row?.codigoPedido ?? "").trim();
    const key = `${empresa}:${codigoPedido}`;
    if (![0, 1].includes(empresa) || !codigoPedido || codigoPedido.length > 80 || seen.has(key)) {
      return res.status(400).json({ sucesso: false, erro: "SNAPSHOT_INVALIDO", mensagem: "O snapshot contém empresa/código inválido ou duplicado." });
    }
    const lifecycle = row.lifecycle;
    if (lifecycle !== undefined && !["CANCELADO", "CANCELAMENTO_PARCIAL"].includes(lifecycle)) {
      return res.status(400).json({ sucesso: false, erro: "SNAPSHOT_INVALIDO", mensagem: "Situação de pedido inválida no snapshot." });
    }
    seen.add(key); orders.push({ empresa, codigoPedido, ...(lifecycle ? { lifecycle } : {}) });
  }
  try {
    const result = await reconcileTekSystemOrderPresence({
      tenantId, snapshotId: body.snapshotId, generatedAt: new Date(body.generatedAt).toISOString(),
      companyIds: body.companyIds.map(Number), sourceOrders: orders, checkedOrderCodes: [...checkedCodes],
      targetHash: body.targetHash, dryRun: body.dryRun === true,
    });
    const summary = {
      blocked: result.blocked, reason: result.reason, dryRun: result.dryRun,
      presentOrderCodes: result.presentOrderCodes, linkedOrderCodes: result.linkedOrderCodes,
      firstMisses: result.firstMisses, confirmedMissing: result.confirmedMissing,
      canceledAtSource: result.cancelledOrderCodes.length,
      partialCancellationReview: result.partialCancellationCodes.length,
      inconsistentStatusReview: result.inconsistentLifecycleCodes.length,
      queued: result.queued ?? 0, stateWrites: result.stateWrites ?? 0,
    };
    return res.status(200).json({ sucesso: true, ...(result.blocked ? { erro: "RECONCILIACAO_SUSPENSA" } : {}), ...summary });
  } catch (error: any) {
    console.error("[TekSystem order presence]", error?.message || "Falha na reconciliação");
    return res.status(500).json({ sucesso: false, erro: error?.message || "ERRO_INTERNO" });
  }
}
