import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67282_67301_10set",
  pedidos: [
    {
      codigoPedido: "67282",
      cliente: { codigo: "1008", nome: "C & M DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "10/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "5354", codigoProduto: "5354", descricao: "CHAPA 1/8 X 460 MM X 50 MM C/ ENCAIXE", familia: "INDEFINIDA", quantidade: 100, precoUnitario: "8,23", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67285",
      cliente: { codigo: "1290", nome: "STANZIOLA MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO A PRAZO",
      prazos: [25,55,70],
      dataLimite: "10/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "2787.11", codigoProduto: "2787", descricao: "PAR DE MECANISMO RETRÁTIL METAL 105 CM", familia: "GERENCIAL", quantidade: 9, precoUnitario: "15,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67296",
      cliente: { codigo: "1717", nome: "MAIS MOVEIS E ESTOFADOS LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "10/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "5191.3", codigoProduto: "5191", descricao: "KIT 8 MAVERICK A1-13CM A2-15CM + 2 CENTRAL REDONDO 14CM", familia: "INDEFINIDA", quantidade: 12, precoUnitario: "149,40", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67298",
      cliente: { codigo: "461", nome: "FEITAL E GASPARONI ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "30/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3932.3", codigoProduto: "3932", descricao: "PÉ LATERAL RETO 1 12CM", familia: "GERENCIAL", quantidade: 400, precoUnitario: "8,75", descontoPercentual: 0 },
        { codigoOriginal: "5358.3", codigoProduto: "5358", descricao: "PÉ CENTRAL C/ RETORNO AUTOMÁTICO 22CM C/ SAPATA DE REGULAGEM", familia: "GERENCIAL", quantidade: 250, precoUnitario: "22,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67301",
      cliente: { codigo: "1300", nome: "BEL INDUSTRIA DE MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 7 DIAS",
      prazos: [7],
      dataLimite: "21/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "4634.3", codigoProduto: "4634", descricao: "PÉ CENTRAL 20 CM C/ CHAPA MAIOR", familia: "GERENCIAL", quantidade: 60, precoUnitario: "9,00", descontoPercentual: 3 }
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67282_67301_10set" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }
  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
