import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67357_67375_11set",
  pedidos: [
    {
      codigoPedido: "67357",
      cliente: { codigo: "1853", nome: "A. S. TEIXEIRA E CIA LTDA" },
      representante: "KESSE",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "11/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "961.3", codigoProduto: "961", descricao: "SUPORTE DE TV KIT COMPLETO", familia: "INDEFINIDA", quantidade: 378, precoUnitario: "2,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67360",
      cliente: { codigo: "1853", nome: "A. S. TEIXEIRA E CIA LTDA" },
      representante: "KESSE",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "11/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "961.3", codigoProduto: "961", descricao: "SUPORTE DE TV KIT COMPLETO", familia: "GERENCIAL", quantidade: 284, precoUnitario: "8,5185", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67363",
      cliente: { codigo: "28", nome: "CORBELLI E PEREIRA LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "04/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "4050", codigoProduto: "4050", descricao: "ARRUELA PLANA 7/8 SEM FURO NA CHAPA 1/8", familia: "INDEFINIDA", quantidade: 46, precoUnitario: "0,45", descontoPercentual: 5 }
      ]
    },
    {
      codigoPedido: "67367",
      cliente: { codigo: "1189", nome: "KESSE JONES FIALHO" },
      representante: "",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "11/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "961.3", codigoProduto: "961", descricao: "SUPORTE DE TV KIT COMPLETO", familia: "INDEFINIDA", quantidade: 378, precoUnitario: "2,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67372",
      cliente: { codigo: "12", nome: "ARAUCARIA MOVEIS E COMPONENTES LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 30/45 DIAS",
      prazos: [30,45],
      dataLimite: "21/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3729.1", codigoProduto: "3729", descricao: "CHAPA CAROLINA 100 X 100 X 2MM", familia: "INDEFINIDA", quantidade: 2000, precoUnitario: "3,63", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67373",
      cliente: { codigo: "6", nome: "VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "18/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "5511.3", codigoProduto: "5511", descricao: "PAR PÉ COM RETORNO AUTOMÁTICO 19CM", familia: "INDEFINIDA", quantidade: 60, precoUnitario: "36,56", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67375",
      cliente: { codigo: "12", nome: "ARAUCARIA MOVEIS E COMPONENTES LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 30/45 DIAS",
      prazos: [30,45],
      dataLimite: "11/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3192.3", codigoProduto: "3192", descricao: "SAPATA GIRATORIA COM GARRA", familia: "INDEFINIDA", quantidade: 8, precoUnitario: "50,00", descontoPercentual: 0 }
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67357_67375_11set" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }
  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
