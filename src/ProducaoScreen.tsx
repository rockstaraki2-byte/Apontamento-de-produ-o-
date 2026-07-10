import React, { useState } from "react";
import {
  ArrowLeft,
  Activity,
  Sparkles,
  Search,
  Loader2,
  Sparkle,
  CheckCircle,
  Hammer,
  Plus,
  Package,
  Users,
  User as UserIcon,
  ChevronRight,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User, OrderStatus } from "./types";
import { calculateWorkingMillis } from "./timeUtils";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { DailySummaryWidget } from "./components/DailySummaryWidget";
import { normalizeString } from "./searchUtils";
import {
  ScreenLayout,
  ScreenHeader,
  ScrollContainer,
  SectionBlock,
  StickyActionsBar,
} from "./components/Layout";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";

const getProductKey = (
  itemId: number,
  color: string,
  size: string,
  variation: string,
) => `${itemId}|${color}|${size}|${variation}`;

function parseInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-bold text-gray-900 bg-amber-50 px-1 rounded border border-amber-200"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function parseCustomMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-sm font-bold mt-3 mb-1 text-gray-800">
          {parseInline(line.slice(4))}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={idx} className="text-base font-bold mt-4 mb-2 text-gray-900">
          {parseInline(line.slice(3))}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={idx} className="text-lg font-bold mt-5 mb-2 text-gray-900">
          {parseInline(line.slice(2))}
        </h2>
      );
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li
          key={idx}
          className="ml-4 list-disc text-sm text-gray-700 my-1 leading-relaxed"
        >
          {parseInline(line.slice(2))}
        </li>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-2" />;
    }
    return (
      <p key={idx} className="text-sm text-gray-750 my-1 leading-relaxed">
        {parseInline(line)}
      </p>
    );
  });
}

