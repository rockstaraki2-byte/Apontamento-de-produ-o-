import { buildBillingPlan, collectSourceKeys, type BillingImportPayload } from "./_lib/billingImportCore.js";
import { FirestoreBillingRepository } from "./_lib/billingImportFirestore.js";

const TOKEN = "sep16-morning-run-51c3d0b6b7424f1a";
const payload: BillingImportPayload = {
  tenantId: "imperio",
  origem: "CHATGPT_PDF",
  solicitadoPor: "chatgpt-integration",
  documentKey: "FATURADOS-16-SET-MANHA-2026-09-16",
  allowBreakReservations: false,
  faturamentos: [
    { lineId: "p1-67517-5528-1", codigoPedido: "67517", itemId: 5528, quantidade: 1 },
    { lineId: "p1-67517-5529-1", codigoPedido: "67517", itemId: 5529, quantidade: 1 },
    { lineId: "p1-67517-5530-1", codigoPedido: "67517", itemId: 5530, quantidade: 1 },
    { lineId: "p1-67517-5531-2", codigoPedido: "67517", itemId: 5531, quantidade: 2 },
    { lineId: "p2-67527-3829-500", codigoPedido: "67527", itemId: 3829, quantidade: 500, numeroNota: "6322" },
    { lineId: "p3-66849-3118-100", codigoPedido: "66849", itemId: 3118, quantidade: 100 },
    { lineId: "p3-67488-287-1250", codigoPedido: "67488", itemId: 287, quantidade: 1250 },
    { lineId: "p3-67526-1-500", codigoPedido: "67526", itemId: 1, quantidade: 500 },
    { lineId: "p3-67526-9-200", codigoPedido: "67526", itemId: 9, quantidade: 200 },
    { lineId: "p3-67526-287-250", codigoPedido: "67526", itemId: 287, quantidade: 250 },
    { lineId: "p3-67526-2459-100", codigoPedido: "67526", itemId: 1779765282864, quantidade: 100 },
    { lineId: "p3-67526-2739-1500", codigoPedido: "67526", itemId: 2739, quantidade: 1500 },
    { lineId: "p3-67526-3191-4", codigoPedido: "67526", itemId: 3191, quantidade: 4 },
    { lineId: "p3-67526-4811-1", codigoPedido: "67526", itemId: 4811, quantidade: 1 },
    { lineId: "p4-67491-1-500", codigoPedido: "67491", itemId: 1, quantidade: 500, numeroNota: "6323" },
    { lineId: "p4-67491-9-400", codigoPedido: "67491", itemId: 9, quantidade: 400, numeroNota: "6323" },
    { lineId: "p4-67491-2739-500", codigoPedido: "67491", itemId: 2739, quantidade: 500, numeroNota: "6323" },
    { lineId: "p4-67491-2806-100", codigoPedido: "67491", itemId: 1779765280560, quantidade: 100, numeroNota: "6323" },
    { lineId: "p4-67491-3873-2", codigoPedido: "67491", itemId: 3873, quantidade: 2, numeroNota: "6323" },
    { lineId: "p5-67533-958-45", codigoPedido: "67533", itemId: 958, quantidade: 45 },
    { lineId: "p5-67533-1281-40", codigoPedido: "67533", itemId: 1281, quantidade: 40 },
    { lineId: "p5-67533-4051-20", codigoPedido: "67533", itemId: 4051, quantidade: 20 },
  ],
};

const expectedState = new Map<number, [number, number]>([
  [7330071905551015, [1,0]], [7330071905551016, [1,0]], [7330071905551017, [1,0]], [7330071905551018, [2,0]],
  [7330070141538450, [500,0]], [1787924464738, [100,0]], [7329775736628605, [1200,0]],
  [7330070137014121, [500,0]], [7330070137014122, [200,0]], [7330070137014118, [250,0]], [7330070137014119, [100,0]], [7330070137014123, [1500,0]], [7330070137014120, [4,0]], [7330070137014124, [1,0]],
  [7329775744123997, [500,0]], [7329775744123995, [400,0]], [7329775744123994, [1500,0]], [7329775744123992, [100,0]], [7329775744123996, [10,0]],
  [7330070145631503, [45,0]], [7330070145631504, [40,0]], [7330070145631502, [20,0]],
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ ok:false, error:"METHOD_NOT_ALLOWED" });
  if (String(req.query?.token || "") !== TOKEN) return res.status(404).json({ ok:false, error:"NOT_FOUND" });
  try {
    const repository = new FirestoreBillingRepository();
    const snapshot = await repository.loadSnapshot("imperio");
    const sourceKeys = collectSourceKeys(payload, snapshot);
    const processed = await repository.findProcessedSourceKeys("imperio", String(payload.documentKey), sourceKeys);
    const plan = buildBillingPlan(snapshot, payload, {
      tenantId: "imperio",
      origem: "CHATGPT_PDF",
      solicitadoPor: "chatgpt-integration",
      processedSourceKeys: processed,
    });

    const stateErrors: any[] = [];
    for (const line of plan.linhas) {
      if (!line.operation) continue;
      const expected = expectedState.get(line.operation.orderId);
      if (!expected || line.operation.currentTotalQuantity !== expected[0] || line.operation.currentInvoicedQuantity !== expected[1]) {
        stateErrors.push({ orderId: line.operation.orderId, orderCode: line.operation.orderCode, currentTotal: line.operation.currentTotalQuantity, currentInvoiced: line.operation.currentInvoicedQuantity, expected });
      }
    }

    const r = plan.resumo;
    const guardOk = plan.canConfirm && stateErrors.length === 0 && r.total === 22 && r.prontos === 21 && r.ajustesQuantidade === 1 && r.conflitosReserva === 0 && r.jaProcessados === 0 && r.jaFaturados === 0 && r.pendencias === 0 && r.quantidadeAFaturar === 6017;
    if (!guardOk) return res.status(422).json({ ok:false, phase:"PREVIEW_BLOCKED", resumo:r, stateErrors, previewHash:plan.previewHash, linhas:plan.linhas.map(l=>({status:l.status,message:l.message,operation:l.operation && {orderCode:l.operation.orderCode,itemId:l.operation.itemId,billingQuantity:l.operation.billingQuantity,currentTotalQuantity:l.operation.currentTotalQuantity,currentInvoicedQuantity:l.operation.currentInvoicedQuantity,newTotalQuantity:l.operation.newTotalQuantity,newInvoicedQuantity:l.operation.newInvoicedQuantity}})) });

    const result = await repository.applyPlan(plan);
    const after = await repository.loadSnapshot("imperio");
    const targetCodes = new Set(["67517","67527","66849","67488","67526","67491","67533"]);
    const verification = after.orders.filter(o=>targetCodes.has(String(o.orderCode))).map(o=>({id:o.id,orderCode:o.orderCode,itemId:o.itemId,totalQuantity:o.totalQuantity,invoicedQuantity:o.invoicedQuantity||0,status:o.status,isActive:o.isActive}));
    return res.status(200).json({ ok:true, preview:{previewHash:plan.previewHash,resumo:r}, result, verification });
  } catch (error:any) {
    return res.status(500).json({ ok:false, error:error?.message || String(error) });
  }
}
