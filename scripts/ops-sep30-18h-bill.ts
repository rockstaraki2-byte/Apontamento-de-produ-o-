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
const baseCode=(s)=>String(s||"").split(".")[0].trim().toUpperCase();

const specs=[
 {p:10,e:"68071",orderCode:"67933",code:"961.3",qty:54,color:"PRETO FOSCO"},
 {p:11,e:"68075",orderCode:"67773",code:"392.1",qty:300,color:"ZINCADO",note:"6395"},
 {p:11,e:"68075",orderCode:"67773",code:"4810.3",qty:10,color:"PRETO FOSCO",note:"6395"},
 {p:12,e:"68054",orderCode:"67536",code:"3908",qty:47,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"4015",qty:47,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"4454",qty:5,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"4455",qty:3,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"4517",qty:14,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5138",qty:6,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5139",qty:6,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5165",qty:6,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5166",qty:6,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5167",qty:6,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5168",qty:6,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5202",qty:110,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5392",qty:10,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5393",qty:12,note:"6389"},
 {p:12,e:"68054",orderCode:"67536",code:"5535",qty:110,note:"6389"},
 {p:13,e:"68055",orderCode:"65025",code:"5181",qty:1419,note:"6390"},
 {p:14,e:"68056",orderCode:"66687",code:"3585.11",qty:300,color:"CINZA",note:"6391"},
 {p:15,e:"68073",orderCode:"67281",code:"2594.3",qty:75,color:"PRETO FOSCO"},
 {p:15,e:"68073",orderCode:"67281",code:"3658.3",qty:149,color:"PRETO FOSCO"},
 {p:16,e:"68060",orderCode:"67808",code:"4132",qty:40},
 {p:17,e:"68062",orderCode:"67523",code:"2827.1",qty:200,color:"ZINCADO"},
 {p:17,e:"68062",orderCode:"67523",code:"5532",qty:100},
 {p:18,e:"68064",orderCode:"67748",code:"3187.3",qty:20,color:"PRETO FOSCO"},
 {p:18,e:"68064",orderCode:"67748",code:"4222.3",qty:40,color:"PRETO FOSCO"},
 {p:18,e:"68064",orderCode:"67748",code:"4809.3",qty:3,color:"PRETO FOSCO"},
 {p:18,e:"68064",orderCode:"67810",code:"4810.3",qty:10,color:"PRETO FOSCO"},
 {p:19,e:"68066",orderCode:"67719",code:"5545.3",qty:400,color:"PRETO FOSCO"},
 {p:19,e:"68066",orderCode:"67719",code:"5546.3",qty:40,color:"PRETO FOSCO"},
 {p:20,e:"68068",orderCode:"67624",code:"2846.3",qty:5,color:"PRETO FOSCO"},
 {p:21,e:"68069",orderCode:"67813",code:"4025",qty:10,note:"6392"},
 {p:22,e:"68078",orderCode:"68076",code:"1.1",qty:3000,color:"ZINCADO",note:"6396"},
 {p:23,e:"68080",orderCode:"67714",code:"2517.11",qty:1000,color:"CINZA"},
 {p:24,e:"68082",orderCode:"68077",code:"2459.11",qty:1000,color:"CINZA"},
 {p:24,e:"68082",orderCode:"68077",code:"2517.11",qty:1000,color:"CINZA"},
 {p:25,e:"68085",orderCode:"68083",code:"937",qty:1}
];

const [itemsSnap,customersSnap,ordersBefore]=await Promise.all([
 getDocs(collection(db,"items")),getDocs(collection(db,"customers")),getDocs(collection(db,"orders"))
]);
const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()}));
const customers=customersSnap.docs.map(d=>({docId:d.id,...d.data()}));
const orders0=ordersBefore.docs.map(d=>({docId:d.id,...d.data()})).filter(r=>String(r.tenantId||"imperio")==tenantId);
const itemById=new Map(items.map(x=>[String(x.id??x.docId),x]));

function productByCode(code){
 const b=baseCode(code);
 const cands=items.filter(x=>baseCode(x.code||x.id||x.docId)===b);
 if(!cands.length) throw new Error("PRODUCT_NOT_FOUND_"+code);
 const exact=cands.filter(x=>String(x.code||x.id||x.docId).trim().toUpperCase()===String(code).trim().toUpperCase());
 const chosen=exact.length===1?exact[0]:(cands.length===1?cands[0]:null);
 if(!chosen) throw new Error("PRODUCT_AMBIGUOUS_"+code+":"+JSON.stringify(cands.map(x=>({id:x.id,code:x.code,name:x.name}))));
 return chosen;
}
function customerById(id){
 const c=customers.find(x=>String(x.id??x.docId)===String(id));
 if(!c) throw new Error("CUSTOMER_NOT_FOUND_"+id);
 return c;
}

