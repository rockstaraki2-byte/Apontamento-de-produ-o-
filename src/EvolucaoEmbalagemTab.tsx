import React, { useMemo, useState } from "react";
import { User, Item, ProductionLog, Order } from "./types";
import { ScrollContainer } from "./components/Layout";

interface EvolucaoEmbalagemTabProps {
  db: {
    logs: ProductionLog[];
    items: Item[];
    orders: Order[];
    users: User[];
  };
}

export function EvolucaoEmbalagemTab({ db }: EvolucaoEmbalagemTabProps) {
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  });

  const [filterUser, setFilterUser] = useState("");

  const packagingData = useMemo(() => {
    const nextDay = filterDate + 86400000;

    const logsInRange = db.logs.filter((log) => {
      // type EMBALAGEM
      if (log.type !== "EMBALAGEM") return false;
      if (log.timestamp < filterDate || log.timestamp >= nextDay) return false;
      if (filterUser && log.operatorId !== filterUser) return false;
      return true;
    });

    let totalMonetary = 0;
    let totalPoints = 0;

    const itemMap = new Map<
      number,
      {
        itemId: number;
        itemName: string;
        basePrice: number;
        points: number;
        quantity: number;
      }
    >();

    logsInRange.forEach((log) => {
      let itemId = log.itemId || 0;
      let itemName = "Produto Desconhecido";
      let basePrice = 0;
      let points = 0;

      if (itemId === 0 && log.orderId) {
        const order = db.orders.find((o) => o.id === log.orderId);
        if (order) {
          itemId = order.itemId;
        }
      }

      if (itemId > 0) {
        const item = db.items.find((i) => i.id === itemId);
        if (item) {
          itemName = item.name;
          basePrice = item.basePrice || 0;
          points = item.productionPoints || 0;
        }
      }

      if (itemName === "Produto Desconhecido" && log.customProductName) {
        itemName = log.customProductName;
      }

      const qty = log.quantityPacked || 0;

      totalMonetary += qty * basePrice;
      totalPoints += qty * points;

      const mapKey = itemId > 0 ? itemId : log.customProductName || "unknown";
      if (itemMap.has(mapKey as any)) {
        const entry = itemMap.get(mapKey as any)!;
        entry.quantity += qty;
      } else {
        itemMap.set(mapKey as any, {
          itemId,
          itemName,
          basePrice,
          points,
          quantity: qty,
        });
      }
    });

    const itemsSummary = Array.from(itemMap.values()).sort(
      (a, b) => b.quantity * b.basePrice - a.quantity * a.basePrice,
    );

    return {
      totalMonetary,
      totalPoints,
      itemsSummary,
      logCount: logsInRange.length,
      logs: logsInRange,
    };
  }, [db.logs, db.orders, db.items, filterDate, filterUser]);

  const packagingUsers = useMemo(() => {
    const uIds = new Set(
      db.logs.filter((l) => l.type === "EMBALAGEM").map((l) => l.operatorId),
    );
    return db.users.filter((u) => uIds.has(u.id));
  }, [db.logs, db.users]);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 animate-fade-in bg-white shadow-sm overflow-hidden">
      <div className="bg-indigo-600 px-3 py-2 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-white font-bold text-sm flex items-center gap-1.5">
            📦 Evolução da Embalagem
          </h2>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="date"
            className="px-2 py-0.5 rounded bg-white text-indigo-900 font-bold border-0 text-[11px]"
            value={new Date(filterDate).toISOString().split("T")[0]}
            onChange={(e) => {
              const d = new Date(e.target.value);
              d.setHours(d.getHours() + d.getTimezoneOffset() / 60);
              d.setHours(0, 0, 0, 0);
              if (!isNaN(d.getTime())) setFilterDate(d.getTime());
            }}
          />
          <select
            className="px-2 py-0.5 rounded bg-white text-indigo-900 font-bold border-0 text-[11px]"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">Todos Operadores</option>
            {packagingUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-2 grid grid-cols-2 gap-2 shrink-0">
        <div className="bg-emerald-50 border border-emerald-100 rounded-md p-1.5 flex flex-col justify-center items-center">
          <span className="text-emerald-700 font-bold uppercase tracking-wider text-[9px] mb-0.5">
            Total Monetário (R$)
          </span>
          <span className="text-emerald-900 font-black text-sm sm:text-base">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(packagingData.totalMonetary)}
          </span>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-md p-1.5 flex flex-col justify-center items-center">
          <span className="text-amber-700 font-bold uppercase tracking-wider text-[9px] mb-0.5">
            Total em Pontos
          </span>
          <span className="text-amber-900 font-black text-sm sm:text-base">
            {Number(packagingData.totalPoints).toFixed(5)} 💎
          </span>
        </div>
      </div>

      <ScrollContainer
        paddingSize="dense"
        className="border-t border-slate-100 bg-slate-50"
      >
        <h3 className="font-bold text-slate-700 mb-3 uppercase tracking-wide text-xs">
          Lista de Itens Embalados ({packagingData.itemsSummary.length})
        </h3>
        {packagingData.itemsSummary.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
            <span className="text-slate-400 font-bold">
              Nenhum registro de embalagem para esta data.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {packagingData.itemsSummary.map((it, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">
                    {it.itemName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Preço Base: R$ {it.basePrice.toFixed(2)} | Pontos un.:{" "}
                    {Number(it.points).toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg shrink-0">
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Qtd
                    </span>
                    <span className="font-black text-slate-700">
                      {it.quantity}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex flex-col items-center min-w-[80px]">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">
                      Valor R$
                    </span>
                    <span className="font-black text-emerald-700">
                      R$ {(it.quantity * it.basePrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-[10px] font-bold text-amber-500 uppercase">
                      Pontos
                    </span>
                    <span className="font-black text-amber-600">
                      {Number(it.quantity * it.points).toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-4 pb-4">
          <h3 className="font-bold text-slate-705 mb-3 uppercase tracking-wide text-xs">
            Histórico de Lançamentos Individuais ({packagingData.logCount})
          </h3>
          {packagingData.logs.length === 0 ? (
            <div className="text-center p-4 bg-white rounded-lg border text-xs text-slate-400">
              Nenhum lançamento individual.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {packagingData.logs.map((log: any) => {
                let name = "Produto Desconhecido";
                let itemId = log.itemId || 0;

                if (itemId === 0 && log.orderId) {
                  const order = db.orders.find((o: any) => o.id === log.orderId);
                  if (order) {
                    itemId = order.itemId;
                  }
                }

                if (itemId > 0) {
                  const item = db.items.find((i: any) => i.id === itemId);
                  if (item) {
                    name = item.name;
                  } else if (log.orderId) {
                    const order = db.orders.find((o: any) => o.id === log.orderId);
                    name = order ? (order as any).customProductName || "Item Desconhecido" : "Item Desconhecido";
                  }
                }

                if (name === "Produto Desconhecido" && log.customProductName) {
                  name = log.customProductName;
                }
                
                let packConfigStr = null;
                if (log.packagesConfig && log.packagesConfig.length > 0) {
                  let arr = Array.isArray(log.packagesConfig) 
                    ? log.packagesConfig 
                    : typeof log.packagesConfig === "string" 
                    ? JSON.parse(log.packagesConfig) 
                    : [];
                  if (Array.isArray(arr) && arr.length > 0) {
                    packConfigStr = arr.map((item: any) => `${item.boxes || 0} cx de ${item.itemsPerBox || 0} pçs`).join(", ");
                  }
                }
                
                const operatorName = db.users.find((u: any) => u.id === log.operatorId)?.name || "Operador";

                return (
                  <div key={log.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800">{name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex justify-between">
                      <span>Operador: <strong>{operatorName}</strong></span>
                      <span>Qtd: <strong>{log.quantityPacked} PÇS</strong></span>
                    </div>
                    {packConfigStr && (
                      <div className="mt-1 bg-amber-50 text-amber-800 border border-amber-100 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1">
                        📦 Embalagens: <strong>{packConfigStr}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollContainer>
    </div>
  );
}
