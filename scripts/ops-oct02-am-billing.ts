import { processOrderImport } from "../api/_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.js";
import { buildBillingPlan, collectSourceKeys } from "../api/_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.js";

const tenantId="imperio";
const origem="CHATGPT_GOOGLE_DRIVE_PDF";
const solicitadoPor="raul";
const documentKey="FATURADOS-02-OUT-MANHA-2026-10-02";

const importPayload:any={
 origem,tenantId,solicitadoPor,
 pedidos:[
  {
   codigoPedido:"68139",
   cliente:{codigo:1123,nome:"M.R. DECOR LTDA"},
   representante:"KESSE",
   formaPagamento:"BOLETO",
   prazos:"15/30/45",
   dataLimite:"02/10/2026",
   itens:[{codigoOriginal:"3730.11",codigoProduto:"3730",descricao:"BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS - MODELO C/ CURVA",familia:"GERENCIAL",quantidade:400,precoUnitario:2.40,descontoPercentual:0}]
  },
  {
   codigoPedido:"68140",
   cliente:{codigo:1094,nome:"DECORARE MOVEIS LTDA"},
   representante:"KESSE",
   formaPagamento:"BOLETO",
   prazos:"30/45",
   previsao:"11/09/2026",
   itens:[{codigoOriginal:"4253.3",codigoProduto:"4253",descricao:"ACESSÓRIO BARGAROTO",familia:"INDEFINIDA",quantidade:50,precoUnitario:32,descontoPercentual:0}]
  },
  {
   codigoPedido:"68145",
   cliente:{codigo:1013,nome:"ROBERTO COELHO MARTINS & CIA LTDA"},
   representante:"ANDRE MILLENIUM REPRESENTACOES",
   formaPagamento:"BOLETO",
   prazos:"14/21/28",
   previsao:"02/10/2026",
   itens:[{codigoOriginal:"1.1",codigoProduto:"1",descricao:"RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE",familia:"GERENCIAL",quantidade:4000,precoUnitario:1.15,descontoPercentual:0}]
  },
  {
   codigoPedido:"68148",
   cliente:{codigo:793,nome:"MOVEIS MATOS E LOPES LTDA"},
   representante:"MAPEFOR REPRESENTACOES LTDA",
   formaPagamento:"BOLETO",
   prazos:"7",
   previsao:"29/09/2026",
   itens:[{codigoOriginal:"5123.3",codigoProduto:"5123",descricao:"KIT BUFFET SAVANA - 4 PÉS LAT. A1 20CM A2 25CM + 1 PÉ CENT. C/ REG.",familia:"INDEFINIDA",quantidade:14,precoUnitario:81.50,descontoPercentual:0}]
  },
  {
   codigoPedido:"67950",
   cliente:{codigo:856,nome:"ROFER COMERCIO E IMPORTAÇÃO LTDA"},
   representante:"IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
   formaPagamento:"CARTEIRA",
   prazos:"60",
   dataLimite:"02/10/2026",
   observacoes:"CLIENTE YURI",
   itens:[{codigoOriginal:"5565.3",codigoProduto:"5565",descricao:'PÉ LATERAL RETO 1" 11 CM',familia:"GERENCIAL",quantidade:43,precoUnitario:8.75,descontoPercentual:15}]
  }
 ]
};

const importRepo=new FirestoreOrderImportRepository();
const meta={tenantId,origem,solicitadoPor,now:new Date("2026-10-02T13:00:00Z")};

const dry=await processOrderImport(importRepo,importPayload,meta,true);
console.log("IMPORT_PREVIEW="+JSON.stringify(dry));
const dryOk=dry.sucesso&&dry.resumo.recebidos===5&&dry.resumo.validos===5&&dry.resumo.comErro===0&&dry.resultados.every((r:any)=>r.status==="VALIDO");
if(!dryOk){
 console.error("IMPORT_PREVIEW_GUARD_FAILED");
 process.exit(2);
}

const live=await processOrderImport(importRepo,importPayload,meta,false);
console.log("IMPORT_RESULT="+JSON.stringify(live));
const liveOk=live.sucesso&&live.resumo.recebidos===5&&live.resumo.comErro===0&&(live.resumo.criados+live.resumo.jaExistentes===5);
if(!liveOk){
 console.error("IMPORT_EXECUTION_GUARD_FAILED");
 process.exit(3);
}

