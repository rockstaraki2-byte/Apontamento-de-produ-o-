import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";
import { getServerDb, doc, getDoc, writeBatch } from "../server_firebase.js";

const tenantId = "imperio";

class ExactProductRepo extends FirestoreOrderImportRepository {
  async loadCatalog(tenantId: string) {
    const catalog = await super.loadCatalog(tenantId);
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
  const db = getServerDb();
  const ref = doc(db, "orders", String(orderId));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { sucesso: false, erro: "PEDIDO_NAO_ENCONTRADO", orderId };
  }

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

  const batch = writeBatch(db);
  batch.update(ref, {
    grossTotalScaled: 14424000,
    discountAmount: 129.82,
    discountAmountScaled: 1298200,
    netTotalScaled: 13125800,
  });
  await batch.commit();

  return {
    sucesso: true,
    orderId,
    grossTotal: 1442.40,
    discountAmount: 129.82,
    netTotal: 1312.58,
  };
}

async function import67774() {
  const repo = new ExactProductRepo();
  const order: any = {
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
  };

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

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  const [repair67755Result, order67774Result] = await Promise.all([
    repair67755(),
    import67774(),
  ]);

  return res.status(200).json({
    sucesso: true,
    repair67755: repair67755Result,
    order67774: order67774Result,
  });
}
