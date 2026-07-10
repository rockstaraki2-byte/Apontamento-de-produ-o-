import React, { useState } from "react";
import { ArrowLeft, Activity } from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, OrderStatus } from "./types";
import { calculateWorkingMillis } from "./timeUtils";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { normalizeString } from "./searchUtils";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";

const getProductKey = (
  itemId: number,
  color: string,
  size: string,
  variation: string,
) => `${itemId}|${color}|${size}|${variation}`;

export function PinturaScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [view, setView] = useState<
    "LIST_ACTIVE" | "NEW_PACK" | "FINISH_PACK" | "MANUAL_PRODUCTION"
  >("LIST_ACTIVE");
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [packQuantity, setPackQuantity] = useState<number | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  // Manual Production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProduct, setManualProduct] = useState("");
  const [selectedManualItemId, setSelectedManualItemId] = useState<number>(0);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  // Cart Selection
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [selectedGroupToPaint, setSelectedGroupToPaint] = useState<any>(null);
  const [selectedCart, setSelectedCart] = useState<string>("Carrinho 1");
  const [paintedColor, setPaintedColor] = useState<string>("");

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowItemSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activePacksList = db.activePacks.filter(
    (p) =>
      p.type === "PINTURA" &&
      (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" ? true : p.operatorId === currentUser.id),
  );

  const getAvailableForPainting = (o: (typeof db.orders)[0]) => o.totalQuantity;
  const pendingOrders = db.orders.filter((o) => {
    return (
      o.status !== "EMBALADO" &&
      o.status !== "FATURADO" &&
      (o.paintedQuantity || 0) < getAvailableForPainting(o)
    );
  });

  const productGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        itemId: number;
        color: string;
        size: string;
        variation: string;
        totalRemaining: number;
      }
    >();
    pendingOrders.forEach((o) => {
      const key = getProductKey(o.itemId, o.color, o.size, o.variation);
      if (!groups.has(key)) {
        groups.set(key, {
          itemId: o.itemId,
          color: o.color,
          size: o.size,
          variation: o.variation,
          totalRemaining: 0,
        });
      }
      groups.get(key)!.totalRemaining +=
        (getAvailableForPainting(o) || 0) - (o.paintedQuantity || 0);
    });
    return Array.from(groups.values());
  }, [pendingOrders]);

  const itemSuggestions = React.useMemo(() => {
    if (!manualProduct) return [];
    const normalized = normalizeString(manualProduct);
    if (normalized.length < 1) return [];
    return db.items
      .filter((i) => {
        const nameMatch = normalizeString(i.name || "").includes(normalized);
        const codeMatch = normalizeString(i.code || "").includes(normalized);
        return nameMatch || codeMatch;
      })
      .slice(0, 8);
  }, [db.items, manualProduct]);

  const startPaintingWithCart = (group: any, isManual: boolean) => {
    if (isManual) {
      if (!manualTitle || !manualProduct || !paintedColor) {
        alert("Preencha todos os campos e selecione a cor.");
        return;
      }

      const isSelectedRegisteredItem = selectedManualItemId > 0;
      const registeredItem = isSelectedRegisteredItem
        ? db.items.find((i) => i.id === selectedManualItemId)
        : null;

      db.addActivePack({
        id: Date.now(),
        itemId: registeredItem ? registeredItem.id : 0,
        color: registeredItem?.color || "-",
        size: registeredItem?.size || "-",
        variation: registeredItem?.variation || "-",
        operatorId: currentUser.id,
        startTime: Date.now(),
        type: "PINTURA",
        taskId: 0,
        thirdPartyName: manualTitle,
        customProductName: registeredItem ? registeredItem.name : manualProduct,
        processName: selectedCart,
        paintedColor: paintedColor,
      });
      setManualTitle("");
      setManualProduct("");
      setSelectedManualItemId(0);
      setPaintedColor("");
      setCartModalOpen(false);
      setView("LIST_ACTIVE");
    } else {
      if (!paintedColor) {
        alert("Informe a cor em que o produto será pintado!");
        return;
      }
      const key = getProductKey(
        group.itemId,
        group.color,
        group.size,
        group.variation,
      );
      if (
        activePacksList.some(
          (p) =>
            getProductKey(p.itemId, p.color, p.size, p.variation) === key &&
            p.processName === selectedCart,
        )
      ) {
        alert("Já existe uma pintura ativa para este produto neste carrinho!");
        return;
      }
      db.addActivePack({
        id: Date.now(),
        itemId: group.itemId,
        color: group.color,
        size: group.size,
        variation: group.variation,
        operatorId: currentUser.id,
        startTime: Date.now(),
        type: "PINTURA",
        processName: selectedCart,
        paintedColor: paintedColor,
      });

      const changedOrders: any[] = [];
      db.orders.forEach((o) => {
        if (
          (o.status === "PRODUZIDO" ||
            o.status === "PENDENTE" ||
            o.status === "EM_PRODUCAO") &&
          o.itemId === group.itemId &&
          o.color === group.color &&
          o.size === group.size &&
          o.variation === group.variation
        ) {
          changedOrders.push({ ...o, status: "EM_PINTURA" as OrderStatus });
        }
      });

      if (changedOrders.length > 0) {
        db.updateOrders(changedOrders);
      }
      setPaintedColor("");
      setCartModalOpen(false);
      setView("LIST_ACTIVE");
    }
  };

  const handleStartManualProduction = () => {
    if (!manualTitle || !manualProduct) return;
    setSelectedGroupToPaint(null);
    setCartModalOpen(true);
  };

  const startPackaging = (group: (typeof productGroups)[0]) => {
    setSelectedGroupToPaint(group);
    setCartModalOpen(true);
  };

  const openFinishScreen = (packId: number) => {
    setSelectedPackId(packId);
    setView("FINISH_PACK");
  };

  const handlePack = () => {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack || !packQuantity) return;

    let qtyToAllocate = Number(packQuantity);
    const endTime = Date.now();
    const operator = db.users?.find((u) => u.id === activePack.operatorId);
    const opRole = operator?.role || currentUser.role || "PINTURA";
    const durationMillis = calculateWorkingMillis(
      activePack.startTime,
      endTime,
      opRole,
    );

    if (activePack.itemId === 0) {
      db.addLogs([
        {
          id: Date.now(),
          operatorId: currentUser.id,
          quantityPainted: qtyToAllocate,
          type: "PINTURA",
          timestamp: endTime,
          durationMillis,
          thirdPartyName: activePack.thirdPartyName,
          customProductName: activePack.customProductName,
        },
      ]);
      db.removeActivePack(activePack.id);
      setSelectedPackId(null);
      setPackQuantity("");
      setView("LIST_ACTIVE");
      return;
    }

    const ordersForProduct = pendingOrders
      .filter(
        (o) =>
          o.itemId === activePack.itemId &&
          o.color === activePack.color &&
          o.size === activePack.size &&
          o.variation === activePack.variation,
      )
      .sort((a, b) => {
        const dateA = new Date(a.deliveryDate).getTime() || a.createdAt;
        const dateB = new Date(b.deliveryDate).getTime() || b.createdAt;
        if (dateA !== dateB) return dateA - dateB;
        return a.createdAt - b.createdAt;
      });

    let totalAssignedQty = 0;
    let logsToAdd: any[] = [];
    let changedOrders: any[] = [];

    let tempOrders = [...db.orders];

    for (let o of ordersForProduct) {
      if (qtyToAllocate <= 0) break;
      const needed = getAvailableForPainting(o) - (o.paintedQuantity || 0);
      const allocate = Math.min(needed, qtyToAllocate);

      if (allocate > 0) {
        const oIndex = tempOrders.findIndex((uo) => uo.id === o.id);
        if (oIndex >= 0) {
          const newPainted =
            (tempOrders[oIndex].paintedQuantity || 0) + allocate;
          let newStatus = tempOrders[oIndex].status || "PENDENTE";
          if (newPainted >= tempOrders[oIndex].totalQuantity) {
            newStatus = "PINTADO" as OrderStatus;
          } else {
            newStatus = "EM_PINTURA" as OrderStatus;
          }

          const updatedO = {
            ...tempOrders[oIndex],
            paintedQuantity: newPainted,
            status: newStatus,
            paintedColor: activePack.paintedColor,
          };
          tempOrders[oIndex] = updatedO;
          changedOrders.push(updatedO);
        }

        qtyToAllocate -= allocate;
        totalAssignedQty += allocate;

        logsToAdd.push({
          orderId: o.id,
          operatorId: currentUser.id,
          quantityPainted: allocate,
          type: "PINTURA",
          timestamp: endTime,
          durationMillis: 0,
          paintedColor: activePack.paintedColor,
        });
      }
    }

    if (qtyToAllocate > 0) {
      const stockId = `${activePack.itemId}|${activePack.color}|${activePack.size}|${activePack.variation}|INTERMEDIARIO`;
      const existingStock = db.stocks.find((s) => s.id === stockId);
      if (existingStock) {
        db.updateStocks([
          {
            ...existingStock,
            quantity: existingStock.quantity + qtyToAllocate,
          },
        ]);
      } else {
        db.updateStocks([
          {
            id: stockId,
            itemId: activePack.itemId,
            color: activePack.color,
            size: activePack.size,
            variation: activePack.variation,
            quantity: qtyToAllocate,
            stage: "INTERMEDIARIO",
          },
        ]);
      }

      db.addStockMovement?.({
        itemId: activePack.itemId,
        color: activePack.color,
        size: activePack.size,
        variation: activePack.variation,
        quantity: qtyToAllocate,
        type: "ENTRADA",
        description: `Sobra de Pintura Concluída - entrada no estoque intermediário (Operador: ${currentUser.name})`,
      });
    }

    if (totalAssignedQty > 0) {
      logsToAdd.forEach((log) => {
        log.durationMillis =
          totalAssignedQty > 0
            ? Math.round(
                (log.quantityPainted / totalAssignedQty) * durationMillis,
              )
            : durationMillis;
        log.id = Date.now() + Math.random();
      });
      db.addLogs(logsToAdd);
    }

    if (changedOrders.length > 0) db.updateOrders(changedOrders);
    db.removeActivePack(activePack.id);
    setSelectedPackId(null);
    setPackQuantity("");
    setView("LIST_ACTIVE");
  };

  const formatDuration = (start: number) => {
    const diffMins = Math.floor((Date.now() - start) / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <ScreenLayout className="bg-slate-50 relative text-[11px] md:text-xs">
      <ScrollContainer
        paddingSize="dense"
        className="w-full max-w-xl mx-auto flex flex-col gap-3 py-2"
      >
        {/* Header Widget */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 p-2.5 rounded-lg text-white shadow-sm shrink-0">
          <Activity className="animate-pulse w-5 h-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xs md:text-sm font-bold font-sans text-white leading-tight truncate">
              Produção - Pintura Eletrostática
            </h2>
            <p className="text-[9px] md:text-[10px] text-emerald-100 font-mono truncate">
              Operador: {currentUser.name} | Cabina de Pintura Ativa
            </p>
          </div>
        </div>

        <ProductivityCard db={db} currentUser={currentUser} />

        {/* Apontamento de Paradas de Máquina */}
        <MachineStopWidget db={db} currentUser={currentUser} machineName="Pintura Eletrostática" />

        {/* Offline Sync Status Banner */}
        {db.syncQueueCount !== undefined && (
          <div className="bg-emerald-50 border border-emerald-100 text-[#0f5132] px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 shadow-3xs text-[10px] font-bold flex-wrap">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${db.quotaExceeded ? "bg-rose-500" : "bg-emerald-500"} animate-pulse`}
              ></span>
              <span>
                {db.quotaExceeded
                  ? "Sincronização em Pausa (Cota)"
                  : "Sincronizado com o servidor principal"}
              </span>
            </div>

            {db.quotaExceeded ? (
              <div className="flex items-center gap-1.5 bg-rose-100/80 border border-rose-200 text-rose-950 px-2 py-1 rounded text-[9px]">
                <span>⚠️</span>
                <span className="truncate">
                  Surgiram limites de gravação diária. Dados salvos localmente!
                </span>
                <button
                  onClick={() => db.triggerSyncQueue?.(true)}
                  className="bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded text-[8px] uppercase hover:bg-rose-700 transition"
                >
                  Forçar
                </button>
              </div>
            ) : db.syncQueueCount > 0 ? (
              <div className="flex items-center gap-1.5 bg-amber-150 border border-amber-300 text-amber-950 px-2 py-1 rounded text-[9px] animate-pulse">
                <span>⚡ {db.syncQueueCount} fila</span>
                <button
                  onClick={() => db.triggerSyncQueue?.(true)}
                  className="bg-amber-600 text-white font-extrabold px-2 py-0.5 rounded text-[8px] uppercase hover:bg-amber-700 transition"
                >
                  Sincronizar
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* --- VIEW 1: FINISH_PACK --- */}
        {view === "FINISH_PACK" &&
          selectedPackId &&
          (() => {
            const activePack = db.activePacks.find(
              (p) => p.id === selectedPackId,
            );
            if (!activePack) return null;
            const item = db.items.find((i) => i.id === activePack.itemId);
            const relatedTotalRemaining =
              productGroups.find(
                (g) =>
                  getProductKey(g.itemId, g.color, g.size, g.variation) ===
                  getProductKey(
                    activePack.itemId,
                    activePack.color,
                    activePack.size,
                    activePack.variation,
                  ),
              )?.totalRemaining || 0;

            return (
              <div className="flex flex-col gap-2.5 p-1">
                <button
                  onClick={() => setView("LIST_ACTIVE")}
                  className="flex items-center gap-1.5 self-start text-pink-600 font-bold hover:text-pink-800 text-[10px] uppercase"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
                <div className="bg-white p-3.5 rounded-lg shadow-sm border w-full max-w-sm mx-auto flex flex-col gap-2.5 text-center">
                  {item?.imageUrl && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition"
                        onClick={() => setFullSizeImage(item.imageUrl || null)}
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-xs text-gray-800">
                      {activePack.itemId === 0
                        ? activePack.customProductName
                        : item?.name || "Item Desconhecido"}
                    </h3>
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      {activePack.itemId === 0
                        ? `Cliente: ${activePack.thirdPartyName}`
                        : `${activePack.color || "-"} | ${activePack.size || "-"} | ${activePack.variation || "-"}`}
                    </p>
                  </div>

                  <div className="bg-pink-50 p-2 rounded-lg">
                    <p className="text-[9px] text-gray-600 mb-0.5">
                      {activePack.itemId === 0 ? "Lançamento Avulso (Sem Pedido Vinculado)" : "Restante a Pintar no Pedido"}
                    </p>
                    <p className="font-extrabold text-base text-pink-800">
                      {activePack.itemId === 0 ? "-" : relatedTotalRemaining}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-bold text-gray-700">
                      Quantidade Pintada Agora:
                    </label>
                    <input
                      type="number"
                      value={packQuantity}
                      onChange={(e) =>
                        setPackQuantity(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder="Ex: 50"
                      className="border border-gray-300 p-2 rounded text-xs text-center focus:outline-pink-505"
                    />
                  </div>
                  <button
                    onClick={handlePack}
                    disabled={!packQuantity || Number(packQuantity) <= 0}
                    className="bg-pink-600 text-white font-bold p-2 mt-1 rounded hover:bg-pink-700 transition disabled:opacity-50 text-[10px]"
                  >
                    Confirmar Pintura
                  </button>
                </div>
              </div>
            );
          })()}

        {/* --- VIEW 2: MANUAL_PRODUCTION --- */}
        {view === "MANUAL_PRODUCTION" && (
          <div className="flex flex-col gap-2.5 p-1">
            <button
              onClick={() => setView("LIST_ACTIVE")}
              className="flex items-center gap-1.5 self-start text-pink-600 font-bold hover:text-pink-800 text-[10px] uppercase"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
            <div className="bg-white p-3.5 rounded-lg shadow-sm border w-full flex flex-col gap-2.5 text-left">
              <div className="flex items-center gap-1.5 text-pink-800 border-b pb-1.5">
                <Activity className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase">
                  Iniciar Lançamento Avulso (Pintura)
                </h3>
              </div>
              <p className="text-[10px] text-gray-500">
                Registre e inicie a contagem de tempo de pintura para terceiros
                ou produtos externos.
              </p>

              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-bold text-gray-700">
                  Cliente (Terceiro) ou Origem / Projeto
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="border p-2 rounded focus:outline-pink-500 text-xs w-full"
                  placeholder="Ex: Metalúrgica ABC"
                />
              </div>

              <div
                className="flex flex-col gap-0.5 relative"
                ref={suggestionsRef}
              >
                <label className="text-[10px] font-bold text-gray-700">
                  Descrição das Peças / Produto
                </label>
                <input
                  type="text"
                  value={manualProduct}
                  onChange={(e) => {
                    setManualProduct(e.target.value);
                    setSelectedManualItemId(0);
                    setShowItemSuggestions(true);
                  }}
                  onFocus={() => setShowItemSuggestions(true)}
                  className="border p-2 rounded focus:outline-pink-500 text-xs w-full"
                  placeholder="Pesquise por código/nome de peça/produto ou digite livre..."
                />

                {showItemSuggestions && itemSuggestions.length > 0 && (
                  <div className="absolute top-[100%] left-0 right-0 bg-white border border-gray-250 rounded shadow-lg z-50 max-h-36 overflow-y-auto mt-0.5 flex flex-col">
                    {itemSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setManualProduct(item.name);
                          setSelectedManualItemId(item.id);
                          setShowItemSuggestions(false);
                        }}
                        className="px-2 py-1.5 text-left text-[10px] text-gray-700 hover:bg-pink-50 hover:text-pink-800 transition border-b border-gray-100 last:border-0 font-medium"
                      >
                        <span className="font-bold text-gray-900 mr-1">
                          [{item.code}]
                        </span>
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedManualItemId > 0 ? (
                  <p className="text-[9px] text-emerald-700 font-bold mt-0.5">
                    ✓ Item Cadastrado Vinculado! (ID: {selectedManualItemId})
                  </p>
                ) : (
                  manualProduct && (
                    <p className="text-[9px] text-amber-700 font-bold mt-0.5">
                      ℹ️ Seguirá como descrição manual personalizada para
                      terceiros/projetos adicionais.
                    </p>
                  )
                )}
              </div>

              <button
                onClick={handleStartManualProduction}
                disabled={!manualTitle || !manualProduct}
                className="bg-pink-600 font-bold text-white py-2 rounded shadow hover:bg-pink-700 transition disabled:opacity-50 flex justify-center items-center gap-1.5 text-xs uppercase"
              >
                <Activity size={12} /> Selecionar Carrinho e Iniciar
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW 3: NEW_PACK --- */}
        {view === "NEW_PACK" &&
          (() => {
            const filteredGroups = productGroups.filter((g) => {
              if (!searchTerm) return true;
              const item = db.items.find((i) => i.id === g.itemId);
              const searchStr = normalizeString(
                `${item?.name || ""} ${g.color} ${g.size} ${g.variation}`,
              );
              return searchStr.includes(normalizeString(searchTerm));
            });

            return (
              <div className="flex flex-col gap-2.5 p-1 w-full">
                <button
                  onClick={() => setView("LIST_ACTIVE")}
                  className="flex items-center gap-1.5 self-start text-pink-600 font-bold hover:text-pink-800 text-[10px] uppercase"
                >
                  <ArrowLeft size={14} /> Pinturas Ativas
                </button>
                <h2 className="text-xs font-bold text-gray-800">
                  Lista de Pinturas Pendentes (Pedidos)
                </h2>
                <input
                  type="text"
                  placeholder="Pesquisar produto associado nos pedidos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-300 p-2 rounded focus:outline-pink-500 text-xs w-full"
                />
                <div className="overflow-y-auto max-h-[300px] w-full mt-1">
                  {filteredGroups.length === 0 ? (
                    <p className="text-gray-500 text-center mt-2 text-[10px]">
                      Nenhum produto em aberto para pintura encontrado nos
                      pedidos.
                    </p>
                  ) : (
                    <div className="grid gap-1.5">
                      {filteredGroups.map((g, idx) => {
                        const item = db.items.find((i) => i.id === g.itemId);
                        return (
                          <div
                            key={idx}
                            onClick={() => startPackaging(g)}
                            className="bg-white p-2 border border-gray-200 flex justify-between items-center rounded-lg shadow-3xs cursor-pointer hover:border-pink-400 hover:shadow-2xs transition gap-2"
                          >
                            {item?.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 object-cover rounded shadow-3xs border border-slate-200 cursor-pointer hover:opacity-80 transition shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFullSizeImage(item.imageUrl || null);
                                }}
                              />
                            )}
                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <span className="font-bold text-gray-800 text-[11px] truncate">
                                {item?.name || "Item"}
                              </span>
                              <span className="text-[9px] text-gray-500 truncate">
                                Cor: {g.color || "-"} | Tam: {g.size || "-"} |
                                Var: {g.variation || "-"}
                              </span>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-[9px] text-gray-400">
                                Pendente
                              </span>
                              <span className="font-extrabold text-xs text-pink-600 leading-none">
                                {g.totalRemaining}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        {/* --- VIEW 4: LIST_ACTIVE (Main dashboard) --- */}
        {view === "LIST_ACTIVE" && (
          <div className="flex flex-col gap-3">
            {/* RESUMO DIÁRIO */}
            <div className="text-[10px] transform scale-98 origin-top">
              <DailySummaryWidget db={db} currentUser={currentUser} />
            </div>

            <div className="flex items-center justify-between border-b border-gray-200 pb-1 mt-1">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Acompanhamento Eletrostático ({activePacksList.length})
              </span>
            </div>

            {activePacksList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white border border-dashed border-slate-200 rounded-lg max-w-sm mx-auto text-center mt-1">
                <Activity
                  size={28}
                  className="mb-2 text-slate-400 animate-pulse"
                />
                <p className="text-slate-500 text-[11px] font-semibold">
                  Nenhuma pintura eletrostática em andamento.
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Use os botões abaixo para preencher o carrinho e iniciar.
                </p>
              </div>
            ) : (
              <div className="grid gap-1.5">
                {activePacksList.map((pack) => {
                  const item = db.items.find((i) => i.id === pack.itemId);
                  return (
                    <div
                      key={pack.id}
                      onClick={() => openFinishScreen(pack.id)}
                      className="bg-white border p-2.5 rounded-lg shadow-3xs flex justify-between items-center transition relative overflow-hidden border-pink-205 hover:border-pink-400 cursor-pointer hover:shadow-2xs"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>

                      <div className="flex items-center gap-3 pl-2 max-w-[80%]">
                        {item?.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded shadow-3xs border border-slate-200 cursor-pointer hover:opacity-80 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullSizeImage(item.imageUrl || null);
                            }}
                          />
                        )}
                        <div className="flex flex-col text-left shrink-1 min-w-0 flex-1 mr-2">
                          <div className="flex gap-1 mb-0.5 flex-wrap">
                            <div className="text-[8px] tracking-wider uppercase bg-pink-50 border border-pink-100 text-pink-700 font-extrabold px-1 py-0.2 rounded shadow-3xs">
                              Ativa
                            </div>
                            {pack.processName && (
                              <div className="text-[8px] tracking-wider uppercase bg-purple-50 border border-purple-100 text-purple-700 font-extrabold px-1 py-0.2 rounded shadow-3xs">
                                {pack.processName}
                              </div>
                            )}
                            {pack.paintedColor && (
                              <div className="text-[8px] tracking-wider uppercase bg-blue-50 border border-blue-100 text-blue-700 font-extrabold px-1 py-0.2 rounded shadow-3xs">
                                Cor: {pack.paintedColor}
                              </div>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900 text-[11px] leading-tight truncate">
                            {pack.itemId === 0
                              ? pack.customProductName
                              : item?.name || "Produto"}
                          </span>
                          {pack.itemId === 0 ? (
                            <span className="text-[9px] font-semibold text-slate-500 mt-0.2">
                              Cliente/Lote:{" "}
                              <strong className="text-slate-800">
                                {pack.thirdPartyName}
                              </strong>
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-slate-500 mt-0.2">
                              Especificações:{" "}
                              <strong className="text-slate-800">
                                {pack.color || "-"} | {pack.size || "-"} |{" "}
                                {pack.variation || "-"}
                              </strong>
                            </span>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-pink-750 text-[9px] font-bold leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                            <span>
                              Iniciou há: {formatDuration(pack.startTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] uppercase font-bold text-white bg-pink-600 border border-pink-700 px-2 py-1 rounded hover:bg-pink-700 transition shadow-3xs">
                          Concluir ✓
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollContainer>

      {/* FOOTER & BUTTONS - ONLY IF ON LIST_ACTIVE VIEW */}
      {view === "LIST_ACTIVE" && (
        <div className="bg-white p-2 border-t border-slate-200 shadow-lg flex gap-2 z-30 justify-between shrink-0">
          <button
            onClick={() => setView("MANUAL_PRODUCTION")}
            className="bg-slate-100 text-slate-700 font-bold py-1.5 px-3 rounded shadow-3xs hover:bg-slate-200 transition text-[9px] uppercase tracking-wider text-center"
          >
            Pintura Avulsa
          </button>
          <button
            onClick={() => setView("NEW_PACK")}
            className="bg-emerald-600 text-white font-extrabold py-1.5 px-3 rounded shadow-sm hover:bg-emerald-700 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-wider transition text-center"
          >
            <span>🎨 INICIAR PROGRAMA</span>
          </button>
        </div>
      )}

      {/* --- CART AND DETAIL MODAL (ALWAYS AVAILABLE AT THE ROOT OF THE RENDER TO AVOID EARLY RENDERING TRAPS) --- */}
      {cartModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[280px] flex flex-col p-3.5 gap-2.5 my-auto relative text-left">
            <button
              onClick={() => setCartModalOpen(false)}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
            >
              ✕
            </button>
            <h3 className="font-bold text-xs text-slate-900 border-b pb-0.5">
              Ficha de Produção
            </h3>

            {view !== "MANUAL_PRODUCTION" &&
              selectedGroupToPaint &&
              (() => {
                const itemObj = db.items.find(
                  (i) => i.id === selectedGroupToPaint.itemId,
                );
                if (itemObj?.imageUrl) {
                  return (
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 rounded-lg mb-1">
                      <img
                        src={itemObj.imageUrl}
                        alt={itemObj.name}
                        className="w-12 h-12 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition"
                        onClick={() =>
                          setFullSizeImage(itemObj.imageUrl || null)
                        }
                      />
                      <span className="font-bold text-[10px] text-slate-800 leading-tight">
                        {itemObj.name}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

            <p className="text-[10px] text-slate-500">
              Selecione a linha de trilho/carrinho abaixo:
            </p>

            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedCart("Carrinho 1")}
                className={`py-1.5 px-2 rounded font-bold border transition text-left text-[10px] ${selectedCart === "Carrinho 1" ? "border-pink-600 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                🛒 Carrinho Linha A (1)
              </button>
              <button
                onClick={() => setSelectedCart("Carrinho 2")}
                className={`py-1.5 px-2 rounded font-bold border transition text-left text-[10px] ${selectedCart === "Carrinho 2" ? "border-pink-600 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                🛒 Carrinho Linha B (2)
              </button>
            </div>

            <div className="text-left">
              <label className="text-[10px] font-bold text-slate-755 mb-0.5 block">
                Cor de Pintura *
              </label>
              <input
                type="text"
                placeholder="Ex: Cobre, Preto, Dourado..."
                value={paintedColor}
                onChange={(e) => setPaintedColor(e.target.value)}
                className="w-full border p-1.5 rounded text-[11px] bg-slate-50 focus:bg-white border-slate-200 focus:border-pink-500 outline-none"
              />
              <div className="mt-1.5">
                <span className="text-[9px] font-bold text-slate-500 block mb-1">
                  Cores Cadastradas (toque para selecionar):
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-white border border-slate-200 rounded">
                  {[
                    "INOX",
                    "GRAFITE",
                    "DOURADO",
                    "CINZA",
                    "BRANCO (LEITOSO)",
                    "PRETO FOSCO",
                    "INCOLOR",
                    "ROSÊ",
                    "CHAMPAGNE",
                    "PRATA",
                    "COR DE PREPARACAO",
                    "ZINCADO",
                    "INDEFINIDA",
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPaintedColor(color)}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-all font-semibold font-sans ${paintedColor === color ? "bg-pink-600 text-white border-pink-600 shadow" : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-250 active:scale-95"}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                startPaintingWithCart(
                  selectedGroupToPaint,
                  view === "MANUAL_PRODUCTION",
                )
              }
              className="bg-pink-600 font-bold text-white py-1.5 rounded mt-1 shadow hover:bg-pink-700 transition disabled:opacity-50 text-[10px]"
              disabled={!paintedColor}
            >
              Confirmar e Iniciar Pintura
            </button>
          </div>
        </div>
      )}

      {fullSizeImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setFullSizeImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setFullSizeImage(null)}
              className="absolute -top-10 right-0 text-white font-bold text-xl hover:text-gray-300 transition"
            >
              Fechar &times;
            </button>
            <img
              src={fullSizeImage}
              alt="Ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}
