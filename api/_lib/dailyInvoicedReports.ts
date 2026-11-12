import { timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
} from "./adminFirestore.js";
import { getFirebaseAdmin } from "./firebaseAdmin.js";

const TENANT_ID = "imperio";
const RECIPIENT_EMAIL = "gerencia.imperiojomarci@gmail.com";
const COMPANY_NAME = "Império Jomarci";
const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const MONTH_ABBREVIATIONS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const DELIVERY_LOCK_MILLIS = 15 * 60 * 1000;

type Row = Record<string, any>;
type BillingGroup = {
  representativeName: string;
  representativeId?: string;
  orders: Array<{ order: Row; quantity: number }>;
  totalValue: number;
  totalItems: number;
};
type RepresentativeDailySnapshot = {
  name: string;
  amountCents: number;
  invoiceCount: number;
};

function businessDateFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return year && month && day ? year + "-" + month + "-" + day : "";
}

function currentBusinessDate(): string {
  return businessDateFromDate(new Date());
}

function localDateString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return businessDateFromDate(value);
  if (typeof value === "object" && typeof (value as any).toDate === "function") {
    return businessDateFromDate((value as any).toDate());
  }
  if (typeof value === "number") return businessDateFromDate(new Date(value));
  if (typeof value !== "string") return "";

  const cleaned = value.trim();
  if (!cleaned) return "";
  if (/^\d+$/.test(cleaned)) {
    return businessDateFromDate(new Date(Number.parseInt(cleaned, 10)));
  }
  if (cleaned.includes("/")) {
    const parts = cleaned.split(" ")[0].split("/");
    if (parts.length === 3) {
      return parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
    }
  }
  if (cleaned.includes("-")) {
    const parts = cleaned.split("T")[0].split(" ")[0].split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return parts[0] + "-" + parts[1].padStart(2, "0") + "-" + parts[2].padStart(2, "0");
      }
      return parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
    }
  }
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? "" : businessDateFromDate(parsed);
}

function dateLabel(date: string): string {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const monthIndex = Number(parts[1]) - 1;
  const month = MONTH_ABBREVIATIONS[monthIndex] || parts[1];
  return Number(parts[2]) + "/" + month;
}

function normalizeRepresentativeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function resolveRepresentativeName(order: Row, customers: Row[]): string {
  const representativeName = String(order.representativeName || "");
  const representativeUpper = representativeName.toUpperCase().trim();
  const customer = customers.find(
    (entry) =>
      entry.name === order.customerName ||
      entry.tradeName === order.customerName,
  );
  const customerName = String(order.customerName || "").toUpperCase();
  const tradeName = String(customer?.tradeName || "").toUpperCase();
  const customerId = Number(customer?.id);

  if (
    customerName.includes("TOQUE") ||
    tradeName.includes("TOQUE") ||
    customerId === 1218
  ) {
    return "Império Representante";
  }

  const isKesseCustomer =
    customerId === 370 ||
    customerId === 1267 ||
    customerName.includes("STORE") ||
    customerName.includes("LEO DECOR") ||
    customerName.includes("DESIGN") ||
    (customerName.includes("DECOR") &&
      !customerName.includes("DECORACO") &&
      !customerName.includes("DECORAÇ")) ||
    tradeName.includes("STORE") ||
    tradeName.includes("LEO DECOR") ||
    tradeName.includes("DESIGN") ||
    (tradeName.includes("DECOR") &&
      !tradeName.includes("DECORACO") &&
      !tradeName.includes("DECORAÇ"));

  if (
    !representativeName ||
    representativeUpper === "INDEFINIDA" ||
    representativeUpper === "INDEFINIDO" ||
    representativeUpper === "NÃO DEFINIDO" ||
    representativeUpper === "VENDA DIRETA"
  ) {
    return isKesseCustomer ? "Kesse Representante" : "Venda Direta";
  }

  const lowered = representativeName.toLowerCase();
  if (lowered.includes("kesse")) return "Kesse Representante";
  if (lowered.includes("imperio") || lowered.includes("império")) {
    return "Império Representante";
  }
  if (lowered.includes("andre") || lowered.includes("andré")) {
    return "André Representante";
  }
  if (lowered.includes("danilo")) return "Danilo Representante";
  return representativeName;
}

