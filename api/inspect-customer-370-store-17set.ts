import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ sucesso: false });
  const repo = new FirestoreOrderImportRepository();
  const catalog = await repo.loadCatalog("imperio");
  const customers = catalog.customers.filter((c: any) => {
    const id = String(c.id ?? "");
    const text = `${String(c.name ?? "")} ${String(c.tradeName ?? "")}`.toUpperCase();
    return id === "370" || text.includes("STORE ESTOFADOS") || text.includes("LEO DECOR");
  });
  return res.status(200).json({ sucesso: true, customers });
}
