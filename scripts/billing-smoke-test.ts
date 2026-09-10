import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { normalizeText } from "../api/_lib/orderImportRules.ts";

async function main() {
  const tenantId = "imperio";
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);

  const item3931 = snapshot.items.find((item) => normalizeText(item.code) === "3931");
  if (!item3931) {
    throw new Error("Item de código 3931 não encontrado no catálogo. Nenhuma alteração foi feita.");
  }

  const candidates = snapshot.orders
    .filter((order) =>
      Number(order.itemId) === Number(item3931.id) &&
      normalizeText(order.customerName).includes("CYRNE"),
    )
    .map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      customerName: order.customerName,
      itemId: order.itemId,
      itemCode: item3931.code,
      itemName: item3931.name,
      totalQuantity: order.totalQuantity,
      invoicedQuantity: order.invoicedQuantity || 0,
      status: order.status,
      isActive: order.isActive,
      createdAt: order.createdAt,
      notes: order.notes || "",
      customProductName: order.customProductName || "",
      statusOriginalPdf: order.statusOriginalPdf || "",
    }))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  console.log("ITEM 3931:", {
    id: item3931.id,
    code: item3931.code,
    name: item3931.name,
  });
  console.log("CANDIDATOS CYRNE + ITEM 3931:", JSON.stringify(candidates, null, 2));

  if (candidates.length === 0) {
    throw new Error("Nenhum pedido da Cyrne com item 3931 foi encontrado. Nenhuma alteração foi feita.");
  }

  throw new Error(`DIAGNOSTICO_CONCLUIDO: ${candidates.length} candidato(s) localizado(s). Nenhuma alteração foi feita.`);
}

main().catch((error) => {
  console.error("SMOKE TEST DIAGNÓSTICO:", error?.stack || error);
  process.exit(1);
});
