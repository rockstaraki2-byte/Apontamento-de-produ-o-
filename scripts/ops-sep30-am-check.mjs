import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep30-am-check");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const wantedOrders=new Set(["67178","68025","67906","68016","67907","68027","66974","67667","64753","68026","67298"]);
const wantedCodes=new Set(["4598","4598.3","392","797","3585","3585.11","41","3192","9","4071","4072","3193","3145","3151","3932"]);
const [ordersSnap,itemsSnap,logsSnap,keysSnap]=await Promise.all([
 getDocs(collection(db,"orders")),
 getDocs(collection(db,"items")),
 getDocs(collection(db,"logs")),
 getDocs(collection(db,"billingImportKeys"))
]);

const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()}));
const itemMap=new Map(items.map(x=>[String(x.id??x.docId),x]));
const rows=ordersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&wantedOrders.has(String(r.orderCode||"")))
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
 .map(x=>({docId:x.docId,id:x.id,code:x.code,name:x.name,tenantId:x.tenantId,components:x.components||[]}));

const ids=new Set(rows.map(r=>Number(r.id)));
const logs=logsSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(l=>ids.has(Number(l.orderId))&&String(l.type||"")==="FATURAMENTO")
 .map(l=>({docId:l.docId,orderId:l.orderId,quantityInvoiced:l.quantityInvoiced,timestamp:l.timestamp,importOrigin:l.importOrigin||"",billingDocumentKey:l.billingDocumentKey||"",invoiceNumber:l.invoiceNumber||""}));

const keys=keysSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(k=>wantedOrders.has(String(k.orderCode||"")))
 .map(k=>({docId:k.docId,orderCode:k.orderCode,itemId:k.itemId,quantityInvoiced:k.quantityInvoiced,documentKey:k.documentKey,sourceKey:k.sourceKey,processedAt:k.processedAt,auditId:k.auditId}));

console.log("OPS_CHECK="+JSON.stringify({orders:grouped,products,logs,keys}));
process.exit(0);
