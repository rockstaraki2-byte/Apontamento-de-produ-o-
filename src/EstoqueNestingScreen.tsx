import React, { useState } from "react";
import { useDatabase } from "./useDatabase";
import { Layers, Link } from "lucide-react";
import type { User, Order } from "./types";

export function EstoqueNestingScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "RECENT_CUT" | "OLD_CUT" | "NAME_ASC" | "NAME_DESC" | "QTY_DESC"
  >("RECENT_CUT");
  const [limitTo20, setLimitTo20] = useState(true);
  const [selectedPart, setSelectedPart] = useState<{
    partName: string;
    size: string;
    maxQty: number;
  } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | "">("");
  const [assignQty, setAssignQty] = useState("");

  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState<"ESTOQUE" | "FATURADOS">("ESTOQUE");

  const allNests = db.nestTasks || [];

  // Agrupar por peça e tamanho
  const inventory = allNests.reduce(
    (acc, t) => {
      // Apenas peças de tarefas que já foram totalmente cortadas e finalizadas pelo laser
      if (t.status !== "CORTADO") return acc;

      const key = `${t.partName}|${t.size}`;
      if (!acc[key]) {
        acc[key] = {
          partName: t.partName,
          size: t.size,
          totalQuantity: 0,
          cutQuantity: 0,
          assignedQuantity: 0,
          faturadoQuantity: 0,
          lastCompletedAt: 0,
        };
      }
      acc[key].totalQuantity += t.totalQuantity;
      acc[key].cutQuantity += t.cutQuantity;
      const tTime = t.completedAt || t.createdAt || 0;
      if (tTime > acc[key].lastCompletedAt) {
        acc[key].lastCompletedAt = tTime;
      }
      return acc;
    },
    {} as Record<
      string,
      {
        partName: string;
        size: string;
        totalQuantity: number;
        cutQuantity: number;
        assignedQuantity: number;
        faturadoQuantity: number;
        lastCompletedAt: number;
      }
    >,
  );

  // Consider already assigned and invoiced quantities
  if (db.orders) {
    db.orders.forEach((o) => {
      if (o.laserAssignments) {
        if (o.status === "FATURADO") {
          o.laserAssignments.forEach((la) => {
            const key = `${la.partName}|${la.size}`;
            if (inventory[key]) {
              inventory[key].faturadoQuantity += la.quantity;
            }
          });
        } else if (o.isActive !== false) {
          o.laserAssignments.forEach((la) => {
            const key = `${la.partName}|${la.size}`;
            if (inventory[key]) {
              inventory[key].assignedQuantity += la.quantity;
            }
          });
        }
      }
    });
  }

  const inventoryArray = Object.values(inventory) as {
    partName: string;
    size: string;
    totalQuantity: number;
    cutQuantity: number;
    assignedQuantity: number;
    faturadoQuantity: number;
    lastCompletedAt: number;
  }[];

  const activeInventory = inventoryArray.filter((i) => i.cutQuantity - i.faturadoQuantity > 0);
  const faturadoInventory = inventoryArray.filter((i) => i.faturadoQuantity > 0);
  
  const displayInventory = activeTab === "ESTOQUE" ? activeInventory : faturadoInventory;

  const filtered = displayInventory.filter((i) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      i.partName.toLowerCase().includes(term) ||
      i.size.toLowerCase().includes(term)
    );
  });

  const sortedFiltered = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "RECENT_CUT") {
        return (b.lastCompletedAt || 0) - (a.lastCompletedAt || 0);
      }
      if (sortBy === "OLD_CUT") {
        return (a.lastCompletedAt || 0) - (b.lastCompletedAt || 0);
      }
      if (sortBy === "NAME_ASC") {
        return a.partName.localeCompare(b.partName);
      }
      if (sortBy === "NAME_DESC") {
        return b.partName.localeCompare(a.partName);
      }
      if (sortBy === "QTY_DESC") {
        const qtyA = activeTab === "ESTOQUE" ? (a.cutQuantity - a.faturadoQuantity) : a.faturadoQuantity;
        const qtyB = activeTab === "ESTOQUE" ? (b.cutQuantity - b.faturadoQuantity) : b.faturadoQuantity;
        return qtyB - qtyA;
      }
      return 0;
    });
  }, [filtered, sortBy, activeTab]);

  const availableOrders = db.orders
    ? db.orders.filter((o) => o.isActive || o.status === "FATURADO")
    : [];

  const handleAssignOrder = () => {
    if (!selectedPart || selectedOrderId === "" || !assignQty) return;
    const qty = parseInt(assignQty, 10);
    if (isNaN(qty) || qty <= 0 || qty > selectedPart.maxQty) {
      alert("Quantidade inválida!");
      return;
    }

    const order = db.orders.find((o) => o.id === selectedOrderId);
    if (!order) return;

    const currentAssignments = order.laserAssignments || [];
    const newAssignments = [
      ...currentAssignments,
      {
        partName: selectedPart.partName,
        size: selectedPart.size,
        quantity: qty,
      },
    ];

    const isFaturado = order.status === "FATURADO";
    
    const updatedOrder = { ...order, laserAssignments: newAssignments };
    
    // Atualiza a quantidade cortada do item no pedido (status desse item como cortado)
    updatedOrder.cutQuantity = (updatedOrder.cutQuantity || 0) + qty;
    
    // Passa o pedido a estar em produção (caso ele não esteja finalizado/faturado já)
    if (!isFaturado) {
      updatedOrder.status = "EM_PRODUCAO";
    }

    db.updateOrders([updatedOrder]);
    setSelectedPart(null);
    setSelectedOrderId("");
    setAssignQty("");
    if (isFaturado) {
      alert(
        "Pedido atribuído com sucesso! Como o pedido já está faturado, a quantidade atribuída foi baixada imediatamente do estoque físico cortado de laser.",
      );
    } else {
      alert(
        "Pedido atribuído com sucesso! Será deduzido quando este pedido for faturado.",
      );
    }
  };

  const canAssign =
    currentUser.role === "ADMIN" ||
    currentUser.role === "PCP" ||
    currentUser.role === "GERENCIA" ||
    currentUser.role === "PROJETISTA" ||
    currentUser.id === "projetista_marcos";

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <Layers size={28} className="text-indigo-600" />
        Estoque (Nesting & Corte a Laser)
      </h2>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("ESTOQUE")}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === "ESTOQUE"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50"
              : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          }`}
        >
          Estoque Físico Disponível
        </button>
        <button
          onClick={() => setActiveTab("FATURADOS")}
          className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === "FATURADOS"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50"
              : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          }`}
        >
          Itens Cortados e Faturados
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-300 flex items-center gap-2.5 flex-1">
          <input
            type="text"
            placeholder="Pesquisar estoque de nesting..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full focus:outline-none text-sm bg-transparent text-gray-805"
          />
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-300 flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs font-bold text-gray-750 focus:outline-none cursor-pointer"
          >
            <option value="RECENT_CUT">Cortes Mais Recentes</option>
            <option value="OLD_CUT">Cortes Mais Antigos</option>
            <option value="NAME_ASC">Nome (A - Z)</option>
            <option value="NAME_DESC">Nome (Z - A)</option>
            <option value="QTY_DESC">Maior Quantidade</option>
          </select>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-300 flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-750 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={limitTo20}
              onChange={(e) => setLimitTo20(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span>Limitar a 20 itens</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {sortedFiltered.length === 0 ? (
          <p className="text-gray-500 text-center mt-6 text-sm italic">
            Nenhuma peça correspondente encontrada.
          </p>
        ) : (
          <div className="grid gap-3">
            <div className="text-[10px] text-gray-400 font-semibold px-1 uppercase tracking-wider">
              {limitTo20 ? "Exibindo 20 mais recentes" : `Exibindo ${sortedFiltered.length} itens`}:
            </div>
            {sortedFiltered.slice(0, limitTo20 ? 20 : undefined).map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-gray-800 text-lg">
                    {item.partName}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded w-fit">
                      {item.size || "S/ Tamanho"}
                    </span>
                    {item.lastCompletedAt > 0 && (
                      <span className="text-[10px] text-gray-400 font-medium font-sans">
                        Corte: {new Date(item.lastCompletedAt).toLocaleDateString("pt-BR")} {new Date(item.lastCompletedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col items-center border-r pr-4 border-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Total Solicitado
                    </span>
                    <span className="font-bold text-gray-600 text-lg">
                      {item.totalQuantity}
                    </span>
                  </div>
                  <div className="flex flex-col items-center border-r pr-4 border-gray-200">
                    <span className="text-[10px] uppercase font-bold text-indigo-500">
                      Estoque Cortado
                    </span>
                    <span className="font-bold text-indigo-600 text-lg">
                      {item.cutQuantity}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase font-bold ${activeTab === "ESTOQUE" ? "text-emerald-500" : "text-amber-500"}`}>
                      {activeTab === "ESTOQUE" ? "Físico Disponível" : "Qtd. Faturada P/ Cliente"}
                    </span>
                    <span className={`font-bold text-lg ${activeTab === "ESTOQUE" ? "text-emerald-600" : "text-amber-600"}`}>
                      {activeTab === "ESTOQUE" ? Math.max(0, item.cutQuantity - item.faturadoQuantity) : item.faturadoQuantity}
                    </span>
                  </div>
                  {canAssign &&
                    activeTab === "ESTOQUE" &&
                    item.cutQuantity - item.faturadoQuantity - item.assignedQuantity > 0 && (
                      <button
                        onClick={() =>
                          setSelectedPart({
                            partName: item.partName,
                            size: item.size,
                            maxQty: item.cutQuantity - item.faturadoQuantity - item.assignedQuantity,
                          })
                        }
                        className="ml-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded flex items-center gap-2 text-sm transition"
                      >
                        <Link size={16} /> Atribuir Pedido
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPart && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-4 shrink-0 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Link size={20} />
                Atribuir a Pedido
              </h3>
              <button
                onClick={() => setSelectedPart(null)}
                className="text-indigo-200 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-bold bg-indigo-50 text-indigo-900 p-3 rounded-md">
                <span>
                  {selectedPart.partName} ({selectedPart.size || "-"})
                </span>
                <span>Disp: {selectedPart.maxQty}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Pesquisar Pedido
                </label>
                <input
                  type="text"
                  placeholder="Pesquisar por pedido, cliente ou produto..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className="p-2 border border-gray-300 rounded focus:border-indigo-500 focus:outline-none w-full mb-2"
                />
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
                  {availableOrders
                    .filter(
                      (o) =>
                        !orderSearchTerm ||
                        o.orderCode
                          .toLowerCase()
                          .includes(orderSearchTerm.toLowerCase()) ||
                        o.customerName
                          .toLowerCase()
                          .includes(orderSearchTerm.toLowerCase()) ||
                        (
                          db.items.find((i: any) => i.id === o.itemId)?.name ||
                          ""
                        )
                          .toLowerCase()
                          .includes(orderSearchTerm.toLowerCase()),
                    )
                    .map((o) => {
                      const itemName =
                        db.items.find((i: any) => i.id === o.itemId)?.name ||
                        "Produto Desconhecido";
                      const isFaturado = o.status === "FATURADO";
                      return (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOrderId(o.id)}
                          className={`p-2 cursor-pointer border-b border-gray-100 text-sm hover:bg-indigo-50 transition border-l-4 ${selectedOrderId === o.id ? "bg-indigo-100 font-bold text-indigo-900 border-indigo-600" : "text-gray-700 border-transparent"}`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-bold flex items-center gap-1.5 flex-wrap">
                              {o.orderCode} - {o.customerName}
                              {isFaturado && (
                                <span className="text-[9px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded shrink-0">
                                  Faturado
                                </span>
                              )}
                            </span>
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                              {o.totalQuantity} unid.
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {itemName}
                          </div>
                        </div>
                      );
                    })}
                  {availableOrders.filter(
                    (o) =>
                      !orderSearchTerm ||
                      o.orderCode
                        .toLowerCase()
                        .includes(orderSearchTerm.toLowerCase()) ||
                      o.customerName
                        .toLowerCase()
                        .includes(orderSearchTerm.toLowerCase()) ||
                      (db.items.find((i: any) => i.id === o.itemId)?.name || "")
                        .toLowerCase()
                        .includes(orderSearchTerm.toLowerCase()),
                  ).length === 0 && (
                    <div className="p-3 text-sm text-gray-500 text-center italic">
                      Nenhum pedido encontrado.
                    </div>
                  )}
                </div>
              </div>

              {selectedOrderId !== "" && (() => {
                const o = db.orders.find((ord) => ord.id === selectedOrderId);
                if (!o) return null;
                const isFaturado = o.status === "FATURADO";
                return (
                  <div className="flex flex-col gap-1.5 rounded-lg p-2.5 bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-705">Pedido Selecionado:</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">
                        {o.orderCode}
                      </span>
                    </div>
                    {isFaturado && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs flex flex-col gap-1">
                        <span className="font-extrabold uppercase tracking-wide flex items-center gap-1 text-amber-805">
                          ⚠️ ATENÇÃO: PEDIDO JÁ FATURADO
                        </span>
                        <p className="font-medium text-[11px] leading-snug">
                          Este pedido já está faturado. A atribuição de peças reduzirá o estoque físico imediatamente ao salvar.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">
                  Quantidade a Reservar
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedPart.maxQty}
                  value={assignQty}
                  onChange={(e) => setAssignQty(e.target.value)}
                  placeholder={`Max: ${selectedPart.maxQty}`}
                  className="p-2 border border-gray-300 rounded focus:border-indigo-500 focus:outline-none w-full font-bold text-lg"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setSelectedPart(null)}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignOrder}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
