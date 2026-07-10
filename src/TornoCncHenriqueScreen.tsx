import React, { useState } from "react";
import {
  Hammer,
  ArrowLeft,
  Search,
  PlusCircle,
  Activity,
  User as UserIcon,
  Layers,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, OrderStatus } from "./types";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { normalizeString } from "./searchUtils";
import { ProductivityCard } from "./components/ProductivityCard";
import { TornoActionsWidget, MachineStopWidget } from "./components/OperatorActions";

export function TornoCncHenriqueScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [view, setView] = useState<
    "LIST_ACTIVE" | "NEW_PACK" | "FINISH_PACK" | "MANUAL_PRODUCTION" | "SELECT_PLAN"
  >("LIST_ACTIVE");
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);

  // Finish pack / regular
  const [packQuantity, setPackQuantity] = useState<number | "">("");

  const PRENSA_OPERATORS = [
    "Willian",
    "Henrique",
    "Marcos",
  ];
  const [selectedOperator, setSelectedOperator] = useState<string>("Henrique");
  const [otherOperatorName, setOtherOperatorName] = useState<string>("");

  // Start OS modal states
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedStartGroup, setSelectedStartGroup] = useState<any>(null);
  const [startOperator, setStartOperator] = useState<string>("Henrique");
  const [otherStartOperator, setOtherStartOperator] = useState<string>("");
  const [startProcess, setStartProcess] = useState<string>("Torneamento");
  const [otherStartProcess, setOtherStartProcess] = useState<string>("");

  // Manual production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProductSearch, setManualProductSearch] = useState("");
  const [manualParentItemId, setManualParentItemId] = useState<number | null>(
    null,
  );
  const [manualQty, setManualQty] = useState<number | "">("");

  const [manualTargetSearch, setManualTargetSearch] = useState("");
  const [manualOrderSearch, setManualOrderSearch] = useState("");
  const [selectedManualTargetId, setSelectedManualTargetId] = useState<number | null>(null);
  const [selectedManualOrderId, setSelectedManualOrderId] = useState<number | null>(null);

  const [processPerformed, setProcessPerformed] = useState<string>("Torneamento");
  const [otherProcess, setOtherProcess] = useState<string>(""); // Corte, 1 Dobra, 2 Dobra, etc

  const [searchTerm, setSearchTerm] = useState("");
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);
  const [pcpExpanded, setPcpExpanded] = useState(true);

  
  const startPcpPlan = (planId: number) => {
    const plan = db.coilCuttingPlans?.find(p => p.id === planId);
    if (!plan) return;

    db.addActivePack({
      id: Date.now(),
      itemId: plan.targetItemIds[0] || 0,
      color: "N/A",
      size: "N/A",
      variation: "N/A",
      operatorId: currentUser.id,
      startTime: Date.now(),
      partName: plan.name,
      type: "TORNO_CNC_HENRIQUE",
      taskId: plan.id,
    });
    db.updateCoilCuttingPlan({...plan, status: "EM_PRODUCAO"});
    setView("LIST_ACTIVE");
  };

  const myPcpPlans = db.coilCuttingPlans?.filter(p => p.type === "TORNO_CNC_HENRIQUE" && p.status === "PENDENTE") || [];
  const pendingPlans = db.coilCuttingPlans?.filter(p => p.status !== "CONCLUIDO" && p.type === "TORNO_CNC_HENRIQUE") || [];

  const activePacksList = db.activePacks.filter(
    (p) =>
      p.type === "TORNO_CNC_HENRIQUE" &&
      (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" ? true : p.operatorId === currentUser.id),
  );

  const pendingOrders = React.useMemo(() => {
    return (db.orders || []).filter((o) => {
      return (
        o &&
        o.status !== "EMBALADO" &&
        o.status !== "FATURADO" &&
        (o.cutQuantity || 0) < o.totalQuantity
      );
    });
  }, [db.orders]);

  const productGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        itemId: number;
        color: string;
        size: string;
        variation: string;
        customerName: string;
        orderCode: string;
        totalRemaining: number;
        overallProductTotalRemaining: number;
        itemName: string;
      }
    >();

    // Index maps for constant-time lookup
    const itemsMap = new Map<number, string>();
    (db.items || []).forEach((item) => {
      if (item && item.id !== undefined) {
        itemsMap.set(item.id, item.name || "");
      }
    });

    const customersMap = new Map<string, string>();
    (db.customers || []).forEach((c) => {
      if (c && c.name) {
        customersMap.set(c.name.toLowerCase(), c.tradeName || c.name);
      }
      if (c && c.tradeName) {
        customersMap.set(c.tradeName.toLowerCase(), c.tradeName || c.name);
      }
    });

    // First compute overall totals per product code
    const productTotals = new Map<string, number>();
    pendingOrders.forEach((o) => {
      const productKey = `${o.itemId}|${o.color}|${o.size}|${o.variation}`;
      const remaining = Math.max(
        0,
        o.totalQuantity - (o.producedQuantity || o.cutQuantity || 0),
      );
      productTotals.set(
        productKey,
        (productTotals.get(productKey) || 0) + remaining,
      );
    });

    pendingOrders.forEach((o) => {
      const customerNameLower = (o.customerName || "").toLowerCase();
      const customerDisplayName = customersMap.get(customerNameLower) || o.customerName || "";

      const key = `${customerDisplayName}|${o.orderCode}|${o.itemId}|${o.color}|${o.size}|${o.variation}`;
      const remaining = Math.max(
        0,
        o.totalQuantity - (o.producedQuantity || o.cutQuantity || 0),
      );

      if (remaining <= 0) return;

      const productKey = `${o.itemId}|${o.color}|${o.size}|${o.variation}`;
      const overallTotal = productTotals.get(productKey) || 0;

      if (!groups.has(key)) {
        groups.set(key, {
          itemId: o.itemId,
          color: o.color,
          size: o.size,
          variation: o.variation,
          customerName: customerDisplayName,
          orderCode: o.orderCode,
          totalRemaining: 0,
          overallProductTotalRemaining: overallTotal,
          itemName: itemsMap.get(o.itemId) || "",
        });
      }
      const g = groups.get(key)!;
      g.totalRemaining += remaining;
    });

    return Array.from(groups.values());
  }, [pendingOrders, db.customers, db.items]);

  const startProduction = (group: any) => {
    setSelectedStartGroup(group);
    setStartOperator("Henrique");
    setOtherStartOperator("");
    setStartProcess("Corte");
    setStartModalOpen(true);
  };

  const confirmStartProduction = () => {
    if (!selectedStartGroup) return;
    const g = selectedStartGroup;

    const opName =
      startOperator === "Outro" ? otherStartOperator : startOperator;
    const itemName = db.items.find((i) => i.id === g.itemId)?.name || "Produto";

    // Using taskId = 0 because it's no longer tied to a single order
    db.addActivePack({
      id: Date.now(),
      itemId: g.itemId,
      color: g.color,
      size: g.size,
      variation: g.variation,
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "TORNO_CNC_HENRIQUE",
      partName: itemName,
      taskId: 0,
      processName: startProcess === "Outro" ? otherStartProcess : startProcess,
      thirdPartyName: opName,
      customerName: g.customerName,
      orderCode: g.orderCode,
    } as any);

    setStartModalOpen(false);
    setSelectedStartGroup(null);
    setView("LIST_ACTIVE");
  };

  const openFinishScreen = (packId: number) => {
    const activePack = db.activePacks.find((p) => p.id === packId);
    if (activePack) {
      if (activePack.thirdPartyName) {
        if (PRENSA_OPERATORS.includes(activePack.thirdPartyName)) {
          setSelectedOperator(activePack.thirdPartyName);
        } else {
          setSelectedOperator("Outro");
          setOtherOperatorName(activePack.thirdPartyName);
        }
      }
    }
    setSelectedPackId(packId);
    setProcessPerformed(activePack.processName || "Torneamento");
    setOtherProcess("");
    setView("FINISH_PACK");
  };

  const finalizeLog = (
    qty: number,
    durationMillis: number,
    activePack: any,
    isManual: boolean = false,
    options: {
      manualTitle?: string;
      parentItemId?: number;
      processPerformed?: string;
      updateOS?: boolean;
    } = {},
  ) => {
    const finalOperatorName =
      selectedOperator === "Outro" ? otherOperatorName : selectedOperator;

    const mTitle = options.manualTitle || manualTitle;
    const mParent = options.parentItemId || manualParentItemId;
    const mProcess = options.processPerformed || (processPerformed === "Outro" ? otherProcess : processPerformed);
    const updateOS = options.updateOS !== false; // defaults to true

    db.addLogs([
      {
        id: Date.now(),
        operatorId: currentUser.id,
        quantityProcessed: qty,
        type: "TORNO_CNC_HENRIQUE",
        timestamp: Date.now(),
        durationMillis,
        customOperatorName: finalOperatorName,
        customProductName: isManual ? mTitle : undefined,
        parentItemId: isManual && mParent ? mParent : undefined,
        itemId: activePack && activePack.itemId ? Number(activePack.itemId) : undefined,
        processPerformed: mProcess,
      },
    ]);

    if (isManual && mParent) {
      db.addNotification({
        message: `Prensa: ${qty} un. de ${mTitle} p/ produto ${db.items.find((i) => i.id === mParent)?.name} (${mProcess}) via ${finalOperatorName}`,
        read: false,
      });
    } else if (!isManual && updateOS) {
      let ordersForProduct = pendingOrders.filter(
        (o) =>
          o.itemId === activePack.itemId &&
          o.color === activePack.color &&
          o.size === activePack.size &&
          o.variation === activePack.variation &&
          (activePack.customerName
            ? o.customerName === activePack.customerName ||
              db.customers?.find(
                (c) =>
                  c.name === o.customerName || c.tradeName === o.customerName,
              )?.tradeName === activePack.customerName
            : true) &&
          (activePack.orderCode ? o.orderCode === activePack.orderCode : true),
      );

      if (ordersForProduct.length === 0) {
        ordersForProduct = pendingOrders.filter(
          (o) =>
            o.itemId === activePack.itemId &&
            o.color === activePack.color &&
            o.size === activePack.size &&
            o.variation === activePack.variation,
        );
      }

      ordersForProduct.sort((a, b) => {
        const dateA = new Date(a.deliveryDate).getTime() || a.createdAt;
        const dateB = new Date(b.deliveryDate).getTime() || b.createdAt;
        if (dateA !== dateB) return dateA - dateB;
        return a.createdAt - b.createdAt;
      });

      let qtyToAllocate = qty;
      let changedOrders: any[] = [];
      for (const o of ordersForProduct) {
        if (qtyToAllocate <= 0) break;
        const remaining = Math.max(
          0,
          o.totalQuantity - (o.producedQuantity || 0) - (o.corteQuantity || 0),
        );
        // Wait, previous code just added to producedQuantity, but if this is Prensa it might just be part of production.
        if (remaining > 0) {
          const alloc = Math.min(remaining, qtyToAllocate);
          qtyToAllocate -= alloc;
          changedOrders.push({
            ...o,
            producedQuantity: (o.producedQuantity || 0) + alloc,
          });
        }
      }
      if (changedOrders.length > 0) {
        db.updateOrders(changedOrders);
        db.addNotification({
          message: `Prensa: ${qty} un. (${db.items.find((i) => i.id === activePack.itemId)?.name}) FINALIZADAS por ${finalOperatorName}`,
          read: false,
        });
      }
    }
  };

  const handleFinish = (updateOS: boolean, startNext: boolean, isPartial: boolean = false) => {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack || !packQuantity) return;

    const isManual = activePack.itemId === 0;

    finalizeLog(
      Number(packQuantity),
      Date.now() - activePack.startTime,
      activePack,
      isManual,
      {
        manualTitle: isManual ? activePack.partName : undefined,
        parentItemId: isManual ? Number(activePack.thirdPartyName) : undefined,
        processPerformed: processPerformed === "Outro" ? otherProcess : processPerformed,
        updateOS: updateOS,
      },
    );

    if (isPartial) {
      // Keep active pack, reset starting time
      db.addActivePack({ ...activePack, startTime: Date.now() });
      db.addNotification({
        message: `Apontamento Parcial no Torno CNC Henrique: ${packQuantity} peças computadas. O lote segue ativo.`,
        read: false,
      });
      alert("Apontamento parcial registrado com sucesso! O lote continuará ativo na sua tela.");
    } else {
      db.removeActivePack(activePack.id);
      if (activePack.taskId) {
        const plan = db.coilCuttingPlans?.find(p => p.id === activePack.taskId);
        if (plan) {
           db.updateCoilCuttingPlan({ ...plan, status: "CONCLUIDO" });
        }
      }
    }

    setSelectedPackId(null);
    setPackQuantity("");

    if (startNext && !isManual && !isPartial) {
      setSelectedStartGroup({
        itemId: activePack.itemId,
        color: activePack.color,
        size: activePack.size,
        variation: activePack.variation,
      });
      setStartOperator(selectedOperator);
      setOtherStartOperator(otherOperatorName);
      setStartProcess("");
      setStartModalOpen(true);
    } else {
      setView("LIST_ACTIVE");
    }
  };

  
  const suggestedManualTargets = React.useMemo(() => {
    const query = (manualTargetSearch || '').trim().toLowerCase();
    if (!query) return [];
    return db.items
      .filter((i) => String(`${i.code || ''} - ${i.name || ''}`).toLowerCase().includes(query))
      .slice(0, 5);
  }, [manualTargetSearch, db.items]);

  const suggestedManualOrders = React.useMemo(() => {
    const query = (manualOrderSearch || '').trim().toLowerCase();
    if (!query) return [];
    return db.orders
      .filter((o) => String(`${o.orderCode || ''} - ${o.customerName || ''}`).toLowerCase().includes(query))
      .slice(0, 5);
  }, [manualOrderSearch, db.orders]);

  const handleManualProduction = () => {
    if (!manualQty) return;

    const orderObj = selectedManualOrderId ? db.orders.find(o => o.id === selectedManualOrderId) : null;
    const itemObj = selectedManualTargetId ? db.items.find(i => i.id === selectedManualTargetId) : null;

    const targetName = orderObj 
      ? orderObj.customerName 
      : itemObj
        ? itemObj.name
        : (manualTargetSearch || manualOrderSearch || "Componente Avulso/Manual");

    const thirdPartyName = orderObj
      ? `Pedido: ${orderObj.orderCode}`
      : itemObj
        ? `Item: ${itemObj.code}`
        : "Digitado Livre";

    const mProcess = processPerformed === "Outro" ? otherProcess : processPerformed;

    db.addActivePack({
      id: Date.now(),
      itemId: 0,
      color: "N/A",
      size: "N/A",
      variation: "N/A",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "TORNO_CNC_HENRIQUE",
      partName: mProcess,
      customProductName: `${targetName} - Qtd ${manualQty}`,
      thirdPartyName: thirdPartyName,
    });
    
    db.addNotification({
      message: `Lote Avulso de Torno CNC Henrique iniciado (${targetName})`,
      read: false,
    });

    setManualTitle("");
    setManualParentItemId(null);
    setManualProductSearch("");
    setManualTargetSearch("");
    setManualOrderSearch("");
    setManualQty("");
    setSelectedManualTargetId(null);
    setSelectedManualOrderId(null);
    setView("LIST_ACTIVE");
  };


  const searchedItems = React.useMemo(() => {
    const q = (manualProductSearch || '').toLowerCase();
    if (!q) return [];
    return db.items
      .filter((i) => (i.name || '').toLowerCase().includes(q))
      .slice(0, 5);
  }, [manualProductSearch, db.items]);

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
            <Hammer className="w-5 h-5" />
            <h3 className="font-bold text-xl">Lançamento de Componente</h3>
          </div>
          <p className="text-sm text-gray-500">
            Digite livremente a identificação do componente/produto ou busque se preferir.
          </p>

          <div className="flex flex-col gap-2 relative">
            <label className="text-sm font-semibold text-gray-700">Identificação do Componente ou Pedido (Digitação Livre)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <span className="text-[10px] text-gray-400 font-bold block mb-1">COMPONENTE / PRODUTO</span>
                <input type="text" placeholder="Digite ou busque componente..." className="border p-2 rounded w-full text-sm" value={manualTargetSearch} onChange={e => {setManualTargetSearch(e.target.value); setSelectedManualTargetId(null);}} />
                {suggestedManualTargets.length > 0 && !selectedManualTargetId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1 mt-1 rounded max-h-40 overflow-y-auto">
                    {suggestedManualTargets.map(i => (
                      <button key={i.id} type="button" onClick={() => { setSelectedManualTargetId(i.id); setManualTargetSearch(`${i.code} - ${i.name}`); setSelectedManualOrderId(null); setManualOrderSearch(""); }} className="block w-full text-left p-1.5 text-xs hover:bg-gray-100">{i.name} ({i.code})</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="text-[10px] text-gray-400 font-bold block mb-1">PEDIDO / CLIENTE</span>
                <input type="text" placeholder="Digite ou busque pedido..." className="border p-2 rounded w-full text-sm" value={manualOrderSearch} onChange={e => {setManualOrderSearch(e.target.value); setSelectedManualOrderId(null);}} />
                {suggestedManualOrders.length > 0 && !selectedManualOrderId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1 mt-1 rounded max-h-40 overflow-y-auto">
                    {suggestedManualOrders.map(o => (
                      <button key={o.id} type="button" onClick={() => { setSelectedManualOrderId(o.id); setManualOrderSearch(`${o.orderCode} - ${o.customerName}`); setSelectedManualTargetId(null); setManualTargetSearch(""); }} className="block w-full text-left p-1.5 text-xs hover:bg-gray-100">{o.customerName} ({o.orderCode})</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-2">
              <label className="text-sm font-semibold text-gray-700">Qtd. a Produzir</label>
              <input type="number" value={manualQty} onChange={e => setManualQty(e.target.value === "" ? "" : Number(e.target.value))} className="border p-2 rounded w-full text-sm focus:outline-indigo-500" min={1} />
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <label className="text-sm font-semibold text-gray-700">
              Processo Executado
            </label>
            <select
              value={processPerformed}
              onChange={(e) => setProcessPerformed(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500 bg-white"
            >
              <option value="Torneamento">Torneamento</option>
              <option value="Corte Serra">Corte Serra</option>
              <option value="1ª Face">1ª Face</option>
              <option value="2ª Face">2ª Face</option>
              <option value="Rebaixo">Rebaixo</option>
              <option value="Facear">Facear</option>
              <option value="Outro">Outro</option>
            </select>
            {processPerformed === "Outro" && (
              <input 
                type="text" 
                placeholder="Qual processo?" 
                value={otherProcess} 
                onChange={(e) => setOtherProcess(e.target.value)} 
                className="border p-2 rounded mt-2 focus:outline-indigo-500"
              />
            )}
          </div>
          <button
            onClick={handleManualProduction}
            disabled={(!manualTargetSearch.trim() && !manualOrderSearch.trim() && !selectedManualTargetId && !selectedManualOrderId) || !manualQty}
            className="bg-indigo-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Activity size={18} /> Iniciar Processo
          </button>
        </div>
      </div>
    );
  }

  if (view === "FINISH_PACK" && selectedPackId) {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack) return null;
    const item = db.items.find((i) => i.id === activePack.itemId);

    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border w-full flex flex-col gap-4 text-center">
          {item?.imageUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-32 h-32 object-cover rounded-lg shadow-md border border-slate-200 cursor-pointer hover:opacity-80 transition"
                onClick={() => setFullSizeImage(item.imageUrl || null)}
              />
            </div>
          )}
          <div>
            <h3 className="font-bold text-xl text-gray-800">
              {activePack.itemId === 0 ? "Lançamento Avulso de Componente" : activePack.partName || "OS Desconhecida"}
            </h3>
            {activePack.itemId === 0 && (
              <div className="mt-2 text-left bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-1 inline-block text-xs mx-auto">
                <div>Componente: <strong className="text-indigo-900">{activePack.partName}</strong></div>
                {activePack.thirdPartyName && (
                  <div>Produto Associado: <strong className="text-indigo-900">
                    {db.items.find(i => i.id === Number(activePack.thirdPartyName))?.name || "Nível Geral"}
                  </strong></div>
                )}
              </div>
            )}
            {activePack.processName && (
              <span className="text-xs bg-indigo-100 text-indigo-800 font-extrabold px-2.5 py-1 rounded-sm uppercase tracking-wide inline-block mt-2">
                ⚙️ Processo: {activePack.processName}
              </span>
            )}
            <p className="text-gray-500 text-sm mt-1">
              Tempo corrido:{" "}
              {Math.floor((Date.now() - activePack.startTime) / 60000)} minutos
            </p>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-left">
              <label className="text-sm font-semibold text-gray-700 text-left mt-2">
                Operador(a) Executante
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1 mb-4">
                {PRENSA_OPERATORS.map((op) => (
                  <button
                    key={op}
                    onClick={() => setSelectedOperator(op)}
                    className={`py-2 text-xs font-bold rounded border flex items-center justify-center gap-1 ${selectedOperator === op ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-600 border-slate-300"}`}
                  >
                    <UserIcon size={12} /> {op}
                  </button>
                ))}
              </div>
              {selectedOperator === "Outro" && (
                <input
                  type="text"
                  value={otherOperatorName}
                  onChange={(e) => setOtherOperatorName(e.target.value)}
                  placeholder="Digite o nome..."
                  className="mb-4 border p-2 rounded text-sm w-full focus:outline-indigo-500"
                />
              )}

              <label className="text-sm font-semibold text-gray-700 mt-2">
                Processo Executado (Finalização)
              </label>
              <select
                value={processPerformed}
                onChange={(e) => setProcessPerformed(e.target.value)}
                className="border p-2 rounded focus:outline-indigo-500 bg-white"
              >
                <option value="Torneamento">Torneamento</option>
                <option value="Corte Serra">Corte Serra</option>
                <option value="1ª Face">1ª Face</option>
                <option value="2ª Face">2ª Face</option>
                <option value="Rebaixo">Rebaixo</option>
                <option value="Facear">Facear</option>
                <option value="Outro">Outro</option>
              </select>
              {processPerformed === "Outro" && (
                <input 
                  type="text" 
                  placeholder="Qual processo manual?" 
                  value={otherProcess} 
                  onChange={(e) => setOtherProcess(e.target.value)} 
                  className="border p-2 rounded mt-2 focus:outline-indigo-500"
                />
              )}
              <div className="h-2"></div>
              
              <label className="text-sm font-semibold text-gray-700">
                Quantidade Pçs Concluídas:
              </label>
              <input
                type="number"
                value={packQuantity}
                onChange={(e) => setPackQuantity(Number(e.target.value))}
                placeholder="Ex: 50"
                className="border border-indigo-200 p-3 rounded-lg text-xl text-center focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            <button
              onClick={() => handleFinish(false, false, true)}
              disabled={!packQuantity || Number(packQuantity) <= 0}
              className="bg-amber-600 text-white font-extrabold p-3.5 rounded-xl text-xs uppercase tracking-wider hover:bg-amber-700 transition disabled:opacity-50 shadow-sm"
            >
              🔄 Apontamento Parcial (Continuar Produzindo no Lote)
            </button>
            
            <button
              onClick={() => handleFinish(true, false, false)}
              disabled={!packQuantity || Number(packQuantity) <= 0}
              className="bg-indigo-650 text-white font-extrabold p-3.5 rounded-xl text-xs uppercase tracking-wider hover:bg-indigo-700 transition disabled:opacity-50 shadow-md"
            >
              🏁 Confirmar Envio e Encerrar Lote
            </button>

            <div className="border-t border-dashed my-3"></div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-left mb-1">Outras opções de encerramento:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleFinish(false, true, false)}
                disabled={!packQuantity || Number(packQuantity) <= 0}
                className="bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg hover:bg-slate-200 transition text-[11px] border border-slate-200"
              >
                Encerrar e Chamar Próxima OS
              </button>
              <button
                onClick={() => handleFinish(false, false, false)}
                disabled={!packQuantity || Number(packQuantity) <= 0}
                className="bg-slate-150 text-slate-600 font-bold py-2 px-3 rounded-lg hover:bg-slate-250 transition text-[11px] border border-slate-200"
              >
                Encerrar Apenas este Processo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "SELECT_PLAN") {
    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Layers className="text-indigo-600" /> Selecionar Lote do PCP
        </h2>

        <div className="flex-1 overflow-y-auto w-full">
          {pendingPlans.length === 0 ? (
            <p className="text-gray-500 text-center mt-4 border p-6 rounded bg-gray-50">
              O PCP não programou nenhum lote para esta máquina no momento.
            </p>
          ) : (
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
                    onClick={() => startPcpPlan(plan.id)}
                    className="bg-white p-4 border border-indigo-200 flex justify-between items-center rounded-lg shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-md transition group text-left"
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
                      <span className="text-[11px] text-gray-500 mt-0.5 pl-2 font-medium">
                        Qtd Alvo:{" "}
                        <strong className="text-slate-800">
                          {plan.targetQuantity || "N/A"}
                        </strong>
                      </span>
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
                      <span className="text-[10px] uppercase text-indigo-650 font-bold bg-indigo-50 px-2 py-0.5 rounded mb-1 border border-indigo-100">
                        {plan.status === "EM_PRODUCAO"
                          ? "Produzindo"
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
          )}
        </div>
      </div>
    );
  }

  if (view === "NEW_PACK") {
    const filteredGroups = productGroups.filter((g) => {
      const searchStr = normalizeString(
        `${g.itemName} ${g.color} ${g.size} ${g.variation}`,
      );
      return searchStr.includes(normalizeString(searchTerm));
    });

    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full relative overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Iniciar Produção de Componente
        </h2>

        <input
          type="text"
          placeholder="Pesquisar produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-2 rounded-lg mb-4"
        />

        <div className="flex-1 overflow-y-auto w-full">
          {filteredGroups.length === 0 ? (
            <p className="text-gray-500 text-center mt-4">
              Nenhum produto pendente.
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredGroups.map((group, idx) => {
                const item = db.items.find((i) => i.id === group.itemId);
                return (
                  <div
                    key={idx}
                    onClick={() => startProduction(group)}
                    className="bg-white p-4 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-lg shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-md transition gap-3"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {item?.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-14 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullSizeImage(item.imageUrl || null);
                          }}
                        />
                      )}
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] tracking-wide font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded w-fit mb-1.5 uppercase">
                          Cliente: {group.customerName} | OS: {group.orderCode}
                        </span>
                        <span className="font-bold text-gray-800 flex items-center gap-2 text-base">
                          {item?.name || "Item desconhecido"}
                        </span>
                        <span className="text-xs text-gray-500 mt-0.5 font-semibold">
                          Código:{" "}
                          <span className="font-mono text-gray-700">
                            {item?.code || group.itemId}
                          </span>
                          {group.color &&
                            group.color !== "-" &&
                            ` • Cor: ${group.color}`}
                          {group.size &&
                            group.size !== "-" &&
                            ` • Tam: ${group.size}`}
                          {group.variation &&
                            group.variation !== "-" &&
                            ` • Var: ${group.variation}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col justify-between w-full sm:w-auto items-center sm:items-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 shrink-0">
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tight">
                          Pendente p/ Cliente
                        </span>
                        <span className="font-extrabold text-xl text-indigo-600">
                          {group.totalRemaining}
                        </span>
                      </div>

                      {group.overallProductTotalRemaining >
                        group.totalRemaining && (
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[9px] text-amber-600 font-medium whitespace-nowrap">
                            Total Geral Pendente
                          </span>
                          <span className="font-semibold text-xs text-amber-700">
                            {group.overallProductTotalRemaining} pçs
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL DE INICIO DE PROCESSO (PRENSA) */}
        {startModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border rounded-xl shadow-xl w-full max-w-sm flex flex-col p-5 md:p-6 gap-4 my-auto max-h-[92vh] overflow-y-auto text-left">
              <div className="flex flex-col gap-1 border-b pb-3 shrink-0 text-center">
                <h3 className="font-bold text-lg text-gray-900">
                  Iniciar Produção da OS
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione o operador e o processo para iniciar:
                </p>
              </div>

              {/* Operator selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Operador Executante
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRENSA_OPERATORS.map((op) => (
                    <button
                      key={op}
                      onClick={() => setStartOperator(op)}
                      type="button"
                      className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all ${
                        startOperator === op
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
                {startOperator === "Outro" && (
                  <input
                    type="text"
                    value={otherStartOperator}
                    onChange={(e) => setOtherStartOperator(e.target.value)}
                    placeholder="Nome do operador..."
                    className="mt-1.5 border border-slate-250 rounded-lg p-2 text-xs focus:outline-indigo-500 w-full"
                  />
                )}
              </div>

              {/* Process selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Processo a Executar
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    "Torneamento",
                    "Corte Serra",
                    "1ª Face",
                    "2ª Face",
                    "Rebaixo",
                    "Facear",
                    "Outro",
                  ].map((proc) => (
                    <button
                      key={proc}
                      onClick={() => setStartProcess(proc)}
                      type="button"
                      className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all ${
                        startProcess === proc
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {proc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3 flex flex-col gap-2 mt-2 shrink-0">
                <button
                  disabled={
                    !startOperator ||
                    (startOperator === "Outro" && !otherStartOperator) ||
                    (!startProcess || (startProcess === "Outro" && !otherStartProcess))
                  }
                  onClick={confirmStartProduction}
                  className={`w-full py-3 rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                    startOperator &&
                    (startOperator !== "Outro" || otherStartOperator) &&
                    (startProcess && (startProcess !== "Outro" || !!otherStartProcess))
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Activity size={16} /> Iniciar Processo
                </button>

                <button
                  onClick={() => {
                    setStartModalOpen(false);
                    setSelectedStartGroup(null);
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-xl transition text-center focus:outline-none"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
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
        <div className="flex items-center gap-2.5 md:gap-3 bg-gradient-to-r from-violet-600 to-indigo-500 p-3 md:p-4 rounded-xl text-white shadow-md shrink-0">
          <Activity className="animate-pulse w-6 h-6 md:w-8 md:h-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-xl font-bold font-sans text-white leading-tight truncate">
              Produção - Estação Torno CNC
            </h2>
            <p className="text-[10px] md:text-xs text-indigo-100 font-mono truncate">
              Operador: {currentUser.name} | Máquina Henrique Ativa
            </p>
          </div>
        </div>

        {/* Apontamentos e Paradas de Máquina */}
        <div className="flex flex-col gap-3 shrink-0">
          <TornoActionsWidget db={db} currentUser={currentUser} />
          <MachineStopWidget db={db} currentUser={currentUser} machineName="Torno CNC Henrique" />
        </div>

        
        <ProductivityCard db={db} currentUser={currentUser} />

        <div className="flex flex-col gap-2 mb-6 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setView("NEW_PACK")}
              className="flex-1 bg-indigo-100 text-indigo-800 p-3.5 rounded-xl text-xs font-bold hover:bg-indigo-200 transition uppercase flex items-center justify-center gap-1.5"
            >
              <Search size={15} /> Buscar OS
            </button>
            <button
              onClick={() => setView("MANUAL_PRODUCTION")}
              className="flex-1 bg-slate-100 text-slate-800 p-3.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition uppercase flex items-center justify-center gap-1.5"
            >
              <PlusCircle size={15} /> Lançar Componente
            </button>
          </div>
          <button
            onClick={() => setView("SELECT_PLAN")}
            className={`w-full p-3.5 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition uppercase tracking-wider ${
              myPcpPlans.length > 0
                ? "bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <Layers size={16} /> Ver Lotes do PCP ({myPcpPlans.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          {/* RESUMO DIÁRIO */}
          <DailySummaryWidget db={db} currentUser={currentUser} />

          <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2 text-sm mt-2">
            <Activity size={16} /> Em andamento na Prensa
          </h3>
          {activePacksList.length === 0 ? (
            <p className="text-gray-500 text-center mt-6 text-sm">
              Nenhuma OS em andamento no momento.
            </p>
          ) : (
            <div className="grid gap-2">
              {activePacksList.map((pack) => {
                const item = db.items.find((i) => i.id === pack.itemId);
                return (
                  <div
                    key={pack.id}
                    onClick={() => openFinishScreen(pack.id)}
                    className="border p-2.5 flex justify-between items-center rounded-md shadow-sm transition gap-2 bg-indigo-50 border-indigo-100 cursor-pointer hover:border-indigo-300"
                  >
                    <div className="flex items-center gap-2">
                      {item?.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded shadow-sm border border-indigo-200 cursor-pointer hover:opacity-80 transition shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullSizeImage(item.imageUrl || null);
                          }}
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5 flex-wrap">
                          <Hammer size={12} className="text-indigo-600" />{" "}
                          {pack.partName}
                          {pack.processName && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded ml-1 border border-indigo-200">
                              {pack.processName}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5 inline-flex items-center gap-1 flex-wrap">
                          <span>
                            ⏱️{" "}
                            {Date.now() - pack.startTime > 60000
                              ? `${Math.floor((Date.now() - pack.startTime) / 60000)} min atrás`
                              : "Iniciado agora"}
                          </span>
                          {pack.thirdPartyName && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="font-bold text-indigo-900 bg-indigo-50/50 px-1 py-0.5 rounded">
                                👤 {pack.thirdPartyName}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[9px] font-bold uppercase text-indigo-50 bg-indigo-600 px-2.5 py-1 rounded-full">
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