export function ProducaoScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const userSectorNames = React.useMemo(() => {
    return (currentUser?.sectorIds || [])
      .map(sid => db.sectors.find(s => s.id === sid)?.name || "")
      .filter(Boolean);
  }, [currentUser?.sectorIds, db.sectors]);

  // If user has NO explicit sectors linked, they fallback to checking role
  const hasLinkedSectors = (currentUser?.sectorIds || []).length > 0;

  const isSolda = React.useMemo(() => {
    if (hasLinkedSectors) {
      return userSectorNames.some(n => n.toLowerCase().includes("solda"));
    }
    return currentUser.role === "SOLDA";
  }, [hasLinkedSectors, userSectorNames, currentUser.role]);

  const isRetratil = React.useMemo(() => {
    if (hasLinkedSectors) {
      return userSectorNames.some(n => n.toLowerCase().includes("retrátil") || n.toLowerCase().includes("retratil"));
    }
    return currentUser.role === "MONTAGEM_RETRATIL";
  }, [hasLinkedSectors, userSectorNames, currentUser.role]);

  const isRodrigo = React.useMemo(() => {
    if (hasLinkedSectors) {
      return userSectorNames.some(n => n.toLowerCase().includes("rodrigo"));
    }
    return currentUser.role === "MONTAGEM_RODRIGO";
  }, [hasLinkedSectors, userSectorNames, currentUser.role]);

  const isAdminOrGerencia = currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP";

  const [view, setView] = useState<
    "LIST_ACTIVE" | "NEW_PACK" | "FINISH_PACK" | "MANUAL_PRODUCTION"
  >("LIST_ACTIVE");
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [packQuantity, setPackQuantity] = useState<number | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Manual Production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProduct, setManualProduct] = useState("");

  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);



  const [welderModalOpen, setWelderModalOpen] = useState(false);
  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [pendingGroupToStart, setPendingGroupToStart] = useState<any | null>(
    null,
  );
  const [pendingIsManual, setPendingIsManual] = useState(false);
  const [selectedWelder, setSelectedWelder] = useState<string>("");
  const [selectedProcess, setSelectedProcess] = useState<string>("");

  const [confirmStartModalOpen, setConfirmStartModalOpen] = useState(false);
  const [retratilModalOpen, setRetratilModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<string>("");

  const activePacksList = db.activePacks.filter(
    (p) =>
      p.type === "PRODUCAO" &&
      (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA"
        ? true
        : p.operatorId === currentUser.id ||
          p.operatorId.startsWith(currentUser.id + " - ")),
  );

  const getPackProgress = (pack: any) => {
    if (pack.itemId === 0) return null;
    const key = getProductKey(
      pack.itemId,
      pack.color,
      pack.size,
      pack.variation,
    );
    const matchedOrders = db.orders.filter((o) => {
      if (o.status === "EMBALADO" || o.status === "FATURADO") return false;
      return getProductKey(o.itemId, o.color, o.size, o.variation) === key;
    });
    if (matchedOrders.length === 0) return null;
    const total = matchedOrders.reduce(
      (sum, o) => sum + (o.totalQuantity || 0),
      0,
    );
    const produced = matchedOrders.reduce(
      (sum, o) => sum + (o.producedQuantity || 0),
      0,
    );
    return { produced, total };
  };

  const pendingOrders = db.orders.filter((o) => {
    if (
      o.status === "EMBALADO" ||
      o.status === "FATURADO" ||
      (o.producedQuantity || 0) >= o.totalQuantity
    )
      return false;

    if (isRodrigo) {
      const item = db.items.find((i) => i.id === o.itemId);
      if (!item) return false;
      const lowerName = item.name.toLowerCase();
      if (
        !lowerName.includes("barra chata") &&
        !lowerName.includes("barrachata")
      ) {
        return false;
      }
    }
    if (isRetratil) {
      const item = db.items.find((i) => i.id === o.itemId);
      if (!item) return false;
      const lowerName = item.name.toLowerCase();
      if (!lowerName.includes("retrátil") && !lowerName.includes("retratil")) {
        return false;
      }
    }
    return true;
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
        (o.totalQuantity || 0) - (o.producedQuantity || 0);
    });
    return Array.from(groups.values());
  }, [pendingOrders]);

  const proceedWithStart = (
    welderName?: string,
    directGroup?: any,
    directIsManual?: boolean,
  ) => {
    const operatorId = welderName
      ? `${currentUser.id} - ${welderName}`
      : currentUser.id;

    const isManual =
      directIsManual !== undefined ? directIsManual : pendingIsManual;
    const group = directGroup !== undefined ? directGroup : pendingGroupToStart;

    if (isManual) {
      if (!manualTitle || !manualProduct) return;

      db.addActivePack({
        id: Date.now(),
        itemId: 0,
        color: "-",
        size: "-",
        variation: "-",
        operatorId,
        startTime: Date.now(),
        type: "PRODUCAO",
        taskId: 0,
        thirdPartyName: manualTitle,
        customProductName: manualProduct,
        processName: selectedProcess || undefined,
      });

      alert("Produção avulsa iniciada com sucesso!");
      setManualTitle("");
      setManualProduct("");
      setView("LIST_ACTIVE");
    } else if (group) {
      const key = getProductKey(
        group.itemId,
        group.color,
        group.size,
        group.variation,
      );
      if (
        activePacksList.some(
          (p) =>
            p.operatorId === operatorId &&
            getProductKey(p.itemId, p.color, p.size, p.variation) === key,
        )
      ) {
        alert("Você já tem uma produção ativa para este produto!");
        setPendingGroupToStart(null);
        setPendingIsManual(false);
        setWelderModalOpen(false);
        setRetratilModalOpen(false);
        setSelectedWelder("");
        return;
      }
      db.addActivePack({
        id: Date.now(),
        itemId: group.itemId,
        color: group.color,
        size: group.size,
        variation: group.variation,
        operatorId,
        startTime: Date.now(),
        type: "PRODUCAO",
        processName: selectedProcess || undefined,
      });

      const changedOrders: any[] = [];
      db.orders.forEach((o) => {
        if (
          (o.status === "PENDENTE" || o.status === undefined) &&
          o.itemId === group.itemId &&
          o.color === group.color &&
          o.size === group.size &&
          o.variation === group.variation
        ) {
          changedOrders.push({ ...o, status: "EM_PRODUCAO" as OrderStatus });
        }
      });
      if (changedOrders.length > 0) db.updateOrders(changedOrders);

      const item = db.items.find((i) => i.id === group.itemId);
      alert(`Produção iniciada para ${item?.name || "Produto"}!`);
      setView("LIST_ACTIVE");
    }

    setPendingGroupToStart(null);
    setPendingIsManual(false);
    setWelderModalOpen(false);
    setRetratilModalOpen(false);
    setSelectedWelder("");
    setSelectedOperator("");
    setSelectedProcess("");
  };

  const handleStartManualProduction = () => {
    if (!manualTitle || !manualProduct) return;

    if (isSolda) {
      setPendingIsManual(true);
      setPendingGroupToStart(null);
      setSelectedWelder("");
      setSelectedProcess("");
      setWelderModalOpen(true);
    } else if (isRetratil) {
      setPendingIsManual(true);
      setPendingGroupToStart(null);
      setSelectedOperator("Walter José");
      setSelectedProcess("Conificar");
      setRetratilModalOpen(true);
    } else if (isAdminOrGerencia) {
      setPendingIsManual(true);
      setPendingGroupToStart(null);
      setSectorModalOpen(true);
    } else {
      proceedWithStart(undefined, null, true);
    }
  };

  const startPackaging = (group: (typeof productGroups)[0]) => {
    setPendingGroupToStart(group);

    if (isSolda) {
      setPendingIsManual(false);
      setSelectedWelder("");
      setSelectedProcess("");
      setWelderModalOpen(true);
    } else if (isRetratil) {
      setPendingIsManual(false);
      setSelectedOperator("Walter José");
      setSelectedProcess("Conificar");
      setRetratilModalOpen(true);
    } else if (isRodrigo) {
      setPendingIsManual(false);
      setSelectedOperator("Renata");
      setConfirmStartModalOpen(true);
    } else if (isAdminOrGerencia) {
      setPendingIsManual(false);
      setSectorModalOpen(true);
    } else {
      setConfirmStartModalOpen(true);
    }
  };

  const handleConfirmStart = () => {
    setConfirmStartModalOpen(false);
    if (pendingGroupToStart) {
      proceedWithStart(undefined, pendingGroupToStart, false);
    }
  };

  const openFinishScreen = (packId: number) => {
    setSelectedPackId(packId);
    setView("FINISH_PACK");
  };

  const handlePack = (
    isPartial: boolean = false,
    isRetratilSwitchProcess?: string,
  ) => {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack || !packQuantity) return;

    let qtyToAllocate = Number(packQuantity);
    const endTime = Date.now();
    const operator = db.users?.find((u) => u.id === activePack.operatorId);
    const opRole =
      operator?.role || currentUser.role || activePack.type || "PRODUCAO";
    const durationMillis = calculateWorkingMillis(
      activePack.startTime,
      endTime,
      opRole,
    );

    if (activePack.itemId === 0) {
      db.addLogs([
        {
          id: Date.now(),
          operatorId: activePack.operatorId,
          quantityProcessed: qtyToAllocate,
          type: "PRODUCAO",
          timestamp: endTime,
          durationMillis,
          processName: activePack.processName,
          thirdPartyName: activePack.thirdPartyName,
          customProductName: activePack.customProductName,
        },
      ]);
      if (isPartial) {
        db.addActivePack({
          ...activePack,
          startTime: Date.now(),
          partialQuantity: (activePack.partialQuantity || 0) + Number(packQuantity),
        });
        alert(`Apontamento parcial inserido! Contagem prossegue.`);
      } else {
        db.removeActivePack(activePack.id);
      }
      setSelectedPackId(null);
      setPackQuantity("");
      setView("LIST_ACTIVE");
      return;
    }

    const isRetratil = currentUser.role === "MONTAGEM_RETRATIL";

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
      const needed = o.totalQuantity - (o.producedQuantity || 0);
      const allocate = Math.min(needed, qtyToAllocate);

      if (allocate > 0) {
        const oIndex = tempOrders.findIndex((uo) => uo.id === o.id);
        if (oIndex >= 0) {
          const newProduced =
            (tempOrders[oIndex].producedQuantity || 0) + allocate;
          let newPacked = tempOrders[oIndex].packedQuantity || 0;
          let newStatus = tempOrders[oIndex].status || "PENDENTE";

          if (isRetratil) {
            newPacked = (tempOrders[oIndex].packedQuantity || 0) + allocate;
            if (newPacked >= tempOrders[oIndex].totalQuantity) {
              newStatus = "EMBALADO" as OrderStatus;
            } else {
              newStatus = "EMBALANDO" as OrderStatus;
            }
          } else {
            if (newProduced >= tempOrders[oIndex].totalQuantity) {
              newStatus = "PRODUZIDO" as OrderStatus;
            } else {
              newStatus = "EM_PRODUCAO" as OrderStatus;
            }
          }

          const updatedO = {
            ...tempOrders[oIndex],
            producedQuantity: newProduced,
            packedQuantity: newPacked,
            status: newStatus,
            isActive: isRetratil ? true : tempOrders[oIndex].isActive,
          };
          tempOrders[oIndex] = updatedO;
          changedOrders.push(updatedO);
        }

        qtyToAllocate -= allocate;
        totalAssignedQty += allocate;

        logsToAdd.push({
          orderId: o.id,
          itemId: activePack.itemId,
          operatorId: activePack.operatorId,
          quantityProcessed: allocate,
          type: "PRODUCAO",
          timestamp: endTime,
          durationMillis: 0,
          processName: activePack.processName,
        });
      }
    }

    if (isRetratil) {
      const totalPackedQty = Number(packQuantity);
      if (totalPackedQty > 0) {
        const destStage =
          activePack.processName === "Embalar" ? "ACABADO" : "INTERMEDIARIO";
        const stockId = `${activePack.itemId}|${activePack.color}|${activePack.size}|${activePack.variation}|${destStage}`;
        const existingStock = db.stocks.find((s) => s.id === stockId);
        if (existingStock) {
          db.updateStocks([
            {
              ...existingStock,
              quantity: existingStock.quantity + totalPackedQty,
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
              quantity: totalPackedQty,
              stage: destStage as "INTERMEDIARIO" | "ACABADO",
            },
          ]);
        }

        db.addStockMovement?.({
          itemId: activePack.itemId,
          color: activePack.color,
          size: activePack.size,
          variation: activePack.variation,
          quantity: totalPackedQty,
          type: "ENTRADA",
          description: `Produção Retrátil (${activePack.processName || "Processo Geral"}) - Entrada em estoque ${destStage === "ACABADO" ? "de acabados" : "intermediário"} (Operador: ${activePack.operatorId})`,
        });
      }
    } else {
      // For standard production, leftover quantity goes to INTERMEDIARIO stock
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
          description:
            currentUser.role === "MONTAGEM_RODRIGO"
              ? `Sobra de Barra Chata produzida por Renata - Pendurado e encaminhado exclusivamente para a Pintura`
              : `Sobra de Produção Genérica - entrada no estoque intermediário (Operador: ${currentUser.name})`,
        });
      }
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

      if (isRetratil) {
        const itemDb = db.items.find((i) => i.id === activePack.itemId);
        db.addNotification?.({
          message: `Montagem de Retrátil Finalizada diretamente em Estoque Acabado: ${totalAssignedQty} de ${itemDb?.name || "Item"} (${activePack.color || "-"} | ${activePack.size || "-"})`,
          read: false,
        });
      }

      if (currentUser.role === "MONTAGEM_RODRIGO") {
        const itemDb = db.items.find((i) => i.id === activePack.itemId);
        db.addNotification?.({
          message: `Pendurar Barra chata Finalizado por Renata (Encaminhado para Pintura): ${totalAssignedQty} de ${itemDb?.name || "Item"} (${activePack.color || "-"} | ${activePack.size || "-"})`,
          read: false,
        });
      }
    }

    const itemDbForConsumption = db.items.find(
      (i) => i.id === activePack.itemId,
    );
    if (itemDbForConsumption) {
      const pName = itemDbForConsumption.name.toLowerCase();

      if (
        pName.includes("mecanismo") &&
        (pName.includes("retrátil") || pName.includes("retratil"))
      ) {
        const mancalItem = db.items.find(
          (i) => i.name === "MANCAL RETRÁTIL" || i.id === 1088,
        );
        if (mancalItem) {
          const consumedQty = Number(packQuantity) * 4;
          const mStockId = `${mancalItem.id}|-|-|-|INTERMEDIARIO`;
          const mStock = db.stocks.find((s) => s.id === mStockId);
          if (mStock) {
            db.updateStocks([
              {
                ...mStock,
                quantity: Math.max(0, mStock.quantity - consumedQty),
              },
            ]);
          }
          db.addStockMovement?.({
            itemId: mancalItem.id,
            color: "-",
            size: "-",
            variation: "-",
            quantity: consumedQty,
            type: "SAIDA",
            description: `Consumo Automático (P/ ${itemDbForConsumption.name}) - Operador: ${currentUser.name}`,
          });
        }
      }

      if (
        (pName.includes("rodízio") || pName.includes("rodizio")) &&
        pName !== "rodinha p/ rodízio"
      ) {
        const rodinhaItem = db.items.find(
          (i) => i.name === "RODINHA P/ RODÍZIO" || i.id === 3565,
        );
        if (rodinhaItem) {
          const consumedQty = Number(packQuantity) * 1;
          const rStockId = `${rodinhaItem.id}|-|-|-|INTERMEDIARIO`;
          const rStock = db.stocks.find((s) => s.id === rStockId);
          if (rStock) {
            db.updateStocks([
              {
                ...rStock,
                quantity: Math.max(0, rStock.quantity - consumedQty),
              },
            ]);
          }
          db.addStockMovement?.({
            itemId: rodinhaItem.id,
            color: "-",
            size: "-",
            variation: "-",
            quantity: consumedQty,
            type: "SAIDA",
            description: `Consumo Automático (P/ ${itemDbForConsumption.name}) - Operador: ${currentUser.name}`,
          });
        }
      }
    }

    if (changedOrders.length > 0) db.updateOrders(changedOrders);

    if (isPartial) {
      db.addActivePack({
        ...activePack,
        startTime: Date.now(),
        partialQuantity: (activePack.partialQuantity || 0) + Number(packQuantity),
      });
      alert(`Apontamento parcial inserido! Contagem do produto prossegue.`);
    } else if (isRetratilSwitchProcess) {
      db.removeActivePack(activePack.id);
      db.addActivePack({
        ...activePack,
        id: Date.now() + 1,
        startTime: Date.now(),
        processName: isRetratilSwitchProcess,
      });
      setNextProcess("");
    } else {
      db.removeActivePack(activePack.id);
    }

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

  const [nextProcess, setNextProcess] = useState<string>("");

  const handleSwitchProcess = (processName: string) => {
    if (!selectedPackId) return;
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack) return;

    const endTime = Date.now();
    const operator = db.users?.find((u) => u.id === activePack.operatorId);
    const opRole =
      operator?.role || currentUser.role || activePack.type || "PRODUCAO";
    const durationMillis = calculateWorkingMillis(
      activePack.startTime,
      endTime,
      opRole,
    );

    // Log the time spent on the PREVIOUS process with 0 quantity
    db.addLogs([
      {
        id: Date.now(),
        operatorId: activePack.operatorId,
        quantityProcessed: 0,
        type: "PRODUCAO",
        timestamp: endTime,
        durationMillis,
        processName: activePack.processName,
        thirdPartyName: activePack.thirdPartyName,
        customProductName: activePack.customProductName,
      },
    ]);

    // Update the active pack to the NEW process
    db.removeActivePack(activePack.id);
    db.addActivePack({
      ...activePack,
      id: Date.now() + 1,
      startTime: Date.now(),
      processName: processName,
    });

    setSelectedPackId(null);
    setView("LIST_ACTIVE");
    setNextProcess("");
  };

  const renderModals = () => (
    <>
      {sectorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border rounded-xl shadow-xl w-full max-w-sm flex flex-col p-5 md:p-6 gap-4 my-auto max-h-[92vh] overflow-hidden">
            <div className="flex flex-col gap-1 border-b pb-3 shrink-0">
              <h3 className="font-bold text-lg text-gray-900 text-center">
                Selecione o Setor / Processo
              </h3>
              <p className="text-xs text-gray-500 text-center">
                Para qual posto de trabalho deseja iniciar este programa?
              </p>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setSectorModalOpen(false);
                  setSelectedWelder("");
                  setSelectedProcess("Solda");
                  setWelderModalOpen(true);
                }}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">Setor Solda (Cabine)</span>
                    <span className="text-[11px] text-gray-500">Com escolha de soldador e sub-processo</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setSectorModalOpen(false);
                  setSelectedOperator("Walter José");
                  setSelectedProcess("Conificar");
                  setRetratilModalOpen(true);
                }}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 hover:border-purple-400 bg-white hover:bg-purple-50/30 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚙️</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">Montagem de Retrátil</span>
                    <span className="text-[11px] text-gray-500">Montar, conificar, embalar</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setSectorModalOpen(false);
                  setSelectedOperator("Renata");
                  setConfirmStartModalOpen(true);
                }}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔧</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">Montagem Rodrigo (Barra Chata)</span>
                    <span className="text-[11px] text-gray-500">Renata / Pendurar barra chata</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setSectorModalOpen(false);
                  setSelectedOperator("");
                  setConfirmStartModalOpen(true);
                }}
                className="w-full text-left p-3.5 rounded-xl border border-gray-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/30 transition flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📦</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">Geral / Outros Setores</span>
                    <span className="text-[11px] text-gray-500">Operador livre e confirmação simples</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="border-t pt-3 flex flex-col shrink-0 mt-1">
              <button
                onClick={() => {
                  setSectorModalOpen(false);
                  setPendingGroupToStart(null);
                  setPendingIsManual(false);
                }}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {welderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border rounded-xl shadow-xl w-full max-w-sm flex flex-col p-5 md:p-6 gap-3.5 my-auto max-h-[92vh] overflow-hidden">
            <div className="flex flex-col gap-1 border-b pb-3 shrink-0">
              <h3 className="font-bold text-lg text-gray-900 text-center">
                Selecione o Soldador
              </h3>
              <p className="text-xs text-gray-500 text-center">
                Selecione quem está iniciando esta soldagem:
              </p>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 scrollbar-thin">
              {!pendingIsManual && pendingGroupToStart && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-3">
                  {(() => {
                    const itemObj = db.items.find(
                      (i) => i.id === pendingGroupToStart.itemId,
                    );
                    return (
                      <>
                        {itemObj?.imageUrl ? (
                          <img
                            src={itemObj.imageUrl}
                            alt={itemObj.name}
                            className="w-14 h-14 object-cover rounded-md shadow-sm border border-blue-200 cursor-pointer hover:opacity-80 transition"
                            onClick={() =>
                              setFullSizeImage(itemObj.imageUrl || null)
                            }
                          />
                        ) : (
                          <div className="w-14 h-14 bg-white rounded-md border border-blue-200 flex items-center justify-center text-blue-300">
                            <Package size={20} />
                          </div>
                        )}
                        <div className="flex flex-col flex-1">
                          <span className="font-bold text-gray-900 leading-tight text-sm">
                            {itemObj?.name || "Desconhecido"}
                          </span>
                          <span className="text-[10px] font-mono text-blue-700">
                            {itemObj?.code}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                <h4 className="text-sm font-bold text-gray-700">
                  1. Selecione o Soldador:
                </h4>
                {db.employees
                  .filter((e) => {
                    if (!e.isActive) return false;
                    const sec = db.sectors?.find((s) => s.id === e.sectorId);
                    return (
                      sec?.name.toLowerCase().includes("solda") ||
                      e.name.toLowerCase().includes("solda")
                    );
                  })
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((emp) => {
                  const isSelected = selectedWelder === emp.name;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedWelder(emp.name)}
                      className={`w-full text-left py-2.5 px-4 rounded-xl border transition active:scale-98 cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-900 font-bold"
                          : "border-gray-200 hover:border-gray-300 bg-white text-gray-800"
                      }`}
                    >
                      <span className="text-sm">{emp.name}</span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded font-bold ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-505 hover:bg-gray-250"
                        }`}
                      >
                        {isSelected ? "Selecionado" : "Selecionar"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <h4 className="text-sm font-bold text-gray-700">
                  2. Selecione o Processo:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Solda",
                    "Enchimento",
                    "Desempeno",
                    "Furação",
                    "Viradeira",
                    "Outro",
                  ].map((proc) => {
                    const isSelected = selectedProcess === proc;
                    return (
                      <button
                        key={proc}
                        onClick={() => setSelectedProcess(proc)}
                        className={`text-left py-2 px-3 rounded-lg border transition active:scale-98 cursor-pointer flex items-center justify-center text-xs font-semibold ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : "border-gray-200 hover:border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {proc}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex flex-col gap-2 mt-2 shrink-0">
              <button
                disabled={!selectedWelder || !selectedProcess}
                onClick={() => proceedWithStart(selectedWelder)}
                className={`w-full py-3 rounded-xl text-center text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                  selectedWelder && selectedProcess
                    ? "bg-[#00b14f] text-black hover:bg-[#00c95a] hover:scale-[1.02] cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Activity size={18} /> Iniciar Produção
              </button>

              <button
                onClick={() => {
                  setWelderModalOpen(false);
                  setPendingGroupToStart(null);
                  setPendingIsManual(false);
                  setSelectedWelder("");
                }}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {retratilModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-5 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-3 animate-in zoom-in-95 duration-200 fade-in border border-indigo-100 max-h-[90vh] overflow-hidden">
            <div className="flex flex-col items-center justify-center gap-2 mb-2 shrink-0">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-1">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-black text-gray-800 tracking-tight text-center">
                Iniciar Produção - Retrátil
              </h3>
              <p className="text-sm font-medium text-gray-500 text-center px-4">
                Selecione o operador atual e o processo que será realizado.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  1. Operador Responsável (Quem executará a tarefa)
                </label>
                <div className="relative">
                  <UserIcon
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    placeholder="Digite para buscar ou adicionar nome..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition font-semibold text-gray-700 outline-none"
                    list="users-list"
                  />
                  <datalist id="users-list">
                    <option value="Walter José" />
                    {db.users
                      ?.filter((u) => u.name !== "Walter José")
                      .map((u) => (
                        <option key={u.id} value={u.name} />
                      ))}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 mt-2 border-t pt-3 border-gray-100">
                  2. PROCESSO EXECUTADO (Sequência de Produção)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {["Conificar", "Montar", "Embalar"].map((proc) => {
                    const isSelected = selectedProcess === proc;
                    return (
                      <button
                        key={proc}
                        onClick={() => setSelectedProcess(proc)}
                        className={`text-left py-3 px-3 rounded-xl border transition active:scale-98 cursor-pointer flex items-center justify-center text-sm font-bold shadow-sm ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                            : "border-gray-200 hover:border-indigo-300 bg-white text-gray-700"
                        }`}
                      >
                        {proc}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex flex-col gap-2 mt-2 shrink-0">
              <button
                disabled={!selectedOperator || !selectedProcess}
                onClick={() => proceedWithStart(selectedOperator)}
                className={`w-full py-3 rounded-xl text-center text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                  selectedOperator && selectedProcess
                    ? "bg-[#00b14f] text-black hover:bg-[#00c95a] hover:scale-[1.02] cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Activity size={18} /> Iniciar {selectedProcess}
              </button>

              <button
                onClick={() => {
                  setRetratilModalOpen(false);
                  setPendingGroupToStart(null);
                  setPendingIsManual(false);
                  setSelectedOperator("");
                }}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 transition cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE INÍCIO */}
      {confirmStartModalOpen && pendingGroupToStart && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-5 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 animate-in zoom-in-95 duration-200 fade-in border border-emerald-100">
            <div className="flex flex-col items-center justify-center gap-2 mb-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 text-center">
                Confirmar Produção
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Deseja iniciar a operação para este item?
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-4">
              {(() => {
                const itemObj = db.items.find(
                  (i) => i.id === pendingGroupToStart.itemId,
                );
                return (
                  <>
                    {itemObj?.imageUrl ? (
                      <img
                        src={itemObj.imageUrl}
                        alt={itemObj.name}
                        className="w-16 h-16 object-cover rounded-lg shadow-sm border border-emerald-200 cursor-pointer hover:opacity-80 transition"
                        onClick={() =>
                          setFullSizeImage(itemObj.imageUrl || null)
                        }
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white rounded-lg border border-emerald-200 flex flex-col items-center justify-center text-emerald-300">
                        <Package size={24} />
                      </div>
                    )}
                    <div className="flex flex-col flex-1">
                      <span className="font-bold text-gray-900 leading-tight">
                        {itemObj?.name || "Desconhecido"}
                      </span>
                      <span className="text-xs font-mono text-emerald-700 mt-1">
                        {itemObj?.code}
                      </span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {pendingGroupToStart.color &&
                          pendingGroupToStart.color !== "-" && (
                            <span className="text-[10px] bg-white border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-800">
                              {pendingGroupToStart.color}
                            </span>
                          )}
                        {pendingGroupToStart.size &&
                          pendingGroupToStart.size !== "-" && (
                            <span className="text-[10px] bg-white border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-800">
                              {pendingGroupToStart.size}
                            </span>
                          )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Nome do Operador Executante:
              </label>
              <div className="relative">
                <UserIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  placeholder="Seu nome..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition font-semibold text-gray-700 outline-none"
                  list="users-list-producao"
                />
                <datalist id="users-list-producao">
                  {currentUser.role === "MONTAGEM_RODRIGO" && (
                    <option value="Renata" />
                  )}
                  <option value={currentUser.name} />
                  {db.users?.map((u) => (
                    <option key={u.id} value={u.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                disabled={!selectedOperator}
                onClick={handleConfirmStart}
                className="w-full bg-[#00b14f] text-black hover:bg-[#00c95a] hover:scale-[1.02] transition font-bold py-3 px-4 rounded-xl shadow-sm text-sm disabled:opacity-50"
              >
                Sim, Iniciar AGORA
              </button>
              <button
                onClick={() => {
                  setConfirmStartModalOpen(false);
                  setPendingGroupToStart(null);
                }}
                className="w-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold py-3 px-4 rounded-xl transition text-sm text-center"
              >
                Cancelar
              </button>
            </div>
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
    </>
  );

  if (view === "MANUAL_PRODUCTION") {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-2 pb-16 max-w-lg mx-auto w-full">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-indigo-600 font-semibold mb-4 hover:text-indigo-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border w-full flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 text-indigo-800 border-b pb-2">
            <Hammer className="w-5 h-5" />
            <h3 className="font-bold text-xl">
              Iniciar Lançamento Avulso (Produção)
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            Registre e inicie a contagem de tempo de produção para clientes
            terceirizados ou demandas fora do controle do PCP.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Cliente (Terceiro) ou Origem / Projeto
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500"
              placeholder="Ex: Montagem Externa"
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
              className="border p-2 rounded focus:outline-indigo-500"
              placeholder="Ex: Cadeiras Mod. C"
            />
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={!manualTitle || !manualProduct}
            className="bg-indigo-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Activity size={18} /> Iniciar Processo
          </button>
        </div>
        {renderModals()}
      </div>
    );
  }

  if (view === "FINISH_PACK" && selectedPackId) {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    if (!activePack) return null;
    const item = db.items.find((i) => i.id === activePack.itemId);
    const isSoldaPack = 
      activePack.operatorId.startsWith("solda - ") ||
      ["Solda", "Enchimento", "Desempeno", "Furação", "Viradeira", "Outro"].includes(activePack.processName || "");

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
      <div
        className="flex flex-col h-full overflow-y-auto p-2 pb-16"
        style={{ overscrollBehavior: "contain" }}
      >
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-blue-600 font-semibold mb-4 hover:text-blue-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border w-full max-w-sm mx-auto flex flex-col gap-4 text-center mb-8 pb-8">
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
              {activePack.itemId === 0 ? (activePack.customProductName || "Avulso") : (item?.name || "Item Desconhecido")}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {activePack.itemId === 0 ? (
                <span>Cliente / Origem: <strong className="text-blue-700">{activePack.thirdPartyName || "Geral"}</strong></span>
              ) : (
                <span>{activePack.color || "-"} | {activePack.size || "-"} | {activePack.variation || "-"}</span>
              )}
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">
              {activePack.itemId === 0 ? "Lançamento Avulso (Sem Pedido Vinculado)" : "Restante a Produzir"}
            </p>
            <p className="font-bold text-2xl text-blue-800">
              {activePack.itemId === 0 ? "-" : relatedTotalRemaining}
            </p>
          </div>

          {(isSolda ||
            (isAdminOrGerencia && isSoldaPack)) && (
            <div className="flex flex-col gap-2 mt-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg">
              <h4 className="text-sm font-bold text-indigo-900 border-b border-indigo-100 pb-2 mb-2 text-left">
                1. Trocar de Processo (Mesma Peça)
              </h4>
              <p className="text-xs text-indigo-700 mb-2 text-left">
                Selecione o próximo processo. Isso fechará o tempo do{" "}
                <strong>{activePack.processName}</strong> e iniciará a contagem
                do novo.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Solda",
                  "Enchimento",
                  "Desempeno",
                  "Furação",
                  "Viradeira",
                  "Outro",
                ]
                  .filter((p) => p !== activePack.processName)
                  .map((proc) => {
                    const isSelected = nextProcess === proc;
                    return (
                      <button
                        key={proc}
                        onClick={() => setNextProcess(proc)}
                        className={`text-left py-2 px-3 rounded-lg border transition active:scale-98 cursor-pointer flex items-center justify-center text-xs font-semibold ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 text-amber-900 shadow-inner"
                            : "border-indigo-200 hover:border-indigo-300 bg-white text-indigo-700"
                        }`}
                      >
                        {proc}
                      </button>
                    );
                  })}
              </div>
              <button
                disabled={!nextProcess}
                onClick={() => handleSwitchProcess(nextProcess)}
                className="w-full bg-amber-500 hover:bg-amber-600 font-bold text-white py-2.5 rounded-lg mt-3 disabled:opacity-50 transition drop-shadow-sm text-sm"
              >
                Mudar para {nextProcess || "..."} e Iniciar
              </button>
            </div>
          )}

          <div
            className={`flex flex-col gap-2 mt-4 ${(isSolda || (isAdminOrGerencia && isSoldaPack)) ? "border-t pt-4" : ""}`}
          >
            {(isSolda ||
              (isAdminOrGerencia && isSoldaPack)) && (
              <h4 className="text-sm font-bold text-green-900 border-b border-green-100 pb-2 mb-2 text-left">
                2. Finalizar Peça (Concluída)
              </h4>
            )}
            <label className="text-sm font-semibold text-gray-700 text-left">
              Quantidade Produzida Agora:
            </label>
            <input
              type="number"
              value={packQuantity}
              onChange={(e) => setPackQuantity(Number(e.target.value))}
              placeholder="Ex: 50"
              className="border border-gray-300 p-3 rounded-lg text-xl text-center focus:outline-blue-500"
            />
          </div>
          {isRodrigo ? (
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => handlePack(true)}
                disabled={!packQuantity || packQuantity <= 0}
                className="bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Lançamento Parcial (Continuar Contagem)
              </button>
              <button
                onClick={() => handlePack(false)}
                disabled={!packQuantity || packQuantity <= 0}
                className="bg-green-600 text-white font-bold p-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                Finalizar Definitivamente
              </button>
            </div>
          ) : isRetratil ? (
            <div className="flex flex-col gap-3 mt-4 border-t pt-4 border-indigo-100">
              <button
                onClick={() => handlePack(false)}
                disabled={!packQuantity || packQuantity <= 0}
                className="w-full bg-green-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-50 shadow-md"
              >
                Finalizar Produção Definitivamente
              </button>

              {activePack.processName !== "Embalar" && (
                <div className="flex flex-col gap-2 border border-indigo-200 bg-indigo-50/50 p-4 rounded-xl mt-2">
                  <p className="text-sm font-bold text-indigo-900 border-b border-indigo-100 pb-2 mb-2 text-left">
                    Ou Lançar e Iniciar Próximo Processo:
                  </p>
                  <select
                    value={nextProcess}
                    onChange={(e) => setNextProcess(e.target.value)}
                    className="p-3 bg-white border border-indigo-200 rounded-lg text-sm font-semibold text-indigo-800 focus:outline-indigo-500 mb-2"
                  >
                    <option value="">Selecione o Próximo Processo...</option>
                    {["Conificar", "Montar", "Embalar"]
                      .filter((p) => p !== activePack.processName)
                      .map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => handlePack(false, nextProcess)}
                    disabled={
                      !packQuantity || packQuantity <= 0 || !nextProcess
                    }
                    className="w-full bg-indigo-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md"
                  >
                    Lançar Quantidade e Mudar para {nextProcess || "..."}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => handlePack(false)}
              disabled={!packQuantity || packQuantity <= 0}
              className="bg-green-600 text-white font-bold p-3 mt-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              Confirmar Produção
            </button>
          )}
        </div>
        {renderModals()}
      </div>
    );
  }

  if (view === "NEW_PACK") {
    const filteredGroups = productGroups.filter((g) => {
      if (!debouncedSearchTerm) return true;
      const item = db.items.find((i) => i.id === g.itemId);
      const searchStr = normalizeString(
        `${item?.name || ""} ${g.color} ${g.size} ${g.variation}`,
      );
      return searchStr.includes(normalizeString(debouncedSearchTerm));
    });

    return (
      <div className="flex flex-col h-full p-2 w-full max-w-lg mx-auto">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-blue-600 font-semibold mb-4 hover:text-blue-800"
        >
          <ArrowLeft size={20} /> Produções Ativas
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Lista de Produção
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
              Nenhum produto encontrado.
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredGroups.map((g, idx) => {
                const item = db.items.find((i) => i.id === g.itemId);
                return (
                  <div
                    key={idx}
                    onClick={() => startPackaging(g)}
                    className="bg-white p-4 border border-gray-200 flex justify-between items-center rounded-lg shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition gap-3"
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
                      <span className="font-bold text-gray-800 truncate">
                        {item?.name || "Item"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {g.color || "-"} | {g.size || "-"} |{" "}
                        {g.variation || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-500 mb-1">
                        Para Produzir
                      </span>
                      <span className="font-bold text-lg text-blue-600">
                        {g.totalRemaining}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {renderModals()}
      </div>
    );
  }

  const getHeaderInfo = () => {
    if (isSolda) {
      return {
        title: "Produção - Soldagem Geral",
        subtitle: `Operador: ${currentUser.name} | Setor Solda Ativo`,
        gradient: "from-blue-600 to-indigo-500",
      };
    }
    if (isRetratil) {
      return {
        title: "Produção - Montagem de Retrátil",
        subtitle: `Operador: ${currentUser.name} | Setor Montagem Retrátil`,
        gradient: "from-purple-600 to-indigo-500",
      };
    }
    if (isRodrigo) {
      return {
        title: "Produção - Pendurar Barra chata",
        subtitle: `Operadora: Renata | Setor Barra Chata Ativo`,
        gradient: "from-indigo-600 to-purple-500",
      };
    }
    if (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") {
      return {
        title: "Painel de Controle - Produção",
        subtitle: `Gestor: ${currentUser.name} | Visão Geral`,
        gradient: "from-slate-700 to-slate-500",
      };
    }
    return {
      title: "Posto de Produção Geral",
      subtitle: `Operador: ${currentUser.name} | Setor de Produção Ativo`,
      gradient: "from-emerald-600 to-teal-500",
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <ScreenLayout id="producao-screen-layout">
      <ScreenHeader
        title={headerInfo.title}
        description={headerInfo.subtitle}
        icon={<Activity className="text-emerald-600 animate-pulse" size={20} />}
      />

      <ProductivityCard db={db} currentUser={currentUser} />

      {/* Apontamento de Paradas de Máquina */}
      <MachineStopWidget db={db} currentUser={currentUser} machineName={currentUser.name} />

      {/* Offline Sync Status Banner */}
      {db.syncQueueCount !== undefined && (
        <div className="bg-emerald-50 border border-emerald-100 text-[#0f5132] px-4 py-2.5 rounded-xl flex items-center justify-between gap-4 shadow-2xs text-xs font-bold flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${db.quotaExceeded ? "bg-rose-500" : "bg-emerald-500"} animate-pulse`}
            ></span>
            <span>
              {db.quotaExceeded
                ? "Sincronização em Pausa (Cota)"
                : "Sincronizado com o servidor principal"}
            </span>
          </div>

          {db.quotaExceeded ? (
            <div className="flex items-center gap-2 bg-rose-100/80 border border-rose-200 text-rose-950 px-3 py-1.5 rounded-lg text-[11px]">
              <span>⚠️</span>
              <span className="truncate">
                Limite de gravação diária atingido. Dados salvos localmente!
              </span>
              <button
                onClick={() => db.triggerSyncQueue?.(true)}
                className="bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded text-[9px] uppercase hover:bg-rose-700 transition"
              >
                Forçar Sincronização
              </button>
            </div>
          ) : db.syncQueueCount > 0 ? (
            <div className="flex items-center gap-2 bg-amber-150 border border-amber-300 text-amber-950 px-3 py-1.5 rounded-lg text-[11px] animate-pulse">
              <span>
                ⚡ {db.syncQueueCount} apontamento(s) guardados em fila
              </span>
              <button
                onClick={() => db.triggerSyncQueue?.(true)}
                className="bg-amber-600 text-white font-extrabold px-2.5 py-1 rounded text-[10px] uppercase hover:bg-amber-700 transition"
              >
                Sincronizar
              </button>
            </div>
          ) : null}
        </div>
      )}

      <ScrollContainer paddingSize="dense" className="space-y-4">
        {/* CORPO ROLÁVEL INTEGRADO - Garante funcionamento impecável no mobile e desktop */}
        <div className="space-y-6 pr-1">
          {/* RESUMO DIÁRIO */}
          <DailySummaryWidget db={db} currentUser={currentUser} />



          {/* SEÇÃO DAS PRODUÇÕES ATIVAS */}
          <div className="pb-12">
            <h3 className="font-extrabold text-xs text-slate-550 uppercase tracking-widest mb-3">
              Atividades em Andamento
            </h3>
            {activePacksList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-xl max-w-sm mx-auto text-center mt-2">
                <Activity
                  size={40}
                  className="mb-3 text-slate-400 animate-pulse"
                />
                <p className="text-slate-550 text-sm font-semibold">
                  Nenhuma produção ativamente no posto.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Toque no botão iniciar no rodapé para apontar nova produção.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {activePacksList.map((pack) => {
                  const item = db.items.find((i) => i.id === pack.itemId);
                  return (
                    <div
                      key={pack.id}
                      onClick={() => openFinishScreen(pack.id)}
                      className="bg-white border p-3.5 rounded-lg shadow-xs flex justify-between items-center transition relative overflow-hidden border-blue-100 hover:border-blue-300 cursor-pointer hover:shadow-sm"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>

                      <div className="flex items-center gap-3 pl-2 max-w-[80%]">
                        {item?.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullSizeImage(item.imageUrl || null);
                            }}
                          />
                        )}
                        <div className="flex flex-col text-left shrink-1 min-w-0">
                          <div className="text-[9px] tracking-wider uppercase bg-blue-50 border border-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded w-max mb-1 shadow-3xs">
                            {currentUser.role === "SOLDA"
                              ? "Cabine de Soldagem"
                              : "Programação Ativa"}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs leading-tight truncate">
                            {pack.itemId === 0
                              ? pack.customProductName
                              : item?.name}
                          </span>
                          {pack.itemId === 0 ? (
                            <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                              Cliente/Projeto:{" "}
                              <strong className="text-slate-800">
                                {pack.thirdPartyName}
                              </strong>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                              Especificações:{" "}
                              <strong className="text-slate-800">
                                {pack.color || "-"} | {pack.size || "-"} |{" "}
                                {pack.variation || "-"}
                              </strong>
                            </span>
                          )}
                          {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && (
                            <span className="text-[10px] font-semibold text-gray-500 mt-0.5">
                              Operador: {pack.operatorId}
                            </span>
                          )}
                          {pack.operatorId.includes(" - ") && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded self-start">
                                🔧 Soldador: {pack.operatorId.split(" - ")[1]}
                              </span>
                              {pack.processName && (
                                <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded self-start">
                                  ⚡ {pack.processName}
                                </span>
                              )}
                            </div>
                          )}
                          {(() => {
                            const prog = getPackProgress(pack);
                            if (!prog) return null;
                            const pct =
                              Math.round((prog.produced / prog.total) * 100) ||
                              0;
                            return (
                              <div className="mt-1.5 w-full max-w-xs">
                                <div className="flex justify-between items-center text-[9px] text-slate-500 mb-0.5">
                                  <span className="font-semibold">
                                    Progresso da OS:
                                  </span>
                                  <span className="font-bold text-slate-700">
                                    {prog.produced} de {prog.total} un ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden border border-slate-200">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500 text-left"
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })()}

                          {pack.partialQuantity && pack.partialQuantity > 0 ? (
                            <div className="mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider w-max">
                              ⚡ Já Lançado (Parcial): {pack.partialQuantity} pçs
                            </div>
                          ) : null}

                          <div className="flex items-center gap-1 mt-1.5 text-blue-700 text-[10px] font-bold leading-none">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <span>
                              Produzindo há: {formatDuration(pack.startTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end pl-2 shrink-0">
                        <span className="text-[10px] uppercase font-extrabold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-full hover:bg-blue-100 transition shadow-2xs">
                          Finalizar ✓
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollContainer>

      <StickyActionsBar>
        <button
          onClick={() => setView("MANUAL_PRODUCTION")}
          className="bg-slate-150 hover:bg-slate-200 text-slate-750 font-extrabold py-2 px-3.5 rounded-lg transition text-[10px] uppercase tracking-wider cursor-pointer shadow-xs border border-slate-250"
        >
          Peça Avulsa
        </button>
        <button
          onClick={() => setView("NEW_PACK")}
          className="bg-emerald-600 text-white font-black py-2 px-5 rounded-lg shadow-md hover:bg-emerald-700 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider transition cursor-pointer"
        >
          <span>⚙️ INICIAR PROGRAMA</span>
        </button>
      </StickyActionsBar>
      {renderModals()}
    </ScreenLayout>
  );
}
