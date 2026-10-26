import crypto from "node:crypto";

export interface OrderLineTarget {
  companyId: number;
  orderCode: string;
  lineHash: string;
}

const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function orderLineIdsHash(ids: unknown[]): string {
  const normalized = [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))]
    .sort(compareText);
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function orderLineTargetsHash(targets: OrderLineTarget[]): string {
  const normalized = targets
    .map((target) => [Number(target.companyId), String(target.orderCode).trim(), String(target.lineHash)] as const)
    .sort((a, b) => a[0] - b[0] || compareText(a[1], b[1]));
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
