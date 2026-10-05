import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const tenantId="imperio";
const wanted=new Set(["67812","68248"]);

const require=createRequire(import.meta.url);
const cfg=require("../firebase-applet-config.json") as any;
const APP_NAME="ops-inspect-billing-2026-10-05-18h";
const app=getApps().find(a=>a.name===APP_NAME)||initializeApp({
  apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
  storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId,
},APP_NAME);
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({sucesso:false,erro:"METHOD_NOT_ALLOWED"});
  const [ordersSnap,itemsSnap,logsSnap,keysSnap]=await Promise.all([
    getDocs(collection(db,"orders")),
    getDocs(collection(db,"items")),
    getDocs(collection(db,"logs")),
    getDocs(collection(db,"billingImportKeys")),
  ]);
  const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()} as any));
  const itemMap=new Map(items.map((i:any)=>[String(i.id??i.docId),i]));
  const rows=ordersSnap.docs.map(d=>({docId:d.id,...d.data()} as any))
    .filter((o:any)=>String(o.tenantId||"imperio")===tenantId&&wanted.has(String(o.orderCode||"")))
    .map((o:any)=>{
      const item:any=itemMap.get(String(o.itemId))||{};
      return {
        docId:o.docId,id:o.id??Number(o.docId),orderCode:String(o.orderCode||""),
        customerId:o.customerId??null,customerName:o.customerName||"",
        representativeName:o.representativeName||"",itemId:o.itemId,itemCode:item.code||"",
        itemName:item.name||o.customProductName||"",color:o.color||"",size:o.size||"",
        variation:o.variation||"",totalQuantity:Number(o.totalQuantity||0),
        invoicedQuantity:Number(o.invoicedQuantity||0),packedQuantity:Number(o.packedQuantity||0),
        status:o.status||"",isActive:o.isActive!==false,unitPrice:Number(o.unitPrice||0),
        deliveryDate:o.deliveryDate||"",paymentCondition:o.paymentCondition||"",
        paymentTerms:o.paymentTerms||"",paymentTermsDays:o.paymentTermsDays||[],
        fiscalType:o.fiscalType||""
      };
    });
  const orderIds=new Set(rows.map((r:any)=>Number(r.id)));
  const logs=logsSnap.docs.map(d=>({docId:d.id,...d.data()} as any))
    .filter((l:any)=>orderIds.has(Number(l.orderId))&&String(l.type||"")==="FATURAMENTO")
    .map((l:any)=>({docId:l.docId,orderId:l.orderId,quantityInvoiced:Number(l.quantityInvoiced||0),
      timestamp:l.timestamp,billingDocumentKey:l.billingDocumentKey||"",invoiceNumber:l.invoiceNumber||""}));
  const keys=keysSnap.docs.map(d=>({docId:d.id,...d.data()} as any))
    .filter((k:any)=>wanted.has(String(k.orderCode||"")))
    .map((k:any)=>({docId:k.docId,orderCode:k.orderCode,itemId:k.itemId,
      quantityInvoiced:Number(k.quantityInvoiced||0),documentKey:k.documentKey||"",
      sourceKey:k.sourceKey||"",processedAt:k.processedAt,auditId:k.auditId||""}));
  return res.status(200).json({sucesso:true,tenantId,rows,logs,keys});
}
