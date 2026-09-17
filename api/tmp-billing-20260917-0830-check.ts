import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const TOKEN = "sep17-0830-check-5a9d3e21";
const require = createRequire(import.meta.url);
const cfg = require("../firebase-applet-config.json") as any;
const APP = "tmp-billing-20260917-0830-check";
const app = getApps().find(a => a.name === APP) || initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId}, APP);
const db = initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);
const tenant = (v:any)=>String(v?.tenantId||"imperio")==="imperio";

export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({error:"method"});
 if(String(req.query?.token||"")!==TOKEN) return res.status(404).json({error:"not_found"});
 const [os,is]=await Promise.all([getDocs(collection(db,"orders")),getDocs(collection(db,"items"))]);
 const items=is.docs.map(d=>({id:d.id,...d.data() as any})).filter(tenant);
 const im=new Map(items.map((i:any)=>[String(i.id),i]));
 const codes=["67105","67280","67030","64753","67551","67543","67546","66174","66684","67524","67215","67115","67542","67525"];
 const orders:any={};
 const all=os.docs.map(d=>({id:d.id,...d.data() as any})).filter(tenant);
 for(const code of codes){orders[code]=all.filter((o:any)=>String(o.orderCode).trim()===code).map((o:any)=>{const i:any=im.get(String(o.itemId));return {id:o.id,orderCode:o.orderCode,customerName:o.customerName,itemId:o.itemId,itemCode:i?.code??null,itemName:i?.name??o.customProductName??null,color:o.color??"-",totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity??0,status:o.status,isActive:o.isActive};});}
 const catCodes=["5127","4811","2739","4912","3145","5486","5487","2551","5536","3193","3175","2459","1088","1137","2","507","1880"];
 const catalog:any={}; for(const c of catCodes){catalog[c]=items.filter((i:any)=>String(i.code??i.id).trim()===c||String(i.code??"").startsWith(c+".")).map((i:any)=>({id:i.id,code:i.code,name:i.name}));}
 return res.status(200).json({ok:true,orders,catalog});
}
