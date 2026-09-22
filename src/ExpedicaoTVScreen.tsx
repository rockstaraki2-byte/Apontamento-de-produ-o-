import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  PackageCheck,
  RefreshCcw,
  ShieldAlert,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { Carga, User } from "./types";
import { canManageExpedition, canViewExpeditionTV } from "./expeditionAccess";

const FINAL_STATUSES = new Set(["DESPACHADA", "ENTREGUE", "FATURADA", "FATURADA_COMPLETA"]);
const SHIFT_LABEL: Record<string, string> = { MANHA: "MANHÃ", TARDE: "TARDE" };
const STATUS_LABEL: Record<string, string> = {
  PLANEJADA: "PLANEJADA",
  ABERTA: "ABERTA",
  FECHADA: "FECHADA",
  LIBERADA: "LIBERADA",
  EM_SEPARACAO: "EM SEPARAÇÃO",
  PRONTA: "PRONTA",
  CARREGADA: "CARREGADA",
  DESPACHADA: "DESPACHADA",
  EM_TRANSITO: "EM TRÂNSITO",
  ENTREGUE: "ENTREGUE",
  FATURADA: "FATURADA",
  FATURADA_PARCIAL: "FATURADA PARCIAL",
  FATURADA_COMPLETA: "FATURADA COMPLETA",
};

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value?: string) {
  if (!value) return null;
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function getMonday(base: Date) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function loadDate(carga: Carga) {
  return carga.scheduledDate || carga.departureDate || "";
}

function tvShiftRank(shift?: string) {
  return shift === "MANHA" ? 0 : shift === "TARDE" ? 1 : 2;
}

function tvLoadSort(a: Carga, b: Carga) {
  return (
    loadDate(a).localeCompare(loadDate(b)) ||
    tvShiftRank(a.shift) - tvShiftRank(b.shift) ||
    a.createdAt - b.createdAt
  );
}

function formatDate(value?: string) {
  const d = parseDate(value);
  return d ? d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "") : "Sem data";
}

