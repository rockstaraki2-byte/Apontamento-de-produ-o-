import React, { useMemo, useRef, useState } from "react";
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
import { findCustomerForOrder, normalizeString } from "./searchUtils";
import { LoadSuggestionsTab } from "./LoadSuggestionsTab";
import { PdfPreviewModal } from "./PdfPreviewModal";
import {
  createLoadMetrics,
  ORDER_ALLOCATION_ALLOWED_STATUSES,
} from "./expeditionMetrics";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SHIFT_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };
const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const FINAL_STATUSES = new Set(["DESPACHADA", "ENTREGUE", "FATURADA", "FATURADA_COMPLETA"]);
const EDITABLE_STATUSES = ORDER_ALLOCATION_ALLOWED_STATUSES;
const PREVIOUS_STATUS: Partial<Record<Carga["status"], Carga["status"]>> = {
  FECHADA: "ABERTA",
  LIBERADA: "FECHADA",
  EM_SEPARACAO: "LIBERADA",
  PRONTA: "EM_SEPARACAO",
  CARREGADA: "PRONTA",
  DESPACHADA: "CARREGADA",
  EM_TRANSITO: "DESPACHADA",
  ENTREGUE: "EM_TRANSITO",
};

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
  FATURADA_PARCIAL: "Faturada parcial",
  FATURADA_COMPLETA: "Faturada completa",
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
  FATURADA_PARCIAL: "bg-orange-50 text-orange-800 border-orange-200",
  FATURADA_COMPLETA: "bg-purple-100 text-purple-900 border-purple-300",
};

