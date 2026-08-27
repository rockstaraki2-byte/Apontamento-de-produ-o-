import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Package,
  Calendar,
  User as UserIcon,
  CreditCard,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
} from "lucide-react";
import { Order, OrderStatus, User, COLOR_MAP } from "../types";

interface OrderEditModalProps {
  orderCode: string | null;
  db: any;
  currentUser: User;
  onClose: () => void;
  onSaveSuccess?: (newOrderCode: string) => void;
}

export function OrderEditModal({
  orderCode,
  db,
  currentUser,
  onClose,
  onSaveSuccess,
}: OrderEditModalProps) {
  // Find group of orders with matching orderCode
  const orderGroup = useMemo(() => {
    if (!orderCode) return [];
    const activeGroup = db.orders.filter(
      (o: Order) => o.orderCode === orderCode && o.status !== "CANCELADO",
    );
    return activeGroup.length > 0
      ? activeGroup
      : db.orders.filter((o: Order) => o.orderCode === orderCode);
  }, [orderCode, db.orders]);

  const firstOrder = orderGroup[0];

  // Header state
  const [editingOrderCode, setEditingOrderCode] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerSelected, setCustomerSelected] = useState<boolean>(true);
  const [representativeName, setRepresentativeName] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [status, setStatus] = useState<OrderStatus>("PENDENTE");
  const [notes, setNotes] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [isProgramacao, setIsProgramacao] = useState<boolean>(false);

  // Billing / Payment state
  const [fiscalType, setFiscalType] = useState<"COM_NF" | "SEM_NF" | "MEIA_NOTA">("COM_NF");
  const [paymentType, setPaymentType] = useState<"boleto" | "pix" | "deposito" | "carteira" | "cartao_credito" | "cheque" | "a_prazo" | "outro">("boleto");
  const [customPaymentCondition, setCustomPaymentCondition] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [billingRule, setBillingRule] = useState<"cadastro" | "ultimo_pedido">("cadastro");
  const [discountPercent, setDiscountPercent] = useState<string | number>("");
  const [hasRET, setHasRET] = useState<boolean>(false);

  // Line items state
  interface LineItemState {
    id?: number;
    itemId: number;
    color: string;
    size: string;
    variation: string;
    totalQuantity: number;
    unitPrice?: number;
    isUrgent?: boolean;
    isProgramacao?: boolean;
    isThirdPartyLaser?: boolean;
  }

  const [lineItems, setLineItems] = useState<LineItemState[]>([]);

  // Item form state (for adding or editing a line item)
  const [cartIndex, setCartIndex] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<number | string>("");
  const [itemColor, setItemColor] = useState<string>("");
  const [itemSize, setItemSize] = useState<string>("");
  const [itemVariation, setItemVariation] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number | string>("");
  const [itemUnitPrice, setItemUnitPrice] = useState<number | string>("");
  const [itemIsUrgent, setItemIsUrgent] = useState<boolean>(false);
  const [itemIsProgramacao, setItemIsProgramacao] = useState<boolean>(false);
  const [itemIsThirdPartyLaser, setItemIsThirdPartyLaser] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  // Initialize state when modal opens
  useEffect(() => {
    if (!firstOrder) return;

    setEditingOrderCode(firstOrder.orderCode || "");
    setCustomerName(firstOrder.customerName || "");
    setCustomerSelected(true);
    setRepresentativeName(firstOrder.representativeName || "");
    setDeliveryDate(firstOrder.deliveryDate || "");
    setStatus((firstOrder.status as OrderStatus) || "PENDENTE");
    setNotes(firstOrder.notes || "");
    setIsUrgent(!!firstOrder.isUrgent);
    setIsProgramacao(!!firstOrder.isProgramacao);

    // Payment fields
    setFiscalType(firstOrder.fiscalType || "COM_NF");
    const cond = (firstOrder.paymentCondition || "").toUpperCase();
    if (cond === "PIX") {
      setPaymentType("pix");
      setCustomPaymentCondition("");
    } else if (cond === "BOLETO") {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
    } else if (cond === "DEPÓSITO" || cond === "DEPOSITO") {
      setPaymentType("deposito");
      setCustomPaymentCondition("");
    } else if (cond === "CARTEIRA") {
      setPaymentType("carteira");
      setCustomPaymentCondition("");
    } else if (cond.includes("CARTÃO") || cond.includes("CARTAO") || cond.includes("CREDITO")) {
      setPaymentType("cartao_credito");
      setCustomPaymentCondition("");
    } else if (cond === "CHEQUE") {
      setPaymentType("cheque");
      setCustomPaymentCondition("");
    } else if (cond === "A PRAZO" || cond === "A_PRAZO" || cond === "PRAZO") {
      setPaymentType("a_prazo");
      setCustomPaymentCondition("");
    } else if (cond) {
      setPaymentType("outro");
      setCustomPaymentCondition(firstOrder.paymentCondition || "");
    } else {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
    }

    setPaymentTerms(firstOrder.paymentTerms || "");
    setBillingRule(firstOrder.billingRule || "cadastro");
    setDiscountPercent(firstOrder.discountPercent !== undefined ? firstOrder.discountPercent : "");
    setHasRET(!!firstOrder.hasRET);

    // Items
    setLineItems(
      orderGroup.map((o: Order) => ({
        id: o.id,
        itemId: o.itemId,
        color: o.color || "-",
        size: o.size || "-",
        variation: o.variation || "-",
        totalQuantity: o.totalQuantity || 0,
        unitPrice: o.unitPrice,
        isUrgent: !!o.isUrgent,
        isProgramacao: !!o.isProgramacao,
        isThirdPartyLaser: !!o.isThirdPartyLaser,
      })),
    );

    // Reset item form
    resetItemForm();
  }, [firstOrder, orderGroup]);

  const resetItemForm = () => {
    setCartIndex(null);
    setItemSearchQuery("");
    setSelectedItemId("");
    setItemColor("");
    setItemSize("");
    setItemVariation("");
    setItemQuantity("");
    setItemUnitPrice("");
    setItemIsUrgent(false);
    setItemIsProgramacao(false);
    setItemIsThirdPartyLaser(false);
  };

  const selectedItemObj = useMemo(() => {
    if (!selectedItemId) return null;
    return db.items.find((i: any) => i.id === Number(selectedItemId));
  }, [selectedItemId, db.items]);

  const availableStock = useMemo(() => {
    if (!selectedItemId) return 0;
    const stockId = `${selectedItemId}|${itemColor || "-"}|${itemSize || "-"}|${itemVariation || "-"}|ACABADO`;
    const st = db.stocks.find((s: any) => s.id === stockId);
    return st?.quantity || 0;
  }, [selectedItemId, itemColor, itemSize, itemVariation, db.stocks]);

  const suggestedItems = useMemo(() => {
    const query = itemSearchQuery.trim().toLowerCase();
    if (!query) return (db.items || []).slice(0, 100);

    const normalize = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normalizedQuery = normalize(query);
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 0);

    return (db.items || [])
      .filter((it: any) => {
        const searchableText = normalize(`${it.code || ""} ${it.name || ""}`);
        return queryWords.every((word) => searchableText.includes(word));
      })
      .slice(0, 100);
  }, [itemSearchQuery, db.items]);

  const handleEditLineItem = (index: number) => {
    const li = lineItems[index];
    if (!li) return;
    setCartIndex(index);
    setSelectedItemId(li.itemId);
    const it = db.items.find((i: any) => i.id === li.itemId);
    setItemSearchQuery(it ? `${it.code} - ${it.name}` : "");
    setItemColor(li.color);
    setItemSize(li.size);
    setItemVariation(li.variation);
    setItemQuantity(li.totalQuantity);
    setItemUnitPrice(li.unitPrice !== undefined ? li.unitPrice : "");
    setItemIsUrgent(!!li.isUrgent);
    setItemIsProgramacao(!!li.isProgramacao);
    setItemIsThirdPartyLaser(!!li.isThirdPartyLaser);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      alert("O pedido deve ter pelo menos 1 item. Para excluir o pedido por completo, utilize a opção Excluir Pedido.");
      return;
    }
    const updated = lineItems.filter((_, idx) => idx !== index);
    setLineItems(updated);
    if (cartIndex === index) {
      resetItemForm();
    } else if (cartIndex !== null && cartIndex > index) {
      setCartIndex(cartIndex - 1);
    }
  };

  const handleAddOrUpdateItem = () => {
    if (!selectedItemId || !itemQuantity || Number(itemQuantity) <= 0) {
      alert("Selecione um produto e informe uma quantidade válida maior que zero.");
      return;
    }

    const numItemId = Number(selectedItemId);
    const numQty = Number(itemQuantity);
    const numPrice = itemUnitPrice === "" ? undefined : Number(itemUnitPrice);

    if (cartIndex !== null) {
      // Update existing item in cart
      const updated = [...lineItems];
      updated[cartIndex] = {
        ...updated[cartIndex],
        itemId: numItemId,
        color: itemColor || "-",
        size: itemSize || "-",
        variation: itemVariation || "-",
        totalQuantity: numQty,
        unitPrice: numPrice,
        isUrgent: itemIsUrgent,
        isProgramacao: itemIsProgramacao,
        isThirdPartyLaser: itemIsThirdPartyLaser,
      };
      setLineItems(updated);
    } else {
      // Add new item to cart
      setLineItems([
        ...lineItems,
        {
          itemId: numItemId,
          color: itemColor || "-",
          size: itemSize || "-",
          variation: itemVariation || "-",
          totalQuantity: numQty,
          unitPrice: numPrice,
          isUrgent: itemIsUrgent,
          isProgramacao: itemIsProgramacao,
          isThirdPartyLaser: itemIsThirdPartyLaser,
        },
      ]);
    }

    resetItemForm();
  };

  const handleSave = async () => {
    if (!orderCode) return;
    if (lineItems.length === 0) {
      alert("O pedido precisa conter pelo menos um item.");
      return;
    }

    const newCode = editingOrderCode.trim() || orderCode;
    const finalCustomerName = customerName.trim();
    if (!finalCustomerName) {
      alert("Por favor, preencha o Nome do Cliente.");
      return;
    }

    if (!deliveryDate) {
      alert("Por favor, informe a Data de Entrega.");
      return;
    }

    let finalPaymentCondition = "";
    if (paymentType === "pix") finalPaymentCondition = "PIX";
    else if (paymentType === "boleto") finalPaymentCondition = "Boleto";
    else if (paymentType === "deposito") finalPaymentCondition = "Depósito";
    else if (paymentType === "carteira") finalPaymentCondition = "Carteira";
    else if (paymentType === "cartao_credito") finalPaymentCondition = "Cartão de Crédito";
    else if (paymentType === "cheque") finalPaymentCondition = "Cheque";
    else if (paymentType === "a_prazo") finalPaymentCondition = "A Prazo";
    else if (paymentType === "outro") finalPaymentCondition = customPaymentCondition.trim() || "Outro";

    setIsSubmitting(true);
    try {
      const existingIdsInGroup = new Set(orderGroup.map((g: Order) => g.id));
      const keepIds = new Set(
        lineItems.filter((li) => li.id !== undefined).map((li) => li.id!),
      );

      // 1. Deactivate removed items
      const ordersToDeactivate: Order[] = orderGroup
        .filter((o: Order) => !keepIds.has(o.id))
        .map((o: Order) => ({ ...o, isActive: false }));

      // 2. Prepare updates for existing items
      const ordersToUpdate: Order[] = [];
      const newOrdersToCreate: Omit<Order, "id">[] = [];

      for (const li of lineItems) {
        if (li.id && existingIdsInGroup.has(li.id)) {
          const existing = orderGroup.find((g: Order) => g.id === li.id)!;
          ordersToUpdate.push({
            ...existing,
            orderCode: newCode,
            customerName: finalCustomerName,
            representativeName: representativeName.trim(),
            deliveryDate,
            status,
            notes,
            fiscalType,
            paymentCondition: finalPaymentCondition,
            paymentTerms: paymentTerms.trim(),
            billingRule,
            discountPercent: discountPercent === "" ? undefined : Number(discountPercent),
            hasRET,
            isUrgent: isUrgent || li.isUrgent,
            isProgramacao: isProgramacao || li.isProgramacao,
            itemId: li.itemId,
            color: li.color || "-",
            size: li.size || "-",
            variation: li.variation || "-",
            totalQuantity: li.totalQuantity,
            unitPrice: li.unitPrice,
            isThirdPartyLaser: li.isThirdPartyLaser,
          });
        } else {
          newOrdersToCreate.push({
            orderCode: newCode,
            customerName: finalCustomerName,
            representativeName: representativeName.trim(),
            representativeId: firstOrder?.representativeId,
            deliveryDate,
            status,
            notes,
            fiscalType,
            paymentCondition: finalPaymentCondition,
            paymentTerms: paymentTerms.trim(),
            billingRule,
            discountPercent: discountPercent === "" ? undefined : Number(discountPercent),
            hasRET,
            isUrgent: isUrgent || li.isUrgent,
            isProgramacao: isProgramacao || li.isProgramacao,
            itemId: li.itemId,
            color: li.color || "-",
            size: li.size || "-",
            variation: li.variation || "-",
            totalQuantity: li.totalQuantity,
            packedQuantity: 0,
            producedQuantity: 0,
            paintedQuantity: 0,
            cutQuantity: 0,
            invoicedQuantity: 0,
            unitPrice: li.unitPrice,
            isThirdPartyLaser: li.isThirdPartyLaser,
            isActive: true,
            createdAt: firstOrder?.createdAt || Date.now(),
          });
        }
      }

      const allUpdated = [...ordersToDeactivate, ...ordersToUpdate];
      if (allUpdated.length > 0) {
        await db.updateOrders(allUpdated);
      }

      if (newOrdersToCreate.length > 0) {
        for (const no of newOrdersToCreate) {
          await db.addOrder(no);
        }
      }

      // Add audit log
      if (db.addLogs) {
        db.addLogs([
          {
            id: Date.now(),
            operatorId: currentUser.id || "admin",
            type: "PRODUCAO",
            timestamp: Date.now(),
            durationMillis: 0,
            processName: `Pedido #${orderCode} foi editado por ${currentUser.name}.${newCode !== orderCode ? ` Código alterado para #${newCode}.` : ""}`,
          },
        ]);
      }

      alert(`✅ Pedido #${newCode} atualizado com sucesso!`);
      if (onSaveSuccess) onSaveSuccess(newCode);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar edição do pedido:", err);
      alert("Erro ao salvar alterações: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!orderCode || !firstOrder) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white p-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/15 p-2 rounded-xl border border-white/20">
              <Edit2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight flex items-center gap-2">
                Editar Pedido #{orderCode}
              </h2>
              <span className="text-xs text-indigo-200 font-medium">
                Altere cabeçalho, condições de pagamento e itens do pedido
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6 bg-slate-50/50">
          {/* SECTION 1: Cabeçalho do Pedido */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText size={16} className="text-indigo-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                1. Cabeçalho do Pedido
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Código */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Código / Número do Pedido
                </label>
                <input
                  type="text"
                  value={editingOrderCode}
                  onChange={(e) => setEditingOrderCode(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                  placeholder="Ex: PED-1001"
                />
              </div>

              {/* Cliente */}
              <div className="flex flex-col gap-1 relative sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Cliente (Razão Social ou Nome Fantasia)
                  </label>
                  {customerSelected && customerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSelected(false);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                    >
                      Alterar / Buscar
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setCustomerSelected(false);
                    }}
                    onFocus={() => {
                      if (!customerSelected) {
                        // Keep open for search
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                    placeholder="Pesquisar por Código, Razão Social, Fantasia ou CNPJ..."
                  />
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName("");
                        setCustomerSelected(false);
                      }}
                      className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
                      title="Limpar campo"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {!customerSelected && customerName.trim().length > 0 && (() => {
                  const queryNorm = customerName
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim();
                  
                  const matches = (db.customers || [])
                    .filter((c: any) => {
                      const idStr = String(c.id || "").toLowerCase();
                      const nameNorm = (c.name || "")
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                      const tradeNorm = (c.tradeName || "")
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                      const cnpjNorm = String(c.cnpj || "").replace(/\D/g, "");
                      const cityNorm = (c.city || "")
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                      
                      return (
                        idStr.includes(queryNorm) ||
                        nameNorm.includes(queryNorm) ||
                        tradeNorm.includes(queryNorm) ||
                        cnpjNorm.includes(queryNorm.replace(/\D/g, "")) ||
                        cityNorm.includes(queryNorm)
                      );
                    })
                    .slice(0, 10);

                  if (matches.length === 0) {
                    return (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-xs text-slate-500 text-center">
                        Nenhum cliente cadastrado encontrado com "{customerName}". O valor digitado será usado como nome avulso.
                      </div>
                    );
                  }

                  return (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto text-left divide-y divide-slate-100">
                      {matches.map((c: any) => {
                        const hasTrade = c.tradeName && c.tradeName !== c.name;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const chosenName = c.tradeName ? `${c.id} - ${c.tradeName}` : `${c.id} - ${c.name}`;
                              setCustomerName(chosenName);
                              setCustomerSelected(true);
                              if (c.representativeName && !representativeName) {
                                setRepresentativeName(c.representativeName);
                              }
                            }}
                            className="w-full text-left p-2.5 hover:bg-indigo-50/70 text-xs transition flex flex-col gap-0.5 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-800">
                                {c.id} - {c.name}
                              </span>
                              {c.city && (
                                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                  {c.city}{c.state ? `/${c.state}` : ""}
                                </span>
                              )}
                            </div>
                            {hasTrade && (
                              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded self-start border border-indigo-100">
                                Fantasia: {c.tradeName}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Data de Entrega */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Data Prevista de Entrega
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                />
              </div>

              {/* Representante */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Representante
                </label>
                <select
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                >
                  <option value="">Nenhum (Venda Direta)</option>
                  {(db.users || [])
                    .filter((u: User) => u.role === "REPRESENTANTE")
                    .map((u: User) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Status do Pedido
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                >
                  <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="EM_PRODUCAO">Em Produção</option>
                  <option value="PRODUZIDO">Produzido</option>
                  <option value="EMBALADO">Embalado</option>
                  <option value="FATURADO_PARCIAL">Faturado Parcial</option>
                  <option value="FATURADO">Faturado</option>
                </select>
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Observações / Notas
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                  placeholder="Ex: Entregar pela manhã, embalar reforçado..."
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2 border-t border-slate-100 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-rose-700 font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                ⚡ Pedido Urgente (Prioridade Alta)
              </label>

              <label className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isProgramacao}
                  onChange={(e) => setIsProgramacao(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                📅 Programação Futura
              </label>
            </div>
          </div>

          {/* SECTION 2: Condições de Pagamento e Faturamento */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard size={16} className="text-indigo-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                2. Condições de Faturamento & Pagamento
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Tipo de Nota Fiscal */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Tipo de Nota Fiscal
                </label>
                <select
                  value={fiscalType}
                  onChange={(e) => setFiscalType(e.target.value as any)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                >
                  <option value="COM_NF">Com Nota Fiscal (100% NF)</option>
                  <option value="SEM_NF">Sem Nota Fiscal</option>
                  <option value="MEIA_NOTA">Meia Nota Fiscal</option>
                </select>
              </div>

              {/* Forma de Pagamento */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                >
                  <option value="boleto">Boleto Bancário</option>
                  <option value="pix">PIX</option>
                  <option value="deposito">Depósito / Transferência Bancária</option>
                  <option value="carteira">Carteira</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cheque">Cheque</option>
                  <option value="a_prazo">A Prazo</option>
                  <option value="outro">Outro (Digitar abaixo / Misto)</option>
                </select>
              </div>

              {/* Prazos de Pagamento */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Prazos para Pagamento
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                  placeholder="Ex: 30/60/90 dias ou À Vista"
                />
              </div>

              {/* Outra Forma de Pagamento */}
              {paymentType === "outro" && (
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                  <label className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                    Especifique a Forma de Pagamento
                  </label>
                  <input
                    type="text"
                    value={customPaymentCondition}
                    onChange={(e) => setCustomPaymentCondition(e.target.value)}
                    className="border border-amber-300 rounded-lg p-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ex: 50% PIX e 50% Boleto em 30 dias"
                  />
                </div>
              )}

              {/* Regra de Faturamento */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Regra de Faturamento
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingRule("cadastro")}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      billingRule === "cadastro"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Seguir Cadastro
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingRule("ultimo_pedido")}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      billingRule === "ultimo_pedido"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Repetir Último
                  </button>
                </div>
              </div>

              {/* % Desconto */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Desconto Padrão (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
                  placeholder="Ex: 5%"
                />
              </div>

              {/* RET */}
              <div className="flex items-center gap-2 pt-4">
                <label className="flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasRET}
                    onChange={(e) => setHasRET(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Possui RET / Regime Especial
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 3: Itens do Pedido */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  3. Produtos e Itens do Pedido ({lineItems.length})
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total de Peças:{" "}
                <strong className="text-indigo-600 font-extrabold">
                  {lineItems.reduce((sum, li) => sum + (Number(li.totalQuantity) || 0), 0)}
                </strong>
              </span>
            </div>

            {/* List of current line items in the order */}
            <div className="flex flex-col gap-2">
              {lineItems.map((li, idx) => {
                const item = db.items.find((i: any) => i.id === li.itemId);
                const isEditingThis = cartIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl border transition ${
                      isEditingThis
                        ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400"
                        : "bg-slate-50 border-slate-200 hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item?.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0 cursor-pointer hover:opacity-80"
                          onClick={() => setFullSizeImage(item.imageUrl || null)}
                        />
                      )}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {item?.name || `Item ID: ${li.itemId}`}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                            {item?.code || `#${li.itemId}`}
                          </span>
                          {li.isUrgent && (
                            <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                              ⚡ Urgente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium mt-0.5 flex-wrap">
                          <span>
                            Cor: <strong>{li.color || "-"}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Tam: <strong>{li.size || "-"}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Var: <strong>{li.variation || "-"}</strong>
                          </span>
                          {li.unitPrice !== undefined && li.unitPrice > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                R$ {Number(li.unitPrice).toFixed(2)} / un
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 sm:mt-0 self-end sm:self-center shrink-0">
                      <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                        {li.totalQuantity} un.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEditLineItem(idx)}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition active:scale-95 cursor-pointer"
                        title="Editar item"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition active:scale-95 cursor-pointer"
                        title="Remover item do pedido"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FORM TO ADD OR EDIT ITEM */}
            <div className="bg-indigo-50/40 rounded-xl p-3.5 border border-indigo-150 flex flex-col gap-3 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                  {cartIndex !== null ? (
                    <>
                      <span>✏️</span> Editando Item #{cartIndex + 1}
                    </>
                  ) : (
                    <>
                      <span>➕</span> Adicionar Novo Item ao Pedido
                    </>
                  )}
                </span>
                {cartIndex !== null && (
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="text-[10px] text-indigo-700 hover:text-indigo-900 font-extrabold underline cursor-pointer"
                  >
                    Cancelar Edição do Item
                  </button>
                )}
              </div>

              {/* Product search input */}
              <div className="relative">
                <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                  Produto (Código ou Nome)
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItemSearchQuery(val);
                      const found = db.items.find(
                        (it: any) =>
                          `${it.code} - ${it.name}`.toLowerCase() ===
                          val.trim().toLowerCase(),
                      );
                      if (found) {
                        setSelectedItemId(found.id);
                      } else {
                        setSelectedItemId("");
                      }
                    }}
                    placeholder="Pesquisar produto no catálogo..."
                    className="border border-slate-300 rounded-lg p-2 pl-8 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 bg-white outline-none w-full"
                  />
                </div>

                {!selectedItemId && itemSearchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 flex flex-col gap-1 border border-slate-200 rounded-lg p-1 bg-white shadow-xl max-h-56 overflow-y-auto">
                    {suggestedItems.length === 0 ? (
                      <span className="text-xs text-slate-400 p-2">Nenhum produto encontrado.</span>
                    ) : (
                      suggestedItems.map((it: any) => (
                        <button
                          type="button"
                          key={it.id}
                          onClick={() => {
                            setItemSearchQuery(`${it.code} - ${it.name}`);
                            setSelectedItemId(it.id);
                          }}
                          className="text-left text-xs p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition flex items-center justify-between border border-transparent hover:border-indigo-700 font-medium text-slate-700"
                        >
                          <div className="flex items-center gap-2">
                            {it.imageUrl && (
                              <img
                                src={it.imageUrl}
                                alt={it.name}
                                className="w-6 h-6 object-cover rounded shadow-xs"
                              />
                            )}
                            <span>{it.name}</span>
                          </div>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {it.code}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected product banner & Stock */}
              {selectedItemObj && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-2">
                    {selectedItemObj.imageUrl && (
                      <img
                        src={selectedItemObj.imageUrl}
                        alt={selectedItemObj.name}
                        className="w-8 h-8 object-cover rounded border border-emerald-200 cursor-pointer"
                        onClick={() => setFullSizeImage(selectedItemObj.imageUrl || null)}
                      />
                    )}
                    <div>
                      <span className="font-bold text-emerald-900 block">
                        {selectedItemObj.name} ({selectedItemObj.code})
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Estoque Acabado Disponível: <strong>{availableStock} un.</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemId("");
                      setItemSearchQuery("");
                    }}
                    className="text-[10px] text-emerald-800 font-black hover:underline"
                  >
                    Trocar
                  </button>
                </div>
              )}

              {/* Color, Size, Variation, Quantity, Unit Price */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* Color */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-600 uppercase">Cor</label>
                  <select
                    value={itemColor}
                    onChange={(e) => setItemColor(e.target.value)}
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">- Selecione -</option>
                    <option value="-">-</option>
                    {((db?.attributes || []).filter((a: any) => a.type === "COLOR" && a.value).length > 0
                      ? Array.from(
                          new Set(
                            (db?.attributes || [])
                              .filter((a: any) => a.type === "COLOR" && a.value)
                              .map((a: any) => a.value.trim().toUpperCase()),
                          ),
                        )
                      : Object.values(COLOR_MAP)
                    ).map((cName) => (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-600 uppercase">Tamanho</label>
                  <input
                    type="text"
                    value={itemSize}
                    onChange={(e) => setItemSize(e.target.value)}
                    placeholder="Ex: G, 150x80"
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-medium text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Variation */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-600 uppercase">Variação</label>
                  <input
                    type="text"
                    value={itemVariation}
                    onChange={(e) => setItemVariation(e.target.value)}
                    placeholder="Ex: Dir, Esq"
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-medium text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Quantity */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-600 uppercase">Qtd Total</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    placeholder="Qtd"
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Unit Price */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold text-slate-600 uppercase">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemUnitPrice}
                    onChange={(e) => setItemUnitPrice(e.target.value)}
                    placeholder="R$ Unit."
                    className="border border-slate-300 rounded-lg p-1.5 text-xs font-semibold text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Add item button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddOrUpdateItem}
                  disabled={!selectedItemId || !itemQuantity || Number(itemQuantity) <= 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {cartIndex !== null ? (
                    <>
                      <Check size={15} /> Atualizar Item #{cartIndex + 1}
                    </>
                  ) : (
                    <>
                      <Plus size={15} /> Adicionar Item ao Pedido
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || lineItems.length === 0}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Salvando Alterações...</span>
            ) : (
              <>
                <Check size={16} /> Salvar Alterações do Pedido
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full size image preview modal */}
      {fullSizeImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
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
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
