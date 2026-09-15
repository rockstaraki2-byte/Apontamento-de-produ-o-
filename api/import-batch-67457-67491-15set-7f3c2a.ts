export default async function handler(_req: any, res: any) {
  return res.status(404).send("NOT_FOUND");
}