function isAuthorized(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function finiteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dailyRepresentativeSnapshot(
  monthlySnapshots: Row[],
  date: string,
): Map<string, RepresentativeDailySnapshot> | null {
  const monthKey = date.slice(0, 7);
  const snapshot = monthlySnapshots.find((entry) => entry.monthKey === monthKey);
  if (
    !snapshot ||
    snapshot.tenantId !== TENANT_ID ||
    snapshot.source !== "TEKSYSTEM" ||
    !snapshot.snapshotGeneratedAt ||
    !snapshot.snapshotSyncId ||
    typeof snapshot.completeThroughDate !== "string" ||
    snapshot.completeThroughDate < date ||
    snapshot.completeThroughDate.slice(0, 7) !== monthKey
  ) {
    return null;
  }

  const dailyTotal = snapshot.dailyTotals?.[date];
  if (
    !dailyTotal ||
    !Number.isSafeInteger(dailyTotal.amountCents) ||
    !Number.isSafeInteger(dailyTotal.invoiceCount) ||
    dailyTotal.invoiceCount < 0
  ) {
    return null;
  }

  const representatives = new Map<string, RepresentativeDailySnapshot>();
  let amountCents = 0;
  let invoiceCount = 0;
  for (const [representativeId, representative] of Object.entries(
    snapshot.representatives || {},
  ) as Array<[string, Row]>) {
    const daily = representative.dailyTotals?.[date];
    if (
      !representative.name ||
      !daily ||
      !Number.isSafeInteger(daily.amountCents) ||
      !Number.isSafeInteger(daily.invoiceCount) ||
      daily.invoiceCount < 0
    ) {
      return null;
    }
    amountCents += daily.amountCents;
    invoiceCount += daily.invoiceCount;
    representatives.set(representativeId, {
      name: String(representative.name),
      amountCents: daily.amountCents,
      invoiceCount: daily.invoiceCount,
    });
  }

  if (
    amountCents !== dailyTotal.amountCents ||
    invoiceCount !== dailyTotal.invoiceCount
  ) {
    return null;
  }
  return representatives;
}

function buildRepresentativePdf(
  group: BillingGroup,
  date: string,
  items: Row[],
): Buffer {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const formatDate = (dateValue: string) => {
    const parts = dateValue.split("-");
    return parts.length === 3
      ? parts[2] + "/" + parts[1] + "/" + parts[0]
      : dateValue;
  };

  pdf.setFillColor(0, 177, 79);
  pdf.rect(14, 12, 182, 1.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(30, 41, 59);
  pdf.text(COMPANY_NAME.toUpperCase(), 14, 22);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("RELATÓRIO DE FATURAMENTO CONSOLIDADO", 14, 27);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);
  pdf.text("Data do Faturado: " + formatDate(date), 14, 35);
  pdf.text("Representante: " + group.representativeName, 14, 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    "Gerado digitalmente em: " +
      new Date().toLocaleString("pt-BR", { timeZone: BUSINESS_TIME_ZONE }),
    14,
    45,
  );
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(14, 48, 196, 48);

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(241, 245, 249);
  pdf.rect(14, 52, 88, 18, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text("PEDIDOS FATURADOS", 18, 57);
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.text(String(group.orders.length), 18, 64);
  pdf.rect(108, 52, 88, 18, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text("TOTAL DE PEÇAS", 112, 57);
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.text(group.totalItems + " un", 112, 64);

  const rows = group.orders.map(({ order, quantity }) => {
    const item = items.find((entry) => String(entry.id) === String(order.itemId));
    const productName =
      item?.name || order.customProductName || "Produto #" + order.itemId;
    const productCode = item?.code ? "[" + item.code + "] " : "";
    const accumulated =
      order.status === "FATURADO"
        ? finiteNumber(order.totalQuantity)
        : finiteNumber(order.invoicedQuantity);
    const totalQuantity = finiteNumber(order.totalQuantity);
    return [
      "#" + String(order.orderCode || order.id),
      String(order.customerName || "-"),
      productCode + productName,
      [
        order.color || "-",
        order.size || "-",
        order.variation || "-",
      ].join(" / "),
      quantity + " (" + accumulated + "/" + totalQuantity + ")",
    ];
  });

  autoTable(pdf, {
    head: [["Pedido", "Cliente", "Produto", "C/T/V", "Qtd. Fat"]],
    body: rows,
    startY: 76,
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: "helvetica",
      textColor: [51, 65, 85],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [0, 177, 79], cellWidth: 20 },
      1: { cellWidth: 45 },
      2: { cellWidth: 67 },
      3: { cellWidth: 30 },
      4: { fontStyle: "bold", halign: "center", cellWidth: 20 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14, top: 15, bottom: 20 },
    didDrawPage: (data) => {
      const pageCount = (pdf as any).internal.getNumberOfPages();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        "Página " + data.pageNumber + " de " + pageCount,
        pdf.internal.pageSize.getWidth() / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: "center" },
      );
    },
  });

  const finalY = (pdf as any).lastAutoTable?.finalY || 80;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const signatureY = finalY + 40 > pageHeight - 15 ? 25 : finalY + 10;
  if (signatureY === 25) {
    pdf.addPage();
    pdf.setFillColor(0, 177, 79);
    pdf.rect(14, 12, 182, 1.5, "F");
  }
  drawSignatures(pdf, signatureY, group.totalValue, group.orders.length, group.totalItems);
  return Buffer.from(pdf.output("arraybuffer"));
}

