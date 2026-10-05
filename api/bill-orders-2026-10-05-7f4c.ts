import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { buildBillingPlan, collectSourceKeys } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { doc, getDoc, initializeFirestore, setDoc } from "firebase/firestore";

const tenantId = "imperio";
const origem = "CHATGPT_GOOGLE_DRIVE_CSV";
const solicitadoPor = "raul";
const documentKey = "FATURADOS-05-OUT-2026-10-05";

const require = createRequire(import.meta.url);
const cfg = require("../firebase-applet-config.json") as any;
const REPAIR_APP_NAME = "ops-billing-repair-2026-10-05";
const repairApp =
  getApps().find((a) => a.name === REPAIR_APP_NAME) ||
  initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  }, REPAIR_APP_NAME);
const repairDb = initializeFirestore(
  repairApp,
  { experimentalForceLongPolling: true },
  cfg.firestoreDatabaseId,
);

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
    {lineId:"e68203-65909-2517-400",codigoPedido:"65909",itemId:1779765282668,quantidade:400},
    {lineId:"e68203-65909-2739-1000",codigoPedido:"65909",itemId:2739,quantidade:1000},
    {lineId:"e68204-68107-9-200",codigoPedido:"68107",itemId:9,quantidade:200,numeroNota:"6411"},
    {lineId:"e68206-67995-1880-1500",codigoPedido:"67995",itemId:1880,quantidade:1500},
    {lineId:"e68206-67995-3794-700",codigoPedido:"67995",itemId:1780332371024,quantidade:700},
    {lineId:"e68211-68194-66-900",codigoPedido:"68194",itemId:66,quantidade:900},
    {lineId:"e68213-68193-9-200",codigoPedido:"68193",itemId:9,quantidade:200},
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

async function ensure68191ConnectorLine() {
  const existingRef = doc(repairDb, "orders", "7335792435680081");
  const existingSnap = await getDoc(existingRef);
  if (!existingSnap.exists()) throw new Error("Pedido 68191 base não encontrado.");
  const base:any = existingSnap.data();
  if (String(base.tenantId || "imperio") !== tenantId || String(base.orderCode || "") !== "68191") {
    throw new Error("Registro base do pedido 68191 divergiu do esperado.");
  }

  // If the missing line was already repaired, do nothing.
  const billingRepo = new FirestoreBillingRepository();
  const snapshot = await billingRepo.loadSnapshot(tenantId);
  const already = snapshot.orders.find((o:any) =>
    String(o.orderCode || "") === "68191" && Number(o.itemId) === 2739
  );
  if (already) {
    return { created:false, existingOrderId:already.id };
  }

  const now = Date.now();
  const id = now;
  const ref = doc(repairDb, "orders", String(id));
  const collision = await getDoc(ref);
  if (collision.exists()) throw new Error("Colisão de ID ao ajustar pedido 68191.");

  await setDoc(ref, {
    id,
    tenantId,
    orderCode:"68191",
    itemId:2739,
    color:"ZINCADO",
    size:"-",
    variation:"-",
    customerName:base.customerName || "ESTOFARIA TEIXEIRA",
    customerId:base.customerId ?? 1709,
    representativeName:base.representativeName || "Kesse Representante",
    representativeId:base.representativeId || "",
    totalQuantity:250,
    quantityScaled:2500000,
    packedQuantity:0,
    producedQuantity:0,
    paintedQuantity:0,
    cutQuantity:0,
    invoicedQuantity:0,
    isActive:true,
    createdAt:now,
    deliveryDate:base.deliveryDate || "2026-10-06",
    paymentCondition:base.paymentCondition || "Boleto",
    paymentTerms:base.paymentTerms || "15",
    paymentTermsDays:Array.isArray(base.paymentTermsDays) ? base.paymentTermsDays : [15],
    billingRule:base.billingRule || "cadastro",
    fiscalType:base.fiscalType || "SEM_NF",
    unitPrice:0.98,
    unitPriceScaled:9800,
    discountPercent:0,
    discountPercentScaled:0,
    discountAmount:0,
    discountAmountScaled:0,
    grossTotalScaled:2450000,
    netTotalScaled:2450000,
    hasRET:Boolean(base.hasRET),
    status:"PENDENTE",
    statusOriginalPdf:origem,
    notes:"Ajuste criado a partir do arquivo Faturados 05-out.csv; Entrega 68229. Item não constava no pedido original 68191.",
    itemNotes:"",
    originalProductCode:"2739.1",
    importOrigin:origem,
    importedAt:now,
    importedBy:solicitadoPor,
    importPayloadHash:"FATURADOS-05-OUT-68191-2739-250",
    orderAdjustmentReason:"billing_document_contains_item_absent_from_original_order"
  });

  const after = await getDoc(ref);
  if (!after.exists() || Number(after.data()?.itemId) !== 2739 || Number(after.data()?.totalQuantity) !== 250) {
    throw new Error("Falha na verificação do ajuste do pedido 68191.");
  }
  return { created:true, orderId:id };
}

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

  if(String(req.query?.repair68191||"").toLowerCase()==="true"){
    const result=await ensure68191ConnectorLine();
    return res.status(200).json({sucesso:true,etapa:"REPAIR_68191",result});
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
