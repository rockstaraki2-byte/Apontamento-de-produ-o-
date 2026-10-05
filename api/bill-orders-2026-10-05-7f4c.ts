import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { buildBillingPlan, collectSourceKeys } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const tenantId = "imperio";
const origem = "CHATGPT_GOOGLE_DRIVE_CSV";
const solicitadoPor = "raul";
const documentKey = "FATURADOS-05-OUT-2026-10-05";

const missingOrdersPayload:any = {
  origem, tenantId, solicitadoPor,
  pedidos: [
    {
      codigoPedido:"68242",
      cliente:{codigo:858,nome:"CONSUMIDOR FINAL"},
      formaPagamento:"CARTEIRA",
      prazos:[],
      dataLimite:"2026-10-05",
      observacoes:"Origem: Faturados 05-out.csv; Entrega 68245.",
      itens:[{
        codigoOriginal:"70", codigoProduto:"70", descricao:"ZINCAGEM DE PEÇAS",
        familia:"GERENCIAL", quantidade:2.704, precoUnitario:36.98, descontoPercentual:0
      }]
    },
    {
      codigoPedido:"68243",
      cliente:{codigo:858,nome:"CONSUMIDOR FINAL"},
      formaPagamento:"CARTEIRA",
      prazos:[],
      dataLimite:"2026-10-05",
      observacoes:"Origem: Faturados 05-out.csv; Entrega 68247.",
      itens:[{
        codigoOriginal:"70", codigoProduto:"70", descricao:"ZINCAGEM DE PEÇAS",
        familia:"GERENCIAL", quantidade:2.18, precoUnitario:16.25, descontoPercentual:0
      }]
    }
  ]
};

const payload:any = {
  origem, tenantId, solicitadoPor, documentKey, allowBreakReservations:false,
  faturamentos:[
    {lineId:"e68201-67281-2594-225",codigoPedido:"67281",itemId:2594,quantidade:225},
    {lineId:"e68201-68199-2594-2",codigoPedido:"68199",itemId:2594,quantidade:2},
    {lineId:"e68203-65909-2517-400",codigoPedido:"65909",itemId:1779765282668,quantidade:400},
    {lineId:"e68203-65909-2739-1000",codigoPedido:"65909",itemId:2739,quantidade:1000},
    {lineId:"e68204-68107-9-200",codigoPedido:"68107",itemId:9,quantidade:200,numeroNota:"6411"},
    {lineId:"e68206-67995-1880-1500",codigoPedido:"67995",itemId:1880,quantidade:1500},
    {lineId:"e68206-67995-3794-700",codigoPedido:"67995",itemId:1780332371024,quantidade:700},
    {lineId:"e68211-68194-66-900",codigoPedido:"68194",itemId:66,quantidade:900},
    {lineId:"e68213-68193-9-200",codigoPedido:"68193",itemId:9,quantidade:200},
    {lineId:"e68216-68214-2551-450",codigoPedido:"68214",itemId:2551,quantidade:450},
    {lineId:"e68229-68191-2517-200",codigoPedido:"68191",itemId:1779765282668,quantidade:200},
    {lineId:"e68229-68191-2739-250",codigoPedido:"68191",itemId:2739,quantidade:250},
    {lineId:"e68226-68220-5279-4",codigoPedido:"68220",itemId:1785867711845,quantidade:4,numeroNota:"6415"},
    {lineId:"e68226-68220-5600-1",codigoPedido:"68220",itemId:1791222398493,quantidade:1,numeroNota:"6415"},
    {lineId:"e68226-68220-5601-2",codigoPedido:"68220",itemId:1791222413668,quantidade:2,numeroNota:"6415"},
    {lineId:"e68226-68220-5602-1",codigoPedido:"68220",itemId:1791222426052,quantidade:1,numeroNota:"6415"},
    {lineId:"e68226-68220-5603-2",codigoPedido:"68220",itemId:1791222438092,quantidade:2,numeroNota:"6415"},
    {lineId:"e68237-68235-1327-100",codigoPedido:"68235",itemId:1327,quantidade:100},
    {lineId:"e68237-68235-2797-200",codigoPedido:"68235",itemId:2797,quantidade:200},
    {lineId:"e68245-68242-70-2_704",codigoPedido:"68242",codigoProduto:"70",descricao:"ZINCAGEM DE PEÇAS",quantidade:2.704},
    {lineId:"e68247-68243-70-2_180",codigoPedido:"68243",codigoProduto:"70",descricao:"ZINCAGEM DE PEÇAS",quantidade:2.18},
  ]
};

async function makePlan(){
  const repository=new FirestoreBillingRepository();
  const snapshot=await repository.loadSnapshot(tenantId);
  const sourceKeys=collectSourceKeys(payload,snapshot);
  const processed=await repository.findProcessedSourceKeys(tenantId,documentKey,sourceKeys);
  const plan=buildBillingPlan(snapshot,payload,{tenantId,origem,solicitadoPor,processedSourceKeys:processed});
  return {repository,plan};
}

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({sucesso:false,erro:"METHOD_NOT_ALLOWED"});

  if(String(req.query?.prepare||"").toLowerCase()==="true"){
    const repo=new FirestoreOrderImportRepository();
    const meta={tenantId,origem,solicitadoPor,now:new Date()};
    const dry=await processOrderImport(repo,missingOrdersPayload,meta,true);
    if(dry.resumo.comErro>0){
      return res.status(207).json({sucesso:false,etapa:"PREPARE_DRY_RUN",dry});
    }
    const result=await processOrderImport(repo,missingOrdersPayload,meta,false);
    return res.status(result.resumo.comErro>0?207:200).json({
      sucesso:result.resumo.comErro===0,etapa:"PREPARE",dry,result
    });
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
