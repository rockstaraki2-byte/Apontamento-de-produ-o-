import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const expectedExistingPreviewHash = "0b236b6ad6859bc1d95b21ea7eeef99d98e2f0b966e80cf5ebd2b7f59f9118d2";

const newOrderPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  pedidos: [{
    codigoPedido: "67009",
    cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "CARTEIRA",
    prazos: [60],
    comNotaFiscal: false,
    dataLimite: "2026-09-14",
    observacoes: "CLIENTE LUCIANA SANDRA",
    itens: [{ codigoOriginal:"3191.3", codigoProduto:"3191", descricao:"PÉ MADRÍ 15 CM - CLIENTE LUCIANA SANDRA", quantidade:20, precoUnitario:17, descontoPercentual:15, variacao:"CLIENTE LUCIANA SANDRA", observacoes:"PDF carga 3674 entrega 67436" }]
  }]
};

const basePayload: BillingImportPayload = {
  origem:"CHATGPT_PDF", tenantId:"imperio", solicitadoPor:"raul",
  documentKey:"CARGAS-DA-TARDE-14-SETEMBRO-1730-2026-09-14-P6-P9",
  faturamentos:[
    { lineId:"p6-67431-5521-2", codigoPedido:"67431", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410982900, descricao:"CHAPA C/ DOBRA - CHAPA 1/8\" X 188 MM X 300 MM", quantidade:2, observacoes:"PDF carga 3673 entrega 67433" },
    { lineId:"p7-65025-5181-600", codigoPedido:"65025", cliente:"904 - ITATIAIA ELETRO E MOVEIS S/A", itemId:1784233675282, descricao:"PORTA IMA P/ GANCHEIRAS D37,5X10MM AC - ITA 1700043533", quantidade:600, numeroNota:"6314", observacoes:"PDF carga 3674 entrega 67434" },
    { lineId:"p9a-67430-5518-8", codigoPedido:"67430", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410724349, descricao:"CHAPA LATERAL - CHAPA 3/16\" X 235 MM X 75 MM", quantidade:8, observacoes:"PDF carga 3674 entrega 67438" },
    { lineId:"p9b-67430-5519-4", codigoPedido:"67430", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410766060, descricao:"CHAPA FUNDO C/ DOBRA - CHAPA 3/16\" X 240 MM X 61.5 MM", quantidade:4, observacoes:"PDF carga 3674 entrega 67438" },
    { lineId:"p9c-67430-5520-4", codigoPedido:"67430", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410802029, descricao:"CHAPA MANCAL C/ DOBRA - CHAPA 3/16\" X 248 MM X 52 MM", quantidade:4, observacoes:"PDF carga 3674 entrega 67438" }
  ]
};

