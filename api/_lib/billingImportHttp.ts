import {
  buildBillingPlan,
  collectSourceKeys,
  getBillingDocumentKey,
  type BillingImportPayload,
} from "./billingImportCore.js";
import {
  BillingStateChangedError,
  FirestoreBillingRepository,
} from "./billingImportFirestore.js";

function getBearerToken(req: any): string {
  const header = String(req.headers?.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function normalizePayload(body: any): BillingImportPayload {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return body;
}

function onlyNoopStatuses(plan: ReturnType<typeof buildBillingPlan>): boolean {
  return (
    plan.linhas.length > 0 &&
    plan.linhas.every(
      (line) => line.status === "JA_PROCESSADO" || line.status === "JA_FATURADO",
    )
  );
}

export async function handleBillingImportHttp(req: any, res: any, forceDryRun = false) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  const expectedToken =
    process.env.BILLING_IMPORT_API_TOKEN ||
    process.env.ORDER_IMPORT_API_TOKEN ||
    process.env.INTEGRATION_TOKEN;
  if (!expectedToken) {
    return res.status(503).json({
      sucesso: false,
      erro: "API_TOKEN_NAO_CONFIGURADO",
      mensagem:
        "Configure BILLING_IMPORT_API_TOKEN, ORDER_IMPORT_API_TOKEN ou INTEGRATION_TOKEN antes de habilitar a API de faturamento.",
    });
  }

  if (getBearerToken(req) !== expectedToken) {
    return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  }

  const payload = normalizePayload(req.body);
  const faturamentos = Array.isArray(payload.faturamentos) ? payload.faturamentos : [];
  const pedidosInteiros = Array.isArray(payload.faturarPedidosInteiros)
    ? payload.faturarPedidosInteiros
    : [];

  if (faturamentos.length === 0 && pedidosInteiros.length === 0) {
    return res.status(400).json({
      sucesso: false,
      erro: "FATURAMENTO_INVALIDO",
      mensagem:
        "Informe pelo menos uma linha em faturamentos ou um código em faturarPedidosInteiros.",
    });
  }

  // Mantém cada transação abaixo de um volume seguro de escritas no Firestore,
  // inclusive quando o item possui componentes/BOM e gera movimentações extras.
  if (faturamentos.length + pedidosInteiros.length > 50) {
    return res.status(413).json({
      sucesso: false,
      erro: "LOTE_MUITO_GRANDE",
      mensagem:
        "O limite é de 50 linhas/pedidos por requisição. Divida documentos maiores em lotes mantendo o mesmo documentKey e lineId únicos.",
    });
  }

  const missingLocatorIndexes = faturamentos
    .map((line, index) => ({
      index,
      hasLocator:
        String(line?.codigoPedido ?? "").trim().length > 0 ||
        String(line?.cliente ?? "").trim().length > 0,
    }))
    .filter((entry) => !entry.hasLocator)
    .map((entry) => entry.index + 1);
  if (missingLocatorIndexes.length > 0) {
    return res.status(400).json({
      sucesso: false,
      erro: "LOCALIZADOR_PEDIDO_OBRIGATORIO",
      mensagem:
        "Cada linha de faturamento deve informar codigoPedido ou cliente. O sistema nunca escolhe um pedido apenas pelo produto.",
      linhas: missingLocatorIndexes,
    });
  }

  const tenantId =
    String(payload.tenantId || req.headers?.["x-tenant-id"] || "imperio").trim() ||
    "imperio";
  const origem = String(payload.origem || "CHATGPT").trim() || "CHATGPT";
  const solicitadoPor = String(
    payload.solicitadoPor ||
      req.headers?.["x-integration-user"] ||
      "chatgpt-integration",
  ).trim();
  const documentKey = getBillingDocumentKey(payload);

  if (!documentKey) {
    return res.status(400).json({
      sucesso: false,
      erro: "DOCUMENT_KEY_OBRIGATORIA",
      mensagem:
        "Informe documentKey (ex.: número da NF/romaneio ou identificador estável do arquivo) para impedir faturamento duplicado.",
    });
  }

  const normalizedPayload: BillingImportPayload = {
    ...payload,
    tenantId,
    origem,
    solicitadoPor,
    documentKey,
  };

  try {
    const repository = new FirestoreBillingRepository();
    const snapshot = await repository.loadSnapshot(tenantId);
    const sourceKeys = collectSourceKeys(normalizedPayload, snapshot);
    const processedSourceKeys = await repository.findProcessedSourceKeys(
      tenantId,
      documentKey,
      sourceKeys,
    );
    const plan = buildBillingPlan(snapshot, normalizedPayload, {
      tenantId,
      origem,
      solicitadoPor,
      processedSourceKeys,
    });

    if (forceDryRun || String(req.query?.dryRun || "").toLowerCase() === "true") {
      return res.status(plan.resumo.pendencias > 0 ? 207 : 200).json({
        ...plan,
        modo: "PREVIEW",
        observacao:
          plan.resumo.pendencias > 0
            ? "Há linhas que exigem revisão. Nenhuma alteração foi feita no banco."
            : "Prévia validada. Nenhuma alteração foi feita no banco.",
      });
    }

    if (payload.expectedPreviewHash && payload.expectedPreviewHash !== plan.previewHash) {
      return res.status(409).json({
        sucesso: false,
        erro: "PREVIEW_DESATUALIZADA",
        mensagem:
          "Os dados do pedido mudaram desde a prévia. Revise a nova prévia antes de confirmar.",
        previewAtual: plan,
      });
    }

    if (!plan.canConfirm) {
      if (onlyNoopStatuses(plan)) {
        return res.status(200).json({
          sucesso: true,
          modo: "CONFIRMADO",
          mensagem: "Nenhum novo faturamento foi necessário.",
          previewHash: plan.previewHash,
          linhas: plan.linhas,
          resumo: {
            aplicados: 0,
            duplicadosIgnorados: plan.resumo.jaProcessados,
            jaFaturados: plan.resumo.jaFaturados,
            quantidadeFaturada: 0,
          },
        });
      }
      return res.status(422).json({
        sucesso: false,
        erro: "FATURAMENTO_REQUER_REVISAO",
        mensagem:
          "Existem linhas não resolvidas. Corrija o pedido/item ou autorize explicitamente a quebra de reserva antes de confirmar.",
        preview: plan,
      });
    }

    const result = await repository.applyPlan(plan);
    return res.status(200).json({
      ...result,
      modo: "CONFIRMADO",
      previewHash: plan.previewHash,
    });
  } catch (error: any) {
    if (error instanceof BillingStateChangedError || error?.code === "BILLING_STATE_CHANGED") {
      return res.status(409).json({
        sucesso: false,
        erro: "BILLING_STATE_CHANGED",
        mensagem: error?.message || "O pedido mudou durante o faturamento. Valide novamente.",
      });
    }
    console.error("[Billing Import API]", error);
    return res.status(500).json({
      sucesso: false,
      erro: "ERRO_INTERNO",
      mensagem: error?.message || "Erro interno no faturamento por API.",
    });
  }
}
