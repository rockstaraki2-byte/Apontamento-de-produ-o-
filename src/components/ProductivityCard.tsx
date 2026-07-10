import React from "react";
import type { User } from "../types";
import type { useDatabase } from "../useDatabase";

export function ProductivityCard({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const operatorLogs = db.logs.filter((l) => {
    const logOpId = String(l.operatorId).split(" - ")[0];
    return logOpId === String(currentUser.id);
  });

  if (operatorLogs.length <= 1) {
    return (
      <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl mb-3 shadow-3xs text-sans shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
          Desempenho de Hoje
        </span>
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-bold font-sans">
          ritmo normal⚡
        </span>
      </div>
    );
  }

  const lastLog = operatorLogs[operatorLogs.length - 1];
  const priorLogs = operatorLogs.slice(0, operatorLogs.length - 1);

  const getLogQty = (log: any) => {
    return (
      (log.quantityProcessed || 0) +
      (log.quantityCut || 0) +
      (log.quantityPainted || 0) +
      (log.quantityPacked || 0) ||
      log.quantityInvoiced || 
      log.quantity ||
      0
    );
  };

  const getLogPPH = (log: any) => {
    const qty = getLogQty(log);
    const dMs = log.durationMillis || 10 * 60 * 1000;
    return qty / (dMs / (1000 * 60 * 60));
  };

  const lastPPH = getLogPPH(lastLog);
  const priorPPHs = priorLogs.map(getLogPPH);
  const avgPriorPPH = priorPPHs.reduce((sum, r) => sum + r, 0) / priorPPHs.length;

  if (avgPriorPPH <= 0) {
    return (
      <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl mb-3 shadow-3xs text-sans shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
          Desempenho de Hoje
        </span>
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-bold font-sans">
          ritmo normal⚡
        </span>
      </div>
    );
  }

  const ratio = lastPPH / avgPriorPPH;

  let badgeMsg = "ritmo normal⚡";
  let badgeClasses = "bg-blue-50 text-blue-700 border-blue-200";

  if (ratio > 1.05) {
    badgeMsg = "mais produtivo✅️";
    badgeClasses = "bg-green-50 text-green-700 border-green-200";
  } else if (ratio < 0.95) {
    badgeMsg = "menos produtivo🔻";
    badgeClasses = "bg-red-50 text-red-700 border-red-200 animate-pulse";
  }

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-xl mb-3 shadow-3xs text-sans shrink-0">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
        Desempenho de Hoje
      </span>
      <span className={`inline-flex items-center gap-1 border px-2.5 py-1 rounded-full text-[11px] font-bold font-sans ${badgeClasses}`}>
        {badgeMsg}
      </span>
    </div>
  );
}
