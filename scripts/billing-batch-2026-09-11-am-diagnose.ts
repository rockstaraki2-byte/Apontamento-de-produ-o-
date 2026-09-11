import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

async function main() {
  const tenantId = "imperio";
  const orderCodes = ["67217", "67234", "66571"];
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot(tenantId);
  const itemMap = new Map(snapshot.items.map((item) => [String(item.id), item]));

  for (const code of orderCodes) {
    const rows = snapshot.orders
      .filter((o) => String(o.orderCode).trim() === code)
      .map((o) => {
        const item = itemMap.get(String(o.itemId));
        return {
          id: o.id,
          orderCode: o.orderCode,
          customerName: o.customerName,
          itemId: o.itemId,
          itemCode: item?.code ?? null,
          itemName: item?.name ?? o.customProductName ?? null,
          color: o.color ?? "-",
          size: o.size ?? "-",
          variation: o.variation ?? "-",
          totalQuantity: o.totalQuantity,
          invoicedQuantity: o.invoicedQuantity ?? 0,
          status: o.status ?? null,
          isActive: o.isActive ?? null,
        };
      });
    console.log("ORDER_DIAG", code, JSON.stringify(rows));
  }

  for (const code of ["9", "3133", "1884"]) {
    const items = snapshot.items
      .filter((item) => String(item.code ?? item.id).trim() === code)
      .map((item) => ({ id: item.id, code: item.code, name: item.name }));
    console.log("ITEM_DIAG", code, JSON.stringify(items));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
