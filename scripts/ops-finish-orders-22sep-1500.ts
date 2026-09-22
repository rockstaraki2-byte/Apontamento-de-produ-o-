import fs from "node:fs";
import path from "node:path";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase.ts";
import { processOrderImport } from "../api/_lib/orderImportCore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";

const tenantId = "imperio";
const outputPath = path.resolve("ops-results/22sep-1500.json");

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function objectContainsExactCpf(value: unknown, cpf: string): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" || typeof value === "number") {
    return digits(value) === cpf;
  }
  if (Array.isArray(value)) return value.some((v) => objectContainsExactCpf(v, cpf));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) => objectContainsExactCpf(v, cpf));
  }
  return false;
}

class ExactProductRepo extends FirestoreOrderImportRepository {
  async loadCatalog(currentTenantId: string) {
    const catalog = await super.loadCatalog(currentTenantId);
    return {
      ...catalog,
      items: catalog.items.filter((item: any) => {
        const base = String(item.code ?? "").replace(/\..*$/, "").trim();
        if (base === "1") return String(item.id) === "1";
        return true;
      }),
    };
  }
}

async function repair67755() {
  const orderId = 7332252763915173;
  const ref = doc(db, "orders", String(orderId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return { sucesso: false, erro: "PEDIDO_NAO_ENCONTRADO", orderId };

  const data: any = snap.data();
  if (data?.tenantId !== tenantId || String(data?.orderCode ?? "") !== "67755") {
    return {
      sucesso: false,
      erro: "PEDIDO_DIVERGENTE",
      orderId,
      tenantIdEncontrado: data?.tenantId ?? null,
      codigoEncontrado: data?.orderCode ?? null,
    };
  }

  await updateDoc(ref, {
    grossTotalScaled: 14424000,
    discountAmount: 129.82,
    discountAmountScaled: 1298200,
    netTotalScaled: 13125800,
  });

  const check = await getDoc(ref);
  const checked: any = check.data();
  return {
    sucesso: true,
    orderId,
    grossTotalScaled: checked?.grossTotalScaled,
    discountAmount: checked?.discountAmount,
    discountAmountScaled: checked?.discountAmountScaled,
    netTotalScaled: checked?.netTotalScaled,
  };
}

async function importOrder(repo: FirestoreOrderImportRepository, order: any) {
  const ctx = { tenantId, origem: "CHATGPT_GOOGLE_DRIVE_PDF", solicitadoPor: "raul", now: new Date() };
  const payload = { origem: "CHATGPT_GOOGLE_DRIVE_PDF", tenantId, solicitadoPor: "raul", pedidos: [order] };
  const validation = await processOrderImport(repo, payload as any, ctx, true);
  const vr = validation.resultados?.[0];

  if (!validation.sucesso || validation.resumo.comErro > 0) {
    return { fase: "VALIDACAO", validation: vr };
  }
  if (validation.resumo.jaExistentes > 0 || vr?.status === "JA_EXISTE") {
    return { fase: "EXISTENTE", validation: vr };
  }

  const imported = await processOrderImport(repo, payload as any, ctx, false);
  return { fase: "IMPORTACAO", validation: vr, imported: imported.resultados?.[0] };
}

async function finish67774() {
  const repo = new ExactProductRepo();
  return importOrder(repo, {
    codigoPedido: "67774",
    cliente: { codigo: 8, nome: "LE ESTOFADOS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30/45 DIAS",
    prazos: [30, 45],
    comNotaFiscal: true,
    dataLimite: "2026-09-25",
    itens: [
      {
        codigoOriginal: "1.1",
        codigoProduto: "1",
        descricao: "RODIZIO DE SILICONE DE 40 1,5 TRANSPARENTE",
        familia: "INDEFINIDA",
        quantidade: 2000,
        precoUnitario: 1.15,
      },
      {
        codigoOriginal: "2739.1",
        codigoProduto: "2739",
        descricao: "PAR DE CONECTOR ESCARIADO 1,5MM",
        familia: "INDEFINIDA",
        quantidade: 1500,
        precoUnitario: 0.98,
      },
    ],
  });
}

async function inspectAndMaybeImport67756() {
  const repo = new FirestoreOrderImportRepository();
  const catalog = await repo.loadCatalog(tenantId);
  const cpf = "05438356696";
  const matches = (catalog.customers as any[]).filter((c: any) => objectContainsExactCpf(c, cpf));

  const safeMatches = matches.map((c: any) => ({
    id: c.id,
    name: c.name ?? null,
    tradeName: c.tradeName ?? null,
    cpf: c.cpf ?? null,
    cnpj: c.cnpj ?? null,
    cpfCnpj: c.cpfCnpj ?? c.document ?? c.documentNumber ?? null,
    city: c.city ?? c.cidade ?? null,
    state: c.state ?? c.estado ?? null,
    address: c.address ?? c.endereco ?? null,
  }));

  if (matches.length !== 1) {
    return {
      cpf,
      quantidadeCorrespondencias: matches.length,
      correspondencias: safeMatches,
      requerCadastroCliente1866: true,
    };
  }

  const customer: any = matches[0];
  const imported = await importOrder(repo, {
    codigoPedido: "67756",
    cliente: { codigo: customer.id, nome: customer.name ?? customer.tradeName ?? "FABIO OLAVO DE OLIVEIRA" },
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
        precoUnitario: 20.0,
      },
    ],
  });

  return {
    cpf,
    quantidadeCorrespondencias: 1,
    correspondencias: safeMatches,
    requerCadastroCliente1866: false,
    imported,
  };
}

async function main() {
  const result: any = {
    executedAt: new Date().toISOString(),
    repair67755: null,
    order67774: null,
    order67756: null,
  };

  try { result.repair67755 = await repair67755(); }
  catch (error: any) { result.repair67755 = { sucesso: false, erro: String(error?.stack ?? error) }; }

  try { result.order67774 = await finish67774(); }
  catch (error: any) { result.order67774 = { sucesso: false, erro: String(error?.stack ?? error) }; }

  try { result.order67756 = await inspectAndMaybeImport67756(); }
  catch (error: any) { result.order67756 = { sucesso: false, erro: String(error?.stack ?? error) }; }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
