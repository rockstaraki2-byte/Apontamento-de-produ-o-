import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

async function main() {
  const tenantId = "imperio";
  const orderCodes = [
    "65025","67255","67029","67104","66963","65780","67081","67285",
    "66667","66717","67145","66682","66849","67159","67282","67296",
  ];
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
  process.exit(0);
}

main().catch((error) => {
  console.error("DIAG_ERROR", error?.stack || error);
  process.exit(1);
});
