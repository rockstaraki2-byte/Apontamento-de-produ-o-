import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";

const orders: any[] = [
  {
    codigoPedido: "68025",
    cliente: { codigo: 18, nome: "LUIZ ROBERTO PEREIRA 51477548653" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "BOLETO 30/45 DIAS",
    prazos: [30, 45],
    comNotaFiscal: false,
    promEntrega: "2026-09-17",
    previsao: "",
    observacoes: "STATUS NO PDF: DOCUMENTO FATURADO",
    itens: [
      {
        codigoOriginal: "4598.3",
        codigoProduto: "4598",
        descricao: "CARRINHO DE BEBIDA",
        familia: "GERENCIAL",
        quantidade: 1,
        precoUnitario: 265.02,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "68026",
    cliente: { codigo: 72, nome: "WTEK" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "CARTEIRA",
    prazos: [30],
    comNotaFiscal: false,
    promEntrega: "2026-07-31",
    previsao: "",
    observacoes: "STATUS NO PDF: DOCUMENTO FATURADO",
    itens: [
      {
        codigoOriginal: "3145.3",
        codigoProduto: "3145",
        descricao: "BASE DE APOIO COSTELA",
        familia: "GERENCIAL",
        quantidade: 29,
        precoUnitario: 62.00,
        descontoPercentual: 0
      },
      {
        codigoOriginal: "3151.3",
        codigoProduto: "3151",
        descricao: "BASE POLTRONA COSTELA",
        familia: "GERENCIAL",
        quantidade: 5,
        precoUnitario: 82.00,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "68027",
    cliente: { codigo: 945, nome: "CASA VENERE FABRICACAO E COMERCIO DE MOVEIS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: false,
    promEntrega: "2026-09-30",
    previsao: "2026-09-30",
    observacoes: "STATUS NO PDF: DOCUMENTO FATURADO",
    itens: [
      {
        codigoOriginal: "9",
        codigoProduto: "9",
        descricao: "SUPORTE QUADRADO",
        familia: "GERENCIAL",
        quantidade: 200,
        precoUnitario: 1.26,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "68048",
    cliente: { codigo: 1256, nome: "NFH DESIGN LTDA" },
    representante: "LILIAN",
    formaPagamento: "BOLETO A PRAZO",
    prazos: [28],
    comNotaFiscal: true,
    promEntrega: "2026-10-09",
    previsao: "2026-10-09",
    observacoes: "STATUS NO PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "3145.3",
        codigoProduto: "3145",
        descricao: "BASE DE APOIO COSTELA",
        familia: "INDEFINIDA",
        quantidade: 5,
        precoUnitario: 108.37,
        descontoPercentual: 0
      },
      {
        codigoOriginal: "3151.3",
        codigoProduto: "3151",
        descricao: "BASE POLTRONA COSTELA",
        familia: "INDEFINIDA",
        quantidade: 6,
        precoUnitario: 77.00,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "68049",
    cliente: { codigo: 1749, nome: "VITOR DA SILVEIRA HENRIQUES" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "PIX A VISTA",
    prazos: [],
    comNotaFiscal: true,
    promEntrega: "2026-10-07",
    previsao: "2026-10-07",
    observacoes: "STATUS NO PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "3193.3",
        codigoProduto: "3193",
        descricao: "SAPATA GIRATORIA COMUM",
        familia: "INDEFINIDA",
        quantidade: 20,
        precoUnitario: 50.00,
        descontoPercentual: 0
      },
      {
        codigoOriginal: "3128.3",
        codigoProduto: "3128",
        descricao: "ARGOLA 40 CM 4 FUROS EXTERNO",
        familia: "INDEFINIDA",
        quantidade: 20,
        precoUnitario: 20.00,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "68052",
    cliente: { codigo: 307, nome: "JEFFERSON DA SILVA DELAZARI" },
    representante: "ANDRE MILLENIUM REPRESENTAÇÕES",
    formaPagamento: "BOLETO A PRAZO",
    prazos: [28],
    comNotaFiscal: false,
    promEntrega: "2026-10-08",
    previsao: "2026-10-08",
    observacoes: "STATUS NO PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "4811.3",
        codigoProduto: "4811",
        descricao: "RODA GLIDER 60 CM",
        familia: "GERENCIAL",
        quantidade: 6,
        precoUnitario: 140.90,
        descontoPercentual: 0,
        observacoes: "GIRATORIA DE 256 X 256"
      },
      {
        codigoOriginal: "4810.3",
        codigoProduto: "4810",
        descricao: "RODA GLIDER 50 CM",
        familia: "GERENCIAL",
        quantidade: 20,
        precoUnitario: 130.30,
        descontoPercentual: 0,
        observacoes: "GIRATORIA DE 256 X 256"
      },
      {
        codigoOriginal: "4810.3",
        codigoProduto: "4810",
        descricao: "RODA GLIDER 50 CM",
        familia: "GERENCIAL",
        quantidade: 20,
        precoUnitario: 113.00,
        descontoPercentual: 0,
        observacoes: "GIRATORIA DE 195 X 195"
      }
    ]
  },
  {
    codigoPedido: "68053",
    cliente: { codigo: 307, nome: "JEFFERSON DA SILVA DELAZARI" },
    representante: "ANDRE MILLENIUM REPRESENTAÇÕES",
    formaPagamento: "BOLETO A PRAZO",
    prazos: [28],
    comNotaFiscal: false,
    previsao: "",
    observacoes: "STATUS NO PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "4810.4",
        codigoProduto: "4810",
        descricao: "RODA GLIDER 50 CM",
        familia: "GERENCIAL",
        quantidade: 20,
        precoUnitario: 113.00,
        descontoPercentual: 0,
        observacoes: "GIRATORIA DE 195 X 195"
      }
    ]
  }
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  const dryRun = String(req.query?.dryRun || "").toLowerCase() === "true";
  const payload = {
    origem: "CHATGPT_GOOGLE_DRIVE_PDF",
    tenantId,
    solicitadoPor: "raul",
    pedidos: orders,
  };

  const result = await processOrderImport(
    new FirestoreOrderImportRepository(),
    payload as any,
    { tenantId, origem: payload.origem, solicitadoPor: payload.solicitadoPor },
    dryRun,
  );

  return res.status(result.resumo.comErro > 0 ? 207 : 200).json(result);
}
