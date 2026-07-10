import React, { useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import type { useDatabase } from "../../useDatabase";

export function HoraExtraPessoasTab({ db }: { db: ReturnType<typeof useDatabase> }) {
  const [newExtra, setNewExtra] = useState({
    date: "",
    startHour: "",
    endHour: "",
    sectorId: "",
  });

  const handleAddExtraHour = async () => {
    if (!newExtra.date || !newExtra.startHour || !newExtra.endHour) {
      alert("Preencha todos os campos obrigatórios (fuso, hora inicial e hora final).");
      return;
    }
    try {
      await db.addExtraHour({
        date: newExtra.date,
        startHour: newExtra.startHour,
        endHour: newExtra.endHour,
        sectorId: newExtra.sectorId || "GLOBAL",
      });
      setNewExtra({
        date: "",
        startHour: "",
        endHour: "",
        sectorId: "",
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar hora extra.");
    }
  };

  const handleRemoveExtraHour = async (id: string) => {
    if (confirm("Tem certeza que deseja remover esta hora extra?")) {
      try {
        await db.deleteExtraHour(id);
      } catch (err) {
        console.error(err);
        alert("Erro ao remover hora extra.");
      }
    }
  };

  const sortedExtras = [...db.extraHours].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="border-b pb-3 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" /> Horas Extras Planejadas
        </h3>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-150">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-600 mb-1">Data</label>
          <input
            type="date"
            className="w-full text-sm border p-2 rounded outline-indigo-500"
            value={newExtra.date}
            onChange={(e) =>
              setNewExtra({ ...newExtra, date: e.target.value })
            }
          />
        </div>
        <div className="w-full md:w-32">
          <label className="block text-xs font-bold text-slate-600 mb-1">Início</label>
          <input
            type="time"
            className="w-full text-sm border p-2 rounded outline-indigo-500"
            value={newExtra.startHour}
            onChange={(e) =>
              setNewExtra({ ...newExtra, startHour: e.target.value })
            }
          />
        </div>
        <div className="w-full md:w-32">
          <label className="block text-xs font-bold text-slate-600 mb-1">Término</label>
          <input
            type="time"
            className="w-full text-sm border p-2 rounded outline-indigo-500"
            value={newExtra.endHour}
            onChange={(e) =>
              setNewExtra({ ...newExtra, endHour: e.target.value })
            }
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-600 mb-1">Setor Alvo (Opcional)</label>
          <select
            className="w-full text-sm border p-2 rounded outline-indigo-500 bg-white"
            value={newExtra.sectorId}
            onChange={(e) =>
              setNewExtra({ ...newExtra, sectorId: e.target.value })
            }
          >
            <option value="">Fábrica Inteira (Global)</option>
            {db.sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAddExtraHour}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded shadow transition flex items-center justify-center gap-1 w-full md:w-auto h-[38px]"
        >
          <Plus size={18} /> Add
        </button>
      </div>

      <div>
        <h4 className="font-bold text-sm text-slate-700 mb-3 border-b pb-1">
          Lançamentos Anteriores
        </h4>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {sortedExtras.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-white p-4 border border-slate-100 rounded-lg text-center font-medium">
              Nenhuma hora extra cadastrada no sistema.
            </p>
          ) : (
            sortedExtras.map((eh) => (
              <div
                key={eh.id}
                className="flex justify-between items-center bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-indigo-500 hover:bg-slate-50 transition"
              >
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-slate-800">
                    {new Date(eh.date).toLocaleDateString("pt-BR")}{" "}
                    <span className="text-indigo-600 ml-1">
                      {eh.startHour} as {eh.endHour}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                    Setor: {eh.sectorId === "GLOBAL" ? "GLOBAL (Fábrica Inteira)" : db.sectors.find(s => s.id === Number(eh.sectorId))?.name || eh.sectorId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExtraHour(eh.id)}
                  className="text-rose-500 hover:bg-rose-100 p-2 rounded-lg transition"
                  title="Remover hora extra"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
