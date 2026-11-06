import { requireCalendarManager } from "../../_lib/googleCalendarAuth.js";
import {
  getGoogleCalendarAccessToken,
  getGoogleCalendarConfig,
  googleCalendarRequest,
  GoogleCalendarApiError,
} from "../../_lib/googleCalendarClient.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    await requireCalendarManager(req);
    let config;
    try {
      config = getGoogleCalendarConfig();
    } catch (error) {
      const message = String((error as any)?.message || "");
      if (message === "GOOGLE_CALENDAR_NOT_CONFIGURED") {
        return res.status(200).json({ configured: false, calendarAccessible: false });
      }
      return res.status(200).json({
        configured: false,
        calendarAccessible: false,
        error: "GOOGLE_CALENDAR_INVALID_CONFIG",
      });
    }

    try {
      const accessToken = await getGoogleCalendarAccessToken();
      await googleCalendarRequest(accessToken, "GET", "events?maxResults=1");
      return res.status(200).json({
        configured: true,
        calendarAccessible: true,
        serviceAccountEmail: config.serviceAccountEmail,
      });
    } catch (error) {
      const message = String((error as any)?.message || "");
      const errorCode = error instanceof GoogleCalendarApiError
        ? "GOOGLE_CALENDAR_ACCESS_DENIED"
        : message === "GOOGLE_CALENDAR_AUTH_FAILED"
          ? "GOOGLE_CALENDAR_AUTH_FAILED"
          : "GOOGLE_CALENDAR_ACCESS_DENIED";
      return res.status(200).json({
        configured: true,
        calendarAccessible: false,
        serviceAccountEmail: config.serviceAccountEmail,
        error: errorCode,
      });
    }
  } catch (error) {
    const message = String((error as any)?.message || "");
    if (message === "UNAUTHORIZED") return res.status(401).json({ error: "UNAUTHORIZED" });
    if (message === "FORBIDDEN") return res.status(403).json({ error: "FORBIDDEN" });
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_PROJECT_MISMATCH") {
      return res.status(503).json({ error: "APONTAPRO_DATA_UNAVAILABLE" });
    }
    return res.status(500).json({ error: "GOOGLE_CALENDAR_STATUS_FAILED" });
  }
}
