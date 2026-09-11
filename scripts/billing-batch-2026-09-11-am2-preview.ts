import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import type { OrderImportPayload } from "../api/_lib/orderImportRules.ts";

const tenantId = "imperio";

const billingPayload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId,
  solicitadoPor: "raul",
  documentKey: "FATURADOS-11-SET-MANHA2-2026-09-11",
  faturamentos: [
    { lineId: "p4-60090-2459-1500", codigoPedido: "60090", cliente: "48 - EVIDENCE MOVEIS E ESTOFADOS LTDA", codigoProduto: "2459", descricao: "BARRA CHATA REFORÇO 50 CM 2 FUROS - PERFILADA", quantidade: 1500, observacoes: "PDF entrega 67347" },
    { lineId: "p5-67330-4809-20", codigoPedido: "67330", cliente: "1057 - SIMAR RODRIGUES DE FARIA", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", cor: "PRETO FOSCO", quantidade: 20, observacoes: "PDF entrega 67349" },
    { lineId: "p6-66351-901-2000", codigoPedido: "66351", cliente: "1318 - F. F. INDUSTRIA DE ESTOFADOS LTDA", codigoProduto: "901", descricao: "CONECTOR IMPERIO", quantidade: 2000, observacoes: "PDF entrega 67351" },
    { lineId: "p7-67227-4809-10", codigoPedido: "67227", cliente: "1626 - FINE DECOR LTDA", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", cor: "PRETO FOSCO", quantidade: 10, observacoes: "PDF entrega 67353" },
    { lineId: "p8-67327-4809-50", codigoPedido: "67327", cliente: "714 - B.A CORBELLI INDUSTRIA DE MOVEIS LTDA", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", cor: "PRETO FOSCO", quantidade: 50, numeroNota: "6301", observacoes: "PDF entrega 67354" },
    { lineId: "p9a-66846-2739-2000", codigoPedido: "66846", cliente: "1009 - IMPERIO DECOR LTDA", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", cor: "ZINCADO", quantidade: 2000, numeroNota: "6302", observacoes: "PDF entrega 67355" },
    { lineId: "p9b-66846-3802-1300", codigoPedido: "66846", cliente: "1009 - IMPERIO DECOR LTDA", codigoProduto: "3802", descricao: "BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS", cor: "CINZA", quantidade: 1300, numeroNota: "6302", observacoes: "PDF entrega 67355" },
    { lineId: "p10-66578-4168-5", codigoPedido: "66578", cliente: "1209 - ART'BEL ESTOFADOS LTDA", codigoProduto: "4168", descricao: "BASE GIRATÓRIA REDONDA 500MM C/ 110MM DE ALTURA C/ GIRATÓRIA DE ESFERA", cor: "PRETO FOSCO", quantidade: 5, numeroNota: "6303", observacoes: "PDF entrega 67356" },
    { lineId: "p12-67244-2816-2", codigoPedido: "67244", cliente: "922 - INDUSTRIA BENATTI INOX RIO BRANCO LTDA", codigoProduto: "2816", descricao: "CASTELO 10X14", quantidade: 2, observacoes: "PDF entrega 67340" },
  ],
};

const missingOrdersPayload: OrderImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId,
  solicitadoPor: "raul",
  pedidos: [
    {
      codigoPedido: "67337",
      cliente: { codigo: 1478, nome: "CYRNE DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "Boleto",
      prazos: [30,45,60],
      comNotaFiscal: true,
      dataLimite: "2026-09-11",
      possuiRET: false,
      observacoes: "Nota 6300 - PDF entrega 67338",
      itens: [
        { codigoProduto: "4516", descricao: "CHAPA 1/4 - PÉ DIR POLT. ORACULO", familia: "INDEFINIDA", quantidade: 14, precoUnitario: 54.51, descontoPercentual: 0 },
        { codigoProduto: "4517", descricao: "CHAPA 1/4 - PÉ ESQ POLT. ORACULO", familia: "INDEFINIDA", quantidade: 14, precoUnitario: 54.51, descontoPercentual: 0 },
        { codigoProduto: "5045", descricao: "CHAPA 1/4\" - ASSENTO CAD. VESPER", familia: "INDEFINIDA", quantidade: 128, precoUnitario: 6.00, descontoPercentual: 0 },
      ],
    },
    {
      codigoPedido: "67341",
      cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "PIX",
      prazos: [],
      comNotaFiscal: false,
      dataLimite: "2026-09-11",
      possuiRET: false,
      observacoes: "CLIENTE MAZINHO - ORÇAMENTO 056 - PDF entrega 67345",
      itens: [
        { codigoProduto: "5510", descricao: "CHAPA MAZINHO - CHAPA 1MM X 70 MM X 247 MM", familia: "GERENCIAL", quantidade: 199, precoUnitario: 3.83, descontoPercentual: 0 },
      ],
    },
  ],
};

async function main() {
  const billingRepo = new FirestoreBillingRepository();
  const billingSnapshot = await billingRepo.loadSnapshot(tenantId);
  const sourceKeys = collectSourceKeys(billingPayload, billingSnapshot);
  const processed = await billingRepo.findProcessedSourceKeys(tenantId, billingPayload.documentKey!, sourceKeys);
  const billingPlan = buildBillingPlan(billingSnapshot, billingPayload, {
    tenantId,
    origem: "CHATGPT_PDF",
    solicitadoPor: "raul",
    processedSourceKeys: processed,
  });
  console.log("BILLING_PREVIEW", JSON.stringify({ resumo: billingPlan.resumo, canConfirm: billingPlan.canConfirm, previewHash: billingPlan.previewHash, linhas: billingPlan.linhas }));
  if (!billingPlan.canConfirm) throw new Error("Billing preview possui pendências.");

  const orderRepo = new FirestoreOrderImportRepository();
  const orderPreview = await processOrderImport(
    orderRepo,
    missingOrdersPayload,
    { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul" },
    true,
  );
  console.log("ORDER_IMPORT_PREVIEW", JSON.stringify(orderPreview));
  if (orderPreview.resumo.comErro !== 0 || orderPreview.resumo.validos !== 2) throw new Error("Prévia dos pedidos ausentes falhou.");

  console.log("AM2_PREVIEW_OK", JSON.stringify({ billingPreviewHash: billingPlan.previewHash, billingQuantity: billingPlan.resumo.quantidadeAFaturar }));
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
