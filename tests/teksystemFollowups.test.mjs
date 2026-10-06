import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { selectChangedOrders, checkpointFollowups, finishFollowups, processFollowups, brazilDate,
  renderReport, signReport, sendDriveReport, DRIVE_FOLDER_ID, safeMessage } from '../tools/teksystem-followups.mjs';
import { exportQueuedOrder, resolveExistingRepresentativeFolder } from '../tools/order-pdf-agent.mjs';

const runId = 'teksystem-20261006173003746';
const startedAt = '2026-10-06T17:30:03.746Z';
const outcome = { runId, startedAt, finishedAt: '2026-10-06T17:31:49Z', mode: 'collect-and-process', ok: true,
  stagedRecords: 4, stagedBatches: 1, writer: { pages: 1, summary: { 'pedidos:APPLIED:CRIADO': 1 }, status: { kinds: { pedidos: { APPLIED: 1, REVIEW: 2 } } } } };
const row = (codigo, action = 'CRIADO', kind = 'pedidos', state = 'APPLIED') => ({ codigo, action, kind, state });
async function tempRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'teksystem-followups-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('teksystem-followups-test-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}
async function batchAt(root) { return JSON.parse(await fs.readFile(path.join(root, 'pending', runId + '.json'), 'utf8')); }
const exportOk = async codigo => ({ pedido: codigo, representante: 'Cyrne', arquivo: `C:\\Exports\\Pedidos Cyrne\\Pedido ${codigo}.pdf` });

