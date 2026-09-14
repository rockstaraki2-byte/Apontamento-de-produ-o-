import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const expectedPreviewHash = "c97e28b34c5b7e3a310e2710b1eccb26a3024e1b3867a8e4508765a3302371c6";
const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-CARGA-TARDE-14-SET-2026-09-14",
  expectedPreviewHash,
  faturamentos: [
    { lineId:"p1a-66962-5440-50", codigoPedido:"66962", cliente:"46 - CEMAIS DE ANGELO DE MELO CALDEIRA EIRELI", itemId:1788264481565, descricao:"CHAPA 3/16\" - 100MM X 70MM", quantidade:50, observacoes:"PDF entrega 67404" },
    { lineId:"p1b-66962-5441-50", codigoPedido:"66962", cliente:"46 - CEMAIS DE ANGELO DE MELO CALDEIRA EIRELI", itemId:1788264508685, descricao:"CHAPA 3/16\" - 130MM X 90MM", quantidade:50, observacoes:"PDF entrega 67404" },
    { lineId:"p2a-67398-392-150", codigoPedido:"67398", cliente:"69 - WELLINGTON OLIVEIRA SOUZA 04427448623", itemId:392, descricao:"SUPORTE INTERMEDIÁRIO", cor:"ZINCADO", quantidade:150, observacoes:"PDF entrega 67406; codigo impresso 392.1" },
    { lineId:"p2b-67398-797-200", codigoPedido:"67398", cliente:"69 - WELLINGTON OLIVEIRA SOUZA 04427448623", itemId:337, descricao:"SUPORTE BAIXO", cor:"ZINCADO", quantidade:200, observacoes:"PDF entrega 67406; codigo impresso 797.1" },
    { lineId:"p3a-66959-3932-300", codigoPedido:"66959", cliente:"461 - FEITAL E GASPARONI ESTOFADOS LTDA", itemId:1779765281202, descricao:"PÉ LATERAL RETO 1\" 12CM", cor:"PRETO FOSCO", quantidade:300, observacoes:"PDF entrega 67408; codigo impresso 3932.3" },
    { lineId:"p3b-66959-5358-100", codigoPedido:"66959", cliente:"461 - FEITAL E GASPARONI ESTOFADOS LTDA", itemId:1787076608611, descricao:"PÉ CENTRAL C/ RETORNO AUTOMÁTICO 22CM C/ SAPATA DE REGULAGEM", cor:"PRETO FOSCO", quantidade:100, observacoes:"PDF entrega 67408; codigo impresso 5358.3" },
    { lineId:"p4a-67028-4207-15", codigoPedido:"67028", cliente:"1072 - W L METAIS", itemId:4207, descricao:"CHAPA 3/16 - BASE REDONDA CENTRAL - 200MM X 200MM", quantidade:15, observacoes:"PDF entrega 67410" },
    { lineId:"p4b-67083-4420-2", codigoPedido:"67083", cliente:"1072 - W L METAIS", itemId:4420, descricao:"FLANGE 300X3/16", quantidade:2, observacoes:"PDF entrega 67410" },
    { lineId:"p5-67230-4224-300", codigoPedido:"67230", cliente:"1089 - MARTINS MATERIA PRIMA LTDA", itemId:4224, descricao:"BARRA CHATA REFORÇO 45 CM 2 FUROS - PERFILADA", cor:"CINZA", quantidade:300, observacoes:"PDF entrega 67412; codigo impresso 4224.11" },
    { lineId:"p6a-66957-4810-5", codigoPedido:"66957", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:1779765279567, descricao:"RODA GLIDER 50 CM", cor:"PRETO FOSCO", quantidade:5, observacoes:"PDF entrega 67414; codigo impresso 4810.3" },
    { lineId:"p6b-67079-3187-20", codigoPedido:"67079", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:2401, descricao:"PÉ CENTRAL REDONDO 15 CM", cor:"PRETO FOSCO", quantidade:20, observacoes:"PDF entrega 67414; codigo impresso 3187.3" },
    { lineId:"p6c-67192-4809-1", codigoPedido:"67192", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:4809, descricao:"RODA GLIDER 55 CM", cor:"PRETO FOSCO", quantidade:1, observacoes:"PDF entrega 67414; codigo impresso 4809.3" },
    { lineId:"p6d-67192-5483-2", codigoPedido:"67192", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:1788890537824, descricao:"BASE GIRATÓRIA REDONDA 550MM COM 100MM DE ALTURA C/ SISTEMA DE SAPATA", cor:"PRETO FOSCO", quantidade:2, observacoes:"PDF entrega 67414; codigo impresso 5483.3" }
  ]
};

