import { collection, getDocs, query, where } from "firebase/firestore";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

function norm(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().replace(/\s+/g, " ").toUpperCase();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok: false });
  const repository: any = new FirestoreOrderImportRepository();
  const catalog = await repository.loadCatalog("imperio");
  const customers = catalog.customers.filter((c: any) => {
    const n = norm(c.name);
    const t = norm(c.tradeName);
    return n.includes("ROFER") || t.includes("ROFER") || n.includes("STARTEN") || t.includes("STARTEN") || String(c.id) === "856" || String(c.id) === "94";
  });
  return res.status(200).json({ customers });
}
