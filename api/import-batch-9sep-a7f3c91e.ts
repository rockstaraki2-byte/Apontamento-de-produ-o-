import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_lote_09_set_manha",
  pedidos: [
    {
      codigoPedido: "67223",
      cliente: { codigo: "195", nome: "NATALIA DE OLIVEIRA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 14 DIAS",
      prazos: [14],
      dataLimite: "2026-09-09",
      possuiRET: false,
      observacoes: "",
      itens: [
        {
          codigoOriginal: "797.1",
          codigoProduto: "797",
          descricao: "SUPORTE BAIXO",
          familia: "GERENCIAL",
          quantidade: 500,
          precoUnitario: "1,58",
          descontoPercentual: 0,
        },
      ],
    },
    {
      codigoPedido: "67226",
      cliente: { codigo: "1072", nome: "W L METAIS" },
      representante: "KESSE",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "2026-09-14",
      possuiRET: false,
      observacoes: "",
      itens: [
        {
          codigoOriginal: "4420",
          codigoProduto: "4420",
          descricao: "FLANGE 300X3/16",
          familia: "GERENCIAL",
          quantidade: 2,
          precoUnitario: "41,90",
          descontoPercentual: 0,
        },
      ],
    },
    {
      codigoPedido: "67227",
      cliente: { codigo: "1626", nome: "FINE DECOR LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30/45/60",
      prazos: [30, 45, 60],
      dataLimite: "2026-09-11",
      possuiRET: false,
      observacoes: "",
      itens: [
        {
          codigoOriginal: "4809.3",
          codigoProduto: "4809",
          descricao: "RODA GLIDER 55 CM",
          familia: "GERENCIAL",
          quantidade: 10,
          precoUnitario: "120,20",
          descontoPercentual: 0,
        },
      ],
    },
    {
      codigoPedido: "67229",
      cliente: { codigo: "919", nome: "NYNA MARQUES INDUSTRIA E COMERCIO MOVEIS LIMITADA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [20, 40],
      dataLimite: "2026-09-10",
      possuiRET: false,
      observacoes: "",
      itens: [
        {
          codigoOriginal: "1880.1",
          codigoProduto: "1880",
          descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2",
          familia: "INDEFINIDA",
          quantidade: 500,
          precoUnitario: "1,15",
          descontoPercentual: 0,
        },
      ],
    },
    {
      codigoPedido: "67230",
      cliente: { codigo: "1089", nome: "MARTINS MATERIA PRIMA LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 30/45/60",
      prazos: [30, 45, 60],
      dataLimite: "2026-09-11",
      possuiRET: false,
      observacoes: "",
      itens: [
        {
          codigoOriginal: "2517.11",
          codigoProduto: "2517",
          descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA",
          familia: "GERENCIAL",
          quantidade: 2000,
          precoUnitario: "1,80",
          descontoPercentual: 0,
        },
        {
          codigoOriginal: "4224.11",
          codigoProduto: "4224",
          descricao: "BARRA CHATA REFORÇO 45 CM 2 FUROS - PERFILADA",
          familia: "GERENCIAL",
          quantidade: 600,
          precoUnitario: "1,60",
          descontoPercentual: 0,
        },
      ],
    },
    {
      codigoPedido: "67231",
      cliente: { codigo: "1115", nome: "KAVIN ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "2026-09-11",
      possuiRET: false,
      observacoes: "",
      itens: [
        {
          codigoOriginal: "5484.3",
          codigoProduto: "5484",
          descricao: "BASE MESA DECORATIVA KAVIN - TUBO DE 1/2 C/ CHAPA 50X50",
          familia: "GERENCIAL",
          quantidade: 1,
          precoUnitario: "23,90",
          descontoPercentual: 0,
        },
      ],
    },
  ],
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false, erro: "Método não permitido." });
  }

  const repository = new FirestoreOrderImportRepository();
  const meta = {
    tenantId: "imperio",
    origem: "TEKSYSTEM_PDF",
    solicitadoPor: "chatgpt_lote_09_set_manha",
  };

  const validacao = await processOrderImport(repository, payload, meta, true);
  const possuiErro = validacao.resultados.some((r) => r.status === "ERRO");
  if (possuiErro) {
    return res.status(422).json({ sucesso: false, fase: "VALIDACAO", validacao });
  }

  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ sucesso: importacao.sucesso, fase: "IMPORTACAO", validacao, importacao });
}
