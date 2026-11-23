import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ClipboardList,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { auth } from "./firebase";
import type { User } from "./types";
import {
  DEFAULT_PRODUCTION_BOMS,
  PRODUCTION_PLANNING_EXECUTE_ROLES,
  PRODUCTION_PLANNING_MANAGE_ROLES,
  PRODUCTION_PLANNING_MODELS,
  PRODUCTION_PLANNING_READ_ROLES,
  aggregateProductionPlanNeeds,
  isProductionPlanningEnabled,
  requiredQuantityForComponent,
  roundPlanningQuantity,
  type ProductionPlan,
  type ProductionPlanReservation,
  type ProductionPlanningBom,
  type ProductionPlanningComponent,
  type ProductionPlanningStockItem,
  type ProductionPlanningStatus,
} from "./productionPlanning";

interface DraftLine {
  lineId: string;
  modelKey: string;
  variantName: string;
  quantity: number;
}

interface ApiError extends Error {
  code?: string;
  details?: unknown;
}

interface ApiData {
  boms: ProductionPlanningBom[];
  plans: ProductionPlan[];
  reservations: ProductionPlanReservation[];
  stockItems: ProductionPlanningStockItem[];
}

interface MaterialSummaryRow {
  key: string;
  label: string;
  stockEntryId: string | null;
  required: number;
  physical: number | null;
  stockReserved: number;
  otherPlans: number;
  available: number | null;
  deficit: number | null;
  unknown: boolean;
}

function createLocalId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
}

function localIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return String(now.getFullYear()) + "-" + month + "-" + day;
}

function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "A informar";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function formatDate(value: string): string {
  const parts = value.split("-");
  return parts.length === 3 ? parts.reverse().join("/") : value;
}

function formatDimensions(component: ProductionPlanningComponent): string {
  const dimensions = [component.widthMm, component.lengthMm, component.thicknessMm];
  if (dimensions.every((value) => !value)) return "";
  return dimensions.map((value) => value || "—").join(" × ") + " mm";
}

function getApiErrorMessage(error: unknown): string {
  const apiError = error as ApiError | undefined;
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Sua sessão expirou. Entre novamente.",
    FORBIDDEN: "Seu perfil não tem acesso a esta operação.",
    AUTHENTICATION_UNAVAILABLE: "A autenticação do módulo está indisponível.",
    INVALID_MODEL: "O modelo selecionado não está disponível.",
    INVALID_BOM_COMPONENT: "Revise os dados e os vínculos dos componentes.",
    INVALID_BOM_COMPONENTS: "A composição precisa ter pelo menos um componente.",
    DUPLICATE_BOM_COMPONENT: "Há componentes repetidos com o mesmo identificador.",
    STOCK_ITEM_NOT_FOUND: "O item selecionado não está mais disponível no estoque de sk. Atualize a lista e revise o vínculo.",
    BOM_NOT_CONFIGURED: "Salve a composição do modelo antes de criar um lote.",
    INVALID_PLAN_LINE: "Revise os produtos e as quantidades do lote.",
    INVALID_PLAN_LINES: "Adicione pelo menos um produto ao lote.",
    INVALID_PLANNED_DATE: "Informe uma data prevista válida.",
    INVALID_NOTES: "As observações excederam o limite permitido.",
    PLAN_TOO_LARGE: "O lote excede o limite operacional de componentes. Divida-o em mais de um lote.",
    PLAN_NOT_FOUND: "O lote não foi encontrado no tenant sk.",
    ONLY_DRAFTS_CAN_BE_EDITED: "Somente rascunhos podem ser editados.",
    INVALID_STATUS_TRANSITION: "Essa mudança de situação não está disponível para o lote.",
    STOCK_TO_REPORT: "Há componente sem vínculo válido ou sem saldo físico informado. Atualize o estoque e revise a composição antes de concluir.",
    INSUFFICIENT_STOCK: "O saldo disponível não cobre este lote depois das reservas existentes. Nenhum estoque foi baixado.",
    STOCK_LINK_MISMATCH: "Um vínculo da composição aponta para um item de estoque diferente.",
    STOCK_MOVEMENT_ALREADY_EXISTS: "Já existe uma movimentação para este lote e componente. O sistema bloqueou uma segunda baixa.",
  };
  return messages[apiError?.code || ""] || apiError?.message || "Não foi possível concluir a operação.";
}

async function callPlanningApi(method: "GET" | "POST", body?: Record<string, unknown>) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    const error = new Error("UNAUTHORIZED") as ApiError;
    error.code = "UNAUTHORIZED";
    throw error;
  }
  const response = await fetch("/api/production-planning", {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(payload?.error || "Falha ao acessar o planejamento.")) as ApiError;
    error.code = payload?.error;
    error.details = payload?.details;
    throw error;
  }
  return payload;
}

