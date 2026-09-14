import crypto from "node:crypto";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, erro: "Método não permitido." });
  }

  const tenantId = "imperio";
  const codigoPedido = "67440";
  const repository = new FirestoreOrderImportRepository();
  const existing = await repository.findExistingOrderIds(tenantId, codigoPedido);
  if (existing.length > 0) {
    return res.status(200).json({ ok: true, status: "JA_EXISTE", pedidoIds: existing });
  }

  const catalog = await repository.loadCatalog(tenantId);
  const customer = catalog.customers.find((c: any) => String(c.id) === "280");
  const item = catalog.items.find((i: any) => String(i.code ?? i.id).trim() === "68" && String(i.name || "").toUpperCase().includes("SUCATA DE FERRO"));
  if (!customer) return res.status(422).json({ ok: false, erro: "Cliente 280 não encontrado no tenant imperio." });
  if (!item) return res.status(422).json({ ok: false, erro: "Item 68 - SUCATA DE FERRO não encontrado no tenant imperio." });

  const preparedBase: any = {
    codigoPedido,
    customerId: customer.id,
    customerName: customer.tradeName || customer.name || "BARBOSA METALURGIA LTDA",
    paymentCondition: "INDEFINIDA",
    paymentTerms: "",
    paymentTermsDays: [],
    fiscalType: "SEM_NF",
    deliveryDate: "2026-09-14",
    hasRET: false,
    orderNotes: "",
    lines: [
      {
        itemId: item.id,
        itemCode: String(item.code || "68"),
        itemName: item.name || "SUCATA DE FERRO",
        codigoOriginal: "68",
        color: "-",
        size: "-",
        variation: "-",
        totalQuantity: 4550,
        quantityScaled: 45500000,
        unitPrice: 1,
        unitPriceScaled: 10000,
        discountPercent: 0,
        discountPercentScaled: 0,
        discountAmount: 0,
        discountAmountScaled: 0,
        grossTotalScaled: 45500000,
        netTotalScaled: 45500000,
        itemNotes: "",
      },
    ],
    totals: {
      grossTotalScaled: 45500000,
      discountAmountScaled: 0,
      netTotalScaled: 45500000,
    },
    warnings: ["Forma de pagamento preservada como INDEFINIDA conforme documento TekSystem."],
  };
  const normalizedPayloadHash = crypto.createHash("sha256").update(JSON.stringify(preparedBase)).digest("hex");
  const prepared = { ...preparedBase, normalizedPayloadHash };

  const createdAt = Date.now();
  const result = await repository.createOrderAtomically({
    tenantId,
    origem: "TEKSYSTEM_PDF",
    solicitadoPor: "chatgpt_pedido_67440_14set_1730",
    prepared,
    createdAt,
  });

  return res.status(200).json({
    ok: true,
    status: result.created ? "CRIADO" : "JA_EXISTE",
    pedidoIds: result.created ? result.orderIds : result.existingOrderIds,
    customer: { id: customer.id, name: customer.tradeName || customer.name },
    item: { id: item.id, code: item.code, name: item.name },
    paymentCondition: "INDEFINIDA",
    paymentTermsDays: [],
    representative: null,
    deliveryDate: "2026-09-14",
    fiscalType: "SEM_NF",
    total: 4550,
  });
}
