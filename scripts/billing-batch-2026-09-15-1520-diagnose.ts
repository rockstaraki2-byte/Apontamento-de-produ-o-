import { FirestoreBillingRepository } from "../api/_lib/billingImportFirestore.ts";

async function main() {
  const repo = new FirestoreBillingRepository();
  const snapshot = await repo.loadSnapshot("imperio");
  const itemMap = new Map(snapshot.items.map((item) => [String(item.id), item]));

  for (const code of ["66848","67451","67108","67455","66959","67279","66458","65025","67042"]) {
    const rows = snapshot.orders
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
    console.log("ORDER_DIAG", code, JSON.stringify(rows));
  }

  for (const code of ["3831","3585","5121","392","3932","5358","1880","2739","3794","1848","5181","937","4233","4421","4422","4920","5438","5448","5449"]) {
    const items = snapshot.items
      .filter((item) => String(item.code??item.id).trim()===code || String(item.code??"").startsWith(`${code}.`))
      .map((item)=>({id:item.id,code:item.code,name:item.name}));
    console.log("ITEM_DIAG", code, JSON.stringify(items));
  }
  process.exit(0);
}

main().catch((error)=>{console.error(error);process.exit(1);});