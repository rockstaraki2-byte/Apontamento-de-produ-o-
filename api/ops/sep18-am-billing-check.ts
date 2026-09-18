import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const require = createRequire(import.meta.url);
const cfg = require("../../firebase-applet-config.json");
const appName = "ops-sep18-am-billing-check";
const app = getApps().find((a:any)=>a.name===appName) || initializeApp({
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
  messagingSenderId: cfg.messagingSenderId,
  appId: cfg.appId,
}, appName);
const db = initializeFirestore(app,{ experimentalForceLongPolling:true },cfg.firestoreDatabaseId);
const wanted = new Set(["67332","67587","67401"]);
export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({ok:false});
  const [ordersSnap, itemsSnap] = await Promise.all([
    getDocs(collection(db,"orders")),
    getDocs(collection(db,"items")),
  ]);
  const itemMap = new Map(itemsSnap.docs.map((d:any)=>[String(d.id),{id:d.id,...d.data()}]));
  const rows = ordersSnap.docs
    .map((d:any)=>({id:Number(d.id),...d.data()}))
    .filter((r:any)=>String(r.tenantId||"imperio")==="imperio" && wanted.has(String(r.orderCode||"")))
    .map((r:any)=>{
      const item:any=itemMap.get(String(r.itemId))||{};
      return {
        id:r.id, orderCode:String(r.orderCode||""), customerName:r.customerName||"",
        itemId:r.itemId, itemCode:String(item.code||r.itemId||""), itemName:item.name||r.customProductName||"",
        color:r.color||"", totalQuantity:Number(r.totalQuantity||0),
        invoicedQuantity:Number(r.invoicedQuantity||0), status:r.status||"", isActive:r.isActive!==false
      };
    });
  const grouped:any={};
  for(const code of wanted) grouped[code]=rows.filter((r:any)=>r.orderCode===code);
  return res.status(200).json({ok:true,orders:grouped});
}