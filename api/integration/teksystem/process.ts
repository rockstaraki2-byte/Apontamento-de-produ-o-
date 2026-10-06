import crypto from "node:crypto";
import { validateAndNormalizeTekSystemSync } from "../../_lib/teksystemSync.js";
import { previewWriterPayload, processWriterQueue, requeueWriterJobs, writerStatus } from "../../_lib/teksystemWriterFirestore.js";

export const maxDuration = 60;
function authorized(req: any): boolean {
  const expected = process.env.TEKSYSTEM_WRITER_API_TOKEN || "";
  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(expected); const b = Buffer.from(token);
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" }); }
  if (!authorized(req)) return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  const tenantId = process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio";
  if ((req.body?.tenantId && req.body.tenantId !== tenantId) || (req.headers?.["x-tenant-id"] && req.headers["x-tenant-id"] !== tenantId)) return res.status(403).json({ sucesso: false, erro: "TENANT_INVALIDO" });
  try {
    if (req.method === "GET") return res.status(200).json({ sucesso: true, enabled: process.env.TEKSYSTEM_WRITER_ENABLED === "true", ...await writerStatus(tenantId) });
    if (req.body?.dryRun === true) {
      const validation = validateAndNormalizeTekSystemSync(req.body.payload, tenantId);
      if (!validation.ok || !validation.payload) return res.status(400).json({ sucesso: false, erro: "PAYLOAD_INVALIDO", issues: validation.issues });
      if (Object.values(validation.counts).reduce((n, c) => n + c, 0) > 5000) return res.status(413).json({ sucesso: false, erro: "LOTE_MUITO_GRANDE" });
      return res.status(200).json({ sucesso: true, ...await previewWriterPayload(validation.payload) });
    }
    if (process.env.TEKSYSTEM_WRITER_ENABLED !== "true") return res.status(503).json({ sucesso: false, erro: "WRITER_DISABLED" });
    if (req.body?.action === "requeue") return res.status(200).json({ sucesso: true, jobs: await requeueWriterJobs(tenantId, Array.isArray(req.body.jobIds) ? req.body.jobIds : []) });
    const requestedLimit = Number(req.body?.limit ?? 80);
    if (!Number.isFinite(requestedLimit) || requestedLimit < 1) return res.status(400).json({ sucesso: false, erro: "LIMIT_INVALIDO" });
    return res.status(200).json({ sucesso: true, ...await processWriterQueue(tenantId, requestedLimit) });
  } catch (error: any) {
    console.error("[TekSystem writer]", error?.code || "ERRO", error?.message);
    return res.status(500).json({ sucesso: false, erro: error?.code || "ERRO_INTERNO", mensagem: error?.message || "Falha ao processar fila de integração." });
  }
}
