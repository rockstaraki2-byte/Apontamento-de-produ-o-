import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { doc, initializeFirestore, runTransaction } from "firebase/firestore";

const require = createRequire(import.meta.url);
const cfg = require("../firebase-applet-config.json");
const APP = "sep15-1520-prep";
const app = getApps().find((a) => a.name === APP) || initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId}, APP);
const db = initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);
const ID937=7330001520000937;
const ID4233=7330001520004233;

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"});
  try{
    const result=await runTransaction(db,async(tx)=>{
      const r66458=doc(db,"orders","1787174178721");
      const rTemplate=doc(db,"orders","1788367610387");
      const r937=doc(db,"orders",String(ID937));
      const r4233=doc(db,"orders",String(ID4233));
      const [s66458,sTemplate,s937,s4233]=await Promise.all([tx.get(r66458),tx.get(rTemplate),tx.get(r937),tx.get(r4233)]);
      if(!s66458.exists()) throw new Error("66458 não encontrado");
      const o66458:any=s66458.data();
      if(String(o66458.orderCode)!=="66458" || Number(o66458.totalQuantity)!==1000 || Number(o66458.invoicedQuantity||0)!==0) throw new Error("66458 mudou desde a conferência");
      if(Number(o66458.itemId)===2) tx.set(r66458,{itemId:1848,tenantId:"imperio"},{merge:true});
      else if(Number(o66458.itemId)!==1848) throw new Error(`66458 com item inesperado ${o66458.itemId}`);

      if(!sTemplate.exists()) throw new Error("67042 não encontrado");
      const t:any=sTemplate.data();
      if(String(t.orderCode)!=="67042" || Number(t.invoicedQuantity||0)!==0) throw new Error("67042 mudou desde a conferência");
      const make=(id:number,itemId:number,qty:number,unitPrice:number)=>{
        const row:any={...t,id,itemId,totalQuantity:qty,invoicedQuantity:0,producedQuantity:0,paintedQuantity:0,packedQuantity:0,cutQuantity:0,status:"PENDENTE",isActive:true,isUrgent:false,unitPrice,discountPercent:0,tenantId:"imperio",customProductName:null};
        return row;
      };
      if(!s937.exists()) tx.set(r937,make(ID937,937,2,18.09));
      else {const x:any=s937.data();if(String(x.orderCode)!=="67042"||Number(x.itemId)!==937||Number(x.totalQuantity)!==2) throw new Error("Linha 937 do 67042 já existe diferente");}
      if(!s4233.exists()) tx.set(r4233,make(ID4233,4233,1000,0.20));
      else {const x:any=s4233.data();if(String(x.orderCode)!=="67042"||Number(x.itemId)!==4233||Number(x.totalQuantity)!==1000) throw new Error("Linha 4233 do 67042 já existe diferente");}
      return {corrected66458:Number(o66458.itemId)===2,added937:!s937.exists(),added4233:!s4233.exists()};
    });
    return res.status(200).json({ok:true,result});
  }catch(error:any){return res.status(409).json({ok:false,error:error?.message||String(error)});}
}
