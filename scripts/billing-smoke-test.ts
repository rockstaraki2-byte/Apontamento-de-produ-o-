import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { normalizeText } from "../api/_lib/orderImportRules.ts";

async function main() {
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const item = snapshot.items.find((row) => normalizeText(row.code) === "3931");
  if (!item) throw new Error("Item 3931 não encontrado.");

  const candidates = snapshot.orders.filter((order) =>
    normalizeText(order.orderCode) === normalizeText("Teste de faturamemto") &&
    Number(order.itemId) === Number(item.id) &&
    normalizeText(order.customerName).includes("CYRNE"),
  );
  if (candidates.length !== 1) throw new Error(`Esperava 1 alvo; encontrei ${candidates.length}.`);

  const target = candidates[0];
  console.log("ESTADO_REAL_DO_PEDIDO:", JSON.stringify({
    id: target.id,
    orderCode: target.orderCode,
    customerName: target.customerName,
    itemId: target.itemId,
    itemCode: item.code,
    itemName: item.name,
    totalQuantity: target.totalQuantity,
    invoicedQuantity: target.invoicedQuantity || 0,
    status: target.status,
    isActive: target.isActive,
  }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
