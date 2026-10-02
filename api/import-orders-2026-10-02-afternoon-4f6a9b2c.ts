import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  query,
  where,
} from "firebase/firestore";
import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const tenantId = "imperio";
const targetCodes = ["68172","68187","68190","68191","68192","68193","68194"];

const orders: any[] = [
  {
    codigoPedido: "68172",
    cliente: { codigo: 28, nome: "CORBELLI E PEREIRA LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: true,
    dataLimite: "2026-09-30",
    observacoes: "STATUS PDF: DOCUMENTO FATURADO",
    itens: [
      {
        codigoOriginal: "4597",
        codigoProduto: "4597",
        descricao: "CHAPA MESA TOPO 35MM LISA CHAPA 3/16",
        familia: "INDEFINIDA",
        quantidade: 5,
        precoUnitario: 1.46,
        descontoPercentual: 4.9315,
        observacoes: "PDF: desconto nominal 5%; desconto efetivo R$ 0,36 em R$ 7,30."
      }
    ]
  },
  {
    codigoPedido: "68187",
    cliente: { codigo: 945, nome: "CASA VENERE FABRICACAO E COMERCIO DE MOVEIS LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: false,
    dataLimite: "2026-10-02",
    observacoes: "STATUS PDF: DOCUMENTO FATURADO",
    itens: [
      {
        codigoOriginal: "2517.11",
        codigoProduto: "2517",
        descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA",
        familia: "GERENCIAL",
        quantidade: 100,
        precoUnitario: 1.8
      }
    ]
  },
  {
    codigoPedido: "68190",
    cliente: { codigo: 370, nome: "STORE ESTOFADOS INDUSTRIA E COMERCIO LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 30/60/90",
    prazos: [30,60,90],
    comNotaFiscal: true,
    dataLimite: "2026-10-06",
    observacoes: "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "2.1",
        codigoProduto: "2",
        descricao: "RODIZIO SILICONE DE 50 TRANSPARENTE",
        familia: "INDEFINIDA",
        quantidade: 250,
        precoUnitario: 1.52,
        descontoPercentual: 3
      }
    ]
  },
  {
    codigoPedido: "68191",
    cliente: { codigo: 1709, nome: "ESTOFARIA TEIXEIRA RIOBRANCO LTDA" },
    representante: "KESSE",
    formaPagamento: "BOLETO 15 DIAS",
    prazos: [15],
    comNotaFiscal: false,
    dataLimite: "2026-10-06",
    observacoes: "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "2517.11",
        codigoProduto: "2517",
        descricao: "BARRA CHATA REFORÇO 53 CM 2 FUROS - PERFILADA",
        familia: "GERENCIAL",
        quantidade: 200,
        precoUnitario: 1.8
      }
    ]
  },
  {
    codigoPedido: "68192",
    cliente: { codigo: 1478, nome: "CYRNE DECOR LTDA" },
    representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
    formaPagamento: "BOLETO 30/45/60",
    prazos: [30,45,60],
    comNotaFiscal: true,
    dataLimite: "2026-10-08",
    observacoes: "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      { codigoOriginal: "2964", codigoProduto: "2964", descricao: "CHAPA 1/8- SUPORTE TAMPO 80MM", familia: "INDEFINIDA", quantidade: 250, precoUnitario: 2.15 },
      { codigoOriginal: "5393", codigoProduto: "5393", descricao: "CHAPA 1/4\" - BASE LATERAL ORION P/G", familia: "INDEFINIDA", quantidade: 20, precoUnitario: 5.38 },
      { codigoOriginal: "5217", codigoProduto: "5217", descricao: "CHAPA 1/8\" - CHAPA CTP. LUNETA.", familia: "INDEFINIDA", quantidade: 15, precoUnitario: 3.48 },
      { codigoOriginal: "5457", codigoProduto: "5457", descricao: "CHAPA 1/8\" - BASE M.LATERAL CAFÉ", familia: "INDEFINIDA", quantidade: 110, precoUnitario: 3.37 },
      { codigoOriginal: "5214", codigoProduto: "5214", descricao: "CHAPA 1/4\" - DISCO BASE LUNETA", familia: "INDEFINIDA", quantidade: 15, precoUnitario: 3.93 }
    ]
  },
  {
    codigoPedido: "68193",
    cliente: { codigo: 43, nome: "RHAIANE MARCOS SPERANDIO 12901187609" },
    representante: "MAPEFOR REPRESENTACOES LTDA",
    formaPagamento: "BOLETO 30 DIAS",
    prazos: [30],
    comNotaFiscal: true,
    dataLimite: "2026-10-02",
    observacoes: "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "9",
        codigoProduto: "9",
        descricao: "SUPORTE QUADRADO",
        familia: "INDEFINIDA",
        quantidade: 150,
        precoUnitario: 1.26
      }
    ]
  },
  {
    codigoPedido: "68194",
    cliente: { codigo: 288, nome: "HAUDECOR" },
    representante: "KESSE",
    formaPagamento: "PIX A VISTA",
    prazos: [],
    comNotaFiscal: false,
    dataLimite: "2026-10-06",
    observacoes: "STATUS PDF: PEDIDO DE VENDA - PROCESSADO",
    itens: [
      {
        codigoOriginal: "66",
        codigoProduto: "66",
        descricao: "SUPORTE CANTONEIRA",
        familia: "GERENCIAL",
        quantidade: 900,
        precoUnitario: 2.3
      }
    ]
  }
];

