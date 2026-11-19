import React, { useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Pencil, Plus, Wrench } from "lucide-react";
import type { MaintenanceAsset, MaintenanceOrder, PreventiveMaintenancePlan, PreventivePlanStatus, User } from "./types";
import { useDatabase } from "./useDatabase";
import { businessDateFromTimestamp, getPreventivePlanStatus } from "./maintenancePreventive";

type Props = {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
  onBack: () => void;
  onViewQueue: () => void;
  onOpenOrder: (order: MaintenanceOrder) => void;
};

const DEFAULT_ALERT_DAYS = [7, 3, 1, 0];

function dateLabel(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join("/")
    : "Sem data-base";
}

function statusLabel(status: PreventivePlanStatus) {
  const labels: Record<PreventivePlanStatus, string> = {
    EM_DIA: "Em dia",
    A_VENCER: "A vencer",
    VENCE_HOJE: "Vence hoje",
    VENCIDA: "Vencida",
    EM_EXECUCAO: "Em execução",
    PRIMEIRA_PENDENTE: "1ª execução pendente",
  };
  return labels[status];
}

function statusClass(status: PreventivePlanStatus) {
  if (status === "EM_DIA") return "bg-emerald-100 text-emerald-800";
  if (status === "A_VENCER") return "bg-amber-100 text-amber-900";
  if (status === "VENCE_HOJE" || status === "VENCIDA") return "bg-rose-100 text-rose-800";
  if (status === "EM_EXECUCAO") return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

function formatInterval(plan: Pick<PreventiveMaintenancePlan, "intervalValue" | "intervalUnit">) {
  const unit = plan.intervalUnit === "MONTHS"
    ? (plan.intervalValue === 1 ? "mês" : "meses")
    : (plan.intervalValue === 1 ? "dia" : "dias");
  return "A cada " + plan.intervalValue + " " + unit;
}

export function PreventiveMaintenanceTab({ db, currentUser, onBack, onViewQueue, onOpenOrder }: Props) {
  const tenantId = db.activeTenant?.id;
  const canManage = ["MANUTENCAO", "ADMIN", "GERENCIA"].includes(currentUser.role);
  const today = businessDateFromTimestamp(Date.now());
  const assets = useMemo(
    () => db.maintenanceAssets.filter((asset) => asset.tenantId === tenantId),
    [db.maintenanceAssets, tenantId],
  );
  const plans = useMemo(
    () => db.preventiveMaintenancePlans.filter((plan) => plan.tenantId === tenantId),
    [db.preventiveMaintenancePlans, tenantId],
  );
  const sectors = useMemo(
    () => db.sectors.filter((sector) => sector.active !== false),
    [db.sectors, tenantId],
  );
  const tenantUsers = useMemo(
    () => db.users.filter((user) => user.tenantId === tenantId && user.role !== "LEITURA"),
    [db.users, tenantId],
  );

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetSectorId, setAssetSectorId] = useState("");
  const [planAssetId, setPlanAssetId] = useState("");
  const [activity, setActivity] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [intervalValue, setIntervalValue] = useState("15");
  const [intervalUnit, setIntervalUnit] = useState<"DAYS" | "MONTHS">("DAYS");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [alertLeadDays, setAlertLeadDays] = useState("7, 3, 1, 0");
  const [instructions, setInstructions] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [filterAssetId, setFilterAssetId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterResponsibleId, setFilterResponsibleId] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  const activeAssets = assets.filter((asset) => asset.active);
  const enrichedPlans = plans.map((plan) => {
    const asset = assets.find((item) => item.id === plan.assetId);
    const openOrder = db.maintenanceOrders.find(
      (order) => order.tenantId === tenantId &&
        order.preventivePlanId === plan.id &&
        order.status !== "CONCLUIDA",
    );
    return {
      plan,
      assetName: asset?.name || plan.assetName,
      openOrder,
      status: getPreventivePlanStatus(plan, today, Boolean(openOrder)),
    };
  });
  const activePlanRows = enrichedPlans.filter(({ plan }) => plan.active);
  const counts = activePlanRows.reduce<Record<PreventivePlanStatus, number>>(
    (result, row) => {
      result[row.status] += 1;
      return result;
    },
    { EM_DIA: 0, A_VENCER: 0, VENCE_HOJE: 0, VENCIDA: 0, EM_EXECUCAO: 0, PRIMEIRA_PENDENTE: 0 },
  );
  const filteredPlans = enrichedPlans
    .filter(({ plan, assetName: name, status }) => {
      if (!plan.active) return false;
      if (filterAssetId && plan.assetId !== filterAssetId) return false;
      if (filterStatus && status !== filterStatus) return false;
      if (filterResponsibleId && plan.responsibleUserId !== filterResponsibleId) return false;
      if (periodFrom && (!plan.nextDueDate || plan.nextDueDate < periodFrom)) return false;
      if (periodTo && (!plan.nextDueDate || plan.nextDueDate > periodTo)) return false;
      return Boolean(name);
    })
    .sort((a, b) => (a.plan.nextDueDate || "9999-12-31").localeCompare(b.plan.nextDueDate || "9999-12-31"));

  const resetPlanForm = () => {
    setShowPlanForm(false);
    setEditingPlanId("");
    setPlanAssetId("");
    setActivity("");
    setResponsibleUserId("");
    setIntervalValue("15");
    setIntervalUnit("DAYS");
    setFirstDueDate("");
    setAlertLeadDays(DEFAULT_ALERT_DAYS.join(", "));
    setInstructions("");
    setChecklistText("");
  };

  const editPlan = (plan: PreventiveMaintenancePlan) => {
    setEditingPlanId(plan.id);
    setPlanAssetId(plan.assetId);
    setActivity(plan.activity);
    setResponsibleUserId(plan.responsibleUserId || "");
    setIntervalValue(String(plan.intervalValue));
    setIntervalUnit(plan.intervalUnit);
    setFirstDueDate(plan.lastCompletedDate ? "" : plan.firstDueDate || plan.nextDueDate || "");
    setAlertLeadDays((plan.alertLeadDays || DEFAULT_ALERT_DAYS).join(", "));
    setInstructions(plan.instructions || "");
    setChecklistText((plan.checklist || []).join("\n"));
    setShowPlanForm(true);
  };

  const saveAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    const name = assetName.trim();
    if (!name) return;
    const sector = sectors.find((item) => String(item.id) === assetSectorId);
    const now = Date.now();
    setSaving(true);
    try {
      await db.addMaintenanceAsset({
        name,
        sectorId: sector?.id,
        sectorName: sector?.name,
        active: true,
        createdAt: now,
        updatedAt: now,
        createdById: currentUser.id,
        createdByName: currentUser.name,
      });
      setAssetName("");
      setAssetSectorId("");
      setShowAssetForm(false);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Não foi possível cadastrar o equipamento.");
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    const asset = activeAssets.find((item) => item.id === planAssetId);
    const interval = Number(intervalValue);
    if (!asset || !activity.trim() || !Number.isInteger(interval) || interval <= 0) {
      alert("Selecione o equipamento, descreva a atividade e informe uma periodicidade inteira positiva.");
      return;
    }
    if (firstDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
      alert("Informe a data da primeira execução no formato válido.");
      return;
    }
    const responsible = tenantUsers.find((user) => user.id === responsibleUserId);
    const sector = sectors.find((item) => String(item.id) === String(asset.sectorId));
    const existing = plans.find((plan) => plan.id === editingPlanId);
    const alertDays = [...new Set(alertLeadDays.split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0))]
      .sort((a, b) => b - a);
    if (alertDays.length === 0) {
      alert("Informe pelo menos um alerta em dias, por exemplo: 7, 3, 1, 0.");
      return;
    }
    const now = Date.now();
    const plan: Omit<PreventiveMaintenancePlan, "id" | "tenantId"> = {
      assetId: asset.id,
      assetName: asset.name,
      sectorId: asset.sectorId,
      sectorName: asset.sectorName || sector?.name,
      activity: activity.trim(),
      responsibleUserId: responsible?.id,
      responsibleUserName: responsible?.name,
      intervalValue: interval,
      intervalUnit,
      firstDueDate: existing?.lastCompletedDate ? existing.firstDueDate : (firstDueDate || undefined),
      lastCompletedDate: existing?.lastCompletedDate,
      nextDueDate: existing?.lastCompletedDate ? existing.nextDueDate : (firstDueDate || undefined),
      alertLeadDays: alertDays,
      instructions: instructions.trim() || undefined,
      checklist: checklistText.split("\n").map((item) => item.trim()).filter(Boolean),
      active: existing?.active ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      createdById: existing?.createdById || currentUser.id,
      createdByName: existing?.createdByName || currentUser.name,
    };
    setSaving(true);
    try {
      if (existing) {
        await db.updatePreventiveMaintenancePlan(existing.id, plan);
      } else {
        await db.addPreventiveMaintenancePlan(plan);
      }
      resetPlanForm();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Não foi possível salvar o plano preventivo.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAsset = async (asset: MaintenanceAsset) => {
    if (!canManage) return;
    if (asset.active && plans.some((plan) => plan.assetId === asset.id && plan.active)) {
      alert("Desative os planos preventivos vinculados antes de desativar este equipamento.");
      return;
    }
    try {
      await db.updateMaintenanceAsset(asset.id, { active: !asset.active, updatedAt: Date.now() });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível atualizar o equipamento.");
    }
  };

  const togglePlan = async (plan: PreventiveMaintenancePlan) => {
    if (!canManage) return;
    try {
      await db.updatePreventiveMaintenancePlan(plan.id, { active: !plan.active, updatedAt: Date.now() });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível atualizar o plano.");
    }
  };

  const startPlan = async (plan: PreventiveMaintenancePlan) => {
    setSaving(true);
    try {
      await db.startPreventiveMaintenance(plan.id, currentUser);
      onViewQueue();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Não foi possível iniciar a OS preventiva.");
    } finally {
      setSaving(false);
    }
  };

  const eligibleAssets = assets.filter((asset) => asset.active || asset.id === planAssetId);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-blue-700">
              <ArrowLeft size={15} /> Voltar à manutenção
            </button>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><CalendarClock size={21} /> Preventivas</h2>
            <p className="mt-1 text-sm text-slate-500">Planos recorrentes, vencimentos e histórico real por equipamento.</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowAssetForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-700">
                <Wrench size={15} /> Equipamentos
              </button>
              <button type="button" onClick={() => { resetPlanForm(); setShowPlanForm(true); }} disabled={activeAssets.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
                <Plus size={15} /> Novo plano
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {([
            ["EM_EXECUCAO", "Em execução", counts.EM_EXECUCAO],
            ["VENCIDA", "Vencidas", counts.VENCIDA],
            ["VENCE_HOJE", "Vence hoje", counts.VENCE_HOJE],
            ["A_VENCER", "A vencer", counts.A_VENCER],
            ["EM_DIA", "Em dia", counts.EM_DIA],
            ["PRIMEIRA_PENDENTE", "1ª execução pendente", counts.PRIMEIRA_PENDENTE],
          ] as Array<[PreventivePlanStatus, string, number]>).map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setFilterStatus(filterStatus === key ? "" : key)} className={`rounded-xl border bg-white p-3 text-left shadow-sm ${filterStatus === key ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
              <span className="block text-[11px] font-bold text-slate-500">{label}</span>
              <strong className="mt-1 block text-xl font-black text-slate-900">{count}</strong>
            </button>
          ))}
        </div>

        {tenantId === "imperio" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
            Os planos iniciais de compressores e chillers ficam pendentes até cadastrar cada equipamento e confirmar a data real da última execução. Nenhum histórico ou vencimento foi presumido.
          </div>
        )}

        {showAssetForm && canManage && (
          <form onSubmit={saveAsset} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-extrabold text-slate-900">Cadastrar equipamento</h3>
              <p className="text-xs text-slate-500">O cadastro cria um identificador estável dentro desta empresa.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <label className="space-y-1 text-xs font-bold text-slate-600">Equipamento
                <input required value={assetName} onChange={(event) => setAssetName(event.target.value)} list="maintenance-asset-suggestions" placeholder="Ex.: Compressor da pintura" className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-medium text-slate-800" />
                <datalist id="maintenance-asset-suggestions">{(db.activeTenant?.machines || []).map((name, index) => <option key={String(name) + index} value={name} />)}</datalist>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Setor
                <select value={assetSectorId} onChange={(event) => setAssetSectorId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-800">
                  <option value="">Sem setor</option>
                  {sectors.map((sector) => <option key={sector.id} value={String(sector.id)}>{sector.name}</option>)}
                </select>
              </label>
              <button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar equipamento"}</button>
            </div>
            {assets.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {assets.map((asset) => (
                  <span key={asset.id} className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className={asset.active ? "font-bold text-slate-700" : "text-slate-400 line-through"}>{asset.name}{asset.sectorName ? " · " + asset.sectorName : ""}</span>
                    <button type="button" onClick={() => void toggleAsset(asset)} className="font-bold text-blue-700">{asset.active ? "Desativar" : "Reativar"}</button>
                  </span>
                ))}
              </div>
            )}
          </form>
        )}

        {showPlanForm && canManage && (
          <form onSubmit={savePlan} className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900">{editingPlanId ? "Editar plano preventivo" : "Novo plano preventivo"}</h3>
                <p className="mt-1 text-xs text-slate-500">A criação não conclui nem registra execução. A primeira data é opcional.</p>
              </div>
              <button type="button" onClick={resetPlanForm} className="text-xs font-bold text-slate-500">Cancelar</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-slate-600">Equipamento
                <select required value={planAssetId} onChange={(event) => setPlanAssetId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-800">
                  <option value="">Selecione</option>
                  {eligibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Responsável
                <select value={responsibleUserId} onChange={(event) => setResponsibleUserId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-800">
                  <option value="">Sem responsável definido</option>
                  {tenantUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">Atividade
                <input required value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Ex.: trocar água do chiller" className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Periodicidade
                <input required type="number" min="1" step="1" value={intervalValue} onChange={(event) => setIntervalValue(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Unidade
                <select value={intervalUnit} onChange={(event) => setIntervalUnit(event.target.value as "DAYS" | "MONTHS")} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-800">
                  <option value="DAYS">Dias corridos</option>
                  <option value="MONTHS">Meses de calendário</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Primeiro vencimento / data-base
                <input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} disabled={Boolean(plans.find((plan) => plan.id === editingPlanId)?.lastCompletedDate)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800 disabled:bg-slate-100" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">Alertar com antecedência (dias)
                <input value={alertLeadDays} onChange={(event) => setAlertLeadDays(event.target.value)} placeholder="7, 3, 1, 0" className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">Instruções de execução
                <textarea rows={2} value={instructions} onChange={(event) => setInstructions(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">Checklist (um item por linha)
                <textarea rows={3} value={checklistText} onChange={(event) => setChecklistText(event.target.value)} placeholder="Inspecionar conexões\nRegistrar condição final" className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-800" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{saving ? "Salvando..." : editingPlanId ? "Salvar alterações" : "Cadastrar plano"}</button>
              <span className="text-xs text-slate-500">Exemplo de alertas: 7, 3, 1 e no vencimento.</span>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="min-w-[160px] flex-1 space-y-1 text-[11px] font-bold text-slate-600">Equipamento
            <select value={filterAssetId} onChange={(event) => setFilterAssetId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800">
              <option value="">Todos</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
          </label>
          <label className="min-w-[130px] flex-1 space-y-1 text-[11px] font-bold text-slate-600">Situação
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800">
              <option value="">Todas</option>
              <option value="EM_EXECUCAO">Em execução</option>
              <option value="VENCIDA">Vencidas</option>
              <option value="VENCE_HOJE">Vence hoje</option>
              <option value="A_VENCER">A vencer</option>
              <option value="EM_DIA">Em dia</option>
              <option value="PRIMEIRA_PENDENTE">1ª execução pendente</option>
            </select>
          </label>
          <label className="min-w-[150px] flex-1 space-y-1 text-[11px] font-bold text-slate-600">Responsável
            <select value={filterResponsibleId} onChange={(event) => setFilterResponsibleId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800">
              <option value="">Todos</option>
              {tenantUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-[11px] font-bold text-slate-600">Vence de
            <input type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} className="block rounded-lg border border-slate-200 p-2 text-xs text-slate-800" />
          </label>
          <label className="space-y-1 text-[11px] font-bold text-slate-600">até
            <input type="date" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} className="block rounded-lg border border-slate-200 p-2 text-xs text-slate-800" />
          </label>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={25} />
            <p className="text-sm font-bold text-slate-700">{plans.length ? "Nenhum plano encontrado para esses filtros." : "Nenhum plano preventivo cadastrado."}</p>
            <p className="mt-1 text-xs text-slate-500">Cadastre o equipamento e a atividade quando os dados reais estiverem confirmados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map(({ plan, assetName: name, openOrder, status }) => (
              <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900">{name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClass(status)}`}>{statusLabel(status)}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{plan.activity}</p>
                    <p className="mt-1 text-xs text-slate-500">{plan.sectorName || "Sem setor"} · {formatInterval(plan)} · Responsável: {plan.responsibleUserName || "Não definido"}</p>
                    <p className="mt-1 text-xs text-slate-500">Próximo vencimento: <strong className="text-slate-700">{dateLabel(plan.nextDueDate)}</strong> · Última execução real: {dateLabel(plan.lastCompletedDate)}</p>
                    {plan.instructions && <p className="mt-2 text-xs text-slate-600">{plan.instructions}</p>}
                    {plan.checklist?.length ? <ul className="mt-2 list-inside list-disc text-xs text-slate-600">{plan.checklist.map((item, index) => <li key={plan.id + "_check_" + index}>{item}</li>)}</ul> : null}
                    {openOrder && <p className="mt-2 text-xs font-bold text-blue-700">OS em andamento desde {new Date(openOrder.createdAt).toLocaleDateString("pt-BR")} · {openOrder.status.replace(/_/g, " ").toLowerCase()}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canManage && openOrder && <button type="button" onClick={() => onOpenOrder(openOrder)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-extrabold text-blue-800"><ClipboardList size={14} /> Retomar OS</button>}
                    {canManage && !openOrder && <button type="button" disabled={saving} onClick={() => void startPlan(plan)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"><Wrench size={14} /> Iniciar OS</button>}
                    {canManage && <button type="button" onClick={() => editPlan(plan)} aria-label="Editar plano" className="rounded-lg border border-slate-200 p-2 text-slate-600"><Pencil size={14} /></button>}
                    {canManage && <button type="button" onClick={() => void togglePlan(plan)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">{plan.active ? "Desativar" : "Reativar"}</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
