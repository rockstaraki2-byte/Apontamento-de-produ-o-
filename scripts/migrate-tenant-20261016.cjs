// One-time, explicitly authorized migration. Dry run by default; no document backup.
// Run in the authenticated Google Cloud Shell. Never print credentials or payloads.
const { execFileSync } = require('node:child_process');
const { randomBytes, scryptSync } = require('node:crypto');
const assert = require('node:assert/strict');
const project = 'gen-lang-client-0901917587';
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/producao/documents`;
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
function request(url, body) {
  const args = ['-sS', '--max-time', '45', '-H', `Authorization: Bearer ${token}`, '-H', `x-goog-user-project: ${project}`];
  if (body) args.push('-X', 'POST', '-H', 'Content-Type: application/json', '--data-binary', '@-');
  let raw;
  try { raw = execFileSync('curl', [...args, url], { input: body ? JSON.stringify(body) : undefined, encoding: 'utf8', maxBuffer: 50_000_000, stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch { throw new Error('TRANSPORT_FAILED'); }
  const json = JSON.parse(raw);
  if (json.error) throw new Error(`HTTP_${json.error.code}_${json.error.status}`);
  return json;
}
function list(collection) {
  const documents = []; let pageToken;
  do {
    const url = new URL(`${root}/${collection}`);
    url.searchParams.set('pageSize', '1000');
    if (collection !== 'users') url.searchParams.set('mask.fieldPaths', 'tenantId');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const json = request(url.href);
    documents.push(...(json.documents || [])); pageToken = json.nextPageToken;
  } while (pageToken);
  return documents;
}
const string = (document, field) => document.fields?.[field]?.stringValue || '';
const expectedDeletes = { items:105, orders:152, logs:175, activePacks:6, notifications:5, stocks:14, stock_movements:27, employees:5, customers:1, sectors:19, flows:4, rejectionReasons:6, productionSteps:48, productionBatches:2 };
const expectedMissing = { notifications:1, stock_movements:76, epiDistributions:74, uniformDistributions:2 };
const roleFixes = { raul:'ADMIN', dinei:'ENCARREGADO', injetora:'INJETORA', montagem_retratil:'MONTAGEM_RETRATIL', representante_andre:'REPRESENTANTE', representante_danilo:'REPRESENTANTE', representante_imperio:'REPRESENTANTE', representante_kesse:'REPRESENTANTE', prensa_eduardo:'PRENSA_EDUARDO' };
let applied = 0;
try {
  const collections = {};
  for (const collection of new Set([...Object.keys(expectedDeletes), ...Object.keys(expectedMissing), 'users', 'userCredentials'])) collections[collection] = list(collection);
  const deletions = [], assignments = [];
  for (const [collection, expected] of Object.entries(expectedDeletes)) {
    const doomed = collections[collection].filter(d => string(d, 'tenantId') === 'cyrnedecor');
    assert.equal(doomed.length, expected, `CHANGED_CYRNEDecor_COUNT_${collection}`);
    const val = collections[collection].filter(d => string(d, 'tenantId') === 'val');
    assert.equal(val.length, collection === 'sectors' ? 7 : 0, `CHANGED_VAL_COUNT_${collection}`);
    deletions.push(...doomed, ...val);
  }
  for (const [collection, expected] of Object.entries(expectedMissing)) {
    const missing = collections[collection].filter(d => !string(d, 'tenantId'));
    assert.equal(missing.length, expected, `CHANGED_MISSING_COUNT_${collection}`);
    assignments.push(...missing);
  }
  const users = collections.users;
  assert.equal(users.length, 27, 'CHANGED_USER_COUNT');
  assert.equal(collections.userCredentials.length, 0, 'CREDENTIALS_ALREADY_EXIST');
  for (const user of users) {
    const id = user.name.split('/').pop();
    assert.ok(id === 'raul' || string(user, 'tenantId') === 'imperio', `UNEXPECTED_USER_TENANT_${id}`);
    assert.ok(roleFixes[id] || string(user, 'role'), `UNKNOWN_ROLE_${id}`);
  }
  console.log('MIGRATION_AUDIT', JSON.stringify({ project, database:'producao', cyrnedecor:570, val:7, assignImperio:assignments.length, users:users.length, roleFixes:Object.keys(roleFixes) }));
  if (!process.argv.includes('--apply')) { console.log('DRY_RUN_OK'); process.exit(0); }
  // Preserve the password semantics actually accepted by the pinned legacy app.
  // Raul's explicit override matches the password supplied by the administrator.
  const source = execFileSync('curl', ['-fsS', '--max-time', '30', 'https://raw.githubusercontent.com/rockstaraki2-byte/Apontamento-de-produ-o-/5cd1746410de29c8ac8dc9a694cdf083daeb1e9e/src/App.tsx'], { encoding:'utf8', stdio:['pipe','pipe','pipe'] });
  const legacyDefault = source.match(/const userPass = user\.password \|\| "([^"]+)"/)?.[1];
  const raulPassword = source.match(/const isRaulOverride = user\.id === "raul" && password === "([^"]+)"/)?.[1];
  assert.ok(legacyDefault && raulPassword, 'LEGACY_PASSWORD_POLICY_NOT_FOUND');
  const legacyDatabaseSource = execFileSync('curl', ['-fsS', '--max-time', '30', 'https://raw.githubusercontent.com/rockstaraki2-byte/Apontamento-de-produ-o-/5cd1746410de29c8ac8dc9a694cdf083daeb1e9e/src/useDatabase.ts'], { encoding:'utf8', stdio:['pipe','pipe','pipe'] });
  const initialBlock = legacyDatabaseSource.match(/const INITIAL_USERS: User\[\] = \[([\s\S]*?)\n\];/)?.[1];
  assert.ok(initialBlock, 'LEGACY_INITIAL_PROFILES_NOT_FOUND');
  // Parse only simple string fields in the literal; never evaluate fetched code.
  const initialPasswords = new Map();
  for (const match of initialBlock.matchAll(/\{([^{}]*)\}/g)) {
    const id = match[1].match(/id:\s*"([^"]+)"/)?.[1];
    const password = match[1].match(/password:\s*"([^"]+)"/)?.[1];
    if (id && password) initialPasswords.set(id, password);
  }
  const writes = [];
  for (const user of users) {
    const id = user.name.split('/').pop(), tenantId = id === 'raul' ? 'global' : 'imperio';
    const salt = randomBytes(16).toString('base64url');
    const password = id === 'raul' ? raulPassword : string(user, 'password') || initialPasswords.get(id) || legacyDefault;
    const passwordHash = scryptSync(password, salt, 64).toString('base64url');
    const fields = { algorithm:{stringValue:'scrypt-v1'}, salt:{stringValue:salt}, passwordHash:{stringValue:passwordHash}, tenantId:{stringValue:tenantId}, updatedAt:{integerValue:String(Date.now())} };
    writes.push({ update:{name:user.name.replace('/users/', '/userCredentials/'), fields}, currentDocument:{exists:false} });
    writes.push({ update:{name:user.name, fields:{tenantId:{stringValue:tenantId}, role:{stringValue:roleFixes[id] || string(user,'role')}}}, updateMask:{fieldPaths:['tenantId','role','password']}, currentDocument:{updateTime:user.updateTime} });
  }
  for (const doc of assignments) writes.push({update:{name:doc.name, fields:{tenantId:{stringValue:'imperio'}}}, updateMask:{fieldPaths:['tenantId']}, currentDocument:{updateTime:doc.updateTime}});
  // Users and all missing tenants are committed atomically first (207 writes).
  request(`${root}:commit`, {writes}); applied += writes.length;
  console.log('MIGRATION_COMMIT_OK', JSON.stringify({phase:'users-and-tenant-assignments',writes:writes.length,applied}));
  for (let offset=0; offset<deletions.length; offset+=400) {
    const batch=deletions.slice(offset,offset+400).map(doc=>({delete:doc.name,currentDocument:{updateTime:doc.updateTime}}));
    request(`${root}:commit`,{writes:batch}); applied+=batch.length;
    console.log('MIGRATION_COMMIT_OK',JSON.stringify({phase:'authorized-deletions',writes:batch.length,applied}));
  }
  console.log('MIGRATION_APPLIED',JSON.stringify({profiles:27,credentials:27,assignImperio:153,deletedCyrnedecor:570,deletedVal:7,applied}));
} catch(error) {
  // Do not print errors from subprocesses: their command arguments contain tokens.
  console.error('MIGRATION_STOPPED',JSON.stringify({applied,error:error instanceof assert.AssertionError ? error.message : /^HTTP_|^TRANSPORT_|^LEGACY_/.test(error.message||'') ? error.message : 'VALIDATION_OR_RUNTIME_FAILED'}));
  process.exit(1);
}
