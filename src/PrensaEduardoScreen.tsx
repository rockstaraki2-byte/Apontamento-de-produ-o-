import React, { useState, useMemo } from "react";
import {
  Hammer,
  ArrowLeft,
  Search,
  PlusCircle,
  Activity,
  User as UserIcon,
  Layers,
  Clock,
  CheckCircle2,
  Check,
  Play,
  Trash2,
  AlertCircle,
  Package,
  ChevronRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, PrensaPendingProduction, ProductionBatch, Order } from "./types";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { ScreenLayout, ScrollContainer } from "./components/Layout";
import { normalizeString } from "./searchUtils";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";

export function PrensaEduardoScreen({
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
    "Eduardo",
    "Sávio",
    "Adelaine",
    "João Pedro",
    "Outro",
  ];
  const PRENSA_PROCESSES = [
    "Corte",
    "1ª Dobra",
    "2ª Dobra",
    "3ª Dobra",
    "Dobra Completa",
    "Repuxo",
    "Estampo",
  ];

  const [selectedOperator, setSelectedOperator] = useState<string>("Eduardo");
  const [otherOperatorName, setOtherOperatorName] = useState<string>("");

  // Start OS / Process modal states
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedStartGroup, setSelectedStartGroup] = useState<any>(null);
  const [startOperator, setStartOperator] = useState<string>("Eduardo");
  const [otherStartOperator, setOtherStartOperator] = useState<string>("");
  const [startProcess, setStartProcess] = useState<string>("Corte");
  const [isCustomProcess, setIsCustomProcess] = useState<boolean>(false);
  const [customProcessName, setCustomProcessName] = useState<string>("");
  
  // Pending production tracking
  const [startingFromPendingId, setStartingFromPendingId] = useState<string | null>(null);
  const [completedProcessesForSelected, setCompletedProcessesForSelected] = useState<string[]>([]);

  // Manual production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProductSearch, setManualProductSearch] = useState("");
  const [manualParentItemId, setManualParentItemId] = useState<number | null>(null);
  const [processPerformed, setProcessPerformed] = useState<string>("Corte");

  // Search & Batch drilldown
  const [searchTerm, setSearchTerm] = useState("");
  const [planSearchTerm, setPlanSearchTerm] = useState("");
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  // Filter PCP Batches linked to Prensa Eduardo
  const pcpBatches = useMemo(() => {
    const list = (db.productionBatches || []).filter((b) => b.status !== "CONCLUIDO");
    if (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") {
      return list;
    }
    const userSectorIds = currentUser.sectorIds || [];
    const assigned = list.filter((b) => {
      const matchesOp =
        (Array.isArray(b.assignedOperatorIds) &&
          (b.assignedOperatorIds.includes(currentUser.id) ||
            b.assignedOperatorIds.includes("prensa_eduardo") ||
            b.assignedOperatorIds.some((id) => id.toLowerCase().includes("eduardo")))) ||
        b.operatorId === currentUser.id ||
        b.operatorId === "prensa_eduardo";
      const matchesSector = userSectorIds.some((sid) => String(sid) === String(b.sectorId));
      return matchesOp || matchesSector;
    });
    return assigned.length > 0 ? assigned : list;
  }, [db.productionBatches, currentUser]);

  const pendingCuttingPlans = useMemo(() => {
    return (
      db.coilCuttingPlans?.filter(
        (p) => p.status !== "CONCLUIDO" && p.type === "PRENSA_EDUARDO",
      ) || []
    );
  }, [db.coilCuttingPlans]);

  const totalPcpCount = pcpBatches.length + pendingCuttingPlans.length;

  const startPcpPlan = (planId: number) => {
    const plan = db.coilCuttingPlans?.find((p) => p.id === planId);
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
      type: "PRENSA_EDUARDO",
      taskId: plan.id,
      processName: "Corte Bobina",
      thirdPartyName: currentUser.name || "Eduardo",
    });
    db.updateCoilCuttingPlan({ ...plan, status: "EM_PRODUCAO" });
    setView("LIST_ACTIVE");
  };

  const activePacksList = db.activePacks.filter(
    (p) =>
      p.type === "PRENSA_EDUARDO" &&
      (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA"
        ? true
        : p.operatorId === currentUser.id),
  );

  const pendingProductionsList = useMemo(() => {
    return (db.prensaPendingProductions || []).sort(
      (a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0),
    );
  }, [db.prensaPendingProductions]);

  const pendingOrders = useMemo(() => {
    return (db.orders || []).filter((o) => {
      return (
        o &&
        o.status !== "EMBALADO" &&
        o.status !== "FATURADO" &&
        (o.packedQuantity || 0) < o.totalQuantity
      );
    });
  }, [db.orders]);

  const productGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        itemId: number;
        color: string;
        size: string;
        variation: string;
        customerName: string;
        orderCode: string;
        orderId: number;
        totalRemaining: number;
        overallProductTotalRemaining: number;
      }
    >();

    const customersMap = new Map<string, string>();
    (db.customers || []).forEach((c) => {
      if (c && c.name) {
        customersMap.set(c.name.toLowerCase(), c.tradeName || c.name);
      }
      if (c && c.tradeName) {
        customersMap.set(c.tradeName.toLowerCase(), c.tradeName || c.name);
      }
    });

    const productTotals = new Map<string, number>();
    pendingOrders.forEach((o) => {
      const productKey = `${o.itemId}|${o.color}|${o.size}|${o.variation}`;
      const remaining = Math.max(
        0,
        o.totalQuantity - (o.packedQuantity || 0),
      );
      productTotals.set(
        productKey,
        (productTotals.get(productKey) || 0) + remaining,
      );
    });

    pendingOrders.forEach((o) => {
      const customerNameLower = (o.customerName || "").toLowerCase();
      const customerDisplayName =
        customersMap.get(customerNameLower) || o.customerName || "";

      const key = `${customerDisplayName}|${o.orderCode}|${o.itemId}|${o.color}|${o.size}|${o.variation}`;
      const remaining = Math.max(
        0,
        o.totalQuantity - (o.packedQuantity || 0),
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
          orderCode: o.orderCode || `#${o.id}`,
          orderId: o.id,
          totalRemaining: 0,
          overallProductTotalRemaining: overallTotal,
        });
      }
      const g = groups.get(key)!;
      g.totalRemaining += remaining;
    });

    return Array.from(groups.values());
  }, [pendingOrders, db.customers]);

  // Open modal to start an OS / item
  const startProduction = (
    group: any,
    pendingId: string | null = null,
    completedProcesses: string[] = [],
    batchInfo?: { id: number; name: string },
  ) => {
    setSelectedStartGroup({
      ...group,
      associatedBatchId: batchInfo?.id || group.associatedBatchId,
      associatedBatchName: batchInfo?.name || group.associatedBatchName,
    });
    setStartingFromPendingId(pendingId);
    setCompletedProcessesForSelected(completedProcesses);

    setStartOperator("Eduardo");
    setOtherStartOperator("");
    setIsCustomProcess(false);
    setCustomProcessName("");

    // Find first process not yet completed
    const availableProc = PRENSA_PROCESSES.find(
      (p) => !completedProcesses.includes(p),
    );
    setStartProcess(availableProc || PRENSA_PROCESSES[0]);

    setStartModalOpen(true);
  };

  const confirmStartProduction = () => {
    if (!selectedStartGroup) return;
    const g = selectedStartGroup;

    const opName =
      startOperator === "Outro" ? otherStartOperator : startOperator;
    const finalProcess = isCustomProcess ? customProcessName : startProcess;

    const itemName =
      g.partName || db.items.find((i) => i.id === g.itemId)?.name || "Produto";

    db.addActivePack({
      id: Date.now(),
      itemId: g.itemId,
      color: g.color || "-",
      size: g.size || "-",
      variation: g.variation || "-",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "PRENSA_EDUARDO",
      partName: itemName,
      taskId: g.orderId || 0,
      processName: finalProcess,
      thirdPartyName: opName,
      customerName: g.customerName,
      orderCode: g.orderCode,
      associatedBatchId: g.associatedBatchId,
      associatedBatchName: g.associatedBatchName,
      pendingProductionId: startingFromPendingId || undefined,
      previousProcesses: completedProcessesForSelected,
      partialQuantity: g.quantity || undefined,
    } as any);

    // If starting from a batch, set batch status to EM_PRODUCAO
    if (g.associatedBatchId) {
      const batch = db.productionBatches.find((b) => b.id === g.associatedBatchId);
      if (batch && batch.status === "PENDENTE") {
        db.updateProductionBatch({ ...batch, status: "EM_PRODUCAO" });
      }
    }

    setStartModalOpen(false);
    setSelectedStartGroup(null);
    setStartingFromPendingId(null);
    setCompletedProcessesForSelected([]);
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
      if (activePack.partialQuantity) {
        setPackQuantity(activePack.partialQuantity);
      } else {
        setPackQuantity("");
      }
    }
    setSelectedPackId(packId);
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
    const mProcess = options.processPerformed || processPerformed;
    const updateOS = options.updateOS === true; // ONLY update OS when explicitly finalized!

    db.addLogs([
      {
        id: Date.now(),
        operatorId: currentUser.id,
        quantityProcessed: qty,
        type: "PRENSA_EDUARDO",
        timestamp: Date.now(),
        durationMillis,
        customOperatorName: finalOperatorName,
        customProductName: isManual ? mTitle : undefined,
        parentItemId: isManual && mParent ? mParent : undefined,
        processPerformed: mProcess,
        associatedBatchId: activePack.associatedBatchId,
      },
    ]);

    let changedOrders: Order[] = [];
    if (!isManual && updateOS) {
      let ordersForProduct = pendingOrders.filter(
        (o) =>
          o.itemId === activePack.itemId &&
          (activePack.color && activePack.color !== "-" ? o.color === activePack.color : true) &&
          (activePack.size && activePack.size !== "-" ? o.size === activePack.size : true) &&
          (activePack.variation && activePack.variation !== "-" ? o.variation === activePack.variation : true) &&
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
          (o) => o.itemId === activePack.itemId,
        );
      }

      ordersForProduct.sort((a, b) => {
        const dateA = new Date(a.deliveryDate).getTime() || a.createdAt;
        const dateB = new Date(b.deliveryDate).getTime() || b.createdAt;
        if (dateA !== dateB) return dateA - dateB;
        return a.createdAt - b.createdAt;
      });

      let qtyToAllocate = qty;
      for (const o of ordersForProduct) {
        if (qtyToAllocate <= 0) break;
        const remaining = Math.max(0, o.totalQuantity - (o.packedQuantity || 0));
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
      }
    }

    const attendedOrdersText = changedOrders
      .map((o) => (o.orderCode ? `#${o.orderCode}` : `#${o.id}`))
      .filter(Boolean);
    const ordersSuffix =
      attendedOrdersText.length > 0
        ? ` (Pedidos: ${attendedOrdersText.join(", ")})`
        : "";

    if (isManual) {
      const parentName = mParent
        ? db.items.find((i) => i.id === mParent)?.name
        : "";
      db.addNotification({
        message: `Prensa: ${qty} un. de "${mTitle}" ${parentName ? `p/ produto ${parentName} ` : ""}(${mProcess}) via ${finalOperatorName}`,
        read: false,
        tenantId: db.activeTenantId || currentUser.tenantId || "imperio",
      });
    } else if (updateOS) {
      const itemName =
        db.items.find((i) => i.id === activePack.itemId)?.name || "Item";
      db.addNotification({
        message: `Prensa: ${qty} un. de ${itemName} FINALIZADAS (Produção Total Concluída) por ${finalOperatorName}${ordersSuffix}`,
        read: false,
        tenantId: db.activeTenantId || currentUser.tenantId || "imperio",
      });
    } else {
      const itemName =
        db.items.find((i) => i.id === activePack.itemId)?.name || "Item";
      db.addNotification({
        message: `Prensa: ${qty} un. de ${itemName} - Etapa "${mProcess}" concluída por ${finalOperatorName} (Produção Pendente)`,
        read: false,
        tenantId: db.activeTenantId || currentUser.tenantId || "imperio",
      });
    }
  };

  /**
   * Action 1: Finalizar Processo Atual e Mover para Produções Pendentes
   */
  const handleFinishProcessToPending = () => {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack || !packQuantity || Number(packQuantity) <= 0) return;

    const qty = Number(packQuantity);
    const isManual = activePack.itemId === 0;
    const finalOperatorName =
      selectedOperator === "Outro" ? otherOperatorName : selectedOperator;
    const processDone = activePack.processName || "Corte";

    // 1. Registra Log de Produção da etapa
    finalizeLog(
      qty,
      Date.now() - activePack.startTime,
      activePack,
      isManual,
      {
        manualTitle: isManual ? activePack.partName : undefined,
        parentItemId: isManual ? Number(activePack.thirdPartyName) : undefined,
        processPerformed: processDone,
        updateOS: false, // NÃO finaliza a OS ainda
      },
    );

    // 2. Cria ou Atualiza o Bloco de Produções Pendentes
    const existingPending = activePack.pendingProductionId
      ? db.prensaPendingProductions?.find(
          (p) => p.id === activePack.pendingProductionId,
        )
      : null;

    if (existingPending) {
      const updatedProcesses = Array.from(
        new Set([...(existingPending.completedProcesses || []), processDone]),
      );
      db.updatePrensaPendingProduction(existingPending.id, {
        quantity: qty,
        completedProcesses: updatedProcesses,
        lastProcess: processDone,
        lastOperator: finalOperatorName,
        lastTimestamp: Date.now(),
      });
    } else {
      const newCompleted = Array.from(
        new Set([
          ...(activePack.previousProcesses || []),
          processDone,
        ]),
      );
      db.addPrensaPendingProduction({
        itemId: activePack.itemId,
        partName:
          activePack.partName ||
          (isManual ? manualTitle : "Peça da Prensa"),
        customerName: activePack.customerName,
        orderCode: activePack.orderCode,
        color: activePack.color,
        size: activePack.size,
        variation: activePack.variation,
        associatedBatchId: activePack.associatedBatchId,
        associatedBatchName: activePack.associatedBatchName,
        quantity: qty,
        completedProcesses: newCompleted,
        lastProcess: processDone,
        lastOperator: finalOperatorName,
        lastTimestamp: Date.now(),
        operatorId: currentUser.id,
        tenantId: db.activeTenantId || currentUser.tenantId || "imperio",
      });
    }

    // 3. Remove dos Packs Ativos
    db.removeActivePack(activePack.id);
    setSelectedPackId(null);
    setPackQuantity("");
    setView("LIST_ACTIVE");
  };

  /**
   * Action 2: Finalizar Produção Total da Peça (Concluir Produto na Prensa e Atualizar OS)
   */
  const handleFinalizeTotalProduction = () => {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack || !packQuantity || Number(packQuantity) <= 0) return;

    const qty = Number(packQuantity);
    const isManual = activePack.itemId === 0;

    // 1. Registra Log e atualiza a OS com as peças concluídas
    finalizeLog(
      qty,
      Date.now() - activePack.startTime,
      activePack,
      isManual,
      {
        manualTitle: isManual ? activePack.partName : undefined,
        parentItemId: isManual ? Number(activePack.thirdPartyName) : undefined,
        processPerformed: activePack.processName || "Produção Concluída",
        updateOS: true, // Item consta como produzido pela prensa!
      },
    );

    // 2. Se veio de produções pendentes, remove do bloco de pendentes
    if (activePack.pendingProductionId) {
      db.removePrensaPendingProduction(activePack.pendingProductionId);
    }

    // 3. Remove dos Packs Ativos
    db.removeActivePack(activePack.id);
    setSelectedPackId(null);
    setPackQuantity("");
    setView("LIST_ACTIVE");
  };

  /**
   * Finalizar Produção Total Direto do Card de Pendentes
   */
  const directFinalizePending = (item: PrensaPendingProduction) => {
    if (
      !confirm(
        `Deseja finalizar a produção total de ${item.quantity} un. de "${item.partName}" na Prensa e computar como produzido no sistema?`,
      )
    ) {
      return;
    }

    finalizeLog(
      item.quantity,
      60000,
      {
        itemId: item.itemId,
        color: item.color,
        size: item.size,
        variation: item.variation,
        customerName: item.customerName,
        orderCode: item.orderCode,
        associatedBatchId: item.associatedBatchId,
      },
      item.itemId === 0,
      {
        manualTitle: item.partName,
        processPerformed: `Todos os processos (${(item.completedProcesses || []).join(", ")})`,
        updateOS: true,
      },
    );

    db.removePrensaPendingProduction(item.id);
  };

  const handleManualProduction = () => {
    if (!manualTitle || !manualParentItemId) return;

    db.addActivePack({
      id: Date.now(),
      itemId: 0,
      color: "-",
      size: "-",
      variation: "-",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "PRENSA_EDUARDO",
      partName: manualTitle,
      taskId: 0,
      processName: processPerformed,
      thirdPartyName: currentUser.name || "Eduardo",
    } as any);

    setManualTitle("");
    setManualParentItemId(null);
    setManualProductSearch("");
    setView("LIST_ACTIVE");
  };

  // -------------------------------------------------------------
  // VIEW: MANUAL PRODUCTION (LANÇAMENTO DE COMPONENTE)
  // -------------------------------------------------------------
  if (view === "MANUAL_PRODUCTION") {
    const searchedItems = db.items
      .filter((i) =>
        i.name.toLowerCase().includes(manualProductSearch.toLowerCase()),
      )
      .slice(0, 5);

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
            Registre a produção de componentes avulsos e defina a etapa inicial.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Nome da Peça / Componente
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500"
              placeholder="Ex: Chapa fixadora 10cm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Faz parte de qual Produto?
            </label>
            <input
              type="text"
              value={manualProductSearch}
              onChange={(e) => {
                setManualProductSearch(e.target.value);
                setManualParentItemId(null);
              }}
              className="border p-2 rounded focus:outline-indigo-500 bg-indigo-50"
              placeholder="Buscar produto base..."
            />

            {!manualParentItemId && manualProductSearch.length > 2 && (
              <ul className="border my-1 max-h-32 overflow-auto rounded bg-white shadow-sm z-10">
                {searchedItems.map((i) => (
                  <li
                    key={i.id}
                    onClick={() => {
                      setManualParentItemId(i.id);
                      setManualProductSearch(i.name);
                    }}
                    className="p-2 text-sm border-b hover:bg-indigo-50 cursor-pointer font-medium"
                  >
                    {i.name}
                  </li>
                ))}
              </ul>
            )}
            {manualParentItemId && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded inline-block mt-1 w-fit">
                Produto Selecionado ✓
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Processo Inicial a Executar
            </label>
            <select
              value={processPerformed}
              onChange={(e) => setProcessPerformed(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500 bg-white"
            >
              {PRENSA_PROCESSES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleManualProduction}
            disabled={!manualTitle || !manualParentItemId}
            className="bg-indigo-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Activity size={18} /> Iniciar Processo
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: SELECT_PLAN (LOTES DO PCP & PROGRAMAÇÕES INDUSTRIAIS)
  // -------------------------------------------------------------
  if (view === "SELECT_PLAN") {
    const filteredBatches = pcpBatches.filter((b) => {
      const search = planSearchTerm.toLowerCase();
      const nameMatch = (b.name || "").toLowerCase().includes(search);
      const ordersMatch = (b.orderIds || []).some((oid) => {
        const o = db.orders.find((ord) => ord.id === oid);
        return (
          o &&
          ((o.orderCode || "").toLowerCase().includes(search) ||
            (o.customerName || "").toLowerCase().includes(search))
        );
      });
      return nameMatch || ordersMatch;
    });

    const filteredCuttingPlans = pendingCuttingPlans.filter((p) =>
      (p.name || "").toLowerCase().includes(planSearchTerm.toLowerCase()),
    );

    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-indigo-600" /> Selecionar Lotes do PCP
          </h2>
          <span className="text-xs bg-indigo-100 text-indigo-800 font-extrabold px-2.5 py-1 rounded-full">
            {totalPcpCount} Disponíveis
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-3 text-left">
          Selecione um lote de produção do PCP programado para o seu perfil e escolha a peça para iniciar as etapas na Prensa.
        </p>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Filtrar por lote, OS, cliente ou produto..."
            value={planSearchTerm}
            onChange={(e) => setPlanSearchTerm(e.target.value)}
            className="border border-indigo-200 pl-9 pr-3 py-2 rounded-xl text-sm w-full focus:outline-indigo-500 bg-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto w-full flex flex-col gap-4 pb-8">
          {/* SEÇÃO: LOTES DE PRODUÇÃO DO PCP */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-indigo-600" /> Lotes Industriais ({filteredBatches.length})
              </h3>
            </div>

            {filteredBatches.length === 0 ? (
              <div className="bg-gray-50 border border-dashed rounded-xl p-5 text-center text-xs text-gray-500">
                Nenhum lote de produção atribuído ao operador no momento.
              </div>
            ) : (
              <div className="grid gap-2.5">
                {filteredBatches.map((batch) => {
                  const isExpanded = expandedBatchId === batch.id;
                  const batchOrders = (db.orders || []).filter((o) =>
                    (batch.orderIds || []).includes(o.id),
                  );

                  return (
                    <div
                      key={batch.id}
                      className="bg-white border border-indigo-150 rounded-xl shadow-xs overflow-hidden transition hover:border-indigo-300 text-left"
                    >
                      <div
                        onClick={() =>
                          setExpandedBatchId(isExpanded ? null : batch.id)
                        }
                        className="p-3.5 flex items-center justify-between cursor-pointer bg-slate-50/70 hover:bg-indigo-50/50 transition"
                      >
                        <div className="flex flex-col flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">
                              📦 {batch.name}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                batch.status === "EM_PRODUCAO"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-indigo-100 text-indigo-800"
                              }`}
                            >
                              {batch.status === "EM_PRODUCAO"
                                ? "Em Andamento"
                                : "Pendente"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                            <span>
                              {batchOrders.length} {batchOrders.length === 1 ? "pedido/item" : "pedidos/itens"}
                            </span>
                            {batch.deadline && (
                              <>
                                <span>•</span>
                                <span>Prazo: {new Date(batch.deadline).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs hover:bg-indigo-700 transition"
                          >
                            {isExpanded ? "Fechar" : "Ver Itens"}
                            <ChevronRight
                              size={14}
                              className={`transform transition ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Itens do Lote */}
                      {isExpanded && (
                        <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-2">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            Selecione o produto para produzir na Prensa:
                          </span>
                          {batchOrders.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-2">
                              Nenhum pedido vinculado a este lote.
                            </p>
                          ) : (
                            batchOrders.map((ord) => {
                              const item = db.items.find((i) => i.id === ord.itemId);
                              const remaining = Math.max(
                                0,
                                ord.totalQuantity - (ord.producedQuantity || 0),
                              );
                              return (
                                <div
                                  key={ord.id}
                                  onClick={() =>
                                    startProduction(
                                      {
                                        itemId: ord.itemId,
                                        partName: item?.name || "Item",
                                        customerName: ord.customerName,
                                        orderCode: ord.orderCode || `#${ord.id}`,
                                        orderId: ord.id,
                                        color: ord.color,
                                        size: ord.size,
                                        variation: ord.variation,
                                        quantity: remaining,
                                      },
                                      null,
                                      [],
                                      { id: batch.id, name: batch.name },
                                    )
                                  }
                                  className="p-2.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer flex items-center justify-between transition gap-2"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {item?.imageUrl && (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-10 h-10 object-cover rounded shadow-xs border shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0 flex flex-col">
                                      <span className="font-bold text-xs text-slate-900 truncate">
                                        {item?.name || "Produto"}
                                      </span>
                                      <span className="text-[10px] text-slate-500 truncate">
                                        OS: <strong className="text-slate-800">{ord.orderCode || `#${ord.id}`}</strong> | Cliente: {ord.customerName}
                                      </span>
                                      <span className="text-[10px] text-indigo-700 font-medium">
                                        Restante p/ Produzir: <strong>{remaining} pçs</strong>
                                      </span>
                                    </div>
                                  </div>
                                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-md shrink-0 flex items-center gap-1 shadow-xs">
                                    <Play size={12} fill="currentColor" /> Produzir
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
          </div>

          {/* SEÇÃO: PLANOS DE CORTE & DOBRA DO PCP */}
          {pendingCuttingPlans.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hammer size={14} className="text-indigo-600" /> Planos de Dobra & Prensa ({filteredCuttingPlans.length})
              </h3>
              <div className="grid gap-2">
                {filteredCuttingPlans.map((plan) => {
                  const targetItem =
                    plan.targetItemIds && plan.targetItemIds.length > 0
                      ? db.items.find((i) => i.id === plan.targetItemIds[0])
                      : null;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => startPcpPlan(plan.id)}
                      className="bg-white p-3 border border-indigo-200 flex justify-between items-center rounded-xl shadow-xs cursor-pointer hover:border-indigo-400 hover:shadow-sm transition group text-left"
                    >
                      <div className="flex flex-col flex-1 pl-1 border-l-4 border-indigo-500">
                        <span className="font-bold text-xs text-gray-800 pl-2">
                          {plan.name}
                        </span>
                        {targetItem && (
                          <span className="text-[11px] text-gray-500 mt-0.5 pl-2 font-medium">
                            📦 Peça: <strong className="text-slate-800">{targetItem.name}</strong>
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 pl-2">
                          Meta: <strong>{plan.targetQuantity || "N/A"} pçs</strong>
                        </span>
                      </div>
                      <button className="text-xs bg-indigo-600 text-white font-bold py-1 px-3 rounded-lg">
                        INICIAR
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: FINISH_PACK (FINALIZAR PROCESSO DA ETAPA)
  // -------------------------------------------------------------
  if (view === "FINISH_PACK" && selectedPackId) {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack) return null;
    const item = db.items.find((i) => i.id === activePack.itemId);

    const prevProcesses = activePack.previousProcesses || [];

    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border w-full flex flex-col gap-4 text-center">
          {item?.imageUrl && (
            <div className="flex justify-center mb-1">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-28 h-28 object-cover rounded-xl shadow-md border border-slate-200 cursor-pointer hover:opacity-80 transition"
                onClick={() => setFullSizeImage(item.imageUrl || null)}
              />
            </div>
          )}

          <div>
            <h3 className="font-bold text-lg md:text-xl text-gray-800">
              {activePack.itemId === 0
                ? "Lançamento Avulso de Componente"
                : activePack.partName || "OS Desconhecida"}
            </h3>

            {activePack.customerName && (
              <p className="text-xs text-indigo-900 font-medium mt-0.5">
                Cliente: <strong>{activePack.customerName}</strong> {activePack.orderCode && `| OS: ${activePack.orderCode}`}
              </p>
            )}

            {activePack.associatedBatchName && (
              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded uppercase border border-amber-200 inline-block mt-1">
                📦 Lote: {activePack.associatedBatchName}
              </span>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
              <span className="text-xs bg-indigo-600 text-white font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wide">
                ⚙️ Etapa em Execução: {activePack.processName || "Corte"}
              </span>
            </div>

            {prevProcesses.length > 0 && (
              <div className="mt-2 text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Etapas já concluídas nesta peça:
                </span>
                <div className="flex flex-wrap gap-1">
                  {prevProcesses.map((proc) => (
                    <span
                      key={proc}
                      className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200"
                    >
                      <Check size={10} /> {proc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-gray-500 text-xs mt-2">
              ⏱️ Tempo corrido:{" "}
              {Math.floor((Date.now() - activePack.startTime) / 60000)} minutos
            </p>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl flex flex-col gap-3 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Operador(a) que realizou o processo
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRENSA_OPERATORS.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setSelectedOperator(op)}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition ${
                    selectedOperator === op
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
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
                placeholder="Digite o nome do operador..."
                className="border p-2 rounded-lg text-xs w-full focus:outline-indigo-500 bg-white"
              />
            )}

            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-1">
              Quantidade de Peças Produzidas nesta Etapa:
            </label>
            <input
              type="number"
              min="1"
              value={packQuantity}
              onChange={(e) => setPackQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex: 50"
              className="border border-indigo-300 p-3 rounded-xl text-2xl font-black text-center text-indigo-900 bg-white focus:outline-indigo-500"
            />
          </div>

          {/* BOTÕES DE AÇÃO DE FINALIZAÇÃO */}
          <div className="flex flex-col gap-2.5 mt-2">
            {/* Opção 1: Finalizar Processo e Mover para Produções Pendentes */}
            <button
              onClick={handleFinishProcessToPending}
              disabled={
                !packQuantity ||
                Number(packQuantity) <= 0 ||
                (selectedOperator === "Outro" && !otherOperatorName)
              }
              className="bg-indigo-600 text-white font-bold p-3.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex flex-col items-center justify-center shadow-md cursor-pointer"
            >
              <span className="text-sm flex items-center gap-1.5">
                <RotateCcw size={16} /> Finalizar Processo e Mover p/ Produções Pendentes
              </span>
              <span className="text-[10px] text-indigo-100 font-normal mt-0.5">
                Salva o processo executado e deixa a peça aguardando próximas etapas.
              </span>
            </button>

            {/* Opção 2: Finalizar Produção Total da Peça */}
            <button
              onClick={handleFinalizeTotalProduction}
              disabled={
                !packQuantity ||
                Number(packQuantity) <= 0 ||
                (selectedOperator === "Outro" && !otherOperatorName)
              }
              className="bg-emerald-600 text-white font-bold p-3.5 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex flex-col items-center justify-center shadow-md cursor-pointer"
            >
              <span className="text-sm flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Concluir Produção Total da Peça (Finalizar na Prensa)
              </span>
              <span className="text-[10px] text-emerald-100 font-normal mt-0.5">
                Computa o produto como 100% produzido na Prensa e atualiza a OS no sistema.
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: NEW_PACK (BUSCA DIRETA DE OS)
  // -------------------------------------------------------------
  if (view === "NEW_PACK") {
    const filteredGroups = productGroups.filter((g) => {
      const item = db.items.find((i) => i.id === g.itemId);
      const searchStr = normalizeString(
        `${item?.name || ""} ${g.customerName} ${g.orderCode} ${g.color} ${g.size} ${g.variation}`,
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
        <h2 className="text-xl font-bold mb-2 text-gray-800">
          Buscar Ordem de Serviço (OS)
        </h2>
        <p className="text-xs text-gray-500 mb-3 text-left">
          Selecione a OS para iniciar a primeira etapa de corte ou dobra.
        </p>

        <input
          type="text"
          placeholder="Pesquisar produto, cliente ou nº de OS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-2.5 rounded-xl mb-4 text-sm w-full focus:outline-indigo-500"
        />

        <div className="flex-1 overflow-y-auto w-full">
          {filteredGroups.length === 0 ? (
            <p className="text-gray-500 text-center mt-4 border border-dashed p-6 rounded-xl text-xs">
              Nenhuma OS pendente encontrada.
            </p>
          ) : (
            <div className="grid gap-2.5">
              {filteredGroups.map((group, idx) => {
                const item = db.items.find((i) => i.id === group.itemId);
                return (
                  <div
                    key={idx}
                    onClick={() => startProduction(group)}
                    className="bg-white p-3.5 border border-gray-200 flex flex-col justify-between items-start rounded-xl shadow-xs cursor-pointer hover:border-indigo-400 hover:shadow-sm transition gap-2.5 text-left"
                  >
                    <div className="flex items-start gap-3 w-full">
                      {item?.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-lg shadow-xs border shrink-0"
                        />
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] tracking-wide font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded">
                            OS: {group.orderCode}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate">
                            {group.customerName}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm mt-1 truncate">
                          {item?.name || "Item desconhecido"}
                        </span>
                        <span className="text-[11px] text-indigo-600 font-bold mt-0.5">
                          Restante: {group.totalRemaining} pçs
                        </span>
                      </div>
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

  // -------------------------------------------------------------
  // VIEW PRINCIPAL: LIST_ACTIVE (DASHBOARD PRENSA EDUARDO)
  // -------------------------------------------------------------
  return (
    <ScreenLayout className="bg-slate-50 relative">
      <ScrollContainer
        paddingSize="dense"
        className="w-full max-w-2xl mx-auto flex flex-col gap-4"
      >
        {/* Header Widget */}
        <div className="flex items-center gap-2.5 md:gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 p-3.5 md:p-4 rounded-2xl text-white shadow-md shrink-0">
          <Activity className="animate-pulse w-6 h-6 md:w-8 md:h-8 shrink-0" />
          <div className="min-w-0 flex-1 text-left">
            <h2 className="text-base md:text-xl font-bold font-sans text-white leading-tight truncate">
              Produção - Estação Dobra & Prensa
            </h2>
            <p className="text-[10px] md:text-xs text-indigo-100 font-mono truncate">
              Operador: {currentUser.name} | Máquina Prensa Eduardo
            </p>
          </div>
        </div>

        <ProductivityCard db={db} currentUser={currentUser} />

        {/* Apontamento de Paradas de Máquina */}
        <MachineStopWidget
          db={db}
          currentUser={currentUser}
          machineName="Prensa Eduardo"
        />

        {/* AÇÕES RÁPIDAS */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setView("SELECT_PLAN")}
              className={`flex-1 p-3.5 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition uppercase tracking-wider ${
                totalPcpCount > 0
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Layers size={16} /> Selecionar Lotes do PCP ({totalPcpCount})
            </button>
            <button
              onClick={() => setView("NEW_PACK")}
              className="bg-indigo-100 text-indigo-800 p-3.5 rounded-xl text-xs font-bold hover:bg-indigo-200 transition uppercase flex items-center justify-center gap-1.5 shrink-0"
            >
              <Search size={15} /> Buscar OS
            </button>
          </div>
          <button
            onClick={() => setView("MANUAL_PRODUCTION")}
            className="w-full bg-slate-100 text-slate-800 p-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition uppercase flex items-center justify-center gap-1.5 border border-slate-200"
          >
            <PlusCircle size={15} /> Lançar Componente Avulso
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full flex flex-col gap-4">
          {/* RESUMO DIÁRIO */}
          <DailySummaryWidget db={db} currentUser={currentUser} />

          {/* ------------------------------------------------------------- */}
          {/* SEÇÃO 1: EM ANDAMENTO NA PRENSA (ACTIVE PACKS) */}
          {/* ------------------------------------------------------------- */}
          <div className="text-left">
            <h3 className="font-bold text-gray-800 mb-2 border-b pb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-indigo-800">
                <Activity size={16} className="text-indigo-600 animate-pulse" /> Em Andamento na Prensa ({activePacksList.length})
              </span>
            </h3>

            {activePacksList.length === 0 ? (
              <div className="border border-dashed rounded-xl p-4 text-center text-xs text-gray-400 bg-white">
                Nenhum processo em execução neste momento.
              </div>
            ) : (
              <div className="grid gap-2">
                {activePacksList.map((pack) => {
                  const item = db.items.find((i) => i.id === pack.itemId);
                  return (
                    <div
                      key={pack.id}
                      onClick={() => openFinishScreen(pack.id)}
                      className="border p-3 flex justify-between items-center rounded-xl shadow-xs transition gap-2 bg-indigo-50/70 border-indigo-200 cursor-pointer hover:border-indigo-400 hover:bg-indigo-100/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item?.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-11 h-11 object-cover rounded-lg shadow-xs border border-indigo-200 cursor-pointer hover:opacity-80 transition shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullSizeImage(item.imageUrl || null);
                            }}
                          />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5 flex-wrap truncate">
                            <Hammer size={13} className="text-indigo-600 shrink-0" />
                            {pack.partName}
                            {pack.processName && (
                              <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded-md">
                                {pack.processName}
                              </span>
                            )}
                          </span>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5 flex-wrap">
                            <span>
                              ⏱️{" "}
                              {Date.now() - pack.startTime > 60000
                                ? `${Math.floor((Date.now() - pack.startTime) / 60000)} min atrás`
                                : "Iniciado agora"}
                            </span>
                            {pack.thirdPartyName && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="font-bold text-indigo-900 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                                  👤 {pack.thirdPartyName}
                                </span>
                              </>
                            )}
                            {pack.associatedBatchName && (
                              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                📦 {pack.associatedBatchName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <button className="text-[10px] font-bold uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-xs transition">
                          Finalizar Etapa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SEÇÃO 2: NOVO BLOCO - PRODUÇÕES PENDENTES (PRÓXIMAS ETAPAS) */}
          {/* ------------------------------------------------------------- */}
          <div className="text-left mt-2">
            <div className="flex items-center justify-between border-b pb-1.5 mb-2">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <RotateCcw size={16} className="text-amber-600" />
                <span>Produções Pendentes (Aguardando Próximos Processos)</span>
              </h3>
              <span className="text-xs bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full">
                {pendingProductionsList.length}
              </span>
            </div>

            {pendingProductionsList.length === 0 ? (
              <div className="border border-dashed rounded-xl p-5 text-center bg-white text-gray-400 text-xs flex flex-col items-center justify-center gap-1">
                <RotateCcw size={20} className="text-gray-300" />
                <span>Nenhuma produção pendente no momento.</span>
                <span className="text-[11px] text-gray-400">
                  Quando finalizar uma etapa parcial, o item ficará listado aqui para acionar as próximas etapas.
                </span>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {pendingProductionsList.map((item) => {
                  const dbItem = db.items.find((i) => i.id === item.itemId);
                  const completed = item.completedProcesses || [];

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 hover:border-amber-400 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {dbItem?.imageUrl && (
                            <img
                              src={dbItem.imageUrl}
                              alt={item.partName}
                              className="w-12 h-12 object-cover rounded-lg shadow-xs border border-amber-200 shrink-0"
                            />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-gray-900 truncate">
                              {item.partName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-wrap mt-0.5">
                              {item.orderCode && (
                                <span className="font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  OS: {item.orderCode}
                                </span>
                              )}
                              {item.customerName && (
                                <span className="truncate">{item.customerName}</span>
                              )}
                              {item.associatedBatchName && (
                                <span className="bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                                  📦 Lote: {item.associatedBatchName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] font-bold uppercase text-amber-800">
                            Quantidade
                          </span>
                          <span className="font-black text-lg text-amber-700">
                            {item.quantity} pçs
                          </span>
                        </div>
                      </div>

                      {/* Lista de processos já executados */}
                      <div className="bg-amber-50/60 border border-amber-100 p-2 rounded-lg flex flex-col gap-1 text-xs">
                        <span className="text-[10px] font-extrabold uppercase text-amber-900 tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          Processos já realizados:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {completed.map((proc) => (
                            <span
                              key={proc}
                              className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-200"
                            >
                              <Check size={10} /> {proc}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          Última etapa: <strong>{item.lastProcess}</strong> por {item.lastOperator} ({new Date(item.lastTimestamp).toLocaleDateString()} às {new Date(item.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>

                      {/* Botões de Ação para o Item Pendente */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() =>
                            startProduction(
                              {
                                itemId: item.itemId,
                                partName: item.partName,
                                customerName: item.customerName,
                                orderCode: item.orderCode,
                                color: item.color,
                                size: item.size,
                                variation: item.variation,
                                quantity: item.quantity,
                                associatedBatchId: item.associatedBatchId,
                                associatedBatchName: item.associatedBatchName,
                              },
                              item.id,
                              item.completedProcesses || [],
                            )
                          }
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <Play size={13} fill="currentColor" /> Iniciar Próximo Processo
                        </button>

                        <button
                          onClick={() => directFinalizePending(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2.5 rounded-lg text-xs flex items-center gap-1 transition shadow-xs cursor-pointer"
                          title="Concluir toda a produção desta peça e atualizar OS"
                        >
                          <CheckCircle2 size={13} /> Concluir Total
                        </button>

                        <button
                          onClick={() => {
                            if (confirm("Remover este item de produções pendentes?")) {
                              db.removePrensaPendingProduction(item.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                          title="Excluir pendência"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollContainer>

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE INICIO DE PROCESSO (SELEÇÃO DE OPERADOR E PROCESSO) */}
      {/* ------------------------------------------------------------- */}
      {startModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border rounded-2xl shadow-xl w-full max-w-sm flex flex-col p-5 gap-4 my-auto max-h-[92vh] overflow-y-auto text-left">
            <div className="flex flex-col gap-1 border-b pb-3 shrink-0 text-center">
              <h3 className="font-bold text-lg text-gray-900">
                Iniciar Processo na Prensa
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {selectedStartGroup?.partName ||
                  db.items.find((i) => i.id === selectedStartGroup?.itemId)?.name ||
                  "Produto Selecionado"}
              </p>
              {completedProcessesForSelected.length > 0 && (
                <div className="mt-1 bg-amber-50 p-2 rounded-lg border border-amber-200 text-left">
                  <span className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                    Processos Já Concluídos nesta peça:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {completedProcessesForSelected.map((proc) => (
                      <span
                        key={proc}
                        className="bg-amber-200/80 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                      >
                        <Check size={10} /> {proc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Processo a Executar
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomProcess(!isCustomProcess)}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  {isCustomProcess ? "Escolher da Lista" : "+ Outro Processo"}
                </button>
              </div>

              {isCustomProcess ? (
                <input
                  type="text"
                  value={customProcessName}
                  onChange={(e) => setCustomProcessName(e.target.value)}
                  placeholder="Digite o processo (ex: Furação Especial)..."
                  className="border border-indigo-300 p-2.5 rounded-lg text-xs w-full focus:outline-indigo-500"
                />
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {PRENSA_PROCESSES.map((proc) => {
                    const isAlreadyDone =
                      completedProcessesForSelected.includes(proc);

                    return (
                      <button
                        key={proc}
                        disabled={isAlreadyDone}
                        onClick={() => setStartProcess(proc)}
                        type="button"
                        className={`py-2 px-1.5 text-[11px] font-bold rounded-lg border transition-all flex flex-col items-center justify-center ${
                          isAlreadyDone
                            ? "bg-slate-100 border-slate-200 text-slate-400 line-through opacity-50 cursor-not-allowed"
                            : startProcess === proc
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{proc}</span>
                        {isAlreadyDone && (
                          <span className="text-[8px] font-normal no-underline not-italic text-slate-400">
                            (Já realizado)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex flex-col gap-2 mt-1 shrink-0">
              <button
                disabled={
                  !startOperator ||
                  (startOperator === "Outro" && !otherStartOperator) ||
                  (isCustomProcess ? !customProcessName : !startProcess)
                }
                onClick={confirmStartProduction}
                className={`w-full py-3 rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                  startOperator &&
                  (startOperator !== "Outro" || otherStartOperator) &&
                  (isCustomProcess ? customProcessName : startProcess)
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
                  setStartingFromPendingId(null);
                  setCompletedProcessesForSelected([]);
                }}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-xl transition text-center focus:outline-none"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image zoom modal */}
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
