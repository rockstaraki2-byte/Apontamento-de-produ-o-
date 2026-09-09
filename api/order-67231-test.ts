import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const payload = {
  origem: "TEKSYSTEM_TESTE_API",
  tenantId: "imperio",
  solicitadoPor: "ChatGPT teste API",
  pedidos: [
    {
      codigoPedido: "67231",
      cliente: {
        codigo: "1115",
        nome: "KAVIN ESTOFADOS LTDA",
      },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      promEntrega: "11/09/2026",
      previsao: "11/09/2026",
      possuiRET: false,
      observacoes: "Pedido TekSystem 67231 - emissão 09/09/2026 09:36:58",
      itens: [
        {
          codigoOriginal: "5484.3",
          descricao: "BASE MESA DECORATIVA KAVIN - TUBO DE 1/2\" C/ CHAPA 50X50",
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
  if (req.method !== "GET") return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });

  const mode = String(req.query?.mode || "validate").toLowerCase();
  const dryRun = mode !== "create";
  const repository = new FirestoreOrderImportRepository();

  try {
    const result = await processOrderImport(
      repository,
      payload,
      {
        tenantId: "imperio",
        origem: "TEKSYSTEM_TESTE_API",
        solicitadoPor: "ChatGPT teste API",
      },
      dryRun,
    );
    return res.status(200).json({ mode: dryRun ? "validate" : "create", ...result });
  } catch (error: any) {
    console.error("[OPS order 67231]", error);
    return res.status(500).json({ sucesso: false, erro: error?.message || "ERRO_INTERNO" });
  }
}
