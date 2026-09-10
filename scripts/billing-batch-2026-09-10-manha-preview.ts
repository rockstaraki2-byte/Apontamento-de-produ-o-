import {
  buildBillingPlan,
  collectSourceKeys,
  type BillingImportPayload,
} from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

async function main() {
  const tenantId = "imperio";
  const documentKey = "FATURADOS-10-SET-MANHA-2026-09-10";

  const payload: BillingImportPayload = {
    origem: "CHATGPT_PDF",
    tenantId,
    solicitadoPor: "raul",
    documentKey,
    allowBreakReservations: false,
    faturamentos: [
      { lineId: "p1-67256-3585-11", codigoPedido: "67256", cliente: "824 - AW INTERIORES LTDA", codigoProduto: "3585", cor: "11", descricao: "PAR MECANISMO SOFÁ BAÚ", quantidade: 20 },
      { lineId: "p2-67230-2517-11", codigoPedido: "67230", cliente: "1089 - MARTINS MATERIA PRIMA LTDA", codigoProduto: "2517", cor: "11", descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA", quantidade: 2000 },
      { lineId: "p2-67230-4224-11", codigoPedido: "67230", cliente: "1089 - MARTINS MATERIA PRIMA LTDA", codigoProduto: "4224", cor: "11", descricao: "BARRA CHATA REFORÇO 45 CM 2 FUROS - PERFILADA", quantidade: 300 },
      { lineId: "p3-67254-507", codigoPedido: "67254", cliente: "1123 - M.R. DECOR LTDA", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", quantidade: 10000 },
      { lineId: "p3-67254-1880-1", codigoPedido: "67254", cliente: "1123 - M.R. DECOR LTDA", codigoProduto: "1880", cor: "1", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", quantidade: 1000 },
      { lineId: "p3-67254-2739-1", codigoPedido: "67254", cliente: "1123 - M.R. DECOR LTDA", codigoProduto: "2739", cor: "1", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", quantidade: 500 },
      { lineId: "p3-67254-3730-11", codigoPedido: "67254", cliente: "1123 - M.R. DECOR LTDA", codigoProduto: "3730", cor: "11", descricao: "BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS - MODELO C/ CURVA", quantidade: 400 },
      { lineId: "p4-67257-2572-11", codigoPedido: "67257", cliente: "1702 - CELSO JUNIO TEIXEIRA 12504226632", codigoProduto: "2572", cor: "11", descricao: "PAR FLAME MDP 100X160X2,5 COM 70 LARGURA", quantidade: 25 },
      { lineId: "p5-67229-1880-1", codigoPedido: "67229", cliente: "919 - NYNA MARQUES INDUSTRIA E COMERCIO MOVEIS LIMITADA", codigoProduto: "1880", cor: "1", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", quantidade: 500, numeroNota: "6290" },
      { lineId: "p6-67271-1-1", codigoPedido: "67271", cliente: "6 - VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI", codigoProduto: "1", cor: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", quantidade: 750 },
      { lineId: "p6-67271-4-1", codigoPedido: "67271", cliente: "6 - VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI", codigoProduto: "4", cor: "1", descricao: "PAR DE CONECTOR ESCARIADO 1,9MM", quantidade: 750 },
      { lineId: "p6-67271-507", codigoPedido: "67271", cliente: "6 - VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", quantidade: 5000 },
      { lineId: "p7-67270-1-1", codigoPedido: "67270", cliente: "6 - VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI", codigoProduto: "1", cor: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", quantidade: 750, numeroNota: "6291" },
      { lineId: "p7-67270-4-1", codigoPedido: "67270", cliente: "6 - VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI", codigoProduto: "4", cor: "1", descricao: "PAR DE CONECTOR ESCARIADO 1,9MM", quantidade: 750, numeroNota: "6291" },
      { lineId: "p7-67270-507", codigoPedido: "67270", cliente: "6 - VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", quantidade: 5000, numeroNota: "6291" },
      { lineId: "p8-66961-2962-11", codigoPedido: "66961", cliente: "1123 - M.R. DECOR LTDA", codigoProduto: "2962", cor: "11", descricao: "PAR DE MECANISMO RETRÁTIL METAL 65 CM", quantidade: 335 },
    ],
  };

  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);
  const sourceKeys = collectSourceKeys(payload, snapshot);
  const processedSourceKeys = await repo.findProcessedSourceKeys(tenantId, documentKey, sourceKeys);
  const plan = buildBillingPlan(snapshot, payload, {
    tenantId,
    origem: "CHATGPT_PDF",
    solicitadoPor: "raul",
    processedSourceKeys,
  });

  console.log("BATCH_PREVIEW_SUMMARY", JSON.stringify(plan.resumo));
  console.log("BATCH_PREVIEW_CAN_CONFIRM", plan.canConfirm);
  for (const line of plan.linhas) {
    console.log("BATCH_LINE", JSON.stringify({
      sourceKey: line.sourceKey,
      status: line.status,
      message: line.message,
      input: line.input,
      candidateOrderIds: line.candidateOrderIds,
      candidateOrderCodes: line.candidateOrderCodes,
      operation: line.operation ? {
        orderId: line.operation.orderId,
        orderCode: line.operation.orderCode,
        customerName: line.operation.customerName,
        itemId: line.operation.itemId,
        itemCode: line.operation.itemCode,
        itemName: line.operation.itemName,
        color: line.operation.color,
        billingQuantity: line.operation.billingQuantity,
        currentTotalQuantity: line.operation.currentTotalQuantity,
        currentInvoicedQuantity: line.operation.currentInvoicedQuantity,
        newTotalQuantity: line.operation.newTotalQuantity,
        newInvoicedQuantity: line.operation.newInvoicedQuantity,
        quantityAdjustedBy: line.operation.quantityAdjustedBy,
        resultingStatus: line.operation.resultingStatus,
        reservationConflict: line.operation.reservationConflict || null,
      } : null,
    }));
  }
  process.exit(plan.canConfirm ? 0 : 2);
}

main().catch((error) => {
  console.error("BATCH_PREVIEW_ERROR", error?.stack || error);
  process.exit(1);
});
