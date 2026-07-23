import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import { Order, Carga } from "./types";
import {
  Package,
  Truck,
  Calendar,
  Search,
  Filter,
  FileText,
  Printer,
  X,
  Trash2,
  Edit,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Building2,
  ListFilter,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { normalizeString } from "./searchUtils";

export function LogisticaScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: any;
}) {
  const [activeTab, setActiveTab] = useState<"formacao" | "historico">("formacao");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState("TODOS");
  const [selectedProductFilter, setSelectedProductFilter] = useState("TODOS");
  const [filterDeliveryStart, setFilterDeliveryStart] = useState("");
  const [filterDeliveryEnd, setFilterDeliveryEnd] = useState("");
  const [readinessFilter, setReadinessFilter] = useState<"TODOS" | "PRONTO" | "ESTOQUE" | "EM_PRODUCAO">("TODOS");

  // View Mode: 'CLIENTE' | 'PRODUTO' | 'GERAL'
  const [viewMode, setViewMode] = useState<"CLIENTE" | "PRODUTO" | "GERAL">("PRODUTO");

  // Load Assembly state
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});
  
  // Load Creation Modal/Form state
  const [isCargaModalOpen, setIsCargaModalOpen] = useState(false);
  const [cargaName, setCargaName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [departureDate, setDepartureDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [cargaNotes, setCargaNotes] = useState("");

  // Viewing/Editing Saved Cargas
  const [viewingCarga, setViewingCarga] = useState<Carga | null>(null);
  const [editingCarga, setEditingCarga] = useState<Carga | null>(null);

  // Accordion state for grouped views
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Map items by ID for quick lookup
  const itemsMap = useMemo(() => {
    const map = new Map<number, string>();
    db.items.forEach((it) => {
      map.set(it.id, it.name);
    });
    return map;
  }, [db.items]);

  // Map available stock entries (Acabado) by item & variation
  const stockAcabadoMap = useMemo(() => {
    const map = new Map<string, number>();
    (db.stocks || []).forEach((st) => {
      if (st.stage === "ACABADO") {
        const key = `${st.itemId}|${(st.color || "").trim().toUpperCase()}|${(st.size || "").trim().toUpperCase()}|${(st.variation || "").trim().toUpperCase()}`;
        map.set(key, (map.get(key) || 0) + st.quantity);
      }
    });
    return map;
  }, [db.stocks]);

  // Helper to get available finished stock for an order
  const getStockQtyForOrder = (order: Order) => {
    const key = `${order.itemId}|${(order.color || "").trim().toUpperCase()}|${(order.size || "").trim().toUpperCase()}|${(order.variation || "").trim().toUpperCase()}`;
    return stockAcabadoMap.get(key) || 0;
  };

  // Filter pending orders (not invoiced completely and active)
  const pendingOrders = useMemo(() => {
    return (db.orders || []).filter((o) => {
      if (!o.isActive) return false;
      if (o.status === "FATURADO") return false;
      const pendingQty = o.totalQuantity - (o.invoicedQuantity || 0);
      return pendingQty > 0;
    });
  }, [db.orders]);

  // Unique list of customers with pending orders
  const pendingCustomersList = useMemo(() => {
    const set = new Set<string>();
    pendingOrders.forEach((o) => {
      if (o.customerName) set.add(o.customerName);
    });
    return Array.from(set).sort();
  }, [pendingOrders]);

  // Unique list of products with pending orders
  const pendingProductsList = useMemo(() => {
    const map = new Map<number, string>();
    pendingOrders.forEach((o) => {
      const name = o.customProductName || itemsMap.get(o.itemId) || `Item #${o.itemId}`;
      map.set(o.itemId, name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pendingOrders, itemsMap]);

  // Filtered pending orders based on search & filter controls
  const filteredOrders = useMemo(() => {
    return pendingOrders.filter((o) => {
      const itemName = o.customProductName || itemsMap.get(o.itemId) || `Item #${o.itemId}`;
      const searchNorm = normalizeString(searchTerm);

      // Search term
      if (searchTerm.trim() !== "") {
        const matchCustomer = normalizeString(o.customerName).includes(searchNorm);
        const matchCode = normalizeString(o.orderCode || `#PED-${o.id}`).includes(searchNorm);
        const matchProduct = normalizeString(itemName).includes(searchNorm);
        const matchVariation = normalizeString(`${o.color} ${o.size} ${o.variation}`).includes(searchNorm);

        if (!matchCustomer && !matchCode && !matchProduct && !matchVariation) {
          return false;
        }
      }

      // Customer filter
      if (selectedCustomerFilter !== "TODOS" && o.customerName !== selectedCustomerFilter) {
        return false;
      }

      // Product filter
      if (selectedProductFilter !== "TODOS" && o.itemId.toString() !== selectedProductFilter) {
        return false;
      }

      // Delivery date filter
      if (filterDeliveryStart || filterDeliveryEnd) {
        const delivDate = o.deliveryDate ? o.deliveryDate.substring(0, 10) : "";
        if (filterDeliveryStart && delivDate < filterDeliveryStart) return false;
        if (filterDeliveryEnd && delivDate > filterDeliveryEnd) return false;
      }

      // Readiness filter
      if (readinessFilter !== "TODOS") {
        const isPacked = o.packedQuantity >= o.totalQuantity;
        const stockQty = getStockQtyForOrder(o);
        const hasStock = stockQty >= (o.totalQuantity - (o.invoicedQuantity || 0));

        if (readinessFilter === "PRONTO" && !isPacked) return false;
        if (readinessFilter === "ESTOQUE" && !hasStock) return false;
        if (readinessFilter === "EM_PRODUCAO" && (isPacked || hasStock)) return false;
      }

      return true;
    });
  }, [
    pendingOrders,
    searchTerm,
    selectedCustomerFilter,
    selectedProductFilter,
    filterDeliveryStart,
    filterDeliveryEnd,
    readinessFilter,
    itemsMap,
    stockAcabadoMap
  ]);

  // Grouped by Product view
  const groupedByProduct = useMemo(() => {
    const groups: { [key: string]: { itemId: number; itemName: string; orders: Order[]; totalPending: number } } = {};

    filteredOrders.forEach((o) => {
      const itemName = o.customProductName || itemsMap.get(o.itemId) || `Item #${o.itemId}`;
      const key = `${o.itemId}_${itemName}`;

      if (!groups[key]) {
        groups[key] = {
          itemId: o.itemId,
          itemName,
          orders: [],
          totalPending: 0
        };
      }
      groups[key].orders.push(o);
      groups[key].totalPending += Math.max(0, o.totalQuantity - (o.invoicedQuantity || 0));
    });

    return Object.values(groups).sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [filteredOrders, itemsMap]);

  // Grouped by Customer view
  const groupedByCustomer = useMemo(() => {
    const groups: { [key: string]: { customerName: string; orders: Order[]; totalPending: number } } = {};

    filteredOrders.forEach((o) => {
      const key = o.customerName || "Cliente Indefinido";
      if (!groups[key]) {
        groups[key] = {
          customerName: key,
          orders: [],
          totalPending: 0
        };
      }
      groups[key].orders.push(o);
      groups[key].totalPending += Math.max(0, o.totalQuantity - (o.invoicedQuantity || 0));
    });

    return Object.values(groups).sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [filteredOrders]);

  // Checkbox Selection logic
  const handleToggleSelectOrder = (orderId: number, defaultQty: number) => {
    setSelectedOrderIds((prev) => {
      if (prev.includes(orderId)) {
        setOrderQuantities((q) => {
          const newQ = { ...q };
          delete newQ[orderId];
          return newQ;
        });
        return prev.filter((id) => id !== orderId);
      } else {
        setOrderQuantities((q) => ({
          ...q,
          [orderId]: defaultQty
        }));
        return [...prev, orderId];
      }
    });
  };

  const handleSelectAllInGroup = (ordersInGroup: Order[]) => {
    const groupOrderIds = ordersInGroup.map((o) => o.id);
    const allSelected = groupOrderIds.every((id) => selectedOrderIds.includes(id));

    if (allSelected) {
      // Unselect group
      setSelectedOrderIds((prev) => prev.filter((id) => !groupOrderIds.includes(id)));
      setOrderQuantities((q) => {
        const newQ = { ...q };
        groupOrderIds.forEach((id) => delete newQ[id]);
        return newQ;
      });
    } else {
      // Select all in group
      const newIds = [...selectedOrderIds];
      const newQuantities = { ...orderQuantities };

      ordersInGroup.forEach((o) => {
        if (!newIds.includes(o.id)) {
          newIds.push(o.id);
        }
        const pendingQty = Math.max(0, o.totalQuantity - (o.invoicedQuantity || 0));
        newQuantities[o.id] = pendingQty;
      });

      setSelectedOrderIds(newIds);
      setOrderQuantities(newQuantities);
    }
  };

  const handleQuantityChange = (orderId: number, qty: number, maxQty: number) => {
    const val = Math.max(1, Math.min(qty, maxQty));
    setOrderQuantities((prev) => ({
      ...prev,
      [orderId]: val
    }));
  };

  // Selected orders metrics
  const selectedOrdersData = useMemo(() => {
    const orders = (db.orders || []).filter((o) => selectedOrderIds.includes(o.id));
    let totalPieces = 0;
    const uniqueCustomers = new Set<string>();

    orders.forEach((o) => {
      const qty = orderQuantities[o.id] || (o.totalQuantity - (o.invoicedQuantity || 0));
      totalPieces += qty;
      if (o.customerName) uniqueCustomers.add(o.customerName);
    });

    return {
      orders,
      totalPieces,
      customerCount: uniqueCustomers.size,
      orderCount: orders.length
    };
  }, [db.orders, selectedOrderIds, orderQuantities]);

  // Open Load Modal with auto-generated default name
  const handleOpenCreateCargaModal = () => {
    if (selectedOrderIds.length === 0) return;
    const nextNumber = (db.cargas || []).length + 1;
    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    setCargaName(`CARGA #${String(nextNumber).padStart(3, "0")} - ${dateStr}`);
    setDriverName("");
    setVehiclePlate("");
    setDepartureDate(new Date().toISOString().split("T")[0]);
    setCargaNotes("");
    setIsCargaModalOpen(true);
  };

  // Save new Carga
  const handleSaveCarga = async () => {
    if (!cargaName.trim()) {
      alert("Por favor, informe o nome da carga.");
      return;
    }

    try {
      const newCarga: Omit<Carga, "id"> = {
        name: cargaName.trim(),
        orderIds: selectedOrderIds,
        orderQuantities,
        status: "PLANEJADA",
        createdAt: Date.now(),
        notes: cargaNotes.trim(),
        driverName: driverName.trim() || undefined,
        vehiclePlate: vehiclePlate.trim().toUpperCase() || undefined,
        departureDate
      };

      await db.addCarga(newCarga);
      setIsCargaModalOpen(false);
      setSelectedOrderIds([]);
      setOrderQuantities({});
      setActiveTab("historico");
    } catch (e) {
      console.error("Erro ao salvar carga:", e);
      alert("Ocorreu um erro ao salvar a carga.");
    }
  };

  // Print PDF Romaneio de Carga
  const handlePrintRomaneioPDF = (carga: Carga) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ROMANEIO DE CARGA E EXPEDIÇÃO", 14, 16);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Império Jomarci • Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`, 14, 24);

    // Carga Metadata Table
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Identificação: ${carga.name}`, 14, 40);

    const depDateFormatted = carga.departureDate
      ? new Date(carga.departureDate + "T12:00:00").toLocaleDateString("pt-BR")
      : "Não definida";

    autoTable(doc, {
      startY: 44,
      head: [["STATUS", "DATA PREVISTA", "MOTORISTA", "PLACA VEÍCULO", "TOTAL PEDIDOS"]],
      body: [[
        carga.status,
        depDateFormatted,
        carga.driverName || "Não informado",
        carga.vehiclePlate || "Não informada",
        `${carga.orderIds?.length || 0} pedido(s)`
      ]],
      styles: { fontSize: 8, cellPadding: 3, halign: "center" },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold" },
      theme: "grid"
    });

    // Load Items List
    const cargaOrders = (db.orders || []).filter((o) => (carga.orderIds || []).includes(o.id));

    const tableRows: any[] = [];
    let grandTotalPieces = 0;

    cargaOrders.forEach((ord) => {
      const itemName = ord.customProductName || itemsMap.get(ord.itemId) || `Item #${ord.itemId}`;
      const qtyInCarga = carga.orderQuantities?.[ord.id] || (ord.totalQuantity - (ord.invoicedQuantity || 0));
      grandTotalPieces += qtyInCarga;

      tableRows.push([
        ord.customerName,
        ord.orderCode || `#PED-${ord.id}`,
        `${itemName} - ${ord.color || ""} ${ord.size || ""} ${ord.variation || ""}`.trim(),
        qtyInCarga,
        ord.deliveryDate ? new Date(ord.deliveryDate + "T12:00:00").toLocaleDateString("pt-BR") : "—",
        "[  ] ____/____/____"
      ]);
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["CLIENTE", "PEDIDO", "PRODUTO / ITEM", "QTD CARGA", "ENTREGA PREV.", "VISTO / RECEBIMENTO"]],
      body: tableRows,
      foot: [["TOTAL GERAL DA CARGA", "", "", `${grandTotalPieces} pçs`, "", ""]],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
      theme: "striped"
    });

    if (carga.notes) {
      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVAÇÕES DA CARGA:", 14, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(carga.notes, 14, finalY + 5);
    }

    doc.save(`Romaneio_${carga.name.replace(/\s+/g, "_")}.pdf`);
  };

  // Helper render for Status Badges of an Item
  const renderItemStatusBadges = (o: Order) => {
    const isPacked = o.packedQuantity >= o.totalQuantity;
    const isPacking = o.packedQuantity > 0 && o.packedQuantity < o.totalQuantity;

    const isPainted = (o.paintedQuantity || 0) >= o.totalQuantity;
    const isPainting = (o.paintedQuantity || 0) > 0 && (o.paintedQuantity || 0) < o.totalQuantity;

    const isCut = (o.cutQuantity || 0) >= o.totalQuantity;
    const isCutting = (o.cutQuantity || 0) > 0 && (o.cutQuantity || 0) < o.totalQuantity;

    const stockQty = getStockQtyForOrder(o);
    const pendingQty = o.totalQuantity - (o.invoicedQuantity || 0);
    const hasFullStock = stockQty >= pendingQty;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Stock Badge */}
        {stockQty > 0 ? (
          <span
            title={`Estoque acabado disponível no sistema: ${stockQty} pçs`}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
              hasFullStock
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-blue-50 text-blue-800 border-blue-300"
            }`}
          >
            <Boxes size={11} /> Estoque: {stockQty} pçs
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-50 text-slate-400 border-slate-200">
            S/ Estoque
          </span>
        )}

        {/* Embalagem Badge */}
        {isPacked ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold border bg-emerald-100 text-emerald-900 border-emerald-300 flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-700" /> Embalado ({o.packedQuantity}/{o.totalQuantity})
          </span>
        ) : isPacking ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold border bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1">
            <Clock size={11} className="text-amber-700" /> Embalando ({o.packedQuantity}/{o.totalQuantity})
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-100 text-slate-500 border-slate-200">
            Pendente Emb.
          </span>
        )}

        {/* Pintura Badge if applicable */}
        {isPainted ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-50 text-purple-800 border-purple-300">
            Pintado
          </span>
        ) : isPainting ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200">
            Pintando ({o.paintedQuantity}/{o.totalQuantity})
          </span>
        ) : null}

        {/* Laser / Corte Badge if applicable */}
        {(o.isThirdPartyLaser || (o.cutQuantity && o.cutQuantity > 0)) && (
          isCut ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-cyan-50 text-cyan-800 border-cyan-300">
              Cortado Laser
            </span>
          ) : isCutting ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-cyan-50 text-cyan-700 border-cyan-200">
              Em Corte ({o.cutQuantity}/{o.totalQuantity})
            </span>
          ) : null
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Screen Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Formação de Carga & Expedição
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Pesquise pendências por cliente ou produto, verifique o estoque e monte cargas para despacho.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("formacao")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "formacao"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Boxes size={15} /> Formação de Carga
            {filteredOrders.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "formacao" ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-800"
              }`}>
                {filteredOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`px-4 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "historico"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={15} /> Cargas Montadas
            {(db.cargas || []).length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "historico" ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-800"
              }`}>
                {(db.cargas || []).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "formacao" ? (
        <div className="space-y-6">
          {/* Search & Filter Controls Bar */}
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {/* Top row: Search input + View mode toggles */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por Cliente, Código do Pedido ou Produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View Mode Toggle Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("PRODUTO")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "PRODUTO"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Package size={13} /> Por Produto
                </button>
                <button
                  onClick={() => setViewMode("CLIENTE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "CLIENTE"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 size={13} /> Por Cliente
                </button>
                <button
                  onClick={() => setViewMode("GERAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "GERAL"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ListFilter size={13} /> Lista Geral
                </button>
              </div>
            </div>

            {/* Bottom Row: Detailed Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100 text-xs">
              {/* Filter by Customer */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Filtrar por Cliente
                </label>
                <select
                  value={selectedCustomerFilter}
                  onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
                >
                  <option value="TODOS">Todos os Clientes ({pendingCustomersList.length})</option>
                  {pendingCustomersList.map((cust) => (
                    <option key={cust} value={cust}>
                      {cust}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Product */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Filtrar por Produto
                </label>
                <select
                  value={selectedProductFilter}
                  onChange={(e) => setSelectedProductFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
                >
                  <option value="TODOS">Todos os Produtos ({pendingProductsList.length})</option>
                  {pendingProductsList.map(([id, name]) => (
                    <option key={id} value={id.toString()}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Delivery Date range */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Previsão de Entrega (De / Até)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filterDeliveryStart}
                    onChange={(e) => setFilterDeliveryStart(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="date"
                    value={filterDeliveryEnd}
                    onChange={(e) => setFilterDeliveryEnd(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Readiness Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Status de Prontidão
                </label>
                <select
                  value={readinessFilter}
                  onChange={(e) => setReadinessFilter(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white"
                >
                  <option value="TODOS">Todos os Itens</option>
                  <option value="PRONTO">Somente 100% Embalados</option>
                  <option value="ESTOQUE">Com Estoque Acabado Disponível</option>
                  <option value="EM_PRODUCAO">Em Produção / Pendente</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Indicator if active */}
            {(searchTerm || selectedCustomerFilter !== "TODOS" || selectedProductFilter !== "TODOS" || filterDeliveryStart || filterDeliveryEnd || readinessFilter !== "TODOS") && (
              <div className="flex items-center justify-between bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-xs">
                <span className="font-semibold text-amber-900">
                  Filtros ativos: exibindo {filteredOrders.length} de {pendingOrders.length} pendências.
                </span>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCustomerFilter("TODOS");
                    setSelectedProductFilter("TODOS");
                    setFilterDeliveryStart("");
                    setFilterDeliveryEnd("");
                    setReadinessFilter("TODOS");
                  }}
                  className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>

          {/* Active Carga Selection Bar (Floating Drawer when items are selected) */}
          {selectedOrderIds.length > 0 && (
            <div className="sticky top-4 z-30 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 text-slate-900 font-extrabold rounded-xl">
                  {selectedOrdersData.orderCount}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {selectedOrdersData.orderCount} item(ns) selecionado(s) para montar Carga
                  </h3>
                  <p className="text-xs text-slate-300">
                    Total de <strong className="text-emerald-400">{selectedOrdersData.totalPieces} peças</strong> de{" "}
                    <strong className="text-emerald-400">{selectedOrdersData.customerCount} cliente(s)</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setSelectedOrderIds([]);
                    setOrderQuantities({});
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Limpar Seleção
                </button>
                <button
                  onClick={handleOpenCreateCargaModal}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-none"
                >
                  <Truck size={16} /> Montar e Salvar Carga
                </button>
              </div>
            </div>
          )}

          {/* MAIN CONTENT AREA BY VIEW MODE */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Package size={40} className="mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">Nenhuma pendência encontrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há pedidos ou itens pendentes de entrega com os filtros selecionados no momento.
              </p>
            </div>
          ) : viewMode === "PRODUTO" ? (
            /* VIEW MODE: GROUPED BY PRODUCT */
            <div className="space-y-4">
              {groupedByProduct.map((group) => {
                const isExpanded = expandedGroups[`prod_${group.itemId}`] !== false; // Default open
                const allSelected = group.orders.every((o) => selectedOrderIds.includes(o.id));

                return (
                  <div key={group.itemId} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Group Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleGroupExpand(`prod_${group.itemId}`)}
                          className="p-1 hover:bg-slate-200 rounded-lg transition cursor-pointer text-slate-600"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                            <Package size={16} className="text-indigo-600" /> {group.itemName}
                          </h3>
                          <span className="text-xs font-semibold text-slate-500">
                            {group.orders.length} pedido(s) pendente(s) • Total:{" "}
                            <strong className="text-slate-800">{group.totalPending} peças</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectAllInGroup(group.orders)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 border ${
                            allSelected
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                          {allSelected ? "Desmarcar Todos do Produto" : "Selecionar Todos do Produto"}
                        </button>
                      </div>
                    </div>

                    {/* Group Orders List */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                          <thead>
                            <tr className="bg-slate-100/70 text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200">
                              <th className="p-3 w-10 text-center">Sel.</th>
                              <th className="p-3">Pedido</th>
                              <th className="p-3">Cliente</th>
                              <th className="p-3 text-center">Data Pedido</th>
                              <th className="p-3 text-center">Entrega Prevista</th>
                              <th className="p-3 text-center">Status Produção & Estoque</th>
                              <th className="p-3 text-right">Pendência</th>
                              <th className="p-3 text-center w-28">Qtd Carga</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.orders.map((ord) => {
                              const isSelected = selectedOrderIds.includes(ord.id);
                              const pendingQty = Math.max(0, ord.totalQuantity - (ord.invoicedQuantity || 0));
                              const currentSelectedQty = orderQuantities[ord.id] || pendingQty;

                              const isAtrasado = ord.deliveryDate && new Date(ord.deliveryDate) < new Date();

                              return (
                                <tr
                                  key={ord.id}
                                  className={`transition ${
                                    isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelectOrder(ord.id, pendingQty)}
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-bold text-slate-800">
                                    {ord.orderCode || `#PED-${ord.id}`}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-800">
                                    {ord.customerName}
                                  </td>
                                  <td className="p-3 text-center text-slate-500">
                                    {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString("pt-BR") : "—"}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                        isAtrasado
                                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                                          : "text-slate-700 bg-slate-100"
                                      }`}
                                    >
                                      {ord.deliveryDate ? new Date(ord.deliveryDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {renderItemStatusBadges(ord)}
                                  </td>
                                  <td className="p-3 text-right font-black text-slate-900">
                                    {pendingQty} pçs
                                  </td>
                                  <td className="p-3 text-center">
                                    {isSelected ? (
                                      <input
                                        type="number"
                                        min="1"
                                        max={pendingQty}
                                        value={currentSelectedQty}
                                        onChange={(e) => handleQuantityChange(ord.id, Number(e.target.value), pendingQty)}
                                        className="w-20 p-1 border border-emerald-400 rounded-lg text-xs font-bold text-center text-emerald-950 bg-white"
                                      />
                                    ) : (
                                      <span className="text-slate-400 font-semibold">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : viewMode === "CLIENTE" ? (
            /* VIEW MODE: GROUPED BY CUSTOMER */
            <div className="space-y-4">
              {groupedByCustomer.map((group) => {
                const isExpanded = expandedGroups[`cust_${group.customerName}`] !== false; // Default open
                const allSelected = group.orders.every((o) => selectedOrderIds.includes(o.id));

                return (
                  <div key={group.customerName} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Group Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleGroupExpand(`cust_${group.customerName}`)}
                          className="p-1 hover:bg-slate-200 rounded-lg transition cursor-pointer text-slate-600"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                            <Building2 size={16} className="text-blue-600" /> {group.customerName}
                          </h3>
                          <span className="text-xs font-semibold text-slate-500">
                            {group.orders.length} item(ns) pendente(s) • Total:{" "}
                            <strong className="text-slate-800">{group.totalPending} peças</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectAllInGroup(group.orders)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 border ${
                            allSelected
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                          {allSelected ? "Desmarcar Todos do Cliente" : "Selecionar Todos do Cliente"}
                        </button>
                      </div>
                    </div>

                    {/* Group Orders List */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                          <thead>
                            <tr className="bg-slate-100/70 text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200">
                              <th className="p-3 w-10 text-center">Sel.</th>
                              <th className="p-3">Pedido</th>
                              <th className="p-3">Produto / Item</th>
                              <th className="p-3 text-center">Data Pedido</th>
                              <th className="p-3 text-center">Entrega Prevista</th>
                              <th className="p-3 text-center">Status Produção & Estoque</th>
                              <th className="p-3 text-right">Pendência</th>
                              <th className="p-3 text-center w-28">Qtd Carga</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.orders.map((ord) => {
                              const isSelected = selectedOrderIds.includes(ord.id);
                              const pendingQty = Math.max(0, ord.totalQuantity - (ord.invoicedQuantity || 0));
                              const currentSelectedQty = orderQuantities[ord.id] || pendingQty;
                              const itemName = ord.customProductName || itemsMap.get(ord.itemId) || `Item #${ord.itemId}`;
                              const isAtrasado = ord.deliveryDate && new Date(ord.deliveryDate) < new Date();

                              return (
                                <tr
                                  key={ord.id}
                                  className={`transition ${
                                    isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelectOrder(ord.id, pendingQty)}
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-bold text-slate-800">
                                    {ord.orderCode || `#PED-${ord.id}`}
                                  </td>
                                  <td className="p-3 font-bold text-slate-900">
                                    {itemName}
                                    <span className="block text-[10px] font-normal text-slate-500">
                                      {ord.color} {ord.size} {ord.variation}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-slate-500">
                                    {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString("pt-BR") : "—"}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                        isAtrasado
                                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                                          : "text-slate-700 bg-slate-100"
                                      }`}
                                    >
                                      {ord.deliveryDate ? new Date(ord.deliveryDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {renderItemStatusBadges(ord)}
                                  </td>
                                  <td className="p-3 text-right font-black text-slate-900">
                                    {pendingQty} pçs
                                  </td>
                                  <td className="p-3 text-center">
                                    {isSelected ? (
                                      <input
                                        type="number"
                                        min="1"
                                        max={pendingQty}
                                        value={currentSelectedQty}
                                        onChange={(e) => handleQuantityChange(ord.id, Number(e.target.value), pendingQty)}
                                        className="w-20 p-1 border border-emerald-400 rounded-lg text-xs font-bold text-center text-emerald-950 bg-white"
                                      />
                                    ) : (
                                      <span className="text-slate-400 font-semibold">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW MODE: FULL GENERAL LIST */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.includes(o.id))}
                          onChange={() => handleSelectAllInGroup(filteredOrders)}
                          className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">Pedido</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Produto / Item</th>
                      <th className="p-3 text-center">Data Pedido</th>
                      <th className="p-3 text-center">Entrega Prevista</th>
                      <th className="p-3 text-center">Status Produção & Estoque</th>
                      <th className="p-3 text-right">Pendência</th>
                      <th className="p-3 text-center w-28">Qtd Carga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => {
                      const isSelected = selectedOrderIds.includes(ord.id);
                      const pendingQty = Math.max(0, ord.totalQuantity - (ord.invoicedQuantity || 0));
                      const currentSelectedQty = orderQuantities[ord.id] || pendingQty;
                      const itemName = ord.customProductName || itemsMap.get(ord.itemId) || `Item #${ord.itemId}`;
                      const isAtrasado = ord.deliveryDate && new Date(ord.deliveryDate) < new Date();

                      return (
                        <tr
                          key={ord.id}
                          className={`transition ${
                            isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOrder(ord.id, pendingQty)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {ord.orderCode || `#PED-${ord.id}`}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {ord.customerName}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {itemName}
                            <span className="block text-[10px] font-normal text-slate-500">
                              {ord.color} {ord.size} {ord.variation}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-500">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                isAtrasado
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "text-slate-700 bg-slate-100"
                              }`}
                            >
                              {ord.deliveryDate ? new Date(ord.deliveryDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {renderItemStatusBadges(ord)}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {pendingQty} pçs
                          </td>
                          <td className="p-3 text-center">
                            {isSelected ? (
                              <input
                                type="number"
                                min="1"
                                max={pendingQty}
                                value={currentSelectedQty}
                                onChange={(e) => handleQuantityChange(ord.id, Number(e.target.value), pendingQty)}
                                className="w-20 p-1 border border-emerald-400 rounded-lg text-xs font-bold text-center text-emerald-950 bg-white"
                              />
                            ) : (
                              <span className="text-slate-400 font-semibold">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* HISTÓRICO DE CARGAS MONTADAS */
        <div className="space-y-4">
          {(db.cargas || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Truck size={40} className="mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">Nenhuma carga montada no histórico</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Acesse a aba "Formação de Carga", selecione as pendências desejadas e crie uma nova carga de entrega.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(db.cargas || [])
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((carga) => {
                  const cargaOrders = (db.orders || []).filter((o) => (carga.orderIds || []).includes(o.id));
                  let totalItemsCount = cargaOrders.length;
                  let totalPiecesCount = 0;

                  cargaOrders.forEach((o) => {
                    totalPiecesCount += carga.orderQuantities?.[o.id] || (o.totalQuantity - (o.invoicedQuantity || 0));
                  });

                  return (
                    <div
                      key={carga.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              {new Date(carga.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                            <h3 className="font-extrabold text-slate-900 text-sm">{carga.name}</h3>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                              carga.status === "ENTREGUE"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : carga.status === "EM_TRANSITO"
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : carga.status === "FATURADA"
                                ? "bg-purple-100 text-purple-800 border-purple-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                            }`}
                          >
                            {carga.status}
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-semibold flex items-center gap-1">
                              <User size={13} className="text-slate-400" /> Motorista:
                            </span>
                            <span className="font-bold text-slate-800">{carga.driverName || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-semibold flex items-center gap-1">
                              <Truck size={13} className="text-slate-400" /> Veículo/Placa:
                            </span>
                            <span className="font-bold text-slate-800">{carga.vehiclePlate || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-semibold flex items-center gap-1">
                              <Calendar size={13} className="text-slate-400" /> Previsão Saída:
                            </span>
                            <span className="font-bold text-slate-800">
                              {carga.departureDate ? new Date(carga.departureDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-500 font-semibold">{totalItemsCount} pedido(s)</span>
                          <span className="font-black text-slate-900 text-sm">{totalPiecesCount} peças totais</span>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setViewingCarga(carga)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                          title="Visualizar Carga"
                        >
                          <Eye size={14} /> Ver
                        </button>

                        <button
                          onClick={() => handlePrintRomaneioPDF(carga)}
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold border border-emerald-200"
                          title="Imprimir Romaneio PDF"
                        >
                          <Printer size={14} /> Romaneio PDF
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm(`Deseja realmente excluir a carga "${carga.name}"?`)) {
                              await db.deleteCarga(carga.id);
                            }
                          }}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition cursor-pointer"
                          title="Excluir Carga"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* CREATE CARGA MODAL */}
      {isCargaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Truck size={20} />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">Montar Nova Carga de Expedição</h2>
                  <span className="text-xs text-slate-400">{selectedOrdersData.orderCount} pedido(s) selecionado(s)</span>
                </div>
              </div>
              <button
                onClick={() => setIsCargaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase block mb-1">
                  Identificação / Nome da Carga *
                </label>
                <input
                  type="text"
                  value={cargaName}
                  onChange={(e) => setCargaName(e.target.value)}
                  placeholder="Ex: CARGA #001 - REGIONAL REGIONAL SUL"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Nome do Motorista
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Nome do motorista responsável"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="Ex: ABC-1234"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Data Previsão de Saída / Despacho
                </label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Observações de Transporte
                </label>
                <textarea
                  rows={2}
                  value={cargaNotes}
                  onChange={(e) => setCargaNotes(e.target.value)}
                  placeholder="Instruções para o motorista, rota ou entrega..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                />
              </div>

              {/* Summary box */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1 text-xs">
                <span className="font-black text-emerald-900 block">Resumo do Carregamento:</span>
                <p className="text-emerald-800 font-medium">
                  • Total: <strong>{selectedOrdersData.totalPieces} peças</strong> distribuídas em{" "}
                  <strong>{selectedOrdersData.customerCount} cliente(s)</strong> diferentes.
                </p>
              </div>
            </div>

            <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCargaModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCarga}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Truck size={15} /> Finalizar Carga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CARGA DETAILS MODAL */}
      {viewingCarga && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Truck size={20} />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">{viewingCarga.name}</h2>
                  <span className="text-xs text-slate-400">
                    Criado em {new Date(viewingCarga.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingCarga(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <select
                    value={viewingCarga.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value as any;
                      await db.updateCarga({ ...viewingCarga, status: newStatus });
                      setViewingCarga({ ...viewingCarga, status: newStatus });
                    }}
                    className="font-bold text-xs bg-white border border-slate-300 rounded p-1 text-slate-800 cursor-pointer"
                  >
                    <option value="PLANEJADA">PLANEJADA</option>
                    <option value="EM_TRANSITO">EM TRÂNSITO</option>
                    <option value="ENTREGUE">ENTREGUE</option>
                    <option value="FATURADA">FATURADA</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Motorista</span>
                  <span className="font-bold text-slate-800">{viewingCarga.driverName || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Placa</span>
                  <span className="font-bold text-slate-800">{viewingCarga.vehiclePlate || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Previsão Saída</span>
                  <span className="font-bold text-slate-800">
                    {viewingCarga.departureDate
                      ? new Date(viewingCarga.departureDate + "T12:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-extrabold text-xs uppercase text-slate-700 mb-2">
                  Itens da Carga ({viewingCarga.orderIds?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-extrabold text-[10px] uppercase text-slate-600 border-b border-slate-200">
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Pedido</th>
                        <th className="p-2.5">Produto</th>
                        <th className="p-2.5 text-right">Qtd Carregada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(db.orders || [])
                        .filter((o) => (viewingCarga.orderIds || []).includes(o.id))
                        .map((o) => {
                          const itemName = o.customProductName || itemsMap.get(o.itemId) || `Item #${o.itemId}`;
                          const qty = viewingCarga.orderQuantities?.[o.id] || (o.totalQuantity - (o.invoicedQuantity || 0));

                          return (
                            <tr key={o.id}>
                              <td className="p-2.5 font-bold text-slate-800">{o.customerName}</td>
                              <td className="p-2.5 text-slate-600">{o.orderCode || `#PED-${o.id}`}</td>
                              <td className="p-2.5 font-semibold text-slate-900">{itemName}</td>
                              <td className="p-2.5 text-right font-black text-slate-900">{qty} pçs</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingCarga.notes && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                  <strong>Observações:</strong> {viewingCarga.notes}
                </div>
              )}
            </div>

            <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setViewingCarga(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => handlePrintRomaneioPDF(viewingCarga)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer size={15} /> Imprimir Romaneio PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
