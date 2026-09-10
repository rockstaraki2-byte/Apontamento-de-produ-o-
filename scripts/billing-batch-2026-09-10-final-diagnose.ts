import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";
import { FirestoreOrderImportRepository } from "../api/_lib/orderImportFirestore.ts";

async function main() {
  const tenantId = "imperio";
  const orderCodes = ["67304","67305","67306","67307","67311"];
  const billingRepo = new FirestoreBillingRepository();
  const snapshot = await billingRepo.loadSnapshot(tenantId);
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
          itemCode: item?.code,
          itemName: item?.name,
          color: o.color,
          totalQuantity: o.totalQuantity,
          invoicedQuantity: o.invoicedQuantity,
          status: o.status,
          isActive: o.isActive,
        };
      });
    console.log("ORDER_DIAG", code, JSON.stringify(rows));
  }
  const orderRepo = new FirestoreOrderImportRepository();
  const catalog = await orderRepo.loadCatalog(tenantId);
  const customer = catalog.customers.filter((c) => String(c.id) === "858" || String(c.name || c.tradeName || "").toUpperCase().includes("CONSUMIDOR FINAL"));
  const item = catalog.items.filter((i) => String(i.code || "").replace(/\..*$/, "") === "70" || String(i.name || "").toUpperCase().includes("ZINCAGEM DE PEÇAS"));
  console.log("CUSTOMER_858", JSON.stringify(customer));
  console.log("ITEM_70", JSON.stringify(item));
  process.exit(0);
}
main().catch((err) => { console.error(err); process.exit(1); });
