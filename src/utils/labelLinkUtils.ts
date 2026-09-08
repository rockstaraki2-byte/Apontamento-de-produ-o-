import type { ProductionLog } from "../types";

export type LabelLinkSource =
  | "EMBALAGEM"
  | "INJETORA"
  | "BANHO_QUIMICO"
  | "CORTE_LASER"
  | "MONTAGEM_RETRATIL"
  | null;

export function getLabelLinkSource(log?: ProductionLog | null): LabelLinkSource {
  if (!log) return null;
  if (log.type === "EMBALAGEM" || log.operatorId === "embalagem") return "EMBALAGEM";
  if (log.type === "INJETORA" || log.operatorId === "injetora") return "INJETORA";
  if (log.type === "BANHO_QUIMICO" || log.operatorId === "banho_quimico") return "BANHO_QUIMICO";
  if (log.type === "CORTE_LASER" || !!log.operatorId?.startsWith("cortelaser")) return "CORTE_LASER";
  if (log.operatorId === "montagem_retratil") return "MONTAGEM_RETRATIL";
  return null;
}

export function getProductionLogQuantity(log?: ProductionLog | null): number {
  if (!log) return 0;
  return Number(
    log.quantityPacked ||
    log.quantityProcessed ||
    log.quantityPainted ||
    log.quantityCut ||
    0,
  );
}

export function buildLinkedQuantityByOrderAndSource(
  logs: ProductionLog[],
  validOrderIds: Set<string>,
): Map<string, number> {
  const result = new Map<string, number>();

  for (const log of logs) {
    if (log.orderId === undefined || log.orderId === null) continue;
    const orderId = String(log.orderId);
    if (!validOrderIds.has(orderId)) continue;

    const source = getLabelLinkSource(log);
    if (!source) continue;

    const key = `${orderId}|${source}`;
    result.set(key, (result.get(key) || 0) + getProductionLogQuantity(log));
  }

  return result;
}

export function getAlreadyLinkedQuantity(
  linkedQuantityMap: Map<string, number>,
  orderId: string | number,
  sourceLog?: ProductionLog | null,
): number {
  const source = getLabelLinkSource(sourceLog);
  if (!source) return 0;
  return linkedQuantityMap.get(`${String(orderId)}|${source}`) || 0;
}

export function getRemainingLinkQuantity(
  totalQuantity: number,
  invoicedQuantity: number,
  alreadyLinkedQuantity: number,
): number {
  const total = Math.max(0, Number(totalQuantity) || 0);
  const invoiced = Math.max(0, Number(invoicedQuantity) || 0);
  const linked = Math.max(0, Number(alreadyLinkedQuantity) || 0);

  // Faturamento normalmente é subconjunto do que já foi produzido/vinculado.
  // Usar o maior dos dois evita descontar a mesma unidade duas vezes.
  return Math.max(0, total - Math.max(invoiced, linked));
}
