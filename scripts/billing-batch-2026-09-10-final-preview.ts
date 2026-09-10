import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";
import type { OrderImportPayload } from "../api/_lib/orderImportRules.ts";

const payload: OrderImportPayload = {
  origem: "CHATGPT_PDF",
  tenantId: "imperio",
  solicitadoPor: "raul",
  pedidos: [
    { codigoPedido: "67304", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67313", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "3.2900", precoUnitario: "34.95", descontoPercentual: 0 }] },
    { codigoPedido: "67305", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67315", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "3.5600", precoUnitario: "34.83", descontoPercentual: 0 }] },
    { codigoPedido: "67306", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67317", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "0.9680", precoUnitario: "34.93", descontoPercentual: 0 }] },
    { codigoPedido: "67307", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67319", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "2.9720", precoUnitario: "34.99", descontoPercentual: 0 }] },
    { codigoPedido: "67311", cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" }, representante: null, formaPagamento: "Carteira", prazos: [], comNotaFiscal: false, dataLimite: "2026-09-10", possuiRET: false, observacoes: "Faturamento PDF entrega 67321", itens: [{ codigoProduto: "70", descricao: "ZINCAGEM DE PEÇAS", familia: "GERENCIAL", quantidade: "4.8840", precoUnitario: "34.11", descontoPercentual: 0 }] },
  ],
};

async function main() {
  const repo = new FirestoreOrderImportRepository();
  const result = await processOrderImport(repo, payload, { tenantId: "imperio", origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date("2026-09-10T17:43:00-03:00") }, true);
  console.log("FINAL_IMPORT_PREVIEW", JSON.stringify(result));
  const allValid = result.resumo.recebidos === 5 && result.resumo.validos === 5 && result.resumo.comErro === 0 && result.resumo.jaExistentes === 0;
  if (!allValid) throw new Error("Os 5 pedidos finais não passaram integralmente na validação.");
  console.log("FINAL_IMPORT_PREVIEW_OK");
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
