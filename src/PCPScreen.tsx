import React, { useState } from "react";
import { useDatabase } from "./useDatabase";
import { User, Sector, ProductFlow, Customer, Order } from "./types";
import {
  Users,
  Building,
  Route,
  List,
  Package,
  ChevronDown,
  ChevronRight,
  Search,
  Edit2,
  Trash2,
  Plus,
  ChevronLeft,
  PlusCircle,
  XCircle,
  Check,
  MapPin,
  Scissors,
  Layers,
  SlidersHorizontal,
  Phone
} from "lucide-react";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { ComposicaoProdutosTab } from "./components/ComposicaoProdutosTab";

function PlanosCorteTab({ db }: { db: ReturnType<typeof useDatabase> }) {
  const [newPlanName, setNewPlanName] = React.useState("");
  const [newPlanCoilSearch, setNewPlanCoilSearch] = React.useState("");
  const [newPlanTargetSearch, setNewPlanTargetSearch] = React.useState("");
  const [newPlanOrderSearch, setNewPlanOrderSearch] = React.useState("");
  const [newPlanTargetQuantity, setNewPlanTargetQuantity] = React.useState<number | "">("");
  const [newPlanType, setNewPlanType] = React.useState<
    "PRENSA_RAFAEL" | "PRENSA_EDUARDO" | "BANHO_QUIMICO" | "INJETORA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE"
  >("PRENSA_RAFAEL");
  const [newPlanDate, setNewPlanDate] = React.useState("");
  const [newPlanMold, setNewPlanMold] = React.useState(false);
  const [newPlanBatchId, setNewPlanBatchId] = React.useState<number | "">("");

  // Minimizable/collapsible registration block state
  const [isFormCollapsed, setIsFormCollapsed] = React.useState(false); // Default to false (expanded) so it's discoverable, but easily collapsible

  // Plan filtering states
  const [filterStartDate, setFilterStartDate] = React.useState("");
  const [filterEndDate, setFilterEndDate] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<"TODOS" | "PENDENTE" | "EM_PRODUCAO" | "CONCLUIDO">("TODOS");
  const [filterSearch, setFilterSearch] = React.useState("");

  const filteredPlans = React.useMemo(() => {
    let list = db.coilCuttingPlans || [];

    // Filter by text search (name of plan or generated piece name)
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      list = list.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const targetItem = p.targetItemIds && p.targetItemIds.length > 0
          ? db.items.find((i) => i.id === p.targetItemIds[0])
          : null;
        const pieceMatch = targetItem ? targetItem.name.toLowerCase().includes(q) : false;
        return nameMatch || pieceMatch;
      });
    }

    // Filter by status
    if (filterStatus !== "TODOS") {
      list = list.filter((p) => p.status === filterStatus);
    }

    // Filter by Date Range (using plannedExecutionDate or createdAt)
    if (filterStartDate) {
      const startMs = new Date(filterStartDate + "T00:00:00").getTime();
      list = list.filter((p) => {
        const dateVal = p.plannedExecutionDate 
          ? new Date(p.plannedExecutionDate).getTime() 
          : (p.createdAt || 0);
        return dateVal >= startMs;
      });
    }

    if (filterEndDate) {
      const endMs = new Date(filterEndDate + "T23:59:59").getTime();
      list = list.filter((p) => {
        const dateVal = p.plannedExecutionDate 
          ? new Date(p.plannedExecutionDate).getTime() 
          : (p.createdAt || 0);
        return dateVal <= endMs;
      });
    }

    return list;
  }, [db.coilCuttingPlans, db.items, filterSearch, filterStatus, filterStartDate, filterEndDate]);

  // Suggested options (limited to at most 5 records in memory to prevent sluggish keyboards)
  const suggestedCoils = React.useMemo(() => {
    const query = newPlanCoilSearch.trim().toLowerCase();
    if (!query) {
      const defaultKeywords =
        newPlanType === "INJETORA"
          ? ["pp", "resina", "granulado"]
          : ["bobina", "chapa", "galv"];
      const filtered = db.items.filter((i) =>
        defaultKeywords.some(
          (kw) =>
            i.name.toLowerCase().includes(kw) ||
            i.code.toLowerCase().includes(kw),
        ),
      );
      if (filtered.length > 0) return filtered.slice(0, 5);
      return db.items.slice(0, 5);
    }
    return db.items
      .filter((i) => `${i.code} - ${i.name}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [newPlanCoilSearch, db.items, newPlanType]);

  const suggestedTargets = React.useMemo(() => {
    const query = newPlanTargetSearch.trim().toLowerCase();
    if (!query) {
      const defaultKeywords =
        newPlanType === "INJETORA"
          ? ["injetado", "plastico", "sapata"]
          : ["estampado", "metal", "chapa", "suporte"];
      const filtered = db.items.filter((i) =>
        defaultKeywords.some(
          (kw) =>
            i.name.toLowerCase().includes(kw) ||
            i.code.toLowerCase().includes(kw),
        ),
      );
      if (filtered.length > 0) return filtered.slice(0, 5);
      return db.items.slice(0, 5);
    }
    return db.items
      .filter((i) => `${i.code} - ${i.name}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [newPlanTargetSearch, db.items, newPlanType]);

  const selectedCoilId = React.useMemo(() => {
    const item = db.items.find(
      (i) =>
        `${i.code} - ${i.name}`.toLowerCase() ===
        newPlanCoilSearch.toLowerCase(),
    );
    return item ? item.id : null;
  }, [newPlanCoilSearch, db.items]);

  const suggestedOrders = React.useMemo(() => {
    const query = newPlanOrderSearch.trim().toLowerCase();
    if (!query) return [];
    return db.orders
      .filter((o) => `${o.orderCode} - ${o.customerName}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [newPlanOrderSearch, db.orders]);

  const selectedTargetId = React.useMemo(() => {
    const item = db.items.find(
      (i) =>
        `${i.code} - ${i.name}`.toLowerCase() ===
        newPlanTargetSearch.toLowerCase(),
    );
    return item ? item.id : null;
  }, [newPlanTargetSearch, db.items]);

  const selectedOrderId = React.useMemo(() => {
    const order = db.orders.find(
      (o) =>
        `${o.orderCode} - ${o.customerName}`.toLowerCase() ===
        newPlanOrderSearch.toLowerCase(),
    );
    return order ? order.id : undefined;
  }, [newPlanOrderSearch, db.orders]);

  const handleAddPlan = () => {
    if (!newPlanName || (!selectedTargetId && !selectedOrderId)) return;
    
    // Se não há targetId da listagem, mas há order, use dummy ou pegue o primeiro item
    const targetIds = selectedTargetId ? [selectedTargetId] : [];
    
    db.addCoilCuttingPlan({
      name: newPlanName,
      coilItemId: 0,
      targetItemIds: targetIds,
      status: "PENDENTE",
      createdAt: Date.now(),
      type: newPlanType,
      plannedExecutionDate: newPlanDate || undefined,
      requiresMoldChange: newPlanType === "INJETORA" ? newPlanMold : false,
      targetQuantity: newPlanTargetQuantity ? Number(newPlanTargetQuantity) : undefined,
      orderId: selectedOrderId,
      batchId: newPlanBatchId ? Number(newPlanBatchId) : undefined
    });
    setNewPlanName("");
    setNewPlanCoilSearch("");
    setNewPlanTargetSearch("");
    setNewPlanOrderSearch("");
    setNewPlanTargetQuantity("");
    setNewPlanDate("");
    setNewPlanMold(false);
    setNewPlanBatchId("");
  };

  // Edit states for CoilCuttingPlan
  const [editingPlan, setEditingPlan] = React.useState<any | null>(null);
  const [editPlanName, setEditPlanName] = React.useState("");
  const [editPlanType, setEditPlanType] = React.useState<
    "PRENSA_RAFAEL" | "PRENSA_EDUARDO" | "BANHO_QUIMICO" | "INJETORA" | "TORNO_CNC_WILLIAN" | "TORNO_CNC_HENRIQUE"
  >("PRENSA_RAFAEL");
  const [editPlanTargetSearch, setEditPlanTargetSearch] = React.useState("");
  const [editPlanStatus, setEditPlanStatus] = React.useState<
    "PENDENTE" | "EM_PRODUCAO" | "CONCLUIDO"
  >("PENDENTE");
  const [editPlanDate, setEditPlanDate] = React.useState("");
  const [editPlanMold, setEditPlanMold] = React.useState(false);
  const [editPlanBatchId, setEditPlanBatchId] = React.useState<number | "">("");

  const editSuggestedTargets = React.useMemo(() => {
    const query = editPlanTargetSearch.trim().toLowerCase();
    if (!query) {
      const defaultKeywords =
        editPlanType === "INJETORA"
          ? ["injetado", "plastico", "sapata"]
          : ["estampado", "metal", "chapa", "suporte"];
      const filtered = db.items.filter((i) =>
        defaultKeywords.some(
          (kw) =>
            i.name.toLowerCase().includes(kw) ||
            i.code.toLowerCase().includes(kw),
        ),
      );
      if (filtered.length > 0) return filtered.slice(0, 5);
      return db.items.slice(0, 5);
    }
    return db.items
      .filter((i) => `${i.code} - ${i.name}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [editPlanTargetSearch, db.items, editPlanType]);

  const editSelectedTargetId = React.useMemo(() => {
    const item = db.items.find(
      (i) =>
        `${i.code} - ${i.name}`.toLowerCase() ===
          editPlanTargetSearch.toLowerCase() ||
        i.name.toLowerCase() === editPlanTargetSearch.toLowerCase() ||
        `${i.code} - ${i.name}` === editPlanTargetSearch ||
        i.name === editPlanTargetSearch,
    );
    return item ? item.id : null;
  }, [editPlanTargetSearch, db.items]);

  const handleStartEdit = (plan: any) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanType(plan.type || "PRENSA_RAFAEL");
    setEditPlanStatus(plan.status);
    setEditPlanDate(plan.plannedExecutionDate || "");
    setEditPlanMold(plan.requiresMoldChange || false);
    setEditPlanBatchId(plan.batchId || "");

    const targetItem =
      plan.targetItemIds && plan.targetItemIds.length > 0
        ? db.items.find((i) => i.id === plan.targetItemIds[0])
        : null;
    if (targetItem) {
      setEditPlanTargetSearch(`${targetItem.code} - ${targetItem.name}`);
    } else {
      setEditPlanTargetSearch("");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    const targetId = editSelectedTargetId;
    if (!editPlanName || !targetId) {
      alert("Por favor, preencha o nome e selecione um componente válido.");
      return;
    }
    await db.updateCoilCuttingPlan({
      ...editingPlan,
      name: editPlanName,
      type: editPlanType,
      status: editPlanStatus,
      plannedExecutionDate: editPlanDate || undefined,
      requiresMoldChange: editPlanType === "INJETORA" ? editPlanMold : false,
      targetItemIds: [targetId],
      batchId: editPlanBatchId ? Number(editPlanBatchId) : undefined
    });
    setEditingPlan(null);
    setEditPlanBatchId("");
  };

  const handleDeletePlan = async (id: number) => {
    if (window.confirm("Deseja realmente excluir esta programação?")) {
      if (db.deleteCoilCuttingPlan) {
        await db.deleteCoilCuttingPlan(id);
      }
      setEditingPlan(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 mb-6 font-sans overflow-hidden">
      <div 
        className="p-4 bg-indigo-50/70 border-b border-gray-100 flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsFormCollapsed(!isFormCollapsed)}
      >
        <h3 className="font-extrabold text-indigo-950 text-sm sm:text-base flex items-center gap-1.5">
          {newPlanType === "INJETORA"
            ? "⚙️ Programar Injeção Plástica & Setup de Molde"
            : "✂️ Programar Novo Corte de Chapa/Bobina"}
        </h3>
        <button
          type="button"
          className="text-indigo-700 hover:text-indigo-900 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 bg-white border border-indigo-200 px-2.5 py-1.5 rounded-lg shadow-3xs transition cursor-pointer"
        >
          {isFormCollapsed ? "➕ Expandir" : "➖ Minimizar"}
        </button>
      </div>

      {!isFormCollapsed && (
        <div className="p-5">
          <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-650 uppercase block mb-1">
            Setor Destino da Programação *
          </label>
          <select
            value={newPlanType}
            onChange={(e) => {
              const val = e.target.value as any;
              setNewPlanType(val);
              if (val !== "INJETORA") setNewPlanMold(false);
            }}
            className="border p-2.5 rounded-lg bg-gray-50/50 w-full text-sm font-semibold select-arrow"
          >
            <option value="PRENSA_RAFAEL">
              Prensa Rafael (Corte de Bobinas Metálicas)
            </option>
            <option value="PRENSA_EDUARDO">
              Prensa Eduardo (Dobra & Prensa)
            </option>
            <option value="BANHO_QUIMICO">
              Banho Químico (Zincagem & Tratamento)
            </option>
            <option value="INJETORA">
              Injetora (Injeção de Peças Plásticas & Moldes)
            </option>
            <option value="TORNO_CNC_WILLIAN">
              Torno CNC Willian
            </option>
            <option value="TORNO_CNC_HENRIQUE">
              Torno CNC Henrique
            </option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-650 uppercase block mb-1">
            Referência / Título do Processo *
          </label>
          <input
            type="text"
            placeholder={
              newPlanType === "INJETORA"
                ? "Ex: Lote Injeção Presilha Tampa PP 20k"
                : "Ex: Corte Bobina Chapa 18"
            }
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            className="border p-2.5 rounded-lg w-full text-sm placeholder-gray-400 focus:outline-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-650 uppercase block mb-1">
            Componente Gerado (Estoque) OU Pedido 
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="text"
                value={newPlanTargetSearch}
                onChange={(e) => { setNewPlanTargetSearch(e.target.value); setNewPlanOrderSearch(""); }}
                placeholder="Busque o componente (P/ manter no estoque)..."
                className="border p-2.5 rounded-lg w-full text-sm bg-indigo-50/50 focus:outline-indigo-500 font-semibold text-slate-800"
              />

              {!selectedTargetId && newPlanTargetSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 flex flex-col gap-1 border border-slate-100 rounded-lg p-1 bg-white shadow-lg max-h-40 overflow-y-auto">
                  <span className="text-[10px] font-bold text-slate-400 px-2 pt-0.5 uppercase tracking-wider block bg-slate-50 py-1 border-b">
                    Catálogo de componentes gerados:
                  </span>
                  {suggestedTargets.length === 0 ? (
                    <span className="text-[11px] text-gray-500 px-2 py-1">
                      Nenhum correspondente.
                    </span>
                  ) : (
                    suggestedTargets.map((i) => (
                      <button
                        type="button"
                        key={i.id}
                        onClick={() => {
                          setNewPlanTargetSearch(`${i.code} - ${i.name}`);
                        }}
                        className="text-left text-xs px-2.5 py-1.5 rounded hover:bg-indigo-650 hover:text-white transition-colors bg-white border border-slate-200/65 font-medium text-slate-700 flex justify-between"
                      >
                        <span>{i.name}</span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{i.code}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={newPlanOrderSearch}
                onChange={(e) => { setNewPlanOrderSearch(e.target.value); setNewPlanTargetSearch(""); }}
                placeholder="Ou busque o pedido de produção..."
                className="border p-2.5 rounded-lg w-full text-sm bg-amber-50/50 focus:outline-amber-500 font-semibold text-slate-800"
              />

              {!selectedOrderId && newPlanOrderSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1.5 flex flex-col gap-1 border border-slate-100 rounded-lg p-1 bg-white shadow-lg max-h-40 overflow-y-auto">
                  <span className="text-[10px] font-bold text-slate-400 px-2 pt-0.5 uppercase tracking-wider block bg-slate-50 py-1 border-b">
                    Pedidos Encontrados:
                  </span>
                  {suggestedOrders.length === 0 ? (
                    <span className="text-[11px] text-gray-500 px-2 py-1">
                      Nenhum correspondente.
                    </span>
                  ) : (
                    suggestedOrders.map((o) => (
                      <button
                        type="button"
                        key={o.id}
                        onClick={() => {
                          setNewPlanOrderSearch(`${o.orderCode} - ${o.customerName}`);
                        }}
                        className="text-left text-xs px-2.5 py-1.5 rounded hover:bg-amber-500 hover:text-white bg-white border border-slate-200/65 font-medium text-slate-700 flex justify-between"
                      >
                        <span className="truncate">{o.customerName}</span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{o.orderCode}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {(selectedTargetId || selectedOrderId) ? (
            <div className={`flex items-center justify-between border rounded-lg p-2 mt-2 ${selectedOrderId ? 'bg-amber-50 border-amber-250' : 'bg-emerald-50 border-emerald-250'}`}>
              <span className={`text-xs font-bold ${selectedOrderId ? 'text-amber-800' : 'text-emerald-800'}`}>
                ✓ Selecionado:{" "}
                {selectedOrderId 
                  ? db.orders.find((o) => o.id === selectedOrderId)?.customerName
                  : db.items.find((i) => i.id === selectedTargetId)?.name}
              </span>
              <button
                type="button"
                onClick={() => { setNewPlanTargetSearch(""); setNewPlanOrderSearch(""); }}
                className={`text-xs font-black px-2 py-0.5 rounded transition ${selectedOrderId ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}
              >
                Limpar
              </button>
            </div>
          ) : (newPlanTargetSearch || newPlanOrderSearch) ? (
            <span className="text-xs text-red-600 font-bold mt-1 block">
              ⚠️ Selecione na lista acima para confirmar.
            </span>
          ) : null}
        </div>

        <div>
           <label className="text-xs font-bold text-gray-650 uppercase block mb-1">
             Qtd. a Produzir *
           </label>
           <input
             type="number"
             min={1}
             value={newPlanTargetQuantity}
             onChange={(e) => setNewPlanTargetQuantity(e.target.value === "" ? "" : Number(e.target.value))}
             placeholder="Quantidade."
             className="border p-2.5 rounded-lg w-full text-sm font-semibold focus:outline-indigo-500"
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs font-bold text-gray-650 uppercase block mb-1">
              Data Planejada para Início
            </label>
            <input
              type="date"
              value={newPlanDate}
              onChange={(e) => setNewPlanDate(e.target.value)}
              className="border p-2.5 rounded-lg w-full text-sm focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-650 uppercase block mb-1">
              Vincular a um Lote (Opcional)
            </label>
            <select
              value={newPlanBatchId.toString()}
              onChange={(e) => setNewPlanBatchId(e.target.value === "" ? "" : Number(e.target.value))}
              className="border p-2.5 rounded-lg w-full text-sm focus:outline-indigo-500 bg-white"
            >
              <option value="">-- Sem Lote --</option>
              {db.productionBatches
                .filter(b => b.status === "EM_PRODUCAO" || b.status === "PENDENTE")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    Lote: {b.name} ({b.status})
                  </option>
                ))}
            </select>
          </div>

        {newPlanType === "INJETORA" && (
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center h-full">
              <label className="flex items-center gap-2.5 text-sm font-bold text-amber-900 cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={newPlanMold}
                  onChange={(e) => setNewPlanMold(e.target.checked)}
                  className="w-5 h-5 rounded border-amber-300 text-amber-600"
                />
                <div className="flex flex-col">
                  <span>Exige troca fizicá de molde / setup?</span>
                  <span className="text-[10px] text-amber-700 font-normal normal-case">
                    Habilitará checklist de temperatura e segurança na tela do
                    operador
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        <button
          onClick={handleAddPlan}
          disabled={!newPlanName || (!selectedTargetId && !selectedOrderId) || !newPlanTargetQuantity}
          className="bg-indigo-600 disabled:opacity-50 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 shadow-sm mt-3 transition text-sm uppercase tracking-wide"
        >
          {newPlanType === "INJETORA"
            ? "Programar Injeção Plástica"
            : newPlanType.startsWith("TORNO") ? "Programar Torneamento" : "Programar Lote de Imprensa"}
        </button>
          </div>
        </div>
      )}
    </div>

      <hr className="my-6 border-slate-200" />
      <h3 className="font-extrabold text-gray-800 text-md mb-4 block uppercase tracking-wider text-xs">
        Planos Industriais Ativos (Prensa, Torno & Injetora)
      </h3>

      {/* Plan list filters */}
      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 mb-4 flex flex-col gap-3 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            🔍 Filtrar & Pesquisar Programações
          </h4>
          {(filterSearch || filterStatus !== "TODOS" || filterStartDate || filterEndDate) && (
            <button
              onClick={() => {
                setFilterSearch("");
                setFilterStatus("TODOS");
                setFilterStartDate("");
                setFilterEndDate("");
              }}
              className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-extrabold px-2 py-1 rounded uppercase tracking-wider transition cursor-pointer"
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Text Search */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Nome do Plano / Peça
            </label>
            <input
              type="text"
              placeholder="Digite o termo para busca..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Status da Programação
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium font-semibold"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_PRODUCAO">Em Produção</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
          </div>

          {/* Date Start */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium font-mono"
            />
          </div>

          {/* Date End */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white text-slate-800 focus:outline-none focus:border-indigo-500 font-medium font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(filteredPlans || []).map((p) => {
          const rawMaterial = db.items.find((i) => i.id === p.coilItemId);
          const targetItem =
            p.targetItemIds && p.targetItemIds.length > 0
              ? db.items.find((i) => i.id === p.targetItemIds[0])
              : null;
          const isInjection = p.type === "INJETORA";

          const planLogs = (db.logs || []).filter((l) => l.coilPlanId === p.id);
          const totalProduced = planLogs.reduce((acc, curr) => acc + (curr.quantityProcessed || 0), 0);

          return (
            <div
              key={p.id}
              className={`p-4 border rounded-xl flex flex-col justify-between gap-1.5 relative shadow-xs transition-all ${isInjection ? "bg-orange-50/50 border-orange-200" : "bg-indigo-55/40 border-indigo-150"}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <span
                    className={`font-extrabold text-sm ${isInjection ? "text-orange-950" : "text-indigo-950"}`}
                  >
                    {p.name}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${p.status === "CONCLUIDO" ? "bg-emerald-100 text-emerald-800" : p.status === "PENDENTE" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="text-xs text-gray-600 font-medium flex flex-col gap-0.5 mt-1.5">
                  <div>
                    🏭 Setor:{" "}
                    <strong className="text-gray-800">
                      {p.type === "INJETORA"
                        ? "Injetora de Plástico"
                        : p.type === "PRENSA_RAFAEL"
                        ? "Prensa Rafael"
                        : p.type === "PRENSA_EDUARDO"
                        ? "Prensa Eduardo"
                        : p.type === "BANHO_QUIMICO"
                        ? "Banho Químico"
                        : p.type === "TORNO_CNC_WILLIAN"
                        ? "Torno CNC Willian"
                        : p.type === "TORNO_CNC_HENRIQUE"
                        ? "Torno CNC Henrique"
                        : "Outro"}
                    </strong>
                  </div>
                  {targetItem && (
                    <div>
                      📦 Peça Gerada:{" "}
                      <strong className="text-gray-800">
                        {targetItem.name}
                      </strong>
                    </div>
                  )}
                  {totalProduced > 0 && (
                    <div className="mt-1">
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-250 inline-block uppercase tracking-wider">
                        🔄 Já Produzido: {totalProduced} pçs
                      </span>
                    </div>
                  )}
                  {p.plannedExecutionDate && (
                    <div>
                      📅 Prazo:{" "}
                      <strong className="text-gray-800">
                        {new Date(p.plannedExecutionDate).toLocaleDateString()}
                      </strong>
                    </div>
                  )}
                  {p.batchId && (() => {
                    const linkedBatch = db.productionBatches.find(b => b.id === p.batchId);
                    if (linkedBatch) {
                      return (
                        <div className="mt-1">
                          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 inline-block uppercase shadow-3xs tracking-wider">
                            📦 Lote Vinculado: {linkedBatch.name} ({linkedBatch.status})
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {(() => {
                    const linkedNests = (db.nestTasks || []).filter(
                      (nt) =>
                        nt.coilPlanId === p.id ||
                        (p.batchId && nt.batchId === p.batchId),
                    );
                    if (linkedNests.length > 0) {
                      const totalNests = linkedNests.length;
                      const inCut = linkedNests.filter(nt => nt.status === "EM_CORTE").length;
                      const cut = linkedNests.filter(nt => nt.status === "CORTADO").length;
                      const isProducing = inCut > 0;
                      const isFinished = cut === totalNests;
                      
                      return (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border flex items-center gap-1 uppercase tracking-wider ${
                            isFinished 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                              : isProducing 
                                ? "bg-red-50 text-red-850 border-red-200 animate-pulse" 
                                : "bg-indigo-50 text-indigo-850 border-indigo-200"
                          }`}>
                            🎯 Nesting: {cut}/{totalNests} concluídos 
                            {isProducing && " (Sendo Cortado 🔥)"}
                            {isFinished && " (Pronto ✓)"}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {p.requiresMoldChange && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] bg-orange-100 text-orange-850 font-extrabold border border-orange-250 px-1.5 py-0.5 rounded w-max uppercase">
                    ⚙️ Exige Troca de Molde
                  </div>
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStartEdit(p)}
                  className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition flex items-center gap-1 active:scale-95 shadow-3xs"
                >
                  ✏️ Editar Lote
                </button>
              </div>
            </div>
          );
        })}
        {(db.coilCuttingPlans?.length === 0 || !db.coilCuttingPlans) && (
          <p className="text-sm text-gray-500 italic">
            Nenhum plano cadastrado.
          </p>
        )}
      </div>

      {/* Edit Modal Dialog popup */}
      {editingPlan && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <h4 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                ✏️ Editar Lote de Prensa/Injetora
              </h4>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Setor Destino *
                </label>
                <select
                  value={editPlanType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setEditPlanType(val);
                    if (val !== "INJETORA") setEditPlanMold(false);
                  }}
                  className="border p-2 rounded-lg bg-gray-50/50 w-full text-sm font-semibold select-arrow"
                >
                  <option value="PRENSA_RAFAEL">
                    Prensa Rafael (Corte de Bobinas Metálicas)
                  </option>
                  <option value="PRENSA_EDUARDO">
                    Prensa Eduardo (Dobra & Prensa)
                  </option>
                  <option value="BANHO_QUIMICO">
                    Banho Químico (Zincagem & Tratamento)
                  </option>
                  <option value="INJETORA">
                    Injetora (Injeção de Peças Plásticas & Moldes)
                  </option>
                  <option value="TORNO_CNC_WILLIAN">
                    Torno CNC Willian
                  </option>
                  <option value="TORNO_CNC_HENRIQUE">
                    Torno CNC Henrique
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Status do Lote *
                </label>
                <select
                  value={editPlanStatus}
                  onChange={(e) => setEditPlanStatus(e.target.value as any)}
                  className="border p-2 rounded-lg bg-gray-50/50 w-full text-sm font-semibold select-arrow"
                >
                  <option value="PENDENTE">Aguardando / Pendente</option>
                  <option value="EM_PRODUCAO">Em Produção</option>
                  <option value="CONCLUIDO">Concluído</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Referência / Título do Processo *
                </label>
                <input
                  type="text"
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                  className="border p-2 rounded-lg w-full text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  {editPlanType === "INJETORA"
                    ? "Peça Plástica Injetada Gerada"
                    : "Componente Metálico Estampado Gerado"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editPlanTargetSearch}
                    onChange={(e) => setEditPlanTargetSearch(e.target.value)}
                    placeholder="Digite para buscar componente gerado..."
                    className="border p-2 rounded-lg w-full text-sm bg-indigo-50/50 focus:outline-indigo-500 font-semibold text-slate-800"
                  />

                  {!editSelectedTargetId &&
                    editPlanTargetSearch.trim().length > 0 && (
                      <div className="absolute left-0 right-0 z-[110] mt-1.5 flex flex-col gap-1 border border-slate-100 rounded-lg p-1 bg-white shadow-lg max-h-40 overflow-y-auto">
                        {editSuggestedTargets.length === 0 ? (
                          <span className="text-[11px] text-gray-500 px-2 py-1">
                            Nenhum componente correspondente.
                          </span>
                        ) : (
                          editSuggestedTargets.map((i) => (
                            <button
                              type="button"
                              key={i.id}
                              onClick={() => {
                                setEditPlanTargetSearch(
                                  `${i.code} - ${i.name}`,
                                );
                              }}
                              className="text-left text-xs px-2.5 py-1.5 rounded hover:bg-indigo-600 hover:text-white transition-colors bg-white border border-slate-200/65 font-medium text-slate-700 flex items-center justify-between"
                            >
                              <span>{i.name}</span>
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                                {i.code}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                </div>

                {editSelectedTargetId ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-250 rounded-lg p-2 mt-1">
                    <span className="text-[11px] text-emerald-800 font-extrabold">
                      ✓ Selecionado:{" "}
                      {
                        db.items.find((i) => i.id === editSelectedTargetId)
                          ?.name
                      }
                    </span>
                  </div>
                ) : editPlanTargetSearch ? (
                  <span className="text-[11px] text-amber-600 font-bold mt-1 block">
                    ⚠️ Clique acima em um item no menu suspenso para selecionar.
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Data Planejada para Início
                  </label>
                  <input
                    type="date"
                    value={editPlanDate}
                    onChange={(e) => setEditPlanDate(e.target.value)}
                    className="border p-2 rounded-lg w-full text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Vincular a um Lote (Opcional)
                  </label>
                  <select
                    value={editPlanBatchId.toString()}
                    onChange={(e) => setEditPlanBatchId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="border p-2 rounded-lg w-full text-sm font-semibold bg-white"
                  >
                    <option value="">-- Sem Lote --</option>
                    {db.productionBatches
                      .filter(b => b.status === "EM_PRODUCAO" || b.status === "PENDENTE" || b.id === editPlanBatchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          Lote: {b.name} ({b.status})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

                {editPlanType === "INJETORA" && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center">
                    <label className="flex items-center gap-2.5 text-sm font-bold text-amber-900 cursor-pointer w-full select-none">
                      <input
                        type="checkbox"
                        checked={editPlanMold}
                        onChange={(e) => setEditPlanMold(e.target.checked)}
                        className="w-5 h-5 rounded border-amber-300 text-amber-600"
                      />
                      <div className="flex flex-col">
                        <span>Exige troca fizicá de molde / setup?</span>
                      </div>
                    </label>
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <button
                type="button"
                onClick={() => handleDeletePlan(editingPlan.id)}
                className="bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 text-xs px-4 py-2 rounded-lg font-extrabold transition"
              >
                🗑️ Excluir
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-xs px-4 py-2 rounded-lg font-bold text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editPlanName || !editSelectedTargetId}
                  className="bg-indigo-600 disabled:opacity-50 text-white text-xs px-5 py-2 rounded-lg font-extrabold hover:bg-indigo-700 transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RepresentativeContactRow({ u, db }: { u: any; db: any; key?: any }) {
  const [phone, setPhone] = useState(u.phone || "");
  const [email, setEmail] = useState(u.email || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Remove non-numeric characters for safety
    const cleanPhone = phone.replace(/\D/g, "");
    try {
      await db.updateUser(u.id, { phone: cleanPhone, email: email.trim() });
      alert(`Contatos do representante ${u.name} atualizados com sucesso!`);
    } catch (e) {
      alert("Erro ao salvar os contatos.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col items-start w-1/3">
        <span className="font-bold text-gray-800 text-sm">{u.name}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">ID: {u.id}</span>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
        <div className="relative">
          <input
            type="text"
            placeholder="Telefone (WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border p-2 rounded text-sm w-44 font-mono focus:ring-1 focus:ring-teal-500 outline-none pr-8 bg-white text-gray-800"
            title="Telefone / WhatsApp"
          />
          {phone && (
            <span className="absolute right-2.5 top-2.5 text-xs text-emerald-500 font-extrabold" title="Número Preenchido">✓</span>
          )}
        </div>
        <div className="relative">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 rounded text-sm w-56 focus:ring-1 focus:ring-teal-500 outline-none pr-8 bg-white text-gray-800"
            title="Email"
          />
          {email && (
            <span className="absolute right-2.5 top-2.5 text-xs text-emerald-500 font-extrabold" title="Email Preenchido">✓</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition disabled:opacity-40 cursor-pointer"
        >
          {isSaving ? "Gravando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export function PCPScreen({
  db,
  currentUser,
  subScreen = "CADASTROS",
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
  subScreen?: "CADASTROS" | "LOTES";
}) {
  const [cadastroTab, setCadastroTab] = useState<
    "CLIENTES" | "SETORES" | "FLUXOS" | "PLANOS_CORTE" | "COLABORADORES" | "CONFIGURACOES" | "REPRESENTANTES" | "COMPOSICAO"
  >("CLIENTES");

  const [sysConfigCompanyName, setSysConfigCompanyName] = useState("");
  const [sysConfigLogoUrl, setSysConfigLogoUrl] = useState("");
  const [sysConfigSystemName, setSysConfigSystemName] = useState("");
  const [sysConfigPrimaryColor, setSysConfigPrimaryColor] = useState("");
  const [sysConfigMonthlyBillingGoal, setSysConfigMonthlyBillingGoal] = useState("");
  
  React.useEffect(() => {
    if (db.systemSettings?.[0]) {
      setSysConfigCompanyName(db.systemSettings[0].companyName || "IMPÉRIO JOMARCI - ACESSÓRIOS PARA MOVÉIS");
      setSysConfigLogoUrl(db.systemSettings[0].companyLogoUrl || "/icon.png");
      setSysConfigSystemName(db.systemSettings[0].systemName || "");
      setSysConfigPrimaryColor(db.systemSettings[0].primaryColor || "#00b14f");
      setSysConfigMonthlyBillingGoal(db.systemSettings[0].monthlyBillingGoal?.toString() || "");
    }
  }, [db.systemSettings]);

  const handleSaveSystemConfig = async () => {
    try {
      await db.saveSystemSettings({
         id: "default",
         companyName: sysConfigCompanyName,
         companyLogoUrl: sysConfigLogoUrl,
         systemName: sysConfigSystemName,
         primaryColor: sysConfigPrimaryColor,
         monthlyBillingGoal: sysConfigMonthlyBillingGoal ? parseFloat(sysConfigMonthlyBillingGoal) : undefined
      });
      alert("Configurações do sistema salvas com sucesso!");
    } catch(err) {
      alert("Erro ao salvar: " + err);
    }
  };

  const [customerName, setCustomerName] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPerPage] = useState(12);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newCustomerCity, setNewCustomerCity] = useState("");
  const [newCustomerUF, setNewCustomerUF] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerCity, setEditCustomerCity] = useState("");
  const [editCustomerUF, setEditCustomerUF] = useState("");

  const [sectorName, setSectorName] = useState("");
  const [editingSectorId, setEditingSectorId] = useState<number | null>(null);
  const [editSectorName, setEditSectorName] = useState("");
  const [editSectorCapacity, setEditSectorCapacity] = useState("");

  const [employeeName, setEmployeeName] = useState("");
  const [employeeSectorId, setEmployeeSectorId] = useState<number | "">("");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  const [flowItemId, setFlowItemId] = useState<number | "">("");
  const [flowItemSearchTerm, setFlowItemSearchTerm] = useState("");
  const [flowItemSearchOpen, setFlowItemSearchOpen] = useState(false);

  // States for Replication feature
  const [replicateSourceItemId, setReplicateSourceItemId] = useState<
    number | ""
  >("");
  const [replicateTargetItemId, setReplicateTargetItemId] = useState<
    number | ""
  >("");
  const [replicateTargetSearchTerm, setReplicateTargetSearchTerm] =
    useState("");
  const [replicateTargetSearchOpen, setReplicateTargetSearchOpen] =
    useState(false);
  const [replicateSuccessMsg, setReplicateSuccessMsg] = useState("");
  const [flowSectors, setFlowSectors] = useState<number[]>([]);
  const [draggedSectorIdx, setDraggedSectorIdx] = useState<number | null>(null);
  const [sectorCapacity, setSectorCapacity] = useState("");

  // Lotes state
  const [batchName, setBatchName] = useState("");
  const [batchSectorId, setBatchSectorId] = useState<number | "">("");
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [proposedBatches, setProposedBatches] = useState<any[] | null>(null);
  const [optimizationStrategy, setOptimizationStrategy] = useState<
    "PRAZO" | "CAPACIDADE"
  >("PRAZO");
  const [draggedOrder, setDraggedOrder] = useState<{
    orderId: number;
    sourceBatchIdx: number;
  } | null>(null);
  const [showLoadAdvisor, setShowLoadAdvisor] = useState(true);

  // New batch creation states
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchSectorId, setNewBatchSectorId] = useState(0);
  const [newBatchAvailableSearch, setNewBatchAvailableSearch] = useState("");
  const [newBatchDeliveryFilter, setNewBatchDeliveryFilter] = useState<
    "TODOS" | "ESSA_SEMANA" | "PROXIMA_SEMANA" | "ATRASADO"
  >("TODOS");
  const [newBatchExcludeInProduction, setNewBatchExcludeInProduction] =
    useState<boolean>(true);
  const [newBatchSelectedOrderIds, setNewBatchSelectedOrderIds] = useState<
    number[]
  >([]);
  const [customNewBatchQuantities, setCustomNewBatchQuantities] = useState<
    Record<number, number>
  >({});
  const [customEditBatchQuantities, setCustomEditBatchQuantities] = useState<
    Record<number, number>
  >({});

  // Custom manual product
  const [manualProductSearch, setManualProductSearch] = useState("");
  const [manualProductQty, setManualProductQty] = useState(0);
  const [manualProductColor, setManualProductColor] = useState("-");
  const [manualProductDeliveryDate, setManualProductDeliveryDate] = useState("");

  // Gerência batch custom states
  const [isGerenciaLote, setIsGerenciaLote] = useState(
    currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia"
  );
  const [assignedOperatorIds, setAssignedOperatorIds] = useState<string[]>([
    "dinei",
    "projetista_marcos",
    "pcp"
  ]);

  const [manuallyEditedBatchName, setManuallyEditedBatchName] = useState(false);

  // Lotes list filtering & pagination states inside subScreen === "LOTES"
  const [lotesSearchTerm, setLotesSearchTerm] = useState("");
  const [lotesDateStart, setLotesDateStart] = useState("");
  const [lotesDateEnd, setLotesDateEnd] = useState("");
  const [lotesVisibleCount, setLotesVisibleCount] = useState(10);

  React.useEffect(() => {
    setLotesVisibleCount(10);
  }, [lotesSearchTerm, lotesDateStart, lotesDateEnd]);

  React.useEffect(() => {
    if (showNewBatchModal && !manuallyEditedBatchName) {
       const isGer = currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia" || isGerenciaLote;
       const batchCount = db.productionBatches.length + 1;
       const paddedCount = String(batchCount).padStart(3, '0');
       let secName = "GERAL";
       if (isGer) {
           secName = "GERÊNCIA";
       } else if (newBatchSectorId !== 0) {
           const sector = db.sectors.find(s => s.id === newBatchSectorId);
           if (sector) {
              secName = sector.name.toUpperCase();
           }
       }
       
       setNewBatchName(`${paddedCount} - ${secName}`);
    }
  }, [showNewBatchModal, newBatchSectorId, isGerenciaLote, currentUser, db.productionBatches.length, db.sectors, manuallyEditedBatchName]);

  React.useEffect(() => {
    if (!showNewBatchModal) {
      setManuallyEditedBatchName(false);
    }
  }, [showNewBatchModal]);

  // Pre-calculated sets to eliminate O(N^3) nested loops when rendering batch creation modals/lists
  const batchLinkedSets = React.useMemo(() => {
    const orderIds = new Set<number>();
    const itemIds = new Set<number>();
    
    db.productionBatches.forEach((b) => {
      b.orderIds.forEach((oid) => {
        orderIds.add(oid);
      });
    });

    db.orders.forEach((o) => {
      if (orderIds.has(o.id)) {
        itemIds.add(o.itemId);
      }
    });

    return { orderIds, itemIds };
  }, [db.productionBatches, db.orders]);

  const processedBatches = React.useMemo(() => {
    let list = [...db.productionBatches];

    // Filter by date
    if (lotesDateStart || lotesDateEnd) {
      list = list.filter((b) => {
        const dateStr = new Date(b.createdAt).toISOString().split("T")[0];
        if (lotesDateStart && dateStr < lotesDateStart) return false;
        if (lotesDateEnd && dateStr > lotesDateEnd) return false;
        return true;
      });
    }

    // Filter by search term (name, order code, or product name)
    if (lotesSearchTerm.trim() !== "") {
      const term = lotesSearchTerm.trim().toLowerCase();
      const ordersMap = new Map<number, any>(db.orders.map((o) => [o.id, o]));
      const itemsMap = new Map<number, any>(db.items.map((i) => [i.id, i]));

      list = list.filter((b) => {
        const nameMatch = b.name.toLowerCase().includes(term);
        const orderMatch = b.orderIds.some((oid) => {
          const o = ordersMap.get(oid);
          if (!o) return false;
          const item = itemsMap.get(o.itemId);
          return (
            o.orderCode.toLowerCase().includes(term) ||
            o.customerName.toLowerCase().includes(term) ||
            (item?.name && item.name.toLowerCase().includes(term))
          );
        });
        return nameMatch || orderMatch;
      });
    }

    // Sort: non-completed first (newest to oldest), completed last (newest to oldest)
    return list.sort((a, b) => {
      const compA = a.status === "CONCLUIDO";
      const compB = b.status === "CONCLUIDO";
      if (compA !== compB) {
        return compA ? 1 : -1; // completed goes to bottom
      }
      return b.createdAt - a.createdAt; // newest first
    });
  }, [db.productionBatches, lotesDateStart, lotesDateEnd, lotesSearchTerm, db.orders, db.items]);

  const visibleLotes = React.useMemo(() => {
    return processedBatches.slice(0, lotesVisibleCount);
  }, [processedBatches, lotesVisibleCount]);


  const manualProductId = React.useMemo(() => {
    const item = db.items.find(
      (i) =>
        `${i.code} - ${i.name}`.toLowerCase() ===
        manualProductSearch.toLowerCase(),
    );
    return item ? item.id : null;
  }, [manualProductSearch, db.items]);

  const suggestedManualProducts = React.useMemo(() => {
    const query = manualProductSearch.trim().toLowerCase();
    if (!query) {
      return db.items.slice(0, 5);
    }
    return db.items
      .filter((i) => `${i.code} - ${i.name}`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [manualProductSearch, db.items]);

  const matchingOrdersForManualProduct = React.useMemo(() => {
    if (!manualProductId) return [];
    return db.orders.filter(
      (o) =>
        o.isActive && o.status !== "FATURADO" && o.itemId === manualProductId,
    );
  }, [manualProductId, db.orders]);

  const matchingFlowItems = React.useMemo(() => {
    const query = flowItemSearchTerm.trim().toLowerCase();
    if (!query) {
      return db.items.slice(0, 6); // Reduced option lists for clean design
    }
    return db.items
      .filter(
        (i) =>
          i.code.toLowerCase().includes(query) ||
          i.name.toLowerCase().includes(query),
      )
      .slice(0, 6); // Intelligent matching limit
  }, [flowItemSearchTerm, db.items]);

  const matchingReplicateTargetItems = React.useMemo(() => {
    const query = replicateTargetSearchTerm.trim().toLowerCase();
    if (!query) {
      return db.items.slice(0, 6);
    }
    return db.items
      .filter(
        (i) =>
          i.code.toLowerCase().includes(query) ||
          i.name.toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [replicateTargetSearchTerm, db.items]);

  const handleCreateManualOrder = async () => {
    if (!manualProductId || manualProductQty <= 0) return;
    const newOrderId = Date.now();
    await db.updateOrders([
      {
        id: newOrderId,
        orderCode: `PCP-INT-${Math.floor(Math.random() * 10000)}`,
        itemId: manualProductId,
        color: manualProductColor,
        size: "-",
        variation: "-",
        customerName: "Estoque Interno (PCP)",
        totalQuantity: manualProductQty,
        packedQuantity: 0,
        producedQuantity: 0,
        deliveryDate: manualProductDeliveryDate || "-",
        isActive: true,
        createdAt: Date.now(),
      },
    ]);
    setNewBatchSelectedOrderIds([...newBatchSelectedOrderIds, newOrderId]);
    setCustomNewBatchQuantities((prev) => ({ ...prev, [newOrderId]: manualProductQty }));
    setManualProductSearch("");
    setManualProductQty(0);
    setManualProductColor("-");
    setManualProductDeliveryDate("");
  };

  const handleCreateNewBatch = async () => {
    if (!newBatchName) return;
    const isGer = currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia" || isGerenciaLote;
    
    if (isGer) {
      const ordersToUpdate: any[] = [];
      for (const oid of newBatchSelectedOrderIds) {
        const order = db.orders.find((x) => x.id === oid);
        if (order && customNewBatchQuantities[oid] !== undefined && customNewBatchQuantities[oid] !== order.totalQuantity) {
          ordersToUpdate.push({
            ...order,
            totalQuantity: customNewBatchQuantities[oid],
          });
        }
      }
      if (ordersToUpdate.length > 0) {
        await db.updateOrders(ordersToUpdate);
      }
    }

    await db.addProductionBatch({
      name: newBatchName,
      sectorId: isGer ? 999 : newBatchSectorId,
      orderIds: newBatchSelectedOrderIds,
      status: "PENDENTE",
      createdAt: Date.now(),
      isGerenciaLote: isGer,
      assignedOperatorIds: isGer ? assignedOperatorIds : [],
      checkedOrderIds: [],
      liberatedOrderIds: [],
    });
    setShowNewBatchModal(false);
    setNewBatchName("");
    setNewBatchSelectedOrderIds([]);
    setNewBatchAvailableSearch("");
    setNewBatchDeliveryFilter("TODOS");
    setNewBatchExcludeInProduction(true);
    setCustomNewBatchQuantities({});
  };

  // Custom Interactive Batch edit / details states
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [editBatchName, setEditBatchName] = useState("");
  const [editBatchSectorId, setEditBatchSectorId] = useState<number>(0);
  const [editBatchStatus, setEditBatchStatus] = useState<
    "PENDENTE" | "EM_PRODUCAO" | "CONCLUIDO"
  >("PENDENTE");
  const [editBatchOrderIds, setEditBatchOrderIds] = useState<number[]>([]);
  const [addOrderSearch, setAddOrderSearch] = useState("");
  const [addOrderDeliveryFilter, setAddOrderDeliveryFilter] = useState<
    "TODOS" | "ESSA_SEMANA" | "PROXIMA_SEMANA" | "ATRASADO"
  >("TODOS");
  const [addOrderExcludeInProduction, setAddOrderExcludeInProduction] =
    useState<boolean>(true);

  // New batch metadata fields
  const [editBatchRawMaterial, setEditBatchRawMaterial] = useState("");
  const [editBatchGeneratedPiece, setEditBatchGeneratedPiece] = useState("");
  const [editBatchDeadline, setEditBatchDeadline] = useState("");
  const [editBatchNotes, setEditBatchNotes] = useState("");
  const [editBatchOperatorId, setEditBatchOperatorId] = useState("");

  const handleOpenBatchDetails = (b: any) => {
    setSelectedBatch(b);
    setEditBatchName(b.name || "");
    setEditBatchSectorId(b.sectorId || 0);
    setEditBatchStatus(b.status || "PENDENTE");
    setEditBatchOrderIds(b.orderIds || []);
    setEditBatchRawMaterial(b.rawMaterial || "");
    setEditBatchGeneratedPiece(b.generatedPiece || "");
    setEditBatchDeadline(b.deadline || "");
    setEditBatchNotes(b.notes || "");
    setEditBatchOperatorId(b.operatorId || "");
    setAddOrderSearch("");
    setAddOrderDeliveryFilter("TODOS");
    setAddOrderExcludeInProduction(true);
    setIsEditingBatch(false);

    const initialQuantities: Record<number, number> = {};
    if (b.orderIds) {
      b.orderIds.forEach((oid: number) => {
        const o = db.orders.find((x) => x.id === oid);
        if (o) {
          initialQuantities[oid] = o.totalQuantity;
        }
      });
    }
    setCustomEditBatchQuantities(initialQuantities);
  };

  const handleSaveBatchAdjustments = async () => {
    if (!selectedBatch) return;
    if (!editBatchName.trim()) {
      alert("Por favor, digite o nome do lote.");
      return;
    }

    const isGer = currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia";
    if (isGer) {
      const ordersToUpdate: any[] = [];
      for (const oid of editBatchOrderIds) {
        const order = db.orders.find((x) => x.id === oid);
        if (order && customEditBatchQuantities[oid] !== undefined && customEditBatchQuantities[oid] !== order.totalQuantity) {
          ordersToUpdate.push({
            ...order,
            totalQuantity: customEditBatchQuantities[oid],
          });
        }
      }
      if (ordersToUpdate.length > 0) {
        await db.updateOrders(ordersToUpdate);
      }
    }

    const updatedBatch = {
      ...selectedBatch,
      name: editBatchName.trim(),
      sectorId: editBatchSectorId,
      status: editBatchStatus,
      orderIds: editBatchOrderIds,
      rawMaterial: editBatchRawMaterial.trim(),
      generatedPiece: editBatchGeneratedPiece.trim(),
      deadline: editBatchDeadline.trim(),
      notes: editBatchNotes.trim(),
      operatorId: editBatchOperatorId,
    };
    await db.updateProductionBatch(updatedBatch);

    // Logging the batch edit manually as requested:
    const logMsg = `Lote ID ${selectedBatch.id} ("${selectedBatch.name}") editado por ${currentUser.name}. Campos alterados: Status=${editBatchStatus}, Setor=${editBatchSectorId}, Prazo=${editBatchDeadline}, Operador=${editBatchOperatorId}`;
    try {
      await db.addLogs([
        {
          id: Date.now(),
          processName: `Ajuste de Lote: ${editBatchName.trim()}`,
          operatorId: currentUser.id || "PCP",
          timestamp: Date.now(),
          durationMillis: 0,
          customProductName: logMsg,
          type: "PRODUCAO" as any,
        },
      ]);
    } catch (e) {
      console.error("Could not register log:", e);
    }

    setSelectedBatch(null);
    setIsEditingBatch(false);
    setCustomEditBatchQuantities({});
    alert("Lote de produção atualizado com sucesso!");
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (
      !window.confirm(
        "Deseja realmente excluir este lote? Os pedidos voltando a ficar disponíveis para planejamento.",
      )
    )
      return;
    await db.deleteProductionBatch(batchId);
    setSelectedBatch(null);
    alert("Lote excluído com sucesso!");
  };

  // Esc key down listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedBatch(null);
      }
    };
    if (selectedBatch) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBatch]);

  const ordersInAllBatches = React.useMemo(() => {
    return new Set(
      db.productionBatches
        .filter((b) => !selectedBatch || b.id !== selectedBatch.id)
        .flatMap((b) => b.orderIds),
    );
  }, [db.productionBatches, selectedBatch]);

  const availableOrdersForBatch = React.useMemo(() => {
    return db.orders.filter(
      (o) =>
        o.isActive &&
        !ordersInAllBatches.has(o.id) &&
        !editBatchOrderIds.includes(o.id),
    );
  }, [db.orders, ordersInAllBatches, editBatchOrderIds]);

  const filteredAvailableOrders = React.useMemo(() => {
    let list = availableOrdersForBatch;

    // Filter by production status
    if (addOrderExcludeInProduction) {
      const wipStatuses = [
        "EM_PRODUCAO",
        "PRODUZIDO",
        "EM_CORTE",
        "CORTADO",
        "EM_PINTURA",
        "PINTADO",
        "EMBALANDO",
        "EMBALADO",
        "TEM_ESTOQUE",
        "FATURADO",
      ];
      list = list.filter((o) => !wipStatuses.includes(o.status || "PENDENTE"));
    }

    // Filter by delivery date shortcut
    if (addOrderDeliveryFilter !== "TODOS") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endOfThisWeek = new Date(today);
      const daysUntilSat = 6 - today.getDay();
      endOfThisWeek.setDate(
        today.getDate() + (daysUntilSat >= 0 ? daysUntilSat : 6)
      );
      endOfThisWeek.setHours(23, 59, 59, 999);

      const endOfNextWeek = new Date(endOfThisWeek);
      endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);

      list = list.filter((o) => {
        if (!o.deliveryDate) return false;

        const parts = o.deliveryDate.split("-");
        if (parts.length !== 3) return false;
        const dDate = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2])
        );
        dDate.setHours(12, 0, 0, 0);

        if (addOrderDeliveryFilter === "ATRASADO") {
          return dDate < today;
        } else if (addOrderDeliveryFilter === "ESSA_SEMANA") {
          return dDate >= today && dDate <= endOfThisWeek;
        } else if (addOrderDeliveryFilter === "PROXIMA_SEMANA") {
          return dDate > endOfThisWeek && dDate <= endOfNextWeek;
        }
        return true;
      });
    }

    const q = addOrderSearch.toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.orderCode.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q)
      );
    }
    
    // Sort logic to prioritize closer/late records
    list = [...list].sort((a, b) => {
      const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Infinity;
      const dbDate = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Infinity;
      return da - dbDate;
    });

    if (!q) return list.slice(0, 40); // show top 40 as default if no search 

    return list;
  }, [
    availableOrdersForBatch,
    addOrderSearch,
    addOrderDeliveryFilter,
    addOrderExcludeInProduction,
  ]);

  const sectorSummary = React.useMemo(() => {
    if (!proposedBatches) return [];
    const summaryMap = new Map<
      number,
      { sectorName: string; totalPieces: number; batchCount: number }
    >();
    proposedBatches.forEach((pb) => {
      const sector = db.sectors.find((s) => s.id === pb.sectorId);
      const sectorName =
        pb.sectorId === 0
          ? "Geral / Sem Setor"
          : sector
            ? sector.name
            : `Setor ${pb.sectorId}`;
      let sectorPieces = 0;
      pb.orderIds.forEach((oid: number) => {
        const order = db.orders.find((o) => o.id === oid);
        if (order) {
          sectorPieces += order.totalQuantity;
        }
      });
      const existing = summaryMap.get(pb.sectorId) || {
        sectorName,
        totalPieces: 0,
        batchCount: 0,
      };
      existing.totalPieces += sectorPieces;
      existing.batchCount += 1;
      summaryMap.set(pb.sectorId, existing);
    });
    return Array.from(summaryMap.values());
  }, [proposedBatches, db.orders, db.sectors]);

  const nextId = React.useMemo(() => {
    const ids = db.customers.map((c) => c.id);
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  }, [db.customers]);

  const handleAddCustomer = () => {
    if (!customerName) return;
    const cid = newCustomerId ? parseInt(newCustomerId, 10) : nextId;
    if (isNaN(cid)) {
      alert("Por favor, insira um código de cliente válido (numérico).");
      return;
    }
    if (db.customers.some((c) => c.id === cid)) {
      alert(
        `Já existe um cliente cadastrado com o código ${cid}. Por favor, escolha outro Código.`,
      );
      return;
    }

    const city = newCustomerCity.trim();
    const uf = newCustomerUF.trim();
    const address =
      city && uf
        ? `${city} - ${uf.toUpperCase()}`
        : city || uf.toUpperCase() || "";

    db.addCustomer({
      id: cid,
      name: customerName,
      address,
      phone: "",
      email: "",
    });

    setCustomerName("");
    setNewCustomerId("");
    setNewCustomerCity("");
    setNewCustomerUF("");
  };

  const startEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setEditCustomerName(c.name);
    let city = "";
    let uf = "";
    if (c.address && c.address.includes(" - ")) {
      const parts = c.address.split(" - ");
      city = parts[0] || "";
      uf = parts[1] || "";
    } else {
      city = c.address || "";
    }
    setEditCustomerCity(city);
    setEditCustomerUF(uf);
  };

  const handleSaveEditCustomer = () => {
    if (!editingCustomer || !editCustomerName) return;
    const city = editCustomerCity.trim();
    const uf = editCustomerUF.trim();
    const address =
      city && uf
        ? `${city} - ${uf.toUpperCase()}`
        : city || uf.toUpperCase() || "";

    db.updateCustomer({
      ...editingCustomer,
      name: editCustomerName,
      address,
    });

    setEditingCustomer(null);
    setEditCustomerName("");
    setEditCustomerCity("");
    setEditCustomerUF("");
  };

  const filteredCustomers = React.useMemo(() => {
    return db.customers.filter((c) => {
      const codeStr = String(c.id || "");
      const nameLower = (c.name || "").toLowerCase();
      const addressLower = (c.address || "").toLowerCase();
      const qLower = customerSearch.toLowerCase();
      return (
        codeStr.includes(qLower) ||
        nameLower.includes(qLower) ||
        addressLower.includes(qLower)
      );
    });
  }, [db.customers, customerSearch]);

  const sortedCustomers = React.useMemo(() => {
    return [...filteredCustomers].sort((a, b) => a.id - b.id);
  }, [filteredCustomers]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedCustomers.length / customerPerPage),
  );
  const activePage = Math.min(customerPage, totalPages);

  const paginatedCustomers = React.useMemo(() => {
    const startIndex = (activePage - 1) * customerPerPage;
    return sortedCustomers.slice(startIndex, startIndex + customerPerPage);
  }, [sortedCustomers, activePage, customerPerPage]);

  const handleAddSector = () => {
    if (!sectorName) return;
    db.addSector({
      name: sectorName,
      dailyCapacity: Number(sectorCapacity) || 1000,
    });
    setSectorName("");
    setSectorCapacity("");
  };

  const handleStartEditSector = (s: Sector) => {
    setEditingSectorId(s.id);
    setEditSectorName(s.name);
    setEditSectorCapacity(s.dailyCapacity?.toString() ?? "0");
  };

  const handleSaveSector = async () => {
    if (!editingSectorId || !editSectorName.trim()) return;
    await db.updateSector({
      id: editingSectorId,
      name: editSectorName.trim(),
      dailyCapacity: Number(editSectorCapacity) || 0,
    });
    setEditingSectorId(null);
    setEditSectorName("");
    setEditSectorCapacity("");
  };

  const handleAddFlow = () => {
    if (!flowItemId || flowSectors.length === 0) return;
    db.addProductFlow({
      itemId: Number(flowItemId),
      sectorIds: flowSectors,
    });
    setFlowItemId("");
    setFlowItemSearchTerm("");
    setFlowItemSearchOpen(false);
    setFlowSectors([]);
  };

  const handleReplicateFlow = async () => {
    if (!replicateSourceItemId || !replicateTargetItemId) {
      alert(
        "Por favor, selecione tanto o produto de origem quanto o de destino.",
      );
      return;
    }
    const sourceFlow = db.productFlows.find(
      (f) => f.itemId === Number(replicateSourceItemId),
    );
    if (!sourceFlow) {
      alert(
        "O produto de origem selecionado não possui nenhum fluxo cadastrado.",
      );
      return;
    }
    if (Number(replicateSourceItemId) === Number(replicateTargetItemId)) {
      alert("Os produtos de origem e destino devem ser diferentes.");
      return;
    }

    try {
      // Find if target item already has a flow and overwrite it cleanly
      const existingTargetFlow = db.productFlows.find(
        (f) => f.itemId === Number(replicateTargetItemId),
      );
      if (existingTargetFlow) {
        await db.deleteProductFlow(existingTargetFlow.id);
      }

      await db.addProductFlow({
        itemId: Number(replicateTargetItemId),
        sectorIds: sourceFlow.sectorIds,
      });

      const sourceItem = db.items.find(
        (i) => i.id === Number(replicateSourceItemId),
      );
      const targetItem = db.items.find(
        (i) => i.id === Number(replicateTargetItemId),
      );

      setReplicateSuccessMsg(
        `Fluxo do item "${sourceItem?.code} - ${sourceItem?.name}" replicado com sucesso para "${targetItem?.code} - ${targetItem?.name}"!`,
      );
      setTimeout(() => setReplicateSuccessMsg(""), 5000);

      // Clean target slate
      setReplicateTargetItemId("");
      setReplicateTargetSearchTerm("");
      setReplicateTargetSearchOpen(false);
    } catch (e: any) {
      alert("Erro ao replicar fluxo: " + (e?.message || e));
    }
  };

  const getSuggestedBatches = (strategy: "PRAZO" | "CAPACIDADE") => {
    const ordersInBatches = new Set(
      db.productionBatches.flatMap((b) => b.orderIds),
    );
    const unbatchedOrders = db.orders.filter(
      (o) => o.isActive && o.status !== "FATURADO" && !ordersInBatches.has(o.id),
    );

    const sectorOrderMap = new Map<number, Order[]>();
    for (const order of unbatchedOrders) {
      const flow = db.productFlows.find((f) => f.itemId === order.itemId);
      const sectorId =
        flow && flow.sectorIds.length > 0 ? flow.sectorIds[0] : 0; // 0 represents Geral / Sem Setor
      if (!sectorOrderMap.has(sectorId)) sectorOrderMap.set(sectorId, []);
      sectorOrderMap.get(sectorId)!.push(order);
    }

    let proposals: any[] = [];

    const parseDateHelper = (dStr: string) => {
      if (!dStr) return 0;
      if (dStr.includes("/")) {
        const parts = dStr.split("/");
        if (parts.length === 3) {
          return new Date(
            Number(parts[2]),
            Number(parts[1]) - 1,
            Number(parts[0]),
          ).getTime();
        }
      }
      const time = new Date(dStr).getTime();
      return isNaN(time) ? 0 : time;
    };

    for (const [sectorId, orders] of sectorOrderMap.entries()) {
      const sector = db.sectors.find((s) => s.id === sectorId);
      const capacity = sector?.dailyCapacity || 1000;
      const sectorName = sector ? sector.name : "Geral";

      // Sort orders based on selected strategy
      if (strategy === "PRAZO") {
        orders.sort(
          (a, b) =>
            parseDateHelper(a.deliveryDate) - parseDateHelper(b.deliveryDate),
        );
      } else {
        orders.sort((a, b) => b.totalQuantity - a.totalQuantity);
      }

      let currentOrders: number[] = [];
      let currentCapacity = 0;

      const existingSectorBatches = db.productionBatches.filter(
        (b) => b.sectorId === sectorId,
      ).length;
      let nextBatchNum = existingSectorBatches + 1;

      for (const order of orders) {
        if (
          currentCapacity + order.totalQuantity > capacity &&
          currentOrders.length > 0
        ) {
          proposals.push({
            name: `LOTE ${nextBatchNum} ${sectorName.toUpperCase()}`,
            sectorId,
            orderIds: [...currentOrders],
            status: "PENDENTE",
            createdAt: Date.now(),
          });
          nextBatchNum++;
          currentOrders = [];
          currentCapacity = 0;
        }
        currentOrders.push(order.id);
        currentCapacity += order.totalQuantity;
      }

      if (currentOrders.length > 0) {
        proposals.push({
          name: `LOTE ${nextBatchNum} ${sectorName.toUpperCase()}`,
          sectorId,
          orderIds: [...currentOrders],
          status: "PENDENTE",
          createdAt: Date.now(),
        });
      }
    }
    return proposals;
  };

  const handleSuggestBatches = (
    strategy: "PRAZO" | "CAPACIDADE" = optimizationStrategy,
  ) => {
    const proposals = getSuggestedBatches(strategy);
    if (proposals.length > 0) {
      setProposedBatches(proposals);
    } else {
      alert("Nenhum pedido novo pendente para gerar lote.");
    }
  };

  const handleMoveOrder = (
    orderId: number,
    sourceBatchIdx: number,
    targetBatchIdx: number,
  ) => {
    if (sourceBatchIdx === targetBatchIdx || !proposedBatches) return;
    const nextProposals = [...proposedBatches];

    const sourceBatch = { ...nextProposals[sourceBatchIdx] };
    const targetBatch = { ...nextProposals[targetBatchIdx] };

    if (sourceBatch.sectorId !== targetBatch.sectorId) {
      alert("Não é permitido mover pedidos entre lotes de setores diferentes.");
      return;
    }

    if (!sourceBatch.orderIds.includes(orderId)) return;

    sourceBatch.orderIds = sourceBatch.orderIds.filter(
      (id: number) => id !== orderId,
    );
    targetBatch.orderIds = [...targetBatch.orderIds, orderId];

    nextProposals[sourceBatchIdx] = sourceBatch;
    nextProposals[targetBatchIdx] = targetBatch;

    setProposedBatches(nextProposals.filter((pb) => pb.orderIds.length > 0));
  };

  const handleConfirmProposedBatches = async () => {
    if (!proposedBatches) return;
    let overloadWarnings: string[] = [];

    for (const pb of proposedBatches) {
      await db.addProductionBatch(pb);

      // Calculate capacity load of consolidated batch
      const sector = db.sectors.find((s) => s.id === pb.sectorId);
      const capacity = sector?.dailyCapacity || 1000;
      const totalPieces = pb.orderIds.reduce((sum: number, oid: number) => {
        const o = db.orders.find((order) => order.id === oid);
        return sum + (o?.totalQuantity || 0);
      }, 0);

      // Notification if batch is over 110% capacity
      if (totalPieces > capacity * 1.1) {
        overloadWarnings.push(
          `${pb.name} (${totalPieces}/${capacity} pçs - ${((totalPieces / capacity) * 100).toFixed(0)}%)`,
        );

        const displaySectorName =
          pb.sectorId === 0 ? "Geral / Sem Setor" : sector?.name || pb.sectorId;
        await db.addNotification({
          message: `🚨 ALERTA PCP: O lote de produção sugerido "${pb.name}" do setor "${displaySectorName}" excede 110% de sua capacidade diária. Volume alocado: ${totalPieces} pçs (Capacidade: ${capacity} pçs)`,
          read: false,
        });
      }
    }

    if (overloadWarnings.length > 0) {
      alert(
        `Lotes sugeridos consolidados!\n⚠️ ATENÇÃO: As seguintes notificações foram geradas para o PCP devido a lotes acima de 110% de capacidade:\n\n${overloadWarnings.join("\n")}`,
      );
    } else {
      alert(`${proposedBatches.length} novos lotes foram sugeridos e criados!`);
    }
    setProposedBatches(null);
  };

  const handleEstimateAgendas = async () => {
    const unmappedOrders = db.orders.filter(
      (o) =>
        o.isActive && !db.productionAgendas.some((a) => a.orderId === o.id),
    );

    let count = 0;
    for (const order of unmappedOrders) {
      const flow = db.productFlows.find((f) => f.itemId === order.itemId);
      if (!flow || flow.sectorIds.length === 0) continue;

      let currentTimestamp = Date.now();

      for (const sectorId of flow.sectorIds) {
        const sector = db.sectors.find((s) => s.id === sectorId);
        currentTimestamp += 86400000; // Add 1 day per sector for simplified estimate
        const d = new Date(currentTimestamp);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        await db.addProductionAgenda({
          orderId: order.id,
          sectorId: sectorId,
          estimatedDate: dateStr,
        });
        count++;
      }
    }
    if (count > 0) {
      alert(
        `O sistema gerou ${count} previsões de agenda para os pedidos recentes.`,
      );
    } else {
      alert(`Todos os pedidos ativos já possuem agenda estimada.`);
    }
  };

  return (
    <ScreenLayout className="gap-4">
      <ScrollContainer paddingSize="dense">
        {subScreen === "CADASTROS" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex gap-2 mb-4 overflow-x-auto shrink-0 pb-2">
              <button
                onClick={() => setCadastroTab("CLIENTES")}
                className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition-colors ${cadastroTab === "CLIENTES" ? "bg-gray-800 text-white" : "bg-white text-gray-600 border"}`}
              >
                <Users size={16} className="inline mr-2" /> Clientes
              </button>
              <button
                onClick={() => setCadastroTab("SETORES")}
                className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition-colors ${cadastroTab === "SETORES" ? "bg-gray-800 text-white" : "bg-white text-gray-600 border"}`}
              >
                <Building size={16} className="inline mr-2" /> Setores
              </button>
              <button
                onClick={() => setCadastroTab("FLUXOS")}
                className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition-colors ${cadastroTab === "FLUXOS" ? "bg-gray-800 text-white" : "bg-white text-gray-600 border"}`}
              >
                <Route size={16} className="inline mr-2" /> Fluxos por Produto
              </button>
              <button
                onClick={() => setCadastroTab("PLANOS_CORTE")}
                className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition-colors ${cadastroTab === "PLANOS_CORTE" ? "bg-indigo-700 text-white shadow-md" : "bg-white text-indigo-700 border border-indigo-200"}`}
              >
                <Scissors size={16} className="inline mr-2" /> Planos de Corte &
                Injeção (Prensa e Injetora)
              </button>
              <button
                onClick={() => setCadastroTab("REPRESENTANTES")}
                className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition-colors ${cadastroTab === "REPRESENTANTES" ? "bg-teal-700 text-white shadow-md" : "bg-white text-teal-700 border border-teal-200"}`}
              >
                <Phone size={16} className="inline mr-2" /> Contatos Representantes
              </button>
              <button
                onClick={() => setCadastroTab("COMPOSICAO")}
                className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition-colors ${cadastroTab === "COMPOSICAO" ? "bg-purple-700 text-white shadow-md font-extrabold" : "bg-white text-purple-700 border border-purple-250"}`}
              >
                <Layers size={16} className="inline mr-2" /> Composição de Produtos (BOM)
              </button>
              <button
                onClick={() => setCadastroTab("CONFIGURACOES")}
                className={`px-4 py-2 rounded font-bold text-sm whitespace-nowrap transition-colors ${cadastroTab === "CONFIGURACOES" ? "bg-blue-700 text-white shadow-md" : "bg-white text-blue-700 border border-blue-200"}`}
              >
                <SlidersHorizontal size={16} className="inline mr-2" /> Configurações do Sistema
              </button>
            </div>

            <ScrollContainer paddingSize="none" className="w-full">
              {cadastroTab === "REPRESENTANTES" && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-5 max-w-2xl mx-auto mt-4 text-left">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Phone className="text-teal-600" size={24} />
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">WhatsApp dos Representantes</h3>
                      <p className="text-xs text-gray-500 font-medium">Cadastre os números de telefone para redirecionamento direto no compartilhamento de faturamento</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-amber-900 text-xs">
                    <p className="font-bold mb-1">💡 Importante para o funcionamento correto:</p>
                    <p>
                      Ao cadastrar os números, insira sempre o <strong>Código do País + DDD + Número</strong> (apenas números, sem espaços ou traços). 
                      Exemplo: <code>5511999998888</code> para o Brasil (55), São Paulo (11).
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 divide-y divide-gray-100">
                    {db.users
                      .filter((u) => u.role === "REPRESENTANTE")
                      .map((u) => (
                        <RepresentativeContactRow key={u.id} u={u} db={db} />
                      ))
                    }
                    {db.users.filter((u) => u.role === "REPRESENTANTE").length === 0 && (
                      <p className="text-gray-500 text-center text-sm py-8">Nenhum usuário com perfil de Representante encontrado no sistema.</p>
                    )}
                  </div>
                </div>
              )}

              {cadastroTab === "CONFIGURACOES" && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-5 max-w-2xl mx-auto mt-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <SlidersHorizontal className="text-blue-600" size={24} />
                    <h3 className="font-bold text-gray-800 text-lg">Configurações Gerais</h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">
                        Nome da Empresa (Nas Etiquetas)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: IMPÉRIO JOMARCI..."
                        value={sysConfigCompanyName}
                        onChange={(e) => setSysConfigCompanyName(e.target.value)}
                        className="w-full border p-2.5 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium bg-gray-50 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">
                        Nome/Descrição do Sistema
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: ACESSÓRIOS PARA MÓVEIS"
                        value={sysConfigSystemName}
                        onChange={(e) => setSysConfigSystemName(e.target.value)}
                        className="w-full border p-2.5 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium bg-gray-50 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">
                        Cor Principal do Sistema
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={sysConfigPrimaryColor}
                          onChange={(e) => setSysConfigPrimaryColor(e.target.value)}
                          className="w-12 h-10 border rounded cursor-pointer"
                        />
                        <span className="text-xs font-mono text-gray-500">{sysConfigPrimaryColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">
                        Meta de Faturamento Mensal (R$)
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 500000"
                        value={sysConfigMonthlyBillingGoal}
                        onChange={(e) => setSysConfigMonthlyBillingGoal(e.target.value)}
                        className="w-full border p-2.5 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium bg-gray-50 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">
                        Logotipo da Empresa
                      </label>
                      <div className="flex flex-col gap-3 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50 items-center justify-center">
                        {sysConfigLogoUrl && sysConfigLogoUrl !== "/icon.png" ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Logotipo Atual</span>
                            <img src={sysConfigLogoUrl} alt="Logo preview" className="h-16 object-contain border p-1 bg-white rounded shadow-sm max-w-[200px]" />
                            <div className="flex gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => setSysConfigLogoUrl("/icon.png")}
                                className="text-xs text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition"
                              >
                                Remover Logotipo
                              </button>
                              <label className="text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition cursor-pointer">
                                Alterar Imagem
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setSysConfigLogoUrl(reader.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-2">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 mb-1">
                              <img src={sysConfigLogoUrl || "/icon.png"} alt="Default Logo" className="w-8 h-8 object-contain" />
                            </div>
                            <span className="text-xs font-semibold text-gray-600">Nenhum logotipo customizado carregado</span>
                            <label className="mt-1 text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 border border-blue-200 rounded transition cursor-pointer">
                              Selecionar Imagem do Logotipo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setSysConfigLogoUrl(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <p className="text-[11px] text-gray-400 mt-1 max-w-xs text-center">
                              Formatos aceitos: SVG, PNG ou JPG. Prefira fundos brancos ou transparentes de alto contraste.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-2 flex justify-end">
                    <button
                      onClick={handleSaveSystemConfig}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition shadow"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}

              {cadastroTab === "CLIENTES" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* FORM COLUMN: ADD / EDIT CUSTOMER */}
                  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-4 self-start">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <Users className="text-indigo-600" size={20} />
                      <h3 className="font-bold text-gray-800 text-base">
                        {editingCustomer
                          ? "Editar Cliente"
                          : "Adicionar Novo Cliente"}
                      </h3>
                    </div>

                    {editingCustomer ? (
                      /* EDITING CUSTOMER FORM */
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">
                            Código (Não editável)
                          </label>
                          <input
                            type="text"
                            disabled
                            value={editingCustomer.id}
                            className="w-full border p-2 bg-gray-50 rounded text-gray-500 font-mono text-sm cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1">
                            Razão Social / Nome *
                          </label>
                          <input
                            type="text"
                            placeholder="Digite o nome completo"
                            value={editCustomerName}
                            onChange={(e) =>
                              setEditCustomerName(e.target.value)
                            }
                            className="w-full border p-2 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                              Cidade
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Ubá"
                              value={editCustomerCity}
                              onChange={(e) =>
                                setEditCustomerCity(e.target.value)
                              }
                              className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                              UF
                            </label>
                            <input
                              type="text"
                              maxLength={2}
                              placeholder="MG"
                              value={editCustomerUF}
                              onChange={(e) =>
                                setEditCustomerUF(e.target.value)
                              }
                              className="w-full border p-2 rounded text-sm text-center uppercase focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={handleSaveEditCustomer}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2 px-3 rounded shadow-sm transition flex items-center justify-center gap-1.5"
                          >
                            <Check size={16} /> Salvar
                          </button>
                          <button
                            onClick={() => {
                              setEditingCustomer(null);
                              setEditCustomerName("");
                              setEditCustomerCity("");
                              setEditCustomerUF("");
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm py-2 px-3 rounded transition flex items-center justify-center gap-1"
                          >
                            <XCircle size={16} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ADD CUSTOMER FORM */
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1">
                            Código do Cliente (ID)
                          </label>
                          <input
                            type="number"
                            placeholder={`Sugerido: ${nextId}`}
                            value={newCustomerId}
                            onChange={(e) => setNewCustomerId(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-mono"
                          />
                          <span className="text-[11px] text-gray-400 mt-0.5 block">
                            Se deixar em branco, o sistema gerará o código{" "}
                            {nextId}.
                          </span>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1">
                            Razão Social / Nome *
                          </label>
                          <input
                            type="text"
                            placeholder="Digite o nome completo ou razão"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                              Cidade
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Ubá"
                              value={newCustomerCity}
                              onChange={(e) =>
                                setNewCustomerCity(e.target.value)
                              }
                              className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                              UF
                            </label>
                            <input
                              type="text"
                              maxLength={2}
                              placeholder="MG"
                              value={newCustomerUF}
                              onChange={(e) => setNewCustomerUF(e.target.value)}
                              className="w-full border p-2 rounded text-sm text-center uppercase focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleAddCustomer}
                          disabled={!customerName}
                          className={`w-full font-bold text-sm py-2 px-4 rounded transition flex items-center justify-center gap-1.5 shadow-sm mt-2 ${
                            customerName
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <Plus size={16} /> Cadastrar Cliente
                        </button>
                      </div>
                    )}
                  </div>

                  {/* LIST / TABLE COLUMN: CUSTOMERS LIST WITH PAGINATION & SEARCH */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 lg:col-span-2 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">
                          Relação de Clientes
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Base atualizada: {sortedCustomers.length} de{" "}
                          {db.customers.length} cadastrados
                        </p>
                      </div>

                      {/* SEARCH FIELD */}
                      <div className="relative min-w-[200px] max-w-sm sm:w-64">
                        <Search
                          className="absolute left-2.5 top-2.5 text-gray-400"
                          size={16}
                        />
                        <input
                          type="text"
                          placeholder="Buscar por código, nome ou cidade..."
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setCustomerPage(1);
                          }}
                          className="w-full border pl-8 pr-8 py-2 text-xs rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        {customerSearch && (
                          <button
                            onClick={() => {
                              setCustomerSearch("");
                              setCustomerPage(1);
                            }}
                            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CUSTOMERS TABLE */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-16 text-center">
                              Código
                            </th>
                            <th className="py-2.5 px-3">
                              Razão Social / Nome do Cliente
                            </th>
                            <th className="py-2.5 px-3">Cidade / UF</th>
                            <th className="py-2.5 px-3 w-20 text-center">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {paginatedCustomers.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-8 text-center text-gray-400"
                              >
                                Nenhum cliente encontrado correspondente à
                                pesquisa.
                              </td>
                            </tr>
                          ) : (
                            paginatedCustomers.map((c) => {
                              const addressParts = c.address
                                ? c.address.split(" - ")
                                : [];
                              const cityOnly = addressParts[0] || "";
                              const ufOnly = addressParts[1] || "";

                              return (
                                <tr
                                  key={c.id}
                                  className="hover:bg-indigo-50/20 transition-colors"
                                >
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="bg-gray-100 text-gray-800 font-mono text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded">
                                      {c.id}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-900 break-words max-w-xs">
                                    {c.name}
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-600">
                                    {cityOnly ? (
                                      <span className="flex items-center gap-1">
                                        <MapPin
                                          size={12}
                                          className="text-gray-400 shrink-0"
                                        />
                                        <span>
                                          {cityOnly}{" "}
                                          {ufOnly && (
                                            <span className="text-[10px] text-gray-400 font-bold">
                                              ({ufOnly.toUpperCase()})
                                            </span>
                                          )}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 italic">
                                        INDEFINIDA
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => startEditCustomer(c)}
                                        title="Editar"
                                        className="p-1 hover:bg-indigo-50 rounded text-indigo-600 hover:text-indigo-800 transition"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (
                                            confirm(
                                              `Tem certeza que deseja remover o cliente "${c.name}" (Código: ${c.id})?`,
                                            )
                                          ) {
                                            db.deleteCustomer(c.id);
                                          }
                                        }}
                                        title="Excluir"
                                        className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION CONTROL COMPONENT */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 pt-4 gap-3 text-xs">
                        <span className="text-gray-500">
                          Mostrando{" "}
                          <span className="font-semibold text-gray-800">
                            {Math.min(
                              sortedCustomers.length,
                              (activePage - 1) * customerPerPage + 1,
                            )}
                            -
                            {Math.min(
                              sortedCustomers.length,
                              activePage * customerPerPage,
                            )}
                          </span>{" "}
                          de{" "}
                          <span className="font-semibold text-gray-800">
                            {sortedCustomers.length}
                          </span>{" "}
                          clientes
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setCustomerPage((p) => Math.max(1, p - 1))
                            }
                            disabled={activePage === 1}
                            className="p-1.5 border rounded-md enabled:hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                          >
                            <ChevronLeft size={16} />
                          </button>

                          {/* Page Numbers mapping */}
                          {(() => {
                            const pages: (number | string)[] = [];
                            const radius = 1;

                            pages.push(1);
                            if (activePage - radius > 2) pages.push("...");

                            const start = Math.max(2, activePage - radius);
                            const end = Math.min(
                              totalPages - 1,
                              activePage + radius,
                            );

                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }

                            if (activePage + radius < totalPages - 1)
                              pages.push("...");
                            if (totalPages > 1) pages.push(totalPages);

                            return pages.map((p, idx) => {
                              if (p === "...") {
                                return (
                                  <span
                                    key={`dots-${idx}`}
                                    className="px-2 text-gray-400"
                                  >
                                    ...
                                  </span>
                                );
                              }
                              return (
                                <button
                                  key={`page-${p}`}
                                  onClick={() => setCustomerPage(Number(p))}
                                  className={`px-2.5 py-1 border rounded font-semibold text-xs transition ${
                                    activePage === p
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "bg-white hover:bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  {p}
                                </button>
                              );
                            });
                          })()}

                          <button
                            onClick={() =>
                              setCustomerPage((p) =>
                                Math.min(totalPages, p + 1),
                              )
                            }
                            disabled={activePage === totalPages}
                            className="p-1.5 border rounded-md enabled:hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {cadastroTab === "SETORES" && (
                <div className="bg-white p-4 rounded shadow-sm border mb-4">
                  <h3 className="font-bold text-gray-700 mb-3 block">
                    Novo Setor
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome do Setor (ex: Corte, Pintura)"
                      value={sectorName}
                      onChange={(e) => setSectorName(e.target.value)}
                      className="flex-1 border p-2 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Capacidade Diária"
                      value={sectorCapacity}
                      onChange={(e) => setSectorCapacity(e.target.value)}
                      className="w-40 border p-2 rounded"
                    />
                    <button
                      onClick={handleAddSector}
                      className="bg-indigo-600 text-white px-4 rounded font-bold hover:bg-indigo-700"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    {db.sectors.map((s) => (
                      <div
                        key={s.id}
                        className="p-4 border rounded-lg flex justify-between items-center bg-gray-50 hover:bg-gray-100"
                      >
                        {editingSectorId === s.id ? (
                          <div className="flex flex-1 gap-2 mr-3 flex-wrap sm:flex-nowrap items-center">
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">
                                Nome do Setor
                              </label>
                              <input
                                type="text"
                                value={editSectorName}
                                onChange={(e) =>
                                  setEditSectorName(e.target.value)
                                }
                                className="w-full border p-1 rounded text-sm bg-white"
                                placeholder="Nome do Setor"
                              />
                            </div>
                            <div className="w-28 shrink-0">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">
                                Capac. Diária
                              </label>
                              <input
                                type="number"
                                value={editSectorCapacity}
                                onChange={(e) =>
                                  setEditSectorCapacity(e.target.value)
                                }
                                className="w-full border p-1 rounded text-sm bg-white"
                                placeholder="Capacidade"
                              />
                            </div>
                            <div className="flex gap-1.5 self-end pb-0.5">
                              <button
                                onClick={handleSaveSector}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded transition"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingSectorId(null)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-xs px-2.5 py-1.5 rounded transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800">
                                {s.name}
                              </span>
                              <span className="text-xs text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full font-medium">
                                Capacidade:{" "}
                                {s.dailyCapacity !== undefined
                                  ? `${s.dailyCapacity} pçs/dia`
                                  : "N/A"}
                              </span>
                              {s.dailyCapacity === 0 && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                  ⚠️ Capacidade Zerada (Pode afetar agendamento)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {editingSectorId !== s.id && (
                          <div className="flex gap-2 shrink-0 items-center">
                            <button
                              onClick={() => handleStartEditSector(s)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-bold"
                            >
                              Editar
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Tem certeza que deseja remover o setor "${s.name}"?`,
                                  )
                                ) {
                                  db.deleteSector(s.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-bold"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cadastroTab === "FLUXOS" && (
                <div className="bg-white p-4 rounded shadow-sm border mb-4">
                  <h3 className="font-bold text-gray-700 mb-3 block">
                    Novo Fluxo Produtivo
                  </h3>
                  <div className="flex flex-col gap-3">
                    {/* SEARCHABLE SELECTION WITH REDUCED OPTION LIST FOR OPTIMAL DESIGN */}
                    <div className="relative z-40 bg-white">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                        Produto (Código ou Nome)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Digite para buscar produto... (Ex: 1010)"
                            value={
                              flowItemId
                                ? db.items.find((i) => i.id === flowItemId)
                                  ? `${db.items.find((i) => i.id === flowItemId)?.code} - ${db.items.find((i) => i.id === flowItemId)?.name}`
                                  : flowItemSearchTerm
                                : flowItemSearchTerm
                            }
                            onChange={(e) => {
                              setFlowItemSearchTerm(e.target.value);
                              setFlowItemSearchOpen(true);
                              if (flowItemId) {
                                setFlowItemId(""); // clear selected if typing further
                              }
                            }}
                            onFocus={() => setFlowItemSearchOpen(true)}
                            className="w-full border p-2.5 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-800"
                          />
                          {flowItemId && (
                            <span
                              className="absolute right-3 top-3.5 h-2.5 w-2.5 bg-emerald-500 rounded-full animate-ping"
                              title="Produto Selecionado"
                            />
                          )}
                        </div>
                        {(flowItemId || flowItemSearchTerm) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFlowItemId("");
                              setFlowItemSearchTerm("");
                              setFlowItemSearchOpen(false);
                            }}
                            className="px-3 border rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 text-sm font-semibold active:scale-95 transition"
                          >
                            Limpar
                          </button>
                        )}
                      </div>

                      {flowItemSearchOpen && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                          <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              Opções Sugeridas (Pesquisa Inteligente)
                            </span>
                            <button
                              type="button"
                              onClick={() => setFlowItemSearchOpen(false)}
                              className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                              Fechar
                            </button>
                          </div>
                          {matchingFlowItems.length === 0 ? (
                            <div className="p-3 text-sm text-gray-400 italic">
                              Nenhum produto cadastrado corresponde à pesquisa
                            </div>
                          ) : (
                            matchingFlowItems.map((i) => {
                              const isSelected = i.id === flowItemId;
                              return (
                                <button
                                  key={i.id}
                                  type="button"
                                  onClick={() => {
                                    setFlowItemId(i.id);
                                    setFlowItemSearchTerm(
                                      `${i.code} - ${i.name}`,
                                    );
                                    setFlowItemSearchOpen(false);
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 border-b border-gray-100 text-xs font-medium transition-all ${isSelected ? "bg-indigo-50 text-indigo-900 border-l-4 border-l-indigo-600 font-bold" : "hover:bg-slate-50 text-gray-700"}`}
                                >
                                  {i.code} - {i.name}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border p-3 rounded">
                      <label className="text-sm font-bold text-gray-600 block mb-2">
                        Selecione e Ordene os Setores (Arraste para Ordernar):
                      </label>
                      <div className="flex flex-col gap-2 mb-4">
                        {db.sectors.map((s) => (
                          <label key={s.id} className="flex gap-2 items-center">
                            <input
                              type="checkbox"
                              checked={flowSectors.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setFlowSectors([...flowSectors, s.id]);
                                else
                                  setFlowSectors(
                                    flowSectors.filter((id) => id !== s.id),
                                  );
                              }}
                            />
                            {s.name}
                          </label>
                        ))}
                      </div>
                      {flowSectors.length > 0 && (
                        <div className="bg-gray-50 border rounded p-2 flex flex-col gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">
                            Ordem Final do Fluxo:
                          </span>
                          {flowSectors.map((sid, idx) => {
                            const sector = db.sectors.find((s) => s.id === sid);
                            return (
                              <div
                                key={sid}
                                draggable
                                onDragStart={(e) => {
                                  setDraggedSectorIdx(idx);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (
                                    draggedSectorIdx === null ||
                                    draggedSectorIdx === idx
                                  )
                                    return;
                                  const newFlow = [...flowSectors];
                                  const dragged = newFlow[draggedSectorIdx];
                                  newFlow.splice(draggedSectorIdx, 1);
                                  newFlow.splice(idx, 0, dragged);
                                  setDraggedSectorIdx(idx);
                                  setFlowSectors(newFlow);
                                }}
                                onDragEnd={() => setDraggedSectorIdx(null)}
                                className="bg-white p-2 border rounded shadow-sm cursor-grab flex items-center gap-2 text-sm font-semibold active:cursor-grabbing"
                              >
                                <span className="text-gray-400">☰</span>
                                {idx + 1}. {sector?.name}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddFlow}
                      className="bg-indigo-600 text-white p-3 rounded font-bold hover:bg-indigo-700 shadow-sm mt-2 cursor-pointer active:scale-95 transition"
                    >
                      Salvar Fluxo
                    </button>
                  </div>

                  {/* WORKFLOW REPLICATION COMPONENT */}
                  <div className="bg-slate-50/80 rounded-xl border border-indigo-150 p-4.5 mt-6 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">📋</span>
                      <h4 className="font-extrabold text-sm text-indigo-950 tracking-tight">
                        Replicar Fluxo de Setores
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Copie a sequência ordenada de setores estruturada de um
                      produto e replique-a para outro produto instantaneamente.
                    </p>

                    {replicateSuccessMsg && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold mb-4 animate-bounce">
                        {replicateSuccessMsg}
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* SOURCE PRODUCT SELECTOR */}
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                            Produto de Origem (Com Fluxo Ativo)
                          </label>
                          <select
                            value={replicateSourceItemId}
                            onChange={(e) =>
                              setReplicateSourceItemId(
                                e.target.value ? Number(e.target.value) : "",
                              )
                            }
                            className="w-full border border-gray-200 p-2 text-xs bg-white rounded-lg focus:ring-1 focus:ring-indigo-500 text-gray-700 font-semibold cursor-pointer"
                          >
                            <option value="">-- Selecione Origem --</option>
                            {db.productFlows.map((f) => {
                              const it = db.items.find(
                                (i) => i.id === f.itemId,
                              );
                              const sectorsPreview = f.sectorIds
                                .map(
                                  (sid) =>
                                    db.sectors.find((s) => s.id === sid)
                                      ?.name || "",
                                )
                                .filter(Boolean)
                                .join(" ➔ ");
                              return (
                                <option key={f.id} value={f.itemId}>
                                  {it
                                    ? `${it.code} - ${it.name}`
                                    : `ID ${f.itemId}`}{" "}
                                  (
                                  {sectorsPreview
                                    ? sectorsPreview.substring(0, 30)
                                    : ""}
                                  ...)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* TARGET PRODUCT SEARCHABLE */}
                        <div className="flex flex-col relative">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                            Produto de Destino (Receberá o Fluxo)
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Buscar produto destino... (Ex: 1010)"
                              value={
                                replicateTargetItemId
                                  ? db.items.find(
                                      (i) => i.id === replicateTargetItemId,
                                    )
                                    ? `${db.items.find((i) => i.id === replicateTargetItemId)?.code} - ${db.items.find((i) => i.id === replicateTargetItemId)?.name}`
                                    : replicateTargetSearchTerm
                                  : replicateTargetSearchTerm
                              }
                              onChange={(e) => {
                                setReplicateTargetSearchTerm(e.target.value);
                                setReplicateTargetSearchOpen(true);
                                if (replicateTargetItemId) {
                                  setReplicateTargetItemId("");
                                }
                              }}
                              onFocus={() => setReplicateTargetSearchOpen(true)}
                              className="w-full border border-gray-200 p-2 text-xs bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-semibold"
                            />

                            {replicateTargetSearchOpen && (
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-36 overflow-y-auto">
                                <div className="p-1 px-2 border-b border-gray-50 bg-gray-50/50 text-[9px] font-bold text-gray-400 uppercase">
                                  Sugestões
                                </div>
                                {matchingReplicateTargetItems.length === 0 ? (
                                  <div className="p-2 text-xs text-gray-400 italic">
                                    Nenhum produto correspondente
                                  </div>
                                ) : (
                                  matchingReplicateTargetItems.map((i) => (
                                    <button
                                      key={i.id}
                                      type="button"
                                      onClick={() => {
                                        setReplicateTargetItemId(i.id);
                                        setReplicateTargetSearchTerm(
                                          `${i.code} - ${i.name}`,
                                        );
                                        setReplicateTargetSearchOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-1.5 border-b border-gray-50 text-xs hover:bg-slate-50 font-medium"
                                    >
                                      {i.code} - {i.name}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleReplicateFlow}
                        className="w-full py-2.5 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        Copiar e Replicar Fluxo Ativo
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    {db.productFlows.map((f) => {
                      const item = db.items.find((i) => i.id === f.itemId);
                      const sectors = f.sectorIds
                        .map(
                          (sid) =>
                            db.sectors.find((s) => s.id === sid)?.name ||
                            `Setor ${sid}`,
                        )
                        .join(" ➔ ");
                      return (
                        <div
                          key={f.id}
                          className="p-4 border rounded bg-indigo-50 flex flex-col gap-2 relative"
                        >
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Você tem certeza que deseja revogar este fluxo?",
                                )
                              )
                                db.deleteProductFlow(f.id);
                            }}
                            className="absolute top-2 right-2 text-red-500 text-sm font-bold hover:underline"
                          >
                            Revogar
                          </button>
                          <span className="font-bold text-indigo-900">
                            {item?.code} - {item?.name}
                          </span>
                          <span className="text-sm text-indigo-700 font-mono bg-indigo-100 p-2 rounded">
                            {sectors}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {cadastroTab === "PLANOS_CORTE" && <PlanosCorteTab db={db} />}
              {cadastroTab === "COMPOSICAO" && <ComposicaoProdutosTab db={db} />}
            </ScrollContainer>
          </div>
        )}

        {subScreen === "LOTES" && (
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollContainer
              paddingSize="normal"
              className="bg-white rounded shadow-sm border"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Package size={18} /> Lotes Detalhados
                  </h3>
                  <button
                    onClick={() => setShowNewBatchModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded flex items-center gap-1 font-bold text-xs"
                  >
                    <Plus size={14} /> Novo Lote Manual
                  </button>
                </div>
                <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                  Clique no card para abrir e editar
                </span>
              </div>

              {/* Filtros Avançados de Busca e Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-xs">
                <div className="relative md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Buscar lote, pedido ou produto..."
                    value={lotesSearchTerm}
                    onChange={(e) => setLotesSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-xs"
                  />
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 overflow-hidden h-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1.5 whitespace-nowrap">De</span>
                  <input
                    type="date"
                    value={lotesDateStart}
                    onChange={(e) => setLotesDateStart(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-semibold outline-none cursor-pointer w-full"
                  />
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 overflow-hidden h-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1.5 whitespace-nowrap">Até</span>
                  <input
                    type="date"
                    value={lotesDateEnd}
                    onChange={(e) => setLotesDateEnd(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-semibold outline-none cursor-pointer w-full"
                  />
                </div>
              </div>

              {db.productionBatches.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-gray-500 text-sm">
                    Nenhum lote criado ainda.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Utilize as ferramentas de planejamento acima para gerar
                    lotes sugeridos!
                  </p>
                </div>
              ) : processedBatches.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-gray-500 text-sm">
                    Nenhum lote corresponde aos filtros aplicados.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tente ajustar sua busca ou limpar as datas para visualizar os lotes.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleLotes.map((b) => {
                      const sector =
                        b.sectorId === 0
                          ? null
                          : db.sectors.find((s) => s.id === b.sectorId);
                      const batchOrders = b.orderIds
                        .map((oid) => db.orders.find((o) => o.id === oid))
                        .filter((o) => o !== undefined);
                      const totalQuantity = batchOrders.reduce(
                        (sum, o) => sum + (o?.totalQuantity || 0),
                        0,
                      );
                      const capacity = sector?.dailyCapacity || 1000;
                      const pct = Math.min((totalQuantity / capacity) * 100, 100);
                      const isOverloaded = totalQuantity > capacity;

                      const statusColors = {
                        PENDENTE:
                          "bg-amber-100 text-amber-850 border border-amber-200",
                        EM_PRODUCAO:
                          "bg-blue-100 text-blue-850 border border-blue-200",
                        CONCLUIDO:
                          "bg-emerald-100 text-emerald-850 border border-emerald-200",
                      };

                      return (
                        <div
                          key={b.id}
                          onClick={() => handleOpenBatchDetails(b)}
                          className={`border-2 p-4 rounded-xl shadow-xs flex flex-col gap-3 cursor-pointer transition-all duration-150 hover:scale-[1.005] hover:shadow-md hover:border-indigo-300 ${isOverloaded ? "bg-red-50/50 border-red-200 hover:bg-red-50" : "bg-white border-slate-100"}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-lg text-indigo-950 flex items-center gap-1.5">
                                {b.name}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Criado em:{" "}
                                {new Date(b.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide shrink-0 ${statusColors[b.status as keyof typeof statusColors] || "bg-indigo-100 text-indigo-850"}`}
                            >
                              {b.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-100 py-2.5 my-1">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                Setor Responsável
                              </span>
                              <strong className="text-slate-800 text-sm">
                                {b.isGerenciaLote || b.sectorId === 999 ? "⚡ Corte a Laser & Produção (Gerência)" : (sector ? sector.name : "📦 Geral / Sem Setor")}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                                Carga do Lote
                              </span>
                              <strong className="text-slate-800 text-sm">
                                {b.orderIds.length} Pedidos ({totalQuantity} pçs)
                              </strong>
                            </div>
                          </div>

                          <div className="mt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Pedidos de Produção
                            </p>
                            <ul className="text-xs text-gray-600 flex flex-col gap-1 max-h-36 overflow-y-auto">
                              {batchOrders.map((o) => (
                                <li
                                  key={o?.id}
                                  className={`flex flex-col sm:flex-row sm:justify-between p-2 rounded-lg border shadow-xs gap-1.5 ${o?.isUrgent ? "bg-red-50/80 border-red-200" : "bg-white border-slate-200/60"}`}
                                >
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`font-mono font-bold ${o?.isUrgent ? "text-red-750" : "text-slate-900"}`}
                                    >
                                      {o?.orderCode}
                                    </span>
                                    {o?.isUrgent && (
                                      <span
                                        className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-sm font-bold uppercase"
                                        title="Pedido Urgente"
                                      >
                                        Urg
                                      </span>
                                    )}
                                    {o?.isProgramacao && (
                                      <span
                                        className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm font-bold uppercase"
                                        title="Pedido é Programação"
                                      >
                                        Prog
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      (
                                      {
                                        db.items.find((i) => i.id === o?.itemId)
                                          ?.code
                                      }
                                      )
                                    </span>
                                  </div>
                                  <span className="text-slate-500 font-semibold text-[10px] hidden sm:inline">
                                    •
                                  </span>
                                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                                    <span className="text-slate-500 font-semibold bg-slate-100/80 px-1.5 py-0.5 rounded text-[10px]">
                                      📅 Prazo: {o?.deliveryDate}
                                    </span>
                                    <span
                                      className={`font-bold ${o?.isUrgent ? "text-red-900 text-sm" : "text-slate-800"}`}
                                    >
                                      {o?.totalQuantity} pçs
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-1">
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span
                                className={
                                  isOverloaded
                                    ? "text-red-700"
                                    : "text-slate-500 uppercase tracking-wide text-[10.5px]"
                                }
                              >
                                Capacidade Diária{" "}
                                {isOverloaded && "⚠️ (Sobrecarga)"}
                              </span>
                              <span
                                className={
                                  isOverloaded
                                    ? "text-red-700 font-black"
                                    : "text-indigo-950 font-bold"
                                }
                              >
                                {totalQuantity} / {capacity} pçs ({pct.toFixed(0)}
                                %)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <div
                                className={`h-full ${isOverloaded ? "bg-red-500" : "bg-indigo-600"}`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {processedBatches.length > lotesVisibleCount && (
                    <div className="flex justify-center mt-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setLotesVisibleCount((prev) => prev + 10)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        Carregar Mais Lotes ({processedBatches.length - lotesVisibleCount} restantes)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </ScrollContainer>
          </div>
        )}

        {/* --- CADASTRAR NOVO LOTE MANUAL --- */}
        {showNewBatchModal && (
          <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-150 max-w-xl w-full flex flex-col max-h-[92vh] overflow-hidden text-left animate-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50 rounded-t-xl">
                <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-1.5">
                  <PlusCircle size={18} /> Criar Novo Lote Manual
                </h3>
                <button
                  onClick={() => setShowNewBatchModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">
                    A. Nome do Lote
                  </label>
                  <input
                    type="text"
                    value={newBatchName}
                    onChange={(e) => {
                      setNewBatchName(e.target.value);
                      setManuallyEditedBatchName(true);
                    }}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-sm"
                    placeholder="Ex: LOTE URGENTE - CADEIRAS"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">
                    B. Setor Inicial
                  </label>
                  {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia") ? (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-950">
                      🚀 <strong>Corte a Laser & Produção Geral</strong> (Não separado por setor - Lote Gerência)
                    </div>
                  ) : (
                    <select
                      value={newBatchSectorId}
                      onChange={(e) =>
                        setNewBatchSectorId(Number(e.target.value))
                      }
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white"
                    >
                      <option value={0}>📦 Geral / Sem Setor Específico</option>
                      {db.sectors.map((s) => (
                        <option key={s.id} value={s.id}>
                          ⚙️ {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia") && (
                  <div className="flex flex-col gap-2 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-tight flex items-center gap-1">
                      👥 Encaminhar Lote p/ Operadores (Gerência)
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Os operadores marcados abaixo terão acesso para checagem e liberação deste lote em formato de lista:
                    </span>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignedOperatorIds.includes("dinei")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedOperatorIds([...assignedOperatorIds, "dinei"]);
                            } else {
                              setAssignedOperatorIds(assignedOperatorIds.filter(id => id !== "dinei"));
                            }
                          }}
                          className="rounded border-slate-350 text-indigo-650"
                        />
                        <span>Encarregado Dinei</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignedOperatorIds.includes("projetista_marcos")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedOperatorIds([...assignedOperatorIds, "projetista_marcos"]);
                            } else {
                              setAssignedOperatorIds(assignedOperatorIds.filter(id => id !== "projetista_marcos"));
                            }
                          }}
                          className="rounded border-slate-350 text-indigo-650"
                        />
                        <span>Marcos Projetista</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignedOperatorIds.includes("pcp")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedOperatorIds([...assignedOperatorIds, "pcp"]);
                            } else {
                              setAssignedOperatorIds(assignedOperatorIds.filter(id => id !== "pcp"));
                            }
                          }}
                          className="rounded border-slate-350 text-indigo-650"
                        />
                        <span>PCP</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="border border-indigo-100 p-3 bg-indigo-50/20 rounded-xl flex flex-col gap-2.5">
                  <label className="text-xs font-bold text-indigo-950 uppercase">
                    C. Itens a Produzir
                  </label>

                  {/* 1. Add from existing Orders */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">
                      Buscar pedido existente:
                    </span>
                    
                    <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2">
                      <input
                        type="text"
                        value={newBatchAvailableSearch}
                        onChange={(e) => setNewBatchAvailableSearch(e.target.value)}
                        placeholder="Filtrar pedidos cadastrados..."
                        className="w-full bg-white border border-slate-200 p-2 rounded text-[11px] text-slate-700 outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      
                      <div className="flex flex-col sm:flex-row gap-2 mt-1">
                        <select 
                          value={newBatchDeliveryFilter}
                          onChange={(e: any) => setNewBatchDeliveryFilter(e.target.value)}
                          className="bg-white border border-slate-200 p-1.5 rounded text-[10px] text-slate-700 font-medium flex-1 outline-none"
                        >
                          <option value="TODOS">Qualquer prazo de entrega</option>
                          <option value="ESSA_SEMANA">Entrega essa semana</option>
                          <option value="PROXIMA_SEMANA">Entrega próxima semana</option>
                          <option value="ATRASADO">Atrasados</option>
                        </select>
                        
                        <label className="flex items-center gap-1.5 flex-1 bg-white overflow-hidden border border-slate-200 p-1.5 px-2 rounded cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={newBatchExcludeInProduction}
                            onChange={(e) => setNewBatchExcludeInProduction(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 group-hover:ring-1 cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-600 font-semibold truncate leading-none">
                            Ocultar em lote / prod / faturado
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded mt-1 scrollbar-thin">
                      {db.orders
                        .filter((o) => o.isActive)
                        .filter((o) => {
                          if (newBatchExcludeInProduction) {
                            const wipStatuses = [
                              "EM_PRODUCAO",
                              "PRODUZIDO",
                              "EM_CORTE",
                              "CORTADO",
                              "EM_PINTURA",
                              "PINTADO",
                              "EMBALANDO",
                              "EMBALADO",
                              "TEM_ESTOQUE",
                              "FATURADO",
                            ];
                            if (wipStatuses.includes(o.status || "PENDENTE")) {
                              return false;
                            }
                            
                            // Check if already in a batch natively for exclusions (using optimized Set)
                            const isOrderLinked = batchLinkedSets.orderIds.has(o.id);
                            if (isOrderLinked) return false;
                          }

                          if (newBatchDeliveryFilter !== "TODOS") {
                            if (!o.deliveryDate) return false;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const endOfThisWeek = new Date(today);
                            const daysUntilSat = 6 - today.getDay();
                            endOfThisWeek.setDate(
                              today.getDate() + (daysUntilSat >= 0 ? daysUntilSat : 6)
                            );
                            endOfThisWeek.setHours(23, 59, 59, 999);

                            const endOfNextWeek = new Date(endOfThisWeek);
                            endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);

                            const parts = o.deliveryDate.split("-");
                            if (parts.length !== 3) return false;
                            const dDate = new Date(
                              parseInt(parts[0]),
                              parseInt(parts[1]) - 1,
                              parseInt(parts[2])
                            );
                            dDate.setHours(12, 0, 0, 0);

                            if (newBatchDeliveryFilter === "ATRASADO" && dDate >= today) return false;
                            if (newBatchDeliveryFilter === "ESSA_SEMANA" && (dDate < today || dDate > endOfThisWeek)) return false;
                            if (newBatchDeliveryFilter === "PROXIMA_SEMANA" && (dDate <= endOfThisWeek || dDate > endOfNextWeek)) return false;
                          }

                          return true;
                        })
                        .filter((o) => {
                          const q = newBatchAvailableSearch.toLowerCase();
                          if (!q) return true;
                          const productName = db.items.find((i) => i.id === o.itemId)?.name || "";
                          return (
                            o.orderCode.toLowerCase().includes(q) ||
                            o.customerName.toLowerCase().includes(q) ||
                            productName.toLowerCase().includes(q)
                          );
                        })
                        .sort((a, b) => {
                          const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Infinity;
                          const dbDate = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Infinity;
                          return da - dbDate;
                        })
                        .slice(0, newBatchAvailableSearch ? undefined : 40)
                        .map((o) => {
                          const productName =
                            db.items.find((i) => i.id === o.itemId)?.name ||
                            "Produto Desconhecido";
                          const isOrderLinked = batchLinkedSets.orderIds.has(o.id);
                          const isItemLinked = batchLinkedSets.itemIds.has(o.itemId);
                          const availableQty = Math.max(0, o.totalQuantity - (o.producedQuantity || 0));

                          return (
                            <div
                              key={o.id}
                              className={`p-2 border-b flex justify-between items-center bg-white ${
                                isOrderLinked ? "opacity-70 bg-slate-50 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"
                              }`}
                              onClick={() => {
                                if (isOrderLinked) {
                                  alert("Este pedido já está vinculado a um lote.");
                                  return;
                                }
                                setNewBatchSelectedOrderIds((prev) => {
                                  if (prev.includes(o.id)) return prev;
                                  setCustomNewBatchQuantities((prevQuantities) => ({
                                    ...prevQuantities,
                                    [o.id]: availableQty,
                                  }));
                                  return [...prev, o.id];
                                });
                              }}
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-bold text-slate-800">
                                    #{o.orderCode} - {o.customerName}
                                  </span>
                                  {isOrderLinked && (
                                    <span className="text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.2 rounded">
                                      📦 LOTEADO
                                    </span>
                                  )}
                                  {o.status === "FATURADO" && !isOrderLinked && (
                                    <span className="text-[8px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded">
                                      FATURADO
                                    </span>
                                  )}
                                  {o.status && o.status !== "PENDENTE" && o.status !== "FATURADO" && !isOrderLinked && (
                                    <span className="text-[8px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200 px-1 py-0.2 rounded">
                                      {o.status.replace(/_/g, " ")}
                                    </span>
                                  )}
                                  {!isOrderLinked && isItemLinked && (
                                    <span className="text-[8px] font-extrabold uppercase bg-sky-100 text-sky-800 border border-sky-200 px-1 py-0.2 rounded">
                                      ⚙️ ITEM EM LOTE
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {productName} (
                                  {isItemLinked || isOrderLinked ? (
                                    <span className="text-amber-700 font-bold">
                                      Disp. p/ Produzir: {availableQty} pçs
                                    </span>
                                  ) : (
                                    `${o.totalQuantity} pçs`
                                  )}
                                  )
                                </span>
                              </div>
                              {!newBatchSelectedOrderIds.includes(o.id) ? (
                                <span className={`font-bold px-2 py-0.5 border rounded text-[10px] ${
                                  isOrderLinked
                                    ? "text-slate-400 bg-slate-100 border-slate-200"
                                    : "text-indigo-600 bg-indigo-50 border-indigo-100/50 hover:bg-indigo-100"
                                }`}>
                                  {isOrderLinked ? "Loteado" : "Add"}
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-100/50 rounded text-[10px]">
                                  ✓ Incluído
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <hr className="my-2" />

                  {/* 2. Add totally manual product */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-500">
                      Ou lançar produto manualmente (Estoque Interno):
                    </span>
                    <div className="flex flex-col gap-1.5 border border-slate-100 p-2.5 rounded-lg bg-slate-50/50">
                      <div className="relative flex gap-2">
                        <input
                          type="text"
                          value={manualProductSearch}
                          onChange={(e) =>
                            setManualProductSearch(e.target.value)
                          }
                          placeholder="Buscar Produto..."
                          className="flex-1 bg-white border border-slate-200 p-2 rounded text-xs font-bold text-slate-800"
                        />

                        <input
                          type="number"
                          value={manualProductQty}
                          onChange={(e) =>
                            setManualProductQty(Number(e.target.value))
                          }
                          placeholder="Qtd."
                          className="w-20 bg-white border border-slate-200 p-2 rounded text-xs"
                        />

                        <button
                          onClick={handleCreateManualOrder}
                          disabled={!manualProductId || manualProductQty <= 0}
                          className="bg-indigo-600 text-white font-bold p-2 text-xs rounded disabled:opacity-50 cursor-pointer hover:bg-indigo-700 transition"
                        >
                          Incluir
                        </button>

                        {!manualProductId &&
                          manualProductSearch.trim().length > 0 && (
                            <div className="absolute left-0 right-0 z-50 mt-9 flex flex-col gap-1 border border-slate-200 rounded-lg p-1 bg-white shadow-lg max-h-48 overflow-y-auto font-sans">
                              <div className="p-1.5 px-2 border-b bg-indigo-50/60 rounded-t border-indigo-150 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-tight">
                                  ✨ Produto não cadastrado?
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const code = `MAN-${Math.floor(Math.random() * 89999 + 10050)}`;
                                    const name = manualProductSearch.trim();
                                    await db.addItem({
                                      code,
                                      name,
                                      notes: "Item cadastrado automaticamente via lote de gerência",
                                      type: "PRODUTO"
                                    });
                                    setManualProductSearch(`${code} - ${name}`);
                                    if (manualProductQty <= 0) {
                                      setManualProductQty(1);
                                    }
                                  }}
                                  className="text-[10px] text-left font-bold text-indigo-700 hover:underline flex justify-between items-center bg-white p-1.5 rounded border border-indigo-200 cursor-pointer"
                                >
                                  <span>Criar e usar "{manualProductSearch.trim()}"</span>
                                  <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded text-[9px] uppercase font-black">Criar</span>
                                </button>
                              </div>

                              <span className="text-[10px] font-bold text-slate-400 px-2 pt-1 uppercase tracking-wider block bg-slate-50 py-0.5 border-b">
                                Ou selecione abaixo:
                              </span>
                              {suggestedManualProducts.length === 0 ? (
                                <span className="text-[10px] text-gray-500 px-2 py-1">
                                  Nenhum produto correspondente.
                                </span>
                              ) : (
                                suggestedManualProducts.map((i) => (
                                  <button
                                    type="button"
                                    key={i.id}
                                    onClick={() =>
                                      setManualProductSearch(
                                        `${i.code} - ${i.name}`,
                                      )
                                    }
                                    className="text-left text-[11px] px-2 py-1.5 rounded hover:bg-indigo-500 hover:text-white transition-colors bg-white border border-slate-200 font-medium text-slate-700 flex items-center justify-between"
                                  >
                                    <span>{i.name}</span>
                                    <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                                      {i.code}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                      </div>

                      {/* Cor / Acabamento and deliveryDate fields */}
                      <div className="grid grid-cols-2 gap-2.5 mt-1 border-t border-slate-100 pt-2">
                        <div className="flex flex-col gap-0.5 text-left">
                          <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider pl-0.5">
                            Cor / Acabamento
                          </label>
                          <input
                            type="text"
                            value={manualProductColor}
                            onChange={(e) => setManualProductColor(e.target.value)}
                            placeholder="Ex: Zincado, Preto..."
                            className="bg-white border border-slate-200 p-1.5 text-xs font-bold text-slate-700 rounded focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-0.5 text-left">
                          <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider pl-0.5">
                            Data Prev. Entrega
                          </label>
                          <input
                            type="text"
                            value={manualProductDeliveryDate}
                            onChange={(e) => setManualProductDeliveryDate(e.target.value)}
                            placeholder="Ex: 10/06/2026..."
                            className="bg-white border border-slate-200 p-1.5 text-xs font-bold text-slate-700 rounded focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {manualProductId && (
                        <div className="text-xs text-emerald-850 font-bold py-1 bg-emerald-50 px-2 rounded border border-emerald-250 flex items-center justify-between">
                          <span>
                            ✓{" "}
                            {
                              db.items.find((i) => i.id === manualProductId)
                                ?.name
                            }
                          </span>
                          <button
                            type="button"
                            onClick={() => setManualProductSearch("")}
                            className="text-red-500 hover:text-red-700 hover:underline font-extrabold text-[10px] uppercase border border-red-200/50 px-1.5 py-0.5 rounded bg-red-50"
                          >
                            Alterar
                          </button>
                        </div>
                      )}

                      {manualProductId && (
                        <div className="mt-2.5 p-2.5 bg-indigo-50/40 rounded-lg border border-indigo-100">
                          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                            📋 Demandas de Pedidos deste Produto no Sistema:
                          </span>
                          {matchingOrdersForManualProduct.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">
                              Nenhum pedido de venda pendente para este produto
                              no sistema.
                            </p>
                          ) : (
                            <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                              {matchingOrdersForManualProduct.map((o) => {
                                const isOrderLinked = batchLinkedSets.orderIds.has(o.id);
                                const isItemLinked = batchLinkedSets.itemIds.has(o.itemId);
                                const availableQty = Math.max(0, o.totalQuantity - (o.producedQuantity || 0));

                                return (
                                  <div
                                    key={o.id}
                                    className={`p-1.5 bg-white border border-slate-150 rounded text-[11px] text-slate-700 flex justify-between items-center shadow-2xs ${
                                      isOrderLinked ? "opacity-75 bg-slate-50" : ""
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                        Pedido #{o.orderCode} - {o.customerName}
                                        {isOrderLinked && (
                                          <span className="text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800 px-1 py-0.2 rounded border border-amber-200">
                                            LOTEADO
                                          </span>
                                        )}
                                        {!isOrderLinked && isItemLinked && (
                                          <span className="text-[8px] font-extrabold uppercase bg-sky-100 text-sky-800 px-1 py-0.2 rounded border border-sky-200">
                                            ITEM EM LOTE
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-medium">
                                        Prazo: {o.deliveryDate} | Var:{" "}
                                        {o.color || "-"} | {o.size || "-"} |{" "}
                                        {o.variation || "-"}
                                      </span>
                                    </div>
                                    <div className="text-right flex items-center gap-2 shrink-0">
                                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded text-[10px]">
                                        {isItemLinked || isOrderLinked ? `Disp: ${availableQty} pç` : `${o.totalQuantity} pçs`}
                                      </span>
                                      {isOrderLinked ? (
                                        <span className="text-[9px] text-slate-505 font-bold bg-slate-100 border border-slate-205 px-1.5 py-0.5 rounded">
                                          Loteado
                                        </span>
                                      ) : !newBatchSelectedOrderIds.includes(o.id) ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setNewBatchSelectedOrderIds([
                                              ...newBatchSelectedOrderIds,
                                              o.id,
                                            ]);
                                            setCustomNewBatchQuantities((prev) => ({
                                              ...prev,
                                              [o.id]: availableQty,
                                            }));
                                          }}
                                          className="text-[9px] font-bold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer transition active:scale-95"
                                        >
                                          + Lote
                                        </button>
                                      ) : (
                                        <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                          Adicionado
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border p-3 rounded-lg">
                  <span className="font-bold text-xs uppercase text-slate-600">
                    Pedidos no Novo Lote ({newBatchSelectedOrderIds.length})
                  </span>
                  <ul className="mt-2 text-xs space-y-1 max-h-32 overflow-y-auto pr-1">
                    {newBatchSelectedOrderIds.map((oid) => {
                      const o = db.orders.find((x: any) => x.id === oid);
                      if (!o) return null;
                      const productName =
                        db.items.find((i) => i.id === o.itemId)?.name ||
                        "Desconhecido";
                      const availableQty = Math.max(0, o.totalQuantity - (o.producedQuantity || 0));
                      return (
                        <li
                          key={o.id}
                          className="flex justify-between items-center text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 gap-2"
                        >
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-bold text-[11px] truncate">
                              #{o.orderCode} - {o.customerName}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate">
                              {productName}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              Entrega: {o.deliveryDate || "-"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia") ? (
                              <div className="flex items-center gap-1 bg-indigo-50/50 p-1 rounded-md border border-indigo-100">
                                <span className="text-[9px] font-extrabold text-indigo-700 uppercase px-0.5">Qtd:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={customNewBatchQuantities[o.id] !== undefined ? customNewBatchQuantities[o.id] : availableQty}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value));
                                    setCustomNewBatchQuantities((prev) => ({
                                      ...prev,
                                      [o.id]: val,
                                    }));
                                  }}
                                  className="w-16 bg-white border border-slate-200 p-1 text-center font-bold text-[11px] rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                <span className="text-[9px] text-slate-400 font-bold pr-1">un</span>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {customNewBatchQuantities[o.id] !== undefined ? customNewBatchQuantities[o.id] : availableQty} pçs
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setNewBatchSelectedOrderIds(
                                  newBatchSelectedOrderIds.filter(
                                    (id) => id !== o.id,
                                  ),
                                );
                                setCustomNewBatchQuantities((prev) => {
                                  const copy = { ...prev };
                                  delete copy[o.id];
                                  return copy;
                                });
                              }}
                              className="text-red-500 hover:text-white hover:bg-red-500 border border-red-200 p-1.5 rounded transition font-bold"
                              title="Remover do Lote"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-slate-50">
                <button
                  onClick={() => setShowNewBatchModal(false)}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewBatch}
                  disabled={
                    !newBatchName || newBatchSelectedOrderIds.length === 0
                  }
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-indigo-600 disabled:opacity-50 text-white hover:bg-indigo-700 flex flex-center gap-2"
                >
                  Salvar Lote
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- EXTRA AJUSTE DE LOTE MANUAL POPUP (MODAL DIALOG) --- */}
        {selectedBatch && (
          <div
            id="batch-adjust-modal"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedBatch(null);
              }
            }}
            className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden text-left animate-in zoom-in-95 duration-150 font-sans">
              {/* Modal Header */}
              <div
                className={`p-5 border-b border-gray-100 flex justify-between items-center ${isEditingBatch ? "bg-amber-50/40" : "bg-indigo-50/40"} rounded-t-2xl`}
              >
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-600 bg-indigo-100/60 px-2.5 py-1 rounded-md font-bold">
                    {isEditingBatch ? "Modo de Edição" : "Detalhes do Lote"}
                  </span>
                  <h3 className="font-extrabold text-indigo-950 text-lg mt-1 flex items-center gap-1.5 font-sans">
                    {isEditingBatch
                      ? "✏️ Editar Parâmetros do Lote"
                      : "📦 Visualizar Lote de Produção"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    ID do Registro: {selectedBatch.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xl w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
                  title="Fechar (ESC)"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex flex-col gap-6">
                {!isEditingBatch ? (
                  /* ==================== VIEW MODE ==================== */
                  <div className="flex flex-col gap-5">
                    {/* General Info Grid */}
                    <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          Nome do Lote
                        </span>
                        <strong className="text-slate-900 text-base">
                          {selectedBatch.name}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          Status Atual
                        </span>
                        <div className="mt-1">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-extrabold uppercase tracking-wide border ${
                              selectedBatch.status === "PENDENTE"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : selectedBatch.status === "EM_PRODUCAO"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {selectedBatch.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          Setor Responsável
                        </span>
                        <strong className="text-slate-800 text-sm font-semibold">
                          {db.sectors.find(
                            (s) => s.id === selectedBatch.sectorId,
                          )?.name || "📦 Geral / Sem Setor"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          Responsável / Operador
                        </span>
                        <strong className="text-slate-800 text-sm font-semibold">
                          {db.users.find(
                            (u) => u.id === selectedBatch.operatorId,
                          )?.name || "⚠️ Não atribuído"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          Peça Gerada
                        </span>
                        <strong className="text-slate-800 text-sm font-semibold">
                          {selectedBatch.generatedPiece || "Não especificada"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          Prazo Estipulado
                        </span>
                        <strong className="text-slate-850 text-sm font-semibold">
                          {selectedBatch.deadline || "Sem prazo definido"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">
                          Data de Criação
                        </span>
                        <strong className="text-slate-750 text-xs font-mono">
                          {new Date(selectedBatch.createdAt).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="bg-amber-50/20 border border-amber-100 p-4 rounded-xl">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-1">
                        Observações do Lote
                      </span>
                      <p className="text-slate-705 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedBatch.notes ||
                          "Sem observações adicionais gravadas."}
                      </p>
                    </div>

                    {/* Quantidades Consolidadas */}
                    {(() => {
                      const batchOrders = selectedBatch.orderIds
                        .map((oid: any) => db.orders.find((o) => o.id === oid))
                        .filter((o: any) => o !== undefined);
                      const totalPlanned = batchOrders.reduce(
                        (sum: number, o: any) => sum + (o?.totalQuantity || 0),
                        0,
                      );
                      const totalProduced = batchOrders.reduce(
                        (sum: number, o: any) =>
                          sum + (o?.producedQuantity || 0),
                        0,
                      );
                      const pct =
                        totalPlanned > 0
                          ? (totalProduced / totalPlanned) * 100
                          : 0;
                      return (
                        <div className="bg-indigo-50/30 p-4.5 rounded-xl border border-indigo-100/50">
                          <div className="flex justify-between items-center text-xs font-bold mb-2">
                            <span className="text-indigo-950 uppercase tracking-wide text-[10.5px]">
                              Progresso de Produção Física
                            </span>
                            <span className="text-indigo-950 font-black text-sm">
                              {totalProduced} / {totalPlanned} pçs (
                              {pct.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-3 w-full bg-indigo-200/30 rounded-full overflow-hidden border border-indigo-200/50">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-305"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* List of Orders in View Mode */}
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-2">
                        Pedidos Vinculados ao Lote (
                        {selectedBatch.orderIds.length})
                      </span>
                      <div className="border border-slate-150 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-xs">
                        {selectedBatch.orderIds.length === 0 ? (
                          <p className="text-center py-6 text-xs text-slate-400 italic font-medium">
                            Nenhum pedido vinculado a este lote.
                          </p>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {selectedBatch.orderIds.map(
                              (oid: any, idx: number) => {
                                const ord = db.orders.find((o) => o.id === oid);
                                if (!ord) return null;
                                const itemObj = db.items.find(
                                  (i) => i.id === ord?.itemId,
                                );
                                return (
                                  <li
                                    key={oid}
                                    className="p-3 hover:bg-slate-50 transition-colors flex justify-between items-center text-xs"
                                  >
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-slate-900 font-mono text-[13px]">
                                        <span className="text-indigo-650 font-extrabold mr-2">
                                          #{idx + 1}
                                        </span>
                                        Pedido #{ord.orderCode}
                                      </span>
                                      <span className="text-slate-500 font-medium text-[11px]">
                                        {ord.customerName} |{" "}
                                        {itemObj?.name ||
                                          "Peça não identificada"}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <strong className="text-slate-800 text-sm">
                                        {ord.totalQuantity} pçs
                                      </strong>
                                      <span className="text-[10px] text-slate-400 font-medium font-mono">
                                        Entrega: {ord.deliveryDate || "-"}
                                      </span>
                                    </div>
                                  </li>
                                );
                              },
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ==================== EDIT MODE ==================== */
                  <div className="flex flex-col gap-5">
                    {/* Basic Metadata fields */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase">
                        Nome do Lote
                      </label>
                      <input
                        type="text"
                        value={editBatchName}
                        onChange={(e) => setEditBatchName(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 tracking-wide font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Ex: LOTE 1 CORTE LASER"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sector select */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Setor Destinatário
                        </label>
                        <select
                          value={editBatchSectorId}
                          onChange={(e) =>
                            setEditBatchSectorId(Number(e.target.value))
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value={0}>
                            📦 Geral / Sem Setor Específico
                          </option>
                          {db.sectors.map((s) => (
                            <option key={s.id} value={s.id}>
                              ⚙️ {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status select */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Status do Lote
                        </label>
                        <select
                          value={editBatchStatus}
                          onChange={(e) =>
                            setEditBatchStatus(e.target.value as any)
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="PENDENTE">⏳ PENDENTE</option>
                          <option value="EM_PRODUCAO">⚡ EM PRODUÇÃO</option>
                          <option value="CONCLUIDO">
                            ✅ CONCLUÍDO (Fechar Lote)
                          </option>
                        </select>
                      </div>

                      {/* Peça gerada */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Peça Gerada
                        </label>
                        <input
                          type="text"
                          value={editBatchGeneratedPiece}
                          onChange={(e) =>
                            setEditBatchGeneratedPiece(e.target.value)
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Ex: Suporte de Cantoneira Direta"
                        />
                      </div>

                      {/* Prazo */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Prazo do Lote
                        </label>
                        <input
                          type="text"
                          value={editBatchDeadline}
                          onChange={(e) => setEditBatchDeadline(e.target.value)}
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Ex: 15/06/2026 ou Imediato"
                        />
                      </div>

                      {/* Operator assignment select */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Operador Responsável
                        </label>
                        <select
                          value={editBatchOperatorId}
                          onChange={(e) =>
                            setEditBatchOperatorId(e.target.value)
                          }
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="">👤 Não Atribuído</option>
                          {db.users
                            .filter(
                              (u) =>
                                u.role !== "REPRESENTANTE" &&
                                u.role !== "LEITURA",
                            )
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                👤 {u.name} (perfil {u.role})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Notes Edit */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase">
                        Observações do Lote
                      </label>
                      <textarea
                        rows={3}
                        value={editBatchNotes}
                        onChange={(e) => setEditBatchNotes(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:ring-offset-0"
                        placeholder="Anote detalhes de setup, recomendações or restrições..."
                      />
                    </div>

                    {/* Pedidores Vinculados */}
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 uppercase">
                          Pedidos no Lote ({editBatchOrderIds.length})
                        </span>
                        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm">
                          {editBatchOrderIds.reduce(
                            (sum, oid) =>
                              sum +
                              (db.orders.find((o) => o.id === oid)
                                ?.totalQuantity || 0),
                            0,
                          )}{" "}
                          pçs no total
                        </span>
                      </div>

                      <div className="border border-slate-150 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white">
                        {editBatchOrderIds.length === 0 ? (
                          <p className="text-center py-6 text-xs text-slate-400 italic">
                            Nenhum pedido vinculado. Insira pedidos abaixo.
                          </p>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {editBatchOrderIds.map((oid, idx) => {
                              const ord = db.orders.find((o) => o.id === oid);
                              if (!ord) return null;
                              const itemObj = db.items.find(
                                (i) => i.id === ord?.itemId,
                              );

                              const handleMoveUp = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (idx === 0) return;
                                const nextIds = [...editBatchOrderIds];
                                const temp = nextIds[idx];
                                nextIds[idx] = nextIds[idx - 1];
                                nextIds[idx - 1] = temp;
                                setEditBatchOrderIds(nextIds);
                              };

                              const handleMoveDown = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (idx === editBatchOrderIds.length - 1)
                                  return;
                                const nextIds = [...editBatchOrderIds];
                                const temp = nextIds[idx];
                                nextIds[idx] = nextIds[idx + 1];
                                nextIds[idx + 1] = temp;
                                setEditBatchOrderIds(nextIds);
                              };

                              return (
                                <li
                                  key={oid}
                                  className="p-2.5 flex justify-between items-center text-xs hover:bg-slate-50 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {/* Sequencing buttons */}
                                    <div className="flex flex-col gap-0.5 mr-1 shrink-0">
                                      <button
                                        disabled={idx === 0}
                                        onClick={handleMoveUp}
                                        className={`w-5 h-5 flex items-center justify-center rounded border border-slate-205 bg-white text-[10px] font-bold ${idx === 0 ? "opacity-30 cursor-not-allowed text-slate-300" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-650 cursor-pointer"}`}
                                        title="Mover para cima (prioridade maior)"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        disabled={
                                          idx === editBatchOrderIds.length - 1
                                        }
                                        onClick={handleMoveDown}
                                        className={`w-5 h-5 flex items-center justify-center rounded border border-slate-205 bg-white text-[10px] font-bold ${idx === editBatchOrderIds.length - 1 ? "opacity-30 cursor-not-allowed text-slate-300" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-650 cursor-pointer"}`}
                                        title="Mover para baixo"
                                      >
                                        ▼
                                      </button>
                                    </div>

                                    <div className="flex flex-col gap-0.5 font-sans">
                                      <span className="font-bold text-slate-900">
                                        <span className="text-indigo-650 font-extrabold mr-1 font-sans">
                                          #{idx + 1}
                                        </span>
                                        Pedido #{ord.orderCode}
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        {ord.customerName} - {itemObj?.name}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.id === "gerencia") ? (
                                      <div className="flex items-center gap-1 bg-indigo-50/50 p-1 rounded-md border border-indigo-100">
                                        <span className="text-[9px] font-extrabold text-indigo-700 uppercase px-0.5">Qtd:</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={customEditBatchQuantities[oid] !== undefined ? customEditBatchQuantities[oid] : ord.totalQuantity}
                                          onChange={(e) => {
                                            const val = Math.max(1, Number(e.target.value));
                                            setCustomEditBatchQuantities((prev) => ({
                                              ...prev,
                                              [oid]: val,
                                            }));
                                          }}
                                          className="w-16 bg-white border border-slate-200 p-1 text-center font-bold text-[11px] rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                        />
                                        <span className="text-[9px] text-slate-400 font-bold pr-1">un</span>
                                      </div>
                                    ) : (
                                      <strong className="text-slate-800 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                        {customEditBatchQuantities[oid] !== undefined ? customEditBatchQuantities[oid] : ord.totalQuantity} pçs
                                      </strong>
                                    )}
                                    <button
                                      onClick={() => {
                                        setEditBatchOrderIds(
                                          editBatchOrderIds.filter(
                                            (id) => id !== oid,
                                          ),
                                        );
                                        setCustomEditBatchQuantities((prev) => {
                                          const copy = { ...prev };
                                          delete copy[oid];
                                          return copy;
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700 font-bold bg-red-100/50 hover:bg-red-205 p-1.5 rounded-md cursor-pointer transition-colors"
                                      title="Remover de Lote"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Adicionar novos pedidos sobressalentes */}
                    <div className="border border-indigo-100 p-3 bg-indigo-50/20 rounded-xl flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                          📦 Agregar Outros Pedidos Livres
                        </span>
                        <span className="text-[10px] text-blue-700 font-medium bg-blue-55 px-2 py-0.5 rounded">
                          Apenas sem lote
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 border border-indigo-100 rounded-lg p-2 bg-white">
                        <input
                          type="text"
                          value={addOrderSearch}
                          onChange={(e) => setAddOrderSearch(e.target.value)}
                          placeholder="Pesquisar código do pedido ou cliente para adicionar..."
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-[11px] text-slate-700 focus:ring-1 focus:ring-indigo-400 outline-none font-medium"
                        />
                        
                        <div className="flex flex-col sm:flex-row gap-2 mt-1">
                          <select 
                            value={addOrderDeliveryFilter}
                            onChange={(e: any) => setAddOrderDeliveryFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 p-1.5 rounded text-[10px] text-slate-700 font-medium flex-1 outline-none"
                          >
                            <option value="TODOS">Qualquer prazo de entrega</option>
                            <option value="ESSA_SEMANA">Entrega essa semana</option>
                            <option value="PROXIMA_SEMANA">Entrega próxima semana</option>
                            <option value="ATRASADO">Atrasados</option>
                          </select>
                          
                          <label className="flex items-center gap-1.5 flex-1 bg-slate-50 overflow-hidden border border-slate-200 p-1.5 px-2 rounded cursor-pointer group">
                            <input 
                              type="checkbox"
                              checked={addOrderExcludeInProduction}
                              onChange={(e) => setAddOrderExcludeInProduction(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 group-hover:ring-1 cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-600 font-semibold truncate leading-none">
                              Ocultar prod / faturado
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto border border-indigo-50 bg-white rounded-lg scrollbar-thin">
                        {filteredAvailableOrders.length === 0 ? (
                          <p className="text-center py-4 text-xs text-slate-400">
                            Nenhum pedido livre encontrado.
                          </p>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {filteredAvailableOrders.map((o) => {
                              const itemObj = db.items.find(
                                (i) => i.id === o?.itemId,
                              );
                              return (
                                <li
                                  key={o.id}
                                  className="p-2 flex justify-between items-center text-xs hover:bg-indigo-50/20"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <strong className="text-indigo-900 block font-mono font-bold">
                                        #{o.orderCode}
                                      </strong>
                                      {o.status === "FATURADO" && (
                                        <span className="text-[8px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded">
                                          FATURADO
                                        </span>
                                      )}
                                      {o.status && o.status !== "PENDENTE" && o.status !== "FATURADO" && (
                                        <span className="text-[8px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200 px-1 py-0.2 rounded">
                                          {o.status.replace(/_/g, " ")}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10.5px] text-slate-500 block font-medium">
                                      {o.customerName} | {itemObj?.name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setEditBatchOrderIds([
                                        ...editBatchOrderIds,
                                        o.id,
                                      ]);
                                      setCustomEditBatchQuantities((prev) => ({
                                        ...prev,
                                        [o.id]: o.totalQuantity,
                                      }));
                                      setAddOrderSearch("");
                                    }}
                                    className="bg-indigo-600 text-white font-bold text-[10.5px] px-2.5 py-1 rounded-md hover:bg-indigo-700 transition"
                                  >
                                    + Adicionar
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="p-5 border-t border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/70 rounded-b-2xl">
                <div>
                  {!isEditingBatch ? (
                    /* View Mode Actions (for PCP/Gerência) */
                    currentUser &&
                    (currentUser.role === "PCP" ||
                      currentUser.role === "GERENCIA" ||
                      currentUser.role === "ADMIN") && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Deseja realmente excluir este lote do sistema?",
                            )
                          ) {
                            handleDeleteBatch(selectedBatch.id);
                          }
                        }}
                        className="w-full sm:w-auto text-red-650 font-bold text-xs bg-red-100/50 border border-red-200/50 hover:bg-red-100 px-4 py-2.5 rounded-lg cursor-pointer flex justify-center items-center gap-1.5 transition"
                      >
                        🗑️ Excluir Lote
                      </button>
                    )
                  ) : (
                    /* Edit Mode action */
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Deseja realmente excluir este lote do sistema?",
                          )
                        ) {
                          handleDeleteBatch(selectedBatch.id);
                        }
                      }}
                      className="w-full sm:w-auto text-red-655 font-bold text-xs bg-red-100/40 border border-red-200/40 hover:bg-red-100 px-4 py-2.5 rounded-lg cursor-pointer flex justify-center items-center gap-1.5 transition"
                    >
                      🗑️ Excluir Lote
                    </button>
                  )}
                </div>

                <div className="flex gap-2.5 w-full sm:w-auto justify-end">
                  {!isEditingBatch ? (
                    <>
                      <button
                        onClick={() => setSelectedBatch(null)}
                        className="bg-white border border-slate-200 text-slate-650 text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-slate-50 transition"
                      >
                        Voltar
                      </button>
                      {/* Only show 'Editar Lote' to PCP & Gerência */}
                      {currentUser &&
                        (currentUser.role === "PCP" ||
                          currentUser.role === "GERENCIA" ||
                          currentUser.role === "ADMIN") && (
                          <button
                            onClick={() => setIsEditingBatch(true)}
                            className="bg-indigo-600 border border-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-lg hover:bg-indigo-700 hover:border-indigo-800 transition shadow-sm"
                          >
                            ✏️ Editar Lote
                          </button>
                        )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditingBatch(false)}
                        className="bg-white border border-slate-200 text-slate-650 text-xs font-bold px-5 py-2.5 rounded-lg hover:bg-slate-50 transition"
                      >
                        Voltar para Detalhes
                      </button>
                      <button
                        onClick={() => {
                          setEditBatchStatus("CONCLUIDO");
                          setTimeout(() => handleSaveBatchAdjustments(), 100);
                        }}
                        disabled={editBatchStatus === "CONCLUIDO"}
                        className="bg-emerald-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        ✅ Finalizar Lote
                      </button>
                      <button
                        onClick={handleSaveBatchAdjustments}
                        className="bg-indigo-600 border border-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-lg hover:bg-indigo-700 hover:border-indigo-800 transition shadow-sm"
                      >
                        Salvar Ajustes
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </ScrollContainer>
    </ScreenLayout>
  );
}
