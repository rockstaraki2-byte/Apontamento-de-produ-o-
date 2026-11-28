import test from "node:test";
import assert from "node:assert/strict";
import { nodeHandler, fetchGetHandler } from "../server/httpAdapters.ts";

function invoke(handler, request = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, headers: {}, body: undefined,
      status(value) { this.statusCode = value; return this; },
      setHeader(key, value) { this.headers[key.toLowerCase()] = value; return this; },
      json(body) { this.body = body; resolve(this); return this; },
      end(body) { this.body = body; resolve(this); return this; },
    };
    handler({ method: "GET", originalUrl: "/api/test", headers: {}, ...request }, res, reject);
  });
}
test("Node adapter forwards sync throws and async rejections", async () => {
  for (const fn of [() => { throw Error("failed"); }, async () => { throw Error("failed"); }]) {
    await assert.rejects(invoke(nodeHandler(fn)), /failed/);
  }
});
test("Node adapter preserves request and response semantics", async () => {
  const response = await invoke(nodeHandler((req, res) => res.status(201).json(req.body)), { body: { value: 1 } });
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { value: 1 });
});
test("Fetch adapter preserves auth/query and forces rewrite flag", async () => {
  const response = await invoke(fetchGetHandler(async req => {
    assert.equal(req.headers.get("authorization"), "Bearer fixture");
    const url = new URL(req.url);
    assert.equal(url.searchParams.get("month"), "2026-11");
    assert.deepEqual(url.searchParams.getAll("__daily_invoiced_reports"), ["1"]);
    return new Response("data,faturamento", { status: 200, headers: { "Content-Type": "text/csv", "Cache-Control": "private, no-store" } });
  }, { __daily_invoiced_reports: "1" }), {
    originalUrl: "/api/cron/daily-invoiced-reports?month=2026-11&__daily_invoiced_reports=0",
    headers: { authorization: "Bearer fixture" }
  });
  assert.equal(response.body.toString(), "data,faturamento");
  assert.equal(response.headers["content-type"], "text/csv");
  assert.equal(response.headers["cache-control"], "private, no-store");
});
test("Fetch adapter rejects unsupported methods without executing handler", async () => {
  const response = await invoke(fetchGetHandler(async () => { throw Error("must not run"); }), { method: "POST" });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "GET, HEAD");
});
test("Fetch adapter preserves failure status and repeated cookies", async () => {
  const response = await invoke(fetchGetHandler(async () => {
    const r = Response.json({ error: "disabled" }, { status: 503 });
    r.headers.append("Set-Cookie", "a=1; HttpOnly");
    r.headers.append("Set-Cookie", "b=2; HttpOnly");
    return r;
  }));
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.headers["set-cookie"], ["a=1; HttpOnly", "b=2; HttpOnly"]);
  assert.deepEqual(JSON.parse(response.body.toString()), { error: "disabled" });
});
test("HEAD returns headers without response body", async () => {
  const response = await invoke(fetchGetHandler(async () => new Response("hidden", { headers: { "X-Test": "yes" } })), { method: "HEAD" });
  assert.equal(response.headers["x-test"], "yes");
  assert.equal(response.body, undefined);
});
test("Fetch adapter forwards asynchronous errors", async () => {
  await assert.rejects(invoke(fetchGetHandler(async () => { throw Error("fetch failed"); })), /fetch failed/);
});
