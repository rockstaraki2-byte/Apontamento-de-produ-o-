import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67383_67401_14set_0930",
  pedidos: [
    {
      codigoPedido: "67383",
      cliente: { codigo: "1094", nome: "DECORARE MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1925", codigoProduto: "1925", descricao: "PINO DE LATÃO COM CABEÇA DE 16 E CORPO DE 10MM", familia: "INDEFINIDA", quantidade: 20, precoUnitario: "8,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67388",
      cliente: { codigo: "10", nome: "M. S. R. PEREIRA & CIA LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 7 DIAS",
      prazos: [7],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3744.3", codigoProduto: "3744", descricao: "PÉ MONTREAL 15CM", familia: "GERENCIAL", quantidade: 93, precoUnitario: "21,70", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67398",
      cliente: { codigo: "69", nome: "WELLINGTON OLIVEIRA SOUZA 04427448623" },
      representante: "ANGELO",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "797.1", codigoProduto: "797", descricao: "SUPORTE BAIXO", familia: "GERENCIAL", quantidade: 200, precoUnitario: "1,58", descontoPercentual: 0 },
        { codigoOriginal: "392.1", codigoProduto: "392", descricao: "SUPORTE INTERMEDIÁRIO", familia: "GERENCIAL", quantidade: 150, precoUnitario: "1,95", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67399",
      cliente: { codigo: "914", nome: "SANTRIN COMERCIO LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 7/14/21 DIAS",
      prazos: [7,14,21],
      dataLimite: "21/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "41", codigoProduto: "41", descricao: "GIRATORIA ALUMINIO G", familia: "GERENCIAL", quantidade: 20, precoUnitario: "31,70", descontoPercentual: 0 },
        { codigoOriginal: "3192.3", codigoProduto: "3192", descricao: "SAPATA GIRATORIA COM GARRA", familia: "GERENCIAL", quantidade: 10, precoUnitario: "50,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67400",
      cliente: { codigo: "1072", nome: "W L METAIS" },
      representante: "KESSE",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "22/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3615", codigoProduto: "3615", descricao: "TAMPAO DE ACABAMENTO DE ALUMINIO 9.3 OU 10.1", familia: "GERENCIAL", quantidade: 40, precoUnitario: "1,85", descontoPercentual: 0, observacao: "9.3" }
      ]
    },
    {
      codigoPedido: "67401",
      cliente: { codigo: "1096", nome: "TORNEARIA DO FRED" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "15/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "5229", codigoProduto: "5229", descricao: "CHAPA 2MM - 50MM X 50MM C/ 1 FURO CENTRAL DE 8MM", familia: "GERENCIAL", quantidade: 110, precoUnitario: "2,30", descontoPercentual: 0 }
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67383_67401_14set_0930" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }
  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
