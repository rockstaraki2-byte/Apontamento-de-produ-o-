import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import type {
  MaintenanceOrder,
  MaintenancePartRequest,
  MaintenanceWorkLog,
  User,
} from "./types";
import { useDatabase } from "./useDatabase";

type MaintenanceTab = "FILA" | "NOVO" | "HISTORICO";
type ManualRecordType = "SERVICO" | "INTERRUPCAO";

function dateTimeLocalValue(timestamp: number) {
  const date = new Date(timestamp);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDateTime(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "—";
  return new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(value?: number) {
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}min` : `${remainingMinutes}min`;
}

type PartDraft = {
  id: string;
  name: string;
  quantity: string;
  unitCost: string;
};

function newPartDraft(): PartDraft {
  return {
    id: `part_draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    quantity: "1",
    unitCost: "",
  };
}

function partRequestsFromDrafts(rows: PartDraft[]): MaintenancePartRequest[] {
  const requestedAt = Date.now();
  return rows
    .filter((row) => row.name.trim())
    .map((row, index) => {
      const quantity = Number(row.quantity.replace(",", "."));
      const unitCost = row.unitCost.trim()
        ? Number(row.unitCost.replace(",", "."))
        : undefined;
      return {
        id: `part_${requestedAt}_${index}_${Math.random().toString(36).slice(2, 6)}`,
        name: row.name.trim(),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unitCost: unitCost !== undefined && Number.isFinite(unitCost) && unitCost >= 0
          ? unitCost
          : undefined,
        status: "SOLICITADA" as const,
        requestedAt,
      };
    });
}

function PartRequestFields({
  rows,
  onChange,
}: {
  rows: PartDraft[];
  onChange: React.Dispatch<React.SetStateAction<PartDraft[]>>;
}) {
  const updateRow = (id: string, updates: Partial<PartDraft>) => {
    onChange((current) =>
      current.map((row) => row.id === id ? { ...row, ...updates } : row),
    );
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <legend className="text-sm font-extrabold text-slate-800">Peças solicitadas</legend>
          <p className="mt-1 text-xs text-slate-500">
            Cada peça fica registrada separadamente, com quantidade, custo e status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange((current) => [...current, newPartDraft()])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-extrabold text-blue-800 hover:bg-blue-50"
        >
          <Plus size={14} /> Adicionar peça
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
          Nenhuma peça adicionada. Use “Adicionar peça” para incluir materiais.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,2fr)_minmax(110px,0.8fr)_minmax(140px,1fr)_auto] sm:items-end"
            >
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Peça / material
                <input
                  value={row.name}
                  onChange={(event) => updateRow(row.id, { name: event.target.value })}
                  placeholder="Ex.: Rolamento 6204"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-medium text-slate-800"
                />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Quantidade
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required={Boolean(row.name.trim())}
                  value={row.quantity}
                  onChange={(event) => updateRow(row.id, { quantity: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-medium text-slate-800"
                />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Custo unitário (opcional)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.unitCost}
                  onChange={(event) => updateRow(row.id, { unitCost: event.target.value })}
                  placeholder="R$"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-medium text-slate-800"
                />
              </label>
              <button
                type="button"
                onClick={() => onChange((current) => current.filter((item) => item.id !== row.id))}
                aria-label={`Remover peça ${index + 1}`}
                className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50"
              >
                <Trash2 size={14} /><span className="sm:hidden">Remover</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}


function orderStatusLabel(status: MaintenanceOrder["status"]) {
  if (status === "ABERTA") return "Solicitada";
  if (status === "EM_ATENDIMENTO") return "Em atendimento";
  if (status === "AGUARDANDO_PECA") return "Aguardando peça";
  return "Concluída";
}

function partStatusLabel(status: MaintenancePartRequest["status"]) {
  if (status === "SOLICITADA") return "Solicitada";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "UTILIZADA") return "Utilizada";
  return "Cancelada";
}

