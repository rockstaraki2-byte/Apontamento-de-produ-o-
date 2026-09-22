import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep22-romaneio-check");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);
const wanted=new Set(["67595","66718","67333","67717","67597","67752","67751","67219","66728","65965","66350","67082","67235","67713","65025","67756","67776"]);
const codes=new Set(["507","3730","3735","2787","797","9","602","3154","3644","4809","4253","304","41","1","5181","5547","166"]);

const [ordersSnap,itemsSnap,customersSnap]=await Promise.all([
 getDocs(collection(db,"orders")),
 getDocs(collection(db,"items")),
 getDocs(collection(db,"customers"))
]);
const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()}));
const itemMap=new Map(items.map(x=>[String(x.id??x.docId),x]));
const rows=ordersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&wanted.has(String(r.orderCode||"")))
 .map(r=>{const item=itemMap.get(String(r.itemId))||{};return {
  docId:r.docId,id:r.id,orderCode:String(r.orderCode||""),customerId:r.customerId,customerName:r.customerName||"",
  itemId:r.itemId,itemCode:String(item.code||r.itemId||""),itemName:item.name||r.customProductName||"",
  originalProductCode:r.originalProductCode||"",color:r.color||"",variation:r.variation||"",size:r.size||"",
  totalQuantity:Number(r.totalQuantity||0),invoicedQuantity:Number(r.invoicedQuantity||0),
  status:r.status||"",isActive:r.isActive!==false,unitPrice:Number(r.unitPrice||0),
  paymentCondition:r.paymentCondition||"",paymentTerms:r.paymentTerms||"",fiscalType:r.fiscalType||"",
  representativeName:r.representativeName||"",itemNotes:r.itemNotes||"",notes:r.notes||""
 }});
const grouped={}; for(const code of wanted) grouped[code]=rows.filter(r=>r.orderCode===code);
const products=items.filter(x=>codes.has(String(x.code||x.id||x.docId))).map(x=>({docId:x.docId,id:x.id,code:x.code,name:x.name,components:x.components||[]}));
const customers=customersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(c=>["94","25","1290","276","13","714","920","1094","914","904","1866","89"].includes(String(c.id??c.docId)))
 .map(c=>({docId:c.docId,id:c.id,name:c.name,address:c.address||""}));
const similarDecimal=ordersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&Number(r.itemId)===166)
 .slice(-20);
const targetOrderIds=new Set(rows.filter(r=>["67219","65025","67597","67752","66728","67713","67751"].includes(r.orderCode)).map(r=>Number(r.id)));
const billingLogs=logsSnap.docs.map(d=>({docId:d.id,...d.data()})).filter(l=>targetOrderIds.has(Number(l.orderId))&&String(l.type||"")==="FATURAMENTO").map(l=>({docId:l.docId,orderId:l.orderId,quantityInvoiced:l.quantityInvoiced,timestamp:l.timestamp,importOrigin:l.importOrigin||"",billingDocumentKey:l.billingDocumentKey||"",invoiceNumber:l.invoiceNumber||""}));
const billingKeys=keysSnap.docs.map(d=>({docId:d.id,...d.data()})).filter(k=>["67219","65025","67597","67752","66728","67713","67751"].includes(String(k.orderCode||""))).map(k=>({docId:k.docId,orderCode:k.orderCode,itemId:k.itemId,quantityInvoiced:k.quantityInvoiced,documentKey:k.documentKey,sourceKey:k.sourceKey,processedAt:k.processedAt,auditId:k.auditId}));
const audits=auditsSnap.docs.map(d=>({docId:d.id,...d.data()})).filter(a=>Array.isArray(a.applied)&&a.applied.some(x=>["67219","65025","67597","67752","66728","67713","67751"].includes(String(x.orderCode||"")))).map(a=>({docId:a.docId,documentKey:a.documentKey,origem:a.origem,timestamp:a.timestamp,applied:a.applied}));
console.log("OPS_RESULT="+JSON.stringify({orders:grouped,products,customers,similarDecimal,billingLogs,billingKeys,audits}));
process.exit(0);
