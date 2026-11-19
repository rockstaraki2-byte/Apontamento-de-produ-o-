import type {
  PreventiveIntervalUnit,
  PreventivePlanStatus,
  PreventiveMaintenancePlan,
} from "./types";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function addPreventiveInterval(
  baseDate: string,
  intervalValue: number,
  intervalUnit: PreventiveIntervalUnit,
): string {
  if (!isValidDateOnly(baseDate)) throw new Error("Data-base preventiva inválida.");
  if (!Number.isInteger(intervalValue) || intervalValue <= 0) {
    throw new Error("A periodicidade deve ser um número inteiro positivo.");
  }

  const [year, month, day] = baseDate.split("-").map(Number);
  if (intervalUnit === "DAYS") {
    const date = new Date(Date.UTC(year, month - 1, day + intervalValue));
    return date.toISOString().slice(0, 10);
  }

  const targetMonth = month - 1 + intervalValue;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)));
  return result.toISOString().slice(0, 10);
}

export function businessDateFromTimestamp(
  timestamp: number,
  timeZone = "America/Sao_Paulo",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? year + "-" + month + "-" + day : "";
}

export function daysBetween(fromDate: string, toDate: string): number {
  if (!isValidDateOnly(fromDate) || !isValidDateOnly(toDate)) {
    throw new Error("Data preventiva inválida.");
  }
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const to = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((to - from) / 86_400_000);
}

export function getPreventivePlanStatus(
  plan: Pick<PreventiveMaintenancePlan, "nextDueDate" | "alertLeadDays">,
  today: string,
  hasOpenOrder = false,
): PreventivePlanStatus {
  if (hasOpenOrder) return "EM_EXECUCAO";
  if (!plan.nextDueDate) return "PRIMEIRA_PENDENTE";
  const daysUntilDue = daysBetween(today, plan.nextDueDate);
  if (daysUntilDue < 0) return "VENCIDA";
  if (daysUntilDue === 0) return "VENCE_HOJE";
  const leadDays = Array.isArray(plan.alertLeadDays)
    ? plan.alertLeadDays.filter((value) => Number.isInteger(value) && value >= 0)
    : [];
  if (daysUntilDue <= Math.max(0, ...leadDays)) return "A_VENCER";
  return "EM_DIA";
}

export function preventivePlanBelongsToTenant(
  record: { tenantId?: string },
  tenantId: string | undefined,
): boolean {
  return Boolean(tenantId && tenantId !== "global" && record.tenantId === tenantId);
}

export function preventiveOrderId(planId: string, dueDate: string): string {
  return "preventive_" + encodeURIComponent(planId) + "_" + (dueDate || "FIRST");
}

export function preventiveAlertId(
  tenantId: string,
  planId: string,
  dueDate: string,
  leadDay: number,
  recipientId: string,
): string {
  return [
    "preventiveAlert",
    encodeURIComponent(tenantId),
    encodeURIComponent(planId),
    dueDate,
    String(leadDay),
    encodeURIComponent(recipientId),
  ].join("_");
}