test('only changed APPLIED order codes; no fuzzy/range selection, review blocked, deduplicated', () => {
  assert.deepEqual(selectChangedOrders([row('68260'), row('68260', 'FATURADO', 'romaneios'), row('68261','COMPLEMENTADO'),
    row('68262','JA_EXISTE'), row('68263','SEM_ALTERACAO','romaneios'), row('68264','CRIADO','clientes'),
    row('68265','CRIADO','pedidos','REVIEW'), row('68266','CRIADO'), row('68266','','pedidos','RETRY'), row('../bad')]), ['68260','68261']);
});
test('Brazil local day and month rollovers are independent of execution host timezone', () => {
  assert.equal(brazilDate('2026-11-01T01:30:00Z').monthFolder, 'Outubro 2026');
  assert.equal(brazilDate('2026-11-01T01:30:00Z').dayFolder, '31-10-2026');
  assert.equal(brazilDate('2026-11-01T11:30:00Z').monthFolder, 'Novembro 2026');
});
test('JA_EXISTE with a confirmed payment/note change also refreshes PDF; metadata-only JA_EXISTE does not', () => {
  assert.deepEqual(selectChangedOrders([{ ...row('68260','JA_EXISTE'), pdfNeedsRefresh: true }, row('68261','JA_EXISTE')]), ['68260']);
});
test('unfinished page acknowledgements are never consumed', async t => {
  const root = await tempRoot(t);
  await checkpointFollowups(runId, startedAt, [row('68260')], root);
  let calls = 0;
  await processFollowups(async () => { calls++; }, { root });
  assert.equal(calls, 0);
});
test('one exact-code PDF per changed order and dry runs create nothing', async t => {
  const root = await tempRoot(t);
  await finishFollowups({ ...outcome, mode: 'dry-run' }, root);
  assert.equal(await fs.stat(path.join(root,'pending')).catch(() => null), null);
  await checkpointFollowups(runId, startedAt, [row('68260'),row('68260','COMPLEMENTADO')], root);
  assert.equal((await finishFollowups(outcome, root)).queuedOrders, 1);
  const calls = [];
  await processFollowups(async code => { calls.push(code); return exportOk(code); }, { root });
  await processFollowups(async code => { calls.push(code); return exportOk(code); }, { root });
  assert.deepEqual(calls, ['68260']);
  assert.equal((await batchAt(root)).report.state, 'AWAITING_CONFIGURATION');
});
test('PDF failure retries independently, successful PDFs are not duplicated', async t => {
  const root = await tempRoot(t);
  await checkpointFollowups(runId, startedAt, [row('68260'),row('68261')], root);
  await finishFollowups(outcome, root);
  const calls = [];
  const now = Date.now();
  await processFollowups(async code => { calls.push(code); if (code === '68260') throw new Error('Pasta ausente'); return exportOk(code); }, { root, now });
  let b = await batchAt(root);
  assert.equal(b.pdf[0].state, 'RETRY'); assert.equal(b.pdf[1].state, 'DONE');
  await processFollowups(async code => { calls.push(code); return exportOk(code); }, { root, now: now + 1000 });
  assert.deepEqual(calls, ['68260','68261']);
  await processFollowups(async code => { calls.push(code); return exportOk(code); }, { root, now: now + 5 * 60_000 });
  assert.deepEqual(calls, ['68260','68261','68260']);
});
test('wrong code acknowledgement cannot mark the requested PDF as done', async t => {
  const root = await tempRoot(t);
  await checkpointFollowups(runId, startedAt, [row('68260')], root);
  await finishFollowups(outcome, root);
  await processFollowups(async () => exportOk('68261'), { root });
  assert.equal((await batchAt(root)).pdf[0].state, 'RETRY');
});
test('Drive failure retains outbox; confirmed delivery keeps receipt, removes report cache, no repeated run', async t => {
  const root = await tempRoot(t);
  await checkpointFollowups(runId, startedAt, [row('68260')], root);
  await finishFollowups(outcome, root);
  const settings = { endpoint: 'configured', secret: 'test' }, now = Date.now();
  await processFollowups(exportOk, { root, now, reportSettings: settings, sendReport: async () => { throw new Error('Offline'); } });
  assert.equal((await batchAt(root)).report.state, 'RETRY');
  await processFollowups(() => { throw new Error('must not re-export'); }, { root, now: now + 5 * 60_000, reportSettings: settings, sendReport: async () => ({ url: 'https://drive.google.com/file/d/test/view' }) });
  assert.equal(await fs.stat(path.join(root,'pending',runId+'.json')).catch(() => null), null);
  assert.equal((await finishFollowups(outcome, root)).alreadyDelivered, true);
  assert.match(await fs.readFile(path.join(root,'receipts',runId+'.json'),'utf8'), /drive.google.com/);
});
test('report consolidates applied actions, revisions and PDF outcomes without leaking environment secrets', async t => {
  const root = await tempRoot(t);
  process.env.TEKSYSTEM_TEST_SECRET = 'secret-for-redaction-testing';
  t.after(() => { delete process.env.TEKSYSTEM_TEST_SECRET; });
  await checkpointFollowups(runId, startedAt, [row('68260')], root);
  await finishFollowups({ ...outcome, ok: false, error: 'Failure secret-for-redaction-testing' }, root);
  const text = renderReport(await batchAt(root));
  assert.match(text, /14:30:03/); assert.match(text, /revisão 2/); assert.match(text, /68260/);
  assert.ok(!text.includes('secret-for-redaction-testing'));
  assert.equal(safeMessage('Bearer abc123xyz'), 'Bearer [REDACTED]');
});
test('reexport uses Todos, exact code and refreshes existing browser, not a numeric range of other orders', async () => {
  const page = { reload: async () => {}, waitForFunction: async (_, opts, command, code) => { if (command) { assert.equal(command.statusImpressao,'Todos'); assert.equal(code,'68260'); } } };
  const result = await exportQueuedOrder(page, {}, '68260', async (_, __, command, issue, code) => {
    assert.equal(command.pedidoInicial, code); assert.equal(command.pedidoFinal, code); assert.equal(command.imprimirFisicamente,false);
    return { sucesso: true, processados: [await exportOk(code)], erros: [], ignorados: [] };
  });
  assert.equal(result.pedido, '68260');
});
test('representative folder lookup never creates a missing folder', async t => {
  const root = await tempRoot(t);
  assert.equal(resolveExistingRepresentativeFolder(root,'Cyrne','Pedidos Cyrne'), null);
  assert.deepEqual(await fs.readdir(root), []);
});
test('Google sender signs envelope and validates root/run/date/response, not just HTTP success', async t => {
  const root = await tempRoot(t);
  await finishFollowups(outcome, root); const batch = await batchAt(root);
  const secret = 'a'.repeat(64), endpoint = 'https://script.google.com/macros/s/DEPLOYMENT_TEST/exec';
  let envelope;
  const fetchImpl = async (_, opts) => { envelope = JSON.parse(opts.body); return { ok: true, json: async () => ({ sucesso: true, runId, rootFolderId: DRIVE_FOLDER_ID, monthFolder:'Outubro 2026', dayFolder:'06-10-2026', url:'https://drive.google.com/file/d/test/view' }) }; };
  await sendDriveReport(batch, { endpoint, secret, fetchImpl });
  assert.equal(envelope.signature, crypto.createHmac('sha256',secret).update(`${envelope.timestamp}\n${envelope.payload}`).digest('hex'));
  await assert.rejects(sendDriveReport(batch, { endpoint, secret, fetchImpl: async () => ({ ok:true,json:async()=>({sucesso:true,rootFolderId:'wrong'}) }) }), /destino correto/);
  await assert.rejects(sendDriveReport(batch, { endpoint:'https://attacker.example/exec',secret,fetchImpl }), /Web App/);
});

