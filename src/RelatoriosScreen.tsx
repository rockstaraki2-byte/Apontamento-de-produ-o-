import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  AlertCircle,
  CheckCircle,
  Plus,
  Sparkles,
  Settings,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { User, ProductionLog } from "./types";
import { ProdutividadeConfigModal } from "./ProdutividadeConfigModal";
import { RelatorioCorteLaserTab } from "./RelatorioCorteLaserTab";
import { MetasProducaoTab } from "./components/MetasProducaoTab";
import { ScreenLayout, ScrollContainer } from "./components/Layout";

export function RelatoriosScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [reportType, setReportType] = useState<
    "PRODUTIVIDADE" | "RASTREAMENTO" | "ESTOQUE" | "EPIS" | "CORTE_LASER" | "METAS"
  >("PRODUTIVIDADE");
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>("TODAS");
  const [visibleLogsCount, setVisibleLogsCount] = useState(30);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Advanced sector-wise productivity logic that compares the latest collection with the prior average
  const sectorProductivityMetrics = useMemo(() => {
    const list = [
      {
        id: "CORTE_LASER",
        name: "Corte a Laser",
        benchmark: 20.0,
        colorTheme: "indigo",
        bgTheme: "indigo-50/30",
        borderTheme: "border-indigo-100",
      },
      {
        id: "PINTURA",
        name: "Pintura",
        benchmark: 35.0,
        colorTheme: "amber",
        bgTheme: "amber-50/30",
        borderTheme: "border-amber-100",
      },
      {
        id: "EMBALAGEM",
        name: "Embalagem",
        benchmark: 40.0,
        colorTheme: "green",
        bgTheme: "green-50/30",
        borderTheme: "border-green-100",
      },
      {
        id: "MONTAGEM_RETRATIL",
        name: "Montagem de Retrátil",
        benchmark: 15.0,
        colorTheme: "purple",
        bgTheme: "purple-50/30",
        borderTheme: "border-purple-100",
      },
      {
        id: "MONTAGEM_RODRIGO",
        name: "Pendurar Barra chata",
        benchmark: 15.0,
        colorTheme: "pink",
        bgTheme: "pink-50/30",
        borderTheme: "border-pink-100",
      },
      {
        id: "PRENSA_EDUARDO",
        name: "Prensa Eduardo",
        benchmark: 10.0,
        colorTheme: "sky",
        bgTheme: "sky-50/30",
        borderTheme: "border-sky-100",
      },
      {
        id: "PRENSA_RAFAEL",
        name: "Prensa Rafael",
        benchmark: 10.0,
        colorTheme: "teal",
        bgTheme: "teal-50/30",
        borderTheme: "border-teal-100",
      },
      {
        id: "INJETORA",
        name: "Injetora",
        benchmark: 25.0,
        colorTheme: "rose",
        bgTheme: "rose-50/30",
        borderTheme: "border-rose-100",
      },
      {
        id: "BANHO_QUIMICO",
        name: "Banho Químico",
        benchmark: 18.0,
        colorTheme: "cyan",
        bgTheme: "cyan-50/30",
        borderTheme: "border-cyan-100",
      },
    ];

    // Find all welders dynamically
    const welders = new Set<string>();
    db.logs.forEach((l) => {
      if (l.operatorId && l.operatorId.startsWith("solda - ")) {
        const parts = l.operatorId.split(" - ");
        if (parts[1]) {
          welders.add(parts[1].trim());
        }
      }
    });

    if (welders.size > 0) {
      welders.forEach((welder) => {
        list.push({
          id: `SOLDA_${welder}`,
          name: `Solda - ${welder}`,
          benchmark: 12.0,
          colorTheme: "blue",
          bgTheme: "blue-50/30",
          borderTheme: "border-blue-100",
        });
      });
      list.push({
        id: "SOLDA_GERAL",
        name: "Solda Geral",
        benchmark: 12.0,
        colorTheme: "blue",
        bgTheme: "blue-50/30",
        borderTheme: "border-blue-100",
      });
    } else {
      list.push({
        id: "SOLDA",
        name: "Solda / Soldador",
        benchmark: 12.0,
        colorTheme: "blue",
        bgTheme: "blue-50/30",
        borderTheme: "border-blue-100",
      });
    }

    const getLogQty = (l: ProductionLog) => {
      return (
        l.quantityCut ||
        l.quantityProcessed ||
        l.quantityPainted ||
        l.quantityPacked ||
        l.quantityInvoiced ||
        0
      );
    };

    const getLogMatches = (l: ProductionLog, sectorId: string) => {
      const baseOperatorId = (l.operatorId || "").split(" - ")[0];
      const u = db.users.find((usr) => usr.id === baseOperatorId);
      const role = u?.role || "";

      if (sectorId.startsWith("SOLDA_")) {
        if (sectorId !== "SOLDA_GERAL") {
          const welderName = sectorId.substring(6);
          return l.operatorId === `solda - ${welderName}`;
        } else {
          return (
            l.operatorId === "solda" ||
            (!l.operatorId.includes(" - ") &&
              l.type === "PRODUCAO" &&
              role === "SOLDA")
          );
        }
      }

      if (sectorId === "SOLDA") {
        return (
          l.type === "PRODUCAO" &&
          (role === "SOLDA" ||
            l.operatorId === "solda" ||
            l.operatorId.startsWith("solda - "))
        );
      }

      if (sectorId === "CORTE_LASER")
        return l.type === "CORTE_LASER" || role === "CORTE_LASER";
      if (sectorId === "PINTURA")
        return l.type === "PINTURA" || role === "PINTURA";
      if (sectorId === "EMBALAGEM")
        return l.type === "EMBALAGEM" || role === "EMBALAGEM";
      if (sectorId === "MONTAGEM_RETRATIL") {
        return (
          (l.type === "PRODUCAO" && role === "MONTAGEM_RETRATIL") ||
          l.operatorId === "montagem_retratil"
        );
      }
      if (sectorId === "MONTAGEM_RODRIGO") {
        return (
          (l.type === "PRODUCAO" && role === "MONTAGEM_RODRIGO") ||
          l.operatorId === "montagem_rodrigo"
        );
      }
      if (sectorId === "PRENSA_EDUARDO") {
        return (
          l.type === "PRENSA_EDUARDO" ||
          role === "PRENSA_EDUARDO" ||
          l.operatorId === "prensa_eduardo"
        );
      }
      if (sectorId === "TORNO_CNC_WILLIAN") {
        return (
          l.type === "TORNO_CNC_WILLIAN" ||
          role === "TORNO_CNC_WILLIAN" ||
          l.operatorId === "torno_cnc_willian"
        );
      }
      if (sectorId === "TORNO_CNC_HENRIQUE") {
        return (
          l.type === "TORNO_CNC_HENRIQUE" ||
          role === "TORNO_CNC_HENRIQUE" ||
          l.operatorId === "torno_cnc_henrique"
        );
      }
      if (sectorId === "TORNO_CNC_WILLIAN") {
        return (
          l.type === "TORNO_CNC_WILLIAN" ||
          role === "TORNO_CNC_WILLIAN" ||
          l.operatorId === "torno_cnc_willian"
        );
      }
      if (sectorId === "TORNO_CNC_HENRIQUE") {
        return (
          l.type === "TORNO_CNC_HENRIQUE" ||
          role === "TORNO_CNC_HENRIQUE" ||
          l.operatorId === "torno_cnc_henrique"
        );
      }
      if (sectorId === "PRENSA_RAFAEL") {
        return (
          l.type === "PRENSA_RAFAEL" ||
          role === "PRENSA_RAFAEL" ||
          l.operatorId === "prensa_rafael"
        );
      }
      if (sectorId === "INJETORA") {
        return (
          l.type === "INJETORA" ||
          role === "INJETORA" ||
          l.operatorId === "injetora"
        );
      }
      if (sectorId === "BANHO_QUIMICO") {
        return (
          l.type === "BANHO_QUIMICO" ||
          role === "BANHO_QUIMICO" ||
          l.operatorId === "banho_quimico"
        );
      }

      return l.type === sectorId;
    };

    return list.map((sect) => {
      // Filter logs of this sector type and sort oldest to newest
      const sectLogs = db.logs
        .filter((l) => getLogMatches(l, sect.id))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (sectLogs.length === 0) {
        return {
          id: sect.id,
          name: sect.name,
          hasData: false,
          lastLog: null,
          lastQty: 0,
          lastTimeMinutes: 0,
          lastPPH: 0,
          avgPriorPPH: sect.benchmark,
          perfPercent: 0,
          status: "Sem Coletas",
          statusColor: "text-gray-500 bg-gray-100 border-gray-200",
          colorTheme: sect.colorTheme,
          bgTheme: sect.bgTheme,
          borderTheme: sect.borderTheme,
          priorCount: 0,
          operatorName: "Nenhum",
          itemName: "-",
          orderCode: "-",
        };
      }

      // The latest log is the last element
      const lastLog = sectLogs[sectLogs.length - 1];
      // Previous logs
      const priorLogs = sectLogs.slice(0, sectLogs.length - 1);

      const lastQty = getLogQty(lastLog);
      const lastDurationMillis = lastLog.durationMillis || 10 * 60 * 1000; // 10 minutes fallback if 0
      const lastTimeMinutes = Math.round(lastDurationMillis / 60000) || 10;
      const lastPPH = lastQty / (lastDurationMillis / (1000 * 60 * 60));

      // Calculate the average of all prior logs
      let avgPriorPPH = sect.benchmark;
      if (priorLogs.length > 0) {
        const rates = priorLogs.map((l) => {
          const q = getLogQty(l);
          const d = l.durationMillis || 10 * 60 * 1000;
          return q / (d / (1000 * 60 * 60));
        });
        avgPriorPPH = rates.reduce((sum, r) => sum + r, 0) / rates.length;
      }

      // Comparison percent difference
      const perfPercent =
        avgPriorPPH > 0 ? ((lastPPH - avgPriorPPH) / avgPriorPPH) * 100 : 0;
      const isProductive = lastPPH >= avgPriorPPH;

      let status = "⚠️ Abaixo da Média";
      let statusColor = "text-red-700 bg-red-50 border-red-200";
      if (isProductive) {
        status = "✅ Produtivo";
        statusColor = "text-green-700 bg-green-50 border-green-200";
      }

      const operatorName =
        db.users.find((u) => u.id === lastLog.operatorId.split(" - ")[0])
          ?.name || lastLog.operatorId;
      const associatedOrder = db.orders.find((o) => o.id === lastLog.orderId);
      const itemName =
        db.items.find((i) => i.id === associatedOrder?.itemId)?.name ||
        "Lote Geral";
      const orderCode = associatedOrder?.orderCode || "Padrão";

      return {
        id: sect.id,
        name: sect.name,
        hasData: true,
        lastLog,
        lastQty,
        lastTimeMinutes,
        lastPPH,
        avgPriorPPH,
        perfPercent,
        status,
        statusColor,
        colorTheme: sect.colorTheme,
        bgTheme: sect.bgTheme,
        borderTheme: sect.borderTheme,
        priorCount: priorLogs.length,
        operatorName,
        itemName,
        orderCode,
      };
    });
  }, [db.logs, db.orders, db.items, db.users]);

  // For backward compatibility and traceability logs
  const traceLogs = useMemo(() => {
    let logs = db.logs;
    if (selectedOrderCode !== "TODAS") {
      const matchingOrders = db.orders
        .filter((o) => o.orderCode === selectedOrderCode)
        .map((o) => o.id);
      logs = logs.filter((l) => matchingOrders.includes(l.orderId));
    }

    return logs
      .map((l) => {
        const order = db.orders.find((o) => o.id === l.orderId);
        const item = db.items.find((i) => i.id === order?.itemId);
        const operator = db.users.find((u) => u.id === l.operatorId);

        return {
          id: l.id,
          date: new Date(l.timestamp).toLocaleString(),
          orderCode: order?.orderCode || "-",
          item: item?.name || "-",
          sector: l.type || "-",
          quantity:
            l.quantityProcessed ||
            l.quantityCut ||
            l.quantityPainted ||
            l.quantityPacked ||
            l.quantityInvoiced ||
            0,
          operator: operator?.name || l.operatorId,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.logs, db.orders, db.items, db.users, selectedOrderCode]);

  // Stock movements
  const stockMovementsFormatted = useMemo(() => {
    const movements = db.stockMovements || [];
    return movements
      .map((m) => {
        const item = db.items.find((i) => i.id === m.itemId);
        return {
          id: m.id,
          date: new Date(m.timestamp).toLocaleString("pt-BR"),
          itemCodeName: item
            ? `${item.code} - ${item.name}`
            : `ID: ${m.itemId}`,
          attrs: `${m.color || "-"} | ${m.size || "-"} | ${m.variation || "-"}`,
          quantity: m.quantity,
          type: m.type,
          description: m.description,
          timestamp: m.timestamp,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [db.stockMovements, db.items]);

  const uniqueOrders = useMemo(() => {
    const codes = new Set(db.orders.map((o) => o.orderCode));
    return Array.from(codes);
  }, [db.orders]);

  const pointsByOperatorReport = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        logCount: number;
        qtyTotal: number;
        totalPoints: number;
      }
    >();

    db.logs.forEach((log) => {
      const qty =
        (log.quantityProcessed || 0) +
        (log.quantityCut || 0) +
        (log.quantityPainted || 0) +
        (log.quantityPacked || 0);
      if (qty <= 0) return;

      let itemId: number | undefined = log.itemId;
      if (!itemId) {
        if (log.type === "CORTE_LASER" && log.orderId) {
          const nestTask = db.nestTasks.find((t) => t.id === log.orderId);
          if (nestTask) {
            const itemsWithSameName = db.items.filter((i) =>
              i.name.toLowerCase().includes(nestTask.partName.toLowerCase()),
            );
            itemId = itemsWithSameName[0]?.id;
          }
        } else if (log.orderId) {
          const order = db.orders.find((o) => o.id === log.orderId);
          if (order) {
            itemId = order.itemId;
          }
        } else if (log.parentItemId) {
          itemId = log.parentItemId;
        } else if (log.customProductName) {
          const matched = db.items.find(
            (i) =>
              i.name.toLowerCase() === log.customProductName?.toLowerCase(),
          );
          if (matched) itemId = matched.id;
        }
      }

      let productionPoints = 0;
      if (itemId) {
        const item = db.items.find((i) => i.id === itemId);
        if (item && item.productionPoints) {
          productionPoints = item.productionPoints;
        }
      }

      const pointsEarned = productionPoints * qty;

      const opId = log.operatorId || "desconhecido";
      const matchedUser = db.users.find((u) => u.id === opId);
      
      // Exclude GERENCIA and PCP actions/points from the ranking report
      if (matchedUser && (matchedUser.role === "GERENCIA" || matchedUser.role === "PCP")) {
        return;
      }

      const opName = matchedUser?.name || log.operatorName || opId;

      const existing = map.get(opId) || {
        userId: opId,
        userName: opName,
        logCount: 0,
        qtyTotal: 0,
        totalPoints: 0,
      };

      existing.logCount += 1;
      existing.qtyTotal += qty;
      existing.totalPoints += pointsEarned;

      map.set(opId, existing);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );
  }, [db.logs, db.items, db.users, db.orders, db.nestTasks]);

  const shiftVs7DaysMetrics = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    const list = [
      { id: "CORTE_LASER", name: "Corte a Laser", benchmark: 20.0 },
      { id: "PINTURA", name: "Pintura", benchmark: 35.0 },
      { id: "EMBALAGEM", name: "Embalagem", benchmark: 40.0 },
      {
        id: "MONTAGEM_RETRATIL",
        name: "Montagem de Retrátil",
        benchmark: 15.0,
      },
      { id: "MONTAGEM_RODRIGO", name: "Pendurar Barra chata", benchmark: 15.0 },
      { id: "PRENSA_EDUARDO", name: "Prensa Eduardo", benchmark: 10.0 },
      { id: "TORNO_CNC_WILLIAN", name: "Torno CNC Willian", benchmark: 10.0 },
      { id: "TORNO_CNC_HENRIQUE", name: "Torno CNC Henrique", benchmark: 10.0 },
      { id: "PRENSA_RAFAEL", name: "Prensa Rafael", benchmark: 10.0 },
      { id: "INJETORA", name: "Injetora", benchmark: 25.0 },
      { id: "BANHO_QUIMICO", name: "Banho Químico", benchmark: 18.0 },
    ];

    // Find all welders dynamically
    const welders = new Set<string>();
    db.logs.forEach((l) => {
      if (l.operatorId && l.operatorId.startsWith("solda - ")) {
        const parts = l.operatorId.split(" - ");
        if (parts[1]) {
          welders.add(parts[1].trim());
        }
      }
    });

    if (welders.size > 0) {
      welders.forEach((welder) => {
        list.push({
          id: `SOLDA_${welder}`,
          name: `Solda - ${welder}`,
          benchmark: 12.0,
        });
      });
      list.push({
        id: "SOLDA_GERAL",
        name: "Solda Geral",
        benchmark: 12.0,
      });
    } else {
      list.push({
        id: "SOLDA",
        name: "Solda / Soldador",
        benchmark: 12.0,
      });
    }

    const getLogQty = (l: ProductionLog) => {
      return (
        l.quantityCut ||
        l.quantityProcessed ||
        l.quantityPainted ||
        l.quantityPacked ||
        l.quantityInvoiced ||
        0
      );
    };

    const getLogHours = (l: ProductionLog) => {
      const d = l.durationMillis || 10 * 60 * 1000;
      return d / (1000 * 60 * 60);
    };

    const getLogMatches = (l: ProductionLog, sectorId: string) => {
      const baseOperatorId = (l.operatorId || "").split(" - ")[0];
      const u = db.users.find((usr) => usr.id === baseOperatorId);
      const role = u?.role || "";

      if (sectorId.startsWith("SOLDA_")) {
        if (sectorId !== "SOLDA_GERAL") {
          const welderName = sectorId.substring(6);
          return l.operatorId === `solda - ${welderName}`;
        } else {
          return (
            l.operatorId === "solda" ||
            (!l.operatorId.includes(" - ") &&
              l.type === "PRODUCAO" &&
              role === "SOLDA")
          );
        }
      }

      if (sectorId === "SOLDA") {
        return (
          l.type === "PRODUCAO" &&
          (role === "SOLDA" ||
            l.operatorId === "solda" ||
            l.operatorId.startsWith("solda - "))
        );
      }

      if (sectorId === "CORTE_LASER")
        return l.type === "CORTE_LASER" || role === "CORTE_LASER";
      if (sectorId === "PINTURA")
        return l.type === "PINTURA" || role === "PINTURA";
      if (sectorId === "EMBALAGEM")
        return l.type === "EMBALAGEM" || role === "EMBALAGEM";
      if (sectorId === "MONTAGEM_RETRATIL") {
        return (
          (l.type === "PRODUCAO" && role === "MONTAGEM_RETRATIL") ||
          l.operatorId === "montagem_retratil"
        );
      }
      if (sectorId === "MONTAGEM_RODRIGO") {
        return (
          (l.type === "PRODUCAO" && role === "MONTAGEM_RODRIGO") ||
          l.operatorId === "montagem_rodrigo"
        );
      }
      if (sectorId === "PRENSA_EDUARDO") {
        return (
          l.type === "PRENSA_EDUARDO" ||
          role === "PRENSA_EDUARDO" ||
          l.operatorId === "prensa_eduardo"
        );
      }
      if (sectorId === "PRENSA_RAFAEL") {
        return (
          l.type === "PRENSA_RAFAEL" ||
          role === "PRENSA_RAFAEL" ||
          l.operatorId === "prensa_rafael"
        );
      }
      if (sectorId === "INJETORA") {
        return (
          l.type === "INJETORA" ||
          role === "INJETORA" ||
          l.operatorId === "injetora"
        );
      }
      if (sectorId === "BANHO_QUIMICO") {
        return (
          l.type === "BANHO_QUIMICO" ||
          role === "BANHO_QUIMICO" ||
          l.operatorId === "banho_quimico"
        );
      }

      return l.type === sectorId;
    };

    return list.map((sect) => {
      const sectLogs = db.logs.filter((l) => getLogMatches(l, sect.id));

      // Turno Atual (last 24h)
      const shiftLogs = sectLogs.filter((l) => l.timestamp >= now - oneDayMs);
      let shiftPPH = 0;
      let shiftQtySum = 0;
      let shiftHoursSum = 0;

      if (shiftLogs.length > 0) {
        shiftQtySum = shiftLogs.reduce((sum, l) => sum + getLogQty(l), 0);
        shiftHoursSum = shiftLogs.reduce((sum, l) => sum + getLogHours(l), 0);
        shiftPPH = shiftHoursSum > 0 ? shiftQtySum / shiftHoursSum : 0;
      } else {
        // Fallback to latest single log
        const sorted = [...sectLogs].sort((a, b) => b.timestamp - a.timestamp);
        if (sorted.length > 0) {
          const l = sorted[0];
          shiftQtySum = getLogQty(l);
          shiftHoursSum = getLogHours(l);
          shiftPPH = shiftHoursSum > 0 ? shiftQtySum / shiftHoursSum : 0;
        }
      }

      // Últimos 7 dias (last 7 days logs)
      const last7DaysLogs = sectLogs.filter(
        (l) => l.timestamp >= now - sevenDaysMs,
      );
      let avg7DaysPPH = sect.benchmark;

      if (last7DaysLogs.length > 0) {
        const qtySum = last7DaysLogs.reduce((sum, l) => sum + getLogQty(l), 0);
        const hoursSum = last7DaysLogs.reduce(
          (sum, l) => sum + getLogHours(l),
          0,
        );
        avg7DaysPPH = hoursSum > 0 ? qtySum / hoursSum : sect.benchmark;
      } else if (sectLogs.length > 0) {
        const qtySum = sectLogs.reduce((sum, l) => sum + getLogQty(l), 0);
        const hoursSum = sectLogs.reduce((sum, l) => sum + getLogHours(l), 0);
        avg7DaysPPH = hoursSum > 0 ? qtySum / hoursSum : sect.benchmark;
      }

      const isBelow = shiftPPH < avg7DaysPPH;
      const pctDiff =
        avg7DaysPPH > 0 ? ((shiftPPH - avg7DaysPPH) / avg7DaysPPH) * 100 : 0;

      return {
        id: sect.id,
        name: sect.name,
        shiftPPH,
        shiftQtySum,
        shiftHoursSum,
        avg7DaysPPH,
        isBelow,
        pctDiff,
        hasData: sectLogs.length > 0,
      };
    });
  }, [db.logs, db.users]);

  // Simulator State
  const [simulatorSector, setSimulatorSector] = useState("CORTE_LASER");
  const [simulatorQty, setSimulatorQty] = useState(30);
  const [simulatorTimeMinutes, setSimulatorTimeMinutes] = useState(15);
  const [simulatorOperator, setSimulatorOperator] = useState("producao");
  const [simulatorSuccessMsg, setSimulatorSuccessMsg] = useState<string | null>(
    null,
  );
  const [selectedEpiSectorId, setSelectedEpiSectorId] = useState<number | "">(
    "",
  );

  const handleSimulateAddLog = async () => {
    // Generates a mock order or selects any default order to associate
    const associatedOrder = db.orders[0] || {
      id: 99999,
      orderCode: "SIMULADO",
    };
    const durationMillis = simulatorTimeMinutes * 60 * 1000;

    let resolvedType = simulatorSector;
    let resolvedOperator = simulatorOperator;

    if (
      ["MONTAGEM_RETRATIL", "MONTAGEM_RODRIGO", "SOLDA"].includes(
        simulatorSector,
      )
    ) {
      resolvedType = "PRODUCAO";
      if (simulatorSector === "MONTAGEM_RETRATIL")
        resolvedOperator = "montagem_retratil";
      else if (simulatorSector === "MONTAGEM_RODRIGO")
        resolvedOperator = "montagem_rodrigo";
      else if (simulatorSector === "SOLDA") {
        resolvedOperator = simulatorOperator.startsWith("solda")
          ? simulatorOperator
          : `solda - ${simulatorOperator}`;
      }
    }

    const mockLog: ProductionLog = {
      id: Date.now(),
      orderId: associatedOrder.id,
      operatorId: resolvedOperator,
      timestamp: Date.now(),
      durationMillis,
      type: resolvedType as any,
    };

    if (simulatorSector === "CORTE_LASER") mockLog.quantityCut = simulatorQty;
    else if (simulatorSector === "PINTURA")
      mockLog.quantityPainted = simulatorQty;
    else if (simulatorSector === "EMBALAGEM")
      mockLog.quantityPacked = simulatorQty;
    else if (simulatorSector === "PRENSA_EDUARDO") {
      mockLog.type = "PRENSA_EDUARDO";
      mockLog.operatorId = "prensa_eduardo";
      mockLog.quantityProcessed = simulatorQty;
    }
    else if (simulatorSector === "TORNO_CNC_WILLIAN") {
      mockLog.type = "TORNO_CNC_WILLIAN";
      mockLog.operatorId = "torno_cnc_willian";
      mockLog.quantityProcessed = simulatorQty;
    }
    else if (simulatorSector === "TORNO_CNC_HENRIQUE") {
      mockLog.type = "TORNO_CNC_HENRIQUE";
      mockLog.operatorId = "torno_cnc_henrique";
      mockLog.quantityProcessed = simulatorQty;
    } else if (simulatorSector === "PRENSA_RAFAEL") {
      mockLog.type = "PRENSA_RAFAEL";
      mockLog.operatorId = "prensa_rafael";
      mockLog.quantityProcessed = simulatorQty;
    } else if (simulatorSector === "INJETORA") {
      mockLog.type = "INJETORA";
      mockLog.operatorId = "injetora";
      mockLog.quantityProcessed = simulatorQty;
    } else if (simulatorSector === "BANHO_QUIMICO") {
      mockLog.type = "BANHO_QUIMICO";
      mockLog.operatorId = "banho_quimico";
      mockLog.quantityProcessed = simulatorQty;
    } else {
      mockLog.quantityProcessed = simulatorQty;
    }

    await db.addLogs([mockLog]);

    setSimulatorSuccessMsg(
      "Coleta histórica adicionada com sucesso! Os cards e a tabela abaixo foram recalculados.",
    );
    setTimeout(() => setSimulatorSuccessMsg(null), 5050);
  };

  const handleLoadSampleDatabase = async () => {
    // Generate an automated seed database of previous collections
    const associatedOrder = db.orders[0] || {
      id: 99999,
      orderCode: "HISTORICO",
    };

    // We add multiple logs representing past runs with low / high speeds to build a beautiful comparative average.
    const samples: ProductionLog[] = [
      // CORTE LASER: Prior avg will be 18 PPH
      {
        id: Date.now() - 500000,
        orderId: associatedOrder.id,
        operatorId: "cortelaser_giovani",
        timestamp: Date.now() - 500000,
        durationMillis: 20 * 60 * 1000,
        type: "CORTE_LASER",
        quantityCut: 6,
      }, // 18 PPH
      {
        id: Date.now() - 400000,
        orderId: associatedOrder.id,
        operatorId: "cortelaser_clovis",
        timestamp: Date.now() - 400000,
        durationMillis: 30 * 60 * 1000,
        type: "CORTE_LASER",
        quantityCut: 9,
      }, // 18 PPH

      // MONTAGEM RETRATIL
      {
        id: Date.now() - 390000,
        orderId: associatedOrder.id,
        operatorId: "montagem_retratil",
        timestamp: Date.now() - 390000,
        durationMillis: 60 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 14,
      },
      {
        id: Date.now() - 380500,
        orderId: associatedOrder.id,
        operatorId: "montagem_retratil",
        timestamp: Date.now() - 380500,
        durationMillis: 45 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 12,
      },

      // MONTAGEM RODRIGO
      {
        id: Date.now() - 370000,
        orderId: associatedOrder.id,
        operatorId: "montagem_rodrigo",
        timestamp: Date.now() - 370000,
        durationMillis: 60 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 16,
      },
      {
        id: Date.now() - 360500,
        orderId: associatedOrder.id,
        operatorId: "montagem_rodrigo",
        timestamp: Date.now() - 360500,
        durationMillis: 45 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 11,
      },

      // SOLDA - WELDER ADRIANO
      {
        id: Date.now() - 350000,
        orderId: associatedOrder.id,
        operatorId: "solda - Adriano",
        timestamp: Date.now() - 350000,
        durationMillis: 60 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 13,
      },
      {
        id: Date.now() - 340500,
        orderId: associatedOrder.id,
        operatorId: "solda - Adriano",
        timestamp: Date.now() - 340500,
        durationMillis: 45 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 10,
      },

      // SOLDA - WELDER MARCOS
      {
        id: Date.now() - 330000,
        orderId: associatedOrder.id,
        operatorId: "solda - Marcos",
        timestamp: Date.now() - 330000,
        durationMillis: 60 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 11,
      },
      {
        id: Date.now() - 320500,
        orderId: associatedOrder.id,
        operatorId: "solda - Marcos",
        timestamp: Date.now() - 320500,
        durationMillis: 45 * 60 * 1000,
        type: "PRODUCAO",
        quantityProcessed: 8,
      },

      // PINTURA: Prior avg will be 32 PPH
      {
        id: Date.now() - 200000,
        orderId: associatedOrder.id,
        operatorId: "pintura",
        timestamp: Date.now() - 200000,
        durationMillis: 15 * 60 * 1000,
        type: "PINTURA",
        quantityPainted: 8,
      }, // 32 PPH
      {
        id: Date.now() - 150000,
        orderId: associatedOrder.id,
        operatorId: "pintura",
        timestamp: Date.now() - 150000,
        durationMillis: 30 * 60 * 1000,
        type: "PINTURA",
        quantityPainted: 16,
      }, // 32 PPH

      // EMBALAGEM: Prior avg will be 38 PPH
      {
        id: Date.now() - 100000,
        orderId: associatedOrder.id,
        operatorId: "embalagem",
        timestamp: Date.now() - 100000,
        durationMillis: 10 * 60 * 1000,
        type: "EMBALAGEM",
        quantityPacked: 6,
      }, // 36 PPH
      {
        id: Date.now() - 50000,
        orderId: associatedOrder.id,
        operatorId: "embalagem",
        timestamp: Date.now() - 50000,
        durationMillis: 20 * 60 * 1000,
        type: "EMBALAGEM",
        quantityPacked: 13,
      }, // 39 PPH
    ];

    await db.addLogs(samples);
    setSimulatorSuccessMsg(
      "Base de dados históricos com coletas anteriores inserida! Médias recalculadas para comparação.",
    );
    setTimeout(() => setSimulatorSuccessMsg(null), 5050);
  };

  // Export functions
  const exportPDF = () => {
    const doc = new jsPDF();
    let titleStr = "";

    if (reportType === "PRODUTIVIDADE") {
      titleStr = "Relatorio Comparativo de Produtividade por Setor";
    } else if (reportType === "RASTREAMENTO") {
      titleStr = "Relatorio de Rastreabilidade de Pecas";
    } else {
      titleStr = "Historico de Movimentacoes de Estoque";
    }

    doc.text(titleStr, 14, 15);

    if (reportType === "PRODUTIVIDADE") {
      const tableData = sectorProductivityMetrics.map((d) => [
        d.name,
        d.hasData
          ? `${d.lastQty} pçs em ${d.lastTimeMinutes} min`
          : "Sem coletas",
        d.hasData ? `${d.lastPPH.toFixed(1)} pçs/h` : "-",
        `${d.avgPriorPPH.toFixed(1)} pçs/h`,
        d.hasData
          ? `${d.perfPercent >= 0 ? "+" : ""}${d.perfPercent.toFixed(1)}%`
          : "-",
        d.status,
      ]);
      autoTable(doc, {
        head: [
          [
            "Setor",
            "Utima Coleta Realizada",
            "Pecas/Hora Atual",
            "Media de Coletas Anteriores",
            "Desempenho",
            "Status de Producao",
          ],
        ],
        body: tableData,
        startY: 25,
      });
    } else if (reportType === "RASTREAMENTO") {
      const tableData = traceLogs.map((d) => [
        d.date,
        d.orderCode,
        d.item,
        d.sector,
        d.quantity,
        d.operator,
      ]);
      autoTable(doc, {
        head: [["Data", "Pedido", "Produto", "Setor", "Qtd", "Operador"]],
        body: tableData,
        startY: 25,
      });
    } else {
      const tableData = stockMovementsFormatted.map((m) => [
        m.date,
        m.itemCodeName,
        m.attrs,
        m.type,
        m.quantity,
        m.description,
      ]);
      autoTable(doc, {
        head: [
          [
            "Data/Hora",
            "Produto",
            "Atributos (C/T/V)",
            "Operacao",
            "Qtd",
            "Motivo / Descricao",
          ],
        ],
        body: tableData,
        startY: 25,
      });
    }

    doc.save(`relatorio_${reportType.toLowerCase()}.pdf`);
  };

  const exportCSV = () => {
    let csvContent = "\uFEFF"; // Add UTF-8 BOM for Excel compatibility with accents

    if (reportType === "PRODUTIVIDADE") {
      csvContent +=
        "Setor,UltimaColeta,PecaspPorHoraAtual,MediaColetasAnteriores,Desempenho,Status\n";
      sectorProductivityMetrics.forEach((row) => {
        csvContent += `"${row.name}","${row.hasData ? row.lastQty + " pçs em " + row.lastTimeMinutes + " min" : "Sem dados"}",${row.lastPPH.toFixed(2)},${row.avgPriorPPH.toFixed(2)},"${row.perfPercent.toFixed(1)}%","${row.status}"\n`;
      });
    } else if (reportType === "RASTREAMENTO") {
      csvContent += "Data,Pedido,Produto,Setor,Quantidade,Operador\n";
      traceLogs.forEach((row) => {
        csvContent += `"${row.date}","${row.orderCode}","${row.item}","${row.sector}",${row.quantity},"${row.operator}"\n`;
      });
    } else {
      csvContent +=
        "Data/Hora,Produto,Atributos,Operacao,Quantidade,Descricao\n";
      stockMovementsFormatted.forEach((row) => {
        csvContent += `"${row.date}","${row.itemCodeName}","${row.attrs}","${row.type}",${row.quantity},"${row.description}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_${reportType.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ScreenLayout id="relatorios-screen-layout">
      <ScrollContainer paddingSize="normal" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-gray-800">
            Relatórios e Produtividade
          </h2>
          <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${reportType === "PRODUTIVIDADE" ? "bg-blue-600 text-white shadow-xs" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setReportType("PRODUTIVIDADE")}
            >
              Produtividade
            </button>
            <button
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${reportType === "RASTREAMENTO" ? "bg-blue-600 text-white shadow-xs" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setReportType("RASTREAMENTO")}
            >
              Rastreamento
            </button>
            <button
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${reportType === "ESTOQUE" ? "bg-blue-600 text-white shadow-xs" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setReportType("ESTOQUE")}
            >
              Histórico Estoque
            </button>
            <button
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${reportType === "EPIS" ? "bg-blue-600 text-white shadow-xs" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setReportType("EPIS")}
            >
              EPIs Diários
            </button>
            <button
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${reportType === "CORTE_LASER" ? "bg-blue-600 text-white shadow-xs" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setReportType("CORTE_LASER")}
            >
              Corte Laser
            </button>
            <button
              className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${reportType === "METAS" ? "bg-blue-600 text-white shadow-xs" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
              onClick={() => setReportType("METAS")}
            >
              🎯 Metas de Produção
            </button>
          </div>
        </div>

        {reportType !== "CORTE_LASER" && reportType !== "METAS" && (
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-2">
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded shadow-sm hover:bg-red-700 transition cursor-pointer font-semibold text-xs"
              >
                <FileText size={16} /> Exportar PDF
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow-sm hover:bg-green-700 transition cursor-pointer font-semibold text-xs"
              >
                <Download size={16} /> Exportar Sheets (CSV)
              </button>
            </div>

            {reportType === "PRODUTIVIDADE" && currentUser.role === "ADMIN" && (
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded shadow-sm hover:bg-slate-900 transition cursor-pointer font-semibold text-xs border border-slate-700"
              >
                <Settings size={16} /> Configurar Expediente e Horas
              </button>
            )}
          </div>
        )}

        {reportType === "PRODUTIVIDADE" ? (
          <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Information Notice Alert */}
            <div className="bg-slate-50 border-l-4 border-blue-600 p-4 rounded text-xs text-gray-600 space-y-1 shadow-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1">
                <Sparkles size={14} className="text-blue-600" />
                Mapeamento de Desempenho por Coletas
              </h4>
              <p>
                Os indicadores abaixo comparam a velocidade da{" "}
                <strong>última coleta ativa de cada setor</strong> (em peças por
                hora) contra a{" "}
                <strong>média geral de todas as coletas anteriores</strong>. Se
                o desempenho atual supera as coletas passadas, o setor é
                classificado com status <strong>✅ Produtivo</strong>.
              </p>
            </div>

            {/* New Shift vs 7-day Historical Productivity Comparison Widget */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-wide text-indigo-200 uppercase">
                      Produtividade do Turno vs Média dos Últimos 7 Dias
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Monitoramento em tempo real do PPH (peças/hora) comparando
                      a velocidade atual com o histórico de 7 dias.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-200 border border-slate-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider self-start sm:self-auto">
                  Turno: Real Time
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {shiftVs7DaysMetrics.map((sect) => {
                  const diffPercent = sect.pctDiff;
                  return (
                    <div
                      key={sect.id}
                      className={`rounded-xl p-3.5 border transition-all duration-200 hover:ring-2 ${
                        sect.isBelow
                          ? "bg-red-950/30 border-red-900/40 hover:ring-red-500/30"
                          : "bg-emerald-950/30 border-emerald-900/40 hover:ring-emerald-500/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider truncate max-w-[140px]">
                          {sect.name}
                        </span>
                        {sect.isBelow ? (
                          <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-red-500/30 animate-pulse">
                            <AlertCircle size={10} /> CRÍTICO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">
                            <CheckCircle size={10} /> ADEQUADO
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black font-sans leading-none tracking-tight">
                          {sect.shiftPPH.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          PPH Atual
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-[10px] border-t border-slate-800/40 pt-2 text-slate-400">
                        <div>
                          <span>Média 7d: </span>
                          <strong className="text-slate-200">
                            {sect.avg7DaysPPH.toFixed(1)}/h
                          </strong>
                        </div>
                        <div
                          className={`font-extrabold px-1.5 py-0.5 rounded ${sect.isBelow ? "text-red-400 bg-red-950/50" : "text-emerald-400 bg-emerald-950/50"}`}
                        >
                          {diffPercent >= 0 ? "+" : ""}
                          {diffPercent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {shiftVs7DaysMetrics.some((s) => s.isBelow) && (
                <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg text-xs flex items-center gap-2 text-amber-300 pr-4">
                  <AlertCircle size={16} className="text-amber-400 shrink-0" />
                  <span>
                    <strong>Atenção operacional:</strong> Os setores destacados
                    em vermelho estão operando{" "}
                    <strong className="font-extrabold text-red-400">
                      abaixo
                    </strong>{" "}
                    da média de performance dos últimos 7 dias. Verifique se há
                    gargalos de material ou quebras de máquina nesses postos.
                  </span>
                </div>
              )}
            </div>

            {/* Productivity Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sectorProductivityMetrics.map((sm) => {
                const isPositive = sm.perfPercent >= 0;
                return (
                  <div
                    key={sm.id}
                    className={`bg-white rounded-xl shadow-xs border p-4 flex flex-col justify-between transition duration-200 hover:shadow-md ${sm.borderTheme}`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                          {sm.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border ${sm.statusColor}`}
                        >
                          {sm.status}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-2xl font-bold text-gray-800">
                          {sm.hasData ? `${sm.lastPPH.toFixed(1)}` : "0.0"}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          pçs/h
                        </span>
                      </div>

                      <p className="text-[10px] text-gray-400 italic">
                        Último registro:{" "}
                        {sm.hasData
                          ? `${sm.lastQty} pçs em ${sm.lastTimeMinutes}m`
                          : "Nenhum"}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-gray-400 block text-[9px]">
                          MÉDIA ANTERIOR
                        </span>
                        <strong className="text-gray-700 font-semibold">
                          {sm.avgPriorPPH.toFixed(1)} pçs/h
                        </strong>
                      </div>

                      {sm.hasData && (
                        <div
                          className={`flex items-center gap-1 font-bold ${isPositive ? "text-green-600" : "text-red-650"}`}
                        >
                          {isPositive ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                          <span>
                            {isPositive ? "+" : ""}
                            {sm.perfPercent.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparative Table */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-150 overflow-hidden flex flex-col">
              <h3 className="font-bold text-gray-700 p-4 border-b text-sm flex items-center gap-2 bg-gray-50/50">
                <Layers size={16} className="text-blue-600" />
                Tabela de Produtividade do Chão de Fábrica
              </h3>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs text-left text-gray-600">
                  <thead className="text-[10px] uppercase bg-gray-50 text-gray-500 font-bold border-b">
                    <tr>
                      <th className="px-5 py-3.5">Setor</th>
                      <th className="px-5 py-3.5">
                        Última Coleta (Atividade/Qtd)
                      </th>
                      <th className="px-5 py-3.5">Operador</th>
                      <th className="px-5 py-3.5">Item / Lote</th>
                      <th className="px-5 py-3.5 text-right">
                        Velocidade Atual
                      </th>
                      <th className="px-5 py-3.5 text-right">Média Anterior</th>
                      <th className="px-5 py-3.5 text-right">
                        Diferença/Eficiência
                      </th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {sectorProductivityMetrics.map((sm) => {
                      const isPositive = sm.perfPercent >= 0;
                      return (
                        <tr
                          key={sm.id}
                          className="hover:bg-gray-50/50 transition duration-100"
                        >
                          <td className="px-5 py-3.5 font-bold text-gray-800">
                            {sm.name}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 font-mono">
                            {sm.hasData ? (
                              <span className="flex items-center gap-1">
                                <Clock size={12} className="text-gray-400" />
                                {sm.lastQty} pçs em {sm.lastTimeMinutes}m
                              </span>
                            ) : (
                              <span className="text-gray-400">Sem coletas</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-gray-700">
                            {sm.operatorName}
                          </td>
                          <td className="px-5 py-3.5 max-w-[140px] truncate text-gray-500">
                            {sm.hasData ? (
                              <span>
                                <strong className="text-indigo-700">
                                  {sm.orderCode}
                                </strong>{" "}
                                • {sm.itemName}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-extrabold text-[#00b14f]">
                            {sm.hasData
                              ? `${sm.lastPPH.toFixed(1)}/h`
                              : "0.0/h"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-gray-700">
                            {sm.avgPriorPPH.toFixed(1)}/h
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {sm.hasData ? (
                              <span
                                className={`inline-flex items-center gap-0.5 font-bold ${isPositive ? "text-green-600" : "text-red-650"}`}
                              >
                                {isPositive ? "+" : ""}
                                {sm.perfPercent.toFixed(1)}%
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${sm.statusColor}`}
                            >
                              {sm.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Relatório de Pontuação Acumulada */}
            <div className="bg-white rounded-xl shadow-xs border border-purple-200 overflow-hidden flex flex-col">
              <div className="font-bold text-purple-950 p-4 border-b text-sm flex items-center justify-between bg-purple-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <span>
                    Relatório de Pontuação Acumulada (Prêmio por Desempenho)
                  </span>
                </div>
                <span className="text-[10px] bg-purple-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Exclusivo PCP e Gerência
                </span>
              </div>
              <div className="p-4 bg-purple-50/20 text-xs text-purple-900 border-b border-purple-100 flex items-center gap-2">
                <span>💡</span>
                <span>
                  Esta pontuação é consolidada multiplicando a quantidade de
                  itens produzida por cada operador pela pontuação definida na
                  fiha técnica do item.
                </span>
              </div>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs text-left text-gray-650">
                  <thead className="text-[10px] uppercase bg-purple-50/40 text-purple-800 font-bold border-b border-purple-100">
                    <tr>
                      <th className="px-5 py-3 w-20 text-center">
                        Classificação
                      </th>
                      <th className="px-5 py-3">Operador</th>
                      <th className="px-5 py-3 text-center">
                        Registros de Produção
                      </th>
                      <th className="px-5 py-3 text-right">
                        Qtd. Total Operada
                      </th>
                      <th className="px-5 py-3 text-right font-bold pr-8">
                        Pontuação Acumulada
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {pointsByOperatorReport.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-gray-400 italic"
                        >
                          Nenhuma pontuação registrada nos apontamentos do
                          sistema ainda.
                        </td>
                      </tr>
                    ) : (
                      pointsByOperatorReport.map((rep, idx) => {
                        const isTop3 = idx < 3;
                        const medal =
                          idx === 0
                            ? "🥇 1º"
                            : idx === 1
                              ? "🥈 2º"
                              : idx === 2
                                ? "🥉 3º"
                                : `${idx + 1}º`;
                        return (
                          <tr
                            key={rep.userId}
                            className={`hover:bg-purple-50/5 transition duration-100 ${isTop3 ? "bg-amber-50/10 font-medium" : ""}`}
                          >
                            <td className="px-5 py-3 text-center font-bold text-gray-700 font-sans">
                              {medal}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800">
                                  {rep.userName}
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono">
                                  ID: {rep.userId}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center text-gray-600 font-mono font-medium">
                              {rep.logCount} evento(s)
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-gray-700 font-mono">
                              {rep.qtyTotal.toLocaleString("pt-BR")} un.
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-purple-700 text-sm pr-8 font-mono">
                              ⭐ {Number(rep.totalPoints).toFixed(5)} pts
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Database simulation interface for the User */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-150 p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-150">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    <Plus size={16} className="text-blue-600" />
                    Carregar / Simular Base de Coletas
                  </h3>
                  <p className="text-xs text-gray-500">
                    Insira registros manuais ou faça carga imediata do set de
                    dados coletados anteriormente.
                  </p>
                </div>
                <button
                  onClick={handleLoadSampleDatabase}
                  className="bg-zinc-900 border border-zinc-700 hover:bg-black text-white hover:text-green-400 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <Sparkles size={12} /> Carregar Carga de Dados Históricos
                </button>
              </div>

              {simulatorSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2 border border-emerald-200 animate-in fade-in duration-150">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span>{simulatorSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">
                    SETOR
                  </label>
                  <select
                    value={simulatorSector}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSimulatorSector(val);
                      if (val === "MONTAGEM_RETRATIL")
                        setSimulatorOperator("montagem_retratil");
                      else if (val === "MONTAGEM_RODRIGO")
                        setSimulatorOperator("montagem_rodrigo");
                      else if (val === "SOLDA") setSimulatorOperator("Adriano");
                      else if (val === "PRENSA_EDUARDO")
                        setSimulatorOperator("prensa_eduardo");
                      else if (val === "PRENSA_RAFAEL")
                        setSimulatorOperator("prensa_rafael");
                      else if (val === "INJETORA")
                        setSimulatorOperator("injetora");
                      else if (val === "BANHO_QUIMICO")
                        setSimulatorOperator("banho_quimico");
                      else if (val === "CORTE_LASER")
                        setSimulatorOperator("cortelaser_giovani");
                      else if (val === "PINTURA")
                        setSimulatorOperator("pintura");
                      else if (val === "EMBALAGEM")
                        setSimulatorOperator("embalagem");
                      else setSimulatorOperator("solda");
                    }}
                    className="w-full text-xs p-2 border border-gray-300 rounded bg-white text-gray-700 font-semibold"
                  >
                    <option value="CORTE_LASER">Corte a Laser</option>
                    <option value="SOLDA">Solda (por Soldador)</option>
                    <option value="PINTURA">Pintura</option>
                    <option value="EMBALAGEM">Embalagem</option>
                    <option value="MONTAGEM_RETRATIL">
                      Montagem de Retrátil
                    </option>
                    <option value="MONTAGEM_RODRIGO">
                      Pendurar Barra chata
                    </option>
                    <option value="PRENSA_EDUARDO">Prensa Eduardo</option>
                    <option value="TORNO_CNC_WILLIAN">Torno CNC Willian</option>
                    <option value="TORNO_CNC_HENRIQUE">Torno CNC Henrique</option>
                    <option value="PRENSA_RAFAEL">Prensa Rafael</option>
                    <option value="INJETORA">Injetora</option>
                    <option value="BANHO_QUIMICO">Banho Químico</option>
                  </select>
                </div>
                {simulatorSector === "SOLDA" && (
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">
                      CRIAR/SOLDADOR
                    </label>
                    <input
                      type="text"
                      value={simulatorOperator}
                      onChange={(e) => setSimulatorOperator(e.target.value)}
                      placeholder="Nome do Soldador (ex: Adriano)"
                      className="w-full text-xs p-2 border border-gray-300 rounded text-gray-700 font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">
                    QUANTIDADE PEÇAS
                  </label>
                  <input
                    type="number"
                    value={simulatorQty}
                    onChange={(e) => setSimulatorQty(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-gray-300 rounded text-gray-700 font-mono"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">
                    TEMPO TRABALHADO (MINUTOS)
                  </label>
                  <input
                    type="number"
                    value={simulatorTimeMinutes}
                    onChange={(e) =>
                      setSimulatorTimeMinutes(Number(e.target.value))
                    }
                    className="w-full text-xs p-2 border border-gray-300 rounded text-gray-700 font-mono"
                    min="1"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSimulateAddLog}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition duration-150 cursor-pointer shadow-sm text-center"
                  >
                    Adicionar Coleta Manual
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : reportType === "RASTREAMENTO" ? (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-2">
                Filtrar por Pedido
              </h3>
              <select
                value={selectedOrderCode}
                onChange={(e) => setSelectedOrderCode(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-sm cursor-pointer"
              >
                <option value="TODAS">Todos os Pedidos</option>
                {uniqueOrders.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
              <h3 className="font-semibold p-4 text-gray-700 border-b text-sm">
                Histórico de Produção
              </h3>
              <div className="flex-1 overflow-auto p-4">
                {traceLogs.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm italic">
                    Nenhum registro encontrado.
                  </p>
                ) : (
                  <>
                    <table className="w-full text-xs text-left text-gray-600">
                      <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 font-bold">
                        <tr>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Pedido</th>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3">Setor</th>
                          <th className="px-4 py-3 text-right">Qtd</th>
                          <th className="px-4 py-3">Operador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traceLogs.slice(0, visibleLogsCount).map((log) => (
                          <tr
                            key={log.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">
                              {log.date}
                            </td>
                            <td className="px-4 py-3 font-semibold text-indigo-750">
                              {log.orderCode}
                            </td>
                            <td className="px-4 py-3 max-w-[120px] truncate">
                              {log.item}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.sector === "PRODUCAO"
                                    ? "bg-blue-105 text-blue-800"
                                    : log.sector === "PINTURA"
                                      ? "bg-amber-105 text-amber-805"
                                      : log.sector === "CORTE_LASER"
                                        ? "bg-indigo-105 text-indigo-800"
                                        : "bg-green-105 text-green-800"
                                }`}
                              >
                                {log.sector}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black">
                              {log.quantity}
                            </td>
                            <td className="px-4 py-3 text-gray-500 font-medium">
                              {log.operator}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {traceLogs.length > visibleLogsCount && (
                      <div className="flex justify-center p-4">
                        <button
                          onClick={() =>
                            setVisibleLogsCount((prev) => prev + 30)
                          }
                          className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition text-sm shadow-sm"
                        >
                          Carregar mais ({traceLogs.length - visibleLogsCount}{" "}
                          restantes)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : reportType === "ESTOQUE" ? (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
              <h3 className="font-semibold p-4 text-gray-700 border-b text-sm">
                Registro Geral de Histórico e Movimentações de Estoque
              </h3>
              <div className="flex-1 overflow-auto p-4">
                {stockMovementsFormatted.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm italic">
                    Nenhuma movimentação de estoque registrada até o momento.
                  </p>
                ) : (
                  <table className="w-full text-xs text-left text-gray-600">
                    <thead className="text-[10px] text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">Data/Hora</th>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Atributos (C/T/V)</th>
                        <th className="px-4 py-3">Operação</th>
                        <th className="px-4 py-3 text-right">Qtd</th>
                        <th className="px-4 py-3">Motivo / Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovementsFormatted.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">
                            {m.date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {m.itemCodeName}
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                            {m.attrs}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.type === "ENTRADA"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {m.type === "ENTRADA" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold text-sm ${m.type === "ENTRADA" ? "text-green-600" : "text-red-650"}`}
                          >
                            {m.type === "ENTRADA" ? "+" : "-"}
                            {m.quantity}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {m.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {reportType === "EPIS" &&
          (() => {
            const filteredDistributions = db.epiDistributions
              .filter((dist) => {
                if (selectedEpiSectorId === "") return true;
                const emp = db.employees.find(
                  (e) =>
                    String(e.id).trim() === String(dist.employeeId).trim() ||
                    e.name.toLowerCase() === String(dist.employeeId).trim().toLowerCase()
                );
                return emp && emp.sectorId === selectedEpiSectorId;
              })
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              );

            // Calculate usage per item
            const usagePerItem = filteredDistributions.reduce(
              (acc, dist) => {
                acc[dist.itemId] = (acc[dist.itemId] || 0) + dist.quantity;
                return acc;
              },
              {} as Record<number, number>,
            );

            const sortedUsage = Object.entries(usagePerItem)
              .map(([itemId, qty]) => ({
                itemId: Number(itemId),
                qty: Number(qty),
              }))
              .sort((a, b) => b.qty - a.qty);

            return (
              <div className="flex flex-col gap-6" id="pdf-content">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-emerald-50 border-b border-gray-200 p-4 sticky top-0 bg-opacity-95 backdrop-blur z-10 flex flex-wrap justify-between items-center gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Layers className="text-emerald-500" size={18} />{" "}
                      Histórico de Entrega de EPIs
                    </h3>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-bold text-gray-600">
                        Filtrar por Setor:
                      </span>
                      <select
                        value={selectedEpiSectorId}
                        onChange={(e) =>
                          setSelectedEpiSectorId(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="border border-gray-200 rounded p-1.5 text-sm bg-white font-medium min-w-[150px]"
                      >
                        <option value="">Todos os Setores</option>
                        {db.sectors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Widgets */}
                  {selectedEpiSectorId !== "" && (
                    <div className="p-4 bg-emerald-50/30 border-b border-emerald-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded shadow-sm border border-emerald-100 flex flex-col">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                          Total de Entregas
                        </span>
                        <span className="text-2xl font-black text-emerald-700">
                          {filteredDistributions.length}{" "}
                          <span className="text-sm font-medium text-gray-400">
                            registros
                          </span>
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm border border-emerald-100 flex flex-col md:col-span-2">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">
                          Itens Mais Consumidos (Neste Setor)
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {sortedUsage.length === 0 ? (
                            <span className="text-sm text-gray-400">
                              Nenhum consumo.
                            </span>
                          ) : (
                            sortedUsage.slice(0, 4).map((u) => {
                              const epi = db.items.find(
                                (i) => i.id === u.itemId,
                              );
                              return (
                                <div
                                  key={u.itemId}
                                  className="flex flex-col bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded min-w-max"
                                >
                                  <span className="font-bold text-gray-800 text-xs">
                                    {epi ? epi.name : "Desconhecido"}
                                  </span>
                                  <span className="text-emerald-600 font-black">
                                    {u.qty} un
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0">
                        <tr>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Data / Hora
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Equipamento (EPI)
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">QTD</th>
                          <th className="px-4 py-3 whitespace-nowrap">
                            Colaborador
                          </th>
                          <th className="px-4 py-3 whitespace-nowrap">Setor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredDistributions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-8 text-center text-gray-400"
                            >
                              Nenhum registro encontrado para este filtro.
                            </td>
                          </tr>
                        ) : (
                          filteredDistributions.map((dist) => {
                            const emp = db.employees.find(
                              (e) =>
                                String(e.id).trim() === String(dist.employeeId).trim() ||
                                e.name.toLowerCase() === String(dist.employeeId).trim().toLowerCase()
                            );
                            const epi = db.items.find(
                              (i) => i.id === dist.itemId,
                            );
                            const sec = emp
                              ? db.sectors.find((s) => s.id === emp.sectorId)
                              : null;
                            return (
                              <tr
                                key={dist.id}
                                className="hover:bg-gray-50 transition"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-emerald-800 whitespace-nowrap">
                                  {new Date(dist.date).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                                  {epi
                                    ? `${epi.code} - ${epi.name}`
                                    : "Item Excluído"}
                                </td>
                                <td className="px-4 py-3 font-black text-emerald-600 text-base">
                                  {dist.quantity}
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">
                                  {emp ? emp.name : "Desconhecido"}
                                </td>
                                <td className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">
                                  {sec ? sec.name : "-"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

        {reportType === "CORTE_LASER" && (
          <RelatorioCorteLaserTab db={db} />
        )}

        {reportType === "METAS" && (
          <MetasProducaoTab db={db} currentUser={currentUser} />
        )}
      </ScrollContainer>

      {isConfigModalOpen && (
        <ProdutividadeConfigModal
          db={db}
          onClose={() => setIsConfigModalOpen(false)}
        />
      )}
    </ScreenLayout>
  );
}
