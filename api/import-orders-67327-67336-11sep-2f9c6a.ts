import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67327_67336_11set_manha",
  pedidos: [
    {
      codigoPedido: "67327",
      cliente: { codigo: "714", nome: "B.A CORBELLI INDUSTRIA DE MOVEIS LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30/45 DIAS",
      prazos: [30, 45],
      possuiRET: false,
      itens: [
        { codigoOriginal: "4809.3", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", familia: "INDEFINIDA", quantidade: 50, precoUnitario: "113,40", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67328",
      cliente: { codigo: "791", nome: "RONDOMOVEIS LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 7 DIAS",
      prazos: [7],
      promEntrega: "31/08/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3810.1", codigoProduto: "3810", descricao: "KIT 508", familia: "INDEFINIDA", quantidade: 50, precoUnitario: "6,80", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67330",
      cliente: { codigo: "1057", nome: "SIMAR RODRIGUES DE FARIA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      possuiRET: false,
      itens: [
        { codigoOriginal: "4809.3", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", familia: "GERENCIAL", quantidade: 20, precoUnitario: "115,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67331",
      cliente: { codigo: "63", nome: "GREICE MOVEIS LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "18/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "2793", codigoProduto: "2793", descricao: "BASE MESA CARMELA", familia: "INDEFINIDA", quantidade: 2, precoUnitario: "512,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67332",
      cliente: { codigo: "510", nome: "MDP INDUSTRIA E COMERCIO DE MOVEIS" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [7, 14, 21, 28],
      dataLimite: "17/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3197.1", codigoProduto: "3197", descricao: "SUPORTE TRIPLO", familia: "GERENCIAL", quantidade: 100, precoUnitario: "5,25", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67333",
      cliente: { codigo: "1290", nome: "STANZIOLA MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [25, 55, 70],
      dataLimite: "23/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3735.11", codigoProduto: "3735", descricao: "PAR DE MECANISMO RETRÁTIL METAL 71,5 CM", familia: "GERENCIAL", quantidade: 300, precoUnitario: "12,80", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67334",
      cliente: { codigo: "1290", nome: "STANZIOLA MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [25, 55, 70],
      dataLimite: "30/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3735.11", codigoProduto: "3735", descricao: "PAR DE MECANISMO RETRÁTIL METAL 71,5 CM", familia: "GERENCIAL", quantidade: 300, precoUnitario: "12,80", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67335",
      cliente: { codigo: "1290", nome: "STANZIOLA MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [25, 55, 70],
      dataLimite: "07/10/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3735.11", codigoProduto: "3735", descricao: "PAR DE MECANISMO RETRÁTIL METAL 71,5 CM", familia: "GERENCIAL", quantidade: 300, precoUnitario: "12,80", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67336",
      cliente: { codigo: "1300", nome: "BEL INDUSTRIA DE MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 7 DIAS",
      prazos: [7],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "GERENCIAL", quantidade: 1000, precoUnitario: "1,18", descontoPercentual: 3 }
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67327_67336_11set_manha" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }
  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
