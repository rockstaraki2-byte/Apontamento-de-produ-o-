import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { getFirebaseAdmin } from "../api/_lib/firebaseAdmin.js";
import usersHandler from "../api/users.js";
import tenantsHandler from "../api/tenants.js";
import tenantSettingsHandler from "../api/tenant-settings.js";
import loginHandler from "../api/auth/login.js";

const projectId = process.env.GCLOUD_PROJECT || "demo-apontapro";
const clientApp = initializeApp({ apiKey: "emulator-test-key", authDomain: `${projectId}.firebaseapp.com`, projectId }, "tenant-provisioning-client-test");
const clientAuth = getAuth(clientApp);
const { auth: adminAuth, db } = getFirebaseAdmin();
let superAdminToken = "";
let tenantAdminToken = "";
let operatorToken = "";

function fakeResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(value: any) { this.body = value; return this; },
  };
}

async function invoke(handler: any, { method = "GET", body = {}, query = {}, token = "" } = {}) {
  const response = fakeResponse();
  await handler({ method, body, query, headers: token ? { authorization: `Bearer ${token}` } : {} }, response);
  return response;
}

async function getClientIdToken(customToken: string) {
  const user = await signInWithCustomToken(clientAuth, customToken);
  return user.user.getIdToken(true);
}

before(async () => {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!authHost || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Firebase Auth e Firestore emulators são obrigatórios neste teste.");
  connectAuthEmulator(clientAuth, `http://${authHost}`, { disableWarnings: true });
  for (const collectionName of ["tenants", "users", "userCredentials", "sectors", "systemSettings"]) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    if (!snapshot.empty) await batch.commit();
  }
  superAdminToken = await getClientIdToken(await adminAuth.createCustomToken("raul", {
    superAdmin: true, tenantId: "global", role: "ADMIN", name: "Raul",
  }));
});

after(async () => {
  await signOut(clientAuth).catch(() => undefined);
  for (const collectionName of ["tenants", "users", "userCredentials", "sectors", "systemSettings"]) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    if (!snapshot.empty) await batch.commit();
  }
});

test("Super Admin cadastra empresa e usuário em ambiente isolado; login emite claims do tenant", async () => {
  const company = await invoke(tenantsHandler, {
    method: "POST",
    token: superAdminToken,
    body: { id: "empresa-teste", name: "Empresa de teste", sectorNames: ["Produção", "Corte"] },
  });
  assert.equal(company.statusCode, 201);
  const tenant = await db.collection("tenants").doc("empresa-teste").get();
  assert.equal(tenant.get("name"), "Empresa de teste");
  assert.equal((tenant.get("sectorMetadata") || []).length, 2);

  const createdUser = await invoke(usersHandler, {
    method: "POST",
    token: superAdminToken,
    body: { id: "operador.empresa-teste", name: "Operador teste", role: "PRODUCAO", tenantId: "empresa-teste", password: "senha-isolada-123" },
  });
  assert.equal(createdUser.statusCode, 201);
  const profile = await db.collection("users").doc("operador.empresa-teste").get();
  const credential = await db.collection("userCredentials").doc("operador.empresa-teste").get();
  assert.equal(profile.get("tenantId"), "empresa-teste");
  assert.equal(profile.get("password"), undefined);
  assert.equal(credential.get("algorithm"), "scrypt-v1");
  assert.notEqual(credential.get("passwordHash"), "senha-isolada-123");

  const login = await invoke(loginHandler, {
    method: "POST",
    body: { username: "operador.empresa-teste", password: "senha-isolada-123", tenantId: "empresa-teste" },
  });
  assert.equal(login.statusCode, 200);
  const loginUser = await getClientIdToken(login.body.customToken);
  const loginClaims = await clientAuth.currentUser!.getIdTokenResult();
  assert.equal(loginClaims.claims.tenantId, "empresa-teste");
  assert.equal(loginClaims.claims.superAdmin, false);
  await signOut(clientAuth);
  tenantAdminToken = await getClientIdToken(await adminAuth.createCustomToken("tenant-manager", {
    tenantId: "empresa-teste", role: "ADMIN", name: "Admin de teste",
  }));
  await signOut(clientAuth);
  operatorToken = loginUser;
});