const require = createRequire(import.meta.url);
const firebaseConfigFile = require("../firebase-applet-config.json") as any;
const APP_NAME = "ops-import-orders-2026-10-02-afternoon";
const firebaseApp =
  getApps().find((app) => app.name === APP_NAME) ||
  initializeApp(
    {
      apiKey: firebaseConfigFile.apiKey,
      authDomain: firebaseConfigFile.authDomain,
      projectId: firebaseConfigFile.projectId,
      storageBucket: firebaseConfigFile.storageBucket,
      messagingSenderId: firebaseConfigFile.messagingSenderId,
      appId: firebaseConfigFile.appId,
    },
    APP_NAME,
  );
const db = initializeFirestore(
  firebaseApp,
  { experimentalForceLongPolling: true },
  firebaseConfigFile.firestoreDatabaseId,
);

async function verifyOrders() {
  const rows: any[] = [];
  for (const orderCode of targetCodes) {
    const snap = await getDocs(query(collection(db, "orders"), where("orderCode", "==", orderCode)));
    for (const d of snap.docs) {
      const data: any = d.data();
      if (String(data.tenantId || "imperio") !== tenantId) continue;
      let item: any = {};
      try {
        const itemSnap = await getDoc(doc(db, "items", String(data.itemId)));
        item = itemSnap.exists() ? itemSnap.data() : {};
      } catch {}
      rows.push({
        docId: d.id,
        id: data.id,
        orderCode,
        customerId: data.customerId,
        customerName: data.customerName,
        representativeName: data.representativeName,
        itemId: data.itemId,
        itemCode: item.code || "",
        itemName: item.name || data.customProductName || "",
        originalProductCode: data.originalProductCode || "",
        color: data.color || "",
        variation: data.variation || "",
        totalQuantity: Number(data.totalQuantity || 0),
        invoicedQuantity: Number(data.invoicedQuantity || 0),
        unitPrice: Number(data.unitPrice || 0),
        discountPercent: Number(data.discountPercent || 0),
        grossTotalScaled: Number(data.grossTotalScaled || 0),
        discountAmountScaled: Number(data.discountAmountScaled || 0),
        netTotalScaled: Number(data.netTotalScaled || 0),
        deliveryDate: data.deliveryDate || "",
        paymentCondition: data.paymentCondition || "",
        paymentTerms: data.paymentTerms || "",
        fiscalType: data.fiscalType || "",
        status: data.status || "",
        isActive: data.isActive !== false,
        importOrigin: data.importOrigin || "",
        importedBy: data.importedBy || "",
      });
    }
  }
  return rows;
}

function createResolvedRepository() {
  const base = new FirestoreOrderImportRepository();
  return {
    loadCatalog: async (requestedTenantId: string) => {
      const catalog = await base.loadCatalog(requestedTenantId);
      return {
        ...catalog,
        items: catalog.items.filter((item: any) => {
          if (String(item.code || "").trim() !== "5217") return true;
          return Number(item.id) === 1784816535104;
        }),
      };
    },
    findExistingOrderIds: base.findExistingOrderIds.bind(base),
    createOrderAtomically: base.createOrderAtomically.bind(base),
    writeAudit: base.writeAudit.bind(base),
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  }

  if (String(req.query?.catalog || "").toLowerCase() === "true") {
    const repo = new FirestoreOrderImportRepository();
    const catalog = await repo.loadCatalog(tenantId);
    const matches = catalog.items.filter((item: any) => String(item.code || "").trim() === "5217");
    return res.status(200).json({
      sucesso: true,
      items: matches.map((item: any) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        tenantId: item.tenantId,
        recoveredAt: item.recoveredAt || null,
        fields: Object.keys(item).sort(),
        metadata: Object.fromEntries(
          Object.entries(item).filter(([key]) =>
            /^(family|familia|color|cor|size|tamanho|variation|active|status|createdAt|updatedAt|origin|source|recoveredAt)$/i.test(key),
          ),
        ),
      })),
    });
  }

  if (String(req.query?.verify || "").toLowerCase() === "true") {
    const rows = await verifyOrders();
    return res.status(200).json({ sucesso: true, tenantId, targetCodes, rows });
  }

  const dryRun = String(req.query?.dryRun || "").toLowerCase() === "true";
  const execute = String(req.query?.execute || "").toLowerCase() === "true";
  if (!dryRun && !execute) {
    return res.status(400).json({
      sucesso: false,
      erro: "EXPLICIT_MODE_REQUIRED",
      mensagem: "Use ?dryRun=true ou ?execute=true."
    });
  }

  const repo = createResolvedRepository();
  const meta = {
    tenantId,
    origem: "CHATGPT_GOOGLE_DRIVE_PDF_PEDIDOS_02_OUT_TARDE",
    solicitadoPor: "raul",
    now: new Date(),
  };
  const payload = {
    origem: meta.origem,
    tenantId,
    solicitadoPor: meta.solicitadoPor,
    pedidos: orders,
  };
  const result = await processOrderImport(repo, payload as any, meta, dryRun);
  return res.status(result.resumo.comErro > 0 ? 207 : 200).json(result);
}
