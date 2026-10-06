import fs from "node:fs/promises";
import { validateAndNormalizeTekSystemSync } from "../api/_lib/teksystemSync.js";
import { previewWriterPayload } from "../api/_lib/teksystemWriterFirestore.js";

const input = process.argv[2];
if (!input) throw new Error("Informe o arquivo exportado pelo leitor v2.");
const validation = validateAndNormalizeTekSystemSync(JSON.parse(await fs.readFile(input, "utf8")));
if (!validation.ok || !validation.payload) throw new Error(JSON.stringify(validation.issues));
const preview = await previewWriterPayload(validation.payload);
const summary: Record<string, number> = {};
for (const result of preview.results) {
  const key = `${result.kind}:${result.action || result.state}`;
  summary[key] = (summary[key] || 0) + 1;
}
const output = process.argv[3];
if (output) await fs.writeFile(output, JSON.stringify(preview, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ jobs: preview.jobs, summary, issues: preview.results.filter((r) => r.issues).map((r) => ({ kind: r.kind, codigo: r.codigo, code: r.issues[0]?.code })).slice(0, 100), output }, null, 2));
process.exit(0);
