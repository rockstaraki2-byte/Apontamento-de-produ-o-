import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";
const orders = [
  { codigoPedido: "67582", cliente: { codigo: 1478, nome: "CYRNE DECOR LTDA" }, representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "BOLETO 30/45/60", prazos: [30,45,60], comNotaFiscal: true, dataLimite: "2026-09-17", itens: [{ codigoOriginal: "5537", codigoProduto: "5537", descricao: "MOLDE AÇO DOB. - CHAPA 1/8\" X 900 MM X 570 MM", familia: "INDEFINIDA", quantidade: 10, precoUnitario: 34.33 }] },
  { codigoPedido: "67584", cliente: { codigo: 1645, nome: "SPRAIADO DESIGN DE MOVEIS LTDA" }, representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "BOLETO 15 DIAS", prazos: [15], comNotaFiscal: true, itens: [{ codigoOriginal: "287", codigoProduto: "287", descricao: "SUPORTE BAIXO DE PLASTICO", familia: "INDEFINIDA", quantidade: 1200, precoUnitario: 1.30 }] },
  { codigoPedido: "67587", cliente: { codigo: 856, nome: "ROFER COMERCIO E IMPORTAÇÃO LTDA" }, representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "CARTEIRA", prazos: [60], comNotaFiscal: false, itens: [
    { codigoOriginal: "3163", codigoProduto: "3163", descricao: "ENCAIXE L FÊMEA 5/8", familia: "GERENCIAL", quantidade: 200, precoUnitario: 0.75, descontoPercentual: 15 },
    { codigoOriginal: "3164", codigoProduto: "3164", descricao: "ENCAIXE L MACHO 5/8", familia: "GERENCIAL", quantidade: 200, precoUnitario: 1.09, descontoPercentual: 15 },
    { codigoOriginal: "392.1", codigoProduto: "392", descricao: "SUPORTE INTERMEDIÁRIO", familia: "GERENCIAL", quantidade: 900, precoUnitario: 1.95, descontoPercentual: 15 },
    { codigoOriginal: "4809.3", codigoProduto: "4809", descricao: "RODA GLIDER 55 CM", familia: "GERENCIAL", quantidade: 7, precoUnitario: 120.20, descontoPercentual: 15 },
    { codigoOriginal: "3074.1", codigoProduto: "3074", descricao: "PINÇA PARA POLTRONA", familia: "GERENCIAL", quantidade: 130, precoUnitario: 0.74, descontoPercentual: 15 }
  ] },
  { codigoPedido: "67592", cliente: { codigo: 1708, nome: "MULT KIT ACESSORIOS PARA MOVEIS LTDA" }, representante: "KESSE", formaPagamento: "BOLETO 15/30 DIAS", prazos: [15,30], comNotaFiscal: false, dataLimite: "2026-09-25", itens: [{ codigoOriginal: "1088", codigoProduto: "1088", descricao: "MANCAL RETRÁTIL", familia: "GERENCIAL", quantidade: 10000, precoUnitario: 0.40 }] },
  { codigoPedido: "67593", cliente: { codigo: 1708, nome: "MULT KIT ACESSORIOS PARA MOVEIS LTDA" }, representante: "KESSE", formaPagamento: "BOLETO 15/30 DIAS", prazos: [15,30], comNotaFiscal: false, dataLimite: "2026-10-02", itens: [{ codigoOriginal: "1088", codigoProduto: "1088", descricao: "MANCAL RETRÁTIL", familia: "GERENCIAL", quantidade: 10000, precoUnitario: 0.40 }] },
  { codigoPedido: "67594", cliente: { codigo: 1708, nome: "MULT KIT ACESSORIOS PARA MOVEIS LTDA" }, representante: "KESSE", formaPagamento: "BOLETO 15/30 DIAS", prazos: [15,30], comNotaFiscal: false, dataLimite: "2026-10-09", itens: [{ codigoOriginal: "1088", codigoProduto: "1088", descricao: "MANCAL RETRÁTIL", familia: "GERENCIAL", quantidade: 10000, precoUnitario: 0.40 }] },
  { codigoPedido: "67595", cliente: { codigo: 94, nome: "STARTEN ESTOFADOS LTDA." }, representante: "KESSE", formaPagamento: "BOLETO 30/60/90", prazos: [30,60,90], comNotaFiscal: true, dataLimite: "2026-09-22", itens: [{ codigoOriginal: "507", codigoProduto: "507", descricao: "PRESILHA PARA MOLA", familia: "INDEFINIDA", quantidade: 30000, precoUnitario: 0.043 }] },
  { codigoPedido: "67596", cliente: { codigo: 1110, nome: "CAMAR FLEX MOVEIS LTDA" }, representante: "KESSE", formaPagamento: "BOLETO 30 DIAS", prazos: [30], comNotaFiscal: false, dataLimite: "2026-09-18", itens: [{ codigoOriginal: "2572.11", codigoProduto: "2572", descricao: "PAR FLAME MDP 100X160X2,5 COM 70 LARGURA", familia: "GERENCIAL", quantidade: 50, precoUnitario: 10.50 }] },
  { codigoPedido: "67597", cliente: { codigo: 276, nome: "LUKA DECOR LTDA" }, representante: "KESSE", formaPagamento: "BOLETO 30 DIAS", prazos: [30], comNotaFiscal: false, dataLimite: "2026-09-24", itens: [{ codigoOriginal: "797.1", codigoProduto: "797", descricao: "SUPORTE BAIXO", familia: "GERENCIAL", quantidade: 800, precoUnitario: 1.58 }] },
  { codigoPedido: "67598", cliente: { codigo: 714, nome: "B.A CORBELLI INDUSTRIA DE MOVEIS LTDA" }, representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "BOLETO 30/45 DIAS", prazos: [30,45], comNotaFiscal: true, dataLimite: "2026-09-24", itens: [{ codigoOriginal: "3707.3", codigoProduto: "3707", descricao: "BOOMERANG SUPREMA - 120° NA 2MM", familia: "INDEFINIDA", quantidade: 100, precoUnitario: 6.32 }] },
  { codigoPedido: "67599", cliente: { codigo: 1234, nome: "EULINOX FABRICACAO DE MOVEIS COM PREDOMINANCIA DE METAL LTDA" }, representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "BOLETO 30 DIAS", prazos: [30], comNotaFiscal: true, dataLimite: "2026-09-23", itens: [{ codigoOriginal: "5412", codigoProduto: "5412", descricao: "CHAPA OBLONGO - CHAPA 3/16\" X 32 MM X 58 MM", familia: "INDEFINIDA", quantidade: 100, precoUnitario: 6.91 }] },
  { codigoPedido: "67600", cliente: { codigo: 714, nome: "B.A CORBELLI INDUSTRIA DE MOVEIS LTDA" }, representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "BOLETO 30/45 DIAS", prazos: [30,45], comNotaFiscal: true, dataLimite: "2026-09-24", itens: [{ codigoOriginal: "3156.3", codigoProduto: "3156", descricao: "PAR PÉ COM RETORNO AUTOMÁTICO 16CM", familia: "INDEFINIDA", quantidade: 100, precoUnitario: 36.56 }] }
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  const repo = new FirestoreOrderImportRepository();
  const ctx = { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date() };
  const results: any[] = [];
  for (const order of orders) {
    const payload = { origem: "CHATGPT_PDF", tenantId, solicitadoPor: "raul", pedidos: [order] };
    const validation = await processOrderImport(repo, payload as any, ctx, true);
    const vr = validation.resultados?.[0];
    if (!validation.sucesso || validation.resumo.comErro > 0) {
      results.push({ codigoPedido: order.codigoPedido, fase: "VALIDACAO", validation: vr });
      continue;
    }
    if (validation.resumo.jaExistentes > 0 || vr?.status === "JA_EXISTE") {
      results.push({ codigoPedido: order.codigoPedido, fase: "EXISTENTE", validation: vr });
      continue;
    }
    const imported = await processOrderImport(repo, payload as any, ctx, false);
    results.push({ codigoPedido: order.codigoPedido, fase: "IMPORTACAO", validation: vr, imported: imported.resultados?.[0] });
  }
  return res.status(200).json({ sucesso: true, results });
}
