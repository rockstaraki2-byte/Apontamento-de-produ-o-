import React, { useState, useMemo } from "react";
import {
  Layers,
  ArrowLeft,
  Play,
  CheckCircle2,
  Package,
  Activity,
  User as UserIcon,
  Clock,
  AlertTriangle,
  Search,
  PlusCircle,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, OrderStatus } from "./types";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { normalizeString } from "./searchUtils";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";

const SECTOR_ID = 14; // ID do setor Montagem Retrátil — ajuste se necessário
const PROCESS_NAME = "Montagem Retrátil";

export function MontagemRetratilScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [view, setView] = useState<
    "LOTE_LIST" | "LOTE_ITEMS" | "FINISH_PACK" | "MANUAL_PRODUCTION"
  >("LOTE_LIST");

  // Lote selecionado
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Modal de iniciar produção de um item do lote
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startingOrderId, setStartingOrderId] = useState<number | null>(null);
  const [startOperator, setStartOperator] = useState<string>(currentUser.name || "");
  const [startProcess, setStartProcess] = useState<string>(PROCESS_NAME);

  // Finalizar pack
  const [packQuantity, setPackQuantity] = useState<number | "">("");
  const [finishingOrderId, setFinishingOrderId] = useState<number | null>(null);

  // Manual production
  const [manualProductSearch, setManualProductSearch] = useState("");
  const [manualParentItemId, setManualParentItemId] = useState<number | null>(null);
  const [manualQty, setManualQty] = useState<number | "">("");

  // Batches do setor ou gerência que incluem itens de montagem retrátil
  const relevantBatches = useMemo(() => {
    return db.productionBatches.filter((b) => {
      // Inclui lotes gerência (isGerenciaLote) ou do setor específico
      return b.isGerenciaLote || b.sectorId === SECTOR_ID;
    });
  }, [db.productionBatches]);

  const selectedBatch = useMemo(
    () => relevantBatches.find((b) => b.id === selectedBatchId) ?? null,
    [relevantBatches, selectedBatchId]
  );

  // Itens do lote selecionado com dados enriquecidos
  const batchOrderItems = useMemo(() => {
    if (!selectedBatch) return [];
    return selectedBatch.orderIds.map((oid) => {
      const order = db.orders.find((o) => o.id === oid);
      const item = order ? db.items.find((i) => i.id === order.itemId) : null;
      const activePack = db.activePacks.find(
        (p) =>
          p.associatedBatchId === selectedBatch.id &&
          p.itemId === order?.itemId &&
          p.color === order?.color &&
          p.size === order?.size &&
          p.variation === order?.variation
      );
      return { order, item, activePack, orderId: oid };
    });
  }, [selectedBatch, db.orders, db.items, db.activePacks]);

  // Produção ativa atual do operador neste setor
  const myActivePack = useMemo(() => {
    return db.activePacks.find(
      (p) =>
        p.operatorId === currentUser.id &&
        p.processName === PROCESS_NAME
    );
  }, [db.activePacks, currentUser.id]);

  // --- HANDLERS ---

  const handleOpenStartModal = (orderId: number) => {
    setStartingOrderId(orderId);
    setStartModalOpen(true);
  };

  const handleConfirmStart = async () => {
    if (!startingOrderId || !selectedBatch) return;
    const order = db.orders.find((o) => o.id === startingOrderId);
    const item = order ? db.items.find((i) => i.id === order.itemId) : null;
    if (!order || !item) return;

    // Verifica se já existe um pack ativo para este item no lote
    const existing = db.activePacks.find(
      (p) =>
        p.associatedBatchId === selectedBatch.id &&
        p.itemId === order.itemId &&
        p.color === order.color &&
        p.size === order.size &&
        p.variation === order.variation
    );
    if (existing) {
      alert("Este item já está em produção.");
      setStartModalOpen(false);
      return;
    }

    await db.addActivePack({
      id: Date.now(),
      itemId: order.itemId,
      operatorId: currentUser.id,
      processName: startProcess || PROCESS_NAME,
      startTime: Date.now(),
      color: order.color,
      size: order.size,
      variation: order.variation,
      associatedBatchId: selectedBatch.id,
      type: "PRODUCAO",
    } as any);

    // Atualiza status do pedido para EM_PRODUCAO
    if (order.status === "PENDENTE" || !order.status) {
      await db.updateOrders([{ ...order, status: "EM_PRODUCAO" }]);
    }

    await db.addLogs([
      {
        id: Date.now(),
        orderId: order.id,
        operatorId: currentUser.id,
        processName: startProcess || PROCESS_NAME,
        customProductName: `Iniciou ${item.name} do lote ${selectedBatch.name}`,
        timestamp: Date.now(),
        durationMillis: 0,
        type: "PRODUCAO" as any,
      },
    ]);

    setStartModalOpen(false);
    setStartingOrderId(null);
  };

  const handleOpenFinish = (orderId: number) => {
    setFinishingOrderId(orderId);
    setPackQuantity("");
    setView("FINISH_PACK");
  };

  const handleConfirmFinish = async () => {
    if (!finishingOrderId || !selectedBatch || packQuantity === "") return;
    const order = db.orders.find((o) => o.id === finishingOrderId);
    const item = order ? db.items.find((i) => i.id === order.itemId) : null;
    if (!order || !item) return;

    const activePack = db.activePacks.find(
      (p) =>
        p.associatedBatchId === selectedBatch.id &&
        p.itemId === order.itemId &&
        p.color === order.color &&
        p.size === order.size &&
        p.variation === order.variation
    );

    const durationMillis = activePack ? Date.now() - activePack.startTime : 0;
    const qty = Number(packQuantity);
    const newProduced = (order.producedQuantity || 0) + qty;
    const isComplete = newProduced >= order.totalQuantity;

    await db.addLogs([
      {
        id: Date.now(),
        orderId: order.id,
        operatorId: currentUser.id,
        processName: PROCESS_NAME,
        customProductName: item.name,
        timestamp: Date.now(),
        durationMillis,
        quantity: qty,
        type: "PRODUCAO" as any,
      },
    ]);

    await db.updateOrders([
      {
        ...order,
        producedQuantity: newProduced,
        status: isComplete ? ("PRODUZIDO" as OrderStatus) : ("EM_PRODUCAO" as OrderStatus),
      },
    ]);

    if (activePack) {
      await db.removeActivePack(activePack.id);
    }

    setFinishingOrderId(null);
    setPackQuantity("");
    setView("LOTE_ITEMS");
  };

  // ===========================
  // VIEW: LOTE_LIST
  // ===========================
  if (view === "LOTE_LIST") {
    return (
      <ScreenLayout id="montagem-retratil-layout">
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-violet-100 text-violet-700 p-2 rounded-xl">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg leading-tight">
                Montagem Retrátil
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Selecione um lote para iniciar a produção de um item
              </p>
            </div>
          </div>
        </div>

        <ScrollContainer paddingSize="dense" className="space-y-4">
          {/* Widget de apontamento ativo (se houver) */}
          {myActivePack && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="text-amber-600" size={20} />
                <div>
                  <span className="text-xs font-black text-amber-800 uppercase">Produção Ativa</span>
                  <p className="text-sm font-bold text-amber-900">
                    {db.items.find((i) => i.id === myActivePack.itemId)?.name || "Item"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg uppercase">
                Em andamento
              </span>
            </div>
          )}

          {/* Lista de Lotes */}
          {relevantBatches.length === 0 ? (
            <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-xl">
              <Package className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-600 font-bold text-sm">Nenhum lote disponível</p>
              <p className="text-slate-400 text-xs mt-1">
                Aguarde o PCP liberar um lote para Montagem Retrátil.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {relevantBatches.map((batch) => {
                const totalItems = batch.orderIds.length;
                const producedItems = batch.orderIds.filter((oid) => {
                  const o = db.orders.find((x) => x.id === oid);
                  return o?.status === "PRODUZIDO";
                }).length;
                const inProductionItems = batch.orderIds.filter((oid) => {
                  return db.activePacks.some(
                    (p) => p.associatedBatchId === batch.id &&
                      db.orders.find((o) => o.id === oid)?.itemId === p.itemId
                  );
                }).length;

                const isCompleted = batch.status === "CONCLUIDO";
                const progressPct = totalItems > 0 ? Math.round((producedItems / totalItems) * 100) : 0;

                return (
                  <button
                    key={batch.id}
                    onClick={() => {
                      setSelectedBatchId(batch.id);
                      setView("LOTE_ITEMS");
                    }}
                    className={`text-left w-full bg-white border rounded-xl p-5 shadow-xs hover:shadow-md hover:border-violet-300 transition-all active:scale-[0.99] cursor-pointer ${
                      isCompleted ? "border-emerald-200 opacity-70" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                          {batch.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                          {totalItems} iten{totalItems !== 1 ? "s" : ""} ·{" "}
                          Criado em {new Date(batch.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : batch.status === "EM_PRODUCAO"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {isCompleted ? "Concluído" : batch.status === "EM_PRODUCAO" ? "Em Produção" : "Pendente"}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-violet-500 h-2 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>{producedItems} produzidos</span>
                        <span>{inProductionItems} em andamento</span>
                        <span>{totalItems - producedItems} restantes</span>
                      </div>
                    </div>

                    {batch.notes && (
                      <p className="mt-3 text-[11px] text-slate-500 italic border-t border-slate-100 pt-2">
                        {batch.notes}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Widgets */}
          <DailySummaryWidget db={db} currentUser={currentUser} processName={PROCESS_NAME} />
          <MachineStopWidget db={db} currentUser={currentUser} sectorName={PROCESS_NAME} />
        </ScrollContainer>
      </ScreenLayout>
    );
  }

  // ===========================
  // VIEW: LOTE_ITEMS
  // ===========================
  if (view === "LOTE_ITEMS" && selectedBatch) {
    return (
      <ScreenLayout id="montagem-retratil-lote-items">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-3 shrink-0">
          <button
            onClick={() => { setSelectedBatchId(null); setView("LOTE_LIST"); }}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-violet-100 text-violet-700 p-2 rounded-xl">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-base leading-tight">
                {selectedBatch.name}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Selecione um item para iniciar a montagem
              </p>
            </div>
          </div>
        </div>

        <ScrollContainer paddingSize="dense" className="space-y-3">
          {batchOrderItems.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto text-slate-300 mb-2" size={36} />
              <p className="text-slate-500 text-sm font-semibold">Nenhum item neste lote.</p>
            </div>
          ) : (
            batchOrderItems.map(({ order, item, activePack, orderId }) => {
              if (!order || !item) return null;
              const produced = order.producedQuantity || 0;
              const remaining = Math.max(0, order.totalQuantity - produced);
              const isProduced = order.status === "PRODUZIDO" || remaining === 0;
              const isInProduction = !!activePack;

              return (
                <div
                  key={orderId}
                  className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isProduced
                      ? "border-emerald-200 bg-emerald-50/20"
                      : isInProduction
                      ? "border-amber-300 bg-amber-50/30"
                      : "border-slate-200"
                  }`}
                >
                  {/* Info do item */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-700">
                        #{order.orderCode}
                      </span>
                      {isProduced && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                          ✓ Produzido
                        </span>
                      )}
                      {isInProduction && !isProduced && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full border border-amber-200 uppercase animate-pulse">
                          ⚙ Em Produção
                        </span>
                      )}
                    </div>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5 truncate">
                      {item.name}
                    </p>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex gap-2 flex-wrap">
                      <span>{order.customerName}</span>
                      {order.color && <span>| Cor: {order.color}</span>}
                      {order.size && <span>| Tam: {order.size}</span>}
                      {order.variation && <span>| Var: {order.variation}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="w-32 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            isProduced ? "bg-emerald-500" : "bg-violet-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              order.totalQuantity > 0
                                ? (produced / order.totalQuantity) * 100
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {produced}/{order.totalQuantity} pçs
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 shrink-0">
                    {!isProduced && !isInProduction && (
                      <button
                        onClick={() => handleOpenStartModal(orderId)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl transition active:scale-95 shadow cursor-pointer"
                      >
                        <Play size={13} />
                        Iniciar
                      </button>
                    )}

                    {isInProduction && !isProduced && (
                      <button
                        onClick={() => handleOpenFinish(orderId)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition active:scale-95 shadow cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        Finalizar
                      </button>
                    )}

                    {isProduced && (
                      <span className="flex items-center gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black rounded-xl">
                        <CheckCircle2 size={13} />
                        Completo
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </ScrollContainer>

        {/* Modal de Iniciar */}
        {startModalOpen && startingOrderId && (() => {
          const order = db.orders.find((o) => o.id === startingOrderId);
          const item = order ? db.items.find((i) => i.id === order.itemId) : null;
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
                <div className="p-5 border-b bg-violet-50 rounded-t-2xl">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Iniciar Montagem
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item?.name} · #{order?.orderCode}
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Operador
                    </label>
                    <input
                      value={startOperator}
                      onChange={(e) => setStartOperator(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Processo
                    </label>
                    <input
                      value={startProcess}
                      onChange={(e) => setStartProcess(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2">
                  <button
                    onClick={() => { setStartModalOpen(false); setStartingOrderId(null); }}
                    className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmStart}
                    className="px-5 py-2 text-xs font-black bg-violet-600 text-white rounded-xl hover:bg-violet-700 cursor-pointer transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Play size={13} /> Iniciar Agora
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </ScreenLayout>
    );
  }

  // ===========================
  // VIEW: FINISH_PACK
  // ===========================
  if (view === "FINISH_PACK" && finishingOrderId && selectedBatch) {
    const order = db.orders.find((o) => o.id === finishingOrderId);
    const item = order ? db.items.find((i) => i.id === order.itemId) : null;
    const remaining = order ? Math.max(0, order.totalQuantity - (order.producedQuantity || 0)) : 0;

    return (
      <ScreenLayout id="montagem-retratil-finish">
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-3 shrink-0">
          <button
            onClick={() => { setView("LOTE_ITEMS"); setFinishingOrderId(null); }}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base leading-tight">Finalizar Produção</h1>
            <p className="text-xs text-slate-500">{item?.name} · #{order?.orderCode}</p>
          </div>
        </div>

        <ScrollContainer paddingSize="dense">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 max-w-md mx-auto mt-4">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center">
              <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1">Faltam produzir</p>
              <p className="text-4xl font-black text-slate-900">{remaining}</p>
              <p className="text-xs text-slate-500 font-bold">peças para completar o pedido</p>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Quantidade Produzida Agora
              </label>
              <input
                type="number"
                min={1}
                value={packQuantity}
                onChange={(e) => setPackQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex: 50"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl font-black text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            <button
              disabled={packQuantity === "" || Number(packQuantity) <= 0}
              onClick={handleConfirmFinish}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} /> Confirmar Finalização
            </button>
          </div>
        </ScrollContainer>
      </ScreenLayout>
    );
  }

  // Fallback
  return null;
}
