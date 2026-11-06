import { handleBillingImportHttp } from "../../_lib/billingImportHttp.js";

export default async function handler(req: any, res: any) {
  return handleBillingImportHttp(req, res, false);
}
