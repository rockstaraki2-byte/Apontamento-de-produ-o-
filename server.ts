import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    const rawAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Interceptar erros de faturamento (Dunning Decision) para apresentar uma mensagem clara ao usuário
    if (rawAi.models && typeof rawAi.models.generateContent === "function") {
      const originalGenerateContent = rawAi.models.generateContent.bind(rawAi.models);
      rawAi.models.generateContent = async function(...args: any[]) {
        try {
          return await originalGenerateContent(...args);
        } catch (error: any) {
          const errorStr = String(error?.message || error?.status || error || "");
          if (
            errorStr.toLowerCase().includes("dunning") ||
            errorStr.toLowerCase().includes("dunning decision") ||
            errorStr.toLowerCase().includes("deny for project") ||
            errorStr.toLowerCase().includes("permission_denied")
          ) {
            throw new Error(
              "A conta do Google Cloud possui uma pendência financeira pendente de sincronização (Dunning Decision Deny). " +
              "Como você realizou o pagamento recentemente, o Google Cloud pode levar de 2 a 24 horas para processar a baixa bancária, atualizar o status da conta e restabelecer o acesso às APIs de Inteligência Artificial. " +
              "Por favor, aguarde esse intervalo de tempo da própria plataforma do Google para que os serviços voltem a funcionar normalmente."
            );
          }
          throw error;
        }
      };
    }

    aiInstance = rawAi;
  }
  return aiInstance;
}
import { getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getServerDb, initFirebaseAdmin, collection, getDocs, writeBatch, query, where, doc, setDoc } from "./server_firebase";
import config from "./firebase-applet-config.json";

async function cleanupInvalidFcmTokens(tokensToRemove: string[]) {
  if (!tokensToRemove || tokensToRemove.length === 0) return;
  try {
    const db = getServerDb();
    const batch = writeBatch(db);
    let count = 0;
    for (const token of tokensToRemove) {
      const snap = await getDocs(query(collection(db, "users"), where("fcmToken", "==", token)));
      snap.forEach((doc: any) => {
        batch.update(doc.ref, { fcmToken: null });
        count++;
      });
    }
    if (count > 0) {
      await batch.commit();
      console.log(`[PushService] Limpeza efetuada: ${count} tokens FCM expirados/inválidos removidos dos usuários.`);
    }
  } catch (e) {
    console.error("[PushService] Erro durante limpeza de tokens individuais:", e);
  }
}
import multer from "multer";
// @ts-ignore
import pdfParse from "pdf-parse-debugging-disabled";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const upload = multer({ storage: multer.memoryStorage() });

// Initialize Firebase Admin gracefully via getServerDb
try {
  initFirebaseAdmin();
  getServerDb();
  console.log("Firebase SDKs initialized successfully via getServerDb/initFirebaseAdmin helper.");

  // Start Cron for daily deadline checks
  startDeadlineCron();
  startAgentPedidosSemLoteCron();
} catch (e) {
  console.error("Failed to initialize Firebase Admin on startup:", e);
}

import cron from "node-cron";
import { runAgentPedidosSemLote } from "./server_agent_pedidos_sem_lote";

function startAgentPedidosSemLoteCron() {
  // Run once a month at 07:30 America/Sao_Paulo on the 1st day of the month
  cron.schedule("30 7 1 * *", async () => {
    console.log("Running Agent Pedidos Sem Lote Cron...");
    try {
      const ai = getGeminiClient();
      await runAgentPedidosSemLote(ai);
    } catch (e) {
      console.error("Error in Agent Pedidos Sem Lote Cron:", e);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  // Also run 2 minutes after startup just to test/initialize
  setTimeout(async () => {
    console.log("Running Agent Pedidos Sem Lote Setup once...");
    try {
      const ai = getGeminiClient();
      await runAgentPedidosSemLote(ai);
    } catch (e) {
      console.error("Error in startup Agent Pedidos Sem Lote Setup:", e);
    }
  }, 120000);
}

function startDeadlineCron() {
  const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  // Also run a check 1 minute after startup
  setTimeout(checkDeadlines, 60000);
  setInterval(checkDeadlines, CHECK_INTERVAL_MS);
}

async function checkDeadlines() {
  try {
    const db = getServerDb();
    const ordersSnap = await getDocs(collection(db, "orders"));
    const usersSnap = await getDocs(collection(db, "users"));

    const targetRoles = ["ADMIN", "PCP"];
    const targetTokens: string[] = [];

    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (targetRoles.includes(data.role) && data.fcmToken) {
        targetTokens.push(data.fcmToken);
      }
    });

    if (targetTokens.length === 0) return;

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayMs = today.getTime();

    let lateCount = 0;

    ordersSnap.forEach((doc) => {
      const o = doc.data();
      if (
        o.status !== "FATURADO" &&
        o.status !== "EMBALADO" &&
        o.deliveryDate
      ) {
        const delivery = new Date(o.deliveryDate);
        delivery.setUTCHours(12, 0, 0, 0);
        const deliveryMs = delivery.getTime();
        const diffTime = deliveryMs - todayMs;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0 || (diffDays >= 0 && diffDays <= 2)) {
          lateCount++;
        }
      }
    });

    if (lateCount > 0) {
      const response = await getMessaging().sendEachForMulticast({
        notification: {
          title: "Atenção a Prazos",
          body: `Você tem ${lateCount} pedido(s) atrasado(s) ou vencendo em breve. Verifique o sistema.`,
        },
        webpush: {
          notification: {
            title: "Atenção a Prazos",
            body: `Você tem ${lateCount} pedido(s) atrasado(s) ou vencendo em breve. Verifique o sistema.`,
            icon: '/icon.png',
            vibrate: [200, 100, 200],
            requireInteraction: true
          },
          fcmOptions: { link: '/' }
        },
        data: { click_action: '/' },
        tokens: targetTokens,
      });
      console.log(
        `Disparada notificação periódica de atraso para ${targetTokens.length} usuários. Sucessos: ${response.successCount}, Falhas: ${response.failureCount}`,
      );
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.warn(`Falha na entrega ao token ${targetTokens[idx]}:`, resp.error);
            if (resp.error?.code === 'messaging/invalid-registration-token' ||
                resp.error?.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(targetTokens[idx]);
            }
          }
        });
        await cleanupInvalidFcmTokens(tokensToRemove);
      }
    }
  } catch (e: any) {
    if (e.message && e.message.includes("NOT_FOUND")) {
      console.warn(
        "⚠️ AVISO: Banco de dados Firestore não encontrado. Verifique se o Firebase foi provisionado corretamente.",
      );
    } else if (
      e.message &&
      e.message.includes("PERMISSION_DENIED") &&
      e.message.includes("Cloud Firestore API has not been used")
    ) {
      console.warn(
        "⚠️ AVISO: A API do Cloud Firestore não está ativada no seu projeto GCP para o SDK Admin.",
      );
      console.warn(
        "Para que a verificação diária de prazos funcione, acesse o link abaixo e ative a API:",
      );
      const linkMatch = e.message.match(
        /https:\/\/console\.developers\.google\.com[^\s]*/,
      );
      if (linkMatch) {
        console.warn("👉 " + linkMatch[0]);
      }
    } else {
      console.error("Erro na verificação periódica de prazos:", e);
    }
  }
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // Tenta pdf-parse primeiro, pois é extremamente leve, rápido (<100ms) e seguro para rodar em Serverless (Vercel) sem estourar o limite de 10 segundos
  try {
    console.log("[PDF Extração] Tentando pdf-parse para leitura rápida...");
    const parseFunc = typeof pdfParse === "function" ? pdfParse : (pdfParse as any).default;
    const pdfData = await parseFunc(buffer);
    if (pdfData && pdfData.text && pdfData.text.trim()) {
      console.log(`[PDF Extração] pdf-parse concluído com sucesso (${pdfData.text.length} caracteres).`);
      return pdfData.text;
    }
  } catch (err: any) {
    console.warn("[PDF Extração] pdf-parse falhou, tentando pdfjsLib como contingência:", err.message || err);
  }

  // Se pdf-parse falhar ou vier vazio, tenta a biblioteca alternativa pdfjsLib que preserva colunas
  try {
    console.log("[PDF Extração] Iniciando pdfjsLib...");
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true
    });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      // Group items by vertical position (Y coordinate) to preserve structure
      const linesMap: { [y: number]: any[] } = {};
      for (const item of items) {
        if (typeof item.str !== "string") continue;
        const y = Math.round(item.transform[5]);
        if (!linesMap[y]) {
          linesMap[y] = [];
        }
        linesMap[y].push(item);
      }

      // Sort Y coordinate descending (top to bottom)
      const sortedY = Object.keys(linesMap)
        .map(Number)
        .sort((a, b) => b - a);

      let pageText = "";
      for (const y of sortedY) {
        // Sort horizontally left to right
        const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
        const lineText = lineItems.map(item => item.str).join(" ");
        pageText += lineText + "\n";
      }

      fullText += `\n--- Página ${pageNum} ---\n` + pageText;
    }

    return fullText;
  } catch (err: any) {
    console.error("[PDF Extração] Ambos os extratores (pdf-parse e pdfjsLib) falharam:", err.message || err);
    throw err;
  }
}

function cleanJsonText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

function parsePdfTextFallback(text: string): any[] {
  console.log("[PDF Fallback Parser] Starting contingency parsing on text of length:", text.length);

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  // Decide format: tabular/spread-sheet vs document flow
  let tabLinesCount = 0;
  for (const line of lines) {
    if (line.split("\t").length > 3) {
      tabLinesCount++;
    }
  }
  
  const isTabular = tabLinesCount > Math.min(5, lines.length / 2) || 
                    lines.some(l => l.toUpperCase().includes("RAZÃO SOCIAL") && l.split("\t").length > 3);
  
  if (isTabular) {
    console.log("[PDF Fallback Parser] Decided Tabular format");
    return parseTabularFormat(lines);
  } else {
    console.log("[PDF Fallback Parser] Decided Document template format");
    return parseDocumentFormat(text, lines);
  }
}

