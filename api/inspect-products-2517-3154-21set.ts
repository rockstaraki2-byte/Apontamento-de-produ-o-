import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({erro:"METHOD_NOT_ALLOWED"});
  const repo=new FirestoreOrderImportRepository();
  const catalog=await repo.loadCatalog("imperio");
  const wanted=catalog.items.filter((i:any)=>{
    const code=String(i.code??"").trim();
    return code==="2517"||code.startsWith("2517.")||code==="3154"||code.startsWith("3154.");
  }).map((i:any)=>({id:i.id,code:i.code,name:i.name,price:i.price,unitPrice:i.unitPrice,basePrice:i.basePrice,tenantId:i.tenantId}));
  return res.status(200).json({wanted});
}
