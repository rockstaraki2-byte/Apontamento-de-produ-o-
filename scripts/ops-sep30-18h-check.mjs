import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep30-18h-focused");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const wantedOrders=["67933","67773","67536","65025","66687","67281","67808","67523","67748","67810","67719","67624","67813","68076","67714","68077","68083"];
const wanted=new Set(wantedOrders);
const [ordersSnap,itemsSnap,keysSnap,logsSnap]=await Promise.all([
 getDocs(collection(db,"orders")),
 getDocs(collection(db,"items")),
 getDocs(collection(db,"billingImportKeys")),
 getDocs(collection(db,"logs"))
]);
const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()}));
const itemMap=new Map(items.map(x=>[String(x.id??x.docId),x]));
const all=ordersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&wanted.has(String(r.orderCode||"")));
const summary={};
for(const code of wantedOrders){
 summary[code]=all.filter(r=>String(r.orderCode||"")===code).map(r=>{
   const it=itemMap.get(String(r.itemId))||{};
   return {id:r.id,itemId:r.itemId,code:String(it.code||r.itemId||""),name:it.name||r.customProductName||"",color:r.color||"",
     variation:r.variation||"",itemNotes:r.itemNotes||"",total:Number(r.totalQuantity||0),invoiced:Number(r.invoicedQuantity||0),
     status:r.status||"",unitPrice:Number(r.unitPrice||0),customerId:r.customerId,customerName:r.customerName||""};
 });
}
const keys=keysSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(k=>wanted.has(String(k.orderCode||"")))
 .map(k=>({orderCode:k.orderCode,itemId:k.itemId,qty:k.quantityInvoiced,documentKey:k.documentKey,sourceKey:k.sourceKey,processedAt:k.processedAt}));
const ids=new Set(all.map(r=>Number(r.id)));
const logs=logsSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(l=>ids.has(Number(l.orderId))&&String(l.type||"")==="FATURAMENTO")
 .map(l=>({orderId:l.orderId,qty:l.quantityInvoiced,timestamp:l.timestamp,documentKey:l.billingDocumentKey||""}));
console.log("OPS_FOCUSED="+JSON.stringify({summary,keys,logs}));
process.exit(0);
