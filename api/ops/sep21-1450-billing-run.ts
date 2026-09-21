import { createHash } from "node:crypto";
import { buildBillingPlan, collectSourceKeys } from "../_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../_lib/billingImportFirestore.js";

const tenantId="imperio";
const origem="CHATGPT";
const solicitadoPor="chatgpt-sep21-1450";
const documentKey="FATURADOS-21-SET-14H50-2026-09-21";

const mainPayload:any={
  origem,tenantId,solicitadoPor,documentKey,allowBreakReservations:false,
  faturamentos:[
    {lineId:"p1-e67677-67116-3807-50",codigoPedido:"67116",itemId:3807,cor:"PRETO FOSCO",quantidade:50},
    {lineId:"p2-e67679-67486-507-10000",codigoPedido:"67486",itemId:1782222685809,quantidade:10000},
    {lineId:"p2-e67679-67486-2459-4000",codigoPedido:"67486",itemId:1779765282864,cor:"CINZA",quantidade:4000},
    {lineId:"p3-e67681-67452-1880-1000",codigoPedido:"67452",itemId:1880,cor:"ZINCADO",quantidade:1000},
    {lineId:"p3-e67681-67452-2739-500",codigoPedido:"67452",itemId:2739,cor:"ZINCADO",quantidade:500},
    {lineId:"p4-e67683-67216-1088-10000",codigoPedido:"67216",itemId:1088,quantidade:10000},
    {lineId:"p5-e67686-67684-5511-30",codigoPedido:"67684",itemId:1789146455837,cor:"PRETO FOSCO",quantidade:30},
    {lineId:"p6-e67687-67373-5511-30",codigoPedido:"67373",itemId:1789146455837,cor:"PRETO FOSCO",quantidade:30},
    {lineId:"p8-e67697-67695-2739-500",codigoPedido:"67695",itemId:2739,cor:"ZINCADO",quantidade:500},
    {lineId:"p8-e67697-67695-3794-300",codigoPedido:"67695",itemId:1780332371024,cor:"CINZA",quantidade:300},
    {lineId:"p9-e67699-67694-2517-200",codigoPedido:"67694",itemId:1779765282668,cor:"CINZA",quantidade:200},
    {lineId:"p10-e67702-64753-3145-30",codigoPedido:"64753",itemId:2314,quantidade:30},
    {lineId:"p10-e67702-64753-3151-30",codigoPedido:"64753",itemId:2313,quantidade:30},
    {lineId:"p11-e67706-67003-3560-8",codigoPedido:"67003",itemId:3560,cor:"PRETO FOSCO",quantidade:8},
    {lineId:"p11-e67706-67003-3571-4",codigoPedido:"67003",itemId:3571,cor:"PRETO FOSCO",quantidade:4},
    {lineId:"p11-e67706-67281-3027-300",codigoPedido:"67281",itemId:3027,cor:"PRETO FOSCO",quantidade:300},
    {lineId:"p11-e67706-67281-4519-12",codigoPedido:"67281",itemId:4519,cor:"PRETO FOSCO",quantidade:12},
    {lineId:"p11-e67706-67281-4811-20",codigoPedido:"67281",itemId:4811,cor:"PRETO FOSCO",quantidade:20},
    {lineId:"p12-e67708-67193-3932-313",codigoPedido:"67193",itemId:1779765281202,cor:"PRETO FOSCO",quantidade:313},
    {lineId:"p13-e67710-67700-3154-50",codigoPedido:"67700",itemId:1779765283047,cor:"ZINCADO",quantidade:50}
  ]
};

const laserA:any={
  origem,tenantId,solicitadoPor,documentKey,allowBreakReservations:false,
  faturamentos:[{lineId:"p7-e67693-67689-937-base-chiquim-1",codigoPedido:"67689",itemId:937,quantidade:1}]
};
const laserB:any={
  origem,tenantId,solicitadoPor,documentKey,allowBreakReservations:false,
  faturamentos:[{lineId:"p7-e67693-67689-937-base-lisa-1",codigoPedido:"67689",itemId:937,quantidade:1}]
};

async function makePlan(repository:any,snapshot:any,payload:any,excludeOrderId?:number){
  const scoped=excludeOrderId?{...snapshot,orders:snapshot.orders.filter((o:any)=>Number(o.id)!==excludeOrderId)}:snapshot;
  const keys=collectSourceKeys(payload,scoped);
  const processed=await repository.findProcessedSourceKeys(tenantId,documentKey,keys);
  return buildBillingPlan(scoped,payload,{tenantId,origem,solicitadoPor,processedSourceKeys:processed});
}
function sum(a:any,b:any,c:any,key:string){return Number(a.resumo[key]||0)+Number(b.resumo[key]||0)+Number(c.resumo[key]||0);}

