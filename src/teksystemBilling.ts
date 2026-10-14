import type { TekSystemBillingMonthlyTotal } from "./types";

export interface CompleteTekSystemBillingMonth {
  monthKey: string;
  amountCents: number;
  dailyAmountsCents: Record<string, number>;
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