export function ExpedicaoTVScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [clock, setClock] = useState(new Date());
  const [selectedCarga, setSelectedCarga] = useState<Carga | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30000);
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearInterval(id);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  const canView = canViewExpeditionTV(db.activeTenantId, currentUser);
  const canEdit = currentUser.role === "EMBALAGEM" || canManageExpedition(db.activeTenantId, currentUser);

  const monday = useMemo(() => getMonday(weekAnchor), [weekAnchor]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const start = dateKey(monday);
  const end = dateKey(sunday);

  const loads = useMemo(
    () =>
      (db.cargas || [])
        .filter((c) => {
          const d = loadDate(c);
          return d && d >= start && d <= end && !FINAL_STATUSES.has(c.status);
        })
        .sort(tvLoadSort),
    [db.cargas, start, end],
  );

  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);
  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);

  const packedForLoad = (carga: Carga, orderId: number) => {
    const order = ordersById.get(orderId);
    if (!order) return 0;

    let packedAvailable = Math.max(0, Number(order.packedQuantity || 0));
    const relatedLoads = (db.cargas || [])
      .filter((c) => (c.orderIds || []).includes(orderId))
      .sort(tvLoadSort);

    for (const related of relatedLoads) {
      const allocated = Math.max(0, Number(related.orderQuantities?.[orderId] || 0));
      const packedHere = Math.min(allocated, packedAvailable);
      if (related.id === carga.id) return packedHere;
      packedAvailable = Math.max(0, packedAvailable - allocated);
    }
    return 0;
  };

  const metrics = (carga: Carga) => {
    let required = 0;
    let packed = 0;
    let separated = 0;
    const customers = new Set<string>();
    const orderCodes = new Set<string>();
    let incomplete = 0;

    (carga.orderIds || []).forEach((id) => {
      const o = ordersById.get(id);
      if (!o) return;
      const qty = Number(carga.orderQuantities?.[id] || 0);
      const sep = Math.min(qty, Number(carga.separatedQuantities?.[id] || 0));
      const pack = packedForLoad(carga, id);
      required += qty;
      packed += pack;
      separated += sep;
      customers.add(o.customerName);
      orderCodes.add(o.orderCode);
      if (sep < qty) incomplete += 1;
    });

    return {
      required,
      packed,
      separated,
      customers: customers.size,
      orders: orderCodes.size,
      incomplete,
      percent: required > 0 ? Math.round((separated / required) * 100) : 0,
    };
  };

  const updateSeparated = async (carga: Carga, orderId: number, value: number) => {
    if (!canEdit) return;
    const allocated = Number(carga.orderQuantities?.[orderId] || 0);
    const qty = Math.max(0, Math.min(allocated, value));
    const separated = { ...(carga.separatedQuantities || {}), [orderId]: qty } as Record<number, number>;
    const updated: Carga = {
      ...carga,
      separatedQuantities: separated,
      status:
        carga.status === "LIBERADA" && qty > 0
          ? "EM_SEPARACAO"
          : carga.status,
      auditTrail: [
        ...(carga.auditTrail || []),
        {
          timestamp: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: `Separação do item ${orderId} ajustada para ${qty} un`,
        },
      ],
    };
    await db.updateCarga(updated);
    setSelectedCarga(updated);
  };

  const markReady = async (carga: Carga) => {
    const m = metrics(carga);
    if (m.required <= 0 || m.separated < m.required) {
      alert("A carga só pode ser marcada como pronta quando 100% das unidades estiverem separadas.");
      return;
    }
    const updated: Carga = {
      ...carga,
      status: "PRONTA",
      auditTrail: [
        ...(carga.auditTrail || []),
        {
          timestamp: Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          action: "Carga marcada como pronta pela embalagem",
        },
      ],
    };
    await db.updateCarga(updated);
    setSelectedCarga(updated);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e) {
      console.warn("Não foi possível alternar tela cheia", e);
    }
  };

  if (!canView) {
    return (
      <div className="h-full bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex gap-3">
          <ShieldAlert size={28} className="text-amber-400 shrink-0" />
          <div><h2 className="font-black text-lg">Acesso restrito</h2><p className="text-sm text-slate-300 mt-1">Painel disponível para a Embalagem e equipe autorizada da Império.</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center"><Truck size={28} /></div>
            <div><h1 className="text-2xl md:text-3xl font-black tracking-tight">EXPEDIÇÃO DA SEMANA</h1><p className="text-sm text-slate-400 font-semibold">Embalagem • Separação por carga</p></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-right"><span className="block text-[10px] uppercase text-slate-500 font-bold">Agora</span><strong className="text-lg">{clock.toLocaleDateString("pt-BR")} • {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
            <button onClick={() => setWeekAnchor(new Date())} className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800" title="Semana atual"><RefreshCcw size={20} /></button>
            <button onClick={toggleFullscreen} className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800" title="Tela cheia">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <button onClick={() => setWeekAnchor(addDays(monday, -7))} className="p-2 rounded-lg hover:bg-slate-800"><ChevronLeft size={24} /></button>
          <div className="text-center"><span className="block text-xs text-slate-500 font-black uppercase tracking-widest">Semana</span><strong className="text-lg md:text-xl">{monday.toLocaleDateString("pt-BR")} — {sunday.toLocaleDateString("pt-BR")}</strong></div>
          <button onClick={() => setWeekAnchor(addDays(monday, 7))} className="p-2 rounded-lg hover:bg-slate-800"><ChevronRight size={24} /></button>
        </div>

        {loads.length === 0 ? (
          <div className="min-h-[360px] flex items-center justify-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/50"><div className="text-center"><Truck size={50} className="mx-auto text-slate-700 mb-3" /><h3 className="text-xl font-black text-slate-300">Nenhuma carga aberta nesta semana</h3><p className="text-sm text-slate-500 mt-1">Assim que uma carga for programada ela aparecerá aqui automaticamente.</p></div></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {loads.map((carga) => {
              const m = metrics(carga);
              const ready = m.percent >= 100;
              return (
                <button key={carga.id} onClick={() => setSelectedCarga(carga)} className={`text-left rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-2xl ${ready ? "bg-emerald-950/60 border-emerald-700" : m.percent >= 60 ? "bg-blue-950/50 border-blue-800" : "bg-slate-900 border-slate-800"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div><span className="text-sm font-black uppercase tracking-wider text-slate-400">{formatDate(loadDate(carga))} • {SHIFT_LABEL[carga.shift || ""] || "TURNO"}</span><h2 className="text-2xl font-black mt-1 leading-tight">{carga.routeName || carga.name}</h2><p className="text-sm text-slate-400 mt-1">Área/Pallet: <strong className="text-white">{carga.stagingLocation || "NÃO DEFINIDA"}</strong></p></div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black border ${ready ? "bg-emerald-400 text-emerald-950 border-emerald-300" : "bg-slate-800 text-slate-200 border-slate-700"}`}>{STATUS_LABEL[carga.status] || carga.status}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="rounded-2xl bg-black/20 border border-white/5 p-3 text-center"><Users size={18} className="mx-auto text-slate-400 mb-1" /><strong className="block text-2xl">{m.customers}</strong><span className="text-[10px] text-slate-500 font-black uppercase">Clientes</span></div>
                    <div className="rounded-2xl bg-black/20 border border-white/5 p-3 text-center"><Truck size={18} className="mx-auto text-slate-400 mb-1" /><strong className="block text-2xl">{m.orders}</strong><span className="text-[10px] text-slate-500 font-black uppercase">Pedidos</span></div>
                    <div className="rounded-2xl bg-black/20 border border-white/5 p-3 text-center"><PackageCheck size={18} className="mx-auto text-slate-400 mb-1" /><strong className="block text-2xl">{m.required}</strong><span className="text-[10px] text-slate-500 font-black uppercase">Unidades</span></div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-end justify-between gap-2 mb-2"><div><span className="text-xs text-slate-400 font-bold">SEPARAÇÃO</span><strong className="block text-3xl font-black">{m.percent}%</strong></div><div className="text-right text-sm text-slate-300"><div>Embalado <strong>{m.packed}</strong></div><div>Separado <strong>{m.separated}</strong> / {m.required}</div></div></div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${ready ? "bg-emerald-400" : m.percent >= 60 ? "bg-blue-400" : "bg-amber-400"}`} style={{ width: `${Math.min(100, m.percent)}%` }} /></div>
                    <div className="mt-3 text-sm font-bold text-slate-300">{m.incomplete > 0 ? `${m.incomplete} item(ns) ainda incompletos` : "Carga totalmente separada"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedCarga && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setSelectedCarga(null)}>
          <div className="w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-3xl bg-slate-950 border border-slate-700 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex items-center gap-2 flex-wrap"><h2 className="text-2xl font-black">{selectedCarga.routeName || selectedCarga.name}</h2><span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-black">{STATUS_LABEL[selectedCarga.status] || selectedCarga.status}</span></div><p className="text-sm text-slate-400 mt-1">{formatDate(loadDate(selectedCarga))} • {SHIFT_LABEL[selectedCarga.shift || ""] || ""} • Área/Pallet: <strong className="text-white">{selectedCarga.stagingLocation || "Não definida"}</strong></p></div><button onClick={() => setSelectedCarga(null)} className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 self-end md:self-auto"><X size={20} /></button></div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {(() => { const m = metrics(selectedCarga); return <div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><span className="text-[10px] text-slate-500 font-black uppercase">Clientes</span><strong className="block text-2xl">{m.customers}</strong></div><div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><span className="text-[10px] text-slate-500 font-black uppercase">Pedidos</span><strong className="block text-2xl">{m.orders}</strong></div><div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><span className="text-[10px] text-slate-500 font-black uppercase">Necessário</span><strong className="block text-2xl">{m.required}</strong></div><div className="rounded-2xl bg-blue-950/50 border border-blue-900 p-3"><span className="text-[10px] text-blue-400 font-black uppercase">Embalado</span><strong className="block text-2xl text-blue-300">{m.packed}</strong></div><div className="rounded-2xl bg-emerald-950/50 border border-emerald-900 p-3"><span className="text-[10px] text-emerald-400 font-black uppercase">Separado</span><strong className="block text-2xl text-emerald-300">{m.separated}</strong></div></div>; })()}

              <div className="space-y-3">
                {(selectedCarga.orderIds || []).map((id) => {
                  const o = ordersById.get(id);
                  const item = o ? itemsById.get(o.itemId) : undefined;
                  const allocated = Number(selectedCarga.orderQuantities?.[id] || 0);
                  const separated = Math.min(allocated, Number(selectedCarga.separatedQuantities?.[id] || 0));
                  const packed = packedForLoad(selectedCarga, id);
                  return (
                    <div key={id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-black bg-slate-800 px-2 py-1 rounded-lg">PEDIDO #{o?.orderCode || id}</span><span className="text-sm font-bold text-slate-200">{o?.customerName || "Cliente"}</span></div><h3 className="text-lg font-black mt-2 truncate">{o?.customProductName || item?.name || "Item"}</h3><p className="text-xs text-slate-500 mt-0.5">{o?.color || "-"} • {o?.size || "-"} • {o?.variation || "-"}</p></div>
                      <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap"><div className="text-center min-w-[90px]"><span className="block text-[10px] uppercase text-slate-500 font-black">Carga</span><strong className="text-xl">{allocated}</strong></div><div className="text-center min-w-[90px]"><span className="block text-[10px] uppercase text-blue-400 font-black">Embalado</span><strong className="text-xl text-blue-300">{packed}</strong></div><div className="text-center min-w-[90px]"><span className="block text-[10px] uppercase text-emerald-400 font-black">Separado</span><strong className="text-xl text-emerald-300">{separated}</strong></div>{canEdit && <div className="flex gap-2"><button onClick={() => updateSeparated(selectedCarga, id, allocated)} disabled={separated >= allocated} className="h-10 px-3 rounded-xl bg-emerald-500 disabled:opacity-30 text-slate-950 text-xs font-black flex items-center gap-1"><CheckCircle2 size={15} /> Separar tudo</button><button onClick={() => { const entered = prompt(`Quantidade separada para esta carga (0 a ${allocated}):`, String(separated)); if (entered !== null && entered.trim() !== "" && !isNaN(Number(entered))) updateSeparated(selectedCarga, id, Number(entered)); }} className="h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold">Ajustar</button></div>}</div>
                    </div>
                  );
                })}
              </div>

              {canEdit && metrics(selectedCarga).percent >= 100 && selectedCarga.status !== "PRONTA" && selectedCarga.status !== "CARREGADA" && selectedCarga.status !== "DESPACHADA" && <div className="flex justify-end"><button onClick={() => markReady(selectedCarga)} className="h-12 px-5 rounded-xl bg-emerald-400 text-emerald-950 font-black flex items-center gap-2"><CheckCircle2 size={18} /> Marcar carga como PRONTA</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
