import { handleOrderImportHttp } from "../../_lib/orderImportHttp.ts";

export default async function handler(req: any, res: any) {
  return handleOrderImportHttp(req, res, false);
}
