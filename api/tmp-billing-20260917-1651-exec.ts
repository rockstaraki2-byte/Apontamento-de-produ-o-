import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";
const TOKEN="sep17-1651-exec-4f73a6b2";
const DOCUMENT_KEY="FATURADOS-17-SET-16H51-DIFF-2026-09-17";
const lines:any[]=[
{lineId:"p9-67105-5122-15",codigoPedido:"67105",codigoProduto:"5122",quantidade:15},
{lineId:"p9-67105-5126-10",codigoPedido:"67105",codigoProduto:"5126",quantidade:10},
{lineId:"p9-67105-5127-2",codigoPedido:"67105",codigoProduto:"5127",quantidade:2},
{lineId:"p10-67234-4811-60",codigoPedido:"67234",codigoProduto:"4811",quantidade:60},
{lineId:"p11-65781-3735-300",codigoPedido:"65781",codigoProduto:"3735",quantidade:300},
{lineId:"p12-67453-507-10000",codigoPedido:"67453",codigoProduto:"507",quantidade:10000},
{lineId:"p12-67487-1-500",codigoPedido:"67487",codigoProduto:"1",quantidade:500},
{lineId:"p12-67487-2787-50",codigoPedido:"67487",codigoProduto:"2787",quantidade:50},
{lineId:"p12-67487-3730-100",codigoPedido:"67487",codigoProduto:"3730",quantidade:100},
{lineId:"p13-66715-3730-2000",codigoPedido:"66715",codigoProduto:"3730",quantidade:2000,numeroNota:"6328"},
{lineId:"p14-67584-287-1200",codigoPedido:"67584",codigoProduto:"287",quantidade:1200,numeroNota:"6330"},
{lineId:"p15-67252-1281-200",codigoPedido:"67252",codigoProduto:"1281",quantidade:200},
{lineId:"p16-67582-5537-10",codigoPedido:"67582",codigoProduto:"5537",quantidade:10,numeroNota:"6329"},
{lineId:"p17-66162-4420-1",codigoPedido:"66162",codigoProduto:"4420",quantidade:1},
{lineId:"p17-66674-4207-16",codigoPedido:"66674",codigoProduto:"4207",quantidade:16},
{lineId:"p17-66674-4561-17",codigoPedido:"66674",codigoProduto:"4561",quantidade:17},
{lineId:"p17-67028-4561-9",codigoPedido:"67028",codigoProduto:"4561",quantidade:9},
{lineId:"p17-67028-5442-6",codigoPedido:"67028",codigoProduto:"5442",quantidade:6},
{lineId:"p17-67226-4420-2",codigoPedido:"67226",codigoProduto:"4420",quantidade:2},
{lineId:"p17-67277-4207-8",codigoPedido:"67277",codigoProduto:"4207",quantidade:8},
{lineId:"p17-67277-4362-3",codigoPedido:"67277",codigoProduto:"4362",quantidade:3},
{lineId:"p17-67277-5442-11",codigoPedido:"67277",codigoProduto:"5442",quantidade:11},
{lineId:"p18-64753-3145-6",codigoPedido:"64753",codigoProduto:"3145",quantidade:6},
{lineId:"p18-64753-3151-6",codigoPedido:"64753",codigoProduto:"3151",quantidade:6},
{lineId:"p19-66731-2572-150",codigoPedido:"66731",codigoProduto:"2572",quantidade:150},
{lineId:"p20-67596-2572-50",codigoPedido:"67596",codigoProduto:"2572",quantidade:50}
];
export default async function handler(req:any,res:any){
 if(req.method!=="GET")return res.status(405).json({error:"method"});
 if(String(req.query?.token||"")!==TOKEN)return res.status(404).json({error:"not_found"});
 const repo=new FirestoreBillingRepository();
 const payload:BillingImportPayload={origem:"CHATGPT_PDF",tenantId:"imperio",solicitadoPor:"raul",documentKey:DOCUMENT_KEY,allowBreakReservations:false,faturamentos:lines};
 const snapshot=await repo.loadSnapshot("imperio");
 const processed=await repo.findProcessedSourceKeys("imperio",DOCUMENT_KEY,collectSourceKeys(payload,snapshot));
 const plan=buildBillingPlan(snapshot,payload,{tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",processedSourceKeys:processed});
 const confirm=String(req.query?.confirm||"");
 if(!confirm)return res.status(200).json({ok:true,previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,linhas:plan.linhas.map(l=>({status:l.status,message:l.message,sourceKey:l.sourceKey,operation:l.operation?{orderCode:l.operation.orderCode,itemCode:l.operation.itemCode,billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity,reservationConflict:l.operation.reservationConflict}:undefined}))});
 if(confirm!==plan.previewHash)return res.status(409).json({error:"preview_hash_mismatch",expected:plan.previewHash,resumo:plan.resumo});
 if(!plan.canConfirm||plan.resumo.pendencias!==0||plan.resumo.conflitosReserva!==0)return res.status(422).json({error:"preview_not_confirmable",resumo:plan.resumo,linhas:plan.linhas});
 if(plan.resumo.total!==26||plan.resumo.quantidadeAFaturar!==14732)return res.status(409).json({error:"unexpected_preview",resumo:plan.resumo});
 const result=await repo.applyPlan(plan);
 const after=await repo.loadSnapshot("imperio");
 const ids=new Set(result.applied.map(a=>a.orderId));
 const verification=after.orders.filter(o=>ids.has(o.id)).map(o=>({orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity,status:o.status,isActive:o.isActive}));
 return res.status(200).json({ok:true,previewHash:plan.previewHash,resumoPreview:plan.resumo,result,verification});
}
