import { buildBillingPlan, collectSourceKeys } from "../_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "../_lib/billingImportFirestore.js";

const KEY = "sep17-1730-exec-6d4b91";
const DOCUMENT_KEY = "FATURADOS-17-SET-1730-2026-09-17-P21-25";
const payload:any = {
  origem: "CHATGPT_PDF_COMPARISON",
  tenantId: "imperio",
  solicitadoPor: "chatgpt-integration",
  documentKey: DOCUMENT_KEY,
  allowBreakReservations: false,
  faturamentos: [
    { lineId:"p21-67520-1-3000", codigoPedido:"67520", codigoProduto:"1", cor:"ZINCADO", quantidade:3000, numeroNota:"6333" },
    { lineId:"p21-67520-2739-2000", codigoPedido:"67520", codigoProduto:"2739", cor:"ZINCADO", quantidade:2000, numeroNota:"6333" },
    { lineId:"p22-67109-5069-30000", codigoPedido:"67109", codigoProduto:"5069", quantidade:30000, numeroNota:"6334" },
    { lineId:"p23-67484-1-2000", codigoPedido:"67484", codigoProduto:"1", cor:"ZINCADO", quantidade:2000, numeroNota:"6335" },
    { lineId:"p23-67484-2459-1000", codigoPedido:"67484", codigoProduto:"2459", cor:"CINZA", quantidade:1000, numeroNota:"6335" },
    { lineId:"p23-67484-2739-1000", codigoPedido:"67484", codigoProduto:"2739", cor:"ZINCADO", quantidade:1000, numeroNota:"6335" },
    { lineId:"p24-67521-901-1250", codigoPedido:"67521", codigoProduto:"901", quantidade:1250, numeroNota:"6336" },
    { lineId:"p24-67521-2459-1000", codigoPedido:"67521", codigoProduto:"2459", cor:"CINZA", quantidade:1000, numeroNota:"6336" },
    { lineId:"p25-67483-3074-1500", codigoPedido:"67483", codigoProduto:"3074", cor:"ZINCADO", quantidade:1500 },
  ],
};

export default async function handler(req:any, res:any) {
  if (req.method !== "GET") return res.status(405).json({ok:false});
  if (String(req.query?.key || "") !== KEY) return res.status(404).send("Not found");
  const mode = String(req.query?.mode || "preview");
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const sourceKeys = collectSourceKeys(payload, snapshot);
  const processedSourceKeys = await repo.findProcessedSourceKeys("imperio", DOCUMENT_KEY, sourceKeys);
  const plan = buildBillingPlan(snapshot, payload, {
    tenantId:"imperio", origem:payload.origem, solicitadoPor:payload.solicitadoPor, processedSourceKeys,
  });
  const expected = plan.resumo.total === 9 && plan.resumo.quantidadeAFaturar === 42750 && plan.resumo.ajustesQuantidade === 0 && plan.resumo.conflitosReserva === 0 && plan.resumo.pendencias === 0;
  const summary = {
    previewHash: plan.previewHash,
    canConfirm: plan.canConfirm,
    resumo: plan.resumo,
    linhas: plan.linhas.map((l:any)=>({status:l.status,message:l.message,sourceKey:l.sourceKey,operation:l.operation ? {
      orderCode:l.operation.orderCode,itemCode:l.operation.itemCode,billingQuantity:l.operation.billingQuantity,
      currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,
      newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity,
    }:undefined})),
  };
  if (mode !== "execute") return res.status(expected && plan.canConfirm ? 200 : 409).json({ok:expected && plan.canConfirm,...summary});
  if (!expected || !plan.canConfirm) return res.status(409).json({ok:false,error:"PREVIEW_GUARD_FAILED",...summary});
  if (String(req.query?.hash || "") !== plan.previewHash) return res.status(409).json({ok:false,error:"HASH_MISMATCH",...summary});
  const result = await repo.applyPlan(plan);
  const after = await repo.loadSnapshot("imperio");
  const wanted = new Set(payload.faturamentos.map((x:any)=>`${x.codigoPedido}|${x.codigoProduto}`));
  const itemMap = new Map(after.items.map((i:any)=>[String(i.id),i]));
  const verification = after.orders.filter((o:any)=>{
    const item:any = itemMap.get(String(o.itemId));
    return wanted.has(`${o.orderCode}|${String(item?.code || o.itemId)}`);
  }).map((o:any)=>({orderCode:o.orderCode,itemId:o.itemId,itemCode:String((itemMap.get(String(o.itemId)) as any)?.code || o.itemId),totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity,status:o.status,isActive:o.isActive}));
  return res.status(200).json({ok:true,previewHash:plan.previewHash,resumoPreview:plan.resumo,result,verification});
}
