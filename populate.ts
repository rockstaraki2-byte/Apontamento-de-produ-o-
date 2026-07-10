import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
import config from "./firebase-applet-config.json";
import { RAW_ITEMS } from "./src/data/items_raw";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "producao");

const COLLECTIONS_TO_CLEAR = [
  "items",
  "orders",
  "logs",
  "activePacks",
  "nestTasks",
  "notifications",
  "stocks",
  "stock_movements",
  "customers",
  "productionBatches",
  "productionAgendas"
];

async function clearCollection(colName: string) {
  console.log(`Limpar coleção: ${colName}...`);
  const colRef = collection(db, colName);
  const snap = await getDocs(colRef);
  if (snap.empty) {
    console.log(`Coleção ${colName} já está vazia.`);
    return;
  }
  
  let count = 0;
  let batch = writeBatch(db);
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  await batch.commit();
  console.log(`Excluídos ${count} documentos de ${colName}.`);
}

async function run() {
  console.log("=== INICIANDO LIMPEZA DO BANCO DE DADOS ===");
  for (const col of COLLECTIONS_TO_CLEAR) {
    try {
      await clearCollection(col);
    } catch (err: any) {
      console.error(`Erro ao limpar coleção ${col}:`, err.message);
    }
  }

  console.log("\n=== INICIANDO CADASTRO DO NOVO CATÁLOGO DE ITENS ===");
  const lines = RAW_ITEMS.trim().split("\n");
  const parsedItems = lines
    .map((line) => {
      const parts = line.split("\t");
      if (parts.length < 2) return null;
      const idStr = parts[0].trim();
      const name = parts[1].trim();
      const id = parseInt(idStr, 10);
      if (isNaN(id)) return null;
      return {
        id,
        code: idStr,
        name,
        notes: "",
      };
    })
    .filter((it): it is NonNullable<typeof it> => it !== null);

  let count = 0;
  let batch = writeBatch(db);
  for (const item of parsedItems) {
    const docRef = doc(db, "items", item.id.toString());
    batch.set(docRef, item);
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`Gravados ${count}/${parsedItems.length} itens...`);
    }
  }
  await batch.commit();
  console.log(`Sucesso! ${count} novos itens cadastrados com código e descrição.`);

  console.log("\n=== CRIANDO CLIENTE PADRÃO INDEFINIDO ===");
  try {
    const custBatch = writeBatch(db);
    const undefCustomer = {
      id: 0,
      name: "INDEFINIDA"
    };
    custBatch.set(doc(db, "customers", "0"), undefCustomer);
    await custBatch.commit();
    console.log("Cliente '0 - INDEFINIDA' cadastrado com sucesso.");
  } catch (err: any) {
    console.error("Erro ao cadastrar cliente padrão:", err.message);
  }

  console.log("\n=== RESET E POPULAÇÃO CONCLUÍDOS COM SUCESSO! ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Erro fatal na execução do script:", err);
  process.exit(1);
});
