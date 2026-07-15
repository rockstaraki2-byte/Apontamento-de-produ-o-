import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  Square,
  Pause,
  TrendingUp,
  Gauge,
  Timer,
  Check,
  Activity,
  User as UserIcon,
  Users,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingDown,
  Info,
  Zap,
  Calendar,
  Trash2,
  Plus,
  Sliders
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, Order, ProductionBatch, ProductionLog, ActiveTask } from "./types";
import {
  ScreenLayout,
  ScreenHeader,
  ScrollContainer
} from "./components/Layout";

// Helper to determine quantity fields and types based on sector name
const getSectorFields = (sectorName: string) => {
  const name = sectorName.toLowerCase();
  if (name.includes("pintura")) {
    return {
      qtyField: "paintedQuantity" as const,
      statusFinished: "PINTADO" as const,
      logType: "PINTURA" as const,
    };
  }
  if (name.includes("embalagem") || name.includes("embalar")) {
    return {
      qtyField: "packedQuantity" as const,
      statusFinished: "EMBALADO" as const,
      logType: "EMBALAGEM" as const,
    };
  }
  if (name.includes("corte") || name.includes("laser")) {
    return {
      qtyField: "cutQuantity" as const,
      statusFinished: "PRODUZIDO" as const,
      logType: "CORTE_LASER" as const,
    };
  }
  return {
    qtyField: "producedQuantity" as const,
    statusFinished: "PRODUZIDO" as const,
    logType: "PRODUCAO" as const,
  };
};

