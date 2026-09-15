import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const payload: BillingImportPayload = {
  tenantId: "imperio",
  origem: "CHATGPT_PDF",
  solicitadoPor: "chatgpt-integration",
  documentKey: "FATURADOS-15-SET-PENDENTES-2026-09-15",
  allowBreakReservations: false,
  faturamentos: [
    { lineId: "p20-66667-1884-500", codigoPedido: "66667", itemId: 1884, quantidade: 500, numeroNota: "6315" },
    { lineId: "p20-66715-1-5000", codigoPedido: "66715", itemId: 1, quantidade: 5000, numeroNota: "6315" },
    { lineId: "p21-66679-1-3000", codigoPedido: "66679", itemId: 1, quantidade: 3000, numeroNota: "6316" },
    { lineId: "p22-66571-3810-2000", codigoPedido: "66571", itemId: 3810, quantidade: 2000, numeroNota: "6317" },
    { lineId: "p22-67328-3810-50", codigoPedido: "67328", itemId: 3810, quantidade: 50, numeroNota: "6317" },
    { lineId: "p23-67424-1630-80", codigoPedido: "67424", itemId: 1630, quantidade: 80, numeroNota: "6318" },
    { lineId: "p24-67234-4809-25", codigoPedido: "67234", itemId: 4809, quantidade: 25 },
    { lineId: "p25-67425-1880-500", codigoPedido: "67425", itemId: 1880, quantidade: 500 },
    { lineId: "p25-67425-2739-250", codigoPedido: "67425", itemId: 2739, quantidade: 250 },
  ],
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  try {
    const tenantId = String(payload.tenantId || "imperio");
    const repository = new FirestoreBillingRepository();
    const snapshot = await repository.loadSnapshot(tenantId);
    const sourceKeys = collectSourceKeys(payload, snapshot);
    const processedSourceKeys = await repository.findProcessedSourceKeys(
      tenantId,
      String(payload.documentKey),
      sourceKeys,
    );
    const plan = buildBillingPlan(snapshot, payload, {
      tenantId,
      origem: String(payload.origem || "CHATGPT_PDF"),
      solicitadoPor: String(payload.solicitadoPor || "chatgpt-integration"),
      processedSourceKeys,
    });

    if (!plan.canConfirm) {
      return res.status(422).json({
        sucesso: false,
        fase: "PREVIEW_BLOQUEADA",
        preview: plan,
      });
    }

    const result = await repository.applyPlan(plan);
    return res.status(200).json({
      sucesso: true,
      fase: "CONFIRMADO",
      preview: {
        previewHash: plan.previewHash,
        resumo: plan.resumo,
        linhas: plan.linhas.map((line) => ({
          sourceKey: line.sourceKey,
          status: line.status,
          message: line.message,
          operation: line.operation && {
            orderId: line.operation.orderId,
            orderCode: line.operation.orderCode,
            itemId: line.operation.itemId,
            itemCode: line.operation.itemCode,
            itemName: line.operation.itemName,
            billingQuantity: line.operation.billingQuantity,
            currentTotalQuantity: line.operation.currentTotalQuantity,
            currentInvoicedQuantity: line.operation.currentInvoicedQuantity,
            newTotalQuantity: line.operation.newTotalQuantity,
            newInvoicedQuantity: line.operation.newInvoicedQuantity,
            resultingStatus: line.operation.resultingStatus,
          },
        })),
      },
      result,
    });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error?.message || String(error) });
  }
}
