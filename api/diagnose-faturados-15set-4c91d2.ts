import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const ORDER_CODES = [
  "67383","66972","67106","67388","67082","67336","66962","66959","67028","67083",
  "67230","66957","67079","67192","67398","66174","66961","66850","67422","67415",
  "67431","65025","67009","67430","66667","66715","66679","66571","67328","67424",
  "67234","67425","67440"
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const tenantId = "imperio";
  const repository = new FirestoreBillingRepository();
  const snapshot = await repository.loadSnapshot(tenantId);
  const itemMap = new Map(snapshot.items.map((item: any) => [String(item.id), item]));
  const wanted = new Set(ORDER_CODES);

  const found = snapshot.orders
    .filter((order: any) => wanted.has(String(order.orderCode || "").trim()))
    .map((order: any) => {
      const item: any = itemMap.get(String(order.itemId));
      return {
        id: order.id,
        orderCode: String(order.orderCode || ""),
        customerName: order.customerName || "",
        itemId: order.itemId,
        itemCode: item?.code || "",
        itemName: item?.name || order.customProductName || "",
        originalProductCode: order.originalProductCode || "",
        color: order.color || "",
        size: order.size || "",
        variation: order.variation || "",
        totalQuantity: Number(order.totalQuantity || 0),
        invoicedQuantity: Number(order.invoicedQuantity || 0),
        remainingQuantity: Math.max(0, Number(order.totalQuantity || 0) - Number(order.invoicedQuantity || 0)),
        status: order.status || "",
        isActive: order.isActive,
      };
    })
    .sort((a: any, b: any) => a.orderCode.localeCompare(b.orderCode) || Number(a.id) - Number(b.id));

  const byCode: Record<string, any[]> = {};
  for (const code of ORDER_CODES) byCode[code] = found.filter((row: any) => row.orderCode === code);
  const missingOrderCodes = ORDER_CODES.filter((code) => byCode[code].length === 0);

  return res.status(200).json({ ok: true, tenantId, requestedOrderCodes: ORDER_CODES, missingOrderCodes, byCode });
}
