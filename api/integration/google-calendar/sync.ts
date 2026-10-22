import { getFirebaseAdmin, sendMethodNotAllowed } from "../../_lib/firebaseAdmin.js";
import { requireCalendarManager } from "../../_lib/googleCalendarAuth.js";
import {
  getGoogleCalendarAccessToken,
  getGoogleCalendarConfig,
  googleCalendarRequest,
  GoogleCalendarApiError,
} from "../../_lib/googleCalendarClient.js";
import {
  buildCalendarEvent,
  CALENDAR_TIME_ZONE,
  getCalendarDateKey,
  isCargaEligibleForCalendar,
  type CalendarLoad,
  type CalendarOrder,
} from "../../_lib/googleCalendarSync.js";

type GoogleEvent = {
  id?: string;
  extendedProperties?: { private?: Record<string, string> };
};

type GoogleEventsPage = {
  items?: GoogleEvent[];
  nextPageToken?: string;
};

type SyncResult = {
  ok: boolean;
  cargaId: string;
  action?: "created" | "updated";
  error?: string;
};

async function listManagedEvents(
  accessToken: string,
  tenantId: string,
  today: string,
): Promise<GoogleEvent[]> {
  const events: GoogleEvent[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      maxResults: "2500",
      singleEvents: "true",
      showDeleted: "false",
      timeMin: today + "T00:00:00-03:00",
      fields: "items(id,extendedProperties),nextPageToken",
    });
    params.append("privateExtendedProperty", "apontaProTenantId=" + tenantId);
    params.append("privateExtendedProperty", "apontaProSource=ApontaPRO");
    if (pageToken) params.set("pageToken", pageToken);
    const page = await googleCalendarRequest<GoogleEventsPage>(
      accessToken,
      "GET",
      "events?" + params.toString(),
    );
    events.push(...(page?.items || []));
    pageToken = page?.nextPageToken || "";
  } while (pageToken);
  return events;
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

function safeErrorCode(error: unknown): string {
  if (error instanceof GoogleCalendarApiError) {
    if (error.status === 403 || error.status === 404) return "GOOGLE_CALENDAR_ACCESS_DENIED";
    return "GOOGLE_CALENDAR_API_ERROR";
  }
  const message = String((error as any)?.message || "");
  if (message.startsWith("GOOGLE_CALENDAR_")) return message;
  return "GOOGLE_CALENDAR_SYNC_FAILED";
}

async function upsertEvent(
  accessToken: string,
  carga: CalendarLoad,
  tenantId: string,
  ordersById: ReadonlyMap<number, CalendarOrder>,
  existingEvent?: GoogleEvent,
): Promise<"created" | "updated"> {
  const resource = buildCalendarEvent(carga, tenantId, ordersById);
  const eventId = String(existingEvent?.id || resource.id);
  const eventBody: Record<string, unknown> = {
    summary: resource.summary,
    description: resource.description,
    ...(resource.location ? { location: resource.location } : {}),
    start: resource.start,
    end: resource.end,
    status: resource.status,
    visibility: resource.visibility,
    transparency: resource.transparency,
    extendedProperties: resource.extendedProperties,
  };

  if (existingEvent?.id) {
    await googleCalendarRequest(
      accessToken,
      "PATCH",
      "events/" + encodeURIComponent(eventId) + "?sendUpdates=none",
      eventBody,
    );
    return "updated";
  }

  try {
    await googleCalendarRequest(
      accessToken,
      "POST",
      "events?sendUpdates=none",
      { ...eventBody, id: eventId },
    );
    return "created";
  } catch (error) {
    if (error instanceof GoogleCalendarApiError && error.status === 409) {
      await googleCalendarRequest(
        accessToken,
        "PATCH",
        "events/" + encodeURIComponent(eventId) + "?sendUpdates=none",
        eventBody,
      );
      return "updated";
    }
    throw error;
  }
}

