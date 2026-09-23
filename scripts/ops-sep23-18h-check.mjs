import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, getDocs, initializeFirestore } from "firebase/firestore";

const cfg=JSON.parse(fs.readFileSync("firebase-applet-config.json","utf8"));
const app=initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},"ops-sep23-18h-schema");
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const [itemsSnap,customersSnap,ordersSnap]=await Promise.all([
 getDocs(collection(db,"items")),
 getDocs(collection(db,"customers")),
 getDocs(collection(db,"orders"))
]);

const items=itemsSnap.docs.map(d=>({docId:d.id,...d.data()}));
const products=items.filter(x=>{
 const code=String(x.code||x.id||x.docId);
 const name=String(x.name||"").toUpperCase();
 return ["5546","5547","5548","5549","5550","5537"].includes(code) ||
        name.includes("CHURRASQUEIRA") || name.includes("TORNODELTA") || name.includes("TORNO DELTA");
}).map(x=>({docId:x.docId,...x}));

const customers=customersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(c=>["173","1866","1867","1868"].includes(String(c.id??c.docId)) || String(c.name||"").toUpperCase().includes("ROSEMARY"))
 .map(c=>({docId:c.docId,...c}));

const recentOrders=ordersSnap.docs.map(d=>({docId:d.id,...d.data()}))
 .filter(r=>String(r.tenantId||"imperio")==="imperio" && [173,1866,1867,1868].includes(Number(r.customerId)))
 .slice(-30);

console.log("OPS_SCHEMA="+JSON.stringify({products,customers,recentOrders}));
process.exit(0);
