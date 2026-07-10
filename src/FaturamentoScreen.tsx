import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDatabase } from "./useDatabase";
import {
  Plus,
  Trash2,
  Check,
  CheckSquare,
  Square,
  Printer,
  Bot,
  Loader2,
  Calendar,
  MapPin,
  Truck,
  FileText,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Filter,
  XCircle,
  RefreshCw,
  BadgeInfo,
  Layers,
  Package,
  ChevronRight,
  Settings,
  Info,
  Pencil,
  X,
} from "lucide-react";
import { Order, Carga, User, StockEntry } from "./types";

// Simulated lightweight barcode SVG generator for labels
function SimulatedBarcode({ code }: { code: string }) {
  // Generates randomized width stripes for a realistic barcode look
  const widthList = [
    1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2,
  ];
  return (
    <div className="flex flex-col items-center mt-1 select-none">
      <div className="flex items-end h-8 gap-[1px]">
        {widthList.map((w, idx) => (
          <div
            key={idx}
            className="bg-black h-full"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      <span className="text-[8px] font-mono tracking-widest text-center mt-[2px]">
        {code}
      </span>
    </div>
  );
}

// Simulated QR code component for styling consistency
export function SVGQRCode({ data }: { data: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 29 29"
      className="bg-white p-1 rounded border border-gray-300"
    >
      <rect width="29" height="29" fill="white" />
      <rect x="0" y="0" width="7" height="7" fill="black" />
      <rect x="1" y="1" width="5" height="5" fill="white" />
      <rect x="2" y="2" width="3" height="3" fill="black" />
      <rect x="22" y="0" width="7" height="7" fill="black" />
      <rect x="23" y="1" width="5" height="5" fill="white" />
      <rect x="24" y="2" width="3" height="3" fill="black" />
      <rect x="0" y="22" width="7" height="7" fill="black" />
      <rect x="1" y="23" width="5" height="5" fill="white" />
      <rect x="2" y="24" width="3" height="3" fill="black" />
      <rect x="22" y="22" width="3" height="3" fill="black" />
      <rect x="8" y="1" width="1" height="1" fill="black" />
      <rect x="10" y="2" width="1" height="1" fill="black" />
      <rect x="12" y="0" width="1" height="1" fill="black" />
      <rect x="15" y="3" width="1" height="1" fill="black" />
      <rect x="18" y="1" width="2" height="1" fill="black" />
      <rect x="8" y="5" width="2" height="1" fill="black" />
    </svg>
  );
}

export function FaturamentoScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  // Selection of packed items for Carga or Print
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // Selection of stock entries: key = stockId, value = quantity to load
  const [selectedStockEntries, setSelectedStockEntries] = useState<{
    [stockId: string]: number;
  }>({});

  // Loading indicator for processing operations
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);

  // Active sub-tab inside left panel: ORDERS or STOCK
  const [activeLeftTab, setActiveLeftTab] = useState<
    "ORDERS" | "STOCK" | "CARGAS"
  >("ORDERS");

  // States for load manual creation
  const [cargaName, setCargaName] = useState("");
  const [cargaDay, setCargaDay] = useState("Segunda-feira");
  const [cargaNotes, setCargaNotes] = useState("");
  const [cargaRouteInput, setCargaRouteInput] = useState("");
  const [manualCreating, setManualCreating] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  // Custom manual filters
  const [cityFilter, setCityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Print Setup Overlay Modal Settings
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    showQR: true,
    showBarcode: true,
    showLogo: true,
    layoutMode: "A4" as "A4" | "THERMAL",
  });

  // States for Editing a Carga in PCP
  const [editingCargaId, setEditingCargaId] = useState<string | null>(null);
  const [editCargaName, setEditCargaName] = useState("");
  const [editCargaDay, setEditCargaDay] = useState("Segunda-feira");
  const [editCargaRoute, setEditCargaRoute] = useState("");
  const [editCargaNotes, setEditCargaNotes] = useState("");

  const [useZoom, setUseZoom] = useState<number>(1);
  const [activePreviewCode, setActivePreviewCode] = useState<"QR" | "BARCODE">(
    "QR",
  );

  // Constants
  const DAYS_OF_WEEK = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];


  // 1. Filter active orders with EMBALADO status
  const embalados = useMemo(() => {
    return db.orders.filter(
      (o) =>
        (o.status === "EMBALADO" || (o.status === "EM_PRODUCAO" && ((o.producedQuantity || 0) > 0 || (o.packedQuantity || 0) > 0))) &&
        o.isActive
    );
  }, [db.orders]);

  // Extract finished stock items (ACABADO only, quantity > 0)
  const FinishedStocks = useMemo(() => {
    return (db.stocks || []).filter(
      (s) => s.stage === "ACABADO" && s.quantity > 0,
    );
  }, [db.stocks]);

  // Cities extracted from active embalados for filter options
  const cityOptions = useMemo(() => {
    const list: string[] = embalados.map((o) => {
      const address = o.customerAddress || o.address || "";
      if (address.includes("-")) {
        return address.split("-")[0].trim();
      }
      return address.trim() || "INDEFINIDO";
    });
    return Array.from(new Set(list)).filter((c: string) => c.length > 0);
  }, [embalados]);

  // Filtered embalados to display
  const filteredEmbalados = useMemo(() => {
    return embalados.filter((o) => {
      const address = (
        (o.customerAddress || o.address || "") +
        " " +
        o.customerName +
        " " +
        o.orderCode
      ).toLowerCase();
      const matchSearch = address.includes(searchQuery.toLowerCase());

      let matchCity = true;
      if (cityFilter) {
        matchCity = address.includes(cityFilter.toLowerCase());
      }

      return matchSearch && matchCity;
    });
  }, [embalados, searchQuery, cityFilter]);

  // Filtered finished stock to display
  const filteredFinishedStocks = useMemo(() => {
    return FinishedStocks.filter((s) => {
      const itemObj = db.items.find((i) => i.id === s.itemId);
      const stringified = (
        (itemObj?.name || "") +
        " " +
        (itemObj?.code || "") +
        " " +
        s.color +
        " " +
        s.size +
        " " +
        s.variation
      ).toLowerCase();
      return stringified.includes(searchQuery.toLowerCase());
    });
  }, [FinishedStocks, db.items, searchQuery]);

  // Core functions for selecting orders
  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredEmbalados.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredEmbalados.map((o) => o.id));
    }
  };

  // Core functions for selecting stock items
  const toggleSelectStock = (stockId: string, maxQuantity: number) => {
    setSelectedStockEntries((prev) => {
      const next = { ...prev };
      if (next[stockId]) {
        delete next[stockId];
      } else {
        next[stockId] = maxQuantity; // default to maximum
      }
      return next;
    });
  };

  const handleStockQuantityChange = (
    stockId: string,
    value: number,
    maxQuantity: number,
  ) => {
    const qty = Math.min(maxQuantity, Math.max(1, value));
    setSelectedStockEntries((prev) => ({
      ...prev,
      [stockId]: qty,
    }));
  };

  const toggleSelectAllStocks = () => {
    const allSelected = filteredFinishedStocks.every(
      (s) => !!selectedStockEntries[s.id],
    );
    if (allSelected) {
      setSelectedStockEntries({});
    } else {
      const next: { [stockId: string]: number } = {};
      filteredFinishedStocks.forEach((s) => {
        next[s.id] = s.quantity;
      });
      setSelectedStockEntries(next);
    }
  };

  const totalSelectedGoodsQty = React.useMemo(() => {
    const ordersQty = selectedOrderIds.reduce((sum: number, id) => {
      const o = db.orders.find((ord) => ord.id === id);
      return sum + (o ? o.totalQuantity || 0 : 0);
    }, 0);
    const stockQty = Object.values(selectedStockEntries).reduce(
      (sum: number, q: any) => sum + (Number(q) || 0),
      0,
    );
    return ordersQty + stockQty;
  }, [selectedOrderIds, selectedStockEntries, db.orders]);

  const hasAnySelection =
    selectedOrderIds.length > 0 || Object.keys(selectedStockEntries).length > 0;

  // Direct Invoicing of selected items (both Orders and Stocks)
  const handleDirectInvoice = async () => {
    if (isProcessingInvoice) return;

    const hasOrders = selectedOrderIds.length > 0;
    const stockKeys = Object.keys(selectedStockEntries);
    const hasStocks = stockKeys.length > 0;

    if (!hasOrders && !hasStocks) {
      alert(
        "Por favor, selecione ao menos um item de pedido embalado ou item em estoque para faturar.",
      );
      return;
    }

    const mConfirm = `Deseja faturar os itens selecionados? 
- Pedidos selecionados: ${selectedOrderIds.length}
- Itens de estoque selecionados: ${stockKeys.length}
Isso concluirá as demandas e aplicará baixas no estoque de acabados.`;

    if (!confirm(mConfirm)) return;

    setIsProcessingInvoice(true);
    try {
      const updatedStocks = [...db.stocks];
      const ordersToUpdate: Order[] = [];
      const logsToAdd: any[] = [];

      // 1. Process Orders explicitly selected
      if (hasOrders) {
        for (const id of selectedOrderIds) {
          const o = db.orders.find((ord) => ord.id === id);
          if (o) {
            ordersToUpdate.push({
              ...o,
              status: "FATURADO",
              isActive: false,
              invoicedQuantity: o.totalQuantity,
              _alreadyDeducted: true,
            });

            logsToAdd.push({
              id: Date.now() + Math.floor(Math.random() * 1000),
              orderId: o.id,
              operatorId: currentUser.id,
              quantityInvoiced: o.totalQuantity,
              type: "FATURAMENTO",
              timestamp: Date.now(),
              durationMillis: 0,
            });

            // Deduct stock for order item
            const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
            let s = updatedStocks.find((st) => st.id === stockId);
            if (s) {
              s.quantity = Math.max(0, s.quantity - o.totalQuantity);
              s.reservedQuantity = Math.max(
                0,
                Math.min(
                  s.quantity,
                  (s.reservedQuantity || 0) - o.totalQuantity,
                ),
              );
            } else {
              s = {
                id: stockId,
                itemId: o.itemId,
                color: o.color,
                size: o.size,
                variation: o.variation,
                quantity: 0,
                stage: "ACABADO",
              };
              updatedStocks.push(s);
            }

            // Add stock movement log
            await db.addStockMovement({
              itemId: o.itemId,
              color: o.color,
              size: o.size,
              variation: o.variation,
              quantity: o.totalQuantity,
              type: "SAIDA",
              description: `Baixa por Faturamento Direto (Ref: Pedido ${o.orderCode})`,
            });
          }
        }
      }

      // 2. Process Stocks (Deduct quantities + Auto fulfill suggested orders)
      if (hasStocks) {
        for (const key of stockKeys) {
          const loadedQty = selectedStockEntries[key];
          if (loadedQty > 0) {
            let s = updatedStocks.find((st) => st.id === key);
            if (s) {
              s.quantity = Math.max(0, s.quantity - loadedQty);
              s.reservedQuantity = Math.max(
                0,
                Math.min(s.quantity, (s.reservedQuantity || 0) - loadedQty),
              );

              // Auto-invoice matching explicit orders (EMBALADO first) if this stock was dispatched
              let remainingStockToFulfill = loadedQty;
              const matchingOrders = db.orders
                .filter(
                  (ord) =>
                    ord.isActive &&
                    ord.status !== "FATURADO" &&
                    !ordersToUpdate.find((uo) => uo.id === ord.id) &&
                    ord.itemId === s!.itemId &&
                    ord.color === s!.color &&
                    ord.size === s!.size &&
                    (ord.variation || "") === (s!.variation || ""),
                )
                .sort((a, b) => {
                  if (a.status === "EMBALADO" && b.status !== "EMBALADO")
                    return -1;
                  if (b.status === "EMBALADO" && a.status !== "EMBALADO")
                    return 1;
                  return 0;
                });

              for (const mo of matchingOrders) {
                if (remainingStockToFulfill <= 0) break;

                const fulfillQty = Math.min(
                  remainingStockToFulfill,
                  mo.totalQuantity,
                );
                remainingStockToFulfill -= fulfillQty;

                ordersToUpdate.push({
                  ...mo,
                  status: "FATURADO",
                  isActive: false,
                  invoicedQuantity: mo.totalQuantity,
                  _alreadyDeducted: true,
                });

                logsToAdd.push({
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  orderId: mo.id,
                  operatorId: currentUser.id,
                  quantityInvoiced: mo.totalQuantity,
                  type: "FATURAMENTO",
                  timestamp: Date.now(),
                  durationMillis: 0,
                });
              }

              // Add stock movement log
              await db.addStockMovement({
                itemId: s.itemId,
                color: s.color,
                size: s.size,
                variation: s.variation,
                quantity: loadedQty,
                type: "SAIDA",
                description: `Baixa por Faturamento Direto (Estoque Direto)`,
              });
            }
          }
        }
      }

      if (ordersToUpdate.length > 0) {
        await db.updateOrders(ordersToUpdate);
      }
      if (logsToAdd.length > 0) {
        await db.addLogs(logsToAdd);
      }

      // Update stocks in DB
      await db.updateStocks(updatedStocks);

      alert("Faturamento e baixa concluídos com sucesso!");
      setSelectedOrderIds([]);
      setSelectedStockEntries({});
    } catch (e) {
      console.error(e);
      alert("Houve um erro no processo de faturamento.");
    } finally {
      setIsProcessingInvoice(false);
    }
  };

  // Formação de Carga Manual (Combined orders + Stock with reservation)
  const handleCreateCargaManual = async () => {
    const hasOrders = selectedOrderIds.length > 0;
    const stockKeys = Object.keys(selectedStockEntries);
    const hasStocks = stockKeys.length > 0;

    if (!hasOrders && !hasStocks) {
      alert(
        "Selecione os itens (pedidos embalados ou estoque de acabados) que farão parte desta carga.",
      );
      return;
    }
    if (!cargaName.trim()) {
      alert("Por favor, dê um nome descritivo à carga.");
      return;
    }

    const routeList = cargaRouteInput
      ? cargaRouteInput
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : ["Ubá"];

    // Package stock entries loaded into the vehicle
    const stockEntriesToSave = stockKeys
      .map((key) => {
        const entry = db.stocks.find((s) => s.id === key);
        return {
          id: key,
          itemId: entry?.itemId || 0,
          color: entry?.color || "",
          size: entry?.size || "",
          variation: entry?.variation || "",
          quantity: selectedStockEntries[key],
        };
      })
      .filter((s) => s.quantity > 0);

    const newCarga: Omit<Carga, "id"> = {
      name: cargaName.trim(),
      dayOfWeek: cargaDay,
      orderIds: selectedOrderIds,
      stockEntries: stockEntriesToSave,
      route: routeList,
      status: "PLANEJADA",
      createdAt: Date.now(),
      notes: cargaNotes.trim(),
    };

    try {
      // 1. Process reservations & order statuses in memory first
      const updatedOrders: Order[] = [];
      const updatedStocks = [...db.stocks];

      // Update orders in carga to PENDING/PLANEJADO
      for (const id of selectedOrderIds) {
        const o = db.orders.find((ord) => ord.id === id);
        if (o) {
          updatedOrders.push({
            ...o,
            status: "PLANEJADO",
          });

          // Reserve stock for order
          const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
          let s = updatedStocks.find((st) => st.id === stockId);
          if (!s) {
            s = {
              id: stockId,
              itemId: o.itemId,
              color: o.color,
              size: o.size,
              variation: o.variation,
              quantity: 0,
              reservedQuantity: o.totalQuantity,
              stage: "ACABADO",
            };
            updatedStocks.push(s);
          } else {
            s.reservedQuantity = (s.reservedQuantity || 0) + o.totalQuantity;
          }

          // Generate stock reservation log
          await db.addStockMovement({
            itemId: o.itemId,
            color: o.color,
            size: o.size,
            variation: o.variation,
            quantity: o.totalQuantity,
            type: "SAIDA",
            description: `Reserva efetuada - Carga: ${cargaName.trim()} (Ref: Pedido ${o.orderCode})`,
          });
        }
      }

      // Reserve stock for direct load entries
      for (const se of stockEntriesToSave) {
        let s = updatedStocks.find((st) => st.id === se.id);
        if (s) {
          s.reservedQuantity = (s.reservedQuantity || 0) + se.quantity;

          // Generate stock reservation log
          await db.addStockMovement({
            itemId: s.itemId,
            color: s.color,
            size: s.size,
            variation: s.variation,
            quantity: se.quantity,
            type: "SAIDA",
            description: `Reserva efetuada (Estoque Direto) - Carga: ${cargaName.trim()}`,
          });
        }
      }

      // 2. Commit to database
      await db.addCarga(newCarga);

      if (updatedOrders.length > 0) {
        await db.updateOrders(updatedOrders);
      }
      await db.updateStocks(updatedStocks);

      // Notify
      await db.addNotification({
        message: `🚚 Nova carga criada PCP: ${newCarga.name} com ${selectedOrderIds.length} pedidos e ${stockEntriesToSave.length} itens do estoque.`,
        read: false,
      });

      alert(`Carga "${newCarga.name}" criada com sucesso!`);

      // Cleanup
      setCargaName("");
      setCargaNotes("");
      setCargaRouteInput("");
      setManualCreating(false);
      setSelectedOrderIds([]);
      setSelectedStockEntries({});
    } catch (err) {
      console.error(err);
      alert("Erro ao criar carga.");
    }
  };



  const activeCargas = useMemo(() => {
    return (db.cargas || []).sort((a, b) => b.createdAt - a.createdAt);
  }, [db.cargas]);

  const handleUpdateCargaStatus = async (
    carga: Carga,
    newStatus: Carga["status"],
  ) => {
    try {
      const updatedCarga = { ...carga, status: newStatus };

      if (newStatus === "FATURADA") {
        const orderIdsCount = (carga.orderIds || []).length;
        const confirmInvoice = confirm(
          `Deseja finalizar esta carga como FATURADA? Isso irá automaticamente faturar e dar baixa de todos os pedidos (${orderIdsCount}) e deduzir todos os itens em estoque associados a esta carga.`,
        );
        if (!confirmInvoice) return;

        const updatedStocks = [...db.stocks];

        // 1. Process and Invoice Orders
        for (const orderId of carga.orderIds || []) {
          const ord = db.orders.find((o) => o.id === orderId);
          if (ord) {
            await db.updateOrders({
              ...ord,
              status: "FATURADO",
              isActive: false,
              invoicedQuantity: ord.totalQuantity,
              _alreadyDeducted: true,
            });

            await db.addLogs([
              {
                id: Date.now() + Math.floor(Math.random() * 1000),
                orderId: ord.id,
                operatorId: currentUser.id,
                quantityInvoiced: ord.totalQuantity,
                type: "FATURAMENTO",
                timestamp: Date.now(),
                durationMillis: 0,
              },
            ]);

            // Adjust stock levels & release reservation
            const stockId = `${ord.itemId}|${ord.color}|${ord.size}|${ord.variation}|ACABADO`;
            let s = updatedStocks.find((st) => st.id === stockId);
            if (s) {
              s.quantity = Math.max(0, s.quantity - ord.totalQuantity);
              s.reservedQuantity = Math.max(
                0,
                (s.reservedQuantity || 0) - ord.totalQuantity,
              );
            } else {
              s = {
                id: stockId,
                itemId: ord.itemId,
                color: ord.color,
                size: ord.size,
                variation: ord.variation,
                quantity: 0,
                reservedQuantity: 0,
                stage: "ACABADO",
              };
              updatedStocks.push(s);
            }

            // Save stock movement
            await db.addStockMovement({
              itemId: ord.itemId,
              color: ord.color,
              size: ord.size,
              variation: ord.variation,
              quantity: ord.totalQuantity,
              type: "SAIDA",
              description: `Baixa por faturamento - Carga: ${carga.name} (Ref: Pedido ${ord.orderCode})`,
            });
          }
        }

        // 2. Process and Invoice Direct Load Stock Entries
        if (carga.stockEntries && carga.stockEntries.length > 0) {
          for (const se of carga.stockEntries) {
            let s = updatedStocks.find((st) => st.id === se.id);
            if (s) {
              s.quantity = Math.max(0, s.quantity - se.quantity);
              s.reservedQuantity = Math.max(
                0,
                (s.reservedQuantity || 0) - se.quantity,
              );

              // Save stock movement
              await db.addStockMovement({
                itemId: s.itemId,
                color: s.color,
                size: s.size,
                variation: s.variation,
                quantity: se.quantity,
                type: "SAIDA",
                description: `Baixa por faturamento - Carga: ${carga.name} (Estoque Direto)`,
              });
            }

            await db.addLogs([
              {
                id: Date.now() + Math.floor(Math.random() * 1000),
                operatorId: currentUser.id,
                quantityInvoiced: se.quantity,
                type: "FATURAMENTO",
                timestamp: Date.now(),
                durationMillis: 0,
              },
            ]);
          }
        }

        // Commit all stock changes
        await db.updateStocks(updatedStocks);
      }

      await db.updateCarga(updatedCarga);
      alert(`Status da carga "${carga.name}" atualizado para ${newStatus}!`);
    } catch (e) {
      console.error(e);
      alert("Houve um erro ao atualizar status da carga.");
    }
  };

  const handleDeleteCarga = async (id: string, name: string) => {
    // PCP has role: "PCP" or "ADMIN"
    const isPCP = currentUser.role === "PCP" || currentUser.role === "ADMIN";
    if (!isPCP) {
      alert(
        "Apenas usuários do PCP ou Administração podem excluir/desmembrar cargas.",
      );
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja desmembrar e remover a carga "${name}"? Os pedidos retornarão para a lista de faturamento pendente e as reservas de estoque serão estornadas.`,
      )
    ) {
      return;
    }

    try {
      const carga = db.cargas.find((c) => c.id === id);
      if (carga) {
        const updatedOrders: Order[] = [];
        const updatedStocks = [...db.stocks];

        // 1. Rollback Order status from PLANEJADO to EMBALADO, and release reservation
        for (const orderId of carga.orderIds || []) {
          const ord = db.orders.find((o) => o.id === orderId);
          if (ord) {
            updatedOrders.push({
              ...ord,
              status: "EMBALADO",
            });

            // Adjust Stock reservation
            const stockId = `${ord.itemId}|${ord.color}|${ord.size}|${ord.variation}|ACABADO`;
            let s = updatedStocks.find((st) => st.id === stockId);
            if (s) {
              s.reservedQuantity = Math.max(
                0,
                (s.reservedQuantity || 0) - ord.totalQuantity,
              );
            }

            // Record rollback movement
            await db.addStockMovement({
              itemId: ord.itemId,
              color: ord.color,
              size: ord.size,
              variation: ord.variation,
              quantity: ord.totalQuantity,
              type: "ENTRADA",
              description: `Estorno de reserva - Carga excluída: ${carga.name} (Ref: Pedido ${ord.orderCode})`,
            });
          }
        }

        // 2. Rollback Direct Stock load entries reservations
        if (carga.stockEntries && carga.stockEntries.length > 0) {
          for (const se of carga.stockEntries) {
            let s = updatedStocks.find((st) => st.id === se.id);
            if (s) {
              s.reservedQuantity = Math.max(
                0,
                (s.reservedQuantity || 0) - se.quantity,
              );
            }

            await db.addStockMovement({
              itemId: se.itemId,
              color: se.color,
              size: se.size,
              variation: se.variation,
              quantity: se.quantity,
              type: "ENTRADA",
              description: `Estorno de reserva - Carga excluída: ${carga.name} (Estoque Direto)`,
            });
          }
        }

        // Commit rollback updates
        if (updatedOrders.length > 0) {
          await db.updateOrders(updatedOrders);
        }
        await db.updateStocks(updatedStocks);
      }

      await db.deleteCarga(id);
      alert("Carga desmembrada com sucesso e estoque de reserva revertido.");
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir carga.");
    }
  };

  // Prepare Consolidated List of Selected Items to Print inside Modal
  const itemsToPrint = useMemo(() => {
    const list: any[] = [];

    // Process selected orders
    selectedOrderIds.forEach((id) => {
      const o = db.orders.find((ord) => ord.id === id);
      const itemObj = db.items.find((it) => it.id === o?.itemId);
      if (o) {
        list.push({
          type: "ORDER",
          id: `ORD-${o.orderCode}`,
          code: o.orderCode,
          itemName: itemObj?.name || "Peça Industrial",
          itemCode: itemObj?.code || "COD-S",
          color: o.color,
          size: o.size,
          recipient: o.customerName,
          destination: o.customerAddress || o.address || "Ubá - MG",
          quantity: o.packedQuantity || o.totalQuantity,
          date: new Date(o.createdAt || Date.now()).toLocaleDateString("pt-BR"),
        });
      }
    });

    // Process selected stocks
    Object.keys(selectedStockEntries).forEach((sId) => {
      const qty = selectedStockEntries[sId];
      if (qty > 0) {
        const entry = db.stocks.find((s) => s.id === sId);
        const itemObj = db.items.find((it) => it.id === entry?.itemId);
        if (entry) {
          list.push({
            type: "STOCK",
            id: `STK-${entry.id}`,
            code: itemObj?.code || "ESTOQUE",
            itemName: itemObj?.name || "Peça Industrial Estoque",
            itemCode: itemObj?.code || "COD-STK",
            color: entry.color,
            size: entry.size,
            recipient: "FROTAS IMPÉRIO (ESTOQUE)",
            destination: "CENTRO EXPEDIÇÃO IMPÉRIO",
            quantity: qty,
            date: new Date().toLocaleDateString("pt-BR"),
          });
        }
      }
    });

    return list;
  }, [selectedOrderIds, selectedStockEntries, db.orders, db.stocks, db.items]);

  // Execute actual printing function from current selected printOptions
  const executeA4Print = () => {
    if (itemsToPrint.length === 0) {
      alert(
        "Por favor, selecione ao menos um item de pedido ou estoque para gerar as etiquetas.",
      );
      return;
    }

    if (itemsToPrint.length > 50) {
      const confirmPrint = window.confirm(
        "Atenção: A impressão de mais de 50 etiquetas pode exigir pausa na impressora térmica. Confirmar?",
      );
      if (!confirmPrint) {
        return;
      }
    }

    const qrMarkup = (dataId: string) => `
      <div style="display:flex; justify-content:center; align-items:center;">
        <svg width="56" height="56" viewBox="0 0 29 29" style="background:#fff; padding:2px; border:1px solid #ccc; border-radius:3px;">
          <rect width="29" height="29" fill="white" />
          <rect x="0" y="0" width="7" height="7" fill="black" />
          <rect x="1" y="1" width="5" height="5" fill="white" />
          <rect x="2" y="2" width="3" height="3" fill="black" />
          <rect x="22" y="0" width="7" height="7" fill="black" />
          <rect x="23" y="1" width="5" height="5" fill="white" />
          <rect x="24" y="2" width="3" height="3" fill="black" />
          <rect x="0" y="22" width="7" height="7" fill="black" />
          <rect x="1" y="23" width="5" height="5" fill="white" />
          <rect x="2" y="24" width="3" height="3" fill="black" />
          <rect x="22" y="22" width="3" height="3" fill="black" />
          <rect x="8" y="1" width="1" height="1" fill="black" />
          <rect x="10" y="2" width="1" height="1" fill="black" />
          <rect x="12" y="0" width="1" height="1" fill="black" />
          <rect x="15" y="3" width="1" height="1" fill="black" />
          <rect x="18" y="1" width="2" height="1" fill="black" />
          <rect x="8" y="5" width="2" height="1" fill="black" />
        </svg>
      </div>
    `;

    const barcodeMarkup = (codeStr: string) => {
      const stripes = [
        1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2,
      ];
      return `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="display: flex; align-items: flex-end; gap: 1px; height: 26px;">
            ${stripes.map((w) => `<div style="background-color:#000; height:100%; width:${w}px;"></div>`).join("")}
          </div>
          <span style="font-size: 8px; font-family: monospace; font-weight: bold; margin-top:2px; color:#444;">
            ${codeStr}
          </span>
        </div>
      `;
    };

    let htmlContent = "";

    if (printOptions.layoutMode === "A4") {
      htmlContent = `
        <html>
          <head>
            <title>Imprimir Etiquetas A4 - PCP Império</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0.5cm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #fff;
              }
              .a4-page {
                width: 21cm;
                height: 29.7cm;
                box-sizing: border-box;
                padding: 2.35cm 0.5cm;
                display: grid;
                grid-template-columns: 10cm 10cm;
                grid-template-rows: repeat(5, 5cm);
                gap: 0;
                justify-content: center;
                align-content: start;
                page-break-after: always;
              }
              .label-card {
                width: 10cm;
                height: 5cm;
                border: 1px dashed #666;
                box-sizing: border-box;
                padding: 0.4cm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                font-size: 10px;
                color: #000;
                background: #fff;
                overflow: hidden;
                position: relative;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 1.5px solid #000;
                padding-bottom: 3px;
              }
              .logo {
                font-weight: 950;
                font-size: 11px;
                letter-spacing: 0.5px;
                font-style: italic;
              }
              .tag {
                background: #000;
                color: #fff;
                font-size: 7px;
                font-weight: 850;
                padding: 1px 4px;
                text-transform: uppercase;
              }
              .title {
                font-size: 11px;
                font-weight: 800;
                margin-top: 5px;
                text-transform: uppercase;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .item-specs {
                font-size: 8.5px;
                font-weight: bold;
                color: #444;
                margin: 1px 0 4px 0;
              }
              .detail-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 5px;
              }
              .data-row {
                display: flex;
                flex-direction: column;
              }
              .label-desc {
                font-size: 7px;
                color: #666;
                text-transform: uppercase;
                font-weight: bold;
              }
              .label-val {
                font-size: 9px;
                font-weight: 750;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .total-pieces {
                font-size: 20px;
                font-weight: 950;
                color: #000;
                line-height: 1;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: 5px;
                border-top: 1px solid #ddd;
                padding-top: 4px;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .label-card {
                  border: 1px solid #ccc; /* Convert dashed to solid for precise print */
                }
              }
              @media screen and (max-width: 600px) {
                .a4-page {
                  width: 100% !important;
                  height: auto !important;
                  padding: 10px !important;
                  display: flex !important;
                  flex-direction: column !important;
                  flex-wrap: wrap !important;
                  align-items: center !important;
                  gap: 15px !important;
                }
                .label-card {
                  width: 100% !important;
                  max-width: 10cm !important;
                  border-radius: 8px !important;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="a4-page">
              ${itemsToPrint
                .map(
                  (item) => `
                <div class="label-card">
                  <div>
                    <div class="header">
                      <span class="logo">${printOptions.showLogo ? "👑 IMPÉRIO ACESSÓRIOS" : ""}</span>
                      <span class="tag">${item.type === "STOCK" ? "Estoque Acabado" : "Volume Embalado"}</span>
                    </div>
                    <div class="title">${item.itemName}</div>
                    <div class="item-specs">CÓD: ${item.itemCode} | COL: ${item.color} | TAM: ${item.size}</div>
                    
                    <div class="detail-grid">
                      <div class="data-row" style="grid-column: span 2;">
                        <span class="label-desc">Destinatário</span>
                        <span class="label-val">${item.recipient}</span>
                      </div>
                      <div class="data-row">
                        <span class="label-desc">Destino</span>
                        <span class="label-val">${item.destination}</span>
                      </div>
                      <div class="data-row">
                        <span class="label-desc">Data Liberação</span>
                        <span class="label-val">${item.date}</span>
                      </div>
                    </div>
                  </div>

                  <div class="footer">
                    <div style="display: flex; flex-direction: column;">
                      <span class="label-desc">Quantidade</span>
                      <span class="total-pieces">${item.quantity} <span style="font-size: 10px; font-weight: normal;">un</span></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${printOptions.showQR ? qrMarkup(item.id) : ""}
                      ${printOptions.showBarcode ? barcodeMarkup(item.code) : ""}
                    </div>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </body>
        </html>
      `;
    } else {
      htmlContent = `
        <html>
          <head>
            <title>Imprimir Etiquetas Térmicas - PCP Império</title>
            <style>
              @page {
                size: 10cm 5cm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #fff;
                width: 10cm;
                height: 5cm;
              }
              .thermal-page {
                width: 10cm;
                height: 5cm;
                box-sizing: border-box;
                padding: 0.25cm 0.35cm;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                overflow: hidden;
                page-break-after: always;
              }
              .left-col {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                width: 6.3cm;
                height: 100%;
                box-sizing: border-box;
              }
              .right-col {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                width: 2.6cm;
                height: 100%;
                border-left: 1.5px dashed #000;
                padding-left: 0.15cm;
                box-sizing: border-box;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #000;
                padding-bottom: 2px;
                margin-bottom: 3px;
              }
              .logo {
                font-weight: 955;
                font-size: 10px;
                letter-spacing: 0.5px;
                font-style: italic;
              }
              .tag {
                background: #000;
                color: #fff;
                font-size: 7px;
                font-weight: 900;
                padding: 0.5px 3px;
                text-transform: uppercase;
              }
              .title {
                font-size: 12px;
                font-weight: 950;
                margin: 2px 0 1px 0;
                text-transform: uppercase;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .item-specs {
                font-size: 8.5px;
                font-weight: bold;
                color: #333;
                margin-bottom: 4px;
              }
              .label-desc {
                font-size: 6.5px;
                color: #555;
                font-weight: bold;
                text-transform: uppercase;
              }
              .label-val {
                font-size: 8.5px;
                font-weight: 750;
                color: #000;
              }
              .total-pieces {
                font-size: 32px;
                font-weight: 950;
                color: #000;
                line-height: 0.85;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            ${itemsToPrint
              .map(
                (item, idx) => `
              <div class="thermal-page">
                <div class="left-col">
                  <div>
                    <div class="header">
                      <span class="logo">${printOptions.showLogo ? "👑 IMPÉRIO ACESSÓRIOS" : ""}</span>
                      <span class="tag">${item.type === "STOCK" ? "Estoque Império" : "Logística"}</span>
                    </div>
                    <div class="title">${item.itemName}</div>
                    <div class="item-specs">CÓD: ${item.itemCode} | COL: ${item.color} | TAM: ${item.size}</div>
                    
                    <div style="font-size: 8px; line-height: 1.25; color: #000;">
                      <div><span class="label-desc">Destinatário:</span> <span class="label-val" style="display:inline-block; max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.recipient}</span></div>
                      <div style="margin-top: 1px;"><span class="label-desc">Localidade:</span> <span class="label-val">${item.destination}</span></div>
                    </div>
                  </div>

                  <div style="border-top: 1.5px solid #000; padding-top: 3px; display: flex; align-items: flex-end; justify-content: space-between;">
                    <div style="display: flex; flex-direction: column;">
                      <span class="label-desc">Qtd Volume</span>
                      <span class="total-pieces">
                        ${item.quantity}<span style="font-size: 13px; font-weight: 800; margin-left: 2px;">un</span>
                      </span>
                    </div>
                    <div style="font-size: 8px; font-weight: bold; color: #444; padding-bottom: 2px;">
                      Etiqueta ${idx + 1} de ${itemsToPrint.length}
                    </div>
                  </div>
                </div>

                <div class="right-col">
                  ${
                    printOptions.showQR
                      ? `
                    <div style="margin-bottom: 6px;">
                      ${qrMarkup(item.id)}
                    </div>
                  `
                      : ""
                  }
                  ${
                    printOptions.showBarcode
                      ? `
                    <div>
                      ${barcodeMarkup(item.code)}
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            `,
              )
              .join("")}
          </body>
        </html>
      `;
    }

    setShowPrintModal(false);

    import("./printUtils").then(({ printHtml }) => {
      printHtml(
        htmlContent,
        printOptions.layoutMode === "A4" ? "A4" : "THERMAL",
      );
    });
  };

  return (
    <div
      id="faturamento-dashboard"
      className="flex flex-col gap-6 w-full h-full pb-10"
    >
      {/* Intro Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-emerald-405 font-bold uppercase tracking-wider text-xs">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            PCP: Expedição & Logística de Distribuição
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans text-white">
            GESTÃO E DESPACHO DE CARGAS
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Organize carregamentos de frotas utilizando tanto os pedidos
            embalados na produção, quanto os produtos prontos em estoque
            residencial. Use a IA para sugestões automáticas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
        </div>
      </div>

      {/* Grid: 2 Columns - Left Sidebar (Acessos), Right Sidebar (Cargas) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Columns: Multi-tab items ready for invoicing / transport */}
        <div
          className={`flex flex-col gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 ${activeLeftTab === "CARGAS" ? "xl:col-span-3" : "xl:col-span-2"}`}
        >
          {/* Subheader and Tabs selection */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-slate-100">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setActiveLeftTab("ORDERS");
                  setSelectedStockEntries({});
                }}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeLeftTab === "ORDERS"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShoppingBag size={14} />
                <span>Pedidos Embalados ({filteredEmbalados.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveLeftTab("STOCK");
                  setSelectedOrderIds([]);
                }}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeLeftTab === "STOCK"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={14} />
                <span>
                  Estoque de Acabados ({filteredFinishedStocks.length})
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveLeftTab("CARGAS");
                  setSelectedOrderIds([]);
                  setSelectedStockEntries({});
                }}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeLeftTab === "CARGAS"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Truck size={14} />
                <span>Cargas Ativas ({activeCargas.length})</span>
              </button>
            </div>

            {/* General Filters */}
            <div
              className={`flex flex-wrap gap-2 w-full md:w-auto ${activeLeftTab === "CARGAS" ? "hidden" : ""}`}
            >
              <div className="relative flex-1 md:w-44">
                <input
                  type="text"
                  placeholder={
                    activeLeftTab === "ORDERS"
                      ? "Buscar cliente..."
                      : "Buscar no estoque..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border p-2 pl-3 rounded-lg text-xs bg-slate-50 border-slate-300 text-slate-800 focus:outline-indigo-500 font-semibold"
                />
              </div>

              {activeLeftTab === "ORDERS" && (
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="border p-2 rounded-lg text-xs bg-white text-slate-700 border-slate-300 font-bold cursor-pointer focus:outline-indigo-505"
                >
                  <option value="">Filtrar Cidade (Todas)</option>
                  {cityOptions.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Combined Operations Quick Action Bar */}
          {hasAnySelection && (
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 p-3.5 rounded-xl flex flex-wrap justify-between items-center gap-3 animate-in slide-in-from-top-2">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-indigo-950">
                    ⚡ Itens Selecionados para Carregamento / Emissão
                  </span>
                  <span className="text-[10px] text-indigo-800 mt-0.5 font-medium">
                    {selectedOrderIds.length > 0 &&
                      `• ${selectedOrderIds.length} Pedido(s) Embalado(s)`}
                    {Object.keys(selectedStockEntries).length > 0 &&
                      `• ${Object.keys(selectedStockEntries).length} Item(ns) em Estoque`}
                  </span>
                </div>

                <div className="bg-emerald-600 text-white rounded-xl px-4 py-1.5 flex flex-col items-center justify-center shadow-xs border border-emerald-500">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-100 leading-none">
                    Soma de Peças
                  </span>
                  <span className="text-sm font-black leading-none mt-1">
                    {totalSelectedGoodsQty} un.
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <Printer size={14} />
                  <span>Configurar & Imprimir QR codes</span>
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDirectInvoice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <Check size={14} />
                  <span>Faturar Despacho Direto</span>
                </motion.button>
                <button
                  onClick={() => setManualCreating(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <Truck size={14} />
                  <span>Planejar Carga Logística</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedOrderIds([]);
                    setSelectedStockEntries({});
                  }}
                  className="text-slate-500 hover:text-slate-800 font-bold text-xs px-2"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}

          {/* List display */}
          <div className="overflow-x-auto">
            {/* ORDERS TAB */}
            {activeLeftTab === "ORDERS" &&
              (filteredEmbalados.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                  <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                    <ShoppingBag size={32} />
                  </div>
                  <div>
                    <p className="text-slate-805 text-sm font-bold">
                      Sem pedidos "Embalados" cadastrados.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Conclua a embalagem de pedidos no PCP / Produção para que
                      eles estejam aguardando faturamento.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          onClick={toggleSelectAllOrders}
                          className="text-slate-600 hover:text-indigo-600 flex justify-center items-center w-full focus:outline-none"
                        >
                          {selectedOrderIds.length ===
                          filteredEmbalados.length ? (
                            <CheckSquare
                              size={16}
                              className="text-indigo-600"
                            />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-2 w-20">Código</th>
                      <th className="py-3 px-3">Cliente / UF</th>
                      <th className="py-3 px-3">Item / Peça</th>
                      <th className="py-3 px-3 text-center">Quantidade</th>
                      <th className="py-3 px-3">Prazo</th>
                      <th className="py-3 px-3 text-center">Etiqueta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredEmbalados.map((o) => {
                      const itemObj = db.items.find((i) => i.id === o.itemId);
                      const isSelected = selectedOrderIds.includes(o.id);
                      const rawAddress = o.customerAddress || o.address || "";

                      return (
                        <tr
                          key={o.id}
                          className={`hover:bg-slate-50/70 transition-all ${isSelected ? "bg-indigo-50/20" : ""}`}
                        >
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => toggleSelectOrder(o.id)}
                              className="text-slate-500 hover:text-indigo-650 flex justify-center items-center w-full focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare
                                  size={16}
                                  className="text-indigo-600"
                                />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-2 font-mono font-bold text-slate-800">
                            {o.orderCode}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-800">
                              {o.customerName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                              <MapPin size={9} className="text-slate-400" />
                              {rawAddress || "Não informado"}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">
                              {itemObj?.name || "Peça Industrial"}
                            </div>
                            <div className="text-[10px] text-indigo-750 font-mono mt-0.5">
                              {itemObj?.code} | {o.color} | {o.size}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-slate-900 text-sm">
                              {o.packedQuantity}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-0.5">
                              / {o.totalQuantity} un
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-600">
                            {new Date(o.deliveryDate).toLocaleDateString(
                              "pt-BR",
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              title="Configurar etiqueta de QR Code deste pedido"
                              onClick={() => {
                                setSelectedOrderIds([o.id]);
                                setTimeout(() => setShowPrintModal(true), 10);
                              }}
                              className="p-1 px-2 border border-slate-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 rounded mx-auto font-bold transition"
                            >
                              <Printer size={13} />
                              <span>QR Code</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))}

            {/* STOCKS TAB */}
            {activeLeftTab === "STOCK" &&
              (filteredFinishedStocks.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                  <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                    <Package size={32} />
                  </div>
                  <div>
                    <p className="text-slate-805 text-sm font-bold">
                      Sem produtos finalizados em estoque ("Acabados").
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Produtos registrados no estoque físico aparecerão aqui
                      quando forem classificados com estágio ACABADO na
                      manufatura.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          onClick={toggleSelectAllStocks}
                          className="text-slate-600 hover:text-indigo-650 flex justify-center items-center w-full focus:outline-none"
                        >
                          {filteredFinishedStocks.every(
                            (s) => !!selectedStockEntries[s.id],
                          ) ? (
                            <CheckSquare
                              size={16}
                              className="text-indigo-600"
                            />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">Código do Item</th>
                      <th className="py-3 px-3">Nome do Produto</th>
                      <th className="py-3 px-3">Configurações e Cores</th>
                      <th className="py-3 px-3 text-center">
                        Físico em Estoque
                      </th>
                      <th className="py-3 px-3 text-center w-32">
                        Quantidade a Faturar
                      </th>
                      <th className="py-3 px-3 text-center">Etiqueta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredFinishedStocks.map((s) => {
                      const itemObj = db.items.find((i) => i.id === s.itemId);
                      const isSelected = !!selectedStockEntries[s.id];
                      const selectedVal = selectedStockEntries[s.id] || 0;

                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-50/70 transition-all ${isSelected ? "bg-indigo-50/20 font-medium" : ""}`}
                        >
                          <td className="py-3 px-3 text-center w-10">
                            <button
                              onClick={() =>
                                toggleSelectStock(s.id, s.quantity)
                              }
                              className="text-slate-550 hover:text-indigo-650 flex justify-center items-center w-full focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare
                                  size={16}
                                  className="text-indigo-600"
                                />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">
                            {itemObj?.code || "S/C"}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-800">
                              {itemObj?.name || "Peça Industrial de Estoque"}
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-655 rounded-sm px-1 font-semibold leading-none">
                              Padrão Geral
                            </span>
                            {/* Suggestion of reservation */}
                            {(() => {
                              const suggest = db.orders.find(
                                (ord) =>
                                  ord.isActive &&
                                  ord.status === "EMBALADO" &&
                                  ord.itemId === s.itemId &&
                                  ord.color === s.color &&
                                  ord.size === s.size &&
                                  (ord.variation || "") === (s.variation || ""),
                              );
                              if (suggest) {
                                return (
                                  <div className="mt-1 flex items-center gap-1 text-[9px] text-blue-805 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold w-fit leading-tight select-none">
                                    <Sparkles
                                      size={10}
                                      className="text-blue-600 shrink-0"
                                    />
                                    <span>
                                      Sugerido para: {suggest.customerName}{" "}
                                      (Ped. {suggest.orderCode})
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-bold">
                            {s.color} | {s.size} | {s.variation || "Geral"}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">
                            <span className="bg-slate-100 text-slate-805 font-black px-2 py-1 rounded text-xs select-none">
                              {s.quantity} un
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isSelected ? (
                              <div className="flex items-center justify-center gap-1.5 w-full">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStockQuantityChange(
                                      s.id,
                                      selectedVal - 1,
                                      s.quantity,
                                    )
                                  }
                                  className="w-5 h-5 bg-slate-105 hover:bg-slate-205 rounded font-black flex items-center justify-center text-xs"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={s.quantity}
                                  value={selectedVal}
                                  onChange={(e) =>
                                    handleStockQuantityChange(
                                      s.id,
                                      parseInt(e.target.value) || 1,
                                      s.quantity,
                                    )
                                  }
                                  className="w-14 border text-center p-1 font-extrabold rounded bg-white text-slate-850 focus:ring-1 focus:ring-indigo-500 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStockQuantityChange(
                                      s.id,
                                      selectedVal + 1,
                                      s.quantity,
                                    )
                                  }
                                  className="w-5 h-5 bg-slate-105 hover:bg-slate-205 rounded font-black flex items-center justify-center text-xs"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                Não selecionado
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              title="Configurar etiqueta de estoque"
                              onClick={() => {
                                setSelectedStockEntries({ [s.id]: s.quantity });
                                setTimeout(() => setShowPrintModal(true), 10);
                              }}
                              className="p-1 px-2 border border-slate-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 rounded mx-auto font-bold transition"
                            >
                              <Printer size={13} />
                              <span>QR Code</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))}
          </div>
        </div>

        {/* CARGAS TAB */}
        {activeLeftTab === "CARGAS" && (
          <>
            {/* Active loads container */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-205 flex flex-col gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                  <Truck className="text-indigo-600" size={18} />
                  Cargas Logísticas Ativas ({activeCargas.length})
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5 font-semibold leading-tight">
                  Controle de frotas e distribuição da semana
                </p>
              </div>

              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {activeCargas.length === 0 ? (
                  <div className="text-center py-8 text-slate-405 text-xs italic">
                    Nenhuma carga formada ou ativa registrada no painel
                    logístico.
                  </div>
                ) : (
                  activeCargas.map((car) => {
                    return (
                      <div
                        key={car.id}
                        className="p-3.5 border rounded-xl flex flex-col gap-2 shadow-xs bg-slate-50/50 hover:bg-slate-50 transition"
                      >
                        {/* Name of carga */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-850 text-xs">
                              {car.name}
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-400 mt-0.5">
                              ID: {car.id.toUpperCase()}
                            </span>
                          </div>
                          {/* Status wrapper */}
                          <span
                            className={`text-[9.5px] font-black px-2 py-0.5 rounded leading-none shrink-0 uppercase border ${
                              car.status === "FATURADA"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : car.status === "ENTREGUE"
                                  ? "bg-teal-100 text-teal-800 border-teal-200"
                                  : car.status === "EM_TRANSITO"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-indigo-100 text-indigo-800 border-indigo-250"
                            }`}
                          >
                            {car.status}
                          </span>
                        </div>

                        {/* Logistical Day and route */}
                        <div className="text-[11px] text-slate-650 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1 font-bold text-slate-800">
                            <Calendar
                              size={12}
                              className="text-indigo-650 shrink-0"
                            />
                            <span>
                              Dia:{" "}
                              <strong className="text-indigo-950">
                                {car.dayOfWeek}
                              </strong>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 text-slate-600">
                            <MapPin
                              size={11}
                              className="text-slate-400 shrink-0"
                            />
                            <span>Paradas:</span>
                            {car.route.map((p, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && (
                                  <span className="text-[10px] text-slate-305">
                                    →
                                  </span>
                                )}
                                <strong className="text-slate-750">{p}</strong>
                              </React.Fragment>
                            ))}
                          </div>

                          {/* Number of orders inside Carga */}
                          <div className="flex flex-col gap-1 bg-white p-2 rounded-lg border border-slate-100 font-medium text-slate-700">
                            <div className="flex justify-between items-center text-[10px] border-b pb-1 font-bold">
                              <span>
                                📦 Pedidos Vinculados ({car.orderIds.length})
                              </span>
                            </div>
                            {car.orderIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {car.orderIds.map((oId, index) => {
                                  const ord = db.orders.find(
                                    (ordIdx) => ordIdx.id === oId,
                                  );
                                  return (
                                    <span
                                      key={index}
                                      className="text-[9px] font-mono font-extrabold bg-slate-100 text-slate-800 rounded px-1 py-0.5 border"
                                      title={
                                        ord?.customerName || "Desconhecido"
                                      }
                                    >
                                      {ord?.orderCode || oId}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-400 italic">
                                Nenhum pedido vinculado
                              </span>
                            )}
                          </div>

                          {/* Stock entries loaded inside Carga */}
                          {car.stockEntries && car.stockEntries.length > 0 && (
                            <div className="flex flex-col gap-1 bg-white p-2 rounded-lg border border-slate-100 font-medium text-slate-700 mt-1">
                              <div className="flex justify-between items-center text-[10px] border-b pb-1 font-bold">
                                <span>
                                  🏷️ Itens de Estoque ({car.stockEntries.length}
                                  )
                                </span>
                                <span className="text-indigo-700 font-black">
                                  Volume
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 mt-1 max-h-24 overflow-y-auto">
                                {car.stockEntries.map((se, index) => {
                                  const itemObj = db.items.find(
                                    (it) => it.id === se.itemId,
                                  );
                                  return (
                                    <div
                                      key={index}
                                      className="flex justify-between items-center text-[9px] font-semibold bg-indigo-50/40 text-slate-700 px-1 py-1 rounded border border-indigo-100/50"
                                    >
                                      <span
                                        className="truncate max-w-[150px]"
                                        title={itemObj?.name}
                                      >
                                        • {itemObj?.name || "Peça"} ({se.color}{" "}
                                        | {se.size})
                                      </span>
                                      <strong className="text-indigo-950 font-black">
                                        {se.quantity} un
                                      </strong>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Notes if existing */}
                          {car.notes && (
                            <div className="mt-1 text-[10px] text-slate-550 italic bg-white p-1.5 rounded border border-slate-150">
                              📝 {car.notes}
                            </div>
                          )}
                        </div>

                        {/* Control buttons inside Active Loads */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2 pt-2 border-t">
                          <div className="flex flex-wrap gap-1">
                            {car.status === "PLANEJADA" && (
                              <button
                                onClick={() =>
                                  handleUpdateCargaStatus(car, "EM_TRANSITO")
                                }
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1 px-2.5 rounded transition shadow-sm"
                              >
                                🚚 Enviar Transito
                              </button>
                            )}
                            {car.status === "EM_TRANSITO" && (
                              <button
                                onClick={() =>
                                  handleUpdateCargaStatus(car, "ENTREGUE")
                                }
                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] py-1 px-2.5 rounded transition shadow-sm"
                              >
                                ✓ Registrar Entregue
                              </button>
                            )}
                            {(car.status === "ENTREGUE" ||
                              car.status === "EM_TRANSITO" ||
                              car.status === "PLANEJADA") && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() =>
                                  handleUpdateCargaStatus(car, "FATURADA")
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 px-2.5 rounded transition shadow-sm animate-pulse"
                              >
                                ⚡ Faturar Lotação
                              </motion.button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {/* EDIT CARGA BUTTON */}
                            {car.status === "PLANEJADA" && (
                              <button
                                onClick={() => {
                                  setEditingCargaId(car.id);
                                  setEditCargaName(car.name);
                                  setEditCargaDay(car.dayOfWeek);
                                  setEditCargaRoute(
                                    (car.route || []).join(", "),
                                  );
                                  setEditCargaNotes(car.notes || "");
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                title="Editar os dados desta carga"
                              >
                                <Pencil size={13} />
                              </button>
                            )}

                            {car.status !== "FATURADA" && (
                              <button
                                onClick={() =>
                                  handleDeleteCarga(car.id, car.name)
                                }
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Desfazer e remover esta carga"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* Right 1 Column: Formação de Carga e Cargas Atuais */}
        {activeLeftTab !== "CARGAS" && (
          <div className="flex flex-col gap-6">
            {/* Manual creation box */}
            {manualCreating && (
              <div className="bg-white p-5 rounded-2xl border-2 border-indigo-500 shadow-md flex flex-col gap-3.5 animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-black text-slate-800 text-sm">
                    🚚 Formar Nova Carga Manual
                  </h4>
                  <button
                    onClick={() => setManualCreating(false)}
                    className="text-slate-400 hover:text-red-500 focus:outline-none"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                <div className="text-xs text-indigo-950 bg-indigo-50 p-2.5 rounded border border-indigo-100 font-semibold leading-relaxed">
                  Você está formando um frete contendo: <br />
                  {selectedOrderIds.length > 0 && (
                    <span>
                      • <strong>{selectedOrderIds.length} pedidos</strong>{" "}
                      prontos na produção.
                      <br />
                    </span>
                  )}
                  {Object.keys(selectedStockEntries).length > 0 && (
                    <span>
                      •{" "}
                      <strong>
                        {Object.keys(selectedStockEntries).length} produtos
                      </strong>{" "}
                      retirados direto do estoque de segurança.
                      <br />
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-slate-705 block">
                    Nome do Veículo / Carga *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carga Ubá Metropolitana #1"
                    value={cargaName}
                    onChange={(e) => setCargaName(e.target.value)}
                    className="w-full border p-2 text-xs rounded-lg text-slate-800 focus:outline-indigo-500 font-bold"
                  />
                </div>

                <div className="relative flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-indigo-900 block">
                    Indicar Pedido p/ Carregamento (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Pesquisar por Código ou Cliente..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full border p-2 text-xs rounded-lg text-slate-800 focus:outline-indigo-500 font-semibold"
                  />
                  {orderSearchTerm.trim().length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-14 flex flex-col gap-1 border border-slate-250 rounded-lg p-1 bg-white shadow-xl max-h-36 overflow-y-auto">
                      {(() => {
                        const query = orderSearchTerm.trim().toLowerCase();
                        const matches = db.orders
                          .filter(
                            (o) =>
                              o.isActive &&
                              o.status !== "FATURADO" &&
                              o.status !== "PLANEJADO" &&
                              (o.orderCode.toLowerCase().includes(query) ||
                                o.customerName.toLowerCase().includes(query)),
                          )
                          .slice(0, 5);

                        if (matches.length === 0) {
                          return (
                            <span className="text-[10px] text-slate-400 p-1 px-2 italic">
                              Nenhum pedido pendente encontrado
                            </span>
                          );
                        }

                        return matches.map((o) => (
                          <button
                            type="button"
                            key={o.id}
                            onClick={() => {
                              if (!selectedOrderIds.includes(o.id)) {
                                setSelectedOrderIds([
                                  ...selectedOrderIds,
                                  o.id,
                                ]);
                              }
                              setOrderSearchTerm("");
                            }}
                            className="text-left text-[11px] px-2.5 py-1 rounded hover:bg-indigo-650 hover:text-white transition-colors bg-white border border-slate-100 font-bold text-slate-700 flex justify-between items-center"
                          >
                            <span>
                              {o.orderCode} - {o.customerName}
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-medium">
                              {o.status}
                            </span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Dia Preferencial
                    </label>
                    <select
                      value={cargaDay}
                      onChange={(e) => setCargaDay(e.target.value)}
                      className="w-full border p-2 text-xs rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Paradas / Rota
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Ubá, Rodeiro, Diamante"
                      value={cargaRouteInput}
                      onChange={(e) => setCargaRouteInput(e.target.value)}
                      className="w-full border p-2 text-xs rounded-lg text-slate-800 focus:outline-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Notas de Logística
                  </label>
                  <textarea
                    placeholder="Informações adicionais da entrega..."
                    value={cargaNotes}
                    onChange={(e) => setCargaNotes(e.target.value)}
                    rows={2}
                    className="w-full border p-2 text-xs rounded-lg text-slate-805 focus:outline-indigo-500 font-semibold"
                  />
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleCreateCargaManual}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-3 rounded-lg mr-1 shadow-sm transition"
                  >
                    Salvar Carregamento
                  </button>
                  <button
                    onClick={() => setManualCreating(false)}
                    className="bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}



            {/* Guidelines */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex flex-col gap-2">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <BadgeInfo size={14} className="text-indigo-600" />
                Roteiros e Operações do PCP
              </h4>
              <div className="text-[11px] text-slate-600 flex flex-col gap-1.5 font-semibold leading-relaxed">
                <p>
                  Observe que baixas físicas de estoque e logs contábeis são
                  acionados automaticamente no Faturamento das Cargas ou no
                  faturamento manual.
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-605">
                  <li>
                    📅 <strong>Segunda-Feira:</strong> Preferencial para Rio
                    Branco, São Geraldo, Guiricema.
                  </li>
                  <li>
                    📅 <strong>Sexta-Feira:</strong> Preferencial para Rodeiro e
                    Diamante.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== ADVANCED FRIENDLY LABEL PRINTER PRESET MODAL ==================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-indigo-400" />
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  CONFIGURAÇÕES DA IMPRESSÃO DE QR CODES / ETIQUETAS
                </h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-405 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 p-6 gap-6">
              {/* Left Side: Setup preferences */}
              <div className="flex flex-col gap-5 border-r border-slate-100 pr-0 md:pr-6">
                <div>
                  <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Settings
                      min-size={14}
                      size={14}
                      className="text-indigo-700"
                    />
                    Parâmetros das Etiquetas
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configure o formato da folha de saída e elementos visuais da
                    etiqueta.
                  </p>
                </div>

                {/* Print Layout */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    Layout da Folha / Impressora:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPrintOptions((prev) => ({
                          ...prev,
                          layoutMode: "A4",
                        }))
                      }
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                        printOptions.layoutMode === "A4"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Layers size={18} />
                      <span>Folha A4 (Grade 2x5)</span>
                      <span className="text-[9px] font-normal text-slate-400 leading-none">
                        Para impressora comum
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPrintOptions((prev) => ({
                          ...prev,
                          layoutMode: "THERMAL",
                        }))
                      }
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                        printOptions.layoutMode === "THERMAL"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <FileText size={18} />
                      <span>Térmica Zebra (10x5 cm)</span>
                      <span className="text-[9px] font-normal text-slate-400 leading-none">
                        Para rolos adesivados
                      </span>
                    </button>
                  </div>
                </div>

                {/* Show/Hide Elements Switches */}
                <div className="bg-slate-50 p-4 rounded-2xl border flex flex-col gap-3">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest border-b pb-1">
                    Elementos na Etiqueta:
                  </span>

                  {/* Switch 1: QR Code */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        Incluir Vetor QR Code
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Permite leitura das peças pelo App Mobile
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={printOptions.showQR}
                      onChange={(e) =>
                        setPrintOptions((prev) => ({
                          ...prev,
                          showQR: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>

                  {/* Switch 2: Barcode */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        Incluir Código de Barras
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Padrão 1D legível por canetas/pistolas USB
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={printOptions.showBarcode}
                      onChange={(e) =>
                        setPrintOptions((prev) => ({
                          ...prev,
                          showBarcode: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>

                  {/* Switch 3: Logo */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">
                        Mostrar Logotipo da Marca
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Império Acessórios no topo da folha
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={printOptions.showLogo}
                      onChange={(e) =>
                        setPrintOptions((prev) => ({
                          ...prev,
                          showLogo: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Total quantities disclaimer info */}
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[10.5px] text-amber-900 font-medium flex gap-2">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    Você selecionou um lote com{" "}
                    <strong>{itemsToPrint.length} etiquetas</strong> para
                    emitir. Certifique-se de configurar a escala em 100% no
                    diálogo do navegador ao imprimir.
                  </div>
                </div>
              </div>

              {/* Right Side: Interactive Mockup Live Preview */}
              <div className="flex flex-col bg-slate-100 p-5 rounded-2xl items-center justify-start gap-4 border border-slate-200 select-none relative overflow-hidden min-h-[380px]">
                {/* Interactive Controls Bar */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Mockup Interativo ({printOptions.layoutMode})
                  </span>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2 py-1 rounded-lg border border-slate-200 shadow-3xs">
                    <span className="text-[9px] font-bold text-slate-500 mr-1">
                      Zoom:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUseZoom((prev) => Math.max(0.6, prev - 0.1))
                      }
                      className="w-5 h-5 flex items-center justify-center bg-slate-105 hover:bg-slate-200 text-slate-750 rounded text-xs font-bold transition border border-slate-200"
                      title="Diminuir"
                    >
                      -
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-700 min-w-[36px] text-center bg-slate-50 px-1 py-0.5 rounded">
                      {Math.round(useZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUseZoom((prev) => Math.min(1.5, prev + 0.1))
                      }
                      className="w-5 h-5 flex items-center justify-center bg-slate-105 hover:bg-slate-200 text-slate-750 rounded text-xs font-bold transition border border-slate-200"
                      title="Aumentar"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseZoom(1)}
                      className="text-[9px] font-bold text-indigo-600 hover:underline px-1 ml-1"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Toggle Exibir QR / Código de Barras */}
                  <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-3xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePreviewCode("QR");
                        setPrintOptions((prev) => ({ ...prev, showQR: true }));
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                        activePreviewCode === "QR"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Exibir QR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePreviewCode("BARCODE");
                        setPrintOptions((prev) => ({
                          ...prev,
                          showBarcode: true,
                        }));
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                        activePreviewCode === "BARCODE"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Cód. Barras
                    </button>
                  </div>
                </div>

                {/* Virtual Preview Container with zooming wrapper */}
                <div className="w-full h-64 bg-slate-200/50 rounded-xl border border-slate-250 flex items-center justify-center overflow-hidden relative">
                  {/* Styled Outer Wrapper for visual card scaling */}
                  <div
                    className="transition-transform duration-100 origin-center"
                    style={{ transform: `scale(${useZoom})` }}
                  >
                    {printOptions.layoutMode === "THERMAL" ? (
                      /* THERMAL LABEL: 10cm x 5cm optimized aspect label */
                      <div className="label-card thermal-page bg-white text-black p-4 border border-slate-400 rounded-lg shadow-md w-[320px] h-[160px] flex justify-between gap-2.5">
                        {/* Left column specifications */}
                        <div className="flex flex-col justify-between w-[205px] h-full text-left">
                          <div>
                            <div className="border-b pb-1.5 flex justify-between items-center text-[9px] font-bold">
                              <span className="text-slate-800 font-extrabold text-[8px]">
                                {printOptions.showLogo
                                  ? "👑 IMPÉRIO ACESSÓRIOS"
                                  : "ETIQUETA INTERNA"}
                              </span>
                              <span className="bg-slate-900 text-white font-black px-1.5 py-0.2 text-[6px] tracking-wider uppercase rounded">
                                {itemsToPrint[0]?.type === "STOCK"
                                  ? "ESTOQUE"
                                  : "LOGÍSTICA"}
                              </span>
                            </div>

                            <div className="mt-1.5">
                              <span className="text-xs font-black tracking-tight text-slate-955 uppercase truncate block">
                                {itemsToPrint[0]?.itemName ||
                                  "NOME DO PRODUTO MODELO"}
                              </span>
                              <span className="text-[8.5px] text-slate-600 block font-bold tracking-tight mt-0.5">
                                CÓD: {itemsToPrint[0]?.itemCode || "COD-S002"} |
                                COL: {itemsToPrint[0]?.color || "PRETO"} | TAM:{" "}
                                {itemsToPrint[0]?.size || "P"}
                              </span>

                              <div className="mt-1.5 text-[8.5px] leading-tight font-semibold text-slate-700">
                                <div className="truncate">
                                  <span className="text-[7.5px] font-bold text-slate-400 uppercase">
                                    Dest:
                                  </span>{" "}
                                  {itemsToPrint[0]?.recipient ||
                                    "CLIENTE INDUSTRIAL S/A"}
                                </div>
                                <div className="truncate">
                                  <span className="text-[7.5px] font-bold text-slate-400 uppercase">
                                    Local:
                                  </span>{" "}
                                  {itemsToPrint[0]?.destination || "Ubá - MG"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Massive Quantity Font for factory floor distance visibility */}
                          <div className="border-t pt-1.5 flex justify-between items-end">
                            <div className="flex flex-col justify-end">
                              <span className="text-[7.5px] font-black text-slate-400 uppercase">
                                Quantidade
                              </span>
                              <span className="text-3xl font-extrabold leading-none text-slate-900 tracking-tight">
                                {itemsToPrint[0]?.quantity || 15}{" "}
                                <span className="text-xs font-bold text-slate-600">
                                  un
                                </span>
                              </span>
                            </div>
                            <div className="text-[8px] font-bold text-slate-600 mb-1">
                              Etiqueta 1 de {itemsToPrint.length}
                            </div>
                          </div>
                        </div>

                        {/* Right column: code representation */}
                        <div className="w-[85px] h-full flex flex-col justify-center items-center border-l border-dashed border-slate-300 pl-2.5">
                          {activePreviewCode === "QR" ? (
                            printOptions.showQR ? (
                              <div className="animate-in fade-in duration-200">
                                <SVGQRCode
                                  data={itemsToPrint[0]?.id || "QR123"}
                                />
                              </div>
                            ) : (
                              <span className="text-[8px] text-slate-400 font-semibold text-center leading-tight">
                                QR Oculto
                              </span>
                            )
                          ) : printOptions.showBarcode ? (
                            <div className="animate-in fade-in duration-200">
                              <SimulatedBarcode
                                code={itemsToPrint[0]?.code || "S-94"}
                              />
                            </div>
                          ) : (
                            <span className="text-[8px] text-slate-400 font-semibold text-center leading-tight">
                              Código Oculto
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* STANDARD A4 LAYOUT LABEL */
                      <div className="label-card bg-white text-black p-4 border border-slate-400 rounded-lg shadow-md w-[320px] h-[160px] flex flex-col justify-between">
                        <div>
                          <div className="border-b pb-1.5 flex justify-between items-center text-[9px] font-bold">
                            <span className="text-slate-800 font-extrabold">
                              {printOptions.showLogo
                                ? "👑 IMPÉRIO ACESSÓRIOS"
                                : "ETIQUETA INTERNA"}
                            </span>
                            <span className="bg-slate-900 text-white font-black px-1.5 py-0.5 text-[7px] tracking-widest uppercase rounded">
                              PRODUTO
                            </span>
                          </div>

                          {/* Content Details */}
                          <div className="mt-2.5">
                            <span className="text-xs font-black tracking-tight text-slate-900 uppercase line-clamp-1 block">
                              {itemsToPrint[0]?.itemName ||
                                "NOME DO PRODUTO MODELO"}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-bold tracking-widest mt-0.5">
                              CÓD: {itemsToPrint[0]?.itemCode || "COD-S002"} |
                              COL: {itemsToPrint[0]?.color || "PRETO"} | TAM:{" "}
                              {itemsToPrint[0]?.size || "P"}
                            </span>

                            <div className="grid grid-cols-2 gap-1 mt-2.5 text-[8.5px] font-semibold text-slate-650">
                              <div className="flex flex-col">
                                <span className="text-[6.5px] font-bold text-slate-400 uppercase">
                                  Destinatário:
                                </span>
                                <span className="truncate text-slate-850">
                                  {itemsToPrint[0]?.recipient ||
                                    "CLIENTE INDUSTRIAL S/A"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[6.5px] font-bold text-slate-400 uppercase">
                                  Município:
                                </span>
                                <span className="truncate text-slate-850">
                                  {itemsToPrint[0]?.destination || "Ubá - MG"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer options */}
                        <div className="flex justify-between items-end mt-4 border-t pt-2 border-dashed">
                          <div className="flex flex-col">
                            <span className="text-[6.5px] font-bold text-slate-400 uppercase font-sans">
                              Quantidade
                            </span>
                            <span className="text-xl font-black leading-none text-slate-900">
                              {itemsToPrint[0]?.quantity || 15}{" "}
                              <span className="text-[8px] font-normal">un</span>
                            </span>
                          </div>

                          {/* Dynamic graphic rendering based on switches */}
                          <div className="flex items-center gap-1.5">
                            {activePreviewCode === "QR" &&
                              printOptions.showQR && (
                                <div className="animate-in fade-in zoom-in-50 duration-200">
                                  <SVGQRCode
                                    data={itemsToPrint[0]?.id || "QR123"}
                                  />
                                </div>
                              )}

                            {activePreviewCode === "BARCODE" &&
                              printOptions.showBarcode && (
                                <div className="animate-in fade-in zoom-in-50 duration-200">
                                  <div className="scale-90 origin-right">
                                    <SimulatedBarcode
                                      code={itemsToPrint[0]?.code || "S-94"}
                                    />
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-[280px] text-center">
                  O visual acima se adapta em tempo real. Os códigos contêm
                  links de rastreio de logística válidos para o coletor.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="bg-white hover:bg-slate-100 border border-slate-350 text-slate-700 font-extrabold text-xs py-2 px-5 rounded-xl transition"
              >
                Cancelar
              </button>

              <button
                onClick={executeA4Print}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-6 rounded-xl flex items-center gap-2 transition shadow-md active:scale-95"
              >
                <Printer size={15} />
                <span>Emitir & Enviar para Impressora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT CARGA MODAL ==================== */}
      {editingCargaId &&
        (() => {
          const matchingCarga = db.cargas.find((c) => c.id === editingCargaId);
          if (!matchingCarga) return null;

          const handleSaveEdit = async () => {
            if (!editCargaName.trim()) {
              alert("Por favor, digite o nome do lote.");
              return;
            }
            try {
              const splitRoute = editCargaRoute
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean);
              await db.updateCarga({
                ...matchingCarga,
                name: editCargaName,
                dayOfWeek: editCargaDay,
                route: splitRoute,
                notes: editCargaNotes,
              });
              setEditingCargaId(null);
              alert("Lote de faturamento atualizado com sucesso!");
            } catch (e) {
              console.error(e);
              alert("Erro ao editar o lote de faturamento.");
            }
          };

          return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 animate-duration-100">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-205 flex flex-col animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-800 to-indigo-950 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Pencil
                      size={20}
                      className="text-indigo-200 animate-pulse animate-duration-1000"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight">
                        Editar Lotação Planejada
                      </h3>
                      <p className="text-[10px] text-indigo-200/90 font-medium font-sans">
                        Lote criado em{" "}
                        {new Date(
                          matchingCarga.createdAt || Date.now(),
                        ).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCargaId(null)}
                    className="text-indigo-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition focus:outline-none"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Form Content */}
                <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 font-sans">
                      Identificação / Nome da Carga
                    </label>
                    <input
                      type="text"
                      value={editCargaName}
                      onChange={(e) => setEditCargaName(e.target.value)}
                      placeholder="Ex: Carga Sul - Caminhão Baú"
                      className="w-full border border-slate-250 p-2 text-xs font-bold rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-650 focus:outline-none placeholder-slate-400 bg-slate-50/50 font-sans"
                    />
                  </div>

                  {/* Day of the Week */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 font-sans">
                      Dia Semana Previsto para Embarque
                    </label>
                    <select
                      value={editCargaDay}
                      onChange={(e) => setEditCargaDay(e.target.value)}
                      className="w-full border border-slate-250 p-2 text-xs font-bold rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-650 bg-slate-50/50 font-sans"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Route Seq */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 font-sans">
                      Roteiro / Paradas de Entrega (separados por vírgula)
                    </label>
                    <input
                      type="text"
                      value={editCargaRoute}
                      onChange={(e) => setEditCargaRoute(e.target.value)}
                      placeholder="Ex: Rodeiro, Astolfo Dutra, Cataguases"
                      className="w-full border border-slate-250 p-2 text-xs font-semibold rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-650 focus:outline-none placeholder-slate-400 bg-slate-50/50 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 font-medium font-sans">
                      Especifique a ordem das cidades facilitando a roteirização
                      de paradas do motorista.
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 font-sans">
                      Observações de Embarque
                    </label>
                    <textarea
                      rows={3}
                      value={editCargaNotes}
                      onChange={(e) => setEditCargaNotes(e.target.value)}
                      placeholder="Adicione notas sobre cubagem, peso, transportadora, etc."
                      className="w-full border border-slate-250 p-2 text-xs font-medium rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-650 focus:outline-none placeholder-slate-400 bg-slate-50/50 resize-none font-sans"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingCargaId(null)}
                    className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-extrabold text-xs py-2 px-5 rounded-xl transition font-sans"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-6 rounded-xl transition shadow-md active:scale-95 font-sans"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