function getMaterialRows(
  plan: ProductionPlan,
  stockItems: ProductionPlanningStockItem[],
  reservations: ProductionPlanReservation[],
): MaterialSummaryRow[] {
  const accumulated = new Map<string, {
    label: string;
    stockEntryId: string | null;
    required: number;
  }>();
  for (const line of plan.bomSnapshot || []) {
    for (const component of line.components || []) {
      if (!component.active) continue;
      const quantity = requiredQuantityForComponent(line.quantity, component);
      if (quantity <= 0) continue;
      const stockEntryId = component.stockEntryId || null;
      const key = stockEntryId || "missing:" + line.modelKey + ":" + component.id;
      const dimensions = formatDimensions(component);
      const label = [
        component.name,
        component.material,
        dimensions,
        line.productName,
      ].filter(Boolean).join(" · ");
      const existing = accumulated.get(key);
      accumulated.set(key, {
        label: existing ? existing.label : label,
        stockEntryId,
        required: roundPlanningQuantity((existing?.required || 0) + quantity),
      });
    }
  }

  const stockById = new Map(
    stockItems.map((stock) => [stock.stockEntryId, stock] as const),
  );
  return [...accumulated.entries()].map(([key, need]) => {
    if (!need.stockEntryId) {
      return {
        key,
        label: need.label,
        stockEntryId: null,
        required: need.required,
        physical: null,
        stockReserved: 0,
        otherPlans: 0,
        available: null,
        deficit: null,
        unknown: true,
      };
    }
    const stock = stockById.get(need.stockEntryId);
    if (!stock || stock.quantity === null) {
      return {
        key,
        label: need.label,
        stockEntryId: need.stockEntryId,
        required: need.required,
        physical: null,
        stockReserved: stock?.reservedQuantity || 0,
        otherPlans: 0,
        available: null,
        deficit: null,
        unknown: true,
      };
    }
    const otherPlans = roundPlanningQuantity(
      reservations
        .filter((reservation) =>
          reservation.active &&
          reservation.planId !== plan.id &&
          reservation.stockEntryId === need.stockEntryId,
        )
        .reduce((total, reservation) => total + reservation.quantity, 0),
    );
    const stockReserved = Math.max(0, stock.reservedQuantity || 0);
    const available = stock.quantity - stockReserved - otherPlans;
    const deficit = roundPlanningQuantity(Math.max(0, need.required - available));
    return {
      key,
      label: need.label,
      stockEntryId: need.stockEntryId,
      required: need.required,
      physical: stock.quantity,
      stockReserved,
      otherPlans,
      available: Math.max(0, available),
      deficit,
      unknown: false,
    };
  });
}

function getMaterialState(rows: MaterialSummaryRow[]): "sufficient" | "shortage" | "stock_to_report" {
  if (rows.some((row) => row.unknown)) return "stock_to_report";
  if (rows.some((row) => (row.deficit || 0) > 0)) return "shortage";
  return "sufficient";
}

function materialStateLabel(state: "sufficient" | "shortage" | "stock_to_report"): string {
  if (state === "stock_to_report") return "Estoque a informar";
  if (state === "shortage") return "Falta material";
  return "Estoque suficiente";
}

function statusLabel(status: ProductionPlanningStatus): string {
  const labels: Record<ProductionPlanningStatus, string> = {
    draft: "Rascunho",
    planned: "Planejado",
    in_production: "Em produção",
    completed: "Concluído",
    cancelled: "Cancelado",
  };
  return labels[status];
}

function statusClasses(status: ProductionPlanningStatus): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "cancelled") return "bg-slate-100 text-slate-600";
  if (status === "in_production") return "bg-blue-100 text-blue-800";
  if (status === "planned") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function materialStateClasses(state: "sufficient" | "shortage" | "stock_to_report"): string {
  if (state === "sufficient") return "bg-emerald-100 text-emerald-800";
  if (state === "shortage") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-900";
}

