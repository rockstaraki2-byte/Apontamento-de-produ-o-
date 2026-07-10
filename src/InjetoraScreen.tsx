import React, { useState } from "react";
import {
  Hammer,
  ArrowLeft,
  Search,
  CheckCircle,
  Activity,
  Layers,
  Flame,
  Thermometer,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, CoilCuttingPlan } from "./types";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";

export function InjetoraScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [view, setView] = useState<
    "LIST_ACTIVE" | "FINISH_RUN" | "SELECT_PLAN" | "MANUAL_PRODUCTION"
  >("LIST_ACTIVE");

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Injection Finishing Inputs
  const [sacosEmbalados, setSacosEmbalados] = useState<number | "">("");
  const [itensPorSaco, setItensPorSaco] = useState<number | "">("");
  const [consumedResinKg, setConsumedResinKg] = useState<number | "">("");
  const [producedQuantity, setProducedQuantity] = useState<number | "">("");
  const [scrapKg, setScrapKg] = useState<number | "">("");
  const [resinType, setResinType] = useState("PP"); // PP, PE, ABS, Nylon

  // Mold Change Checklists (for jobs marked with requireMoldChange)
  const [moldChanged, setMoldChanged] = useState(false);
  const [setupSafetyDone, setSetupSafetyDone] = useState(false);
  const [temperatureStable, setTemperatureStable] = useState(false);

  // Manual production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProduct, setManualProduct] = useState("");

  const [manualTargetSearch, setManualTargetSearch] = useState("");
  const [manualOrderSearch, setManualOrderSearch] = useState("");
  const [manualTargetQuantity, setManualTargetQuantity] = useState<number | "">("");
  const [selectedManualTargetId, setSelectedManualTargetId] = useState<number | null>(null);
  const [selectedManualOrderId, setSelectedManualOrderId] = useState<number | null>(null);


  const screenType = "INJETORA";

  // Filter local runs
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
      (p) => p.status !== "CONCLUIDO" && p.type === screenType,
    ) || [];

  
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

    const screenType = "INJETORA";
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
      partName: "Injeção Plástica Manual",
      type: "INJETORA",
    });
    db.addNotification({
      message: `Lote Avulso de Injeção iniciado (${targetName})`,
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

  

  const startPlan = (planId: number) => {
    const p = pendingPlans.find((plan) => plan.id === planId);
    if (!p) return;

    if (
      activeTasksList.some(
        (t) => t.operatorId === currentUser.id && t.taskId === planId,
      )
    ) {
      alert("Você já iniciou esta injeção!");
      return;
    }

    // Reset Checklist before starting
    setMoldChanged(false);
    setSetupSafetyDone(false);
    setTemperatureStable(false);

    const targetItemId = p.targetItemIds && p.targetItemIds[0];
    const targetItem = targetItemId ? db.items.find((i) => i.id === targetItemId) : null;
    const prodName = targetItem ? targetItem.name : p.name;

    db.addActivePack({
      id: Date.now(),
      itemId: p.targetItemIds && p.targetItemIds.length > 0 ? p.targetItemIds[0] : 0,
      color: "-",
      size: "-",
      variation: "-",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: screenType,
      partName: `Injetora: ${p.name}`,
      customProductName: prodName,
      taskId: p.id,
    });

    db.updateCoilCuttingPlan({ ...p, status: "EM_PRODUCAO" });
    setView("LIST_ACTIVE");
  };

  const openFinishScreen = (packId: number) => {
    const t = db.activePacks.find((p) => p.id === packId);
    if (t) {
      setSelectedPlanId(t.taskId ? t.taskId : packId);
      setView("FINISH_RUN");
    }
  };

  const handleFinishRun = (isPartial: boolean = false) => {
    const activeTask = activeTasksList.find(
      (t) => t.taskId === selectedPlanId || t.id === selectedPlanId,
    );
    if (!activeTask) return;

    const qtyBags = Number(sacosEmbalados || 0);
    const qtyPerBag = Number(itensPorSaco || 0);
    const prod = qtyBags * qtyPerBag;
    if (prod <= 0) {
      alert("A quantidade produzida calculada deve ser maior que zero!");
      return;
    }

    // Calcula com base no último startTime para não inflar o durationMillis nos apontamentos seguintes
    const endTime = Date.now();
    const durationMillis = endTime - activeTask.startTime;

    if (!activeTask.taskId) {
      db.addLogs([
        {
          id: Date.now(),
          operatorId: currentUser.id,
          quantityProcessed: prod,
          type: "INJETORA",
          timestamp: endTime,
          durationMillis,
          thirdPartyName: activeTask.thirdPartyName,
          customProductName: activeTask.customProductName,
          itemId: activeTask.itemId || undefined,
        },
      ]);

      if (isPartial) {
        db.addActivePack({
          ...activeTask,
          startTime: Date.now(),
        });
        alert(`Apontamento parcial inserido! Contagem do lote prossegue.`);
      } else {
        db.removeActivePack(activeTask.id);
      }
      setSacosEmbalados("");
      setItensPorSaco("");
      setSelectedPlanId(null);
      setView("LIST_ACTIVE");
      return;
    }

    const plan = db.coilCuttingPlans?.find((p) => p.id === activeTask.taskId);
    if (!plan) return;

    // 1. Production log specific for injection plastic
    db.addLogs([
      {
        id: Date.now(),
        operatorId: currentUser.id,
        quantityProcessed: prod,
        type: "INJETORA",
        timestamp: endTime,
        durationMillis,
        coilPlanId: plan.id, // linked plan id
        consumedCoilQty: 0, // no longer requested
        customProductName: activeTask.customProductName,
        itemId: plan.targetItemIds && plan.targetItemIds.length > 0 ? plan.targetItemIds[0] : undefined,
      },
    ]);

    // 2. Add Stock for first target item is now handled automatically by addLogs
    // based on whether the item is a PRODUTO or PECA

    // 3. Update Plan status to CONCLUIDO (Only if not partial)
    if (!isPartial) {
      db.updateCoilCuttingPlan({ ...plan, status: "CONCLUIDO" });
    }

    // 4. Clean & Notification
    if (isPartial) {
      db.addActivePack({
        ...activeTask,
        startTime: Date.now(),
      });
      db.addNotification({
        message: `Apontamento Parcial Injeção: ${prod} peças computadas. Lote ${plan.name} segue ativo.`,
        read: false,
      });
      alert(`Apontamento parcial inserido com sucesso!`);
    } else {
      db.removeActivePack(activeTask.id);
      db.addNotification({
        message: `Injeção Finalizada: ${prod} peças injetadas (${qtyBags} sacos x ${qtyPerBag} un).`,
        read: false,
      });
    }

    setSacosEmbalados("");
    setItensPorSaco("");
    setSelectedPlanId(null);
    setView("LIST_ACTIVE");
  };

  const handleCancelTask = (packId: number) => {
    if (!window.confirm("Deseja realmente cancelar este lote ativo?")) return;
    const task = db.activePacks.find((p) => p.id === packId);
    if (task) {
      if (task.taskId) {
        const plan = db.coilCuttingPlans?.find((p) => p.id === task.taskId);
        if (plan) {
          db.updateCoilCuttingPlan({ ...plan, status: "PENDENTE" });
        }
      }
      db.removeActivePack(packId);
    }
  };

  return (
    <ScreenLayout className="bg-slate-50 relative">
      <ScrollContainer
        paddingSize="dense"
        className="w-full max-w-2xl mx-auto flex flex-col gap-4"
      >
        {/* Header Widget */}
        <div className="flex items-center gap-2.5 md:gap-3 bg-gradient-to-r from-orange-600 to-amber-500 p-3 md:p-4 rounded-xl text-white shadow-md shrink-0">
          <Activity className="animate-pulse w-6 h-6 md:w-8 md:h-8 shrink-0" />
          <div className="min-w-0 flex-1 text-left">
            <h2 className="text-base md:text-xl font-bold font-sans text-white leading-tight truncate">
              Produção - Injetora de Peças Plásticas
            </h2>
            <p className="text-[10px] md:text-xs text-orange-100 font-mono truncate">
              Operador: {currentUser.name} | Máquina Injetora Ativa
            </p>
          </div>
        </div>

        <ProductivityCard db={db} currentUser={currentUser} />

        {/* Apontamento de Paradas de Máquina */}
        <MachineStopWidget db={db} currentUser={currentUser} machineName="Injetora" />

        {view === "LIST_ACTIVE" && (
          <div className="flex-1 flex flex-col gap-4">
            <DailySummaryWidget db={db} currentUser={currentUser} />

            <div className="flex gap-2">
              <button
                onClick={() => setView("SELECT_PLAN")}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold p-3.5 rounded-xl shadow-sm transition uppercase text-xs tracking-wider flex items-center justify-center gap-2"
              >
                <Flame size={16} /> Programas do PCP
              </button>
              <button
                onClick={() => setView("MANUAL_PRODUCTION")}
                className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-bold p-3.5 rounded-xl shadow-sm transition uppercase text-xs tracking-wider flex items-center justify-center gap-2"
              >
                Injeção Avulsa/Piloto
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                Lotes Ativos na Injetora
              </h3>

              {activeTasksList.length === 0 ? (
                <div className="border border-slate-200 border-dashed bg-white rounded-xl p-10 text-center flex flex-col items-center justify-center text-slate-500">
                  <Thermometer
                    size={36}
                    className="text-slate-350 mb-2 animate-bounce"
                  />
                  <p className="font-bold">Nenhum lote ativo sendo injetado</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Clique em "Programas do PCP" acima para selecionar as peças
                    de plástico programadas para injeção.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeTasksList.map((task) => {
                    const plan = db.coilCuttingPlans?.find(
                      (p) => p.id === task.taskId,
                    );
                    const setupIncomplete =
                      plan?.requiresMoldChange &&
                      (!moldChanged || !setupSafetyDone || !temperatureStable);

                    return (
                      <div
                        key={task.id}
                        className="bg-white border-2 border-orange-500 rounded-2xl shadow-sm overflow-hidden"
                      >
                        <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
                          <div>
                            <span className="text-[10px] bg-orange-200 text-orange-800 border border-orange-300 font-extrabold px-1.5 py-0.5 rounded uppercase">
                              EM INJEÇÃO PLÁSTICA
                            </span>
                            <h4 className="font-extrabold text-slate-800 text-lg mt-1">
                              {task.customProductName || task.partName}
                            </h4>
                            {task.customProductName && task.partName && task.customProductName !== task.partName && (
                              <span className="text-xs text-slate-500 font-bold block mt-0.5">
                                Programa: {task.partName}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-bold text-orange-600 bg-white p-1 rounded border">
                            Molde Ativo ⚙️
                          </span>
                        </div>

                        <div className="p-4 flex flex-col gap-3">
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                            <div>
                              ⏱️ Iniciado em:{" "}
                              {new Date(task.startTime).toLocaleTimeString()}
                            </div>
                            <div>
                              🔬 Resina Base:{" "}
                              {plan
                                ? db.items.find((i) => i.id === plan.coilItemId)
                                    ?.name
                                : "Avulso"}
                            </div>
                          </div>

                          {plan?.requiresMoldChange && (
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2">
                              <h5 className="font-bold text-amber-800 text-xs flex items-center gap-1">
                                ⚠️ EXIGIDO FLUXO DE TROCA DE MOLDE E SETUP
                              </h5>

                              <div className="flex flex-col gap-2 mt-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={moldChanged}
                                    onChange={(e) =>
                                      setMoldChanged(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded text-orange-600"
                                  />
                                  1. Novo Molde instalado e travado na máquina
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={setupSafetyDone}
                                    onChange={(e) =>
                                      setSetupSafetyDone(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded text-orange-600"
                                  />
                                  2. Alinhamento de bico de injeção e
                                  refrigeração testada
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={temperatureStable}
                                    onChange={(e) =>
                                      setTemperatureStable(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded text-orange-600"
                                  />
                                  3. Temperatura da câmara estável (PP: 190°C /
                                  Nylon: 230°C)
                                </label>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2.5 mt-3 border-t pt-3">
                            <button
                              onClick={() => openFinishScreen(task.id)}
                              disabled={setupIncomplete ? true : false}
                              className="flex-1 bg-emerald-600 disabled:opacity-40 text-white font-bold p-3 rounded-lg hover:bg-emerald-700 transition text-xs uppercase"
                            >
                              {setupIncomplete
                                ? "🔒 Setup Pendente"
                                : "✅ Finalizar Ciclos"}
                            </button>
                            {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && (
                              <button
                                onClick={() => handleCancelTask(task.id)}
                                className="bg-red-50 text-red-600 font-bold p-3 rounded-lg hover:bg-red-150 transition text-xs border border-red-200"
                              >
                                Parar/Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "SELECT_PLAN" && (
          <div className="flex flex-col h-full">
            <button
              onClick={() => setView("LIST_ACTIVE")}
              className="flex items-center gap-2 text-orange-600 font-semibold mb-4 text-sm mt-1"
            >
              <ArrowLeft size={18} /> Voltar para Lotes Ativos
            </button>
            <h3 className="font-extrabold text-slate-800 text-lg mb-3">
              Pesquisar Programas de Injeção no PCP
            </h3>

            <div className="flex-1 overflow-y-auto">
              {pendingPlans.length === 0 ? (
                <div className="text-center bg-gray-50 border p-6 rounded-xl text-slate-500 text-sm italic">
                  Nenhuma programação de injeção plástica configurada pelo PCP
                  no momento.
                </div>
              ) : (
                <div className="grid gap-3">
                  {pendingPlans.map((plan) => {
                    const targetItem =
                      plan.targetItemIds.length > 0
                        ? db.items.find((i) => i.id === plan.targetItemIds[0])
                        : null;
                    const planLogs = (db.logs || []).filter((l) => l.coilPlanId === plan.id);
                    const totalProduced = planLogs.reduce((acc, curr) => acc + (curr.quantityProcessed || 0), 0);
                    return (
                      <div
                        key={plan.id}
                        onClick={() => startPlan(plan.id)}
                        className="bg-white p-4 border border-orange-200 rounded-xl hover:border-orange-500 hover:shadow-md transition cursor-pointer group flex justify-between items-center"
                      >
                        <div className="flex-1 border-l-4 border-orange-500 pl-3">
                          <span className="font-bold text-slate-800 text-base block">
                            {plan.name}
                          </span>
                          <div className="text-xs font-semibold text-slate-500 mt-1 flex flex-col gap-0.5">
                            {targetItem && (
                              <span>
                                📦 Peça Gerada: <strong className="text-slate-800">{targetItem.name}</strong>
                              </span>
                            )}
                            {totalProduced > 0 && (
                              <span className="text-orange-700 font-bold flex items-center gap-1 bg-orange-50 border border-orange-100 px-1.5 py-0.5 w-max rounded mt-0.5">
                                🔄 Já Produzido: {totalProduced} pçs
                              </span>
                            )}
                            {plan.plannedExecutionDate && (
                              <span>
                                📅 Programação:{" "}
                                {new Date(
                                  plan.plannedExecutionDate,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {plan.requiresMoldChange && (
                            <span className="inline-block mt-2 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                              ⚙️ Exige Troca de Molde
                            </span>
                          )}
                          {plan.batchId && (() => {
                            const batch = db.productionBatches.find(b => b.id === plan.batchId);
                            if (batch) {
                              return (
                                <span className="inline-block mt-2 ml-1 text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                                  📦 Lote: {batch.name}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <button className="bg-orange-600 group-hover:bg-orange-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition shrink-0">
                          INICIAR INJEÇÃO
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "MANUAL_PRODUCTION" && (
          <div className="flex flex-col h-full bg-white p-5 border rounded-2xl">
            <button
              onClick={() => setView("LIST_ACTIVE")}
              className="flex items-center gap-2 text-slate-600 font-semibold mb-4 text-sm"
            >
              <ArrowLeft size={18} /> Cancelar e Voltar
            </button>

            <h3 className="font-extrabold text-slate-800 text-lg mb-4">
              Lançar Processo ou Injeção Piloto Avulsa
            </h3>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-600">
                Descrição / Cliente da Peça Piloto
              </label>
              <input
                placeholder="Ex: Amostra Projeto Clip Plástico, Lote Teste PP Azul"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="border p-2.5 rounded focus:outline-orange-500 text-sm bg-slate-50/50"
              />

              <label className="text-xs font-bold text-slate-600 mt-2">
                Nome ou Código do Item Plástico
              </label>
              <input
                placeholder="Ex: Clip Central Tampa 10mm"
                value={manualProduct}
                onChange={(e) => setManualProduct(e.target.value)}
                className="border p-2.5 rounded focus:outline-orange-500 text-sm bg-slate-50/50"
              />

              <button
                onClick={handleStartManualProduction}
                disabled={!manualTitle || !manualProduct}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold p-3.5 rounded-lg mt-4 transition uppercase tracking-wider text-xs"
              >
                Iniciar Lote Piloto na Máquina
              </button>
            </div>
          </div>
        )}

        {view === "FINISH_RUN" && selectedPlanId && (
          <div className="flex flex-col h-full">
            <button
              onClick={() => setView("LIST_ACTIVE")}
              className="flex items-center gap-2 text-slate-600 font-semibold mb-4 text-sm mt-1"
            >
              <ArrowLeft size={18} /> Voltar para Lote
            </button>

            {(() => {
              const plan = db.coilCuttingPlans?.find(
                (p) => p.id === selectedPlanId,
              );
              const activePack = activeTasksList.find(
                (t) => t.id === selectedPlanId || t.taskId === selectedPlanId,
              );
              const activeTaskItemId = activePack?.itemId;
              const manualItem = activeTaskItemId ? db.items.find((i) => i.id === activeTaskItemId) : null;
              const targetItem = plan?.targetItemIds?.length ? db.items.find((i) => i.id === plan.targetItemIds[0]) : null;

              const title = plan
                ? plan.name
                : activePack?.customProductName || "Injeção Manual";

              const subtitle = plan
                ? `Peça Gerada: ${targetItem ? targetItem.name : "Não especificada"}`
                : manualItem 
                  ? `Peça Gerada: ${manualItem.name}`
                  : `Cliente / Origem: ${activePack?.thirdPartyName || "Avulsa"}`;

              const planLogs = plan ? (db.logs || []).filter((l) => l.coilPlanId === plan.id) : [];
              const totalProduced = planLogs.reduce((acc, curr) => acc + (curr.quantityProcessed || 0), 0);

              return (
                <div className="bg-white p-5 border rounded-2xl shadow-sm flex flex-col gap-4">
                  <div className="text-center pb-2 border-b">
                    <h4 className="font-extrabold text-slate-800 text-lg">
                      {title}
                    </h4>
                    <span className="text-xs text-indigo-750 block mt-1 font-semibold">
                      {subtitle}
                    </span>
                    {totalProduced > 0 && (
                      <div className="bg-sky-50 border border-sky-150 text-sky-800 rounded-xl p-3 text-xs font-semibold text-left flex flex-col gap-0.5 mt-2.5 max-w-sm mx-auto">
                        <span className="font-bold text-sky-950">🔄 Produção Parcial Acumulada:</span>
                        <span>{totalProduced} peças já foram enviadas/computadas neste lote.</span>
                      </div>
                    )}
                    <p className="text-xs text-orange-600 font-bold mt-2 uppercase">
                      Relatório de Injeção & Controle de Sacos
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 text-left bg-orange-50/40 p-3 rounded-xl border border-orange-100">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          1. Sacos Embalados *
                        </label>
                        <input
                          type="number"
                          value={sacosEmbalados}
                          onChange={(e) =>
                            setSacosEmbalados(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          placeholder="Ex: 10"
                          className="border border-orange-200 p-2.5 rounded-lg text-sm font-bold focus:outline-orange-500 bg-white"
                        />
                        <span className="text-[10px] text-slate-500">
                          Número de sacos lacrados e finalizados.
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 text-left bg-orange-50/40 p-3 rounded-xl border border-orange-100">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          2. Itens por Saco *
                        </label>
                        <input
                          type="number"
                          value={itensPorSaco}
                          onChange={(e) =>
                            setItensPorSaco(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          placeholder="Ex: 100"
                          className="border border-orange-200 p-2.5 rounded-lg text-sm font-bold focus:outline-orange-500 bg-white"
                        />
                        <span className="text-[10px] text-slate-500">
                          Quantidade padrão de peças em cada saco.
                        </span>
                      </div>
                    </div>

                    {/* Calculated summary widget */}
                    {Number(sacosEmbalados) > 0 && Number(itensPorSaco) > 0 && (
                      <div className="flex flex-col gap-1 text-center border-2 border-orange-500/20 bg-orange-50 p-4 rounded-2xl animate-in zoom-in-95 duration-150">
                        <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
                          Cálculo de Produção Automático
                        </span>
                        <strong className="text-3xl font-black text-orange-800 font-mono mt-1">
                          {Number(sacosEmbalados) * Number(itensPorSaco)}{" "}
                          <span className="text-sm font-sans font-bold">
                            peças
                          </span>
                        </strong>
                        <span className="text-[11px] text-slate-500 mt-1">
                          Fórmula: {sacosEmbalados} saco(s) x {itensPorSaco}{" "}
                          unid/saco
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => handleFinishRun(true)}
                        disabled={!sacosEmbalados || !itensPorSaco}
                        className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-extrabold p-3 rounded-xl transition text-center uppercase tracking-wider text-[11px] shadow-sm"
                      >
                        Apontamento Parcial (Continuar Produzindo)
                      </button>
                      <button
                        onClick={() => handleFinishRun(false)}
                        disabled={!sacosEmbalados || !itensPorSaco}
                        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-extrabold p-4 rounded-xl transition text-center uppercase tracking-wider text-xs shadow-md"
                      >
                        Confirmar Envio e Encerrar Lote
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </ScrollContainer>
    </ScreenLayout>
  );
}
