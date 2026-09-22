import { buildBillingPlan, collectSourceKeys } from "../api/_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.js";

const payload:any={
 origem:"CHATGPT_PDF",
 tenantId:"imperio",
 solicitadoPor:"raul",
 documentKey:"ROMANEIO-CARGAS-PADRAO-2026-09-22",
 allowBreakReservations:false,
 faturamentos:[
  {lineId:"p6-e67767-67751-9-200",codigoPedido:"67751",itemId:9,quantidade:200,numeroNota:"6354"},
  {lineId:"p6-e67767-67751-602-100",codigoPedido:"67751",itemId:602,quantidade:100,numeroNota:"6354"},
  {lineId:"p6-e67767-67751-3154-200",codigoPedido:"67751",itemId:1779765283047,quantidade:200,numeroNota:"6354"},
  {lineId:"p8-e67769-66728-4253-30",codigoPedido:"66728",itemId:4253,quantidade:30,numeroNota:"6356"},
  {lineId:"p9-e67771-67713-41-40",codigoPedido:"67713",itemId:41,quantidade:40},
  {lineId:"p9-e67771-67713-304-10",codigoPedido:"67713",itemId:304,quantidade:10},
  {lineId:"p7-e67768-67219-3644-residual-1",codigoPedido:"67219",itemId:3644,quantidade:1,numeroNota:"6355",observacoes:"Complemento para atingir as 16 unidades indicadas no romaneio; 15 já estavam faturadas."}
 ]
};

const repository=new FirestoreBillingRepository();
const snapshot=await repository.loadSnapshot("imperio");
const keys=collectSourceKeys(payload,snapshot);
const processed=await repository.findProcessedSourceKeys("imperio",payload.documentKey,keys);
const plan=buildBillingPlan(snapshot,payload,{
 tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",processedSourceKeys:processed
});

console.log("BILLING_PREVIEW="+JSON.stringify({
 previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
 linhas:plan.linhas.map((l:any)=>({
  status:l.status,message:l.message,sourceKey:l.sourceKey,candidateOrderIds:l.candidateOrderIds,
  operation:l.operation&&{
   orderId:l.operation.orderId,orderCode:l.operation.orderCode,itemId:l.operation.itemId,itemCode:l.operation.itemCode,
   billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,
   currentInvoicedQuantity:l.operation.currentInvoicedQuantity,newTotalQuantity:l.operation.newTotalQuantity,
   newInvoicedQuantity:l.operation.newInvoicedQuantity,quantityAdjustedBy:l.operation.quantityAdjustedBy
  }
 }))
}));

const exact=
 plan.resumo.total===7 &&
 plan.resumo.prontos===6 &&
 plan.resumo.ajustesQuantidade===1 &&
 plan.resumo.conflitosReserva===0 &&
 plan.resumo.jaProcessados===0 &&
 plan.resumo.jaFaturados===0 &&
 plan.resumo.pendencias===0 &&
 plan.resumo.quantidadeAFaturar===581 &&
 plan.canConfirm===true;

if(!exact){
 console.error("GUARD_FAILED="+JSON.stringify({resumo:plan.resumo,linhas:plan.linhas}));
 process.exit(2);
}

const result=await repository.applyPlan(plan);
const after=await repository.loadSnapshot("imperio");
const wanted=new Set(["67751","66728","67713","67219"]);
const verification=after.orders.filter((o:any)=>wanted.has(String(o.orderCode||""))).map((o:any)=>({
 id:o.id,orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,
 invoicedQuantity:o.invoicedQuantity,status:o.status,isActive:o.isActive
}));
console.log("BILLING_RESULT="+JSON.stringify({result,verification}));
process.exit(0);
