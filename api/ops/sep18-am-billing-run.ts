import { buildBillingPlan, collectSourceKeys } from "../_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../_lib/billingImportFirestore.js";

const payload:any = {
  origem: "CHATGPT",
  tenantId: "imperio",
  solicitadoPor: "chatgpt-sep18-am",
  documentKey: "FATURADOS-18-SET-MANHA-2026-09-18",
  allowBreakReservations: false,
  faturamentos: [
    { lineId:"p1-e67616-67332-3197-100", codigoPedido:"67332", itemId:2385, cor:"ZINCADO", quantidade:100 },
    { lineId:"p2-e67618-67587-392-900", codigoPedido:"67587", itemId:392, cor:"ZINCADO", quantidade:900 },
    { lineId:"p2-e67618-67587-3074-130", codigoPedido:"67587", itemId:3074, cor:"ZINCADO", quantidade:130 },
    { lineId:"p2-e67618-67587-3163-200", codigoPedido:"67587", itemId:3163, quantidade:200 },
    { lineId:"p2-e67618-67587-3164-200", codigoPedido:"67587", itemId:3164, quantidade:200 },
    { lineId:"p2-e67618-67587-4809-7", codigoPedido:"67587", itemId:4809, cor:"PRETO FOSCO", quantidade:7 },
    { lineId:"p3-e67620-67401-5229-110", codigoPedido:"67401", itemId:1785245834348, quantidade:110 }
  ]
};

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"METHOD"});
  const repository=new FirestoreBillingRepository();
  const snapshot=await repository.loadSnapshot("imperio");
  const keys=collectSourceKeys(payload,snapshot);
  const processed=await repository.findProcessedSourceKeys("imperio",payload.documentKey,keys);
  const plan=buildBillingPlan(snapshot,payload,{
    tenantId:"imperio", origem:"CHATGPT", solicitadoPor:"chatgpt-sep18-am",
    processedSourceKeys:processed
  });
  const exact =
    plan.resumo.total===7 &&
    plan.resumo.prontos===7 &&
    plan.resumo.ajustesQuantidade===0 &&
    plan.resumo.conflitosReserva===0 &&
    plan.resumo.jaProcessados===0 &&
    plan.resumo.jaFaturados===0 &&
    plan.resumo.pendencias===0 &&
    plan.resumo.quantidadeAFaturar===1647 &&
    plan.canConfirm===true;
  if(req.query?.confirm===undefined){
    return res.status(200).json({ok:true,exact,previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
      linhas:plan.linhas.map((l:any)=>({status:l.status,message:l.message,sourceKey:l.sourceKey,operation:l.operation&&{
        orderCode:l.operation.orderCode,itemCode:l.operation.itemCode,billingQuantity:l.operation.billingQuantity,
        currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,
        newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity
      }}))
    });
  }
  if(!exact) return res.status(409).json({ok:false,error:"PREVIEW_NOT_EXACT",previewHash:plan.previewHash,resumo:plan.resumo});
  if(String(req.query.confirm)!==plan.previewHash) return res.status(409).json({ok:false,error:"HASH_MISMATCH",previewHash:plan.previewHash});
  const result=await repository.applyPlan(plan);
  const after=await repository.loadSnapshot("imperio");
  const wanted=new Set(["67332","67587","67401"]);
  const verification=after.orders.filter((o:any)=>wanted.has(String(o.orderCode||""))).map((o:any)=>({
    orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity,status:o.status,isActive:o.isActive
  }));
  return res.status(200).json({ok:true,previewHash:plan.previewHash,resumoPreview:plan.resumo,result,verification});
}