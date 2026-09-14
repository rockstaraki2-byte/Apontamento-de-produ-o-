import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "CARGAS-DA-TARDE-14-SETEMBRO-2026-09-14",
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
  console.log("BILLING_PREVIEW",JSON.stringify({resumo:plan.resumo,canConfirm:plan.canConfirm,previewHash:plan.previewHash,linhas:plan.linhas}));
  if(!plan.canConfirm) throw new Error("Preview possui pendências; faturamento bloqueado.");
  if(plan.resumo.total!==11 || plan.resumo.quantidadeAFaturar!==1112 || plan.resumo.ajustesQuantidade!==2 || plan.resumo.pendencias!==0) throw new Error(`Resumo inesperado: ${JSON.stringify(plan.resumo)}`);
  const adjustments=plan.linhas.filter((l:any)=>l.operation?.quantityAdjustedBy>0).map((l:any)=>({orderCode:l.operation.orderCode,itemId:l.operation.itemId,before:l.operation.currentTotalQuantity,after:l.operation.newTotalQuantity,bill:l.operation.billingQuantity}));
  console.log("ADJUSTMENTS",JSON.stringify(adjustments));
  console.log("BILLING_0914_LATE_PREVIEW_OK",plan.previewHash);
  process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1);});