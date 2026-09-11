import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const expectedPreviewHash = "97dc193808bbc51e5714439e387217f2be59873ce80e2979763e2954f266d155";
const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-11-SET-1430-2026-09-11",
  expectedPreviewHash,
  faturamentos: [
    { lineId: "p11-67049-2-2000", codigoPedido: "67049", cliente: "1285 - ANTUARTE COMERCIO DE PLASTICOS E DECORACOES LTDA", itemId: 2, descricao: "RODIZIO SILICONE DE 50 TRANSPARENTE", cor: "ZINCADO", quantidade: 2000, numeroNota: "6304", observacoes: "PDF entrega 67359" },
    { lineId: "p12-67177-2793-2", codigoPedido: "67177", cliente: "63 - GREICE MOVEIS LTDA", itemId: 2793, descricao: "BASE MESA CARMELA", quantidade: 2, numeroNota: "6308", observacoes: "PDF entrega 67374" },
    { lineId: "p16-67357-961-378", codigoPedido: "67357", cliente: "1853 - A. S. TEIXEIRA E CIA LTDA", itemId: 961, descricao: "SUPORTE DE TV KIT COMPLETO", cor: "PRETO FOSCO", quantidade: 378, numeroNota: "6305", observacoes: "PDF entrega 67362; codigo impresso 961.3" },
    { lineId: "p17-67360-961-284", codigoPedido: "67360", cliente: "1853 - A. S. TEIXEIRA E CIA LTDA", itemId: 961, descricao: "SUPORTE DE TV KIT COMPLETO", cor: "PRETO FOSCO", quantidade: 284, observacoes: "PDF entrega 67366; codigo impresso 961.3" },
    { lineId: "p18-67367-961-378", codigoPedido: "67367", cliente: "1189 - KESSE JONES FIALHO", itemId: 961, descricao: "SUPORTE DE TV KIT COMPLETO", cor: "PRETO FOSCO", quantidade: 378, numeroNota: "6307", observacoes: "PDF entrega 67370; codigo impresso 961.3" },
    { lineId: "p19a-66850-1648-500", codigoPedido: "66850", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 1648, descricao: "ARRUELA PLANA TRIANON 60MM 01 10MM 03 TRIANGULARES 5 MM", quantidade: 500, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p19b-66850-1653-100", codigoPedido: "66850", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 1653, descricao: "TAMPO 300 MM CHAPA 1/8 COM FURO 1\"", quantidade: 100, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p19c-66850-2068-70", codigoPedido: "66850", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 2068, descricao: "TAMPO 200 MM CHAPA 1/8 SEM FURO - CORTE LAZER DUETO / CIPO/ CRETA", quantidade: 70, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p19d-66850-3138-60", codigoPedido: "66850", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 3138, descricao: "CHAPA OVAL MESA EVA 430X230X1/8", quantidade: 60, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p19e-66850-3774-50", codigoPedido: "66850", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 3774, descricao: "ARRUELA 4 FUROS COM OBLONGO DE 02 FUROS ESPELHO ACORDE", quantidade: 50, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p19f-66850-4050-1000", codigoPedido: "66850", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 4050, descricao: "ARRUELA PLANA 7/8 SEM FURO NA CHAPA 1/8", quantidade: 1000, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p19g-66850-5274-100", codigoPedido: "66850", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 1785848480918, descricao: "CHAPA 1/8\" - TAMPO MESA LATERAL ANCOR C/ CAVA", quantidade: 100, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p19h-67363-4050-46", codigoPedido: "67363", cliente: "28 - CORBELLI E PEREIRA LTDA", itemId: 4050, descricao: "ARRUELA PLANA 7/8 SEM FURO NA CHAPA 1/8", quantidade: 46, numeroNota: "6306", observacoes: "PDF entrega 67364" },
    { lineId: "p20-67375-3192-8", codigoPedido: "67375", cliente: "12 - ARAUCARIA MOVEIS E COMPONENTES LTDA", itemId: 3192, descricao: "SAPATA GIRATORIA COM GARRA", cor: "PRETO FOSCO", quantidade: 8, numeroNota: "6309", observacoes: "PDF entrega 67376; codigo impresso 3192.3" },
  ],
};