function parseTabularFormat(lines: string[]): any[] {
  const orders: any[] = [];
  
  // Find header row or default
  let headerRowIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = lines[i].split("\t").map(c => c.trim().toUpperCase());
    if (cols.some(c => c.includes("CÓDIGO") || c.includes("CODIGO") || c.includes("RAZÃO SOCIAL") || c.includes("CLIENTE") || c.includes("PEDIDO") || c.includes("EMISSÃO"))) {
      headerRowIdx = i;
      headers = cols;
      break;
    }
  }
  
  let startIdx = headerRowIdx + 1;
  if (headerRowIdx === -1) {
    headers = [];
    startIdx = 0;
  }
  
  const getColIdx = (names: string[]) => {
    return headers.findIndex(h => names.some(name => h.includes(name.toUpperCase())));
  };
  
  // Column indexes
  const idxCode = getColIdx(["PEDIDO", "CÓD. O.V.", "CÓDIGO", "NUMERO", "Nº O.V.", "O.V.", "Nº PEDIDO"]) !== -1 
    ? getColIdx(["PEDIDO", "CÓD. O.V.", "CÓDIGO", "NUMERO", "Nº O.V.", "O.V.", "Nº PEDIDO"]) 
    : 4;
  
  const idxEmissionDate = getColIdx(["DATA DE EMISSÃO", "EMISSÃO", "EMISSAO", "DATA EMISSÃO"]) !== -1
    ? getColIdx(["DATA DE EMISSÃO", "EMISSÃO", "EMISSAO", "DATA EMISSÃO"])
    : 5;
    
  const idxDeliveryDate = getColIdx(["PROMESSA ENTREGA", "PROMESSA DE ENTREGA", "PREV.FATURAMENTO", "PROMETIDO", "ENTREGA", "PREVISÃO"]) !== -1
    ? getColIdx(["PROMESSA ENTREGA", "PROMESSA DE ENTREGA", "PREV.FATURAMENTO", "PROMETIDO", "ENTREGA", "PREVISÃO"])
    : 8;
    
  const idxCustomerCode = getColIdx(["CÓD. CLIENTE", "COD. CLIENTE", "CLIENTE (CÓDIGO)", "COD CLIENTE"]) !== -1
    ? getColIdx(["CÓD. CLIENTE", "COD. CLIENTE", "CLIENTE (CÓDIGO)", "COD CLIENTE"])
    : 9;
    
  const idxCustomerName = getColIdx(["RAZÃO SOCIAL", "NOME/RAZÃO SOCIAL", "NOME DO CLIENTE", "CLIENTE", "RAZAO SOCIAL"]) !== -1
    ? getColIdx(["RAZÃO SOCIAL", "NOME/RAZÃO SOCIAL", "NOME DO CLIENTE", "CLIENTE", "RAZAO SOCIAL"])
    : 10;
    
  const idxRepName = getColIdx(["CONSULTOR", "VENDEDOR", "REPRESENTANTE"]) !== -1
    ? getColIdx(["CONSULTOR", "VENDEDOR", "REPRESENTANTE"])
    : -1;
    
  const idxPaymentCond = getColIdx(["SITUAÇÃO DO DOCUMENTO", "SITUAÇÃO", "SITUACAO", "FORMA DE PAGAMENTO", "COND.PGTO", "CONDIÇÃO DE PGTO"]) !== -1
    ? getColIdx(["SITUAÇÃO DO DOCUMENTO", "SITUAÇÃO", "SITUACAO", "FORMA DE PAGAMENTO", "COND.PGTO", "CONDIÇÃO DE PGTO"])
    : 27;
    
  const idxStatusOriginal = getColIdx(["STATUS DO DOCUMENTO", "STATUS", "DESCRICAO DO STATUS", "DESCRIÇÃO DO STATUS", "SITUAÇÃO DO STATUS"]) !== -1
    ? getColIdx(["STATUS DO DOCUMENTO", "STATUS", "DESCRICAO DO STATUS", "DESCRIÇÃO DO STATUS", "SITUAÇÃO DO STATUS"])
    : 28;

  const idxCity = getColIdx(["CIDADE", "DESCRIÇÃO DA CIDADE", "CIDADE DEST.FINAL"]) !== -1
    ? getColIdx(["CIDADE", "DESCRIÇÃO DA CIDADE", "CIDADE DEST.FINAL"])
    : 11;

  const idxUf = getColIdx(["UF", "ESTADO", "SIGLA DA UF", "UF DEST.FINAL"]) !== -1
    ? getColIdx(["UF", "ESTADO", "SIGLA DA UF", "UF DEST.FINAL"])
    : 12;

  const idxQty = getColIdx(["QTDE", "QUANTIDADE", "QTD ITENS", "QUANTIDADE ITENS"]) !== -1
    ? getColIdx(["QTDE", "QUANTIDADE", "QTD ITENS", "QUANTIDADE ITENS"])
    : 21;
    
  const idxTotalValue = getColIdx(["VALOR TOTAL LÍQUIDO", "TOTAL LÍQUIDO", "TOTAL LÍQUIDO DO PEDIDO", "VALOR LÍQUIDO", "VALOR TOTAL LÍQUIDO (FINAL)", "FATURADO", "LÍQUIDO", "RECURSOS"]) !== -1
    ? getColIdx(["VALOR TOTAL LÍQUIDO", "TOTAL LÍQUIDO", "TOTAL LÍQUIDO DO PEDIDO", "VALOR LÍQUIDO", "VALOR TOTAL LÍQUIDO (FINAL)", "FATURADO", "LÍQUIDO", "RECURSOS"])
    : -1;

  const formatDateFallback = (str: string) => {
    if (!str || str === "-") return "";
    const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return str;
  };

  const groupedOrders: { [code: string]: any } = {};

  for (let i = startIdx; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    const cols = row.split("\t").map(c => c.trim());
    if (cols.length < 3) continue;

    const code = (cols[idxCode] || "").trim();
    if (!code) continue;

    const customerName = cols[idxCustomerName] || "CLIENTE DESCONHECIDO";
    const customerCode = cols[idxCustomerCode] || "";
    const emissionDateRaw = cols[idxEmissionDate] || "";
    const deliveryDateRaw = cols[idxDeliveryDate] || "";
    const paymentCondition = cols[idxPaymentCond] || "BOLETO";
    const statusOriginalPdf = cols[idxStatusOriginal] || "PEDIDO DE VENDA - PROCESSADO";
    const city = cols[idxCity] || "";
    const uf = cols[idxUf] || "";
    
    // Split date to exclude time format (e.g. 19/05/2026 13:40:29)
    const emissionClean = emissionDateRaw.split(" ")[0];
    const deliveryClean = deliveryDateRaw.split(" ")[0];
    
    const emissionDate = formatDateFallback(emissionClean);
    const deliveryDate = formatDateFallback(deliveryClean);

    const qtyStr = cols[idxQty] || "1";
    const quantity = parseInt(qtyStr.replace(/\D/g, ""), 10) || 1;

    const itemName = city ? `Pedido Importado (${city} - ${uf})` : "Item de Pedido Importado";
    const itemValueStr = idxTotalValue >= 0 && cols[idxTotalValue] ? cols[idxTotalValue] : "0";
    const totalValue = parseFloat(itemValueStr.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
    const unitPrice = quantity > 0 ? totalValue / quantity : totalValue;

    if (!groupedOrders[code]) {
      groupedOrders[code] = {
        orderCode: code,
        customerCode,
        customerName,
        representativeName: idxRepName >= 0 && cols[idxRepName] ? cols[idxRepName] : "Danilo Representante",
        deliveryDate: deliveryDate || new Date().toISOString().split("T")[0],
        emissionDate: emissionDate || new Date().toISOString().split("T")[0],
        paymentCondition,
        paymentTerm: "30/60/90 Dias",
        status: statusOriginalPdf.toUpperCase().includes("FATURADO") ? "FATURADO" : "PENDENTE",
        statusOriginalPdf,
        totalValue: 0,
        totalGrossValue: 0,
        notes: city ? `Cidade: ${city} - ${uf}` : "",
        items: []
      };
    }

    groupedOrders[code].totalValue += totalValue;
    groupedOrders[code].totalGrossValue += totalValue;
    
    groupedOrders[code].items.push({
      itemCode: `SKU-${code}-${groupedOrders[code].items.length + 1}`,
      itemName,
      unit: "UN",
      color: "-",
      size: "-",
      quantity,
      unitPrice,
      totalPrice: totalValue
    });
  }

  return Object.values(groupedOrders);
}

