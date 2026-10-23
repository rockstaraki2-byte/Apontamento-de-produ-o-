import { handleOrderImportHttp } from "../../_lib/orderImportHttp.js";
import { handleLegacyOrderImport } from "../../_lib/legacyOrderImport.js";

export default async function handler(req: any, res: any) {
  if (req.query?.__legacy_order_import === "1") {
    return handleLegacyOrderImport(req, res);
  }

  return handleOrderImportHttp(req, res, false);
}