async function main() {
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const sourceKeys = collectSourceKeys(payload, snapshot);
  const processed = await repo.findProcessedSourceKeys("imperio", payload.documentKey!, sourceKeys);
  const plan = buildBillingPlan(snapshot, payload, {
    tenantId: "imperio",
    origem: "CHATGPT_PDF",
    solicitadoPor: "raul",
    processedSourceKeys: processed,
  });
  console.log("PRE_EXEC_RECHECK", JSON.stringify({ resumo: plan.resumo, canConfirm: plan.canConfirm, previewHash: plan.previewHash }));
  if (plan.previewHash !== expectedPreviewHash) throw new Error(`Estado mudou desde a prévia. Esperado ${expectedPreviewHash}, atual ${plan.previewHash}`);
  if (!plan.canConfirm || plan.resumo.total !== 14 || plan.resumo.quantidadeAFaturar !== 4976) throw new Error("Lote não pode ser confirmado ou resumo mudou.");

  const result = await repo.applyPlan(plan);
  console.log("EXEC_RESULT", JSON.stringify(result));
  if (result.resumo.aplicados !== 14 || result.resumo.quantidadeFaturada !== 4976 || result.resumo.duplicadosIgnorados !== 0) {
    throw new Error(`Resultado inesperado: ${JSON.stringify(result.resumo)}`);
  }

  const after = await repo.loadSnapshot("imperio");
  const expected = [
    { orderCode: "67049", itemId: 2, total: 2000, invoiced: 2000, status: "FATURADO" },
    { orderCode: "67177", itemId: 2793, total: 2, invoiced: 2, status: "FATURADO" },
    { orderCode: "67357", itemId: 961, total: 378, invoiced: 378, status: "FATURADO" },
    { orderCode: "67360", itemId: 961, total: 284, invoiced: 284, status: "FATURADO" },
    { orderCode: "67367", itemId: 961, total: 378, invoiced: 378, status: "FATURADO" },
    { orderCode: "66850", itemId: 1648, total: 500, invoiced: 500, status: "FATURADO" },
    { orderCode: "66850", itemId: 1653, total: 600, invoiced: 129, status: "FATURADO_PARCIAL" },
    { orderCode: "66850", itemId: 2068, total: 80, invoiced: 80, status: "FATURADO" },
    { orderCode: "66850", itemId: 3138, total: 60, invoiced: 60, status: "FATURADO" },
    { orderCode: "66850", itemId: 3774, total: 50, invoiced: 50, status: "FATURADO" },
    { orderCode: "66850", itemId: 4050, total: 1000, invoiced: 1000, status: "FATURADO" },
    { orderCode: "66850", itemId: 1785848480918, total: 120, invoiced: 120, status: "FATURADO" },
    { orderCode: "67363", itemId: 4050, total: 46, invoiced: 46, status: "FATURADO" },
    { orderCode: "67375", itemId: 3192, total: 8, invoiced: 8, status: "FATURADO" },
  ];

  const checks = expected.map((e) => {
    const rows = after.orders.filter((o) => String(o.orderCode).trim() === e.orderCode && Number(o.itemId) === e.itemId);
    return { ...e, rows: rows.map((o) => ({ totalQuantity: o.totalQuantity, invoicedQuantity: o.invoicedQuantity ?? 0, status: o.status, isActive: o.isActive })) };
  });
  console.log("POST_VERIFY", JSON.stringify(checks));
  for (const check of checks) {
    if (check.rows.length !== 1) throw new Error(`Verificação encontrou ${check.rows.length} linhas para ${check.orderCode}/${check.itemId}`);
    const row = check.rows[0];
    if (Number(row.totalQuantity) !== check.total || Number(row.invoicedQuantity) !== check.invoiced || row.status !== check.status) {
      throw new Error(`Verificação falhou para ${check.orderCode}/${check.itemId}: ${JSON.stringify(row)}`);
    }
    const shouldBeActive = check.status !== "FATURADO";
    if (Boolean(row.isActive) !== shouldBeActive) throw new Error(`isActive inesperado para ${check.orderCode}/${check.itemId}`);
  }
  console.log("BILLING_1430_BATCH_OK", result.auditId ?? "sem-audit-id");
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
