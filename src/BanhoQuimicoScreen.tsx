import React, { useState } from "react";
import {
  Package,
  Activity,
  ArrowLeft,
  Search,
  PlusCircle,
  Factory,
  Beaker,
  Layers,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, OrderStatus } from "./types";
import { calculateWorkingMillis } from "./timeUtils";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { normalizeString } from "./searchUtils";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";

const getProductKey = (
  itemId: number,
  color: string,
  size: string,
  variation: string,
) => `${itemId}|${color}|${size}|${variation}`;

export function BanhoQuimicoScreen({
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
  const [packQuantity, setPackQuantity] = useState<string>("");
  const [qtyPerPackage, setQtyPerPackage] = useState<string>("");
  const [measurementUnit, setMeasurementUnit] = useState<
    "PÇS" | "SACOS" | "CAIXAS" | "KG"
  >("PÇS");

  // Manual production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProduct, setManualProduct] = useState("");
  const [manualQty, setManualQty] = useState<string>("");
  const [manualUnit, setManualUnit] = useState<"PÇS" | "SACOS" | "CAIXAS">(
    "PÇS",
  );

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [operatorModalTarget, setOperatorModalTarget] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

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
      type: "BANHO_QUIMICO",
      taskId: plan.id,
    });
    db.updateCoilCuttingPlan({ ...plan, status: "EM_PRODUCAO" });
    setView("LIST_ACTIVE");
  };

  const myPcpPlans =
    db.coilCuttingPlans?.filter(
      (p) => p.type === "BANHO_QUIMICO" && p.status === "PENDENTE",
    ) || [];
  const pendingPlans =
    db.coilCuttingPlans?.filter(
      (p) => p.status !== "CONCLUIDO" && p.type === "BANHO_QUIMICO",
    ) || [];

  const activePacksList = React.useMemo(() => {
    return db.activePacks.filter(
      (p) =>
        p.type === "BANHO_QUIMICO" &&
        (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" ? true : p.operatorId === currentUser.id),
    );
  }, [db.activePacks, currentUser.role, currentUser.id]);

  const getAvailableForChemical = React.useCallback(
    (o: any) => o.totalQuantity,
    [],
  );

  const pendingOrders = React.useMemo(() => {
    return db.orders.filter((o) => {
      return (
        o.status !== "EMBALADO" &&
        o.status !== "FATURADO" &&
        o.status !== ("BANHO_CONCLUIDO" as OrderStatus) &&
        (o.paintedQuantity || 0) < getAvailableForChemical(o)
      );
    });
  }, [db.orders, getAvailableForChemical]);

  const productGroups = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        itemId: number;
        color: string;
        size: string;
        variation: string;
        totalRemaining: number;
        customProductName?: string;
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
          customProductName: o.customProductName,
        });
      }
      groups.get(key)!.totalRemaining +=
        (getAvailableForChemical(o) || 0) - (o.paintedQuantity || 0);
      
      // Keep customProductName updated if it wasn't set yet
      if (!groups.get(key)!.customProductName && o.customProductName) {
        groups.get(key)!.customProductName = o.customProductName;
      }
    });
    return Array.from(groups.values());
  }, [pendingOrders, getAvailableForChemical]);

  const proceedWithStart = (opId: string, groupOverride: any = null) => {
    const group = groupOverride || operatorModalTarget;
    if (!group) {
      if (!manualTitle || !manualProduct) return;
      db.addActivePack({
        id: Date.now(),
        itemId: 0,
        color: "-",
        size: "-",
        variation: "-",
        operatorId: opId || currentUser.id,
        startTime: Date.now(),
        type: "BANHO_QUIMICO",
        taskId: 0,
        thirdPartyName: manualTitle,
        customProductName: manualProduct,
        partName: manualProduct,
      });
      setManualTitle("");
      setManualProduct("");
      setOperatorModalOpen(false);
      setSelectedOperator("");
      setOperatorModalTarget(null);
      setView("LIST_ACTIVE");
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
          p.operatorId === opId &&
          getProductKey(p.itemId, p.color, p.size, p.variation) === key,
      )
    ) {
      alert("Este operador já está processando este produto no Banho Químico!");
      return;
    }

    const item = db.items.find((i) => i.id === group.itemId);

    db.addActivePack({
      id: Date.now(),
      itemId: group.itemId,
      color: group.color,
      size: group.size,
      variation: group.variation,
      operatorId: opId || currentUser.id,
      startTime: Date.now(),
      type: "BANHO_QUIMICO",
      partName: `${item?.name || group.customProductName || "Item"} (${group.color || "-"} | ${group.size || "-"})`,
      customProductName: item?.name || group.customProductName || "Item",
      taskId: 0,
    });
    setOperatorModalOpen(false);
    setSelectedOperator("");
    setOperatorModalTarget(null);
    setView("LIST_ACTIVE");
  };

  const startChemicalBath = (group: (typeof productGroups)[0]) => {
    setOperatorModalTarget(group);
    setSelectedOperator(currentUser.name);
    setOperatorModalOpen(true);
    setView("LIST_ACTIVE");
  };

  const openFinishScreen = (packId: number) => {
    setSelectedPackId(packId);
    setView("FINISH_PACK");
  };

  const handleFinishBath = () => {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack || !packQuantity) return;

    let declaredPackages = Number(String(packQuantity).replace(",", "."));
    if (isNaN(declaredPackages) || declaredPackages <= 0) return;

    let qtyToAllocate = declaredPackages;
    const cleanQtyPer = String(qtyPerPackage).replace(",", ".");
    const qtyPer = cleanQtyPer ? Number(cleanQtyPer) : 1;
    
    if ((measurementUnit === "SACOS" || measurementUnit === "CAIXAS") && cleanQtyPer) {
      qtyToAllocate = declaredPackages * qtyPer;
    }

    const endTime = Date.now();
    const durationMillis = endTime - activePack.startTime;

    if (activePack.itemId === 0) {
      db.addLogs([
        {
          id: Date.now(),
          orderId: 0,
          operatorId: currentUser.id,
          quantityProcessed: qtyToAllocate,
          type: "BANHO_QUIMICO",
          timestamp: endTime,
          durationMillis,
          measurementUnit,
          qtyPerPackage: cleanQtyPer ? Number(cleanQtyPer) : undefined,
          declaredPackages,
          customProductName: activePack.customProductName,
          thirdPartyName: activePack.thirdPartyName || "",
        },
      ]);

      db.addNotification({
        message: `Banho Químico Concluído (Avulso): ${declaredPackages} ${measurementUnit} (Est. ${qtyToAllocate} pçs) de ${activePack.customProductName || "Avulso"}`,
        read: false,
      });

      db.removeActivePack(activePack.id);
      setSelectedPackId(null);
      setPackQuantity("");
      setQtyPerPackage("");
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
      const needed = getAvailableForChemical(o) - (o.paintedQuantity || 0);
      const allocate = Math.min(needed, qtyToAllocate);

      if (allocate > 0) {
        const oIndex = tempOrders.findIndex((uo) => uo.id === o.id);
        if (oIndex >= 0) {
          const currentCut = tempOrders[oIndex].cutQuantity || 0;
          const updatedO = {
            ...tempOrders[oIndex],
            cutQuantity: currentCut + allocate,
          };
          tempOrders[oIndex] = updatedO;
          changedOrders.push(updatedO);
        }

        const allocateRatio = allocate / ((declaredPackages * qtyPer) || allocate); 
        const logPackages = Math.round(declaredPackages * allocateRatio * 100) / 100;

        qtyToAllocate -= allocate;
        totalAssignedQty += allocate;

        logsToAdd.push({
          orderId: o.id,
          operatorId: currentUser.id,
          quantityProcessed: allocate,
          type: "BANHO_QUIMICO",
          timestamp: endTime,
          durationMillis: 0,
          measurementUnit,
          qtyPerPackage: cleanQtyPer ? Number(cleanQtyPer) : undefined,
          declaredPackages: (measurementUnit === "SACOS" || measurementUnit === "CAIXAS") ? logPackages : undefined,
          customProductName: activePack.customProductName || activePack.partName,
        });
      }
    }

    if (qtyToAllocate > 0) {
      const allocateRatioStock = qtyToAllocate / (declaredPackages * qtyPer || qtyToAllocate);
      const stockPackages = Math.round(declaredPackages * allocateRatioStock * 100) / 100;
      const mUnit = (measurementUnit === "SACOS" || measurementUnit === "CAIXAS") ? measurementUnit : undefined;

      const stockId = `${activePack.itemId}|${activePack.color}|${activePack.size}|${activePack.variation}|INTERMEDIARIO`;
      const existingStock = db.stocks.find((s) => s.id === stockId);
      if (existingStock) {
        db.updateStocks([
          {
            ...existingStock,
            quantity: existingStock.quantity + qtyToAllocate,
            declaredPackages: (existingStock.declaredPackages || 0) + (stockPackages || 0),
            measurementUnit: mUnit || existingStock.measurementUnit,
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
            declaredPackages: mUnit ? stockPackages : undefined,
            measurementUnit: mUnit,
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
        description: `Sobra de Banho Químico Concluído - entrada no estoque intermediário (Operador: ${currentUser.name})`,
      });
    }

    if (totalAssignedQty > 0) {
      logsToAdd.forEach((log) => {
        log.durationMillis =
          totalAssignedQty > 0
            ? Math.round(
                (log.quantityProcessed / totalAssignedQty) * durationMillis,
              )
            : durationMillis;
        log.id = Date.now() + Math.random();
      });
      db.addLogs(logsToAdd);

      const itemName =
        db.items.find((i) => i.id === activePack.itemId)?.name || "Item";
      db.addNotification({
        message: `Banho Químico Concluído: ${Math.round(totalAssignedQty / qtyPer * 100) / 100} ${measurementUnit} (Est. ${totalAssignedQty} pçs) de ${itemName} (${activePack.color || "-"} | ${activePack.size || "-"})`,
        read: false,
      });
    }

    if (changedOrders.length > 0) {
      db.updateOrders(changedOrders);
    }

    db.removeActivePack(activePack.id);
    setSelectedPackId(null);
    setPackQuantity("");
    setQtyPerPackage("");
    setMeasurementUnit("PÇS");
    setView("LIST_ACTIVE");
  };

  const handleStartManualProduction = () => {
    if (!manualTitle || !manualProduct) return;
    setOperatorModalTarget(null);
    setSelectedOperator(currentUser.name);
    setOperatorModalOpen(true);
    setView("LIST_ACTIVE");
  };

  const renderOperatorModal = () => {
    if (!operatorModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white p-5 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-800 text-center border-b pb-2 shrink-0">
            Confirmar Início
          </h3>
          <p className="text-sm text-gray-500 text-center">
            Verifique as informações antes de iniciar o processo de tratamento.
          </p>

          <div className="flex flex-col gap-2 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            {!operatorModalTarget ? (
              <>
                <div className="text-xs text-gray-500 font-bold uppercase mt-1">Lançamento Avulso (Terceiro)</div>
                <div className="text-sm font-semibold text-gray-800">
                  <span className="text-teal-600 block text-xs uppercase font-bold mt-2">Cliente / Origem:</span>
                  {manualTitle}
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  <span className="text-teal-600 block text-xs uppercase font-bold mt-1">Produto / Peças:</span>
                  {manualProduct}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 font-bold uppercase mt-1">Produto do Sistema</div>
                <div className="text-sm font-semibold text-gray-800">
                  <span className="text-teal-600 block text-xs uppercase font-bold mt-2">Produto:</span>
                  {db.items.find(i => i.id === operatorModalTarget.itemId)?.name || "Desconhecido"}
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  <span className="text-teal-600 block text-xs uppercase font-bold mt-1">Variantes (Cor | Tam | Var):</span>
                  {operatorModalTarget.color} | {operatorModalTarget.size} | {operatorModalTarget.variation}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => proceedWithStart(currentUser.id.toString())}
              className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition shadow-sm"
            >
              Sim, Iniciar Processo
            </button>
            <button
              onClick={() => {
                setOperatorModalOpen(false);
                setOperatorModalTarget(null);
                setSelectedOperator("");
              }}
              className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFullSizeImageModal = () => {
    if (!fullSizeImage) return null;
    return (
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
    );
  };

  if (view === "MANUAL_PRODUCTION") {
    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto pb-20">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-teal-600 font-semibold mb-4 hover:text-teal-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border w-full flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 text-teal-800 border-b pb-2">
            <Beaker className="w-5 h-5" />
            <h3 className="font-bold text-xl">
              Iniciar Lançamento Avulso / Terceiros
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            Registre e inicie a contagem de tempo de serviços de zincagem ou
            banho químico realizados para terceiros.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Cliente (Terceiro) ou Origem
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="border p-2 rounded focus:outline-teal-500"
              placeholder="Ex: Moto Peças Silva"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Descrição das Peças / Produto
            </label>
            <input
              type="text"
              value={manualProduct}
              onChange={(e) => setManualProduct(e.target.value)}
              className="border p-2 rounded focus:outline-teal-500"
              placeholder="Ex: Parafusos variados M8"
            />
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={!manualTitle || !manualProduct}
            className="bg-teal-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-teal-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Activity size={18} /> Iniciar Processo
          </button>
        </div>
        {renderOperatorModal()}
        {renderFullSizeImageModal()}
      </div>
    );
  }

  if (view === "SELECT_PLAN") {
    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-teal-600 font-semibold mb-4 hover:text-teal-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Layers className="text-teal-600" /> Selecionar Lote do PCP
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
                    className="bg-white p-4 border border-teal-200 flex justify-between items-center rounded-lg shadow-sm cursor-pointer hover:border-teal-400 hover:shadow-md transition group text-left"
                  >
                    <div className="flex flex-col flex-1 pl-1 border-l-4 border-teal-500">
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
                        <span className="text-[11px] text-teal-650 mt-1 pl-2 font-bold flex items-center gap-1 bg-teal-50 w-max px-2 py-0.5 rounded border border-teal-150">
                          🔄 Já Produzido: <strong className="text-teal-850">{totalProduced} pçs</strong>
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
                      <span className="text-[10px] uppercase text-teal-655 font-bold bg-teal-50 px-2 py-0.5 rounded mb-1 border border-teal-100">
                        {plan.status === "EM_PRODUCAO"
                          ? "Produzindo"
                          : "Aguardando"}
                      </span>
                      <button className="text-xs bg-teal-600 text-white font-bold py-1 px-3 mt-1 rounded opacity-0 group-hover:opacity-100 transition">
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

  if (view === "FINISH_PACK" && selectedPackId) {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
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
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto pb-20">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-teal-600 font-semibold mb-4 hover:text-teal-800"
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
              {item?.name || activePack.partName || activePack.customProductName || "Item Desconhecido"}
            </h3>
            <p className="text-gray-500 text-xs mt-1">
              Cor: {activePack.color || "-"} | Tam: {activePack.size || "-"} |
              Var: {activePack.variation || "-"}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Tempo corrido:{" "}
              {Math.floor((Date.now() - activePack.startTime) / 60000)} minutos
            </p>
          </div>

          <div className="bg-teal-50 p-4 rounded-lg flex flex-col gap-3">
            <div className="text-sm text-teal-800 font-bold mb-1 col-span-2">
              {activePack.itemId === 0 ? (
                <span>Lançamento Avulso de Terceiro: <strong>{activePack.thirdPartyName || "Avulso"}</strong></span>
              ) : (
                <span>Restante no Sistema: {relatedTotalRemaining} unidades</span>
              )}
            </div>
            <div className="flex flex-col gap-1 text-left">
              <label className="text-sm font-semibold text-gray-700">
                Quantidade Processada:
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={packQuantity}
                onChange={(e) => setPackQuantity(e.target.value)}
                placeholder="Ex: 50,5"
                className="border border-gray-300 p-3 rounded-lg text-xl text-center focus:outline-teal-500"
              />
            </div>
            <div className="flex flex-col gap-1 text-left mt-2 font-sans">
              <label className="text-sm font-semibold text-gray-700">
                Unidade de Medida:
              </label>
              <div className="flex gap-2">
                {["PÇS", "KG", "SACOS", "CAIXAS"].map((u) => (
                  <button
                    key={u}
                    onClick={() => {
                      setMeasurementUnit(u as any);
                    }}
                    className={`flex-1 py-2 font-bold text-sm rounded border ${measurementUnit === u ? "bg-teal-600 text-white border-teal-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 text-left mt-3 font-sans">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Quantidade por Embalagem / Saco / Caixa (Opcional):
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={qtyPerPackage}
                onChange={(e) => setQtyPerPackage(e.target.value)}
                placeholder={`Ex: Qtd em cada ${measurementUnit === "PÇS" ? "pacote" : measurementUnit === "KG" ? "fração" : measurementUnit.toLowerCase().slice(0, -1)}`}
                className="border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-teal-500 focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleFinishBath}
            disabled={!packQuantity || isNaN(Number(String(packQuantity).replace(",", "."))) || Number(String(packQuantity).replace(",", ".")) <= 0}
            className="bg-teal-600 text-white font-bold p-3 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 mt-2"
          >
            Concluir Processo
          </button>
        </div>
        {renderOperatorModal()}
        {renderFullSizeImageModal()}
      </div>
    );
  }

  if (view === "NEW_PACK") {
    const filteredGroups = productGroups.filter((g) => {
      if (!searchTerm) return true;
      const item = db.items.find((i) => i.id === g.itemId);
      const searchStr = normalizeString(
        `${item?.name || ""} ${g.color} ${g.size} ${g.variation}`,
      );
      return searchStr.includes(normalizeString(searchTerm));
    });

    return (
      <div className="flex flex-col h-full p-2 max-w-lg mx-auto w-full overflow-y-auto pb-20">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-teal-600 font-semibold mb-4 hover:text-teal-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Iniciar Processo de Banho
        </h2>

        <input
          type="text"
          placeholder="Pesquisar produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-2 rounded-lg mb-4 text-sm focus:outline-teal-500 focus:border-teal-500"
        />

        <div className="flex-1 overflow-y-auto w-full">
          {filteredGroups.length === 0 ? (
            <p className="text-gray-500 text-center mt-4 text-sm">
              Nenhum produto pendente para Banho Químico encontrado.
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredGroups.map((group, idx) => {
                const item = db.items.find((i) => i.id === group.itemId);
                return (
                  <div
                    key={idx}
                    onClick={() => startChemicalBath(group)}
                    className="bg-white p-4 border border-gray-200 flex justify-between items-center rounded-lg shadow-sm cursor-pointer hover:border-teal-400 hover:shadow-md transition gap-3"
                  >
                    {item?.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFullSizeImage(item.imageUrl || null);
                        }}
                      />
                    )}
                    <div className="flex flex-col flex-1 shrink min-w-0">
                      <span className="font-bold text-gray-800">
                        {item?.name || "Item Desconhecido"}
                      </span>
                      <span className="text-xs text-teal-800 font-semibold mt-0.5">
                        Cod: {item?.code || "-"}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Cor: {group.color || "-"} | Tam: {group.size || "-"} |
                        Var: {group.variation || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded mb-1">
                        Disponível
                      </span>
                      <span className="font-bold text-lg text-teal-600">
                        {group.totalRemaining} unidades
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {renderOperatorModal()}
        {renderFullSizeImageModal()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 p-3 w-full max-w-2xl mx-auto">
      {/* Header Widget */}
      <div className="flex items-center gap-2.5 md:gap-3 bg-gradient-to-r from-cyan-600 to-blue-500 p-3 md:p-4 rounded-xl text-white shadow-md mb-6 shrink-0">
        <Activity className="animate-pulse w-6 h-6 md:w-8 md:h-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-xl font-bold font-sans text-white leading-tight truncate">
            Produção - Tratamento de Banho Químico
          </h2>
          <p className="text-[10px] md:text-xs text-cyan-100 font-mono truncate">
            Operador: {currentUser.name} | Tanques de Zincagem Ativo
          </p>
        </div>
      </div>

      <ProductivityCard db={db} currentUser={currentUser} />

      {/* Apontamento de Paradas de Máquina */}
      <MachineStopWidget db={db} currentUser={currentUser} machineName="Banho Químico" />

      <div className="flex flex-col gap-2 mb-6 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setView("NEW_PACK")}
            className="flex-1 bg-cyan-100 text-cyan-800 p-3.5 rounded-xl text-xs font-bold hover:bg-cyan-200 transition uppercase flex items-center justify-center gap-1.5"
          >
            <Search size={15} /> Buscar OS Sistema
          </button>
          <button
            onClick={() => setView("MANUAL_PRODUCTION")}
            className="flex-1 bg-slate-100 text-slate-800 p-3.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition uppercase flex items-center justify-center gap-1.5"
          >
            <PlusCircle size={15} /> Lançar Avulso
          </button>
        </div>
        <button
          onClick={() => setView("SELECT_PLAN")}
          className={`w-full p-3.5 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 transition uppercase tracking-wider ${
            myPcpPlans.length > 0
              ? "bg-cyan-600 text-white hover:bg-cyan-700 animate-pulse"
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
          <Activity size={16} /> Em andamento (Meus processos)
        </h3>
        {activePacksList.length === 0 ? (
          <p className="text-gray-500 text-center mt-6 text-sm">
            Nenhum processo de banho em andamento no momento.
          </p>
        ) : (
          <div className="grid gap-3">
            {activePacksList.map((pack) => {
              const op = db.users.find((u) => u.id === pack.operatorId)?.name;
              const item = db.items.find((i) => i.id === pack.itemId);
              return (
                <div
                  key={pack.id}
                  onClick={() => openFinishScreen(pack.id)}
                  className="border p-4 flex justify-between items-center rounded-lg shadow-sm transition gap-3 bg-teal-50 border-teal-200 cursor-pointer hover:border-teal-400"
                >
                  {item?.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded shadow-sm border border-teal-200 cursor-pointer hover:opacity-80 transition shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullSizeImage(item.imageUrl || null);
                      }}
                    />
                  )}
                  <div className="flex flex-col flex-1 shrink min-w-0">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      <Beaker size={14} className="text-teal-600" />{" "}
                      {pack.partName || pack.customProductName || "Item Não Especificado"}
                    </span>
                    {pack.itemId === 0 && (
                      <span className="text-[10px] text-gray-500 font-semibold font-sans mt-0.5">
                        Cliente / Origem: <strong className="text-teal-800">{pack.thirdPartyName}</strong>
                      </span>
                    )}
                    <span className="text-xs text-gray-600 font-mono mt-1">
                      Tempo: {Math.floor((Date.now() - pack.startTime) / 60000)}{" "}
                      min
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase text-teal-800 bg-teal-100 px-3 py-1.5 rounded-full ring-1 ring-teal-200">
                      Concluir
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {renderOperatorModal()}
      {renderFullSizeImageModal()}
    </div>
  );
}
