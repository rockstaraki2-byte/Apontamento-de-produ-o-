import { buildBillingPlan, collectSourceKeys } from "../_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../_lib/billingImportFirestore.js";

const payload:any={
  origem:"CHATGPT",
  tenantId:"imperio",
  solicitadoPor:"chatgpt-sep18-pm1620",
  documentKey:"FATURADOS-18-SET-TARDE-16H20-2026-09-18",
  allowBreakReservations:false,
  faturamentos:[
    {lineId:"p13-e67675-67566-1884-1000",codigoPedido:"67566",itemId:1884,cor:"ZINCADO",quantidade:1000},
    {lineId:"p13-e67675-67566-3024-2000",codigoPedido:"67566",itemId:3024,cor:"ZINCADO",quantidade:2000}
  ]
};

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"METHOD"});
  const repository=new FirestoreBillingRepository();
  const snapshot=await repository.loadSnapshot("imperio");
  const keys=collectSourceKeys(payload,snapshot);
  const processed=await repository.findProcessedSourceKeys("imperio",payload.documentKey,keys);
  const plan=buildBillingPlan(snapshot,payload,{
    tenantId:"imperio",origem:"CHATGPT",solicitadoPor:"chatgpt-sep18-pm1620",processedSourceKeys:processed
  });
  const exact=
    plan.resumo.total===2 &&
    plan.resumo.prontos===2 &&
    plan.resumo.ajustesQuantidade===0 &&
    plan.resumo.conflitosReserva===0 &&
    plan.resumo.jaProcessados===0 &&
    plan.resumo.jaFaturados===0 &&
    plan.resumo.pendencias===0 &&
    plan.resumo.quantidadeAFaturar===3000 &&
    plan.canConfirm===true;
  if(req.query?.confirm===undefined){
    return res.status(200).json({
      ok:true,exact,previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
      linhas:plan.linhas.map((l:any)=>({
        status:l.status,message:l.message,sourceKey:l.sourceKey,
        operation:l.operation&&{
          orderCode:l.operation.orderCode,itemCode:l.operation.itemCode,billingQuantity:l.operation.billingQuantity,
          currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,
          newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity
        }
      }))
    });
  }
  if(!exact) return res.status(409).json({ok:false,error:"PREVIEW_NOT_EXACT",previewHash:plan.previewHash,resumo:plan.resumo,linhas:plan.linhas});
  if(String(req.query.confirm)!==plan.previewHash) return res.status(409).json({ok:false,error:"HASH_MISMATCH",previewHash:plan.previewHash});
  const result=await repository.applyPlan(plan);
  const after=await repository.loadSnapshot("imperio");
  const verification=after.orders
    .filter((o:any)=>String(o.orderCode||"")==="67566")
    .map((o:any)=>({orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity,status:o.status,isActive:o.isActive}));
  return res.status(200).json({ok:true,previewHash:plan.previewHash,resumoPreview:plan.resumo,result,verification});
}