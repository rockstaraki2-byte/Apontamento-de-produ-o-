import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";
const orders: any[] = [
  {
    codigoPedido: "67684",
    cliente: { codigo: 6, nome: "VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: false,
    dataLimite: "2026-09-18",
    itens: [
      { codigoOriginal: "5511.3", codigoProduto: "5511", descricao: "PAR PÉ COM RETORNO AUTOMÁTICO 19CM", familia: "GERENCIAL", quantidade: 30, precoUnitario: 36.56 }
    ]
  },
  {
    codigoPedido: "67689",
    cliente: { codigo: 1683, nome: "USI TEC LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "PIX A VISTA",
    prazos: [],
    comNotaFiscal: false,
    itens: [
      { codigoOriginal: "937", codigoProduto: "937", descricao: "CORTE A LASER", familia: "GERENCIAL", quantidade: 1, precoUnitario: 35.10, observacoes: "BASE LISA CHIQUIM CHAPA 5/8 X 250MM X 300MM" },
      { codigoOriginal: "937", codigoProduto: "937", descricao: "CORTE A LASER", familia: "GERENCIAL", quantidade: 1, precoUnitario: 87.21, observacoes: "BASE CHIQUIM CHAPA 5/8 X 420MM X 600MM" }
    ]
  },
  {
    codigoPedido: "67694",
    cliente: { codigo: 1709, nome: "ESTOFARIA TEIXEIRA RIOBRANCO LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: false,
    itens: [
      { codigoOriginal: "2517.11", codigoProduto: "2517", descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA", familia: "GERENCIAL", quantidade: 200, precoUnitario: 1.80 }
    ]
  },
  {
    codigoPedido: "67695",
    cliente: { codigo: 948, nome: "TR MOVEIS E ESTOFADOS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30/45 DIAS",
    prazos: [30,45],
    comNotaFiscal: false,
    itens: [
      { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 500, precoUnitario: 0.98 },
      { codigoOriginal: "3794.11", codigoProduto: "3794", descricao: "BARRA CHATA REFORÇO 54 CM 2 FUROS - PERFILADA", familia: "GERENCIAL", quantidade: 300, precoUnitario: 1.75 }
    ]
  },
  {
    codigoPedido: "67700",
    cliente: { codigo: 714, nome: "B.A CORBELLI INDUSTRIA DE MOVEIS LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: true,
    itens: [
      { codigoOriginal: "3154.1", codigoProduto: "3154", descricao: "CANTONEIRA 90° 50X50X12,7 NA 2,65 - 4 FUROS", familia: "INDEFINIDA", quantidade: 50, precoUnitario: 1.00 }
    ]
  },
  {
    codigoPedido: "67711",
    cliente: { codigo: 1096, nome: "TORNEARIA DO FRED" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "CARTEIRA",
    prazos: [30],
    comNotaFiscal: false,
    dataLimite: "2026-09-23",
    itens: [
      { codigoOriginal: "4794", codigoProduto: "4794", descricao: "CHAPA 2MM - TRIANGULO - TORNEARIA FRED", familia: "GERENCIAL", quantidade: 60, precoUnitario: 4.78 },
      { codigoOriginal: "4793", codigoProduto: "4793", descricao: "CHAPA 75 X 75 C/ 3 FUROS DE 8.5MM", familia: "GERENCIAL", quantidade: 60, precoUnitario: 2.61 },
      { codigoOriginal: "5066", codigoProduto: "5066", descricao: "CHAPA 75 X 75 C/ 3 FUROS DE 10MM", familia: "GERENCIAL", quantidade: 45, precoUnitario: 2.61 },
      { codigoOriginal: "5544", codigoProduto: "5544", descricao: "CHAPA 75 X 75 C/ 3 FUROS DE 13MM", familia: "GERENCIAL", quantidade: 15, precoUnitario: 2.61 }
    ]
  },
  {
    codigoPedido: "67712",
    cliente: { codigo: 1008, nome: "C & M DECOR LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: true,
    dataLimite: "2026-09-28",
    itens: [
      { codigoOriginal: "2941.8", codigoProduto: "2941", descricao: "BASE ARQUEADA 115X780X3/16", familia: "INDEFINIDA", quantidade: 300, precoUnitario: 16.80 },
      { codigoOriginal: "2942.8", codigoProduto: "2942", descricao: "TRIANGULO 3/16", familia: "INDEFINIDA", quantidade: 120, precoUnitario: 0.91 }
    ]
  },
  {
    codigoPedido: "67713",
    cliente: { codigo: 914, nome: "SANTRIN COMERCIO LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 7/14/21 DIAS",
    prazos: [7,14,21],
    comNotaFiscal: false,
    dataLimite: "2026-09-25",
    itens: [
      { codigoOriginal: "41", codigoProduto: "41", descricao: "GIRATORIA ALUMINIO G", familia: "GERENCIAL", quantidade: 40, precoUnitario: 31.70 },
      { codigoOriginal: "304", codigoProduto: "304", descricao: "GIRATORIA ALUMINIO P", familia: "GERENCIAL", quantidade: 15, precoUnitario: 21.30 }
    ]
  },
  {
    codigoPedido: "67714",
    cliente: { codigo: 95, nome: "FZ ESTOFADOS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30/45/60",
    prazos: [30,45,60],
    comNotaFiscal: false,
    dataLimite: "2026-10-02",
    itens: [
      { codigoOriginal: "2517.11", codigoProduto: "2517", descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA", familia: "GERENCIAL", quantidade: 1000, precoUnitario: 1.65 }
    ]
  },
  {
    codigoPedido: "67715",
    cliente: { codigo: 95, nome: "FZ ESTOFADOS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30/45 DIAS",
    prazos: [30,45],
    comNotaFiscal: false,
    dataLimite: "2026-09-25",
    itens: [
      { codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "GERENCIAL", quantidade: 15000, precoUnitario: 0.045 }
    ]
  },
  {
    codigoPedido: "67716",
    cliente: { codigo: 10, nome: "M. S. R. PEREIRA & CIA LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 7 DIAS",
    prazos: [7],
    comNotaFiscal: false,
    dataLimite: "2026-10-02",
    itens: [
      { codigoOriginal: "3660.3", codigoProduto: "3660", descricao: "PÉ APOLO 15CM", familia: "GERENCIAL", quantidade: 300, precoUnitario: 21.70 }
    ]
  },
  {
    codigoPedido: "67717",
    cliente: { codigo: 1290, nome: "STANZIOLA MOVEIS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO A PRAZO",
    prazos: [25,55,70],
    comNotaFiscal: false,
    dataLimite: "2026-09-24",
    itens: [
      { codigoOriginal: "2787.11", codigoProduto: "2787", descricao: "PAR DE MECANISMO RETRÁTIL METAL 105 CM", familia: "GERENCIAL", quantidade: 50, precoUnitario: 15.00 }
    ]
  }
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  const repo = new FirestoreOrderImportRepository();
  const ctx = { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date() };
  const results: any[] = [];

  for (const order of orders) {
    const payload = { origem: "CHATGPT_PDF", tenantId, solicitadoPor: "raul", pedidos: [order] };
    const validation = await processOrderImport(repo, payload as any, ctx, true);
    const vr = validation.resultados?.[0];

    if (!validation.sucesso || validation.resumo.comErro > 0) {
      results.push({ codigoPedido: order.codigoPedido, fase: "VALIDACAO", validation: vr });
      continue;
    }

    if (validation.resumo.jaExistentes > 0 || vr?.status === "JA_EXISTE") {
      results.push({ codigoPedido: order.codigoPedido, fase: "EXISTENTE", validation: vr });
      continue;
    }

    const imported = await processOrderImport(repo, payload as any, ctx, false);
    results.push({ codigoPedido: order.codigoPedido, fase: "IMPORTACAO", validation: vr, imported: imported.resultados?.[0] });
  }

  return res.status(200).json({ sucesso: true, quantidadePedidos: orders.length, results });
}