export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({ok:false,error:"METHOD"});
 const repository=new FirestoreBillingRepository();
 const snapshot=await repository.loadSnapshot(tenantId);

 // 67689 possui duas linhas de pedido distintas com o mesmo itemId 937.
 // Para resolver cada uma sem ambiguidade, cada plano exclui somente a linha irmã.
 const mainPlan=await makePlan(repository,snapshot,mainPayload);
 const laserAPlan=await makePlan(repository,snapshot,laserA,7331893910680858); // mantém BASE CHIQUIM 420x600 (id ...859)
 const laserBPlan=await makePlan(repository,snapshot,laserB,7331893910680859); // mantém BASE LISA 250x300 (id ...858)

 const exactMain=
   mainPlan.resumo.total===20 &&
   mainPlan.resumo.prontos===19 &&
   mainPlan.resumo.ajustesQuantidade===1 &&
   mainPlan.resumo.conflitosReserva===0 &&
   mainPlan.resumo.jaProcessados===0 &&
   mainPlan.resumo.jaFaturados===0 &&
   mainPlan.resumo.pendencias===0 &&
   mainPlan.resumo.quantidadeAFaturar===27377 &&
   mainPlan.canConfirm===true;
 const exactA=
   laserAPlan.resumo.total===1&&laserAPlan.resumo.prontos===1&&laserAPlan.resumo.ajustesQuantidade===0&&
   laserAPlan.resumo.conflitosReserva===0&&laserAPlan.resumo.jaProcessados===0&&laserAPlan.resumo.jaFaturados===0&&
   laserAPlan.resumo.pendencias===0&&laserAPlan.resumo.quantidadeAFaturar===1&&laserAPlan.canConfirm===true;
 const exactB=
   laserBPlan.resumo.total===1&&laserBPlan.resumo.prontos===1&&laserBPlan.resumo.ajustesQuantidade===0&&
   laserBPlan.resumo.conflitosReserva===0&&laserBPlan.resumo.jaProcessados===0&&laserBPlan.resumo.jaFaturados===0&&
   laserBPlan.resumo.pendencias===0&&laserBPlan.resumo.quantidadeAFaturar===1&&laserBPlan.canConfirm===true;

 const combinedHash=createHash("sha256").update([mainPlan.previewHash,laserAPlan.previewHash,laserBPlan.previewHash].join("|")).digest("hex");
 const combinedResumo={
   total:sum(mainPlan,laserAPlan,laserBPlan,"total"),
   prontos:sum(mainPlan,laserAPlan,laserBPlan,"prontos"),
   ajustesQuantidade:sum(mainPlan,laserAPlan,laserBPlan,"ajustesQuantidade"),
   conflitosReserva:sum(mainPlan,laserAPlan,laserBPlan,"conflitosReserva"),
   jaProcessados:sum(mainPlan,laserAPlan,laserBPlan,"jaProcessados"),
   jaFaturados:sum(mainPlan,laserAPlan,laserBPlan,"jaFaturados"),
   pendencias:sum(mainPlan,laserAPlan,laserBPlan,"pendencias"),
   quantidadeAFaturar:sum(mainPlan,laserAPlan,laserBPlan,"quantidadeAFaturar")
 };
 const exact=exactMain&&exactA&&exactB&&combinedResumo.total===22&&combinedResumo.prontos===21&&combinedResumo.ajustesQuantidade===1&&combinedResumo.quantidadeAFaturar===27379;

 const combinedPlan:any={
   sucesso:exact,tenantId,origem,solicitadoPor,documentKey,allowBreakReservations:false,
   previewHash:combinedHash,canConfirm:exact,
   linhas:[...mainPlan.linhas,...laserAPlan.linhas,...laserBPlan.linhas],
   resumo:combinedResumo
 };

 if(req.query?.confirm===undefined){
   return res.status(200).json({
     ok:true,exact,previewHash:combinedHash,resumo:combinedResumo,
     mainResumo:mainPlan.resumo,laserAResumo:laserAPlan.resumo,laserBResumo:laserBPlan.resumo,
     linhas:combinedPlan.linhas.map((l:any)=>({
       status:l.status,message:l.message,sourceKey:l.sourceKey,candidateOrderIds:l.candidateOrderIds,
       operation:l.operation&&{
         orderId:l.operation.orderId,orderCode:l.operation.orderCode,itemId:l.operation.itemId,itemCode:l.operation.itemCode,
         billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,
         currentInvoicedQuantity:l.operation.currentInvoicedQuantity,newTotalQuantity:l.operation.newTotalQuantity,
         newInvoicedQuantity:l.operation.newInvoicedQuantity,quantityAdjustedBy:l.operation.quantityAdjustedBy
       }
     }))
   });
 }
 if(!exact) return res.status(409).json({ok:false,error:"PREVIEW_NOT_EXACT",previewHash:combinedHash,resumo:combinedResumo,linhas:combinedPlan.linhas});
 if(String(req.query.confirm)!==combinedHash) return res.status(409).json({ok:false,error:"HASH_MISMATCH",previewHash:combinedHash});
 const result=await repository.applyPlan(combinedPlan);
 const after=await repository.loadSnapshot(tenantId);
 const wanted=new Set(["67116","67486","67452","67216","67684","67373","67689","67695","67694","64753","67003","67281","67193","67700"]);
 const verification=after.orders.filter((o:any)=>wanted.has(String(o.orderCode||""))).map((o:any)=>({
   id:o.id,orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,
   invoicedQuantity:o.invoicedQuantity,status:o.status,isActive:o.isActive,itemNotes:o.itemNotes||""
 }));
 return res.status(200).json({ok:true,previewHash:combinedHash,resumoPreview:combinedResumo,result,verification});
}