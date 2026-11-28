import crypto from "node:crypto";
import type { Express } from "express";
import { handleOrderImportHttp } from "../api/_lib/orderImportHttp.js";

const ROUTE_PATH = "/api/order-import-temp-20261128-49fedcb5273a";
const TOKEN_HASH = "e2f2f35a2c67b419a08cb9629bd60bb7803ff691a14a6016adf93a0e3305dd06";
const ALLOWED_ORDER_CODES = new Set<string>([
  "70251", "70252", "70253", "70254", "70255", "70256", "70257", "70258"
]);

const FORM = [
  "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">",
  "<meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
  "<title>Importação temporária</title>",
  "<style>body{font:16px system-ui;background:#f4f6f8;color:#172033;margin:0;padding:24px}main{max-width:900px;margin:auto;background:#fff;padding:24px;border-radius:12px}label{display:block;margin:16px 0 8px;font-weight:600}input,textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd2dc;border-radius:8px}textarea{min-height:360px;font:13px ui-monospace,monospace}button{padding:12px 18px;margin:16px 10px 0 0;border:0;border-radius:8px;background:#173e9e;color:#fff;font-weight:700;cursor:pointer}.secondary{background:#596579}</style>",
  "</head><body><main><h1>Importação temporária de pedidos</h1>",
  "<p>Use primeiro Validar. A opção Importar grava apenas os pedidos ainda inexistentes.</p>",
  "<form method=\"post\" action=\"" + ROUTE_PATH + "\">",
  "<label>Chave temporária<input type=\"password\" name=\"temporaryToken\" autocomplete=\"off\" required></label>",
  "<label>Payload JSON<textarea name=\"payload\" spellcheck=\"false\" required></textarea></label>",
  "<button type=\"submit\" name=\"action\" value=\"validate\">Validar sem gravar</button>",
  "<button class=\"secondary\" type=\"submit\" name=\"action\" value=\"import\">Importar pedidos</button>",
  "</form></main></body></html>",
].join("");

function tokenIsValid(value: unknown): boolean {
  const supplied = String(value ?? "");
  if (!supplied) return false;
  const actualHash = crypto.createHash("sha256").update(supplied).digest();
  const expectedHash = Buffer.from(TOKEN_HASH, "hex");
  return actualHash.length === expectedHash.length && crypto.timingSafeEqual(actualHash, expectedHash);
}

export function registerTempOrderImportRoute(app: Express) {
  app.all(ROUTE_PATH, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.method === "GET") return res.status(200).type("html").send(FORM);
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
    }
    if (!tokenIsValid(req.body?.temporaryToken)) {
      return res.status(401).json({ sucesso: false, erro: "NAO_AUTORIZADO" });
    }
    let payload: any;
    try {
      payload = JSON.parse(String(req.body?.payload || ""));
    } catch {
      return res.status(400).json({ sucesso: false, erro: "PAYLOAD_JSON_INVALIDO" });
    }
    const pedidos = Array.isArray(payload?.pedidos) ? payload.pedidos : [];
    const orderCodes = pedidos.map((order: any) => String(order?.codigoPedido ?? "").trim());
    if (orderCodes.length === 0 || orderCodes.some((code: string) => !ALLOWED_ORDER_CODES.has(code))) {
      return res.status(403).json({ sucesso: false, erro: "PEDIDOS_NAO_AUTORIZADOS" });
    }
    if (new Set(orderCodes).size !== orderCodes.length) {
      return res.status(400).json({ sucesso: false, erro: "CODIGO_PEDIDO_DUPLICADO_NO_LOTE" });
    }
    const action = String(req.body?.action || "validate");
    if (action !== "validate" && action !== "import") {
      return res.status(400).json({ sucesso: false, erro: "ACAO_INVALIDA" });
    }
    const previousApiToken = process.env.ORDER_IMPORT_API_TOKEN;
    const temporaryApiToken = String(req.body?.temporaryToken ?? "");
    process.env.ORDER_IMPORT_API_TOKEN = temporaryApiToken;
    req.headers.authorization = "Bearer " + temporaryApiToken;
    req.body = payload;
    req.query = { ...(req.query || {}), dryRun: action === "validate" ? "true" : "false" };
    try {
      return await handleOrderImportHttp(req, res, false);
    } finally {
      if (previousApiToken === undefined) delete process.env.ORDER_IMPORT_API_TOKEN;
      else process.env.ORDER_IMPORT_API_TOKEN = previousApiToken;
    }
  });
}
