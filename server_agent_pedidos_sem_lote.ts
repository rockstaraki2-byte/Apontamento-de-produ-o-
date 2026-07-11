import { getServerDb, collection, getDocs, doc, setDoc, getDoc, query, where } from "./server_firebase";
import { GoogleGenAI, Type } from "@google/genai";
import config from "./firebase-applet-config.json";

function handleDatabaseError(err: any, collectionName: string, projectId: string, databaseId: string) {
  const errMsg = err.message || String(err);
  const isPermission = errMsg.includes("PERMISSION_DENIED") || err.code === 7 || err.code === "permission-denied";
  const isNotFound = errMsg.includes("NOT_FOUND") || err.code === 5 || errMsg.includes("database") || errMsg.includes("not found");

  if (isPermission) {
    return {
      success: false,
      ok: false,
      code: "FIRESTORE_PERMISSION_DENIED",
      message: `O backend encontrou o banco, mas não possui permissão para ler a coleção '${collectionName}'.`,
      details: {
        projectId,
        databaseId,
        collection: collectionName,
        error: errMsg
      }
    };
  } else if (isNotFound) {
    return {
      success: false,
      ok: false,
      code: "FIRESTORE_COLLECTION_OR_DATABASE_NOT_FOUND",
      message: `Não foi possível localizar a coleção '${collectionName}' no banco '${databaseId}'. Verifique se o banco de dados e a coleção foram provisionados corretamente.`,
      details: {
        projectId,
        databaseId,
        collection: collectionName,
        error: errMsg
      }
    };
  } else {
    return {
      success: false,
      ok: false,
      code: "AGENT_INTERNAL_ERROR",
      message: `Falha inesperada ao ler a coleção '${collectionName}' no Firestore.`,
      details: {
        projectId,
        databaseId,
        collection: collectionName,
        error: errMsg,
        stack: err.stack
      }
    };
  }
}