function drawSignatures(
  pdf: jsPDF,
  startY: number,
  _totalValue: number,
  _orderCount: number,
  _itemCount: number,
): void {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text("Notas e Termos de Expedição:", 14, startY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    "O faturamento consolidado acima reflete a conferência física e liberação das peças finalizadas.",
    14,
    startY + 4.5,
  );
  pdf.text(
    "As baixas de estoque foram processadas conforme regimento interno " + COMPANY_NAME + ".",
    14,
    startY + 8,
  );
  const signatureY = startY + 24;
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(14, signatureY, 80, signatureY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text("Assinatura Gerencial", 14, signatureY + 4);
  pdf.line(130, signatureY, 196, signatureY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text("PCP " + COMPANY_NAME, 130, signatureY + 4);
}

function safeAttachmentName(value: string): string {
  return value.replace(/[\\:*?"<>|\r\n]/g, " ").replace(/\s+/g, " ").trim() || "Representante";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function handleDailyInvoicedReports(request: Request): Promise<Response> {
  const expectedSecret = process.env.CRON_SECRET || "";
  if (!expectedSecret) {
    return Response.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "", expectedSecret)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const smtpHost = process.env.SMTP_HOST || "";
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  if (!smtpHost || !smtpUser || !smtpPass || !Number.isInteger(smtpPort)) {
    return Response.json({ error: "Envio de e-mail não configurado." }, { status: 503 });
  }

  const reportDate = currentBusinessDate();
  if (!reportDate) {
    return Response.json({ error: "Não foi possível determinar a data local." }, { status: 500 });
  }
  const dateForFilename = dateLabel(reportDate);
  let dbForMarker: any = null;
  let deliveryMarkerRef: any = null;
  let deliveryClaimed = false;

  try {
    const db = getFirebaseAdmin().db;
    dbForMarker = db;
    const [ordersSnapshot, logsSnapshot, itemsSnapshot, customersSnapshot, settingsSnapshot, representativeSnapshots] =
      await Promise.all([
        getDocs(query(collection(db, "orders"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(
          collection(db, "logs"),
          where("tenantId", "==", TENANT_ID),
          where("type", "==", "FATURAMENTO"),
        )),
        getDocs(query(collection(db, "items"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "customers"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "systemSettings"), where("tenantId", "==", TENANT_ID))),
        getDocs(query(collection(db, "teksystemBillingRepresentativeMonthlyTotals"), where("tenantId", "==", TENANT_ID))),
      ]);

    const orders = ordersSnapshot.docs.map((snapshot) => ({
      ...snapshot.data(),
      id: snapshot.data().id ?? snapshot.id,
    })) as Row[];
    const logs = logsSnapshot.docs.map((snapshot) => snapshot.data()) as Row[];
    const items = itemsSnapshot.docs.map((snapshot) => ({
      ...snapshot.data(),
      id: snapshot.data().id ?? snapshot.id,
    })) as Row[];
    const customers = customersSnapshot.docs.map((snapshot) => ({
      ...snapshot.data(),
      id: snapshot.data().id ?? snapshot.id,
    })) as Row[];
    const settings = settingsSnapshot.docs[0]?.data() as Row | undefined;
    const manualRepAdjustments =
      settings?.manualRepAdjustments && typeof settings.manualRepAdjustments === "object"
        ? settings.manualRepAdjustments as Record<string, unknown>
        : {};
    const monthlySnapshots = representativeSnapshots.docs.map((snapshot) => snapshot.data()) as Row[];

    const logsByOrder = new Map<string, Row[]>();
    for (const log of logs) {
      if (log.type !== "FATURAMENTO" || log.orderId === undefined || log.orderId === null) continue;
      const key = String(log.orderId);
      const previous = logsByOrder.get(key) || [];
      previous.push(log);
      logsByOrder.set(key, previous);
    }

    const groups = new Map<string, BillingGroup>();
    for (const order of orders) {
      const isInvoiced =
        order.status === "FATURADO" ||
        order.status === "FATURADO_PARCIAL" ||
        finiteNumber(order.invoicedQuantity) > 0;
      if (!isInvoiced) continue;

      const orderLogs = logsByOrder.get(String(order.id)) || [];
      let quantity = 0;
      if (orderLogs.length > 0) {
        quantity = orderLogs
          .filter((log) => localDateString(log.timestamp) === reportDate)
          .reduce((sum, log) => sum + finiteNumber(log.quantityInvoiced), 0);
      } else if (localDateString(order.deliveryDate) === reportDate) {
        quantity =
          order.status === "FATURADO"
            ? finiteNumber(order.totalQuantity)
            : finiteNumber(order.invoicedQuantity);
      }
      if (quantity <= 0) continue;

      const representativeName = resolveRepresentativeName(order, customers);
      const key = representativeName;
      const group = groups.get(key) || {
        representativeName,
        representativeId: order.representativeId ? String(order.representativeId) : undefined,
        orders: [],
        totalValue: 0,
        totalItems: 0,
      };
      group.orders.push({ order, quantity });
      group.totalValue += quantity * finiteNumber(order.unitPrice);
      group.totalItems += quantity;
      groups.set(key, group);
    }

    const dailySnapshot = dailyRepresentativeSnapshot(monthlySnapshots, reportDate);
    if (dailySnapshot) {
      for (const group of groups.values()) {
        const byId = group.representativeId
          ? dailySnapshot.get(group.representativeId)
          : undefined;
        const normalizedName = normalizeRepresentativeLabel(group.representativeName);
        const byName = Array.from(dailySnapshot.values()).find(
          (entry) => normalizeRepresentativeLabel(entry.name) === normalizedName,
        );
        const authoritative = byId || byName;
        group.totalValue = authoritative ? authoritative.amountCents / 100 : 0;
      }
    } else {
      for (const group of groups.values()) {
        const adjustment = manualRepAdjustments[group.representativeName];
        if (typeof adjustment === "number" && Number.isFinite(adjustment)) {
          group.totalValue += adjustment;
        }
      }
    }

    const reportGroups = Array.from(groups.values())
      .filter((group) => group.orders.length > 0)
      .sort((left, right) => right.totalValue - left.totalValue);

    const attachments = reportGroups.map((group) => ({
      filename:
        "Faturados de hoje, " +
        dateForFilename +
        ", " +
        safeAttachmentName(group.representativeName) +
        ".pdf",
      content: buildRepresentativePdf(group, reportDate, items),
      contentType: "application/pdf",
    }));

    const formattedDate = reportDate.split("-").reverse().join("/");
    const summaryHtml = reportGroups.length
      ? "<ul>" +
        reportGroups.map((group) =>
          "<li><strong>" + escapeHtml(group.representativeName) + "</strong>: " +
          group.orders.length + " pedidos, " + group.totalItems +
          " peças faturadas, R$ " +
          group.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) +
          "</li>",
        ).join("") +
        "</ul>"
      : "<p>Nenhum item foi faturado hoje.</p>";
    const html =
      "<div style=\"font-family:Arial,sans-serif;color:#1e293b;line-height:1.6\">" +
      "<h2>Faturados de hoje — " + formattedDate + "</h2>" +
      "<p>Segue o compilado diário de faturamento por consultor/representante do tenant Império.</p>" +
      summaryHtml +
      "<p>Os PDFs detalhados estão anexados a este e-mail.</p>" +
      "</div>";

    const markerId = "imperio_daily_invoiced_" + reportDate;
    const markerRef = doc(db, "scheduledReportDeliveries", markerId);
    deliveryMarkerRef = markerRef;
    const claimed = await runTransaction(db, async (transaction) => {
      const current = await transaction.get(markerRef);
      const existing = current.data() as Row | undefined;
      if (existing?.status === "SENT") return false;
      if (
        existing?.status === "SENDING" &&
        Date.now() - finiteNumber(existing.startedAt) < DELIVERY_LOCK_MILLIS
      ) {
        return false;
      }
      transaction.set(
        markerRef,
        {
          tenantId: TENANT_ID,
          reportType: "DAILY_INVOICED_BY_REPRESENTATIVE",
          reportDate,
          status: "SENDING",
          startedAt: Date.now(),
        },
        { merge: true },
      );
      return true;
    });
    if (!claimed) {
      return Response.json({ success: true, skipped: true, reportDate });
    }
    deliveryClaimed = true;

    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const from = process.env.SMTP_FROM || smtpUser;
    const info = await transport.sendMail({
      from: "\"" + COMPANY_NAME + " - Faturamento\" <" + from + ">",
      to: RECIPIENT_EMAIL,
      subject: "Faturados de hoje, " + dateForFilename,
      html,
      attachments,
    });

    try {
      await setDoc(
        markerRef,
        {
          status: "SENT",
          finishedAt: Date.now(),
          messageId: info.messageId || "",
          attachmentCount: attachments.length,
        },
        { merge: true },
      );
    } catch (markerError) {
      console.error(
        "[daily-invoiced-reports] E-mail enviado, mas não foi possível registrar a confirmação:",
        markerError instanceof Error ? markerError.name : "UNKNOWN_ERROR",
      );
    }
    deliveryClaimed = false;
    return Response.json({
      success: true,
      reportDate,
      representativeCount: reportGroups.length,
      attachmentCount: attachments.length,
    });
  } catch (error) {
    if (deliveryClaimed && deliveryMarkerRef && dbForMarker) {
      try {
        await setDoc(
          deliveryMarkerRef,
          {
            status: "FAILED",
            failedAt: Date.now(),
            failureCode: "REPORT_GENERATION_OR_SEND_FAILED",
          },
          { merge: true },
        );
      } catch {
        // The report failure is already captured below; keep this log free of customer data.
      }
    }
    console.error(
      "[daily-invoiced-reports] Falha na geração/envio do relatório:",
      error instanceof Error ? error.name + ":" + error.message : "UNKNOWN_ERROR",
    );
    return Response.json({ error: "Falha ao gerar ou enviar os PDFs do faturamento." }, { status: 500 });
  }
}
