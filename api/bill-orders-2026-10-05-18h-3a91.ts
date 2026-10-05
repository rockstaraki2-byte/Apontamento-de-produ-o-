import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { buildBillingPlan, collectSourceKeys } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const tenantId="imperio";
const origem="CHATGPT_GOOGLE_DRIVE_CSV";
const solicitadoPor="raul";
const documentKey="FATURADOS-05-OUT-18H-DELTA-2026-10-05";

const missingOrderPayload:any={
  origem,tenantId,solicitadoPor,
  pedidos:[{
    codigoPedido:"68248",
    cliente:{codigo:72,nome:"WTEK"},
    representante:"IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento:"CARTEIRA",
    prazos:[30],
    observacoes:"Origem: Faturados 05-out 18h.csv; Entrega 68250.",
    itens:[
      {codigoOriginal:"3145.3",codigoProduto:"3145",descricao:"BASE DE APOIO COSTELA",familia:"GERENCIAL",quantidade:30,precoUnitario:62,descontoPercentual:0},
      {codigoOriginal:"3151.3",codigoProduto:"3151",descricao:"BASE POLTRONA COSTELA",familia:"GERENCIAL",quantidade:30,precoUnitario:82,descontoPercentual:0}
    ]
  }]
};

const billingPayload:any={
  origem,tenantId,solicitadoPor,documentKey,allowBreakReservations:false,
  faturamentos:[
    {lineId:"e68250-68248-3145-30",codigoPedido:"68248",codigoProduto:"3145",descricao:"BASE DE APOIO COSTELA",quantidade:30},
    {lineId:"e68250-68248-3151-30",codigoPedido:"68248",codigoProduto:"3151",descricao:"BASE POLTRONA COSTELA",quantidade:30},
    {lineId:"e68252-67812-3074-1500",codigoPedido:"67812",itemId:3074,quantidade:1500}
  ]
};

async function makePlan(){
  const repository=new FirestoreBillingRepository();
  const snapshot=await repository.loadSnapshot(tenantId);
  const sourceKeys=collectSourceKeys(billingPayload,snapshot);
  const processed=await repository.findProcessedSourceKeys(tenantId,documentKey,sourceKeys);
  const plan=buildBillingPlan(snapshot,billingPayload,{tenantId,origem,solicitadoPor,processedSourceKeys:processed});
  return {repository,plan};
}

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({sucesso:false,erro:"METHOD_NOT_ALLOWED"});

  if(String(req.query?.prepare||"").toLowerCase()==="true"){
    const repo=new FirestoreOrderImportRepository();
    const meta={tenantId,origem,solicitadoPor,now:new Date()};
    const dry=await processOrderImport(repo,missingOrderPayload,meta,true);
    if(dry.resumo.comErro>0){
      return res.status(207).json({sucesso:false,etapa:"PREPARE_DRY_RUN",dry});
    }
    const result=await processOrderImport(repo,missingOrderPayload,meta,false);
    return res.status(result.resumo.comErro>0?207:200).json({sucesso:result.resumo.comErro===0,etapa:"PREPARE",dry,result});
  }

  if(String(req.query?.dryRun||"").toLowerCase()==="true"){
    const {plan}=await makePlan();
    return res.status(plan.canConfirm?200:207).json({
      sucesso:plan.canConfirm,dryRun:true,previewHash:plan.previewHash,canConfirm:plan.canConfirm,
      resumo:plan.resumo,
      linhas:plan.linhas.map((l:any)=>({
        sourceKey:l.sourceKey,status:l.status,message:l.message,candidateOrderIds:l.candidateOrderIds,
        operation:l.operation&&{
          orderId:l.operation.orderId,orderCode:l.operation.orderCode,itemId:l.operation.itemId,
          itemCode:l.operation.itemCode,itemName:l.operation.itemName,color:l.operation.color,
          billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,
          currentInvoicedQuantity:l.operation.currentInvoicedQuantity,newTotalQuantity:l.operation.newTotalQuantity,
          newInvoicedQuantity:l.operation.newInvoicedQuantity,quantityAdjustedBy:l.operation.quantityAdjustedBy,
          resultingStatus:l.operation.resultingStatus,reservationConflict:l.operation.reservationConflict||null
        }
      }))
    });
  }

  if(String(req.query?.execute||"").toLowerCase()==="true"){
    const expected=String(req.query?.previewHash||"").trim();
    const {repository,plan}=await makePlan();
    if(!plan.canConfirm||plan.resumo.pendencias>0||plan.resumo.conflitosReserva>0){
      return res.status(409).json({sucesso:false,erro:"PLAN_NOT_CONFIRMABLE",previewHash:plan.previewHash,resumo:plan.resumo,linhas:plan.linhas});
    }
    if(expected&&expected!==plan.previewHash){
      return res.status(409).json({sucesso:false,erro:"PREVIEW_HASH_CHANGED",expectedPreviewHash:expected,actualPreviewHash:plan.previewHash,resumo:plan.resumo});
    }
    const result=await repository.applyPlan(plan);
    return res.status(200).json({sucesso:true,previewHash:plan.previewHash,result});
  }

  if(String(req.query?.verify||"").toLowerCase()==="true"){
    const {plan}=await makePlan();
    return res.status(200).json({
      sucesso:true,documentKey,
      postPlan:{
        previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
        linhas:plan.linhas.map((l:any)=>({sourceKey:l.sourceKey,status:l.status,message:l.message}))
      }
    });
  }

  return res.status(400).json({sucesso:false,erro:"MODE_REQUIRED"});
}
