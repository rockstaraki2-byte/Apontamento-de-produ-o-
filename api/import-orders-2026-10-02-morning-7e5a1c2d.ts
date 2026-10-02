import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";
const orders: any[] = [
  {
    "codigoPedido": "68162",
    "cliente": {
      "codigo": 127,
      "nome": "DANIEL DE PAIVA DE MAGALHAES & CIA LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "DEPOSITO 10 DIAS",
    "prazos": [
      10
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-09",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "507",
        "codigoProduto": "507",
        "descricao": "PRESILHA PARA MOLA",
        "familia": "GERENCIAL",
        "quantidade": 100000,
        "precoUnitario": 0.04
      }
    ]
  },
  {
    "codigoPedido": "68164",
    "cliente": {
      "codigo": 1123,
      "nome": "M.R. DECOR LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "BOLETO A PRAZO",
    "prazos": [
      15,
      30,
      45,
      60,
      75
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-05",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "1880.1",
        "codigoProduto": "1880",
        "descricao": "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2",
        "familia": "GERENCIAL",
        "quantidade": 1000,
        "precoUnitario": 1
      },
      {
        "codigoOriginal": "2739.1",
        "codigoProduto": "2739",
        "descricao": "PAR DE CONECTOR ESCARIADO 1,5MM",
        "familia": "GERENCIAL",
        "quantidade": 500,
        "precoUnitario": 0.98
      }
    ]
  },
  {
    "codigoPedido": "68165",
    "cliente": {
      "codigo": 1123,
      "nome": "M.R. DECOR LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "BOLETO A PRAZO",
    "prazos": [
      15,
      30,
      45,
      60,
      75
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-12",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "3108.11",
        "codigoProduto": "3108",
        "descricao": "PAR DE MECANISMO RETRÁTIL METAL 85 CM",
        "familia": "GERENCIAL",
        "quantidade": 300,
        "precoUnitario": 14.2
      },
      {
        "codigoOriginal": "2962.11",
        "codigoProduto": "2962",
        "descricao": "PAR DE MECANISMO RETRÁTIL METAL 65 CM",
        "familia": "GERENCIAL",
        "quantidade": 300,
        "precoUnitario": 12.7
      }
    ]
  },
  {
    "codigoPedido": "68166",
    "cliente": {
      "codigo": 1094,
      "nome": "DECORARE MOVEIS LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "BOLETO 30/45 DIAS",
    "prazos": [
      30,
      45
    ],
    "comNotaFiscal": true,
    "dataLimite": "2026-10-13",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "4253.3",
        "codigoProduto": "4253",
        "descricao": "ACESSÓRIO BARGAROTO",
        "familia": "INDEFINIDA",
        "quantidade": 100,
        "precoUnitario": 32
      }
    ]
  },
  {
    "codigoPedido": "68167",
    "cliente": {
      "codigo": 1753,
      "nome": "DEIVERSON NOGUEIRA DA SILVA AMARAL 07064"
    },
    "representante": "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    "formaPagamento": "BOLETO 15/30 DIAS",
    "prazos": [
      15,
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-14",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "2846.3",
        "codigoProduto": "2846",
        "descricao": "BASE VENEZA",
        "familia": "GERENCIAL",
        "quantidade": 6,
        "precoUnitario": 195.5
      }
    ]
  },
  {
    "codigoPedido": "68169",
    "cliente": {
      "codigo": 1571,
      "nome": "EMPAC-EMPRESA DE ARTEFATOS DE CONCRETO LTDA"
    },
    "representante": "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": true,
    "dataLimite": "2026-10-15",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "5591",
        "codigoProduto": "5591",
        "descricao": "CHAPA 6 FUROS - CHAPA 3/8\" X 500 MM X 300 MM",
        "familia": "INDEFINIDA",
        "quantidade": 20,
        "precoUnitario": 16.22
      },
      {
        "codigoOriginal": "5592",
        "codigoProduto": "5592",
        "descricao": "CHAPA 4 FUROS - CHAPA 3/8\" X 300 MM X 150 MM",
        "familia": "INDEFINIDA",
        "quantidade": 20,
        "precoUnitario": 9.9
      },
      {
        "codigoOriginal": "5593",
        "codigoProduto": "5593",
        "descricao": "CHAPA EMPAC - CHAPA 3/8\" X 600 MM X 100 MM",
        "familia": "INDEFINIDA",
        "quantidade": 14,
        "precoUnitario": 9.78
      }
    ]
  },
  {
    "codigoPedido": "68170",
    "cliente": {
      "codigo": 1563,
      "nome": "ZURC INTERIORES LTDA"
    },
    "representante": "MAPEFOR REPRESENTACOES LTDA",
    "formaPagamento": "BOLETO 30/45/60",
    "prazos": [
      30,
      45,
      60
    ],
    "comNotaFiscal": true,
    "dataLimite": "2026-10-08",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "925.8",
        "codigoProduto": "925",
        "descricao": "CHAPA ENCOSTO POLTRONA SEM DOBRA",
        "familia": "INDEFINIDA",
        "quantidade": 500,
        "precoUnitario": 1.15,
        "descontoPercentual": 9
      },
      {
        "codigoOriginal": "165",
        "codigoProduto": "165",
        "descricao": "CHAPA ENCOSTO DE POLTRONA 57° GRAUS",
        "familia": "INDEFINIDA",
        "quantidade": 1000,
        "precoUnitario": 1.15,
        "descontoPercentual": 9
      },
      {
        "codigoOriginal": "3169.8",
        "codigoProduto": "3169",
        "descricao": "CHAPA ENCOSTO POLTRONA 90° GRAUS",
        "familia": "INDEFINIDA",
        "quantidade": 2000,
        "precoUnitario": 1.15,
        "descontoPercentual": 9
      }
    ]
  }
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  const dryRun = String(req.query?.dryRun || "").toLowerCase() === "true";
  const repo = new FirestoreOrderImportRepository();
  const meta = {
    tenantId,
    origem: "CHATGPT_GOOGLE_DRIVE_PDF",
    solicitadoPor: "raul",
    now: new Date(),
  };
  const payload = {
    origem: meta.origem,
    tenantId,
    solicitadoPor: meta.solicitadoPor,
    pedidos: orders,
  };
  const result = await processOrderImport(repo, payload as any, meta, dryRun);

  return res.status(200).json(result);
}
