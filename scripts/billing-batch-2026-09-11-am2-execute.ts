import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import type { OrderImportPayload } from "../api/_lib/orderImportRules.ts";

const tenantId = "imperio";
const expectedExistingHash = "14b0f0c22f45bc85b3f83f6af81d39bc425fd06bdc69158b13434293bc2b2549";
const documentKey = "FATURADOS-11-SET-MANHA2-2026-09-11";

const existingLines = [
  { lineId: "p4-60090-2459-1500", codigoPedido: "60090", cliente: "48 - EVIDENCE MOVEIS E ESTOFADOS LTDA", codigoProduto: "2459", descricao: "BARRA CHATA REFORÇO 50 CM 2 FUROS - PERFILADA", quantidade: 1500, observacoes: "PDF entrega 67347" },
  { lineId: "p5-67330-4809-20", codigoPedido: "67330", cliente: "1057 - SIMAR RODRIGUES DE FARIA", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", cor: "PRETO FOSCO", quantidade: 20, observacoes: "PDF entrega 67349" },
  { lineId: "p6-66351-901-2000", codigoPedido: "66351", cliente: "1318 - F. F. INDUSTRIA DE ESTOFADOS LTDA", codigoProduto: "901", descricao: "CONECTOR IMPERIO", quantidade: 2000, observacoes: "PDF entrega 67351" },
  { lineId: "p7-67227-4809-10", codigoPedido: "67227", cliente: "1626 - FINE DECOR LTDA", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", cor: "PRETO FOSCO", quantidade: 10, observacoes: "PDF entrega 67353" },
  { lineId: "p8-67327-4809-50", codigoPedido: "67327", cliente: "714 - B.A CORBELLI INDUSTRIA DE MOVEIS LTDA", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", cor: "PRETO FOSCO", quantidade: 50, numeroNota: "6301", observacoes: "PDF entrega 67354" },
  { lineId: "p9a-66846-2739-2000", codigoPedido: "66846", cliente: "1009 - IMPERIO DECOR LTDA", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", cor: "ZINCADO", quantidade: 2000, numeroNota: "6302", observacoes: "PDF entrega 67355" },
  { lineId: "p9b-66846-3802-1300", codigoPedido: "66846", cliente: "1009 - IMPERIO DECOR LTDA", codigoProduto: "3802", descricao: "BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS", cor: "CINZA", quantidade: 1300, numeroNota: "6302", observacoes: "PDF entrega 67355" },
  { lineId: "p10-66578-4168-5", codigoPedido: "66578", cliente: "1209 - ART'BEL ESTOFADOS LTDA", codigoProduto: "4168", descricao: "BASE GIRATÓRIA REDONDA 500MM C/ 110MM DE ALTURA C/ GIRATÓRIA DE ESFERA", cor: "PRETO FOSCO", quantidade: 5, numeroNota: "6303", observacoes: "PDF entrega 67356" },
  { lineId: "p12-67244-2816-2", codigoPedido: "67244", cliente: "922 - INDUSTRIA BENATTI INOX RIO BRANCO LTDA", codigoProduto: "2816", descricao: "CASTELO 10X14", quantidade: 2, observacoes: "PDF entrega 67340" },
];

const existingPayload: BillingImportPayload = {
  origem: "CHATGPT_PDF", tenantId, solicitadoPor: "raul", documentKey, faturamentos: existingLines,
};

const missingOrdersPayload: OrderImportPayload = {
  origem: "CHATGPT_PDF", tenantId, solicitadoPor: "raul",
  pedidos: [
    {
      codigoPedido: "67337", cliente: { codigo: 1478, nome: "CYRNE DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "Boleto", prazos: [30,45,60],
      comNotaFiscal: true, dataLimite: "2026-09-11", possuiRET: false, observacoes: "Nota 6300 - PDF entrega 67338",
      itens: [
        { codigoProduto: "4516", descricao: "CHAPA 1/4 - PÉ DIR POLT. ORACULO", familia: "INDEFINIDA", quantidade: 14, precoUnitario: 54.51, descontoPercentual: 0 },
        { codigoProduto: "4517", descricao: "CHAPA 1/4 - PÉ ESQ POLT. ORACULO", familia: "INDEFINIDA", quantidade: 14, precoUnitario: 54.51, descontoPercentual: 0 },
        { codigoProduto: "5045", descricao: "CHAPA 1/4\" - ASSENTO CAD. VESPER", familia: "INDEFINIDA", quantidade: 128, precoUnitario: 6.00, descontoPercentual: 0 },
      ],
    },
    {
      codigoPedido: "67341", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "PIX", prazos: [],
      comNotaFiscal: false, dataLimite: "2026-09-11", possuiRET: false,
      observacoes: "CLIENTE MAZINHO - ORÇAMENTO 056 - PDF entrega 67345",
      itens: [
        { codigoProduto: "5510", descricao: "CHAPA MAZINHO - CHAPA 1MM X 70 MM X 247 MM", familia: "GERENCIAL", quantidade: 199, precoUnitario: 3.83, descontoPercentual: 0 },
      ],
    },
  ],
};

async function buildPlan(repo: FirestoreBillingRepository, payload: BillingImportPayload) {
  const snapshot = await repo.loadSnapshot(tenantId);
  const sourceKeys = collectSourceKeys(payload, snapshot);
  const processed = await repo.findProcessedSourceKeys(tenantId, documentKey, sourceKeys);
  return buildBillingPlan(snapshot, payload, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", processedSourceKeys: processed });
}

async function main() {
  const billingRepo = new FirestoreBillingRepository();
  const preCreatePlan = await buildPlan(billingRepo, existingPayload);
  console.log("PRECREATE_RECHECK", JSON.stringify({ resumo: preCreatePlan.resumo, canConfirm: preCreatePlan.canConfirm, previewHash: preCreatePlan.previewHash }));
  if (preCreatePlan.previewHash !== expectedExistingHash || !preCreatePlan.canConfirm) {
    throw new Error("Estado dos pedidos existentes mudou desde a prévia; lote bloqueado.");
  }

  const orderRepo = new FirestoreOrderImportRepository();
  for (const code of ["67337", "67341"]) {
    const ids = await orderRepo.findExistingOrderIds(tenantId, code);
    if (ids.length > 0) throw new Error(`Pedido ${code} apareceu após a prévia; lote bloqueado para evitar duplicidade.`);
  }

  const createResult = await processOrderImport(
    orderRepo,
    missingOrdersPayload,
    { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul" },
    false,
  );
  console.log("CREATE_RESULT", JSON.stringify(createResult));
  if (createResult.resumo.criados !== 2 || createResult.resumo.comErro !== 0 || createResult.resumo.jaExistentes !== 0) {
    throw new Error("Os dois pedidos ausentes não foram criados exatamente como esperado.");
  }

  const combinedPayload: BillingImportPayload = {
    origem: "CHATGPT_PDF",
    tenantId,
    solicitadoPor: "raul",
    documentKey,
    faturamentos: existingLines,
    faturarPedidosInteiros: ["67337", "67341"],
  };
  const combinedPlan = await buildPlan(billingRepo, combinedPayload);
  console.log("COMBINED_PREVIEW", JSON.stringify({ resumo: combinedPlan.resumo, canConfirm: combinedPlan.canConfirm, previewHash: combinedPlan.previewHash, linhas: combinedPlan.linhas }));
  if (!combinedPlan.canConfirm || combinedPlan.resumo.pendencias !== 0) throw new Error("Lote combinado possui pendências.");
  if (combinedPlan.resumo.total !== 13 || combinedPlan.resumo.quantidadeAFaturar !== 7242 || combinedPlan.resumo.ajustesQuantidade !== 1) {
    throw new Error(`Resumo combinado inesperado: ${JSON.stringify(combinedPlan.resumo)}`);
  }

  const result = await billingRepo.applyPlan(combinedPlan);
  console.log("EXEC_RESULT", JSON.stringify(result));
  if (result.resumo.aplicados !== 13 || result.resumo.quantidadeFaturada !== 7242 || result.resumo.duplicadosIgnorados !== 0) {
    throw new Error(`Resultado de faturamento inesperado: ${JSON.stringify(result.resumo)}`);
  }

  const after = await billingRepo.loadSnapshot(tenantId);
  const itemMap = new Map(after.items.map((item) => [String(item.id), item]));
  const expected = [
    ["60090", "2459", 1500, 1500], ["67330", "4809", 20, 20], ["66351", "901", 2000, 2000],
    ["67227", "4809", 10, 10], ["67327", "4809", 50, 50], ["66846", "2739", 5000, 5000],
    ["66846", "3802", 3000, 3000], ["66578", "4168", 5, 5], ["67244", "2816", 2, 2],
    ["67337", "4516", 14, 14], ["67337", "4517", 14, 14], ["67337", "5045", 128, 128],
    ["67341", "5510", 199, 199],
  ] as const;

  const checks = expected.map(([orderCode, itemCode, total, invoiced]) => {
    const rows = after.orders.filter((o) => String(o.orderCode).trim() === orderCode && String(itemMap.get(String(o.itemId))?.code || o.itemId).replace(/\..*$/, "") === itemCode);
    return { orderCode, itemCode, total, invoiced, rows: rows.map((o) => ({ totalQuantity: o.totalQuantity, invoicedQuantity: o.invoicedQuantity ?? 0, status: o.status, isActive: o.isActive })) };
  });
  console.log("POST_VERIFY", JSON.stringify(checks));
  for (const check of checks) {
    if (check.rows.length !== 1) throw new Error(`Verificação encontrou ${check.rows.length} linhas para ${check.orderCode}/${check.itemCode}.`);
    const row = check.rows[0];
    if (Number(row.totalQuantity) !== check.total || Number(row.invoicedQuantity) !== check.invoiced || row.status !== "FATURADO" || row.isActive !== false) {
      throw new Error(`Verificação falhou para ${check.orderCode}/${check.itemCode}: ${JSON.stringify(row)}`);
    }
  }
  console.log("AM2_BATCH_OK", result.auditId ?? "sem-audit-id");
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
