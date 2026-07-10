import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, writeBatch, setDoc, getDoc } from "firebase/firestore";
import config from "./firebase-applet-config.json";
import { RAW_ORDERS } from "./src/data/orders_raw";

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
  console.log("=== INICIANDO IMPORTAÇÃO DE PEDIDOS E CLIENTES ===");
  const lines = RAW_ORDERS.trim().split("\n").slice(1); // skip header
  
  const parsedOrders = [];
  const parsedCustomers = new Map<number, any>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    
    // Fallbacks to avoid out-of-bounds
    const orderCode = parts[4]?.trim() || "";
    if (!orderCode) continue;

    const issueDateStr = parts[5]?.trim() || "";
    const deliveryDateStr = parts[8]?.trim() || "";
    const customerIdStr = parts[9]?.trim() || "";
    const customerName = parts[10]?.trim() || "INDEFINIDO";
    const city = parts[11]?.trim() || "";
    const uf = parts[12]?.trim() || "";
    const addressStr = parts[13]?.trim() || "";
    const numberStr = parts[14]?.trim() || "";
    const neighborhood = parts[15]?.trim() || "";

    const customerId = parseInt(customerIdStr, 10);
    if (!isNaN(customerId) && customerId > 0 && !parsedCustomers.has(customerId)) {
      parsedCustomers.set(customerId, {
        id: customerId,
        name: customerName,
        address: `${addressStr}, ${numberStr} - ${neighborhood}, ${city} - ${uf}`,
        phone: "",
        email: ""
      });
    }

    const qtyStr = parts[21]?.trim() || "0";
    let totalQty = parseInt(qtyStr, 10);
    if (isNaN(totalQty) || totalQty <= 0) {
      totalQty = 1; // default if not parseable
    }

    let createdAt = Date.now();
    // Parse Date de Emissão: DD/MM/YYYY HH:MM:SS
    if (issueDateStr) {
      const [datePart, timePart] = issueDateStr.split(" ");
      if (datePart) {
        const [dd, mm, yyyy] = datePart.split("/");
        if (dd && mm && yyyy) {
          const t = timePart || "00:00:00";
          createdAt = new Date(`${yyyy}-${mm}-${dd}T${t}Z`).getTime();
        }
      }
    }

    let deliveryDate = "2026-12-31";
    if (deliveryDateStr) {
      const [dd, mm, yyyy] = deliveryDateStr.split("/");
      if (dd && mm && yyyy) {
        deliveryDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    const orderIdStr = orderCode.replace(/\D/g, "");
    const orderId = parseInt(orderIdStr || Math.floor(Math.random()*1000000).toString(), 10);

    parsedOrders.push({
      id: orderId,
      orderCode: orderCode,
      itemId: 0, // generic item
      color: "UNICA",
      size: "UNICA",
      variation: "UNICA",
      customerName: customerName,
      totalQuantity: totalQty,
      packedQuantity: 0,
      producedQuantity: 0,
      paintedQuantity: 0,
      cutQuantity: 0,
      invoicedQuantity: 0,
      isActive: true,
      createdAt,
      deliveryDate,
      status: "PENDENTE"
    });
  }

  console.log(`Encontrados ${parsedCustomers.size} clientes e ${parsedOrders.length} pedidos.`);

  try {
    // create Generic item 0 just in case
    await setDoc(doc(db, "items", "0"), {
      id: 0,
      code: "0",
      name: "PRODUTO NÃO ESPECIFICADO",
      notes: "Item genérico para pedidos sem item associado."
    }, { merge: true });
    console.log("Item genérico 0 criado.");
    
    // customers
    let custBatch = writeBatch(db);
    let custCount = 0;
    for (const cust of Array.from(parsedCustomers.values())) {
      custBatch.set(doc(db, "customers", cust.id.toString()), cust);
      custCount++;
      if (custCount % 400 === 0) {
        await custBatch.commit();
        custBatch = writeBatch(db);
      }
    }
    await custBatch.commit();
    console.log(`Salvos ${custCount} clientes.`);

    // orders
    let ordBatch = writeBatch(db);
    let ordCount = 0;
    for (const order of parsedOrders) {
      ordBatch.set(doc(db, "orders", order.id.toString()), order);
      ordCount++;
      if (ordCount % 400 === 0) {
        await ordBatch.commit();
        ordBatch = writeBatch(db);
      }
    }
    await ordBatch.commit();
    console.log(`Salvos ${ordCount} pedidos.`);

    console.log("IMPORTAÇÃO CONCLUÍDA!");
  } catch (err: any) {
    console.error("Erro ao salvar dados:", err.message);
  }

  process.exit(0);
}

run().catch(console.error);
