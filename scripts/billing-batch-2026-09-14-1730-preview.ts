import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

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
    itens: [{
      codigoOriginal: "3191.3",
      codigoProduto: "3191",
      descricao: "PÉ MADRÍ 15 CM - CLIENTE LUCIANA SANDRA",
      quantidade: 20,
      precoUnitario: 17,
      descontoPercentual: 15,
      variacao: "CLIENTE LUCIANA SANDRA",
      observacoes: "PDF carga 3674 entrega 67436"
    }]
  }]
};

const billingPayload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "CARGAS-DA-TARDE-14-SETEMBRO-1730-2026-09-14-P6-P9",
  faturamentos: [
    { lineId:"p6-67431-5521-2", codigoPedido:"67431", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410982900, descricao:"CHAPA C/ DOBRA - CHAPA 1/8\" X 188 MM X 300 MM", quantidade:2, observacoes:"PDF carga 3673 entrega 67433" },
    { lineId:"p7-65025-5181-600", codigoPedido:"65025", cliente:"904 - ITATIAIA ELETRO E MOVEIS S/A", itemId:1784233675282, descricao:"PORTA IMA P/ GANCHEIRAS D37,5X10MM AC - ITA 1700043533", quantidade:600, numeroNota:"6314", observacoes:"PDF carga 3674 entrega 67434" },
    { lineId:"p9a-67430-5518-8", codigoPedido:"67430", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410724349, descricao:"CHAPA LATERAL - CHAPA 3/16\" X 235 MM X 75 MM", quantidade:8, observacoes:"PDF carga 3674 entrega 67438" },
    { lineId:"p9b-67430-5519-4", codigoPedido:"67430", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410766060, descricao:"CHAPA FUNDO C/ DOBRA - CHAPA 3/16\" X 240 MM X 61.5 MM", quantidade:4, observacoes:"PDF carga 3674 entrega 67438" },
    { lineId:"p9c-67430-5520-4", codigoPedido:"67430", cliente:"858 - CONSUMIDOR FINAL", itemId:1789410802029, descricao:"CHAPA MANCAL C/ DOBRA - CHAPA 3/16\" X 248 MM X 52 MM", quantidade:4, observacoes:"PDF carga 3674 entrega 67438" }
  ]
};

async function main(){
  const orderRepo = new FirestoreOrderImportRepository();
  const orderValidation = await processOrderImport(orderRepo, newOrderPayload, {tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",now:new Date("2026-09-14T17:30:00-03:00")}, true);
  console.log("ORDER_67009_VALIDATION", JSON.stringify(orderValidation));
  if(!orderValidation.sucesso || orderValidation.resumo.validos !== 1 || orderValidation.resultados[0]?.status !== "VALIDO") throw new Error("Pedido 67009 não passou na validação de criação.");

  const repo=new FirestoreBillingRepository();
  const snapshot=await repo.loadSnapshot("imperio");
  const keys=collectSourceKeys(billingPayload,snapshot);
  const processed=await repo.findProcessedSourceKeys("imperio",billingPayload.documentKey!,keys);
  const plan=buildBillingPlan(snapshot,billingPayload,{tenantId:"imperio",origem:"CHATGPT_PDF",solicitadoPor:"raul",processedSourceKeys:processed});
  console.log("BILLING_PREVIEW",JSON.stringify({resumo:plan.resumo,canConfirm:plan.canConfirm,previewHash:plan.previewHash,linhas:plan.linhas}));
  if(!plan.canConfirm || plan.resumo.total!==5 || plan.resumo.quantidadeAFaturar!==618 || plan.resumo.ajustesQuantidade!==0 || plan.resumo.pendencias!==0) throw new Error(`Preview inesperada: ${JSON.stringify(plan.resumo)}`);
  console.log("BILLING_0914_1730_PREVIEW_OK",plan.previewHash);
  process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1);});