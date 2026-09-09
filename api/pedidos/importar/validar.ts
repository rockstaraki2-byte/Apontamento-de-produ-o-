import { handleOrderImportHttp } from "../../_lib/orderImportHttp.js";

export default async function handler(req: any, res: any) {
  return handleOrderImportHttp(req, res, true);
}
