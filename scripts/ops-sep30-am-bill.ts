import crypto from "node:crypto";
import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, doc, getDocs, initializeFirestore, runTransaction } from "firebase/firestore";
import { buildBillingPlan, collectSourceKeys } from "../api/_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.js";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep30-am-bill");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const tenantId="imperio";
const documentKey="FATURADOS-30-SET-MANHA-2026-09-30";
const now=Date.now();
const scaled=(v)=>Math.round(Number(v)*10000);

const orderDefs=[
 {
  id:7333006802500001,orderCode:"68025",customerId:18,itemId:4598,originalProductCode:"4598.3",color:"PRETO FOSCO",
  qty:1,unitPrice:265.02,paymentCondition:"BOLETO",paymentTerms:"30/45",paymentTermsDays:[30,45],
  fiscalType:"SEM_NF",representativeName:"Império Representante",deliveryDate:"2026-09-17"
 },
 {
  id:7333006802600001,orderCode:"68026",customerId:72,itemId:2314,originalProductCode:"3145.3",color:"PRETO FOSCO",
  qty:29,unitPrice:62,paymentCondition:"CARTEIRA",paymentTerms:"30",paymentTermsDays:[30],
  fiscalType:"SEM_NF",representativeName:"Império Representante",deliveryDate:"2026-07-31"
 },
 {
  id:7333006802600002,orderCode:"68026",customerId:72,itemId:2313,originalProductCode:"3151.3",color:"PRETO FOSCO",
  qty:5,unitPrice:82,paymentCondition:"CARTEIRA",paymentTerms:"30",paymentTermsDays:[30],
  fiscalType:"SEM_NF",representativeName:"Império Representante",deliveryDate:"2026-07-31"
 },
 {
  id:7333006802700001,orderCode:"68027",customerId:945,itemId:9,originalProductCode:"9",color:"-",
  qty:200,unitPrice:1.26,paymentCondition:"BOLETO",paymentTerms:"30",paymentTermsDays:[30],
  fiscalType:"SEM_NF",representativeName:"Kesse Representante",deliveryDate:"2026-09-30"
 }
];

const allBefore=await getDocs(collection(db,"orders"));
const existing=allBefore.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&["68025","68026","68027"].includes(String(r.orderCode||"")));
if(existing.length){
 console.error("MISSING_ORDER_BATCH_CHANGED="+JSON.stringify(existing));
 process.exit(3);
}

const createResult=await runTransaction(db,async tx=>{
 const itemIds=[4598,2314,2313,9];
 const customerIds=[18,72,945];
 const itemRefs=itemIds.map(id=>doc(db,"items",String(id)));
 const customerRefs=customerIds.map(id=>doc(db,"customers",String(id)));
 const orderRefs=orderDefs.map(x=>doc(db,"orders",String(x.id)));
 const markerRef=doc(db,"orderImportKeys",crypto.createHash("sha256").update(tenantId+":"+documentKey+":orders-68025-68026-68027").digest("hex"));
 const [itemSnaps,customerSnaps,orderSnaps,markerSnap]=await Promise.all([
   Promise.all(itemRefs.map(r=>tx.get(r))),
   Promise.all(customerRefs.map(r=>tx.get(r))),
   Promise.all(orderRefs.map(r=>tx.get(r))),
   tx.get(markerRef)
 ]);
 if(markerSnap.exists()) throw new Error("ORDER_BATCH_ALREADY_CREATED");
 if(itemSnaps.some(s=>!s.exists())) throw new Error("REQUIRED_ITEM_MISSING");
 if(customerSnaps.some(s=>!s.exists())) throw new Error("REQUIRED_CUSTOMER_MISSING");
 if(orderSnaps.some(s=>s.exists())) throw new Error("TARGET_ORDER_ID_ALREADY_EXISTS");
 const customerNames=new Map(customerSnaps.map((s,i)=>[customerIds[i],String(s.data().name||s.data().tradeName||customerIds[i])]));
 orderDefs.forEach((x,i)=>{
   const gross=x.qty*x.unitPrice;
   tx.set(orderRefs[i],{
     id:x.id,tenantId,orderCode:x.orderCode,customerId:x.customerId,customerName:customerNames.get(x.customerId),
     itemId:x.itemId,originalProductCode:x.originalProductCode,color:x.color,size:"-",variation:"-",
     totalQuantity:x.qty,invoicedQuantity:0,quantityScaled:scaled(x.qty),
     unitPrice:x.unitPrice,unitPriceScaled:scaled(x.unitPrice),
     grossTotalScaled:scaled(gross),netTotalScaled:scaled(gross),
     discountPercent:0,discountPercentScaled:0,discountAmount:0,discountAmountScaled:0,
     producedQuantity:0,paintedQuantity:0,packedQuantity:0,cutQuantity:0,
     status:"PENDENTE",isActive:true,isUrgent:false,
     paymentCondition:x.paymentCondition,paymentTerms:x.paymentTerms,paymentTermsDays:x.paymentTermsDays,
     fiscalType:x.fiscalType,hasRET:false,
     representativeId:"",representativeName:x.representativeName,
     deliveryDate:x.deliveryDate,notes:"Importado do arquivo Pedidos 30-set manhã para faturamento correspondente.",itemNotes:"",
     billingRule:"cadastro",importOrigin:"CHATGPT_GOOGLE_DRIVE_PDF",importedBy:"raul",
     statusOriginalPdf:"CHATGPT_GOOGLE_DRIVE_PDF",
     importPayloadHash:crypto.createHash("sha256").update(documentKey+":"+x.orderCode+":"+x.itemId+":"+x.qty).digest("hex"),
     createdAt:now+i,importedAt:now+i
   });
 });
 tx.set(markerRef,{tenantId,documentKey,createdAt:now,orders:["68025","68026","68027"],source:"Pedidos 30-set manhã"});
 return {ordersCreated:["68025","68026","68027"],rowsCreated:orderDefs.length};
});
console.log("CREATE_RESULT="+JSON.stringify(createResult));