const missingOrderCodes=["67808","68076","68077","68083"];
const preExistingMissing=orders0.filter(r=>missingOrderCodes.includes(String(r.orderCode||"")));

const createDefs=[
 {id:7333006780800001,orderCode:"67808",customerId:856,code:"4132",originalProductCode:"4132",color:"-",qty:40,unitPrice:99.90,discountPercent:15,discountAmount:599.40,paymentCondition:"CARTEIRA",paymentTerms:"60",paymentTermsDays:[60],fiscalType:"SEM_NF",representativeName:"Pedidos LOJA imperio"},
 {id:7333006807600001,orderCode:"68076",customerId:8,code:"1",originalProductCode:"1.1",color:"ZINCADO",qty:3000,unitPrice:1.15,discountPercent:0,discountAmount:0,paymentCondition:"BOLETO",paymentTerms:"30/45",paymentTermsDays:[30,45],fiscalType:"COM_NF",representativeName:"Kesse Representante"},
 {id:7333006807700001,orderCode:"68077",customerId:1007,code:"2459",originalProductCode:"2459.11",color:"CINZA",qty:1000,unitPrice:1.65,discountPercent:0,discountAmount:0,paymentCondition:"BOLETO",paymentTerms:"30/45/60",paymentTermsDays:[30,45,60],fiscalType:"SEM_NF",representativeName:"Kesse Representante"},
 {id:7333006807700002,orderCode:"68077",customerId:1007,code:"2517",originalProductCode:"2517.11",color:"CINZA",qty:1000,unitPrice:1.70,discountPercent:0,discountAmount:0,paymentCondition:"BOLETO",paymentTerms:"30/45/60",paymentTermsDays:[30,45,60],fiscalType:"SEM_NF",representativeName:"Kesse Representante"},
 {id:7333006808300001,orderCode:"68083",customerId:86,code:"937",originalProductCode:"937",color:"-",qty:1,unitPrice:1087.15,discountPercent:0,discountAmount:0,paymentCondition:"CARTEIRA",paymentTerms:"30",paymentTermsDays:[30],fiscalType:"SEM_NF",representativeName:"Império Representante"}
].map(x=>({...x,product:productByCode(x.code),customer:customerById(x.customerId)}));

const markerId=crypto.createHash("sha256").update(tenantId+":"+documentKey+":missing-orders").digest("hex");
const markerRef=doc(db,"orderImportKeys",markerId);

if(preExistingMissing.length===0){
 const createResult=await runTransaction(db,async tx=>{
   const orderRefs=createDefs.map(x=>doc(db,"orders",String(x.id)));
   const [markerSnap,orderSnaps]=await Promise.all([tx.get(markerRef),Promise.all(orderRefs.map(r=>tx.get(r)))]);
   if(markerSnap.exists()) throw new Error("CREATE_MARKER_EXISTS_WITHOUT_ORDERS");
   if(orderSnaps.some(s=>s.exists())) throw new Error("TARGET_ORDER_ID_ALREADY_EXISTS");
   createDefs.forEach((x,i)=>{
     const gross=x.qty*x.unitPrice;
     const net=gross-x.discountAmount;
     tx.set(orderRefs[i],{
       id:x.id,tenantId,orderCode:x.orderCode,customerId:x.customerId,
       customerName:String(x.customer.name||x.customer.tradeName||x.customerId),
       itemId:Number(x.product.id??x.product.docId),originalProductCode:x.originalProductCode,
       color:x.color,size:"-",variation:"-",totalQuantity:x.qty,invoicedQuantity:0,quantityScaled:scaled(x.qty),
       unitPrice:x.unitPrice,unitPriceScaled:scaled(x.unitPrice),grossTotalScaled:scaled(gross),netTotalScaled:scaled(net),
       discountPercent:x.discountPercent,discountPercentScaled:scaled(x.discountPercent),
       discountAmount:x.discountAmount,discountAmountScaled:scaled(x.discountAmount),
       producedQuantity:0,paintedQuantity:0,packedQuantity:0,cutQuantity:0,status:"PENDENTE",isActive:true,isUrgent:false,
       paymentCondition:x.paymentCondition,paymentTerms:x.paymentTerms,paymentTermsDays:x.paymentTermsDays,
       fiscalType:x.fiscalType,hasRET:false,representativeId:"",representativeName:x.representativeName,
       deliveryDate:"2026-09-30",notes:"Criado a partir do arquivo Faturados 30-set 18h.",itemNotes:"",
       billingRule:"cadastro",importOrigin:"CHATGPT_GOOGLE_DRIVE_PDF",importedBy:"raul",
       statusOriginalPdf:"CHATGPT_GOOGLE_DRIVE_PDF",
       importPayloadHash:crypto.createHash("sha256").update(documentKey+":"+x.orderCode+":"+x.code+":"+x.qty).digest("hex"),
       createdAt:now+i,importedAt:now+i
     });
   });
   tx.set(markerRef,{tenantId,documentKey,createdAt:now,orders:missingOrderCodes,rows:createDefs.length});
   return {ordersCreated:missingOrderCodes,rowsCreated:createDefs.length};
 });
 console.log("CREATE_RESULT="+JSON.stringify(createResult));
} else {
 const grouped={};
 for(const code of missingOrderCodes) grouped[code]=preExistingMissing.filter(r=>String(r.orderCode||"")===code);
 const expectedCounts={67808:1,68076:1,68077:2,68083:1};
 for(const code of missingOrderCodes){
   if((grouped[code]||[]).length!==expectedCounts[code]) throw new Error("UNEXPECTED_EXISTING_ORDER_STATE_"+code);
 }
 console.log("CREATE_RESULT="+JSON.stringify({alreadyExisted:true,orders:missingOrderCodes}));
}

