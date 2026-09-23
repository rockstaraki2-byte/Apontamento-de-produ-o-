import { buildBillingPlan, collectSourceKeys } from "../api/_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.js";

const payload:any={
  origem:"CHATGPT_PDF",
  tenantId:"imperio",
  solicitadoPor:"raul",
  documentKey:"FATURADOS-23-09-16H-2026-09-23",
  allowBreakReservations:false,
  faturamentos:[
    {lineId:"p1-e67783-67715-507-15000",codigoPedido:"67715",itemId:1782222685809,quantidade:15000},
    {lineId:"p2-e67785-66959-5358-100",codigoPedido:"66959",itemId:1787076608611,cor:"PRETO FOSCO",quantidade:100},
    {lineId:"p2-e67785-67193-5358-25",codigoPedido:"67193",itemId:1787076608611,cor:"PRETO FOSCO",quantidade:25},
    {lineId:"p3-e67787-66736-3155-1000",codigoPedido:"66736",itemId:1280,cor:"ZINCADO",quantidade:1000},
    {lineId:"p4-e67789-67713-304-5",codigoPedido:"67713",itemId:304,quantidade:5},
    {lineId:"p5-e67791-67281-2595-150",codigoPedido:"67281",itemId:2595,cor:"PRETO FOSCO",quantidade:150},
    {lineId:"p5-e67791-67281-3146-10",codigoPedido:"67281",itemId:2120,cor:"PRETO FOSCO",quantidade:10},
    {lineId:"p6-e67792-67751-9-400",codigoPedido:"67751",itemId:9,quantidade:400,numeroNota:"6358"},
    {lineId:"p7-e67795-67666-3193-330",codigoPedido:"67666",itemId:2140,cor:"PRETO FOSCO",quantidade:330},
    {lineId:"p8-e67806-67078-3118-60",codigoPedido:"67078",itemId:1779765280719,cor:"PRETO FOSCO",quantidade:60,numeroNota:"6361"},
    {lineId:"p8-e67806-67078-4809-5",codigoPedido:"67078",itemId:4809,cor:"PRETO FOSCO",quantidade:5,numeroNota:"6361"}
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
  previewHash:plan.previewHash,
  canConfirm:plan.canConfirm,
  resumo:plan.resumo,
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
  plan.resumo.total===11 &&
  plan.resumo.prontos===9 &&
  plan.resumo.ajustesQuantidade===2 &&
  plan.resumo.conflitosReserva===0 &&
  plan.resumo.jaProcessados===0 &&
  plan.resumo.jaFaturados===0 &&
  plan.resumo.pendencias===0 &&
  plan.resumo.quantidadeAFaturar===17085 &&
  plan.canConfirm===true;

if(!exact){
  console.error("GUARD_FAILED="+JSON.stringify({resumo:plan.resumo,linhas:plan.linhas}));
  process.exit(2);
}

const result=await repository.applyPlan(plan);
const after=await repository.loadSnapshot("imperio");
const wanted=new Set(["67715","66959","67193","66736","67713","67281","67751","67666","67078"]);
const verification=after.orders.filter((x:any)=>wanted.has(String(x.orderCode||""))).map((x:any)=>({
  id:x.id,orderCode:x.orderCode,itemId:x.itemId,totalQuantity:x.totalQuantity,
  invoicedQuantity:x.invoicedQuantity,status:x.status,isActive:x.isActive
}));
console.log("BILLING_RESULT="+JSON.stringify({result,verification}));
process.exit(0);