const payload:any={
 origem:"CHATGPT_GOOGLE_DRIVE_PDF",tenantId,solicitadoPor:"raul",documentKey,allowBreakReservations:false,
 faturamentos:[
  {lineId:"p1-e68029-67178-4598-preto-7",codigoPedido:"67178",itemId:4598,cor:"PRETO FOSCO",quantidade:7},
  {lineId:"p1-e68029-68025-4598-1",codigoPedido:"68025",itemId:4598,quantidade:1},
  {lineId:"p2-e68031-67906-392-150",codigoPedido:"67906",itemId:392,quantidade:150},
  {lineId:"p2-e68031-67906-797-400",codigoPedido:"67906",itemId:337,quantidade:400},
  {lineId:"p3-e68035-68016-3585-20",codigoPedido:"68016",itemId:3585,quantidade:20},
  {lineId:"p4-e68039-67907-41-20",codigoPedido:"67907",itemId:41,quantidade:20},
  {lineId:"p4-e68039-67907-3192-10",codigoPedido:"67907",itemId:3192,quantidade:10},
  {lineId:"p5-e68041-68027-9-200",codigoPedido:"68027",itemId:9,quantidade:200},
  {lineId:"p6-e68043-66974-4071-1",codigoPedido:"66974",itemId:4071,quantidade:1},
  {lineId:"p6-e68043-66974-4072-10",codigoPedido:"66974",itemId:4072,quantidade:10},
  {lineId:"p7-e68045-67667-3193-255",codigoPedido:"67667",itemId:2140,quantidade:255},
  {lineId:"p8-e68047-64753-3145-14",codigoPedido:"64753",itemId:2314,quantidade:14},
  {lineId:"p8-e68047-64753-3151-24",codigoPedido:"64753",itemId:2313,quantidade:24},
  {lineId:"p8-e68047-68026-3145-29",codigoPedido:"68026",itemId:2314,quantidade:29},
  {lineId:"p8-e68047-68026-3151-5",codigoPedido:"68026",itemId:2313,quantidade:5},
  {lineId:"p9-e68051-67298-3932-428",codigoPedido:"67298",itemId:1779765281202,quantidade:428}
 ]
};

const repository=new FirestoreBillingRepository();
const snapshot=await repository.loadSnapshot(tenantId);
const keys=collectSourceKeys(payload,snapshot);
const processed=await repository.findProcessedSourceKeys(tenantId,documentKey,keys);
const plan=buildBillingPlan(snapshot,payload,{tenantId,origem:"CHATGPT_GOOGLE_DRIVE_PDF",solicitadoPor:"raul",processedSourceKeys:processed});

console.log("BILLING_PREVIEW="+JSON.stringify({
 previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
 linhas:plan.linhas.map((l:any)=>({status:l.status,message:l.message,sourceKey:l.sourceKey,candidateOrderIds:l.candidateOrderIds,
  operation:l.operation&&{orderId:l.operation.orderId,orderCode:l.operation.orderCode,itemId:l.operation.itemId,itemCode:l.operation.itemCode,
   billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,
   newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity,quantityAdjustedBy:l.operation.quantityAdjustedBy}}))
}));

const exact=
 plan.resumo.total===16 &&
 plan.resumo.prontos===14 &&
 plan.resumo.ajustesQuantidade===2 &&
 plan.resumo.conflitosReserva===0 &&
 plan.resumo.jaProcessados===0 &&
 plan.resumo.jaFaturados===0 &&
 plan.resumo.pendencias===0 &&
 plan.resumo.quantidadeAFaturar===1574 &&
 plan.canConfirm===true;

if(!exact){
 console.error("GUARD_FAILED="+JSON.stringify({resumo:plan.resumo,linhas:plan.linhas}));
 process.exit(2);
}

const result=await repository.applyPlan(plan);
const after=await repository.loadSnapshot(tenantId);
const wanted=new Set(["67178","68025","67906","68016","67907","68027","66974","67667","64753","68026","67298"]);
const verification=after.orders.filter((x:any)=>wanted.has(String(x.orderCode||""))).map((x:any)=>({
 id:x.id,orderCode:x.orderCode,itemId:x.itemId,color:x.color,totalQuantity:x.totalQuantity,
 invoicedQuantity:x.invoicedQuantity,status:x.status,isActive:x.isActive
}));
console.log("BILLING_RESULT="+JSON.stringify({result,verification}));
process.exit(0);
