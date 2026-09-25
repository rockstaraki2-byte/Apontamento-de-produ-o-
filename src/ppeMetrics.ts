import type {
  Employee,
  EpiDistribution,
  Item,
  Uniform,
  UniformDistribution,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(timestamp: number): number {
  const date = new Date(timestamp);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

export function calendarDaysBetween(from: number, to: number): number {
  return Math.max(0, dayNumber(to) - dayNumber(from));
}

export interface EpiConsumptionMetric {
  itemId: number;
  code: string;
  name: string;
  quantity: number;
  deliveries: number;
}

export function summarizeEpiConsumption(
  items: Item[],
  distributions: EpiDistribution[],
  startTimestamp: number,
  endTimestamp: number,
): EpiConsumptionMetric[] {
  const itemsById = new Map(items.filter((item) => item.type === "EPI").map((item) => [item.id, item]));
  const totals = new Map<number, EpiConsumptionMetric>();

  for (const distribution of distributions) {
    if (distribution.date < startTimestamp || distribution.date > endTimestamp) continue;
    const item = itemsById.get(distribution.itemId);
    if (!item) continue;
    const current = totals.get(item.id) || {
      itemId: item.id,
      code: item.code,
      name: item.name,
      quantity: 0,
      deliveries: 0,
    };
    current.quantity += Math.max(0, Number(distribution.quantity) || 0);
    current.deliveries += 1;
    totals.set(item.id, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
}

export type DistributionItemType = "EPI" | "UNIFORME";

export interface DistributionTiming {
  previousDeliveryAt: number | null;
  daysSincePreviousDelivery: number | null;
  averageUseDays: number | null;
}

export function getDistributionTiming(
  type: DistributionItemType,
  distribution: EpiDistribution | UniformDistribution,
  epiDistributions: EpiDistribution[],
  uniformDistributions: UniformDistribution[],
): DistributionTiming {
  const source = type === "EPI" ? epiDistributions : uniformDistributions;
  const itemId = type === "EPI"
    ? (distribution as EpiDistribution).itemId
    : (distribution as UniformDistribution).uniformId;
  const timeline = source
    .filter((entry) => entry.employeeId === distribution.employeeId &&
      (type === "EPI"
        ? (entry as EpiDistribution).itemId === itemId
        : (entry as UniformDistribution).uniformId === itemId))
    .slice()
    .sort((a, b) => a.date - b.date || String(a.id).localeCompare(String(b.id)));

  let currentIndex = timeline.findIndex((entry) => entry.id === distribution.id);
  if (currentIndex < 0) {
    currentIndex = timeline.findIndex((entry) => entry.date === distribution.date && entry.quantity === distribution.quantity);
  }
  if (currentIndex <= 0) {
    return { previousDeliveryAt: null, daysSincePreviousDelivery: null, averageUseDays: null };
  }

  const previousDeliveryAt = timeline[currentIndex - 1].date;
  const daysSincePreviousDelivery = calendarDaysBetween(previousDeliveryAt, distribution.date);
  // A janela considera as cinco últimas entregas, que formam até quatro intervalos.
  const firstIntervalIndex = Math.max(1, currentIndex - 3);
  const intervals: number[] = [];
  for (let index = firstIntervalIndex; index <= currentIndex; index += 1) {
    intervals.push(calendarDaysBetween(timeline[index - 1].date, timeline[index].date));
  }

  return {
    previousDeliveryAt,
    daysSincePreviousDelivery,
    averageUseDays: intervals.length
      ? intervals.reduce((sum, days) => sum + days, 0) / intervals.length
      : null,
  };
}

export interface EpiReplacementRow {
  employeeId: string;
  employeeName: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  lastDeliveryAt: number;
  replacementIntervalDays: number;
  daysRemaining: number;
  dueAt: number;
  status: "ATRASADO" | "PRÓXIMO" | "NO PRAZO";
}

export function buildEpiReplacementDashboard(
  distributions: EpiDistribution[],
  items: Item[],
  employees: Employee[],
  now = Date.now(),
): EpiReplacementRow[] {
  const itemsById = new Map(items
    .filter((item) => item.type === "EPI" && Number(item.replacementIntervalDays) > 0)
    .map((item) => [item.id, item]));
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const latest = new Map<string, EpiDistribution>();

  for (const distribution of distributions) {
    if (!itemsById.has(distribution.itemId)) continue;
    const key = `${distribution.employeeId}|${distribution.itemId}`;
    const current = latest.get(key);
    if (!current || current.date < distribution.date ||
      (current.date === distribution.date && String(current.id) < String(distribution.id))) {
      latest.set(key, distribution);
    }
  }

  return Array.from(latest.values()).map((distribution) => {
    const item = itemsById.get(distribution.itemId)!;
    const interval = Number(item.replacementIntervalDays);
    const daysSinceLastDelivery = calendarDaysBetween(distribution.date, now);
    const daysRemaining = interval - daysSinceLastDelivery;
    const warningWindow = Math.max(7, Math.ceil(interval * 0.2));
    const employee = employeesById.get(distribution.employeeId);
    const dueDate = new Date(distribution.date);
    dueDate.setDate(dueDate.getDate() + interval);
    const status: EpiReplacementRow["status"] = daysRemaining < 0
      ? "ATRASADO"
      : daysRemaining <= warningWindow
        ? "PRÓXIMO"
        : "NO PRAZO";
    return {
      employeeId: distribution.employeeId,
      employeeName: employee?.name || distribution.employeeId,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      quantity: distribution.quantity,
      lastDeliveryAt: distribution.date,
      replacementIntervalDays: interval,
      daysRemaining,
      dueAt: dueDate.getTime(),
      status,
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining || a.employeeName.localeCompare(b.employeeName));
}
