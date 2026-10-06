import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const DRIVE_FOLDER_ID = '19BxckmRHkPs0C4V1rLHCZ2OgQb0xhhQE';
export function followupDirectory() {
  return path.join(process.env.LOCALAPPDATA || os.homedir(), 'ApontaPRO', 'TekSystem', 'followups');
}
function runName(runId) {
  if (!/^teksystem-\d{14,20}$/.test(runId)) throw new Error('Identificador de execução inválido.');
  return `${runId}.json`;
}
async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  try { await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }).catch(() => {}); }
}
export function safeMessage(value) {
  let message = String(value || '').slice(0, 2000);
  for (const [key, secret] of Object.entries(process.env)) {
    if (/PASSWORD|SECRET|TOKEN/.test(key) && secret?.length >= 8) message = message.split(secret).join('[REDACTED]');
  }
  return message.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]').slice(0, 600);
}
export function selectChangedOrders(rows) {
  const blocked = new Set(rows.filter(r => r.kind === 'pedidos' && ['REVIEW', 'RETRY'].includes(r.state)).map(r => String(r.codigoPedido || r.codigo)));
  return [...new Set(rows.filter(r => r.state === 'APPLIED' && (
    (r.kind === 'pedidos' && (['CRIADO', 'ATUALIZADO', 'COMPLEMENTADO'].includes(r.action) || r.pdfNeedsRefresh === true)) ||
    (r.kind === 'romaneios' && r.action === 'FATURADO')
  )).map(r => String(r.codigoPedido || r.codigo)).filter(code => /^\d{1,15}$/.test(code) && !blocked.has(code)))].sort((a, b) => Number(a) - Number(b));
}
function cleanRows(rows) {
  return rows.map(r => ({ kind: r.kind, codigo: String(r.codigoPedido || r.codigo || ''), state: r.state,
    action: r.action || '', issues: (r.issues || []).map(i => ({ code: i.code, message: safeMessage(i.message) })),
    pdfNeedsRefresh: r.pdfNeedsRefresh === true,
    quantidadeItens: r.quantidadeItens, itensAdicionados: r.itensAdicionados,
    itens: Array.isArray(r.itens) ? r.itens.map(i => ({ codigo: i.codigo, quantidade: i.quantidade, quantidadeFaturada: i.quantidadeFaturada })) : undefined }));
}
// Save acknowledgements after EACH writer page, before requesting the next page.
// Nothing is consumed until finishFollowups marks the batch ready.
export async function checkpointFollowups(runId, startedAt, rows, root = followupDirectory()) {
  const file = path.join(root, 'pending', runName(runId));
  const old = await readJson(file);
  if (old?.ready) throw new Error('Uma execução encerrada não pode receber novas páginas.');
  await atomicJson(file, { version: 1, runId, startedAt, ownerPid: process.pid, ready: false,
    rows: [...(old?.rows || []), ...cleanRows(rows)] });
}
export async function finishFollowups(outcome, root = followupDirectory()) {
  if (outcome.mode === 'dry-run') return { skipped: true };
  const name = runName(outcome.runId);
  if (await readJson(path.join(root, 'receipts', name))) return { alreadyDelivered: true };
  const file = path.join(root, 'pending', name);
  const old = await readJson(file);
  if (old?.ready) return { queuedOrders: old.pdf.length, alreadyQueued: true };
  const rows = old?.rows || [];
  const pdf = selectChangedOrders(rows).map(codigo => ({ codigo, state: 'PENDING', attempts: 0, nextAttemptAt: 0 }));
  const sanitized = { runId: outcome.runId, startedAt: outcome.startedAt || old?.startedAt, finishedAt: outcome.finishedAt,
    ok: outcome.ok === true, mode: outcome.mode, since: outcome.since,
    stagedBatches: outcome.stagedBatches, stagedRecords: outcome.stagedRecords,
    error: outcome.error ? safeMessage(outcome.error) : undefined,
    writer: outcome.writer || outcome.writerProgress || {} };
  // Only operational summaries enter the report, never credential/config objects.
  sanitized.writer = { pages: sanitized.writer.pages, summary: sanitized.writer.summary || {}, status: sanitized.writer.status };
  await atomicJson(file, { version: 1, runId: outcome.runId, startedAt: sanitized.startedAt, ready: true,
    outcome: sanitized, rows, pdf, report: { state: 'PENDING', attempts: 0, nextAttemptAt: 0 } });
  return { queuedOrders: pdf.length, report: 'PENDING' };
}
export function brazilDate(iso) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error('Data de execução inválida.');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return { monthFolder: `${months[Number(parts.month) - 1]} ${parts.year}`, dayFolder: `${parts.day}-${parts.month}-${parts.year}`,
    date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}h${parts.minute}`, display: `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}` };
}
export function renderReport(batch) {
  const out = batch.outcome;
  const date = brazilDate(batch.startedAt);
  const summary = out.writer?.summary || {};
  const done = batch.pdf.filter(p => p.state === 'DONE');
  const pending = batch.pdf.filter(p => p.state !== 'DONE');
  const lines = ['RELATÓRIO DE EXECUÇÃO — TEK-SYSTEM → APONTAPRO', `Execução: ${date.display} (Brasília)`, `Identificador: ${batch.runId}`,
    `Conclusão da sincronização: ${out.finishedAt ? brazilDate(out.finishedAt).display : 'não confirmada'}`,
    `Resultado: ${out.ok ? 'Sincronização concluída; consulte revisões e PDFs abaixo.' : 'Sincronização interrompida; somente alterações confirmadas foram encaminhadas.'}`,
    '', 'RESUMO', `Registros enviados: ${out.stagedRecords ?? 'não informado'}; lotes: ${out.stagedBatches ?? 'não informado'}.`];
  if (out.error) lines.push(`Falha: ${safeMessage(out.error)}`);
  if (!Object.keys(summary).length) lines.push('Nenhuma nova ação do escritor registrada nesta rodada.');
  const labels = { clientes: 'Clientes', produtos: 'Produtos/peças', pedidos: 'Pedidos', romaneios: 'Faturamento por romaneios' };
  for (const [key, count] of Object.entries(summary)) {
    const [kind, state, action] = key.split(':');
    lines.push(`${labels[kind] || kind}: ${count} — ${action || state} (${state}).`);
  }
  lines.push('', 'ALTERAÇÕES E REVISÕES DESTA RODADA');
  for (const row of batch.rows) lines.push(`${labels[row.kind] || row.kind} ${row.codigo}: ${row.action || row.state}${row.issues?.length ? ' — ' + row.issues.map(i => `${i.code}: ${i.message}`).join('; ') : ''}`);
  lines.push('', 'SITUAÇÃO DA FILA NO APONTAPRO');
  for (const [kind, s] of Object.entries(out.writer?.status?.kinds || {})) lines.push(`${labels[kind] || kind}: aplicados ${s.APPLIED || 0}; revisão ${s.REVIEW || 0}; pendentes ${s.READY || 0}; processando ${s.PROCESSING || 0}; nova tentativa ${s.RETRY || 0}.`);
  lines.push('Revisões de pedidos e faturamento podem se referir aos mesmos pedidos; não somar como pedidos distintos.',
    '', 'EXPORTAÇÃO DOS PEDIDOS EM PDF', `Pedidos selecionados por código: ${batch.pdf.length}; PDFs concluídos: ${done.length}; pendentes/erros: ${pending.length}.`);
  for (const p of done) lines.push(`Pedido ${p.codigo}: salvo para ${p.result.representante} — ${p.result.arquivo}`);
  for (const p of pending) lines.push(`Pedido ${p.codigo}: ${p.state}; tentativas ${p.attempts}${p.error ? ' — ' + safeMessage(p.error) : ''}.`);
  lines.push('', 'DESTINO DO RELATÓRIO', `${date.monthFolder} / ${date.dayFolder}`,
    'O mesmo relatório será atualizado quando PDFs pendentes forem concluídos. Falhas de envio não descartam o relatório.',
    '', 'SEGURANÇA', 'Tek-System somente leitura (READ ONLY). Nenhuma impressão física. Pastas existentes de representantes preservadas. Sem senhas ou tokens neste documento.');
  return lines.join('\n') + '\n';
}
export function signReport(report, secret, timestamp = Date.now()) {
  const payload = JSON.stringify(report);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}\n${payload}`).digest('hex');
  return { timestamp, payload, signature };
}
export async function sendDriveReport(batch, { endpoint, secret, fetchImpl = fetch }) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) || url.search || url.username || url.password) throw new Error('Use a URL /exec de um Web App do Google Apps Script.');
  if (!secret || secret.length < 32) throw new Error('Segredo do serviço de relatórios não configurado.');
  const date = brazilDate(batch.startedAt);
  const report = { runId: batch.runId, startedAt: batch.startedAt, content: renderReport(batch) };
  const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signReport(report, secret)), signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`Serviço do Drive respondeu HTTP ${response.status}.`);
  let result;
  try { result = await response.json(); } catch { throw new Error('O serviço do Drive não respondeu JSON; confira publicação e autorização.'); }
  if (result.sucesso !== true || result.runId !== batch.runId || result.rootFolderId !== DRIVE_FOLDER_ID || result.monthFolder !== date.monthFolder || result.dayFolder !== date.dayFolder || !/^https:\/\/drive\.google\.com\//.test(result.url || '')) throw new Error(`Drive não confirmou o destino correto: ${safeMessage(result.erro || 'resposta inválida')}.`);
  return result;
}
// A single existing PDF worker owns this lock. A second instance never exports concurrently.
async function reserveWorker(root) {
  const file = path.join(root, 'worker.lock');
  await fs.mkdir(root, { recursive: true });
  for (let n = 0; n < 2; n++) {
    try {
      const handle = await fs.open(file, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid }));
      return async () => { await handle.close(); await fs.rm(file, { force: true }); };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const lock = await readJson(file).catch(() => null);
      if (!Number.isInteger(lock?.pid)) return null;
      try { process.kill(lock.pid, 0); return null; }
      catch (e) { if (e.code !== 'ESRCH') return null; }
      if (n === 0) await fs.rm(file, { force: true });
    }
  }
  return null;
}
export async function processFollowups(exportOrder, options = {}) {
  const root = options.root || followupDirectory();
  const now = options.now ?? Date.now();
  const release = await reserveWorker(root);
  if (!release) return { busy: true, exported: 0 };
  let exported = 0, errors = 0, delivered = 0;
  try {
    const files = (await fs.readdir(path.join(root, 'pending')).catch(e => { if (e.code === 'ENOENT') return []; throw e; })).filter(f => /^teksystem-\d{14,20}\.json$/.test(f)).sort();
    let remaining = options.limit ?? 20;
    for (const name of files) {
      const file = path.join(root, 'pending', name);
      let batch = await readJson(file);
      if (!batch?.ready) {
        // Recover confirmed pages only after the owning collector process has exited.
        if (!Number.isInteger(batch?.ownerPid)) continue;
        try { process.kill(batch.ownerPid, 0); continue; }
        catch (error) { if (error.code !== 'ESRCH') continue; }
        await finishFollowups({ runId: batch.runId, startedAt: batch.startedAt, finishedAt: new Date().toISOString(),
          ok: false, mode: 'collect-and-process', error: 'Coletor interrompido; recuperadas somente páginas confirmadas.' }, root);
        batch = await readJson(file);
      }
      for (const p of batch.pdf) {
        if (p.state === 'DONE' || p.nextAttemptAt > now || remaining <= 0) continue;
        remaining--; p.attempts++;
        try {
          const result = await exportOrder(p.codigo);
          if (!result || String(result.pedido) !== p.codigo || !result.arquivo || !result.representante) throw new Error('A exportação não confirmou o código/arquivo solicitado.');
          p.state = 'DONE'; p.result = result; p.finishedAt = new Date().toISOString(); delete p.error;
          exported++;
        } catch (error) {
          p.state = 'RETRY'; p.error = safeMessage(error.message); p.nextAttemptAt = now + Math.min(60, 5 * 2 ** Math.min(p.attempts - 1, 4)) * 60_000;
          errors++;
        }
        await atomicJson(file, batch);
      }
      const contentHash = crypto.createHash('sha256').update(renderReport(batch)).digest('hex');
      if (batch.report.contentHash !== contentHash && (batch.report.nextAttemptAt || 0) <= now) {
        const settings = options.reportSettings || { endpoint: process.env.TEKSYSTEM_REPORT_ENDPOINT, secret: process.env.TEKSYSTEM_REPORT_SECRET };
        if (!settings.endpoint || !settings.secret) batch.report.state = 'AWAITING_CONFIGURATION';
        else {
          batch.report.attempts++;
          try {
            const result = await (options.sendReport || sendDriveReport)(batch, settings);
            batch.report = { ...batch.report, state: 'DELIVERED', contentHash, url: result.url, nextAttemptAt: 0 };
            delete batch.report.error; delivered++;
          } catch (error) {
            batch.report.state = 'RETRY'; batch.report.error = safeMessage(error.message); batch.report.nextAttemptAt = now + 5 * 60_000;
          }
        }
        await atomicJson(file, batch);
      }
      if (batch.pdf.every(p => p.state === 'DONE') && batch.report.state === 'DELIVERED' && batch.report.contentHash === contentHash) {
        // Keep a small delivery receipt; report contents live only in Google Drive after delivery.
        await atomicJson(path.join(root, 'receipts', name), { runId: batch.runId, deliveredAt: new Date().toISOString(), url: batch.report.url,
          pdf: batch.pdf.map(p => ({ codigo: p.codigo, arquivo: p.result.arquivo })) });
        await fs.rm(file);
      }
    }
    return { exported, errors, delivered, remainingBudget: remaining };
  } finally { await release(); }
}
