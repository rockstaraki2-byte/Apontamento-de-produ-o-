import crypto from "node:crypto";
import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, initializeFirestore, runTransaction } from "firebase/firestore";

const require=createRequire(import.meta.url);
const cfg=require("../../firebase-applet-config.json");
const appName="ops-sep21-1750-zinc-billing";
const app=getApps().find((a:any)=>a.name===appName)||initializeApp({
 apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,
 storageBucket:cfg.storageBucket,messagingSenderId:cfg.messagingSenderId,appId:cfg.appId
},appName);
const db=initializeFirestore(app,{experimentalForceLongPolling:true},cfg.firestoreDatabaseId);

const tenantId="imperio";
const documentKey="FATURADOS-21-SET-17H50-2026-09-21";
const origem="CHATGPT_PDF";
const solicitadoPor="raul";
const targets=[
 {orderCode:"67722",delivery:"67727",qty:0.574,unitPrice:13.94,totalShown:8.00,orderId:7332186772200001,lineId:"p16-e67727-67722-70-0.574"},
 {orderCode:"67723",delivery:"67729",qty:4.892,unitPrice:35.00,totalShown:171.22,orderId:7332186772200002,lineId:"p17-e67729-67723-70-4.892"},
 {orderCode:"67724",delivery:"67731",qty:0.324,unitPrice:33.95,totalShown:11.00,orderId:7332186772200003,lineId:"p18-e67731-67724-70-0.324"},
 {orderCode:"67725",delivery:"67733",qty:2.854,unitPrice:35.04,totalShown:100.00,orderId:7332186772200004,lineId:"p19-e67733-67725-70-2.854"}
];

function markerId(sourceKey:string){
 return crypto.createHash("sha256").update(tenantId+":"+documentKey+":"+sourceKey).digest("hex");
}
function qtyScaled(q:number){return Math.round(q*10000);}
function priceScaled(p:number){return Math.round(p*10000);}
function valueScaled(q:number,p:number){return Math.round(q*p*10000);}

async function snapshot(){
 const [ordersSnap,itemSnap,customerSnap]=await Promise.all([
   getDocs(collection(db,"orders")),
   getDoc(doc(db,"items","70")),
   getDoc(doc(db,"customers","858"))
 ]);
 const orders=ordersSnap.docs.map((d:any)=>({docId:d.id,...d.data()})).filter((r:any)=>String(r.tenantId||"imperio")==="imperio");
 const existingTargets=targets.map(t=>({orderCode:t.orderCode,rows:orders.filter((r:any)=>String(r.orderCode||"")===t.orderCode).map((r:any)=>({
   docId:r.docId,itemId:r.itemId,totalQuantity:r.totalQuantity,invoicedQuantity:r.invoicedQuantity,status:r.status,isActive:r.isActive
 }))}));
 const p67341=orders.filter((r:any)=>String(r.orderCode||"")==="67341").map((r:any)=>({itemId:r.itemId,totalQuantity:r.totalQuantity,invoicedQuantity:r.invoicedQuantity,status:r.status}));
 const p67440=orders.filter((r:any)=>String(r.orderCode||"")==="67440").map((r:any)=>({itemId:r.itemId,totalQuantity:r.totalQuantity,invoicedQuantity:r.invoicedQuantity,status:r.status}));
 const canCreate=itemSnap.exists()&&customerSnap.exists()&&existingTargets.every(x=>x.rows.length===0);
 const hash=crypto.createHash("sha256").update(JSON.stringify({documentKey,targets,existingTargets,item70:itemSnap.exists(),customer858:customerSnap.exists()})).digest("hex");
 return {orders,existingTargets,p67341,p67440,item70:itemSnap.exists()?itemSnap.data():null,customer858:customerSnap.exists()?customerSnap.data():null,canCreate,hash};
}

