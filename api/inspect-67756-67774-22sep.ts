import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

function norm(v:any){
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
}

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({erro:"METHOD_NOT_ALLOWED"});
  const repo=new FirestoreOrderImportRepository();
  const catalog=await repo.loadCatalog("imperio");

  const customers=catalog.customers
    .filter((c:any)=>{
      const hay=norm([c.id,c.name,c.tradeName].join(" "));
      return hay.includes("1866") || hay.includes("FABIO") || hay.includes("OLAVO") || hay.includes("OLIVEIRA");
    })
    .map((c:any)=>({id:c.id,name:c.name,tradeName:c.tradeName,tenantId:c.tenantId}));

  const products=catalog.items
    .filter((i:any)=>{
      const code=String(i.code ?? "").trim();
      const base=code.replace(/\..*$/,"");
      return base==="1";
    })
    .map((i:any)=>({id:i.id,code:i.code,name:i.name,basePrice:i.basePrice,tenantId:i.tenantId}));

  return res.status(200).json({customers,products});
}
