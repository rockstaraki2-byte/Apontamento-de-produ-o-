import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep23-16h-check");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const wantedOrders=new Set(["67715","66959","67193","66736","67713","67281","67751","67666","67078"]);
const wantedCodes=new Set(["507","5358","3155","304","2595","3146","9","3193","3118","4809"]);

const [ordersSnap,itemsSnap,logsSnap,keysSnap]=await Promise.all([
 getDocs(collection(db,"orders")),
 getDocs(collection(db,"items")),
 getDocs(collection(db,"logs")),
 getDocs(collection(db,"billingImportKeys"))
]);

const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()}));
const itemMap=new Map(items.map(x=>[String(x.id??x.docId),x]));

const rows=ordersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio" && wantedOrders.has(String(r.orderCode||"")))
 .map(r=>{const item=itemMap.get(String(r.itemId))||{}; return {
  docId:r.docId,id:r.id,orderCode:String(r.orderCode||""),customerId:r.customerId,customerName:r.customerName||"",
  itemId:r.itemId,itemCode:String(item.code||r.itemId||""),itemName:item.name||r.customProductName||"",
  originalProductCode:r.originalProductCode||"",color:r.color||"",variation:r.variation||"",size:r.size||"",
  totalQuantity:Number(r.totalQuantity||0),invoicedQuantity:Number(r.invoicedQuantity||0),
  status:r.status||"",isActive:r.isActive!==false,unitPrice:Number(r.unitPrice||0),
  paymentCondition:r.paymentCondition||"",paymentTerms:r.paymentTerms||"",fiscalType:r.fiscalType||"",
  representativeName:r.representativeName||"",itemNotes:r.itemNotes||"",notes:r.notes||""
 }});

const grouped={}; for(const code of wantedOrders) grouped[code]=rows.filter(r=>r.orderCode===code);
const products=items.filter(x=>wantedCodes.has(String(x.code||x.id||x.docId)))
 .map(x=>({docId:x.docId,id:x.id,code:x.code,name:x.name,components:x.components||[]}));

const targetIds=new Set(rows.map(r=>Number(r.id)));
const billingLogs=logsSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(l=>targetIds.has(Number(l.orderId)) && String(l.type||"")==="FATURAMENTO")
 .map(l=>({docId:l.docId,orderId:l.orderId,quantityInvoiced:l.quantityInvoiced,timestamp:l.timestamp,importOrigin:l.importOrigin||"",billingDocumentKey:l.billingDocumentKey||"",invoiceNumber:l.invoiceNumber||""}));

const billingKeys=keysSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(k=>wantedOrders.has(String(k.orderCode||"")))
 .map(k=>({docId:k.docId,orderCode:k.orderCode,itemId:k.itemId,quantityInvoiced:k.quantityInvoiced,documentKey:k.documentKey,sourceKey:k.sourceKey,processedAt:k.processedAt,auditId:k.auditId}));

console.log("OPS_CHECK="+JSON.stringify({orders:grouped,products,billingLogs,billingKeys}));
process.exit(0);
