import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";
const orders: any[] = [
  {
    codigoPedido: "68049",
    cliente: { codigo: 1749, nome: "VITOR DA SILVEIRA HENRIQUES" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "PIX A VISTA",
    prazos: [],
    comNotaFiscal: true,
    promEntrega: "2026-10-07",
    previsao: "2026-10-07",
    observacoes: "STATUS NO PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "3193.3",
        codigoProduto: "3193",
        descricao: "SAPATA GIRATORIA COMUM",
        familia: "INDEFINIDA",
        quantidade: 20,
        precoUnitario: 50.00,
        descontoPercentual: 0
      },
      {
        codigoOriginal: "3128.3",
        codigoProduto: "3128",
        descricao: "ARGOLA 40 CM 4 FUROS EXTERNO",
        familia: "INDEFINIDA",
        quantidade: 20,
        precoUnitario: 20.00,
        descontoPercentual: 0
      }
    ]
  }
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }
  const dryRun = String(req.query?.dryRun || "").toLowerCase() === "true";
  const payload = {
    origem: "CHATGPT_GOOGLE_DRIVE_PDF",
    tenantId,
    solicitadoPor: "raul",
    pedidos: orders,
  };
  const result = await processOrderImport(
    new FirestoreOrderImportRepository(),
    payload as any,
    { tenantId, origem: payload.origem, solicitadoPor: payload.solicitadoPor },
    dryRun,
  );
  return res.status(result.resumo.comErro > 0 ? 207 : 200).json(result);
}
