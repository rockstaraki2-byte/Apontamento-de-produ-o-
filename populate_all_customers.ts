import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, writeBatch } from "firebase/firestore";
import config from "./firebase-applet-config.json";
import { CUSTOMERS_PART1 } from "./src/data/customers_comp_1";
import { CUSTOMERS_PART2 } from "./src/data/customers_comp_2";
import { CUSTOMERS_PART3 } from "./src/data/customers_comp_3";
import { CUSTOMERS_PART4 } from "./src/data/customers_comp_4";

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

async function run() {
  console.log("=== INICIANDO IMPORTAÇÃO DA BASE COMPLETA DE CLIENTES ===");
  
  const allParts = [
    CUSTOMERS_PART1,
    CUSTOMERS_PART2,
    CUSTOMERS_PART3,
    CUSTOMERS_PART4
  ];

  const parsedCustomers = [];

  for (const part of allParts) {
    const lines = part.trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split("|");
      if (parts.length < 4) continue;
      
      const idStr = parts[0].trim();
      const name = parts[1].trim();
      const city = parts[2].trim();
      const uf = parts[3].trim();
      
      const id = parseInt(idStr, 10);
      if (isNaN(id)) continue;
      
      parsedCustomers.push({
        id,
        name,
        address: `${city} - ${uf}`,
        phone: "",
        email: ""
      });
    }
  }

  console.log(`Encontrados ${parsedCustomers.length} clientes formatados.`);

  try {
    let batch = writeBatch(db);
    let count = 0;
    
    for (const cust of parsedCustomers) {
      const docRef = doc(db, "customers", cust.id.toString());
      batch.set(docRef, cust, { merge: true });
      count++;
      
      if (count % 450 === 0) {
        await batch.commit();
        batch = writeBatch(db);
        console.log(`Gravados ${count}/${parsedCustomers.length} clientes...`);
      }
    }
    
    if (count % 450 !== 0) {
      await batch.commit();
    }
    
    console.log(`\n=== IMPORTAÇÃO DE CLIENTES CONCLUÍDA! ===`);
    console.log(`SUCESSO: Total de ${count} clientes importados/atualizados no Firestore.`);
  } catch (err: any) {
    console.error("Erro fatal ao salvar clientes:", err.message);
  }
  
  process.exit(0);
}

run().catch(console.error);
