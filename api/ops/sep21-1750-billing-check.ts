import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const require=createRequire(import.meta.url);
const cfg=require("../../firebase-applet-config.json");
const appName="ops-sep21-1750-billing-check";
const app=getApps().find((a:any)=>a.name===appName)||initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},appName);
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);
const wanted=new Set(["67341","67440","67722","67723","67724","67725","67304","67305","67306","67307","67311"]);

export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({ok:false});
 const [ordersSnap,itemsSnap,customersSnap]=await Promise.all([
   getDocs(collection(db,"orders")),
   getDocs(collection(db,"items")),
   getDocs(collection(db,"customers"))
 ]);
 const items=itemsSnap.docs.map((d:any)=>({docId:d.id,...d.data()}));
 const itemMap=new Map(items.map((x:any)=>[String(x.id??x.docId),x]));
 const rows=ordersSnap.docs.map((d:any)=>({docId:d.id,...d.data()}))
   .filter((r:any)=>String(r.tenantId||"imperio")==="imperio"&&wanted.has(String(r.orderCode||"")))
   .map((r:any)=>{const item:any=itemMap.get(String(r.itemId))||{};return {
     docId:r.docId,...r,
     itemCode:String(item.code||r.itemId||""),itemName:item.name||r.customProductName||""
   }});
 const products=items.filter((x:any)=>["70","68","5510"].includes(String(x.code||x.id||x.docId)))
   .map((x:any)=>({docId:x.docId,id:x.id,code:x.code,name:x.name,tenantId:x.tenantId,components:x.components||[]}));
 const customers=customersSnap.docs.map((d:any)=>({docId:d.id,...d.data()}))
   .filter((c:any)=>String(c.id??c.docId)==="858"||String(c.id??c.docId)==="280"||String(c.id??c.docId)==="1858");
 return res.status(200).json({ok:true,rows,products,customers});
}