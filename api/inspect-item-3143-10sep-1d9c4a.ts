import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

function norm(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().replace(/\s+/g, " ").toUpperCase();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const repository: any = new FirestoreOrderImportRepository();
  const catalog = await repository.loadCatalog("imperio");
  const items = catalog.items.filter((i: any) => norm(String(i.code || "").replace(/\..*$/, "")) === "3143");
  return res.status(200).json({ items });
}
