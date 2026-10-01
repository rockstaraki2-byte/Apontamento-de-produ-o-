import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";
const orders: any[] = [
  {
    "codigoPedido": "68091",
    "cliente": {
      "codigo": 646,
      "nome": "ARTEFER DECOR MOVEIS E DECORACOES LTDA"
    },
    "representante": "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    "formaPagamento": "CARTEIRA",
    "prazos": [
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-08",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "5586",
        "codigoProduto": "5586",
        "descricao": "CONJUNTO ÁUREA (2 FLANGES 250MM C/3 FUROS)",
        "familia": "GERENCIAL",
        "quantidade": 20,
        "precoUnitario": 52.53
      },
      {
        "codigoOriginal": "5268",
        "codigoProduto": "5268",
        "descricao": "CHAPA 1/8\" - 80MM X80MM C/7 FUROS",
        "familia": "GERENCIAL",
        "quantidade": 30,
        "precoUnitario": 7.4
      }
    ]
  },
  {
    "codigoPedido": "68092",
    "cliente": {
      "codigo": 697,
      "nome": "OMAP SERVICOS E INDUSTRIA LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-08",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "427",
        "codigoProduto": "427",
        "descricao": "CILINDRO",
        "familia": "GERENCIAL",
        "quantidade": 100,
        "precoUnitario": 5.25
      },
      {
        "codigoOriginal": "478",
        "codigoProduto": "478",
        "descricao": "CANTONEIRA Z MENOR",
        "familia": "GERENCIAL",
        "quantidade": 200,
        "precoUnitario": 2.05
      }
    ]
  },
  {
    "codigoPedido": "68093",
    "cliente": {
      "codigo": 35,
      "nome": "SALA ESTOFADOS LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "BOLETO A PRAZO",
    "prazos": [
      25,
      35,
      39
    ],
    "comNotaFiscal": true,
    "dataLimite": "2026-10-19",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "2.1",
        "codigoProduto": "2",
        "descricao": "RODIZIO SILICONE DE 50 TRANSPARENTE",
        "familia": "INDEFINIDA",
        "quantidade": 1200,
        "precoUnitario": 1.26,
        "descontoPercentual": 3
      }
    ]
  },
  {
    "codigoPedido": "68095",
    "cliente": {
      "codigo": 824,
      "nome": "AW INTERIORES LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-02",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "3585.11",
        "codigoProduto": "3585",
        "descricao": "PAR MECANISMO SOFÁ BAÚ",
        "familia": "GERENCIAL",
        "quantidade": 10,
        "precoUnitario": 32
      }
    ]
  },
  {
    "codigoPedido": "68096",
    "cliente": {
      "codigo": 856,
      "nome": "ROFER COMERCIO E IMPORTAÇÃO LTDA"
    },
    "representante": "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    "formaPagamento": "CARTEIRA",
    "prazos": [
      60
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-08",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "4810.3",
        "codigoProduto": "4810",
        "descricao": "RODA GLIDER 50 CM",
        "familia": "GERENCIAL",
        "quantidade": 10,
        "precoUnitario": 116.5,
        "descontoPercentual": 15,
        "observacoes": "CLIENTE ALESSANDRO"
      }
    ]
  },
  {
    "codigoPedido": "68097",
    "cliente": {
      "codigo": 856,
      "nome": "ROFER COMERCIO E IMPORTAÇÃO LTDA"
    },
    "representante": "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    "formaPagamento": "CARTEIRA",
    "prazos": [
      60
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-09",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "4941.1",
        "codigoProduto": "4941",
        "descricao": "CHAPA ENCOSTO POLTRONA 60° GRAUS C/10 FUROS",
        "familia": "GERENCIAL",
        "quantidade": 200,
        "precoUnitario": 1.5,
        "descontoPercentual": 15,
        "observacoes": "CLIENTE SANDALO MOVEIS"
      }
    ]
  },
  {
    "codigoPedido": "68098",
    "cliente": {
      "codigo": 856,
      "nome": "ROFER COMERCIO E IMPORTAÇÃO LTDA"
    },
    "representante": "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    "formaPagamento": "CARTEIRA",
    "prazos": [
      60
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-12",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "3869.1",
        "codigoProduto": "3869",
        "descricao": "BARRA CHATA REFORÇO 5/8X1/8 53CM 2 FUROS - MODELO C/ CURVA",
        "familia": "GERENCIAL",
        "quantidade": 150,
        "precoUnitario": 2.7,
        "descontoPercentual": 15,
        "observacoes": "CLIENTE MAURO"
      }
    ]
  },
  {
    "codigoPedido": "68099",
    "cliente": {
      "codigo": 1300,
      "nome": "BEL INDUSTRIA DE MOVEIS LTDA"
    },
    "representante": "KESSE",
    "formaPagamento": "BOLETO 7 DIAS",
    "prazos": [
      7
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-09",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "2821.3",
        "codigoProduto": "2821",
        "descricao": "PÉ LATERAL RETO 1\" 10CM",
        "familia": "GERENCIAL",
        "quantidade": 50,
        "precoUnitario": 9,
        "descontoPercentual": 3,
        "observacoes": "C/ CHAPA MAIOR"
      }
    ]
  },
  {
    "codigoPedido": "68100",
    "cliente": {
      "codigo": 1023,
      "nome": "K. R. MOVEIS LTDA"
    },
    "representante": "MAPEFOR REPRESENTACOES LTDA",
    "formaPagamento": "PIX A VISTA",
    "prazos": [],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-06",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "1630",
        "codigoProduto": "1630",
        "descricao": "GIRATORIO ESFERA 195X195X2,5",
        "familia": "GERENCIAL",
        "quantidade": 20,
        "precoUnitario": 47.7
      }
    ]
  },
  {
    "codigoPedido": "68101",
    "cliente": {
      "codigo": 1031,
      "nome": "MARTO MOVEIS LTDA"
    },
    "representante": "MAPEFOR REPRESENTACOES LTDA",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-16",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "4071.3",
        "codigoProduto": "4071",
        "descricao": "BASE BANQUETA LAZIO",
        "familia": "GERENCIAL",
        "quantidade": 2,
        "precoUnitario": 255.6
      }
    ]
  },
  {
    "codigoPedido": "68102",
    "cliente": {
      "codigo": 1057,
      "nome": "SIMAR RODRIGUES DE FARIA"
    },
    "representante": "MAPEFOR REPRESENTACOES LTDA",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-09",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "4811.3",
        "codigoProduto": "4811",
        "descricao": "RODA GLIDER 60 CM",
        "familia": "GERENCIAL",
        "quantidade": 10,
        "precoUnitario": 120
      }
    ]
  },
  {
    "codigoPedido": "68103",
    "cliente": {
      "codigo": 32,
      "nome": "CASA NOBRE INDUSTRIA E COMERCIO DE ESTOFADOS LTDA"
    },
    "representante": "MAPEFOR REPRESENTACOES LTDA",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-08",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "4461.11",
        "codigoProduto": "4461",
        "descricao": "BARRA CHATA REFORÇO 3/4X1/8 50CM 1 FURO - C/ CURVA MENOR S/ ESCARIAR",
        "familia": "GERENCIAL",
        "quantidade": 500,
        "precoUnitario": 3.1
      }
    ]
  },
  {
    "codigoPedido": "68104",
    "cliente": {
      "codigo": 457,
      "nome": "50.262.064 WUARLEM DIAS TEIXEIRA"
    },
    "representante": "MAPEFOR REPRESENTACOES LTDA",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": false,
    "dataLimite": "2026-10-05",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "901",
        "codigoProduto": "901",
        "descricao": "CONECTOR IMPERIO",
        "familia": "GERENCIAL",
        "quantidade": 2000,
        "precoUnitario": 0.7
      }
    ]
  },
  {
    "codigoPedido": "68105",
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
        "codigoOriginal": "866.3",
        "codigoProduto": "866",
        "descricao": "SAPATA GIRATORIA BANQUETA PRENSAR - C/4 RASGOS",
        "familia": "INDEFINIDA",
        "quantidade": 50,
        "precoUnitario": 50,
        "descontoPercentual": 9
      }
    ]
  },
  {
    "codigoPedido": "68106",
    "cliente": {
      "codigo": 1582,
      "nome": "GUILHERME FERRO DA CONCEICAO"
    },
    "representante": "ANGELO",
    "formaPagamento": "BOLETO A PRAZO",
    "prazos": [
      20
    ],
    "comNotaFiscal": true,
    "dataLimite": "2026-10-08",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "797.1",
        "codigoProduto": "797",
        "descricao": "SUPORTE BAIXO",
        "familia": "INDEFINIDA",
        "quantidade": 300,
        "precoUnitario": 1.58
      }
    ]
  },
  {
    "codigoPedido": "68107",
    "cliente": {
      "codigo": 1828,
      "nome": "MONALIPPE DECOR LTDA"
    },
    "representante": "ANGELO",
    "formaPagamento": "BOLETO 30 DIAS",
    "prazos": [
      30
    ],
    "comNotaFiscal": true,
    "dataLimite": "2026-10-06",
    "observacoes": "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    "itens": [
      {
        "codigoOriginal": "9",
        "codigoProduto": "9",
        "descricao": "SUPORTE QUADRADO",
        "familia": "INDEFINIDA",
        "quantidade": 200,
        "precoUnitario": 1.26
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
  if (String(req.query?.catalog || "").toLowerCase() === "true") {
    const catalog = await repo.loadCatalog(tenantId);
    const matches = catalog.items.filter((item: any) => {
      const code = String(item.code || "").trim();
      const name = String(item.name || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase();
      return /^(5586|3869)(?:\\.|$)/.test(code) ||
        name.includes("CONJUNTO AUREA") ||
        name.includes("BARRA CHATA REFORCO 5/8X1/8 53CM 2 FUROS");
    });
    return res.status(200).json({
      items: matches.map((item: any) => ({ id: item.id, code: item.code, name: item.name })),
    });
  }
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
