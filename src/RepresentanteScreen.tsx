import React, { useState } from "react";
import { CheckCircle } from "lucide-react";
import { User, COLOR_MAP } from "./types";
import { useDatabase } from "./useDatabase";
import { normalizeString } from "./searchUtils";
import { StatusScreen } from "./StatusScreen";

export function RepresentanteScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [activeTab, setActiveTab] = useState<"STATUS" | "NOVO_PEDIDO">(
    "STATUS",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Filters for representative orders
  const [deliveryDateStart, setDeliveryDateStart] = useState("");
  const [deliveryDateEnd, setDeliveryDateEnd] = useState("");
  const [emissionDateStart, setEmissionDateStart] = useState("");
  const [emissionDateEnd, setEmissionDateEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isFiltersMinimized, setIsFiltersMinimized] = useState(true);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // States for Novo Pedido
  const [orderCode, setOrderCode] = useState("");
  const [itemId, setItemId] = useState<number | "">("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerSelected, setCustomerSelected] = useState(false);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [variation, setVariation] = useState("");
  const [totalQuantity, setTotalQuantity] = useState<number | "">("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [lineItems, setLineItems] = useState<
    {
      itemId: number;
      color: string;
      size: string;
      variation: string;
      totalQuantity: number;
      unitPrice?: number;
    }[]
  >([]);

  // Item states
  const [unitPrice, setUnitPrice] = useState<number | "">("");

  // Payment method and billing rules states
  const [paymentType, setPaymentType] = useState<
    "pix" | "boleto" | "deposito" | "carteira" | "outro"
  >("boleto");
  const [customPaymentCondition, setCustomPaymentCondition] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [billingRule, setBillingRule] = useState<"cadastro" | "ultimo_pedido">(
    "cadastro",
  );

  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  const selectedItemObj = React.useMemo(() => {
    return db.items.find((i) => i.id === Number(itemId));
  }, [itemId, db.items]);

  const lastPrices = React.useMemo(() => {
    if (!customerName || !itemId) return [];
    return db.priceHistories
      .filter(
        (ph) =>
          ph.customerName === customerName && ph.itemId === Number(itemId),
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3)
      .map((ph) => ({
        price: ph.unitPrice,
        date: ph.createdAt,
        source: ph.source,
      }));
  }, [customerName, itemId, db.priceHistories]);

  // Find last order for this client to run the repetitive billing rule
  const lastOrderForClient = React.useMemo(() => {
    if (!customerName.trim()) return null;
    const matches = db.orders.filter(
      (o) => o.customerName.toLowerCase() === customerName.trim().toLowerCase(),
    );
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [customerName, db.orders]);

  // Handle client selection rule logic
  React.useEffect(() => {
    if (billingRule === "ultimo_pedido" && lastOrderForClient) {
      const cond = lastOrderForClient.paymentCondition || "";
      if (
        ["PIX", "BOLETO", "DEPÓSITO", "CARTEIRA"].includes(cond.toUpperCase())
      ) {
        const typeMap: Record<
          string,
          "pix" | "boleto" | "deposito" | "carteira"
        > = {
          PIX: "pix",
          BOLETO: "boleto",
          DEPÓSITO: "deposito",
          CARTEIRA: "carteira",
        };
        setPaymentType(typeMap[cond.toUpperCase()]);
        setCustomPaymentCondition("");
      } else {
        setPaymentType("outro");
        setCustomPaymentCondition(cond);
      }
      setPaymentTerms(lastOrderForClient.paymentTerms || "");
    } else if (billingRule === "cadastro") {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
      setPaymentTerms("");
    }
  }, [billingRule, lastOrderForClient]);

  const clientBoughtStatsMap = React.useMemo(() => {
    const stats: Record<number, number> = {};
    if (!customerName || !customerName.trim()) return stats;
    const clientOrders = db.orders.filter(
      (o) =>
        o.customerName.toLowerCase().trim() ===
        customerName.toLowerCase().trim(),
    );
    clientOrders.forEach((o) => {
      stats[o.itemId] = (stats[o.itemId] || 0) + (o.totalQuantity || 1);
    });
    return stats;
  }, [customerName, db.orders]);

  const clientMostBoughtItems = React.useMemo(() => {
    const itemIds = Object.keys(clientBoughtStatsMap).map(Number);
    if (itemIds.length === 0) return [];

    const sortedItemIds = itemIds.sort(
      (a, b) => clientBoughtStatsMap[b] - clientBoughtStatsMap[a],
    );
    return sortedItemIds
      .map((id) => db.items.find((it) => it.id === id))
      .filter((it): it is NonNullable<typeof it> => !!it);
  }, [clientBoughtStatsMap, db.items]);

  const suggestedItems = React.useMemo(() => {
    const query = itemSearchQuery.trim().toLowerCase();

    // If no text typed yet, suggest the client's most bought items first!
    if (!query) {
      if (clientMostBoughtItems.length > 0) {
        return clientMostBoughtItems.slice(0, 150);
      }
      return db.items.slice(0, 150);
    }

    // Normalizing text helper to ignore accents
    const normalize = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normalizedQuery = normalize(query);
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 0);

    // Filter items where both name and code combined contain all search query words
    const matches = db.items.filter((it) => {
      const searchableText = normalize(`${it.code || ""} ${it.name || ""}`);
      return queryWords.every((word) => searchableText.includes(word));
    });

    // Sort matches: put items in clientMostBoughtItems first
    const clientBoughtIds = new Set(clientMostBoughtItems.map((i) => i.id));
    matches.sort((a, b) => {
      const aBought = clientBoughtIds.has(a.id) ? 1 : 0;
      const bBought = clientBoughtIds.has(b.id) ? 1 : 0;
      return bBought - aBought; // 1 (true) sorted before 0 (false)
    });

    return matches.slice(0, 150);
  }, [itemSearchQuery, db.items, clientMostBoughtItems]);

  const handleAddProductToOrder = () => {
    if (!itemId || !totalQuantity) return;
    setLineItems([
      ...lineItems,
      {
        itemId: Number(itemId),
        color,
        size,
        variation,
        totalQuantity: Number(totalQuantity),
        unitPrice: unitPrice === "" ? undefined : unitPrice,
      },
    ]);
    setItemId("");
    setItemSearchQuery("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setUnitPrice("");
  };

  const [toastMessage, setToastMessage] = useState("");

  const submitOrder = async (resolvedCustomerName: string) => {
    const itemsToProcess = [...lineItems];
    if (itemId && totalQuantity) {
      itemsToProcess.push({
        itemId: Number(itemId),
        color,
        size,
        variation,
        totalQuantity: Number(totalQuantity),
        unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
      });
    }

    const finalOrderCode =
      orderCode.trim() || `REP-${Date.now().toString().slice(-6)}`;
    const finalPaymentCondition =
      paymentType === "outro"
        ? customPaymentCondition
        : paymentType.toUpperCase();

    // Validate
    const invalidItems = itemsToProcess.filter(it => !it.itemId || !it.totalQuantity || it.totalQuantity <= 0);
    if (invalidItems.length > 0) {
      alert("Existem itens inválidos na lista (sem produto ou com quantidade zerada).");
      return;
    }

    let successCount = 0;
    // Loop and add order documents with status AGUARDANDO_APROVACAO
    for (const itemInfo of itemsToProcess) {
      const numItemId = Number(itemInfo.itemId);
      const numTotalQuantity = Number(itemInfo.totalQuantity);
      const itemUnitPrice = typeof itemInfo.unitPrice === "string" ? Number(itemInfo.unitPrice) : itemInfo.unitPrice;

      // Representative orders don't affect stock or allocations until officially approved by PCP/Gerencia!
      await db.addOrder({
        orderCode: finalOrderCode,
        itemId: numItemId,
        customerName: resolvedCustomerName,
        representativeName: currentUser.name,
        color: itemInfo.color || "-",
        size: itemInfo.size || "-",
        variation: itemInfo.variation || "-",
        totalQuantity: numTotalQuantity,
        packedQuantity: 0,
        producedQuantity: 0,
        paintedQuantity: 0,
        cutQuantity: 0,
        isUrgent,
        paymentCondition: finalPaymentCondition,
        paymentTerms,
        billingRule,
        unitPrice: itemUnitPrice,
        isActive: true,
        createdAt: Date.now(),
        deliveryDate,
        status: "AGUARDANDO_APROVACAO",
      });

      if (itemUnitPrice !== undefined && itemUnitPrice > 0) {
        await db.addPriceHistory({
          itemId: numItemId,
          customerName: resolvedCustomerName,
          unitPrice: itemUnitPrice,
          orderCode: finalOrderCode,
          createdAt: Date.now(),
          source: "MANUAL",
        });
      }
      successCount++;
    }

    setOrderCode("");
    setItemId("");
    setItemSearchQuery("");
    setCustomerName("");
    setCustomerSelected(false);
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setUnitPrice("");
    setIsUrgent(false);
    setPaymentType("boleto");
    setCustomPaymentCondition("");
    setPaymentTerms("");
    setBillingRule("cadastro");
    setLineItems([]);
    
    setToastMessage(`${successCount} ${successCount > 1 ? 'itens foram inseridos' : 'item foi inserido'} com sucesso!`);
    setTimeout(() => setToastMessage(""), 4000);
    
    setActiveTab("ABERTOS");
  };

  const handleCadastrarPedido = () => {
    if (!customerName || !deliveryDate) {
      alert("Por favor, preencha o Nome do Cliente e a Data de Entrega.");
      return;
    }

    const itemsToProcess = [...lineItems];
    if (itemId && totalQuantity) {
      itemsToProcess.push({
        itemId: Number(itemId),
        color,
        size,
        variation,
        totalQuantity: Number(totalQuantity),
      });
    }

    if (itemsToProcess.length === 0) {
      alert("Adicione pelo menos um item ao pedido.");
      return;
    }

    // Resolve customer
    const trimmedVal = customerName.trim();
    let resolvedCustomer: any = null;

    // 1. Try matching by selected format "ID - Name"
    const idMatch = trimmedVal.match(/^(\d+)\s*-\s*(.*)$/);
    if (idMatch) {
      const id = Number(idMatch[1]);
      resolvedCustomer = db.customers.find((c) => c.id === id);
    }

    // 2. Try match exactly by tradeName or name
    if (!resolvedCustomer) {
      resolvedCustomer = db.customers.find(
        (c) =>
          (c.name && c.name.toLowerCase() === trimmedVal.toLowerCase()) ||
          (c.tradeName && c.tradeName.toLowerCase() === trimmedVal.toLowerCase())
      );
    }

    // 3. Try match partial or contain if still not found
    if (!resolvedCustomer) {
      resolvedCustomer = db.customers.find(
        (c) =>
          (c.name && c.name.toLowerCase().includes(trimmedVal.toLowerCase())) ||
          (c.tradeName && c.tradeName.toLowerCase().includes(trimmedVal.toLowerCase()))
      );
    }

    if (!resolvedCustomer) {
      alert(
        "Por favor, selecione um cliente que esteja devidamente cadastrado no sistema (use a lista de sugestões que aparece ao digitar)."
      );
      return;
    }

    // Reference the exact name or tradeName from the database
    const finalCustomerName = resolvedCustomer.tradeName || resolvedCustomer.name;
    submitOrder(finalCustomerName);
  };

  // Filter orders where representative matches the currentUser's name
  const repOrders = db.orders.filter((o) => {
    const isDirectMatch =
      o.representativeId === currentUser.id ||
      o.representativeName === currentUser.name;
    const isDaniloCheck =
      currentUser.id === "representante_danilo" &&
      ((o.representativeName &&
        o.representativeName.toLowerCase().includes("mapefor")) ||
        (o.representativeId && o.representativeId === "mapefor"));
    return isDirectMatch || isDaniloCheck;
  });

  const filteredRepOrders = repOrders.filter((o) => {
    // 1. Text Search Filter
    const item = db.items.find((i) => i.id === o.itemId);
    const customer = db.customers.find(
      (c) => c.name === o.customerName || c.tradeName === o.customerName,
    );
    const searchTarget = normalizeString(
      `${o.orderCode} ${o.customerName} ${customer?.tradeName || ""} ${item?.name || ""}`,
    );

    if (
      debouncedSearchTerm &&
      !searchTarget.includes(normalizeString(debouncedSearchTerm))
    ) {
      return false;
    }

    // 2. Delivery Date range check ("YYYY-MM-DD")
    if (deliveryDateStart) {
      if (!o.deliveryDate || o.deliveryDate < deliveryDateStart) {
        return false;
      }
    }
    if (deliveryDateEnd) {
      if (!o.deliveryDate || o.deliveryDate > deliveryDateEnd) {
        return false;
      }
    }

    // 3. Emission Date range check (convert o.createdAt to local YYYY-MM-DD)
    if (emissionDateStart) {
      const oDate = new Date(o.createdAt);
      const oYear = oDate.getFullYear();
      const oMonth = String(oDate.getMonth() + 1).padStart(2, "0");
      const oDay = String(oDate.getDate()).padStart(2, "0");
      const oDateStr = `${oYear}-${oMonth}-${oDay}`;
      if (oDateStr < emissionDateStart) return false;
    }
    if (emissionDateEnd) {
      const oDate = new Date(o.createdAt);
      const oYear = oDate.getFullYear();
      const oMonth = String(oDate.getMonth() + 1).padStart(2, "0");
      const oDay = String(oDate.getDate()).padStart(2, "0");
      const oDateStr = `${oYear}-${oMonth}-${oDay}`;
      if (oDateStr > emissionDateEnd) return false;
    }

    // 4. Status Filter
    if (statusFilter) {
      // Default fallback is "PENDENTE" if status field is missing
      if ((o.status || "PENDENTE") !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  const abertos = filteredRepOrders.filter(
    (o) => (o.invoicedQuantity || 0) < o.totalQuantity,
  );

  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lateInvoicing = abertos.filter((o) => now - o.createdAt > tenDaysMs);

  const groupedAbertos = abertos.reduce(
    (acc, o) => {
      if (!acc[o.orderCode])
        acc[o.orderCode] = {
          customerName: o.customerName,
          deliveryDate: o.deliveryDate,
          products: [],
        };
      acc[o.orderCode].products.push(o);
      return acc;
    },
    {} as Record<
      string,
      { customerName: string; deliveryDate: string; products: typeof abertos }
    >,
  );

  const faturadosLogs = db.logs.filter(
    (l) =>
      l.type === "FATURAMENTO" &&
      filteredRepOrders.some((ro) => ro.id === l.orderId),
  );
  const groupedStatus = filteredRepOrders.reduce(
    (acc, o) => {
      if (!acc[o.orderCode])
        acc[o.orderCode] = { customerName: o.customerName, products: [] };
      acc[o.orderCode].products.push(o);
      return acc;
    },
    {} as Record<
      string,
      { customerName: string; products: typeof filteredRepOrders }
    >,
  );

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Painel do Representante
      </h2>

      {/* Sales Representative Order Query Filters Dashboard */}
      <div
        className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 shrink-0 flex flex-col transition-all duration-200"
        id="rep-filters-box-container"
      >
        <div
          className="flex justify-between items-center cursor-pointer select-none pb-0.5"
          onClick={() => setIsFiltersMinimized(!isFiltersMinimized)}
          id="rep-filters-box-toggle-header"
        >
          <span className="text-[11px] font-bold text-slate-705 uppercase tracking-wide flex items-center gap-1 font-sans">
            🔎{" "}
            {isFiltersMinimized
              ? "Pesquisa e Filtros (Minimizado - clique para abrir)"
              : "Pesquisa e Filtros do Representante"}
          </span>
          <button
            type="button"
            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold transition cursor-pointer"
            id="rep-filters-box-toggle-btn"
          >
            {isFiltersMinimized ? "Maximizar ➕" : "Minimizar ➖"}
          </button>
        </div>

        {!isFiltersMinimized && (
          <div
            className="flex flex-col gap-2 pt-2 border-t border-slate-200/70 mt-1.5"
            id="expanded-rep-filters-guts"
          >
            <div className="flex flex-col md:flex-row gap-2">
              {/* Main search text */}
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">
                  🔎 Pesquisa Geral
                </label>
                <input
                  type="text"
                  placeholder="Pesquisar por cliente, pedido ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 p-1.5 text-xs rounded focus:ring-2 focus:ring-blue-500 bg-white outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-[180px]">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">
                  🏷️ Status do Pedido
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 p-1.5 text-xs rounded focus:ring-2 focus:ring-blue-500 bg-white outline-none font-medium text-slate-700"
                >
                  <option value="">Todos os Status</option>
                  <option value="AGUARDANDO_APROVACAO">
                    Aguardando Aprovação
                  </option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="TEM_ESTOQUE">Tem Estoque</option>
                  <option value="EM_PRODUCAO">Em Produção</option>
                  <option value="PRODUZIDO">Produzido</option>
                  <option value="EM_CORTE">Em Corte</option>
                  <option value="CORTADO">Cortado</option>
                  <option value="EM_PINTURA">Em Pintura</option>
                  <option value="PINTADO">Pintado</option>
                  <option value="EMBALANDO">Embalando</option>
                  <option value="EMBALADO">Embalado</option>
                  <option value="PLANEJADO">Planejado</option>
                  <option value="FATURADO_PARCIAL">Faturado Parcial</option>
                  <option value="FATURADO">Faturado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1.5 border-t border-slate-200">
              {/* Emission Date Start */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">
                  📅 Emissão De
                </label>
                <input
                  type="date"
                  value={emissionDateStart}
                  onChange={(e) => setEmissionDateStart(e.target.value)}
                  className="w-full border border-gray-300 p-1 text-[11px] rounded focus:ring-2 focus:ring-blue-500 bg-white outline-none text-slate-700 font-medium"
                />
              </div>

              {/* Emission Date End */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">
                  📅 Emissão Até
                </label>
                <input
                  type="date"
                  value={emissionDateEnd}
                  onChange={(e) => setEmissionDateEnd(e.target.value)}
                  className="w-full border border-gray-300 p-1 text-[11px] rounded focus:ring-2 focus:ring-blue-500 bg-white outline-none text-slate-700 font-medium"
                />
              </div>

              {/* Delivery Date Start */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">
                  🚚 Entrega De
                </label>
                <input
                  type="date"
                  value={deliveryDateStart}
                  onChange={(e) => setDeliveryDateStart(e.target.value)}
                  className="w-full border border-gray-300 p-1 text-[11px] rounded focus:ring-2 focus:ring-blue-500 bg-white outline-none text-slate-700 font-medium"
                />
              </div>

              {/* Delivery Date End */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">
                  🚚 Entrega Até
                </label>
                <input
                  type="date"
                  value={deliveryDateEnd}
                  onChange={(e) => setDeliveryDateEnd(e.target.value)}
                  className="w-full border border-gray-300 p-1 text-[11px] rounded focus:ring-2 focus:ring-blue-500 bg-white outline-none text-slate-700 font-medium"
                />
              </div>
            </div>

            {(searchTerm ||
              statusFilter ||
              emissionDateStart ||
              emissionDateEnd ||
              deliveryDateStart ||
              deliveryDateEnd) && (
              <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded p-2 text-xs text-blue-800">
                <span>
                  Filtros ativos:{" "}
                  <strong>
                    {[
                      searchTerm && "Pesquisa por texto",
                      statusFilter && `Status: ${statusFilter}`,
                      (emissionDateStart || emissionDateEnd) &&
                        "Intervalo de Emissão",
                      (deliveryDateStart || deliveryDateEnd) &&
                        "Intervalo de Entrega",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </strong>
                </span>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("");
                    setEmissionDateStart("");
                    setEmissionDateEnd("");
                    setDeliveryDateStart("");
                    setDeliveryDateEnd("");
                  }}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2.5 py-1 rounded transition"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex rounded-lg overflow-hidden border border-blue-600 mb-4 shrink-0 shadow-sm flex-wrap">
        <button
          className={`flex-1 min-w-[120px] py-2 text-sm font-semibold transition ${activeTab === "STATUS" ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
          onClick={() => setActiveTab("STATUS")}
        >
          Status
        </button>
        <button
          className={`flex-1 min-w-[120px] py-2 text-sm font-semibold transition ${activeTab === "NOVO_PEDIDO" ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
          onClick={() => setActiveTab("NOVO_PEDIDO")}
        >
          + Novo Pedido
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-6">
        {activeTab === "STATUS" && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <StatusScreen db={db} currentUser={currentUser} />
          </div>
        )}

        {activeTab === "NOVO_PEDIDO" && (
          <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-2">
              Criar Novo Pedido
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="Código do Pedido (Ex: PED-123)"
                className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="relative">
                <input
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerSelected(false);
                  }}
                  placeholder="Cliente (Razão Social ou Fantasia)"
                  className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none w-full"
                />
                {!customerSelected &&
                  customerName.trim().length > 0 &&
                  (() => {
                    const query = customerName.toLowerCase();
                    const matches = db.customers
                      .filter(
                        (c) =>
                          String(c.id).includes(query) ||
                          (c.name || "").toLowerCase().includes(query) ||
                          (c.tradeName || "").toLowerCase().includes(query),
                      )
                      .slice(0, 10);

                    if (matches.length === 0) return null;

                    return (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto text-left">
                        {matches.map((c) => {
                          const hasTrade =
                            c.tradeName && c.tradeName !== c.name;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCustomerName(c.tradeName ? `${c.id} - ${c.tradeName}` : `${c.id} - ${c.name}`);
                                setCustomerSelected(true);
                              }}
                              className="w-full text-left p-2 hover:bg-blue-50 text-xs border-b last:border-0 flex flex-col gap-0.5"
                            >
                              <span className="font-semibold text-gray-800">
                                {c.id} - {c.name}
                              </span>
                              {hasTrade && (
                                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-100/50 px-1 py-0.5 rounded self-start">
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
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-3 text-left">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                Condições de Faturamento & Regras
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-700">
                    Forma de Pagamento
                  </span>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="border border-gray-300 p-2 rounded text-xs bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="boleto">Boleto Bancário</option>
                    <option value="pix">PIX</option>
                    <option value="deposito">Depósito Bancário</option>
                    <option value="carteira">Carteira</option>
                    <option value="outro">
                      Outro (Digitar abaixo/Mais de uma)
                    </option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-700">
                    Prazos para Pagamento (Opcional)
                  </span>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Ex: 30/60/90 dias ou À Vista"
                    className="border border-gray-300 p-2 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {paymentType === "outro" && (
                <div className="flex flex-col gap-1 animate-in fade-in duration-100">
                  <span className="text-xs font-semibold text-slate-700">
                    Especifique as mais de uma ou outras formas:
                  </span>
                  <input
                    type="text"
                    value={customPaymentCondition}
                    onChange={(e) => setCustomPaymentCondition(e.target.value)}
                    placeholder="Ex: 50% PIX e 50% Boleto"
                    className="border border-gray-300 p-2 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-700">
                    Regra de Faturamento
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingRule("cadastro")}
                      className={`flex-1 py-1.5 px-3 border rounded text-[10px] sm:text-xs font-bold transition ${
                        billingRule === "cadastro"
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      Seguir Cadastro
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingRule("ultimo_pedido")}
                      className={`flex-1 py-1.5 px-3 border rounded text-[10px] sm:text-xs font-bold transition ${
                        billingRule === "ultimo_pedido"
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                      title={
                        lastOrderForClient
                          ? `Último pedido: ${lastOrderForClient.paymentCondition}`
                          : "Nenhum pedido anterior localizado"
                      }
                    >
                      Repetir Último
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-700">
                    Data de Entrega
                  </span>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="border border-gray-300 p-2 rounded text-xs text-gray-655 focus:ring-2 focus:ring-blue-500 outline-none"
                    title="Data Prevista de Entrega"
                  />
                </div>
              </div>
            </div>

            <div className="relative mt-2 border-t pt-4">
              <span className="text-sm font-semibold text-gray-700 mb-1 block">
                Produto
              </span>
              <input
                type="text"
                placeholder="Pesquisar Item (Código ou Nome)..."
                className="border border-gray-300 p-2 rounded w-full bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                value={itemSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setItemSearchQuery(val);
                  const found = db.items.find(
                    (it) =>
                      `${it.code} - ${it.name}`.toLowerCase() ===
                      val.trim().toLowerCase(),
                  );
                  if (found) {
                    setItemId(found.id);
                  } else {
                    setItemId("");
                  }
                }}
              />

              {!itemId &&
                (itemSearchQuery.trim().length > 0 ||
                  (customerName.trim().length > 0 &&
                    clientMostBoughtItems.length > 0)) && (
                  <div className="absolute left-0 right-0 z-50 mt-1 flex flex-col gap-1 border border-slate-200 rounded-lg p-1 bg-white shadow-lg max-h-80 overflow-y-auto">
                    <span className="text-[10px] font-bold text-indigo-700 px-2 pt-0.5 uppercase tracking-wider block bg-indigo-50 py-1 border-b">
                      {itemSearchQuery.trim().length === 0 &&
                      clientMostBoughtItems.length > 0
                        ? "⭐ Itens mais comprados por este cliente:"
                        : "Catálogo de itens:"}
                    </span>
                    {suggestedItems.length === 0 ? (
                      <span className="text-[11px] text-gray-500 px-2 py-1">
                        Nenhum item correspondente.
                      </span>
                    ) : (
                      suggestedItems.map((it) => (
                        <button
                          type="button"
                          key={it.id}
                          onClick={() => {
                            setItemSearchQuery(`${it.code} - ${it.name}`);
                            setItemId(it.id);
                          }}
                          className="text-left text-xs px-2.5 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors bg-white border border-slate-200 font-medium text-slate-700 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {it.imageUrl && (
                              <img
                                src={it.imageUrl}
                                alt={it.name}
                                className="w-6 h-6 object-cover rounded shadow-sm border cursor-pointer hover:opacity-80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFullSizeImage(it.imageUrl || null);
                                }}
                              />
                            )}
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <span>{it.name}</span>
                              {clientBoughtStatsMap[it.id] !== undefined && (
                                <span className="text-[8px] sm:text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded-sm">
                                  ⭐ {clientBoughtStatsMap[it.id]} un.
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded shrink-0">
                            {it.code}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

              {itemId && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-250 rounded-lg p-2 mt-1 shadow-sm">
                  <div className="flex items-center gap-3">
                    {selectedItemObj?.imageUrl && (
                      <img
                        src={selectedItemObj.imageUrl}
                        alt={selectedItemObj.name}
                        className="w-12 h-12 object-cover rounded border border-emerald-200 shadow-sm cursor-pointer hover:opacity-80 transition"
                        onClick={() =>
                          setFullSizeImage(selectedItemObj.imageUrl || null)
                        }
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                        <span className="text-lg">✓</span> Item selecionado:
                      </span>
                      <span className="text-sm font-semibold text-emerald-900">
                        {selectedItemObj?.name}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700">
                        {selectedItemObj?.code}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setItemSearchQuery("");
                      setItemId("");
                    }}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-black px-2 py-0.5 bg-emerald-100 rounded hover:bg-emerald-200 transition"
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-1">
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border border-gray-300 p-2 rounded bg-white text-slate-800 font-medium w-full"
              >
                <option value="">Cor</option>
                <option value="-">-</option>
                {Object.values(COLOR_MAP).map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Tam."
                className="border border-gray-300 p-2 rounded"
              />
              <input
                value={variation}
                onChange={(e) => setVariation(e.target.value)}
                placeholder="Var."
                className="border border-gray-300 p-2 rounded"
              />
            </div>

            {itemId && (
              <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 p-3 rounded flex justify-between border border-emerald-200 mt-2">
                <span>Estoque Disponível para este item (Acabado):</span>
                <span className="bg-emerald-100 px-2 py-0.5 rounded">
                  {db.stocks.find(
                    (s) =>
                      s.id ===
                      `${itemId}|${color}|${size}|${variation}|ACABADO`,
                  )?.quantity || 0}{" "}
                  unid.
                </span>
              </div>
            )}

            <div className="flex gap-2 items-center mt-2 flex-wrap">
              <input
                type="number"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Number(e.target.value))}
                placeholder="Quantidade Total"
                className="border border-gray-300 p-2 rounded w-full md:w-1/3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="relative w-full md:w-1/3">
                <span className="absolute left-3 top-2.5 text-gray-400 font-semibold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) =>
                    setUnitPrice(
                      e.target.value ? parseFloat(e.target.value) : "",
                    )
                  }
                  placeholder="Preço Unit. (Opcional)"
                  className="border border-gray-300 p-2 pl-9 rounded w-full focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {selectedItemObj &&
                  (selectedItemObj.basePrice || lastPrices.length > 0) && (
                    <div className="absolute top-12 left-0 bg-blue-50 border border-blue-200 shadow-md p-2 rounded text-xs text-blue-800 z-10 w-[250px]">
                      {selectedItemObj.basePrice && (
                        <div>
                          <span className="font-bold">
                            Preço Médio (Tabela):
                          </span>{" "}
                          R$ {selectedItemObj.basePrice.toFixed(2)}
                        </div>
                      )}
                      {lastPrices.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          <span className="font-bold text-gray-700">
                            Últimos preços para {customerName}:
                          </span>
                          {lastPrices.map((p, idx) => (
                            <span key={idx} className="text-gray-600 ml-1">
                              - R$ {p.price.toFixed(2)} (
                              {new Date(p.date).toLocaleDateString()})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>
              <label className="flex items-center gap-2 text-sm text-red-700 font-bold ml-2">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-5 h-5"
                />
                Pedido Urgente
              </label>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              {lineItems.length > 0 && (
                <div className="bg-slate-50 p-2 border border-slate-200 rounded flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-500 uppercase">
                    Produtos neste Pedido:
                  </span>
                  {lineItems.map((li, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm border-b border-gray-100 pb-1"
                    >
                      <span>
                        {db.items.find((i) => i.id === li.itemId)?.name}{" "}
                        <span className="text-xs text-gray-500">
                          ({li.color} {li.size} {li.variation})
                        </span>{" "}
                        -{" "}
                        <span className="font-bold">
                          {li.totalQuantity} pçs
                        </span>
                      </span>
                      {li.unitPrice !== undefined && (
                        <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded text-xs ml-2 border border-blue-200">
                          R$ {li.unitPrice.toFixed(2)} / un
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddProductToOrder}
                  className="flex-1 bg-gray-200 text-gray-800 font-semibold p-3 rounded hover:bg-gray-300 transition disabled:opacity-50"
                  disabled={!itemId || !totalQuantity}
                >
                  + Adicionar Item ao Carrinho
                </button>
                <button
                  onClick={handleCadastrarPedido}
                  disabled={
                    !customerName ||
                    !deliveryDate ||
                    (!itemId && lineItems.length === 0)
                  }
                  className="flex-1 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white font-bold p-3 rounded shadow transition"
                >
                  Salvar e Enviar Pedido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>



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

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-[200]">
          <div className="bg-white/20 p-1.5 rounded-full">
            <CheckCircle size={18} />
          </div>
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
