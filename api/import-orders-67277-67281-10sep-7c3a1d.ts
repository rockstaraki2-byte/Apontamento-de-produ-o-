import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { processOrderImport } from "./_lib/orderImportCore.js";

class Exact3143Repository extends FirestoreOrderImportRepository {
  async loadCatalog(tenantId: string) {
    const catalog = await super.loadCatalog(tenantId);
    const exact = catalog.items.find((item: any) => String(item.code || "").trim() === "3143.3" && String(item.name || "").trim().toUpperCase() === "BASE CADEIRA LUIZA");
    if (exact) {
      catalog.items = catalog.items.filter((item: any) => {
        const base = String(item.code || "").replace(/\..*$/, "").trim();
        return base !== "3143" || String(item.id) === String((exact as any).id);
      });
    }
    return catalog;
  }
}

const payload = {
  origem: "TEKSYSTEM_PDF",
  tenantId: "imperio",
  solicitadoPor: "chatgpt_pedidos_67277_67281_10set",
  pedidos: [
    {
      codigoPedido: "67277",
      cliente: { codigo: "1072", nome: "W L METAIS" },
      representante: "KESSE",
      formaPagamento: "CARTEIRA",
      prazos: [30],
      dataLimite: "17/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "5442", codigoProduto: "5442", descricao: "FLANGE 1/8 DE 80MM C/FURO CENTRAL P/ TUBO 7/8 E 4 FUROS LATERAIS", familia: "GERENCIAL", quantidade: 11, precoUnitario: "4,21", descontoPercentual: 0 },
        { codigoOriginal: "4362", codigoProduto: "4362", descricao: "BASE APOIO SIENA", familia: "GERENCIAL", quantidade: 3, precoUnitario: "23,68", descontoPercentual: 0 },
        { codigoOriginal: "4207", codigoProduto: "4207", descricao: "CHAPA 3/16 - BASE REDONDA CENTRAL - 200MM X 200MM", familia: "GERENCIAL", quantidade: 8, precoUnitario: "23,02", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67279",
      cliente: { codigo: "1136", nome: "IDEALLE ESTOFADOS E TRANSPORTE LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30/45/60/75 DIAS",
      prazos: [30,45,60,75],
      dataLimite: "16/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "1880.1", codigoProduto: "1880", descricao: "RODIZIO SILICONE TRANSPARENTE DE 40 NA 1,2", familia: "GERENCIAL", quantidade: 1500, precoUnitario: "1,00", descontoPercentual: 0 },
        { codigoOriginal: "3794.11", codigoProduto: "3794", descricao: "BARRA CHATA REFORÇO 54 CM 2 FUROS - PERFILADA", familia: "GERENCIAL", quantidade: 700, precoUnitario: "1,75", descontoPercentual: 0 },
        { codigoOriginal: "2739.1", codigoProduto: "2739", descricao: "PAR DE CONECTOR ESCARIADO 1,5MM", familia: "GERENCIAL", quantidade: 500, precoUnitario: "0,98", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67280",
      cliente: { codigo: "867", nome: "MOVEIS PLATAFORMA LTDA" },
      representante: "MAPEFOR REPRESENTACOES LTDA",
      formaPagamento: "PIX A VISTA",
      prazos: [],
      dataLimite: "17/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "4811.3", codigoProduto: "4811", descricao: "RODA GLIDER 60 CM", familia: "GERENCIAL", quantidade: 20, precoUnitario: "123,60", descontoPercentual: 0 }
      ]
    },
    {
      codigoPedido: "67281",
      cliente: { codigo: "943", nome: "LARA MOVEIS LTDA" },
      representante: "ANDRE MILLENIUM REPRESENTAÇOES",
      formaPagamento: "BOLETO 14 DIAS",
      prazos: [14],
      dataLimite: "21/09/2026",
      possuiRET: false,
      itens: [
        { codigoOriginal: "4519.3", codigoProduto: "4519", descricao: "PAR PÉ COM RETORNO AUTOMÁTICO 21CM", familia: "GERENCIAL", quantidade: 12, precoUnitario: "18,00", descontoPercentual: 0 },
        { codigoOriginal: "2594.3", codigoProduto: "2594", descricao: "PÉ LATERAL BYIE/FLOYD A1-14CM A2-10CM", familia: "GERENCIAL", quantidade: 300, precoUnitario: "17,88", descontoPercentual: 0 },
        { codigoOriginal: "2595.3", codigoProduto: "2595", descricao: "PÉ CENTRAL BYIE/FLOYD", familia: "GERENCIAL", quantidade: 150, precoUnitario: "6,76", descontoPercentual: 0 },
        { codigoOriginal: "3027.3", codigoProduto: "3027", descricao: "ENCAIXE LARA 02 CHAPA 2,5MM C PORCA 5/16 SOLDADA C PARAFUSO", familia: "GERENCIAL", quantidade: 300, precoUnitario: "4,69", descontoPercentual: 0 },
        { codigoOriginal: "3146.3", codigoProduto: "3146", descricao: "BASE GIRATORIA ANNE", familia: "GERENCIAL", quantidade: 10, precoUnitario: "176,96", descontoPercentual: 0 },
        { codigoOriginal: "4811.3", codigoProduto: "4811", descricao: "RODA GLIDER 60 CM", familia: "GERENCIAL", quantidade: 20, precoUnitario: "139,70", descontoPercentual: 0, observacoes: "Obs. TekSystem: GIRATORIA DE 245X245" },
        { codigoOriginal: "3143.3", codigoProduto: "3143", descricao: "BASE CADEIRA LUIZA", familia: "GERENCIAL", quantidade: 10, precoUnitario: "259,70", descontoPercentual: 0 },
        { codigoOriginal: "3658.3", codigoProduto: "3658", descricao: "PÉ TUBO AURORA", familia: "GERENCIAL", quantidade: 150, precoUnitario: "17,50", descontoPercentual: 0 }
      ]
    }
  ]
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false, erro: "Método não permitido." });
  }
  const repository = new Exact3143Repository();
  const meta = { tenantId: "imperio", origem: "TEKSYSTEM_PDF", solicitadoPor: "chatgpt_pedidos_67277_67281_10set" };
  const validacao = await processOrderImport(repository, payload, meta, true);
  if (validacao.resultados.some((r) => r.status === "ERRO")) {
    return res.status(422).json({ fase: "VALIDACAO", validacao });
  }
  const importacao = await processOrderImport(repository, payload, meta, false);
  return res.status(200).json({ fase: "IMPORTACAO", validacao, importacao });
}