const payload:any={
 origem,tenantId,solicitadoPor,documentKey,allowBreakReservations:false,
 faturamentos:[
  {lineId:"p1-e68142-68095-3585-10",codigoPedido:"68095",itemId:3585,cor:"CINZA",quantidade:10},
  {lineId:"p2-e68144-68139-3730-400",codigoPedido:"68139",itemId:3730,cor:"CINZA",quantidade:400},
  {lineId:"p3-e68146-67935-3882-300",codigoPedido:"67935",itemId:3882,cor:"CINZA",quantidade:300,numeroNota:"6400"},
  {lineId:"p4-e68147-66728-4253-20",codigoPedido:"66728",itemId:4253,quantidade:20,numeroNota:"6401"},
  {lineId:"p4-e68147-68140-4253-50",codigoPedido:"68140",itemId:4253,cor:"PRETO FOSCO",quantidade:50,numeroNota:"6401"},
  {lineId:"p5-e68150-68100-1630-20",codigoPedido:"68100",itemId:1630,quantidade:20},
  {lineId:"p6-e68152-67234-4809-20",codigoPedido:"67234",itemId:4809,cor:"PRETO FOSCO",quantidade:20},
  {lineId:"p6-e68152-67754-4462-100",codigoPedido:"67754",itemId:4462,quantidade:100},
  {lineId:"p7-e68153-66720-3730-2000",codigoPedido:"66720",itemId:3730,cor:"CINZA",quantidade:2000,numeroNota:"6403"},
  {lineId:"p8-e68154-67621-5122-31",codigoPedido:"67621",itemId:1782850564723,cor:"DOURADO",quantidade:31,numeroNota:"6404"},
  {lineId:"p8-e68154-67621-5123-17",codigoPedido:"67621",itemId:1782850683818,cor:"PRETO FOSCO",quantidade:17,numeroNota:"6404"},
  {lineId:"p8-e68154-68148-5123-14",codigoPedido:"68148",itemId:1782850683818,cor:"PRETO FOSCO",quantidade:14,numeroNota:"6404"},
  {lineId:"p9-e68155-67840-2459-1000",codigoPedido:"67840",itemId:1779765282864,cor:"CINZA",quantidade:1000,numeroNota:"6405"},
  {lineId:"p10-e68159-68145-1-4000",codigoPedido:"68145",itemId:1,cor:"ZINCADO",quantidade:4000},
  {lineId:"p11-e68161-67950-5565-43",codigoPedido:"67950",itemId:1790597074827,cor:"PRETO FOSCO",quantidade:43},
  {lineId:"p12-e68156-66720-1-5000",codigoPedido:"66720",itemId:1,cor:"ZINCADO",quantidade:5000,numeroNota:"6406"}
 ]
};

const repository=new FirestoreBillingRepository();
const snapshot=await repository.loadSnapshot(tenantId);
const sourceKeys=collectSourceKeys(payload,snapshot);
const processed=await repository.findProcessedSourceKeys(tenantId,documentKey,sourceKeys);
const plan=buildBillingPlan(snapshot,payload,{tenantId,origem,solicitadoPor,processedSourceKeys:processed});

console.log("BILLING_PREVIEW="+JSON.stringify({
 previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
 linhas:plan.linhas.map((l:any)=>({status:l.status,message:l.message,sourceKey:l.sourceKey,candidateOrderIds:l.candidateOrderIds,
  operation:l.operation&&{orderId:l.operation.orderId,orderCode:l.operation.orderCode,itemId:l.operation.itemId,itemCode:l.operation.itemCode,
   billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,
   newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity,quantityAdjustedBy:l.operation.quantityAdjustedBy}}))
}));

const exact=
 plan.resumo.total===16 &&
 plan.resumo.prontos===16 &&
 plan.resumo.ajustesQuantidade===0 &&
 plan.resumo.conflitosReserva===0 &&
 plan.resumo.jaProcessados===0 &&
 plan.resumo.jaFaturados===0 &&
 plan.resumo.pendencias===0 &&
 plan.resumo.quantidadeAFaturar===13025 &&
 plan.canConfirm===true;
if(!exact){
 console.error("BILLING_GUARD_FAILED="+JSON.stringify({resumo:plan.resumo,linhas:plan.linhas}));
 process.exit(4);
}

const result=await repository.applyPlan(plan);
const after=await repository.loadSnapshot(tenantId);
const wanted=new Set(["68095","68139","67935","66728","68140","68100","67234","67754","66720","67621","68148","67840","68145","67950"]);
const verification=after.orders.filter((x:any)=>wanted.has(String(x.orderCode||""))).map((x:any)=>({
 id:x.id,orderCode:x.orderCode,itemId:x.itemId,color:x.color,totalQuantity:x.totalQuantity,
 invoicedQuantity:x.invoicedQuantity,status:x.status,isActive:x.isActive,representativeName:x.representativeName||""
}));
console.log("BILLING_RESULT="+JSON.stringify({result,verification}));
process.exit(0);
