import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67270_67271_10set",
  pedidos: [
    {
      codigoPedido: "67270",
      cliente: { codigo: "6", nome: "VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      possuiRET: false,
      itens: [
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "INDEFINIDA", quantidade: 750, precoUnitario: "1,26", descontoPercentual: 0 },
        { codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "INDEFINIDA", quantidade: 5000, precoUnitario: "0,043", descontoPercentual: 0 },
        { codigoOriginal: "4.1", codigoProduto: "4", descricao: "PAR DE CONECTOR ESCARIADO 1,9MM", familia: "INDEFINIDA", quantidade: 750, precoUnitario: "1,36", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67271",
      cliente: { codigo: "6", nome: "VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      possuiRET: false,
      itens: [
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "GERENCIAL", quantidade: 750, precoUnitario: "1,26", descontoPercentual: 0 },
        { codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "GERENCIAL", quantidade: 5000, precoUnitario: "0,043", descontoPercentual: 0 },
        { codigoOriginal: "4.1", codigoProduto: "4", descricao: "PAR DE CONECTOR ESCARIADO 1,9MM", familia: "GERENCIAL", quantidade: 750, precoUnitario: "1,36", descontoPercentual: 0 }
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67270_67271_10set" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }

  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
