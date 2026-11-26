import type { Request, Response, RequestHandler } from "express";

type NodeHandler = (req: Request, res: Response) => unknown;
type FetchHandler = (request: globalThis.Request) => Promise<globalThis.Response>;

// Express 4 does not forward rejected async handlers to error middleware.
export function nodeHandler(handler: NodeHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve().then(() => handler(req, res)).catch(next);
  };
}

// The existing Fetch endpoints export GET only and do not consume a body.
export function fetchGetHandler(handler: FetchHandler, forcedQuery: Record<string, string> = {}): RequestHandler {
  return nodeHandler(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
      return;
    }
    // These handlers only read path/query; use a fixed origin, never a client Host header.
    const url = new URL(req.originalUrl, "http://localhost");
    for (const [key, value] of Object.entries(forcedQuery)) url.searchParams.set(key, value);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach(item => headers.append(key, item));
      else if (value !== undefined) headers.set(key, value);
    }
    const response = await handler(new globalThis.Request(url, { method: "GET", headers }));
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== "set-cookie") res.setHeader(key, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    if (req.method === "HEAD") { res.end(); return; }
    res.end(Buffer.from(await response.arrayBuffer()));
  });
}
