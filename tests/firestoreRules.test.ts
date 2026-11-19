import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, increment, query, setDoc, where } from "firebase/firestore";

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
    await setDoc(doc(db, "maintenanceAssets", "imperio-compressor"), {
      id: "imperio-compressor", tenantId: "imperio", name: "Compressor 1", active: true,
    });
    await setDoc(doc(db, "maintenanceAssets", "empresa-compressor"), {
      id: "empresa-compressor", tenantId: "empresa-teste", name: "Compressor externo", active: true,
    });
    await setDoc(doc(db, "preventiveMaintenancePlans", "imperio-plan"), {
      id: "imperio-plan", tenantId: "imperio", assetId: "imperio-compressor", active: true,
    });
    await setDoc(doc(db, "preventiveMaintenancePlans", "empresa-plan"), {
      id: "empresa-plan", tenantId: "empresa-teste", assetId: "empresa-compressor", active: true,
    });
    await setDoc(doc(db, "maintenanceOrders", "imperio-preventive-order"), {
      id: "imperio-preventive-order", tenantId: "imperio", preventivePlanId: "imperio-plan",
    });
    await setDoc(doc(db, "maintenancePreventiveAlertDeliveries", "imperio-delivery"), {
      tenantId: "imperio", planId: "imperio-plan",
    });
  });
});

after(async () => {
  await environment.cleanup();
});

test("login anônimo não lê documentos de configuração de empresas", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "tenants", "imperio")));
  await assertFails(getDocs(collection(db, "tenants")));
  await assertFails(getDoc(doc(db, "users", "gerencia")));
  await assertFails(getDoc(doc(db, "orders", "imperio-1")));
});

test("usuário Império só lê e grava documentos do próprio tenant", async () => {
  const db = environment.authenticatedContext("operador", { tenantId: "imperio", role: "PRODUCAO" }).firestore();
  await assertSucceeds(getDoc(doc(db, "tenants", "imperio")));
  await assertFails(getDoc(doc(db, "tenants", "empresa-teste")));
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

test("lançamento de EPI cria e incrementa saldo sem ler um documento ausente", async () => {
  const db = environment.authenticatedContext("operador", { tenantId: "imperio", role: "PRODUCAO" }).firestore();
  const stockRef = doc(db, "stocks", "epi-1|OUTROS|OUTROS|OUTROS|ACABADO");

  await assertSucceeds(setDoc(stockRef, {
    id: stockRef.id,
    itemId: 1,
    color: "OUTROS",
    size: "OUTROS",
    variation: "OUTROS",
    stage: "ACABADO",
    quantity: increment(4),
    tenantId: "imperio",
  }, { merge: true }));
  await assertSucceeds(setDoc(stockRef, { quantity: increment(3), tenantId: "imperio" }, { merge: true }));
  assert.equal((await getDoc(stockRef)).data()?.quantity, 7);

  await assertFails(setDoc(doc(db, "stocks", "foreign-stock"), {
    quantity: increment(1),
    tenantId: "empresa-teste",
  }, { merge: true }));
});

test("remoção de corte consulta apenas o tenant autenticado e aceita alvo ausente", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, "activePacks", "laser-42"), {
      id: 42,
      tenantId: "empresa-teste",
    });
    await setDoc(doc(adminDb, "activePacks", "laser-43"), {
      id: 43,
      tenantId: "imperio",
    });
  });

  const db = environment.authenticatedContext("operador", { tenantId: "imperio", role: "CORTE_LASER" }).firestore();
  const activePacks = collection(db, "activePacks");
  const ownPack = await getDocs(query(activePacks, where("tenantId", "==", "imperio"), where("id", "==", 43)));
  const missingPack = await getDocs(query(activePacks, where("tenantId", "==", "imperio"), where("id", "==", 44)));
  const otherTenantPack = await getDocs(query(activePacks, where("tenantId", "==", "imperio"), where("id", "==", 42)));

  assert.equal(ownPack.size, 1);
  assert.equal(missingPack.empty, true);
  assert.equal(otherTenantPack.empty, true);
  await assertSucceeds(deleteDoc(ownPack.docs[0].ref));
  await assertFails(deleteDoc(doc(db, "activePacks", "laser-42")));
});

