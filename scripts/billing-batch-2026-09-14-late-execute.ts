import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const expectedPreviewHash = "4937bc4976f182fc5d96be1d588dc7a19203a49d8f5f74cb675ebe94532e763b";
const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF", tenantId: "imperio", solicitadoPor: "raul",
  documentKey: "CARGAS-DA-TARDE-14-SETEMBRO-2026-09-14", expectedPreviewHash,
  faturamentos: [
    { lineId:"p1-67398-392-150", codigoPedido:"67398", cliente:"69 - WELLINGTON OLIVEIRA SOUZA 04427448623", itemId:392, descricao:"SUPORTE INTERMEDIÁRIO", cor:"ZINCADO", quantidade:150, observacoes:"PDF carga 3670 entrega 67417; codigo impresso 392.1" },
    { lineId:"p2-66174-3193-150", codigoPedido:"66174", cliente:"72 - WTEK", itemId:2140, descricao:"SAPATA GIRATORIA COMUM", cor:"PRETO FOSCO", variacao:"DONA EVA", quantidade:150, observacoes:"PDF carga 3670 entrega 67419; codigo impresso 3193.3" },
    { lineId:"p3-66961-3108-300", codigoPedido:"66961", cliente:"1123 - M.R. DECOR LTDA", itemId:2489, descricao:"PAR DE MECANISMO RETRÁTIL METAL 85 CM", cor:"CINZA", quantidade:300, observacoes:"PDF carga 3670 entrega 67421; codigo impresso 3108.11" },
    { lineId:"p4a-66850-1653-471", codigoPedido:"66850", cliente:"28 - CORBELLI E PEREIRA LTDA", itemId:1653, descricao:"TAMPO 300 MM CHAPA 1/8 COM FURO 1\"", quantidade:471, numeroNota:"6313", observacoes:"PDF carga 3671 entrega 67423" },
    { lineId:"p4b-67422-1653-22", codigoPedido:"67422", cliente:"28 - CORBELLI E PEREIRA LTDA", itemId:1653, descricao:"TAMPO 300 MM CHAPA 1/8 COM FURO 1\"", quantidade:22, numeroNota:"6313", observacoes:"PDF carga 3671 entrega 67423" },
    { lineId:"p5a-67415-5512-9", codigoPedido:"67415", cliente:"858 - CONSUMIDOR FINAL", itemId:1789401316500, descricao:"CHAPA 1 - CHAPA 1/8\" X 295 MM X 1195 MM", quantidade:9, observacoes:"PDF carga 3672 entrega 67429" },
    { lineId:"p5b-67415-5513-4", codigoPedido:"67415", cliente:"858 - CONSUMIDOR FINAL", itemId:1789401365077, descricao:"CHAPA 2 - CHAPA 1/8\" X 295 MM X 1995 MM", quantidade:4, observacoes:"PDF carga 3672 entrega 67429" },
    { lineId:"p5c-67415-5514-1", codigoPedido:"67415", cliente:"858 - CONSUMIDOR FINAL", itemId:1789401397549, descricao:"CHAPA 3 - CHAPA 1/8\" X 660 MM X 2115 MM", quantidade:1, observacoes:"PDF carga 3672 entrega 67429" },
    { lineId:"p5d-67415-5515-2", codigoPedido:"67415", cliente:"858 - CONSUMIDOR FINAL", itemId:1789401432219, descricao:"CHAPA 4 - CHAPA 1/8\" X 660 MM X 1195 MM", quantidade:2, observacoes:"PDF carga 3672 entrega 67429" },
    { lineId:"p5e-67415-5516-2", codigoPedido:"67415", cliente:"858 - CONSUMIDOR FINAL", itemId:1789401466406, descricao:"CHAPA 5 - CHAPA 1/8\" X 250 MM X 2114 MM", quantidade:2, observacoes:"PDF carga 3672 entrega 67429" },
    { lineId:"p5f-67415-5517-1", codigoPedido:"67415", cliente:"858 - CONSUMIDOR FINAL", itemId:1789401496428, descricao:"CHAPA 6 - CHAPA 1/8\" X 660 MM X 1324 MM", quantidade:1, observacoes:"PDF carga 3672 entrega 67429" }
  ]
};

