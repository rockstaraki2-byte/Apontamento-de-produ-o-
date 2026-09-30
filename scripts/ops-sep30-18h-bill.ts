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
},"ops-sep30-18h-bill");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const tenantId="imperio";
const documentKey="FATURADOS-30-SET-18H-2026-09-30";
const now=Date.now();
const scaled=(v)=>Math.round(Number(v)*10000);

const newRows=[
 {id:7333006777300002,orderCode:"67773",customerId:1582,customerName:"GUILHERME FERRO DA CONCEICAO",itemId:392,originalProductCode:"392.1",color:"ZINCADO",qty:300,unitPrice:1.95,paymentCondition:"BOLETO",paymentTerms:"20",paymentTermsDays:[20],fiscalType:"COM_NF",representativeName:"Ângelo representante",deliveryDate:"2026-09-30",discountPercent:0,discountAmount:0},
 {id:7333006780800001,orderCode:"67808",customerId:856,customerName:"ROFER COMERCIO E IMPORTAÇÃO LTDA",itemId:4132,originalProductCode:"4132",color:"-",qty:40,unitPrice:99.90,paymentCondition:"CARTEIRA",paymentTerms:"60",paymentTermsDays:[60],fiscalType:"SEM_NF",representativeName:"Pedidos LOJA imperio",deliveryDate:"2026-09-30",discountPercent:15,discountAmount:599.40},
 {id:7333006807600001,orderCode:"68076",customerId:8,customerName:"LE ESTOFADOS LTDA",itemId:1,originalProductCode:"1.1",color:"ZINCADO",qty:3000,unitPrice:1.15,paymentCondition:"BOLETO",paymentTerms:"30/45",paymentTermsDays:[30,45],fiscalType:"COM_NF",representativeName:"Kesse Representante",deliveryDate:"2026-09-30",discountPercent:0,discountAmount:0},
 {id:7333006807700001,orderCode:"68077",customerId:1007,customerName:"ESTOFADOS FERREIRINHA LTDA",itemId:1779765282864,originalProductCode:"2459.11",color:"CINZA",qty:1000,unitPrice:1.65,paymentCondition:"BOLETO",paymentTerms:"30/45/60",paymentTermsDays:[30,45,60],fiscalType:"SEM_NF",representativeName:"Kesse Representante",deliveryDate:"2026-09-30",discountPercent:0,discountAmount:0},
 {id:7333006807700002,orderCode:"68077",customerId:1007,customerName:"ESTOFADOS FERREIRINHA LTDA",itemId:1779765282668,originalProductCode:"2517.11",color:"CINZA",qty:1000,unitPrice:1.70,paymentCondition:"BOLETO",paymentTerms:"30/45/60",paymentTermsDays:[30,45,60],fiscalType:"SEM_NF",representativeName:"Kesse Representante",deliveryDate:"2026-09-30",discountPercent:0,discountAmount:0},
 {id:7333006808300001,orderCode:"68083",customerId:86,customerName:"TRESTEC",itemId:937,originalProductCode:"937",color:"-",qty:1,unitPrice:1087.15,paymentCondition:"CARTEIRA",paymentTerms:"30",paymentTermsDays:[30],fiscalType:"SEM_NF",representativeName:"Império Representante",deliveryDate:"2026-09-30",discountPercent:0,discountAmount:0}
];

const before=await getDocs(collection(db,"orders"));
const existingTargets=before.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&["67808","68076","68077","68083"].includes(String(r.orderCode||"")));
if(existingTargets.length){
 console.error("TARGET_ORDER_CREATED_SINCE_CHECK="+JSON.stringify(existingTargets));
 process.exit(3);
}
const existing67773=before.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&String(r.orderCode||"")==="67773");
if(!existing67773.length) throw new Error("67773_MISSING");
if(existing67773.some(r=>Number(r.itemId)===392)) throw new Error("67773_ITEM392_ALREADY_EXISTS");