test("Super Admin não lê documentos de usuário ou operação no cliente", async () => {
  const db = environment.authenticatedContext("raul", { tenantId: "global", role: "ADMIN", superAdmin: true }).firestore();
  await assertFails(getDocs(collection(db, "tenants")));
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


test("planos preventivos e equipamentos respeitam tenant e perfil de manutenção", async () => {
  const operatorDb = environment.authenticatedContext("operador", { tenantId: "imperio", role: "PRODUCAO" }).firestore();
  await assertFails(getDoc(doc(operatorDb, "maintenanceAssets", "imperio-compressor")));
  await assertFails(getDoc(doc(operatorDb, "maintenanceAssets", "empresa-compressor")));
  await assertFails(getDoc(doc(operatorDb, "preventiveMaintenancePlans", "imperio-plan")));
  await assertFails(getDoc(doc(operatorDb, "preventiveMaintenancePlans", "empresa-plan")));
  await assertFails(setDoc(doc(operatorDb, "maintenanceAssets", "operator-asset"), {
    tenantId: "imperio", name: "Ativo indevido", active: true,
  }));
  await assertFails(setDoc(doc(operatorDb, "preventiveMaintenancePlans", "operator-plan"), {
    tenantId: "imperio", assetId: "imperio-compressor", active: true,
  }));
  await assertFails(setDoc(doc(operatorDb, "maintenanceOrders", "operator-preventive-order"), {
    tenantId: "imperio", preventivePlanId: "imperio-plan",
  }));
  await assertFails(getDoc(doc(operatorDb, "maintenancePreventiveAlertDeliveries", "imperio-delivery")));
  await assertFails(setDoc(doc(operatorDb, "maintenancePreventiveAlertDeliveries", "operator-delivery"), {
    tenantId: "imperio",
  }));

  const maintenanceDb = environment.authenticatedContext("entony", { tenantId: "imperio", role: "MANUTENCAO" }).firestore();
  await assertSucceeds(getDoc(doc(maintenanceDb, "maintenanceAssets", "imperio-compressor")));
  await assertSucceeds(getDoc(doc(maintenanceDb, "preventiveMaintenancePlans", "imperio-plan")));
  await assertSucceeds(setDoc(doc(maintenanceDb, "maintenanceAssets", "entony-asset"), {
    tenantId: "imperio", name: "Compressor 2", active: true,
  }));
  await assertSucceeds(setDoc(doc(maintenanceDb, "preventiveMaintenancePlans", "entony-plan"), {
    tenantId: "imperio", assetId: "imperio-compressor", active: true,
  }));
  await assertSucceeds(setDoc(doc(maintenanceDb, "maintenanceOrders", "entony-preventive-order"), {
    tenantId: "imperio", preventivePlanId: "imperio-plan",
  }));
  await assertFails(setDoc(doc(maintenanceDb, "preventiveMaintenancePlans", "cross-tenant-plan"), {
    tenantId: "empresa-teste", assetId: "empresa-compressor", active: true,
  }));

  const managerDb = environment.authenticatedContext("gerencia", { tenantId: "imperio", role: "GERENCIA" }).firestore();
  await assertSucceeds(getDoc(doc(managerDb, "maintenanceAssets", "imperio-compressor")));
  await assertSucceeds(getDoc(doc(managerDb, "preventiveMaintenancePlans", "imperio-plan")));
  await assertSucceeds(setDoc(doc(managerDb, "preventiveMaintenancePlans", "manager-plan"), {
    tenantId: "imperio", assetId: "imperio-compressor", active: true,
  }));
});

test("diretoria com perfil de leitura visualiza preventivas e outros perfis não", async () => {
  const directorDb = environment.authenticatedContext("diretoria", { tenantId: "imperio", role: "LEITURA" }).firestore();
  await assertSucceeds(getDoc(doc(directorDb, "maintenanceAssets", "imperio-compressor")));
  await assertSucceeds(getDoc(doc(directorDb, "preventiveMaintenancePlans", "imperio-plan")));

  const productionDb = environment.authenticatedContext("producao", { tenantId: "imperio", role: "PRODUCAO" }).firestore();
  await assertFails(getDoc(doc(productionDb, "maintenanceAssets", "imperio-compressor")));
  await assertFails(getDoc(doc(productionDb, "preventiveMaintenancePlans", "imperio-plan")));
});