async function mockGoogleService() {
  const source = await fs.readFile(new URL('../tools/teksystem-drive-report.gs', import.meta.url),'utf8');
  let accesses = 0;
  class Folder {
    constructor(name) { this.name=name; this.folders=[]; this.files=[]; }
    getFoldersByName(name) { const arr=this.folders.filter(f=>f.name===name); let i=0; return {hasNext:()=>i<arr.length,next:()=>arr[i++]}; }
    createFolder(name) { const f=new Folder(name); this.folders.push(f); return f; }
    getFilesByName(name) { const arr=this.files.filter(f=>f.name===name); let i=0; return {hasNext:()=>i<arr.length,next:()=>arr[i++]}; }
    createFile(name,content) { const f={name,content,setContent(c){this.content=c;},getId:()=> 'file-1',getUrl:()=> 'https://drive.google.com/file/d/file-1/view'}; this.files.push(f); return f; }
  }
  const root=new Folder('root'), secret='b'.repeat(64);
  const context={ Date, JSON, isNaN, ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>text})},
    PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},
    Utilities:{Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(v,k)=>[...crypto.createHmac('sha256',k).update(v).digest()],
      formatDate:(d,z,f)=>{const b=brazilDate(d.toISOString());const [y,m,day]=b.date.split('-');const [h,min]=b.time.split('h');return {'MM':m,'yyyy':y,'dd-MM-yyyy':`${day}-${m}-${y}`,'yyyy-MM-dd-HH':`${y}-${m}-${day}-${h}`,'mm':min}[f];}},
    DriveApp:{getFolderById:id=>{accesses++;assert.equal(id,DRIVE_FOLDER_ID);return root;}},
    MimeType:{PLAIN_TEXT:'text/plain'},LockService:{getScriptLock:()=>({waitLock:()=>{},hasLock:()=>true,releaseLock:()=>{}})} };
  vm.runInNewContext(source,context);
  const post=envelope=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(envelope)}}));
  return {root,post,secret,accesses:()=>accesses};
}
test('Google service checks HMAC and timestamp BEFORE Drive access; ignores arbitrary root input', async () => {
  const google=await mockGoogleService();
  const report={runId,startedAt,content:'report',rootFolderId:'untrusted'};
  assert.equal(google.post({...signReport(report,google.secret),signature:'bad'}).sucesso,false);
  assert.equal(google.accesses(),0);
  assert.equal(google.post(signReport(report,google.secret,Date.now()-6*60_000)).sucesso,false);
  assert.equal(google.accesses(),0);
  assert.equal(google.post(signReport(report,google.secret)).rootFolderId,DRIVE_FOLDER_ID);
});
test('Google service reuses existing month/day/file on replay and updates same report', async () => {
  const google=await mockGoogleService();
  const first=google.post(signReport({runId,startedAt,content:'first'},google.secret));
  const second=google.post(signReport({runId,startedAt,content:'PDFs completed'},google.secret));
  assert.equal(first.sucesso,true);assert.equal(second.sucesso,true);
  assert.equal(google.root.folders.length,1);assert.equal(google.root.folders[0].folders.length,1);
  assert.equal(google.root.folders[0].folders[0].files.length,1);
  assert.equal(google.root.folders[0].folders[0].files[0].content,'PDFs completed');
});
