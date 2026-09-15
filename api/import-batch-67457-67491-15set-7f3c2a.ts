import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const payload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  pedidos: [
    {
      codigoPedido: "67457",
      cliente: { codigo: 1667, nome: "BRAGA ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "PIX",
      prazos: [],
      comNotaFiscal: false,
      observacoes: "Status TekSystem: DOCUMENTO FATURADO",
      itens: [
        { codigoOriginal: "4809.3", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", familia: "GERENCIAL", quantidade: 1, precoUnitario: "120,20" }
      ]
    },
    {
      codigoPedido: "67480",
      cliente: { codigo: 10, nome: "M. S. R. PEREIRA & CIA LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO",
      prazos: [7],
      comNotaFiscal: false,
      observacoes: "Status TekSystem: DOCUMENTO FATURADO",
      itens: [
        { codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "GERENCIAL", quantidade: 10000, precoUnitario: "0,043" }
      ]
    },
    {
      codigoPedido: "67483",
      cliente: { codigo: 1755, nome: "V A MOVELARIA LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO",
      prazos: [30],
      comNotaFiscal: false,
      previsao: "18/09/2026",
      promEntrega: "18/09/2026",
      itens: [
        { codigoOriginal: "3074.1", codigoProduto: "3074", descricao: "PINÇA PARA POLTRONA", familia: "GERENCIAL", quantidade: 4000, precoUnitario: "0,75" }
      ]
    },
    {
      codigoPedido: "67484",
      cliente: { codigo: 944, nome: "I P ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO",
      prazos: [30,45,60],
      comNotaFiscal: true,
      previsao: "18/09/2026",
      promEntrega: "18/09/2026",
      itens: [
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "INDEFINIDA", quantidade: 2000, precoUnitario: "1,15" },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "INDEFINIDA", quantidade: 1000, precoUnitario: "0,98" },
        { codigoOriginal: "2459.11", codigoProduto: "2459", descricao: "BARRA CHATA REFORÇO 50 CM 2 FUROS - PERFILADA", familia: "INDEFINIDA", quantidade: 1000, precoUnitario: "1,65" }
      ]
    },
    {
      codigoPedido: "67485",
      cliente: { codigo: 833, nome: "ELLO INDUSTRIA E COMERCIO DE MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO",
      prazos: [30],
      comNotaFiscal: false,
      previsao: "21/09/2026",
      promEntrega: "21/09/2026",
      itens: [
        { codigoOriginal: "5525.12", codigoProduto: "5525", descricao: "MESA LATERAL GALI - ELLO", familia: "GERENCIAL", quantidade: 1, precoUnitario: "93,50" },
        { codigoOriginal: "5526.12", codigoProduto: "5526", descricao: "MESA DE CENTRO GALI - ELLO", familia: "GERENCIAL", quantidade: 1, precoUnitario: "91,50" }
      ]
    },
    {
      codigoPedido: "67486",
      cliente: { codigo: 683, nome: "KASA COMIGO ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO",
      prazos: [30,45,60],
      comNotaFiscal: false,
      previsao: "21/09/2026",
      promEntrega: "21/09/2026",
      itens: [
        { codigoOriginal: "2459.11", codigoProduto: "2459", descricao: "BARRA CHATA REFORÇO 50 CM 2 FUROS - PERFILADA", familia: "GERENCIAL", quantidade: 4000, precoUnitario: "1,60" },
        { codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "GERENCIAL", quantidade: 10000, precoUnitario: "0,043" }
      ]
    },
    {
      codigoPedido: "67487",
      cliente: { codigo: 1290, nome: "STANZIOLA MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO",
      prazos: [25,55,70],
      comNotaFiscal: false,
      previsao: "21/09/2026",
      promEntrega: "21/09/2026",
      itens: [
        { codigoOriginal: "2787.11", codigoProduto: "2787", descricao: "PAR DE MECANISMO RETRÁTIL METAL 105 CM", familia: "GERENCIAL", quantidade: 50, precoUnitario: "15,00" },
        { codigoOriginal: "3730.11", codigoProduto: "3730", descricao: "BARRA CHATA REFORÇO 5/8X1/8 50CM 2 FUROS - MODELO C/ CURVA", familia: "GERENCIAL", quantidade: 100, precoUnitario: "2,40" },
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "GERENCIAL", quantidade: 500, precoUnitario: "1,15" }
      ]
    },
    {
      codigoPedido: "67488",
      cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [60],
      comNotaFiscal: false,
      previsao: "16/09/2026",
      promEntrega: "16/09/2026",
      itens: [
        { codigoOriginal: "287", codigoProduto: "287", descricao: "SUPORTE BAIXO DE PLASTICO", familia: "GERENCIAL", quantidade: 1200, precoUnitario: "1,30", descontoPercentual: 15 }
      ]
    },
    {
      codigoPedido: "67489",
      cliente: { codigo: 248, nome: "TUBULARES GOL INDUSTRIA E TRANSPORTE DE MOVEIS EIRELI" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO",
      prazos: [30],
      comNotaFiscal: false,
      previsao: "16/09/2026",
      promEntrega: "16/09/2026",
      itens: [
        { codigoOriginal: "5527", codigoProduto: "5527", descricao: "CHAPA TUBULARES GOL - CHAPA 1/8\" X 200 MM X 70 MM C/ 8 FUROS", familia: "GERENCIAL", quantidade: 100, precoUnitario: "7,23" }
      ]
    },
    {
      codigoPedido: "67490",
      cliente: { codigo: 1031, nome: "MARTO MOVEIS LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO",
      prazos: [30,60],
      comNotaFiscal: false,
      previsao: "23/09/2026",
      promEntrega: "23/09/2026",
      itens: [
        { codigoOriginal: "4072.3", codigoProduto: "4072", descricao: "BASE CADEIRA LAZIO", familia: "GERENCIAL", quantidade: 6, precoUnitario: "192,50" }
      ]
    },
    {
      codigoPedido: "67491",
      cliente: { codigo: 1554, nome: "MJ COMERCIO DIGITAL LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "PIX",
      prazos: [],
      comNotaFiscal: true,
      previsao: "23/09/2026",
      promEntrega: "23/09/2026",
      itens: [
        { codigoOriginal: "2806.3", codigoProduto: "2806", descricao: "PÉ ZEUS - A2 (ALTURA DA CHAPINHA) 15 CM - A1 (ALTURA TOTAL) 25 CM", familia: "INDEFINIDA", quantidade: 100, precoUnitario: "17,64", descontoPercentual: 5 },
        { codigoOriginal: "4809.3", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", familia: "INDEFINIDA", quantidade: 50, precoUnitario: "120,20", descontoPercentual: 5 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "INDEFINIDA", quantidade: 1500, precoUnitario: "0,98", descontoPercentual: 5 },
        { codigoOriginal: "9", codigoProduto: "9", descricao: "SUPORTE QUADRADO", familia: "INDEFINIDA", quantidade: 400, precoUnitario: "1,36", descontoPercentual: 5 },
        { codigoOriginal: "3873.3", codigoProduto: "3873", descricao: "BASE PALERMO", familia: "INDEFINIDA", quantidade: 10, precoUnitario: "177,00", descontoPercentual: 5 },
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "INDEFINIDA", quantidade: 500, precoUnitario: "1,15", descontoPercentual: 5 }
      ]
    }
  ]
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }
  try {
    const repository = new FirestoreOrderImportRepository();
    const meta = { tenantId: "imperio", origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date("2026-09-15T15:11:00-03:00") };
    const validation = await processOrderImport(repository, payload, meta, true);
    const errors = validation.resultados.filter((r: any) => r.status === "ERRO");
    if (errors.length) return res.status(422).json({ sucesso: false, fase: "VALIDACAO", validation });
    const imported = await processOrderImport(repository, payload, meta, false);
    return res.status(200).json({ sucesso: true, fase: "IMPORTACAO", validation, imported });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error?.message || String(error) });
  }
}
