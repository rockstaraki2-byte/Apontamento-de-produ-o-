import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

function baseCode(value: unknown): string {
  return String(value ?? "").trim().replace(/\..*$/, "");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ sucesso: false });
  }
  const repository = new FirestoreOrderImportRepository();
  const catalog = await repository.loadCatalog("imperio");
  const matches = catalog.items
    .filter((item) => baseCode(item.code) === "2517")
    .map((item) => ({ id: item.id, code: item.code, name: item.name, tenantId: item.tenantId }));
  return res.status(200).json({ matches });
}
