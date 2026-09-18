import { buildBillingPlan, collectSourceKeys } from "../_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../_lib/billingImportFirestore.js";

const payload:any={
 origem:"CHATGPT",tenantId:"imperio",solicitadoPor:"chatgpt-sep18-pm1435",
 documentKey:"FATURADOS-18-SET-TARDE-14H35-2026-09-18",
 allowBreakReservations:false,
 faturamentos:[
  {lineId:"p4-e67630-66970-4599-11",codigoPedido:"66970",itemId:1779765279240,cor:"DOURADO",quantidade:11},
  {lineId:"p4-e67630-66970-4600-7",codigoPedido:"66970",itemId:4600,cor:"DOURADO",quantidade:7},
  {lineId:"p4-e67630-66970-4601-7",codigoPedido:"66970",itemId:4601,cor:"DOURADO",quantidade:7},
  {lineId:"p4-e67630-67178-4599-1",codigoPedido:"67178",itemId:1779765279240,cor:"PRETO FOSCO",quantidade:1},
  {lineId:"p4-e67630-67626-4600-1",codigoPedido:"67626",itemId:4600,cor:"DOURADO",quantidade:1},
  {lineId:"p4-e67630-67626-4601-1",codigoPedido:"67626",itemId:4601,cor:"DOURADO",quantidade:1},
  {lineId:"p5-e67632-67082-41-20",codigoPedido:"67082",itemId:41,quantidade:20},
  {lineId:"p5-e67632-67399-41-20",codigoPedido:"67399",itemId:41,quantidade:20},
  {lineId:"p5-e67632-67399-3192-10",codigoPedido:"67399",itemId:3192,cor:"PRETO FOSCO",quantidade:10},
  {lineId:"p6-e67634-67628-4809-20",codigoPedido:"67628",itemId:4809,cor:"PRETO FOSCO",quantidade:20},
  {lineId:"p7-e67635-67331-2793-2",codigoPedido:"67331",itemId:2793,quantidade:2},
  {lineId:"p8-e67636-67542-4886-10",codigoPedido:"67542",itemId:4272,cor:"PRETO FOSCO",quantidade:10},
  {lineId:"p8-e67636-67600-3156-52",codigoPedido:"67600",itemId:1779765280085,cor:"PRETO FOSCO",quantidade:52},
  {lineId:"p8-e67636-67600-4809-50",codigoPedido:"67600",itemId:4809,cor:"PRETO FOSCO",quantidade:50},
  {lineId:"p9-e67637-67077-2712-400",codigoPedido:"67077",itemId:2712,cor:"ZINCADO",quantidade:400},
  {lineId:"p10-e67638-67106-866-56",codigoPedido:"67106",itemId:866,cor:"PRETO FOSCO",quantidade:56},
  {lineId:"p10-e67638-67106-3128-41",codigoPedido:"67106",itemId:3128,cor:"PRETO FOSCO",quantidade:41},
  {lineId:"p10-e67638-67627-866-14",codigoPedido:"67627",itemId:866,cor:"PRETO FOSCO",quantidade:14},
  {lineId:"p10-e67638-67627-3128-9",codigoPedido:"67627",itemId:3128,cor:"PRETO FOSCO",quantidade:9},
  {lineId:"p11-e67640-67400-3615-40",codigoPedido:"67400",itemId:3615,quantidade:40},
  {lineId:"p12-e67642-66957-5439-3",codigoPedido:"66957",itemId:1788263548186,cor:"PRETO FOSCO",quantidade:3}
 ]
};

export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({ok:false,error:"METHOD"});
 const repository=new FirestoreBillingRepository();
 const snapshot=await repository.loadSnapshot("imperio");
 const keys=collectSourceKeys(payload,snapshot);
 const processed=await repository.findProcessedSourceKeys("imperio",payload.documentKey,keys);
 const plan=buildBillingPlan(snapshot,payload,{tenantId:"imperio",origem:"CHATGPT",solicitadoPor:"chatgpt-sep18-pm1435",processedSourceKeys:processed});
 const exact=plan.resumo.total===21&&plan.resumo.prontos===21&&plan.resumo.ajustesQuantidade===0&&plan.resumo.conflitosReserva===0&&plan.resumo.jaProcessados===0&&plan.resumo.jaFaturados===0&&plan.resumo.pendencias===0&&plan.resumo.quantidadeAFaturar===775&&plan.canConfirm===true;
 if(req.query?.confirm===undefined){
  return res.status(200).json({ok:true,exact,previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
   linhas:plan.linhas.map((l:any)=>({status:l.status,message:l.message,sourceKey:l.sourceKey,operation:l.operation&&{
    orderCode:l.operation.orderCode,itemCode:l.operation.itemCode,billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,
    currentInvoicedQuantity:l.operation.currentInvoicedQuantity,newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity
   }}))
  });
 }
 if(!exact) return res.status(409).json({ok:false,error:"PREVIEW_NOT_EXACT",previewHash:plan.previewHash,resumo:plan.resumo,linhas:plan.linhas});
 if(String(req.query.confirm)!==plan.previewHash) return res.status(409).json({ok:false,error:"HASH_MISMATCH",previewHash:plan.previewHash});
 const result=await repository.applyPlan(plan);
 const after=await repository.loadSnapshot("imperio");
 const wanted=new Set(["66970","67178","67626","67082","67399","67628","67331","67542","67600","67077","67106","67627","67400","66957"]);
 const verification=after.orders.filter((o:any)=>wanted.has(String(o.orderCode||""))).map((o:any)=>({
  orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity,status:o.status,isActive:o.isActive
 }));
 return res.status(200).json({ok:true,previewHash:plan.previewHash,resumoPreview:plan.resumo,result,verification});
}