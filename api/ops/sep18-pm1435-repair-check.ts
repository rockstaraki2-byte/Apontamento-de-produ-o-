import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";
const require=createRequire(import.meta.url); const cfg=require("../../firebase-applet-config.json");
const name="ops-sep18-pm1435-repair-check";
const app=getApps().find((a:any)=>a.name===name)||initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId},name);
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);
export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({ok:false});
 const [os,is]=await Promise.all([getDocs(collection(db,"orders")),getDocs(collection(db,"items"))]);
 const orders=os.docs.map((d:any)=>({docId:d.id,...d.data()})).filter((r:any)=>String(r.tenantId||"imperio")==="imperio"&&String(r.orderCode||"")==="67600");
 const items=is.docs.map((d:any)=>({docId:d.id,...d.data()})).filter((r:any)=>String(r.code||"")==="4809"||String(r.id||"")==="4809"||String(r.docId)==="4809");
 return res.status(200).json({ok:true,orders,items});
}