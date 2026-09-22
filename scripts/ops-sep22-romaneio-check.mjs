import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep22-romaneio-history");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const orderIds=new Set([
 1788898829233,1788898961910,1784235510239,7330504660960670,1790087207581,1787767483210,
 7331893942198669,7331893942198670,1790087201331,1790087203239,1790087204788
]);
const orderCodes=new Set(["67219","65025","67597","67752","66728","67713","67751"]);

const [logsSnap,keysSnap,auditsSnap]=await Promise.all([
 getDocs(collection(db,"logs")),
 getDocs(collection(db,"billingImportKeys")),
 getDocs(collection(db,"billingImportAudits"))
]);

const billingLogs=logsSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(l=>orderIds.has(Number(l.orderId))&&String(l.type||"")==="FATURAMENTO")
 .map(l=>({docId:l.docId,orderId:l.orderId,quantityInvoiced:l.quantityInvoiced,timestamp:l.timestamp,importOrigin:l.importOrigin||"",billingDocumentKey:l.billingDocumentKey||"",invoiceNumber:l.invoiceNumber||""}));

const billingKeys=keysSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(k=>orderCodes.has(String(k.orderCode||"")))
 .map(k=>({docId:k.docId,orderCode:k.orderCode,itemId:k.itemId,quantityInvoiced:k.quantityInvoiced,documentKey:k.documentKey,sourceKey:k.sourceKey,processedAt:k.processedAt,auditId:k.auditId}));

const audits=auditsSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(a=>Array.isArray(a.applied)&&a.applied.some(x=>orderCodes.has(String(x.orderCode||""))))
 .map(a=>({docId:a.docId,documentKey:a.documentKey,origem:a.origem,timestamp:a.timestamp,applied:a.applied}));

console.log("OPS_HISTORY="+JSON.stringify({billingLogs,billingKeys,audits}));
process.exit(0);
