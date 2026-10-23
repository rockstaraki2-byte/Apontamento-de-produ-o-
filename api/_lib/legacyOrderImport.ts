import crypto from "node:crypto";
import { processOrderImport } from "./orderImportCore.js";
import { FirestoreOrderImportRepository } from "./orderImportFirestore.js";

const tenantId = "imperio";

const orders: any[] = [
  {
    codigoPedido: "67755",
    cliente: { codigo: 1563, nome: "ZURC INTERIORES LTDA" },
    representante: "MAPEFOR REPRESENTACOES LTDA",
    formaPagamento: "BOLETO 30/45/60",
    prazos: [30,45,60],
    comNotaFiscal: true,
    dataLimite: "2026-09-24",
    itens: [
      {
        codigoOriginal: "4809.3",
        codigoProduto: "4809",
        descricao: "RODA GLIDER 55 CM",
        familia: "INDEFINIDA",
        quantidade: 12,
        precoUnitario: 120.20,
        descontoPercentual: 9
      }
    ]
  },
  {
    codigoPedido: "67756",
    cliente: { codigo: 1866, nome: "FABIO OLAVO DE OLIVEIRA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "PIX A VISTA",
    prazos: [],
    comNotaFiscal: false,
    dataLimite: "2026-09-22",
    itens: [
      {
        codigoOriginal: "5547",
        codigoProduto: "5547",
        descricao: "SOBRA DE CHAPA DE CORTE A LASER",
        familia: "GERENCIAL",
        quantidade: 5,
        precoUnitario: 20.00
      }
    ]
  },
  {
    codigoPedido: "67773",
    cliente: { codigo: 1582, nome: "GUILHERME FERRO DA CONCEICAO" },
    representante: "ANGELO",
    formaPagamento: "BOLETO A PRAZO",
    prazos: [20],
    comNotaFiscal: true,
    dataLimite: "2026-09-29",
    itens: [
      {
        codigoOriginal: "4810.3",
        codigoProduto: "4810",
        descricao: "RODA GLIDER 50 CM",
        familia: "INDEFINIDA",
        quantidade: 10,
        precoUnitario: 116.50
      }
    ]
  },
  {
    codigoPedido: "67774",
    cliente: { codigo: 8, nome: "LE ESTOFADOS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30/45 DIAS",
    prazos: [30,45],
    comNotaFiscal: true,
    dataLimite: "2026-09-25",
    itens: [
      {
        codigoOriginal: "1.1",
        codigoProduto: "1",
        descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE",
        familia: "INDEFINIDA",
        quantidade: 2000,
        precoUnitario: 1.15
      },
      {
        codigoOriginal: "2739.1",
        codigoProduto: "2739",
        descricao: "PAR DE CONECTOR ESCARIADO 1,5MM",
        familia: "INDEFINIDA",
        quantidade: 1500,
        precoUnitario: 0.98
      }
    ]
  }
];

export async function handleLegacyOrderImport(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }
  if (process.env.LEGACY_ORDER_IMPORT_ENABLED !== "true") {
    return res.status(410).json({ sucesso: false, erro: "LEGACY_IMPORT_DISABLED" });
  }
  const supplied = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.LEGACY_ORDER_IMPORT_TOKEN || "";
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (!expected || suppliedBytes.length === 0 || suppliedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(suppliedBytes, expectedBytes)) {
    return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
  }

  const repo = new FirestoreOrderImportRepository();
  const ctx = { tenantId, origem: "CHATGPT_GOOGLE_DRIVE_PDF", solicitadoPor: "raul", now: new Date() };
  const results: any[] = [];

  for (const order of orders) {
    const payload = {
      origem: "CHATGPT_GOOGLE_DRIVE_PDF",
      tenantId,
      solicitadoPor: "raul",
      pedidos: [order],
    };

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
    results.push({
      codigoPedido: order.codigoPedido,
      fase: "IMPORTACAO",
      validation: vr,
      imported: imported.resultados?.[0],
    });
  }

  return res.status(200).json({
    sucesso: true,
    quantidadePedidos: orders.length,
    results,
  });
}