async function loadOrders(
  db: FirebaseFirestore.Firestore,
  tenantId: string,
  loads: CalendarLoad[],
): Promise<Map<number, CalendarOrder>> {
  const ids = Array.from(new Set(
    loads.flatMap((load) => load.orderIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  ));
  const ordersById = new Map<number, CalendarOrder>();
  for (let offset = 0; offset < ids.length; offset += 80) {
    const references = ids
      .slice(offset, offset + 80)
      .map((id) => db.collection("orders").doc(String(id)));
    const snapshots = await db.getAll(...references);
    snapshots.forEach((snapshot) => {
      if (!snapshot.exists) return;
      const data = snapshot.data() as Record<string, any>;
      if (String(data.tenantId || "") !== tenantId) return;
      const id = Number(data.id ?? snapshot.id);
      if (!Number.isSafeInteger(id) || id <= 0) return;
      ordersById.set(id, {
        id,
        orderCode: String(data.orderCode || ""),
        customerName: String(data.customerName || ""),
        totalQuantity: Number(data.totalQuantity || 0),
      });
    });
  }
  return ordersById;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
  try {
    const { tenantId } = await requireCalendarManager(req);
    getGoogleCalendarConfig();
    const accessToken = await getGoogleCalendarAccessToken();
    const { db } = getFirebaseAdmin();
    const today = getCalendarDateKey(new Date(), CALENDAR_TIME_ZONE);

    const cargaSnapshot = await db.collection("cargas").where("tenantId", "==", tenantId).get();
    const allLoads = cargaSnapshot.docs
      .map((snapshot) => {
        const data = snapshot.data() as Record<string, any>;
        return { ...data, id: snapshot.id } as CalendarLoad;
      })
      .filter((carga) => carga.tenantId === tenantId);
    const eligibleLoads = allLoads.filter((carga) =>
      isCargaEligibleForCalendar(carga, tenantId, today),
    );
    const ordersById = await loadOrders(db, tenantId, eligibleLoads);
    const existingEvents = await listManagedEvents(accessToken, tenantId, today);
    const existingByCargaId = new Map<string, GoogleEvent>();
    const duplicateEvents: GoogleEvent[] = [];
    for (const event of existingEvents) {
      const cargaId = String(event.extendedProperties?.private?.apontaProCargaId || "");
      if (!cargaId || !event.id) {
        duplicateEvents.push(event);
        continue;
      }
      if (existingByCargaId.has(cargaId)) duplicateEvents.push(event);
      else existingByCargaId.set(cargaId, event);
    }

    const upsertResults = await mapConcurrent(eligibleLoads, 5, async (carga): Promise<SyncResult> => {
      try {
        const action = await upsertEvent(
          accessToken,
          carga,
          tenantId,
          ordersById,
          existingByCargaId.get(carga.id),
        );
        return { ok: true, cargaId: carga.id, action };
      } catch (error) {
        return { ok: false, cargaId: carga.id, error: safeErrorCode(error) };
      }
    });

    const errors = upsertResults.filter((result) => !result.ok);
    let deleted = 0;
    const deleteErrors: Array<{ cargaId: string; error: string }> = [];

    if (errors.length === 0) {
      const desiredIds = new Set(eligibleLoads.map((carga) => carga.id));
      const staleEvents: GoogleEvent[] = [...duplicateEvents];
      for (const [cargaId, event] of existingByCargaId) {
        if (!desiredIds.has(cargaId)) staleEvents.push(event);
      }

      const deleteResults = await mapConcurrent(staleEvents, 5, async (event) => {
        if (!event.id) return { ok: true, cargaId: "" };
        const cargaId = String(event.extendedProperties?.private?.apontaProCargaId || "");
        try {
          await googleCalendarRequest(
            accessToken,
            "DELETE",
            "events/" + encodeURIComponent(event.id) + "?sendUpdates=none",
          );
          return { ok: true, cargaId };
        } catch (error) {
          if (error instanceof GoogleCalendarApiError && (error.status === 404 || error.status === 410)) {
            return { ok: true, cargaId };
          }
          return { ok: false, cargaId, error: safeErrorCode(error) };
        }
      });
      deleteResults.forEach((result) => {
        if (result.ok) deleted += 1;
        else deleteErrors.push({ cargaId: result.cargaId, error: result.error || "GOOGLE_CALENDAR_API_ERROR" });
      });
    }

    const created = upsertResults.filter((result) => result.ok && result.action === "created").length;
    const updated = upsertResults.filter((result) => result.ok && result.action === "updated").length;
    return res.status(200).json({
      ok: errors.length === 0 && deleteErrors.length === 0,
      tenantId,
      dateStart: today,
      timeZone: CALENDAR_TIME_ZONE,
      eligibleLoads: eligibleLoads.length,
      created,
      updated,
      deleted,
      errors: [
        ...errors.map((result) => ({ cargaId: result.cargaId, error: result.error })),
        ...deleteErrors,
      ].slice(0, 20),
      cleanupSkipped: errors.length > 0,
      synchronizedAt: Date.now(),
    });
  } catch (error) {
    const message = String((error as any)?.message || "");
    if (message === "UNAUTHORIZED") return res.status(401).json({ error: "UNAUTHORIZED" });
    if (message === "FORBIDDEN") return res.status(403).json({ error: "FORBIDDEN" });
    if (message === "GOOGLE_CALENDAR_NOT_CONFIGURED" || message === "GOOGLE_CALENDAR_INVALID_CONFIG") {
      return res.status(503).json({ error: message });
    }
    if (message === "GOOGLE_CALENDAR_AUTH_FAILED" || message === "GOOGLE_CALENDAR_REQUEST_FAILED") {
      return res.status(502).json({ error: message });
    }
    if (error instanceof GoogleCalendarApiError) {
      return res.status(502).json({
        error: error.status === 403 || error.status === 404
          ? "GOOGLE_CALENDAR_ACCESS_DENIED"
          : "GOOGLE_CALENDAR_API_ERROR",
      });
    }
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_PROJECT_MISMATCH") {
      return res.status(503).json({ error: "APONTAPRO_DATA_UNAVAILABLE" });
    }
    return res.status(500).json({ error: "GOOGLE_CALENDAR_SYNC_FAILED" });
  }
}
