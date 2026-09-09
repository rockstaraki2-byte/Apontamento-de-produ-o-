import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedido_67244",
  pedidos: [
    {
      codigoPedido: "67244",
      cliente: { codigo: "922", nome: "INDUSTRIA BENATTI INOX RIO BRANCO LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "2026-09-10",
      possuiRET: false,
      itens: [
        {
          codigoOriginal: "2816",
          codigoProduto: "2816",
          descricao: "CASTELO 10X14",
          familia: "GERENCIAL",
          quantidade: 2,
          precoUnitario: "899,08",
          descontoPercentual: 0
        }
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
  const meta = {
    tenantId: "imperio",
    origem: "TEKSYSTEM_PDF",
    solicitadoPor: "chatgpt_pedido_67244"
  };

  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }

  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
