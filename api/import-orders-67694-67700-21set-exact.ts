import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

class ExactCatalogRepo extends FirestoreOrderImportRepository {
  async loadCatalog(tenantId:string) {
    const catalog = await super.loadCatalog(tenantId);
    const selected2517 = "1779765282668";
    const selected3154 = "1779765283047";
    return {
      ...catalog,
      items: catalog.items.filter((item:any) => {
        const base = String(item.code ?? "").replace(/\..*$/, "").trim();
        if (base === "2517") return String(item.id) === selected2517;
        if (base === "3154") return String(item.id) === selected3154;
        return true;
      }),
    };
  }
}

const tenantId="imperio";
const orders:any[]=[
  {
    codigoPedido:"67694",
    cliente:{codigo:1709,nome:"ESTOFARIA TEIXEIRA RIOBRANCO LTDA"},
    representante:"KESSE",
    formaPagamento:"BOLETO 30 DIAS",
    prazos:[30],
    comNotaFiscal:false,
    itens:[
      {codigoOriginal:"2517.11",codigoProduto:"2517",descricao:"BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA",familia:"GERENCIAL",quantidade:200,precoUnitario:1.80}
    ]
  },
  {
    codigoPedido:"67700",
    cliente:{codigo:714,nome:"B.A CORBELLI INDUSTRIA DE MOVEIS LTDA"},
    representante:"IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento:"BOLETO 30 DIAS",
    prazos:[30],
    comNotaFiscal:true,
    itens:[
      {codigoOriginal:"3154.1",codigoProduto:"3154",descricao:"CANTONEIRA 90° 50X50X12,7 NA 2,65 - 4 FUROS",familia:"INDEFINIDA",quantidade:50,precoUnitario:1.00}
    ]
  }
];

export default async function handler(req:any,res:any){
  if(req.method!=="GET") return res.status(405).json({sucesso:false,erro:"METHOD_NOT_ALLOWED"});
  const repo=new ExactCatalogRepo();
  const ctx={tenantId,origem:"CHATGPT_PDF",solicitadoPor:"raul",now:new Date()};
  const results:any[]=[];
  for(const order of orders){
    const payload={origem:"CHATGPT_PDF",tenantId,solicitadoPor:"raul",pedidos:[order]};
    const validation=await processOrderImport(repo,payload as any,ctx,true);
    const vr=validation.resultados?.[0];
    if(!validation.sucesso||validation.resumo.comErro>0){
      results.push({codigoPedido:order.codigoPedido,fase:"VALIDACAO",validation:vr});
      continue;
    }
    if(validation.resumo.jaExistentes>0||vr?.status==="JA_EXISTE"){
      results.push({codigoPedido:order.codigoPedido,fase:"EXISTENTE",validation:vr});
      continue;
    }
    const imported=await processOrderImport(repo,payload as any,ctx,false);
    results.push({codigoPedido:order.codigoPedido,fase:"IMPORTACAO",validation:vr,imported:imported.resultados?.[0]});
  }
  return res.status(200).json({sucesso:true,results});
}
