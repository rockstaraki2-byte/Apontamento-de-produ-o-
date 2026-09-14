import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "../api/_lib/billingImportCore.ts";
import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

const payload: BillingImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  documentKey: "FATURADOS-CARGA-TARDE-14-SET-2026-09-14",
  faturamentos: [
    { lineId:"p1a-66962-5440-50", codigoPedido:"66962", cliente:"46 - CEMAIS DE ANGELO DE MELO CALDEIRA EIRELI", itemId:1788264481565, descricao:"CHAPA 3/16\" - 100MM X 70MM", quantidade:50, observacoes:"PDF entrega 67404" },
    { lineId:"p1b-66962-5441-50", codigoPedido:"66962", cliente:"46 - CEMAIS DE ANGELO DE MELO CALDEIRA EIRELI", itemId:1788264508685, descricao:"CHAPA 3/16\" - 130MM X 90MM", quantidade:50, observacoes:"PDF entrega 67404" },
    { lineId:"p2a-67398-392-150", codigoPedido:"67398", cliente:"69 - WELLINGTON OLIVEIRA SOUZA 04427448623", itemId:392, descricao:"SUPORTE INTERMEDIÁRIO", cor:"ZINCADO", quantidade:150, observacoes:"PDF entrega 67406; codigo impresso 392.1" },
    { lineId:"p2b-67398-797-200", codigoPedido:"67398", cliente:"69 - WELLINGTON OLIVEIRA SOUZA 04427448623", itemId:337, descricao:"SUPORTE BAIXO", cor:"ZINCADO", quantidade:200, observacoes:"PDF entrega 67406; codigo impresso 797.1" },
    { lineId:"p3a-66959-3932-300", codigoPedido:"66959", cliente:"461 - FEITAL E GASPARONI ESTOFADOS LTDA", itemId:1779765281202, descricao:"PÉ LATERAL RETO 1\" 12CM", cor:"PRETO FOSCO", quantidade:300, observacoes:"PDF entrega 67408; codigo impresso 3932.3" },
    { lineId:"p3b-66959-5358-100", codigoPedido:"66959", cliente:"461 - FEITAL E GASPARONI ESTOFADOS LTDA", itemId:1787076608611, descricao:"PÉ CENTRAL C/ RETORNO AUTOMÁTICO 22CM C/ SAPATA DE REGULAGEM", cor:"PRETO FOSCO", quantidade:100, observacoes:"PDF entrega 67408; codigo impresso 5358.3" },
    { lineId:"p4a-67028-4207-15", codigoPedido:"67028", cliente:"1072 - W L METAIS", itemId:4207, descricao:"CHAPA 3/16 - BASE REDONDA CENTRAL - 200MM X 200MM", quantidade:15, observacoes:"PDF entrega 67410" },
    { lineId:"p4b-67083-4420-2", codigoPedido:"67083", cliente:"1072 - W L METAIS", itemId:4420, descricao:"FLANGE 300X3/16", quantidade:2, observacoes:"PDF entrega 67410" },
    { lineId:"p5-67230-4224-300", codigoPedido:"67230", cliente:"1089 - MARTINS MATERIA PRIMA LTDA", itemId:4224, descricao:"BARRA CHATA REFORÇO 45 CM 2 FUROS - PERFILADA", cor:"CINZA", quantidade:300, observacoes:"PDF entrega 67412; codigo impresso 4224.11" },
    { lineId:"p6a-66957-4810-5", codigoPedido:"66957", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:1779765279567, descricao:"RODA GLIDER 50 CM", cor:"PRETO FOSCO", quantidade:5, observacoes:"PDF entrega 67414; codigo impresso 4810.3" },
    { lineId:"p6b-67079-3187-20", codigoPedido:"67079", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:2401, descricao:"PÉ CENTRAL REDONDO 15 CM", cor:"PRETO FOSCO", quantidade:20, observacoes:"PDF entrega 67414; codigo impresso 3187.3" },
    { lineId:"p6c-67192-4809-1", codigoPedido:"67192", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:4809, descricao:"RODA GLIDER 55 CM", cor:"PRETO FOSCO", quantidade:1, observacoes:"PDF entrega 67414; codigo impresso 4809.3" },
    { lineId:"p6d-67192-5483-2", codigoPedido:"67192", cliente:"1115 - KAVIN ESTOFADOS LTDA", itemId:1788890537824, descricao:"BASE GIRATÓRIA REDONDA 550MM COM 100MM DE ALTURA C/ SISTEMA DE SAPATA", cor:"PRETO FOSCO", quantidade:2, observacoes:"PDF entrega 67414; codigo impresso 5483.3" }
  ]
};

async function main() {
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const keys = collectSourceKeys(payload, snapshot);
  const processed = await repo.findProcessedSourceKeys("imperio", payload.documentKey!, keys);
  const plan = buildBillingPlan(snapshot, payload, { tenantId:"imperio", origem:"CHATGPT_PDF", solicitadoPor:"raul", processedSourceKeys:processed });
  console.log("BILLING_PREVIEW", JSON.stringify({resumo:plan.resumo,canConfirm:plan.canConfirm,previewHash:plan.previewHash,linhas:plan.linhas}));
  if (!plan.canConfirm) throw new Error("Preview possui pendências; faturamento bloqueado.");
  if (plan.resumo.total !== 13 || plan.resumo.quantidadeAFaturar !== 1195 || plan.resumo.ajustesQuantidade !== 0 || plan.resumo.pendencias !== 0) throw new Error(`Resumo inesperado: ${JSON.stringify(plan.resumo)}`);
  console.log("BILLING_0914_AFTERNOON_PREVIEW_OK", plan.previewHash);
  process.exit(0);
}
main().catch((error)=>{console.error(error);process.exit(1);});
