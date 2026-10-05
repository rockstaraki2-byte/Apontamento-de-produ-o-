import crypto from "node:crypto";
import { stageTekSystemSync } from "../../_lib/teksystemSyncFirestore.js";
import {
  validateAndNormalizeTekSystemSync,
  type NormalizedTekSystemSyncPayload,
} from "../../_lib/teksystemSync.js";

function bearerToken(req: any): string {
  const header = String(req.headers?.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(req: any): boolean {
  const expected = process.env.ORDER_IMPORT_API_TOKEN || process.env.INTEGRATION_TOKEN || "";
  return Boolean(expected) && secureEquals(bearerToken(req), expected);
}

function isDryRun(req: any): boolean {
  return String(req.query?.dryRun || "").toLowerCase() === "true";
}

function totalRecords(payload: NormalizedTekSystemSyncPayload): number {
  return Object.values(payload.entities).reduce((total, rows) => total + rows.length, 0);
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  }

  const validation = validateAndNormalizeTekSystemSync(req.body);
  if (!validation.ok || !validation.payload) {
    return res.status(400).json({
      sucesso: false,
      erro: "PAYLOAD_INVALIDO",
      issues: validation.issues,
      counts: validation.counts,
    });
  }

  const payload = validation.payload;
  const count = totalRecords(payload);
  if (count > 5000) {
    return res.status(413).json({
      sucesso: false,
      erro: "LOTE_MUITO_GRANDE",
      mensagem: "O limite inicial é de 5.000 registros por sincronização.",
      counts: validation.counts,
    });
  }

  if (isDryRun(req)) {
    return res.status(200).json({
      sucesso: true,
      dryRun: true,
      syncId: payload.syncId,
      tenantId: payload.tenantId,
      payloadHash: payload.payloadHash,
      counts: validation.counts,
      mensagem: "Payload válido. Nenhum dado foi gravado.",
    });
  }

  try {
    const result = await stageTekSystemSync(payload);
    return res.status(200).json({
      sucesso: true,
      dryRun: false,
      ...result,
      tenantId: payload.tenantId,
      payloadHash: payload.payloadHash,
      counts: validation.counts,
      mensagem: "Sincronização recebida na área de staging; dados operacionais não foram alterados.",
    });
  } catch (error: any) {
    console.error("[TekSystem Sync API] Falha ao gravar staging:", error?.message || error);
    return res.status(500).json({
      sucesso: false,
      erro: "ERRO_INTERNO",
      mensagem: "Não foi possível gravar o lote de integração.",
    });
  }
}
