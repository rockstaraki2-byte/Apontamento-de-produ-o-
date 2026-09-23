import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { normalizeText } from "./_lib/orderImportRules.js";

const tenantId = "imperio";

const orders: any[] = [
  {
    codigoPedido: "67807",
    cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
    representante: null,
    formaPagamento: "CARTEIRA",
    prazos: [60],
    comNotaFiscal: false,
    dataLimite: "2026-10-02",
    observacoes: "CLIENTE CAPRI MOVELARIA",
    itens: [
      {
        codigoOriginal: "3074.1",
        codigoProduto: "3074",
        descricao: "PINÇA PARA POLTRONA GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 1000,
        precoUnitario: 0.72,
        descontoPercentual: 15
      }
    ]
  },
  {
    codigoPedido: "67808",
    cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" },
    representante: null,
    formaPagamento: "CARTEIRA",
    prazos: [60],
    comNotaFiscal: false,
    observacoes: "CLIENTE FLAT",
    itens: [
      {
        codigoOriginal: "4132",
        codigoProduto: "4132",
        descricao: "RODA GLIDER 45 GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 40,
        precoUnitario: 99.90,
        descontoPercentual: 15
      }
    ]
  },
  {
    codigoPedido: "67809",
    cliente: { codigo: 1110, nome: "CAMAR FLEX MOVEIS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: false,
    dataLimite: "2026-10-02",
    itens: [
      {
        codigoOriginal: "2572.11",
        codigoProduto: "2572",
        descricao: "PAR FLAME MDP 100X160X2,5 COM 70 LARGURA GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 50,
        precoUnitario: 10.50,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "67810",
    cliente: { codigo: 1115, nome: "KAVIN ESTOFADOS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: false,
    dataLimite: "2026-10-02",
    itens: [
      {
        codigoOriginal: "4810.3",
        codigoProduto: "4810",
        descricao: "RODA GLIDER 50 CM GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 10,
        precoUnitario: 135.00,
        descontoPercentual: 0,
        observacoes: "GIRATORIA DE 245X245"
      }
    ]
  },
  {
    codigoPedido: "67811",
    cliente: { codigo: 1563, nome: "ZURC INTERIORES LTDA" },
    representante: "MAPEFOR REPRESENTACOES LTDA",
    formaPagamento: "BOLETO 30/45/60",
    prazos: [30, 45, 60],
    comNotaFiscal: true,
    dataLimite: "2026-09-29",
    itens: [
      {
        codigoOriginal: "866.3",
        codigoProduto: "866",
        descricao: "SAPATA GIRATORIA BANQUETA PRENSAR INDEFINIDA",
        familia: "INDEFINIDA",
        quantidade: 50,
        precoUnitario: 41.405,
        descontoPercentual: 9
      }
    ]
  },
  {
    codigoPedido: "67812",
    cliente: { codigo: 1113, nome: "M E G SALAS LTDA" },
    representante: "MAPEFOR REPRESENTACOES LTDA",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: false,
    dataLimite: "2026-09-30",
    itens: [
      {
        codigoOriginal: "3024.1",
        codigoProduto: "3024",
        descricao: "CANTONEIRA 25X25X13 NA 1,5 GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 2000,
        precoUnitario: 0.27,
        descontoPercentual: 0
      },
      {
        codigoOriginal: "3074.1",
        codigoProduto: "3074",
        descricao: "PINÇA PARA POLTRONA GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 2000,
        precoUnitario: 0.74,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "67813",
    cliente: { codigo: 1209, nome: "ART'BEL ESTOFADOS LTDA" },
    representante: "ANDRE MILLENIUM REPRESENTAÇÕES",
    formaPagamento: "BOLETO 14 DIAS",
    prazos: [14],
    comNotaFiscal: true,
    dataLimite: "2026-09-30",
    itens: [
      {
        codigoOriginal: "4025",
        codigoProduto: "4025",
        descricao: "RODA GLIDER 47 CM COM 8 SAPATAS INDEFINIDA",
        familia: "INDEFINIDA",
        quantidade: 10,
        precoUnitario: 69.00,
        descontoPercentual: 0,
        observacoes: "S/ GIRATORIA"
      },
      {
        codigoOriginal: "4168.3",
        codigoProduto: "4168",
        descricao: "BASE GIRATÓRIA REDONDA 500MM C/ 110MM DE ALTURA C/ GIRATÓRIA DE ESFERA INDEFINIDA",
        familia: "INDEFINIDA",
        quantidade: 10,
        precoUnitario: 308.00,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "67814",
    cliente: { codigo: 1867, nome: "ROSEMARY LEITAO MARINHA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "PIX A VISTA",
    prazos: [],
    comNotaFiscal: false,
    dataLimite: "2026-09-23",
    itens: [
      {
        codigoOriginal: "5548",
        codigoProduto: "5548",
        descricao: "CHAPA CHURRASQUEIRA - CHAPA 0.8MM X 450 MM X 186 MM GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 3,
        precoUnitario: 76.16,
        descontoPercentual: 3.71
      }
    ]
  },
  {
    codigoPedido: "67817",
    cliente: { codigo: 173, nome: "TORNO DELTA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "CARTEIRA",
    prazos: [30],
    comNotaFiscal: false,
    dataLimite: "2026-09-23",
    itens: [
      {
        codigoOriginal: "5549",
        codigoProduto: "5549",
        descricao: "CHAPA 1/2\\" - 50MM X 91,5MM - TORNODELTA GERENCIAL",
        familia: "GERENCIAL",
        quantidade: 4,
        precoUnitario: 21.70,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "67821",
    cliente: { codigo: 282, nome: "RESTIER DECOR LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: true,
    dataLimite: "2026-09-29",
    itens: [
      {
        codigoOriginal: "4392",
        codigoProduto: "4392",
        descricao: "CHAPA 50X50X2MM C/1 LADO ARREDONDADO INDEFINIDA",
        familia: "INDEFINIDA",
        quantidade: 2000,
        precoUnitario: 1.39,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "67825",
    cliente: { codigo: 1094, nome: "DECORARE MOVEIS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30/45 DIAS",
    prazos: [30, 45],
    comNotaFiscal: true,
    dataLimite: "2026-09-29",
    itens: [
      {
        codigoOriginal: "1925",
        codigoProduto: "1925",
        descricao: "PINO DE LATÃO COM CABEÇA DE 16 E CORPO DE 10MM INDEFINIDA",
        familia: "INDEFINIDA",
        quantidade: 50,
        precoUnitario: 8.00,
        descontoPercentual: 0
      }
    ]
  },
  {
    codigoPedido: "67826",
    cliente: { codigo: 28, nome: "CORBELLI E PEREIRA LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: true,
    dataLimite: "2026-09-30",
    itens: [
      {
        codigoOriginal: "2256",
        codigoProduto: "2256",
        descricao: "TAMPO 340 MM X 340 MM CHAPA 14 SEM FURO C. ARRED. MESA BETA",
        familia: "INDEFINIDA",
        quantidade: 4,
        precoUnitario: 20.10,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "1653",
        codigoProduto: "1653",
        descricao: "TAMPO 300 MM CHAPA 1/8 COM FURO 1\\\"",
        familia: "INDEFINIDA",
        quantidade: 400,
        precoUnitario: 25.50,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "2255",
        codigoProduto: "2255",
        descricao: "TAMPO 340 MM X 340 MM CHAPA 14 COM FURO 2 FUROS 1\\\" C. ARRED. MESA ALFA",
        familia: "INDEFINIDA",
        quantidade: 5,
        precoUnitario: 20.80,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "2754",
        codigoProduto: "2754",
        descricao: "CHAPA PORTA TAÇA BAR DINTORNO 340 X 110MM CHAPA 1/8 C/ 10 FUROS",
        familia: "INDEFINIDA",
        quantidade: 9,
        precoUnitario: 14.3833,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "2755",
        codigoProduto: "2755",
        descricao: "CHAPA BAR DINTORNO MAIOR 680 / 140MM CHAPA 14 C/ 06 FUROS",
        familia: "INDEFINIDA",
        quantidade: 10,
        precoUnitario: 18.126,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "2756",
        codigoProduto: "2756",
        descricao: "CHAPA BAR DINTORNO MENOR 340 / 140MM CHAPA 14 C/ 06 FUROS",
        familia: "INDEFINIDA",
        quantidade: 8,
        precoUnitario: 8.265,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "3138",
        codigoProduto: "3138",
        descricao: "CHAPA OVAL MESA EVA 430X230X1/8",
        familia: "INDEFINIDA",
        quantidade: 40,
        precoUnitario: 27.8825,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "3922",
        codigoProduto: "3922",
        descricao: "CHAPA BASE LUMINÁRIA BRUMA 1/8 LU01-2025",
        familia: "INDEFINIDA",
        quantidade: 20,
        precoUnitario: 40.38,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "4526",
        codigoProduto: "4526",
        descricao: "CHAPA MESA TOPO 120MM FURO 5MM 120X120X1/8",
        familia: "INDEFINIDA",
        quantidade: 54,
        precoUnitario: 8.35,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "4527",
        codigoProduto: "4527",
        descricao: "CHAPA MESA TOPO 120MM FURO 40MM 120X120X3/16",
        familia: "INDEFINIDA",
        quantidade: 21,
        precoUnitario: 8.3886,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "4595",
        codigoProduto: "4595",
        descricao: "CHAPA MESA TOPO 300MM FURO 40MM CHAPA 3/16",
        familia: "INDEFINIDA",
        quantidade: 45,
        precoUnitario: 45.4671,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "4596",
        codigoProduto: "4596",
        descricao: "CHAPA MESA TOPO 35MM FURO 5MM CHAPA 3/16",
        familia: "INDEFINIDA",
        quantidade: 41,
        precoUnitario: 1.83,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "4597",
        codigoProduto: "4597",
        descricao: "CHAPA MESA TOPO 35MM LISA CHAPA 3/16",
        familia: "INDEFINIDA",
        quantidade: 40,
        precoUnitario: 1.46,
        descontoPercentual: 5
      },
      {
        codigoOriginal: "5158",
        codigoProduto: "5158",
        descricao: "CHAPA 1/8\\" - SUBTAMPO DE 300 MM C/ 09 FUROS",
        familia: "INDEFINIDA",
        quantidade: 100,
        precoUnitario: 24.415,
        descontoPercentual: 5
      }
    ]
  }
];

let catalogCache: any = null;
const baseRepository = new FirestoreOrderImportRepository();

const repository: any = {
  async loadCatalog(activeTenantId: string) {
    catalogCache = await baseRepository.loadCatalog(activeTenantId);
    return catalogCache;
  },
  findExistingOrderIds(activeTenantId: string, orderCode: string) {
    return baseRepository.findExistingOrderIds(activeTenantId, orderCode);
  },
  createOrderAtomically(input: any) {
    const prepared = {
      ...input.prepared,
      representativeId: input.prepared.representativeId,
      representativeName: input.prepared.representativeName,
    };

    if (String(prepared.customerId) === "856") {
      const internalRepresentative = (catalogCache?.users || []).find(
        (user: any) =>
          user.role === "REPRESENTANTE" &&
          normalizeText(user.name) === normalizeText("Pedidos LOJA imperio"),
      );
      prepared.representativeId =
        internalRepresentative?.id || "representante_pedidos_loja_imperio";
      prepared.representativeName =
        internalRepresentative?.name || "Pedidos LOJA imperio";
    }

    return baseRepository.createOrderAtomically({ ...input, prepared });
  },
  writeAudit(input: any) {
    return baseRepository.writeAudit(input);
  },
};

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
    repository,
    payload as any,
    { tenantId, origem: payload.origem, solicitadoPor: payload.solicitadoPor },
    dryRun,
  );

  const resultados = result.resultados.map((item: any) => {
    if (["67807", "67808"].includes(item.codigoPedido)) {
      return {
        ...item,
        representanteAssociado: {
          id: "representante_pedidos_loja_imperio",
          nome: "Pedidos LOJA imperio",
        },
      };
    }
    return item;
  });

  return res.status(result.resumo.comErro > 0 ? 207 : 200).json({
    ...result,
    resultados,
    representanteOverride: {
      clienteCodigo: 856,
      nome: "Pedidos LOJA imperio",
    },
  });
}
