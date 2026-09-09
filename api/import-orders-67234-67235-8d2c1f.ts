import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67234_67235",
  pedidos: [
    {
      codigoPedido: "67234",
      cliente: { codigo: "1157", nome: "DDESING LTDA." },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 30/60/90",
      prazos: [30, 60, 90],
      dataLimite: "2026-09-25",
      possuiRET: false,
      itens: [
        { codigoOriginal: "4811.3", codigoProduto: "4811", descricao: "RODA GLIDER 60 CM", familia: "GERENCIAL", quantidade: 60, precoUnitario: "116,00", descontoPercentual: 0 },
        { codigoOriginal: "4809.3", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", familia: "GERENCIAL", quantidade: 100, precoUnitario: "113,00", descontoPercentual: 0 },
        { codigoOriginal: "2902", codigoProduto: "2902", descricao: "GIRATORIO ESFERA 332X332X2.5", familia: "GERENCIAL", quantidade: 80, precoUnitario: "93,00", descontoPercentual: 0 },
      ],
    },
    {
      codigoPedido: "67235",
      cliente: { codigo: "914", nome: "SANTRIN COMERCIO LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 7/14/21 DIAS",
      prazos: [7, 14, 21],
      dataLimite: "2026-09-17",
      possuiRET: false,
      itens: [
        { codigoOriginal: "304", codigoProduto: "304", descricao: "GIRATORIA ALUMINIO P", familia: "GERENCIAL", quantidade: 20, precoUnitario: "21,30", descontoPercentual: 0 },
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67234_67235" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }

  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