async function buildPlan(repo: FirestoreBillingRepository, payload: BillingImportPayload){
  const snapshot=await repo.loadSnapshot("imperio");
  const keys=collectSourceKeys(payload,snapshot);
  const processed=await repo.findProcessedSourceKeys("imperio",payload.documentKey!,keys);
  return { snapshot, plan: buildBillingPlan(snapshot,payload,{tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",processedSourceKeys:processed}) };
}

async function main(){
  const billingRepo=new FirestoreBillingRepository();
  const before=await buildPlan(billingRepo,basePayload);
  console.log("PRE_EXEC_EXISTING_RECHECK",JSON.stringify({resumo:before.plan.resumo,canConfirm:before.plan.canConfirm,previewHash:before.plan.previewHash}));
  if(before.plan.previewHash!==expectedExistingPreviewHash || !before.plan.canConfirm || before.plan.resumo.total!==5 || before.plan.resumo.quantidadeAFaturar!==618 || before.plan.resumo.pendencias!==0) throw new Error("Estado dos pedidos existentes mudou desde a prévia.");

  const orderRepo=new FirestoreOrderImportRepository();
  const existing67009=await orderRepo.findExistingOrderIds("imperio","67009");
  if(existing67009.length) throw new Error(`Pedido 67009 surgiu antes da execução: ${existing67009.join(",")}. Abortando para evitar duplicidade.`);
  const createResult=await processOrderImport(orderRepo,newOrderPayload,{tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",now:new Date("2026-09-14T17:30:00-03:00")},false);
  console.log("ORDER_67009_CREATE",JSON.stringify(createResult));
  if(!createResult.sucesso || createResult.resumo.criados!==1 || createResult.resultados[0]?.status!=="CRIADO") throw new Error("Falha ao criar pedido 67009.");

  const finalPayload: BillingImportPayload={...basePayload,faturarPedidosInteiros:["67009"]};
  const final=await buildPlan(billingRepo,finalPayload);
  console.log("FINAL_PREVIEW",JSON.stringify({resumo:final.plan.resumo,canConfirm:final.plan.canConfirm,previewHash:final.plan.previewHash,linhas:final.plan.linhas}));
  if(!final.plan.canConfirm || final.plan.resumo.total!==6 || final.plan.resumo.quantidadeAFaturar!==638 || final.plan.resumo.ajustesQuantidade!==0 || final.plan.resumo.pendencias!==0) throw new Error(`Prévia final inesperada: ${JSON.stringify(final.plan.resumo)}`);

  const result=await billingRepo.applyPlan(final.plan);
  console.log("EXEC_RESULT",JSON.stringify(result));
  if(result.resumo.aplicados!==6 || result.resumo.quantidadeFaturada!==638 || result.resumo.duplicadosIgnorados!==0 || result.resumo.itensComQuantidadeAjustada!==0) throw new Error(`Resultado inesperado: ${JSON.stringify(result.resumo)}`);

  const after=await billingRepo.loadSnapshot("imperio");
  const expected=[
    {orderCode:"67431",itemId:1789410982900,total:2,invoiced:2,status:"FATURADO",active:false},
    {orderCode:"65025",itemId:1784233675282,total:8000,invoiced:4581,status:"FATURADO_PARCIAL",active:true},
    {orderCode:"67430",itemId:1789410724349,total:8,invoiced:8,status:"FATURADO",active:false},
    {orderCode:"67430",itemId:1789410766060,total:4,invoiced:4,status:"FATURADO",active:false},
    {orderCode:"67430",itemId:1789410802029,total:4,invoiced:4,status:"FATURADO",active:false},
  ];
  const checks=expected.map((e)=>{const rows=after.orders.filter((o)=>String(o.orderCode).trim()===e.orderCode && Number(o.itemId)===e.itemId);return {...e,rows:rows.map((o)=>({totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity??0,status:o.status,isActive:o.isActive}))};});
  const newRows=after.orders.filter((o)=>String(o.orderCode).trim()==="67009").map((o)=>({itemId:o.itemId,totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity??0,status:o.status,isActive:o.isActive,color:o.color,variation:o.variation}));
  console.log("POST_VERIFY",JSON.stringify({checks,newRows}));
  for(const check of checks){if(check.rows.length!==1) throw new Error(`Verificação encontrou ${check.rows.length} linhas para ${check.orderCode}/${check.itemId}`);const row=check.rows[0];if(Number(row.totalQuantity)!==check.total||Number(row.invoicedQuantity)!==check.invoiced||row.status!==check.status||Boolean(row.isActive)!==check.active) throw new Error(`Verificação falhou para ${check.orderCode}/${check.itemId}: ${JSON.stringify(row)}`);}
  if(newRows.length!==1 || Number(newRows[0].totalQuantity)!==20 || Number(newRows[0].invoicedQuantity)!==20 || newRows[0].status!=="FATURADO" || Boolean(newRows[0].isActive)!==false) throw new Error(`Verificação falhou para 67009: ${JSON.stringify(newRows)}`);
  console.log("BILLING_0914_1730_BATCH_OK",result.auditId??"sem-audit-id");
  process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1);});