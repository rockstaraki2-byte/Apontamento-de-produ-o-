import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";
const orders = [
  { codigoPedido: "67621", cliente: { codigo: 793, nome: "MOVEIS MATOS E LOPES LTDA" }, representante: "MAPEFOR REPRESENTACOES LTDA", formaPagamento: "BOLETO 7 DIAS", prazos: [7], comNotaFiscal: true, dataLimite: "2026-09-29", itens: [
    { codigoOriginal: "5123.3", codigoProduto: "5123", descricao: "KIT BUFFET SAVANA - 4 PÉS LAT. A1 20CM A2 25CM + 1 PÉ CENT. C/ REG.", familia: "INDEFINIDA", quantidade: 25, precoUnitario: 81.50 },
    { codigoOriginal: "5123.12", codigoProduto: "5123", descricao: "KIT BUFFET SAVANA - 4 PÉS LAT. A1 20CM A2 25CM + 1 PÉ CENT. C/ REG.", familia: "INDEFINIDA", quantidade: 23, precoUnitario: 81.50 },
    { codigoOriginal: "5122.12", codigoProduto: "5122", descricao: "KIT RACK ESSENZA - 2 BASES METALON 35X20 + 1 PÉ CENTRAL C/ REGULAGEM", familia: "INDEFINIDA", quantidade: 32, precoUnitario: 96.50 },
    { codigoOriginal: "5124.3", codigoProduto: "5124", descricao: "KIT BUFFET RAVENA - 4 PÉS LAT. A1 32CM A2 37CM + 1 PÉ CENTR. C/ REG.", familia: "INDEFINIDA", quantidade: 8, precoUnitario: 99.50 },
    { codigoOriginal: "5124.12", codigoProduto: "5124", descricao: "KIT BUFFET RAVENA - 4 PÉS LAT. A1 32CM A2 37CM + 1 PÉ CENTR. C/ REG.", familia: "INDEFINIDA", quantidade: 12, precoUnitario: 99.50 }
  ]},
  { codigoPedido: "67622", cliente: { codigo: 338, nome: "INDUSTRIA E COMERCIO DE MOVEIS COPAS EIRELI" }, representante: "MAPEFOR REPRESENTACOES LTDA", formaPagamento: "CARTEIRA", prazos: [30,60,90], comNotaFiscal: false, dataLimite: "2026-09-29", itens: [
    { codigoOriginal: "16", codigoProduto: "16", descricao: "ENCAIXE L MACHO - PADRÃO 2 FUROS", familia: "GERENCIAL", quantidade: 1200, precoUnitario: 1.20 },
    { codigoOriginal: "15", codigoProduto: "15", descricao: "ENCAIXE L FÊMEA", familia: "GERENCIAL", quantidade: 1200, precoUnitario: 0.95 }
  ]},
  { codigoPedido: "67623", cliente: { codigo: 1023, nome: "K. R. MOVEIS LTDA" }, representante: "MAPEFOR REPRESENTACOES LTDA", formaPagamento: "PIX A VISTA", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-29", itens: [
    { codigoOriginal: "3074.1", codigoProduto: "3074", descricao: "PINÇA PARA POLTRONA", familia: "GERENCIAL", quantidade: 3000, precoUnitario: 0.77 },
    { codigoOriginal: "3656.1", codigoProduto: "3656", descricao: "CANTONEIRA 13 FUROS P/ MESA", familia: "GERENCIAL", quantidade: 500, precoUnitario: 4.12 },
    { codigoOriginal: "3848.1", codigoProduto: "3848", descricao: "CANTONEIRA 70X70X19MM COM 4 FUROS", familia: "GERENCIAL", quantidade: 500, precoUnitario: 1.40 },
    { codigoOriginal: "4173.11", codigoProduto: "4173", descricao: "CRUZETA 400X400", familia: "GERENCIAL", quantidade: 40, precoUnitario: 14.00 }
  ]},
  { codigoPedido: "67624", cliente: { codigo: 1753, nome: "DEIVERSON NOGUEIRA DA SILVA AMARAL 07064" }, representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD", formaPagamento: "BOLETO 15/30 DIAS", prazos: [15,30], comNotaFiscal: false, dataLimite: "2026-09-28", itens: [
    { codigoOriginal: "2846.3", codigoProduto: "2846", descricao: "BASE VENEZA", familia: "GERENCIAL", quantidade: 5, precoUnitario: 195.50 }
  ]},
  { codigoPedido: "67625", cliente: { codigo: 867, nome: "MOVEIS PLATAFORMA LTDA" }, representante: "MAPEFOR REPRESENTACOES LTDA", formaPagamento: "PIX A VISTA", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-29", itens: [
    { codigoOriginal: "4227.11", codigoProduto: "4227", descricao: "PAR FLAME MDP COM REFORÇO 100X160X2,5 COM 70 LARGURA", familia: "GERENCIAL", quantidade: 600, precoUnitario: 12.00 }
  ]}
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
