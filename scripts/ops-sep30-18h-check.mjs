import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep30-18h-check");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const wantedOrders=new Set([
 "67933","67773","67536","65025","66687","67281","67808","67523",
 "67748","67810","67719","67624","67813","68076","67714","68077","68083"
]);
const wantedCodes=new Set([
 "961","392","4810","3908","4015","4454","4455","4517","5138","5139","5165","5166","5167","5168","5202","5392","5393","5535",
 "5181","3585","2594","3658","4132","2827","5532","3187","4222","4809","5545","5546","2846","4025","1","2517","2459","937"
]);

const [ordersSnap,itemsSnap,customersSnap,logsSnap,keysSnap]=await Promise.all([
 getDocs(collection(db,"orders")),
 getDocs(collection(db,"items")),
 getDocs(collection(db,"customers")),
 getDocs(collection(db,"logs")),
 getDocs(collection(db,"billingImportKeys"))
]);

const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()}));
const itemMap=new Map(items.map(x=>[String(x.id??x.docId),x]));
const rows=ordersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio"&&wantedOrders.has(String(r.orderCode||"")))
 .map(r=>{const item=itemMap.get(String(r.itemId))||{};return {
   docId:r.docId,id:r.id,orderCode:String(r.orderCode||""),customerId:r.customerId,customerName:r.customerName||"",
   itemId:r.itemId,itemCode:String(item.code||r.itemId||""),itemName:item.name||r.customProductName||"",
   originalProductCode:r.originalProductCode||"",color:r.color||"",variation:r.variation||"",size:r.size||"",
   totalQuantity:Number(r.totalQuantity||0),invoicedQuantity:Number(r.invoicedQuantity||0),
   status:r.status||"",isActive:r.isActive!==false,unitPrice:Number(r.unitPrice||0),
   paymentCondition:r.paymentCondition||"",paymentTerms:r.paymentTerms||"",fiscalType:r.fiscalType||"",
   representativeName:r.representativeName||"",itemNotes:r.itemNotes||"",notes:r.notes||""
 }});
const grouped={}; for(const code of wantedOrders) grouped[code]=rows.filter(r=>r.orderCode===code);

const products=items.filter(x=>{
 const code=String(x.code||x.id||x.docId);
 const name=String(x.name||"").toUpperCase();
 return wantedCodes.has(code) ||
  ["CHAPA 3/16","CHAPA 1/4","PORTA IMA","PÉ LATERAL BYIE","PÉ TUBO AURORA","RODA GLIDER 45","PUXADOR","SUPORTE LATERAL 03 DOB","CORTE A LASER"].some(k=>name.includes(k));
}).map(x=>({docId:x.docId,id:x.id,code:x.code,name:x.name,tenantId:x.tenantId,components:x.components||[],unitPrice:x.unitPrice,basePrice:x.basePrice}));

const customerIds=new Set(["889","1582","1478","904","1267","943","856","1045","1115","1558","1753","1209","8","1007","86"]);
const customers=customersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(c=>customerIds.has(String(c.id??c.docId)))
 .map(c=>({docId:c.docId,id:c.id,name:c.name,tradeName:c.tradeName,address:c.address,city:c.city,state:c.state,defaultPaymentTerms:c.defaultPaymentTerms,fiscalType:c.fiscalType}));

const targetIds=new Set(rows.map(r=>Number(r.id)));
const logs=logsSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(l=>targetIds.has(Number(l.orderId))&&String(l.type||"")==="FATURAMENTO")
 .map(l=>({docId:l.docId,orderId:l.orderId,quantityInvoiced:l.quantityInvoiced,timestamp:l.timestamp,importOrigin:l.importOrigin||"",billingDocumentKey:l.billingDocumentKey||"",invoiceNumber:l.invoiceNumber||""}));
const keys=keysSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(k=>wantedOrders.has(String(k.orderCode||"")))
 .map(k=>({docId:k.docId,orderCode:k.orderCode,itemId:k.itemId,quantityInvoiced:k.quantityInvoiced,documentKey:k.documentKey,sourceKey:k.sourceKey,processedAt:k.processedAt,auditId:k.auditId}));

console.log("OPS_CHECK="+JSON.stringify({orders:grouped,products,customers,logs,keys}));
process.exit(0);
