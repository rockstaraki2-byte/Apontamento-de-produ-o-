import { createRequire } from "node:module";
import { getApps, initializeApp } from "firebase/app";
import { doc, getDoc, initializeFirestore, setDoc } from "firebase/firestore";
import { processOrderImport } from "./_lib/orderImportCore.js";
import { FirestoreOrderImportRepository } from "./_lib/orderImportFirestore.js";

const require = createRequire(import.meta.url);
const cfg = require("../firebase-applet-config.json") as any;
const appName = "ops-register-products-16set";
const app = getApps().find((a) => a.name === appName) || initializeApp({
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
  messagingSenderId: cfg.messagingSenderId,
  appId: cfg.appId,
}, appName);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, cfg.firestoreDatabaseId);

const tenantId = "imperio";
const products = [
  { code: "5528", name: "CHAPA U_1 C/ DOBRA - CHAPA 1/8\" X 121.55 MM X 25 MM", basePrice: 15.08 },
  { code: "5529", name: "CHAPA U_2 C/ DOBRA - CHAPA 1/8\" X 115 MM X 25 MM", basePrice: 14.63 },
  { code: "5530", name: "CHAPA MAIOR C/ DOBRA - CHAPA 1/16\" X 304 MM X 180 MM", basePrice: 72.06 },
  { code: "5531", name: "CHAPA REFORÇO - CHAPA 1/16\" X 187 MM X 25 MM", basePrice: 8.04 },
  { code: "5532", name: "PUXADOR - CHAPA 1/8\" X 100 MM X 87 MM", basePrice: 5.90 },
  { code: "5533", name: "CHAPA 2 FUROS CM DECOR - CHAPA 1/8\" X 60 MM X 20 MM", basePrice: 1.70 },
  { code: "5535", name: "CHAPA 3/16\" - UNIÃO TAMPO M. LATERAL CAFÉ", basePrice: 8.00 },
];

