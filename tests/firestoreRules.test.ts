import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

let environment: RulesTestEnvironment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-apontapro",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "tenants", "imperio"), { id: "imperio", name: "Império" });
    await setDoc(doc(db, "tenants", "empresa-teste"), { id: "empresa-teste", name: "Empresa teste" });
    await setDoc(doc(db, "users", "gerencia"), { id: "gerencia", role: "GERENCIA", tenantId: "imperio" });
    await setDoc(doc(db, "users", "raul"), { id: "raul", role: "ADMIN", tenantId: "global" });
    await setDoc(doc(db, "userCredentials", "gerencia"), { tenantId: "imperio", passwordHash: "private" });
    await setDoc(doc(db, "orders", "imperio-1"), { tenantId: "imperio" });
    await setDoc(doc(db, "orders", "other-1"), { tenantId: "empresa-teste" });
    await setDoc(doc(db, "orders", "missing-tenant"), { status: "PENDENTE" });
  });
});

after(async () => {
  await environment.cleanup();
});

test("login anônimo só consulta metadados públicos de empresa", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "tenants", "imperio")));
  await assertFails(getDoc(doc(db, "users", "gerencia")));
  await assertFails(getDoc(doc(db, "orders", "imperio-1")));
});

test("usuário Império só lê e grava documentos do próprio tenant", async () => {
  const db = environment.authenticatedContext("operador", { tenantId: "imperio", role: "PRODUCAO" }).firestore();
  await assertSucceeds(getDoc(doc(db, "orders", "imperio-1")));
  await assertFails(getDoc(doc(db, "orders", "other-1")));
  await assertFails(getDoc(doc(db, "orders", "missing-tenant")));
  await assertSucceeds(getDocs(query(collection(db, "orders"), where("tenantId", "==", "imperio"))));
  await assertSucceeds(setDoc(doc(db, "orders", "new-order"), { tenantId: "imperio" }));
  await assertFails(setDoc(doc(db, "orders", "no-tenant"), { status: "PENDENTE" }));
  await assertFails(setDoc(doc(db, "orders", "cross-tenant"), { tenantId: "empresa-teste" }));
  await assertFails(getDoc(doc(db, "users", "gerencia")));
  await assertFails(getDoc(doc(db, "users", "raul")));
  await assertFails(setDoc(doc(db, "users", "gerencia"), { role: "ADMIN" }, { merge: true }));
});

test("Super Admin não lê documentos de usuário ou operação no cliente", async () => {
  const db = environment.authenticatedContext("raul", { tenantId: "global", role: "ADMIN", superAdmin: true }).firestore();
  await assertSucceeds(getDocs(collection(db, "tenants")));
  await assertFails(getDocs(collection(db, "users")));
  await assertFails(getDoc(doc(db, "orders", "imperio-1")));
  await assertFails(setDoc(doc(db, "orders", "global-write"), { tenantId: "imperio" }));
  await assertFails(getDoc(doc(db, "userCredentials", "gerencia")));
  await assertFails(setDoc(doc(db, "tenants", "new-company"), { id: "new-company" }));
});

test("perfis e credenciais só são acessíveis pela API confiável", async () => {
  const db = environment.authenticatedContext("intruso", { tenantId: "imperio", role: "ADMIN" }).firestore();
  await assertFails(getDoc(doc(db, "userCredentials", "gerencia")));
  await assertFails(getDoc(doc(db, "users", "gerencia")));
  await assertFails(setDoc(doc(db, "users", "intruso"), { tenantId: "imperio", role: "ADMIN" }));
});
