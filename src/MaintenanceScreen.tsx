import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  Plus,
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

function parsePartRequests(value: string): MaintenancePartRequest[] {
  const now = Date.now();
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name = "", quantityText = "1", unitCostText = ""] = line.split(";").map((part) => part.trim());
      const unitCost = Number.parseFloat(unitCostText.replace(",", "."));
      return {
        id: `part_${now}_${index}`,
        name,
        quantity: Math.max(0.01, Number(quantityText.replace(",", ".")) || 1),
        unitCost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : undefined,
        status: "SOLICITADA" as const,
        requestedAt: now,
      };
    })
    .filter((part) => part.name);
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
  const [logFormOrderId, setLogFormOrderId] = useState<string | null>(null);
  const [logDescription, setLogDescription] = useState("");
  const [logPartsInput, setLogPartsInput] = useState("");
  const [logMode, setLogMode] = useState<"EM_ANDAMENTO" | "CONCLUIDO">("EM_ANDAMENTO");
  const [logStartedAt, setLogStartedAt] = useState(() => dateTimeLocalValue(Date.now()));
  const [logDuration, setLogDuration] = useState("");
  const [saving, setSaving] = useState(false);

  const [manualType, setManualType] = useState<ManualRecordType>("SERVICO");
  const [manualMachine, setManualMachine] = useState("");
  const [manualSectorId, setManualSectorId] = useState("");
  const [manualCategory, setManualCategory] = useState<MaintenanceOrder["category"]>("CORRETIVA");
  const [manualDescription, setManualDescription] = useState("");
  const [manualPartsInput, setManualPartsInput] = useState("");
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

  const handleCreateManualRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    const machineName = manualMachine.trim();
    const description = manualDescription.trim();
    const startedAt = new Date(manualStartedAt).getTime();
    const duration = Number(manualDuration);
    if (!machineName || !description || !Number.isFinite(startedAt)) {
      alert("Informe a máquina, a descrição e o horário do registro.");
      return;
    }
    if (!manualIsOngoing && (!Number.isFinite(duration) || duration <= 0)) {
      alert("Informe uma duração válida para o registro concluído.");
      return;
    }

    const sector = sectors.find((item) => String(item.id) === manualSectorId);
    const endedAt = manualIsOngoing ? undefined : startedAt + duration * 60_000;
    const status: MaintenanceOrder["status"] = manualIsOngoing
      ? manualType === "SERVICO" ? "EM_ATENDIMENTO" : "ABERTA"
      : "CONCLUIDA";
    const now = Date.now();
    const parsedParts = manualType === "SERVICO" ? parsePartRequests(manualPartsInput) : [];
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
    const initialLog = manualType === "SERVICO"
      ? {
          technicianId: currentUser.id,
          technicianName: currentUser.name,
          description,
          startedAt,
          endedAt,
          durationMinutes: manualIsOngoing ? undefined : duration,
          status: manualIsOngoing ? "EM_ANDAMENTO" as const : "CONCLUIDO" as const,
          createdAt: now,
          partsRequested: parsedParts,
        }
      : undefined;

    setSaving(true);
    try {
      const orderId = await db.addMaintenanceOrder(order, initialLog);
      setSelectedOrderId(orderId);
      setManualDescription("");
      setManualPartsInput("");
      setManualDuration("");
      setManualStartedAt(dateTimeLocalValue(Date.now()));
      setManualIsOngoing(true);
      setTab(manualIsOngoing ? "FILA" : "HISTORICO");
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar o registro de manutenção.");
    } finally {
      setSaving(false);
    }
  };

  const startOrder = async (order: MaintenanceOrder) => {
    try {
      await db.updateMaintenanceOrder(order.id, {
        status: "EM_ATENDIMENTO",
        technicianId: currentUser.id,
        technicianName: currentUser.name,
        startedAt: order.startedAt || Date.now(),
      });
    } catch (error) {
      console.error(error);
      alert("Não foi possível iniciar o atendimento.");
    }
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

  const saveWorkLog = async (order: MaintenanceOrder, event: React.FormEvent) => {
    event.preventDefault();
    const description = logDescription.trim();
    const duration = Number(logDuration);
    const startedAt = logMode === "EM_ANDAMENTO" ? Date.now() : new Date(logStartedAt).getTime();
    if (!description || !Number.isFinite(startedAt)) {
      alert("Descreva o serviço e informe um horário válido.");
      return;
    }
    if (logMode === "CONCLUIDO" && (!Number.isFinite(duration) || duration <= 0)) {
      alert("Informe a duração do serviço concluído.");
      return;
    }
    const endedAt = logMode === "CONCLUIDO" ? startedAt + duration * 60_000 : undefined;
    setSaving(true);
    try {
      await db.addMaintenanceWorkLog({
        maintenanceOrderId: order.id,
        technicianId: currentUser.id,
        technicianName: currentUser.name,
        description,
        startedAt,
        endedAt,
        durationMinutes: logMode === "CONCLUIDO" ? duration : undefined,
        status: logMode,
        createdAt: Date.now(),
        partsRequested: parsePartRequests(logPartsInput),
      });
      if (order.status === "ABERTA" || order.status === "AGUARDANDO_PECA") {
        await db.updateMaintenanceOrder(order.id, {
          status: "EM_ATENDIMENTO",
          technicianId: currentUser.id,
          technicianName: currentUser.name,
          startedAt: order.startedAt || startedAt,
        });
      }
      setLogDescription("");
      setLogPartsInput("");
      setLogDuration("");
      setLogStartedAt(dateTimeLocalValue(Date.now()));
      setLogMode("EM_ANDAMENTO");
      setLogFormOrderId(null);
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar o apontamento de serviço.");
    } finally {
      setSaving(false);
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
                    onClick={() => void startOrder(order)}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-blue-800"
                  >
                    Assumir atendimento
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
                <button
                  type="button"
                  onClick={() => {
                    setLogFormOrderId(logFormOrderId === order.id ? null : order.id);
                    setLogMode("EM_ANDAMENTO");
                    setLogStartedAt(dateTimeLocalValue(Date.now()));
                  }}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-extrabold text-blue-800 hover:bg-blue-50"
                >
                  Apontar serviço / peças
                </button>
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

            {logFormOrderId === order.id && (
              <form onSubmit={(event) => void saveWorkLog(order, event)} className="space-y-3 rounded-xl border border-blue-200 bg-white p-3">
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input type="radio" checked={logMode === "EM_ANDAMENTO"} onChange={() => setLogMode("EM_ANDAMENTO")} />
                    Estou realizando agora
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input type="radio" checked={logMode === "CONCLUIDO"} onChange={() => setLogMode("CONCLUIDO")} />
                    Registrar serviço realizado
                  </label>
                </div>
                {logMode === "CONCLUIDO" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1 text-[11px] font-bold text-slate-500">
                      Início
                      <input type="datetime-local" value={logStartedAt} onChange={(event) => setLogStartedAt(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700" />
                    </label>
                    <label className="space-y-1 text-[11px] font-bold text-slate-500">
                      Duração (minutos)
                      <input type="number" min="1" required value={logDuration} onChange={(event) => setLogDuration(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700" />
                    </label>
                  </div>
                )}
                <label className="block space-y-1 text-[11px] font-bold text-slate-500">
                  Serviço executado / diagnóstico
                  <textarea required rows={3} value={logDescription} onChange={(event) => setLogDescription(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700" placeholder="Descreva o que foi feito, encontrado ou ainda precisa ser feito." />
                </label>
                <label className="block space-y-1 text-[11px] font-bold text-slate-500">
                  Peças solicitadas (uma por linha: peça; quantidade; custo unitário opcional)
                  <textarea rows={2} value={logPartsInput} onChange={(event) => setLogPartsInput(event.target.value)} className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700" placeholder={"Rolamento 6204; 2; 38,50\nCorreia A42; 1"} />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">
                    {saving ? "Salvando..." : "Salvar apontamento"}
                  </button>
                  <button type="button" onClick={() => setLogFormOrderId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-800"><Wrench size={22} /></div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Manutenção</h1>
            <p className="text-xs text-slate-500">Solicitações de operadores, serviços e histórico por máquina</p>
          </div>
        </div>
      </header>

      <div className="shrink-0 grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6">
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
        <button onClick={() => setTab("FILA")} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === "FILA" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
          Fila de manutenção
        </button>
        <button onClick={() => setTab("NOVO")} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === "NOVO" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
          Novo lançamento manual
        </button>
        <button onClick={() => setTab("HISTORICO")} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === "HISTORICO" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
          Histórico
        </button>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        {tab === "NOVO" ? (
          <form onSubmit={(event) => void handleCreateManualRecord(event)} className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Plus size={18} /> Registrar manualmente</h2>
              <p className="mt-1 text-xs text-slate-500">Este registro pode existir sem uma parada aberta por operador.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Tipo de registro
                <select value={manualType} onChange={(event) => setManualType(event.target.value as ManualRecordType)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800">
                  <option value="SERVICO">Serviço de manutenção</option>
                  <option value="INTERRUPCAO">Interrupção de máquina</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Categoria
                <select value={manualCategory} onChange={(event) => setManualCategory(event.target.value as MaintenanceOrder["category"])} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800">
                  <option value="CORRETIVA">Corretiva</option>
                  <option value="PREVENTIVA">Preventiva</option>
                  <option value="INSPECAO">Inspeção</option>
                  <option value="AJUSTE">Ajuste</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Máquina / equipamento
                <input list="maintenance-machine-options" required value={manualMachine} onChange={(event) => setManualMachine(event.target.value)} placeholder="Selecione ou informe a máquina" className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800" />
              </label>
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Setor
                <select value={manualSectorId} onChange={(event) => setManualSectorId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800">
                  <option value="">Sem setor</option>
                  {sectors.map((sector) => <option key={sector.id} value={String(sector.id)}>{sector.name}</option>)}
                </select>
              </label>
            </div>
            <datalist id="maintenance-machine-options">
              {machines.map((machine) => <option key={machine} value={machine} />)}
            </datalist>

            <label className="block space-y-1 text-xs font-bold text-slate-600">
              Descrição do problema ou serviço
              <textarea required rows={4} value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} placeholder={manualType === "SERVICO" ? "Ex.: troca de rolamento, regulagem, inspeção realizada..." : "Ex.: prensa parada por falha no sensor..."} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800" />
            </label>

            {manualType === "SERVICO" && (
              <label className="block space-y-1 text-xs font-bold text-slate-600">
                Peças solicitadas (uma por linha: peça; quantidade; custo unitário opcional)
                <textarea rows={3} value={manualPartsInput} onChange={(event) => setManualPartsInput(event.target.value)} placeholder={"Rolamento 6204; 2; 38,50\nCorreia A42; 1"} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800" />
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-slate-600">
                Início
                <input type="datetime-local" required value={manualStartedAt} onChange={(event) => setManualStartedAt(event.target.value)} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800" />
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={manualIsOngoing} onChange={(event) => setManualIsOngoing(event.target.checked)} />
                  {manualType === "SERVICO" ? "Serviço ainda em andamento" : "Interrupção ainda em andamento"}
                </label>
                {!manualIsOngoing && (
                  <label className="block space-y-1 text-xs font-bold text-slate-600">
                    Duração (minutos)
                    <input type="number" min="1" required value={manualDuration} onChange={(event) => setManualDuration(event.target.value)} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800" />
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-xs font-extrabold text-white hover:bg-blue-800 disabled:opacity-50">
                {saving ? <><span className="animate-spin"><Clock3 size={15} /></span> Salvando...</> : <><ClipboardList size={15} /> Salvar registro</>}
              </button>
              <p className="text-[11px] text-slate-500">O histórico fica vinculado ao tenant e à máquina informada.</p>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              {tab === "HISTORICO" ? <History size={15} /> : <Wrench size={15} />}
              {tab === "HISTORICO" ? "Serviços e interrupções concluídos" : "Paradas de operadores e atendimentos em andamento"}
            </div>
            {activeList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={28} />
                <p className="text-sm font-bold text-slate-700">{tab === "HISTORICO" ? "Ainda não há registros concluídos." : "A fila de manutenção está vazia."}</p>
                <p className="mt-1 text-xs text-slate-500">As paradas de manutenção e quebra dos operadores aparecem aqui automaticamente.</p>
              </div>
            ) : (
              activeList.map(renderOrderCard)
            )}
          </div>
        )}
      </div>
    </section>
  );
}
