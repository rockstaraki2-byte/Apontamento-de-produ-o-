import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import type { OrderImportPayload } from "../api/_lib/orderImportRules.ts";

const tenantId = "imperio";
const documentKey = "FATURADOS-10-SET-TARDE-2026-09-10";
const EXPECTED_EXISTING_HASH = "1001145dca3be187a9cb77ab42f0d4059cd58afe4ea8d138ee06bfdbedfb1063";

const existingLines = [
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
  { lineId: "p18-67159-2517-11", codigoPedido: "67159", cliente: "95 - FZ ESTOFADOS LTDA", codigoProduto: "2517", descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA", quantidade: 1000, observacoes: "PDF: código 2517.11 = CINZA; pedido interno sem cor cadastrada" },
] as const;

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
      observacoes: "Criado a partir do faturamento gerencial de 10/09/2026 - CLIENTE YURI",
      itens: [
        { codigoOriginal: "2063.3", codigoProduto: "2063", descricao: "PE CARRIERI LATERAL", quantidade: 42, precoUnitario: 15.8, descontoPercentual: 15 },
      ],
    },
  ],
};

function baseItemCode(code: unknown) {
  return String(code ?? "").replace(/\..*$/, "");
}

async function main() {
  const billingRepo = new FirestoreBillingRepository();
  const before = await billingRepo.loadSnapshot(tenantId);
  const existingPayload: BillingImportPayload = {
    origem: "CHATGPT_PDF", tenantId, solicitadoPor: "raul", documentKey,
    allowBreakReservations: false, faturamentos: [...existingLines],
  };
  const existingSourceKeys = collectSourceKeys(existingPayload, before);
  const existingProcessed = await billingRepo.findProcessedSourceKeys(tenantId, documentKey, existingSourceKeys);
  const existingPlan = buildBillingPlan(before, existingPayload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", processedSourceKeys: existingProcessed });
  console.log("PRECREATE_HASH", existingPlan.previewHash);
  console.log("PRECREATE_SUMMARY", JSON.stringify(existingPlan.resumo));
  if (existingPlan.previewHash !== EXPECTED_EXISTING_HASH || !existingPlan.canConfirm || existingPlan.resumo.pendencias !== 0 || existingPlan.resumo.quantidadeAFaturar !== 9850 || existingPlan.resumo.ajustesQuantidade !== 2) {
    throw new Error("Estado dos 12 faturamentos existentes mudou desde a prévia. Nenhuma criação/faturamento foi iniciado.");
  }

  const itemMapBefore = new Map(before.items.map((item) => [String(item.id), item]));
  for (const [orderCode, itemCode, total, invoiced] of [["67285","2787",9,9],["67282","5354",100,100],["67296","5191",12,12]] as const) {
    const row = before.orders.find((o) => String(o.orderCode) === orderCode && baseItemCode(itemMapBefore.get(String(o.itemId))?.code || o.itemId) === itemCode);
    if (!row || Number(row.totalQuantity) !== total || Number(row.invoicedQuantity || 0) !== invoiced) {
      throw new Error(`Pedido que deveria ser ignorado não está mais totalmente faturado: ${orderCode}/${itemCode}`);
    }
  }

  const orderRepo = new FirestoreOrderImportRepository();
  const importResult = await processOrderImport(orderRepo, missingOrdersPayload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul" }, false);
  console.log("CREATE_RESULT", JSON.stringify(importResult));
  if (importResult.resultados.some((r) => r.status !== "CRIADO" && r.status !== "JA_EXISTE")) {
    throw new Error(`Falha ao criar/confirmar os pedidos ausentes: ${JSON.stringify(importResult.resumo)}`);
  }

  const afterCreate = await billingRepo.loadSnapshot(tenantId);
  const itemMap = new Map(afterCreate.items.map((item) => [String(item.id), item]));
  const expectedNewLines = [
    ["67145","1630",24,"-"],
    ["67145","4890",34,"-"],
    ["67145","4891",64,"-"],
    ["67145","5202",36,"-"],
    ["66682","2063",42,"PRETO FOSCO"],
  ] as const;
  for (const [orderCode, itemCode, total, color] of expectedNewLines) {
    const row = afterCreate.orders.find((o) => String(o.orderCode) === orderCode && baseItemCode(itemMap.get(String(o.itemId))?.code || o.itemId) === itemCode);
    if (!row || Number(row.totalQuantity) !== total || Number(row.invoicedQuantity || 0) !== 0 || String(row.color || "-") !== color) {
      throw new Error(`Pedido recém-criado não bate com o PDF: ${orderCode}/${itemCode} => ${JSON.stringify(row)}`);
    }
  }

  const finalPayload: BillingImportPayload = {
    origem: "CHATGPT_PDF",
    tenantId,
    solicitadoPor: "raul",
    documentKey,
    allowBreakReservations: false,
    faturamentos: [...existingLines],
    faturarPedidosInteiros: ["67145", "66682"],
  };
  const allSourceKeys = collectSourceKeys(finalPayload, afterCreate);
  const allProcessed = await billingRepo.findProcessedSourceKeys(tenantId, documentKey, allSourceKeys);
  const finalPlan = buildBillingPlan(afterCreate, finalPayload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", processedSourceKeys: allProcessed });
  console.log("FINAL_PREVIEW_HASH", finalPlan.previewHash);
  console.log("FINAL_PREVIEW_SUMMARY", JSON.stringify(finalPlan.resumo));
  if (!finalPlan.canConfirm || finalPlan.linhas.length !== 17 || finalPlan.resumo.pendencias !== 0 || finalPlan.resumo.quantidadeAFaturar !== 10050 || finalPlan.resumo.ajustesQuantidade !== 2) {
    throw new Error(`Lote final não ficou exatamente 17 linhas / 10050 unidades / 2 ajustes: ${JSON.stringify(finalPlan.resumo)}`);
  }

  const result = await billingRepo.applyPlan(finalPlan);
  console.log("EXEC_RESULT", JSON.stringify(result));
  if (result.resumo.aplicados !== 17 || result.resumo.quantidadeFaturada !== 10050 || result.resumo.itensComQuantidadeAjustada !== 2) {
    throw new Error(`Resultado inesperado após faturamento: ${JSON.stringify(result.resumo)}`);
  }

  const after = await billingRepo.loadSnapshot(tenantId);
  const afterItemMap = new Map(after.items.map((item) => [String(item.id), item]));
  const checks = [
    ["65025","5181",8000,3181,"FATURADO_PARCIAL"],
    ["67255","1880",5000,5000,"FATURADO"],
    ["67029","3092",5,5,"FATURADO"],
    ["67104","2063",182,182,"FATURADO"],
    ["66963","4811",70,70,"FATURADO"],
    ["65780","3735",300,300,"FATURADO"],
    ["67081","2787",50,50,"FATURADO"],
    ["67081","3730",100,100,"FATURADO"],
    ["66667","3730",2000,2000,"FATURADO"],
    ["66717","3730",2000,1300,"FATURADO_PARCIAL"],
    ["67145","1630",24,24,"FATURADO"],
    ["67145","4890",34,34,"FATURADO"],
    ["67145","4891",64,64,"FATURADO"],
    ["67145","5202",36,36,"FATURADO"],
    ["66682","2063",42,42,"FATURADO"],
    ["66849","3165",50,50,"FATURADO"],
    ["67159","2517",1000,1000,"FATURADO"],
  ] as const;
  for (const [orderCode, itemCode, total, invoiced, status] of checks) {
    const row = after.orders.find((o) => String(o.orderCode) === orderCode && baseItemCode(afterItemMap.get(String(o.itemId))?.code || o.itemId) === itemCode);
    if (!row || Number(row.totalQuantity) !== total || Number(row.invoicedQuantity || 0) !== invoiced || row.status !== status) {
      throw new Error(`Pós-validação falhou: ${orderCode}/${itemCode} => ${JSON.stringify(row)}`);
    }
  }

  console.log("AFTERNOON_EXECUTION_OK: 2 pedidos criados; 17 linhas faturadas; 10050 unidades; 2 ajustes; 3 pedidos já faturados ignorados; páginas 1-8 da manhã ignoradas.");
  process.exit(0);
}

main().catch((error) => {
  console.error("AFTERNOON_EXECUTION_ERROR", error?.stack || error);
  process.exit(1);
});
