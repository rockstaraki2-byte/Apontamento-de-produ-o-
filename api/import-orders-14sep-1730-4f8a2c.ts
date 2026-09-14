import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_14set_1730",
  pedidos: [
    {
      codigoPedido: "67430",
      cliente: { codigo: "858", nome: "CONSUMIDOR FINAL" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 14 DIAS",
      prazos: [14],
      dataLimite: "14/09/2026",
      possuiRET: false,
      observacoes: "CLIENTE ABIMAEL - ORC15",
      itens: [
        { codigoOriginal: "5518", codigoProduto: "5518", descricao: "CHAPA LATERAL - CHAPA 3/16 X 235 MM X 75 MM", familia: "GERENCIAL", quantidade: 8, precoUnitario: "19,99", descontoPercentual: 0 },
        { codigoOriginal: "5519", codigoProduto: "5519", descricao: "CHAPA FUNDO C/ DOBRA - CHAPA 3/16 X 240 MM X 61.5 MM", familia: "GERENCIAL", quantidade: 4, precoUnitario: "20,78", descontoPercentual: 0 },
        { codigoOriginal: "5520", codigoProduto: "5520", descricao: "CHAPA MANCAL C/ DOBRA - CHAPA 3/16 X 248 MM X 52 MM", familia: "GERENCIAL", quantidade: 4, precoUnitario: "23,01", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67431",
      cliente: { codigo: "858", nome: "CONSUMIDOR FINAL" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "14/09/2026",
      possuiRET: false,
      observacoes: "CLIENTE EDIMAR - ORC 060",
      itens: [
        { codigoOriginal: "5521", codigoProduto: "5521", descricao: "CHAPA C/ DOBRA - CHAPA 1/8 X 188 MM X 300 MM", familia: "GERENCIAL", quantidade: 2, precoUnitario: "25,72", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67440",
      cliente: { codigo: "280", nome: "BARBOSA METALURGIA LTDA" },
      representante: null,
      formaPagamento: "INDEFINIDA",
      prazos: [],
      possuiRET: false,
      itens: [
        { codigoOriginal: "68", codigoProduto: "68", descricao: "SUCATA DE FERRO", familia: "GERENCIAL", quantidade: 4550, precoUnitario: "1,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67451",
      cliente: { codigo: "95", nome: "FZ ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "15/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3585.11", codigoProduto: "3585", descricao: "PAR MECANISMO SOFÁ BAÚ", familia: "GERENCIAL", quantidade: 30, precoUnitario: "31,50", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67452",
      cliente: { codigo: "1123", nome: "M.R. DECOR LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [15,30,45,60,75],
      dataLimite: "21/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1880.1", codigoProduto: "1880", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", familia: "GERENCIAL", quantidade: 1000, precoUnitario: "1,00", descontoPercentual: 0 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 500, precoUnitario: "0,98", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67453",
      cliente: { codigo: "1290", nome: "STANZIOLA MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [25,55,70],
      dataLimite: "16/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "GERENCIAL", quantidade: 10000, precoUnitario: "0,045", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67455",
      cliente: { codigo: "406", nome: "MARCOS AGNALDO INACIO" },
      representante: "ANGELO",
      formaPagamento: "BOLETO 30/45 DIAS",
      prazos: [30,45],
      dataLimite: "16/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "392.1", codigoProduto: "392", descricao: "SUPORTE INTERMEDIÁRIO", familia: "GERENCIAL", quantidade: 150, precoUnitario: "1,85", descontoPercentual: 0 }
      ]
    }
  ]
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false, erro: "Método não permitido." });
  }
  const repository = new FirestoreOrderImportRepository();
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_14set_1730" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
