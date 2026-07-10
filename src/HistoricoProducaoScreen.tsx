import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  History,
  Search,
  Calendar,
  User as UserIcon,
  Upload,
  X,
  CheckSquare,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Layers,
  Clipboard,
  Clock,
  Sparkles,
  ExternalLink,
  PackageCheck,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, ProductionLog, Item } from "./types";
import { normalizeString } from "./searchUtils";
import { getQueue, removeFromQueue, processQueueItem } from "./syncQueue";

interface ParsedSpreadsheetRow {
  dateStr: string;
  process: string;
  itemName: string;
  lot: string;
  quantity: number;
  startTimeStr: string;
  endTimeStr: string;
  responsibleName: string;
  sectorStr: string;
  durationStr: string;
  partsPerHourStr: string;

  // Entity Resolution
  matchedItem?: Item;
  matchedOperatorUser?: User;

  // Calculated Timings
  timestamp: number;
  durationMillis: number;
  logType:
    | "EMBALAGEM"
    | "PRODUCAO"
    | "PINTURA"
    | "CORTE_LASER"
    | "BANHO_QUIMICO"
    | "PRENSA_RAFAEL"
    | "PRENSA_EDUARDO"
    | "TORNO_CNC_WILLIAN"
    | "TORNO_CNC_HENRIQUE"
    | "INJETORA";
  isValid: boolean;
}