function parseDocumentFormat(text: string, lines: string[]): any[] {
  const orders: any[] = [];
  const textNormalized = text.replace(/\r\n/g, "\n");
  
  // 1. Order Code
  let orderCode = "";
  const codeMatches = [
    /Pedido\s*de\s*Venda\s*[:.-]?\s*(\d{5,8})/i,
    /Pedido\s*[:.-]?\s*(\d{5,8})/i,
    /Orçamento\s*[:.-]?\s*(\d{5,8})/i,
    /Nº\s*Pedido\s*[:.-]?\s*(\d{5,8})/i,
    /Documento\s*[:.-]?\s*(\d{5,8})/i,
    /O\.V\.\s*[:.-]?\s*(\d{5,8})/i,
    /\b(\d{5,6})\b/
  ];
  for (const regex of codeMatches) {
    const match = textNormalized.match(regex);
    if (match && match[1]) {
      orderCode = match[1];
      break;
    }
  }
  if (!orderCode) {
    orderCode = "PED-" + Math.floor(Math.random() * 90000 + 10000);
  }

  // 2. Customer
  let customerName = "";
  let customerCode = "";
  const customerRegexes = [
    /Cliente\s*[:.-]?\s*(?:(\d+)\s*[-]\s*)?([A-Za-zÀ-ÿ\s&.-]+?(?:LTDA|S\/A|S\.A\.|EIRELI|ME|EPP|MEI|MOVEIS|ESTOFADOS|COMERCIO|INDUSTRIA))/i,
    /Razão\s*Social\s*[:.-]?\s*(?:(\d+)\s*[-]\s*)?([A-Za-zÀ-ÿ\s&.-]+?(?:LTDA|S\/A|S\.A\.|EIRELI|ME|EPP|MEI|MOVEIS|ESTOFADOS|COMERCIO|INDUSTRIA))/i,
    /Cliente\s*[:.-]?\s*([^\n]+)/i,
    /Razão\s*Social\s*[:.-]?\s*([^\n]+)/i,
  ];

  for (const regex of customerRegexes) {
    const match = textNormalized.match(regex);
    if (match) {
      if (match[1] && !isNaN(Number(match[1]))) {
        customerCode = match[1].trim();
      }
      customerName = (match[2] || match[1] || "").trim();
      customerName = customerName.replace(/Cliente\s*[:.-]?\s*/gi, "").replace(/Razão\s*Social\s*[:.-]?\s*/gi, "").trim();
      if (customerName) break;
    }
  }

  if (!customerName) {
    for (const l of lines) {
      if (/LTDA|S\/A|S\.A\.|EIRELI|MOVEIS|ESTOFADOS|COMERCIO/i.test(l) && !/representante|vendedor|empresa|transportador/i.test(l)) {
        customerName = l.replace(/^\d+\s*-\s*/, "").replace(/cliente\s*[:.-]?\s*/gi, "").trim();
        break;
      }
    }
  }

  if (!customerName) {
    customerName = "CLIENTE REGULAR (EXTRACTED)";
  }

  // 3. Representative
  let representativeName = "Danilo Representante";
  const repRegexes = [
    /(?:consultor|vendedor|representante|vendedor externo)\s*[:.-]?\s*([A-Za-zÀ-ÿ\s.-]+)/i,
    /Consultor\s*:\s*([^\n]+)/i,
    /Vendedor\s*:\s*([^\n]+)/i
  ];
  for (const regex of repRegexes) {
    const match = textNormalized.match(regex);
    if (match && match[1]) {
      const parsedRep = match[1].trim();
      if (parsedRep.length > 3 && parsedRep.length < 50) {
        representativeName = parsedRep;
        break;
      }
    }
  }
  if (representativeName.toLowerCase().includes("mapefor")) {
    representativeName = "Danilo Representante";
  }

  // 4. Dates
  let emissionDate = "";
  let deliveryDate = "";
  
  const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
  const allDates: string[] = [];
  let dMatch;
  while ((dMatch = datePattern.exec(textNormalized)) !== null) {
    allDates.push(`${dMatch[3]}-${dMatch[2]}-${dMatch[1]}`);
  }
  
  const emissionMatch = textNormalized.match(/(?:emissão|emissao|data emissão|data emissao|venda)\s*[:.-]?\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (emissionMatch && emissionMatch[1]) {
    const [d, m, y] = emissionMatch[1].split("/");
    emissionDate = `${y}-${m}-${d}`;
  } else if (allDates.length > 0) {
    emissionDate = allDates[0];
  } else {
    emissionDate = new Date().toISOString().split("T")[0];
  }

  const deliveryMatch = textNormalized.match(/(?:prom\.ent|promessa entrega|promessa de entrega|previsão|previsao|data entrega|entrega)\s*[:.-]?\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (deliveryMatch && deliveryMatch[1]) {
    const [d, m, y] = deliveryMatch[1].split("/");
    deliveryDate = `${y}-${m}-${d}`;
  } else if (allDates.length > 1) {
    deliveryDate = allDates[1];
  } else {
    deliveryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  }

  // 5. Conditions
  let paymentCondition = "BOLETO";
  const condMatch = textNormalized.match(/(?:situação|forma de pagamento|condição do pagamento|forma|situaçao)\s*[:.-]?\s*([A-Za-zÀ-ÿ\s]+)/i);
  if (condMatch && condMatch[1]) {
    paymentCondition = condMatch[1].trim().toUpperCase();
  }

  let paymentTerm = "30/60/90 Dias";
  const termMatch = textNormalized.match(/(?:prazos|condição de pgto|condição pgto)\s*[:.-]?\s*([^\n]+)/i);
  if (termMatch && termMatch[1]) {
    paymentTerm = termMatch[1].trim();
  }

  let statusOriginalPdf = "PEDIDO DE VENDA - PROCESSADO";
  const statusMatch = textNormalized.match(/(?:situação do documento|status|situação|status do documento)\s*[:.-]?\s*([^\n]+)/i);
  if (statusMatch && statusMatch[1]) {
    statusOriginalPdf = statusMatch[1].trim();
  }

  // 6. Values
  let totalValue = 0;
  const totalValueMatches = [
    /(?:total líquido|total geral|valor total|total líquido do pedido|líquido|total geral do pedido)\s*[:.-]?\s*(?:r\$)?\s*([\d.,]+)/i,
    /TOTAL\s+LÍQUIDO\s+([0-9.,]+)/i,
    /Total\s+Geral\s+([0-9.,]+)/i
  ];
  for (const regex of totalValueMatches) {
    const match = textNormalized.match(regex);
    if (match && match[1]) {
      totalValue = parseFloat(match[1].replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
      break;
    }
  }

  // 7. Items
  const items: any[] = [];
  
  for (const line of lines) {
    const cols = line.split(/\s{2,}|\s*\|\s*|\t/).map(c => c.trim()).filter(c => c.length > 0);
    
    if (cols.length >= 3) {
      let qtyFound = -1;
      let qtyColIdx = -1;
      let priceFound = 0;
      let nameColIdx = -1;
      
      for (let cIdx = 0; cIdx < cols.length; cIdx++) {
        const col = cols[cIdx];
        const parsedInt = parseInt(col, 10);
        if (!isNaN(parsedInt) && /^\d+$/.test(col) && parsedInt > 0 && parsedInt < 25000) {
          qtyFound = parsedInt;
          qtyColIdx = cIdx;
        }
        if (/^[\d.,]+$/.test(col) && (col.includes(",") || col.includes("."))) {
          const val = parseFloat(col.replace(",", "."));
          if (val > 0) {
            priceFound = val;
          }
        }
      }
      
      for (let cIdx = 0; cIdx < cols.length; cIdx++) {
        const col = cols[cIdx];
        if (col.length > 4 && /[A-Za-zÀ-ÿ]/.test(col) && !/cliente|pedido|consultor|vendedor|emissão|entrega|prazos|total|val|geral|desconto|endereço|bairro|cidade|banco/i.test(col)) {
          nameColIdx = cIdx;
          break;
        }
      }
      
      if (qtyFound !== -1 && nameColIdx !== -1) {
        const itemName = cols[nameColIdx];
        const quantity = qtyFound;
        const unitPrice = priceFound || (totalValue / quantity) || 120.00;
        const totalPrice = quantity * unitPrice;
        
        items.push({
          itemCode: `SKU-${orderCode}-${items.length + 1}`,
          itemName,
          unit: "UN",
          color: "-",
          size: "-",
          quantity,
          unitPrice,
          totalPrice
        });
      }
    }
  }

  if (items.length === 0) {
    items.push({
      itemCode: `SKU-${orderCode}-1`,
      itemName: "Item Importado PDF (Verifique)",
      unit: "UN",
      color: "-",
      size: "-",
      quantity: 1,
      unitPrice: totalValue || 250.00,
      totalPrice: totalValue || 250.00
    });
  }

  if (totalValue === 0) {
    totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  orders.push({
    orderCode,
    customerCode,
    customerName,
    representativeName,
    deliveryDate,
    emissionDate,
    paymentCondition,
    paymentTerm,
    status: statusOriginalPdf.toUpperCase().includes("FATURADO") ? "FATURADO" : "PENDENTE",
    statusOriginalPdf,
    totalValue,
    totalGrossValue: totalValue,
    notes: "Importação realizada via Extrator Determinístico de contingência local devido a instabilidade do servidor Gemini.",
    items
  });

  return orders;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const PORT = 3000;

  app.post("/api/agent/pedidos-sem-lote", async (req, res) => {
    try {
      console.log("Manual trigger: /api/agent/pedidos-sem-lote");
      const ai = getGeminiClient();
      const result = await runAgentPedidosSemLote(ai);
      if (result && result.success === false) {
        return res.status(200).json(result);
      }
      res.json(result);
    } catch (e: any) {
      console.error("Error in agent route handler:", e);
      res.status(500).json({
        success: false,
        ok: false,
        code: "AGENT_RUNTIME_FAIL",
        message: "Ocorreu um erro inesperado no backend ao executar a análise do agente.",
        error: e.message,
        details: {
          message: e.message,
          stack: e.stack
        }
      });
    }
  });

  app.post("/api/integration/orders", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.INTEGRATION_TOKEN || "ImpeJomIntegration2026";
      
      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({
          success: false,
          error: "Não autorizado: Token de integração inválido ou ausente."
        });
      }

      const body = req.body;
      const incoming = Array.isArray(body) ? body : [body];

      if (incoming.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Nenhum pedido recebido."
        });
      }

      console.log(`[API Integração] Recebendo ${incoming.length} pedidos para processamento...`);

      const db = getServerDb();
      
      // Carregar produtos (items) para bater nome/código e obter o itemId
      const allDbItems: any[] = [];
      try {
        const itemsSnap = await getDocs(collection(db, "items"));
        itemsSnap.forEach((doc) => {
          allDbItems.push({ id: Number(doc.id) || doc.id, ...doc.data() });
        });
      } catch (err) {
        console.warn("[API Integração] Falha ao carregar itens para batimento:", err);
      }

      // Função auxiliar de batimento do item
      const findItemInDb = (itemName?: string, itemCode?: string) => {
        if (itemCode) {
          const strCode = String(itemCode).trim().toLowerCase();
          const found = allDbItems.find((it) => {
            const dbCode = String(it.code || "").trim().toLowerCase();
            return dbCode === strCode;
          });
          if (found) return Number(found.id);
        }
        if (itemName) {
          const strName = String(itemName).trim().toLowerCase();
          const foundNameExact = allDbItems.find((it) => {
            const dbName = String(it.name || "").trim().toLowerCase();
            return dbName === strName;
          });
          if (foundNameExact) return Number(foundNameExact.id);

          const foundNamePartial = allDbItems.find((it) => {
            const dbName = String(it.name || "").trim().toLowerCase();
            return dbName.includes(strName) || strName.includes(dbName);
          });
          if (foundNamePartial) return Number(foundNamePartial.id);
        }
        return 0; // ID 0 representa produto sob medida / custom
      };

      const results = [];
      let importedCount = 0;

      for (let orderIndex = 0; orderIndex < incoming.length; orderIndex++) {
        const o = incoming[orderIndex];
        const orderCode = String(o.orderCode || `INT-${Date.now()}`).trim().toUpperCase();
        const customerName = String(o.customerName || o.clientName || "IMPÉRIO JOMARCI").trim().toUpperCase();
        const representativeName = String(o.representativeName || "Danilo Representante").trim();
        const deliveryDate = String(o.deliveryDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
        const paymentCondition = String(o.paymentCondition || "BOLETO").trim().toUpperCase();
        const paymentTerms = String(o.paymentTerms || o.paymentTerm || "30 Dias").trim();
        const notes = String(o.notes || "Importado via API Integração").trim();

        const itemsList = Array.isArray(o.items) ? o.items : [];
        if (itemsList.length === 0) {
          console.warn(`[API Integração] Pedido ${orderCode} veio sem itens!`);
          continue;
        }

        // Criar registro para cada item de linha no Firestore (Coleção orders)
        for (let itemIndex = 0; itemIndex < itemsList.length; itemIndex++) {
          const it = itemsList[itemIndex];
          const itemName = String(it.itemName || it.name || "Item Customizado").trim();
          const itemCode = String(it.itemCode || it.code || "").trim();
          const color = String(it.color || "-").trim().toUpperCase();
          const size = String(it.size || "-").trim().toUpperCase();
          const variation = String(it.variation || "-").trim().toUpperCase();
          const quantity = Number(it.quantity) || 1;
          const unitPrice = Number(it.unitPrice || it.price || 0);

          const dbItemId = findItemInDb(itemName, itemCode);

          // Gerar ID numérico único baseado no timestamp mais diferenciais
          const numericId = Date.now() + Math.floor(Math.random() * 10000) + (orderIndex * 100) + itemIndex;

          const orderDocument = {
            id: numericId,
            orderCode: orderCode,
            customerName: customerName,
            representativeName: representativeName,
            representativeId: "representante_danilo", // Padrão Danilo
            deliveryDate: deliveryDate,
            paymentCondition: paymentCondition,
            paymentTerms: paymentTerms,
            notes: notes,
            isActive: true,
            isProgramacao: false,
            isUrgent: false,
            isThirdPartyLaser: false,
            itemId: dbItemId,
            color: color,
            size: size,
            variation: variation,
            totalQuantity: quantity,
            packedQuantity: 0,
            producedQuantity: 0,
            unitPrice: unitPrice,
            status: "AGUARDANDO_APROVACAO", // Aguardando aprovação direta
            statusOriginalPdf: "API_INTEGRATION",
            createdAt: Date.now(),
            customProductName: dbItemId === 0 ? itemName : "",
          };

          // Salvar no Firestore
          await setDoc(doc(db, "orders", numericId.toString()), orderDocument);
          importedCount++;
        }

        results.push({ orderCode, status: "AGUARDANDO_APROVACAO", itemsCount: itemsList.length });
      }

      console.log(`[API Integração] Integração concluída com sucesso! ${importedCount} novos registros salvos.`);
      return res.status(200).json({
        success: true,
        message: `${importedCount} itens de pedido vinculados ao Império Jomarci foram registrados e estão aguardando aprovação.`,
        importedCount,
        results
      });

    } catch (error: any) {
      console.error("[API Integração] Erro no endpoint de recebimento de pedidos:", error);
      return res.status(500).json({
        success: false,
        error: "Erro interno ao salvar os pedidos importados.",
        details: error.message
      });
    }
  });

  app.post(
    "/api/extract-orders-pdf",
    upload.array("files"),
    async (req, res) => {
      let pdfText = "";
      try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
          return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        const files = req.files as Express.Multer.File[];
        
        console.log(`[PDF Extract Orders] Recebidos ${files.length} arquivos.`);

        for (const file of files) {
           try {
             const text = await extractTextFromPdfBuffer(file.buffer);
             pdfText += `\n--- Arquivo: ${file.originalname} ---\n` + text + "\n";
           } catch (parseErr: any) {
             console.error("Erro ao fazer parse do PDF:", parseErr);
             return res.status(400).json({ success: false, error: `O documento PDF '${file.originalname}' não pôde ser lido. Arquivo inválido ou corrompido: ${parseErr.message}` });
           }
        }
        
        if (!pdfText.trim()) {
           return res.status(400).json({ success: false, error: "O texto extraído do PDF está vazio ou o documento é apenas imagem (escaneado). O sistema precisa de PDFs com texto nativo." });
        }

        const promptText = `
Você é um assistente de PCP/Vendas especializado em extração de dados de pedidos de venda e orçamentos em formato PDF.
Interprete o texto bruto abaixo, que pode ser o conteúdo de um ou múltiplos documentos juntos, e extraia todas as informações dos pedidos contidos neles.

Texto extraído:
"""
${pdfText}
"""

Instruções cruciais de Extração e Regras de Negócio:
1. NÚMERO DO PEDIDO: Extraia e guarde em 'orderCode'. Se não houver, gere um padrão com base na data atual ou sequencial.
2. CLIENTE:
   - Extraia o código do cliente (se houver) e guarde em 'customerCode'.
   - Extraia a razão social completa do cliente comprador e guarde em 'customerName'.
3. REPRESENTANTE: O campo "Consultor" ou vendedor no PDF equivale ao representante. Extraia seu nome e guarde em 'representativeName'.
4. SITUAÇÃO / FORMA DE PAGAMENTO: O campo "SITUAÇÃO" ou "situação" ou "Forma de Pagamento" equivale à condição de pagamento do pedido. Mapeie este valor para 'paymentCondition'.
5. PRAZOS DE PAGAMENTO: Extraia do campo "Prazos" ou "Condição de Pgto" de faturamento e guarde em 'paymentTerm'.
6. DATA DE EMISSÃO: Extraia a data de emissão do pedido e guarde em 'emissionDate' no formato YYYY-MM-DD.
7. DATA DE ENTREGA: Analise os campos "Prom.Ent." (Promessa de Entrega) e "Previsão" no PDF. A regra consistente adotada é: prefira a data de "Prom.Ent." por ser uma promessa firme; caso esteja em branco ou inválida, use a data de "Previsão". Preencha 'deliveryDate' no formato YYYY-MM-DD.
8. VALOR TOTAL DO PEDIDO: Use a regra consistente de preferir o "Total Líquido" ou "Total Geral" (valor final descontado que o cliente paga) e guarde em 'totalValue'. Guarde também o "Total Bruto" em 'totalGrossValue'.
9. STATUS DO PEDIDO: Mapeie o status do pedido obtido do texto para uma das seguintes chaves padrão:
   - "AGUARDANDO_APROVACAO" (caso seja orçamento, rascunho ou aguardando aprovação financeira/comercial)
   - "PENDENTE" (pedido firme, aprovado, pronto para faturamento, programado ou pendente de produção)
   - "EM_PRODUCAO" (se indicar explicitamente estar em andamento produtivo ou corte)
   Como padrão geral caso não esteja especificado, utilize "AGUARDANDO_APROVACAO".
10. STATUS ORIGINAL NO PDF: Procure e extraia o campo bruto que indica o status ou situação do documento (frequentemente rotulado como "Status....:", "Status do Documento:", "Situação:", ou similar; exemplos de valores são "DOCUMENTO FATURADO", "DOCUMENTO FATURADO PARCIAL", "PEDIDO DE VENDA - PROCESSADO"). Guarde esse texto original EXATAMENTE como encontrado no campo "statusOriginalPdf".
11. ITENS DO PEDIDO: Para cada item listado no pedido extraia:
   - Código do item / Produto SKU -> 'itemCode'
   - Descrição ou nome do item -> 'itemName'
   - Unidade de medida (ex: UN, PC, M, KG) -> 'unit'
   - Quantidade -> 'quantity'
   - Valor unitário -> 'unitPrice'
   - Valor total do item -> 'totalPrice'
   - Cor (se houver separado) -> 'color'
   - Tamanho (se houver separado) -> 'size'

Retorne obrigatoriamente um array de pedidos de acordo com o esquema JSON especificado abaixo.
`;

        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              // @ts-ignore Type is from GoogleGenAI
              type: Type.ARRAY,
              items: {
                // @ts-ignore
                type: Type.OBJECT,
                properties: {
                  orderCode: {
                    type: Type.STRING,
                    description: "Número do pedido ou orçamento.",
                  },
                  customerCode: {
                    type: Type.STRING,
                    description: "Código do cliente comprador extraído do PDF.",
                  },
                  customerName: {
                    type: Type.STRING,
                    description: "Razão social completa do cliente.",
                  },
                  representativeName: {
                    type: Type.STRING,
                    description: "Nome do consultor ou representante comercial.",
                  },
                  deliveryDate: {
                    type: Type.STRING,
                    description: "Data de entrega do pedido no formato YYYY-MM-DD.",
                  },
                  emissionDate: {
                    type: Type.STRING,
                    description: "Data de emissão do pedido no formato YYYY-MM-DD.",
                  },
                  paymentCondition: {
                    type: Type.STRING,
                    description: "Forma de pagamento ou situação do pedido.",
                  },
                  paymentTerm: {
                    type: Type.STRING,
                    description: "Prazos de pagamento (ex: '30/60/90 Dias').",
                  },
                  status: {
                    type: Type.STRING,
                    description: "Status mapeado do pedido: AGUARDANDO_APROVACAO, PENDENTE, EM_PRODUCAO.",
                  },
                  statusOriginalPdf: {
                    type: Type.STRING,
                    description: "Status ou situacao original do documento extraído do PDF (ex: 'DOCUMENTO FATURADO', 'DOCUMENTO FATURADO PARCIAL', 'PEDIDO DE VENDA - PROCESSADO').",
                  },
                  totalValue: {
                    type: Type.NUMBER,
                    description: "Valor total líquido (final) do pedido.",
                  },
                  totalGrossValue: {
                    type: Type.NUMBER,
                    description: "Valor total bruto do pedido.",
                  },
                  notes: {
                    type: Type.STRING,
                    description: "Observações, observações de frete ou comentários.",
                  },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        itemCode: { type: Type.STRING, description: "Código SKU do item." },
                        itemName: { type: Type.STRING, description: "Descrição do produto ou item." },
                        unit: { type: Type.STRING, description: "Unidade de medida, ex: UN, PC, M." },
                        color: { type: Type.STRING },
                        size: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        unitPrice: { type: Type.NUMBER },
                        totalPrice: { type: Type.NUMBER },
                      },
                      required: ["itemName", "quantity"],
                    },
                  },
                },
                required: ["customerName", "items"],
              },
            },
          },
        });

        let outputJSON;
        try {
          const cleanedText = cleanJsonText(response.text || "[]");
          outputJSON = JSON.parse(cleanedText);
        } catch (jsonErr: any) {
          console.warn("[PDF Extract AI JSON Parse Error] Resposta da IA não pôde ser lida como JSON:", jsonErr.message, "Texto original:", response.text);
          throw new Error("Resposta da IA em formato JSON inválido. Ativando contingência local...");
        }
        return res.json({ success: true, orders: outputJSON });
      } catch (e: any) {
        console.warn("[PDF Extract AI Error] Erro ao usar Gemini API, ativando fallback local determinístico de contingência:", e.message || e);
        try {
          const fallbackOrders = parsePdfTextFallback(pdfText);
          console.log(`[PDF Extract Fallback] Fallback concluído com sucesso. ${fallbackOrders.length} pedidos extraídos.`);
          
          if (fallbackOrders.length === 0) {
             return res.status(400).json({ success: false, error: "O limite de uso da Inteligência Artificial está esgotado e o extrator alternativo local não identificou nenhum pedido interpretável neste layout. Tente copiar e colar os dados via Excel." });
          }

          return res.json({
            success: true,
            orders: fallbackOrders,
            isFallback: true,
            warning: "Nota: A IA está temporariamente indisponível (limite de faturamento Google Cloud). O sistema ativou o extrator local alternativo e conseguiu extrair os dados com sucesso!"
          });
        } catch (fallbackError: any) {
          console.error("[PDF Extract Fallback Critical Error]", fallbackError);
          return res
            .status(500)
            .json({ error: "Falha ao processar PDF por IA e também por contingência local: " + fallbackError.message });
        }
      }
    },
  );

  app.post(
    "/api/extract-billing-pdf",
    upload.array("files"),
    async (req, res) => {
      let pdfText = "";
      try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
          return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        const files = req.files as Express.Multer.File[];
        
        console.log(`[PDF Extract Billing] Recebidos ${files.length} arquivos.`);

        for (const file of files) {
           try {
             const text = await extractTextFromPdfBuffer(file.buffer);
             pdfText += `\n--- Arquivo: ${file.originalname} ---\n` + text + "\n";
           } catch (parseErr: any) {
             console.error("Erro ao fazer parse do PDF:", parseErr);
             return res.status(400).json({ success: false, error: `O documento PDF '${file.originalname}' não pôde ser lido. Arquivo inválido ou corrompido: ${parseErr.message}` });
           }
        }
        
        if (!pdfText.trim()) {
           return res.status(400).json({ success: false, error: "O texto extraído do PDF está vazio ou o documento é apenas imagem (escaneado). O sistema precisa de PDFs com texto nativo." });
        }

        const promptText = `
Você é um assistente de PCP/Vendas especializado em extração de dados de faturamento/notas fiscais em formato PDF.
Interprete o texto bruto abaixo, que conte um ou múltiplos relatórios de faturamento, e extraia os itens que foram faturados.

Texto extraído:
"""
${pdfText}
"""

Instruções cruciais de Extração e Regras de Negócio:
Para cada item / produto faturado encontrado, extraia:
1. 'orderCode' (NÚMERO DO PEDIDO de venda associado a esse faturamento). OBRIGATÓRIO se houver.
2. 'customerName' (Nome / Razão Social do cliente). OBRIGATÓRIO se houver.
3. 'partName' (Código ou Descrição do produto faturado).
4. 'quantity' (Quantidade faturada do produto).
5. 'billingDate' (Data de faturamento em YYYY-MM-DD, se referenciada).

Retorne SOMENTE um OBJETO JSON estritamente dentro do request Schema abaixo. Não retorne mais nada além do JSON:
`;

        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                success: { type: Type.BOOLEAN },
                billedItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      orderCode: { type: Type.STRING },
                      customerName: { type: Type.STRING },
                      partName: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      billingDate: { type: Type.STRING },
                    },
                    required: ["partName", "quantity"]
                  }
                }
              },
              required: ["success", "billedItems"]
            }
          }
        });

        let result;
        try {
          const cleanedText = cleanJsonText(response.text || "{}");
          result = JSON.parse(cleanedText);
        } catch (jsonErr: any) {
          console.warn("[PDF Extract Billing JSON Parse Error] Resposta da IA não pôde ser lida como JSON:", jsonErr.message, "Texto original:", response.text);
          throw new Error("Resposta da IA em formato JSON inválido. Verifique o limite de uso do serviço.");
        }
        
        res.json({
          success: true,
          billedItems: result.billedItems || [],
        });
      } catch (error: any) {
         console.error("[PDF Extract Billing Error]", error);
         return res.status(500).json({ error: "Falha ao processar PDF por IA: " + error.message });
      }
    }
  );

  app.post("/api/send-push", async (req, res) => {
    try {
      const { title, body, fcmTokens } = req.body;

      if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
        return res.status(400).json({ error: "No fcmTokens provided" });
      }

      if (getApps().length === 0) {
        return res
          .status(503)
          .json({ error: "Firebase Admin is not configured on the server." });
      }

      console.log("Enviando push manual para tokens:", fcmTokens.length);

      const message = {
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icon.png',
            vibrate: [200, 100, 200],
            requireInteraction: true
          },
          fcmOptions: {
            link: '/'
          }
        },
        data: {
          click_action: '/'
        },
        tokens: fcmTokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      
      console.log(`Push Multicast concluído. Sucessos: ${response.successCount}, Falhas: ${response.failureCount}`);
      
      // Cleanup de tokens inválidos
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.warn(`Falha na entrega ao token ${fcmTokens[idx]}:`, resp.error);
            if (resp.error?.code === 'messaging/invalid-registration-token' ||
                resp.error?.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(fcmTokens[idx]);
            }
          }
        });
        await cleanupInvalidFcmTokens(tokensToRemove);
      }

      res.json({ success: true, response });
    } catch (e) {
      console.error("Error sending push notification:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/upload-nest", (req, res) => {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res
          .status(400)
          .json({ error: "Erro no upload. Multer: " + err.message });
      }
      console.log("Upload route hit.");
      try {
        console.log("File received:", !!req.file);
        if (!req.file)
          return res.status(400).json({ error: "No file uploaded" });

        const parseFunc =
          typeof pdfParse === "function" ? pdfParse : (pdfParse as any).default;
        const data = await parseFunc(req.file.buffer);
        console.log("PDF parsed successfully, length:", data.text.length);
        const text = data.text;

        const results: any[] = [];
        const blocks = text.split(/Nest Result/i);

        // Basic extraction of items matching dimensions pattern (e.g. 1112,80 x 595,20)
        // Since parsing tables in PDF is messy, use a heuristic:
        // Look for a line containing dimensions and find adjacent text.
        const dimRegex = /([0-9]+,[0-9]+)\s*x\s*([0-9]+,[0-9]+)(mm)?/g;
        const lines = text.split("\n");

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].trim();
          // Identify parts line usually has "123,45 x 67,89" and some quantity
          if (line.match(dimRegex)) {
            // Attempt to extract part name (which might be in preceding lines)
            // and quantity. In this specific PDF layout, we see:
            // count, partName, dimensions, nestCount, etc.
            const sizes = line.match(dimRegex)?.[0] || "";
            // We will look backwards 1-4 lines to find a text that's not a number or size
            let partName = "Part Desconhecida";
            for (let j = 1; j <= 4; j++) {
              if (i - j >= 0) {
                const prevLine = lines[i - j].trim();
                if (
                  prevLine &&
                  isNaN(Number(prevLine)) &&
                  prevLine.length > 3 &&
                  !prevLine.match(dimRegex)
                ) {
                  // Could be part name
                  partName = prevLine.replace(/[\r\n]/g, " ");
                  // Sometimes the name takes 2 lines
                  if (
                    i - j - 1 >= 0 &&
                    lines[i - j - 1].trim().length > 3 &&
                    isNaN(Number(lines[i - j - 1].trim()))
                  ) {
                    partName = lines[i - j - 1].trim() + " " + partName;
                  }
                  break;
                }
              }
            }
            // The quantity is usually found on the same line or next lines
            // we'll default to 1, or try to extract the first standalone number after dimensions
            const afterDim = line
              .substring(line.indexOf(sizes) + sizes.length)
              .trim();
            let qty = 1;
            const qtyMatch = afterDim.match(/^(\d+)/);
            if (qtyMatch) {
              qty = parseInt(qtyMatch[1], 10);
            } else {
              // Look on the next line
              if (i + 1 < lines.length && !isNaN(Number(lines[i + 1].trim()))) {
                qty = parseInt(lines[i + 1].trim(), 10);
              }
            }

            if (sizes.length > 5) {
              results.push({
                partName,
                size: sizes,
                totalQuantity: qty,
              });
            }
          }
        }

        // Filter out duplicate identical hits if any, or "Plates"
        const unique = Array.from(
          new Set(results.map((r) => JSON.stringify(r))),
        )
          .map((s) => JSON.parse(s))
          .filter(
            (r) =>
              !r.partName.includes("Plate Info") &&
              !r.partName.includes("Thumbnail"),
          );

        res.json({ success: true, tasks: unique });
      } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: String(e) });
      }
    }); // close upload callback
  });

  app.post(
    "/api/extract-nesting-ai",
    upload.single("file"),
    async (req, res) => {
      let pdfText = "";
      let isPdfText = false;
      try {
        let filePart: any = null;

        // Check if file uploaded via Multer (PDF or image file)
        if (req.file) {
          let mime = req.file.mimetype || "application/octet-stream";
          if (
            req.file.originalname &&
            req.file.originalname.toLowerCase().endsWith(".pdf")
          ) {
            mime = "application/pdf";
            try {
              console.log("[Nesting Extração] PDF detectado. Tentando extrair texto nativo...");
              const extracted = await extractTextFromPdfBuffer(req.file.buffer);
              if (extracted && extracted.trim()) {
                pdfText = extracted;
                isPdfText = true;
                console.log(`[Nesting Extração] Texto extraído com sucesso (${extracted.length} caracteres). Usando modo texto rápido.`);
              } else {
                console.log("[Nesting Extração] O PDF parece ser escaneado (sem texto nativo). Caindo de volta para análise visual.");
              }
            } catch (err: any) {
              console.warn("[Nesting Extração] Erro ao extrair texto do PDF. Tentando análise visual de contingência...", err);
            }
          } else if (
            req.file.originalname &&
            (req.file.originalname.toLowerCase().endsWith(".png") ||
              req.file.originalname.toLowerCase().endsWith(".jpg") ||
              req.file.originalname.toLowerCase().endsWith(".jpeg") ||
              req.file.originalname.toLowerCase().endsWith(".webp"))
          ) {
            mime = "image/png";
          }

          if (!isPdfText) {
            filePart = {
              inlineData: {
                mimeType: mime,
                data: req.file.buffer.toString("base64"),
              },
            };
          }
        } else if (req.body.pastedImage) {
          // Base64 pasted screenshot
          const pastedStr = req.body.pastedImage; // data:image/png;base64,iVBOR...
          const match = pastedStr.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            filePart = {
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            };
          } else {
            return res
              .status(400)
              .json({ error: "Formato de print colado inválido." });
          }
        }

        if (!filePart && !isPdfText) {
          return res
            .status(400)
            .json({ error: "Nenhum arquivo enviado ou print colado." });
        }

        console.log(
          "[Gemini] Requesting AI layout extraction from nesting plan...",
        );
        const ai = getGeminiClient();

        const promptText = `Você é um leitor especialista em arquivos e planos de nesting de corte a laser (ex: arquivos gerados no SigmaNEST, Lantek, Pronest).
Analise o arquivo ou imagem enviado e extraia a tabela de peças (itens de nesting).
Ignore as chapas inteiras ("Plates", "Chapas", "Sobras de chapa") e extraia apenas as peças ("Parts", "Sub-peças", "Peças cortadas").
Para cada item do nesting, extraia os seguintes atributos obrigatórios:
1. "partName": o nome do item ou código da peça (ex: "FIXADOR PROTEÇÃO", "MESA", "SUPORTE-A1", etc.).
2. "size": dimensões/tamanho da peça se houver (ex: "250 x 300 mm" ou "30,00 x 40,00" ou similar). Se não encontrar, retorne "-".
3. "totalQuantity": quantidade total de peças a ser cortada no plano (retorne como valor numérico inteiro maior que 0).
4. "thumbnailBase64" (Opcional): Uma representação vetorial SVG extremamente simplificada da geometria da peça em formato Data URI (exemplo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" fill="none" stroke="#1e293b" stroke-width="4"/></svg>'). ATENÇÃO: para poupar processamento, diminuir o tempo de resposta e EVITAR TIMEOUTS, use no máximo 1-2 elementos SVG simples (como retângulos, círculos ou caminhos curtos), ou retorne string vazia ("") se a peça for muito complexa ou para economizar tempo.

Retorne os resultados estritamente no formato de array JSON com os pares chave-valor definidos, conforme exemplo:
[
  {
    "partName": "SUPORTE CENTRAL",
    "size": "50,00 x 80,00",
    "totalQuantity": 5,
    "thumbnailBase64": "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect x=\"10\" y=\"10\" width=\"80\" height=\"80\" fill=\"none\" stroke=\"#1e293b\" stroke-width=\"4\"/></svg>"
  }
]
Atenção: Retorne APENAS o JSON puro. Não inclua texto adicional, formatações de markdown ou caracteres estranhos além do array JSON puro.`;

        const parts: any[] = [];
        if (isPdfText) {
          parts.push({ text: `CONTEÚDO DO PLANO DE NESTING (PDF EXTRAÍDO):\n\n${pdfText}` });
        } else {
          parts.push(filePart);
        }
        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: parts,
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  partName: {
                    type: Type.STRING,
                    description: "Nome da peça extraído.",
                  },
                  size: {
                    type: Type.STRING,
                    description: "Dimensões ou tamanho da peça.",
                  },
                  totalQuantity: {
                    type: Type.INTEGER,
                    description: "Quantidade total de peças a cortar.",
                  },
                  thumbnailBase64: {
                    type: Type.STRING,
                    description:
                      "Opcional. String Data URI com SVG simples representando a peça.",
                  },
                },
                required: [
                  "partName",
                  "size",
                  "totalQuantity",
                ],
              },
            },
          },
        });

        let text = response.text || "[]";
        console.log("[Gemini] Parsed output successfully:", text);
        text = text.trim();
        if (text.startsWith("```json")) {
          text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
        } else if (text.startsWith("```")) {
          text = text.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
        }
        text = text.trim();
        const parsedTasks = JSON.parse(text);

        res.json({ success: true, tasks: parsedTasks });
      } catch (e: any) {
        console.error("[Gemini error] Error extracting nesting data:", e);

        // Se tivermos o texto extraído do PDF do Nesting, podemos rodar o extrator heurístico de contingência!
        if (isPdfText && pdfText.trim()) {
          console.log("[Nesting Extração] Ativando contingência local devido a erro ou indisponibilidade da IA...");
          try {
            const results: any[] = [];
            const dimRegex = /([0-9]+,[0-9]+)\s*x\s*([0-9]+,[0-9]+)(mm)?/g;
            const lines = pdfText.split("\n");

            for (let i = 0; i < lines.length; i++) {
              let line = lines[i].trim();
              if (line.match(dimRegex)) {
                const sizes = line.match(dimRegex)?.[0] || "";
                let partName = "Peça Desconhecida";
                for (let j = 1; j <= 4; j++) {
                  if (i - j >= 0) {
                    const prevLine = lines[i - j].trim();
                    if (
                      prevLine &&
                      isNaN(Number(prevLine)) &&
                      prevLine.length > 3 &&
                      !prevLine.match(dimRegex)
                    ) {
                      partName = prevLine.replace(/[\r\n]/g, " ");
                      if (
                        i - j - 1 >= 0 &&
                        lines[i - j - 1].trim().length > 3 &&
                        isNaN(Number(lines[i - j - 1].trim()))
                      ) {
                        partName = lines[i - j - 1].trim() + " " + partName;
                      }
                      break;
                    }
                  }
                }
                const afterDim = line
                  .substring(line.indexOf(sizes) + sizes.length)
                  .trim();
                let qty = 1;
                const qtyMatch = afterDim.match(/^(\d+)/);
                if (qtyMatch) {
                  qty = parseInt(qtyMatch[1], 10);
                } else {
                  if (i + 1 < lines.length && !isNaN(Number(lines[i + 1].trim()))) {
                    qty = parseInt(lines[i + 1].trim(), 10);
                  }
                }

                if (sizes.length > 5) {
                  results.push({
                    partName,
                    size: sizes,
                    totalQuantity: qty,
                  });
                }
              }
            }

            const unique = Array.from(
              new Set(results.map((r) => JSON.stringify(r))),
            )
              .map((s) => JSON.parse(s))
              .filter(
                (r: any) =>
                  !r.partName.includes("Plate Info") &&
                  !r.partName.includes("Thumbnail") &&
                  !r.partName.toLowerCase().includes("chapa") &&
                  !r.partName.toLowerCase().includes("plate"),
              );

            if (unique.length > 0) {
              console.log(`[Nesting Extração Contingência] Sucesso local! Extraídas ${unique.length} tarefas de nesting.`);
              return res.json({
                success: true,
                tasks: unique,
                isFallback: true,
                warning: "Nota: O limite da Inteligência Artificial foi atingido ou o servidor demorou para responder. O sistema ativou o extrator local alternativo e conseguiu recuperar as tarefas de nesting com sucesso!"
              });
            }
          } catch (fallbackErr: any) {
            console.error("[Nesting Extração Contingência] Falha crítica na contingência local:", fallbackErr);
          }
        }

        res
          .status(500)
          .json({ error: "Erro na IA ao decodificar Nesting: " + e.message });
      }
    },
  );

  app.post(["/api/ai-search-production", "/api/gemini"], async (req, res) => {
    try {
      const { prompt, currentDate, orders } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "O prompt é obrigatório." });
      }

      console.log(
        `[AI Search] Processando pergunta da produção: "${prompt}" com data de hoje: ${currentDate}`,
      );
      const ai = getGeminiClient();

      const userMessage = `Data de hoje (currentDate): ${currentDate}
Pergunta do Usuário: "${prompt}"

Lista de Pedidos Atuais em JSON:
${JSON.stringify(orders)}`;

      const systemInstruction = `Você é um assistente especialista de planejamento e controle de produção (PCP) industrial.
O usuário (trabalhador da Produção) fará perguntas em linguagem natural sobre o que precisa ser entregue ou produzido.
Você receberá a data atual de hoje e uma lista de pedidos cadastrados com detalhes de itens, vencimentos, quantidades totais, quantidades já produzidas e clientes.

Sua tarefa é analisar rigorosamente a pergunta do usuário e os dados de pedidos, filtrar de acordo com as datas e termos pesquisados, fazer os cálculos e responder de forma consolidada e precisa.
Regras de cálculo:
- "Pendente para produzir" = (totalQuantity - producedQuantity).
- "Data de entrega hoje ou vencido": se deliveryDate for anterior ou igual a currentDate.
- "Esta semana": identifique os pedidos onde deliveryDate está na mesma semana de currentDate. Sabendo que o currentDate é no formato YYYY-MM-DD, some ou subtraia os dias correspondentes para definir de segunda-feira a domingo.
- "Até o dia X": se o usuário diz por exemplo "até o dia 30", ele quer dizer de hoje até dia 30 do mês de currentDate (ou o mês implícito da pergunta, ex: maio de 2026).
- Use correspondência aproximada/semântica para nomes de itens (ex: "rodas glider de 55" pode corresponder a itens com nome contendo "Glider" e "55").

Retorne um JSON contendo:
- "answer": Explicação detalhada em Markdown em português do Brasil indicando o que produzir, quanto falta, qual cliente e prazos de entrega.
- "matchedOrderIds": lista de IDs (campo 'id') de pedidos de entrada que foram somados/selecionados para responder a esta pergunta.

Não invente IDs de pedido. Retorne somente IDs que estejam presentes na lista enviada. Indique apenas aqueles cujo status não seja FATURADO ou EMBALADO se estiverem perguntando sobre o que produzir (pois estes já estão prontos), a menos que o usuário pergunte explicitamente o histórico geral.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: {
                type: Type.STRING,
                description:
                  "Resposta clara em formato Markdown brasileiro com as informações somadas, clientes e vencimentos.",
              },
              matchedOrderIds: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description:
                  "Array de IDs numéricos de pedidos correspondentes aos critérios da pesquisa natural.",
              },
            },
            required: ["answer", "matchedOrderIds"],
          },
        },
      });

      const textOutput = response.text || "{}";
      console.log("[AI Search] Resultado gerado pelo Gemini:", textOutput);
      const parsed = JSON.parse(textOutput);
      res.json({ success: true, ...parsed });
    } catch (e: any) {
      console.error("[AI Search error]", e);
      res
        .status(500)
        .json({
          error: "Erro na IA ao buscar dados de produção: " + e.message,
        });
    }
  });

  app.post("/api/ai-assistant-action", async (req, res) => {
    try {
      const { prompt, items, customers, sectors, productFlows } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "O prompt é obrigatório." });
      }

      console.log(`[AI Assistant] Executing action for prompt: "${prompt}"`);
      const ai = getGeminiClient();

      const userMessage = `Prompt do Usuário: "${prompt}"

