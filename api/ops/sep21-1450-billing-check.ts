import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const require=createRequire(import.meta.url);
const cfg=require("../../firebase-applet-config.json");
const appName="ops-sep21-1450-billing-check";
const app=getApps().find((a:any)=>a.name===appName)||initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},appName);
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);
const wanted=new Set(["67116","67486","67452","67216","67684","67373","67689","67695","67694","64753","67003","67281","67193","67700"]);

export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({ok:false});
 const [ordersSnap,itemsSnap]=await Promise.all([getDocs(collection(db,"orders")),getDocs(collection(db,"items"))]);
 const itemMap=new Map(itemsSnap.docs.map((d:any)=>[String(d.id),{docId:d.id,...d.data()}]));
 const rows=ordersSnap.docs.map((d:any)=>({docId:d.id,...d.data()}))
   .filter((r:any)=>String(r.tenantId||"imperio")==="imperio"&&wanted.has(String(r.orderCode||"")))
   .map((r:any)=>{const item:any=itemMap.get(String(r.itemId))||{};return {
     docId:r.docId,id:r.id,orderCode:String(r.orderCode||""),customerId:r.customerId,customerName:r.customerName||"",
     itemId:r.itemId,itemCode:String(item.code||r.itemId||""),itemName:item.name||r.customProductName||"",
     customProductName:r.customProductName||"",originalProductCode:r.originalProductCode||"",
     color:r.color||"",variation:r.variation||"",size:r.size||"",itemNotes:r.itemNotes||"",notes:r.notes||"",
     totalQuantity:Number(r.totalQuantity||0),invoicedQuantity:Number(r.invoicedQuantity||0),
     status:r.status||"",isActive:r.isActive!==false,unitPrice:Number(r.unitPrice||0),
     paymentCondition:r.paymentCondition||"",fiscalType:r.fiscalType||"",paymentTerms:r.paymentTerms||"",
     representativeName:r.representativeName||""
   }});
 const grouped:any={}; for(const code of wanted) grouped[code]=rows.filter((r:any)=>r.orderCode===code);
 const products=itemsSnap.docs.map((d:any)=>({docId:d.id,...d.data()})).filter((r:any)=>
   ["3807","507","2459","1880","2739","1088","5511","937","3794","2517","3145","3151","3560","3571","3027","4519","4811","3932","3154"].includes(String(r.code||r.id||r.docId))
 );
 return res.status(200).json({ok:true,orders:grouped,products:products.map((p:any)=>({docId:p.docId,id:p.id,code:p.code,name:p.name}))});
}