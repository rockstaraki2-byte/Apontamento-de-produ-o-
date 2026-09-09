import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67245_67257_09set",
  pedidos: [
    {
      codigoPedido: "67245",
      cliente: { codigo: "943", nome: "LARA MOVEIS LTDA" },
      representante: "ANDRE MILLENIUM REPRESENTAÇOES",
      formaPagamento: "BOLETO 14 DIAS",
      prazos: [14],
      promEntrega: "27/08/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3146.3", codigoProduto: "3146", descricao: "BASE GIRATORIA ANNE", familia: "GERENCIAL", quantidade: 1, precoUnitario: "176,96", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67251",
      cliente: { codigo: "856", nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [60],
      possuiRET: false,
      itens: [
        { codigoOriginal: "797.1", codigoProduto: "797", descricao: "SUPORTE BAIXO", familia: "GERENCIAL", quantidade: 600, precoUnitario: "1,58", descontoPercentual: 15 },
        { codigoOriginal: "2551.1", codigoProduto: "2551", descricao: "SUPORTE CANTONEIRA C/ 4 FUROS CENTRAIS", familia: "GERENCIAL", quantidade: 150, precoUnitario: "2,30", descontoPercentual: 15 }
      ]
    },
    {
      codigoPedido: "67252",
      cliente: { codigo: "1193", nome: "POLLO INDUSTRIA E TRANSPORTE DE MOVEIS LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "16/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1281", codigoProduto: "1281", descricao: "CHAPA ENCOSTO POLTRONA 80° GRAUS", familia: "GERENCIAL", cor: "ZINCADO", quantidade: 200, precoUnitario: "1,30", descontoPercentual: 0, observacoes: "Obs. TekSystem: ZINCADA" }
      ]
    },
    {
      codigoPedido: "67253",
      cliente: { codigo: "248", nome: "TUBULARES GOL INDUSTRIA E TRANSPORTE DE MOVEIS EIRELI" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "16/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "2839.8", codigoProduto: "2839", descricao: "CHAPA 68X68X2.5 COM 2 FUROS 10.5", familia: "GERENCIAL", quantidade: 500, precoUnitario: "1,80", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67254",
      cliente: { codigo: "1123", nome: "M.R. DECOR LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [15, 30, 45, 60, 75],
      dataLimite: "10/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "GERENCIAL", quantidade: 10000, precoUnitario: "0,045", descontoPercentual: 0 },
        { codigoOriginal: "1880.1", codigoProduto: "1880", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", familia: "GERENCIAL", quantidade: 1000, precoUnitario: "1,00", descontoPercentual: 0 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 500, precoUnitario: "0,98", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67255",
      cliente: { codigo: "94", nome: "STARTEN ESTOFADOS LTDA." },
      representante: "KESSE",
      formaPagamento: "BOLETO 30/60/90",
      prazos: [30, 60, 90],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1880.1", codigoProduto: "1880", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", familia: "INDEFINIDA", quantidade: 5000, precoUnitario: "1,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67256",
      cliente: { codigo: "824", nome: "AW INTERIORES LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "10/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3585.11", codigoProduto: "3585", descricao: "PAR MECANISMO SOFÁ BAÚ", familia: "GERENCIAL", quantidade: 20, precoUnitario: "32,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67257",
      cliente: { codigo: "1702", nome: "CELSO JUNIO TEIXEIRA 12504226632" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "10/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "2572.11", codigoProduto: "2572", descricao: "PAR FLAME MDP 100X160X2,5 COM 70 LARGURA", familia: "GERENCIAL", quantidade: 25, precoUnitario: "10,50", descontoPercentual: 0 }
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67245_67257_09set" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }

  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