const payload = {
  origem: "CHATGPT_PDF",
  tenantId,
  solicitadoPor: "raul",
  pedidos: [
    {
      codigoPedido: "67517",
      cliente: { codigo: 858, nome: "CONSUMIDOR FINAL" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 14 DIAS",
      prazos: [14],
      comNotaFiscal: false,
      dataLimite: "2026-09-16",
      observacoes: "CLIENTE SERRA VERDE - ORC 042",
      itens: [
        { codigoOriginal: "5528", codigoProduto: "5528", descricao: products[0].name, familia: "GERENCIAL", quantidade: 1, precoUnitario: 15.08 },
        { codigoOriginal: "5529", codigoProduto: "5529", descricao: products[1].name, familia: "GERENCIAL", quantidade: 1, precoUnitario: 14.63 },
        { codigoOriginal: "5530", codigoProduto: "5530", descricao: products[2].name, familia: "GERENCIAL", quantidade: 1, precoUnitario: 72.06 },
        { codigoOriginal: "5531", codigoProduto: "5531", descricao: products[3].name, familia: "GERENCIAL", quantidade: 2, precoUnitario: 8.04 },
      ],
    },
    {
      codigoPedido: "67523",
      cliente: { codigo: 1045, nome: "VIDRACARIA DIOGO LTDA" },
      representante: "KESSE",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      comNotaFiscal: false,
      dataLimite: "2026-09-23",
      itens: [
        { codigoOriginal: "2827.1", codigoProduto: "2827", descricao: "CANTONEIRA MEDIA", familia: "GERENCIAL", quantidade: 200, precoUnitario: 1.90 },
        { codigoOriginal: "5532", codigoProduto: "5532", descricao: products[4].name, familia: "GERENCIAL", quantidade: 100, precoUnitario: 5.90 },
      ],
    },
    {
      codigoPedido: "67532",
      cliente: { codigo: 1008, nome: "C & M DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30 DIAS",
      prazos: [30],
      comNotaFiscal: true,
      dataLimite: "2026-09-22",
      itens: [
        { codigoOriginal: "5354", codigoProduto: "5354", descricao: "CHAPA 1/8\" X 460 MM X 50 MM C/ ENCAIXE", familia: "INDEFINIDA", quantidade: 200, precoUnitario: 8.23 },
        { codigoOriginal: "5533", codigoProduto: "5533", descricao: products[5].name, familia: "INDEFINIDA", quantidade: 100, precoUnitario: 1.70 },
      ],
    },
    {
      codigoPedido: "67536",
      cliente: { codigo: 1478, nome: "CYRNE DECOR LTDA" },
      representante: "IMPERIO JOMARCI INDUSTRIA E COMERCIO LTD",
      formaPagamento: "BOLETO 30/45/60",
      prazos: [30,45,60],
      comNotaFiscal: true,
      dataLimite: "2026-09-23",
      itens: [
        { codigoOriginal: "3908", codigoProduto: "3908", descricao: "CHAPA 3/16 - ACABAMENTO SUPERIOR DELFOS", familia: "INDEFINIDA", quantidade: 47, precoUnitario: 1.49 },
        { codigoOriginal: "4015", codigoProduto: "4015", descricao: "CHAPA 3/16 - BASE LATERAL DELFOS", familia: "INDEFINIDA", quantidade: 47, precoUnitario: 4.86 },
        { codigoOriginal: "4517", codigoProduto: "4517", descricao: "CHAPA 1/4 - PÉ ESQ POLT. ORACULO", familia: "INDEFINIDA", quantidade: 14, precoUnitario: 54.51 },
        { codigoOriginal: "4515", codigoProduto: "4515", descricao: "CHAPA 1/8 - ARO APOIO POLT. ORACULO", familia: "INDEFINIDA", quantidade: 28, precoUnitario: 0.98 },
        { codigoOriginal: "4454", codigoProduto: "4454", descricao: "CHAPA 3/16 - BASE M. CENTRO TRIVIUM P", familia: "INDEFINIDA", quantidade: 5, precoUnitario: 6.90 },
        { codigoOriginal: "4455", codigoProduto: "4455", descricao: "CHAPA 3/16 - BASE M. CENTRO TRIVIUM G", familia: "INDEFINIDA", quantidade: 3, precoUnitario: 8.33 },
        { codigoOriginal: "5138", codigoProduto: "5138", descricao: "CHAPA 3/16 - BASE MAIOR LATERAL ÁUREA P", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.16 },
        { codigoOriginal: "5165", codigoProduto: "5165", descricao: "CHAPA 3/16 - BASE MAIOR LATERAL ÁUREA G", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.24 },
        { codigoOriginal: "5139", codigoProduto: "5139", descricao: "CHAPA 3/16 - BASE MENOR LATERAL ÁUREA P", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.22 },
        { codigoOriginal: "5166", codigoProduto: "5166", descricao: "CHAPA 3/16 - BASE MENOR LATERAL ÁUREA G", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 8.18 },
        { codigoOriginal: "5167", codigoProduto: "5167", descricao: "CHAPA 3/16 - TAMPO D400MM LATERAL AUREA AÇO", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 5.00 },
        { codigoOriginal: "5168", codigoProduto: "5168", descricao: "CHAPA 3/16 - TAMPO D550MM LATERAL AUREA G", familia: "INDEFINIDA", quantidade: 6, precoUnitario: 6.62 },
        { codigoOriginal: "5393", codigoProduto: "5393", descricao: "CHAPA 1/4\" - BASE LATERAL ORION P/G", familia: "INDEFINIDA", quantidade: 12, precoUnitario: 5.38 },
        { codigoOriginal: "5392", codigoProduto: "5392", descricao: "CHAPA 1/4\" - BASE LATERAL ORION M", familia: "INDEFINIDA", quantidade: 10, precoUnitario: 5.94 },
        { codigoOriginal: "5219", codigoProduto: "5219", descricao: "CHAPA 1/8\" - BRAÇO DIR CADEIRA OUTONO - DOB", familia: "INDEFINIDA", quantidade: 26, precoUnitario: 3.44 },
        { codigoOriginal: "5216", codigoProduto: "5216", descricao: "CHAPA 1/8\" - CTPO M. LAT. CAFÉ", familia: "INDEFINIDA", quantidade: 110, precoUnitario: 3.47 },
        { codigoOriginal: "5202", codigoProduto: "5202", descricao: "CHAPA 3/16\" - BASE M.LATERAL CAFÉ", familia: "INDEFINIDA", quantidade: 55, precoUnitario: 8.00 },
        { codigoOriginal: "5457", codigoProduto: "5457", descricao: "CHAPA 1/8\" - BASE M.LATERAL CAFÉ", familia: "INDEFINIDA", quantidade: 110, precoUnitario: 3.37 },
        { codigoOriginal: "5535", codigoProduto: "5535", descricao: products[6].name, familia: "INDEFINIDA", quantidade: 55, precoUnitario: 8.00 },
        { codigoOriginal: "4287", codigoProduto: "4287", descricao: "CHAPA 1/8\" CONTRATAMPO ALESSIA/ESTHER", familia: "INDEFINIDA", quantidade: 8, precoUnitario: 10.13 },
      ],
    },
  ],
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ sucesso: false, erro: "METHOD_NOT_ALLOWED" });
  try {
    const productResults: any[] = [];
    for (const p of products) {
      const ref = doc(db, "items", p.code);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const current = snap.data() as any;
        if (String(current.tenantId || "imperio") !== tenantId || String(current.code || "") !== p.code) {
          throw new Error(`Conflito no cadastro do item ${p.code}.`);
        }
        productResults.push({ code: p.code, status: "JA_EXISTE", id: p.code });
        continue;
      }
      await setDoc(ref, {
        tenantId,
        code: p.code,
        name: p.name,
        basePrice: p.basePrice,
        productionPoints: 0,
        notes: "",
        active: true,
        createdAt: Date.now(),
        createdBy: "chatgpt-integration",
      });
      productResults.push({ code: p.code, status: "CRIADO", id: p.code, basePrice: p.basePrice });
    }

    const repo = new FirestoreOrderImportRepository();
    const validation = await processOrderImport(repo, payload as any, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date() }, true);
    if (!validation.sucesso || validation.resumo.comErro > 0 || validation.resumo.validos !== 4) {
      return res.status(422).json({ sucesso: false, fase: "VALIDACAO", productResults, validation });
    }
    const imported = await processOrderImport(repo, payload as any, { tenantId, origem: "CHATGPT_PDF", solicitadoPor: "raul", now: new Date() }, false);
    return res.status(imported.sucesso ? 200 : 422).json({ sucesso: imported.sucesso, fase: "IMPORTACAO", productResults, validation, imported });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error?.message || String(error) });
  }
}
