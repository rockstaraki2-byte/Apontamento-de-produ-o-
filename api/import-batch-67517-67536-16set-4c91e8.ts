import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const payload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  pedidos: [
    {
      codigoPedido: "67517",
      cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 14 DIAS",
      prazos: [14],
      comNotaFiscal: false,
      dataLimite: "2026-09-16",
      observacoes: "CLIENTE SERRA VERDE - ORC 042",
      itens: [
        { codigoOriginal: "5528", codigoProduto: "5528", descricao: "CHAPA U_1 C/ DOBRA - CHAPA 1/8\" X 121.55 MM X 25 MM", familia: "GERENCIAL", quantidade: 1, precoUnitario: 15.08 },
        { codigoOriginal: "5529", codigoProduto: "5529", descricao: "CHAPA U_2 C/ DOBRA - CHAPA 1/8\" X 115 MM X 25 MM", familia: "GERENCIAL", quantidade: 1, precoUnitario: 14.63 },
        { codigoOriginal: "5530", codigoProduto: "5530", descricao: "CHAPA MAIOR C/ DOBRA - CHAPA 1/16\" X 304 MM X 180 MM", familia: "GERENCIAL", quantidade: 1, precoUnitario: 72.06 },
        { codigoOriginal: "5531", codigoProduto: "5531", descricao: "CHAPA REFORÇO - CHAPA 1/16\" X 187 MM X 25 MM", familia: "GERENCIAL", quantidade: 2, precoUnitario: 8.04 }
      ]
    },
    {
      codigoPedido: "67520",
      cliente: { codigo: 8, nome: "LE ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30/45 DIAS",
      prazos: [30,45],
      comNotaFiscal: true,
      dataLimite: "2026-09-18",
      itens: [
        { codigoOriginal: "1.1", codigoProduto: "1", descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE", familia: "INDEFINIDA", quantidade: 3000, precoUnitario: 1.15 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "INDEFINIDA", quantidade: 2000, precoUnitario: 0.98 }
      ]
    },
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
      codigoPedido: "67523",
      cliente: { codigo: 1045, nome: "VIDRACARIA DIOGO LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      comNotaFiscal: false,
      dataLimite: "2026-09-23",
      itens: [
        { codigoOriginal: "2827.1", codigoProduto: "2827", descricao: "CANTONEIRA MEDIA", familia: "GERENCIAL", quantidade: 200, precoUnitario: 1.90 },
        { codigoOriginal: "5532", codigoProduto: "5532", descricao: "PUXADOR - CHAPA 1/8\" X 100 MM X 87 MM", familia: "GERENCIAL", quantidade: 100, precoUnitario: 5.90 }
      ]
    },
    {
      codigoPedido: "67524",
      cliente: { codigo: 1116, nome: "FATTO ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30/45/60",
      prazos: [30,45,60],
      comNotaFiscal: false,
      dataLimite: "2026-09-18",
      itens: [
        { codigoOriginal: "2459.11", codigoProduto: "2459", descricao: "BARRA CHATA REFORÇO 50 CM 2 FUROS - PERFILADA", familia: "GERENCIAL", quantidade: 1000, precoUnitario: 1.65 }
      ]
    },
    {
      codigoPedido: "67525",
      cliente: { codigo: 1471, nome: "F.A.M. CARVALHO ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      comNotaFiscal: false,
      dataLimite: "2026-09-16",
      itens: [
        { codigoOriginal: "1880.1", codigoProduto: "1880", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", familia: "GERENCIAL", quantidade: 2000, precoUnitario: 1.00 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 250, precoUnitario: 0.98 }
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
      codigoPedido: "67532",
      cliente: { codigo: 1008, nome: "C & M DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      comNotaFiscal: true,
      dataLimite: "2026-09-22",
      itens: [
        { codigoOriginal: "5354", codigoProduto: "5354", descricao: "CHAPA 1/8\" X 460 MM X 50 MM C/ ENCAIXE", familia: "INDEFINIDA", quantidade: 200, precoUnitario: 8.23 },
        { codigoOriginal: "5533", codigoProduto: "5533", descricao: "CHAPA 2 FUROS CM DECOR - CHAPA 1/8\" X 60 MM X 20 MM", familia: "INDEFINIDA", quantidade: 100, precoUnitario: 1.70 }
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
    },
    {
      codigoPedido: "67536",
      cliente: { codigo: 1478, nome: "CYRNE DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30/45/60",
      prazos: [30,45,60],
      comNotaFiscal: true,
      dataLimite: "2026-09-23",
      itens: [
        { codigoOriginal: "3908", codigoProduto: "3908", descricao: "CHAPA 3/16 - ACABAMENTO SUPERIOR DELFOS", familia: "INDEFINIDA", quantidade: 47, precoUnitario: 1.49 },
        { codigoOriginal: "4015", codigoProduto: "4015", descricao: "CHAPA 3/16 - BASE LATERAL DELFOS", familia: "INDEFINIDA", quantidade: 47, precoUnitario: 4.86 },
        { codigoOriginal: "4517", codigoProduto: "4517", descricao: "CHAPA 1/4 - PÉ ESQ POLT. ORACULO", familia: "INDEFINIDA", quantidade: 14, precoUnitario: 54.51 },
        { codigoOriginal: "4515", codigoProduto: "4515", descricao: "CHAPA 1/8 - ARO APOIO POLT. ORACULO", familia: "INDEFINIDA", quantidade: 28, precoUnitario: 0.98 },
        { codigoOriginal: "4454", codigoProduto: "4454", descricao: "CHAPA 3/16 - BASE M. CENTRO TRIVIUM P", familia: "INDEFINIDA", quantidade: 5, precoUnitario: 6.90 },
        { codigoOriginal: "4455", codigoProduto: "4455", descricao: "CHAPA 3/16 - BASE M. CENTRO TRIVIUM G", familia: "INDEFINIDA", quantidade: 3, precoUnitario: 8.33 },
        { codigoOriginal: "5138", codigoProduto: "5138", descricao: "CHAPA 3/16 - BASE MAIOR LATERAL ÁUREA P", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.16 },
        { codigoOriginal: "5165", codigoProduto: "5165", descricao: "CHAPA 3/16 - BASE MAIOR LATERAL ÁUREA G", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.24 },
        { codigoOriginal: "5139", codigoProduto: "5139", descricao: "CHAPA 3/16 - BASE MENOR LATERAL ÁUREA P", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.22 },
        { codigoOriginal: "5166", codigoProduto: "5166", descricao: "CHAPA 3/16 - BASE MENOR LATERAL ÁUREA G", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.18 },
        { codigoOriginal: "5167", codigoProduto: "5167", descricao: "CHAPA 3/16 - TAMPO D400MM LATERAL AUREA AÇO", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 5.00 },
        { codigoOriginal: "5168", codigoProduto: "5168", descricao: "CHAPA 3/16 - TAMPO D550MM LATERAL AUREA G", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 6.62 },
        { codigoOriginal: "5393", codigoProduto: "5393", descricao: "CHAPA 1/4\" - BASE LATERAL ORION P/G", familia: "INDEFINIDA", quantidade: 12, precoUnitario: 5.38 },
        { codigoOriginal: "5392", codigoProduto: "5392", descricao: "CHAPA 1/4\" - BASE LATERAL ORION M", familia: "INDEFINIDA", quantidade: 10, precoUnitario: 5.94 },
        { codigoOriginal: "5219", codigoProduto: "5219", descricao: "CHAPA 1/8\" - BRAÇO DIR CADEIRA OUTONO - DOB", familia: "INDEFINIDA", quantidade: 26, precoUnitario: 3.44 },
        { codigoOriginal: "5216", codigoProduto: "5216", descricao: "CHAPA 1/8\" - CTPO M. LAT. CAFÉ", familia: "INDEFINIDA", quantidade: 110, precoUnitario: 3.47 },
        { codigoOriginal: "5202", codigoProduto: "5202", descricao: "CHAPA 3/16\" - BASE M.LATERAL CAFÉ", familia: "INDEFINIDA", quantidade: 55, precoUnitario: 8.00 },
        { codigoOriginal: "5457", codigoProduto: "5457", descricao: "CHAPA 1/8\" - BASE M.LATERAL CAFÉ", familia: "INDEFINIDA", quantidade: 110, precoUnitario: 3.37 },
        { codigoOriginal: "5535", codigoProduto: "5535", descricao: "CHAPA 3/16\" - UNIÃO TAMPO M. LATERAL CAFÉ", familia: "INDEFINIDA", quantidade: 55, precoUnitario: 8.00 },
        { codigoOriginal: "4287", codigoProduto: "4287", descricao: "CHAPA 1/8\" CONTRATAMPO ALESSIA/ESTHER", familia: "INDEFINIDA", quantidade: 8, precoUnitario: 10.13 }
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
    const meta = {
      tenantId: "imperio",
      origem: "CHATGPT_PDF",
      solicitadoPor: "raul",
      now: new Date("2026-09-16T11:07:00-03:00"),
    };

    const validation = await processOrderImport(repository, payload, meta, true);
    if (!validation.sucesso || validation.resumo.comErro > 0) {
      return res.status(422).json({ sucesso: false, fase: "VALIDACAO", validation });
    }

    const imported = await processOrderImport(repository, payload, meta, false);
    return res.status(imported.sucesso ? 200 : 422).json({
      sucesso: imported.sucesso,
      fase: "IMPORTACAO",
      validation,
      imported,
    });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error?.message || String(error) });
  }
}