const USER_MANAGED_STATUSES: Carga["status"][] = [
  "PLANEJADA",
  "ABERTA",
  "FECHADA",
  "LIBERADA",
  "EM_SEPARACAO",
  "PRONTA",
  "CARREGADA",
  "DESPACHADA",
  "EM_TRANSITO",
  "ENTREGUE",
];

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
  const [selectedCargaId, setSelectedCargaId] = useState<string | null>(null);
  const [showLoadForm, setShowLoadForm] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [loadRouteId, setLoadRouteId] = useState("");
  const [loadDate, setLoadDate] = useState(dateKey(new Date()));
  const [loadStatus, setLoadStatus] = useState<Carga["status"]>("ABERTA");
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
  const [loadSearch, setLoadSearch] = useState("");
  const [loadDateStart, setLoadDateStart] = useState("");
  const [loadDateEnd, setLoadDateEnd] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [isLinkingOrders, setIsLinkingOrders] = useState(false);
  const linkInProgressRef = useRef(false);
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

  const filteredEditableLoads = useMemo(() => {
    const q = normalizeString(loadSearch);
    return editableLoads.filter((carga) => {
      const scheduledDate = getLoadDate(carga);
      if (loadDateStart && (!scheduledDate || scheduledDate < loadDateStart)) return false;
      if (loadDateEnd && (!scheduledDate || scheduledDate > loadDateEnd)) return false;
      if (!q) return true;
      return normalizeString(
        `${carga.name} ${carga.routeName || ""} ${STATUS_LABEL[carga.status] || carga.status} ${scheduledDate} ${carga.shift || ""}`,
      ).includes(q);
    });
  }, [editableLoads, loadSearch, loadDateStart, loadDateEnd]);
  const selectedTargetLoad = editableLoads.find((carga) => carga.id === targetCargaId) || null;

  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);
  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);
  const selectedCarga = (db.cargas || []).find((c) => c.id === selectedCargaId) || null;
  const loadCalculations = useMemo(
    () => createLoadMetrics(db.cargas || [], db.orders),
    [db.cargas, db.orders],
  );
  const { packedForLoad, invoicedForLoad, metrics: loadMetrics } = loadCalculations;
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

  const getOrderCustomerCity = (order: Order) => {
    const customer = findCustomerForOrder(order, db.customers) as any;

    const explicitCity =
      customer?.city ||
      customer?.cidade ||
      customer?.municipio ||
      customer?.municipality ||
      (order as any).customerCity ||
      (order as any).city ||
      (order as any).cidade ||
      "";

    if (explicitCity) return String(explicitCity).trim();

    const address = String(
      customer?.address ||
      (order as any).customerAddress ||
      (order as any).deliveryAddress ||
      (order as any).address ||
      "",
    ).trim();

    if (!address) return "-";

    const cityStateMatch = address.match(
      /(?:^|,)\s*([^,]+?)\s*[-–/]\s*[A-Za-z]{2}\s*$/,
    );
    if (cityStateMatch?.[1]) return cityStateMatch[1].trim();

    return "-";
  };

  const getOrderCustomerCityState = (order: Order) => {
    const customer = findCustomerForOrder(order, db.customers) as any;
    const city = String(
      customer?.city ||
      customer?.cidade ||
      customer?.municipio ||
      customer?.municipality ||
      (order as any).customerCity ||
      (order as any).city ||
      (order as any).cidade ||
      "",
    ).trim();
    const state = String(
      customer?.state ||
      customer?.uf ||
      customer?.estado ||
      (order as any).customerState ||
      (order as any).state ||
      (order as any).uf ||
      (order as any).estado ||
      "",
    ).trim().toUpperCase();

    if (city && state) return city + " - " + state;
    if (city) return city;

    const address = String(
      customer?.address ||
      (order as any).customerAddress ||
      (order as any).deliveryAddress ||
      (order as any).address ||
      "",
    ).trim();
    const cityStateMatch = address.match(
      /(?:^|,)\s*([^,]+?)\s*[-–/]\s*([A-Za-z]{2})\s*$/,
    );

    if (cityStateMatch?.[1]) {
      return cityStateMatch[1].trim() + " - " + cityStateMatch[2].toUpperCase();
    }

    return "-";
  };

  const customerRouteIds = (order: Order) => {
    const customer = findCustomerForOrder(order, db.customers);
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
    setLoadStatus("ABERTA");
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
    if (!canManage) return;

    setEditingLoadId(carga.id);
    setLoadRouteId(carga.routeId || "");
    setLoadDate(getLoadDate(carga) || dateKey(new Date()));
    setLoadLocation(carga.stagingLocation || "");
    setLoadNotes(carga.notes || "");
    setSelectedCargaId(null);
    setShowLoadForm(true);
  };

  const deleteLoad = async (carga: Carga) => {
    if (!canManage) return;

    const itemCount = (carga.orderIds || []).length;
    const invoiced = loadMetrics(carga).invoiced;
    const billingWarning =
      invoiced > 0
        ? `\n\nEsta carga possui ${invoiced} unidade(s) faturada(s). A exclusão não estorna o faturamento dos pedidos; a quantidade faturada poderá ser atribuída às cargas restantes do mesmo pedido.`
        : isFinalLoad(carga)
          ? "\n\nEsta carga já foi despachada, entregue ou faturada. A exclusão remove o registro e o histórico desta carga."
          : "";
    const confirmation =
      itemCount > 0
        ? `Excluir a carga "${carga.routeName || carga.name}"? Os ${itemCount} item(ns) vinculados serão liberados novamente para o planejamento.`
        : `Excluir a carga "${carga.routeName || carga.name}"?`;
    const ok = confirm(confirmation + billingWarning);
    if (!ok) return;

    await db.deleteCarga(carga.id);
    if (targetCargaId === carga.id) setTargetCargaId("");
    setSelectedCargaId(null);
  };

  const includeOrdersInLoad = (carga: Carga) => {
    if (!EDITABLE_STATUSES.has(carga.status)) {
      alert("Esta carga não está disponível para inclusão de novos pedidos.");
      return;
    }

    setTargetCargaId(carga.id);
    setSelectedQuantities({});
    setSelectedCargaId(null);
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
      status: loadStatus,
      createdAt: Date.now(),
      closedAt: loadStatus === "FECHADA" ? Date.now() : undefined,
      releasedAt: loadStatus === "LIBERADA" ? Date.now() : undefined,
      notes: loadNotes.trim() || undefined,
      auditTrail: [
        {
          timestamp: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: `Carga criada com status ${STATUS_LABEL[loadStatus] || loadStatus}`,
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
    if (linkInProgressRef.current) return;

    if (db.cargasSync.state !== "live") {
      alert("A lista de cargas ainda não foi confirmada pelo servidor. Aguarde a sincronização e tente novamente.");
      return;
    }

    const carga = editableLoads.find((c) => c.id === targetCargaId);
    if (!carga) {
      alert("A carga selecionada não está mais disponível para inclusão. Atualize a tela e selecione uma carga aberta.");
      return;
    }
    const entries = Object.entries(selectedQuantities)
      .map(([id, qty]) => ({ id: Number(id), qty: Number(qty) }))
      .filter((x) => x.qty > 0);
    if (entries.length === 0) {
      alert("Selecione ao menos um item e quantidade.");
      return;
    }

    const rowsById = new Map<number, (typeof pendingRows)[number]>();
    pendingRows.forEach((row) => rowsById.set(row.order.id, row));
    const missingRows = entries.filter((entry) => !rowsById.has(entry.id));
    if (missingRows.length > 0) {
      alert("Um ou mais pedidos mudaram desde que foram carregados. Atualize a tela e selecione novamente antes de vincular.");
      return;
    }

    const requests = [] as {
      orderId: number;
      quantity: number;
      availableQuantity: number;
      targetQuantityAtSelection: number;
    }[];
    for (const entry of entries) {
      const row = rowsById.get(entry.id)!;
      if (!Number.isInteger(entry.qty) || entry.qty <= 0) {
        alert(`Informe uma quantidade inteira válida para o pedido ${row.order.orderCode}.`);
        return;
      }
      if (entry.qty > row.unallocated) {
        alert(`A quantidade do pedido ${row.order.orderCode} excede o saldo sem carga (${row.unallocated}).`);
        return;
      }
      requests.push({
        orderId: entry.id,
        quantity: entry.qty,
        availableQuantity: row.unallocated,
        targetQuantityAtSelection: Number(carga.orderQuantities?.[entry.id] || 0),
      });
    }

    linkInProgressRef.current = true;
    setIsLinkingOrders(true);
    try {
      await db.addOrdersToCarga(carga.id, requests, currentUser);
      setSelectedQuantities({});
      setTargetCargaId("");
      alert("Pedidos vinculados à carga com sucesso.");
    } catch (error) {
      console.error("Não foi possível vincular os pedidos à carga:", error);
      const code = String((error as any)?.code || "");
      const message = (error as any)?.message;
      if (code.includes("unavailable") || !navigator.onLine) {
        alert("Não foi possível confirmar o vínculo no servidor. Verifique a conexão e tente novamente; nenhum vínculo foi confirmado.");
      } else {
        alert(message || "Não foi possível vincular os pedidos. Atualize a tela e tente novamente.");
      }
    } finally {
      linkInProgressRef.current = false;
      setIsLinkingOrders(false);
    }
  };

  const removeAllocation = async (carga: Carga, orderId: number) => {
    if (!EDITABLE_STATUSES.has(carga.status)) {
      alert("Esta carga não está disponível para remover itens.");
      return;
    }
    const invoiced = invoicedForLoad(carga, orderId);
    const confirmation =
      invoiced > 0
        ? `Este item tem ${invoiced} unidade(s) que o sistema atribui como faturada(s) nesta carga. Remover o item não estorna o faturamento no pedido. Deseja continuar?`
        : "Remover este item da carga?";
    if (!confirm(confirmation)) return;
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
  };

  const changeStatus = async (carga: Carga, status: Carga["status"]) => {
    const rollbackRequested = PREVIOUS_STATUS[carga.status] === status;
    let reason: string | undefined;

    if (rollbackRequested) {
      reason =
        prompt(
          `Informe o motivo para voltar a carga de ${STATUS_LABEL[carga.status] || carga.status} para ${STATUS_LABEL[status] || status}:`,
        ) || "";
      if (!reason.trim()) {
        alert("O motivo é obrigatório para voltar uma etapa da carga.");
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
      const pending = Math.max(0, ordered - invoiced);
      const baseColumns = [
        order?.customerName || "Pedido não encontrado",
        order ? getOrderCustomerCityState(order) : "-",
        loteLabel,
        order?.orderCode || String(id),
        order?.customProductName || item?.name || "Item",
        `${ordered} / ${invoiced}`,
        String(pending),
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
              "Cidade/Estado",
              "Lote",
              "Pedido",
              "Produto",
              "Qtd. pedido / faturado",
              "Pendente",
              "Qtd. embalado",
              "Valor total",
            ]
          : [
              "Cliente",
              "Cidade/Estado",
              "Lote",
              "Pedido",
              "Produto",
              "Qtd. pedido / faturado",
              "Pendente",
              "Qtd. embalado",
            ],
      ],
      body: rows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: includeRevenue
        ? {
            5: { halign: "right" },
            6: { halign: "right", fontStyle: "bold" },
            7: { halign: "right" },
            8: { halign: "right", fontStyle: "bold" },
          }
        : {
            5: { halign: "right" },
            6: { halign: "right", fontStyle: "bold" },
            7: { halign: "right" },
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
        onClick={() => setSelectedCargaId(carga.id)}
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
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900">Adicionar pedidos à carga</h3>
                  <p className="text-xs text-slate-500">Busque qualquer pedido com saldo disponível, inclusive pedidos que já estejam loteados. O lote de produção não interfere na programação da carga.</p>
                </div>
                <div className="flex flex-col gap-2 min-w-0 lg:w-[600px]">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">Data da carga — de<input type="date" value={loadDateStart} onChange={(e) => setLoadDateStart(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700" /></label>
                    <label className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">Até<input type="date" value={loadDateEnd} onChange={(e) => setLoadDateEnd(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700" /></label>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                    <div className="relative flex-1"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Cliente, pedido ou produto..." className="w-full h-9 pl-8 pr-2 border border-slate-300 rounded-lg text-xs" /></div>
                    <div className="relative flex-1"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={loadSearch} onChange={(e) => setLoadSearch(e.target.value)} placeholder="Filtrar carga, rota ou status..." aria-label="Filtrar cargas disponíveis" className="w-full h-9 pl-8 pr-2 border border-slate-300 rounded-lg text-xs" /></div>
                    <select value={targetCargaId} onChange={(e) => setTargetCargaId(e.target.value)} aria-label="Carga destino" className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white sm:w-[260px]">
                      <option value="">Selecione a carga destino...</option>
                      {selectedTargetLoad && !filteredEditableLoads.some((carga) => carga.id === selectedTargetLoad.id) && <option value={selectedTargetLoad.id}>Selecionada (fora dos filtros) • {formatDate(getLoadDate(selectedTargetLoad))} • {selectedTargetLoad.routeName || selectedTargetLoad.name}</option>}
                      {filteredEditableLoads.map((c) => <option key={c.id} value={c.id}>{formatDate(getLoadDate(c))} • {SHIFT_LABEL[c.shift || ""] || "Turno não definido"} • {c.routeName || c.name} • {STATUS_LABEL[c.status] || c.status}</option>)}
                      {filteredEditableLoads.length === 0 && <option value="" disabled>Nenhuma carga para estes filtros</option>}
                    </select>
                  </div>
                  {(loadSearch || loadDateStart || loadDateEnd) && <button type="button" onClick={() => { setLoadSearch(""); setLoadDateStart(""); setLoadDateEnd(""); }} className="self-end text-[10px] font-extrabold text-blue-600 hover:underline">Limpar filtros de cargas</button>}
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
            {db.cargasSync.state !== "live" && (
              <div role="status" className={`rounded-lg border px-3 py-2 text-xs font-semibold ${db.cargasSync.state === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                {db.cargasSync.state === "loading"
                  ? "Carregando e validando as cargas no servidor..."
                  : db.cargasSync.state === "error"
                    ? "Não foi possível sincronizar as cargas. Confira a conexão antes de vincular pedidos."
                    : "Exibindo dados em cache. Aguarde a confirmação do servidor para vincular pedidos."}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-600"><strong>{selectedVisibleCount}</strong> item(ns) selecionado(s) • <strong>{selectedTotal}</strong> un</span>
              <button onClick={attachSelectedOrders} disabled={!targetCargaId || selectedTotal <= 0 || isLinkingOrders || db.cargasSync.state !== "live"} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold">{isLinkingOrders ? "Vinculando..." : db.cargasSync.state !== "live" ? "Aguardando sincronização" : "Vincular à carga"}</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full min-w-[1320px] text-left">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr><th className="p-3">Sel.</th><th className="p-3">Pedido</th><th className="p-3">Cliente / Produto</th><th className="p-3">Cidade</th><th className="p-3">Lançamento</th><th className="p-3">Entrega</th><th className="p-3">Lote</th><th className="p-3 text-right">Aberto</th><th className="p-3 text-right">Já em carga</th><th className="p-3 text-right">Sem carga</th><th className="p-3">Programação sugerida</th></tr>
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
                        <td className="p-3 text-xs font-bold text-slate-700 whitespace-nowrap">{getOrderCustomerCity(row.order)}</td>
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
            {!editingLoadId && <label className="block"><span className="text-[10px] uppercase font-extrabold text-slate-500">Status inicial — definido pelo usuário</span><select value={loadStatus} onChange={(e) => setLoadStatus(e.target.value as Carga["status"])} className="mt-1 w-full h-10 border border-slate-300 rounded-lg px-2 text-sm bg-white">{USER_MANAGED_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>}
            <textarea value={loadNotes} onChange={(e) => setLoadNotes(e.target.value)} placeholder="Observações da carga..." className="w-full min-h-[90px] border border-slate-300 rounded-lg p-2 text-sm" />
            <div className="flex justify-end gap-2"><button onClick={() => { setShowLoadForm(false); setEditingLoadId(null); }} className="h-9 px-4 border border-slate-300 rounded-lg text-xs font-bold">Cancelar</button><button onClick={saveLoad} className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-xs font-extrabold">{editingLoadId ? "Salvar alterações" : "Criar carga"}</button></div>
          </div>
        </div>
      )}

      {selectedCarga && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setSelectedCargaId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50"><div><div className="flex items-center gap-2 flex-wrap"><h3 className="font-black text-slate-900 text-lg">{selectedCarga.name}</h3><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${STATUS_CLASS[selectedCarga.status] || STATUS_CLASS.PLANEJADA}`}>{STATUS_LABEL[selectedCarga.status] || selectedCarga.status}</span></div><p className="text-xs text-slate-500">{formatDate(getLoadDate(selectedCarga))} • Área/Pallet: {selectedCarga.stagingLocation || "não definida"}</p></div><div className="flex items-center gap-2 flex-wrap justify-end"><button onClick={() => previewLoad(selectedCarga, false)} className="h-9 px-3 border border-slate-300 bg-white rounded-lg text-xs font-bold flex items-center gap-1.5" title="Abre a prévia sem salvar o arquivo"><Eye size={14} /> Visualizar Produção</button><button onClick={() => previewLoad(selectedCarga, true)} className="h-9 px-3 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-extrabold flex items-center gap-1.5 hover:bg-emerald-100" title="Abre a prévia gerencial com faturamento previsto"><DollarSign size={14} /> Visualizar + Faturamento</button><button onClick={() => setSelectedCargaId(null)} className="p-2 rounded-lg hover:bg-slate-200"><X size={18} /></button></div></div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {canManage && USER_MANAGED_STATUSES.includes(selectedCarga.status) && <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"><span>Status da carga</span><select value={selectedCarga.status} onChange={(e) => { const nextStatus = e.target.value as Carga["status"]; if (nextStatus !== selectedCarga.status) void changeStatus(selectedCarga, nextStatus); }} aria-label="Definir status da carga" className="h-8 max-w-[190px] rounded-md border border-slate-300 bg-white px-2 text-xs font-extrabold text-slate-800">{USER_MANAGED_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>}
                {canManage && !USER_MANAGED_STATUSES.includes(selectedCarga.status) && <span className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-800" title="Este status é atualizado a partir do faturamento dos itens da carga.">Status de faturamento: {STATUS_LABEL[selectedCarga.status] || selectedCarga.status}</span>}
                {canManage && <><button onClick={() => openEditLoad(selectedCarga)} className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-1"><Pencil size={13} /> Editar carga</button>{EDITABLE_STATUSES.has(selectedCarga.status) && <button onClick={() => includeOrdersInLoad(selectedCarga)} className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1"><Plus size={13} /> Incluir pedidos</button>}<button onClick={() => deleteLoad(selectedCarga)} className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1"><Trash2 size={13} /> Excluir carga</button></>}
                {(selectedCarga.status === "PLANEJADA" || selectedCarga.status === "ABERTA") && <button onClick={() => changeStatus(selectedCarga, "FECHADA")} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold">Fechar carga</button>}
                {selectedCarga.status === "FECHADA" && <><button onClick={() => changeStatus(selectedCarga, "ABERTA")} className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 text-xs font-bold">Reabrir</button><button onClick={() => changeStatus(selectedCarga, "LIBERADA")} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">Liberar</button></>}
                {selectedCarga.status !== "FECHADA" && PREVIOUS_STATUS[selectedCarga.status] && <button onClick={() => changeStatus(selectedCarga, PREVIOUS_STATUS[selectedCarga.status] as Carga["status"])} className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 text-xs font-bold">Voltar para {STATUS_LABEL[PREVIOUS_STATUS[selectedCarga.status] || ""] || "etapa anterior"}</button>}
                {selectedCarga.status === "LIBERADA" && <button onClick={() => changeStatus(selectedCarga, "EM_SEPARACAO")} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold">Iniciar separação</button>}
                {selectedCarga.status === "EM_SEPARACAO" && loadMetrics(selectedCarga).percent >= 100 && <button onClick={() => changeStatus(selectedCarga, "PRONTA")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Marcar pronta</button>}
                {selectedCarga.status === "PRONTA" && <button onClick={() => changeStatus(selectedCarga, "CARREGADA")} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold">Marcar carregada</button>}
                {selectedCarga.status === "CARREGADA" && <button onClick={() => changeStatus(selectedCarga, "DESPACHADA")} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold">Despachar carga</button>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">{(() => { const m = loadMetrics(selectedCarga); return <><div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><strong className="block text-xl">{m.customerCount}</strong><span className="text-[9px] uppercase text-slate-500 font-bold">Clientes</span></div><div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><strong className="block text-xl">{m.orderCount}</strong><span className="text-[9px] uppercase text-slate-500 font-bold">Pedidos</span></div><div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><strong className="block text-xl">{m.required}</strong><span className="text-[9px] uppercase text-slate-500 font-bold">Necessário</span></div><div className="p-3 rounded-xl bg-blue-50 border border-blue-100"><strong className="block text-xl text-blue-700">{m.packed}</strong><span className="text-[9px] uppercase text-blue-600 font-bold">Embalado</span></div><div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100"><strong className="block text-xl text-emerald-700">{m.separated}</strong><span className="text-[9px] uppercase text-emerald-600 font-bold">Separado</span></div></>; })()}</div>

              <div className="border border-slate-200 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Cliente</th><th className="p-3">Pedido</th><th className="p-3">Produto</th><th className="p-3 text-right">Qtd. carga</th><th className="p-3 text-right">Faturado</th><th className="p-3 text-right">Embalado</th><th className="p-3 text-right">Separado</th><th className="p-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{(selectedCarga.orderIds || []).map((id) => { const o = ordersById.get(id); const item = o ? itemsById.get(o.itemId) : undefined; const qty = Number(selectedCarga.orderQuantities?.[id] || 0); return <tr key={id}><td className="p-3 text-xs font-bold">{o?.customerName || "-"}</td><td className="p-3 text-xs font-mono">#{o?.orderCode || id}</td><td className="p-3 text-xs">{o?.customProductName || item?.name || "Item"}</td><td className="p-3 text-xs font-bold text-right">{qty}</td><td className="p-3 text-xs text-purple-700 font-bold text-right">{invoicedForLoad(selectedCarga, id)}</td><td className="p-3 text-xs text-blue-700 font-bold text-right">{packedForLoad(selectedCarga, id)}</td><td className="p-3 text-xs text-emerald-700 font-black text-right">{Math.min(qty, Number(selectedCarga.separatedQuantities?.[id] || 0))}</td><td className="p-3 text-right">{EDITABLE_STATUSES.has(selectedCarga.status) && <button onClick={() => removeAllocation(selectedCarga, id)} className="text-[10px] font-bold text-rose-600 hover:underline">Remover</button>}</td></tr>; })}</tbody></table></div>{(selectedCarga.orderIds || []).length === 0 && <div className="p-8 text-center text-sm text-slate-500">Carga ainda sem itens vinculados.</div>}</div>

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
