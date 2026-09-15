import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const payload: BillingImportPayload={tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",documentKey:"FATURADOS-15-SET-1520-DIFF-2026-09-15",allowBreakReservations:false,faturamentos:[
{lineId:"p1-66848-3831-200",codigoPedido:"66848",itemId:3831,quantidade:200,numeroNota:"6319"},
{lineId:"p3-67451-3585-30",codigoPedido:"67451",itemId:3585,quantidade:30},
{lineId:"p4-67108-5121-600",codigoPedido:"67108",itemId:1782846497572,quantidade:600},
{lineId:"p5-67455-392-150",codigoPedido:"67455",itemId:392,quantidade:150},
{lineId:"p6a-66959-3932-320",codigoPedido:"66959",itemId:1779765281202,quantidade:320},
{lineId:"p6b-66959-5358-250",codigoPedido:"66959",itemId:1787076608611,quantidade:250},
{lineId:"p7a-67279-1880-1500",codigoPedido:"67279",itemId:1880,quantidade:1500},
{lineId:"p7b-67279-2739-500",codigoPedido:"67279",itemId:2739,quantidade:500},
{lineId:"p7c-67279-3794-700",codigoPedido:"67279",itemId:1780332371024,quantidade:700},
{lineId:"p8-66458-1848-1000",codigoPedido:"66458",itemId:1848,quantidade:1000,numeroNota:"6320"},
{lineId:"p9-65025-5181-600",codigoPedido:"65025",itemId:1784233675282,quantidade:600,numeroNota:"6321"},
{lineId:"p11a-67042-937-2",codigoPedido:"67042",itemId:937,quantidade:2},
{lineId:"p11b-67042-4233-1000",codigoPedido:"67042",itemId:4233,quantidade:1000},
{lineId:"p11c-67042-4421-5",codigoPedido:"67042",itemId:4421,quantidade:5},
{lineId:"p11d-67042-4422-10",codigoPedido:"67042",itemId:4422,quantidade:10},
{lineId:"p11e-67042-4920-30",codigoPedido:"67042",itemId:1779993441645,quantidade:30},
{lineId:"p11f-67042-5438-2",codigoPedido:"67042",itemId:1788201153618,quantidade:2},
{lineId:"p11g-67042-5448-70",codigoPedido:"67042",itemId:1788364977189,quantidade:70},
{lineId:"p11h-67042-5449-15",codigoPedido:"67042",itemId:1788365524105,quantidade:15}
]};

export default async function handler(req:any,res:any){
 if(req.method!=="GET")return res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"});
 try{
  const repo=new FirestoreBillingRepository();
  const snap=await repo.loadSnapshot("imperio");
  const keys=collectSourceKeys(payload,snap);
  const processed=await repo.findProcessedSourceKeys("imperio",String(payload.documentKey),keys);
  const plan=buildBillingPlan(snap,payload,{tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",processedSourceKeys:processed});
  const preview={previewHash:plan.previewHash,resumo:plan.resumo,linhas:plan.linhas.map(l=>({sourceKey:l.sourceKey,status:l.status,message:l.message,operation:l.operation&&{orderId:l.operation.orderId,orderCode:l.operation.orderCode,itemId:l.operation.itemId,itemCode:l.operation.itemCode,itemName:l.operation.itemName,billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity,quantityAdjustedBy:l.operation.quantityAdjustedBy,resultingStatus:l.operation.resultingStatus,reservationConflict:l.operation.reservationConflict}}))};
  if(!plan.canConfirm||plan.resumo.total!==19||plan.resumo.pendencias!==0||plan.resumo.conflitosReserva!==0||plan.resumo.quantidadeAFaturar!==6984||plan.resumo.ajustesQuantidade!==3)return res.status(422).json({ok:false,fase:"PREVIEW_BLOQUEADA_OU_DIVERGENTE",preview});
  const result=await repo.applyPlan(plan);
  const after=await repo.loadSnapshot("imperio");
  const codes=new Set(["66848","67451","67108","67455","66959","67279","66458","65025","67042"]);
  const verification=after.orders.filter(o=>codes.has(String(o.orderCode))).map(o=>({id:o.id,orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity??0,status:o.status,isActive:o.isActive}));
  return res.status(200).json({ok:true,preview,result,verification});
 }catch(error:any){return res.status(500).json({ok:false,error:error?.message||String(error)});}
}
