import type { OrderImportPayload } from "./orderImportRules.ts";
import { processOrderImport } from "./orderImportCore.ts";
import { FirestoreOrderImportRepository } from "./orderImportFirestore.ts";

function getBearerToken(req: any): string {
  const header = String(req.headers?.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function normalizePayload(body: any): OrderImportPayload {
  if (Array.isArray(body)) {
    return { origem: "API", tenantId: "imperio", pedidos: body };
  }
  return body && typeof body === "object" ? body : {};
}

export async function handleOrderImportHttp(req: any, res: any, forceDryRun = false) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  const expectedToken = process.env.ORDER_IMPORT_API_TOKEN || process.env.INTEGRATION_TOKEN;
  if (!expectedToken) {
    return res.status(503).json({
      sucesso: false,
      erro: "API_TOKEN_NAO_CONFIGURADO",
      mensagem: "Configure ORDER_IMPORT_API_TOKEN no ambiente antes de habilitar a API.",
    });
  }

  if (getBearerToken(req) !== expectedToken) {
    return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  }

  const payload = normalizePayload(req.body);
  const pedidos = Array.isArray(payload.pedidos) ? payload.pedidos : [];
  if (pedidos.length === 0) {
    return res.status(400).json({
      sucesso: false,
      erro: "PEDIDO_INVALIDO",
      mensagem: "O payload deve conter pedidos com pelo menos um pedido.",
    });
  }

  if (pedidos.length > 100) {
    return res.status(413).json({
      sucesso: false,
      erro: "LOTE_MUITO_GRANDE",
      mensagem: "O limite inicial é de 100 pedidos por requisição.",
    });
  }

  const urlDryRun = String(req.query?.dryRun || "").toLowerCase() === "true";
  const dryRun = forceDryRun || urlDryRun;
  const tenantId = String(payload.tenantId || req.headers?.["x-tenant-id"] || "imperio").trim() || "imperio";
  const origem = String(payload.origem || "API").trim() || "API";
  const solicitadoPor = String(
    payload.solicitadoPor || req.headers?.["x-integration-user"] || "api-integration",
  ).trim();

  try {
    const repository = new FirestoreOrderImportRepository();
    const result = await processOrderImport(
      repository,
      payload,
      { tenantId, origem, solicitadoPor },
      dryRun,
    );
    return res.status(result.resumo.comErro > 0 ? 207 : 200).json(result);
  } catch (error: any) {
    console.error("[Order Import API]", error);
    return res.status(500).json({
      sucesso: false,
      erro: "ERRO_INTERNO",
      mensagem: error?.message || "Erro interno na importação de pedidos.",
    });
  }
}
