import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Eye,
  FileText,
  MapPin,
  Monitor,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCcw,
  Route as RouteIcon,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useDatabase } from "./useDatabase";
import type { Carga, ExpeditionRoute, Order, User } from "./types";
import { canManageExpedition } from "./expeditionAccess";
import { normalizeString } from "./searchUtils";
import { LoadSuggestionsTab } from "./LoadSuggestionsTab";
import { PdfPreviewModal } from "./PdfPreviewModal";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SHIFT_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };
const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const FINAL_STATUSES = new Set(["DESPACHADA", "ENTREGUE", "FATURADA"]);
const EDITABLE_STATUSES = new Set(["PLANEJADA", "ABERTA"]);

const STATUS_LABEL: Record<string, string> = {
  PLANEJADA: "Planejada",
  ABERTA: "Aberta",
  FECHADA: "Fechada",
  LIBERADA: "Liberada",
  EM_SEPARACAO: "Em separação",
  PRONTA: "Pronta",
  CARREGADA: "Carregada",
  DESPACHADA: "Despachada",
  EM_TRANSITO: "Em trânsito",
  ENTREGUE: "Entregue",
  FATURADA: "Faturada",
};

const STATUS_CLASS: Record<string, string> = {
  PLANEJADA: "bg-slate-100 text-slate-700 border-slate-200",
  ABERTA: "bg-blue-50 text-blue-800 border-blue-200",
  FECHADA: "bg-amber-50 text-amber-800 border-amber-200",
  LIBERADA: "bg-indigo-50 text-indigo-800 border-indigo-200",
  EM_SEPARACAO: "bg-violet-50 text-violet-800 border-violet-200",
  PRONTA: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CARREGADA: "bg-teal-50 text-teal-800 border-teal-200",
  DESPACHADA: "bg-slate-900 text-white border-slate-900",
  EM_TRANSITO: "bg-cyan-50 text-cyan-800 border-cyan-200",
  ENTREGUE: "bg-emerald-100 text-emerald-900 border-emerald-300",
  FATURADA: "bg-purple-50 text-purple-800 border-purple-200",
};

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(value?: string) {
  if (!value) return null;
  const key = value.split("T")[0];
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatDate(value?: string) {
  const dt = parseLocalDate(value);
  return dt ? dt.toLocaleDateString("pt-BR") : "Sem data";
}

function timestampDateKey(value?: number) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dateKey(dt);
}

function formatTimestampDate(value?: number) {
  if (!value) return "Sem data";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "Sem data" : dt.toLocaleDateString("pt-BR");
}