export function HistoricoProducaoScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOperatorId, setSelectedOperatorId] = useState("ALL");

  // Collapse filter state and Log Detail Popup State
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  // States for Editing/Correcting a production log
  const [isEditingLog, setIsEditingLog] = useState(false);
  const [editQty, setEditQty] = useState("");
  const [editOperatorId, setEditOperatorId] = useState("");
  const [editCustomProductName, setEditCustomProductName] = useState("");
  const [editItemId, setEditItemId] = useState<number | undefined>(undefined);
  const [editOrderId, setEditOrderId] = useState<number | undefined>(undefined);
  const [editNestedPartName, setEditNestedPartName] = useState<string | undefined>(undefined);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [nestSearchQuery, setNestSearchQuery] = useState("");

  const startEditingLog = (log: ProductionLog) => {
    setIsEditingLog(true);
    const logQty =
      log.quantityCut ||
      log.quantityPainted ||
      log.quantityProcessed ||
      log.quantityPacked ||
      log.quantityInvoiced ||
      0;
    setEditQty(logQty.toString());
    setEditOperatorId(log.operatorId);
    setEditCustomProductName(log.customProductName || "");
    setEditItemId(log.itemId || (log as any).parentItemId);
    setEditOrderId(log.orderId);
    setEditNestedPartName((log as any).nestedPartName || "");
    setItemSearchQuery("");
    setOrderSearchQuery("");
    setNestSearchQuery("");
  };

  const handleSaveLog = async () => {
    if (!selectedLog) return;
    const qtyNum = Number(editQty);
    if (isNaN(qtyNum) || qtyNum < 0) {
      alert("Por favor, insira uma quantidade válida.");
      return;
    }

    const updatedLog = { ...selectedLog };
    updatedLog.operatorId = editOperatorId;
    updatedLog.customProductName = editCustomProductName || undefined;
    updatedLog.itemId = editItemId || undefined;
    updatedLog.orderId = editOrderId || undefined;
    
    if (editNestedPartName) {
      (updatedLog as any).nestedPartName = editNestedPartName;
    } else {
      delete (updatedLog as any).nestedPartName;
    }

    // Set parentItemId appropriately for component relationship if applicable
    if (editItemId) {
      (updatedLog as any).parentItemId = editItemId;
    } else {
      delete (updatedLog as any).parentItemId;
    }

    // Update whichever quantity was defined originally
    if (selectedLog.quantityCut !== undefined) updatedLog.quantityCut = qtyNum;
    if (selectedLog.quantityPainted !== undefined) updatedLog.quantityPainted = qtyNum;
    if (selectedLog.quantityProcessed !== undefined) updatedLog.quantityProcessed = qtyNum;
    if (selectedLog.quantityPacked !== undefined) updatedLog.quantityPacked = qtyNum;
    if (selectedLog.quantityInvoiced !== undefined) updatedLog.quantityInvoiced = qtyNum;

    try {
      if (db.updateLog) {
        await db.updateLog(updatedLog);
      } else {
        await (db as any).addLogs([updatedLog]);
      }
      setIsEditingLog(false);
      setSelectedLog(updatedLog);
      alert("Lançamento atualizado com sucesso!");
    } catch (err: any) {
      alert("Erro ao atualizar lançamento: " + err.message);
    }
  };

  const handleDeleteLog = async () => {
    if (!selectedLog) return;
    if (!window.confirm("Deseja realmente excluir este lançamento do histórico? Esta ação é irreversível.")) {
      return;
    }

    try {
      if (db.deleteLog) {
        await db.deleteLog(selectedLog.id);
      }
      setIsEditingLog(false);
      setSelectedLog(null);
      alert("Lançamento excluído com sucesso!");
    } catch (err: any) {
      alert("Erro ao excluir lançamento: " + err.message);
    }
  };

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(50);
  }, [debouncedSearchTerm, startDate, endDate, selectedOperatorId]);

  useEffect(() => {
    if (!selectedLog) {
      setIsEditingLog(false);
    }
  }, [selectedLog]);

  // Seeding test metrics populator
  const [isSeedingData, setIsSeedingData] = useState(false);

  // Log integrity monitor / SyncQueue states
  const [showSyncMonitor, setShowSyncMonitor] = useState(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [reprocessingAll, setReprocessingAll] = useState(false);

  const loadQueueItems = async () => {
    setLoadingQueue(true);
    try {
      const items = await getQueue();
      setQueueItems(items);
    } catch (err) {
      console.error("Erro ao carregar fila de sincronismo:", err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    if (showSyncMonitor) {
      loadQueueItems();
    }
  }, [showSyncMonitor, db.syncQueueCount]);

  const handleReprocessItem = async (item: any) => {
    try {
      await processQueueItem(item);
      await removeFromQueue(item.id);
      db.triggerSyncQueue?.(true);
      await loadQueueItems();
    } catch (err: any) {
      alert("Falha ao reprocessar registro: " + (err.message || err));
    }
  };

  const handleReprocessAll = async () => {
    setReprocessingAll(true);
    let successCount = 0;
    let failCount = 0;
    for (const item of queueItems) {
      try {
        await processQueueItem(item);
        await removeFromQueue(item.id);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    db.triggerSyncQueue?.(true);
    await loadQueueItems();
    setReprocessingAll(false);
    alert(`Reprocessamento em massa concluído!\nSucessos: ${successCount}\nFalhas: ${failCount}`);
  };

  const handleDeleteQueueItem = async (id: number) => {
    if (window.confirm("Deseja realmente remover permanentemente este item da fila? Essa ação é de emergência e pode causar perda permanente.")) {
      try {
        await removeFromQueue(id);
        db.triggerSyncQueue?.(true);
        await loadQueueItems();
      } catch (err: any) {
        alert("Erro ao remover: " + (err.message || err));
      }
    }
  };

  const handleExportEmergencyJSON = () => {
    if (queueItems.length === 0) {
      alert("Não há dados pendentes para exportar.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(queueItems, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `syncqueue_emergencia_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportEmergencyCSV = () => {
    if (queueItems.length === 0) {
      alert("Não há dados pendentes para exportar.");
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;Tipo;Data_Criacao;Resumo_Do_Dado\n";
    
    queueItems.forEach((item) => {
      const dateStr = new Date(item.createdAt).toLocaleString();
      let summary = "";
      if (item.type === "ADD_LOGS") {
        summary = `Novos Logs (${item.payload?.logs?.length || 0} un) - Operadores: ${item.payload?.logs?.map((l: any) => l.operatorId).join(", ")}`;
      } else if (item.type === "UPDATE_ORDERS") {
        summary = `Pedidos (${item.payload?.orders?.length || 0} un)`;
      } else if (item.type === "UPDATE_STOCKS") {
        summary = `Estoque (${item.payload?.stocks?.length || 0} un)`;
      } else {
        summary = `Operacao: ${item.type}`;
      }
      csvContent += `${item.id};${item.type};${dateStr};"${summary.replace(/"/g, '""').replace(/\n/g, " ")}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `syncqueue_emergencia_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Manual registration states
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState<
    | "EMBALAGEM"
    | "PRODUCAO"
    | "PINTURA"
    | "CORTE_LASER"
    | "BANHO_QUIMICO"
    | "PRENSA_RAFAEL"
    | "PRENSA_EDUARDO"
    | "TORNO_CNC_WILLIAN"
    | "TORNO_CNC_HENRIQUE"
    | "INJETORA"
  >("PRODUCAO");
  const [manualItemSearch, setManualItemSearch] = useState("");
  const [manualItemId, setManualItemId] = useState("");
  const [manualCustomProduct, setManualCustomProduct] = useState("");
  const [manualOperatorId, setManualOperatorId] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualDurationMinutes, setManualDurationMinutes] = useState("30");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [manualTime, setManualTime] = useState("12:00");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Spreadsheet Importer State
  const [showImporter, setShowImporter] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedSpreadsheetRow[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Parse text pasted from Excel or Google Sheets (Tab-separated)
  const handleParseSpreadsheet = (input: string) => {
    if (!input.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = input.split(/\r?\n/);
    const rows: ParsedSpreadsheetRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip header row if matches common terms
      if (
        i === 0 &&
        (line.toUpperCase().includes("DATA") ||
          line.toUpperCase().includes("PROCESSO") ||
          line.toUpperCase().includes("NOME DO ITEM"))
      ) {
        continue;
      }

      // Excel/Sheets copies with tabs. If not present, try semicolon or comma
      let cols = line.split("\t");
      if (cols.length === 1) {
        cols = line.split(";");
      }
      if (cols.length === 1) {
        cols = line.split(",");
      }

      if (cols.length < 3) continue;

      const dateStr = cols[0]?.trim() || "";
      const process = cols[1]?.trim() || "";
      const itemName = cols[2]?.trim() || "";
      const lot = cols[3]?.trim() || "";

      const rawQty = cols[4]?.trim() || "0";
      // Handle Portuguese thousand separator (e.g. 1.000 or 1,234.50 or 1.972 with decimals)
      const sanitizedQty = rawQty.replace(/\./g, "").replace(/,/g, ".");
      const quantity = Math.round(parseFloat(sanitizedQty)) || 0;

      const startTimeStr = cols[5]?.trim() || "";
      const endTimeStr = cols[6]?.trim() || "";
      const responsibleName = cols[7]?.trim() || "";
      const sectorStr = cols[8]?.trim() || "";
      const durationStr = cols[9]?.trim() || "";
      const partsPerHourStr = cols[10]?.trim() || "";

      // Try item matching by exact or partial name
      const cleanItemName = itemName.trim().toLowerCase();
      let matchedItem = db.items.find(
        (it) =>
          it.name.trim().toLowerCase() === cleanItemName ||
          it.code.trim().toLowerCase() === cleanItemName,
      );
      if (!matchedItem && cleanItemName) {
        matchedItem = db.items.find((it) =>
          it.name.trim().toLowerCase().includes(cleanItemName),
        );
      }

      // Try operator matching
      let matchedOperatorUser = undefined;
      const cleanResp = responsibleName
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (cleanResp) {
        matchedOperatorUser = db.users.find((u) => {
          const cleanUName = u.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          return (
            cleanUName === cleanResp ||
            cleanUName.includes(cleanResp) ||
            cleanResp.includes(cleanUName)
          );
        });
      }

      // TIMINGS RESOLUTION
      let timestamp = Date.now();
      let durationMillis = 0;
      let dateIsValid = false;

      const dParts = dateStr.split("/");
      if (dParts.length === 3) {
        const day = parseInt(dParts[0], 10);
        const month = parseInt(dParts[1], 10) - 1;
        const year = parseInt(dParts[2], 10);

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          // Parse start and end hours
          const sParts = startTimeStr.split(":");
          const sH = parseInt(sParts[0] || "0", 10);
          const sM = parseInt(sParts[1] || "0", 10);
          const sS = parseInt(sParts[2] || "0", 10);

          const startDt = new Date(year, month, day, sH, sM, sS);

          const eParts = endTimeStr.split(":");
          const eH = parseInt(eParts[0] || "0", 10);
          const eM = parseInt(eParts[1] || "0", 10);
          const eS = parseInt(eParts[2] || "0", 10);

          const endDt = new Date(year, month, day, eH, eM, eS);

          if (!isNaN(startDt.getTime())) {
            timestamp = startDt.getTime();
            dateIsValid = true;

            if (!isNaN(endDt.getTime())) {
              durationMillis = endDt.getTime() - startDt.getTime();
              if (durationMillis < 0) {
                // Crosses midnight
                durationMillis += 24 * 60 * 60 * 1000;
              }
            }
          }
        }
      }

      // LOG TYPE RESOLUTION
      let logType:
        | "EMBALAGEM"
        | "PRODUCAO"
        | "PINTURA"
        | "CORTE_LASER"
        | "BANHO_QUIMICO"
        | "PRENSA_RAFAEL"
        | "PRENSA_EDUARDO"
        | "TORNO_CNC_WILLIAN"
        | "TORNO_CNC_HENRIQUE"
        | "INJETORA" = "PRODUCAO";
      const secUpper = (sectorStr || process || "").toUpperCase();
      const respUpper = (responsibleName || "").toUpperCase();

      if (secUpper.includes("BANHO") || secUpper.includes("ZINCO")) {
        logType = "BANHO_QUIMICO";
      } else if (
        secUpper.includes("LASER") ||
        secUpper.includes("CNC") ||
        secUpper.includes("TORNO")
      ) {
        logType = "CORTE_LASER";
      } else if (
        secUpper.includes("PINTURA") ||
        secUpper.includes("PRÉ PINTURA") ||
        secUpper.includes("PRE PINTURA")
      ) {
        logType = "PINTURA";
      } else if (
        secUpper.includes("PRENSA") ||
        secUpper.includes("DOBRA") ||
        secUpper.includes("CORTE") ||
        secUpper.includes("PONTEADEIRA") ||
        secUpper.includes("PERFILADEIRA")
      ) {
        if (respUpper.includes("EDUARDO") || respUpper.includes("SAVIO")) {
          logType = "PRENSA_EDUARDO";
        } else if (respUpper.includes("RAFAEL")) {
          logType = "PRENSA_RAFAEL";
        } else {
          logType = "PRENSA_EDUARDO";
        }
      } else if (secUpper.includes("INJETORA")) {
        logType = "INJETORA";
      } else if (
        secUpper.includes("EMBALA") ||
        secUpper.includes("RETRÁTIL") ||
        secUpper.includes("RETRATIL") ||
        secUpper.includes("ACABAMENTO")
      ) {
        logType = "EMBALAGEM";
      }

      const isValid = dateIsValid && itemName.length > 0 && quantity > 0;

      rows.push({
        dateStr,
        process,
        itemName,
        lot,
        quantity,
        startTimeStr,
        endTimeStr,
        responsibleName,
        sectorStr,
        durationStr,
        partsPerHourStr,
        matchedItem,
        matchedOperatorUser,
        timestamp,
        durationMillis,
        logType,
        isValid,
      });
    }

    setParsedRows(rows);
  };

  const handleImportLogs = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportResult({
        success: false,
        message: "Nenhum registro de apontamento válido para importar.",
      });
      return;
    }
    setImportResult(null);
    setShowConfirmModal(true);
  };

  // Seed Database with initial mock test metrics
  const seedTestData = async () => {
    setIsSeedingData(true);
    setImportResult(null);
    try {
      const defaultOperator = db.users[0]?.id || currentUser.id || "gerencia";
      const sampleItems =
        db.items.length > 0
          ? db.items.slice(0, 5)
          : [
              { id: 101, code: "SAP-GIR-01", name: "SAPATA GIRATORIA COMUM" },
              { id: 102, code: "PON-EXT-02", name: "PONTEIRA EXTERNA SLIM" },
              {
                id: 103,
                code: "PAR-AUT-03",
                name: "PARAFUSO AUTO ATARRAXANTE 4.2x13",
              },
              {
                id: 104,
                code: "CHA-EST-04",
                name: "CHAPA ESTAMPADA IMPERIO 1.5mm",
              },
              {
                id: 105,
                code: "CAN-REF-05",
                name: "CANTONEIRA REFORCADA AÇO BI-ZINCADA",
              },
            ];

      const seedLogs: ProductionLog[] = [
        {
          id: Date.now() + 1000,
          operatorId:
            db.users.find((u) => u.role === "PRODUCAO")?.id || defaultOperator,
          timestamp: Date.now() - 3600000 * 2,
          durationMillis: 45 * 60 * 1000,
          type: "PRODUCAO",
          customProductName: sampleItems[0]?.name || "SAPATA GIRATORIA COMUM",
          quantityProcessed: 120,
        },
        {
          id: Date.now() + 2000,
          operatorId:
            db.users.find((u) => u.role === "EMBALAGEM")?.id || defaultOperator,
          timestamp: Date.now() - 3600000 * 4,
          durationMillis: 30 * 60 * 1000,
          type: "EMBALAGEM",
          customProductName: sampleItems[1]?.name || "PONTEIRA EXTERNA SLIM",
          quantityPacked: 80,
        },
        {
          id: Date.now() + 3000,
          operatorId:
            db.users.find((u) => u.role === "PINTURA")?.id || defaultOperator,
          timestamp: Date.now() - 3600000 * 6,
          durationMillis: 60 * 60 * 1000,
          type: "PINTURA",
          customProductName:
            sampleItems[2]?.name || "PARAFUSO AUTO ATARRAXANTE 4.2x13",
          quantityPainted: 150,
        },
        {
          id: Date.now() + 4000,
          operatorId:
            db.users.find((u) => u.role === "CORTE_LASER")?.id ||
            defaultOperator,
          timestamp: Date.now() - 3600000 * 24,
          durationMillis: 120 * 60 * 1000,
          type: "CORTE_LASER",
          customProductName:
            sampleItems[3]?.name || "CHAPA ESTAMPADA IMPERIO 1.5mm",
          quantityCut: 45,
        },
        {
          id: Date.now() + 5000,
          operatorId: defaultOperator,
          timestamp: Date.now() - 3600000 * 12,
          durationMillis: 25 * 60 * 1000,
          type: "FATURAMENTO",
          customProductName:
            sampleItems[4]?.name || "CANTONEIRA REFORCADA AÇO BI-ZINCADA",
          quantityInvoiced: 200,
        },
      ];

      await db.addLogs(seedLogs);

      setImportResult({
        success: true,
        message: `Massa de dados de teste (seed) adicionada com sucesso! ${seedLogs.length} apontamentos gerados para o histórico.`,
      });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao popular dados de teste: " + (e?.message || e));
    } finally {
      setIsSeedingData(false);
    }
  };

  // Manual Apontamento point Registration (handleCadastrar)
  const handleCadastrar = async () => {
    const qVal = parseInt(manualQuantity, 10);
    if (
      !manualDate ||
      isNaN(qVal) ||
      qVal <= 0 ||
      (!manualItemId && !manualCustomProduct)
    ) {
      alert(
        "Por favor, preencha a data, quantidade válida e o produto para cadastrar o apontamento.",
      );
      return;
    }

    setIsSubmittingManual(true);
    try {
      const randomSeed = Math.floor(Math.random() * 500000);
      const id = Date.now() + randomSeed;

      let finalProductName = manualCustomProduct;
      let orderId = undefined;

      if (manualItemId) {
        const item = db.items.find((i) => i.id === Number(manualItemId));
        if (item) {
          finalProductName = item.name;
          const relatedOrder = db.orders.find(
            (o) => o.itemId === item.id && o.status !== "FATURADO",
          );
          if (relatedOrder) {
            orderId = relatedOrder.id;
          }
        }
      }

      const dateTimeStr = `${manualDate}T${manualTime || "12:00"}:00`;
      const dateTimestamp = new Date(dateTimeStr).getTime() || Date.now();
      const durMillis =
        parseInt(manualDurationMinutes, 10) * 60 * 1000 || 1800000;

      const newLog: ProductionLog = {
        id,
        operatorId: manualOperatorId || currentUser.id,
        timestamp: dateTimestamp,
        durationMillis: durMillis,
        type: manualType,
        customProductName: finalProductName,
      };

      if (orderId) {
        newLog.orderId = orderId;
      }

      if (manualType === "EMBALAGEM") {
        newLog.quantityPacked = qVal;
      } else if (manualType === "PINTURA") {
        newLog.quantityPainted = qVal;
      } else if (manualType === "CORTE_LASER") {
        newLog.quantityCut = qVal;
      } else {
        newLog.quantityProcessed = qVal;
      }

      await db.addLogs([newLog]);

      // Reset state variables ONLY after successful await
      setManualItemId("");
      setManualItemSearch("");
      setManualCustomProduct("");
      setManualQuantity("");
      setManualOperatorId("");

      // Trigger success animations immediately after saving
      setShowSuccessCheck(true);
      setTimeout(() => {
        setShowSuccessCheck(false);
        setShowManualForm(false);
      }, 1500);

      setImportResult({
        success: true,
        message:
          "Apontamento manual de produção cadastrado com sucesso no histórico permanente!",
      });
    } catch (err: any) {
      console.error(err);
      alert("Falha ao registrar apontamento: " + (err?.message || err));
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const executeImportLogs = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessingImport(true);
    setImportResult(null);
    try {
      const logsToAdd: ProductionLog[] = validRows.map((r, i) => {
        const id = Date.now() + i + Math.floor(Math.random() * 500000);

        const baseLog: any = {
          id,
          operatorId: r.matchedOperatorUser?.id || "gerencia",
          timestamp: r.timestamp,
          durationMillis: r.durationMillis || 0,
          type: r.logType,
        };

        if (r.matchedItem) {
          const relatedOrder = db.orders.find(
            (o) =>
              o.itemId === r.matchedItem!.id &&
              o.status !== "FATURADO" &&
              o.status !== "EMBALADO",
          );
          if (relatedOrder) {
            baseLog.orderId = relatedOrder.id;
          }
          baseLog.customProductName = r.matchedItem.name;
        } else {
          baseLog.customProductName = r.itemName;
        }

        if (r.responsibleName) {
          baseLog.customOperatorName = r.responsibleName;
        }

        const qVal = r.quantity;
        if (r.logType === "EMBALAGEM") {
          baseLog.quantityPacked = qVal;
        } else if (r.logType === "PINTURA") {
          baseLog.quantityPainted = qVal;
        } else if (r.logType === "CORTE_LASER") {
          baseLog.quantityCut = qVal;
        } else {
          baseLog.quantityProcessed = qVal;
        }

        return baseLog as ProductionLog;
      });

      await db.addLogs(logsToAdd);

      setShowConfirmModal(false); // Close modal only after the await finishes successfully!

      // Trigger success check animations
      setShowSuccessCheck(true);
      setTimeout(() => setShowSuccessCheck(false), 2800);

      setImportResult({
        success: true,
        message: `Importação concluída com sucesso! ${logsToAdd.length} registros de apontamentos inseridos.`,
      });
      setSpreadsheetInput("");
      setParsedRows([]);
      setShowImporter(false);
    } catch (e: any) {
      console.error(e);
      setImportResult({
        success: false,
        message: `Falha ao salvar registros de apontamentos: ${e?.message || e}`,
      });
      setShowConfirmModal(false); // Clean modal state on catch too
    } finally {
      setIsProcessingImport(false);
    }
  };

  const logs = useMemo(() => {
    let filtered = [...db.logs];

    // Filtra pelo usuário se não for Admin ou Projetista
    if (
      currentUser.role !== "ADMIN" &&
      currentUser.role !== "GERENCIA" &&
      currentUser.role !== "LEITURA" &&
      currentUser.role !== "PROJETISTA" &&
      currentUser.role !== "PCP"
    ) {
      if (currentUser.role === "REPRESENTANTE") {
        const orderIds = db.orders
          .filter((o) => o.representativeName === currentUser.name)
          .map((o) => o.id);
        filtered = filtered.filter(
          (l) =>
            orderIds.includes(l.orderId) || l.operatorId === currentUser.id,
        );
      } else {
        filtered = filtered.filter((l) => l.operatorId === currentUser.id);
      }
    }

    if (selectedOperatorId && selectedOperatorId !== "ALL") {
      filtered = filtered.filter((l) => l.operatorId === selectedOperatorId);
    }

    filtered = filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (debouncedSearchTerm) {
      const normSearch = normalizeString(debouncedSearchTerm);

      filtered = filtered.filter((l) => {
        // Encontra o nome do produto / tarefa
        let name = l.customProductName || "";
        let code = "";
        let client = "";
        let tradeName = "";
        let orderCode = "";
        let status = "";
        if (l.type === "CORTE_LASER" && l.orderId && !name) {
          const nest = db.nestTasks?.find((t) => t.id === l.orderId);
          name = nest ? nest.partName : "Peça Desconhecida";
        } else if (l.orderId) {
          const order = db.orders.find((o) => o.id === l.orderId);
          if (order) {
            const item = db.items.find((i) => i.id === order.itemId);
            name = item ? item.name : "Item Desconhecido";
            code = item ? item.code : "";
            client = order.customerName || "";
            const customerObj = db.customers.find(
              (c) => c.name === client || c.tradeName === client,
            );
            tradeName = customerObj?.tradeName || "";
            orderCode = order.orderCode || "";
            status = order.status || "";
          }
        }

        const operatorName =
          db.users.find((u) => u.id === l.operatorId)?.name ||
          l.customOperatorName ||
          "";

        const searchTarget = normalizeString(
          `${name} ${code} ${client} ${tradeName} ${orderCode} ${status} ${operatorName} ${l.type || "DESCONHECIDO"}`,
        );
        return searchTarget.includes(normSearch);
      });
    }

    if (startDate) {
      filtered = filtered.filter((l) => {
        const d = new Date(l.timestamp);
        const isoDate = d.toISOString().split("T")[0];
        return isoDate >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter((l) => {
        const d = new Date(l.timestamp);
        const isoDate = d.toISOString().split("T")[0];
        return isoDate <= endDate;
      });
    }

    return filtered;
  }, [
    db.logs,
    db.orders,
    db.items,
    db.users,
    db.nestTasks,
    currentUser,
    debouncedSearchTerm,
    startDate,
    endDate,
    selectedOperatorId,
  ]);

  const getActivityTypeColor = (type?: string) => {
    switch (type) {
      case "EMBALAGEM":
        return "bg-orange-100 text-orange-800";
      case "PRODUCAO":
        return "bg-blue-100 text-blue-800";
      case "PINTURA":
        return "bg-purple-100 text-purple-800";
      case "CORTE_LASER":
        return "bg-red-100 text-red-800";
      case "FATURAMENTO":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const formatDuration = (millis: number) => {
    const totalSecs = Math.floor(millis / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m ${s}s`;
  };

  const isPintura = currentUser.role === "PINTURA";

  return (
    <div
      className={`flex flex-col h-full w-full max-w-5xl mx-auto bg-slate-50 relative ${isPintura ? "p-2 text-[10px] sm:text-xs" : "p-4"}`}
    >
      {/* Dynamic confirm modal for spreadsheet entries */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <div className="p-3 bg-emerald-50 rounded-full animate-bounce">
                <CheckSquare size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Confirmar Importação
                </h3>
                <p className="text-xs text-slate-500">
                  Histórico de Produção permanente
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Você está prestes a gravar permanentemente{" "}
              <strong className="text-slate-800 font-extrabold">
                {parsedRows.filter((r) => r.isValid).length} registros
              </strong>{" "}
              de apontamentos analisados no banco de dados.
              <br />
              <br />
              Deseja prosseguir com essa gravação imediata?
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <motion.button
                type="button"
                disabled={isProcessingImport}
                onClick={executeImportLogs}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isProcessingImport ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-white" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={14} />
                    <span>Confirmar e Gravar</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic overlay toast result banner */}
      {importResult && (
        <div
          className={`p-4 rounded-xl border mb-6 flex items-start gap-4 justify-between animate-in slide-in-from-top-4 duration-200 ${importResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"}`}
        >
          <div className="flex gap-2.5 items-start">
            <div
              className={`p-1.5 rounded-lg ${importResult.success ? "bg-emerald-100" : "bg-red-100"}`}
            >
              {importResult.success ? (
                <CheckSquare size={18} className="text-emerald-700" />
              ) : (
                <AlertCircle size={18} className="text-red-700" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {importResult.success ? "Importação Concluída" : "Atenção"}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">
                {importResult.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="opacity-60 hover:opacity-100 self-center"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div
        id="historico-header"
        className={`historico-header flex flex-col sm:flex-row justify-between sm:items-center ${isPintura ? "gap-2 mb-3" : "gap-4 mb-6"}`}
      >
        <div className="flex items-center gap-2 text-slate-800">
          <History
            size={isPintura ? 18 : 28}
            className="text-slate-600 shrink-0"
          />
          <div>
            <h2 className={`font-bold ${isPintura ? "text-sm" : "text-2xl"}`}>
              Histórico de Produção
            </h2>
            <p
              className={`${isPintura ? "text-[9px]" : "text-[11px]"} text-slate-500 font-medium`}
            >
              Visualização e gerenciamento de registros e produtividade
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Seed database with productivity metrics */}
          <button
            type="button"
            disabled={isSeedingData}
            onClick={seedTestData}
            className={`flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-750 font-bold rounded-lg hover:bg-indigo-100 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-3xs ${isPintura ? "px-2.5 py-1 text-[9px]" : "px-3 py-1.5 text-xs"}`}
            title="Preencher registros iniciais para teste"
          >
            <Sparkles
              size={isPintura ? 11 : 13}
              className={
                isSeedingData ? "animate-spin" : "animate-pulse text-indigo-500"
              }
            />
            {isSeedingData ? "Seeding..." : "Popular Testes"}
          </button>

          {/* Log Integrity & Sync Monitor */}
          <button
            type="button"
            onClick={() => setShowSyncMonitor(!showSyncMonitor)}
            className={`flex items-center gap-1.5 font-bold rounded-lg active:scale-95 transition-all shadow-3xs cursor-pointer ${
              db.syncQueueCount > 0
                ? "bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200"
                : "bg-slate-100 border border-slate-205 text-slate-700 hover:bg-slate-200"
            } ${isPintura ? "px-2.5 py-1 text-[9px]" : "px-3.5 py-1.5 text-xs"}`}
            title="Verificar integridade dos logs pendentes na fila de sincronização"
          >
            <AlertCircle size={isPintura ? 11 : 13} className={db.syncQueueCount > 0 ? "text-amber-600 animate-bounce" : "text-slate-500"} />
            <span>Integridade Logs ({db.syncQueueCount || 0})</span>
          </button>

          {/* New Manual Logpoint Entry */}
          <button
            type="button"
            onClick={() => setShowManualForm(!showManualForm)}
            className={`flex items-center gap-1 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-3xs cursor-pointer ${isPintura ? "px-2.5 py-1 text-[9px]" : "px-3.5 py-1.5 text-xs"}`}
          >
            <Activity size={isPintura ? 11 : 13} />
            Registro Manual
          </button>

          {/* Trigger to toggle collapes spreadsheet parser */}
          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA") && (
            <button
              onClick={() => setShowImporter(!showImporter)}
              className={`flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg active:scale-95 shadow-3xs transition-all cursor-pointer ${isPintura ? "px-2.5 py-1 text-[9px]" : "px-3.5 py-1.5 text-xs"}`}
            >
              <FileSpreadsheet size={isPintura ? 11 : 13} />
              {showImporter ? "Fechar Importador" : "Importar Planilha"}
            </button>
          )}
        </div>
      </div>

      {/* MANUAL LOG ENTRY MODAL */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-indigo-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-indigo-750">
                <Activity size={20} className="text-indigo-650 animate-pulse" />
                <h3 className="text-lg font-extrabold text-slate-800">
                  Registrar Apontamento Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-655 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Setor / Processo
                </label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 text-sm cursor-pointer"
                >
                  <option value="PRODUCAO">PRODUÇÃO ( Geral )</option>
                  <option value="EMBALAGEM">EMBALAGEM</option>
                  <option value="PINTURA">PINTURA</option>
                  <option value="CORTE_LASER">CORTADORA LASER ( CNC )</option>
                  <option value="BANHO_QUIMICO">BANHO QUÍMICO</option>
                  <option value="PRENSA_RAFAEL">
                    ESTAMPARIA ( Prensa Rafael )
                  </option>
                  <option value="PRENSA_EDUARDO">
                    PROCESSO ( Prensa Eduardo )
                  </option>
                  <option value="TORNO_CNC_WILLIAN">
                    TORNO CNC ( Willian )
                  </option>
                  <option value="TORNO_CNC_HENRIQUE">
                    TORNO CNC ( Henrique )
                  </option>
                  <option value="INJETORA">MOLDAGEM INJETORA</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Item do Sistema
                  </label>
                  <select
                    value={manualItemId}
                    onChange={(e) => {
                      setManualItemId(e.target.value);
                      if (e.target.value) setManualCustomProduct("");
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 text-sm cursor-pointer"
                  >
                    <option value="">-- Escolher Item Cadastrado --</option>
                    {db.items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.code} - {it.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Ou Nome do Produto Avulso
                  </label>
                  <input
                    type="text"
                    disabled={!!manualItemId}
                    value={manualCustomProduct}
                    onChange={(e) => setManualCustomProduct(e.target.value)}
                    placeholder="Ex: Canola Reforçada..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Operador Responsável
                </label>
                <select
                  value={manualOperatorId}
                  onChange={(e) => setManualOperatorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 text-sm cursor-pointer"
                >
                  <option value="">-- Eu mesmo ({currentUser.name}) --</option>
                  {db.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Quantidade Apontada
                  </label>
                  <input
                    type="number"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(e.target.value)}
                    placeholder="Ex: 150"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Duração Estimada (minutos)
                  </label>
                  <input
                    type="number"
                    value={manualDurationMinutes}
                    onChange={(e) => setManualDurationMinutes(e.target.value)}
                    placeholder="Ex: 45"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Data do Registro
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>
              <motion.button
                type="button"
                disabled={isSubmittingManual || showSuccessCheck}
                onClick={handleCadastrar}
                animate={{
                  scale: showSuccessCheck ? [1, 1.08, 1.05] : 1,
                  backgroundColor: showSuccessCheck
                    ? "#10b981"
                    : isSubmittingManual
                      ? "#4f46e5"
                      : "#4f46e5",
                }}
                transition={{ duration: 0.4, type: "spring" }}
                whileHover={{
                  scale: isSubmittingManual || showSuccessCheck ? 1 : 1.02,
                }}
                whileTap={{
                  scale: isSubmittingManual || showSuccessCheck ? 1 : 0.98,
                }}
                className="px-5 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {isSubmittingManual ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-white" />
                    <span>Salvando Apontamento...</span>
                  </>
                ) : showSuccessCheck ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex items-center gap-1.5"
                  >
                    <PackageCheck
                      size={14}
                      className="text-white animate-bounce"
                    />
                    <span>Gravado com Sucesso!</span>
                  </motion.div>
                ) : (
                  <>
                    <CheckSquare size={13} />
                    <span>Confirmar e Gravar</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* LOG INTEGRITY & SYNC MONITOR MODAL */}
      {showSyncMonitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-amber-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={22} className="text-amber-600" />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Monitor de Integridade de Logs &amp; Linha de Sincronismo
                  </h3>
                  <p className="text-xs text-slate-500">
                    {db.syncQueueCount > 0
                      ? `Há ${db.syncQueueCount} registros na fila local pendentes de envio ao servidor.`
                      : "Todos os registros locais estão sincronizados em tempo real com o banco Firebase!"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncMonitor(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col space-y-4">
              {loadingQueue ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <RefreshCw className="animate-spin text-amber-500 mb-2" size={24} />
                  <span className="text-sm font-medium">Lendo registros locais (IndexedDB)...</span>
                </div>
              ) : queueItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50/40 rounded-xl border border-dashed p-6 border-slate-200">
                  <CheckSquare size={36} className="text-emerald-500 mb-2" />
                  <h4 className="font-bold text-slate-800">Tudo Integrado e Saudável!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Não há registros pendentes de envio ao servidor. Todos os apontamentos foram salvos no Firebase de forma bem-sucedida.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <span className="text-xs text-amber-900 font-bold">
                      Ações de Contingência da Fila:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleReprocessAll}
                        disabled={reprocessingAll}
                        className="px-2.5 py-1 text-[10px] uppercase font-extrabold bg-amber-605 hover:bg-amber-700 text-white rounded-md transition shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw size={10} className={reprocessingAll ? "animate-spin" : ""} />
                        Reprocessar Todos
                      </button>
                      <button
                        onClick={handleExportEmergencyJSON}
                        className="px-2.5 py-1 text-[10px] uppercase font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition shadow-xs cursor-pointer"
                      >
                        Exportar JSON
                      </button>
                      <button
                        onClick={handleExportEmergencyCSV}
                        className="px-2.5 py-1 text-[10px] uppercase font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-xs cursor-pointer"
                      >
                        Exportar CSV
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[45vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-605 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="p-3">ID</th>
                          <th className="p-3">Ação / Operação</th>
                          <th className="p-3">Data Registro</th>
                          <th className="p-3">Resumo / Conteúdo</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {queueItems.map((item) => {
                          const dateStr = new Date(item.createdAt).toLocaleString();
                          let summary = "";
                          if (item.type === "ADD_LOGS") {
                            summary = `Novos Logs (${item.payload?.logs?.length || 0} un)`;
                          } else if (item.type === "UPDATE_ORDERS") {
                            summary = `Atualização de Pedidos (${item.payload?.orders?.length || 0} un)`;
                          } else if (item.type === "UPDATE_STOCKS") {
                            summary = `Estoque (${item.payload?.stocks?.length || 0} un)`;
                          } else {
                            summary = `Payl.: ${JSON.stringify(item.payload).slice(0, 45)}...`;
                          }

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-bold text-slate-400">{item.id}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 font-sans font-extrabold text-[10px] rounded-md bg-slate-100 text-slate-750 border border-slate-200">
                                  {item.type}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 font-medium whitespace-nowrap">{dateStr}</td>
                              <td className="p-3 text-slate-600 max-w-[160px] truncate" title={JSON.stringify(item.payload)}>
                                {summary}
                              </td>
                              <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleReprocessItem(item)}
                                  className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer"
                                >
                                  Forçar
                                </button>
                                <button
                                  onClick={() => handleDeleteQueueItem(item.id)}
                                  className="px-2 py-1 text-[10px] font-bold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-5">
              <button
                type="button"
                onClick={() => setShowSyncMonitor(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Fechar Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDABLE SPREADSHEET IMPORTER */}
      {showImporter && (
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-emerald-100 mb-6 flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Upload size={20} className="text-emerald-600" />
              <h3 className="font-bold text-lg text-slate-800">
                Importação Avançada de Apontamentos
              </h3>
            </div>
            <button
              onClick={() => {
                setShowImporter(false);
                setSpreadsheetInput("");
                setParsedRows([]);
              }}
              className="p-1 hover:bg-slate-100 rounded-full"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed bg-emerald-50/50 p-2 text-emerald-900 rounded-lg border border-emerald-100/50">
            Copie a tabela do Excel / Google Sheets e cole no campo abaixo.
            Garanta que as colunas estejam organizadas na ordem padrão do
            relatório enviado: <br />
            <strong>DATA</strong> | <strong>PROCESSO</strong> |{" "}
            <strong>NOME DO ITEM</strong> | <strong>LOTE</strong> |{" "}
            <strong>QUANTIDADE</strong> | <strong>HORA INÍCIO</strong> |{" "}
            <strong>HORA TÉRMINO</strong> | <strong>RESPONSÁVEL</strong> |{" "}
            <strong>SETOR</strong> | <strong>TEMPO TOTAL</strong> |{" "}
            <strong>PEÇAS P/ HORA</strong>
          </p>

          <textarea
            rows={5}
            value={spreadsheetInput}
            onChange={(e) => {
              setSpreadsheetInput(e.target.value);
              handleParseSpreadsheet(e.target.value);
            }}
            placeholder="Cole aqui os dados copiados da sua planilha Excel..."
            className="w-full p-4 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />

          {parsedRows.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase">
                  Registros Identificados ({parsedRows.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleParseSpreadsheet(spreadsheetInput)}
                  className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw size={12} /> Atualizar Análise
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 sticky top-0 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">Data/Horas</th>
                      <th className="p-2.5">Item Resolvido</th>
                      <th className="p-2.5">Processo / Setor</th>
                      <th className="p-2.5 text-center">Quant.</th>
                      <th className="p-2.5 text-center">Tempo Calc.</th>
                      <th className="p-2.5">Responsável</th>
                      <th className="p-2.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-50 ${r.isValid ? "hover:bg-emerald-50/20" : "bg-red-50/20"}`}
                      >
                        <td className="p-2.5 font-mono">
                          <div className="font-bold text-slate-800">
                            {r.dateStr}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {r.startTimeStr} → {r.endTimeStr}
                          </div>
                        </td>
                        <td className="p-2.5 max-w-[200px]">
                          {r.matchedItem ? (
                            <div>
                              <span className="font-bold text-emerald-700">
                                📦 {r.matchedItem.name}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Código: {r.matchedItem.code}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-slate-700">
                                ✍️ {r.itemName || "(Não fornecido)"}
                              </span>
                              <div className="text-[10px] text-amber-600 italic">
                                Novo item avulso
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="font-medium text-slate-700">
                            {r.process || "-"}
                          </div>
                          <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">
                            {r.logType}
                          </div>
                        </td>
                        <td className="p-2.5 font-bold font-mono text-center text-slate-800">
                          {r.quantity}
                        </td>
                        <td className="p-2.5 font-mono text-center text-slate-600">
                          {formatDuration(r.durationMillis || 0)}
                        </td>
                        <td className="p-2.5 font-medium">
                          {r.matchedOperatorUser ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              👤 {r.matchedOperatorUser.name}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">
                              ✏️ {r.responsibleName || "Indefinido"}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {r.isValid ? (
                            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 font-bold rounded">
                              PRONTO
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 text-[9px] bg-red-100 text-red-800 font-bold rounded cursor-help"
                              title="Os dados de Data, Nome do Item ou Quantidade são inválidos."
                            >
                              INVÁLIDO
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-150">
                <span className="text-xs text-slate-500">
                  Total de registros analisados:{" "}
                  <strong className="text-slate-800">
                    {parsedRows.length}
                  </strong>{" "}
                  | Registros válidos prontos para salvar:{" "}
                  <strong className="text-emerald-600">
                    {parsedRows.filter((r) => r.isValid).length}
                  </strong>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSpreadsheetInput("");
                      setParsedRows([]);
                    }}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    disabled={
                      isProcessingImport ||
                      parsedRows.filter((r) => r.isValid).length === 0
                    }
                    onClick={handleImportLogs}
                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 font-sans transition-all shadow"
                  >
                    <CheckSquare size={14} />
                    {isProcessingImport
                      ? "Processando..."
                      : "Gravar Apontamentos"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div
        className={`bg-white rounded-xl shadow-sm border border-slate-250 overflow-hidden transition-all duration-300 ${isPintura ? "mb-3" : "mb-6"}`}
      >
        <button
          type="button"
          onClick={() => setFiltersCollapsed(!filtersCollapsed)}
          className={`w-full bg-slate-50 hover:bg-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors text-slate-700 border-b border-transparent focus:outline-none cursor-pointer ${isPintura ? "px-3 py-1.5" : "px-4 py-3"}`}
          style={{
            borderBottomColor: filtersCollapsed ? "transparent" : "#e2e8f0",
          }}
        >
          <div
            className="flex flex-wrap items-center gap-1.5 text-left flex-1"
            onClick={(e) => {
              if (
                (e.target as HTMLElement).closest(".collapsible-search-wrapper")
              ) {
                e.stopPropagation();
              }
            }}
          >
            <Search
              size={isPintura ? 13 : 16}
              className="text-indigo-600 shrink-0"
            />
            <span
              className={`font-bold text-slate-800 tracking-tight mr-2 select-none ${isPintura ? "text-xs" : "text-sm"}`}
            >
              Filtros e Busca
            </span>

            {/* RETRACTABLE COLLAPSIBLE SEARCH BAR WITH SMOOTH WIDTH SLIDE TRANSITION */}
            <div className="collapsible-search-wrapper relative flex items-center h-8 transition-all duration-300 mr-2">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchExpanded(!isSearchExpanded);
                }}
                className={`w-8 bg-white border border-slate-250 rounded-lg cursor-pointer flex items-center justify-center transition-colors shrink-0 shadow-3xs ${isPintura ? "h-7 hover:bg-slate-150" : "h-8 hover:bg-slate-200"}`}
                title="Expandir busca por Código ou Cliente"
              >
                <Search size={isPintura ? 11 : 14} />
              </div>
              <input
                type="text"
                placeholder="Pesquisar por Código ou Cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => {
                  e.stopPropagation();
                  setIsSearchExpanded(true);
                }}
                className={`ml-1 px-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 font-medium text-slate-800 placeholder-slate-400 shadow-3xs ${isPintura ? "h-7 text-[10px]" : "h-8 text-xs"} ${isSearchExpanded || searchTerm ? "w-36 sm:w-48 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}
              />
            </div>

            {/* Visual labels indicating active filters when collapsed/minimized */}
            <div className="flex flex-wrap items-center gap-1.5 select-none">
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 font-bold rounded-md border border-indigo-150">
                  Busca: "{searchTerm}"
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-700 font-bold rounded-md border border-amber-150">
                  📅{" "}
                  {startDate
                    ? startDate.split("-").reverse().join("/")
                    : "Início"}{" "}
                  - {endDate ? endDate.split("-").reverse().join("/") : "Fim"}
                </span>
              )}
              {selectedOperatorId !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-teal-50 text-teal-700 font-bold rounded-md border border-teal-150">
                  👤{" "}
                  {db.users.find((u) => u.id === selectedOperatorId)?.name ||
                    "Op"}
                </span>
              )}
              {!searchTerm &&
                !startDate &&
                !endDate &&
                selectedOperatorId === "ALL" && (
                  <span className="text-[11px] text-slate-400 italic font-medium ml-1">
                    (Toque para filtros de Data e Operador)
                  </span>
                )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-indigo-650 shrink-0 select-none">
            {filtersCollapsed ? (
              <>
                <span>Mais Filtros</span>
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                <span>Recolher</span>
                <ChevronUp size={14} />
              </>
            )}
          </div>
        </button>

        {!filtersCollapsed && (
          <div
            className={`flex flex-col md:flex-row bg-white animate-in slide-in-from-top-1 duration-150 ${isPintura ? "p-2.5 gap-2" : "p-4 gap-4"}`}
          >
            <div className="flex-1 relative">
              <label
                className={`block font-bold text-slate-500 uppercase tracking-wider ${isPintura ? "text-[9px] mb-1" : "text-xs mb-1.5"}`}
              >
                Palavra-chave (Produto, cliente, pedido, status...)
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={isPintura ? 14 : 18}
                />
                <input
                  type="text"
                  placeholder="Pesquisar por Código ou Cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-1.5 border border-slate-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700 placeholder-slate-400 ${isPintura ? "text-[11px]" : "text-sm"}`}
                />
              </div>
            </div>
            <div className="w-full md:w-64 relative flex gap-2">
              <div className="flex-1">
                <label
                  className={`block font-bold text-slate-500 uppercase tracking-wider ${isPintura ? "text-[9px] mb-1" : "text-xs mb-1.5"}`}
                >
                  Data Inicial
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-2.5 text-slate-400"
                    size={isPintura ? 14 : 18}
                  />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`pl-10 pr-2 py-1.5 border border-slate-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700 cursor-pointer ${isPintura ? "text-[11px]" : "text-sm"}`}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label
                  className={`block font-bold text-slate-500 uppercase tracking-wider ${isPintura ? "text-[9px] mb-1" : "text-xs mb-1.5"}`}
                >
                  Data Final
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`px-2.5 py-1.5 border border-slate-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700 cursor-pointer ${isPintura ? "text-[11px]" : "text-sm"}`}
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-60 relative">
              <label
                className={`block font-bold text-slate-500 uppercase tracking-wider ${isPintura ? "text-[9px] mb-1" : "text-xs mb-1.5"}`}
              >
                Operador Responsável
              </label>
              <div className="relative">
                <UserIcon
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={isPintura ? 14 : 18}
                />
                <select
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                  className={`pl-10 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700 cursor-pointer appearance-none ${isPintura ? "text-[11px]" : "text-sm"}`}
                >
                  <option value="ALL">Todos os Operadores</option>
                  {db.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* Clear filters button only shown when some filters are active */}
            {(searchTerm ||
              startDate ||
              endDate ||
              selectedOperatorId !== "ALL") && (
              <div className="flex items-end justify-start">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStartDate("");
                    setEndDate("");
                    setSelectedOperatorId("ALL");
                  }}
                  className="px-3.5 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 active:scale-95 text-xs font-bold transition-all w-full md:w-auto shrink-0 uppercase tracking-wider cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {logs.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center text-center">
            <p className="text-gray-500">
              Nenhum histórico encontrado para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.slice(0, visibleCount).map((l, index) => {
              const d = new Date(l.timestamp);

              let title =
                l.customProductName || l.thirdPartyName || l.processName || "";
              let subtitle = "";

              if (l.type === "CORTE_LASER") {
                if (l.orderId) {
                  const nest = db.nestTasks?.find((t) => t.id === l.orderId);
                  title = nest ? nest.partName : "Peça Desconhecida";
                  subtitle = nest ? `Medida: ${nest.size}` : "";
                } else {
                  const pieceOrProduct =
                    l.customProductName || (l as any).nestedPartName || "";
                  const thirdParty = l.thirdPartyName || "";
                  if (pieceOrProduct && thirdParty) {
                    title = `${pieceOrProduct} (${thirdParty})`;
                  } else {
                    title =
                      pieceOrProduct || thirdParty || "Corte Avulso Especial";
                  }
                  subtitle = "Corte Avulso / Manual";
                }
              } else if (l.type === "BANHO_QUIMICO") {
                const order = db.orders.find((o) => o.id === l.orderId);
                const item = order ? db.items.find((i) => i.id === order.itemId) : null;
                title = l.customProductName || item?.name || (order as any)?.customProductName || "Item Desconhecido";
                if (order) {
                  subtitle = `Pedido: ${order.orderCode} | Cli: ${order.customerName} | Status: ${order.status}`;
                } else if (l.thirdPartyName) {
                  subtitle = `Lançamento Avulso (Terceiro: ${l.thirdPartyName})`;
                } else {
                  subtitle = "Geral";
                }
              } else if (l.type === "EMBALAGEM") {
                if (l.orderId) {
                  const order = db.orders.find((o) => o.id === l.orderId);
                  const item = order ? db.items.find((i) => i.id === order.itemId) : null;
                  title = item?.name || (order as any)?.customProductName || "Item Desconhecido";
                  subtitle = `Pedido: ${order?.orderCode} | Cli: ${order?.customerName} | Status: ${order?.status}`;
                } else if (l.itemId) {
                  const item = db.items.find((i) => i.id === l.itemId);
                  title = item?.name || "Item Especial Avulso";
                  subtitle = "Embalagem Produto de Estoque / Avulsa";
                } else if (l.customProductName) {
                  title = l.customProductName;
                  subtitle = l.thirdPartyName ? `Embalagem (Terceiro: ${l.thirdPartyName})` : "Embalagem Avulsa / Manual";
                } else {
                  title = "Item Especial Avulso";
                  subtitle = "Embalagem Restante (Sem Vínculo)";
                }
              } else if (l.type === "INJETORA") {
                if (l.coilPlanId) {
                  const plan = db.coilCuttingPlans?.find((p) => p.id === l.coilPlanId);
                  if (plan) {
                    const targetItemId = plan.targetItemIds && plan.targetItemIds[0];
                    const targetItem = targetItemId ? db.items.find((i) => i.id === targetItemId) : null;
                    title = l.customProductName || targetItem?.name || plan.name;
                    subtitle = `Programa PCP: ${plan.name}`;
                  } else {
                    title = l.customProductName || "Injeção Plástica";
                    subtitle = "Programa PCP";
                  }
                } else {
                  title = l.customProductName || "Injeção Plástica Manual";
                  subtitle = l.thirdPartyName ? `Piloto / Amostra (Cliente: ${l.thirdPartyName})` : "Injeção Avulsa/Piloto";
                }
              } else if (l.orderId) {
                const order = db.orders.find((o) => o.id === l.orderId);
                if (order) {
                  const item = db.items.find((i) => i.id === order.itemId);
                  if (item && item.id !== 0) {
                    title = item.name;
                  } else if (!title) {
                    title = item ? item.name : (order as any).customProductName || "Item Desconhecido";
                  }
                  subtitle = `Pedido: ${order.orderCode} | Cli: ${order.customerName} | Status: ${order.status}`;
                } else if (!title) {
                  title = "Registro Desconhecido";
                }
              }

              if (!title || title === "Corte Avulso Especial" || title === "Item Especial Avulso" || title === "Item Desconhecido" || title === l.processName) {
                const targetId = (l as any).itemId || l.parentItemId;
                if (targetId) {
                  const item = db.items?.find((i) => i.id === targetId);
                  if (item) {
                    title = item.name;
                  }
                }
              }

              const operator = db.users.find((u) => u.id === l.operatorId);

              const qty =
                l.quantityCut ||
                l.quantityPainted ||
                l.quantityProcessed ||
                l.quantityPacked ||
                l.quantityInvoiced ||
                0;

              return (
                <div
                  key={l.id || `log-${l.timestamp || ""}-${index}`}
                  onClick={() => setSelectedLog(l)}
                  className={`historico-row bg-white border border-gray-150 rounded-lg shadow-3xs flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:border-indigo-400 hover:shadow-xs hover:bg-indigo-50/[0.04] active:scale-[0.995] transition-all duration-150 group ${isPintura ? "p-2.5 gap-2" : "p-4 gap-4"}`}
                  title="Clique para ver detalhes do apontamento"
                >
                  <div className="flex flex-col flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-1.5 py-0.2 rounded uppercase font-bold tracking-wider ${isPintura ? "text-[8px]" : "text-[10px]"} ${getActivityTypeColor(l.type)}`}
                      >
                        {l.type || "DESCONHECIDO"}
                      </span>
                      <span
                        className={`${isPintura ? "text-[10px]" : "text-xs"} text-gray-500 font-mono flex items-center gap-1`}
                      >
                        <Clock
                          size={isPintura ? 10 : 11}
                          className="text-gray-400 shrink-0"
                        />
                        {d.toLocaleDateString()} às{" "}
                        {d.toLocaleTimeString().slice(0, 5)}
                      </span>
                    </div>
                    <span
                      className={`font-bold text-gray-800 leading-tight group-hover:text-indigo-900 transition-colors truncate ${isPintura ? "text-xs md:text-sm" : "text-base md:text-lg"}`}
                    >
                      {title}
                    </span>
                    {(subtitle || l.customOperatorName) && (
                      <span
                        className={`${isPintura ? "text-[10px]" : "text-xs"} text-slate-500 mt-0.5 block truncate`}
                      >
                        {subtitle}{" "}
                        {l.customOperatorName
                          ? `| Op. Planilha: ${l.customOperatorName}`
                          : ""}
                      </span>
                    )}
                    {l.packagesConfig && l.packagesConfig.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-150 rounded w-fit">
                        📦 Embalado {l.packagesConfig.map((cnt: any) => `${cnt.boxes}cx x ${cnt.itemsPerBox}pçs`).join(", ")}
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex items-center md:w-1/2 md:justify-end border-t border-gray-100 pt-2 md:pt-0 md:border-t-0 ${isPintura ? "gap-3" : "gap-6"}`}
                  >
                    <div className="flex flex-col gap-0.5 w-20 text-left">
                      <span
                        className={`font-bold uppercase tracking-wider text-slate-400 ${isPintura ? "text-[8px]" : "text-[10px]"}`}
                      >
                        Quantidade
                      </span>
                      <span
                        className={`font-mono font-black text-gray-800 ${isPintura ? "text-base" : "text-xl"} flex flex-col items-start`}
                      >
                        {qty} <span className="text-[10px] text-gray-400 font-medium">pçs</span>
                        {l.declaredPackages ? (
                          <span className="text-[10px] text-teal-600 font-bold mt-0.5 leading-tight">
                            ({l.declaredPackages} {l.measurementUnit?.toLowerCase()})
                          </span>
                        ) : null}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 w-20 text-left">
                      <span
                        className={`font-bold uppercase tracking-wider text-slate-400 ${isPintura ? "text-[8px]" : "text-[10px]"}`}
                      >
                        Tempo
                      </span>
                      <span
                        className={`font-mono font-bold text-gray-600 ${isPintura ? "text-xs" : "text-sm"}`}
                      >
                        {formatDuration(l.durationMillis || 0)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 w-28 border-l pl-3 border-gray-200 text-left">
                      <span
                        className={`font-bold uppercase tracking-wider text-slate-400 ${isPintura ? "text-[8px]" : "text-[10px]"}`}
                      >
                        Operador
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium text-gray-700 truncate">
                        <UserIcon
                          size={isPintura ? 12 : 14}
                          className="text-gray-400 shrink-0"
                        />
                        <span
                          className={`truncate font-semibold text-slate-700 ${isPintura ? "text-[10px]" : "text-xs"}`}
                        >
                          {operator?.name ||
                            l.customOperatorName ||
                            "Desconhecido"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleCount < logs.length && (
              <div className="flex justify-center mt-4 mb-6">
                <button
                  onClick={() => setVisibleCount((c) => c + 50)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-8 rounded-full border border-indigo-200 transition-colors"
                >
                  Carregar Mais ({logs.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETALHES DO APONTAMENTO - MODAL CARD POPUP */}
      {selectedLog &&
        (() => {
          const d = new Date(selectedLog.timestamp);
          let itemTitle =
            selectedLog.customProductName ||
            selectedLog.thirdPartyName ||
            selectedLog.processName ||
            "";
          let itemCode = "";
          let orderInfo = null;
          let nestInfo = null;

          if (selectedLog.type === "INJETORA") {
            if (selectedLog.coilPlanId) {
              const plan = db.coilCuttingPlans?.find(
                (p) => p.id === selectedLog.coilPlanId,
              );
              if (plan) {
                const targetItemId = plan.targetItemIds && plan.targetItemIds[0];
                const targetItem = targetItemId
                  ? db.items.find((i) => i.id === targetItemId)
                  : null;
                itemTitle = selectedLog.customProductName || targetItem?.name || plan.name;
                if (targetItem) {
                  itemCode = targetItem.code;
                }
              }
            } else {
              itemTitle = selectedLog.customProductName || "Injeção Plástica Manual";
            }
          } else if (selectedLog.type === "CORTE_LASER") {
            if (selectedLog.orderId) {
              const nest = db.nestTasks?.find(
                (t) => t.id === selectedLog.orderId,
              );
              if (nest) {
                itemTitle = nest.partName;
                nestInfo = nest;
              }
            } else {
              const pieceOrProduct =
                selectedLog.customProductName ||
                (selectedLog as any).nestedPartName ||
                "";
              const thirdParty = selectedLog.thirdPartyName || "";
              if (pieceOrProduct && thirdParty) {
                itemTitle = `${pieceOrProduct} (${thirdParty})`;
              } else {
                itemTitle =
                  pieceOrProduct || thirdParty || "Corte Avulso Especial";
              }
            }
          } else if (selectedLog.type === "EMBALAGEM") {
            if (selectedLog.orderId) {
              const order = db.orders.find((o) => o.id === selectedLog.orderId);
              if (order) {
                const item = db.items.find((i) => i.id === order.itemId);
                itemTitle = item?.name || "Item Desconhecido";
                itemCode = item?.code;
                orderInfo = order;
              }
            } else if (selectedLog.itemId) {
              const item = db.items.find((i) => i.id === selectedLog.itemId);
              if (item) {
                itemTitle = item.name;
                itemCode = item.code;
              }
            } else if (selectedLog.customProductName) {
              itemTitle = selectedLog.customProductName;
            }
          } else if (selectedLog.orderId) {
            const order = db.orders.find((o) => o.id === selectedLog.orderId);
            if (order) {
              const item = db.items.find((i) => i.id === order.itemId);
              if (item && item.id !== 0) {
                itemTitle = item.name;
                itemCode = item.code;
              } else if (!itemTitle) {
                itemTitle = item ? item.name : "Item Desconhecido";
              }
              orderInfo = order;
            }
          }

          if (!itemTitle || itemTitle === "Corte Avulso Especial" || itemTitle === "Item Especial Avulso" || itemTitle === "Item Desconhecido" || itemTitle === selectedLog.processName) {
            const targetId = (selectedLog as any).itemId || selectedLog.parentItemId;
            if (targetId) {
              const item = db.items?.find((i) => i.id === targetId);
              if (item) {
                itemTitle = item.name;
                itemCode = item.code;
              }
            }
          }

          const operator = db.users.find(
            (u) => u.id === selectedLog.operatorId,
          );
          const qty =
            selectedLog.quantityCut ||
            selectedLog.quantityPainted ||
            selectedLog.quantityProcessed ||
            selectedLog.quantityPacked ||
            selectedLog.quantityInvoiced ||
            0;

          // Define friendly name for current activity types
          let qtyLabel = "Quantidade Registrada";
          let colorTheme = "indigo";
          switch (selectedLog.type) {
            case "EMBALAGEM":
              qtyLabel = "Qtd. Embalada";
              colorTheme = "amber";
              break;
            case "PINTURA":
              qtyLabel = "Qtd. Pintada";
              colorTheme = "rose";
              break;
            case "CORTE_LASER":
              qtyLabel = "Qtd. Cortada";
              colorTheme = "cyan";
              break;
            case "FATURAMENTO":
              qtyLabel = "Qtd. Faturada";
              colorTheme = "emerald";
              break;
            case "PRODUCAO":
              qtyLabel = "Qtd. Produzida";
              colorTheme = "indigo";
              break;
            case "BANHO_QUIMICO":
              qtyLabel = "Qtd. Processada";
              colorTheme = "blue";
              break;
            case "PRENSA_RAFAEL":
              qtyLabel = "Qtd. Estampada (Rafael)";
              colorTheme = "violet";
              break;
            case "PRENSA_EDUARDO":
              qtyLabel = "Qtd. Prensada (Eduardo)";
              colorTheme = "teal";
              break;
            case "TORNO_CNC_WILLIAN":
              qtyLabel = "Qtd. Torno (Willian)";
              colorTheme = "amber";
              break;
            case "TORNO_CNC_HENRIQUE":
              qtyLabel = "Qtd. Torno (Henrique)";
              colorTheme = "amber";
              break;
            case "INJETORA":
              qtyLabel = "Qtd. Injetada";
              colorTheme = "purple";
              break;
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header do Modal */}
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest ${getActivityTypeColor(selectedLog.type)}`}
                    >
                      {selectedLog.type || "APONTAMENTO"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ID: #{selectedLog.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Corpo do Modal (Scrollable) */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {isEditingLog ? (
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          Editar Título Manual (Texto Livre)
                        </span>
                        <input
                          type="text"
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
                          value={editCustomProductName}
                          onChange={(e) => setEditCustomProductName(e.target.value)}
                        />
                      </div>

                      {/* Vincular a um Produto/Peça do Catálogo */}
                      <div className="border border-slate-150 p-3 rounded-xl bg-slate-50/50 space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                          Vincular a um Item do Catálogo (Produto ou Peça)
                        </span>
                        {editItemId ? (
                          <div className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-lg">
                            <span className="text-xs font-semibold text-slate-800">
                              Selecionado: {db.items.find(i => i.id === editItemId)?.name || `ID #${editItemId}`} 
                              {db.items.find(i => i.id === editItemId) && ` (${db.items.find(i => i.id === editItemId)?.code})`}
                            </span>
                            <button
                              type="button"
                              onClick={() => { setEditItemId(undefined); setItemSearchQuery(""); }}
                              className="text-xs px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md font-bold transition-all cursor-pointer"
                            >
                              Limpar Vínculo
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 relative">
                            <input
                              type="text"
                              placeholder="Buscar item no catálogo por nome ou código..."
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                              value={itemSearchQuery}
                              onChange={(e) => setItemSearchQuery(e.target.value)}
                            />
                            {itemSearchQuery.trim() && (
                              <div className="absolute left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-lg z-50 max-h-40 overflow-y-auto p-1 mt-1 text-xs">
                                {(() => {
                                  const query = itemSearchQuery.toLowerCase().trim();
                                  if (!query) return [];
                                  const queryParts = query.split(/\s+/).filter(Boolean);
                                  
                                  return db.items
                                    .filter(i => {
                                      const nameLower = (i.name || "").toLowerCase();
                                      const codeLower = (i.code || "").toLowerCase();
                                      
                                      // Match if every typed word is present somewhere in the name or the code
                                      return queryParts.every(part => 
                                        nameLower.includes(part) || codeLower.includes(part)
                                      );
                                    })
                                    .slice(0, 150) // Bring all matching options (up to a safe limit of 150)
                                    .map(i => (
                                      <button
                                        key={i.id}
                                        type="button"
                                        className="w-full text-left p-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium block cursor-pointer"
                                        onClick={() => {
                                          setEditItemId(i.id);
                                          setItemSearchQuery("");
                                          if (!editCustomProductName) setEditCustomProductName(i.name);
                                        }}
                                      >
                                        {i.name} ({i.code})
                                      </button>
                                    ));
                                })()}
                                {db.items.filter(i => {
                                  const nameLower = (i.name || "").toLowerCase();
                                  const codeLower = (i.code || "").toLowerCase();
                                  const queryParts = itemSearchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
                                  return queryParts.every(part => nameLower.includes(part) || codeLower.includes(part));
                                }).length === 0 && (
                                  <div className="p-2 text-slate-400 text-center">
                                    Nenhum item com essa combinação de palavras/códigos found.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Vincular a um Pedido */}
                      <div className="border border-slate-150 p-3 rounded-xl bg-slate-50/50 space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                          Vincular a um Pedido de Venda
                        </span>
                        {editOrderId ? (
                          <div className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-lg">
                            <span className="text-xs font-semibold text-slate-800">
                              Selecionado: Pedido #{db.orders.find(o => o.id === editOrderId)?.orderCode} - {db.orders.find(o => o.id === editOrderId)?.customerName}
                            </span>
                            <button
                              type="button"
                              onClick={() => { setEditOrderId(undefined); setOrderSearchQuery(""); }}
                              className="text-xs px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md font-bold transition-all cursor-pointer"
                            >
                              Limpar Vínculo
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 relative">
                            <input
                              type="text"
                              placeholder="Buscar pedido por cód, cliente ou produto..."
                              className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                              value={orderSearchQuery}
                              onChange={(e) => setOrderSearchQuery(e.target.value)}
                            />
                            {orderSearchQuery.trim() && (
                              <div className="absolute left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-lg z-50 max-h-40 overflow-y-auto p-1 mt-1 text-xs">
                                {db.orders
                                  .filter(o => {
                                    const q = orderSearchQuery.toLowerCase();
                                    const itm = db.items.find(i => i.id === o.itemId);
                                    return (o.orderCode || '').toLowerCase().includes(q) || 
                                           (o.customerName || '').toLowerCase().includes(q) ||
                                           (itm?.name || '').toLowerCase().includes(q) ||
                                           (itm?.code || '').toLowerCase().includes(q) ||
                                           (o.customProductName || '').toLowerCase().includes(q);
                                  })
                                  .slice(0, 10)
                                  .map(o => {
                                    const itm = db.items.find(i => i.id === o.itemId);
                                    const prodDesc = itm?.name || o.customProductName || `Produto #${o.itemId}`;
                                    return (
                                      <button
                                        key={o.id}
                                        type="button"
                                        className={`w-full text-left p-1.5 hover:bg-slate-100 rounded font-medium block cursor-pointer flex flex-col gap-0.5 ${o.status === "FATURADO" ? "opacity-60" : "text-slate-700"}`}
                                        onClick={() => {
                                          setEditOrderId(o.id);
                                          setOrderSearchQuery("");
                                        }}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="font-bold text-indigo-700">Pedido #{o.orderCode}</div>
                                          {o.status === "FATURADO" && (
                                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded-sm font-bold tracking-wider">
                                              FATURADO
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate w-full">{o.customerName} | {prodDesc}</div>
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Vincular Peça de Nesting (para Corte Laser / Torno) */}
                      {((selectedLog.type === "CORTE_LASER" || selectedLog.type === "TORNO_CNC_WILLIAN") && db.nestTasks) && (
                        <div className="border border-slate-150 p-3 rounded-xl bg-slate-50/50 space-y-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                            Vincular Peça do Nesting de Corte
                          </span>
                          {editNestedPartName ? (
                            <div className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-lg">
                              <span className="text-xs font-semibold text-slate-800">
                                Peça Selecionada: {editNestedPartName}
                              </span>
                              <button
                                type="button"
                                onClick={() => { setEditNestedPartName(undefined); setNestSearchQuery(""); }}
                                className="text-xs px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md font-bold transition-all cursor-pointer"
                              >
                                Limpar Peça
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1 relative">
                              <input
                                type="text"
                                placeholder="Buscar peça do nesting..."
                                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                                value={nestSearchQuery}
                                onChange={(e) => setNestSearchQuery(e.target.value)}
                              />
                              {nestSearchQuery.trim() && (
                                <div className="absolute left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-lg z-50 max-h-40 overflow-y-auto p-1 mt-1 text-xs">
                                  {Array.from(new Set((db.nestTasks?.map(t => t.partName).filter(Boolean) || []) as string[]))
                                    .filter(name => name.toLowerCase().includes(nestSearchQuery.toLowerCase()))
                                    .slice(0, 5)
                                    .map(name => (
                                      <button
                                        key={name}
                                        type="button"
                                        className="w-full text-left p-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium block cursor-pointer"
                                        onClick={() => {
                                          setEditNestedPartName(name);
                                          setNestSearchQuery("");
                                          if (!editCustomProductName) setEditCustomProductName(name);
                                        }}
                                      >
                                        {name}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        Produto / Peça Relacionada
                      </span>
                      <h3 className="text-2xl font-black text-slate-800 leading-tight">
                        {itemTitle || "Item Especial Avulso"}
                      </h3>
                      {itemCode && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-2 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-md">
                          Código Sistema: {itemCode}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Métricas Principais (Bento-Grid Style) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        {qtyLabel}
                      </span>
                      {isEditingLog ? (
                        <input
                          type="number"
                          className="w-full mt-2 p-2 border border-slate-200 rounded-lg text-slate-800 font-mono text-xl"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-3xl font-black text-slate-800 font-mono mt-auto pt-2 flex items-baseline gap-1">
                          {qty}
                          <span className="text-xs font-bold text-slate-400">
                            {selectedLog.measurementUnit || "PÇS"}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        Tempo Consumido
                      </span>
                      <span className="text-xl font-bold text-slate-700 font-mono mt-auto pt-2 flex items-center gap-1.5">
                        <Clock size={16} className="text-indigo-500" />
                        {formatDuration(selectedLog.durationMillis || 0)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        Origem & Tipo
                      </span>
                      <span className="text-xs font-semibold text-slate-600 mt-auto pt-2 flex flex-col gap-0.5">
                        {selectedLog.customOperatorName ? (
                          <>
                            <span className="text-amber-700 font-bold flex items-center gap-1">
                              <FileSpreadsheet size={13} />
                              Planilha Importada
                            </span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">
                              Ref: {selectedLog.customOperatorName}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-indigo-700 font-bold flex items-center gap-1">
                              <Activity size={13} />
                              Aplicativo Direto
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Fila Local / Supervisor
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Bloco Operador */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <UserIcon
                        size={14}
                        className="text-slate-400 animate-pulse"
                      />
                      Responsável pelo Apontamento
                    </h4>
                    {isEditingLog ? (
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">Selecione o Operador</span>
                        <select
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm font-semibold bg-white outline-none"
                          value={editOperatorId}
                          onChange={(e) => setEditOperatorId(e.target.value)}
                        >
                          {db.users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role || "Operador"})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base shadow-inner">
                          {(operator?.name ||
                            selectedLog.customOperatorName ||
                            "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-700 text-sm">
                            {operator?.name ||
                              selectedLog.customOperatorName ||
                              "Operador Desconhecido"}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                              {operator?.role || "OPERADOR"}
                            </span>
                            {operator?.id && (
                              <span className="font-mono text-[9px] text-slate-400">
                                Matrícula: {operator.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bloco Detalhado de Ordem de Produção / Lote */}
                  {orderInfo && (
                    <div className="border border-slate-150 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Clipboard size={16} className="text-indigo-600" />
                          <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                            Informações do Pedido Associado
                          </h4>
                        </div>
                        {orderInfo.isUrgent && (
                          <span className="bg-red-150 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse border border-red-200">
                            URGENTE
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">
                            Código do Lote/Pedido
                          </span>
                          <span className="text-slate-800 font-mono font-bold text-sm bg-slate-50 px-2 py-1 rounded">
                            {orderInfo.orderCode || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">
                            Cliente
                          </span>
                          <span className="text-slate-800 font-semibold truncate block">
                            {orderInfo.customerName || "Venda Direta / Interna"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">
                            Status do Lote
                          </span>
                          <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {orderInfo.status
                              ? orderInfo.status.replace(/_/g, " ")
                              : "Ativo"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">
                            Data de Entrega
                          </span>
                          <span className="text-slate-700 font-mono font-semibold">
                            {orderInfo.deliveryDate
                              ? orderInfo.deliveryDate
                                  .split("-")
                                  .reverse()
                                  .join("/")
                              : "Sem data"}
                          </span>
                        </div>
                      </div>

                      {/* Progress indicator bar on current Order quantities if visible */}
                      <div className="border-t border-slate-100 pt-3.5 space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">
                            Progresso do Pedido em Volume
                          </span>
                          <span className="text-indigo-700 font-mono">
                            {orderInfo.packedQuantity} /{" "}
                            {orderInfo.totalQuantity} mtd (
                            {Math.min(
                              100,
                              Math.round(
                                (orderInfo.packedQuantity /
                                  orderInfo.totalQuantity) *
                                  100,
                              ),
                            ) || 0}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.round((orderInfo.packedQuantity / orderInfo.totalQuantity) * 100)) || 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedLog.packagesConfig && selectedLog.packagesConfig.length > 0 && (
                    <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200 text-xs space-y-2">
                      <h5 className="font-bold text-amber-900 border-b border-amber-200 pb-1.5 uppercase text-[10px] tracking-wider flex items-center gap-1">
                        📦 Distribuição das Embalagens
                      </h5>
                      <div className="space-y-1 mt-2">
                        {selectedLog.packagesConfig.map((cnt: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-amber-100 font-medium">
                            <span className="text-slate-600">Grupo #{idx + 1}</span>
                            <span className="font-mono font-bold text-amber-900 bg-amber-50/50 px-2 py-0.5 rounded">{cnt.boxes} caixas x {cnt.itemsPerBox} peças</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Banho Químico and specific operational properties */}
                  {(selectedLog.thirdPartyName ||
                    selectedLog.processPerformed ||
                    selectedLog.customProductName ||
                    selectedLog.parentItemId) && (
                    <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 text-xs space-y-2">
                      <h5 className="font-bold text-indigo-900 border-b border-indigo-100/60 pb-1.5 uppercase text-[10px] tracking-wider">
                        Atributos Auxiliares de Processo
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-slate-700 font-mono">
                        {selectedLog.thirdPartyName && (
                          <div>
                            <strong className="text-slate-500 font-sans">
                              Terceiro:
                            </strong>{" "}
                            {selectedLog.thirdPartyName}
                          </div>
                        )}
                        {selectedLog.processPerformed && (
                          <div>
                            <strong className="text-slate-500 font-sans">
                              Etapa:
                            </strong>{" "}
                            {selectedLog.processPerformed}
                          </div>
                        )}
                        {selectedLog.measurementUnit && (
                          <div>
                            <strong className="text-slate-500 font-sans">
                              Unidade:
                            </strong>{" "}
                            {selectedLog.measurementUnit}
                          </div>
                        )}
                        {selectedLog.parentItemId && (
                          <div>
                            <strong className="text-slate-500 font-sans">
                              Item Pai ID:
                            </strong>{" "}
                            {selectedLog.parentItemId}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rodapé Interno: Timestamp Detalhado */}
                  <div className="bg-slate-100 text-[11px] font-semibold text-slate-500 p-3 rounded-lg text-center flex flex-wrap items-center justify-center gap-1">
                    <span>Horário Oficial Gravação:</span>
                    <span className="font-mono text-slate-700">
                      {d.toLocaleDateString()} às {d.toLocaleTimeString()} (UTC{" "}
                      {d.getHours()}:{d.getMinutes()})
                    </span>
                  </div>
                </div>

                {/* Botão de Fechar ou Controles de Edição */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
                  {(currentUser.role === "GERENCIA" || currentUser.role === "ADMIN") ? (
                    <div className="flex flex-wrap gap-2">
                      {isEditingLog ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveLog}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
                          >
                            Salvar Alterações
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingLog(false)}
                            className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white font-bold text-sm rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteLog}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
                          >
                            Excluir Registro
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingLog(selectedLog)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
                        >
                          Editar Apontamento
                        </button>
                      )}
                    </div>
                  ) : (
                    <div />
                  )}

                  {!isEditingLog && (
                    <button
                      type="button"
                      onClick={() => setSelectedLog(null)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl active:scale-95 transition-all shadow-md cursor-pointer ml-auto"
                    >
                      Fechar Detalhes
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
