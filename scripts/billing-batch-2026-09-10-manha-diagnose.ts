import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { normalizeText } from "../api/_lib/orderImportRules.ts";

async function main() {
  const tenantId = "imperio";
  const orderCodes = ["67256", "67230", "67254", "67257", "67229", "67271", "67270", "66961"];
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);
  const itemMap = new Map(snapshot.items.map((item) => [String(item.id), item]));

  for (const orderCode of orderCodes) {
    const rows = snapshot.orders
      .filter((o) => String(o.orderCode).trim() === orderCode)
      .map((o) => {
        const item = itemMap.get(String(o.itemId));
        return {
          id: o.id,
          orderCode: o.orderCode,
          customerName: o.customerName,
          itemId: o.itemId,
          itemCode: item?.code || String(o.itemId),
          itemName: item?.name || o.customProductName || "",
          color: o.color,
          size: o.size,
          variation: o.variation,
          totalQuantity: o.totalQuantity,
          invoicedQuantity: o.invoicedQuantity || 0,
          status: o.status,
          isActive: o.isActive,
        };
      });
    console.log("ORDER_DIAG", orderCode, JSON.stringify(rows));
  }

  const interestingCodes = new Set(["3585","2517","4224","507","1880","2739","3730","2572","1","4","2962"]);
  const catalog = snapshot.items
    .filter((item) => interestingCodes.has(normalizeText(item.code)))
    .map((item) => ({ id: item.id, code: item.code, name: item.name }));
  console.log("CATALOG_DIAG", JSON.stringify(catalog));
  process.exit(0);
}

main().catch((error) => {
  console.error("DIAG_ERROR", error?.stack || error);
  process.exit(1);
});
