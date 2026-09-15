import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const TOKEN = "sep15-1520-7c6f9d8a3b2149f0aee4c2c7d4b8f6a1";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "method" });
  if (String(req.query?.token || "") !== TOKEN) return res.status(404).json({ error: "not_found" });

  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const itemMap = new Map(snapshot.items.map((item) => [String(item.id), item]));
  const codes = ["66848","67451","67108","67455","66959","67279","66458","65025","67042"];
  const orders: Record<string, any[]> = {};
  for (const code of codes) {
    orders[code] = snapshot.orders
      .filter((o) => String(o.orderCode).trim() === code)
      .map((o) => {
        const item = itemMap.get(String(o.itemId));
        return {
          id:o.id, orderCode:o.orderCode, customerName:o.customerName, customerId:o.customerId??null,
          itemId:o.itemId, itemCode:item?.code??null, itemName:item?.name??o.customProductName??null,
          color:o.color??"-", size:o.size??"-", variation:o.variation??"-",
          totalQuantity:o.totalQuantity, invoicedQuantity:o.invoicedQuantity??0,
          status:o.status??null, isActive:o.isActive??null,
          unitPrice:o.unitPrice??null, discountPercent:o.discountPercent??null,
          fiscalType:o.fiscalType??null, representativeName:o.representativeName??null,
          paymentCondition:o.paymentCondition??null, paymentTermsDays:o.paymentTermsDays??null,
        };
      });
  }
  return res.status(200).json({ ok:true, orders });
}
