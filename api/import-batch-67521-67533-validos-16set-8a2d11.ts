import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const payload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  pedidos: [
    {
      codigoPedido: "67521",
      cliente: { codigo: 1326, nome: "VITOR MANOEL RIBEIRO ALVES 06494117651" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30/45/60",
      prazos: [30,45,60],
      comNotaFiscal: true,
      dataLimite: "2026-09-17",
      itens: [
        { codigoOriginal: "2459.11", codigoProduto: "2459", descricao: "BARRA CHATA REFORÇO 50 CM 2 FUROS - PERFILADA", familia: "INDEFINIDA", quantidade: 1000, precoUnitario: 1.65 },
        { codigoOriginal: "901", codigoProduto: "901", descricao: "CONECTOR IMPERIO", familia: "INDEFINIDA", quantidade: 1250, precoUnitario: 0.72 }
      ]
    },
    {
      codigoPedido: "67526",
      cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [60],
      comNotaFiscal: false,
      dataLimite: "2026-09-16",
      itens: [
        { codigoOriginal: "287", codigoProduto: "287", descricao: "SUPORTE BAIXO DE PLASTICO", familia: "GERENCIAL", quantidade: 250, precoUnitario: 1.30, descontoPercentual: 15 },
        { codigoOriginal: "2459.11", codigoProduto: "2459", descricao: "BARRA CHATA REFORÇO 50 CM 2 FUROS - PERFILADA", familia: "GERENCIAL", quantidade: 100, precoUnitario: 1.26, descontoPercentual: 15 },
        { codigoOriginal: "3191.3", codigoProduto: "3191", descricao: "PÉ MADRÍ 15 CM", familia: "GERENCIAL", quantidade: 4, precoUnitario: 17.00, descontoPercentual: 15 },
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "GERENCIAL", quantidade: 500, precoUnitario: 1.18, descontoPercentual: 15 },
        { codigoOriginal: "9", codigoProduto: "9", descricao: "SUPORTE QUADRADO", familia: "GERENCIAL", quantidade: 200, precoUnitario: 1.26, descontoPercentual: 15 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 1500, precoUnitario: 0.98, descontoPercentual: 15 },
        { codigoOriginal: "4811.3", codigoProduto: "4811", descricao: "RODA GLIDER 60 CM", familia: "GERENCIAL", quantidade: 1, precoUnitario: 116.40, descontoPercentual: 15 }
      ]
    },
    {
      codigoPedido: "67527",
      cliente: { codigo: 1563, nome: "ZURC INTERIORES LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      comNotaFiscal: true,
      dataLimite: "2026-09-16",
      itens: [
        { codigoOriginal: "3829.1", codigoProduto: "3829", descricao: "CHAPA 2 FUROS BP", familia: "INDEFINIDA", quantidade: 500, precoUnitario: 0.21, descontoPercentual: 9 }
      ]
    },
    {
      codigoPedido: "67533",
      cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [60],
      comNotaFiscal: false,
      dataLimite: "2026-09-16",
      itens: [
        { codigoOriginal: "4051.1", codigoProduto: "4051", descricao: "PINÇA MENOR", familia: "GERENCIAL", quantidade: 20, precoUnitario: 0.70, descontoPercentual: 15 },
        { codigoOriginal: "958.1", codigoProduto: "958", descricao: "ENCAIXE U PARA POLTRONA", familia: "GERENCIAL", quantidade: 45, precoUnitario: 1.32, descontoPercentual: 15 },
        { codigoOriginal: "1281", codigoProduto: "1281", descricao: "CHAPA ENCOSTO POLTRONA 80° GRAUS", familia: "GERENCIAL", quantidade: 40, precoUnitario: 1.37, descontoPercentual: 15 }
      ]
    }
  ]
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  try {
    const repository = new FirestoreOrderImportRepository();
    const meta = { tenantId: "imperio", origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date("2026-09-16T11:07:00-03:00") };
    const validation = await processOrderImport(repository, payload, meta, true);
    if (!validation.sucesso || validation.resumo.comErro > 0 || validation.resumo.validos !== 4) {
      return res.status(422).json({ sucesso: false, fase: "VALIDACAO", validation });
    }
    const imported = await processOrderImport(repository, payload, meta, false);
    return res.status(imported.sucesso ? 200 : 422).json({ sucesso: imported.sucesso, fase: "IMPORTACAO", validation, imported });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error?.message || String(error) });
  }
}
