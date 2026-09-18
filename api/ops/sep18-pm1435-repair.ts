import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { doc, getDoc, initializeFirestore, runTransaction } from "firebase/firestore";
const require=createRequire(import.meta.url); const cfg=require("../../firebase-applet-config.json");
const name="ops-sep18-pm1435-repair";
const app=getApps().find((a:any)=>a.name===name)||initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId},name);
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);
const documentKey="FATURADOS-18-SET-TARDE-14H35-2026-09-18";
const markerId=createHash("sha256").update("imperio:67600:"+documentKey+":add-4809-50").digest("hex");
const baseId="7330504678544954";
const newId="7330504678544955";
export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({ok:false});
 const result=await runTransaction(db,async(tx)=>{
   const markerRef=doc(db,"orderRepairKeys",markerId);
   const baseRef=doc(db,"orders",baseId);
   const newRef=doc(db,"orders",newId);
   const [markerSnap,baseSnap,newSnap]=await Promise.all([tx.get(markerRef),tx.get(baseRef),tx.get(newRef)]);
   if(markerSnap.exists()) return {alreadyDone:true,newId,markerId};
   if(!baseSnap.exists()) throw new Error("BASE_ORDER_LINE_NOT_FOUND");
   if(newSnap.exists()) throw new Error("TARGET_ORDER_LINE_ID_ALREADY_EXISTS");
   const base:any=baseSnap.data();
   if(String(base.tenantId||"imperio")!=="imperio"||String(base.orderCode||"")!=="67600"||Number(base.itemId)!==1779765280085||Number(base.totalQuantity)!==100) throw new Error("BASE_ORDER_STATE_CHANGED");
   const now=Date.now();
   const row={...base,
     id:Number(newId),
     itemId:4809,
     originalProductCode:"4809.3",
     color:"PRETO FOSCO",
     totalQuantity:50,
     quantityScaled:500000,
     invoicedQuantity:0,
     producedQuantity:0,
     paintedQuantity:0,
     packedQuantity:0,
     cutQuantity:0,
     unitPrice:113.40,
     unitPriceScaled:1134000,
     grossTotalScaled:56700000,
     netTotalScaled:56700000,
     discountPercent:0,
     discountPercentScaled:0,
     discountAmount:0,
     discountAmountScaled:0,
     status:"PENDENTE",
     isActive:true,
     isUrgent:false,
     createdAt:now,
     importedAt:now,
     importOrigin:"CHATGPT_PDF",
     importedBy:"raul",
     importPayloadHash:createHash("sha256").update(documentKey+":67600:4809:50").digest("hex"),
     statusOriginalPdf:"CHATGPT_PDF",
     itemNotes:"",
     notes:""
   };
   tx.set(newRef,row);
   tx.set(markerRef,{tenantId:"imperio",orderCode:"67600",documentKey,itemId:4809,quantity:50,createdAt:now,result:"ITEM_ADICIONADO_PEDIDO_EXISTENTE",orderLineId:Number(newId)});
   return {alreadyDone:false,newId,markerId,row:{orderCode:row.orderCode,itemId:row.itemId,totalQuantity:row.totalQuantity,invoicedQuantity:row.invoicedQuantity,color:row.color,unitPrice:row.unitPrice}};
 });
 const check=await getDoc(doc(db,"orders",newId));
 return res.status(200).json({ok:true,result,verification:check.exists()?check.data():null});
}