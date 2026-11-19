import { createHash, timingSafeEqual } from "node:crypto";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from "./adminFirestore.js";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import {
  businessDateFromTimestamp,
  daysBetween,
  isValidDateOnly,
  preventiveAlertId,
} from "../../src/maintenancePreventive.js";
import type { PreventiveMaintenancePlan } from "../../src/types.js";

const DEFAULT_ALERT_DAYS = [7, 3, 1, 0];
const ALERT_RECIPIENT_ROLES = new Set(["MANUTENCAO", "ADMIN", "GERENCIA", "LEITURA"]);

function isAuthorized(request: Request, expected: string): boolean {
  if (!expected) return false;
  const supplied = request.headers.get("authorization") || "";
  const expectedHeader = "Bearer " + expected;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expectedHeader);
  return suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function alertLabel(days: number): string {
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return "vence em " + days + " dias";
}

function severityFor(days: number): "low" | "medium" | "high" | "critical" {
  if (days === 0) return "critical";
  if (days === 1) return "high";
  if (days <= 3) return "medium";
  return "low";
}

function notificationNumericId(deliveryId: string): number {
  return Number.parseInt(createHash("sha256").update(deliveryId).digest("hex").slice(0, 12), 16);
}

export async function handlePreventiveMaintenanceAlerts(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET || "";
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  if (!isAuthorized(request, cronSecret)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const db = getFirebaseAdmin().db;
    const today = businessDateFromTimestamp(Date.now());
    const plansSnapshot = await getDocs(
      query(collection(db, "preventiveMaintenancePlans"), where("active", "==", true)),
    );
    const usersByTenant = new Map<string, Array<{ id: string; data: Record<string, any> }>>();
    let checked = 0;
    let created = 0;

    for (const planDocument of plansSnapshot.docs) {
      const plan = planDocument.data() as PreventiveMaintenancePlan;
      const tenantId = String(plan.tenantId || "");
      const dueDate = String(plan.nextDueDate || "");
      if (!tenantId || tenantId === "global" || !isValidDateOnly(dueDate)) continue;
      checked += 1;

      const daysUntilDue = daysBetween(today, dueDate);
      const configuredDays = Array.isArray(plan.alertLeadDays)
        ? plan.alertLeadDays.filter((value) => Number.isInteger(value) && value >= 0)
        : DEFAULT_ALERT_DAYS;
      if (!configuredDays.includes(daysUntilDue)) continue;

      let tenantUsers = usersByTenant.get(tenantId);
      if (!tenantUsers) {
        const userSnapshot = await getDocs(
          query(collection(db, "users"), where("tenantId", "==", tenantId)),
        );
        tenantUsers = userSnapshot.docs
          .map((userDocument) => ({
            id: String(userDocument.data().id || userDocument.id),
            data: userDocument.data() as Record<string, any>,
          }))
          .filter((user) =>
            user.data.tenantId === tenantId &&
            user.data.active !== false &&
            ALERT_RECIPIENT_ROLES.has(String(user.data.role || "")),
          );
        usersByTenant.set(tenantId, tenantUsers);
      }

      for (const recipient of tenantUsers) {
        const deliveryId = preventiveAlertId(
          tenantId,
          plan.id || planDocument.id,
          dueDate,
          daysUntilDue,
          recipient.id,
        );
        const numericId = notificationNumericId(deliveryId);
        const notificationRef = doc(db, "notifications", String(numericId));
        const deliveryRef = doc(db, "maintenancePreventiveAlertDeliveries", deliveryId);
        const timestamp = Date.now();
        const distance = alertLabel(daysUntilDue);
        const assetName = plan.assetName || "Equipamento";
        const activity = plan.activity || "Manutenção preventiva";
        const message = activity + " em " + assetName + " " + distance + " (" + dueDate.split("-").reverse().join("/") + ").";

        const wasCreated = await runTransaction(db, async (transaction) => {
          const [deliverySnapshot, notificationSnapshot] = await Promise.all([
            transaction.get(deliveryRef),
            transaction.get(notificationRef),
          ]);
          if (deliverySnapshot.exists()) return false;
          if (notificationSnapshot.exists()) {
            transaction.set(deliveryRef, {
              id: deliveryId,
              tenantId,
              planId: plan.id || planDocument.id,
              dueDate,
              leadDay: daysUntilDue,
              recipientId: recipient.id,
              createdAt: timestamp,
              outcome: "NOTIFICATION_ALREADY_EXISTS",
            });
            return false;
          }

          transaction.set(deliveryRef, {
            id: deliveryId,
            tenantId,
            planId: plan.id || planDocument.id,
            dueDate,
            leadDay: daysUntilDue,
            recipientId: recipient.id,
            createdAt: timestamp,
          });
          transaction.set(notificationRef, {
            id: numericId,
            tenantId,
            recipientId: recipient.id,
            type: "MAINTENANCE_PREVENTIVE",
            title: "Preventiva " + distance,
            message,
            read: false,
            createdAt: timestamp,
            severity: severityFor(daysUntilDue),
            actionUrl: "/manutencao",
            details: {
              planId: plan.id || planDocument.id,
              assetId: plan.assetId,
              assetName,
              activity,
              dueDate,
              daysUntilDue,
              deliveryId,
            },
          });
          return true;
        });
        if (wasCreated) created += 1;
      }
    }

    return Response.json({ ok: true, date: today, plansChecked: checked, notificationsCreated: created });
  } catch (error) {
    console.error("[preventive-maintenance-alerts] Falha ao emitir avisos:", error);
    return Response.json({ error: "Não foi possível gerar os avisos preventivos." }, { status: 500 });
  }
}