export default async function handler(req:any,res:any){
 if(req.method!=="GET") return res.status(405).json({ok:false,error:"METHOD"});
 const pre=await snapshot();
 if(req.query?.confirm===undefined){
   return res.status(200).json({
     ok:true,previewHash:pre.hash,canConfirm:pre.canCreate,
     alreadyBilled:{order67341:pre.p67341,order67440:pre.p67440},
     pendingTargets:pre.existingTargets,
     item70:pre.item70?{id:(pre.item70 as any).id,code:(pre.item70 as any).code,name:(pre.item70 as any).name}:null,
     customer858:pre.customer858?{id:(pre.customer858 as any).id,name:(pre.customer858 as any).name}:null,
     resumo:{pedidosNovos:pre.existingTargets.filter(x=>x.rows.length===0).length,linhas:4,quantidadeTotal:8.644,valorDocumento:290.22}
   });
 }
 if(!pre.canCreate) return res.status(409).json({ok:false,error:"STATE_NOT_READY",previewHash:pre.hash,existingTargets:pre.existingTargets});
 if(String(req.query.confirm)!==pre.hash) return res.status(409).json({ok:false,error:"HASH_MISMATCH",previewHash:pre.hash});

 // Segunda checagem imediatamente antes da transação para evitar duplicidade por orderCode.
 const ordersAgain=await getDocs(collection(db,"orders"));
 const concurrent=ordersAgain.docs.map((d:any)=>({docId:d.id,...d.data()})).filter((r:any)=>
   String(r.tenantId||"imperio")==="imperio" && targets.some(t=>t.orderCode===String(r.orderCode||""))
 );
 if(concurrent.length) return res.status(409).json({ok:false,error:"ORDER_CREATED_SINCE_PREVIEW",concurrent});

 const auditId=crypto.randomUUID();
 const now=Date.now();
 const result=await runTransaction(db,async(tx)=>{
   const orderRefs=targets.map(t=>doc(db,"orders",String(t.orderId)));
   const markerRefs=targets.map(t=>doc(db,"billingImportKeys",markerId("item:"+t.lineId)));
   const itemRef=doc(db,"items","70");
   const customerRef=doc(db,"customers","858");
   const [orderSnaps,markerSnaps,itemSnap,customerSnap]=await Promise.all([
     Promise.all(orderRefs.map(r=>tx.get(r))),
     Promise.all(markerRefs.map(r=>tx.get(r))),
     tx.get(itemRef),
     tx.get(customerRef)
   ]);
   if(!itemSnap.exists()) throw new Error("ITEM_70_NOT_FOUND");
   if(!customerSnap.exists()) throw new Error("CUSTOMER_858_NOT_FOUND");
   if(orderSnaps.some(s=>s.exists())) throw new Error("TARGET_ORDER_ID_ALREADY_EXISTS");
   if(markerSnaps.some(s=>s.exists())) throw new Error("SOURCE_ALREADY_PROCESSED");

   const applied:any[]=[];
   targets.forEach((t,i)=>{
     const quantityScaled=qtyScaled(t.qty);
     const unitPriceScaled=priceScaled(t.unitPrice);
     const grossTotalScaled=valueScaled(t.qty,t.unitPrice);
     const logId=now*1000+i;
     const payloadHash=crypto.createHash("sha256").update(documentKey+":"+t.orderCode+":"+t.qty+":"+t.unitPrice).digest("hex");
     const row:any={
       id:t.orderId,tenantId,orderCode:t.orderCode,customerId:858,customerName:"CONSUMIDOR FINAL",
       itemId:70,originalProductCode:"70",color:"-",size:"-",variation:"-",
       totalQuantity:t.qty,invoicedQuantity:t.qty,quantityScaled,
       unitPrice:t.unitPrice,unitPriceScaled,grossTotalScaled,netTotalScaled:grossTotalScaled,
       discountPercent:0,discountPercentScaled:0,discountAmount:0,discountAmountScaled:0,
       producedQuantity:0,paintedQuantity:0,packedQuantity:0,cutQuantity:0,
       status:"FATURADO",isActive:false,isUrgent:false,_alreadyDeducted:true,
       paymentCondition:"CARTEIRA",paymentTerms:"",paymentTermsDays:[],fiscalType:"SEM_NF",hasRET:false,
       representativeId:"",representativeName:"",
       deliveryDate:"2026-09-21",notes:"Faturamento PDF entrega "+t.delivery,itemNotes:"",
       billingRule:i===0?"cadastro":"ultimo_pedido",
       importOrigin:origem,importedBy:solicitadoPor,statusOriginalPdf:"CHATGPT_PDF",importPayloadHash:payloadHash,
       createdAt:now+i,importedAt:now+i,invoicedAt:now
     };
     tx.set(orderRefs[i],row);
     tx.set(doc(db,"logs",String(logId)),{
       id:logId,tenantId,orderId:t.orderId,operatorId:solicitadoPor,quantityInvoiced:t.qty,
       type:"FATURAMENTO",timestamp:now,durationMillis:0,importOrigin:origem,billingDocumentKey:documentKey,invoiceNumber:""
     });
     const sourceKey="item:"+t.lineId;
     tx.set(markerRefs[i],{
       tenantId,documentKey,sourceKey,origem,solicitadoPor,orderId:t.orderId,orderCode:t.orderCode,itemId:70,
       quantityInvoiced:t.qty,totalQuantityBefore:0,totalQuantityAfter:t.qty,invoicedQuantityBefore:0,invoicedQuantityAfter:t.qty,
       auditId,processedAt:now
     });
     applied.push({orderCode:t.orderCode,orderId:t.orderId,itemId:70,quantityInvoiced:t.qty,unitPrice:t.unitPrice,totalShown:t.totalShown,status:"FATURADO"});
   });
   tx.set(doc(db,"billingImportAudits",auditId),{
     tenantId,documentKey,origem,solicitadoPor,previewHash:pre.hash,allowBreakReservations:false,
     applied,skippedDuplicates:[],timestamp:now,
     notes:"Cadastro e faturamento de pedidos decimais de zincagem do Consumidor Final."
   });
   return {auditId,applied};
 });

 const post=await snapshot();
 const verification=post.existingTargets;
 return res.status(200).json({ok:true,result,verification,resumo:{aplicados:4,quantidadeFaturada:8.644,valorDocumento:290.22}});
}