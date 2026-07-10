import React, { useState } from "react";
import { Package, ClipboardList, Info } from "lucide-react";
import type { useDatabase } from "../useDatabase";

interface LoteGeralWidgetProps {
  db: ReturnType<typeof useDatabase>;
}

export function LoteGeralWidget({ db }: LoteGeralWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (createdAt: number) => {
    const diff = Math.max(0, now - createdAt);
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  // Get active general batches (sectorId === 0 inside productionBatches)
  const activeGeralBatches = db.productionBatches.filter(
    (b) => b.sectorId === 0 && b.status !== "CONCLUIDO"
  );

  if (activeGeralBatches.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-xl p-4 shadow-xs mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Package className="text-amber-650 w-5 h-5 animate-bounce" />
          <div>
            <span className="text-[10px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">CP Geral</span>
            <h3 className="font-extrabold text-amber-950 text-sm mt-0.5">
              📦 {activeGeralBatches.length === 1 ? "1 Lote Geral Ativo" : `${activeGeralBatches.length} Lotes Gerais Ativos`}
            </h3>
          </div>
        </div>
        <button className="text-amber-800 text-xs font-bold hover:underline">
          {isExpanded ? "Ocultar Pedidos" : "Ver Pedidos"}
        </button>
      </div>
      
      <p className="text-[11px] text-amber-800/80 mt-1">
        Esses lotes gerais não são direcionados para nenhum setor específico. Todos os operadores podem acessar e produzir as peças dos pedidos abaixo!
      </p>

      {isExpanded && (
        <div className="mt-3 flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
          {activeGeralBatches.map((batch) => {
            const batchOrders = batch.orderIds
              .map((oid) => db.orders.find((o) => o.id === oid))
              .filter((o) => o !== undefined);
            
            const totalQty = batchOrders.reduce((sum, o) => sum + (o?.totalQuantity || 0), 0);

            return (
              <div 
                key={batch.id} 
                className="bg-white border border-amber-100 p-3 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
              >
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-amber-50">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-xs text-amber-950">{batch.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      ⏱️ Ativo há {formatElapsed(batch.createdAt)}
                    </span>
                  </div>
                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded tracking-wide uppercase self-start">
                    {batch.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mb-2 flex justify-between">
                  <span>Pedidos: <strong>{batchOrders.length}</strong></span>
                  <span>Volume: <strong className="text-amber-900">{totalQty} pçs</strong></span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {batchOrders.map((o) => {
                    const item = db.items.find((i) => i.id === o?.itemId);
                    const prodPct = o ? Math.round(((o.producedQuantity || 0) / o.totalQuantity) * 100) : 0;
                    
                    return (
                      <div 
                        key={o?.id} 
                        className="bg-slate-50/75 hover:bg-slate-50 border border-slate-100 p-2 rounded flex justify-between items-center text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">COD: #{o?.orderCode}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-[11px] text-slate-655 font-medium truncate" style={{ maxWidth: '100px' }} title={o?.customerName}>
                              {o?.customerName}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-850 mt-0.5 block text-[11px]">
                            {item?.name}
                          </span>
                        </div>
                        
                        <div className="text-right flex flex-col items-end shrink-0 gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold bg-gray-150 px-1.5 py-0.5 rounded">
                            {o?.producedQuantity || 0} / {o?.totalQuantity} pçs ({prodPct}%)
                          </span>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1 rounded border border-indigo-150 uppercase">
                            Status: {o?.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
