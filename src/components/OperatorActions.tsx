import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  Trash2, 
  Clock, 
  Plus, 
  AlertTriangle, 
  X, 
  Play, 
  Square, 
  History,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import type { useDatabase } from "../useDatabase";
import type { User, TornoEvent, MachineStop } from "../types";

// Helper to format duration in milliseconds to HH:MM:SS
function formatDuration(ms: number): string {
  const totSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totSec / 3600);
  const mins = Math.floor((totSec % 3600) / 60);
  const secs = totSec % 60;
  return [
    hrs.toString().padStart(2, "0"),
    mins.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0")
  ].join(":");
}

/* ==========================================================================
   1. TornoActionsWidget (Regulation and Cleaning for Torno Operator)
   ========================================================================== */
export function TornoActionsWidget({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"REGULAGEM" | "LIMPEZA">("REGULAGEM");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter events logged by this specific operator
  const myEvents = db.tornoEvents
    .filter((e) => e.operatorId === currentUser.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Por favor, preencha a descrição do apontamento.");
      return;
    }

    try {
      setLoading(true);
      await db.addTornoEvent({
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        type,
        description: description.trim(),
        timestamp: Date.now(),
      });
      setDescription("");
      alert("Apontamento registrado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar apontamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm shrink-0 overflow-hidden font-sans">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-bold text-slate-800 text-xs sm:text-sm">
            Apontamentos de Regulagem & Limpeza do Torno
          </span>
        </div>
        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-full shrink-0">
          {isOpen ? "Ocultar ▴" : "Ver / Inserir ▾"}
        </span>
      </div>

      {isOpen && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-3.5 mb-5 bg-white p-3.5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Novo Apontamento do Torno
            </h4>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("REGULAGEM")}
                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition ${
                  type === "REGULAGEM"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ⚙️ Regulagem de Torno
              </button>
              <button
                type="button"
                onClick={() => setType("LIMPEZA")}
                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition ${
                  type === "LIMPEZA"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                🧹 Limpeza / Organização
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">Descrição do Trabalho Realizado</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === "REGULAGEM"
                    ? "Ex: Setado novo molde de fresagem para parafusos sextavados de 12mm..."
                    : "Ex: Limpeza de limalhas da cuba principal e aspersão do lubrificante de rolamentos..."
                }
                rows={3}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "Gravando..." : "Salvar Apontamento"}
            </button>
          </form>

          {/* Past logs */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Seus Últimos Apontamentos ({myEvents.length})
            </h4>

            {myEvents.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2 pl-1">Nenhum apontamento registrado hoje.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {myEvents.map((evt) => (
                  <div key={evt.id} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs text-sans">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        evt.type === "REGULAGEM" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {evt.type === "REGULAGEM" ? "⚙️ REGULAGEM" : "🧹 LIMPEZA"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(evt.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-3">{evt.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* ==========================================================================
   2. MachineStopWidget (Downtime Management with Live Timer for all operators)
   ========================================================================== */
export function MachineStopWidget({
  db,
  currentUser,
  machineName = currentUser.name,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
  machineName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<"MANUTENÇÃO" | "QUEBRA" | "OUTRO">("MANUTENÇÃO");
  const [otherReason, setOtherReason] = useState("");
  const [manualDuration, setManualDuration] = useState<number | "">("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [timerState, setTimerState] = useState<{ active: boolean; startTime: number | null }>({
    active: false,
    startTime: null,
  });
  const [elapsedMs, setElapsedMs] = useState(0);

  // Identify active stop for this machine from db
  const myStops = db.machineStops
    .filter((s) => s.operatorId === currentUser.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const activeStop = db.machineStops.find(
    (s) => s.operatorId === currentUser.id && s.status === "ATIVO"
  );

  // Side Effect to read activeStop state and sync stopwatch
  useEffect(() => {
    if (activeStop) {
      setTimerState({
        active: true,
        startTime: activeStop.timestamp,
      });
      setElapsedMs(Date.now() - activeStop.timestamp);
    } else {
      setTimerState({
        active: false,
        startTime: null,
      });
      setElapsedMs(0);
    }
  }, [activeStop]);

  // Running timer ticker
  useEffect(() => {
    let interval: any = null;
    if (timerState.active && timerState.startTime) {
      interval = setInterval(() => {
        setElapsedMs(Date.now() - (timerState.startTime as number));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerState]);

  const handleStartStop = async () => {
    if (activeStop) return; // already active

    let customReasonText = "";
    if (reason === "OUTRO") {
      customReasonText = otherReason.trim();
      if (!customReasonText) {
        alert("Por favor, indique o motivo da parada.");
        return;
      }
    }

    try {
      await db.addMachineStop({
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        role: currentUser.role,
        machineName: machineName || currentUser.role,
        reason,
        otherReasonDescription: customReasonText || undefined,
        timestamp: Date.now(),
        durationMinutes: 0,
        status: "ATIVO",
      });
      setOtherReason("");
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar parada de máquina.");
    }
  };

  const handleEndStop = async () => {
    if (!activeStop) return;

    const durationMinutes = Math.max(1, Math.round(elapsedMs / (1000 * 60)));
    const confirmStop = window.confirm(
      `Deseja finalizar a parada de máquina?\n\nDuração estimada: ${durationMinutes} min.`
    );
    if (!confirmStop) return;

    try {
      await db.updateMachineStop(activeStop.id, {
        status: "RESOLVIDO",
        durationMinutes,
        resolvedAt: Date.now(),
      });
      alert("Parada finalizada e registrada no histórico!");
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar parada de máquina.");
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDuration || Number(manualDuration) <= 0) {
      alert("Informe uma duração válida maior que zero.");
      return;
    }

    let customReasonText = "";
    if (reason === "OUTRO") {
      customReasonText = otherReason.trim();
      if (!customReasonText) {
        alert("Por favor, especifique o motivo.");
        return;
      }
    }

    let parsedTimestamp = Date.now();
    if (manualDate && manualTime) {
      parsedTimestamp = new Date(`${manualDate}T${manualTime}`).getTime();
    }

    try {
      await db.addMachineStop({
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        role: currentUser.role,
        machineName: machineName || currentUser.role,
        reason,
        otherReasonDescription: customReasonText || undefined,
        timestamp: parsedTimestamp,
        durationMinutes: Number(manualDuration),
        status: "RESOLVIDO",
        resolvedAt: parsedTimestamp + Number(manualDuration) * 60 * 1000,
      });

      setManualDuration("");
      setOtherReason("");
      setShowManualForm(false);
      alert("Parada histórica registrada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar parada manual.");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm shrink-0 overflow-hidden font-sans">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 transition ${
          activeStop ? "bg-red-50 hover:bg-red-50/80 border-b border-red-200" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 shrink-0 ${activeStop ? "text-red-600 animate-bounce" : "text-amber-500"}`} />
          <div className="text-left">
            <span className={`block font-bold text-xs ${activeStop ? "text-red-700" : "text-slate-800"}`}>
              Apontamento de Parada de Máquina
            </span>
            {activeStop && (
              <span className="text-[9px] text-red-600 font-mono font-bold animate-pulse">
                🔴 PARADA • Tempo: {formatDuration(elapsedMs)}
              </span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
          activeStop ? "bg-red-600 text-white text-[9px]" : "bg-amber-50 text-amber-700 hover:text-amber-800"
        }`}>
          {activeStop ? "FINALIZAR ▴" : isOpen ? "Ocultar ▴" : "Apontar ▾"}
        </span>
      </div>

      {isOpen && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-3">
          
          {/* Active Stop Area */}
          {activeStop ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center gap-3">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-red-800 font-extrabold uppercase tracking-widest">Tempo de Parada Ativo</span>
                <span className="text-3xl font-mono font-black text-red-700">{formatDuration(elapsedMs)}</span>
                <span className="text-xs text-slate-500 mt-1">
                  Motivo: <strong className="text-red-800">{activeStop.reason}</strong> 
                  {activeStop.otherReasonDescription ? ` (${activeStop.otherReasonDescription})` : ""}
                </span>
              </div>
              <button
                onClick={handleEndStop}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-2.5 rounded-xl transition shadow-sm animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" /> FINALIZAR PARADA DE MÁQUINA
              </button>
            </div>
          ) : (
            /* Stopped State / Not active stop */
            <div className="space-y-3.5">
              {!showManualForm ? (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Iniciar Nova Parada em Tempo Real
                  </h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["MANUTENÇÃO", "QUEBRA", "OUTRO"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setReason(r);
                          if (r !== "OUTRO") setOtherReason("");
                        }}
                        className={`py-2 rounded-lg font-bold text-[10px] border transition ${
                          reason === r
                            ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {r === "MANUTENÇÃO" ? "🔧 Manut." : r === "QUEBRA" ? "💥 Quebra" : "📝 Outro"}
                      </button>
                    ))}
                  </div>

                  {reason === "OUTRO" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Detalhe o motivo da parada</label>
                      <input
                        type="text"
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        placeholder="Ex: Falta de matéria prima, queda de energia..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleStartStop}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Iniciar Parada Agora
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualForm(true)}
                      className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg font-bold text-xs"
                    >
                      Registrar Manual Histórico
                    </button>
                  </div>
                </div>
              ) : (
                /* Manual Registration Form */
                <form onSubmit={handleSaveManual} className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                      Registrar Parada Manual (Fato Passado)
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setShowManualForm(false)} 
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Duração (Minutos)</label>
                      <input
                        type="number"
                        required
                        value={manualDuration}
                        onChange={(e) => setManualDuration(e.target.value ? Number(e.target.value) : "")}
                        placeholder="Ex: 15"
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Motivo</label>
                      <select
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value as any);
                          if (e.target.value !== "OUTRO") setOtherReason("");
                        }}
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden"
                      >
                        <option value="MANUTENÇÃO">🔧 Manutenção</option>
                        <option value="QUEBRA">💥 Quebra</option>
                        <option value="OUTRO">📝 Outro</option>
                      </select>
                    </div>
                  </div>

                  {reason === "OUTRO" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Indique o Outro Motivo</label>
                      <input
                        type="text"
                        required
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        placeholder="Ex: Falta de energia, atraso na carga..."
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Data (Opcional)</label>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden text-slate-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Hora (Opcional)</label>
                      <input
                        type="time"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs transition"
                    >
                      Gravar Registro Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualForm(false)}
                      className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg font-bold text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Past logs list */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Seus registros de paradas recentes ({myStops.length})
            </h4>

            {myStops.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2 pl-1">Sua máquina não registrou paradas ainda.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {myStops.map((stop) => (
                  <div key={stop.id} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs text-sans">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          stop.status === "ATIVO" 
                            ? "bg-red-500 text-white animate-pulse" 
                            : stop.reason === "MANUTENÇÃO" 
                              ? "bg-amber-100 text-amber-800" 
                              : stop.reason === "QUEBRA" 
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-850"
                        }`}>
                          {stop.status === "ATIVO" ? "🔴 EM ANDAMENTO" : stop.reason === "QUEBRA" ? "💥 QUEBRA" : stop.reason === "MANUTENÇÃO" ? "🔧 MANUTENÇÃO" : "📝 OUTRO"}
                        </span>
                        {stop.otherReasonDescription && (
                          <span className="text-[10px] text-slate-500 italic max-w-[120px] truncate">
                            {stop.otherReasonDescription}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(stop.timestamp).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })} • {new Date(stop.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Equipamento: <strong className="text-slate-700">{stop.machineName}</strong></span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {stop.status === "ATIVO" ? "Est. medindo..." : `${stop.durationMinutes} min`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