const createResult=await runTransaction(db,async tx=>{
 const requiredItems=[392,4132,1,1779765282864,1779765282668,937];
 const requiredCustomers=[1582,856,8,1007,86];
 const itemRefs=requiredItems.map(id=>doc(db,"items",String(id)));
 const customerRefs=requiredCustomers.map(id=>doc(db,"customers",String(id)));
 const rowRefs=newRows.map(x=>doc(db,"orders",String(x.id)));
 const markerRef=doc(db,"orderImportKeys",crypto.createHash("sha256").update(tenantId+":"+documentKey+":missing-orders-and-row").digest("hex"));
 const [itemSnaps,customerSnaps,rowSnaps,markerSnap]=await Promise.all([
   Promise.all(itemRefs.map(r=>tx.get(r))),
   Promise.all(customerRefs.map(r=>tx.get(r))),
   Promise.all(rowRefs.map(r=>tx.get(r))),
   tx.get(markerRef)
 ]);
 if(markerSnap.exists()) throw new Error("ENTITY_BATCH_ALREADY_CREATED");
 if(itemSnaps.some(s=>!s.exists())) throw new Error("REQUIRED_ITEM_MISSING");
 if(customerSnaps.some(s=>!s.exists())) throw new Error("REQUIRED_CUSTOMER_MISSING");
 if(rowSnaps.some(s=>s.exists())) throw new Error("TARGET_ROW_ID_ALREADY_EXISTS");

 newRows.forEach((x,i)=>{
   const gross=x.qty*x.unitPrice;
   const net=gross-x.discountAmount;
   tx.set(rowRefs[i],{
     id:x.id,tenantId,orderCode:x.orderCode,customerId:x.customerId,customerName:x.customerName,
     itemId:x.itemId,originalProductCode:x.originalProductCode,color:x.color,size:"-",variation:"-",
     totalQuantity:x.qty,invoicedQuantity:0,quantityScaled:scaled(x.qty),
     unitPrice:x.unitPrice,unitPriceScaled:scaled(x.unitPrice),
     grossTotalScaled:scaled(gross),netTotalScaled:scaled(net),
     discountPercent:x.discountPercent,discountPercentScaled:scaled(x.discountPercent),
     discountAmount:x.discountAmount,discountAmountScaled:scaled(x.discountAmount),
     producedQuantity:0,paintedQuantity:0,packedQuantity:0,cutQuantity:0,
     status:"PENDENTE",isActive:true,isUrgent:false,
     paymentCondition:x.paymentCondition,paymentTerms:x.paymentTerms,paymentTermsDays:x.paymentTermsDays,
     fiscalType:x.fiscalType,hasRET:false,
     representativeId:"",representativeName:x.representativeName,
     deliveryDate:x.deliveryDate,notes:"Criado a partir do arquivo Faturados 30-set 18h.",itemNotes:"",
     billingRule:"cadastro",importOrigin:"CHATGPT_GOOGLE_DRIVE_PDF",importedBy:"raul",
     statusOriginalPdf:"CHATGPT_GOOGLE_DRIVE_PDF",
     importPayloadHash:crypto.createHash("sha256").update(documentKey+":"+x.orderCode+":"+x.itemId+":"+x.qty).digest("hex"),
     createdAt:now+i,importedAt:now+i
   });
 });
 tx.set(markerRef,{tenantId,documentKey,createdAt:now,ordersCreated:["67808","68076","68077","68083"],rowAdded:"67773/392"});
 return {ordersCreated:["67808","68076","68077","68083"],rowAdded:"67773/392",rowsCreated:newRows.length};
});
console.log("CREATE_RESULT="+JSON.stringify(createResult));

