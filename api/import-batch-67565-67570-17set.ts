import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

class Sep17ImportRepository extends FirestoreOrderImportRepository {
  async loadCatalog(tenantId: string) {
    const catalog = await super.loadCatalog(tenantId);
    return {
      ...catalog,
      items: catalog.items.filter((item: any) => {
        const code = String(item.code ?? item.id ?? "");
        if (!(code === "3187" || code.startsWith("3187."))) return true;
        return Number(item.id) === 2401;
      }),
    };
  }
}

const payload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  pedidos: [
    { codigoPedido: "67565", cliente: { codigo: 370, nome: "STORE ESTOFADOS INDUSTRIA E COMERCIO LTDA" }, representante: "KESSE", formaPagamento: "BOLETO 30/60/90", prazos: [30,60,90], comNotaFiscal: true, dataLimite: "2026-09-24", itens: [{ codigoOriginal: "3187.12", codigoProduto: "3187", descricao: "PÉ CENTRAL REDONDO 15 CM", familia: "INDEFINIDA", quantidade: 50, precoUnitario: 7, descontoPercentual: 3 }] },
    { codigoPedido: "67566", cliente: { codigo: 1817, nome: "MAIS PES LTDA" }, representante: "KESSE", formaPagamento: "PIX A VISTA", prazos: [], comNotaFiscal: true, dataLimite: "2026-09-25", itens: [{ codigoOriginal: "3024.1", codigoProduto: "3024", descricao: "CANTONEIRA 25X25X13 NA 1,5", familia: "INDEFINIDA", quantidade: 2000, precoUnitario: 0.30 }, { codigoOriginal: "1884", codigoProduto: "1884", descricao: "CHAPA UNIÃO CAMA BOX", familia: "INDEFINIDA", quantidade: 1000, precoUnitario: 0.85 }] },
    { codigoPedido: "67567", cliente: { codigo: 1072, nome: "W L METAIS" }, representante: "KESSE", formaPagamento: "CARTEIRA", prazos: [30], comNotaFiscal: false, dataLimite: "2026-09-25", itens: [{ codigoOriginal: "2944", codigoProduto: "2944", descricao: "TAMPAO DE ACABAMENTO DE ALUMINIO 1 POLEGADA", familia: "GERENCIAL", quantidade: 30, precoUnitario: 4.95, observacoes: "CHAPA 20" }] },
    { codigoPedido: "67568", cliente: { codigo: 6, nome: "VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI" }, representante: "KESSE", formaPagamento: "BOLETO 30 DIAS", prazos: [30], comNotaFiscal: true, dataLimite: "2026-09-25", itens: [{ codigoOriginal: "4519.3", codigoProduto: "4519", descricao: "PAR PÉ COM RETORNO AUTOMÁTICO 21CM", familia: "INDEFINIDA", quantidade: 20, precoUnitario: 36.56 }] },
    { codigoPedido: "67569", cliente: { codigo: 6, nome: "VIP ESTOFADOS INDUSTRIA E COMERCIO EIRELI" }, representante: "KESSE", formaPagamento: "BOLETO 30 DIAS", prazos: [30], comNotaFiscal: false, promEntrega: "2026-09-25", itens: [{ codigoOriginal: "4519.3", codigoProduto: "4519", descricao: "PAR PÉ COM RETORNO AUTOMÁTICO 21CM", familia: "GERENCIAL", quantidade: 20, precoUnitario: 36.56 }] },
    { codigoPedido: "67570", cliente: { codigo: 1563, nome: "ZURC INTERIORES LTDA" }, representante: "MAPEFOR REPRESENTACOES LTDA", formaPagamento: "BOLETO 30/45/60", prazos: [30,45,60], comNotaFiscal: true, dataLimite: "2026-09-24", itens: [{ codigoOriginal: "2766.8", codigoProduto: "2766", descricao: "CANTONEIRA REFORÇADA DE 1/4", familia: "INDEFINIDA", quantidade: 100, precoUnitario: 11, descontoPercentual: 9 }] }
  ]
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ sucesso: false });
  const repo = new Sep17ImportRepository();
  const ctx = { tenantId: "imperio", origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date() };
  const validation = await processOrderImport(repo, payload as any, ctx, true);
  if (!validation.sucesso || validation.resumo.comErro > 0) return res.status(422).json({ sucesso: false, fase: "VALIDACAO", validation });
  const imported = await processOrderImport(repo, payload as any, ctx, false);
  return res.status(imported.sucesso ? 200 : 422).json({ sucesso: imported.sucesso, fase: "IMPORTACAO", validation, imported });
}