async function main() {
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const keys = collectSourceKeys(payload, snapshot);
  const processed = await repo.findProcessedSourceKeys("imperio", payload.documentKey!, keys);
  const plan = buildBillingPlan(snapshot, payload, { tenantId:"imperio", origem:"CHATGPT_PDF", solicitadoPor:"raul", processedSourceKeys:processed });
  console.log("PRE_EXEC_RECHECK", JSON.stringify({resumo:plan.resumo,canConfirm:plan.canConfirm,previewHash:plan.previewHash}));
  if (plan.previewHash !== expectedPreviewHash) throw new Error(`Estado mudou desde a prévia. Esperado ${expectedPreviewHash}, atual ${plan.previewHash}`);
  if (!plan.canConfirm || plan.resumo.total !== 13 || plan.resumo.quantidadeAFaturar !== 1195 || plan.resumo.ajustesQuantidade !== 0 || plan.resumo.pendencias !== 0) throw new Error("Lote não pode ser confirmado ou resumo mudou.");
  const result = await repo.applyPlan(plan);
  console.log("EXEC_RESULT", JSON.stringify(result));
  if (result.resumo.aplicados !== 13 || result.resumo.quantidadeFaturada !== 1195 || result.resumo.duplicadosIgnorados !== 0) throw new Error(`Resultado inesperado: ${JSON.stringify(result.resumo)}`);

  const after = await repo.loadSnapshot("imperio");
  const expected = [
    {orderCode:"66962",itemId:1788264481565,total:50,invoiced:50,status:"FATURADO",active:false},
    {orderCode:"66962",itemId:1788264508685,total:50,invoiced:50,status:"FATURADO",active:false},
    {orderCode:"67398",itemId:392,total:150,invoiced:150,status:"FATURADO",active:false},
    {orderCode:"67398",itemId:337,total:200,invoiced:200,status:"FATURADO",active:false},
    {orderCode:"66959",itemId:1779765281202,total:300,invoiced:300,status:"FATURADO",active:false},
    {orderCode:"66959",itemId:1787076608611,total:350,invoiced:100,status:"FATURADO_PARCIAL",active:true},
    {orderCode:"67028",itemId:4207,total:15,invoiced:15,status:"FATURADO",active:false},
    {orderCode:"67083",itemId:4420,total:2,invoiced:2,status:"FATURADO",active:false},
    {orderCode:"67230",itemId:4224,total:600,invoiced:600,status:"FATURADO",active:false},
    {orderCode:"66957",itemId:1779765279567,total:5,invoiced:5,status:"FATURADO",active:false},
    {orderCode:"67079",itemId:2401,total:20,invoiced:20,status:"FATURADO",active:false},
    {orderCode:"67192",itemId:4809,total:1,invoiced:1,status:"FATURADO",active:false},
    {orderCode:"67192",itemId:1788890537824,total:2,invoiced:2,status:"FATURADO",active:false}
  ];
  const checks = expected.map((e)=>{ const rows=after.orders.filter((o)=>String(o.orderCode).trim()===e.orderCode && Number(o.itemId)===e.itemId); return {...e,rows:rows.map((o)=>({totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity??0,status:o.status,isActive:o.isActive}))}; });
  console.log("POST_VERIFY", JSON.stringify(checks));
  for (const check of checks) { if (check.rows.length !== 1) throw new Error(`Verificação encontrou ${check.rows.length} linhas para ${check.orderCode}/${check.itemId}`); const row=check.rows[0]; if(Number(row.totalQuantity)!==check.total || Number(row.invoicedQuantity)!==check.invoiced || row.status!==check.status || Boolean(row.isActive)!==check.active) throw new Error(`Verificação falhou para ${check.orderCode}/${check.itemId}: ${JSON.stringify(row)}`); }
  console.log("BILLING_0914_AFTERNOON_BATCH_OK", result.auditId ?? "sem-audit-id");
  process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1);});
