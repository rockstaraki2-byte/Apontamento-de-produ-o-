import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

async function main() {
  const tenantId = "imperio";
  const orderCodes = [
    "67217","67234","66571","60090","67330","66351","67227","67327","66846","66578",
    "67049","67177","67337","67244","67341","67357","67360","67367","66850","67363","67375"
  ];
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
          customerId: o.customerId ?? null,
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
          unitPrice: o.unitPrice ?? null,
          discountPercent: o.discountPercent ?? null,
          fiscalType: o.fiscalType ?? null,
          representativeName: o.representativeName ?? null,
          paymentCondition: o.paymentCondition ?? null,
          paymentTermsDays: o.paymentTermsDays ?? null,
        };
      });
    console.log("ORDER_DIAG", code, JSON.stringify(rows));
  }

  for (const code of ["2","2793","961","1648","1653","2068","3138","3774","4050","5274","3192"]) {
    const items = snapshot.items
      .filter((item) => String(item.code ?? item.id).trim() === code || String(item.code ?? "").startsWith(`${code}.`))
      .map((item) => ({ id: item.id, code: item.code, name: item.name }));
    console.log("ITEM_DIAG", code, JSON.stringify(items));
  }
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