test("listagem de empresas é exclusiva da API autenticada do Super Admin", async () => {
  const globalList = await invoke(tenantsHandler, { method: "GET", token: superAdminToken });
  assert.equal(globalList.statusCode, 200);
  assert.ok(globalList.body.tenants.some((tenant: any) => tenant.id === "empresa-teste"));

  const tenantList = await invoke(tenantsHandler, { method: "GET", token: tenantAdminToken });
  assert.equal(tenantList.statusCode, 403);
});

test("APIs limitam usuários ao tenant e barram empresas fora do Super Admin", async () => {
  const ownUsers = await invoke(usersHandler, { method: "GET", token: tenantAdminToken });
  assert.equal(ownUsers.statusCode, 200);
  assert.deepEqual(ownUsers.body.users.map((user: any) => user.id), ["operador.empresa-teste"]);
  assert.equal("password" in ownUsers.body.users[0], false);

  const crossTenantUser = await invoke(usersHandler, {
    method: "POST", token: tenantAdminToken,
    body: { id: "intruso.imperio", name: "Intruso", role: "PRODUCAO", tenantId: "imperio", password: "senha-isolada-123" },
  });
  assert.equal(crossTenantUser.statusCode, 403);

  const companyMutation = await invoke(tenantsHandler, {
    method: "POST", token: operatorToken,
    body: { id: "empresa-intrusa", name: "Não deve ser criada", sectorNames: ["Produção"] },
  });
  assert.equal(companyMutation.statusCode, 403);
  assert.equal((await db.collection("tenants").doc("empresa-intrusa").get()).exists, false);
});

test("configuração do tenant só altera a empresa indicada pelas claims", async () => {
  await db.collection("tenants").doc("imperio").set({
    id: "imperio",
    name: "Império original",
  });
  await db.collection("systemSettings").doc("default").set({
    id: "default",
    tenantId: "imperio",
    companyName: "Configuração Império original",
  });

  const updated = await invoke(tenantSettingsHandler, {
    method: "PUT",
    token: tenantAdminToken,
    body: {
      tenantId: "imperio",
      companyName: "Empresa teste atualizada",
      companyLogoUrl: "",
      systemName: "ApontaPRO teste",
      primaryColor: "#123ABC",
      monthlyBillingGoal: 1500,
      exigirQualidadeNaEmbalagem: false,
      soldaProcesses: ["Solda", "Furação"],
    },
  });

  assert.equal(updated.statusCode, 200);
  assert.equal((await db.collection("tenants").doc("empresa-teste").get()).get("name"), "Empresa teste atualizada");
  assert.equal((await db.collection("tenants").doc("imperio").get()).get("name"), "Império original");
  const settings = await db.collection("systemSettings").doc("tenant_empresa-teste__default").get();
  assert.equal(settings.get("tenantId"), "empresa-teste");
  assert.equal(settings.get("id"), "default");
  assert.equal(settings.get("companyName"), "Empresa teste atualizada");
  assert.equal((await db.collection("systemSettings").doc("default").get()).get("companyName"), "Configuração Império original");

  const operatorAttempt = await invoke(tenantSettingsHandler, {
    method: "PUT",
    token: operatorToken,
    body: {
      companyName: "Operador não deve salvar",
      companyLogoUrl: "",
      systemName: "ApontaPRO",
      primaryColor: "#123ABC",
      exigirQualidadeNaEmbalagem: true,
      soldaProcesses: [],
    },
  });
  assert.equal(operatorAttempt.statusCode, 403);

  const globalAttempt = await invoke(tenantSettingsHandler, {
    method: "PUT",
    token: superAdminToken,
    body: {
      companyName: "Global não deve salvar",
      companyLogoUrl: "",
      systemName: "ApontaPRO",
      primaryColor: "#123ABC",
      exigirQualidadeNaEmbalagem: true,
      soldaProcesses: [],
    },
  });
  assert.equal(globalAttempt.statusCode, 403);
});

