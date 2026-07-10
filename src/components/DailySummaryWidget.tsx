import React from "react";
import { useDatabase } from "../useDatabase";
import type { User } from "../types";
import { TrendingUp, Package, Scissors, Hammer, Paintbrush, Beaker, Truck, CheckCircle } from "lucide-react";

export function DailySummaryWidget({ db, currentUser, roleContext }: { db: ReturnType<typeof useDatabase>; currentUser: User; roleContext?: string }) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Filter logs for today and for this specific operator explicitly
  const logsToday = db.logs.filter(
    (log) => log.timestamp >= startOfDay.getTime() && log.operatorId === currentUser.id
  );

  const stats = React.useMemo(() => {
    let quantityProduced = 0;
    let quantityPacked = 0;
    let quantityCut = 0;
    let quantityPainted = 0;
    let quantityChemical = 0;
    let totalPoints = 0;
    
    logsToday.forEach((log) => {
      const item = db.items.find(i => i.id === log.itemId);
      const pointsPerUnit = item?.productionPoints || 0;

      quantityProduced += log.quantityProcessed || 0;
      quantityPacked += log.quantityPacked || 0;
      quantityCut += log.quantityCut || 0;
      quantityPainted += log.quantityPainted || 0;
      // You can infer chemical baths from specific type later, assuming PRODUCAO covers it for now based on context
      if (log.type === "BANHO_QUIMICO") quantityChemical += log.quantityProcessed || 0;
      
      const qty = (log.quantityProcessed || 0) + (log.quantityPacked || 0) + (log.quantityCut || 0) + (log.quantityPainted || 0);
      totalPoints += (qty * pointsPerUnit);
    });

    return {
      produced: quantityProduced,
      packed: quantityPacked,
      cut: quantityCut,
      painted: quantityPainted,
      chemical: quantityChemical,
      totalInteractions: logsToday.length,
      totalPoints: totalPoints,
    };
  }, [logsToday, db.items]);

  return (
    <div className="bg-white border rounded-xl shadow-sm p-4 mb-4 mt-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle size={14} className="text-emerald-500" /> Meu Resumo de Produção (Hoje)
        </h3>
        <span className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
      
      <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700">
        <div className="flex-1 bg-slate-50 border p-2 rounded-lg flex items-center gap-2 min-w-[100px]">
          <TrendingUp size={16} className="text-indigo-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 capitalize">Tarefas Realizadas</span>
            <span className="text-sm">{stats.totalInteractions}</span>
          </div>
        </div>

        {stats.produced > 0 && (
          <div className="flex-1 bg-blue-50 border border-blue-100 p-2 rounded-lg flex items-center gap-2 min-w-[100px]">
            <Hammer size={16} className="text-blue-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-400 capitalize">Processados Geral</span>
              <span className="text-sm text-blue-700">{stats.produced}</span>
            </div>
          </div>
        )}

        {stats.cut > 0 && (
          <div className="flex-1 bg-rose-50 border border-rose-100 p-2 rounded-lg flex items-center gap-2 min-w-[100px]">
            <Scissors size={16} className="text-rose-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-rose-400 capitalize">Cortados</span>
              <span className="text-sm text-rose-700">{stats.cut}</span>
            </div>
          </div>
        )}

        {stats.painted > 0 && (
          <div className="flex-1 bg-emerald-50 border border-emerald-100 p-2 rounded-lg flex items-center gap-2 min-w-[100px]">
            <Paintbrush size={16} className="text-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-emerald-400 capitalize">Pintados</span>
              <span className="text-sm text-emerald-700">{stats.painted}</span>
            </div>
          </div>
        )}
        
        {stats.packed > 0 && (
          <div className="flex-1 bg-amber-50 border border-amber-100 p-2 rounded-lg flex items-center gap-2 min-w-[100px]">
            <Package size={16} className="text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-500 capitalize">Embalados</span>
              <span className="text-sm text-amber-700">{stats.packed}</span>
            </div>
          </div>
        )}

        {stats.totalInteractions === 0 && (
           <p className="text-[11px] text-slate-400 w-full text-center py-2 italic">Nenhuma atividade registrada hoje ainda. Bora trabalhar!</p>
        )}

        {stats.totalPoints > 0 && (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "GERENCIA" || currentUser.role === "ENCARREGADO") && (
          <div className="flex-1 bg-purple-50 border border-purple-100 p-2 rounded-lg flex items-center gap-2 min-w-[100px] ml-auto">
            <span className="text-xl shrink-0">⭐</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-purple-500 capitalize font-extrabold">Pontuação do Dia</span>
              <span className="text-sm text-purple-700 font-black">{stats.totalPoints.toLocaleString('pt-BR')} pts</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
