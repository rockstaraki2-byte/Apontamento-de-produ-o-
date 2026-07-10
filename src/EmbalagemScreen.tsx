import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Clock,
  User as UserIcon,
  User,
  Check,
  CheckCircle,
  Calendar,
  ArrowLeft,
  AlertCircle,
  X,
  Activity,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import { ProductivityCard } from "./components/ProductivityCard";
import { MachineStopWidget } from "./components/OperatorActions";
import type {
  User as UserType,
  OrderStatus,
  Role,
  Order,
  AppNotification,
} from "./types";
import { ScreenLayout, ScrollContainer } from "./components/Layout";

const getProductKey = (
  itemId: number,
  color: string,
  size: string,
  variation: string,
) => `${itemId}|${color}|${size}|${variation}`;

// Simple helper to normalize search operations
const normalizeString = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

interface EmbalagemScreenProps {
  db: ReturnType<typeof useDatabase>;
  currentUser: UserType;
  SVGQRCode: React.ComponentType<{ data: string }>;
}

export function EmbalagemScreen({
  db,
  currentUser,
  SVGQRCode,
}: EmbalagemScreenProps) {
  const [view, setView] = useState<
    "LIST_ACTIVE" | "NEW_PACK" | "FINISH_PACK" | "MANUAL_PRODUCTION"
  >("LIST_ACTIVE");
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [packQuantity, setPackQuantity] = useState<number | "">("");
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmingGroup, setConfirmingGroup] = useState<{
    itemId: number;
    color: string;
    size: string;
    variation: string;
    totalRemaining: number;
  } | null>(null);

  const [temCaixaIrregular, setTemCaixaIrregular] = useState(false);
  const [qtdCaixasIrregulares, setQtdCaixasIrregulares] = useState<number | "">(
    "",
  );
  const [itensPorCaixaIrregular, setItensPorCaixaIrregular] = useState<
    number | ""
  >("");

  // Funcionalidade 4: Popup de Caixas e Impressão de Etiqueta 10x5
  const [showPopupCaixas, setShowPopupCaixas] = useState(false);
  const [qtdCaixas, setQtdCaixas] = useState<number | "">("");
  const [itensPorCaixa, setItensPorCaixa] = useState<number | "">("");
  const [propriaEmbalagem, setPropriaEmbalagem] = useState(false);
  const [qtdDireta, setQtdDireta] = useState<number | "">("");
  const [tipoEmbalagem, setTipoEmbalagem] = useState("Caixa");

  // Visualização e Impressão da etiqueta gerada
  const [etiquetaLayout, setEtiquetaLayout] = useState<"THERMAL" | "A4">(
    "THERMAL",
  );
  const [etiquetaGerada, setEtiquetaGerada] = useState<{
    nome: string;
    total: number;
    embalagens: string;
    dataHoraStr: string;
    qrData: string;
    operador: string;
  } | null>(null);

  // Manual Production
  const [manualTitle, setManualTitle] = useState("");
  const [manualProduct, setManualProduct] = useState("");

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [operatorModalTarget, setOperatorModalTarget] = useState<any>(null);

  const proceedWithStart = (opId: string, groupOverride: any = null) => {
    const group = groupOverride || operatorModalTarget;

    if (!group) {
      // Manual Production Start
      if (!manualTitle || !manualProduct) return;
      db.addActivePack({
        id: Date.now(),
        itemId: 0,
        color: "-",
        size: "-",
        variation: "-",
        operatorId: opId || currentUser.id,
        startTime: Date.now(),
        type: "EMBALAGEM",
        taskId: 0,
        thirdPartyName: manualTitle,
        customProductName: manualProduct,
      });

      setManualTitle("");
      setManualProduct("");
      setOperatorModalOpen(false);
      setSelectedOperator("");
      setOperatorModalTarget(null);
      setView("LIST_ACTIVE");
      return;
    }

    // Normal Catalog Start
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
      alert("Este operador já tem uma embalagem ativa para este produto!");
      return;
    }
    db.addActivePack({
      id: Date.now(),
      itemId: group.itemId,
      color: group.color,
      size: group.size,
      variation: group.variation,
      operatorId: opId || currentUser.id,
      startTime: Date.now(),
      type: "EMBALAGEM",
    });
    setOperatorModalOpen(false);
    setSelectedOperator("");
    setOperatorModalTarget(null);
    setConfirmingGroup(null);
    setView("LIST_ACTIVE");
  };

  const handleStartManualProduction = () => {
    if (!manualTitle || !manualProduct) return;
    setOperatorModalTarget(null);
    setSelectedOperator(currentUser.name);
    setOperatorModalOpen(true);
  };

  // Optimization: useMemo on the active packs list to filter only when db.activePacks or current user changes
  const activePacksList = useMemo(() => {
    return db.activePacks.filter(
      (p) =>
        p.type === "EMBALAGEM" &&
        (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "EMBALAGEM" ? true : p.operatorId === currentUser.id),
    );
  }, [db.activePacks, currentUser.role, currentUser.id]);

  const getAvailableForPacking = (o: Order) => o.totalQuantity;

  const pendingOrders = useMemo(() => {
    return db.orders.filter(
      (o) =>
        o.status !== "EMBALADO" &&
        o.status !== "FATURADO" &&
        (o.packedQuantity || 0) < getAvailableForPacking(o),
    );
  }, [db.orders]);

  // Group pending orders by product
  const productGroups = useMemo(() => {
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
      const displayColor = o.paintedColor || o.color;
      const key = getProductKey(o.itemId, displayColor, o.size, o.variation);
      if (!groups.has(key)) {
        groups.set(key, {
          itemId: o.itemId,
          color: displayColor,
          size: o.size,
          variation: o.variation,
          totalRemaining: 0,
        });
      }
      groups.get(key)!.totalRemaining +=
        (getAvailableForPacking(o) || 0) - (o.packedQuantity || 0);
    });
    return Array.from(groups.values());
  }, [pendingOrders]);

  const startPackaging = (group: (typeof productGroups)[0]) => {
    setOperatorModalTarget(group);
    setSelectedOperator(currentUser.name);
    setOperatorModalOpen(true);
  };

  const openFinishScreen = (packId: number) => {
    setSelectedPackId(packId);
    setView("FINISH_PACK");
  };

  const handlePack = (overrideQty?: number, config?: { boxes: number; itemsPerBox: number }[]) => {
    const activePack = db.activePacks.find((p) => p.id === selectedPackId);
    const targetQty =
      overrideQty !== undefined ? overrideQty : Number(packQuantity);
    if (!activePack || !targetQty) return;

    let qtyToAllocate = targetQty;
    const endTime = Date.now();
    const durationMillis = endTime - activePack.startTime;

    if (activePack.itemId === 0) {
      db.addLogs([
        {
          id: Date.now(),
          operatorId: currentUser.id,
          quantityPacked: qtyToAllocate,
          type: "EMBALAGEM",
          timestamp: endTime,
          durationMillis,
          thirdPartyName: activePack.thirdPartyName,
          customProductName: activePack.customProductName,
          packagesConfig: config,
        },
      ]);
      db.removeActivePack(activePack.id);
      setSelectedPackId(null);
      setPackQuantity("");
      setView("LIST_ACTIVE");
      return;
    }

    // FIFO: sort by delivery date, then created At
    const ordersForProduct = pendingOrders
      .filter(
        (o) =>
          o.itemId === activePack.itemId &&
          (o.paintedColor || o.color) === activePack.color &&
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
    let updatedOrders = [...db.orders];

    let remainingConfig = config ? JSON.parse(JSON.stringify(config)) : [];
    
    const extractConfig = (amount: number) => {
        if (!remainingConfig || remainingConfig.length === 0) return undefined;
        let extracted: {boxes: number, itemsPerBox: number}[] = [];
        let remainingLinked = amount;
        let newOriginalConfig: {boxes: number, itemsPerBox: number}[] = [];

        for (const grp of remainingConfig) {
            let leftBoxes = grp.boxes;
            
            while(remainingLinked >= grp.itemsPerBox && leftBoxes > 0) {
               remainingLinked -= grp.itemsPerBox;
               leftBoxes--;
               
               let existingGroupLink = extracted.find((c: any) => c.itemsPerBox === grp.itemsPerBox);
               if (existingGroupLink) {
                 existingGroupLink.boxes++;
               } else {
                 extracted.push({ boxes: 1, itemsPerBox: grp.itemsPerBox });
               }
            }
            
            if (leftBoxes > 0) {
               newOriginalConfig.push({ boxes: leftBoxes, itemsPerBox: grp.itemsPerBox });
            }
        }
        
        if (remainingLinked > 0) {
            for (let i = 0; i < newOriginalConfig.length; i++) {
                if (remainingLinked <= 0) break;
                
                const grp = newOriginalConfig[i];
                if (grp.boxes > 0) {
                    grp.boxes--;
                    if (grp.boxes === 0) {
                       newOriginalConfig.splice(i, 1);
                       i--;
                    }
                    
                    const takeQty = Math.min(remainingLinked, grp.itemsPerBox);
                    const leftQty = grp.itemsPerBox - takeQty;
                    
                    let existingGroupLink = extracted.find((c: any) => c.itemsPerBox === takeQty);
                    if (existingGroupLink) {
                      existingGroupLink.boxes++;
                    } else {
                      extracted.push({ boxes: 1, itemsPerBox: takeQty });
                    }
                    
                    if (leftQty > 0) {
                       let existingGroupOriginal = newOriginalConfig.find((c: any) => c.itemsPerBox === leftQty);
                       if (existingGroupOriginal) {
                          existingGroupOriginal.boxes++;
                       } else {
                          newOriginalConfig.push({ boxes: 1, itemsPerBox: leftQty });
                       }
                    }
                    
                    remainingLinked -= takeQty;
                }
            }
        }
        
        remainingConfig = newOriginalConfig;
        return extracted.length > 0 ? extracted : undefined;
    };

    for (let o of ordersForProduct) {
      if (qtyToAllocate <= 0) break;
      const needed = o.totalQuantity - o.packedQuantity;
      const allocate = Math.min(needed, qtyToAllocate);

      if (allocate > 0) {
        const oIndex = updatedOrders.findIndex((uo) => uo.id === o.id);
        if (oIndex >= 0) {
          const newPacked = updatedOrders[oIndex].packedQuantity + allocate;
          const status =
            newPacked >= updatedOrders[oIndex].totalQuantity
              ? "EMBALADO"
              : "EMBALANDO";
          updatedOrders[oIndex] = {
            ...updatedOrders[oIndex],
            packedQuantity: newPacked,
            status,
            isActive: newPacked < updatedOrders[oIndex].totalQuantity,
          };
        }

        qtyToAllocate -= allocate;
        totalAssignedQty += allocate;

        logsToAdd.push({
          orderId: o.id,
          operatorId: currentUser.id,
          itemId: activePack.itemId,
          quantityPacked: allocate,
          type: "EMBALAGEM",
          timestamp: endTime,
          durationMillis: 0,
          packagesConfig: extractConfig(allocate),
        });
      }
    }

    if (qtyToAllocate > 0) {
      totalAssignedQty += qtyToAllocate;
      logsToAdd.push({
        operatorId: currentUser.id,
        itemId: activePack.itemId,
        quantityPacked: qtyToAllocate,
        type: "EMBALAGEM",
        timestamp: endTime,
        durationMillis: 0,
        packagesConfig: extractConfig(qtyToAllocate),
      });
    }

    const totalPackedQty = targetQty;
    if (totalPackedQty > 0) {
      const stockId = `${activePack.itemId}|${activePack.color}|${activePack.size}|${activePack.variation}|ACABADO`;
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
            stage: "ACABADO",
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
        description: `Embalagem finalizada para o produto - entrada automática no estoque (Operador: ${currentUser.name})`,
      });
    }

    if (totalAssignedQty > 0) {
      logsToAdd.forEach((log) => {
        log.durationMillis =
          totalAssignedQty > 0
            ? (log.quantityPacked / totalAssignedQty) * durationMillis
            : durationMillis;
        log.id = Date.now() + Math.random();
      });
      db.addLogs(logsToAdd);

      const itemDb = db.items.find((i) => i.id === activePack.itemId);
      db.addNotification({
        message: `Embalagem Finalizada: ${totalAssignedQty} de ${itemDb?.name || "Item"} (${activePack.color || "-"} | ${activePack.size || "-"})`,
        read: false,
      });
    }

    db.updateOrders(updatedOrders);
    db.removeActivePack(activePack.id);
    setSelectedPackId(null);
    setPackQuantity("");
    setView("LIST_ACTIVE");
  };

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

    const calcRegular = Number(qtdCaixas || 0) * Number(itensPorCaixa || 0);
    const calcIrr = temCaixaIrregular
      ? Number(qtdCaixasIrregulares || 0) * Number(itensPorCaixaIrregular || 0)
      : 0;
    const total = propriaEmbalagem
      ? Number(qtdDireta || 0)
      : calcRegular + calcIrr;

    return (
      <div className="flex flex-col h-full overflow-y-auto p-2 pb-6">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-blue-600 font-semibold mb-3 hover:text-blue-800 animate-fade-in text-sm"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="bg-white p-4 rounded-xl shadow-sm border w-full max-w-sm mx-auto flex flex-col gap-4 text-center">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <span>📦</span> Cadastro de Embalagem final
            </h3>
          </div>

          <div className="flex items-center gap-3 text-left">
            {item?.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition"
                onClick={() => setFullSizeImage(item.imageUrl || null)}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-gray-800 truncate">
                {activePack.itemId === 0 ? (activePack.customProductName || "Avulso") : (item?.name || "Item Desconhecido")}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5 truncate">
                {activePack.itemId === 0 ? (
                  <span>Origem: <strong className="text-blue-700">{activePack.thirdPartyName || "Geral"}</strong></span>
                ) : (
                  <span>{activePack.color || "-"} | {activePack.size || "-"} | {activePack.variation || "-"}</span>
                )}
              </p>
            </div>
            <div className="bg-blue-50 px-2 py-1 flex flex-col items-center justify-center rounded">
               <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Pendentes</span>
               <span className="font-bold text-sm text-blue-700">
                  {activePack.itemId === 0 ? "-" : relatedTotalRemaining}
               </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-1 text-left">
            {/* Tipo de Embalagem Selection */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Tipo de Embalagem
              </label>
              <select
                value={tipoEmbalagem}
                onChange={(e) => setTipoEmbalagem(e.target.value)}
                className="border border-slate-300 p-2.5 rounded-lg font-bold text-sm bg-slate-50 text-slate-900 focus:outline-blue-500"
              >
                <option value="Caixa">Caixa</option>
                <option value="Saco">Saco</option>
                <option value="Fardo">Fardo</option>
                <option value="Palete">Palete</option>
                <option value="Rolo">Rolo</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={propriaEmbalagem}
                onChange={(e) => {
                  setPropriaEmbalagem(e.target.checked);
                  if (e.target.checked) setQtdDireta(""); // clear to type
                }}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-xs font-bold text-slate-700">
                O próprio produto é a embalagem (Avulso)
              </span>
            </label>

            {!propriaEmbalagem ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Qtd de {tipoEmbalagem}s Padrão *
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 5"
                      value={qtdCaixas}
                      onChange={(e) =>
                        setQtdCaixas(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className="border border-slate-300 p-2.5 rounded-lg font-bold text-sm bg-white text-slate-900"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Produtos por {tipoEmbalagem} *
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 24"
                      value={itensPorCaixa}
                      onChange={(e) =>
                        setItensPorCaixa(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      className="border border-slate-300 p-2.5 rounded-lg font-bold text-sm bg-white text-slate-900"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temCaixaIrregular}
                    onChange={(e) => setTemCaixaIrregular(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Adicionar embalagens com quantia menor
                  </span>
                </label>

                {temCaixaIrregular && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-indigo-700 uppercase">
                        Qtd {tipoEmbalagem} Diferente
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 1"
                        value={qtdCaixasIrregulares}
                        onChange={(e) =>
                          setQtdCaixasIrregulares(
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        className="border border-indigo-200 p-2 rounded-md font-bold text-sm bg-white text-indigo-900"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-indigo-700 uppercase">
                        Produtos (Nestas)
                      </label>
                      <input
                        type="number"
                        placeholder="Ex: 21"
                        value={itensPorCaixaIrregular}
                        onChange={(e) =>
                          setItensPorCaixaIrregular(
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        className="border border-indigo-200 p-2 rounded-md font-bold text-sm bg-white text-indigo-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Quantidade Total Finalizada *
                </label>
                <input
                  type="number"
                  placeholder="Ex: 120"
                  value={qtdDireta}
                  onChange={(e) =>
                    setQtdDireta(e.target.value ? Number(e.target.value) : "")
                  }
                  className="border border-slate-300 p-2.5 rounded-lg font-bold text-sm bg-white text-slate-900"
                />
              </div>
            )}

            {/* Live calculation banner */}
            {total > 0 && (
              <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-3 rounded-lg border border-emerald-100 flex justify-between items-center mt-2">
                <span>Total Calculado:</span>
                <span className="text-sm bg-emerald-100 px-2 py-0.5 rounded">
                  {total} unidades
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => {
                  let embalagemTexto = propriaEmbalagem
                    ? "Sem embalagem (avulso)"
                    : `${qtdCaixas} ${tipoEmbalagem.toLowerCase()} c/ ${itensPorCaixa} un`;

                  if (
                    !propriaEmbalagem &&
                    temCaixaIrregular &&
                    Number(qtdCaixasIrregulares) > 0
                  ) {
                    embalagemTexto += ` + ${qtdCaixasIrregulares} ${tipoEmbalagem.toLowerCase()} c/ ${itensPorCaixaIrregular} un`;
                  }

                  if (total <= 0) {
                    alert("Indique valores válidos para finalizar!");
                    return;
                  }

                  const config: { boxes: number; itemsPerBox: number }[] = [];
                  if (propriaEmbalagem) {
                     config.push({ boxes: 1, itemsPerBox: Number(qtdDireta || 0) });
                  } else {
                     if (Number(qtdCaixas || 0) > 0) {
                        config.push({ boxes: Number(qtdCaixas), itemsPerBox: Number(itensPorCaixa) });
                     }
                     if (temCaixaIrregular && Number(qtdCaixasIrregulares || 0) > 0) {
                        config.push({ boxes: Number(qtdCaixasIrregulares), itemsPerBox: Number(itensPorCaixaIrregular) });
                     }
                  }

                  // Grava sem abrir pop-up de etiqueta
                  handlePack(total, config);
                }}
                className="bg-green-600 text-white font-bold p-3 rounded-lg hover:bg-green-700 transition w-full text-xs uppercase shadow cursor-pointer"
              >
                ✓ Salvar sem Imprimir (Apenas Gravar)
              </button>

              <button
                onClick={() => {
                  let embalagemTexto = propriaEmbalagem
                    ? "Sem emb. avulsa"
                    : `${qtdCaixas} ${tipoEmbalagem.substring(0,3).toLowerCase()} c/ ${itensPorCaixa} un`;

                  if (
                    !propriaEmbalagem &&
                    temCaixaIrregular &&
                    Number(qtdCaixasIrregulares) > 0
                  ) {
                    embalagemTexto += ` + ${qtdCaixasIrregulares} ${tipoEmbalagem.substring(0,3).toLowerCase()} c/ ${itensPorCaixaIrregular} un`;
                  }

                  if (total <= 0) {
                    alert("Indique valores válidos para finalizar!");
                    return;
                  }

                  const nomeProd =
                    activePack.itemId === 0
                      ? activePack.customProductName || "Avulso"
                      : item?.name || "Item";
                  const now = new Date();
                  const dataHoraStr =
                    now.toLocaleDateString("pt-BR") +
                    " " +
                    now.toLocaleTimeString("pt-BR").substring(0, 5);

                  setEtiquetaGerada({
                    nome: `${nomeProd} (${activePack.color || "-"} | ${activePack.size || "-"})`,
                    total,
                    embalagens: embalagemTexto,
                    dataHoraStr,
                    qrData: `PROD: ${nomeProd} | QTD: ${total} | EMB: ${embalagemTexto} | DATE: ${dataHoraStr}`,
                    operador: currentUser.name,
                  });

                  const config: { boxes: number; itemsPerBox: number }[] = [];
                  if (propriaEmbalagem) {
                     config.push({ boxes: 1, itemsPerBox: Number(qtdDireta || 0) });
                  } else {
                     if (Number(qtdCaixas || 0) > 0) {
                        config.push({ boxes: Number(qtdCaixas), itemsPerBox: Number(itensPorCaixa) });
                     }
                     if (temCaixaIrregular && Number(qtdCaixasIrregulares || 0) > 0) {
                        config.push({ boxes: Number(qtdCaixasIrregulares), itemsPerBox: Number(itensPorCaixaIrregular) });
                     }
                  }

                  handlePack(total, config);
                }}
                className="bg-slate-800 text-white font-bold p-3 rounded-lg hover:bg-slate-900 transition w-full text-xs uppercase shadow cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🏷️ Gravar Trabalho & Imprimir Etiqueta</span>
              </button>
            </div>
          </div>
        </div>

        {renderModals()}

        {/* VISUALIZAÇÃO DA ETIQUETA FORMATO 10x5 CM DA FUNCIONALIDADE 4 */}
        {etiquetaGerada && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-100 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 text-slate-800">
              <div className="w-full border-b pb-3 flex justify-between items-center">
                <h3 className="font-extrabold text-base text-gray-800">
                  ✓ Produção Gravada & Etiqueta Pronta
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  Salvo com Sucesso
                </span>
              </div>

              {/* Printable Area - styled explicitly in 10cm x 5cm proportions */}
              <div
                id="etiqueta-print-box"
                className="w-[378px] h-[189px] bg-white border-2 border-solid border-black p-4 flex justify-between select-none relative font-sans text-black"
              >
                <div className="flex flex-col justify-between h-full text-left max-w-[230px]">
                  <div>
                    <div className="text-[9px] font-extrabold uppercase bg-black text-white px-1.5 py-0.5 w-max tracking-wide">
                      ETIQUETA DE PROCESSO
                    </div>
                    <h4 className="font-extrabold text-sm text-black mt-1.5 leading-tight uppercase line-clamp-2">
                      {etiquetaGerada.nome}
                    </h4>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="text-xs font-semibold">
                      Qtd Total:{" "}
                      <strong className="text-sm font-black">
                        {etiquetaGerada.total} un
                      </strong>
                    </div>
                    <div className="text-[10px] font-bold text-gray-700">
                      Embalagem: {etiquetaGerada.embalagens}
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono mt-1">
                      Lançamento: {etiquetaGerada.dataHoraStr}
                    </div>
                    <div className="text-[8px] text-gray-400 font-semibold">
                      Operador: {etiquetaGerada.operador}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-1">
                  <SVGQRCode data={etiquetaGerada.qrData} />
                  <span className="text-[8px] font-bold font-mono text-gray-400">
                    RASTREABILIDADE
                  </span>
                </div>
              </div>

              <div className="w-full flex justify-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="layout_mode"
                    value="THERMAL"
                    checked={etiquetaLayout === "THERMAL"}
                    onChange={() => setEtiquetaLayout("THERMAL")}
                    className="w-4 h-4 text-indigo-600"
                  />
                  Térmica (10x5cm)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="layout_mode"
                    value="A4"
                    checked={etiquetaLayout === "A4"}
                    onChange={() => setEtiquetaLayout("A4")}
                    className="w-4 h-4 text-indigo-600"
                  />
                  Folha A4
                </label>
              </div>

              <div className="flex gap-3 w-full border-t pt-4">
                <button
                  onClick={() => {
                    const printBox =
                      document.getElementById("etiqueta-print-box");
                    if (printBox) {
                      import("./printUtils").then(({ printHtml }) => {
                        const styleBlock =
                          etiquetaLayout === "A4"
                            ? `
                           @page { size: A4 portrait; margin: 0.5cm; }
                           body { margin: 0; background: #fff; }
                           #print-wrapper { width: 10cm; height: 5cm; border: 1px solid #000; box-sizing: border-box; padding: 15px; display: flex; justify-content: space-between; font-family: sans-serif; position: relative; }
                         `
                            : `
                           @page { size: 10cm 5cm; margin: 0; }
                           body { margin: 0; background: #fff; width: 10cm; height: 5cm; display: flex; justify-content: center; align-items: center; }
                           #print-wrapper { width: 100%; height: 100%; box-sizing: border-box; padding: 15px; display: flex; justify-content: space-between; font-family: sans-serif; border: 2px solid #000; }
                         `;

                        printHtml(
                          `
                           <style>${styleBlock}</style>
                           <div id="print-wrapper">
                             ${printBox.innerHTML}
                           </div>
                         `,
                          etiquetaLayout,
                        );
                      });
                    }
                  }}
                  className="bg-slate-800 text-white font-bold p-3 rounded-lg hover:bg-slate-900 transition flex-1 flex items-center justify-center gap-2 text-sm uppercase shadow cursor-pointer"
                >
                  <span>🖨️ Imprimir Etiqueta</span>
                </button>
                <button
                  onClick={() => {
                    setEtiquetaGerada(null);
                    setView("LIST_ACTIVE");
                  }}
                  className="bg-emerald-600 text-white font-bold p-3 rounded-lg hover:bg-emerald-700 transition flex-1 text-center text-sm uppercase shadow cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "MANUAL_PRODUCTION") {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-2 max-w-lg mx-auto w-full animate-fade-in">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-blue-600 font-semibold mb-4 hover:text-blue-800"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="bg-white p-6 rounded-lg shadow-sm border w-full flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 text-blue-800 border-b pb-2">
            <Activity className="w-5 h-5" />
            <h3 className="font-bold text-xl">
              Iniciar Lançamento Avulso (Embalagem)
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            Registre e inicie a contagem de tempo de embalagem para terceiros ou
            uso avulso.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Cliente (Terceiro) ou Origem / Projeto
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="border p-2 rounded focus:outline-blue-500 bg-white"
              placeholder="Ex: Montagem XYZ"
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
              className="border p-2 rounded focus:outline-blue-500 bg-white"
              placeholder="Ex: Parafusos soltos"
            />
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={!manualTitle || !manualProduct}
            className="bg-blue-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
          >
            <Activity size={18} /> Iniciar Processo
          </button>
        </div>
        {renderModals()}
      </div>
    );
  }



  // --- Modals Render (rendered on all views) ---
  function renderModals() {
    return (
      <>
        {operatorModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-5 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-gray-800 text-center border-b pb-2">
                Selecione o Operador
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Confirme quem está executando a embalagem agora.
              </p>

              <div className="flex flex-col gap-1 mt-2">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Nome do Operador
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition font-semibold text-gray-700 outline-none"
                    list="users-list-embalagem"
                  />
                  <datalist id="users-list-embalagem">
                    <option value={currentUser.name} />
                    {db.users
                      ?.filter((u) => u.name !== currentUser.name)
                      .map((u) => (
                        <option key={u.id} value={u.name} />
                      ))}
                  </datalist>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <button
                  disabled={!selectedOperator}
                  onClick={() => proceedWithStart(selectedOperator)}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-blue-700 transition"
                >
                  Confirmar Operador e Iniciar
                </button>
                <button
                  onClick={() => {
                    setOperatorModalOpen(false);
                    setOperatorModalTarget(null);
                  }}
                  className="w-full py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
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
      <div className="flex flex-col h-full overflow-y-auto animate-fade-in p-2">
        <button
          onClick={() => setView("LIST_ACTIVE")}
          className="flex items-center gap-2 self-start text-blue-600 font-semibold mb-3 hover:text-blue-800 text-sm"
        >
          <ArrowLeft size={16} /> Embalagens Ativas
        </button>
        <h2 className="text-sm font-bold mb-3 text-gray-800 uppercase">
          Lista de Produção (Por Produto)
        </h2>
        <input
          type="text"
          placeholder="Pesquisar produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 p-2 rounded-lg mb-3 text-sm bg-white text-slate-900"
        />
        <div className="flex-1 overflow-y-auto w-full pb-6">
          {filteredGroups.length === 0 ? (
            <p className="text-gray-500 text-center mt-4 text-sm">
              Nenhum produto encontrado.
            </p>
          ) : (
            <div className="grid gap-2">
              {filteredGroups.map((g, idx) => {
                const item = db.items.find((i) => i.id === g.itemId);
                return (
                  <div
                    key={idx}
                    onClick={() => setConfirmingGroup(g)}
                    className="bg-white p-2.5 border border-gray-200 flex justify-between items-center rounded-lg shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition gap-2"
                  >
                    {item?.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFullSizeImage(item.imageUrl || null);
                        }}
                      />
                    )}
                    <div className="flex flex-col flex-1 shrink min-w-0">
                      <span className="font-bold text-xs text-gray-800 truncate">
                        {item?.name || "Item"}
                      </span>
                      <span className="text-[10px] text-gray-500 flex flex-wrap gap-1 mt-0.5">
                        <span className="bg-slate-100 px-1 rounded">{g.color || "-"}</span>
                        <span className="bg-slate-100 px-1 rounded">{g.size || "-"}</span>
                        <span className="bg-slate-100 px-1 rounded">{g.variation || "-"}</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">
                        Embalar
                      </span>
                      <span className="font-bold text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
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
        {confirmingGroup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 flex flex-col text-left">
              <div className="p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <span className="text-xl">📦</span>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">
                    Confirmar Início?
                  </h3>
                </div>

                <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                  Você está prestes a iniciar o registro de embalagem do item:
                </p>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 mb-3 flex gap-2.5 items-center">
                  {db.items.find((i) => i.id === confirmingGroup.itemId)
                    ?.imageUrl && (
                    <img
                      src={
                        db.items.find((i) => i.id === confirmingGroup.itemId)
                          ?.imageUrl
                      }
                      alt=""
                      className="w-12 h-12 object-cover rounded shadow-sm border border-slate-200 cursor-pointer hover:opacity-80 transition shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullSizeImage(
                          db.items.find((i) => i.id === confirmingGroup.itemId)
                            ?.imageUrl || null,
                        );
                      }}
                    />
                  )}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="font-bold text-xs text-slate-800 line-clamp-1">
                      {db.items.find((i) => i.id === confirmingGroup.itemId)
                        ?.name || "Item"}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-mono bg-slate-200/60 px-1 py-0.5 rounded">
                        Cor: {confirmingGroup.color || "-"}
                      </span>
                      <span className="font-mono bg-slate-200/60 px-1 py-0.5 rounded">
                        Tam: {confirmingGroup.size || "-"}
                      </span>
                    </div>
                    <div className="text-[10px] font-semibold text-blue-600 mt-0.5">
                      Pendentes:{" "}
                      <span className="font-bold text-xs">
                        {confirmingGroup.totalRemaining}
                      </span>{" "}
                      un
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setConfirmingGroup(null)}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 px-3 rounded-lg text-[11px] hover:bg-slate-200 transition"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => {
                      const group = confirmingGroup;
                      setConfirmingGroup(null);
                      startPackaging(group);
                    }}
                    className="flex-1 bg-blue-600 text-white font-bold py-2 px-3 rounded-lg text-[11px] hover:bg-blue-700 transition shadow-sm"
                  >
                    Iniciar Agora
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <ScreenLayout className="bg-slate-50 relative p-1">
      <ScrollContainer
        paddingSize="dense"
        className="w-full max-w-2xl mx-auto flex flex-col gap-2"
      >
        {/* Header Widget */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-sky-600 p-2 rounded-lg text-white shadow-sm shrink-0">
          <Package className="animate-pulse w-5 h-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xs md:text-sm font-black font-sans text-white leading-tight truncate uppercase tracking-wider">
              Central de Embalagem e Expedição
            </h2>
            <p className="text-[9px] text-blue-100 font-mono truncate">
              Operador: {currentUser.name} | Rastreamento / Expedição Ativa
            </p>
          </div>
        </div>

        {/* ProductivityCard in smaller scaled container for high density */}
        <div className="text-xs">
          <ProductivityCard db={db} currentUser={currentUser} />
        </div>

        {/* Apontamento de Paradas de Máquina */}
        <div className="text-xs">
          <MachineStopWidget db={db} currentUser={currentUser} machineName="Central de Embalagem" />
        </div>

        {/* Offline Sync Status Banner */}
        {db.syncQueueCount !== undefined && (
          <div className="bg-emerald-50 border border-emerald-100 text-[#0f5132] px-2.5 py-1 rounded-lg flex items-center justify-between gap-2 shadow-2xs text-[10px] font-bold flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Sincronizado com o servidor</span>
            </div>

            {db.quotaExceeded ? (
              <div className="flex items-center gap-1.5 bg-rose-100/80 border border-rose-200 text-rose-950 px-2 py-1 rounded-md text-[9px]">
                <span>⚠️ Limite atingido. Salvo local!</span>
              </div>
            ) : db.syncQueueCount > 0 ? (
              <div className="flex items-center gap-1.5 bg-amber-150 border border-amber-300 text-amber-950 px-2 py-1 rounded-md text-[9px] animate-pulse">
                <span>⚡ {db.syncQueueCount} em fila</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex-1 overflow-y-auto w-full pb-28">

          {activePacksList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-2xl max-w-sm mx-auto text-center mt-6">
              <Package
                size={40}
                className="mb-3 text-slate-400 animate-pulse"
              />
              <p className="text-slate-500 text-sm font-semibold">
                Nenhuma embalagem ativa em andamento.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Toque no botão iniciar no rodapé para registrar um trabalho.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activePacksList.map((pack) => {
                const item = db.items.find((i) => i.id === pack.itemId);

                return (
                  <div
                    key={pack.id}
                    onClick={() => openFinishScreen(pack.id)}
                    className="bg-white border p-2 rounded-lg shadow-3xs flex justify-between items-center transition relative overflow-hidden border-emerald-200 hover:border-emerald-300 cursor-pointer hover:shadow-xs"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>

                    <div className="flex items-center gap-2 pl-2 max-w-[80%]">
                      {item?.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-9 h-9 object-cover rounded shadow-xs border border-slate-200 cursor-pointer hover:opacity-80 transition shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullSizeImage(item.imageUrl || null);
                          }}
                        />
                      )}
                      <div className="flex flex-col text-left shrink-1 min-w-0">
                        <div className="text-[8px] tracking-wider uppercase bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold px-1 py-0.2 rounded w-max mb-1 shadow-3xs">
                          Setor de Expedição Ativo
                        </div>
                        <span className="font-extrabold text-slate-900 text-xs leading-none truncate flex items-center gap-1">
                          {pack.itemId === 0
                            ? pack.customProductName
                            : item?.name}
                          {pack.itemId === 0 && (
                            <span className="bg-blue-100 text-blue-700 px-1 py-0.2 rounded text-[7px] uppercase font-black">
                              Avulso
                            </span>
                          )}
                        </span>
                        {pack.itemId === 0 ? (
                          <span className="text-[10px] font-semibold text-slate-500 mt-1">
                            Cliente/Projeto:{" "}
                            <strong className="text-slate-800">
                              {pack.thirdPartyName}
                            </strong>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 mt-1">
                            Especificações:{" "}
                            <strong className="text-slate-800">
                              {pack.color || "-"} | {pack.size || "-"} |{" "}
                              {pack.variation || "-"}
                            </strong>
                          </span>
                        )}
                        {(currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && (
                          <span className="text-[10px] font-semibold text-gray-500 mt-1">
                            Operador ID: {pack.operatorId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-[9px] uppercase font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-200 transition shadow-3xs">
                        Finalizar ✓
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollContainer>

      <div className="bg-white p-2.5 md:p-3.5 border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex gap-3 z-30 justify-between shrink-0">
        <button
          onClick={() => setView("MANUAL_PRODUCTION")}
          className="bg-slate-100 text-slate-700 font-extrabold py-2 px-3.5 rounded-lg flex-1 shadow-xs hover:bg-slate-200 transition text-[10px] uppercase tracking-wider cursor-pointer"
        >
          Avulso
        </button>
        <button
          onClick={() => setView("NEW_PACK")}
          className="bg-blue-600 text-white font-black py-2 px-3.5 rounded-lg flex-[2] shadow-sm hover:bg-blue-700 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider transition cursor-pointer"
        >
          <span>🚀 INICIAR EMBALAGEM</span>
        </button>
      </div>

      {operatorModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-5 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800 text-center border-b pb-2">
              Selecione o Operador
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Confirme quem está executando a embalagem agora.
            </p>

            <div className="flex flex-col gap-1 mt-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Nome do Operador
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition font-semibold text-gray-700 outline-none"
                  list="users-list-embalagem"
                />
                <datalist id="users-list-embalagem">
                  <option value={currentUser.name} />
                  {db.users
                    ?.filter((u) => u.name !== currentUser.name)
                    .map((u) => (
                      <option key={u.id} value={u.name} />
                    ))}
                </datalist>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button
                disabled={!selectedOperator}
                onClick={() => proceedWithStart(selectedOperator)}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-blue-700 transition"
              >
                Confirmar Operador e Iniciar
              </button>
              <button
                onClick={() => {
                  setOperatorModalOpen(false);
                  setOperatorModalTarget(null);
                }}
                className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
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
    </ScreenLayout>
  );
}
