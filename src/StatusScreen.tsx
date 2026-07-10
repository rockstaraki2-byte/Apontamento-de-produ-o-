import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import type { OrderStatus, Order } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Phone, Copy } from "lucide-react";
import { normalizeString } from "./searchUtils";

export function StatusScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: import("./types").User;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<"TODOS" | "COM_LOTE" | "SEM_LOTE" | number>("TODOS");
  const [quickInvoiceCode, setQuickInvoiceCode] = useState<string | null>(null);
  const [quickInvoiceQty, setQuickInvoiceQty] = useState<{ [orderId: number]: number | "" }>({});

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [deliveryFilter, setDeliveryFilter] = useState<
    "TODOS" | "NO_PRAZO" | "RISCO" | "ATRASADO" | "FATURADO_PARCIAL" | "FATURADO"
  >("TODOS");
  const [deliveryDateStart, setDeliveryDateStart] = useState<string>("");
  const [deliveryDateEnd, setDeliveryDateEnd] = useState<string>("");
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const [whatsAppShareData, setWhatsAppShareData] = useState<{
    orderCode: string;
    customerName: string;
    productDescription: string;
    quantity: number;
    phone: string;
    representativeName: string;
  } | null>(null);

  const handleDeleteOrder = (orderId: number, orderCode: string) => {
    if (currentUser.role === "LEITURA" || currentUser.role === "REPRESENTANTE") return;
    if (confirm(`Tem certeza que deseja excluir este item do pedido #${orderCode}?`)) {
      db.deleteOrder(orderId);
      const remainingForCode = db.orders.filter(o => o.orderCode === orderCode && o.id !== orderId);
      if (remainingForCode.length === 0) {
        setSelectedOrderCode(null);
      }
    }
  };

  const handleDeleteWholeGroup = async (code: string, ordersInGroup: Order[]) => {
    if (currentUser.role === "LEITURA" || currentUser.role === "REPRESENTANTE") return;
    const msg = ordersInGroup.length > 1 
      ? `Tem certeza que deseja excluir o pedido #${code} por completo (contendo ${ordersInGroup.length} itens)?` 
      : `Tem certeza que deseja excluir o pedido #${code}?`;
    if (confirm(msg)) {
      for (const o of ordersInGroup) {
        await db.deleteOrder(o.id);
      }
    }
  };

  const handleReplicateGroup = async (code: string, ordersInGroup: Order[]) => {
    if (currentUser.role === "LEITURA") return;
    if (confirm(`Deseja replicar o pedido #${code} (com todos os seus ${ordersInGroup.length} itens)?`)) {
      const newCode = `${code}-COPIA`;
      for (const o of ordersInGroup) {
        const { id, ...rest } = o as any;
        delete rest.tempId;
        await db.addOrder({
          ...rest,
          orderCode: newCode,
        });
      }
      alert(`Pedido ${code} replicado com sucesso como ${newCode}!`);
      setSelectedOrderCode(newCode);
    }
  };

  const handleQuickInvoice = (o: Order, qty: number) => {
    const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);

    if (existingStock && (existingStock.reservedQuantity || 0) > 0) {
      const alternateReservedOrders = db.orders.filter(
        (ord) =>
          ord.id !== o.id &&
          ord.itemId === o.itemId &&
          ord.color === o.color &&
          ord.size === o.size &&
          ord.variation === o.variation &&
          (ord.status === "PLANEJADO" || ord.status === "EMBALADO") &&
          ord.isActive,
      );

      if (alternateReservedOrders.length > 0) {
        const primaryResOrder = alternateReservedOrders[0];
        const confirmResult = window.confirm(
          `ALERTA POPUP - PRODUTO RESERVADO PARA OUTRO PEDIDO:\n\n` +
            `O produto que você está faturando contém unidades de estoque RESERVADAS para:\n` +
            `• Pedido: ${primaryResOrder.orderCode}\n` +
            `• Cliente: ${primaryResOrder.customerName}\n\n` +
            `Deseja CONTINUAR assim mesmo e desfazer a reserva do outro pedido ou clique em Cancelar para interromper?`,
        );

        if (!confirmResult) return;

        db.updateOrders([
          {
            ...primaryResOrder,
            status: "PENDENTE",
            packedQuantity: 0,
          },
        ]);

        const nextReservedQty = Math.max(
          0,
          (existingStock.reservedQuantity || 0) - (primaryResOrder.totalQuantity || 0),
        );
        db.updateStocks([
          {
            ...existingStock,
            reservedQuantity: nextReservedQty,
          },
        ]);

        db.addLogs([
          {
            id: Date.now() + 5,
            orderId: primaryResOrder.id,
            operatorId: currentUser.id,
            timestamp: Date.now(),
            durationMillis: 0,
            customProductName: `Reserva desfeita (estoque direcionado para pedido ${o.orderCode})`,
          },
        ]);
      }
    }

    const newInvoiced = (o.invoicedQuantity || 0) + qty;
    const isNowFaturado = newInvoiced >= o.totalQuantity;
    const newStatus = isNowFaturado
      ? ("FATURADO" as const)
      : (newInvoiced > 0 ? ("FATURADO_PARCIAL" as const) : (o.status || "PENDENTE"));

    db.updateOrders([
      {
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: !isNowFaturado,
        isUrgent: isNowFaturado ? false : o.isUrgent,
        _alreadyDeducted: true,
      },
    ]);

    if (existingStock) {
      const newStockQty = Math.max(0, existingStock.quantity - qty);
      const newReservedQty = Math.max(0, (existingStock.reservedQuantity || 0) - qty);
      db.updateStocks([
        {
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty,
        },
      ]);
    }

    if (db.addStockMovement) {
      db.addStockMovement({
        itemId: o.itemId,
        color: o.color,
        size: o.size,
        variation: o.variation,
        quantity: qty,
        type: "SAIDA",
        description: `Saída por faturamento do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
      });
    }

    db.addLogs([
      {
        id: Date.now(),
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
      }
    ]);

    // WhatsApp Notifier Modal Trigger
    const rep = db.users.find((u) => 
      u.role === "REPRESENTANTE" && 
      (u.name === o.representativeName || u.id === o.representativeId)
    );
    const customer = db.customers.find((c) => c.name === o.customerName);
    const clientDisplayName = customer?.tradeName || o.customerName;
    const item = db.items.find((i) => i.id === o.itemId);
    const productDescr = `${item?.name || "Produto"} (Cor: ${o.color || "-"}, Tam: ${o.size || "-"}, Var: ${o.variation || "-"})`;

    setWhatsAppShareData({
      orderCode: o.orderCode || `${o.id}`,
      customerName: clientDisplayName,
      productDescription: productDescr,
      quantity: qty,
      phone: rep?.phone || "",
      representativeName: rep?.name || o.representativeName || "não definido",
    });

    setQuickInvoiceQty(prev => ({ ...prev, [o.id]: "" }));
  };

  const getDeliveryStatus = (o: Order) => {
    if (o.status === "FATURADO") return "Faturado";
    if (!o.deliveryDate) return "Sem Prazo";

    // Convert dates ignoring hours/timezone differences
    const delivery = new Date(o.deliveryDate);
    delivery.setUTCHours(12, 0, 0, 0);
    const deliveryMs = delivery.getTime();

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayMs = today.getTime();

    const diffTime = deliveryMs - todayMs;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Atrasado";
    if (diffDays >= 0 && diffDays <= 2) return "Com risco de atraso";
    return "No prazo";
  };

  const groupedOrders = useMemo(() => {
    const map = new Map<string, typeof db.orders>();

    const term = normalizeString(debouncedSearchTerm);

    const filtered = db.orders.filter((o) => {
      if (currentUser?.role === "PROJETISTA" && !o.isThirdPartyLaser) {
        return false; // Only show Third Party Laser for PROJETISTA
      }

      if (currentUser?.role === "REPRESENTANTE") {
        const isDirectMatch =
          o.representativeId === currentUser.id ||
          o.representativeName === currentUser.name;
        const isDaniloCheck =
          currentUser.id === "representante_danilo" &&
          ((o.representativeName &&
            o.representativeName.toLowerCase().includes("mapefor")) ||
            (o.representativeId && o.representativeId === "mapefor"));
        if (!isDirectMatch && !isDaniloCheck) return false;
      }

      // 1. Text filter match
      const customerObj = db.customers.find(
        (c) => c.name === o.customerName || c.tradeName === o.customerName,
      );
      const itemObj = db.items.find((i) => i.id === o.itemId);

      const searchTarget = normalizeString(
        `${o.orderCode} ${o.customerName} ${customerObj?.tradeName || ""} ${itemObj?.name || ""} ${itemObj?.code || ""}`,
      );

      const textMatch = searchTarget.includes(term);
      if (!textMatch) return false;

      // 2. Multi-status filter match
      if (selectedStatuses.length > 0) {
        const orderEffStatus = (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity))
          ? "FATURADO_PARCIAL"
          : (o.status || "PENDENTE");
        if (!selectedStatuses.includes(orderEffStatus as OrderStatus)) {
          return false;
        }
      }

      // 3. Delivery expiration filter match
      const deliveryStatus = getDeliveryStatus(o);
      const isItemFaturadoParcial = o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity);
      const isItemFaturado = o.status === "FATURADO" || (o.invoicedQuantity || 0) >= o.totalQuantity;

      if (deliveryFilter === "FATURADO_PARCIAL" && !isItemFaturadoParcial)
        return false;
      if (deliveryFilter === "FATURADO" && !isItemFaturado)
        return false;
      if (deliveryFilter === "NO_PRAZO" && (deliveryStatus !== "No prazo" || isItemFaturado || isItemFaturadoParcial))
        return false;
      if (
        deliveryFilter === "RISCO" &&
        (deliveryStatus !== "Com risco de atraso" || isItemFaturado || isItemFaturadoParcial)
      )
        return false;
      if (deliveryFilter === "ATRASADO" && (deliveryStatus !== "Atrasado" || isItemFaturado || isItemFaturadoParcial))
        return false;

      // 3.5 Specific Delivery Date match (Range)
      if (deliveryDateStart || deliveryDateEnd) {
        if (!o.deliveryDate) return false;
        const itemDate = o.deliveryDate.split("T")[0]; // YYYY-MM-DD format
        
        if (deliveryDateStart && itemDate < deliveryDateStart) {
          return false;
        }
        if (deliveryDateEnd && itemDate > deliveryDateEnd) {
          return false;
        }
      }

      // 4. Batch filter match
      if (selectedBatchFilter !== "TODOS") {
        const isLinkedToAnyBatch = db.productionBatches.some((b) => b.orderIds.includes(o.id));
        if (selectedBatchFilter === "COM_LOTE" && !isLinkedToAnyBatch) return false;
        if (selectedBatchFilter === "SEM_LOTE" && isLinkedToAnyBatch) return false;
        if (typeof selectedBatchFilter === "number") {
          const isLinkedToSpecific = db.productionBatches.find((b) => b.id === selectedBatchFilter)?.orderIds.includes(o.id);
          if (!isLinkedToSpecific) return false;
        }
      }

      return true;
    });

    filtered.forEach((o) => {
      if (!map.has(o.orderCode)) map.set(o.orderCode, []);
      map.get(o.orderCode)!.push(o);
    });

    return Array.from(map.entries()).sort(
      (a, b) => b[1][0].createdAt - a[1][0].createdAt,
    );
  }, [db.orders, debouncedSearchTerm, deliveryFilter, selectedStatuses, selectedBatchFilter, db.productionBatches, deliveryDateStart, deliveryDateEnd]);

  const handleStatusChange = (orderId: number, newStatus: OrderStatus) => {
    setIsUpdating(orderId);

    // Slight delay to allow smooth loading skeleton rendering and improve perceived fluidity
    setTimeout(() => {
      const orders = [...db.orders];
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        const order = orders[idx];

        const remainingToInvoice =
          order.totalQuantity - (order.invoicedQuantity || 0);

        if (
          newStatus === "FATURADO" &&
          order.status !== "FATURADO" &&
          remainingToInvoice > 0
        ) {
          const stockId = `${order.itemId}|${order.color}|${order.size}|${order.variation}|ACABADO`;
          const currentStock = db.stocks.find((s) => s.id === stockId);

          if (currentStock) {
            const newStock = {
              ...currentStock,
              quantity: Math.max(0, currentStock.quantity - remainingToInvoice),
              reservedQuantity: Math.max(
                0,
                (currentStock.reservedQuantity || 0) - remainingToInvoice,
              ),
            };
            db.updateStocks([newStock]);

            db.addStockMovement({
              itemId: order.itemId,
              color: order.color,
              size: order.size,
              variation: order.variation,
              quantity: remainingToInvoice,
              type: "SAIDA",
              description: `Faturamento Pedido #${order.orderCode || order.id}`,
            });
          }
        }

        orders[idx] = {
          ...order,
          status: newStatus,
          packedQuantity:
            newStatus === "EMBALADO" || newStatus === "FATURADO"
              ? order.totalQuantity
              : order.packedQuantity,
          invoicedQuantity:
            newStatus === "FATURADO"
              ? order.totalQuantity
              : order.invoicedQuantity || 0,
          isActive: newStatus !== "FATURADO",
          isUrgent: newStatus === "FATURADO" ? false : order.isUrgent,
        };
        db.updateOrders([orders[idx]]);

        if (newStatus === "FATURADO" && order.status !== "FATURADO") {
          const rep = db.users.find((u) => 
            u.role === "REPRESENTANTE" && 
            (u.name === order.representativeName || u.id === order.representativeId)
          );
          const customer = db.customers.find((c) => c.name === order.customerName);
          const clientDisplayName = customer?.tradeName || order.customerName;
          const item = db.items.find((i) => i.id === order.itemId);
          const productDescr = `${item?.name || "Produto"} (Cor: ${order.color || "-"}, Tam: ${order.size || "-"}, Var: ${order.variation || "-"})`;

          setWhatsAppShareData({
            orderCode: order.orderCode || `${order.id}`,
            customerName: clientDisplayName,
            productDescription: productDescr,
            quantity: order.totalQuantity,
            phone: rep?.phone || "",
            representativeName: rep?.name || order.representativeName || "não definido",
          });
        }
      }
      setIsUpdating(null);
    }, 400); // 400ms visual transition
  };

  const getStatusColor = (status: OrderStatus | undefined) => {
    switch (status) {
      case "PENDENTE":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "EM_PRODUCAO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PRODUZIDO":
        return "bg-yellow-105 text-yellow-850 border-yellow-200";
      case "EM_CORTE":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "CORTADO":
        return "bg-cyan-150 text-cyan-850 border-cyan-300";
      case "EM_PINTURA":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "PINTADO":
        return "bg-indigo-100 text-indigo-805 border-indigo-200";
      case "EMBALANDO":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "EMBALADO":
        return "bg-green-100 text-green-800 border-green-200";
      case "FATURADO_PARCIAL":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "FATURADO":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const monthlyBillingData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    let billedAmount = 0;
    let myBilledAmount = 0;
    let myLaunchedVolume = 0;

    const isRep = currentUser.role === "REPRESENTANTE";
    const myName = currentUser.name;
    const myId = currentUser.id;

    const isMyOrder = (order: any) => {
       if (!order) return false;
       return order.representativeName === myName || order.representativeId === myId;
    };
    
    db.logs.forEach(log => {
      if (log.type === "FATURAMENTO" && log.timestamp >= startOfMonth && log.timestamp <= endOfMonth) {
        let itemId = log.itemId;
        let unitPrice = 0;
        let order = null;
        if (log.orderId) {
           order = db.orders.find(o => o.id === log.orderId) || null;
           if (order) {
             itemId = order.itemId;
             if (order.unitPrice) unitPrice = order.unitPrice;
           }
        }
        if (!unitPrice && itemId) {
           const item = db.items.find(i => i.id === itemId);
           if (item && item.price) unitPrice = item.price;
        }
        const qty = log.quantityInvoiced || log.quantityProcessed || log.quantityPacked || 0;
        const value = qty * unitPrice;
        
        billedAmount += value;
        if (isMyOrder(order)) {
           myBilledAmount += value;
        }
      }
    });

    // Calculate Launched Volume and historical average for rep
    let historicalMonthlyLaunched: { [monthKey: string]: number } = {};

    if (isRep) {
      db.orders.forEach(order => {
         if (!isMyOrder(order)) return;

         let unitPrice = order.unitPrice || 0;
         if (!unitPrice) {
            const item = db.items.find(i => i.id === order.itemId);
            if (item && item.price) unitPrice = item.price;
         }
         const val = order.totalQuantity * unitPrice;

         if (order.createdAt >= startOfMonth && order.createdAt <= endOfMonth) {
            myLaunchedVolume += val;
         }

         const d = new Date(order.createdAt);
         const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
         if (d.getTime() < startOfMonth) { // past months
           historicalMonthlyLaunched[monthKey] = (historicalMonthlyLaunched[monthKey] || 0) + val;
         }
      });
    }

    let avgMonthlyLaunched = 0;
    const pastMonthsCount = Object.keys(historicalMonthlyLaunched).length;
    if (pastMonthsCount > 0) {
       avgMonthlyLaunched = Object.values(historicalMonthlyLaunched).reduce((a, b) => a + b, 0) / pastMonthsCount;
    }

    const goal = db.systemSettings?.[0]?.monthlyBillingGoal || 0;
    
    let performanceStatus = "NORMAL";
    if (avgMonthlyLaunched > 0) {
      if (myLaunchedVolume > avgMonthlyLaunched * 1.05) performanceStatus = "ACIMA";
      else if (myLaunchedVolume < avgMonthlyLaunched * 0.95) performanceStatus = "ABAIXO";
    }

    return { 
       billedAmount: isRep ? myBilledAmount : billedAmount, 
       goal,
       isRep,
       myLaunchedVolume,
       avgMonthlyLaunched,
       performanceStatus
    };
  }, [db.logs, db.systemSettings, db.orders, db.items, currentUser]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm w-full mx-auto border overflow-hidden p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4 font-sans">
        Status e Prazos dos Pedidos
      </h2>

      {!monthlyBillingData.isRep && monthlyBillingData.goal > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h3 className="text-sm font-bold text-gray-700">Meta de Faturamento Mensal</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Volume Faturado</span>
              <span className="text-base font-black text-emerald-600">
                R$ {monthlyBillingData.billedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-gray-400 ml-1">
                / R$ {monthlyBillingData.goal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden relative">
            <div 
              className={`h-full absolute left-0 top-0 transition-all duration-700 ${monthlyBillingData.billedAmount >= monthlyBillingData.goal ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, Math.round((monthlyBillingData.billedAmount / monthlyBillingData.goal) * 100))}%` }}
            />
          </div>
          
          <div className="mt-2 text-right">
            <span className="text-xs font-bold text-gray-500">
              {Math.round((monthlyBillingData.billedAmount / monthlyBillingData.goal) * 100)}% da meta atingida
            </span>
          </div>
        </div>
      )}

      {monthlyBillingData.isRep && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📈</span>
                <h3 className="text-sm font-bold text-emerald-900">Volume de Vendas (Lançados)</h3>
              </div>
              {monthlyBillingData.avgMonthlyLaunched > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  monthlyBillingData.performanceStatus === 'ACIMA' ? 'bg-emerald-200 text-emerald-800' :
                  monthlyBillingData.performanceStatus === 'ABAIXO' ? 'bg-rose-200 text-rose-800' :
                  'bg-amber-200 text-amber-800'
                }`}>
                  {monthlyBillingData.performanceStatus === 'ACIMA' ? '⬆️ ACIMA DA MÉDIA' :
                   monthlyBillingData.performanceStatus === 'ABAIXO' ? '⬇️ ABAIXO DA MÉDIA' :
                   '➖ NA MÉDIA'}
                </span>
              )}
            </div>
            <span className="text-2xl font-black text-emerald-700">
              R$ {monthlyBillingData.myLaunchedVolume.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-emerald-700/80 font-semibold mt-1">
              Média Mensal: R$ {monthlyBillingData.avgMonthlyLaunched.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💰</span>
              <h3 className="text-sm font-bold text-blue-900">Seus Pedidos Faturados (Mês)</h3>
            </div>
            <span className="text-2xl font-black text-blue-700">
              R$ {monthlyBillingData.billedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-blue-700/80 font-semibold mt-1">
              Volume que já foi expedido e faturado neste mês.
            </span>
          </div>
        </div>
      )}

      {/* Search and Delivery Status Selector Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 font-sans">
            Buscar Pedido ou Cliente
          </label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por Código ou Cliente..."
            className="status-screen-search-input border border-gray-300 p-2 text-sm rounded w-full focus:outline-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 font-sans">
            Data Inicial
          </label>
          <input
            type="date"
            value={deliveryDateStart}
            onChange={(e) => setDeliveryDateStart(e.target.value)}
            className="border border-gray-300 p-2 text-sm rounded w-full bg-white focus:outline-blue-500 text-gray-700"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 font-sans">
            Data Final
          </label>
          <input
            type="date"
            value={deliveryDateEnd}
            onChange={(e) => setDeliveryDateEnd(e.target.value)}
            className="border border-gray-300 p-2 text-sm rounded w-full bg-white focus:outline-blue-500 text-gray-700"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 font-sans">
            Prazo de Entrega
          </label>
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value as any)}
            className="border border-gray-300 p-2 text-sm rounded w-full bg-white text-gray-700 focus:outline-blue-500 cursor-pointer"
          >
            <option value="TODOS">Todos os Prazos</option>
            <option value="NO_PRAZO">No Prazo (Mais de 2 dias)</option>
            <option value="RISCO">Risco de Atraso (Até 2 dias)</option>
            <option value="ATRASADO">Atrasado (Vencido)</option>
            <option value="FATURADO_PARCIAL">Faturado Parcial</option>
            <option value="FATURADO">Faturado Completo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 font-sans">
            Filtro de Lote
          </label>
          <select
            value={selectedBatchFilter.toString()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "TODOS" || val === "COM_LOTE" || val === "SEM_LOTE") {
                setSelectedBatchFilter(val);
              } else {
                setSelectedBatchFilter(Number(val));
              }
            }}
            className="border border-gray-300 p-2 text-sm rounded w-full bg-white text-gray-700 focus:outline-blue-500 cursor-pointer"
          >
            <option value="TODOS">Todos os Pedidos</option>
            <option value="COM_LOTE">Com Lote Vinculado</option>
            <option value="SEM_LOTE">Sem Lote Vinculado</option>
            {db.productionBatches.map(b => (
              <option key={b.id} value={b.id.toString()}>Lote: {b.name} ({b.status})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Multi-Status Pill Filter */}
      <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-sans">
            Filtro por Status (Selecione Múltiplos):
          </span>
          {selectedStatuses.length > 0 && (
            <button
              onClick={() => setSelectedStatuses([])}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase transition"
            >
              Limpar Filtro ({selectedStatuses.length})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["PENDENTE", "EM_PRODUCAO", "PRODUZIDO", "EM_CORTE", "CORTADO", "EM_PINTURA", "PINTADO", "EMBALANDO", "EMBALADO", "FATURADO_PARCIAL", "FATURADO"] as OrderStatus[]).map((st) => {
            const isSelected = selectedStatuses.includes(st);
            return (
              <button
                key={st}
                onClick={() => {
                  if (isSelected) {
                    setSelectedStatuses(selectedStatuses.filter((s) => s !== st));
                  } else {
                    setSelectedStatuses([...selectedStatuses, st]);
                  }
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition duration-150 border cursor-pointer select-none ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-700 shadow-3xs"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-slate-55"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        {groupedOrders.length === 0 ? (
          <p className="text-gray-500 text-center text-sm font-sans italic my-8">
            Nenhum pedido condizente com os filtros selecionados.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">
            {groupedOrders.map(([code, orders]) => (
              <motion.div
                layoutId={`card-${code}`}
                key={code}
                onClick={() => setSelectedOrderCode(code)}
                className="order-card-container border border-indigo-150 rounded-xl shadow-sm hover:shadow-md bg-white hover:-translate-y-1 transition-all p-4 cursor-pointer relative group"
              >
                <div className="flex justify-between items-start md:items-center">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-lg text-gray-800">
                      Pedido: {code}
                    </h3>
                    <span className="text-xs text-gray-500">
                      Cliente: {orders[0].customerName}
                    </span>
                    <span className="text-xs text-indigo-500 font-bold mt-1">
                      {orders.length} Itens
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 font-sans justify-end">
                    {(() => {
                      // Count occurrences for each status within the order group
                      const statusCounts = orders.reduce((acc, o) => {
                        const effSt = (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity))
                          ? "FATURADO_PARCIAL"
                          : (o.status || "PENDENTE");
                        acc[effSt] = (acc[effSt] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const uniqueStatuses = Object.keys(statusCounts) as OrderStatus[];
                      return uniqueStatuses.map(st => (
                        <span
                          key={st}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(st)}`}
                        >
                          {(st as string).replace("_", " ")} ({statusCounts[st as string]})
                        </span>
                      ));
                    })()}
                    {orders[0].deliveryDate &&
                      (() => {
                        const status = getDeliveryStatus(orders[0]);
                        let badgeColor = "";
                        if (status === "Atrasado")
                          badgeColor =
                            "bg-red-50 text-red-700 border-red-200 animate-pulse font-semibold";
                        else if (status === "Com risco de atraso")
                          badgeColor =
                            "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
                        else if (status === "No prazo")
                          badgeColor =
                            "bg-emerald-50 text-emerald-800 border-emerald-200 font-medium";
                        else
                          badgeColor = "bg-gray-50 text-gray-500 border-gray-150";

                        // Create dd/mmm format taking care of timezone shift
                        let dateFormatted = orders[0].deliveryDate;
                        try {
                          const dateParts = orders[0].deliveryDate.split("T")[0].split("-");
                          if (dateParts.length === 3) {
                            const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            const monthStr = dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase();
                            dateFormatted = `${day}/${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}`;
                          }
                        } catch(e) {}

                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2.5 py-1 rounded text-[10px] sm:text-xs border uppercase tracking-wider ${badgeColor}`}
                            >
                              {status}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase flex items-center gap-1">
                              🗓️ Entrega: {dateFormatted}
                            </span>
                          </div>
                        );
                      })()}
                  </div>
                </div>

                {/* Inline Quick Invoicing Sub-panel */}
                {quickInvoiceCode === code && (
                  <div
                    className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 cursor-default select-none animate-in fade-in zoom-in-95 duration-150 text-sans"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-extrabold text-slate-550 uppercase tracking-widest block border-b pb-1">
                      ⚡ Faturamento Parcial Rápido
                    </span>
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {orders.map((o) => {
                        const itemObj = db.items.find((i) => i.id === o.itemId);
                        const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
                        const physicalStock = db.stocks.find((s) => s.id === stockId)?.quantity || 0;
                        const limit = Math.max(o.totalQuantity - (o.invoicedQuantity || 0), physicalStock);
                        
                        const currentInput = quickInvoiceQty[o.id] !== undefined ? quickInvoiceQty[o.id] : "";
                        const remaining = o.totalQuantity - (o.invoicedQuantity || 0);

                        return (
                          <div key={o.id} className="p-2 border border-slate-100 bg-white rounded-lg flex flex-col gap-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col max-w-[70%]">
                                <span className="font-bold text-[11px] text-slate-800 truncate" title={itemObj?.name}>
                                  {itemObj?.name || "Produto"}
                                </span>
                                <span className="text-[9px] text-slate-550 font-mono">
                                  {o.color || "-"} | {o.size || "-"} | {o.variation || "-"}
                                </span>
                                <span className="text-[9px] text-indigo-600 font-bold font-sans mt-0.5">
                                  Faturado: {o.invoicedQuantity || 0} / Total: {o.totalQuantity} (Pendente: {remaining})
                                </span>
                              </div>
                              <span className="text-[9px] bg-slate-150 px-1.5 py-0.5 rounded font-mono font-bold text-slate-600 self-start">
                                Estoque: {physicalStock}
                              </span>
                            </div>

                            {remaining > 0 ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <input
                                  type="number"
                                  placeholder={`Max: ${limit}`}
                                  value={currentInput}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? "" : Number(e.target.value);
                                    setQuickInvoiceQty(prev => ({ ...prev, [o.id]: val }));
                                  }}
                                  className="w-20 p-1 border border-slate-200 text-[10px] rounded font-mono focus:outline-emerald-500 text-center"
                                />
                                <button
                                  type="button"
                                  disabled={currentInput === "" || currentInput <= 0 || currentInput > limit}
                                  onClick={() => handleQuickInvoice(o, Number(currentInput))}
                                  className="px-2 py-1 bg-emerald-600 font-bold text-[9px] text-white rounded hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer"
                                >
                                  Faturar
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 mt-1">
                                ✓ Faturado por Completo
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons Directly on Card */}
                <div
                  className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentUser.role !== "LEITURA" && currentUser.role !== "REPRESENTANTE" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteWholeGroup(code, orders)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer mr-auto"
                    >
                      <Trash2 size={12} /> Excluir Pedido
                    </button>
                  )}
                  {currentUser.role !== "LEITURA" && (
                    <button
                      type="button"
                      onClick={() => handleReplicateGroup(code, orders)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} /> Replicar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrderCode(code)}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg transition active:scale-95"
                  >
                    Ver Detalhes
                  </button>
                  {currentUser.role !== "LEITURA" && currentUser.role !== "REPRESENTANTE" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (quickInvoiceCode === code) {
                          setQuickInvoiceCode(null);
                        } else {
                          setQuickInvoiceCode(code);
                        }
                      }}
                      className={`px-2.5 py-1.5 font-bold text-[10px] rounded-lg transition active:scale-95 flex items-center gap-1 ${
                        quickInvoiceCode === code
                          ? "bg-amber-600 text-white hover:bg-amber-700 shadow-3xs"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {quickInvoiceCode === code ? "Fechar Painel" : "Faturar Parcial"}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrderCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedOrderCode(null)}
          >
            <motion.div
              layoutId={`card-${selectedOrderCode}`}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                <h3 className="font-bold text-xl text-gray-800">
                  Detalhes do Pedido: {selectedOrderCode}
                </h3>
                <button
                  onClick={() => setSelectedOrderCode(null)}
                  className="p-1 rounded-full hover:bg-gray-200 transition"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
                {groupedOrders
                  .find(([code]) => code === selectedOrderCode)?.[1]
                  .map((o) => {
                    const item = db.items.find((i) => i.id === o.itemId);

                    if (isUpdating === o.id) {
                      return (
                        <div
                          key={`skeleton-${o.id}`}
                          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-pulse"
                        >
                          <div className="flex flex-col gap-2 w-full md:w-1/2">
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-50 rounded w-1/2 mt-1"></div>
                          </div>
                          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <div className="h-6 w-16 bg-gray-200 rounded-md"></div>
                            <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={o.id}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3"
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 text-sm">
                              {item?.name}
                            </span>
                            <span className="text-xs text-gray-500 font-mono mt-0.5">
                              {o.color || "-"} | {o.size || "-"} |{" "}
                              {o.variation || "-"}
                            </span>
                            <span className="text-xs text-gray-400 font-sans mt-1 bg-gray-50 px-2 py-0.5 rounded w-max">
                              Embalado: {o.packedQuantity || 0} / Total do
                              Pedido: {o.totalQuantity || 0}
                            </span>
                            <div className="flex flex-col">
                              {(() => {
                                let itemDateFormatted = o.deliveryDate || "-";
                                try {
                                  if (o.deliveryDate) {
                                    const dateParts = o.deliveryDate.split("T")[0].split("-");
                                    if (dateParts.length === 3) {
                                      const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                                      const day = String(dateObj.getDate()).padStart(2, '0');
                                      const monthStr = dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase();
                                      itemDateFormatted = `${day}/${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}`;
                                    }
                                  }
                                } catch(e) {}
                                return (
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded mt-1 w-max">
                                    🗓️ Entrega: {itemDateFormatted}
                                  </span>
                                );
                              })()}
                              {(() => {
                                const batch = db.productionBatches.find(b => b.orderIds.includes(o.id));
                                if (batch) {
                                  return (
                                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded mt-1 w-max">
                                      Lote Vinculado: {batch.name} ({batch.status})
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded mt-1 w-max">
                                    Não Vinculado a Lote
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {(() => {
                              const itemEffSt = (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity))
                                ? "FATURADO_PARCIAL"
                                : (o.status || "PENDENTE");
                              return (
                                <motion.span
                                  layout
                                  key={itemEffSt}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(itemEffSt as OrderStatus)}`}
                                >
                                  {itemEffSt.replace("_", " ")}
                                </motion.span>
                              );
                            })()}
                            <select
                              value={o.status || "PENDENTE"}
                              disabled={currentUser.role === "LEITURA" || currentUser.role === "REPRESENTANTE"}
                              onChange={(e) =>
                                handleStatusChange(
                                  o.id,
                                  e.target.value as OrderStatus,
                                )
                              }
                              className="border border-gray-300 rounded text-xs p-1.5 text-gray-700 bg-white focus:outline-indigo-500 cursor-pointer disabled:opacity-50 disabled:bg-gray-100"
                            >
                              <option value="PENDENTE">Pendente</option>
                              <option value="EM_PRODUCAO">Em Produção</option>
                              <option value="PRODUZIDO">Produzido</option>
                              <option value="EM_CORTE">Em Corte</option>
                              <option value="CORTADO">Cortado</option>
                              <option value="EM_PINTURA">Em Pintura</option>
                              <option value="PINTADO">Pintado</option>
                              <option value="EMBALANDO">Embalando</option>
                              <option value="EMBALADO">Embalado</option>
                              <option value="FATURADO_PARCIAL">Faturado Parcial</option>
                              <option value="FATURADO">Faturado</option>
                            </select>
                            {currentUser.role !== "LEITURA" && currentUser.role !== "REPRESENTANTE" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(o.id, selectedOrderCode)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded transition border border-transparent hover:border-rose-100 flex-shrink-0 cursor-pointer"
                                title="Excluir este item"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {(() => {
                          let label = "";
                          let qty = 0;
                          let color = "";
                          if (o.status === "EM_CORTE" || o.status === "CORTADO") {
                            label = "Cortado";
                            qty = o.cutQuantity || 0;
                            color = "bg-indigo-500";
                          } else if (o.status === "EM_PRODUCAO" || o.status === "PRODUZIDO") {
                            label = "Produzido / Zincado";
                            qty = o.producedQuantity || 0;
                            color = "bg-amber-500";
                          } else if (o.status === "EM_PINTURA" || o.status === "PINTADO") {
                            label = "Pintado";
                            qty = o.paintedQuantity || 0;
                            color = "bg-pink-500";
                          } else if (o.status === "EMBALANDO" || o.status === "EMBALADO") {
                            label = "Embalado";
                            qty = o.packedQuantity || 0;
                            color = "bg-emerald-500";
                          }

                          if (!label) return null;

                          const pct = Math.min(100, Math.round((qty / (o.totalQuantity || 1)) * 100));

                          return (
                            <div className="bg-white p-2 rounded border border-slate-100">
                              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                                <span>Progresso ({label})</span>
                                <span>{qty} / {o.totalQuantity}</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const itemAgendas = (db.productionAgendas || [])
                            .filter((a) => a.orderId === o.id)
                            .sort(
                              (a, b) =>
                                new Date(a.estimatedDate).getTime() -
                                new Date(b.estimatedDate).getTime(),
                            );

                          if (itemAgendas.length === 0) return null;

                          return (
                            <div className="w-full mt-1 pt-3 border-t border-gray-50">
                              <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <span>⏱️</span> Cronograma de Produção Estimado
                              </h4>
                              <div className="flex items-center flex-wrap gap-2">
                                {itemAgendas.map((agenda, idx) => {
                                  const sector = db.sectors.find(
                                    (s) => s.id === agenda.sectorId,
                                  );
                                  return (
                                    <div
                                      key={agenda.id}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="flex flex-col border border-indigo-100 bg-indigo-50/50 rounded px-2.5 py-1 text-center min-w-[75px] transition-all hover:bg-indigo-100 hover:border-indigo-200">
                                        <span
                                          className="text-[9px] font-bold text-indigo-900 truncate max-w-[80px]"
                                          title={sector?.name || "Setor"}
                                        >
                                          {sector?.name || "Setor"}
                                        </span>
                                        <span className="text-[10px] font-mono text-indigo-600 mt-0.5">
                                          {agenda.estimatedDate
                                            .split("-")
                                            .reverse()
                                            .join("/")}
                                        </span>
                                      </div>
                                      {idx < itemAgendas.length - 1 && (
                                        <span className="text-gray-300 text-[10px] font-bold flex-shrink-0">
                                          →
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE COMPARTILHAMENTO WHATSAPP */}
      {whatsAppShareData && (() => {
        const dateStr = (() => {
          const date = new Date();
          const day = String(date.getDate()).padStart(2, '0');
          const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const month = months[date.getMonth()];
          const year = String(date.getFullYear()).slice(-2);
          return `${day}/${month}/${year}`;
        })();

        // Formatação final da mensagem
        const messageText = `*FATURAMENTO DE PEDIDO* 🚀

*Nº Pedido:* ${whatsAppShareData.orderCode}
*Cliente:* ${whatsAppShareData.customerName}
*Data Faturamento:* ${dateStr}

*Itens Enviados:*
• ${whatsAppShareData.productDescription} - Qtd: *${whatsAppShareData.quantity}*

_Mensagem do Sistema Império Jomarci_`;

        return (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
              <div className="bg-teal-600 text-white p-4 flex items-center gap-2">
                <Phone size={24} className="text-white" />
                <h3 className="font-bold text-lg text-white">Compartilhar no WhatsApp</h3>
              </div>

              <div className="p-5 flex flex-col gap-4 text-gray-800">
                <p className="text-sm">
                  O pedido <strong>#{whatsAppShareData.orderCode}</strong> foi faturado com sucesso! Deseja notificar o representante <strong>{whatsAppShareData.representativeName || "não definido"}</strong>?
                </p>

                {/* Campo Celular do Representante */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Telefone do Destinatário (País + DDD + Número)</label>
                  <input
                    type="text"
                    value={whatsAppShareData.phone}
                    placeholder="Ex: 5511999998888"
                    onChange={(e) => setWhatsAppShareData(prev => prev ? { ...prev, phone: e.target.value.replace(/\D/g, "") } : null)}
                    className="w-full border p-2 text-sm font-mono rounded bg-gray-50 focus:ring-1 focus:ring-teal-500 outline-none text-gray-850"
                  />
                  {!whatsAppShareData.phone && (
                    <span className="text-[11px] text-amber-600 font-bold">⚠️ Telefone não cadastrado. Insira acima para compartilhar!</span>
                  )}
                </div>

                {/* Preview da Mensagem */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mensagem Gerada</label>
                  <pre className="text-[11px] bg-gray-900 text-green-400 p-4 rounded font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                    {messageText}
                  </pre>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3.5 flex justify-end gap-2 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setWhatsAppShareData(null)}
                  className="px-4 py-2 border rounded text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Fechar sem enviar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(messageText);
                    alert("Mensagem copiada com sucesso para a área de transferência!");
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-bold transition cursor-pointer"
                >
                  Copiar Mensagem
                </button>
                <button
                  type="button"
                  disabled={!whatsAppShareData.phone}
                  onClick={() => {
                    const clean = whatsAppShareData.phone.replace(/\D/g, "");
                    const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(messageText)}`;
                    window.open(url, "_blank");
                    setWhatsAppShareData(null);
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone size={14} className="text-white" /> Abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