export function MaintenanceScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [tab, setTab] = useState<MaintenanceTab>("FILA");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [manualLinkedOrderId, setManualLinkedOrderId] = useState("");
  const [manualType, setManualType] = useState<ManualRecordType>("SERVICO");
  const [manualMachine, setManualMachine] = useState("");
  const [manualSectorId, setManualSectorId] = useState("");
  const [manualCategory, setManualCategory] = useState<MaintenanceOrder["category"]>("CORRETIVA");
  const [manualDescription, setManualDescription] = useState("");
  const [manualPartRows, setManualPartRows] = useState<PartDraft[]>([]);
  const [manualIsOngoing, setManualIsOngoing] = useState(true);
  const [manualStartedAt, setManualStartedAt] = useState(() => dateTimeLocalValue(Date.now()));
  const [manualDuration, setManualDuration] = useState("");

  const machines = useMemo(
    () => [...new Set((db.activeTenant?.machines || []).map((machine) => String(machine).trim()).filter(Boolean))],
    [db.activeTenant?.machines],
  );
  const sectors = useMemo(
    () => (db.sectors || []).filter((sector) => sector.active !== false),
    [db.sectors],
  );
  const orders = useMemo(
    () => [...db.maintenanceOrders].sort((a, b) => b.createdAt - a.createdAt),
    [db.maintenanceOrders],
  );
  const openOrders = orders.filter((order) => order.status !== "CONCLUIDA");
  const historyOrders = orders.filter((order) => order.status === "CONCLUIDA");
  const workLogs = db.maintenanceWorkLogs;

  useEffect(() => {
    if (!manualMachine && machines.length > 0) setManualMachine(machines[0]);
  }, [machines, manualMachine]);
  useEffect(() => {
    if (!manualSectorId && sectors.length > 0) setManualSectorId(String(sectors[0].id));
  }, [sectors, manualSectorId]);

  const downtimeMinutes = orders.reduce(
    (total, order) => total + (order.interruptionDurationMinutes || 0),
    0,
  );
  const laborMinutes = workLogs.reduce((total, log) => {
    if (log.durationMinutes) return total + log.durationMinutes;
    if (log.status === "EM_ANDAMENTO") return total + Math.max(0, (Date.now() - log.startedAt) / 60_000);
    return total;
  }, 0);

  const activeList = tab === "HISTORICO" ? historyOrders : openOrders;
  const selectedOrderForEntry = openOrders.find((order) => order.id === manualLinkedOrderId);


  const handleCreateManualRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    const linkedOrder = manualLinkedOrderId
      ? openOrders.find((order) => order.id === manualLinkedOrderId)
      : undefined;
    const machineName = manualMachine.trim();
    const description = manualDescription.trim();
    const startedAt = new Date(manualStartedAt).getTime();
    const duration = Number(manualDuration);

    if (manualLinkedOrderId && !linkedOrder) {
      alert("Essa solicitação não está mais aberta. Selecione outra ou faça um lançamento manual.");
      return;
    }
    if (!description || !Number.isFinite(startedAt) || (!linkedOrder && !machineName)) {
      alert(linkedOrder
        ? "Informe o serviço realizado e o horário de início."
        : "Informe a máquina, a descrição e o horário do registro.");
      return;
    }
    if (!manualIsOngoing && (!Number.isFinite(duration) || duration <= 0)) {
      alert("Informe uma duração válida para o registro concluído.");
      return;
    }
    const invalidPart = manualType === "SERVICO" && manualPartRows.some((row) => {
      if (!row.name.trim()) return false;
      const quantity = Number(row.quantity.replace(",", "."));
      const unitCost = row.unitCost.trim()
        ? Number(row.unitCost.replace(",", "."))
        : undefined;
      return !Number.isFinite(quantity) || quantity <= 0 ||
        (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0));
    });
    if (invalidPart) {
      alert("Confira a quantidade e o custo unitário das peças.");
      return;
    }

    const sector = sectors.find((item) => String(item.id) === manualSectorId);
    const endedAt = manualIsOngoing ? undefined : startedAt + duration * 60_000;
    const now = Date.now();
    const parsedParts = manualType === "SERVICO"
      ? partRequestsFromDrafts(manualPartRows)
      : [];
    const workLog = {
      technicianId: currentUser.id,
      technicianName: currentUser.name,
      description,
      startedAt,
      endedAt,
      durationMinutes: manualIsOngoing ? undefined : duration,
      status: manualIsOngoing ? "EM_ANDAMENTO" as const : "CONCLUIDO" as const,
      createdAt: now,
      partsRequested: parsedParts,
    };

    setSaving(true);
    try {
      if (linkedOrder) {
        await db.addMaintenanceWorkLog({
          maintenanceOrderId: linkedOrder.id,
          ...workLog,
        });
        await db.updateMaintenanceOrder(linkedOrder.id, {
          status: "EM_ATENDIMENTO",
          technicianId: currentUser.id,
          technicianName: currentUser.name,
          startedAt: linkedOrder.startedAt || startedAt,
        });
        setSelectedOrderId(linkedOrder.id);
        setTab("FILA");
      } else {
        const status: MaintenanceOrder["status"] = manualIsOngoing
          ? manualType === "SERVICO" ? "EM_ATENDIMENTO" : "ABERTA"
          : "CONCLUIDA";
        const order: Omit<MaintenanceOrder, "id" | "tenantId"> = {
          source: "MANUAL",
          recordType: manualType,
          machineName,
          sectorId: sector?.id,
          sectorName: sector?.name,
          category: manualCategory,
          priority: "NORMAL",
          description,
          status,
          createdAt: now,
          requesterId: currentUser.id,
          requesterName: currentUser.name,
          technicianId: currentUser.id,
          technicianName: currentUser.name,
          startedAt,
          completedAt: manualIsOngoing ? undefined : endedAt,
          interruptionStartedAt: manualType === "INTERRUPCAO" ? startedAt : undefined,
          interruptionEndedAt: manualType === "INTERRUPCAO" ? endedAt : undefined,
          interruptionDurationMinutes: manualType === "INTERRUPCAO" && !manualIsOngoing ? duration : undefined,
        };
        const initialWorkLog = manualType === "SERVICO" ? workLog : undefined;
        const orderId = await db.addMaintenanceOrder(order, initialWorkLog);
        setSelectedOrderId(orderId);
        setTab(manualIsOngoing ? "FILA" : "HISTORICO");
      }

      setManualLinkedOrderId("");
      setManualDescription("");
      setManualPartRows([]);
      setManualDuration("");
      setManualStartedAt(dateTimeLocalValue(Date.now()));
      setManualIsOngoing(true);
      setManualType("SERVICO");
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar o registro de manutenção.");
    } finally {
      setSaving(false);
    }
  };

  const openMaintenanceEntry = (order?: MaintenanceOrder) => {
    setManualLinkedOrderId(order?.id || "");
    setManualType("SERVICO");
    setManualDescription("");
    setManualPartRows([]);
    setManualIsOngoing(true);
    setManualStartedAt(dateTimeLocalValue(Date.now()));
    setManualDuration("");
    setTab("NOVO");
  };

  const setOrderStatus = async (order: MaintenanceOrder, status: MaintenanceOrder["status"]) => {
    const activeLogs = workLogs.filter(
      (log) => log.maintenanceOrderId === order.id && log.status === "EM_ANDAMENTO",
    );
    if (status === "CONCLUIDA" && activeLogs.length > 0) {
      alert("Finalize primeiro o apontamento de serviço que ainda está em andamento.");
      return;
    }
    const now = Date.now();
    const isManualInterruption =
      order.source === "MANUAL" &&
      order.recordType === "INTERRUPCAO" &&
      !order.interruptionEndedAt;
    const interruptionStartedAt =
      order.interruptionStartedAt || order.startedAt || order.createdAt;
    try {
      await db.updateMaintenanceOrder(order.id, {
        status,
        technicianId: currentUser.id,
        technicianName: currentUser.name,
        ...(status === "EM_ATENDIMENTO" && !order.startedAt ? { startedAt: now } : {}),
        ...(status === "CONCLUIDA"
          ? {
              completedAt: now,
              ...(isManualInterruption
                ? {
                    interruptionStartedAt,
                    interruptionEndedAt: now,
                    interruptionDurationMinutes: Math.max(
                      0,
                      Math.round((now - interruptionStartedAt) / 60_000),
                    ),
                  }
                : {}),
            }
          : {}),
      });
    } catch (error) {
      console.error(error);
      alert("Não foi possível atualizar a solicitação.");
    }
  };

  const finishWorkLog = async (log: MaintenanceWorkLog) => {
    const endedAt = Date.now();
    try {
      await db.updateMaintenanceWorkLog(log.id, {
        status: "CONCLUIDO",
        endedAt,
        durationMinutes: Math.max(1, Math.round((endedAt - log.startedAt) / 60_000)),
      });
    } catch (error) {
      console.error(error);
      alert("Não foi possível finalizar o apontamento.");
    }
  };

  const updatePartStatus = async (
    log: MaintenanceWorkLog,
    partId: string,
    status: MaintenancePartRequest["status"],
  ) => {
    const partsRequested = (log.partsRequested || []).map((part) =>
      part.id === partId ? { ...part, status } : part,
    );
    try {
      await db.updateMaintenanceWorkLog(log.id, { partsRequested });
    } catch (error) {
      console.error(error);
      alert("Não foi possível atualizar a solicitação da peça.");
    }
  };

  const renderOrderCard = (order: MaintenanceOrder) => {
    const expanded = selectedOrderId === order.id;
    const orderLogs = workLogs
      .filter((log) => log.maintenanceOrderId === order.id)
      .sort((a, b) => a.startedAt - b.startedAt);
    const hasRunningLog = orderLogs.some((log) => log.status === "EM_ANDAMENTO");

    return (
      <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setSelectedOrderId(expanded ? null : order.id)}
          className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-extrabold uppercase text-blue-800">
                {order.source === "PARADA_OPERADOR" ? "Solicitação do operador" : "Lançamento manual"}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                {orderStatusLabel(order.status)}
              </span>
              {order.priority === "ALTA" || order.priority === "URGENTE" ? (
                <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-700">
                  Prioridade {order.priority.toLowerCase()}
                </span>
              ) : null}
            </div>
            <h3 className="truncate text-base font-extrabold text-slate-900">{order.machineName}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{order.description}</p>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">
              {order.sectorName ? order.sectorName + " · " : ""}
              {order.category} · aberta em {formatDateTime(order.createdAt)}
            </p>
          </div>
          <span className="shrink-0 text-xs font-bold text-blue-700">
            {expanded ? "Ocultar detalhes ▲" : "Ver detalhes ▼"}
          </span>
        </button>

        {expanded && (
          <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 p-4">
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <p><strong>Registrado por:</strong> {order.requesterName}</p>
              <p><strong>Atendente:</strong> {order.technicianName || "Ainda não atribuído"}</p>
              <p><strong>Início do serviço:</strong> {formatDateTime(order.startedAt)}</p>
              <p><strong>Máquina liberada:</strong> {formatDateTime(order.interruptionEndedAt)}</p>
              {order.interruptionDurationMinutes !== undefined && (
                <p><strong>Tempo de parada:</strong> {formatMinutes(order.interruptionDurationMinutes)}</p>
              )}
              {order.machineStopId && <p><strong>Parada vinculada:</strong> {order.machineStopId}</p>}
            </div>

            {order.source === "PARADA_OPERADOR" && !order.interruptionEndedAt && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
                A parada de produção ainda está aberta. O operador deve confirmar a liberação da máquina.
              </p>
            )}

            {orderLogs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Serviços e solicitações de peças</h4>
                {orderLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{log.description}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {log.technicianName} · {formatDateTime(log.startedAt)} ·{" "}
                          {log.status === "EM_ANDAMENTO" ? "Em andamento" : formatMinutes(log.durationMinutes)}
                        </p>
                      </div>
                      {log.status === "EM_ANDAMENTO" && (
                        <button
                          type="button"
                          onClick={() => void finishWorkLog(log)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-700"
                        >
                          Finalizar apontamento
                        </button>
                      )}
                    </div>
                    {(log.partsRequested || []).length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2">
                        {(log.partsRequested || []).map((part) => (
                          <div key={part.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-700">
                              {part.name} · {part.quantity}
                              {part.unitCost !== undefined ? " · R$ " + part.unitCost.toFixed(2) + "/un." : ""}
                            </span>
                            <select
                              value={part.status}
                              onChange={(event) => void updatePartStatus(log, part.id, event.target.value as MaintenancePartRequest["status"])}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                            >
                              <option value="SOLICITADA">{partStatusLabel("SOLICITADA")}</option>
                              <option value="ENTREGUE">{partStatusLabel("ENTREGUE")}</option>
                              <option value="UTILIZADA">{partStatusLabel("UTILIZADA")}</option>
                              <option value="CANCELADA">{partStatusLabel("CANCELADA")}</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {order.status !== "CONCLUIDA" && (
              <div className="flex flex-wrap gap-2">
                {order.status === "ABERTA" && (
                  <button
                    type="button"
                    onClick={() => openMaintenanceEntry(order)}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-blue-800"
                  >
                    Iniciar manutenção
                  </button>
                )}
                {order.status === "EM_ATENDIMENTO" && (
                  <button
                    type="button"
                    onClick={() => void setOrderStatus(order, "AGUARDANDO_PECA")}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-800 hover:bg-amber-100"
                  >
                    Aguardar peça
                  </button>
                )}
                {order.status === "AGUARDANDO_PECA" && (
                  <button
                    type="button"
                    onClick={() => void setOrderStatus(order, "EM_ATENDIMENTO")}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-blue-800"
                  >
                    Retomar atendimento
                  </button>
                )}
                {order.status !== "ABERTA" && (
                  <button
                    type="button"
                    onClick={() => openMaintenanceEntry(order)}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-extrabold text-blue-800 hover:bg-blue-50"
                  >
                    Apontar serviço / peças
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void setOrderStatus(order, "CONCLUIDA")}
                  disabled={hasRunningLog}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Concluir atendimento
                </button>
              </div>
            )}


          </div>
        )}
      </article>
    );
  };

  if (tab === "NOVO") {
    return (
      <section className="flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-800">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTab("FILA")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Voltar para a manutenção"
            >
              <ArrowLeft size={19} />
            </button>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-800"><Wrench size={21} /></div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">Iniciar manutenção</h1>
              <p className="text-xs text-slate-500">Registre o atendimento, um serviço avulso ou uma interrupção.</p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <form onSubmit={(event) => void handleCreateManualRecord(event)} className="mx-auto w-full max-w-4xl space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900">Dados do apontamento</h2>
              <p className="mt-1 text-xs text-slate-500">
                Informe cada dado em seu próprio campo. Os registros ficam vinculados à manutenção e ao tenant ativo.
              </p>
            </div>

            <label className="block space-y-1.5 text-xs font-bold text-slate-600">
              Solicitação de operador (opcional)
              <select
                value={manualLinkedOrderId}
                onChange={(event) => {
                  setManualLinkedOrderId(event.target.value);
                  if (event.target.value) setManualType("SERVICO");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
              >
                <option value="">Lançamento manual, sem chamado</option>
                {openOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.machineName} · {order.description.slice(0, 90)}
                  </option>
                ))}
              </select>
              <span className="block font-normal text-slate-500">
                Vincule o serviço a uma parada já aberta ou deixe em branco para registrar um trabalho avulso.
              </span>
            </label>

            {manualLinkedOrderId && selectedOrderForEntry ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-blue-800">
                    Solicitação vinculada
                  </span>
                  <span className="text-xs font-bold text-slate-600">{selectedOrderForEntry.sectorName || "Sem setor"}</span>
                </div>
                <p className="mt-2 text-sm font-extrabold text-slate-900">{selectedOrderForEntry.machineName}</p>
                <p className="mt-1 text-sm text-slate-700">{selectedOrderForEntry.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Aberta por {selectedOrderForEntry.requesterName} · {formatDateTime(selectedOrderForEntry.createdAt)}
                </p>
              </div>
            ) : null}

            {manualLinkedOrderId && !selectedOrderForEntry && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
                Essa solicitação não está mais disponível. Selecione outra ou escolha um lançamento sem chamado.
              </p>
            )}

            {!selectedOrderForEntry && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-bold text-slate-600">
                  Tipo de registro
                  <select
                    value={manualType}
                    onChange={(event) => {
                      const nextType = event.target.value as ManualRecordType;
                      setManualType(nextType);
                      if (nextType === "INTERRUPCAO") setManualPartRows([]);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
                  >
                    <option value="SERVICO">Serviço de manutenção</option>
                    <option value="INTERRUPCAO">Interrupção de máquina</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-bold text-slate-600">
                  Categoria
                  <select
                    value={manualCategory}
                    onChange={(event) => setManualCategory(event.target.value as MaintenanceOrder["category"])}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
                  >
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="INSPECAO">Inspeção</option>
                    <option value="AJUSTE">Ajuste</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-bold text-slate-600">
                  Máquina / equipamento
                  <input
                    list="maintenance-machine-options"
                    required
                    value={manualMachine}
                    onChange={(event) => setManualMachine(event.target.value)}
                    placeholder="Selecione ou informe a máquina"
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-slate-600">
                  Setor
                  <select
                    value={manualSectorId}
                    onChange={(event) => setManualSectorId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
                  >
                    <option value="">Sem setor</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={String(sector.id)}>{sector.name}</option>
                    ))}
                  </select>
                </label>
                <datalist id="maintenance-machine-options">
                  {machines.map((machine) => <option key={machine} value={machine} />)}
                </datalist>
              </div>
            )}

            <label className="block space-y-1.5 text-xs font-bold text-slate-600">
              {selectedOrderForEntry
                ? "Serviço executado / diagnóstico"
                : manualType === "SERVICO"
                  ? "Descrição do serviço"
                  : "Descrição da interrupção"}
              <textarea
                required
                rows={5}
                value={manualDescription}
                onChange={(event) => setManualDescription(event.target.value)}
                placeholder={selectedOrderForEntry
                  ? "Descreva o que foi feito nesta etapa do atendimento."
                  : manualType === "SERVICO"
                    ? "Ex.: troca de rolamento, regulagem ou inspeção realizada..."
                    : "Ex.: máquina parada por falha no sensor..."}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800"
              />
            </label>

            {(selectedOrderForEntry || manualType === "SERVICO") && (
              <PartRequestFields rows={manualPartRows} onChange={setManualPartRows} />
            )}

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2 sm:p-4">
              <label className="space-y-1.5 text-xs font-bold text-slate-600">
                Início
                <input
                  type="datetime-local"
                  required
                  value={manualStartedAt}
                  onChange={(event) => setManualStartedAt(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
                />
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={manualIsOngoing}
                    onChange={(event) => setManualIsOngoing(event.target.checked)}
                  />
                  {selectedOrderForEntry || manualType === "SERVICO"
                    ? "Serviço ainda em andamento"
                    : "Interrupção ainda em andamento"}
                </label>
                {!manualIsOngoing && (
                  <label className="block space-y-1.5 text-xs font-bold text-slate-600">
                    Duração (minutos)
                    <input
                      type="number"
                      min="1"
                      required
                      value={manualDuration}
                      onChange={(event) => setManualDuration(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {saving
                  ? <><span className="animate-spin"><Clock3 size={16} /></span> Salvando...</>
                  : <><ClipboardList size={16} /> {selectedOrderForEntry ? "Registrar apontamento" : "Salvar manutenção"}</>}
              </button>
              <button
                type="button"
                onClick={() => setTab("FILA")}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-800"><Wrench size={22} /></div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Manutenção</h1>
              <p className="text-xs text-slate-500">Solicitações, serviços e histórico por máquina</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openMaintenanceEntry()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-800 sm:w-auto"
          >
            <Plus size={17} /> Iniciar manutenção
          </button>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6">
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><AlertTriangle size={15} className="text-amber-600" /> Solicitações abertas</div>
          <p className="mt-2 text-2xl font-black text-slate-900">{openOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Clock3 size={15} className="text-blue-700" /> Tempo de serviço apontado</div>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatMinutes(laborMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Activity size={15} className="text-rose-600" /> Tempo de máquina parada</div>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatMinutes(downtimeMinutes)}</p>
        </div>
      </div>

      <nav className="shrink-0 flex flex-wrap gap-2 px-4 pb-3 sm:px-6">
        <button
          onClick={() => setTab("FILA")}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === "FILA" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
        >
          Fila de manutenção
        </button>
        <button
          onClick={() => setTab("HISTORICO")}
          className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === "HISTORICO" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
        >
          Histórico
        </button>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            {tab === "HISTORICO" ? <History size={15} /> : <Wrench size={15} />}
            {tab === "HISTORICO" ? "Serviços e interrupções concluídos" : "Paradas de operadores e atendimentos em andamento"}
          </div>
          {activeList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={28} />
              <p className="text-sm font-bold text-slate-700">
                {tab === "HISTORICO" ? "Ainda não há registros concluídos." : "A fila de manutenção está vazia."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {tab === "HISTORICO"
                  ? "Os atendimentos concluídos ficam disponíveis neste histórico."
                  : "Paradas de manutenção e quebra dos operadores aparecem aqui automaticamente."}
              </p>
              {tab === "FILA" && (
                <button
                  type="button"
                  onClick={() => openMaintenanceEntry()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-800"
                >
                  <Plus size={15} /> Iniciar manutenção manual
                </button>
              )}
            </div>
          ) : (
            activeList.map(renderOrderCard)
          )}
        </div>
      </div>
    </section>
  );
}
}