const payload:any={
 origem:"CHATGPT_GOOGLE_DRIVE_PDF",tenantId,solicitadoPor:"raul",documentKey,allowBreakReservations:false,
 faturamentos:[
  {lineId:"p10-e68071-67933-961-54",codigoPedido:"67933",itemId:961,cor:"PRETO FOSCO",quantidade:54},
  {lineId:"p11-e68075-67773-392-300",codigoPedido:"67773",itemId:392,cor:"ZINCADO",quantidade:300,numeroNota:"6395"},
  {lineId:"p11-e68075-67773-4810-10",codigoPedido:"67773",itemId:1779765279567,cor:"PRETO FOSCO",quantidade:10,numeroNota:"6395"},

  {lineId:"p12-e68054-67536-3908-47",codigoPedido:"67536",itemId:3908,quantidade:47,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-4015-47",codigoPedido:"67536",itemId:4015,quantidade:47,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-4454-5",codigoPedido:"67536",itemId:4454,quantidade:5,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-4455-3",codigoPedido:"67536",itemId:4455,quantidade:3,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-4517-14",codigoPedido:"67536",itemId:4517,quantidade:14,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5138-6",codigoPedido:"67536",itemId:1783602844638,quantidade:6,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5139-6",codigoPedido:"67536",itemId:1783602871134,quantidade:6,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5165-6",codigoPedido:"67536",itemId:1784036752218,quantidade:6,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5166-6",codigoPedido:"67536",itemId:1784036783602,quantidade:6,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5167-6",codigoPedido:"67536",itemId:1784036968361,quantidade:6,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5168-6",codigoPedido:"67536",itemId:1784037016833,quantidade:6,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5202-110",codigoPedido:"67536",itemId:1784731000699,quantidade:110,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5392-10",codigoPedido:"67536",itemId:1787590096221,quantidade:10,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5393-12",codigoPedido:"67536",itemId:1787590156141,quantidade:12,numeroNota:"6389"},
  {lineId:"p12-e68054-67536-5535-110",codigoPedido:"67536",itemId:1789572129110,quantidade:110,numeroNota:"6389"},

  {lineId:"p13-e68055-65025-5181-1419",codigoPedido:"65025",itemId:1784233675282,quantidade:1419,numeroNota:"6390"},
  {lineId:"p14-e68056-66687-3585-300",codigoPedido:"66687",itemId:3585,cor:"CINZA",quantidade:300,numeroNota:"6391"},
  {lineId:"p15-e68073-67281-2594-75",codigoPedido:"67281",itemId:2594,cor:"PRETO FOSCO",quantidade:75},
  {lineId:"p15-e68073-67281-3658-149",codigoPedido:"67281",itemId:3658,cor:"PRETO FOSCO",quantidade:149},
  {lineId:"p16-e68060-67808-4132-40",codigoPedido:"67808",itemId:4132,quantidade:40},
  {lineId:"p17-e68062-67523-2827-200",codigoPedido:"67523",itemId:2827,cor:"ZINCADO",quantidade:200},
  {lineId:"p17-e68062-67523-5532-100",codigoPedido:"67523",itemId:1789572016015,quantidade:100},
  {lineId:"p18-e68064-67748-3187-20",codigoPedido:"67748",itemId:2401,cor:"PRETO FOSCO",quantidade:20},
  {lineId:"p18-e68064-67748-4222-40",codigoPedido:"67748",itemId:4222,cor:"PRETO FOSCO",quantidade:40},
  {lineId:"p18-e68064-67748-4809-3",codigoPedido:"67748",itemId:4809,cor:"PRETO FOSCO",quantidade:3},
  {lineId:"p18-e68064-67810-4810-10",codigoPedido:"67810",itemId:1779765279567,cor:"PRETO FOSCO",quantidade:10},
  {lineId:"p19-e68066-67719-5545-400",codigoPedido:"67719",itemId:1790013304670,cor:"PRETO FOSCO",quantidade:400},
  {lineId:"p19-e68066-67719-5546-40",codigoPedido:"67719",itemId:1790013427875,cor:"PRETO FOSCO",quantidade:40},
  {lineId:"p20-e68068-67624-2846-5",codigoPedido:"67624",itemId:2846,cor:"PRETO FOSCO",quantidade:5},
  {lineId:"p21-e68069-67813-4025-10",codigoPedido:"67813",itemId:4025,quantidade:10,numeroNota:"6392"},
  {lineId:"p22-e68078-68076-1-3000",codigoPedido:"68076",itemId:1,cor:"ZINCADO",quantidade:3000,numeroNota:"6396"},
  {lineId:"p23-e68080-67714-2517-1000",codigoPedido:"67714",itemId:1779765282668,cor:"CINZA",quantidade:1000},
  {lineId:"p24-e68082-68077-2459-1000",codigoPedido:"68077",itemId:1779765282864,cor:"CINZA",quantidade:1000},
  {lineId:"p24-e68082-68077-2517-1000",codigoPedido:"68077",itemId:1779765282668,cor:"CINZA",quantidade:1000},
  {lineId:"p25-e68085-68083-937-1",codigoPedido:"68083",itemId:937,quantidade:1}
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
 plan.resumo.total===38 &&
 plan.resumo.prontos===38 &&
 plan.resumo.ajustesQuantidade===0 &&
 plan.resumo.conflitosReserva===0 &&
 plan.resumo.jaProcessados===0 &&
 plan.resumo.jaFaturados===0 &&
 plan.resumo.pendencias===0 &&
 plan.resumo.quantidadeAFaturar===9570 &&
 plan.canConfirm===true;

if(!exact){
 console.error("GUARD_FAILED="+JSON.stringify({resumo:plan.resumo,linhas:plan.linhas}));
 process.exit(2);
}

const result=await repository.applyPlan(plan);
const after=await repository.loadSnapshot(tenantId);
const wanted=new Set(["67933","67773","67536","65025","66687","67281","67808","67523","67748","67810","67719","67624","67813","68076","67714","68077","68083"]);
const verification=after.orders.filter((x:any)=>wanted.has(String(x.orderCode||""))).map((x:any)=>({
 id:x.id,orderCode:x.orderCode,itemId:x.itemId,color:x.color,totalQuantity:x.totalQuantity,
 invoicedQuantity:x.invoicedQuantity,status:x.status,isActive:x.isActive
}));
console.log("BILLING_RESULT="+JSON.stringify({result,verification}));
process.exit(0);
