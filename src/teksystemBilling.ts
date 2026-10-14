import type {
  TekSystemBillingMonthlyTotal,
  TekSystemRepresentativeBillingMonthlyTotal,
} from "./types";

export interface CompleteTekSystemBillingMonth {
  monthKey: string;
  amountCents: number;
  dailyAmountsCents: Record<string, number>;
  snapshotGeneratedAt: string;
}

export interface CompleteTekSystemRepresentativeBillingRange {
  startDate: string;
  endDate: string;
  amountCents: number;
  invoiceCount: number;
  representatives: Record<string, { name: string; amountCents: number; invoiceCount: number }>;
  snapshotGeneratedAt: string;
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayCount(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
  return new Date(year, month, 0).getDate();
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getCompleteTekSystemRepresentativeBillingRange(
  snapshots: TekSystemRepresentativeBillingMonthlyTotal[],
  startDate: string,
  endDate: string,
  now = new Date(),
): CompleteTekSystemRepresentativeBillingRange | null {
  if (!isValidDateKey(startDate) || !isValidDateKey(endDate) || startDate > endDate) return null;
  const today = formatLocalDate(now);
  if (endDate > today) return null;

  const monthlySnapshots = new Map(snapshots.map((snapshot) => [snapshot.monthKey, snapshot]));
  const representatives: CompleteTekSystemRepresentativeBillingRange["representatives"] = {};
  let amountCents = 0;
  let invoiceCount = 0;
  let latestSnapshotAt = "";
  let cursor = startDate;
  while (cursor <= endDate) {
    const monthKey = cursor.slice(0, 7);
    const month = monthlySnapshots.get(monthKey);
    if (!month || !month.snapshotGeneratedAt || !month.snapshotSyncId || !month.dailyTotals || !month.representatives) return null;
    const requiredThroughDate = monthKey + "-" + String(
      monthKey === endDate.slice(0, 7) ? Number(endDate.slice(8, 10)) : dayCount(monthKey),
    ).padStart(2, "0");
    if (month.completeThroughDate < requiredThroughDate || month.completeThroughDate.slice(0, 7) !== monthKey) return null;

    const daily = month.dailyTotals[cursor];
    if (!daily || !Number.isSafeInteger(daily.amountCents) || !Number.isSafeInteger(daily.invoiceCount) || daily.invoiceCount < 0) return null;
    let dailyAmountSum = 0;
    let dailyInvoiceSum = 0;
    for (const [representativeId, representative] of Object.entries(month.representatives)) {
      const repDaily = representative.dailyTotals?.[cursor];
      if (!representative.name || !repDaily || !Number.isSafeInteger(repDaily.amountCents) ||
        !Number.isSafeInteger(repDaily.invoiceCount) || repDaily.invoiceCount < 0) return null;
      dailyAmountSum += repDaily.amountCents;
      dailyInvoiceSum += repDaily.invoiceCount;
      const target = representatives[representativeId] || {
        name: representative.name,
        amountCents: 0,
        invoiceCount: 0,
      };
      target.amountCents += repDaily.amountCents;
      target.invoiceCount += repDaily.invoiceCount;
      representatives[representativeId] = target;
    }
    if (dailyAmountSum !== daily.amountCents || dailyInvoiceSum !== daily.invoiceCount) return null;
    amountCents += daily.amountCents;
    invoiceCount += daily.invoiceCount;
    if (month.snapshotGeneratedAt > latestSnapshotAt) latestSnapshotAt = month.snapshotGeneratedAt;

    const [year, monthNumber, day] = cursor.split("-").map(Number);
    cursor = new Date(Date.UTC(year, monthNumber - 1, day + 1)).toISOString().slice(0, 10);
  }

  const representativeAmount = Object.values(representatives).reduce((sum, item) => sum + item.amountCents, 0);
  const representativeInvoices = Object.values(representatives).reduce((sum, item) => sum + item.invoiceCount, 0);
  if (representativeAmount !== amountCents || representativeInvoices !== invoiceCount) return null;
  return { startDate, endDate, amountCents, invoiceCount, representatives, snapshotGeneratedAt: latestSnapshotAt };
}

export function getCompleteTekSystemRepresentativeBillingMonth(
  snapshots: TekSystemRepresentativeBillingMonthlyTotal[],
  monthKey: string,
  now = new Date(),
): CompleteTekSystemRepresentativeBillingRange | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey) || dayCount(monthKey) < 1) return null;
  const today = formatLocalDate(now);
  const currentMonth = today.slice(0, 7);
  if (monthKey > currentMonth) return null;
  const throughDay = monthKey === currentMonth ? Number(today.slice(8, 10)) : dayCount(monthKey);
  const endDate = monthKey + "-" + String(throughDay).padStart(2, "0");
  return getCompleteTekSystemRepresentativeBillingRange(snapshots, monthKey + "-01", endDate, now);
}

