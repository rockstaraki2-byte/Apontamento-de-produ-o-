import React, { useState, useEffect } from "react";
import {
  Settings,
  Clock,
  Calendar as CalendarIcon,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import type { ProductionSchedule, ExtraHourEntry } from "./types";
import { useDatabase } from "./useDatabase";
import {
  getProductionSchedule,
  getExtraHours,
  DEFAULT_SCHEDULE,
} from "./timeUtils";

export function ProdutividadeConfigModal({
  db,
  onClose,
}: {
  db: ReturnType<typeof useDatabase>;
  onClose: () => void;
}) {
  const [schedule, setSchedule] = useState<ProductionSchedule>(
    getProductionSchedule(),
  );
  const [extraHours, setExtraHours] = useState<ExtraHourEntry[]>([]);

  useEffect(() => {
    setExtraHours(db.extraHours || getExtraHours() || []);
    if (db.productionSchedules && db.productionSchedules.length > 0) {
      const g = db.productionSchedules.find((s) => s.id === "global");
      if (g)
        setSchedule({ ...DEFAULT_SCHEDULE, ...g, holidays: g.holidays || [] });
    }
  }, [db.extraHours, db.productionSchedules]);

  const toggleWorkingDay = (dayIndex: number) => {
    setSchedule((prev) => {
      const days = [...prev.workingDays];
      if (days.includes(dayIndex)) {
        return { ...prev, workingDays: days.filter((d) => d !== dayIndex) };
      } else {
        days.push(dayIndex);
        return { ...prev, workingDays: days.sort((a, b) => a - b) };
      }
    });
  };

  const handleSaveSchedule = async () => {
    try {
      if (db.saveProductionSchedule) {
        await db.saveProductionSchedule(schedule);
      } else {
        localStorage.setItem("production_schedule", JSON.stringify(schedule));
      }
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + err);
    }
  };

  const [newHoliday, setNewHoliday] = useState("");
  const handleAddHoliday = () => {
    if (!newHoliday) return;
    const currentHolidays = schedule.holidays || [];
    if (!currentHolidays.includes(newHoliday)) {
      setSchedule({
        ...schedule,
        holidays: [...currentHolidays, newHoliday].sort(),
      });
    }
    setNewHoliday("");
  };

  const handleDeleteHoliday = (h: string) => {
    setSchedule({
      ...schedule,
      holidays: (schedule.holidays || []).filter((hd) => hd !== h),
    });
  };

  const [newExtra, setNewExtra] = useState({
    date: "",
    sectorId: "CORTE_LASER",
    startHour: "",
    endHour: "",
  });
  const handleAddExtraHour = async () => {
    if (!newExtra.date || !newExtra.startHour || !newExtra.endHour) {
      alert("Preencha todos os campos da hora extra.");
      return;
    }
    try {
      if (db.addExtraHour) {
        await db.addExtraHour(newExtra);
      } else {
        const existing = getExtraHours();
        existing.push({ ...newExtra, id: Date.now().toString() });
        localStorage.setItem("extra_hours", JSON.stringify(existing));
        setExtraHours(existing);
      }
      setNewExtra({
        date: "",
        sectorId: "CORTE_LASER",
        startHour: "",
        endHour: "",
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar hora extra. Verifique as permissões.");
    }
  };

  const handleDeleteExtra = async (id: string) => {
    try {
      if (db.deleteExtraHour) {
        await db.deleteExtraHour(id);
      } else {
        const filtered = getExtraHours().filter((e) => e.id !== id);
        localStorage.setItem("extra_hours", JSON.stringify(filtered));
        setExtraHours(filtered);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao remover hora extra.");
    }
  };

  const daysLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const sectors = [
    "CORTE_LASER",
    "PINTURA",
    "EMBALAGEM",
    "MONTAGEM_RETRATIL",
    "MONTAGEM_RODRIGO",
    "PRENSA_EDUARDO",
    "PRENSA_RAFAEL",
    "INJETORA",
    "BANHO_QUIMICO",
    "SOLDA",
    "TORNO_CNC_WILLIAN",
    "TORNO_CNC_HENRIQUE",
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Settings className="text-blue-600" size={28} />
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Definições de Expediente e Horas Extras
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Configure horários de funcionamento. A Injetora não terá
                descanso de almoço ou pausas deduzidas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shadow-sm border border-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 flex-1">
          {/* Schedule Form */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" />
                Expediente Padrão
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Dias da Semana Trabalhados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysLabels.map((d, idx) => {
                      const isActive = schedule.workingDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleWorkingDay(idx)}
                          className={`w-10 h-10 rounded-full text-sm font-bold transition flex items-center justify-center border-2 ${
                            isActive
                              ? "bg-indigo-600 text-white border-indigo-700"
                              : "bg-white text-slate-400 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Início do Dia
                    </label>
                    <input
                      type="time"
                      className="w-full border border-slate-300 rounded p-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={schedule.startHour}
                      onChange={(e) =>
                        setSchedule({ ...schedule, startHour: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Término do Dia
                    </label>
                    <input
                      type="time"
                      className="w-full border border-slate-300 rounded p-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={schedule.endHour}
                      onChange={(e) =>
                        setSchedule({ ...schedule, endHour: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                Pausas (Almoço) e Lanches
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Início do Almoço
                  </label>
                  <input
                    type="time"
                    className="w-full border border-slate-300 rounded p-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={schedule.lunchStart}
                    onChange={(e) =>
                      setSchedule({ ...schedule, lunchStart: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Fim do Almoço
                  </label>
                  <input
                    type="time"
                    className="w-full border border-slate-300 rounded p-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={schedule.lunchEnd}
                    onChange={(e) =>
                      setSchedule({ ...schedule, lunchEnd: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Pausas Cadastradas (Café / Descanso)
                </label>
                {schedule.coffeeBreaks.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 mb-2 bg-white p-2 rounded border border-slate-200"
                  >
                    <input
                      type="time"
                      className="flex-1 border-none bg-slate-50 rounded px-2 py-1 text-sm font-mono"
                      value={b.start}
                      onChange={(e) => {
                        const newBreaks = [...schedule.coffeeBreaks];
                        newBreaks[idx].start = e.target.value;
                        setSchedule({ ...schedule, coffeeBreaks: newBreaks });
                      }}
                    />
                    <span className="text-slate-400">até</span>
                    <input
                      type="time"
                      className="flex-1 border-none bg-slate-50 rounded px-2 py-1 text-sm font-mono"
                      value={b.end}
                      onChange={(e) => {
                        const newBreaks = [...schedule.coffeeBreaks];
                        newBreaks[idx].end = e.target.value;
                        setSchedule({ ...schedule, coffeeBreaks: newBreaks });
                      }}
                    />
                    <button
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      onClick={() => {
                        const newBreaks = [...schedule.coffeeBreaks];
                        newBreaks.splice(idx, 1);
                        setSchedule({ ...schedule, coffeeBreaks: newBreaks });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setSchedule({
                      ...schedule,
                      coffeeBreaks: [
                        ...schedule.coffeeBreaks,
                        { start: "10:00", end: "10:15" },
                      ],
                    })
                  }
                  className="text-indigo-600 font-bold text-xs flex items-center gap-1 mt-2 hover:underline"
                >
                  <Plus size={14} /> Adicionar Pausa
                </button>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Feriados Anuais (Folgas)
                </label>
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="date"
                    className="flex-1 border border-slate-300 rounded p-2 text-sm focus:border-indigo-500"
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                  />
                  <button
                    onClick={handleAddHoliday}
                    className="bg-indigo-100 text-indigo-700 p-2 rounded hover:bg-indigo-200 transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(schedule.holidays || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-white p-2 border border-slate-100 rounded text-center">
                      Nenhum feriado cadastrado
                    </p>
                  ) : (
                    (schedule.holidays || []).map((h) => (
                      <div
                        key={h}
                        className="flex justify-between items-center bg-white p-2 rounded border border-slate-200"
                      >
                        <span className="text-sm font-bold text-slate-700">
                          {h.split("-").reverse().join("/")}
                        </span>
                        <button
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                          onClick={() => handleDeleteHoliday(h)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSchedule}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-indigo-700 transition"
            >
              <Save size={18} /> Salvar Configurações de Expediente
            </button>
          </div>

          {/* Extra Hours Form */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                <CalendarIcon size={18} className="text-emerald-600" />
                Horas Extras e Exceções
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Adicione as horas extras que ocorreram fora do horário
                comercial. Assim os indicadores não reduzirão o PPH como se
                fosse tempo inativo.
              </p>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      className="w-full border border-slate-300 rounded p-2 text-sm focus:border-emerald-500"
                      value={newExtra.date}
                      onChange={(e) =>
                        setNewExtra({ ...newExtra, date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Setor
                    </label>
                    <select
                      className="w-full border border-slate-300 rounded p-2 text-sm focus:border-emerald-500"
                      value={newExtra.sectorId}
                      onChange={(e) =>
                        setNewExtra({ ...newExtra, sectorId: e.target.value })
                      }
                    >
                      {sectors.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Hora Inicio
                    </label>
                    <input
                      type="time"
                      className="w-full border border-slate-300 rounded p-2 text-sm font-mono focus:border-emerald-500"
                      value={newExtra.startHour}
                      onChange={(e) =>
                        setNewExtra({ ...newExtra, startHour: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Hora Fim
                    </label>
                    <input
                      type="time"
                      className="w-full border border-slate-300 rounded p-2 text-sm font-mono focus:border-emerald-500"
                      value={newExtra.endHour}
                      onChange={(e) =>
                        setNewExtra({ ...newExtra, endHour: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddExtraHour}
                  className="w-full bg-emerald-600 text-white font-bold py-2 rounded flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-700 transition"
                >
                  <Plus size={16} /> Lançar Hora Extra
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-bold text-slate-700 mb-2">
                Horas Extras Lançadas
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {extraHours.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-3 border border-slate-100 rounded text-center">
                    Nenhuma hora extra cadastrada
                  </p>
                ) : (
                  extraHours.map((eh) => (
                    <div
                      key={eh.id}
                      className="flex justify-between items-center bg-white p-3 rounded border border-slate-200 shadow-sm border-l-4 border-l-emerald-500"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {eh.date.split("-").reverse().join("/")} -{" "}
                          {eh.sectorId}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {eh.startHour} às {eh.endHour}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteExtra(eh.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