export async function runAgentPedidosSemLote(ai: GoogleGenAI) {
  const executionStart = Date.now();
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId || "producao";

  console.log(`[Agent-Pipeline] Starting execution of target pedidos-sem-lote. Project: "${projectId}", DB: "${databaseId}"`);

  let db: any;
  try {
    db = getServerDb();
  } catch (err: any) {
    console.error("[Agent-Pipeline] Failed to resolve getServerDb()", err);
    return {
      success: false,
      ok: false,
      code: "FIRESTORE_COLLECTION_OR_DATABASE_NOT_FOUND",
      message: `O banco de dados Firestore ou coleção 'orders'/'productionBatches' não encontrado na nuvem. Verifique o provisionamento da coleção ou do ID do banco '${databaseId}'.`,
      details: {
        projectId,
        databaseId,
        error: err.message
      }
    };
  }

  // Check if it already ran this month
  try {
    const reportRef = doc(db, "agentReports", "monitor-pedidos-sem-lote");
    const reportSnap = await getDoc(reportRef);
    if (reportSnap.exists()) {
      const data = reportSnap.data() as any;
      if (data.updatedAt) {
        const lastRun = new Date(data.updatedAt);
        const now = new Date();
        if (
          lastRun.getMonth() === now.getMonth() &&
          lastRun.getFullYear() === now.getFullYear()
        ) {
          console.log("[Agent-Pipeline] Agent already ran this month. Returning cached report to optimize Gemini API cost.");
          const durationMs = Date.now() - executionStart;
          return {
            success: true,
            ok: true,
            total: data.totalPedidosSemLote,
            data: data,
            cached: true,
            message: "Retornando dados em cache (a IA foi configurada para rodar e gastar tokens apenas 1 vez por mês).",
            meta: {
              projectId,
              databaseId,
              collections: { orders: true, productionBatches: true },
              modelUsed: "cached",
              durationMs
            }
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[Agent-Pipeline] Error checking last run report. Proceeding to run.", err);
  }

  // 1. Fetch productionBatches with diagnostics logging
  const colBatches = "productionBatches";
  let batchesSnap;
  try {
    console.log(`[Agent-Pipeline] Fetching collection "${colBatches}" from Project: "${projectId}", Database: "${databaseId}"`);
    batchesSnap = await getDocs(collection(db, colBatches));
    console.log(`[Agent-Pipeline] Successful fetch of "${colBatches}". Loaded ${batchesSnap.size} documents.`);
  } catch (err: any) {
    console.error(`[Agent-Pipeline] Error reading collection "${colBatches}":`, err);
    return handleDatabaseError(err, colBatches, projectId, databaseId);
  }

  const ordersWithBatch = new Set<number>();
  batchesSnap.forEach((docSnap: any) => {
    const batch = docSnap.data();
    if (Array.isArray(batch.orderIds)) {
      batch.orderIds.forEach((id: number) => ordersWithBatch.add(id));
    }
  });

  // 2. Fetch orders with diagnostics logging
  const colOrders = "orders";
  let ordersSnap;
  try {
    console.log(`[Agent-Pipeline] Fetching collection "${colOrders}" from Project: "${projectId}", Database: "${databaseId}"`);
    ordersSnap = await getDocs(query(collection(db, colOrders), where("isActive", "==", true)));
    console.log(`[Agent-Pipeline] Successful fetch of "${colOrders}". Loaded ${ordersSnap.size} active documents.`);
  } catch (err: any) {
    console.error(`[Agent-Pipeline] Error reading collection "${colOrders}":`, err);
    return handleDatabaseError(err, colOrders, projectId, databaseId);
  }

  const allOrders: any[] = [];
  ordersSnap.forEach((docSnap: any) => {
    allOrders.push(docSnap.data());
  });

  // Filter orders without batch and in status other than final/canceled
  const excludeStatus = ["FATURADO", "EMBALADO", "CANCELADO"];
  const ordersSemLote = allOrders.filter(
    (o) =>
      !ordersWithBatch.has(o.id) &&
      !excludeStatus.includes(o.status || "")
  );

  if (ordersSemLote.length === 0) {
    console.log("[Agent-Pipeline] No active orders without production batch found.");
    try {
      await setDoc(doc(db, "agentReports", "monitor-pedidos-sem-lote"), {
        agentId: "monitor-pedidos-sem-lote",
        pedidosPriorizados: [],
        sugestoesAgrupamento: [],
        alertas: [],
        summary: "Todos os pedidos ativos já estão associados a um lote de produção.",
        totalPedidosSemLote: 0,
        severity: "low",
        updatedAt: Date.now()
      }, { merge: true });
    } catch (writeErr: any) {
      console.error("[Agent-Pipeline] Erro ao salvar relatório vazio:", writeErr);
    }
    return {
      success: true,
      ok: true,
      total: 0,
      data: [],
      message: "Nenhum pedido encontrado.",
      meta: {
        projectId,
        databaseId,
        collections: {
          orders: true,
          productionBatches: true
        }
      }
    };
  }

  // 3. Fetch items with diagnostics logging
  const colItems = "items";
  let itemsSnap;
  try {
    console.log(`[Agent-Pipeline] Fetching collection "${colItems}" from Project: "${projectId}", Database: "${databaseId}"`);
    itemsSnap = await getDocs(collection(db, colItems));
    console.log(`[Agent-Pipeline] Successful fetch of "${colItems}". Loaded ${itemsSnap.size} documents.`);
  } catch (err: any) {
    console.error(`[Agent-Pipeline] Error reading collection "${colItems}":`, err);
    return handleDatabaseError(err, colItems, projectId, databaseId);
  }

  const itemsMap = new Map<number, any>();
  itemsSnap.forEach((docSnap: any) => {
    const data = docSnap.data();
    itemsMap.set(data.id, data);
  });

  const todayMs = Date.now();
  const promptData = ordersSemLote.map((o) => {
    let diasEmAberto = 0;
    if (o.createdAt) {
      diasEmAberto = Math.floor((todayMs - o.createdAt) / (1000 * 60 * 60 * 24));
    }
    const itemInfo = itemsMap.get(o.itemId) || {};
    return {
      pedidoId: o.id,
      cliente: o.customerName || "Não informado",
      prazo: o.deliveryDate || "Sem prazo definido",
      produto: itemInfo.name || `Item #${o.itemId}`,
      tipoProduto: itemInfo.type || "Desconhecido",
      cor: o.color,
      tamanho: o.size,
      variacao: o.variation,
      quantidade: o.totalQuantity,
      diasEmAberto,
      isUrgent: o.isUrgent || false,
    };
  });

  const prompt = `
Você é um assistente de gestão de produção industrial.

Analise a lista de pedidos abaixo que ainda não possuem lote de produção associado e não estão sendo produzidos. Você deve agrupá-los inteligentemente.

PEDIDOS SEM LOTE:
${JSON.stringify(promptData, null, 2)}

Sua tarefa:
1. Priorizar os pedidos por urgência considerando:
   - prazo mais próximo (ou atrasado) = maior prioridade
   - pedidos mais antigos (mais diasEmAberto) = maior prioridade
   - isUrgent = true tem prioridade especial
   - cliente com múltiplos pedidos pendentes = atenção especial

2. Criar sugestões inteligentes de agrupamento para Lotes de Produção. Considere fortemente as seguintes regras para sugerir um lote:
   - Agrupar por Cliente + Prazo: Ex: "Lote Cliente Lara Móveis - Entrega Dia 20"
   - Agrupar por Tipo de Produto: Ex: "Lote Rodas Glider - Semana X" (produtos similares otimizam o setup da fábrica).
   - Não crie lotes gigantescos, tente agrupar pedidos similares sugerindo lotes lógicos. Pode haver mais de um lote sugerido para o mesmo cliente, ou um lote consolidado se fizer sentido.

3. Retornar os dados respeitando a estrutura Schema requisitada, sem markdown adicional.
`;

  const candidateModels: string[] = [];
  if (process.env.GEMINI_MODEL) {
    candidateModels.push(process.env.GEMINI_MODEL);
  }
  candidateModels.push("gemini-3.5-flash");
  candidateModels.push("gemini-3.1-flash-lite");

  let response: any = null;
  let selectedModel = "";
  const triedModels: string[] = [];

  for (const model of candidateModels) {
    triedModels.push(model);
    console.log(`[Agent-Pipeline] Attempting Gemini model candidate: "${model}"`);
    try {
      const result = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: {
                type: Type.STRING,
                enum: ["low", "medium", "high", "critical"],
                description: "Grau de criticidade atual da fila (low, medium, high, critical)"
              },
              totalPedidosSemLote: { type: Type.INTEGER },
              summary: { type: Type.STRING, description: "Resumo em 2 ou 3 frases da situação geral" },
              pedidosPriorizados: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pedidoId: { type: Type.INTEGER },
                    cliente: { type: Type.STRING },
                    prazo: { type: Type.STRING },
                    diasEmAberto: { type: Type.INTEGER },
                    urgencia: { type: Type.STRING, enum: ["critica", "alta", "media", "baixa"] },
                    motivo: { type: Type.STRING, description: "Justificativa da urgência" },
                    sugestaoLote: { type: Type.STRING, description: "Sugestão de agrupamento" }
                  },
                  required: ["pedidoId", "cliente", "prazo", "diasEmAberto", "urgencia", "motivo"]
                }
              },
              sugestoesAgrupamento: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nomeSugeridoLote: { type: Type.STRING },
                    pedidos: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                    justificativa: { type: Type.STRING }
                  },
                  required: ["nomeSugeridoLote", "pedidos", "justificativa"]
                }
              },
              alertas: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["severity", "totalPedidosSemLote", "summary", "pedidosPriorizados", "sugestoesAgrupamento", "alertas"]
          }
        }
      });

      if (result && result.text) {
        response = result;
        selectedModel = model;
        console.log(`[Agent-Pipeline] Gemini model candidate "${model}" executed successfully!`);
        break;
      }
    } catch (err: any) {
      console.warn(`[Agent-Pipeline] Gemini model candidate "${model}" failed. Reason: ${err.message || err}`);
    }
  }

  if (!response) {
    console.error(`[Agent-Pipeline] All Gemini models failed. Tried candidates: ${JSON.stringify(triedModels)}`);
    return {
      success: false,
      ok: false,
      code: "GEMINI_MODEL_NOT_FOUND",
      message: "O modelo Gemini configurado não está disponível ou falhou neste projeto/API.",
      details: {
        triedModels,
        apiVersion: "v1beta"
      }
    };
  }

  const rawText = response.text.trim();
  let aiResult;
  try {
    aiResult = JSON.parse(rawText);
  } catch (e: any) {
    console.error("[Agent-Pipeline] Failed to parse JSON response from Gemini:", e);
    return {
      success: false,
      ok: false,
      code: "AGENT_INTERNAL_ERROR",
      message: "Ocorreu um erro inesperado ao interpretar os dados retornados pelo agente inteligente.",
      details: {
        rawOutput: rawText,
        error: e.message
      }
    };
  }

  try {
    // Persist finalized report and generate notifications
    console.log(`[Agent-Pipeline] Persisting final report into agentReports/monitor-pedidos-sem-lote`);
    await setDoc(doc(db, "agentReports", "monitor-pedidos-sem-lote"), {
      agentId: "monitor-pedidos-sem-lote",
      ...aiResult,
      updatedAt: Date.now()
    }, { merge: true });

    const hasCritical = aiResult.pedidosPriorizados?.some((p: any) => p.urgencia === "critica");
    const hasOld = aiResult.pedidosPriorizados?.some((p: any) => p.diasEmAberto > 5);

    if (hasCritical || aiResult.totalPedidosSemLote > 10 || hasOld) {
      const notifId = Date.now();
      console.log(`[Agent-Pipeline] Critical triggers met. Creating notification ID: ${notifId}`);
      await setDoc(doc(db, "notifications", notifId.toString()), {
        id: notifId,
        type: "agent-pedidos-sem-lote",
        title: `⚠️ ${aiResult.totalPedidosSemLote} pedidos aguardando produção`,
        message: aiResult.summary,
        severity: aiResult.severity,
        actionUrl: "/fila-producao",
        read: false,
        createdAt: notifId
      }, { merge: true });
    }
  } catch (saveErr: any) {
    console.error("[Agent-Pipeline] Error while persisting report/notifications to Firestore:", saveErr);
  }

  const durationMs = Date.now() - executionStart;
  console.log(`[Agent-Pipeline] Execution completed in ${durationMs}ms. Status: Success. Total items processed: ${aiResult.totalPedidosSemLote}`);

  return {
    success: true,
    ok: true,
    total: aiResult.totalPedidosSemLote,
    data: aiResult,
    meta: {
      projectId,
      databaseId,
      collections: {
        orders: true,
        productionBatches: true
      },
      modelUsed: selectedModel,
      durationMs
    }
  };
}