export function ProductionPlanningScreen({
  currentUser,
  tenantId,
}: {
  currentUser: User;
  tenantId: string;
}) {
  const enabled =
    isProductionPlanningEnabled(tenantId) &&
    currentUser.tenantId === tenantId &&
    PRODUCTION_PLANNING_READ_ROLES.includes(
      currentUser.role as (typeof PRODUCTION_PLANNING_READ_ROLES)[number],
    );
  const canManage = PRODUCTION_PLANNING_MANAGE_ROLES.includes(
    currentUser.role as (typeof PRODUCTION_PLANNING_MANAGE_ROLES)[number],
  );
  const canExecute = PRODUCTION_PLANNING_EXECUTE_ROLES.includes(
    currentUser.role as (typeof PRODUCTION_PLANNING_EXECUTE_ROLES)[number],
  );

  const [tab, setTab] = useState<"plans" | "boms">("plans");
  const [boms, setBoms] = useState<ProductionPlanningBom[]>(() =>
    DEFAULT_PRODUCTION_BOMS.map((bom) => ({
      ...bom,
      components: bom.components.map((component) => ({ ...component })),
    })),
  );
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [stockItems, setStockItems] = useState<ProductionPlanningStockItem[]>([]);
  const [reservations, setReservations] = useState<ProductionPlanReservation[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState(DEFAULT_PRODUCTION_BOMS[0].modelKey);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [plannedDate, setPlannedDate] = useState(localIsoDate);
  const [notes, setNotes] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([
    { lineId: createLocalId(), modelKey: DEFAULT_PRODUCTION_BOMS[0].modelKey, variantName: "", quantity: 1 },
  ]);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [search, setSearch] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDraftLines, setEditDraftLines] = useState<DraftLine[]>([]);
  const [stockSearchTerms, setStockSearchTerms] = useState<Record<string, string>>({});
  const [dirtyBoms, setDirtyBoms] = useState<Record<string, boolean>>({});
  const dirtyBomsRef = useRef<Record<string, boolean>>({});
  const bomSavingRef = useRef(false);

  function markBomDirty(modelKey: string, isDirty: boolean) {
    const next = { ...dirtyBomsRef.current };
    if (isDirty) next[modelKey] = true;
    else delete next[modelKey];
    dirtyBomsRef.current = next;
    setDirtyBoms(next);
  }

  function isBomReady(modelKey: string): boolean {
    return (bomByModel.get(modelKey)?.version || 0) > 0 && !dirtyBoms[modelKey];
  }

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await callPlanningApi("GET") as ApiData;
      const savedBoms = Array.isArray(data.boms) ? data.boms : [];
      setBoms((current) => DEFAULT_PRODUCTION_BOMS.map((defaultBom) => {
        if (dirtyBomsRef.current[defaultBom.modelKey]) {
          return current.find((bom) => bom.modelKey === defaultBom.modelKey) || defaultBom;
        }
        const saved = savedBoms.find((bom) => bom.modelKey === defaultBom.modelKey);
        return saved
          ? { ...defaultBom, ...saved, components: (saved.components || []).map((row) => ({ ...row })) }
          : {
              ...defaultBom,
              components: defaultBom.components.map((row) => ({ ...row })),
            };
      }));
      setPlans(Array.isArray(data.plans) ? data.plans : []);
      setReservations(Array.isArray(data.reservations) ? data.reservations : []);
      setStockItems(Array.isArray(data.stockItems) ? data.stockItems : []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedBom = boms.find((bom) => bom.modelKey === selectedModelKey) || boms[0];
  const stockById = useMemo(
    () => new Map(
      stockItems.map((stock) => [stock.stockEntryId, stock] as const),
    ),
    [stockItems],
  );
  const bomByModel = useMemo(
    () => new Map(boms.map((bom) => [bom.modelKey, bom] as const)),
    [boms],
  );

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    return plans.filter((plan) => {
      if (filterFrom && plan.plannedDate < filterFrom) return false;
      if (filterTo && plan.plannedDate > filterTo) return false;
      if (filterStatus && plan.status !== filterStatus) return false;
      if (filterModel && !plan.lines.some((line) => line.modelKey === filterModel)) return false;
      if (term) {
        const haystack = [
          plan.id,
          plan.notes,
          ...plan.lines.map((line) => line.productName + " " + line.variantName),
        ].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [plans, filterFrom, filterTo, filterStatus, filterModel, search]);

  function updateBomComponent(index: number, changes: Partial<ProductionPlanningComponent>) {
    if (bomSavingRef.current) return;
    markBomDirty(selectedModelKey, true);
    setBoms((current) => current.map((bom) => {
      if (bom.modelKey !== selectedModelKey) return bom;
      return {
        ...bom,
        components: bom.components.map((component, rowIndex) =>
          rowIndex === index ? { ...component, ...changes } : component,
        ),
      };
    }));
  }

  function addBomComponent() {
    if (bomSavingRef.current) return;
    markBomDirty(selectedModelKey, true);
    const component: ProductionPlanningComponent = {
      id: "custom-" + createLocalId(),
      name: "",
      material: "",
      quantityPerUnit: 1,
      unit: "peça",
      lossPercent: 0,
      active: true,
      stockItemId: null,
      stockEntryId: null,
    };
    setBoms((current) => current.map((bom) =>
      bom.modelKey === selectedModelKey
        ? { ...bom, components: [...bom.components, component] }
        : bom,
    ));
  }

  function removeBomComponent(index: number) {
    if (bomSavingRef.current) return;
    markBomDirty(selectedModelKey, true);
    setBoms((current) => current.map((bom) =>
      bom.modelKey === selectedModelKey
        ? { ...bom, components: bom.components.filter((_, rowIndex) => rowIndex !== index) }
        : bom,
    ));
  }

  async function saveSelectedBom() {
    if (!selectedBom || !canManage || bomSavingRef.current) return;
    bomSavingRef.current = true;
    setWorking("bom");
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const result = await callPlanningApi("POST", {
        action: "saveBom",
        bom: selectedBom,
      });
      const saved = result.bom as ProductionPlanningBom;
      setBoms((current) => current.map((bom) =>
        bom.modelKey === saved.modelKey ? saved : bom,
      ));
      markBomDirty(saved.modelKey, false);
      setSuccessMessage("Composição salva. Os lotes criados daqui em diante receberão esta versão.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      bomSavingRef.current = false;
      setWorking("");
    }
  }

  function updateDraftLine(lineId: string, changes: Partial<DraftLine>) {
    setDraftLines((current) => current.map((line) =>
      line.lineId === lineId ? { ...line, ...changes } : line,
    ));
  }

  function addDraftLine() {
    const firstKey = boms[0]?.modelKey || PRODUCTION_PLANNING_MODELS[0].key;
    setDraftLines((current) => [
      ...current,
      { lineId: createLocalId(), modelKey: firstKey, variantName: "", quantity: 1 },
    ]);
  }

  function removeDraftLine(lineId: string) {
    setDraftLines((current) => current.length > 1
      ? current.filter((line) => line.lineId !== lineId)
      : current,
    );
  }

  async function createProductionPlan(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    if (draftLines.some((line) => !isBomReady(line.modelKey))) {
      setErrorMessage("Salve primeiro a composição de cada modelo incluído no lote.");
      return;
    }
    setWorking("plan");
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await callPlanningApi("POST", {
        action: "createPlan",
        plannedDate,
        notes,
        lines: draftLines.map((line) => ({
          modelKey: line.modelKey,
          variantName: line.variantName,
          quantity: Number(line.quantity),
        })),
      });
      setDraftLines([
        { lineId: createLocalId(), modelKey: boms[0]?.modelKey || PRODUCTION_PLANNING_MODELS[0].key, variantName: "", quantity: 1 },
      ]);
      setNotes("");
      setSuccessMessage("Lote criado como rascunho com a composição atual salva.");
      setTab("plans");
      await load();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setWorking("");
    }
  }

  async function changeStatus(plan: ProductionPlan, nextStatus: ProductionPlanningStatus) {
    const confirmation =
      nextStatus === "completed"
        ? "Concluir este lote e baixar os componentes disponíveis do estoque?"
        : nextStatus === "cancelled"
          ? "Cancelar este lote e liberar suas reservas?"
          : nextStatus === "planned"
            ? "Planejar este lote e reservar os componentes vinculados?"
            : "Iniciar a produção deste lote?";
    if (!window.confirm(confirmation)) return;
    setWorking("status:" + plan.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await callPlanningApi("POST", {
        action: "changeStatus",
        planId: plan.id,
        status: nextStatus,
      });
      setSuccessMessage(
        nextStatus === "completed"
          ? "Lote concluído e consumo registrado uma única vez."
          : nextStatus === "planned"
            ? "Lote planejado; suas necessidades agora entram nas reservas."
            : nextStatus === "cancelled"
              ? "Lote cancelado e reservas liberadas."
              : "Lote iniciado em produção.",
      );
      await load();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setWorking("");
    }
  }

  function startDraftEdit(plan: ProductionPlan) {
    setEditingPlanId(plan.id);
    setEditDate(plan.plannedDate);
    setEditNotes(plan.notes || "");
    setEditDraftLines(plan.lines.map((line) => ({ ...line })));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateEditLine(lineId: string, changes: Partial<DraftLine>) {
    setEditDraftLines((current) => current.map((line) =>
      line.lineId === lineId ? { ...line, ...changes } : line,
    ));
  }

  function addEditLine() {
    setEditDraftLines((current) => [
      ...current,
      {
        lineId: createLocalId(),
        modelKey: boms[0]?.modelKey || PRODUCTION_PLANNING_MODELS[0].key,
        variantName: "",
        quantity: 1,
      },
    ]);
  }

  function removeEditLine(lineId: string) {
    setEditDraftLines((current) => current.length > 1
      ? current.filter((line) => line.lineId !== lineId)
      : current,
    );
  }

  async function saveDraftChanges(planId: string) {
    if (!canManage || editingPlanId !== planId) return;
    setWorking("edit:" + planId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await callPlanningApi("POST", {
        action: "updateDraftPlan",
        planId,
        plannedDate: editDate,
        notes: editNotes,
        lines: editDraftLines.map((line) => ({
          lineId: line.lineId,
          modelKey: line.modelKey,
          variantName: line.variantName,
          quantity: Number(line.quantity),
        })),
      });
      setEditingPlanId(null);
      setSuccessMessage("Rascunho atualizado; as composições já copiadas para ele foram preservadas.");
      await load();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setWorking("");
    }
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Este módulo está habilitado somente para usuários autorizados do tenant sk.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-800">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 md:text-2xl">Planejamento da Produção</h1>
              <p className="mt-1 text-sm text-slate-600">
                Composições versionadas, reservas por lote e conferência de materiais do tenant sk.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !!working}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </header>

        {errorMessage && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 shrink-0" size={17} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <Check className="mt-0.5 shrink-0" size={17} />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab("plans")}
            className={"border-b-2 px-4 py-2.5 text-sm font-bold " + (tab === "plans" ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800")}
          >
            Lotes e materiais
          </button>
          <button
            type="button"
            onClick={() => setTab("boms")}
            className={"border-b-2 px-4 py-2.5 text-sm font-bold " + (tab === "boms" ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800")}
          >
            Composições
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Carregando lotes, composições e saldos de estoque…
          </div>
        ) : tab === "boms" ? (
          <section className="flex flex-col gap-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              As quantidades iniciais vieram da aba “Gabinetes” da planilha. As peças ainda não estão ligadas a itens de estoque. Selecione o registro existente correto de sk; o módulo não cria nem associa itens automaticamente. Fundo 2 (2,7 mm) está desativado porque a planilha informa consumo zero nos três modelos.
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <label className="min-w-64 flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Modelo
                  <select
                    value={selectedModelKey}
                    disabled={working === "bom"}
                    onChange={(event) => setSelectedModelKey(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-800"
                  >
                    {boms.map((bom) => (
                      <option key={bom.modelKey} value={bom.modelKey}>{bom.productName}{dirtyBoms[bom.modelKey] ? " · alterações não salvas" : ""}</option>
                    ))}
                  </select>
                </label>
                <div className="text-xs text-slate-500">
                  {selectedBom?.version
                    ? "Versão salva " + selectedBom.version
                    : "Composição inicial ainda não salva"}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {(selectedBom?.components || []).map((component, index) => {
                  const selectedStock = component.stockEntryId
                    ? stockById.get(component.stockEntryId)
                    : undefined;
                  const stockSearchValue =
                    stockSearchTerms[component.id] ??
                    (selectedStock
                      ? selectedStock.itemCode + " — " + selectedStock.itemName + " — " + selectedStock.stockEntryId
                      : "");
                  const stockSearchTerm = (stockSearchTerms[component.id] || "").trim().toLowerCase();
                  const stockChoices = stockSearchTerm
                    ? stockItems
                        .filter((stock) =>
                          [
                            stock.itemCode,
                            stock.itemName,
                            stock.stage,
                            stock.color,
                            stock.size,
                            stock.variation,
                            stock.stockEntryId,
                          ].join(" ").toLowerCase().includes(stockSearchTerm),
                        )
                        .slice(0, 50)
                    : [];
                  return (
                    <div
                      key={component.id}
                      className={"rounded-xl border p-3 " + (component.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50")}
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <label className="text-[11px] font-bold text-slate-500 md:col-span-3">
                          Componente
                          <input
                            value={component.name}
                            disabled={!canManage || working === "bom" || !component.active}
                            onChange={(event) => updateBomComponent(index, { name: event.target.value })}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm font-semibold text-slate-800 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="text-[11px] font-bold text-slate-500 md:col-span-2">
                          Material
                          <input
                            value={component.material}
                            disabled={!canManage || working === "bom" || !component.active}
                            onChange={(event) => updateBomComponent(index, { material: event.target.value })}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="text-[11px] font-bold text-slate-500 md:col-span-2">
                          Dimensões (mm)
                          <div className="mt-1 flex gap-1">
                            {(["widthMm", "lengthMm", "thicknessMm"] as const).map((field) => (
                              <input
                                key={field}
                                type="number"
                                min="0"
                                step="0.1"
                                aria-label={field}
                                placeholder={field === "widthMm" ? "Larg." : field === "lengthMm" ? "Comp." : "Esp."}
                                value={component[field] ?? ""}
                                disabled={!canManage || working === "bom" || !component.active}
                                onChange={(event) => updateBomComponent(index, {
                                  [field]: event.target.value === "" ? undefined : Number(event.target.value),
                                })}
                                className="min-w-0 w-1/3 rounded-md border border-slate-300 px-1 py-2 text-xs text-slate-800 disabled:bg-slate-100"
                              />
                            ))}
                          </div>
                        </label>
                        <label className="text-[11px] font-bold text-slate-500 md:col-span-1">
                          Qtd./un.
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={component.quantityPerUnit}
                            disabled={!canManage || working === "bom" || !component.active}
                            onChange={(event) => updateBomComponent(index, { quantityPerUnit: Number(event.target.value) })}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="text-[11px] font-bold text-slate-500 md:col-span-1">
                          Unidade
                          <input
                            value={component.unit}
                            disabled={!canManage || working === "bom" || !component.active}
                            onChange={(event) => updateBomComponent(index, { unit: event.target.value })}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                          />
                        </label>
                        <label className="text-[11px] font-bold text-slate-500 md:col-span-1">
                          Perda %
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={component.lossPercent}
                            disabled={!canManage || working === "bom" || !component.active}
                            onChange={(event) => updateBomComponent(index, { lossPercent: Number(event.target.value) })}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                          />
                        </label>
                        <div className="flex items-end gap-2 md:col-span-2">
                          <label className="flex min-h-9 flex-1 items-center gap-2 rounded-md border border-slate-200 px-2 text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={component.active}
                              disabled={!canManage || working === "bom"}
                              onChange={(event) => updateBomComponent(index, { active: event.target.checked })}
                            />
                            Incluir
                          </label>
                          {canManage && (
                            <button
                              type="button"
                              disabled={working === "bom"}
                              onClick={() => removeBomComponent(index)}
                              aria-label={"Remover " + component.name}
                              className="rounded-md border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 md:col-span-12">
                          <div>Item e variação de estoque existentes</div>
                          <input
                            value={stockSearchValue}
                            disabled={!canManage || working === "bom"}
                            onChange={(event) => setStockSearchTerms((current) => ({
                              ...current,
                              [component.id]: event.target.value,
                            }))}
                            placeholder="Digite código, nome, cor ou variação para buscar no estoque"
                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-800 disabled:bg-slate-100"
                          />
                          {canManage && stockSearchTerm && (
                            <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                              {stockChoices.length === 0 ? (
                                <p className="p-2 text-xs font-medium text-slate-500">Nenhum registro de estoque existente corresponde à busca.</p>
                              ) : stockChoices.map((stock) => (
                                <button
                                  type="button"
                                  key={stock.stockEntryId}
                                  disabled={working === "bom"}
                                  onClick={() => {
                                    updateBomComponent(index, {
                                      stockEntryId: stock.stockEntryId,
                                      stockItemId: stock.itemId,
                                      stockItemCode: stock.itemCode,
                                      stockItemName: stock.itemName,
                                    });
                                    setStockSearchTerms((current) => {
                                      const next = { ...current };
                                      delete next[component.id];
                                      return next;
                                    });
                                  }}
                                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-700 last:border-0 hover:bg-blue-50"
                                >
                                  <span className="font-bold">{stock.itemCode} · {stock.itemName}</span>
                                  <span className="block text-[10px] text-slate-500">
                                    {stock.stage} · {stock.color || "sem cor"} / {stock.size || "sem tamanho"} / {stock.variation || "padrão"} · saldo {formatQuantity(stock.quantity)} · {stock.stockEntryId}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          <span className={"mt-1 block text-[11px] font-medium " + (selectedStock ? "text-emerald-700" : component.active ? "text-amber-700" : "text-slate-400")}>
                            {selectedStock
                              ? "Vínculo: " + selectedStock.itemCode + " — " + selectedStock.itemName + " (" + selectedStock.stockEntryId + ")"
                              : component.active
                                ? "Sem vínculo: os lotes mostrarão estoque a informar."
                                : "Componente desativado; não entra no cálculo."}
                          </span>
                          {canManage && component.stockEntryId && (
                            <button
                              type="button"
                              disabled={working === "bom"}
                              onClick={() => {
                                updateBomComponent(index, {
                                  stockEntryId: null,
                                  stockItemId: null,
                                  stockItemCode: "",
                                  stockItemName: "",
                                });
                                setStockSearchTerms((current) => {
                                  const next = { ...current };
                                  delete next[component.id];
                                  return next;
                                });
                              }}
                              className="mt-1 text-[11px] font-bold text-rose-700 hover:underline"
                            >
                              Remover vínculo de estoque
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canManage && (
                <div className="mt-4 flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    onClick={addBomComponent}
                    disabled={working === "bom"}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={16} />
                    Adicionar componente
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveSelectedBom()}
                    disabled={!selectedBom || working === "bom"}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {working === "bom" ? "Salvando…" : "Salvar composição"}
                  </button>
                </div>
              )}
              {!canManage && (
                <p className="mt-4 text-xs text-slate-500">Seu perfil tem acesso de consulta às composições.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            {canManage && (
              <form onSubmit={(event) => void createProductionPlan(event)} className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays size={19} className="text-blue-700" />
                  <h2 className="text-base font-black text-slate-900">Novo lote</h2>
                  <span className="text-xs text-slate-500">· os componentes são copiados da composição salva</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <label className="text-xs font-bold text-slate-500 md:col-span-1">
                    Data prevista
                    <input
                      type="date"
                      value={plannedDate}
                      onChange={(event) => setPlannedDate(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                      required
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-500 md:col-span-3">
                    Observações
                    <input
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      maxLength={2000}
                      placeholder="Notas do lote (opcional)"
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {draftLines.map((line) => (
                    <div key={line.lineId} className="grid grid-cols-1 items-end gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-12">
                      <label className="text-xs font-bold text-slate-500 md:col-span-5">
                        Produto / modelo
                        <select
                          value={line.modelKey}
                          onChange={(event) => updateDraftLine(line.lineId, { modelKey: event.target.value })}
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
                        >
                          {boms.map((bom) => (
                            <option key={bom.modelKey} value={bom.modelKey}>
                              {bom.productName}{dirtyBoms[bom.modelKey] ? " · alterações não salvas" : bom.version <= 0 ? " · composição pendente" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-bold text-slate-500 md:col-span-3">
                        Variante (opcional)
                        <input
                          value={line.variantName}
                          onChange={(event) => updateDraftLine(line.lineId, { variantName: event.target.value })}
                          maxLength={100}
                          placeholder="Cor, acabamento ou referência"
                          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800"
                        />
                      </label>
                      <label className="text-xs font-bold text-slate-500 md:col-span-2">
                        Quantidade
                        <input
                          type="number"
                          min="1"
                          max="100000"
                          step="1"
                          value={line.quantity}
                          onChange={(event) => updateDraftLine(line.lineId, { quantity: Number(event.target.value) })}
                          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800"
                          required
                        />
                      </label>
                      <div className="flex justify-end md:col-span-2">
                        <button
                          type="button"
                          onClick={() => removeDraftLine(line.lineId)}
                          disabled={draftLines.length === 1}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                      {!isBomReady(line.modelKey) && (
                        <p className="md:col-span-12 text-xs font-medium text-amber-800">
                          Salve ou conclua as alterações da composição deste modelo antes de criar o lote.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    onClick={addDraftLine}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={16} />
                    Adicionar produto ao lote
                  </button>
                  <button
                    type="submit"
                    disabled={working === "plan" || draftLines.some((line) => !isBomReady(line.modelKey))}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    <PackageCheck size={16} />
                    {working === "plan" ? "Criando…" : "Criar rascunho"}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
              Lotes podem ser planejados mesmo com déficit. Planejar cria uma reserva lógica sem alterar a quantidade física. A conclusão valida as reservas de outros lotes e só então grava a saída no estoque; uma tentativa repetida não duplica a baixa.
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar lote, modelo ou observação"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800"
                  />
                </div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  De
                  <input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} className="ml-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700" />
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Até
                  <input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} className="ml-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700" />
                </label>
                <select value={filterModel} onChange={(event) => setFilterModel(event.target.value)} aria-label="Filtrar por produto" className="rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-700">
                  <option value="">Todos os produtos</option>
                  {boms.map((bom) => <option key={bom.modelKey} value={bom.modelKey}>{bom.productName}</option>)}
                </select>
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Filtrar por situação" className="rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-700">
                  <option value="">Todas as situações</option>
                  {(["draft", "planned", "in_production", "completed", "cancelled"] as ProductionPlanningStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              </div>

              {filteredPlans.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Nenhum lote corresponde aos filtros.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredPlans.map((plan) => {
                    const materialRows = getMaterialRows(plan, stockItems, reservations);
                    const materialState = getMaterialState(materialRows);
                    const needTotals = aggregateProductionPlanNeeds(plan.bomSnapshot || []);
                    const isWorking = working === "status:" + plan.id;
                    return (
                      <article key={plan.id} className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="flex flex-wrap items-start justify-between gap-3 bg-white p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-black text-slate-900">Lote {plan.id.slice(-8).toUpperCase()}</span>
                              <span className={"rounded-full px-2 py-1 text-[10px] font-black uppercase " + statusClasses(plan.status)}>{statusLabel(plan.status)}</span>
                              <span className={"rounded-full px-2 py-1 text-[10px] font-black uppercase " + materialStateClasses(materialState)}>{materialStateLabel(materialState)}</span>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Previsto para {formatDate(plan.plannedDate)} · {plan.lines.length} produto(s)
                            </p>
                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-800">
                              {plan.lines.map((line) => (
                                <li key={line.lineId}>
                                  {formatQuantity(line.quantity)} × {line.productName}{line.variantName ? " · " + line.variantName : ""}
                                </li>
                              ))}
                            </ul>
                            {plan.notes && <p className="mt-2 text-xs text-slate-600">{plan.notes}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canManage && plan.status === "draft" && (
                              <>
                                <button
                                  type="button"
                                  disabled={isWorking}
                                  onClick={() => editingPlanId === plan.id ? setEditingPlanId(null) : startDraftEdit(plan)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <Pencil size={13} />
                                  {editingPlanId === plan.id ? "Fechar edição" : "Editar rascunho"}
                                </button>
                                <button type="button" disabled={isWorking} onClick={() => void changeStatus(plan, "planned")} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                                  Planejar
                                </button>
                              </>
                            )}
                            {canExecute && plan.status === "planned" && (
                              <button type="button" disabled={isWorking} onClick={() => void changeStatus(plan, "in_production")} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 disabled:opacity-50">
                                Iniciar produção
                              </button>
                            )}
                            {canManage && (plan.status === "planned" || plan.status === "in_production") && (
                              <button type="button" disabled={isWorking} onClick={() => void changeStatus(plan, "completed")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                                Concluir e baixar
                              </button>
                            )}
                            {canManage && (plan.status === "draft" || plan.status === "planned" || plan.status === "in_production") && (
                              <button type="button" disabled={isWorking} onClick={() => void changeStatus(plan, "cancelled")} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-rose-300 hover:text-rose-700 disabled:opacity-50">
                                <XCircle size={14} />
                                Cancelar
                              </button>
                            )}
                            {isWorking && <span className="self-center text-xs text-slate-500">Salvando…</span>}
                          </div>
                        </div>
                        {editingPlanId === plan.id && plan.status === "draft" && (
                          <div className="border-t border-slate-200 bg-white p-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                              <label className="text-xs font-bold text-slate-500">
                                Data prevista
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(event) => setEditDate(event.target.value)}
                                  className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800"
                                />
                              </label>
                              <label className="text-xs font-bold text-slate-500 md:col-span-3">
                                Observações
                                <input
                                  value={editNotes}
                                  maxLength={2000}
                                  onChange={(event) => setEditNotes(event.target.value)}
                                  className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800"
                                />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-col gap-2">
                              {editDraftLines.map((line) => (
                                <div key={line.lineId} className="grid grid-cols-1 items-end gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-12">
                                  <label className="text-xs font-bold text-slate-500 md:col-span-5">
                                    Produto / modelo
                                    <select
                                      value={line.modelKey}
                                      onChange={(event) => updateEditLine(line.lineId, { modelKey: event.target.value })}
                                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
                                    >
                                      {boms.map((bom) => (
                                        <option key={bom.modelKey} value={bom.modelKey}>
                                          {bom.productName}{dirtyBoms[bom.modelKey] ? " · alterações não salvas" : bom.version <= 0 ? " · composição pendente" : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="text-xs font-bold text-slate-500 md:col-span-3">
                                    Variante
                                    <input
                                      value={line.variantName}
                                      maxLength={100}
                                      onChange={(event) => updateEditLine(line.lineId, { variantName: event.target.value })}
                                      className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800"
                                    />
                                  </label>
                                  <label className="text-xs font-bold text-slate-500 md:col-span-2">
                                    Quantidade
                                    <input
                                      type="number"
                                      min="1"
                                      max="100000"
                                      step="1"
                                      value={line.quantity}
                                      onChange={(event) => updateEditLine(line.lineId, { quantity: Number(event.target.value) })}
                                      className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800"
                                    />
                                  </label>
                                  <div className="flex justify-end md:col-span-2">
                                    <button
                                      type="button"
                                      disabled={editDraftLines.length === 1}
                                      onClick={() => removeEditLine(line.lineId)}
                                      className="rounded-md border border-slate-200 px-2 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap justify-between gap-2">
                              <button type="button" onClick={addEditLine} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                <Plus size={15} />
                                Adicionar produto
                              </button>
                              <button
                                type="button"
                                disabled={working === "edit:" + plan.id || editDraftLines.some((line) => !isBomReady(line.modelKey))}
                                onClick={() => void saveDraftChanges(plan.id)}
                                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                              >
                                {working === "edit:" + plan.id ? "Salvando…" : "Salvar alterações"}
                              </button>
                            </div>
                          </div>
                        )}
                        <details className="border-t border-slate-200 bg-slate-50">
                          <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-700">
                            Necessidade e disponibilidade de materiais ({needTotals.size} vínculo(s) de estoque)
                          </summary>
                          <div className="overflow-x-auto px-4 pb-4">
                            <table className="min-w-[780px] w-full border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-left text-[10px] uppercase text-slate-500">
                                  <th className="py-2 pr-3">Componente</th>
                                  <th className="py-2 pr-3 text-right">Necessário</th>
                                  <th className="py-2 pr-3 text-right">Físico</th>
                                  <th className="py-2 pr-3 text-right">Reserva estoque</th>
                                  <th className="py-2 pr-3 text-right">Outros lotes</th>
                                  <th className="py-2 pr-3 text-right">Disponível</th>
                                  <th className="py-2 text-right">Déficit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {materialRows.map((row) => (
                                  <tr key={row.key} className="border-b border-slate-100 last:border-0">
                                    <td className="max-w-[320px] py-2 pr-3 font-medium text-slate-800">{row.label}</td>
                                    <td className="py-2 pr-3 text-right font-bold text-slate-800">{formatQuantity(row.required)}</td>
                                    <td className="py-2 pr-3 text-right text-slate-700">{formatQuantity(row.physical)}</td>
                                    <td className="py-2 pr-3 text-right text-slate-700">{row.unknown ? "—" : formatQuantity(row.stockReserved)}</td>
                                    <td className="py-2 pr-3 text-right text-slate-700">{row.unknown ? "—" : formatQuantity(row.otherPlans)}</td>
                                    <td className="py-2 pr-3 text-right text-slate-700">{formatQuantity(row.available)}</td>
                                    <td className={"py-2 text-right font-bold " + (row.unknown ? "text-amber-700" : (row.deficit || 0) > 0 ? "text-rose-700" : "text-emerald-700")}>
                                      {row.unknown ? "A informar" : formatQuantity(row.deficit)}
                                    </td>
                                  </tr>
                                ))}
                                {materialRows.length === 0 && (
                                  <tr><td colSpan={7} className="py-4 text-center text-slate-500">A composição não possui componentes ativos.</td></tr>
                                )}
                              </tbody>
                            </table>
                            {plan.bomSnapshot?.some((line) => line.bomVersion > 0) && (
                              <p className="mt-2 text-[10px] text-slate-500">
                                Este lote preserva as versões de composição {[
                                  ...new Set(plan.bomSnapshot.map((line) => line.bomVersion)),
                                ].join(", ")}.
                              </p>
                            )}
                          </div>
                        </details>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
