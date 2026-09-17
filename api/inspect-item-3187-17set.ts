import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ sucesso: false });
  const repo = new FirestoreOrderImportRepository();
  const catalog = await repo.loadCatalog("imperio");
  const items = catalog.items.filter((item: any) => {
    const code = String(item.code ?? item.id ?? "");
    return code === "3187" || code.startsWith("3187.");
  });
  return res.status(200).json({ sucesso: true, items });
}
