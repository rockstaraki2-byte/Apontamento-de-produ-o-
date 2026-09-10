import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import type { OrderImportPayload } from "../api/_lib/orderImportRules.ts";

const tenantId = "imperio";
const documentKey = "FATURADOS-10-SET-TARDE-2026-09-10";

const existingBillingPayload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId,
  solicitadoPor: "raul",
  documentKey,
  allowBreakReservations: false,
  faturamentos: [
    { lineId: "p9-65025-5181", codigoPedido: "65025", cliente: "904 - ITATIAIA ELETRO E MOVEIS S/A", codigoProduto: "5181", descricao: "PORTA IMA P/ GANCHEIRAS D37,5X10MM AC - ITA 1700043533", quantidade: 1200, numeroNota: "6293" },
    { lineId: "p10-67255-1880-1", codigoPedido: "67255", cliente: "94 - STARTEN ESTOFADOS LTDA.", codigoProduto: "1880", cor: "ZINCADO", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", quantidade: 5000, numeroNota: "6294", observacoes: "PDF: código 1880.1 = cor ZINCADO" },
    { lineId: "p11-67029-3092", codigoPedido: "67029", cliente: "370 - STORE ESTOFADOS INDUSTRIA E COMERCIO LTDA", codigoProduto: "3092", descricao: "RODA GLIDER 100CM COM ESTABILIDADE", quantidade: 3, numeroNota: "6295" },
    { lineId: "p11-67104-2063-3", codigoPedido: "67104", cliente: "370 - STORE ESTOFADOS INDUSTRIA E COMERCIO LTDA", codigoProduto: "2063.3", cor: "PRETO FOSCO", descricao: "PE CARRIERI LATERAL", quantidade: 182, numeroNota: "6295", observacoes: "PDF: código 2063.3 = cor PRETO FOSCO" },
    { lineId: "p12-66963-4811-3", codigoPedido: "66963", cliente: "1157 - DDESING LTDA.", codigoProduto: "4811", cor: "PRETO FOSCO", descricao: "RODA GLIDER 60 CM", quantidade: 65, observacoes: "PDF: código 4811.3 = cor PRETO FOSCO" },
    { lineId: "p13-65780-3735-11", codigoPedido: "65780", cliente: "1290 - STANZIOLA MOVEIS LTDA", codigoProduto: "3735", cor: "CINZA", descricao: "PAR DE MECANISMO RETRÁTIL METAL 71,5 CM", quantidade: 300, observacoes: "PDF: código 3735.11 = cor CINZA" },
    { lineId: "p14-67081-2787-11", codigoPedido: "67081", cliente: "1290 - STANZIOLA MOVEIS LTDA", codigoProduto: "2787", cor: "CINZA", descricao: "PAR DE MECANISMO RETRÁTIL METAL 105 CM", quantidade: 50, observacoes: "PDF: código 2787.11 = cor CINZA" },
    { lineId: "p14-67081-3730-11", codigoPedido: "67081", cliente: "1290 - STANZIOLA MOVEIS LTDA", codigoProduto: "3730", cor: "CINZA", descricao: "BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS - MODELO C/ CURVA", quantidade: 100, observacoes: "PDF: código 3730.11 = cor CINZA" },
    { lineId: "p15-66667-3730-11", codigoPedido: "66667", cliente: "25 - MOVEIS B P LTDA", codigoProduto: "3730", cor: "CINZA", descricao: "BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS - MODELO C/ CURVA", quantidade: 600, numeroNota: "6296", observacoes: "PDF: código 3730.11 = cor CINZA" },
    { lineId: "p15-66717-3730-11", codigoPedido: "66717", cliente: "25 - MOVEIS B P LTDA", codigoProduto: "3730", cor: "CINZA", descricao: "BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS - MODELO C/ CURVA", quantidade: 1300, numeroNota: "6296", observacoes: "PDF: código 3730.11 = cor CINZA" },
    { lineId: "p17-66849-3165-3", codigoPedido: "66849", cliente: "856 - ROFER COMERCIO E IMPORTAÇÃO LTDA", codigoProduto: "3165", cor: "PRETO FOSCO", descricao: "PÉ AMESTERDÃ 20 CM", quantidade: 50, observacoes: "PDF: código 3165.3 = cor PRETO FOSCO" },
    { lineId: "p18-67159-2517-11", codigoPedido: "67159", cliente: "95 - FZ ESTOFADOS LTDA", codigoProduto: "2517", descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA", quantidade: 1000, observacoes: "PDF: código 2517.11 = CINZA; pedido interno está sem cor cadastrada, correspondência feita por pedido + código + descrição únicos" },
  ],
};

const missingOrdersPayload: OrderImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId,
  solicitadoPor: "raul",
  pedidos: [
    {
      codigoPedido: "67145",
      cliente: { codigo: "1478", nome: "CYRNE DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO",
      prazos: [30, 45, 60],
      comNotaFiscal: true,
      possuiRET: false,
      observacoes: "Criado a partir do faturamento 6297 de 10/09/2026",
      itens: [
        { codigoOriginal: "1630", codigoProduto: "1630", descricao: "GIRATORIO ESFERA 195X195X2,5 - COM RETORNO", quantidade: 24, precoUnitario: 65, descontoPercentual: 0 },
        { codigoOriginal: "4890", codigoProduto: "4890", descricao: "TARUGO CENTRAL TORNEADO", quantidade: 34, precoUnitario: 9.4, descontoPercentual: 0 },
        { codigoOriginal: "4891", codigoProduto: "4891", descricao: "PATACAS ROSCA 1/4\"", quantidade: 64, precoUnitario: 10.5, descontoPercentual: 0 },
        { codigoOriginal: "5202", codigoProduto: "5202", descricao: "CHAPA 3/16\" - BASE M.LATERAL CAFÉ", quantidade: 36, precoUnitario: 8, descontoPercentual: 0 },
      ],
    },
    {
      codigoPedido: "66682",
      cliente: { codigo: "856", nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [60],
      comNotaFiscal: false,
      possuiRET: false,
      observacoes: "Criado a partir do faturamento gerencial de 10/09/2026 - observação do documento: CLIENTE YURI",
      itens: [
        { codigoOriginal: "2063.3", codigoProduto: "2063", descricao: "PE CARRIERI LATERAL", quantidade: 42, precoUnitario: 15.8, descontoPercentual: 15 },
      ],
    },
  ],
};

async function main() {
  const orderRepo = new FirestoreOrderImportRepository();
  const importPreview = await processOrderImport(orderRepo, missingOrdersPayload, {
    tenantId,
    origem: "CHATGPT_PDF",
    solicitadoPor: "raul",
  }, true);
  console.log("IMPORT_PREVIEW", JSON.stringify(importPreview));
  if (importPreview.resumo.recebidos !== 2 || importPreview.resumo.validos !== 2 || importPreview.resumo.comErro !== 0 || importPreview.resumo.jaExistentes !== 0) {
    throw new Error(`Os dois pedidos ausentes não ficaram válidos para criação: ${JSON.stringify(importPreview.resumo)}`);
  }

  const billingRepo = new FirestoreBillingRepository();
  const snapshot = await billingRepo.loadSnapshot(tenantId);

  const skippedChecks = [
    ["67285", "2787", 9, 9],
    ["67282", "5354", 100, 100],
    ["67296", "5191", 12, 12],
  ] as const;
  const itemMap = new Map(snapshot.items.map((item) => [String(item.id), item]));
  for (const [orderCode, itemCode, total, invoiced] of skippedChecks) {
    const row = snapshot.orders.find((o) => String(o.orderCode) === orderCode && String(itemMap.get(String(o.itemId))?.code || o.itemId).replace(/\..*$/, "") === itemCode);
    if (!row || Number(row.totalQuantity) !== total || Number(row.invoicedQuantity || 0) !== invoiced) {
      throw new Error(`Pedido marcado para ignorar não está totalmente faturado como esperado: ${orderCode}/${itemCode}`);
    }
  }

  const sourceKeys = collectSourceKeys(existingBillingPayload, snapshot);
  const processedSourceKeys = await billingRepo.findProcessedSourceKeys(tenantId, documentKey, sourceKeys);
  const plan = buildBillingPlan(snapshot, existingBillingPayload, {
    tenantId,
    origem: "CHATGPT_PDF",
    solicitadoPor: "raul",
    processedSourceKeys,
  });
  console.log("BILLING_PREVIEW_SUMMARY", JSON.stringify(plan.resumo));
  console.log("BILLING_PREVIEW_HASH", plan.previewHash);
  for (const line of plan.linhas) {
    console.log("BILLING_LINE", JSON.stringify({ status: line.status, message: line.message, input: line.input, operation: line.operation || null }));
  }
  if (!plan.canConfirm || plan.linhas.length !== 12 || plan.resumo.pendencias !== 0 || plan.resumo.quantidadeAFaturar !== 9850 || plan.resumo.ajustesQuantidade !== 2) {
    throw new Error(`Prévia de faturamento existente não bateu com o esperado: ${JSON.stringify(plan.resumo)}`);
  }

  console.log("AFTERNOON_PREVIEW_OK");
  process.exit(0);
}

main().catch((error) => {
  console.error("AFTERNOON_PREVIEW_ERROR", error?.stack || error);
  process.exit(1);
});