export function getCompleteTekSystemBillingMonth(
  snapshots: TekSystemBillingMonthlyTotal[],
  monthKey: string,
  now = new Date(),
): CompleteTekSystemBillingMonth | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  if (dayCount(monthKey) < 1) return null;
  const month = snapshots.find((entry) => entry.monthKey === monthKey);
  if (!month || !month.dailyTotals || typeof month.dailyTotals !== "object") return null;

  const today = formatLocalDate(now);
  const currentMonth = today.slice(0, 7);
  if (monthKey > currentMonth) return null;
  const requiredThroughDate = monthKey === currentMonth
    ? today
    : `${monthKey}-${String(dayCount(monthKey)).padStart(2, "0")}`;
  if (month.completeThroughDate !== requiredThroughDate) return null;

  let amountCents = 0;
  let invoiceCount = 0;
  const dailyAmountsCents: Record<string, number> = {};
  const daysCovered = Number(requiredThroughDate.slice(8, 10));
  for (let day = 1; day <= daysCovered; day += 1) {
    const date = `${monthKey}-${String(day).padStart(2, "0")}`;
    const value = month.dailyTotals[date];
    if (!value || !Number.isSafeInteger(value.amountCents) || !Number.isSafeInteger(value.invoiceCount) || value.invoiceCount < 0) {
      return null;
    }
    dailyAmountsCents[date] = value.amountCents;
    amountCents += value.amountCents;
    invoiceCount += value.invoiceCount;
  }

  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents !== month.amountCents ||
    !Number.isSafeInteger(invoiceCount) ||
    invoiceCount !== month.invoiceCount ||
    !month.snapshotGeneratedAt ||
    !month.snapshotSyncId
  ) return null;
  return { monthKey, amountCents, dailyAmountsCents, snapshotGeneratedAt: month.snapshotGeneratedAt };
}

export function getCompleteTekSystemBillingAllTime(
  snapshots: TekSystemBillingMonthlyTotal[],
  now = new Date(),
): { amountCents: number; snapshotGeneratedAt: string } | null {
  if (!snapshots.length) return null;
  const today = formatLocalDate(now);
  const currentMonth = today.slice(0, 7);
  const earliestMonth = snapshots
    .map((entry) => entry.monthKey)
    .filter((monthKey) => /^\d{4}-\d{2}$/.test(monthKey) && monthKey <= currentMonth)
    .sort()[0];
  if (!earliestMonth) return null;

  const [startYear, startMonth] = earliestMonth.split("-").map(Number);
  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);
  let amountCents = 0;
  let latestSnapshotAt = "";
  for (let year = startYear; year <= currentYear; year += 1) {
    const firstMonth = year === startYear ? startMonth : 1;
    const lastMonth = year === currentYear ? currentMonthNumber : 12;
    for (let month = firstMonth; month <= lastMonth; month += 1) {
      const monthKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
      const snapshot = getCompleteTekSystemBillingMonth(snapshots, monthKey, now);
      if (!snapshot) return null;
      amountCents += snapshot.amountCents;
      if (snapshot.snapshotGeneratedAt > latestSnapshotAt) latestSnapshotAt = snapshot.snapshotGeneratedAt;
    }
  }

  if (!Number.isSafeInteger(amountCents)) return null;
  return { amountCents, snapshotGeneratedAt: latestSnapshotAt };
}