function getMonday(base: Date) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function nextWeekday(weekday: number, from = new Date()) {
  const start = new Date(from);
  start.setHours(12, 0, 0, 0);
  let delta = (weekday - start.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(start, delta);
}

function getLoadDate(carga: Carga) {
  return carga.scheduledDate || carga.departureDate || "";
}

function isFinalLoad(carga: Carga) {
  return FINAL_STATUSES.has(carga.status);
}

function expeditionShiftRank(shift?: string) {
  return shift === "MANHA" ? 0 : shift === "TARDE" ? 1 : 2;
}

function loadSort(a: Carga, b: Carga) {
  return (
    getLoadDate(a).localeCompare(getLoadDate(b)) ||
    expeditionShiftRank(a.shift) - expeditionShiftRank(b.shift) ||
    a.createdAt - b.createdAt
  );
}

export function ProgramacaoCargasScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [tab, setTab] = useState<"SEMANA" | "PEDIDOS" | "SUGESTOES" | "ROTAS" | "HISTORICO">("SEMANA");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);
  const [showLoadForm, setShowLoadForm] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [loadRouteId, setLoadRouteId] = useState("");
  const [loadDate, setLoadDate] = useState(dateKey(new Date()));
  const [loadLocation, setLoadLocation] = useState("");
  const [loadNotes, setLoadNotes] = useState("");

  const [routeName, setRouteName] = useState("");
  const [routeWeekday, setRouteWeekday] = useState(2);
  const [routeShift, setRouteShift] = useState<"MANHA" | "TARDE">("MANHA");
  const [routeCutoff, setRouteCutoff] = useState("15:00");
  const [routeCustomerSearch, setRouteCustomerSearch] = useState("");
  const [routeCustomerIds, setRouteCustomerIds] = useState<number[]>([]);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  const [orderSearch, setOrderSearch] = useState("");
  const [targetCargaId, setTargetCargaId] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [orderDeliveryStart, setOrderDeliveryStart] = useState("");
  const [orderDeliveryEnd, setOrderDeliveryEnd] = useState("");
  const [orderCreatedStart, setOrderCreatedStart] = useState("");
  const [orderCreatedEnd, setOrderCreatedEnd] = useState("");
  const [orderBatchFilter, setOrderBatchFilter] = useState<"TODOS" | "COM_LOTE" | "SEM_LOTE" | number>("TODOS");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; fileName: string; title: string } | null>(null);

  const canManage = canManageExpedition(db.activeTenantId, currentUser);

  const routes = useMemo(
    () => (db.expeditionRoutes || []).filter((r) => r.active !== false),
    [db.expeditionRoutes],
  );

  const monday = useMemo(() => getMonday(weekAnchor), [weekAnchor]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const weekStart = dateKey(monday);
  const weekEnd = dateKey(sunday);

  const weekLoads = useMemo(
    () =>
      (db.cargas || [])
        .filter((c) => {
          const d = getLoadDate(c);
          return d && d >= weekStart && d <= weekEnd;
        })
        .sort(loadSort),
    [db.cargas, weekStart, weekEnd],
  );

  const activeLoads = useMemo(
    () => (db.cargas || []).filter((c) => !isFinalLoad(c)).sort(loadSort),
    [db.cargas],
  );

  const editableLoads = useMemo(
    () => activeLoads.filter((c) => EDITABLE_STATUSES.has(c.status)),
    [activeLoads],
  );

  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);
  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);
  const batchIdsByOrder = useMemo(() => {
    const map = new Map<number, number[]>();
    (db.productionBatches || []).forEach((batch) => {
      (batch.orderIds || []).forEach((orderId) => {
        const ids = map.get(orderId) || [];
        if (!ids.includes(batch.id)) ids.push(batch.id);
        map.set(orderId, ids);
      });
    });
    return map;
  }, [db.productionBatches]);

  const customerRouteIds = (order: Order) => {
    const customer = db.customers.find(
      (c) =>
        normalizeString(c.name) === normalizeString(order.customerName) ||
        normalizeString(c.tradeName || "") === normalizeString(order.customerName),
    );
    if (!customer) return [] as string[];
    return routes.filter((r) => (r.customerIds || []).includes(customer.id)).map((r) => r.id);
  };

  const getLastAndNextLoad = (order: Order) => {
    const routeIds = customerRouteIds(order);
    const today = dateKey(new Date());
    const matching = (db.cargas || []).filter((c) => c.routeId && routeIds.includes(c.routeId));
    const last = [...matching]
      .filter((c) => getLoadDate(c) && getLoadDate(c) < today)
      .sort((a, b) => getLoadDate(b).localeCompare(getLoadDate(a)))[0];
    const next = [...matching]
      .filter((c) => EDITABLE_STATUSES.has(c.status) && getLoadDate(c) >= today)
      .sort(loadSort)[0];
    return { last, next };
  };

  // IMPERIO_COMMITTED_LOAD_ALLOCATIONS
  // Uma carga despachada continua comprometendo a quantidade até o faturamento
  // reduzir o saldo do pedido. Isso evita que o mesmo item seja alocado duas vezes.
  const allocationsByOrder = useMemo(() => {
    const map = new Map<number, number>();
    (db.cargas || []).forEach((c) => {
      (c.orderIds || []).forEach((id) => {
        const qty = Number(c.orderQuantities?.[id] || 0);
        map.set(id, (map.get(id) || 0) + qty);
      });
    });

    // IMPERIO_INVOICED_COMMITMENT_RELEASE
    // O faturamento é acumulado no pedido. Consideramos que ele atende primeiro
    // as cargas mais antigas; portanto, essa quantidade deixa de bloquear novas cargas.
    db.orders.forEach((order) => {
      const allocated = map.get(order.id) || 0;
      if (allocated <= 0) return;
      map.set(
        order.id,
        Math.max(0, allocated - Math.max(0, Number(order.invoicedQuantity || 0))),
      );
    });

    return map;
  }, [db.cargas, db.orders]);

  const pendingRows = useMemo(() => {
    const q = normalizeString(orderSearch);
    return db.orders
      .filter((o) => o.status !== "CANCELADO" && o.status !== "FATURADO")
      .filter((o) => Number(o.invoicedQuantity || 0) < Number(o.totalQuantity || 0))
      .map((o) => {
        const open = Math.max(0, Number(o.totalQuantity || 0) - Number(o.invoicedQuantity || 0));
        const allocated = allocationsByOrder.get(o.id) || 0;
        const unallocated = Math.max(0, open - allocated);
        const item = itemsById.get(o.itemId);
        const batchIds = batchIdsByOrder.get(o.id) || [];
        return { order: o, open, allocated, unallocated, item, batchIds };
      })
      .filter((row) => row.unallocated > 0)
      .filter((row) => {
        const deliveryKey = (row.order.deliveryDate || "").split("T")[0];
        if (orderDeliveryStart && (!deliveryKey || deliveryKey < orderDeliveryStart)) return false;
        if (orderDeliveryEnd && (!deliveryKey || deliveryKey > orderDeliveryEnd)) return false;

        const createdKey = timestampDateKey(row.order.createdAt);
        if (orderCreatedStart && (!createdKey || createdKey < orderCreatedStart)) return false;
        if (orderCreatedEnd && (!createdKey || createdKey > orderCreatedEnd)) return false;

        if (orderBatchFilter === "COM_LOTE" && row.batchIds.length === 0) return false;
        if (orderBatchFilter === "SEM_LOTE" && row.batchIds.length > 0) return false;
        if (typeof orderBatchFilter === "number" && !row.batchIds.includes(orderBatchFilter)) return false;
        return true;
      })
      .filter((row) => {
        if (!q) return true;
        return normalizeString(
          `${row.order.orderCode} ${row.order.customerName} ${row.item?.code || ""} ${row.item?.name || row.order.customProductName || ""}`,
        ).includes(q);
      })
      .sort((a, b) => (a.order.deliveryDate || "9999").localeCompare(b.order.deliveryDate || "9999"));
  }, [
    db.orders,
    allocationsByOrder,
    itemsById,
    batchIdsByOrder,
    orderSearch,
    orderDeliveryStart,
    orderDeliveryEnd,
    orderCreatedStart,
    orderCreatedEnd,
    orderBatchFilter,
  ]);

  const pendingRowIds = useMemo(() => new Set(pendingRows.map((row) => row.order.id)), [pendingRows]);
  const selectedVisibleCount = useMemo(
    () => Object.keys(selectedQuantities).filter((id) => pendingRowIds.has(Number(id))).length,
    [selectedQuantities, pendingRowIds],
  );
  const selectedTotal = useMemo(
    () => Object.entries(selectedQuantities).reduce(
      (sum, [id, qty]) => pendingRowIds.has(Number(id)) ? sum + Number(qty || 0) : sum,
      0,
    ),
    [selectedQuantities, pendingRowIds],
  );

  const clearOrderFilters = () => {
    setOrderSearch("");
    setOrderDeliveryStart("");
    setOrderDeliveryEnd("");
    setOrderCreatedStart("");
    setOrderCreatedEnd("");
    setOrderBatchFilter("TODOS");
  };

  const packedForLoad = (carga: Carga, orderId: number) => {
    const order = ordersById.get(orderId);
    if (!order) return 0;

    let packedAvailable = Math.max(0, Number(order.packedQuantity || 0));
    const relatedLoads = (db.cargas || [])
      .filter((c) => (c.orderIds || []).includes(orderId))
      .sort(loadSort);

    for (const related of relatedLoads) {
      const allocated = Math.max(0, Number(related.orderQuantities?.[orderId] || 0));
      const packedHere = Math.min(allocated, packedAvailable);
      if (related.id === carga.id) return packedHere;
      packedAvailable = Math.max(0, packedAvailable - allocated);
    }
    return 0;
  };

  const loadMetrics = (carga: Carga) => {
    const ids = carga.orderIds || [];
    let required = 0;
    let packed = 0;
    let separated = 0;
    const customers = new Set<string>();
    const orderCodes = new Set<string>();
    let incompleteOrders = 0;

    ids.forEach((id) => {
      const order = ordersById.get(id);
      if (!order) return;
      const qty = Number(carga.orderQuantities?.[id] || 0);
      const sep = Math.min(qty, Number(carga.separatedQuantities?.[id] || 0));
      const pack = packedForLoad(carga, id);
      required += qty;
      packed += pack;
      separated += sep;
      customers.add(order.customerName);
      orderCodes.add(order.orderCode);
      if (sep < qty) incompleteOrders += 1;
    });

    const percent = required > 0 ? Math.round((separated / required) * 100) : 0;
    return {
      required,
      packed,
      separated,
      percent,
      customerCount: customers.size,
      orderCount: orderCodes.size,
      incompleteOrders,
    };
  };

  const resetRouteForm = () => {
    setRouteName("");
    setRouteWeekday(2);
    setRouteShift("MANHA");
    setRouteCutoff("15:00");
    setRouteCustomerSearch("");
    setRouteCustomerIds([]);
    setEditingRouteId(null);
  };

  const saveRoute = async () => {
    if (!routeName.trim()) {
      alert("Informe o nome da rota/região.");
      return;
    }
    const payload: Omit<ExpeditionRoute, "id"> = {
      name: routeName.trim(),
      weekday: routeWeekday,
      shift: routeShift,
      cutoffTime: routeCutoff || undefined,
      customerIds: routeCustomerIds,
      active: true,
      createdAt: Date.now(),
    };

    if (editingRouteId) {
      const current = (db.expeditionRoutes || []).find((r) => r.id === editingRouteId);
      if (current) {
        await db.updateExpeditionRoute({ ...current, ...payload, id: editingRouteId });
      }
    } else {
      await db.addExpeditionRoute(payload);
    }
    resetRouteForm();
  };

  const editRoute = (route: ExpeditionRoute) => {
    setEditingRouteId(route.id);
    setRouteName(route.name);
    setRouteWeekday(route.weekday);
    setRouteShift(route.shift);
    setRouteCutoff(route.cutoffTime || "15:00");
    setRouteCustomerIds(route.customerIds || []);
    setTab("ROTAS");
  };

  const openNewLoad = (route?: ExpeditionRoute) => {
    setEditingLoadId(null);
    const r = route || routes[0];
    if (r) {
      setLoadRouteId(r.id);
      setLoadDate(dateKey(nextWeekday(r.weekday)));
    } else {
      setLoadRouteId("");
      setLoadDate(dateKey(new Date()));
    }
    setLoadLocation("");
    setLoadNotes("");
    setShowLoadForm(true);
  };

  const openEditLoad = (carga: Carga) => {
    if (!EDITABLE_STATUSES.has(carga.status)) {
      alert("Reabra a carga antes de editar rota, data ou informações do planejamento.");
      return;
    }

    setEditingLoadId(carga.id);
    setLoadRouteId(carga.routeId || "");
    setLoadDate(getLoadDate(carga) || dateKey(new Date()));
    setLoadLocation(carga.stagingLocation || "");
    setLoadNotes(carga.notes || "");
    setSelectedCarga(null);
    setShowLoadForm(true);
  };

  const deleteLoad = async (carga: Carga) => {
    if (!EDITABLE_STATUSES.has(carga.status)) {
      alert("Somente cargas planejadas ou abertas podem ser excluídas. Reabra a carga primeiro, se necessário.");
      return;
    }

    const itemCount = (carga.orderIds || []).length;
    const ok = confirm(
      itemCount > 0
        ? `Excluir a carga "${carga.routeName || carga.name}"? Os ${itemCount} item(ns) vinculados serão liberados novamente para o planejamento.`
        : `Excluir a carga "${carga.routeName || carga.name}"?`,
    );
    if (!ok) return;

    await db.deleteCarga(carga.id);
    if (targetCargaId === carga.id) setTargetCargaId("");
    setSelectedCarga(null);
  };

  const includeOrdersInLoad = (carga: Carga) => {
    if (!EDITABLE_STATUSES.has(carga.status)) {
      alert("Reabra a carga antes de incluir novos pedidos.");
      return;
    }

    setTargetCargaId(carga.id);
    setSelectedQuantities({});
    setSelectedCarga(null);
    setTab("PEDIDOS");
  };

  const saveLoad = async () => {
    const route = routes.find((r) => r.id === loadRouteId);
    if (!route) {
      alert("Selecione uma rota cadastrada.");
      return;
    }
    if (!loadDate) {
      alert("Informe a data programada da carga.");
      return;
    }

    const selectedDate = parseLocalDate(loadDate);
    if (selectedDate && selectedDate.getDay() !== route.weekday) {
      const ok = confirm(
        `A rota está cadastrada para ${DAY_NAMES[route.weekday]} / ${SHIFT_LABEL[route.shift]}, mas a data escolhida cai em ${DAY_NAMES[selectedDate.getDay()]}. Deseja salvar assim mesmo?`,
      );
      if (!ok) return;
    }

    if (editingLoadId) {
      const current = (db.cargas || []).find((c) => c.id === editingLoadId);
      if (!current) {
        alert("A carga não foi encontrada. Atualize a tela e tente novamente.");
        return;
      }

      const updated: Carga = {
        ...current,
        name: route.name,
        routeId: route.id,
        routeName: route.name,
        route: [route.name],
        shift: route.shift,
        scheduledDate: loadDate,
        departureDate: loadDate,
        dayOfWeek: selectedDate
          ? DAY_NAMES[selectedDate.getDay()]
          : DAY_NAMES[route.weekday],
        stagingLocation: loadLocation.trim() || undefined,
        notes: loadNotes.trim() || undefined,
        auditTrail: [
          ...(current.auditTrail || []),
          {
            timestamp: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            action: "Planejamento da carga editado",
          },
        ],
      };

      await db.updateCarga(updated);
      setEditingLoadId(null);
      setShowLoadForm(false);
      return;
    }

    const cargaId = await db.addCarga({
      name: route.name,
      routeId: route.id,
      routeName: route.name,
      route: [route.name],
      shift: route.shift,
      scheduledDate: loadDate,
      departureDate: loadDate,
      dayOfWeek: selectedDate
        ? DAY_NAMES[selectedDate.getDay()]
        : DAY_NAMES[route.weekday],
      orderIds: [],
      orderQuantities: {},
      separatedQuantities: {},
      stagingLocation: loadLocation.trim() || undefined,
      status: "ABERTA",
      createdAt: Date.now(),
      notes: loadNotes.trim() || undefined,
      auditTrail: [
        {
          timestamp: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: "Carga criada",
        },
      ],
      tenantId: db.activeTenantId || undefined,
    });

    setTargetCargaId(cargaId);
    setSelectedQuantities({});
    setOrderSearch("");
    setShowLoadForm(false);
    setTab("PEDIDOS");
  };

  const attachSelectedOrders = async () => {
    const carga = editableLoads.find((c) => c.id === targetCargaId);
    if (!carga) {
      alert("Selecione uma carga aberta para vincular os itens.");
      return;
    }
    const entries = Object.entries(selectedQuantities)
      .map(([id, qty]) => ({ id: Number(id), qty: Number(qty) }))
      .filter((x) => x.qty > 0);
    if (entries.length === 0) {
      alert("Selecione ao menos um item e quantidade.");
      return;
    }

    const orderIds = [...(carga.orderIds || [])];
    const quantities = { ...(carga.orderQuantities || {}) } as Record<number, number>;

    for (const entry of entries) {
      const row = pendingRows.find((r) => r.order.id === entry.id);
      if (!row) continue;
      if (entry.qty > row.unallocated) {
        alert(`A quantidade do pedido ${row.order.orderCode} excede o saldo sem carga (${row.unallocated}).`);
        return;
      }
      if (!orderIds.includes(entry.id)) orderIds.push(entry.id);
      quantities[entry.id] = Number(quantities[entry.id] || 0) + entry.qty;
    }

    await db.updateCarga({
      ...carga,
      orderIds,
      orderQuantities: quantities,
      auditTrail: [
        ...(carga.auditTrail || []),
        {
          timestamp: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: `${entries.length} item(ns) vinculado(s) à carga`,
        },
      ],
    });

    setSelectedQuantities({});
    setTargetCargaId("");
    alert("Itens vinculados à carga com sucesso.");
  };

  const removeAllocation = async (carga: Carga, orderId: number) => {
    if (!EDITABLE_STATUSES.has(carga.status)) {
      alert("Somente cargas abertas podem ter itens removidos.");
      return;
    }
    if (!confirm("Remover este item da carga?")) return;
    const ids = (carga.orderIds || []).filter((id) => id !== orderId);
    const quantities = { ...(carga.orderQuantities || {}) } as Record<number, number>;
    const separated = { ...(carga.separatedQuantities || {}) } as Record<number, number>;
    delete quantities[orderId];
    delete separated[orderId];
    const updated = {
      ...carga,
      orderIds: ids,
      orderQuantities: quantities,
      separatedQuantities: separated,
      auditTrail: [
        ...(carga.auditTrail || []),
        {
          timestamp: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: `Item ${orderId} removido da carga`,
        },
      ],
    };
    await db.updateCarga(updated);
    setSelectedCarga(updated);
  };

  const changeStatus = async (carga: Carga, status: Carga["status"]) => {
    let reason: string | undefined;
    if (status === "ABERTA" && carga.status === "FECHADA") {
      reason = prompt("Informe o motivo da reabertura da carga:") || "";
      if (!reason.trim()) {
        alert("O motivo é obrigatório para reabrir uma carga fechada.");
        return;
      }
    }

    const updated: Carga = {
      ...carga,
      status,
      closedAt: status === "FECHADA" ? Date.now() : carga.closedAt,
      releasedAt: status === "LIBERADA" ? Date.now() : carga.releasedAt,
      auditTrail: [
        ...(carga.auditTrail || []),
        {
          timestamp: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: `Status alterado para ${STATUS_LABEL[status] || status}`,
          reason,
        },
      ],
    };
    await db.updateCarga(updated);
    setSelectedCarga(updated);
  };

  const getLoadProjectedRevenue = (carga: Carga) => {
    let total = 0;
    let missingPriceItems = 0;

    (carga.orderIds || []).forEach((id) => {
      const order = ordersById.get(id);
      if (!order) return;
      const item = itemsById.get(order.itemId);
      const qty = Math.max(0, Number(carga.orderQuantities?.[id] || 0));
      const unitPrice =
        order.unitPrice !== undefined
          ? Number(order.unitPrice || 0)
          : Number(item?.unitPrice ?? item?.basePrice ?? 0);

      if (unitPrice <= 0 && qty > 0) missingPriceItems += 1;

      const discountPercent = Math.max(
        0,
        Math.min(100, Number(order.discountPercent || 0)),
      );
      const gross = qty * unitPrice;
      total += gross * (1 - discountPercent / 100);
    });

    return { total, missingPriceItems };
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const buildLoadPdf = (carga: Carga, includeRevenue = false) => {
    const doc = new jsPDF("landscape");
    const metrics = loadMetrics(carga);
    const projectedRevenue = getLoadProjectedRevenue(carga);
    const loadDateValue = getLoadDate(carga);
    const loadDateObject = parseLocalDate(loadDateValue);
    const dayLabel = loadDateObject
      ? DAY_NAMES[loadDateObject.getDay()]
      : carga.dayOfWeek || "Dia não definido";
    const loadTitleName = carga.routeName || carga.name;
    const title = `PROGRAMAÇÃO DE CARGA - ${loadTitleName} - ${dayLabel.toUpperCase()} ${formatDate(loadDateValue)}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const titleLines = doc.splitTextToSize(title, 268);
    doc.text(titleLines, 14, 14);

    const titleBottom = 14 + Math.max(0, titleLines.length - 1) * 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Status: ${STATUS_LABEL[carga.status] || carga.status} | Área/Pallet: ${carga.stagingLocation || "Não definido"} | Total programado: ${metrics.required} un`,
      14,
      titleBottom + 7,
    );

    let startY = titleBottom + 14;

    if (includeRevenue) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(
        `Faturamento previsto da carga: ${formatCurrency(projectedRevenue.total)}`,
        14,
        startY,
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "Valor total calculado pela quantidade programada na carga, preço do pedido e desconto cadastrado.",
        14,
        startY + 5,
      );

      if (projectedRevenue.missingPriceItems > 0) {
        doc.setFont("helvetica", "bold");
        doc.text(
          `Atenção: ${projectedRevenue.missingPriceItems} item(ns) sem preço foram considerados como R$ 0,00.`,
          14,
          startY + 10,
        );
        startY += 15;
      } else {
        startY += 10;
      }
    }

    const rows = (carga.orderIds || []).map((id) => {
      const order = ordersById.get(id);
      const item = order ? itemsById.get(order.itemId) : undefined;
      const qtyInLoad = Number(carga.orderQuantities?.[id] || 0);
      const batchIds = batchIdsByOrder.get(id) || [];
      const loteLabel =
        batchIds.length > 0
          ? batchIds
              .map((batchId) => {
                const batch = (db.productionBatches || []).find((b) => b.id === batchId);
                return batch?.name || `Lote ${batchId}`;
              })
              .join(", ")
          : "-";

      const invoiced = Math.max(0, Number(order?.invoicedQuantity || 0));
      const ordered = Math.max(0, Number(order?.totalQuantity || 0));
      const baseColumns = [
        order?.customerName || "Pedido não encontrado",
        loteLabel,
        order?.orderCode || String(id),
        order?.customProductName || item?.name || "Item",
        `${invoiced} / ${ordered}`,
        String(packedForLoad(carga, id)),
      ];

      if (!includeRevenue || !order) return baseColumns;

      const unitPrice =
        order.unitPrice !== undefined
          ? Number(order.unitPrice || 0)
          : Number(item?.unitPrice ?? item?.basePrice ?? 0);
      const discountPercent = Math.max(
        0,
        Math.min(100, Number(order.discountPercent || 0)),
      );
      const lineRevenue =
        qtyInLoad * unitPrice * (1 - discountPercent / 100);

      return [...baseColumns, formatCurrency(lineRevenue)];
    });

    autoTable(doc, {
      startY,
      head: [
        includeRevenue
          ? [
              "Cliente",
              "Lote",
              "Pedido",
              "Produto",
              "Qtd. faturado / pedido",
              "Qtd. embalado",
              "Valor total",
            ]
          : [
              "Cliente",
              "Lote",
              "Pedido",
              "Produto",
              "Qtd. faturado / pedido",
              "Qtd. embalado",
            ],
      ],
      body: rows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: includeRevenue
        ? {
            4: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right", fontStyle: "bold" },
          }
        : {
            4: { halign: "right" },
            5: { halign: "right" },
          },
    });

    const suffix = includeRevenue ? "_com_faturamento" : "_producao";
    const fileName = `carga_${loadTitleName.replace(/[^a-z0-9]+/gi, "_")}_${loadDateValue || "sem_data"}${suffix}.pdf`;
    return { doc, fileName };
  };

  const previewLoad = (carga: Carga, includeRevenue = false) => {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    const { doc, fileName } = buildLoadPdf(carga, includeRevenue);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfPreview({
      url,
      fileName,
      title: includeRevenue
        ? carga.name + " - com faturamento"
        : carga.name + " - produção",
    });
  };

  const closePdfPreview = () => {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview(null);
  };

  const customerMatches = useMemo(() => {
    const q = normalizeString(routeCustomerSearch);
    return db.customers
      .filter((c) => !q || normalizeString(`${c.id} ${c.name} ${c.tradeName || ""}`).includes(q))
      .slice(0, 80);
  }, [db.customers, routeCustomerSearch]);

  if (!canManage) {
    return (
      <div className="m-6 p-6 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 flex items-center gap-3">
        <ShieldAlert size={26} />
        <div>
          <h2 className="font-extrabold">Acesso restrito</h2>
          <p className="text-sm">Este módulo está disponível somente para a equipe autorizada da Império.</p>
        </div>
      </div>
    );
  }

  const renderLoadCard = (carga: Carga) => {
    const metrics = loadMetrics(carga);
    return (
      <button
        key={carga.id}
        type="button"
        onClick={() => setSelectedCarga(carga)}
        className="text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition p-4 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
              {formatDate(getLoadDate(carga))} • {SHIFT_LABEL[carga.shift || ""] || carga.shift || "Turno não definido"}
            </span>
            <h3 className="font-extrabold text-slate-900 text-base mt-0.5">{carga.routeName || carga.name}</h3>
            <p className="text-xs text-slate-500 font-medium">{carga.stagingLocation ? `Área/Pallet: ${carga.stagingLocation}` : "Área de separação não definida"}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold whitespace-nowrap ${STATUS_CLASS[carga.status] || STATUS_CLASS.PLANEJADA}`}>
            {STATUS_LABEL[carga.status] || carga.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="block text-lg font-black text-slate-900">{metrics.customerCount}</span>
            <span className="text-[9px] uppercase font-bold text-slate-500">Clientes</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="block text-lg font-black text-slate-900">{metrics.orderCount}</span>
            <span className="text-[9px] uppercase font-bold text-slate-500">Pedidos</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="block text-lg font-black text-slate-900">{metrics.required}</span>
            <span className="text-[9px] uppercase font-bold text-slate-500">Unidades</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
            <span>Separação da carga</span>
            <span>{metrics.separated}/{metrics.required} un • {metrics.percent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${metrics.percent >= 100 ? "bg-emerald-500" : metrics.percent >= 60 ? "bg-blue-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, metrics.percent)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            Embalado: <strong>{metrics.packed}</strong> • Pendências: <strong>{metrics.incompleteOrders}</strong> item(ns)
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Truck size={23} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Programação de Cargas & Expedição</h1>
            <p className="text-xs text-slate-500 font-medium">Planeje rotas, vincule os itens dos pedidos e acompanhe a separação semanal.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => window.open("/cargas-tv", "_blank")} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-extrabold flex items-center gap-1.5 hover:bg-slate-800"><Monitor size={15} /> Abrir Modo TV</button>
          <button onClick={() => openNewLoad()} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 hover:bg-emerald-700"><Plus size={15} /> Nova carga</button>
        </div>
      </div>

      <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex-wrap">
        {[
          ["SEMANA", "Cargas da Semana", CalendarDays],
          ["PEDIDOS", "Adicionar Pedidos", ClipboardList],
          ["SUGESTOES", "Sugestões de Carga", Sparkles],
          ["ROTAS", "Rotas", RouteIcon],
          ["HISTORICO", "Histórico", FileText],
        ].map(([key, label, Icon]: any) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 min-w-[150px] py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${tab === key ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "SEMANA" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <button onClick={() => setWeekAnchor(addDays(monday, -7))} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} /></button>
            <div className="text-center">
              <span className="block text-xs uppercase font-extrabold text-slate-400 tracking-wider">Semana programada</span>
              <strong className="text-sm text-slate-900">{monday.toLocaleDateString("pt-BR")} a {sunday.toLocaleDateString("pt-BR")}</strong>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setWeekAnchor(new Date())} className="p-2 rounded-lg hover:bg-slate-100" title="Semana atual"><RefreshCcw size={17} /></button>
              <button onClick={() => setWeekAnchor(addDays(monday, 7))} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight size={18} /></button>
            </div>
          </div>

          {weekLoads.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <Truck size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-extrabold text-slate-700">Nenhuma carga programada nesta semana</h3>
              <p className="text-xs text-slate-500 mt-1">Crie uma carga a partir de uma rota cadastrada.</p>
              <button onClick={() => openNewLoad()} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">+ Criar carga</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{weekLoads.map(renderLoadCard)}</div>
          )}
        </div>
      )}

      {tab === "PEDIDOS" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900">Adicionar pedidos à carga</h3>
                <p className="text-xs text-slate-500">Busque qualquer pedido com saldo disponível, inclusive pedidos que já estejam loteados. O lote de produção não interfere na programação da carga.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 min-w-0 lg:min-w-[520px]">
                <div className="relative flex-1"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Cliente, pedido ou produto..." className="w-full h-9 pl-8 pr-2 border border-slate-300 rounded-lg text-xs" /></div>
                <select value={targetCargaId} onChange={(e) => setTargetCargaId(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white sm:w-[260px]">
                  <option value="">Selecione a carga destino...</option>
                  {editableLoads.map((c) => <option key={c.id} value={c.id}>{c.name} • {c.routeName || "Sem rota"}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Filtros de pedidos</span>
                <button type="button" onClick={clearOrderFilters} className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 hover:underline">Limpar filtros</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_1fr_auto] gap-2.5 items-end">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Data de entrega</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="date" value={orderDeliveryStart} onChange={(e) => setOrderDeliveryStart(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Entrega a partir de" />
                    <input type="date" value={orderDeliveryEnd} onChange={(e) => setOrderDeliveryEnd(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Entrega até" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Data de lançamento do pedido</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="date" value={orderCreatedStart} onChange={(e) => setOrderCreatedStart(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Lançado a partir de" />
                    <input type="date" value={orderCreatedEnd} onChange={(e) => setOrderCreatedEnd(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Lançado até" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Vínculo de lote</label>
                  <select
                    value={String(orderBatchFilter)}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "TODOS" || value === "COM_LOTE" || value === "SEM_LOTE") setOrderBatchFilter(value);
                      else setOrderBatchFilter(Number(value));
                    }}
                    className="w-full h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white"
                  >
                    <option value="TODOS">Todos os pedidos</option>
                    <option value="COM_LOTE">Com lote vinculado</option>
                    <option value="SEM_LOTE">Sem lote vinculado</option>
                    {(db.productionBatches || []).map((batch) => <option key={batch.id} value={batch.id}>Lote: {batch.name} ({batch.status})</option>)}
                  </select>
                </div>
                <div className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center whitespace-nowrap text-[10px] font-bold text-slate-600">
                  {pendingRows.length} item(ns) encontrado(s)
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">Pedidos totalmente faturados são ocultados automaticamente. Pedidos faturados parcialmente aparecem somente pelo saldo ainda em aberto.</p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-600"><strong>{selectedVisibleCount}</strong> item(ns) selecionado(s) • <strong>{selectedTotal}</strong> un</span>
              <button onClick={attachSelectedOrders} disabled={!targetCargaId || selectedTotal <= 0} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold">Vincular à carga</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full min-w-[1220px] text-left">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr><th className="p-3">Sel.</th><th className="p-3">Pedido</th><th className="p-3">Cliente / Produto</th><th className="p-3">Lançamento</th><th className="p-3">Entrega</th><th className="p-3">Lote</th><th className="p-3 text-right">Aberto</th><th className="p-3 text-right">Já em carga</th><th className="p-3 text-right">Sem carga</th><th className="p-3">Programação sugerida</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingRows.map((row) => {
                    const selected = selectedQuantities[row.order.id] !== undefined;
                    const { last, next } = getLastAndNextLoad(row.order);
                    return (
                      <tr key={row.order.id} className="hover:bg-slate-50">
                        <td className="p-3"><input type="checkbox" checked={selected} onChange={(e) => setSelectedQuantities((prev) => { const n = { ...prev }; if (e.target.checked) n[row.order.id] = row.unallocated; else delete n[row.order.id]; return n; })} /></td>
                        <td className="p-3 text-xs font-mono font-bold text-slate-800">#{row.order.orderCode}</td>
                        <td className="p-3"><span className="block text-xs font-bold text-slate-800">{row.order.customerName}</span><span className="block text-[10px] text-slate-500">{row.order.customProductName || row.item?.name || "Item"}</span></td>
                        <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{formatTimestampDate(row.order.createdAt)}</td>
                        <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(row.order.deliveryDate)}</td>
                        <td className="p-3 text-[10px]">
                          {row.batchIds.length > 0 ? (
                            <span className="inline-flex px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold" title={row.batchIds.map((id) => db.productionBatches.find((b) => b.id === id)?.name || `Lote ${id}`).join(", ")}>Com lote ({row.batchIds.length})</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-extrabold">Sem lote</span>
                          )}
                        </td>
                        <td className="p-3 text-xs font-bold text-right">{row.open}</td>
                        <td className="p-3 text-xs text-indigo-700 font-bold text-right">{row.allocated}</td>
                        <td className="p-3 text-right">{selected ? <input type="number" min={1} max={row.unallocated} value={selectedQuantities[row.order.id]} onChange={(e) => setSelectedQuantities((prev) => ({ ...prev, [row.order.id]: Math.max(1, Math.min(row.unallocated, Number(e.target.value || 1))) }))} className="w-20 h-8 border border-blue-300 rounded text-center text-xs font-bold" /> : <span className="text-xs font-black text-amber-700">{row.unallocated}</span>}</td>
                        <td className="p-3 text-[10px] text-slate-600 min-w-[260px]">
                          <div className="flex flex-col gap-1">
                            <span>Última: <strong>{last ? `${formatDate(getLoadDate(last))} • ${last.routeName || last.name}` : "nenhuma"}</strong></span>
                            <span>Próxima: <strong className="text-blue-700">{next ? `${formatDate(getLoadDate(next))} • ${next.routeName || next.name}` : "não programada"}</strong></span>
                            {next && <button type="button" onClick={() => { setTargetCargaId(next.id); setSelectedQuantities((prev) => ({ ...prev, [row.order.id]: row.unallocated })); }} className="w-max px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold hover:bg-blue-100">Usar próxima carga</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pendingRows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Nenhum pedido disponível para os filtros informados. Pedidos totalmente faturados não são exibidos.</div>}
            </div>
          </div>
        </div>
      )}

      {tab === "SUGESTOES" && (
        <LoadSuggestionsTab db={db} currentUser={currentUser} />
      )}

      {tab === "ROTAS" && (
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 h-max">
            <div><h3 className="font-extrabold text-slate-900">{editingRouteId ? "Editar rota" : "Nova rota recorrente"}</h3><p className="text-xs text-slate-500">Defina a rota fixa, o dia e o turno. Vincular clientes é opcional.</p></div>
            <input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Ex: Visconde do Rio Branco" className="w-full h-9 border border-slate-300 rounded-lg px-3 text-xs" />
            <div className="grid grid-cols-2 gap-2"><select value={routeWeekday} onChange={(e) => setRouteWeekday(Number(e.target.value))} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white">{DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}</select><select value={routeShift} onChange={(e) => setRouteShift(e.target.value as any)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white"><option value="MANHA">Manhã</option><option value="TARDE">Tarde</option></select></div>
            <label className="block"><span className="text-[10px] uppercase font-extrabold text-slate-500">Horário limite de inclusão</span><input type="time" value={routeCutoff} onChange={(e) => setRouteCutoff(e.target.value)} className="mt-1 w-full h-9 border border-slate-300 rounded-lg px-2 text-xs" /></label>
            <div className="border border-slate-200 rounded-xl overflow-hidden"><div className="px-2 pt-2 text-[10px] uppercase font-extrabold text-slate-500">Clientes vinculados (opcional)</div><div className="p-2 border-b border-slate-100"><input value={routeCustomerSearch} onChange={(e) => setRouteCustomerSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full h-8 border border-slate-300 rounded px-2 text-xs" /></div><div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">{customerMatches.map((c) => <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 text-xs cursor-pointer"><input type="checkbox" checked={routeCustomerIds.includes(c.id)} onChange={(e) => setRouteCustomerIds((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))} /><span><strong>{c.tradeName || c.name}</strong><span className="text-slate-400 ml-1">#{c.id}</span></span></label>)}</div></div>
            <div className="flex gap-2"><button onClick={saveRoute} className="flex-1 h-9 bg-blue-600 text-white rounded-lg text-xs font-extrabold">{editingRouteId ? "Salvar alterações" : "Cadastrar rota"}</button>{editingRouteId && <button onClick={resetRouteForm} className="h-9 px-3 border border-slate-300 rounded-lg text-xs font-bold">Cancelar</button>}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
            {routes.map((r) => {
              const customerNames = db.customers.filter((c) => (r.customerIds || []).includes(c.id));
              const relatedLoads = (db.cargas || []).filter((c) => c.routeId === r.id).sort(loadSort);
              const last = [...relatedLoads].filter((c) => getLoadDate(c) < dateKey(new Date())).pop();
              const next = relatedLoads.find((c) => EDITABLE_STATUSES.has(c.status) && getLoadDate(c) >= dateKey(new Date()));
              return <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3"><div className="flex justify-between gap-2"><div><h3 className="font-extrabold text-slate-900">{r.name}</h3><span className="text-xs font-bold text-blue-700">{DAY_NAMES[r.weekday]} • {SHIFT_LABEL[r.shift]} {r.cutoffTime ? `• fecha ${r.cutoffTime}` : ""}</span></div><RouteIcon size={20} className="text-slate-300" /></div><p className="text-xs text-slate-500">{customerNames.length > 0 ? <><strong>{customerNames.length}</strong> cliente(s) vinculados</> : "Sem clientes fixos — os pedidos serão incluídos manualmente nas cargas."}</p><div className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2 space-y-1"><p>Última carga: <strong>{last ? formatDate(getLoadDate(last)) : "nenhuma"}</strong></p><p>Próxima aberta: <strong className="text-blue-700">{next ? formatDate(getLoadDate(next)) : "não programada"}</strong></p></div><div className="flex gap-2"><button onClick={() => openNewLoad(r)} className="flex-1 h-8 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold">+ Próxima carga</button><button onClick={() => editRoute(r)} className="h-8 px-3 border border-slate-300 rounded-lg text-[10px] font-bold">Editar</button></div></div>;
            })}
            {routes.length === 0 && <div className="md:col-span-2 p-10 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-sm text-slate-500">Cadastre a primeira rota para começar a programar as cargas.</div>}
          </div>
        </div>
      )}

      {tab === "HISTORICO" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...(db.cargas || [])].sort((a, b) => getLoadDate(b).localeCompare(getLoadDate(a))).map(renderLoadCard)}
        </div>
      )}

      {showLoadForm && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLoadForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start"><div><h3 className="font-extrabold text-slate-900 text-lg">{editingLoadId ? "Editar carga" : "Programar nova carga"}</h3><p className="text-xs text-slate-500">{editingLoadId ? "Altere rota, data, área/pallet ou observações da carga." : "Escolha a rota fixa e a data. Depois você será levado para buscar e incluir os pedidos, inclusive os já loteados."}</p></div><button onClick={() => { setShowLoadForm(false); setEditingLoadId(null); }} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button></div>
            <label className="block"><span className="text-[10px] uppercase font-extrabold text-slate-500">Rota</span><select value={loadRouteId} onChange={(e) => { setLoadRouteId(e.target.value); const r = routes.find((x) => x.id === e.target.value); if (r) setLoadDate(dateKey(nextWeekday(r.weekday))); }} className="mt-1 w-full h-10 border border-slate-300 rounded-lg px-2 text-sm bg-white"><option value="">Selecione...</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name} • {DAY_NAMES[r.weekday]} • {SHIFT_LABEL[r.shift]}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label><span className="text-[10px] uppercase font-extrabold text-slate-500">Data da carga</span><input type="date" value={loadDate} onChange={(e) => setLoadDate(e.target.value)} className="mt-1 w-full h-10 border border-slate-300 rounded-lg px-2 text-sm" /></label><label><span className="text-[10px] uppercase font-extrabold text-slate-500">Área/Pallet</span><input value={loadLocation} onChange={(e) => setLoadLocation(e.target.value)} placeholder="Ex: A-03" className="mt-1 w-full h-10 border border-slate-300 rounded-lg px-2 text-sm" /></label></div>
            <textarea value={loadNotes} onChange={(e) => setLoadNotes(e.target.value)} placeholder="Observações da carga..." className="w-full min-h-[90px] border border-slate-300 rounded-lg p-2 text-sm" />
            <div className="flex justify-end gap-2"><button onClick={() => { setShowLoadForm(false); setEditingLoadId(null); }} className="h-9 px-4 border border-slate-300 rounded-lg text-xs font-bold">Cancelar</button><button onClick={saveLoad} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-xs font-extrabold">{editingLoadId ? "Salvar alterações" : "Criar carga aberta"}</button></div>
          </div>
        </div>
      )}

      {selectedCarga && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setSelectedCarga(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50"><div><div className="flex items-center gap-2 flex-wrap"><h3 className="font-black text-slate-900 text-lg">{selectedCarga.name}</h3><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${STATUS_CLASS[selectedCarga.status] || STATUS_CLASS.PLANEJADA}`}>{STATUS_LABEL[selectedCarga.status] || selectedCarga.status}</span></div><p className="text-xs text-slate-500">{formatDate(getLoadDate(selectedCarga))} • Área/Pallet: {selectedCarga.stagingLocation || "não definida"}</p></div><div className="flex items-center gap-2 flex-wrap justify-end"><button onClick={() => previewLoad(selectedCarga, false)} className="h-9 px-3 border border-slate-300 bg-white rounded-lg text-xs font-bold flex items-center gap-1.5" title="Abre a prévia sem salvar o arquivo"><Eye size={14} /> Visualizar Produção</button><button onClick={() => previewLoad(selectedCarga, true)} className="h-9 px-3 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-extrabold flex items-center gap-1.5 hover:bg-emerald-100" title="Abre a prévia gerencial com faturamento previsto"><DollarSign size={14} /> Visualizar + Faturamento</button><button onClick={() => setSelectedCarga(null)} className="p-2 rounded-lg hover:bg-slate-200"><X size={18} /></button></div></div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {EDITABLE_STATUSES.has(selectedCarga.status) && <><button onClick={() => openEditLoad(selectedCarga)} className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-1"><Pencil size={13} /> Editar carga</button><button onClick={() => includeOrdersInLoad(selectedCarga)} className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1"><Plus size={13} /> Incluir pedidos</button><button onClick={() => deleteLoad(selectedCarga)} className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1"><Trash2 size={13} /> Excluir carga</button></>}
                {(selectedCarga.status === "PLANEJADA" || selectedCarga.status === "ABERTA") && <button onClick={() => changeStatus(selectedCarga, "FECHADA")} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold">Fechar carga</button>}
                {selectedCarga.status === "FECHADA" && <><button onClick={() => changeStatus(selectedCarga, "ABERTA")} className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 text-xs font-bold">Reabrir</button><button onClick={() => changeStatus(selectedCarga, "LIBERADA")} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">Liberar</button></>}
                {selectedCarga.status === "LIBERADA" && <button onClick={() => changeStatus(selectedCarga, "EM_SEPARACAO")} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold">Iniciar separação</button>}
                {selectedCarga.status === "EM_SEPARACAO" && loadMetrics(selectedCarga).percent >= 100 && <button onClick={() => changeStatus(selectedCarga, "PRONTA")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Marcar pronta</button>}
                {selectedCarga.status === "PRONTA" && <button onClick={() => changeStatus(selectedCarga, "CARREGADA")} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold">Marcar carregada</button>}
                {selectedCarga.status === "CARREGADA" && <button onClick={() => changeStatus(selectedCarga, "DESPACHADA")} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold">Despachar carga</button>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">{(() => { const m = loadMetrics(selectedCarga); return <><div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><strong className="block text-xl">{m.customerCount}</strong><span className="text-[9px] uppercase text-slate-500 font-bold">Clientes</span></div><div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><strong className="block text-xl">{m.orderCount}</strong><span className="text-[9px] uppercase text-slate-500 font-bold">Pedidos</span></div><div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><strong className="block text-xl">{m.required}</strong><span className="text-[9px] uppercase text-slate-500 font-bold">Necessário</span></div><div className="p-3 rounded-xl bg-blue-50 border border-blue-100"><strong className="block text-xl text-blue-700">{m.packed}</strong><span className="text-[9px] uppercase text-blue-600 font-bold">Embalado</span></div><div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100"><strong className="block text-xl text-emerald-700">{m.separated}</strong><span className="text-[9px] uppercase text-emerald-600 font-bold">Separado</span></div></>; })()}</div>

              <div className="border border-slate-200 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Cliente</th><th className="p-3">Pedido</th><th className="p-3">Produto</th><th className="p-3 text-right">Qtd. carga</th><th className="p-3 text-right">Embalado</th><th className="p-3 text-right">Separado</th><th className="p-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{(selectedCarga.orderIds || []).map((id) => { const o = ordersById.get(id); const item = o ? itemsById.get(o.itemId) : undefined; const qty = Number(selectedCarga.orderQuantities?.[id] || 0); return <tr key={id}><td className="p-3 text-xs font-bold">{o?.customerName || "-"}</td><td className="p-3 text-xs font-mono">#{o?.orderCode || id}</td><td className="p-3 text-xs">{o?.customProductName || item?.name || "Item"}</td><td className="p-3 text-xs font-bold text-right">{qty}</td><td className="p-3 text-xs text-blue-700 font-bold text-right">{packedForLoad(selectedCarga, id)}</td><td className="p-3 text-xs text-emerald-700 font-black text-right">{Math.min(qty, Number(selectedCarga.separatedQuantities?.[id] || 0))}</td><td className="p-3 text-right">{EDITABLE_STATUSES.has(selectedCarga.status) && <button onClick={() => removeAllocation(selectedCarga, id)} className="text-[10px] font-bold text-rose-600 hover:underline">Remover</button>}</td></tr>; })}</tbody></table></div>{(selectedCarga.orderIds || []).length === 0 && <div className="p-8 text-center text-sm text-slate-500">Carga ainda sem itens vinculados.</div>}</div>

              {(selectedCarga.auditTrail || []).length > 0 && <div><h4 className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 mb-2">Histórico da carga</h4><div className="space-y-1">{[...(selectedCarga.auditTrail || [])].reverse().slice(0, 10).map((a, idx) => <div key={`${a.timestamp}-${idx}`} className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2 flex justify-between gap-2"><span><strong>{a.userName}</strong> • {a.action}{a.reason ? ` — ${a.reason}` : ""}</span><span className="text-slate-400 whitespace-nowrap">{new Date(a.timestamp).toLocaleString("pt-BR")}</span></div>)}</div></div>}
            </div>
          </div>
        </div>
      )}
      {pdfPreview && (
        <PdfPreviewModal
          url={pdfPreview.url}
          fileName={pdfPreview.fileName}
          title={pdfPreview.title}
          onClose={closePdfPreview}
        />
      )}

    </div>
  );
}
