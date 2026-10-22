import { createSign } from "node:crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_API_ROOT = "https://www.googleapis.com/calendar/v3/calendars/";
const CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const JWT_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";

export interface GoogleCalendarConfig {
  calendarId: string;
  serviceAccountEmail: string;
  privateKey: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

export class GoogleCalendarApiError extends Error {
  constructor(readonly status: number) {
    super("GOOGLE_CALENDAR_API_ERROR");
    this.name = "GoogleCalendarApiError";
  }
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function createServiceAccountAssertion(
  serviceAccountEmail: string,
  privateKey: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encodeBase64Url(JSON.stringify({
    iss: serviceAccountEmail,
    scope: CALENDAR_EVENTS_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }));
  const unsignedAssertion = header + "." + claims;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedAssertion);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");
  return unsignedAssertion + "." + signature;
}

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  const rawKey = String(process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY || "").trim();
  const calendarId = String(process.env.GOOGLE_CALENDAR_ID || "").trim();
  if (!rawKey || !calendarId) throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");
  if (calendarId.toLowerCase() === "primary" || calendarId.includes("/")) {
    throw new Error("GOOGLE_CALENDAR_INVALID_CONFIG");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawKey) as Record<string, unknown>;
  } catch {
    throw new Error("GOOGLE_CALENDAR_INVALID_CONFIG");
  }

  const serviceAccountEmail = String(parsed.client_email || parsed.clientEmail || "").trim();
  const privateKey = String(parsed.private_key || parsed.privateKey || "").replace(/\\n/g, "\n").trim();
  if (
    (parsed.type && parsed.type !== "service_account") ||
    !serviceAccountEmail.includes("@") ||
    !privateKey.includes("BEGIN PRIVATE KEY") ||
    !privateKey.includes("END PRIVATE KEY")
  ) {
    throw new Error("GOOGLE_CALENDAR_INVALID_CONFIG");
  }

  return { calendarId, serviceAccountEmail, privateKey };
}

export function isGoogleCalendarConfigured(): boolean {
  try {
    getGoogleCalendarConfig();
    return true;
  } catch {
    return false;
  }
}

export async function getGoogleCalendarAccessToken(): Promise<string> {
  const config = getGoogleCalendarConfig();
  const assertion = createServiceAccountAssertion(config.serviceAccountEmail, config.privateKey);
  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: JWT_GRANT_TYPE,
        assertion,
      }),
    });
  } catch {
    throw new Error("GOOGLE_CALENDAR_AUTH_FAILED");
  }

  const payload = await response.json().catch(() => ({})) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) throw new Error("GOOGLE_CALENDAR_AUTH_FAILED");
  return payload.access_token;
}

export async function googleCalendarRequest<T = Record<string, unknown>>(
  accessToken: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<T | null> {
  const config = getGoogleCalendarConfig();
  const safePath = path.replace(/^\/+/, "");
  const url = CALENDAR_API_ROOT + encodeURIComponent(config.calendarId) + "/" + safePath;
  const headers: Record<string, string> = { Authorization: "Bearer " + accessToken };
  if (body) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("GOOGLE_CALENDAR_REQUEST_FAILED");
  }

  if (!response.ok) throw new GoogleCalendarApiError(response.status);
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("GOOGLE_CALENDAR_INVALID_RESPONSE");
  }
}
