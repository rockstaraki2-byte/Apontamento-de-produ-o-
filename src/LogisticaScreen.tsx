import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import { Order, Customer } from "./types";
import {
  Package,
  Truck,
  Calendar,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  CheckSquare,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  FileText,
  Printer,
  X,
  Trash2,
  Edit2,
  Pencil,
  ArrowUp,
  ArrowDown,
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
  const [activeTab, setActiveTab] = useState<"montagem" | "historico">(
    "montagem",
  );
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay()); // 0 = Sunday, 1 = Monday...

  const [filterCity, setFilterCity] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterDeliveryDateStart, setFilterDeliveryDateStart] = useState("");
  const [filterDeliveryDateEnd, setFilterDeliveryDateEnd] = useState("");

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [orderQuantities, setOrderQuantities] = useState<
    Record<number, number>
  >({});
  const [isCargaModalOpen, setIsCargaModalOpen] = useState(false);
  const [newCargaName, setNewCargaName] = useState("");

  const [expandedCargaId, setExpandedCargaId] = useState<string | null>(null);
  const [editingCarga, setEditingCarga] = useState<any>(null);

  // Suggestion logic based on day of week and customer city
  const cityToDayMap: Record<string, number> = {
    "visconde do rio branco": 1,
    "astolfo dutra": 1,
    guiricema: 1,
    rodeiro: 5,
    "diamante de ubá": 5,
    "são geraldo": 5,
  };

  const suggestedRoutes = useMemo(() => {
    let routes: string[] = [];
    Object.keys(cityToDayMap).forEach((city) => {
      if (cityToDayMap[city] === selectedDay) routes.push(city);
    });
    routes.push("ubá");
    return routes;
  }, [selectedDay]);

  const customerCityMap = useMemo(() => {
    const map = new Map<string, string>();
    db.customers.forEach((c) => {
      let city = "";
      if (c.address && c.address.includes(" - ")) {
        city = c.address.split(" - ")[0].trim();
      } else {
        city = c.address || "";
      }
      map.set(c.name.toLowerCase().trim(), city.toLowerCase());
    });
    return map;
  }, [db.customers]);

  const orderDates = useMemo(() => {
    const dates = new Map<
      number,
      { lastEmbalagem?: number; lastPintura?: number }
    >();
    db.logs.forEach((log) => {
      if (!log.orderId) return;
      const ex = dates.get(log.orderId) || {};
      if (
        log.type === "EMBALAGEM" ||
        log.processName?.toLowerCase().includes("embalagem")
      ) {
        if (!ex.lastEmbalagem || log.timestamp > ex.lastEmbalagem)
          ex.lastEmbalagem = log.timestamp;
      }
      if (
        log.type === "PINTURA" ||
        log.processName?.toLowerCase().includes("pintura")
      ) {
        if (!ex.lastPintura || log.timestamp > ex.lastPintura)
          ex.lastPintura = log.timestamp;
      }
      dates.set(log.orderId, ex);
    });
    return dates;
  }, [db.logs]);

  const now = new Date();

  const orderSuggestions = useMemo(() => {
    const suggestions = db.orders
      .filter((o) => o.isActive && o.status !== "FATURADO" && (o.totalQuantity - (o.invoicedQuantity || 0)) > 0)
      .map((o) => {
        const isAtrasado = new Date(o.deliveryDate) < now;
        const normalizedCity =
          customerCityMap.get(o.customerName.toLowerCase().trim()) ||
          "desconhecida";

        const cleanCity = normalizeString(normalizedCity);

        let shouldHideDueToDay = false;
        if (!filterDeliveryDateStart && !filterDeliveryDateEnd) {
          // Verify if city is mapped to a specific day explicitly
          let mappedCityKey = Object.keys(cityToDayMap).find((k) =>
            cleanCity.includes(normalizeString(k)),
          );
          if (mappedCityKey) {
            if (cityToDayMap[mappedCityKey] !== selectedDay) {
              shouldHideDueToDay = true;
            }
          }
        }

        const isSuggestedCity = (filterDeliveryDateStart || filterDeliveryDateEnd)
          ? true // If filtering by date, any city is valid for display
          : suggestedRoutes.some((r) => cleanCity.includes(normalizeString(r)));

        const readyQty = o.packedQuantity || o.invoicedQuantity || 0;
        const almostReadyQty = o.paintedQuantity || 0;
        const producingQty = o.producedQuantity || o.cutQuantity || 0;

        let score = 0;
        if (isAtrasado) score += 1000;
        if (isSuggestedCity && !(filterDeliveryDateStart || filterDeliveryDateEnd)) score += 500;
        if (readyQty > 0) score += 300;
        if (almostReadyQty > 0) score += 200;

        const dates = orderDates.get(o.id) || {};

        return {
          order: o,
          city:
            customerCityMap.get(o.customerName.toLowerCase().trim()) ||
            "desconhecida",
          isAtrasado,
          isSuggestedCity,
          shouldHideDueToDay,
          readyQty,
          almostReadyQty,
          producingQty,
          score,
          lastEmbalagem: dates.lastEmbalagem,
          lastPintura: dates.lastPintura,
        };
      })
      .filter(
        (s) =>
          !s.shouldHideDueToDay &&
          (filterDeliveryDateStart ||
            filterDeliveryDateEnd ||
            s.readyQty > 0 ||
            s.almostReadyQty > 0 ||
            s.producingQty > 0 ||
            s.isAtrasado),
      )
      .filter((s) => {
        if (
          filterCity &&
          !s.city.toLowerCase().includes(filterCity.toLowerCase())
        )
          return false;
        if (
          filterCustomer &&
          !s.order.customerName
            .toLowerCase()
            .includes(filterCustomer.toLowerCase())
        )
          return false;
        if (filterDeliveryDateStart || filterDeliveryDateEnd) {
          const orderDateStr = s.order.deliveryDate ? s.order.deliveryDate.substring(0, 10) : "";
          if (filterDeliveryDateStart && orderDateStr < filterDeliveryDateStart) return false;
          if (filterDeliveryDateEnd && orderDateStr > filterDeliveryDateEnd) return false;
        }
        return true;
      });

    return suggestions.sort((a, b) => b.score - a.score);
  }, [
    db.orders,
    customerCityMap,
    suggestedRoutes,
    now,
    selectedDay,
    filterCity,
    filterCustomer,
    orderDates,
    filterDeliveryDateStart,
    filterDeliveryDateEnd,
  ]);

  const daysOfWeek = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  const getDefaultCargaQty = React.useCallback((order: any) => {
    const faturado = order.invoicedQuantity || 0;
    const remaining = Math.max(0, (order.totalQuantity || 1) - faturado);
    const availablePacked = Math.max(0, (order.packedQuantity || 0) - faturado);
    
    if (availablePacked > 0) {
      return Math.min(remaining, availablePacked);
    }
    return remaining;
  }, []);

  const handleToggleOrderSelection = (orderId: number) => {
    setSelectedOrderIds((prev) => {
      const isSelected = prev.includes(orderId);
      if (isSelected) {
        setOrderQuantities((q) => {
          const newQ = { ...q };
          delete newQ[orderId];
          return newQ;
        });
        return prev.filter((id) => id !== orderId);
      } else {
        const order = db.orders.find((o) => o.id === orderId);
        if (order) {
          const defaultQty = getDefaultCargaQty(order);
          setOrderQuantities((q) => ({ ...q, [orderId]: defaultQty }));
        }
        return [...prev, orderId];
      }
    });
  };

  const handleSmartSuggest = () => {
    const candidates = orderSuggestions.filter((s) => {
      // Regra 1: SÓ pode sugerir cidades que estão NA ROTA (escopo do dia)
      if (!s.isSuggestedCity) return false;

      const order = s.order;
      const total = order.totalQuantity || 1;
      const packed = order.packedQuantity || order.invoicedQuantity || 0;
      const painted = order.paintedQuantity || 0;

      const isComplete = packed >= total;
      const packed80 = packed / total >= 0.8;
      const painted90 = painted / total >= 0.9;

      let enters = isComplete || packed80 || painted90;

      // Regra especial: "Caso tenha uma quantidade total pintada e parcial embalada,
      // então o sistema pode considerar previsão de embarque futuro -
      // nesse caso, o item não entra no relatório e nem na rota."
      if (painted >= total && packed > 0 && packed < total && !packed80) {
        enters = false;
      }

      return enters;
    });

    if (candidates.length === 0) {
      alert(
        "Nenhum pedido atende aos critérios de quantidade completa, 80% embalada ou 90% pintada na rota sugerida de hoje.",
      );
      return;
    }

    const newIds: number[] = [];
    const newQtys: Record<number, number> = {};

    candidates.slice(0, 30).forEach((c) => {
      newIds.push(c.order.id);
      const defaultCarga = getDefaultCargaQty(c.order);
      newQtys[c.order.id] = defaultCarga;
    });

    setSelectedOrderIds(newIds);
    setOrderQuantities(newQtys);
    alert(
      `Sugestão Inteligente aplicada! ${newIds.length} pedidos selecionados para carga.`,
    );
  };

  const handleCreateCarga = () => {
    if (selectedOrderIds.length === 0 || !newCargaName.trim()) return;
    db.addCarga({
      name: newCargaName.trim(),
      dayOfWeek: daysOfWeek[selectedDay],
      orderIds: selectedOrderIds,
      orderQuantities: orderQuantities,
      route: [daysOfWeek[selectedDay]],
      status: "PLANEJADA",
      createdAt: Date.now(),
    });
    setIsCargaModalOpen(false);
    setSelectedOrderIds([]);
    setOrderQuantities({});
    setNewCargaName("");
    alert("Carga gerada com sucesso!");
  };

  const handleDeleteCarga = (cargaId: string) => {
    if (confirm("Tem certeza que deseja excluir esta rota?")) {
      db.deleteCarga(cargaId);
    }
  };

  const handleSaveEditCarga = async () => {
    if (editingCarga) {
      await db.updateCarga(editingCarga);
      setExpandedCargaId(null);
      setEditingCarga(null);
      alert("Rota atualizada com sucesso.");
    }
  };

  const printCarga = (cargaId: string) => {
    const carga = db.cargas.find((c) => c.id === cargaId);
    if (!carga) return;

    const doc = new jsPDF("landscape");
    doc.setFont("helvetica");

    doc.setFontSize(16);
    doc.text(`Relatório de Carga: ${carga.name} (${carga.dayOfWeek})`, 14, 20);
    doc.setFontSize(10);
    doc.text(
      `Gerado em: ${new Date().toLocaleString()} - Status: ${carga.status}`,
      14,
      26,
    );

    const tableColumn = [
      "Pedido",
      "Cliente",
      "Repres.",
      "Cidade",
      "Produto",
      "Cor/Tamanho",
      "Qtd. a carregar",
    ];
    const tableRows: any[] = [];

    const involvedOrders = db.orders.filter((o) =>
      carga.orderIds.includes(o.id),
    );

    // Sort by orderId array order to maintain user chosen order
    involvedOrders.sort(
      (a, b) => carga.orderIds.indexOf(a.id) - carga.orderIds.indexOf(b.id),
    );

    involvedOrders.forEach((order) => {
      const item = db.items.find((i) => i.id === order.itemId);
      const normalizedCity = (
        customerCityMap.get(order.customerName.toLowerCase().trim()) ||
        "desconhecida"
      ).toUpperCase();

      const cargaQty = carga.orderQuantities?.[order.id] ?? getDefaultCargaQty(order);

      tableRows.push([
        order.orderCode || `#${order.id}`,
        order.customerName,
        order.representativeName || "-",
        normalizedCity,
        item?.name || order.customProductName || "Item Desconhecido",
        `${order.color} / ${order.size}`,
        cargaQty,
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio_carga_${carga.name.replace(/\s+/g, "_")}.pdf`);
  };

  const generatePDFReport = () => {
    if (selectedOrderIds.length === 0) return;

    const doc = new jsPDF("landscape");
    doc.setFont("helvetica");

    doc.setFontSize(16);
    doc.text(`Relatório de Carga - ${daysOfWeek[selectedDay]}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 26);

    const tableColumn = [
      "Pedido",
      "Cliente",
      "Cidade",
      "Produto",
      "Qtde Pedido",
      "Qtde Pint./Emb.",
      "Faturado",
      "Qtd. a carregar",
      "Prev. Prontidão",
    ];
    const tableRows: any[] = [];

    const selectedSuggestions = orderSuggestions.filter((s) =>
      selectedOrderIds.includes(s.order.id),
    );

    selectedSuggestions.sort(
      (a, b) =>
        selectedOrderIds.indexOf(a.order.id) -
        selectedOrderIds.indexOf(b.order.id),
    );

    selectedSuggestions.forEach((s) => {
      const order = s.order;
      const item = db.items.find((i) => i.id === order.itemId);
      const faturado = order.invoicedQuantity || 0;
      const cargaQty = orderQuantities[order.id] ?? getDefaultCargaQty(order);

      const readyQty = order.packedQuantity || order.invoicedQuantity || 0;
      const paintedQty = order.paintedQuantity || 0;

      const availableReadyQty = Math.max(0, readyQty - faturado);
      const availablePaintedQty = Math.max(0, paintedQty - faturado);

      let prevEmbarque = "Imediata";
      if (availableReadyQty < cargaQty) {
        if (availablePaintedQty >= cargaQty) {
          prevEmbarque = "Necessita Montagem";
        } else {
          const expectedDate = new Date(order.deliveryDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (expectedDate <= today) {
            prevEmbarque = "Imediata";
          } else {
            prevEmbarque = expectedDate.toLocaleDateString("pt-BR");
          }
        }
      }

      tableRows.push([
        order.orderCode || `#${order.id}`,
        order.customerName,
        s.city.toUpperCase(),
        item?.name || order.customProductName || "Item Desconhecido",
        order.totalQuantity,
        `${paintedQty} / ${readyQty}`,
        `${faturado} / ${order.totalQuantity}`,
        cargaQty,
        prevEmbarque,
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio_carga_${daysOfWeek[selectedDay]}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <div className="bg-white px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Truck className="text-blue-600" />
            Logística
          </h1>
          <div className="flex bg-slate-100 p-1 rounded-lg mt-3 w-max">
            <button
              onClick={() => setActiveTab("montagem")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === "montagem" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
            >
              Criar Rotas
            </button>
            <button
              onClick={() => setActiveTab("historico")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === "historico" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
            >
              Rotas Criadas
            </button>
          </div>
        </div>
        {activeTab === "montagem" && (
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-bold text-slate-500">
              Dia da Semana:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {daysOfWeek.map((day, ix) => {
                if (ix === 0 || ix === 6) return null; // Skip weekends in selector typically
                return (
                  <button
                    key={ix}
                    onClick={() => setSelectedDay(ix)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${selectedDay === ix ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"}`}
                  >
                    {day.split("-")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {activeTab === "montagem" ? (
          <>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="bg-white border text-sm border-blue-100 rounded-xl p-4 shadow-sm relative overflow-hidden flex-1">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                <h3 className="font-bold flex items-center gap-2 text-blue-800">
                  <MapPin size={16} />
                  Rotas Sugeridas para {daysOfWeek[selectedDay]}
                </h3>
                <p className="text-slate-600 mt-1 text-xs">
                  As sugestões priorizam pedidos atrasados e cidades na rota do
                  dia:{" "}
                  <strong className="text-slate-800">
                    {suggestedRoutes.map((s) => s.toUpperCase()).join(", ")}
                  </strong>
                  . Pedidos com itens pintados ou embalados também são
                  apresentados, pois estão próximos da expedição.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 min-w-[280px]">
                <h3 className="font-bold flex items-center gap-2 text-slate-700 text-sm">
                  <Filter size={16} />
                  Filtros
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Search size={14} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      className="pl-8 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition"
                      placeholder="Filtrar por Cliente..."
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <MapPin size={14} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="pl-8 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition"
                      placeholder="Filtrar por Cidade..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 border border-slate-100 rounded-lg p-2 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" /> Prazo de Entrega
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="relative">
                        <input
                          type="date"
                          value={filterDeliveryDateStart}
                          onChange={(e) => setFilterDeliveryDateStart(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-md px-1.5 py-1 text-[11px] focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-700"
                          title="Data início"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="date"
                          value={filterDeliveryDateEnd}
                          onChange={(e) => setFilterDeliveryDateEnd(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-md px-1.5 py-1 text-[11px] focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-700"
                          title="Data fim"
                        />
                      </div>
                    </div>
                    {(filterDeliveryDateStart || filterDeliveryDateEnd) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDeliveryDateStart("");
                          setFilterDeliveryDateEnd("");
                        }}
                        className="text-[10px] text-red-600 font-bold hover:underline self-end flex items-center gap-0.5 mt-0.5"
                      >
                        <X size={10} /> Limpar período
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                  Pedidos para Carregamento ({orderSuggestions.length})
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSmartSuggest}
                    className="bg-indigo-600 border border-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-1.5 min-w-max"
                    title="Seleciona automaticamente pedidos com itens prontos, estoque ou atrasados"
                  >
                    <Package size={14} /> Sugestão Inteligente
                  </button>
                  {selectedOrderIds.length > 0 && (
                    <>
                      <button
                        onClick={generatePDFReport}
                        className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
                      >
                        <Printer size={14} /> Relatório
                      </button>
                      <button
                        onClick={() => setIsCargaModalOpen(true)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-1.5"
                      >
                        <Truck size={14} /> Criar Rota (
                        {selectedOrderIds.length})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {orderSuggestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <Package className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-gray-500 font-medium">
                    Nenhum pedido compatível encontrado para carregar.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {orderSuggestions.map((sug) => {
                    const {
                      order,
                      city,
                      isAtrasado,
                      readyQty,
                      almostReadyQty,
                      producingQty,
                    } = sug;
                    const item = db.items.find((i) => i.id === order.itemId);

                    return (
                      <div
                        key={order.id}
                        className={`bg-white rounded-xl border ${selectedOrderIds.includes(order.id) ? "border-blue-400 ring-2 ring-blue-100" : isAtrasado ? "border-red-300 shadow-sm" : "border-slate-200 shadow-sm"} overflow-hidden transition hover:shadow-md flex flex-col`}
                      >
                        <div
                          className={`p-3 border-b flex justify-between items-start gap-2 ${selectedOrderIds.includes(order.id) ? "bg-blue-50/50" : isAtrasado ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() =>
                              handleToggleOrderSelection(order.id)
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1 truncate">
                            <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                              {order.customerName}
                              {isAtrasado && (
                                <AlertTriangle
                                  size={12}
                                  className="text-red-500 shrink-0"
                                  title="Pedido Atrasado"
                                />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                              <MapPin size={10} />
                              {city.toUpperCase()}
                            </div>
                          </div>
                          <div className="bg-white px-2 py-0.5 rounded shadow-sm text-[10px] font-mono text-slate-600 border border-slate-200 shrink-0">
                            {order.orderCode || `#${order.id}`}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col gap-2">
                          <div className="text-xs font-bold text-slate-700 leading-tight">
                            {item?.name ||
                              order.customProductName ||
                              "Item Desconhecido"}
                          </div>
                          <div className="text-[10px] text-slate-500 mb-1">
                            Cor: {order.color} | Tam: {order.size}
                          </div>

                          {(sug.lastEmbalagem || sug.lastPintura) && (
                            <div className="text-[9px] text-slate-400 mb-2 border-t border-slate-100 pt-1.5 space-y-0.5">
                              {sug.lastEmbalagem && (
                                <div>
                                  ✅ Ult Embalagem:{" "}
                                  {new Date(sug.lastEmbalagem).toLocaleString(
                                    "pt-BR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </div>
                              )}
                              {sug.lastPintura && (
                                <div>
                                  🎨 Ult Pintura:{" "}
                                  {new Date(sug.lastPintura).toLocaleString(
                                    "pt-BR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-auto space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-500">
                                Total Pedido:
                              </span>
                              <span className="text-slate-800">
                                {order.totalQuantity}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-medium text-purple-700">
                              <span className="flex items-center gap-1 font-bold">
                                <FileText size={10} /> Faturado:
                              </span>
                              <span className="font-bold">
                                {order.invoicedQuantity || 0} / {order.totalQuantity}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-medium text-orange-700 bg-orange-50 px-1 py-0.5 rounded border border-orange-100">
                              <span className="flex items-center gap-1 font-bold">
                                <Truck size={10} /> Saldo a Carregar:
                              </span>
                              <span className="font-bold font-mono">
                                {Math.max(0, order.totalQuantity - (order.invoicedQuantity || 0))}
                              </span>
                            </div>
                            <div className="h-px w-full bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckSquare size={10} /> Pronto (Emb):
                              </span>
                              <span className="font-bold text-emerald-700">
                                {readyQty}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-amber-600 font-bold flex items-center gap-1">
                                <Package size={10} /> Pintado (Qse lá):
                              </span>
                              <span className="font-bold text-amber-700">
                                {almostReadyQty}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-blue-600 font-bold flex items-center gap-1">
                                <ShieldCheck size={10} /> Em Prod.:
                              </span>
                              <span className="font-bold text-blue-700">
                                {producingQty}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200 pb-2">
              Histórico de Rotas Carregadas
            </h3>
            {db.cargas.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Truck className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 font-medium">
                  Nenhuma rota foi criada ainda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {db.cargas
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((carga) => {
                    return (
                      <div
                        key={carga.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                      >
                        <div className="p-3 border-b bg-slate-50 border-slate-100 flex justify-between items-start">
                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              {carga.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {carga.dayOfWeek}
                            </div>
                          </div>
                          <div
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              carga.status === "PLANEJADA"
                                ? "bg-amber-100 text-amber-700"
                                : carga.status === "EM_TRANSITO"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {carga.status}
                          </div>
                        </div>
                        <div className="p-3 flex-1 flex flex-col gap-2">
                          <div className="text-xs text-slate-600">
                            <strong>{carga.orderIds.length}</strong> pedidos na
                            carga
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Criada em:{" "}
                            {new Date(carga.createdAt).toLocaleString("pt-BR")}
                          </div>

                          {expandedCargaId === carga.id && editingCarga && (
                            <div className="mt-2 text-xs border border-blue-200 bg-blue-50/30 rounded-lg p-2 space-y-2">
                              <div className="font-bold text-slate-700">
                                Edição Rápida:
                              </div>
                              <input
                                type="text"
                                className="w-full border p-1 rounded mb-2 text-xs"
                                value={editingCarga.name}
                                onChange={(e) =>
                                  setEditingCarga({
                                    ...editingCarga,
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Nome da Rota"
                              />
                              {editingCarga.orderIds.map(
                                (oId: number, idx: number) => {
                                  const o = db.orders.find((x) => x.id === oId);
                                  if (!o) return null;
                                  return (
                                    <div
                                      key={oId}
                                      className="flex gap-1 items-center bg-white border border-slate-200 p-1 rounded"
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <button
                                          onClick={() => {
                                            if (idx === 0) return;
                                            const newArr = [
                                              ...editingCarga.orderIds,
                                            ];
                                            [newArr[idx - 1], newArr[idx]] = [
                                              newArr[idx],
                                              newArr[idx - 1],
                                            ];
                                            setEditingCarga({
                                              ...editingCarga,
                                              orderIds: newArr,
                                            });
                                          }}
                                          className="text-slate-400 hover:text-blue-600 disabled:opacity-30"
                                          disabled={idx === 0}
                                        >
                                          <ArrowUp size={12} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (
                                              idx ===
                                              editingCarga.orderIds.length - 1
                                            )
                                              return;
                                            const newArr = [
                                              ...editingCarga.orderIds,
                                            ];
                                            [newArr[idx + 1], newArr[idx]] = [
                                              newArr[idx],
                                              newArr[idx + 1],
                                            ];
                                            setEditingCarga({
                                              ...editingCarga,
                                              orderIds: newArr,
                                            });
                                          }}
                                          className="text-slate-400 hover:text-blue-600 disabled:opacity-30"
                                          disabled={
                                            idx ===
                                            editingCarga.orderIds.length - 1
                                          }
                                        >
                                          <ArrowDown size={12} />
                                        </button>
                                      </div>
                                      <div className="flex-1 truncate text-[10px] pl-1 font-bold">
                                        {o.customerName}
                                        <span className="block text-[9px] text-slate-500 font-normal">
                                          Fat: {o.invoicedQuantity || 0}/{o.totalQuantity} | Pend: {Math.max(0, o.totalQuantity - (o.invoicedQuantity || 0))}
                                        </span>
                                      </div>
                                      <input
                                        type="number"
                                        min="1"
                                        max={Math.max(0, o.totalQuantity - (o.invoicedQuantity || 0))}
                                        className="w-12 text-center text-[10px] border rounded py-0.5"
                                        value={
                                          editingCarga.orderQuantities?.[oId] !== undefined ? editingCarga.orderQuantities[oId] : getDefaultCargaQty(o)
                                        }
                                        onChange={(e) => {
                                          const maxVal = Math.max(0, o.totalQuantity - (o.invoicedQuantity || 0));
                                          let val = Number(e.target.value);
                                          if (val > maxVal) val = maxVal;
                                          if (val < 0) val = 0;
                                          setEditingCarga({
                                            ...editingCarga,
                                            orderQuantities: {
                                              ...(editingCarga.orderQuantities ||
                                                {}),
                                              [oId]: val,
                                            },
                                          });
                                        }}
                                      />
                                      <button
                                        onClick={() => {
                                          const newArr =
                                            editingCarga.orderIds.filter(
                                              (_id: number) => _id !== oId,
                                            );
                                          const newQ = {
                                            ...(editingCarga.orderQuantities ||
                                              {}),
                                          };
                                          delete newQ[oId];
                                          setEditingCarga({
                                            ...editingCarga,
                                            orderIds: newArr,
                                            orderQuantities: newQ,
                                          });
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  );
                                },
                              )}
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  onClick={() => {
                                    setExpandedCargaId(null);
                                    setEditingCarga(null);
                                  }}
                                  className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-600 font-bold hover:bg-slate-50"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleSaveEditCarga}
                                  className="px-2 py-1 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="mt-auto pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs flex-wrap">
                            <button
                              onClick={() => {
                                setExpandedCargaId(carga.id);
                                setEditingCarga(
                                  JSON.parse(JSON.stringify(carga)),
                                );
                              }}
                              className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
                            >
                              <Edit2 size={14} /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCarga(carga.id)}
                              className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-50 transition flex items-center gap-1.5"
                            >
                              <Trash2 size={14} /> Excluir
                            </button>
                            <button
                              onClick={() => printCarga(carga.id)}
                              className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50 transition flex items-center gap-1.5 mt-2 sm:mt-0"
                            >
                              <Printer size={14} /> Imprimir
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {isCargaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Truck size={18} className="text-blue-600" />
                Criar Rota de Carregamento
              </h2>
              <button
                onClick={() => setIsCargaModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Nome da Rota / Destino
                </label>
                <input
                  type="text"
                  value={newCargaName}
                  onChange={(e) => setNewCargaName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Rota Ubá - Tarde"
                  autoFocus
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800">
                <strong>{selectedOrderIds.length}</strong> pedidos selecionados
                para compor esta carga. Opcionalmente, você pode imprimir um
                relatório após criar clicando no botão [Relatório].
              </div>
              {selectedOrderIds.length > 0 && (
                <div className="max-h-[30vh] overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2">
                  <span className="block text-xs font-bold text-slate-700">
                    Quantidades por Pedido:
                  </span>
                  {selectedOrderIds.map((oid) => {
                    const order = db.orders.find((o) => o.id === oid);
                    if (!order) return null;
                    return (
                      <div
                        key={oid}
                        className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex-1 truncate pr-2">
                          <div className="font-bold text-slate-800">{order.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {order.customProductName ||
                              db.items.find((i) => i.id === order.itemId)?.name}
                          </div>
                          <div className="text-[9px] text-slate-400">
                            Faturado: {order.invoicedQuantity || 0}/{order.totalQuantity} | Pend: {Math.max(0, order.totalQuantity - (order.invoicedQuantity || 0))}
                          </div>
                        </div>
                        <div className="flex bg-white items-center gap-1 border border-slate-300 rounded overflow-hidden">
                          <span className="px-1.5 py-1 text-[10px] bg-slate-100 border-r border-slate-300 text-slate-500 font-bold col-span">
                            Qtd
                          </span>
                          <input
                            type="number"
                            min="1"
                            max={Math.max(0, order.totalQuantity - (order.invoicedQuantity || 0))}
                            value={orderQuantities[oid] !== undefined ? orderQuantities[oid] : getDefaultCargaQty(order)}
                            onChange={(e) => {
                              const maxVal = Math.max(0, order.totalQuantity - (order.invoicedQuantity || 0));
                              let val = Number(e.target.value);
                              if (val > maxVal) val = maxVal;
                              if (val < 0) val = 0;
                              setOrderQuantities((q) => ({
                                ...q,
                                [oid]: val,
                              }));
                            }}
                            className="w-14 outline-none px-1 py-1 text-center font-bold text-slate-750"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setIsCargaModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCarga}
                  disabled={!newCargaName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Salvar Rota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