export function FilaRitmoScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [activeTab, setActiveTab] = useState<"FILA" | "MONITOR" | "PROGRAMAR">("FILA");
  
  // Selected Sector for the queue view
  const [selectedSectorId, setSelectedSectorId] = useState<number>(() => {
    // Try to auto-select sector of current employee
    const emp = db.employees.find((e) => e.id === currentUser.id);
    if (emp && emp.sectorId) return emp.sectorId;
    return db.sectors[0]?.id || 0;
  });

  // Programmed orders/batches list for daily scheduling simulator
  const [programmedList, setProgrammedList] = useState<{ id: string; orderId?: number; itemId: number; operatorId: string; targetQty: number; editedSec?: number }[]>([]);
  
  // State for manual planner form
  const [plannerSearchItem, setPlannerSearchItem] = useState("");
  const [plannerSearchOperator, setPlannerSearchOperator] = useState("");
  const [plannerSelectedItemId, setPlannerSelectedItemId] = useState<number | "">("");
  const [plannerSelectedOperatorId, setPlannerSelectedOperatorId] = useState<string>("");
  const [plannerItemQty, setPlannerItemQty] = useState<number | "">("");
  const [plannerItemSec, setPlannerItemSec] = useState<number | "">("");

  const [plannerShiftHours, setPlannerShiftHours] = useState<number>(8);
  const [plannerEfficiency, setPlannerEfficiency] = useState<number>(85); // Expected rhythm/efficiency %
  const [plannerStartTime, setPlannerStartTime] = useState<string>("08:00");
  const [plannerOperators, setPlannerOperators] = useState<number>(1);

  // Local live timer tick state
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Modal for logging production / completing task
  const [completingTask, setCompletingTask] = useState<{
    order: Order;
    activePack: ActiveTask;
    sectorId: number;
    sectorName: string;
  } | null>(null);
  const [logQuantity, setLogQuantity] = useState<string>("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [manualMin, setManualMin] = useState<string>("");
  const [manualSec, setManualSec] = useState<string>("");
  const [isDirectLog, setIsDirectLog] = useState<boolean>(false);

  // Sector helper
  const selectedSector = useMemo(() => {
    return db.sectors.find((s) => s.id === selectedSectorId);
  }, [db.sectors, selectedSectorId]);

  // Dynamic historical average calculation from previous logs
  const historicalAverages = useMemo(() => {
    if (!selectedSector) return {};
    
    // Determine possible process names or log types to match
    const sectorFields = getSectorFields(selectedSector.name);
    const sNameLower = selectedSector.name.toLowerCase();

    const sectorLogs = db.logs.filter((l) => {
      const pName = l.processName?.toLowerCase() || "";
      const logType = l.type?.toLowerCase() || "";
      return (
        sNameLower === pName || 
        sNameLower === logType || 
        sNameLower.includes(pName) || 
        pName.includes(sNameLower) ||
        logType === sectorFields.logType.toLowerCase()
      );
    });

    const sumsByItem: Record<number, { totalMillis: number; totalQty: number }> = {};
    sectorLogs.forEach((l) => {
      const qty = (l.quantityProcessed || 0) + (l.quantityCut || 0) + (l.quantityPainted || 0) + (l.quantityPacked || 0);
      if (qty > 0 && l.durationMillis && l.itemId) {
        if (!sumsByItem[l.itemId]) {
          sumsByItem[l.itemId] = { totalMillis: 0, totalQty: 0 };
        }
        sumsByItem[l.itemId].totalMillis += l.durationMillis;
        sumsByItem[l.itemId].totalQty += qty;
      }
    });

    const averages: Record<number, number> = {};
    Object.entries(sumsByItem).forEach(([itemIdStr, data]) => {
      const itemId = Number(itemIdStr);
      averages[itemId] = Math.round((data.totalMillis / 1000) / data.totalQty);
    });
    return averages;
  }, [db.logs, selectedSector]);

  // Liberated orders for selected sector queue
  const queueOrders = useMemo(() => {
    if (!selectedSectorId) return [];
    
    // Find active batches for this sector
    const sectorBatches = db.productionBatches.filter(
      (b) => b.sectorId === selectedSectorId && b.status !== "CONCLUIDO"
    );

    // Collect all order IDs that are in these batches
    const activeIds = new Set<number>();
    sectorBatches.forEach((b) => {
      if (Array.isArray(b.orderIds)) {
        b.orderIds.forEach((id) => activeIds.add(id));
      }
    });

    // Find the actual orders
    return db.orders.filter(
      (o) => o.isActive && activeIds.has(o.id) && o.status !== "FATURADO" && o.status !== "CANCELADO"
    ).sort((a, b) => {
      // Prioritize urgent orders, then date
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return a.createdAt - b.createdAt;
    });
  }, [db.orders, db.productionBatches, selectedSectorId]);

  // Map to get standard cycle time for each product/sector
  const getStandardTimeForProduct = (itemId: number, sectorId: number) => {
    const item = db.items.find(i => i.id === itemId);
    if (item?.standardCycles && item.standardCycles[sectorId]) {
      return item.standardCycles[sectorId] * 60; // Convert minutes to seconds
    }
    
    // Fallback to flow if item doesn't have it defined
    const flow = db.productFlows.find((f) => f.itemId === itemId);
    if (flow && flow.sectorTimes) {
      return flow.sectorTimes[String(sectorId)] || flow.sectorTimes[sectorId] || 0;
    }
    return 0; // Default to 0 (will use fallback estimation)
  };

  // Helper to format cycle duration nicely
  const formatSeconds = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "0s";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Handles starting a timer for an order
  const handleStartProduction = async (order: Order, offsetMinutes = 0) => {
    if (!selectedSector) return;
    
    const startTime = Date.now() - (offsetMinutes * 60 * 1000);
    
    // Create an active pack
    const activePackData: Omit<ActiveTask, "id"> = {
      itemId: order.itemId,
      color: order.color || "",
      size: order.size || "",
      variation: order.variation || "",
      operatorId: currentUser.id,
      startTime: startTime,
      type: getSectorFields(selectedSector.name).logType,
      processName: selectedSector.name,
      // Custom tracking properties
      associatedBatchId: order.id, // we can associate order ID here
      associatedBatchName: order.customerName,
      partialQuantity: order.totalQuantity,
    };

    try {
      await db.addActivePack(activePackData as any);
    } catch (e: any) {
      alert("Erro ao iniciar produção: " + e.message);
    }
  };

  // Handles pausing/cancelling timer without saving
  const handleCancelTimer = async (packId: number) => {
    if (window.confirm("Deseja realmente cancelar este cronômetro? O tempo decorrido será descartado.")) {
      try {
        await db.removeActivePack(packId);
      } catch (e: any) {
        alert("Erro ao cancelar: " + e.message);
      }
    }
  };

  // Prepares the log modal
  const handleOpenCompleteModal = (order: Order, activePack: ActiveTask, isDirect = false) => {
    if (!selectedSector) return;
    
    setIsDirectLog(isDirect);
    setCompletingTask({
      order,
      activePack,
      sectorId: selectedSectorId,
      sectorName: selectedSector.name,
    });
    
    // Prefill remaining quantity
    const sectorConfig = getSectorFields(selectedSector.name);
    const completedQty = Number(order[sectorConfig.qtyField]) || 0;
    const remaining = Math.max(0, order.totalQuantity - completedQty);
    setLogQuantity(String(remaining));

    if (isDirect) {
      // Direct log: estimate duration based on standard cycle time
      const stdTimeSec = getStandardTimeForProduct(order.itemId, selectedSectorId);
      const estTotalSec = (stdTimeSec > 0 ? stdTimeSec : 30) * remaining;
      const m = Math.floor(estTotalSec / 60);
      const s = estTotalSec % 60;
      setManualMin(String(m));
      setManualSec(String(s));
    } else {
      // Normal log: calculate elapsed time from activePack
      const elapsedSeconds = Math.max(1, Math.floor((Date.now() - activePack.startTime) / 1000));
      const m = Math.floor(elapsedSeconds / 60);
      const s = elapsedSeconds % 60;
      setManualMin(String(m));
      setManualSec(String(s));
    }
  };

  // Helper to handle manual quantity changes and auto-update duration if direct log
  const handleQuantityChange = (valStr: string) => {
    setLogQuantity(valStr);
    const qty = Number(valStr);
    if (isDirectLog && !isNaN(qty) && qty > 0 && completingTask) {
      const stdTimeSec = getStandardTimeForProduct(completingTask.order.itemId, selectedSectorId);
      const estTotalSec = (stdTimeSec > 0 ? stdTimeSec : 30) * qty;
      setManualMin(String(Math.floor(estTotalSec / 60)));
      setManualSec(String(estTotalSec % 60));
    }
  };

  // Submits the finished production log
  const handleLogProduction = async () => {
    if (!completingTask) return;
    const qtyNum = Number(logQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Por favor, insira uma quantidade válida maior que zero.");
      return;
    }

    const minNum = Number(manualMin) || 0;
    const secNum = Number(manualSec) || 0;
    const totalSeconds = (minNum * 60) + secNum;
    if (totalSeconds <= 0) {
      alert("Por favor, insira um tempo de produção válido (maior que 0s).");
      return;
    }

    setIsSubmittingLog(true);
    try {
      const { order, activePack, sectorName } = completingTask;
      const elapsedMillis = totalSeconds * 1000;
      const sectorConfig = getSectorFields(sectorName);

      // Create new Production Log
      const newLog: ProductionLog = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        operatorId: currentUser.id,
        itemId: order.itemId,
        orderId: order.id,
        processName: sectorName,
        type: sectorConfig.logType,
        timestamp: Date.now(),
        durationMillis: elapsedMillis,
        // Increment correct type
        ...(sectorConfig.logType === "EMBALAGEM" && { quantityPacked: qtyNum }),
        ...(sectorConfig.logType === "PRODUCAO" && { quantityProcessed: qtyNum }),
        ...(sectorConfig.logType === "PINTURA" && { quantityPainted: qtyNum }),
        ...(sectorConfig.logType === "CORTE_LASER" && { quantityCut: qtyNum }),
      };

      // Save Log
      await db.addLogs([newLog]);

      // Update Order quantities & Status
      const currentVal = Number(order[sectorConfig.qtyField]) || 0;
      const newVal = currentVal + qtyNum;
      const isFinished = newVal >= order.totalQuantity;

      const updatedOrder: Order = {
        ...order,
        [sectorConfig.qtyField]: newVal,
        status: isFinished ? sectorConfig.statusFinished : "EM_PRODUCAO",
      };

      await db.updateOrders([updatedOrder]);

      // Remove Active Timer Session only if we are NOT in direct log mode and we had a valid active pack
      if (!isDirectLog && activePack && activePack.id !== 0) {
        await db.removeActivePack(activePack.id, true);
      }

      // Handle batch auto-conclude correctly
      if (isFinished) {
        // Find which batch this order belongs to for this sector
        const batch = db.productionBatches.find(
          b => b.sectorId === selectedSectorId && b.orderIds?.includes(order.id) && b.status !== "CONCLUIDO"
        );
        
        if (batch) {
          const updatedChecked = [...(batch.checkedOrderIds || [])];
          if (!updatedChecked.includes(order.id)) {
            updatedChecked.push(order.id);
            const allChecked = batch.orderIds.every((oid) => updatedChecked.includes(oid));
            const updatedStatus = allChecked ? "CONCLUIDO" : batch.status;
            
            await db.updateProductionBatch({
              ...batch,
              checkedOrderIds: updatedChecked,
              status: updatedStatus
            });
          }
        }
      }

      setCompletingTask(null);
      setLogQuantity("");
      setManualMin("");
      setManualSec("");
      setIsDirectLog(false);
      alert("Apontamento registrado com sucesso!");
    } catch (e: any) {
      alert("Erro ao salvar apontamento: " + e.message);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // PROGRAMMING / PLANNING 
  const handleAddToProgram = (orderId: number, targetQty: number) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return;
    setProgrammedList((prev) => {
      // Allow multiple entries for the same order if assigned to different operators? Yes.
      return [...prev, {
        id: Date.now().toString() + Math.random().toString(),
        orderId,
        itemId: order.itemId,
        operatorId: "", // Unassigned by default when clicking from queue
        targetQty
      }];
    });
  };

  const handleManualAddProgram = () => {
    if (!plannerSelectedItemId || !plannerSelectedOperatorId || !plannerItemQty) {
      alert("Preencha item, operador e quantidade!");
      return;
    }
    setProgrammedList((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        itemId: Number(plannerSelectedItemId),
        operatorId: plannerSelectedOperatorId,
        targetQty: Number(plannerItemQty),
        editedSec: plannerItemSec ? Number(plannerItemSec) : undefined,
      }
    ]);
    // clear some fields
    setPlannerSearchItem("");
    setPlannerSelectedItemId("");
    setPlannerItemQty("");
    setPlannerItemSec("");
  };

  const handleRemoveFromProgram = (id: string) => {
    setProgrammedList((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateProgramQty = (id: string, qty: number) => {
    setProgrammedList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, targetQty: qty } : p))
    );
  };

  const handleUpdateProgramEditedSec = (id: string, sec: number | undefined) => {
    setProgrammedList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, editedSec: sec } : p))
    );
  };

  const handleUpdateProgramOperator = (id: string, opId: string) => {
    setProgrammedList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, operatorId: opId } : p))
    );
  };

  const handleAutoProgramAll = () => {
    const sectorConfig = getSectorFields(selectedSector?.name || "");
    const listToAdd = queueOrders.map((order) => {
      const completedQty = Number(order[sectorConfig.qtyField]) || 0;
      const remainingQty = Math.max(0, order.totalQuantity - completedQty);
      return {
        id: Date.now().toString() + Math.random().toString(),
        orderId: order.id,
        itemId: order.itemId,
        operatorId: "",
        targetQty: remainingQty,
      };
    }).filter((item) => item.targetQty > 0);
    setProgrammedList((prev) => [...prev, ...listToAdd]);
  };

  const handleClearProgram = () => {
    setProgrammedList([]);
  };

  const handleLaunchProgrammedProduction = async () => {
    if (!selectedSector || programmedList.length === 0) return;
    
    let countStarted = 0;
    for (const pItem of programmedList) {
      const order = db.orders.find((o) => o.id === pItem.orderId);
      if (!order) continue;
      
      // Check if already active
      const isAlreadyActive = db.activePacks.some(
        (p) => p.associatedBatchId === order.id && p.processName === selectedSector.name
      );
      if (isAlreadyActive) continue;
      
      const activePackData: Omit<ActiveTask, "id"> = {
        itemId: order.itemId,
        color: order.color || "",
        size: order.size || "",
        variation: order.variation || "",
        operatorId: currentUser.id,
        startTime: Date.now(),
        type: getSectorFields(selectedSector.name).logType,
        processName: selectedSector.name,
        associatedBatchId: order.id,
        associatedBatchName: order.customerName,
        partialQuantity: order.totalQuantity,
      };
      
      try {
        await db.addActivePack(activePackData as any);
        countStarted++;
      } catch (e) {
        console.error("Error launching programmed item", e);
      }
    }
    
    if (countStarted > 0) {
      alert(`${countStarted} lote(s) de produção foram iniciados no cronômetro do setor ${selectedSector.name}!`);
      setActiveTab("FILA");
    } else {
      alert("Todos os lotes da programação já estão com cronômetro ativo.");
    }
  };

  // MONITOR STATS CALCULATIONS (TODAY'S PACE)
  const monitorStats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const startMs = todayStart.getTime();

    // Filter today's production logs
    const todayLogs = db.logs.filter(
      (log) => log.timestamp >= startMs && ["PRODUCAO", "PINTURA", "EMBALAGEM", "CORTE_LASER"].includes(log.type || "")
    );

    let totalMinutesLogged = 0;
    let totalUnitsProduced = 0;
    let totalTargetMinutes = 0;
    
    const logsListWithEfficiency = todayLogs.map((log) => {
      const durationSec = (log.durationMillis || 0) / 1000;
      totalMinutesLogged += durationSec / 60;

      const qty =
        (log.quantityProcessed || 0) +
        (log.quantityCut || 0) +
        (log.quantityPainted || 0) +
        (log.quantityPacked || 0);

      totalUnitsProduced += qty;

      const sector = db.sectors.find((s) => {
        const sName = s.name.toLowerCase();
        const pName = log.processName?.toLowerCase() || "";
        const logType = log.type?.toLowerCase() || "";
        return sName === pName || sName === logType || sName.includes(pName) || pName.includes(sName);
      });

      const stdSec = sector && log.itemId ? getStandardTimeForProduct(log.itemId, sector.id) : 0;
      const expectedDurationSec = stdSec > 0 ? stdSec * qty : 30 * qty; // 30s default fallback
      totalTargetMinutes += expectedDurationSec / 60;

      const actualSecPerUnit = qty > 0 ? durationSec / qty : 0;
      const efficiency = stdSec > 0 && actualSecPerUnit > 0 ? (stdSec / actualSecPerUnit) * 100 : 100;

      return {
        ...log,
        qty,
        stdSec: stdSec || 30,
        actualSecPerUnit,
        efficiency,
        sectorName: log.processName || log.type || "Geral",
      };
    });

    const averageEfficiency = totalMinutesLogged > 0 ? (totalTargetMinutes / totalMinutesLogged) * 100 : 100;

    return {
      totalUnitsProduced,
      totalMinutesLogged: Math.round(totalMinutesLogged),
      totalTargetMinutes: Math.round(totalTargetMinutes),
      averageEfficiency: Math.round(averageEfficiency),
      logs: logsListWithEfficiency.sort((a, b) => b.timestamp - a.timestamp),
    };
  }, [db.logs, db.sectors, db.productFlows]);

  // LIVE ACTIVE TIMERS LIST WITH PACING METRICS
  const liveActiveTimers = useMemo(() => {
    return db.activePacks.map((pack) => {
      const operator = db.employees.find((e) => e.id === pack.operatorId);
      const item = db.items.find((i) => i.id === pack.itemId);
      
      const sector = db.sectors.find((s) => s.name === pack.processName);
      const stdSec = sector && pack.itemId ? getStandardTimeForProduct(pack.itemId, sector.id) : 30; // 30s default

      const elapsedSec = Math.floor((now - pack.startTime) / 1000);
      const expectedQty = stdSec > 0 ? elapsedSec / stdSec : 0;

      // Pacing condition: if elapsed time is greater than what should normally take to produce 1 unit, check pace
      const status = expectedQty <= 1 ? "INICIANDO" : expectedQty > 1.2 ? "ATRASADO" : "NO_RITMO";

      return {
        ...pack,
        operatorName: operator?.name || pack.operatorId,
        itemName: item?.name || "Produto",
        itemCode: item?.code || "",
        stdSec,
        elapsedSec,
        expectedQty,
        pacingStatus: status,
      };
    });
  }, [db.activePacks, db.employees, db.items, db.sectors, now]);

  // Planner stats for the daily scheduling simulator
  const plannerStats = useMemo(() => {
    let totalStdSeconds = 0;
    let totalHistSeconds = 0;
    let totalEditedSeconds = 0;
    let hasHistoricalData = false;
    let totalQty = 0;

    const operatorGroups: Record<string, {
      operatorId: string;
      operatorName: string;
      items: any[];
      totalStdSeconds: number;
      totalHistSeconds: number;
      totalEditedSeconds: number;
      totalQty: number;
    }> = {};

    const itemsCalculations = programmedList.map((p) => {
      const order = p.orderId ? db.orders.find((o) => o.id === p.orderId) : undefined;
      const item = db.items.find((i) => i.id === p.itemId);
      
      const stdSec = getStandardTimeForProduct(p.itemId, selectedSectorId) || 30;
      const actualStdSec = stdSec > 0 ? stdSec : 30; // 30s default fallback
      const itemStdTotalSec = actualStdSec * p.targetQty;
      totalStdSeconds += itemStdTotalSec;

      const histSec = historicalAverages[p.itemId] || null;
      let itemHistTotalSec = 0;
      if (histSec) {
        itemHistTotalSec = histSec * p.targetQty;
        totalHistSeconds += itemHistTotalSec;
        hasHistoricalData = true;
      } else {
        itemHistTotalSec = actualStdSec * p.targetQty; // fallback to standard
        totalHistSeconds += itemHistTotalSec;
      }

      const editedSec = p.editedSec ?? actualStdSec;
      const itemEditedTotalSec = editedSec * p.targetQty;
      totalEditedSeconds += itemEditedTotalSec;

      totalQty += p.targetQty;

      const resultItem = {
        ...p,
        order,
        item,
        stdSec: actualStdSec,
        histSec: histSec,
        editedSec,
        itemStdTotalSec,
        itemHistTotalSec,
        itemEditedTotalSec,
      };

      const opId = p.operatorId || "unassigned";
      if (!operatorGroups[opId]) {
         const emp = db.employees.find(e => e.id === opId);
         operatorGroups[opId] = {
            operatorId: opId,
            operatorName: opId === "unassigned" ? "Não Atribuído" : (emp?.name || opId),
            items: [],
            totalStdSeconds: 0,
            totalHistSeconds: 0,
            totalEditedSeconds: 0,
            totalQty: 0
         };
      }
      operatorGroups[opId].items.push(resultItem);
      operatorGroups[opId].totalStdSeconds += itemStdTotalSec;
      operatorGroups[opId].totalHistSeconds += itemHistTotalSec;
      operatorGroups[opId].totalEditedSeconds += itemEditedTotalSec;
      operatorGroups[opId].totalQty += p.targetQty;

      return resultItem;
    });

    // Adjust by plannerEfficiency (100% means direct standard, 85% means divide by 0.85 to increase required hours)
    const efficiencyFactor = (plannerEfficiency || 100) / 100;
    const adjustedStdSeconds = efficiencyFactor > 0 ? (totalStdSeconds / efficiencyFactor) : totalStdSeconds;
    const adjustedHistSeconds = efficiencyFactor > 0 ? (totalHistSeconds / efficiencyFactor) : totalHistSeconds;
    const adjustedEditedSeconds = efficiencyFactor > 0 ? (totalEditedSeconds / efficiencyFactor) : totalEditedSeconds;

    Object.values(operatorGroups).forEach(g => {
       g.totalStdSeconds = efficiencyFactor > 0 ? g.totalStdSeconds / efficiencyFactor : g.totalStdSeconds;
       g.totalHistSeconds = efficiencyFactor > 0 ? g.totalHistSeconds / efficiencyFactor : g.totalHistSeconds;
       g.totalEditedSeconds = efficiencyFactor > 0 ? g.totalEditedSeconds / efficiencyFactor : g.totalEditedSeconds;
    });

    // The load per operator is the MAX load of any single assigned operator (which determines when that operator is released and when the overall simulation finishes)
    // If no operators are assigned, use total adjusted seconds as fallback
    const assignedOperatorIds = Object.keys(operatorGroups).filter(opId => opId !== "unassigned");
    
    let maxStd = 0;
    let maxHist = 0;
    let maxEdited = 0;
    
    if (assignedOperatorIds.length > 0) {
      assignedOperatorIds.forEach(opId => {
        const group = operatorGroups[opId];
        if (group.totalStdSeconds > maxStd) maxStd = group.totalStdSeconds;
        if (group.totalHistSeconds > maxHist) maxHist = group.totalHistSeconds;
        if (group.totalEditedSeconds > maxEdited) maxEdited = group.totalEditedSeconds;
      });
    } else {
      maxStd = adjustedStdSeconds;
      maxHist = adjustedHistSeconds;
      maxEdited = adjustedEditedSeconds;
    }

    const durationStdSecondsPerOperator = maxStd;
    const durationHistSecondsPerOperator = maxHist;
    const durationEditedSecondsPerOperator = maxEdited;

    return {
      items: itemsCalculations,
      operatorGroups: Object.values(operatorGroups).sort((a,b) => a.operatorName.localeCompare(b.operatorName)),
      totalQty,
      totalStdSeconds,
      totalHistSeconds,
      totalEditedSeconds,
      adjustedStdSeconds,
      adjustedHistSeconds,
      adjustedEditedSeconds,
      durationStdSecondsPerOperator,
      durationHistSecondsPerOperator,
      durationEditedSecondsPerOperator,
      hasHistoricalData,
    };
  }, [programmedList, db.orders, db.items, db.employees, selectedSectorId, plannerEfficiency, historicalAverages]);

  const calculateEndTime = (startTimeStr: string, durationSeconds: number) => {
    const [h, m] = startTimeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return "--:--";
    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setSeconds(d.getSeconds() + durationSeconds);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScreenLayout>
      <ScreenHeader
        title="Fila & Ritmo Produtivo"
        description="Gerencie o ritmo de trabalho e a fila de produção ativa"
        id="fila_ritmo_header"
      />

      <div className="flex gap-2 p-4 bg-white border-b border-slate-100 sticky top-0 z-30 justify-between items-center">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("FILA")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "FILA"
                ? "bg-indigo-650 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Activity size={15} />
            Fila de Produção
          </button>
          <button
            onClick={() => setActiveTab("MONITOR")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "MONITOR"
                ? "bg-indigo-650 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Gauge size={15} />
            Monitor de Ritmo
          </button>
          <button
            onClick={() => setActiveTab("PROGRAMAR")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "PROGRAMAR"
                ? "bg-indigo-650 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Calendar size={15} />
            Planejar & Simular Dia
          </button>
        </div>

        {activeTab !== "MONITOR" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-bold hidden sm:inline">Setor:</span>
            <select
              value={selectedSectorId}
              onChange={(e) => {
                setSelectedSectorId(Number(e.target.value));
                setProgrammedList([]); // Clear planning when changing sector to avoid cross-sector order confusion
              }}
              className="p-1.5 text-xs font-semibold border rounded-lg bg-slate-50 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {db.sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ScrollContainer>
        {activeTab === "FILA" ? (
          <div className="p-4 flex flex-col gap-4 max-w-5xl mx-auto">
            {/* INSTRUCTIONS OR QUEUE STATUS */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 flex gap-3 items-start shadow-xs">
              <Info className="text-indigo-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-sm text-indigo-950">
                  Como funciona a Fila de Produção?
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Exibe ordens de produção dos lotes ativos liberados pelo encarregado para o setor{" "}
                  <strong className="text-indigo-900">{selectedSector?.name || "selecionado"}</strong>.
                  Os operadores clicam em <strong className="text-indigo-900">Iniciar</strong> para abrir um cronômetro e{" "}
                  <strong className="text-indigo-900">Registrar Apontamento</strong> para concluir as quantidades.
                </p>
              </div>
            </div>

            {/* QUEUE LIST */}
            {queueOrders.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
                <AlertCircle size={40} className="mx-auto text-slate-300 mb-2" />
                <h3 className="font-extrabold text-sm text-slate-700">Fila Vazia</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Nenhum item foi liberado para este setor nesta semana. Use a tela de{" "}
                  <strong>Lotes</strong> para liberar lotes para a produção.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {queueOrders.map((order) => {
                  const item = db.items.find((i) => i.id === order.itemId);
                  const stdTimeSec = getStandardTimeForProduct(order.itemId, selectedSectorId);
                  const sectorConfig = getSectorFields(selectedSector?.name || "");
                  const completedQty = Number(order[sectorConfig.qtyField]) || 0;
                  const remainingQty = Math.max(0, order.totalQuantity - completedQty);
                  
                  // Estimated total time
                  const totalEstSeconds = (stdTimeSec > 0 ? stdTimeSec : 30) * remainingQty;

                  // Find if there is an active timer for this order matching current operator, or any operator
                  let activePack = db.activePacks.find((p) => {
                    const processMatch = p.processName === selectedSector?.name || p.type === sectorConfig.logType;
                    const isMyPack = p.operatorId === currentUser.id;
                    if (!processMatch) return false;
                    
                    // Directly linked
                    if (p.associatedBatchId === order.id) return isMyPack;
                    
                    // Match by item and specs
                    const itemMatch = p.itemId === order.itemId &&
                                      (!p.color || p.color === "N/A" || p.color === "-" || p.color === order.color) &&
                                      (!p.size || p.size === "N/A" || p.size === "-" || p.size === order.size) &&
                                      (!p.variation || p.variation === "N/A" || p.variation === "-" || p.variation === order.variation);
                    return itemMatch && isMyPack;
                  });

                  if (!activePack) {
                    activePack = db.activePacks.find((p) => {
                      const processMatch = p.processName === selectedSector?.name || p.type === sectorConfig.logType;
                      if (!processMatch) return false;
                      
                      if (p.associatedBatchId === order.id) return true;
                      
                      const itemMatch = p.itemId === order.itemId &&
                                        (!p.color || p.color === "N/A" || p.color === "-" || p.color === order.color) &&
                                        (!p.size || p.size === "N/A" || p.size === "-" || p.size === order.size) &&
                                        (!p.variation || p.variation === "N/A" || p.variation === "-" || p.variation === order.variation);
                      return itemMatch;
                    });
                  }

                  const activeOperator = activePack 
                    ? (db.employees.find((e) => e.id === activePack.operatorId) || db.users?.find((u) => u.id === activePack.operatorId))
                    : null;
                  const activeOperatorName = activeOperator ? activeOperator.name : activePack ? `Operador ID: ${activePack.operatorId}` : "";
                  const isMyTimer = activePack ? activePack.operatorId === currentUser.id : false;

                  return (
                    <div
                      key={order.id}
                      className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col gap-3 relative overflow-hidden transition-all duration-300 ${
                        activePack
                          ? isMyTimer
                            ? "border-emerald-500 ring-2 ring-emerald-50 bg-emerald-50/10"
                            : "border-amber-400 ring-2 ring-amber-50 bg-amber-50/10"
                          : order.isUrgent
                          ? "border-red-200 bg-red-50/5"
                          : "border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {/* Priority Tag */}
                      {order.isUrgent && (
                        <div className="absolute top-0 right-0 bg-red-650 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-bl-lg tracking-wider">
                          URGENTE
                        </div>
                      )}

                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                              OP #{order.id}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-950 truncate max-w-40" title={order.customerName}>
                              {order.customerName}
                            </span>
                          </div>
                          <h4 className="font-black text-sm text-slate-800 mt-1">
                            {item?.code} - {item?.name}
                          </h4>
                          <p className="text-[11px] text-slate-450 font-medium mt-0.5">
                            Variação: {order.color || "-"} | {order.size || "-"} | {order.variation || "-"}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Progress */}
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-450 block text-[10px] font-bold uppercase">Progresso</span>
                          <span className="font-extrabold text-slate-700">
                            {completedQty} <span className="text-slate-400 font-normal">de</span> {order.totalQuantity} pçs
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-450 block text-[10px] font-bold uppercase">A Produzir</span>
                          <span className="font-extrabold text-indigo-600">
                            {remainingQty} pçs
                          </span>
                        </div>
                      </div>

                      {/* Pacing Info */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          <div>
                            <span className="text-[10px] text-slate-450 block font-bold">Tempo Estimado</span>
                            <span className="font-bold text-slate-600">
                              {formatSeconds(totalEstSeconds)}
                              {stdTimeSec === 0 && (
                                <span className="text-[10px] text-amber-500 font-semibold ml-1">
                                  (Est.)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-450 block font-bold">Tempo Unitário</span>
                          <span className="font-bold text-slate-500 font-mono">
                            {stdTimeSec > 0 ? `${stdTimeSec}s` : "30s"}
                          </span>
                        </div>
                      </div>

                      {/* Live Timer if Active */}
                      {activePack && (
                        <div className={`border rounded-lg p-2.5 flex flex-col gap-1.5 ${
                          isMyTimer 
                            ? "bg-emerald-50 border-emerald-150 text-emerald-800" 
                            : "bg-amber-50 border-amber-150 text-amber-800"
                        } animate-pulse`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${isMyTimer ? "bg-emerald-500" : "bg-amber-500"}`} />
                              <span className="text-[11px] font-bold">
                                {isMyTimer ? "Seu Cronômetro Ativo" : `Produzindo por: ${activeOperatorName}`}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-black">
                              {formatSeconds(Math.floor((now - activePack.startTime) / 1000))}
                            </span>
                          </div>
                          {!isMyTimer && (
                            <span className="text-[10px] text-amber-700/80 font-semibold">
                              Iniciado em outra tela. Você pode acompanhar ou concluir o apontamento aqui.
                            </span>
                          )}
                        </div>
                      )}

                      {/* ACTIONS */}
                      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                        {activePack ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancelTimer(activePack.id)}
                              className="flex-1 py-2 text-xs font-bold border border-red-250 text-red-650 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Square size={13} />
                              Descartar Tempo
                            </button>
                            <button
                              onClick={() => handleOpenCompleteModal(order, activePack, false)}
                              className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check size={14} />
                              Apontar Produção
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStartProduction(order, 0)}
                                className="flex-1 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-150 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:shadow-lg"
                              >
                                <Play size={13} fill="white" />
                                Iniciar Cronômetro
                              </button>
                              <button
                                onClick={() => {
                                  handleOpenCompleteModal(order, {
                                    id: 0,
                                    itemId: order.itemId,
                                    color: order.color || "",
                                    size: order.size || "",
                                    variation: order.variation || "",
                                    operatorId: currentUser.id,
                                    startTime: Date.now(),
                                    type: getSectorFields(selectedSector?.name || "").logType,
                                    processName: selectedSector?.name || "",
                                  }, true);
                                }}
                                className="flex-1 py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Zap size={13} className="text-indigo-600 fill-indigo-100" />
                                Apontar Sem Cronômetro
                              </button>
                            </div>
                            
                            <button
                              onClick={() => {
                                const minStr = window.prompt("Há quantos minutos você iniciou este trabalho fisicamente? (Ex: 10, 15, 30, etc.)", "15");
                                if (minStr !== null) {
                                  const mins = parseInt(minStr, 10);
                                  if (!isNaN(mins) && mins >= 0) {
                                    handleStartProduction(order, mins);
                                  } else {
                                    alert("Por favor insira um número válido de minutos.");
                                  }
                                }
                              }}
                              className="w-full py-1 text-[10px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-200 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Clock size={11} />
                              Iniciar com Tempo Retroativo (Já em andamento)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "MONITOR" ? (
          <div className="p-4 flex flex-col gap-6 max-w-5xl mx-auto">
            {/* SUPERVISOR STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650 shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Peças Produzidas Hoje</span>
                  <h3 className="text-xl font-black text-indigo-950 mt-0.5">
                    {monitorStats.totalUnitsProduced} pcs
                  </h3>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-650 shrink-0">
                  <Timer size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Tempo de Produção Ativo</span>
                  <h3 className="text-xl font-black text-slate-800 mt-0.5">
                    {monitorStats.totalMinutesLogged} min
                  </h3>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  monitorStats.averageEfficiency >= 95 
                    ? "bg-emerald-50 text-emerald-650"
                    : monitorStats.averageEfficiency >= 80
                    ? "bg-amber-50 text-amber-650"
                    : "bg-red-50 text-red-650"
                }`}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Eficiência de Ritmo Geral</span>
                  <h3 className={`text-xl font-black mt-0.5 ${
                    monitorStats.averageEfficiency >= 95 
                      ? "text-emerald-700" 
                      : monitorStats.averageEfficiency >= 80 
                      ? "text-amber-700" 
                      : "text-red-700"
                  }`}>
                    {monitorStats.averageEfficiency}%
                  </h3>
                </div>
              </div>
            </div>

            {/* LIVE ACTIVE OPERATORS TIMERS */}
            <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                  <h3 className="font-black text-sm text-slate-800">
                    Operadores Produzindo Agora
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {liveActiveTimers.length} ativo(s)
                </span>
              </div>

              {liveActiveTimers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Nenhum operador com cronômetro ativo no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {liveActiveTimers.map((timer) => (
                    <div key={timer.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 uppercase">
                          {timer.operatorName.slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-700">
                            {timer.operatorName}
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {timer.itemName} ({timer.itemCode}) ➔ <strong className="text-indigo-650">{timer.processName}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Tempo Decorrido</span>
                          <span className="text-xs font-mono font-black text-slate-700">
                            {formatSeconds(timer.elapsedSec)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Meta Unitária</span>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {timer.stdSec}s
                          </span>
                        </div>

                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Ritmo de Entrega</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            timer.pacingStatus === "ATRASADO"
                              ? "bg-red-50 text-red-700"
                              : timer.pacingStatus === "NO_RITMO"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            {timer.pacingStatus === "ATRASADO" ? "🔴 ATRASADO" : timer.pacingStatus === "NO_RITMO" ? "🟢 NO RITMO" : "🔵 INICIANDO"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RECENT PRODUCTION LOGS / DAILY EVOLUTION */}
            <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b bg-slate-50/50">
                <h3 className="font-black text-sm text-slate-800">
                  Evolução do Dia (Apontamentos Finalizados)
                </h3>
              </div>

              {monitorStats.logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Nenhum apontamento registrado hoje ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-500">
                        <th className="p-3">Operador</th>
                        <th className="p-3">Setor / Processo</th>
                        <th className="p-3">Quantidade</th>
                        <th className="p-3">Tempo Gasto</th>
                        <th className="p-3">Média / Peça</th>
                        <th className="p-3 text-right">Eficiência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                      {monitorStats.logs.slice(0, 20).map((log) => {
                        const operator = db.employees.find((e) => e.id === log.operatorId);
                        const durationSec = (log.durationMillis || 0) / 1000;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">
                              {operator?.name || log.operatorId}
                            </td>
                            <td className="p-3">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {log.sectorName}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-700">
                              {log.qty} pçs
                            </td>
                            <td className="p-3 font-mono">
                              {formatSeconds(durationSec)}
                            </td>
                            <td className="p-3 font-mono">
                              {formatSeconds(Math.round(log.actualSecPerUnit))}/unid
                            </td>
                            <td className="p-3 text-right">
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                log.efficiency >= 100
                                  ? "bg-emerald-100 text-emerald-800"
                                  : log.efficiency >= 80
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {Math.round(log.efficiency)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================
             PLANNER & DAILY PRODUCTION SIMULATOR TAB
             ======================================================== */
          <div className="p-4 flex flex-col gap-6 max-w-6xl mx-auto animate-in fade-in duration-200">
            {/* Header info bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex gap-3">
                <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-650 shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    Simulador de Carga & Programação Diária: <span className="text-indigo-650">{selectedSector?.name || "Setor"}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Monte a sua programação diária selecionando lotes da fila. Estime a duração e projete o horário de encerramento real da produção.
                  </p>
                </div>
              </div>

              {queueOrders.length > 0 && (
                <button
                  onClick={handleAutoProgramAll}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  Programar Toda a Fila
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: ACTIVE PLANE AND QUEUE SELECTOR */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                
                {/* 1. SECTOR QUEUE SELECTOR */}
                <div id="planner_add_card" className="bg-white border rounded-xl p-4 shadow-xs">
                  <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider mb-3">
                    1. Adicionar Lotes à Programação de Hoje
                  </h4>

                  {/* Manual form */}
                  <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-slate-50 border border-slate-150 rounded-lg">
                    <div className="flex-1 min-w-[200px]">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">🔍 Buscar & Selecionar Produto</label>
                       <div className="flex flex-col gap-1">
                         <input
                           type="text"
                           placeholder="Buscar por nome ou código..."
                           value={plannerSearchItem}
                           onChange={(e) => setPlannerSearchItem(e.target.value)}
                           className="w-full text-xs p-1.5 border rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                         />
                         <select 
                            className="w-full text-xs p-1.5 border rounded"
                            value={plannerSelectedItemId}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : "";
                              setPlannerSelectedItemId(val);
                              if (val) {
                                const std = getStandardTimeForProduct(val, selectedSectorId);
                                const hist = historicalAverages[val];
                                setPlannerItemSec(std || hist || "");
                              } else {
                                setPlannerItemSec("");
                              }
                            }}
                         >
                            <option value="">Selecione um Produto</option>
                            {db.items
                              .filter(item => 
                                !plannerSearchItem ||
                                item.name.toLowerCase().includes(plannerSearchItem.toLowerCase()) ||
                                item.code.toLowerCase().includes(plannerSearchItem.toLowerCase())
                              )
                              .map(item => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)
                            }
                         </select>
                         {plannerSelectedItemId && (
                           <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                             {(() => {
                               const std = getStandardTimeForProduct(Number(plannerSelectedItemId), selectedSectorId);
                               const hist = historicalAverages[Number(plannerSelectedItemId)];
                               return (
                                 <span>
                                   Tempo Padrão: <strong className="text-slate-700">{std ? `${std}s` : "Não definido"}</strong>
                                   {hist ? (
                                     <> | Médio Histórico: <strong className="text-teal-600">{hist}s</strong></>
                                   ) : " | s/ histórico"}
                                 </span>
                               );
                             })()}
                           </div>
                         )}
                       </div>
                    </div>
                    <div className="w-48">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">👤 Buscar & Selecionar Operador</label>
                       <div className="flex flex-col gap-1">
                         <input
                           type="text"
                           placeholder="Buscar por nome..."
                           value={plannerSearchOperator}
                           onChange={(e) => setPlannerSearchOperator(e.target.value)}
                           className="w-full text-xs p-1.5 border rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                         />
                         <select 
                            className="w-full text-xs p-1.5 border rounded"
                            value={plannerSelectedOperatorId}
                            onChange={(e) => setPlannerSelectedOperatorId(e.target.value)}
                         >
                            <option value="">Selecione...</option>
                            {db.employees
                              .filter(e => 
                                !plannerSearchOperator ||
                                e.name.toLowerCase().includes(plannerSearchOperator.toLowerCase())
                              )
                              .map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                            }
                         </select>
                       </div>
                    </div>
                    <div className="w-20">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd</label>
                       <input 
                         type="number" 
                         min="1" 
                         className="w-full text-xs p-1.5 border rounded h-[30px] bg-white"
                         value={plannerItemQty}
                         onChange={(e) => setPlannerItemQty(e.target.value ? Number(e.target.value) : "")}
                       />
                    </div>
                    <div className="w-24">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tempo (s)</label>
                       <input 
                         type="number" 
                         min="1" 
                         placeholder="Opcional"
                         className="w-full text-xs p-1.5 border rounded h-[30px] bg-white"
                         value={plannerItemSec}
                         onChange={(e) => setPlannerItemSec(e.target.value ? Number(e.target.value) : "")}
                       />
                    </div>
                    <button 
                       onClick={handleManualAddProgram}
                       className="px-3 py-1.5 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700 h-[30px] cursor-pointer"
                    >
                       Adicionar
                    </button>
                  </div>

                  <h5 className="font-bold text-xs text-slate-500 mb-2">Ou selecione lotes da fila ativa:</h5>

                  {queueOrders.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center text-xs text-slate-400 italic">
                      Nenhum lote liberado e ativo na fila deste setor no momento. Vá na aba de Lotes de Produção para liberar novos lotes.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      {queueOrders.map((order) => {
                        const sectorConfig = getSectorFields(selectedSector?.name || "");
                        const completedQty = Number(order[sectorConfig.qtyField]) || 0;
                        const remainingQty = Math.max(0, order.totalQuantity - completedQty);
                        const isAlreadyProgrammed = programmedList.some((p) => p.orderId === order.id);

                        if (remainingQty <= 0) return null;

                        return (
                          <div 
                            key={order.id} 
                            className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-slate-50/50 text-xs transition"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-700 truncate">
                                OP #{order.id} - {order.customerName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium truncate">
                                {order.customProductName || "Item"} {order.color ? `| Cor: ${order.color}` : ""} {order.size ? `| Tam: ${order.size}` : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-black text-slate-600">
                                {remainingQty} pçs restantes
                              </span>
                              {isAlreadyProgrammed ? (
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                                  <Check size={11} /> No Plano
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAddToProgram(order.id, remainingQty)}
                                  className="px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                                >
                                  <Plus size={11} /> Programar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. PROGRAMMED ITEMS CONTAINER */}
                <div id="planner_active_plan_card" className="bg-white border rounded-xl p-4 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider">
                      2. Itens Programados para Produção
                    </h4>
                    {programmedList.length > 0 && (
                      <button
                        onClick={handleClearProgram}
                        className="text-red-650 hover:text-red-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Limpar Plano
                      </button>
                    )}
                  </div>
                  {plannerStats.items.length === 0 ? (
                    <div className="p-12 border border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-2">
                      <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                        <Calendar size={22} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        Seu plano de hoje está vazio
                      </span>
                      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                        Selecione lotes da fila acima clicando em <strong>"+ Programar"</strong> ou em <strong>"Programar Toda a Fila"</strong> para iniciar a simulação e planejar o dia!
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {plannerStats.operatorGroups.map((group) => (
                        <div key={group.operatorId} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 p-2.5 border-b font-bold text-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <span className="text-sm">👤 Operador: <strong className="text-indigo-950">{group.operatorName}</strong></span>
                            <div className="flex flex-wrap gap-3 items-center">
                               <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>Liberado (Editado): <strong className="text-indigo-700">{calculateEndTime(plannerStartTime, group.totalEditedSeconds)}</strong></span>
                                  <span>(Padrão): <strong className="text-slate-700">{calculateEndTime(plannerStartTime, group.totalStdSeconds)}</strong></span>
                                  {group.totalHistSeconds > 0 && (
                                    <span>(Médio): <strong className="text-teal-600">{calculateEndTime(plannerStartTime, group.totalHistSeconds)}</strong></span>
                                  )}
                               </div>
                               <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border">Total: {group.totalQty} pçs</span>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse bg-white">
                              <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-150 font-bold text-slate-500">
                                  <th className="p-2.5">Item</th>
                                  <th className="p-2.5">Atribuído a</th>
                                  <th className="p-2.5">Qtd Meta</th>
                                  <th className="p-2.5">Ciclo Padrão</th>
                                  <th className="p-2.5">Ciclo Histórico</th>
                                  <th className="p-2.5">Ciclo Editado</th>
                                  <th className="p-2.5 text-right">Duração / Fim</th>
                                  <th className="p-2.5 text-center">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                {(() => {
                                  const efficiencyFactor = (plannerEfficiency || 100) / 100;
                                  let cumulativeSec = 0;
                                  let cumulativeStdSec = 0;
                                  let cumulativeHistSec = 0;
                                  return group.items.map((item) => {
                                    const sectorConfig = getSectorFields(selectedSector?.name || "");
                                    const completedQty = item.order ? (Number(item.order[sectorConfig.qtyField]) || 0) : 0;
                                    const maxRemaining = item.order ? Math.max(0, item.order.totalQuantity - completedQty) : 99999;
                                    
                                    const adjustedEditedTotal = efficiencyFactor > 0 ? item.itemEditedTotalSec / efficiencyFactor : item.itemEditedTotalSec;
                                    cumulativeSec += adjustedEditedTotal;
                                    const itemEndTime = calculateEndTime(plannerStartTime, cumulativeSec);

                                    const adjustedStdTotal = efficiencyFactor > 0 ? item.itemStdTotalSec / efficiencyFactor : item.itemStdTotalSec;
                                    cumulativeStdSec += adjustedStdTotal;
                                    const itemStdEndTime = calculateEndTime(plannerStartTime, cumulativeStdSec);

                                    const adjustedHistTotal = efficiencyFactor > 0 ? item.itemHistTotalSec / efficiencyFactor : item.itemHistTotalSec;
                                    cumulativeHistSec += adjustedHistTotal;
                                    const itemHistEndTime = calculateEndTime(plannerStartTime, cumulativeHistSec);

                                    return (
                                      <tr key={item.id} className="hover:bg-slate-50/30">
                                        <td className="p-2.5 max-w-44">
                                          <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-slate-800 truncate">
                                              {item.order ? `OP #${item.orderId} - ${item.order.customerName}` : (item.item?.name || "Item Avulso")}
                                            </span>
                                            {item.order && (
                                               <span className="text-[10px] text-slate-500 truncate">
                                                 {item.item?.name} {item.order.color ? `| ${item.order.color}` : ""}
                                               </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2.5">
                                          <select
                                            value={item.operatorId || ""}
                                            onChange={(e) => handleUpdateProgramOperator(item.id, e.target.value)}
                                            className="text-[11px] p-1 border rounded bg-white font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none max-w-[120px]"
                                          >
                                            <option value="">Não Atribuído</option>
                                            {db.employees.map((e) => (
                                              <option key={e.id} value={e.id}>
                                                {e.name}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="p-2.5">
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              min="1"
                                              max={maxRemaining}
                                              value={item.targetQty}
                                              onChange={(e) => {
                                                let val = parseInt(e.target.value, 10);
                                                if (isNaN(val) || val < 1) val = 1;
                                                if (val > maxRemaining) val = maxRemaining;
                                                handleUpdateProgramQty(item.id, val);
                                              }}
                                              className="w-14 border rounded p-1 text-center font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            {item.order && (
                                              <button
                                                onClick={() => handleUpdateProgramQty(item.id, maxRemaining)}
                                                title="Usar quantidade restante máxima"
                                                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1 py-0.5 rounded transition cursor-pointer"
                                              >
                                                MÁX
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2.5 font-mono">
                                          {item.stdSec}s
                                        </td>
                                        <td className="p-2.5">
                                          {item.histSec ? (
                                            <span className="font-mono text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.5 rounded text-[10px]" title="Calculado com base em seus apontamentos passados">
                                              {item.histSec}s méd.
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 italic text-[10px]">Sem histórico</span>
                                          )}
                                        </td>
                                        <td className="p-2.5">
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              min="1"
                                              value={item.editedSec || ""}
                                              onChange={(e) => {
                                                const val = parseInt(e.target.value, 10);
                                                handleUpdateProgramEditedSec(item.id, isNaN(val) ? undefined : val);
                                              }}
                                              placeholder={String(item.stdSec)}
                                              className="w-14 border rounded p-1 text-center font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <span className="text-[10px] text-slate-400">s</span>
                                          </div>
                                        </td>
                                        <td className="p-2.5 font-mono font-bold text-slate-800 text-right">
                                          <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-xs text-slate-800" title="Tempo total editado para a quantidade">{formatSeconds(Math.round(adjustedEditedTotal))}</span>
                                            <div className="text-[9px] text-slate-500 font-medium flex flex-col items-end leading-normal">
                                               <span>Fim (Editado): <strong className="text-indigo-650">{itemEndTime}</strong></span>
                                               <span className="text-slate-400">Fim (Padrão): {itemStdEndTime}</span>
                                               {item.histSec ? (
                                                 <span className="text-teal-600">Fim (Médio): {itemHistEndTime}</span>
                                               ) : null}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="p-2.5 text-center">
                                          <button
                                            onClick={() => handleRemoveFromProgram(item.id)}
                                            className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition cursor-pointer"
                                            title="Remover do plano"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: SIMULATOR PANEL */}
              <div className="flex flex-col gap-5">
                <div id="planner_sidebar_card" className="bg-white border rounded-xl p-4 shadow-xs flex flex-col gap-4">
                  <h4 className="font-black text-xs text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                    <Sliders size={14} className="text-slate-500" />
                    Parâmetros da Produção
                  </h4>

                  {/* Operadores ativos */}
                  <div id="planner_operators_input">
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Operadores Ativos Hoje:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPlannerOperators((prev) => Math.max(1, prev - 1))}
                        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={plannerOperators}
                        onChange={(e) => setPlannerOperators(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="flex-1 h-8 border rounded-lg text-center font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => setPlannerOperators((prev) => prev + 1)}
                        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Define em quantos operadores em paralelo a carga de trabalho será distribuída.
                    </span>
                  </div>

                  {/* Eficiência esperada */}
                  <div id="planner_efficiency_select">
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Eficiência Estimada do Setor:
                    </label>
                    <select
                      value={plannerEfficiency}
                      onChange={(e) => setPlannerEfficiency(Number(e.target.value))}
                      className="w-full h-8 border rounded-lg px-2 text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="100">100% - Ritmo Teórico Padrão</option>
                      <option value="90">90% - Ritmo Excelente</option>
                      <option value="85">85% - Ritmo Prático Saudável (Recomendado)</option>
                      <option value="70">70% - Ritmo Moderado (Com Setups e Paradas)</option>
                      <option value="55">55% - Ritmo Lento / Gargalo</option>
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Ajusta o tempo de produção para contemplar paradas, fadiga ou setups.
                    </span>
                  </div>

                  {/* Início de produção e jornada */}
                  <div className="grid grid-cols-2 gap-3">
                    <div id="planner_start_time_input">
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Horário de Início:
                      </label>
                      <input
                        type="time"
                        value={plannerStartTime}
                        onChange={(e) => setPlannerStartTime(e.target.value)}
                        className="w-full h-8 border rounded-lg px-2 text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div id="planner_shift_hours_input">
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Jornada de Trabalho:
                      </label>
                      <select
                        value={plannerShiftHours}
                        onChange={(e) => setPlannerShiftHours(Number(e.target.value))}
                        className="w-full h-8 border rounded-lg px-2 text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="4">4 horas</option>
                        <option value="6">6 horas</option>
                        <option value="8">8 horas (Turno Normal)</option>
                        <option value="9">9 horas</option>
                        <option value="10">10 horas</option>
                        <option value="12">12 horas</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* RESULTS SUMMARY CARD */}
                <div id="planner_results_card" className="bg-gradient-to-br from-indigo-950 to-indigo-900 text-white rounded-xl p-4 shadow-md">
                  <h4 className="font-extrabold text-xs text-indigo-200 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-indigo-800 pb-2">
                    <TrendingUp size={14} />
                    Resultado da Simulação
                  </h4>

                  <div className="flex flex-col gap-3.5 text-xs">
                    <div className="flex justify-between border-b border-indigo-800/40 pb-2">
                      <span className="text-indigo-200">Total de Peças Planejadas:</span>
                      <span className="font-extrabold text-white text-sm">{plannerStats.totalQty} pçs</span>
                    </div>

                    <div className="flex justify-between border-b border-indigo-800/40 pb-2">
                      <span className="text-indigo-200">Tempo Total Padrão (100%):</span>
                      <span className="font-bold text-white font-mono">{formatSeconds(plannerStats.totalStdSeconds)}</span>
                    </div>

                    <div className="flex justify-between border-b border-indigo-800/40 pb-2">
                      <span className="text-indigo-200">Tempo Ajustado Eficiência:</span>
                      <span className="font-bold text-indigo-150 font-mono" title={`Considerando ${plannerEfficiency}% de eficiência`}>
                        {formatSeconds(Math.round(plannerStats.adjustedStdSeconds))}
                      </span>
                    </div>

                    <div className="bg-indigo-900/60 rounded-lg p-3 border border-indigo-700/30 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Carga por Operador:</span>
                        <span className="font-black text-indigo-400 text-sm font-mono">
                          {formatSeconds(Math.round(plannerStats.durationStdSecondsPerOperator))}
                        </span>
                      </div>
                      
                      {/* Estimate completion date */}
                      {programmedList.length > 0 && (
                        <div className="text-[11px] border-t border-indigo-800/50 pt-1.5 mt-1 text-indigo-150">
                          <div>
                            ➔ Ritmo Editado: <strong className="text-white font-mono">
                              {(() => {
                                const [hStr, mStr] = plannerStartTime.split(":");
                                const h = parseInt(hStr, 10) || 8;
                                const m = parseInt(mStr, 10) || 0;
                                const startDate = new Date();
                                startDate.setHours(h, m, 0, 0);
                                const completionMs = startDate.getTime() + (plannerStats.durationEditedSecondsPerOperator * 1000);
                                const compDate = new Date(completionMs);
                                return compDate.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                              })()}
                            </strong>
                          </div>
                          <div>
                            ➔ Ritmo Padrão: <strong className="text-white font-mono opacity-80">
                              {(() => {
                                const [hStr, mStr] = plannerStartTime.split(":");
                                const h = parseInt(hStr, 10) || 8;
                                const m = parseInt(mStr, 10) || 0;
                                const startDate = new Date();
                                startDate.setHours(h, m, 0, 0);
                                const completionMs = startDate.getTime() + (plannerStats.durationStdSecondsPerOperator * 1000);
                                const compDate = new Date(completionMs);
                                return compDate.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                              })()}
                            </strong>
                          </div>
                          {plannerStats.hasHistoricalData && (
                            <div className="mt-1 text-indigo-300">
                              ➔ Ritmo Histórico Médio: <strong className="text-indigo-200 font-mono">
                                {(() => {
                                  const [hStr, mStr] = plannerStartTime.split(":");
                                  const h = parseInt(hStr, 10) || 8;
                                  const m = parseInt(mStr, 10) || 0;
                                  const startDate = new Date();
                                  startDate.setHours(h, m, 0, 0);
                                  const completionMs = startDate.getTime() + (plannerStats.durationHistSecondsPerOperator * 1000);
                                  const compDate = new Date(completionMs);
                                  return compDate.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                                })()}
                              </strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Capacity indicators progress bar */}
                    {programmedList.length > 0 && (
                      <div className="mt-1">
                        <div className="flex justify-between text-[10px] text-indigo-200 font-bold uppercase mb-1">
                          <span>Ocupação da Jornada ({plannerShiftHours}h)</span>
                          <span>
                            {Math.min(150, Math.round((plannerStats.durationStdSecondsPerOperator / (plannerShiftHours * 3600)) * 100))}%
                          </span>
                        </div>
                        
                        {(() => {
                          const shiftSeconds = plannerShiftHours * 3600;
                          const ratio = shiftSeconds > 0 ? (plannerStats.durationStdSecondsPerOperator / shiftSeconds) * 100 : 0;
                          const pct = Math.min(100, ratio);
                          const isOverload = ratio > 100;

                          return (
                            <div className="flex flex-col gap-2">
                              <div className="w-full bg-indigo-950 rounded-full h-2 overflow-hidden border border-indigo-800/40">
                                <div 
                                  className={`h-full transition-all duration-500 rounded-full ${
                                    isOverload 
                                      ? "bg-red-500" 
                                      : ratio > 80 
                                      ? "bg-amber-400" 
                                      : "bg-emerald-400"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              {isOverload ? (
                                <div className="bg-red-950/80 border border-red-800 text-red-200 text-[10px] font-bold p-2.5 rounded-lg">
                                  ⚠️ SOBRECARGA! A carga excede {plannerShiftHours}h de jornada. Considere aumentar operadores ou dividir o lote.
                                </div>
                              ) : ratio > 80 ? (
                                <div className="bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[10px] font-bold p-2.5 rounded-lg">
                                  ⚡ JORNADA QUASE COMPLETA! Ocupa quase todo o turno planejado de {plannerShiftHours}h.
                                </div>
                              ) : (
                                <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-[10px] font-bold p-2.5 rounded-lg">
                                  ✓ CAPACIDADE ADEQUADA! A produção cabe perfeitamente na jornada de {plannerShiftHours}h.
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Launch button */}
                    {programmedList.length > 0 && (
                      <button
                        id="planner_start_btn"
                        onClick={handleLaunchProgrammedProduction}
                        className="w-full py-3 mt-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-indigo-950 hover:text-indigo-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Play size={14} fill="currentColor" />
                        Salvar e Iniciar Lotes no Cronômetro
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </ScrollContainer>

      {/* APONTAMENTO MODAL */}
      {completingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-indigo-950 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">Registrar Apontamento</span>
                <h3 className="font-black text-sm">Setor: {completingTask.sectorName}</h3>
              </div>
              <button
                onClick={() => setCompletingTask(null)}
                className="text-white/80 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="bg-slate-50 border rounded-lg p-3 text-xs flex flex-col gap-1 text-slate-600">
                <div className="flex justify-between">
                  <span className="font-bold">Cliente:</span>
                  <span>{completingTask.order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Produto:</span>
                  <span className="font-extrabold text-slate-800 truncate max-w-48">
                    {completingTask.order.customProductName || "Item"}
                  </span>
                </div>
                {!isDirectLog && (
                  <div className="flex justify-between">
                    <span className="font-bold">Tempo do Cronômetro:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {formatSeconds(Math.floor((Date.now() - completingTask.activePack.startTime) / 1000))}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Quantidade Produzida (Peças)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 10"
                  value={logQuantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Insira a quantidade de peças processadas e finalizadas neste ciclo.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tempo Efetivo de Operação (Gasto)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={manualMin}
                        onChange={(e) => setManualMin(e.target.value)}
                        className="w-full border rounded-lg p-2.5 pr-8 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-center"
                      />
                      <span className="absolute right-2.5 top-3.5 text-[10px] font-bold text-slate-400">min</span>
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        value={manualSec}
                        onChange={(e) => setManualSec(e.target.value)}
                        className="w-full border rounded-lg p-2.5 pr-8 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-center"
                      />
                      <span className="absolute right-2.5 top-3.5 text-[10px] font-bold text-slate-400">seg</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {isDirectLog 
                    ? "Estimativa pré-preenchida com base no ritmo padrão do setor para esta quantidade. Você pode corrigir livremente."
                    : "Tempo capturado pelo cronômetro. Ajuste caso o cronômetro tenha ficado ligado por engano."
                  }
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-2 justify-end">
              <button
                onClick={() => setCompletingTask(null)}
                className="px-4 py-2 border rounded-lg bg-white text-slate-600 hover:bg-slate-100 text-xs font-bold active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogProduction}
                disabled={isSubmittingLog}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg text-xs font-bold shadow-md shadow-emerald-100 flex items-center gap-1 cursor-pointer active:scale-95 transition"
              >
                {isSubmittingLog ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Confirmar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}
