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
  Info
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
  const [activeTab, setActiveTab] = useState<"FILA" | "MONITOR">("FILA");
  
  // Selected Sector for the queue view
  const [selectedSectorId, setSelectedSectorId] = useState<number>(() => {
    // Try to auto-select sector of current employee
    const emp = db.employees.find((e) => e.id === currentUser.id);
    if (emp && emp.sectorId) return emp.sectorId;
    return db.sectors[0]?.id || 0;
  });

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

  // Sector helper
  const selectedSector = useMemo(() => {
    return db.sectors.find((s) => s.id === selectedSectorId);
  }, [db.sectors, selectedSectorId]);

  // Liberated orders for selected sector queue
  const queueOrders = useMemo(() => {
    if (!selectedSectorId) return [];
    
    // Find active batches for this sector
    const sectorBatches = db.productionBatches.filter(
      (b) => b.sectorId === selectedSectorId && b.status !== "CONCLUIDO"
    );

    // Collect all order IDs that are liberated in these batches
    const liberatedIds = new Set<number>();
    sectorBatches.forEach((b) => {
      if (Array.isArray(b.liberatedOrderIds)) {
        b.liberatedOrderIds.forEach((id) => liberatedIds.add(id));
      }
    });

    // Find the actual orders
    return db.orders.filter(
      (o) => o.isActive && liberatedIds.has(o.id) && o.status !== "FATURADO" && o.status !== "CANCELADO"
    ).sort((a, b) => {
      // Prioritize urgent orders, then date
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return a.createdAt - b.createdAt;
    });
  }, [db.orders, db.productionBatches, selectedSectorId]);

  // Map to get standard cycle time for each product/sector
  const getStandardTimeForProduct = (itemId: number, sectorId: number) => {
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
  const handleStartProduction = async (order: Order) => {
    if (!selectedSector) return;
    
    // Create an active pack
    const activePackData: Omit<ActiveTask, "id"> = {
      itemId: order.itemId,
      color: order.color || "",
      size: order.size || "",
      variation: order.variation || "",
      operatorId: currentUser.id,
      startTime: Date.now(),
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
  const handleOpenCompleteModal = (order: Order, activePack: ActiveTask) => {
    if (!selectedSector) return;
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
  };

  // Submits the finished production log
  const handleLogProduction = async () => {
    if (!completingTask) return;
    const qtyNum = Number(logQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Por favor, insira uma quantidade válida maior que zero.");
      return;
    }

    setIsSubmittingLog(true);
    try {
      const { order, activePack, sectorName } = completingTask;
      const elapsedMillis = Date.now() - activePack.startTime;
      const sectorConfig = getSectorFields(sectorName);

      // Create new Production Log
      const newLog: ProductionLog = {
        id: Date.now(),
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

      // Remove Active Timer Session
      await db.removeActivePack(activePack.id);

      setCompletingTask(null);
      setLogQuantity("");
      alert("Apontamento registrado com sucesso!");
    } catch (e: any) {
      alert("Erro ao salvar apontamento: " + e.message);
    } finally {
      setIsSubmittingLog(false);
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

  return (
    <ScreenLayout>
      <ScreenHeader
        title="Fila & Ritmo Produtivo"
        description="Gerencie o ritmo de trabalho e a fila de produção ativa"
        id="fila_ritmo_header"
      />

      <div className="flex gap-2 p-4 bg-white border-b border-slate-100 sticky top-0 z-30 justify-between items-center">
        <div className="flex gap-1.5">
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
        </div>

        {activeTab === "FILA" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-bold hidden sm:inline">Setor:</span>
            <select
              value={selectedSectorId}
              onChange={(e) => setSelectedSectorId(Number(e.target.value))}
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
                      <div className="flex gap-2 border-t border-slate-100 pt-3">
                        {activePack ? (
                          <>
                            <button
                              onClick={() => handleCancelTimer(activePack.id)}
                              className="flex-1 py-2 text-xs font-bold border border-red-250 text-red-650 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Square size={13} />
                              Descartar Tempo
                            </button>
                            <button
                              onClick={() => handleOpenCompleteModal(order, activePack)}
                              className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check size={14} />
                              Apontar Produção
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartProduction(order)}
                            className="w-full py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-150 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:shadow-lg"
                          >
                            <Play size={14} fill="white" />
                            Iniciar Produção (Ativar Cronômetro)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
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
                <div className="flex justify-between">
                  <span className="font-bold">Tempo Decorrido:</span>
                  <span className="font-mono font-black text-indigo-700">
                    {formatSeconds(Math.floor((Date.now() - completingTask.activePack.startTime) / 1000))}
                  </span>
                </div>
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
                  onChange={(e) => setLogQuantity(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Insira a quantidade de peças processadas e finalizadas neste ciclo de tempo.
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
