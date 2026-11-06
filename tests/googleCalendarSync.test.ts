import assert from "node:assert/strict";
import { createHash, createVerify, generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import {
  addOneCalendarDay,
  buildCalendarEvent,
  getCalendarDateKey,
  googleCalendarEventId,
  isCargaEligibleForCalendar,
  type CalendarLoad,
} from "../api/_lib/googleCalendarSync.js";
import { createServiceAccountAssertion } from "../api/_lib/googleCalendarClient.js";

test("a data de sincronização usa o fuso de São Paulo", () => {
  assert.equal(
    getCalendarDateKey(new Date("2026-10-22T02:00:00.000Z")),
    "2026-10-21",
  );
});

test("eventos de dia inteiro usam o dia final exclusivo", () => {
  assert.equal(addOneCalendarDay("2026-10-22"), "2026-10-23");
  assert.equal(addOneCalendarDay("2024-02-28"), "2024-02-29");
});

test("somente cargas futuras e do tenant Império entram no calendário", () => {
  const base: CalendarLoad = {
    id: "carga-1",
    tenantId: "imperio",
    scheduledDate: "2026-10-23",
    status: "ABERTA",
  };
  assert.equal(isCargaEligibleForCalendar(base, "imperio", "2026-10-22"), true);
  assert.equal(isCargaEligibleForCalendar(base, "outro-tenant", "2026-10-22"), false);
  assert.equal(
    isCargaEligibleForCalendar({ ...base, scheduledDate: "2026-10-21" }, "imperio", "2026-10-22"),
    false,
  );
  assert.equal(
    isCargaEligibleForCalendar({ ...base, status: "ENTREGUE" }, "imperio", "2026-10-22"),
    false,
  );
});

test("evento contém rota, turno, pedidos, local e não bloqueia disponibilidade", () => {
  const carga: CalendarLoad = {
    id: "carga-1",
    tenantId: "imperio",
    name: "Carga 23",
    routeName: "Ubá e região",
    shift: "MANHA",
    scheduledDate: "2026-10-23",
    status: "ABERTA",
    stagingLocation: "Expedição",
    orderIds: [42],
    orderQuantities: { "42": 7 },
  };
  const event = buildCalendarEvent(carga, "imperio", new Map([
    [42, { id: 42, orderCode: "PED-0042", customerName: "Cliente A", totalQuantity: 7 }],
  ]));
  assert.equal(event.start.date, "2026-10-23");
  assert.equal(event.end.date, "2026-10-24");
  assert.match(event.summary, /Ubá e região/);
  assert.match(event.description, /PED-0042/);
  assert.match(event.description, /Cliente A/);
  assert.match(event.description, /7 un\./);
  assert.equal(event.location, "Expedição");
  assert.equal(event.transparency, "transparent");
  assert.equal(event.visibility, "private");
  assert.equal(event.extendedProperties.private.apontaProSource, "ApontaPRO");
});

test("ID de evento é estável e isolado por tenant", () => {
  const first = googleCalendarEventId("imperio", "carga-1");
  assert.equal(first, googleCalendarEventId("imperio", "carga-1"));
  assert.notEqual(first, googleCalendarEventId("empresa-teste", "carga-1"));
  assert.equal(first, createHash("sha256").update("imperio:carga-1").digest("hex"));
});

test("assertion da conta técnica contém assinatura RS256 válida e escopo de eventos", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const assertion = createServiceAccountAssertion("calendar-bot@example.iam.gserviceaccount.com", privateKey, 1_800_000_000);
  const [headerPart, claimsPart, signaturePart] = assertion.split(".");
  const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
  const claims = JSON.parse(Buffer.from(claimsPart, "base64url").toString("utf8"));
  const verifier = createVerify("RSA-SHA256");
  verifier.update(headerPart + "." + claimsPart);
  verifier.end();
  assert.equal(header.alg, "RS256");
  assert.equal(claims.iss, "calendar-bot@example.iam.gserviceaccount.com");
  assert.equal(claims.scope, "https://www.googleapis.com/auth/calendar.events");
  assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(verifier.verify(publicKey, signaturePart, "base64url"), true);
});