test("Login diferencia ids canônicos de aliases legados dentro do mesmo tenant", async () => {
  await db.collection("tenants").doc("imperio").set({ id: "imperio", name: "Império" });
  for (const [id, password] of [["gerencia", "senha-alias-teste"], ["gerencia.imperio", "senha-canonica-teste"]]) {
    const created = await invoke(usersHandler, {
      method: "POST", token: superAdminToken,
      body: { id, name: "Gerência", role: "GERENCIA", tenantId: "imperio", password },
    });
    assert.equal(created.statusCode, 201);
  }
  for (const username of ["gerencia.imperio", "gerencia.imp"]) {
    const login = await invoke(loginHandler, {
      method: "POST", body: { username, tenantId: "imperio", password: "senha-canonica-teste" },
    });
    assert.equal(login.statusCode, 200);
    assert.equal(login.body.user.id, "gerencia.imperio");
    assert.equal(login.body.user.tenantId, "imperio");
  }
  const exactAlias = await invoke(loginHandler, {
    method: "POST", body: { username: "gerencia", tenantId: "imperio", password: "senha-alias-teste" },
  });
  assert.equal(exactAlias.statusCode, 200);
  assert.equal(exactAlias.body.user.id, "gerencia");
  const wrongTenant = await invoke(loginHandler, {
    method: "POST", body: { username: "gerencia", tenantId: "empresa-teste", password: "senha-alias-teste" },
  });
  assert.equal(wrongTenant.statusCode, 401);
});

test("Cadastro usa tenant validado, rejeita senha inválida e preserva usuário já existente", async () => {
  const invalid = await invoke(usersHandler, {
    method: "POST", token: superAdminToken,
    body: { id: "senha-invalida", name: "Inválido", role: "PRODUCAO", tenantId: "imperio", password: "x" },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal((await db.collection("users").doc("senha-invalida").get()).exists, false);
  const normalized = await invoke(usersHandler, {
    method: "POST", token: superAdminToken,
    body: { id: "normalizado", name: "Normalizado", role: "PRODUCAO", tenantId: " IMPERIO ", password: "senha-teste-normalizada" },
  });
  assert.equal(normalized.statusCode, 201);
  assert.equal((await db.collection("users").doc("normalizado").get()).get("tenantId"), "imperio");
  const duplicate = await invoke(usersHandler, {
    method: "POST", token: superAdminToken,
    body: { id: "normalizado", name: "Outra empresa", role: "ADMIN", tenantId: "empresa-teste", password: "outra-senha-teste" },
  });
  assert.equal(duplicate.statusCode, 409);
  assert.equal((await db.collection("users").doc("normalizado").get()).get("tenantId"), "imperio");
});

test("Login do Raul emite sessão global e não devolve credenciais", async () => {
  await db.collection("users").doc("raul").set({ name: "Raul", tenantId: "global", role: "ADMIN", password: "senha-superadmin-emulador" });
  const login = await invoke(loginHandler, {
    method: "POST", body: { username: "raul", tenantId: "global", password: "senha-superadmin-emulador" },
  });
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.user.tenantId, "global");
  assert.equal("password" in login.body.user, false);
  await getClientIdToken(login.body.customToken);
  const result = await clientAuth.currentUser!.getIdTokenResult();
  assert.equal(result.claims.superAdmin, true);
  assert.equal(result.claims.tenantId, "global");
  assert.equal((await db.collection("users").doc("raul").get()).get("password"), undefined);
});