Dados Atuais do Sistema:
- Itens (${items?.length || 0}): ${JSON.stringify(items || [])}
- Clientes (${customers?.length || 0}): ${JSON.stringify(customers || [])}
- Setores (${sectors?.length || 0}): ${JSON.stringify(sectors || [])}
- Fluxos de Produto (${productFlows?.length || 0}): ${JSON.stringify(productFlows || [])}
`;

      const systemInstruction = `Você é um assistente virtual integrado a um sistema ERP/PCP industrial.
O usuário pedirá para você executar ações diretas no sistema, como atualizar cadastros, alterar preços, limpar descrições, deletar registros, etc.
Você receberá os dados atuais do sistema em formato JSON.
Sua tarefa é interpretar a solicitação e determinar quais ações de banco de dados devem ser executadas no lado do cliente.

Você deve retornar estritamente um JSON com a lista de ações que devem ser executadas. As ações suportadas são:
- "UPDATE_ITEM": payload exige "id" e os campos a alterar (code, name, basePrice, productionPoints, notes).
- "DELETE_ITEM": payload exige "id".
- "UPDATE_CUSTOMER": payload exige "id" e os campos a alterar.
- "DELETE_CUSTOMER": payload exige "id".

Se a instrução for para alterar algo ("retirando do código tudo que estiver depois do ponto", etc.), você faz a lógica internamente e retorna todas as ações "UPDATE_ITEM" necessárias, uma para cada item modificado. Aplique suas habilidades de programação internamente antes de gerar o payload de resposta.
Não retorne itens que não sofrerão alterações. Modifique apenas o que foi solicitado.
Além das ações, retorne uma mensagem de "feedback" para ser exibida ao usuário (em pt-BR, confirmando o que foi feito).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              feedback: {
                type: Type.STRING,
                description:
                  "Mensagem amigável de confirmação sobre o que foi executado.",
              },
              actions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description:
                        "Tipo da ação (ex: UPDATE_ITEM, DELETE_ITEM)",
                    },
                    payload: {
                      type: Type.OBJECT,
                      description:
                        "Dados da ação. Deve incluir o 'id' do registro e os campos modificados.",
                    },
                  },
                  required: ["type", "payload"],
                },
              },
            },
            required: ["feedback", "actions"],
          },
        },
      });

      const textOutput = response.text || "{}";
      console.log(
        "[AI Assistant] Resultado:",
        textOutput.substring(0, 300) + "...",
      );
      const parsed = JSON.parse(textOutput);
      res.json({ success: true, ...parsed });
    } catch (e: any) {
      console.error("[AI Assistant error]", e);
      res.status(500).json({ error: "Erro no Assistente IA: " + e.message });
    }
  });

  app.post("/api/ai-summarize-bottlenecks", async (req, res) => {
    try {
      const { logs } = req.body;
      if (!logs || !Array.isArray(logs)) {
        return res.status(400).json({ error: "Logs array is required." });
      }

      console.log(
        `[AI Bottlenecks] Processando análise de gargalos para ${logs.length} logs...`,
      );
      const ai = getGeminiClient();

      const promptText = `
Atue como um Analista de Produção Sênior. Abaixo estão os logs de produção (apontamentos) das últimas 24 horas da fábrica:
${JSON.stringify(logs, null, 2)}

Sua tarefa é analisar esses logs e fornecer um resumo conciso dos principais **gargalos produtivos por setor**. 
- Identifique setores com tempos anormais.
- Identifique os setores que mais produziram ou menos produziram (dados disponíveis nos logs).
- Destaque áreas que necessitam de atenção imediata ou estão represando peças.
- Responda em Português (Brasil).
- Formate a resposta usando Markdown limpo com marcadores e textos curtos. Não crie um texto muito extenso. Foque direto no resultado.

Responda em formato JSON contendo apenas o campo "summary" com a string formatada em Markdown:
{
  "summary": "### Gargalos...\\n- **Setor X**: ..."
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  "Resumo explicativo e conciso formatado em Markdown.",
              },
            },
            required: ["summary"],
          },
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json({ success: true, summary: parsed.summary });
    } catch (e: any) {
      console.error("[AI Bottlenecks error]", e);
      res
        .status(500)
        .json({
          error: "Erro na IA ao gerar resumo de gargalos: " + e.message,
        });
    }
  });

  app.post("/api/ai-suggest-routes", async (req, res) => {
    try {
      const { orders } = req.body;
      if (!orders || !Array.isArray(orders)) {
        return res
          .status(400)
          .json({
            error: "O campo 'orders' é obrigatório e em formato de array.",
          });
      }

      console.log(
        `[AI Routing] Analisando ${orders.length} pedidos embalados para roteirização...`,
      );

      // Fallback deterministic helper in case Gemini fails or is not configured
      const runLocalDeterministicRouting = () => {
        const MONDAY_CITIES = [
          "visconde de rio branco",
          "visconde do rio branco",
          "sao geraldo",
          "são geraldo",
          "astolfo dutra",
          "guiricema",
        ];
        const FRIDAY_CITIES = ["rodeiro", "diamante"];

        const charges: any[] = [];
        const mondayOrders: any[] = [];
        const fridayOrders: any[] = [];
        const ubaOrders: any[] = [];
        const otherOrders: any[] = [];

        orders.forEach((o: any) => {
          const address = (
            (o.customerAddress || o.address || "") +
            " " +
            (o.customerName || "")
          ).toLowerCase();

          let hasMatchedMonday = MONDAY_CITIES.some((city) =>
            address.includes(city),
          );
          let hasMatchedFriday = FRIDAY_CITIES.some((city) =>
            address.includes(city),
          );
          let isUba = address.includes("uba") || address.includes("ubá");

          if (hasMatchedMonday) {
            mondayOrders.push(o);
          } else if (hasMatchedFriday) {
            fridayOrders.push(o);
          } else if (isUba) {
            ubaOrders.push(o);
          } else {
            otherOrders.push(o);
          }
        });

        if (mondayOrders.length > 0) {
          charges.push({
            id: `carga_local_segunda_${Date.now()}`,
            name: "Carga Região Norte-Leste (Segunda-feira)",
            dayOfWeek: "Segunda-feira",
            orderIds: mondayOrders.map((o) => o.id),
            route: [
              "Ubá",
              "Visconde de Rio Branco",
              "São Geraldo",
              "Guiricema",
              "Astolfo Dutra",
            ].filter(
              (c) =>
                c === "Ubá" ||
                mondayOrders.some((mo) => {
                  const addr = (
                    (mo.customerAddress ||
                      mo.address ||
                      mo.customerName ||
                      "") +
                    " " +
                    (mo.customerName || "")
                  ).toLowerCase();
                  return (
                    addr.includes(c.toLowerCase()) ||
                    (c === "Visconde de Rio Branco" &&
                      addr.includes("visconde do rio branco"))
                  );
                }),
            ),
            status: "PLANEJADA",
            explanation:
              "Roteiro planejado prioritariamente para Segunda-feira, agrupando cidades do eixo norte-leste (Visconde de Rio Branco, São Geraldo, Guiricema, Astolfo Dutra).",
          });
        }

        if (fridayOrders.length > 0) {
          charges.push({
            id: `carga_local_sexta_${Date.now()}`,
            name: "Carga Sul / Rodeiro e Diamante (Sexta-feira)",
            dayOfWeek: "Sexta-feira",
            orderIds: fridayOrders.map((o) => o.id),
            route: ["Ubá", "Rodeiro", "Diamante"].filter(
              (c) =>
                c === "Ubá" ||
                fridayOrders.some((fo) => {
                  const addr = (
                    (fo.customerAddress ||
                      fo.address ||
                      fo.customerName ||
                      "") +
                    " " +
                    (fo.customerName || "")
                  ).toLowerCase();
                  return addr.includes(c.toLowerCase());
                }),
            ),
            status: "PLANEJADA",
            explanation:
              "Roteiro otimizado para Sexta-feira abrangendo cidades do eixo sul (Rodeiro, Diamante).",
          });
        }

        if (ubaOrders.length > 0) {
          charges.push({
            id: `carga_local_uba_${Date.now()}`,
            name: "Carga Metropolitana Ubá (Quarta-feira)",
            dayOfWeek: "Quarta-feira",
            orderIds: ubaOrders.map((o) => o.id),
            route: ["Ubá"],
            status: "PLANEJADA",
            explanation:
              "Entregas locais em Ubá agendadas no meio de semana (Quarta-feira) para eficiência operacional.",
          });
        }

        if (otherOrders.length > 0) {
          charges.push({
            id: `carga_local_outras_${Date.now()}`,
            name: "Carga Regional / Outras cidades (Terça-feira)",
            dayOfWeek: "Terça-feira",
            orderIds: otherOrders.map((o) => o.id),
            route: [
              "Ubá",
              ...new Set(
                otherOrders.map((o) => {
                  const addr = o.customerAddress || o.address || "";
                  const match = addr.split("-")[0].trim();
                  return match || "Outra Cidade";
                }),
              ),
            ],
            status: "PLANEJADA",
            explanation:
              "Entregas regionais distribuídas no dia de menor demanda da frota (Terça-feira).",
          });
        }

        return charges;
      };

      // Try Gemini if key is configured
      try {
        const ai = getGeminiClient();
        console.log("[AI Routing] Calling Gemini...");

        const promptText = `
Você é um planejador de logística inteligente especializado no polo moveleiro de Ubá e Zona da Mata de Minas Gerais.
Análise os seguintes pedidos com status 'EMBALADO':
${JSON.stringify(orders, null, 2)}

Sua tarefa é sugerir a formação de cargas agrupadas de forma organizada.
Classifique os pedidos em cargas por estradas que façam sentido rodoviário mútuo e decida o melhor dia da semana (Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira) para cada carga, respeitando rigidamente as seguintes preferências operacionais:
1. Segunda-feira: Cidades de Visconde de Rio Branco, São Geraldo, Astolfo Dutra e Guiricema têm preferência absoluta para entrega neste dia.
2. Sexta-feira: Rodeiro, Diamante e cidades dessa região têm preferência de entrega neste dia.
3. Ubá: entregas em Ubá podem ocorrer em qualquer dia da semana (Terça, Quarta ou Quinta são ideais por padrão, mas Ubá não tem restrição e pode acontecer em qualquer dia do fluxo). 
4. Outros dias (Terça, Quarta, Quinta, Sábado) de preferência servem para as demais localidades (como Guidoval, Tocantins, Cataguases, Leopoldina, etc.) ou excedente de Ubá.

Para cada carga sugerida, preencha:
- "name": Um nome descritivo para a rota (ex: "Rota VRB e Adjacências (Segunda-feira)", "Rota Sul - Rodeiro (Sexta-feira)", "Rota Local Ubá (Quinta-feira)").
- "dayOfWeek": O dia da semana ideal atribuído.
- "orderIds": O array de IDs numéricos que pertencem a essa carga.
- "route": Lista de cidades por ordem lógica na rota de entrega, ex: ["Ubá", "Visconde de Rio Branco", "São Geraldo"].
- "explanation": Breve explicação de 1-2 linhas sobre a atribuição logística com base nas regras de cidades e dias da preferência.

Retorne estritamente um array de objetos JSON que obedeça o formato do responseSchema. Não adicione texto extra fora do JSON.
`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dayOfWeek: { type: Type.STRING },
                  orderIds: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                  },
                  route: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  explanation: { type: Type.STRING },
                },
                required: [
                  "name",
                  "dayOfWeek",
                  "orderIds",
                  "route",
                  "explanation",
                ],
              },
            },
          },
        });

        const output = response.text || "[]";
        console.log("[AI Routing] Raw output:", output);
        const charges = JSON.parse(output);

        const formattedCargas = charges.map((c: any, i: number) => ({
          id: `carga_sugerida_${Date.now()}_${i}`,
          status: "PLANEJADA",
          ...c,
        }));

        return res.json({
          success: true,
          cargas: formattedCargas,
          source: "gemini",
        });
      } catch (geminiError: any) {
        console.warn(
          "[AI Routing] Falha ao usar Gemini API (usando fallback local determinístico):",
          geminiError.message || geminiError,
        );
        const fallbackLoads = runLocalDeterministicRouting();
        return res.json({
          success: true,
          cargas: fallbackLoads,
          source: "local_rules",
        });
      }
    } catch (error: any) {
      console.error("[AI Routing Critical error]", error);
      res
        .status(500)
        .json({ error: "Erro crítico de formação de carga: " + error.message });
    }
  });

  // Vite middleware for development
  app.post("/api/extract-catalog-page", upload.single("page_image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided." });
      }
      const fileParts = [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype,
            },
          },
        ];

        const promptText = `
Você é um assistente de extração de catálogos de produtos. O usuário forneceu uma página de um catálogo em formato de imagem.
Sua tarefa é identificar todos os produtos apresentados nesta página.
Para cada produto, extraia:
- 'code': O código do produto (SKU/referência).
- 'name': O nome ou descrição do produto.
- 'box2d': As coordenadas da caixa delimitadora APENAS DA IMAGEM/FOTO espacial do produto correspondente.
 O formato deve ser um array com 4 números inteiros entre 0 e 1000 na seguinte ordem: [ymin, xmin, ymax, xmax].
 0,0 é o canto superior esquerdo e 1000,1000 é o canto inferior direito.
 Exemplo de box2d: [120, 300, 250, 450].
 Se o produto não possuir imagem/foto ilustrativa na página, omita este campo ou retorne nulo.

Atenção: A caixa delimitadora (box2d) deve englobar RIGOROSAMENTE apenas a foto ilustrativa do produto, e NÃO o texto da descrição ou o código. Isso é importante para que o sistema possa recortar a foto perfeitamente.

Retorne obrigatoriamente um array de produtos no formato JSON.
`;

        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [...fileParts, promptText],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              // @ts-ignore
              type: Type.ARRAY,
              items: {
                // @ts-ignore
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: "Código do produto." },
                  name: { type: Type.STRING, description: "Nome/descrição do produto." },
                  box2d: {
                    // @ts-ignore
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "Bounding box da imagem do produto: [ymin, xmin, ymax, xmax] em escala de 0 a 1000.",
                  },
                },
              },
            },
            temperature: 0.2,
          },
        });

        const textResponse = response.text;
        const products = JSON.parse(textResponse);
        res.json({ products });
      } catch (error: any) {
        console.error("Erro na extração de catálogo:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  let mailTransporter: any = null;

  function getMailTransporter() {
    if (!mailTransporter) {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        throw new Error("Credenciais SMTP não configuradas. Acesse o menu Settings (Settings -> Environment Variables) e configure SMTP_HOST, SMTP_USER e SMTP_PASS para ativar o envio real de e-mails.");
      }

      mailTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
    return mailTransporter;
  }

  app.post("/api/send-invoice-email", express.json(), async (req, res) => {
    try {
      const { orderCode, customerName, deliveryDate, itemsText, totalValue, recipientEmail } = req.body;
      
      const transporter = getMailTransporter();
      
      const mailContentHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #000; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
            <h2 style="color: #00b14f; margin: 0; font-size: 24px; letter-spacing: 2px;">IMPÉRIO</h2>
            <span style="color: #888; font-size: 10px; text-transform: uppercase;">Acessórios para Móveis</span>
          </div>
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Prezado Cliente,</p>
            <p>Gostaríamos de informar que os itens do pedido <strong>#${orderCode}</strong> foram faturados com sucesso!</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 8px; font-weight: bold; width: 35%; border-bottom: 1px solid #eee;">Nº do Pedido:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">#${orderCode}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Cliente:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${customerName}</td>
              </tr>
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Previsão de Entrega:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${deliveryDate || "-"}</td>
              </tr>
              ${totalValue ? `
              <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Valor Total:</td>
                <td style="padding: 8px; color: #2e7d32; font-weight: bold; border-bottom: 1px solid #eee;">R$ ${Number(totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              ` : ""}
            </table>

            <div style="margin-top: 20px; background-color: #f5f5f5; padding: 15px; border-radius: 4px; border-left: 4px solid #00b14f;">
              <strong style="display: block; margin-bottom: 8px; font-size: 14px; color: #333;">Resumo dos Itens:</strong>
              <p style="white-space: pre-wrap; margin: 0; font-size: 13px; color: #555; font-family: monospace;">${itemsText || "Itens faturados indicados no sistema."}</p>
            </div>
            
            <p style="margin-top: 25px; font-size: 11px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
              Este é um comunicado automático de faturamento da Império Acessórios para Móveis. Por favor, não responda a este e-mail.
            </p>
          </div>
        </div>
      `;

      const fromEmail = "gerencia.imperiojomarci@gmail.com";
      const ccEmail = "imperiojomarci@gmail.com";
      
      const toEmails = [fromEmail];
      if (recipientEmail && recipientEmail.trim() !== "") {
        toEmails.push(recipientEmail);
      }

      const mailOptions = {
        from: `"Império Faturamento" <${fromEmail}>`,
        to: toEmails.join(", "),
        cc: ccEmail,
        subject: `[Faturamento] Pedido #${orderCode} - ${customerName}`,
        html: mailContentHtml,
      };

      if (transporter) {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully via SMTP:", info.messageId);
        return res.json({ success: true, mode: "smtp", messageId: info.messageId });
      } else {
        console.log("SIMULATED EMAIL LOG:");
        console.log("FROM:", mailOptions.from);
        console.log("TO:", mailOptions.to);
        console.log("CC:", mailOptions.cc);
        console.log("SUBJECT:", mailOptions.subject);
        return res.json({ 
          success: true, 
          mode: "simulated", 
          message: "Email logado com sucesso no terminal (Defina SMTP_HOST, SMTP_USER, SMTP_PASS em .env para envio real)" 
        });
      }
    } catch (error: any) {
      console.error("Error in /api/send-invoice-email:", error);
      return res.status(500).json({ success: false, error: error?.message || String(error) });
    }
  });

  app.post("/api/send-order-print-email", express.json(), async (req, res) => {
    try {
      const { 
        orderCode, 
        customerName, 
        representativeName, 
        createdAt, 
        deliveryDate, 
        status, 
        productDescription, 
        color, 
        size, 
        variation, 
        totalQuantity, 
        logsText, 
        recipientEmail,
        items
      } = req.body;
      
      const transporter = getMailTransporter();
      
      const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString("pt-BR") : "-";
      const formattedDelivery = deliveryDate ? deliveryDate.split("-").reverse().join("/") : "-";
      
      const resolvedItems = Array.isArray(items) && items.length > 0 
        ? items 
        : [{
            productDescription: productDescription || "Peça de Metal Imperial",
            color: color || "-",
            size: size || "-",
            variation: variation || "-",
            totalQuantity: totalQuantity || 0
          }];

      const mailContentHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <!-- Brand Header (Matched to faturamento's dark style) -->
          <div style="background-color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h2 style="color: #00b14f; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px;">IMPÉRIO</h2>
            <span style="color: #888; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Acessórios para Móveis</span>
          </div>
          
          <div style="padding: 24px;">
            <p style="font-size: 15px; margin-top: 0;">Prezado Cliente,</p>
            <p style="font-size: 14px; color: #475569;">
              Segue a cópia demonstrativa e espelho do seu pedido <strong>#${orderCode}</strong> processado no controle da <strong>Império Acessórios para Móveis</strong>.
            </p>
            
            <!-- Information Block -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-top: 20px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                Identificação do Pedido
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569; width: 40%;">Nº do Pedido:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: bold;">#${orderCode}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Cliente:</td>
                  <td style="padding: 4px 0; color: #0f172a;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Representante:</td>
                  <td style="padding: 4px 0; color: #0f172a;">${representativeName || "Venda Direta"}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Criado em:</td>
                  <td style="padding: 4px 0; color: #0f172a;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Previsão de Entrega:</td>
                  <td style="padding: 4px 0; color: #ef4444; font-weight: bold;">${formattedDelivery}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Status Geral:</td>
                  <td style="padding: 4px 0;">
                    <span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; text-transform: uppercase;">
                      ${status || "PENDENTE"}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Products Table Block -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                Produtos Contratados
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left; font-size: 10px; color: #475569; text-transform: uppercase;">
                    <th style="padding: 8px; border-bottom: 2px solid #cbd5e1;">Especificação do Item</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #cbd5e1; width: 100px;">Meta do Lote</th>
                  </tr>
                </thead>
                <tbody>
                  ${resolvedItems.map((it: any, idx: number) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                      <td style="padding: 10px 8px;">
                        <span style="font-weight: bold; color: #0f172a; display: block; font-size: 14px;">${it.productDescription}</span>
                        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                          <strong>Cor:</strong> ${it.color || "-"} &nbsp;|&nbsp;
                          <strong>Tamanho:</strong> ${it.size || "-"} &nbsp;|&nbsp;
                          <strong>Variação:</strong> ${it.variation || "-"}
                        </div>
                      </td>
                      <td style="padding: 10px 8px; text-align: center; font-weight: bold; font-family: monospace; color: #166534; font-size: 14px; background-color: #f0fdf4;">
                        ${it.totalQuantity} un.
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <!-- Log timeline tracking -->
            ${logsText ? `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                Histórico de Operações & Rastreabilidade
              </h4>
              <p style="white-space: pre-wrap; margin: 0; font-size: 12px; color: #475569; font-family: monospace; line-height: 1.5;">${logsText}</p>
            </div>
            ` : ""}
            
            <p style="margin-top: 25px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
              Este é o espelho oficial e cópia digitalizada do pedido gerado pela Império. Por favor, guarde para controle de expedição.
            </p>
          </div>
        </div>
      `;

      const fromEmail = "gerencia.imperiojomarci@gmail.com";
      const ccEmail = "imperiojomarci@gmail.com";
      
      const toEmails = [fromEmail];
      if (recipientEmail && recipientEmail.trim() !== "") {
        toEmails.push(recipientEmail);
      }

      const mailOptions = {
        from: `"Império PCP & Produção" <${fromEmail}>`,
        to: toEmails.join(", "),
        cc: ccEmail,
        subject: `[PCP] Espelho do Pedido #${orderCode} - ${customerName}`,
        html: mailContentHtml,
      };

      if (transporter) {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email print sent successfully via SMTP:", info.messageId);
        return res.json({ success: true, mode: "smtp", messageId: info.messageId });
      } else {
        console.log("SIMULATED ORDER PRINT EMAIL LOG:");
        console.log("FROM:", mailOptions.from);
        console.log("TO:", mailOptions.to);
        console.log("CC:", mailOptions.cc);
        console.log("SUBJECT:", mailOptions.subject);
        return res.json({ 
          success: true, 
          mode: "simulated", 
          message: "Print do pedido logado com sucesso no terminal (Defina SMTP_HOST, SMTP_USER, SMTP_PASS para envio real)" 
        });
      }
    } catch (error: any) {
      console.error("Error in /api/send-order-print-email:", error);
      return res.status(500).json({ success: false, error: error?.message || String(error) });
    }
  });

  app.post("/api/send-daily-production-email", express.json({limit: '10mb'}), async (req, res) => {
    try {
      const { selectedDate, selectedEndDate, reportData, reportEmails } = req.body;
      
      const transporter = getMailTransporter();
      
      const dateText = selectedDate === selectedEndDate 
        ? new Date(selectedDate).toLocaleDateString('pt-BR')
        : `${new Date(selectedDate).toLocaleDateString('pt-BR')} até ${new Date(selectedEndDate).toLocaleDateString('pt-BR')}`;
      
      const mailContentHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 800px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #0f172a; padding: 15px; text-align: center; border-radius: 6px 6px 0 0;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 24px; letter-spacing: 2px;">IMPÉRIO</h2>
            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase;">Relatório de Produção</span>
          </div>
          
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Olá,</p>
            <p>Segue o <strong>Relatório Diário de Produção</strong> referente ao período: <strong>${dateText}</strong>.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; border: 1px solid #e2e8f0;">
              <thead>
                <tr style="background-color: #f1f5f9; text-align: left; text-transform: uppercase; color: #475569;">
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1;">Data</th>
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1;">Turno</th>
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1;">Setor</th>
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1;">Item</th>
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1;">Lote / OP</th>
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1; text-align: right;">Tempo (h)</th>
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1; text-align: right;">Qtd</th>
                  <th style="padding: 10px 8px; border-bottom: 2px solid #cbd5e1; text-align: right; color: #4338ca;">Produtividade</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.map((row: any, idx: number) => `
                  <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                    <td style="padding: 8px;">${new Date(row.timestamp).toLocaleDateString('pt-BR')}</td>
                    <td style="padding: 8px;">${row.shift}</td>
                    <td style="padding: 8px; font-weight: bold;">${row.sector}</td>
                    <td style="padding: 8px;">${row.itemName}</td>
                    <td style="padding: 8px; font-family: monospace; color: #64748b;">${row.loteRef}</td>
                    <td style="padding: 8px; text-align: right;">${Number(row.hours).toFixed(2)}h</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold;">${row.qty} un</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold; color: #4338ca;">${Number(row.pph).toFixed(1)} Pç/h</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            
            ${reportData.length === 0 ? '<p style="text-align: center; color: #64748b; padding: 20px;">Nenhuma produção registrada neste período com os filtros atuais.</p>' : ''}
            
            <p style="margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
              Este é um e-mail automático gerado pelo sistema de PCP da Império.
            </p>
          </div>
        </div>
      `;

      const fromEmail = "gerencia.imperiojomarci@gmail.com";
      const toEmails = [fromEmail];
      if (reportEmails && reportEmails.trim() !== "") {
        const emails = reportEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e !== "");
        toEmails.push(...emails);
      }

      const mailOptions = {
        from: `"Império PCP & Produção" <${fromEmail}>`,
        to: toEmails.join(", "),
        subject: `[PCP] Relatório Diário de Produção - ${dateText}`,
        html: mailContentHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Production report email sent successfully via SMTP:", info.messageId);
      return res.json({ success: true, mode: "smtp", messageId: info.messageId });
    } catch (error: any) {
      console.error("Error in /api/send-daily-production-email:", error);
      return res.status(500).json({ success: false, error: error?.message || String(error) });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // For Production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api/")) {
      console.error("Global API Error:", err);
      res.status(err.status || 500).json({ success: false, error: err.message || "Erro interno do servidor" });
    } else {
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
