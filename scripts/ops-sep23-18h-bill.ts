import crypto from "node:crypto";
import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, initializeFirestore, runTransaction } from "firebase/firestore";
import { buildBillingPlan, collectSourceKeys } from "../api/_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.js";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep23-18h-bill");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const tenantId="imperio";
const documentKey="FATURADOS-23-09-18H-2026-09-23";
const now=Date.now();

const productDefs=[
 {id:5548,code:"5548",name:'CHAPA CHURRASQUEIRA - CHAPA 0.8MM X 450 MM X 186 MM',unitPrice:76.16},
 {id:5549,code:"5549",name:'CHAPA 1/2" - 50MM X 91,5MM - TORNODELTA',unitPrice:21.70}
];

const orderDefs=[
 {
  id:7332400067814001,orderCode:"67814",customerId:1867,customerName:"ROSEMARY LEITAO MARINHA",
  itemId:5548,originalProductCode:"5548",qty:3,unitPrice:76.16,
  discountPercent:3.71,discountAmount:8.48,grossTotal:228.48,netTotal:220.00,
  paymentCondition:"DINHEIRO",paymentTerms:"",paymentTermsDays:[],fiscalType:"SEM_NF",
  representativeId:"representante_imperio",representativeName:"Império Representante",
  delivery:"67816"
 },
 {
  id:7332400067817001,orderCode:"67817",customerId:173,customerName:"TORNO DELTA",
  itemId:5549,originalProductCode:"5549",qty:4,unitPrice:21.70,
  discountPercent:0,discountAmount:0,grossTotal:86.80,netTotal:86.80,
  paymentCondition:"CARTEIRA",paymentTerms:"30 Dias",paymentTermsDays:[30],fiscalType:"SEM_NF",
  representativeId:"representante_imperio",representativeName:"Império Representante",
  delivery:"67819"
 }
];

function scaled(v){return Math.round(Number(v)*10000);}

const allBefore=await getDocs(collection(db,"orders"));
const targetExisting=allBefore.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio" && ["67814","67817"].includes(String(r.orderCode||"")));
if(targetExisting.length){
 console.error("TARGET_ORDER_ALREADY_EXISTS="+JSON.stringify(targetExisting));
 process.exit(3);
}

