import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_14set_1430",
  pedidos: [
    {
      codigoPedido: "67383",
      cliente: { codigo: "1094", nome: "DECORARE MOVEIS LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1925", codigoProduto: "1925", descricao: "PINO DE LATÃO COM CABEÇA DE 16 E CORPO DE 10MM", familia: "INDEFINIDA", quantidade: 20, precoUnitario: "8,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67388",
      cliente: { codigo: "10", nome: "M. S. R. PEREIRA & CIA LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 7 DIAS",
      prazos: [7],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3744.3", codigoProduto: "3744", descricao: "PÉ MONTREAL 15CM", familia: "GERENCIAL", quantidade: 93, precoUnitario: "21,70", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67398",
      cliente: { codigo: "69", nome: "WELLINGTON OLIVEIRA SOUZA 04427448623" },
      representante: "ANGELO",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "392.1", codigoProduto: "392", descricao: "SUPORTE INTERMEDIÁRIO", familia: "GERENCIAL", quantidade: 150, precoUnitario: "1,95", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67399",
      cliente: { codigo: "914", nome: "SANTRIN COMERCIO LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 7/14/21 DIAS",
      prazos: [7, 14, 21],
      dataLimite: "21/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "41", codigoProduto: "41", descricao: "GIRATORIA ALUMINIO G", familia: "GERENCIAL", quantidade: 20, precoUnitario: "31,70", descontoPercentual: 0 },
        { codigoOriginal: "3192.3", codigoProduto: "3192", descricao: "SAPATA GIRATORIA COM GARRA", familia: "GERENCIAL", quantidade: 10, precoUnitario: "50,00", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67400",
      cliente: { codigo: "1072", nome: "W L METAIS" },
      representante: "KESSE",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "22/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "3615", codigoProduto: "3615", descricao: "TAMPAO DE ACABAMENTO DE ALUMINIO 9.3 OU 10.1", familia: "GERENCIAL", quantidade: 40, precoUnitario: "1,85", descontoPercentual: 0, observacoes: "9.3" }
      ]
    },
    {
      codigoPedido: "67401",
      cliente: { codigo: "1096", nome: "TORNEARIA DO FRED" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "15/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "5229", codigoProduto: "5229", descricao: "CHAPA 2MM - 50MM X 50MM C/ 1 FURO CENTRAL DE 8MM", familia: "GERENCIAL", quantidade: 110, precoUnitario: "2,30", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67415",
      cliente: { codigo: "858", nome: "CONSUMIDOR FINAL" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 14 DIAS",
      prazos: [14],
      dataLimite: "14/09/2026",
      possuiRET: false,
      observacoes: "CLIENTE LEANDRO TOCANTINS",
      itens: [
        { codigoOriginal: "5512", codigoProduto: "5512", descricao: "CHAPA 1 - CHAPA 1/8 X 295 MM X 1195 MM", familia: "GERENCIAL", quantidade: 9, precoUnitario: "36,48", descontoPercentual: 0 },
        { codigoOriginal: "5513", codigoProduto: "5513", descricao: "CHAPA 2 - CHAPA 1/8 X 295 MM X 1995 MM", familia: "GERENCIAL", quantidade: 4, precoUnitario: "55,32", descontoPercentual: 0 },
        { codigoOriginal: "5514", codigoProduto: "5514", descricao: "CHAPA 3 - CHAPA 1/8 X 660 MM X 2115 MM", familia: "GERENCIAL", quantidade: 1, precoUnitario: "67,32", descontoPercentual: 0 },
        { codigoOriginal: "5515", codigoProduto: "5515", descricao: "CHAPA 4 - CHAPA 1/8 X 660 MM X 1195 MM", familia: "GERENCIAL", quantidade: 2, precoUnitario: "45,24", descontoPercentual: 0 },
        { codigoOriginal: "5516", codigoProduto: "5516", descricao: "CHAPA 5 - CHAPA 1/8 X 250 MM X 2114 MM", familia: "GERENCIAL", quantidade: 2, precoUnitario: "57,48", descontoPercentual: 0 },
        { codigoOriginal: "5517", codigoProduto: "5517", descricao: "CHAPA 6 - CHAPA 1/8 X 660 MM X 1324 MM", familia: "GERENCIAL", quantidade: 1, precoUnitario: "48,20", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67422",
      cliente: { codigo: "28", nome: "CORBELLI E PEREIRA LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      dataLimite: "14/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1653", codigoProduto: "1653", descricao: "TAMPO 300 MM CHAPA 1/8 COM FURO 1", familia: "INDEFINIDA", quantidade: 22, precoUnitario: "24,225", descontoPercentual: 5 }
      ]
    },
    {
      codigoPedido: "67424",
      cliente: { codigo: "793", nome: "MOVEIS MATOS E LOPES LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "BOLETO 7 DIAS",
      prazos: [7],
      dataLimite: "15/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1630", codigoProduto: "1630", descricao: "GIRATORIO ESFERA 195X195X2,5", familia: "INDEFINIDA", quantidade: 80, precoUnitario: "47,70", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67425",
      cliente: { codigo: "1709", nome: "ESTOFARIA TEIXEIRA RIOBRANCO LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30/45 DIAS",
      prazos: [30,45],
      dataLimite: "15/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1880.1", codigoProduto: "1880", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", familia: "GERENCIAL", quantidade: 500, precoUnitario: "1,00", descontoPercentual: 0 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 250, precoUnitario: "0,98", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67426",
      cliente: { codigo: "1318", nome: "F. F. INDUSTRIA DE ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "08/10/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "901", codigoProduto: "901", descricao: "CONECTOR IMPERIO", familia: "GERENCIAL", quantidade: 2000, precoUnitario: "0,72", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67427",
      cliente: { codigo: "1318", nome: "F. F. INDUSTRIA DE ESTOFADOS LTDA" },
      representante: "KESSE",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "23/10/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "901", codigoProduto: "901", descricao: "CONECTOR IMPERIO", familia: "GERENCIAL", quantidade: 2000, precoUnitario: "0,72", descontoPercentual: 0 }
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
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_14set_1430" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }
  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
