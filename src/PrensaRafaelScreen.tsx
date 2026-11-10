import React, { useState } from "react";
import {
  Scissors,
  ArrowLeft,
  Search,
  CheckCircle,
  Activity,
  Layers,
  Package,
  ChevronRight,
  Play,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, ProductionBatch, Order } from "./types";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";
import { getVisibleProductionBatches } from "./utils/productionBatchAccess";

export function PrensaRafaelScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [view, setView] = useState<
    "LIST_ACTIVE" | "FINISH_COIL" | "SELECT_PLAN" | "MANUAL_PRODUCTION"
  >("LIST_ACTIVE");

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
  const [batchSearchTerm, setBatchSearchTerm] = useState("");

  // Finish inputs
  const [consumedCoils, setConsumedCoils] = useState<number | "">("");
  const [producedQuantity, setProducedQuantity] = useState<number | "">("");

  // Manual production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProduct, setManualProduct] = useState("");

  const [manualTargetSearch, setManualTargetSearch] = useState("");
  const [manualOrderSearch, setManualOrderSearch] = useState("");
  const [manualTargetQuantity, setManualTargetQuantity] = useState<number | "">("");
  const [selectedManualTargetId, setSelectedManualTargetId] = useState<number | null>(null);
  const [selectedManualOrderId, setSelectedManualOrderId] = useState<number | null>(null);


  const screenType =
    currentUser.role === "INJETORA" ? "INJETORA" : "PRENSA_RAFAEL";

  
  const suggestedManualTargets = React.useMemo(() => {
    const query = manualTargetSearch.trim().toLowerCase();
    if (!query) return [];
    return db.items
      .filter((i) => `${i.code} - ${i.name}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [manualTargetSearch, db.items]);

  const suggestedManualOrders = React.useMemo(() => {
    const query = manualOrderSearch.trim().toLowerCase();
    if (!query) return [];
    return db.orders
      .filter((o) => `${o.orderCode} - ${o.customerName}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [manualOrderSearch, db.orders]);

  const handleStartManualProduction = () => {
    if ((!selectedManualTargetId && !selectedManualOrderId) || !manualTargetQuantity) return;

    const screenType = "PRENSA_RAFAEL";
    const targetName = selectedManualOrderId 
      ? db.orders.find(o => o.id === selectedManualOrderId)?.customerName 
      : db.items.find(i => i.id === selectedManualTargetId)?.name;

    db.addActivePack({
      id: Date.now(),
      itemId: selectedManualTargetId || 0,
      color: "N/A",
      size: "N/A",
      variation: "N/A",
      operatorId: currentUser.id,
      startTime: Date.now(),
      thirdPartyName: selectedManualOrderId ? `Pedido: ${db.orders.find(o => o.id === selectedManualOrderId)?.orderCode}` : `Item: ${db.items.find(i => i.id === selectedManualTargetId)?.code}`,
      customProductName: `${targetName} - Qtd ${manualTargetQuantity}`,
      partName: "Corte Avulso",
      type: "PRENSA_RAFAEL",
    });
    db.addNotification({
      message: `Lote Avulso de Prensa iniciado (${targetName})`,
      read: false,
    });

    setManualTitle("");
    setManualProduct("");
    setManualTargetSearch("");
    setManualOrderSearch("");
    setManualTargetQuantity("");
    setSelectedManualTargetId(null);
    setSelectedManualOrderId(null);
    setView("LIST_ACTIVE");
  };

  

  // Only consider active packs of type "PRENSA_RAFAEL" or "INJETORA"
  const activeTasksList = db.activePacks.filter(
    (p) =>
      p.type === screenType &&
      (currentUser.role === "ADMIN" ||
      currentUser.role === "GERENCIA" ||
      currentUser.role === "LEITURA"
        ? true
        : p.operatorId === currentUser.id),
  );

  const pendingPlans =
    db.coilCuttingPlans?.filter(
      (p) =>
        p.status !== "CONCLUIDO" &&
        (p.type === screenType || (!p.type && screenType === "PRENSA_RAFAEL")),
    ) || [];

  const pendingProductionBatches = React.useMemo(() => {
    if (screenType !== "PRENSA_RAFAEL") return [];

    const permittedSectorIds = new Set(
      [
        ...(currentUser.sectorIds || []),
        ...(db.sectors || [])
          .filter(
            (sector) =>
              sector.role === "PRENSA_RAFAEL" ||
              sector.rolesIncluded?.includes("PRENSA_RAFAEL") ||
              ["prensa", "prensa rafael"].includes(
                (sector.name || "").trim().toLowerCase(),
              ),
          )
          .map((sector) => sector.id),
      ].map(String),
    );

    return getVisibleProductionBatches(
      db.productionBatches,
      currentUser,
      db.activeTenantId,
    ).filter((batch) => {
      if (batch.status === "CONCLUIDO") return false;
      const orderIds = batch.orderIds || [];
      const hasOpenOrder = orderIds.some((orderId) => {
        const order = db.orders.find((candidate) => candidate.id === orderId);
        return (
          !order ||
          order.totalQuantity > (order.producedQuantity || 0)
        );
      });
      if (orderIds.length > 0 && !hasOpenOrder) return false;
      const isAssignedToUser =
        batch.operatorId === currentUser.id ||
        batch.assignedOperatorIds?.includes(currentUser.id) === true;
      const isGerenciaBatch =
        batch.isGerenciaLote === true || batch.sectorId === 999;

      return (
        isAssignedToUser ||
        (!isGerenciaBatch && permittedSectorIds.has(String(batch.sectorId)))
      );
    });
  }, [
    currentUser,
    db.activeTenantId,
    db.orders,
    db.productionBatches,
    db.sectors,
    screenType,
  ]);

  const filteredProductionBatches = React.useMemo(() => {
    const query = batchSearchTerm.trim().toLowerCase();
    if (!query) return pendingProductionBatches;

    return pendingProductionBatches.filter((batch) => {
      if ((batch.name || "").toLowerCase().includes(query)) return true;
      return (batch.orderIds || []).some((orderId) => {
        const order = db.orders.find((candidate) => candidate.id === orderId);
        const item = order
          ? db.items.find((candidate) => candidate.id === order.itemId)
          : undefined;
        return [order?.orderCode, order?.customerName, item?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });
    });
  }, [batchSearchTerm, db.items, db.orders, pendingProductionBatches]);

  const startPlan = (planId: number) => {
    const p = pendingPlans.find((plan) => plan.id === planId);
    if (!p) return;

    if (
      activeTasksList.some(
        (t) => t.operatorId === currentUser.id && t.taskId === planId,
      )
    ) {
      alert("Você já iniciou este corte!");
      return;
    }

    db.addActivePack({
      id: Date.now(),
      itemId: p.targetItemIds && p.targetItemIds.length > 0 ? p.targetItemIds[0] : 0,
      color: "-",
      size: "-",
      variation: "-",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: screenType,
      partName:
        screenType === "INJETORA" ? `Injetora: ${p.name}` : `Corte: ${p.name}`,
      taskId: p.id, // store planId
    });

    // Also mark plan as EM_PRODUCAO
    db.updateCoilCuttingPlan({ ...p, status: "EM_PRODUCAO" });
    setView("LIST_ACTIVE");
  };

  const startProductionBatch = async (batch: ProductionBatch, order: Order) => {
    if (
      !db.activeTenantId ||
      currentUser.tenantId !== db.activeTenantId ||
      batch.tenantId !== db.activeTenantId ||
      !pendingProductionBatches.some((candidate) => candidate.id === batch.id)
    ) {
      return;
    }

    const remaining = Math.max(
      0,
      order.totalQuantity - (order.producedQuantity || 0),
    );
    if (remaining <= 0) return;

    if (
      activeTasksList.some(
        (task) =>
          task.operatorId === currentUser.id &&
          task.associatedBatchId === batch.id &&
          task.orderId === order.id,
      )
    ) {
      alert("Você já iniciou este pedido deste lote!");
      return;
    }

    const item = db.items.find((candidate) => candidate.id === order.itemId);
    await db.addActivePack({
      id: Date.now(),
      itemId: order.itemId,
      color: order.color || "-",
      size: order.size || "-",
      variation: order.variation || "-",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "PRENSA_RAFAEL",
      partName: item?.name || order.customProductName || "Produto",
      customerName: order.customerName,
      orderCode: order.orderCode,
      orderId: order.id,
      associatedBatchId: batch.id,
      associatedBatchName: batch.name,
      partialQuantity: remaining,
      tenantId: db.activeTenantId || currentUser.tenantId,
    });

    if (batch.status === "PENDENTE") {
      await db.setProductionBatchStatus(batch.id, "EM_PRODUCAO");
    }
    setView("LIST_ACTIVE");
  };

  const openFinishScreen = (packId: number) => {
    const t = db.activePacks.find((p) => p.id === packId);
    if (t) {
      setSelectedPlanId(t.taskId ? t.taskId : packId);
      setView("FINISH_COIL");
    }
  };

  const handleFinishCoil = async (isPartial: boolean = false) => {
    const activeTask = activeTasksList.find(
      (t) => t.taskId === selectedPlanId || t.id === selectedPlanId,
    );
    if (!activeTask || !producedQuantity) return;

    const prod = Number(producedQuantity);
    if (!Number.isFinite(prod) || prod <= 0) return;
    const endTime = Date.now();
    const durationMillis = endTime - activeTask.startTime;

    if (activeTask.associatedBatchId && activeTask.orderId) {
      const batch = db.productionBatches.find(
        (candidate) => candidate.id === activeTask.associatedBatchId,
      );
      const order = db.orders.find(
        (candidate) => candidate.id === activeTask.orderId,
      );
      if (
        !batch ||
        !order ||
        currentUser.tenantId !== db.activeTenantId ||
        batch.tenantId !== db.activeTenantId ||
        !batch.orderIds.includes(order.id)
      ) {
        alert("O lote ou pedido não está mais disponível na empresa ativa.");
        return;
      }

      const currentProduced = order.producedQuantity || 0;
      const remaining = Math.max(0, order.totalQuantity - currentProduced);
      if (remaining <= 0 || prod > remaining) {
        alert(`A quantidade informada deve ser menor ou igual ao restante (${remaining} peças).`);
        return;
      }

      const updatedOrder = {
        ...order,
        producedQuantity: currentProduced + prod,
      };
      const remainingAfter = Math.max(
        0,
        order.totalQuantity - updatedOrder.producedQuantity,
      );

      await db.addLogs([
        {
          id: Date.now(),
          operatorId: currentUser.id,
          quantityProcessed: prod,
          type: "PRENSA_RAFAEL",
          timestamp: endTime,
          durationMillis,
          orderId: order.id,
          itemId: order.itemId,
          associatedBatchId: batch.id,
          associatedBatchName: batch.name,
          skipBatchAutoComplete: true,
        },
      ]);
      await db.updateOrders(updatedOrder);

      const orderCompleted = remainingAfter === 0;
      const keepActive = isPartial && !orderCompleted;
      if (keepActive) {
        await db.addActivePack({
          ...activeTask,
          startTime: Date.now(),
          partialQuantity: remainingAfter,
        });
      } else {
        await db.removeActivePack(activeTask.id, true);
        if (orderCompleted) {
          await db.setProductionBatchOrderFlag(
            batch.id,
            order.id,
            "checkedOrderIds",
            true,
          );
          const batchIsComplete = batch.orderIds.every(
            (orderId) =>
              orderId === order.id ||
              batch.checkedOrderIds?.includes(orderId) === true,
          );
          if (batchIsComplete) {
            await db.setProductionBatchStatus(batch.id, "CONCLUIDO");
          }
        }
      }

      db.addNotification({
        message: `Prensa Rafael: ${prod} peças apontadas para ${order.orderCode || `OS ${order.id}`} (Lote ${batch.name}).`,
        read: false,
        tenantId: db.activeTenantId,
      });
      setConsumedCoils("");
      setProducedQuantity("");
      setSelectedPlanId(null);
      setView("LIST_ACTIVE");
      return;
    }

    if (!activeTask.taskId) {
      await db.addLogs([
        {
          id: Date.now(),
          operatorId: currentUser.id,
          quantityProcessed: prod,
          type: "PRENSA_RAFAEL",
          timestamp: endTime,
          durationMillis,
          thirdPartyName: activeTask.thirdPartyName,
          customProductName: activeTask.customProductName,
          itemId: activeTask.itemId || undefined,
        },
      ]);
      if (isPartial) {
        await db.addActivePack({ ...activeTask, startTime: Date.now() });
        alert(`Apontamento parcial inserido! Contagem do lote continua.`);
      } else {
        await db.removeActivePack(activeTask.id);
      }
      setProducedQuantity("");
      setSelectedPlanId(null);
      setView("LIST_ACTIVE");
      return;
    }

    const plan = db.coilCuttingPlans?.find((p) => p.id === activeTask.taskId);
    if (!plan) return;
    const consumed = 0; // Removed as per request

    // 1. Log the production
    await db.addLogs([
      {
        id: Date.now(),
        operatorId: currentUser.id,
        quantityProcessed: prod,
        type: "PRENSA_RAFAEL",
        timestamp: endTime,
        durationMillis,
        coilPlanId: plan.id,
        consumedCoilQty: consumed,
        itemId: plan.targetItemIds && plan.targetItemIds.length > 0 ? plan.targetItemIds[0] : undefined,
      },
    ]);

    // 2. Add Intermediate Stock for the target item(s).
    if (plan.targetItemIds.length > 0) {
      db.addStockMovement({
        itemId: plan.targetItemIds[0],
        color: "-",
        size: "-",
        variation: "-",
        quantity: prod,
        type: "ENTRADA",
        description: `Peças geradas no corte da Prensa Rafael (Plano: ${plan.name})`,
      });
    }

    if (isPartial) {
      await db.addActivePack({ ...activeTask, startTime: Date.now() });
      db.addNotification({
        message: `Apontamento Parcial Prensa Rafael: ${prod} peças computadas. O lote ${plan.name} continua.`,
        read: false,
        tenantId: db.activeTenantId || currentUser.tenantId || "imperio",
      });
      alert(`Apontamento parcial concluído com sucesso!`);
    } else {
      // 3. Update the plan status to CONCLUIDO
      await db.updateCoilCuttingPlan({ ...plan, status: "CONCLUIDO" });
      // 4. Cleanup
      await db.removeActivePack(activeTask.id);
      db.addNotification({
        message: `Corte Finalizado (Prensa Rafael): ${producedQuantity} peças geradas (Plano: ${plan.name}).`,
        read: false,
        tenantId: db.activeTenantId || currentUser.tenantId || "imperio",
      });
    }

    setConsumedCoils("");
    setProducedQuantity("");
    setSelectedPlanId(null);
    setView("LIST_ACTIVE");
  };

  if (view === "SELECT_PLAN") {
    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-indigo-600" /> Lotes e Planos do PCP
          </h2>
          <span className="text-xs bg-indigo-100 text-indigo-800 font-extrabold px-2.5 py-1 rounded-full">
            {pendingProductionBatches.length + pendingPlans.length} disponíveis
          </span>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          {pendingProductionBatches.length === 0 && pendingPlans.length === 0 && (
            <p className="text-gray-500 text-center mt-4 border p-6 rounded bg-gray-50">
              O PCP não programou lotes ou planos pendentes para esta estação.
            </p>
          )}

          {pendingProductionBatches.length > 0 && (
            <section className="mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                <Package size={16} className="text-indigo-600" /> Lotes industriais ({filteredProductionBatches.length})
              </h3>
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={batchSearchTerm}
                  onChange={(event) => setBatchSearchTerm(event.target.value)}
                  placeholder="Buscar lote, pedido, cliente ou produto..."
                  className="border border-indigo-200 pl-9 pr-3 py-2 rounded-xl text-sm w-full focus:outline-indigo-500 bg-white"
                />
              </div>
              {filteredProductionBatches.length === 0 ? (
                <p className="text-gray-500 text-center border border-dashed p-5 rounded bg-gray-50 text-sm">
                  Nenhum lote corresponde à busca.
                </p>
              ) : (
                <div className="grid gap-2.5">
                  {filteredProductionBatches.map((batch) => {
                    const isExpanded = expandedBatchId === batch.id;
                    const batchOrders = (db.orders || []).filter((order) =>
                      (batch.orderIds || []).includes(order.id),
                    );
                    const activeOrders = batchOrders.filter(
                      (order) =>
                        order.totalQuantity - (order.producedQuantity || 0) > 0,
                    );

                    return (
                      <div
                        key={batch.id}
                        className="bg-white border border-indigo-200 rounded-xl shadow-sm overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedBatchId(isExpanded ? null : batch.id)
                          }
                          className="w-full p-3.5 flex items-center justify-between text-left bg-slate-50/70 hover:bg-indigo-50/50 transition"
                        >
                          <span className="min-w-0 flex flex-col pr-3">
                            <span className="font-bold text-sm text-gray-900 truncate">
                              📦 {batch.name}
                            </span>
                            <span className="text-[11px] text-gray-500 mt-1">
                              {activeOrders.length} {activeOrders.length === 1 ? "pedido pendente" : "pedidos pendentes"}
                              {batch.deadline && ` · Prazo: ${new Date(batch.deadline).toLocaleDateString()}`}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`text-[9px] font-extrabold px-2 py-1 rounded uppercase ${batch.status === "EM_PRODUCAO" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"}`}>
                              {batch.status === "EM_PRODUCAO" ? "Em produção" : "Pendente"}
                            </span>
                            <ChevronRight
                              size={16}
                              className={`text-indigo-600 transition ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-3 border-t border-slate-100 grid gap-2">
                            {batchOrders.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">
                                Este lote não possui pedidos vinculados.
                              </p>
                            ) : (
                              batchOrders.map((order) => {
                                const item = db.items.find(
                                  (candidate) => candidate.id === order.itemId,
                                );
                                const remaining = Math.max(
                                  0,
                                  order.totalQuantity - (order.producedQuantity || 0),
                                );

                                return (
                                  <div
                                    key={order.id}
                                    className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                                  >
                                    <span className="min-w-0 flex flex-col">
                                      <span className="font-bold text-xs text-slate-900 truncate">
                                        {item?.name || order.customProductName || "Produto"}
                                      </span>
                                      <span className="text-[10px] text-slate-500 truncate">
                                        OS: <strong>{order.orderCode || `#${order.id}`}</strong> · {order.customerName}
                                      </span>
                                      <span className="text-[10px] text-indigo-700 font-medium">
                                        Restante: <strong>{remaining} pçs</strong>
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      disabled={remaining <= 0}
                                      onClick={() => startProductionBatch(batch, order)}
                                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-[11px] px-2.5 py-1.5 rounded-md shrink-0 flex items-center gap-1"
                                    >
                                      <Play size={12} fill="currentColor" /> Iniciar
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {pendingPlans.length > 0 && (
            <section>
              <h3 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                <Scissors size={16} className="text-indigo-600" /> Planos de corte de bobina ({pendingPlans.length})
              </h3>
            <div className="grid gap-3">
              {pendingPlans.map((plan) => {
                const targetItem =
                  plan.targetItemIds && plan.targetItemIds.length > 0
                    ? db.items.find((i) => i.id === plan.targetItemIds[0])
                    : null;
                const planLogs = (db.logs || []).filter((l) => l.coilPlanId === plan.id);
                const totalProduced = planLogs.reduce((acc, curr) => acc + (curr.quantityProcessed || 0), 0);

                return (
                  <div
                    key={plan.id}
                    onClick={() => startPlan(plan.id)}
                    className="bg-white p-4 border border-indigo-200 flex justify-between items-center rounded-lg shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-md transition group"
                  >
                    <div className="flex flex-col flex-1 pl-1 border-l-4 border-indigo-500">
                      <span className="font-bold text-gray-800 flex items-center gap-2 pl-2">
                        {plan.name}
                      </span>
                      {targetItem && (
                        <span className="text-[11px] text-gray-500 mt-1 pl-2 font-medium">
                          📦 Peça Gerada:{" "}
                          <strong className="text-slate-800">
                            {targetItem.name}
                          </strong>
                        </span>
                      )}
                      {totalProduced > 0 && (
                        <span className="text-[11px] text-indigo-600 mt-1 pl-2 font-bold flex items-center gap-1 bg-indigo-50 w-max px-2 py-0.5 rounded border border-indigo-150">
                          🔄 Já Produzido: <strong className="text-indigo-800">{totalProduced} pçs</strong>
                        </span>
                      )}
                      {plan.plannedExecutionDate && (
                        <span className="text-[11px] text-gray-500 mt-1 pl-2 font-medium">
                          Data Prevista:{" "}
                          <strong className="text-slate-800">
                            {new Date(
                              plan.plannedExecutionDate,
                            ).toLocaleDateString()}
                          </strong>
                        </span>
                      )}
                      {plan.requiresMoldChange && (
                        <span className="text-[11px] text-orange-600 mt-1 pl-2 font-bold animate-pulse">
                          ⚠️ Exige Troca de Molde
                        </span>
                      )}
                      {plan.batchId && (() => {
                        const batch = db.productionBatches.find(b => b.id === plan.batchId);
                        if (batch) {
                          return (
                            <span className="text-[10px] mt-1.5 ml-2 w-max bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-extrabold uppercase border border-amber-200 block">
                              📦 Lote: {batch.name}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] uppercase text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded mb-1 border border-indigo-100">
                        {plan.status === "EM_PRODUCAO"
                          ? "Sendo Cortada"
                          : "Aguardando"}
                      </span>
                      <button className="text-xs bg-indigo-600 text-white font-bold py-1 px-3 mt-1 rounded opacity-0 group-hover:opacity-100 transition">
                        INICIAR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  if (view === "FINISH_COIL" && selectedPlanId) {
    const plan = db.coilCuttingPlans?.find((p) => p.id === selectedPlanId);
    const activePack = activeTasksList.find(
      (t) => t.id === selectedPlanId || t.taskId === selectedPlanId,
    );
    const linkedOrder = activePack?.orderId
      ? db.orders.find((order) => order.id === activePack.orderId)
      : undefined;
    const linkedBatch = activePack?.associatedBatchId
      ? db.productionBatches.find(
          (batch) => batch.id === activePack.associatedBatchId,
        )
      : undefined;
    const isBatchProduction = Boolean(linkedOrder && linkedBatch);

    // Fallbacks if manual (no plan)
    const activeTaskItemId = activePack?.itemId;
    const manualItem = activeTaskItemId ? db.items.find((i) => i.id === activeTaskItemId) : null;
    const targetItem = plan?.targetItemIds?.length ? db.items.find((i) => i.id === plan.targetItemIds[0]) : null;

    const title = plan
      ? plan.name
      : activePack?.customProductName || activePack?.partName || "Corte Manual";
    const subtitle = plan
      ? `Peça Gerada: ${targetItem ? targetItem.name : "Não especificada"}`
      : isBatchProduction
        ? `Lote: ${linkedBatch?.name} · OS: ${linkedOrder?.orderCode || linkedOrder?.id} · ${linkedOrder?.customerName}`
      : manualItem 
        ? `Peça Gerada: ${manualItem.name}`
        : `Cliente/Projeto: ${activePack?.thirdPartyName}`;

    const planLogs = plan ? (db.logs || []).filter((l) => l.coilPlanId === plan.id) : [];
    const batchLogs = isBatchProduction
      ? (db.logs || []).filter(
          (log) =>
            log.associatedBatchId === linkedBatch?.id &&
            log.orderId === linkedOrder?.id &&
            log.type === "PRENSA_RAFAEL",
        )
      : [];
    const totalProduced = [...planLogs, ...batchLogs].reduce(
      (acc, curr) => acc + (curr.quantityProcessed || 0),
      0,
    );
    const batchRemaining = linkedOrder
      ? Math.max(
          0,
          linkedOrder.totalQuantity - (linkedOrder.producedQuantity || 0),
        )
      : undefined;

    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-100 w-full flex flex-col gap-4 text-center">
          <div>
            <h3 className="font-extrabold text-xl text-indigo-950">{title}</h3>
            <p className="text-indigo-600 text-sm mt-1 font-semibold">
              {subtitle}
            </p>
            {totalProduced > 0 && (
              <div className="bg-indigo-50 border border-indigo-150 text-indigo-800 rounded-lg p-2.5 text-[11px] font-semibold text-left flex flex-col gap-0.5 mt-2.5 max-w-sm mx-auto">
                <span className="font-bold text-indigo-950">🔄 Produção Parcial Acumulada:</span>
                <span>{totalProduced} peças já foram enviadas/computadas neste lote.</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-sm font-semibold text-gray-700">
                {isBatchProduction ? "Peças Produzidas" : "Peças Intermediárias Geradas"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={batchRemaining}
                value={producedQuantity}
                onChange={(e) => setProducedQuantity(Number(e.target.value))}
                placeholder="Ex: 1500"
                className="border border-indigo-300 ring-4 ring-indigo-50 p-3 rounded-lg text-2xl font-bold text-center focus:outline-indigo-600 focus:ring-indigo-100 bg-white text-indigo-900"
              />
              <span className="text-[10px] text-slate-500 leading-tight mt-1">
                {isBatchProduction
                  ? `Restante neste pedido: ${batchRemaining} peças.`
                  : "Quantidade de peças que serão lançadas no estoque intermediário."}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => handleFinishCoil(true)}
              disabled={!producedQuantity}
              className="bg-sky-600 text-white font-extrabold p-3 rounded-lg hover:bg-sky-700 transition disabled:opacity-50 shadow-sm flex justify-center items-center gap-2 uppercase tracking-wide text-[11px]"
            >
              Apontamento Parcial (Continuar Produzindo)
            </button>
            <button
              onClick={() => handleFinishCoil(false)}
              disabled={!producedQuantity}
              className="bg-indigo-600 text-white font-extrabold p-4 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-md flex justify-center items-center gap-2 uppercase tracking-wide text-sm"
            >
              <CheckCircle size={18} /> {isBatchProduction ? "Finalizar Pedido" : "Validar Corte e Estoque"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "MANUAL_PRODUCTION") {
    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border w-full flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 text-indigo-800 border-b pb-2">
            <Activity className="w-5 h-5" />
            <h3 className="font-bold text-xl">Lançamento Avulso (Prensa)</h3>
          </div>
          <p className="text-sm text-gray-500">
            Registre e inicie a contagem de tempo de corte/prensa para
            terceiros.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Selecione Item ou Pedido</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input type="text" placeholder="Buscar componente..." className="border p-2 rounded w-full text-sm" value={manualTargetSearch} onChange={e => {setManualTargetSearch(e.target.value); setSelectedManualTargetId(null);}} />
                {suggestedManualTargets.length > 0 && !selectedManualTargetId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1">
                    {suggestedManualTargets.map(i => (
                      <button key={i.id} type="button" onClick={() => { setSelectedManualTargetId(i.id); setManualTargetSearch(i.name); setSelectedManualOrderId(null); setManualOrderSearch(""); }} className="block w-full text-left p-1 text-sm hover:bg-gray-100">{i.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <input type="text" placeholder="Buscar pedido..." className="border p-2 rounded w-full text-sm" value={manualOrderSearch} onChange={e => {setManualOrderSearch(e.target.value); setSelectedManualOrderId(null);}} />
                {suggestedManualOrders.length > 0 && !selectedManualOrderId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1">
                    {suggestedManualOrders.map(o => (
                      <button key={o.id} type="button" onClick={() => { setSelectedManualOrderId(o.id); setManualOrderSearch(o.customerName); setSelectedManualTargetId(null); setManualTargetSearch(""); }} className="block w-full text-left p-1 text-sm hover:bg-gray-100">{o.customerName}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-2">
              <label className="text-sm font-semibold text-gray-700">Qtd. a Produzir</label>
              <input type="number" value={manualTargetQuantity} onChange={e => setManualTargetQuantity(e.target.value === "" ? "" : Number(e.target.value))} className="border p-2 rounded w-full text-sm" min={1} />
            </div>
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={(!selectedManualTargetId && !selectedManualOrderId) || !manualTargetQuantity}
            className="bg-indigo-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Activity size={18} /> Iniciar Processo
          </button>
        </div>
      </div>
    );
  }

  return (
    <ScreenLayout className="bg-slate-50 relative">
      <ScrollContainer
        paddingSize="dense"
        className="w-full max-w-2xl mx-auto flex flex-col gap-4"
      >
        {/* Header Widget */}
        <div
          className="flex items-center gap-2.5 md:gap-3 bg-gradient-to-r from-violet-600 to-indigo-505 p-3 md:p-4 rounded-xl text-white shadow-md shrink-0"
          style={{ background: "linear-gradient(to right, #4f46e5, #0ea5e9)" }}
        >
          <Activity className="animate-pulse w-6 h-6 md:w-8 md:h-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-xl font-bold font-sans text-white leading-tight truncate">
              Produção - Estação Dobra & Corte
            </h2>
            <p className="text-[10px] md:text-xs text-indigo-50 font-mono truncate">
              Operador: {currentUser.name} | Máquina Rafael Ativa
            </p>
          </div>
        </div>

        <ProductivityCard db={db} currentUser={currentUser} />

        {/* Apontamento de Paradas de Máquina */}
        <MachineStopWidget db={db} currentUser={currentUser} machineName="Prensa/Corte Rafael" />

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView("MANUAL_PRODUCTION")}
            className="bg-indigo-100 text-indigo-800 p-3.5 rounded-xl text-xs font-bold hover:bg-indigo-200 transition uppercase"
          >
            Corte Avulso
          </button>
          <button
            onClick={() => setView("SELECT_PLAN")}
            className="flex-1 bg-indigo-600 text-white p-3.5 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2 transition uppercase"
          >
            <Layers size={18} /> Lotes e Planos do PCP
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          {/* RESUMO DIÁRIO */}
          <DailySummaryWidget db={db} currentUser={currentUser} />

          <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2 text-sm mt-2">
            <Activity size={16} /> Produção em Andamento
          </h3>
          {activeTasksList.length === 0 ? (
            <p className="text-gray-500 text-center mt-6 text-sm">
              Nenhum corte ou lote iniciado.
            </p>
          ) : (
            <div className="grid gap-2">
              {activeTasksList.map((pack) => {
                return (
                  <div
                    key={pack.id}
                    onClick={() => openFinishScreen(pack.id)}
                    className="border p-2.5 flex justify-between items-center rounded-md shadow-sm transition bg-indigo-50 border-indigo-100 cursor-pointer hover:border-indigo-300 group"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <Scissors size={12} className="text-indigo-600" />{" "}
                        {pack.partName}
                      </span>
                      {pack.associatedBatchName && (
                        <span className="text-[10px] text-indigo-700 mt-0.5">
                          {pack.associatedBatchName} · {pack.orderCode || "Pedido"}
                        </span>
                      )}
                      <span className="text-[10px] text-indigo-700 font-mono mt-0.5 font-bold">
                        {Date.now() - pack.startTime > 60000
                          ? `${Math.floor((Date.now() - pack.startTime) / 60000)} min decorridos`
                          : "Iniciado agora"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold uppercase text-white bg-indigo-600 px-2.5 py-1 rounded-full group-hover:bg-indigo-700">
                        Concluir
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollContainer>
    </ScreenLayout>
  );
}