const entityResult=await runTransaction(db,async tx=>{
 const pRefs=productDefs.map(p=>doc(db,"items",String(p.id)));
 const cRef=doc(db,"customers","1867");
 const oRefs=orderDefs.map(x=>doc(db,"orders",String(x.id)));
 const markerRef=doc(db,"orderImportKeys",crypto.createHash("sha256").update(tenantId+":"+documentKey+":missing-entities").digest("hex"));
 const [pSnaps,cSnap,oSnaps,mSnap]=await Promise.all([
   Promise.all(pRefs.map(r=>tx.get(r))),
   tx.get(cRef),
   Promise.all(oRefs.map(r=>tx.get(r))),
   tx.get(markerRef)
 ]);
 if(mSnap.exists()) throw new Error("ENTITY_BATCH_ALREADY_CREATED");
 for(let i=0;i<pSnaps.length;i++){
   if(pSnaps[i].exists()){
     const d=pSnaps[i].data();
     if(String(d.code||d.id||"")!==productDefs[i].code) throw new Error("PRODUCT_ID_CONFLICT_"+productDefs[i].id);
   } else {
     const p=productDefs[i];
     tx.set(pRefs[i],{
       id:p.id,tenantId,code:p.code,name:p.name,type:"PRODUTO",unit:"UN",
       unitPrice:p.unitPrice,basePrice:p.unitPrice,productionPoints:0,
       notes:"",imageUrl:"",fluxos:[],standardCycles:{}
     });
   }
 }
 if(cSnap.exists()){
   const d=cSnap.data();
   if(String(d.name||"").toUpperCase()!=="ROSEMARY LEITAO MARINHA") throw new Error("CUSTOMER_1867_CONFLICT");
 } else {
   tx.set(cRef,{
     id:1867,tenantId,name:"ROSEMARY LEITAO MARINHA",tradeName:"ROSEMARY LEITAO MARINHA",
     address:"UBA - MG",neighborhood:"CENTRO",bairro:"CENTRO",phone:"",email:"",
     fiscalType:"SEM_NF",hasRET:false,defaultPaymentTerms:"Dinheiro"
   });
 }
 if(oSnaps.some(s=>s.exists())) throw new Error("TARGET_ORDER_ID_CONFLICT");
 orderDefs.forEach((x,i)=>{
   tx.set(oRefs[i],{
     id:x.id,tenantId,orderCode:x.orderCode,customerId:x.customerId,customerName:x.customerName,
     itemId:x.itemId,originalProductCode:x.originalProductCode,color:"-",size:"-",variation:"-",
     totalQuantity:x.qty,invoicedQuantity:0,quantityScaled:scaled(x.qty),
     unitPrice:x.unitPrice,unitPriceScaled:scaled(x.unitPrice),
     grossTotalScaled:scaled(x.grossTotal),netTotalScaled:scaled(x.netTotal),
     discountPercent:x.discountPercent,discountPercentScaled:scaled(x.discountPercent),
     discountAmount:x.discountAmount,discountAmountScaled:scaled(x.discountAmount),
     producedQuantity:0,paintedQuantity:0,packedQuantity:0,cutQuantity:0,
     status:"PENDENTE",isActive:true,isUrgent:false,
     paymentCondition:x.paymentCondition,paymentTerms:x.paymentTerms,paymentTermsDays:x.paymentTermsDays,
     fiscalType:x.fiscalType,hasRET:false,
     representativeId:x.representativeId,representativeName:x.representativeName,
     deliveryDate:"2026-09-23",notes:"Faturamento PDF entrega "+x.delivery,itemNotes:"",
     billingRule:"cadastro",importOrigin:"CHATGPT_GOOGLE_DRIVE_PDF",importedBy:"raul",
     statusOriginalPdf:"CHATGPT_GOOGLE_DRIVE_PDF",
     importPayloadHash:crypto.createHash("sha256").update(documentKey+":"+x.orderCode+":"+x.itemId+":"+x.qty).digest("hex"),
     createdAt:now+i,importedAt:now+i
   });
 });
 tx.set(markerRef,{tenantId,documentKey,createdAt:now,orders:["67814","67817"],products:["5548","5549"],customerCreated:!cSnap.exists()});
 return {productsCreated:pSnaps.map((s,i)=>!s.exists()?productDefs[i].code:null).filter(Boolean),customerCreated:!cSnap.exists(),ordersCreated:["67814","67817"]};
});
console.log("ENTITY_RESULT="+JSON.stringify(entityResult));

const payload:any={
 origem:"CHATGPT_GOOGLE_DRIVE_PDF",tenantId,solicitadoPor:"raul",documentKey,allowBreakReservations:false,
 faturamentos:[
  {lineId:"p9-e67824-67105-5123-preto-30",codigoPedido:"67105",itemId:1782850683818,cor:"PRETO FOSCO",quantidade:30},
  {lineId:"p9-e67824-67105-5123-dourado-9",codigoPedido:"67105",itemId:1782850683818,cor:"DOURADO",quantidade:9},
  {lineId:"p9-e67824-67105-5124-dourado-10",codigoPedido:"67105",itemId:1782851662038,cor:"DOURADO",quantidade:10},
  {lineId:"p10-e67816-67814-5548-3",codigoPedido:"67814",itemId:5548,quantidade:3},
  {lineId:"p11-e67819-67817-5549-4",codigoPedido:"67817",itemId:5549,quantidade:4}
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
 plan.resumo.total===5 &&
 plan.resumo.prontos===5 &&
 plan.resumo.ajustesQuantidade===0 &&
 plan.resumo.conflitosReserva===0 &&
 plan.resumo.jaProcessados===0 &&
 plan.resumo.jaFaturados===0 &&
 plan.resumo.pendencias===0 &&
 plan.resumo.quantidadeAFaturar===56 &&
 plan.canConfirm===true;

if(!exact){
 console.error("GUARD_FAILED="+JSON.stringify({resumo:plan.resumo,linhas:plan.linhas}));
 process.exit(2);
}

const result=await repository.applyPlan(plan);
const after=await repository.loadSnapshot(tenantId);
const wanted=new Set(["67105","67814","67817"]);
const verification=after.orders.filter((x:any)=>wanted.has(String(x.orderCode||""))).map((x:any)=>({
 id:x.id,orderCode:x.orderCode,itemId:x.itemId,color:x.color,totalQuantity:x.totalQuantity,
 invoicedQuantity:x.invoicedQuantity,status:x.status,isActive:x.isActive
}));
console.log("BILLING_RESULT="+JSON.stringify({result,verification}));
process.exit(0);