const ordersAfterSnap=await getDocs(collection(db,"orders"));
const orders=ordersAfterSnap.docs.map(d=>({docId:d.id,...d.data()})).filter(r=>String(r.tenantId||"imperio")==tenantId);

function findOrderRow(s){
 let cands=orders.filter(r=>String(r.orderCode||"")===s.orderCode);
 cands=cands.filter(r=>{
   const item=itemById.get(String(r.itemId))||productByCode(s.code);
   const pcode=String(item.code||item.id||item.docId||"");
   return baseCode(pcode)===baseCode(s.code) || baseCode(r.originalProductCode)===baseCode(s.code);
 });
 if(s.color){
   const byColor=cands.filter(r=>String(r.color||"").toUpperCase()===String(s.color).toUpperCase());
   if(byColor.length) cands=byColor;
 }
 if(cands.length!==1) throw new Error("ORDER_ITEM_RESOLUTION_FAILED_"+s.orderCode+"_"+s.code+":"+JSON.stringify(cands.map(r=>({id:r.id,itemId:r.itemId,color:r.color,total:r.totalQuantity,inv:r.invoicedQuantity}))));
 return cands[0];
}

const faturamentos=specs.map(s=>{
 const r=findOrderRow(s);
 return {
   lineId:"p"+s.p+"-e"+s.e+"-"+s.orderCode+"-"+baseCode(s.code)+"-"+String(s.qty).replace(".","_"),
   codigoPedido:s.orderCode,itemId:Number(r.itemId),cor:s.color,quantidade:s.qty,numeroNota:s.note||""
 };
});

const payload:any={origem:"CHATGPT_GOOGLE_DRIVE_PDF",tenantId,solicitadoPor:"raul",documentKey,allowBreakReservations:false,faturamentos};
const repository=new FirestoreBillingRepository();
const snapshot=await repository.loadSnapshot(tenantId);
const keys=collectSourceKeys(payload,snapshot);
const processed=await repository.findProcessedSourceKeys(tenantId,documentKey,keys);
const plan=buildBillingPlan(snapshot,payload,{tenantId,origem:"CHATGPT_GOOGLE_DRIVE_PDF",solicitadoPor:"raul",processedSourceKeys:processed});

console.log("BILLING_PREVIEW="+JSON.stringify({
 previewHash:plan.previewHash,canConfirm:plan.canConfirm,resumo:plan.resumo,
 linhas:plan.linhas.map((l:any)=>({status:l.status,message:l.message,sourceKey:l.sourceKey,
  operation:l.operation&&{orderCode:l.operation.orderCode,itemId:l.operation.itemId,itemCode:l.operation.itemCode,
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
const wanted=new Set(specs.map(s=>s.orderCode));
const verification=after.orders.filter((x:any)=>wanted.has(String(x.orderCode||""))).map((x:any)=>({
 id:x.id,orderCode:x.orderCode,itemId:x.itemId,totalQuantity:x.totalQuantity,invoicedQuantity:x.invoicedQuantity,status:x.status,isActive:x.isActive
}));
console.log("BILLING_RESULT="+JSON.stringify({result,verification}));
process.exit(0);