async function main(){
  const repo=new FirestoreBillingRepository();
  const snapshot=await repo.loadSnapshot("imperio");
  const keys=collectSourceKeys(payload,snapshot);
  const processed=await repo.findProcessedSourceKeys("imperio",payload.documentKey!,keys);
  const plan=buildBillingPlan(snapshot,payload,{tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",processedSourceKeys:processed});
  console.log("PRE_EXEC_RECHECK",JSON.stringify({resumo:plan.resumo,canConfirm:plan.canConfirm,previewHash:plan.previewHash}));
  if(plan.previewHash!==expectedPreviewHash) throw new Error(`Estado mudou desde a prévia. Esperado ${expectedPreviewHash}, atual ${plan.previewHash}`);
  if(!plan.canConfirm || plan.resumo.total!==11 || plan.resumo.quantidadeAFaturar!==1112 || plan.resumo.ajustesQuantidade!==2 || plan.resumo.pendencias!==0) throw new Error("Lote não pode ser confirmado ou resumo mudou.");
  const result=await repo.applyPlan(plan);
  console.log("EXEC_RESULT",JSON.stringify(result));
  if(result.resumo.aplicados!==11 || result.resumo.quantidadeFaturada!==1112 || result.resumo.itensComQuantidadeAjustada!==2 || result.resumo.duplicadosIgnorados!==0) throw new Error(`Resultado inesperado: ${JSON.stringify(result.resumo)}`);

  const after=await repo.loadSnapshot("imperio");
  const expected=[
    {orderCode:"67398",itemId:392,total:300,invoiced:300,status:"FATURADO",active:false},
    {orderCode:"66174",itemId:2140,total:1000,invoiced:610,status:"FATURADO_PARCIAL",active:true},
    {orderCode:"66961",itemId:2489,total:533,invoiced:533,status:"FATURADO",active:false},
    {orderCode:"66850",itemId:1653,total:600,invoiced:600,status:"FATURADO",active:false},
    {orderCode:"67422",itemId:1653,total:22,invoiced:22,status:"FATURADO",active:false},
    {orderCode:"67415",itemId:1789401316500,total:9,invoiced:9,status:"FATURADO",active:false},
    {orderCode:"67415",itemId:1789401365077,total:4,invoiced:4,status:"FATURADO",active:false},
    {orderCode:"67415",itemId:1789401397549,total:1,invoiced:1,status:"FATURADO",active:false},
    {orderCode:"67415",itemId:1789401432219,total:2,invoiced:2,status:"FATURADO",active:false},
    {orderCode:"67415",itemId:1789401466406,total:2,invoiced:2,status:"FATURADO",active:false},
    {orderCode:"67415",itemId:1789401496428,total:1,invoiced:1,status:"FATURADO",active:false}
  ];
  const checks=expected.map((e)=>{const rows=after.orders.filter((o)=>String(o.orderCode).trim()===e.orderCode && Number(o.itemId)===e.itemId);return {...e,rows:rows.map((o)=>({totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity??0,status:o.status,isActive:o.isActive}))};});
  console.log("POST_VERIFY",JSON.stringify(checks));
  for(const check of checks){if(check.rows.length!==1) throw new Error(`Verificação encontrou ${check.rows.length} linhas para ${check.orderCode}/${check.itemId}`);const row=check.rows[0];if(Number(row.totalQuantity)!==check.total||Number(row.invoicedQuantity)!==check.invoiced||row.status!==check.status||Boolean(row.isActive)!==check.active) throw new Error(`Verificação falhou para ${check.orderCode}/${check.itemId}: ${JSON.stringify(row)}`);}
  console.log("BILLING_0914_LATE_BATCH_OK",result.auditId??"sem-audit-id");
  process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1);});