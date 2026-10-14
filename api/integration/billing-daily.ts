import { timingSafeEqual } from "node:crypto";

type DailyTotal = {
  amountCents?: unknown;
  invoiceCount?: unknown;
};

type MonthlySnapshot = {
  tenantId?: unknown;
  monthKey?: unknown;
  completeThroughDate?: unknown;
  dailyTotals?: unknown;
  amountCents?: unknown;
  invoiceCount?: unknown;
  snapshotGeneratedAt?: unknown;
  snapshotSyncId?: unknown;
  source?: unknown;
};

function currentBusinessDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? year + "-" + month + "-" + day : "";
}

function csvCell(value: string): string {
  return '"' + value.replace(/"/g, '""') + '"';
}

function csvResponse(rows: string[][]): Response {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function isAuthorized(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Read-only daily billing feed from complete TekSystem snapshots.
 * The CSV intentionally includes only dates covered by the validated snapshot.
 */
export async function GET(request: Request): Promise<Response> {
  const expectedToken = process.env.APONTAPRO_SHEETS_API_TOKEN || "";
  const url = new URL(request.url);
  const suppliedToken = url.searchParams.get("token") || "";

  if (!expectedToken) {
    return Response.json(
      { error: "Integração ainda não configurada." },
      { status: 503 },
    );
  }
  if (!isAuthorized(suppliedToken, expectedToken)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const monthKey = url.searchParams.get("month") || currentBusinessDate().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    return Response.json(
      { error: "Informe month no formato YYYY-MM." },
      { status: 400 },
    );
  }

  const today = currentBusinessDate();
  const currentMonth = today.slice(0, 7);
  if (!today || monthKey > currentMonth) {
    return Response.json(
      { error: "A competência solicitada ainda não está disponível." },
      { status: 400 },
    );
  }

  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysCovered = monthKey === currentMonth
    ? Number(today.slice(8, 10))
    : daysInMonth;
  const requiredThroughDate = monthKey === currentMonth
    ? today
    : monthKey + "-" + String(daysInMonth).padStart(2, "0");

  try {
    const [{ getApps, initializeApp }, firestore, configModule] = await Promise.all([
      import("firebase/app"),
      import("firebase/firestore"),
      import("../../firebase-applet-config.json", { with: { type: "json" } }),
    ]);
    const firebaseConfig = configModule.default;
    const existingApp = getApps().find((candidate) => candidate.name === "billing-daily-sheet");
    const app = existingApp || initializeApp(firebaseConfig, "billing-daily-sheet");
    const db = existingApp
      ? firestore.getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : firestore.initializeFirestore(
          app,
          { experimentalForceLongPolling: true },
          firebaseConfig.firestoreDatabaseId,
        );

    const snapshots = await firestore.getDocs(
      firestore.query(
        firestore.collection(db, "teksystemBillingMonthlyTotals"),
        firestore.where("tenantId", "==", "imperio"),
        firestore.where("monthKey", "==", monthKey),
      ),
    );
    const snapshot = snapshots.docs[0]?.data() as MonthlySnapshot | undefined;
    const dailyTotals = snapshot?.dailyTotals as Record<string, DailyTotal> | undefined;

    if (
      !snapshot ||
      snapshot.source !== "TEKSYSTEM" ||
      snapshot.tenantId !== "imperio" ||
      snapshot.monthKey !== monthKey ||
      snapshot.completeThroughDate !== requiredThroughDate ||
      !snapshot.snapshotGeneratedAt ||
      !snapshot.snapshotSyncId ||
      !dailyTotals ||
      typeof dailyTotals !== "object"
    ) {
      return Response.json(
        { error: "O fechamento diário do TekSystem ainda não está completo para essa competência." },
        { status: 409 },
      );
    }

    let amountCents = 0;
    let invoiceCount = 0;
    const rows: string[][] = [["data", "faturamento"]];
    for (let day = 1; day <= daysCovered; day += 1) {
      const date = monthKey + "-" + String(day).padStart(2, "0");
      const daily = dailyTotals[date];
      if (
        !daily ||
        typeof daily.amountCents !== "number" ||
        !Number.isSafeInteger(daily.amountCents) ||
        typeof daily.invoiceCount !== "number" ||
        !Number.isSafeInteger(daily.invoiceCount) ||
        daily.invoiceCount < 0
      ) {
        return Response.json(
          { error: "O fechamento diário do TekSystem contém um dia incompleto." },
          { status: 409 },
        );
      }
      amountCents += daily.amountCents;
      invoiceCount += daily.invoiceCount;
      rows.push([date, (daily.amountCents / 100).toFixed(2)]);
    }

    if (
      !Number.isSafeInteger(amountCents) ||
      !Number.isSafeInteger(invoiceCount) ||
      amountCents !== snapshot.amountCents ||
      invoiceCount !== snapshot.invoiceCount
    ) {
      return Response.json(
        { error: "O total diário não confere com o fechamento mensal do TekSystem." },
        { status: 409 },
      );
    }

    return csvResponse(rows);
  } catch (error) {
    console.error("[billing-daily-sheet-sync] Falha ao ler fechamento diário do TekSystem:", error);
    return Response.json(
      { error: "Não foi possível consultar o fechamento diário do TekSystem." },
      { status: 500 },
    );
  }
}
