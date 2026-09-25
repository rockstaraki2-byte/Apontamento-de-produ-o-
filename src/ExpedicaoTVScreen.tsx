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
import { createLoadMetrics, loadDate, sortLoads } from "./expeditionMetrics";

const FINAL_STATUSES = new Set(["DESPACHADA", "ENTREGUE", "FATURADA", "FATURADA_COMPLETA"]);
const TV_PAGE_SIZE = 2;
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
  const [selectedCargaId, setSelectedCargaId] = useState<string | null>(null);
  const [autoFollowWeek, setAutoFollowWeek] = useState(true);
  const [viewMode, setViewMode] = useState<"PROXIMAS" | "SEMANA">("PROXIMAS");
  const [page, setPage] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (autoFollowWeek && dateKey(weekAnchor) !== dateKey(clock)) setWeekAnchor(clock);
  }, [autoFollowWeek, clock, weekAnchor]);

  useEffect(() => {
    if (!isFullscreen || selectedCargaId) return;
    const id = window.setInterval(() => setPage((previous) => previous + 1), 20000);
    return () => window.clearInterval(id);
  }, [isFullscreen, selectedCargaId]);

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
        .sort(sortLoads),
    [db.cargas, start, end],
  );

  const today = dateKey(clock);
  const tomorrow = dateKey(addDays(clock, 1));
  const recent = dateKey(addDays(clock, -7));
  const immediateLoads = autoFollowWeek
    ? (db.cargas || []).filter((c) => {
        const date = loadDate(c);
        return date >= recent && date <= tomorrow && !FINAL_STATUSES.has(c.status);
      }).sort(sortLoads)
    : loads;
  const visibleLoads = viewMode === "PROXIMAS" ? immediateLoads : loads;
  const pageCount = Math.max(1, Math.ceil(visibleLoads.length / TV_PAGE_SIZE));
  const visiblePage = page % pageCount;
  const displayedLoads = isFullscreen
    ? visibleLoads.slice(visiblePage * TV_PAGE_SIZE, (visiblePage + 1) * TV_PAGE_SIZE)
    : visibleLoads;
  useEffect(() => setPage(0), [viewMode, start, db.cargas]);

  const calculations = useMemo(
    () => createLoadMetrics(db.cargas || [], db.orders),
    [db.cargas, db.orders],
  );
  const { packedForLoad, invoicedForLoad, metrics } = calculations;
  const selectedCarga = (db.cargas || []).find((c) => c.id === selectedCargaId) || null;

  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);
  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);

  const updateSeparated = async (carga: Carga, orderId: number, value: number) => {
    if (!canEdit || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await db.updateCargaSeparation(carga.id, orderId, value, currentUser);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar a separação.");
    } finally {
      setSaving(false);
    }
  };

  const markReady = async (carga: Carga) => {
    const m = metrics(carga);
    if (m.required <= 0 || m.separated < m.required) {
      alert("A carga só pode ser marcada como pronta quando 100% das unidades estiverem separadas.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await db.markCargaReady(carga.id, currentUser);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível marcar a carga pronta.");
    } finally {
      setSaving(false);
    }
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
    <div className="h-full overflow-y-auto bg-slate-950 text-white p-4 md:p-7 2xl:p-9">
      <div className="max-w-[1920px] mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center"><Truck size={28} /></div>
            <div><h1 className="text-2xl md:text-4xl font-black tracking-tight">CARGAS • EXPEDIÇÃO</h1><p className="text-base text-slate-300 font-semibold">Embalagem, separação e faturamento por saída</p></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-right"><span className="block text-xs uppercase text-slate-400 font-bold">Agora</span><strong className="text-xl">{clock.toLocaleDateString("pt-BR")} • {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
            <button onClick={() => { setWeekAnchor(new Date()); setAutoFollowWeek(true); setViewMode("PROXIMAS"); }} className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800" title="Semana atual"><RefreshCcw size={20} /></button>
            <button onClick={toggleFullscreen} className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800" title="Tela cheia">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <button onClick={() => { setAutoFollowWeek(false); setViewMode("SEMANA"); setWeekAnchor(addDays(monday, -7)); }} className="p-2 rounded-lg hover:bg-slate-800" aria-label="Semana anterior"><ChevronLeft size={24} /></button>
            <div className="text-center min-w-[180px]"><span className="block text-xs text-slate-400 font-black uppercase tracking-widest">Semana</span><strong className="text-lg md:text-xl">{monday.toLocaleDateString("pt-BR")} — {sunday.toLocaleDateString("pt-BR")}</strong></div>
            <button onClick={() => { setAutoFollowWeek(false); setViewMode("SEMANA"); setWeekAnchor(addDays(monday, 7)); }} className="p-2 rounded-lg hover:bg-slate-800" aria-label="Próxima semana"><ChevronRight size={24} /></button>
          </div>
          <div className="flex gap-2" role="group" aria-label="Período das cargas">
            <button onClick={() => setViewMode("PROXIMAS")} className={`px-4 py-2 rounded-xl font-bold text-base ${viewMode === "PROXIMAS" ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}>Até amanhã ({immediateLoads.length})</button>
            <button onClick={() => setViewMode("SEMANA")} className={`px-4 py-2 rounded-xl font-bold text-base ${viewMode === "SEMANA" ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}>Semana ({loads.length})</button>
          </div>
        </div>

        <div role="status" className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm font-semibold border ${db.cargasSync.state === "live" ? "bg-emerald-950/40 text-emerald-200 border-emerald-900" : "bg-amber-950/40 text-amber-200 border-amber-900"}`}>
          <span>{db.cargasSync.state === "live" ? "● Dados em tempo real" : db.cargasSync.state === "cache" ? "● Dados locais: aguardando confirmação do servidor" : db.cargasSync.state === "error" ? "● Falha ao carregar cargas: confira a conexão e os acessos" : "● Carregando cargas..."}</span>
          {db.cargasSync.updatedAt && <span className="hidden sm:inline">Servidor: {new Date(db.cargasSync.updatedAt).toLocaleTimeString("pt-BR")}</span>}
        </div>

        {db.cargasSync.state === "loading" || db.cargasSync.state === "error" ? (
          <div className="min-h-[320px] flex items-center justify-center border border-dashed border-amber-800 rounded-3xl bg-slate-900/50"><p className="text-xl font-bold text-amber-200">{db.cargasSync.state === "error" ? "Não foi possível confirmar as cargas. Verifique a conexão e tente novamente." : "Buscando as cargas no servidor..."}</p></div>
        ) : visibleLoads.length === 0 ? (
          <div className="min-h-[320px] flex items-center justify-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/50"><div className="text-center"><Truck size={50} className="mx-auto text-slate-600 mb-3" /><h3 className="text-2xl font-black text-slate-200">{viewMode === "PROXIMAS" ? "Sem saídas até amanhã" : "Nenhuma carga aberta nesta semana"}</h3><p className="text-base text-slate-400 mt-1">{db.cargasSync.state === "cache" ? "Exibindo dados locais. Aguardando sincronização." : `${loads.length} carga(s) aberta(s) nesta semana.`}</p></div></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {displayedLoads.map((carga) => {
              const m = metrics(carga);
              const ready = m.percent >= 100;
              const overdue = loadDate(carga) < today;
              return (
                <button key={carga.id} onClick={() => { setSaveError(null); setSelectedCargaId(carga.id); }} className={`text-left rounded-3xl border p-6 2xl:p-8 transition hover:-translate-y-0.5 hover:shadow-2xl ${overdue && !ready ? "bg-rose-950/50 border-rose-600" : ready ? "bg-emerald-950/60 border-emerald-700" : m.percent >= 60 ? "bg-blue-950/50 border-blue-800" : "bg-slate-900 border-slate-700"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div><span className="text-base 2xl:text-xl font-black uppercase tracking-wider text-slate-200">{overdue ? "ATRASADA • " : ""}{formatDate(loadDate(carga))} • {SHIFT_LABEL[carga.shift || ""] || "TURNO"}</span><h2 className="text-3xl 2xl:text-4xl font-black mt-2 leading-tight">{carga.routeName || carga.name}</h2><p className="text-lg text-slate-300 mt-2">Área/Pallet: <strong className="text-white">{carga.stagingLocation || "NÃO DEFINIDA"}</strong></p></div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-black border ${ready ? "bg-emerald-400 text-emerald-950 border-emerald-300" : "bg-slate-800 text-slate-100 border-slate-600"}`}>{STATUS_LABEL[carga.status] || carga.status}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="rounded-2xl bg-black/20 border border-white/10 p-3 text-center"><Users size={22} className="mx-auto text-slate-300 mb-1" /><strong className="block text-3xl">{m.customerCount}</strong><span className="text-sm text-slate-300 font-black uppercase">Clientes</span></div>
                    <div className="rounded-2xl bg-black/20 border border-white/10 p-3 text-center"><Truck size={22} className="mx-auto text-slate-300 mb-1" /><strong className="block text-3xl">{m.orderCount}</strong><span className="text-sm text-slate-300 font-black uppercase">Pedidos</span></div>
                    <div className="rounded-2xl bg-black/20 border border-white/10 p-3 text-center"><PackageCheck size={22} className="mx-auto text-slate-300 mb-1" /><strong className="block text-3xl">{m.required}</strong><span className="text-sm text-slate-300 font-black uppercase">Unidades</span></div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-end justify-between gap-2 mb-2"><div><span className="text-base text-slate-200 font-bold">SEPARAÇÃO</span><strong className="block text-4xl font-black">{m.percent}%</strong></div><div className="text-right text-lg text-slate-200"><div>Embalado <strong>{m.packed}</strong> · Faturado <strong>{m.invoiced}</strong></div><div>Separado <strong>{m.separated}</strong> / {m.required}</div></div></div>
                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${ready ? "bg-emerald-400" : m.percent >= 60 ? "bg-blue-400" : "bg-amber-400"}`} style={{ width: `${Math.min(100, m.percent)}%` }} /></div>
                    <div className="mt-3 text-base font-bold text-slate-200">{m.incompleteOrders > 0 ? `${m.incompleteOrders} item(ns) ainda incompletos` : "Carga totalmente separada"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {isFullscreen && pageCount > 1 && <div className="flex items-center justify-center gap-4 text-lg font-bold text-slate-200"><button onClick={() => setPage((visiblePage - 1 + pageCount) % pageCount)} aria-label="Página anterior" className="p-2 rounded-lg bg-slate-800"><ChevronLeft /></button>{visiblePage + 1} / {pageCount}<button onClick={() => setPage((visiblePage + 1) % pageCount)} aria-label="Próxima página" className="p-2 rounded-lg bg-slate-800"><ChevronRight /></button></div>}
      </div>

      {selectedCarga && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setSelectedCargaId(null)}>
          <div className="w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-3xl bg-slate-950 border border-slate-700 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex items-center gap-2 flex-wrap"><h2 className="text-2xl font-black">{selectedCarga.routeName || selectedCarga.name}</h2><span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-black">{STATUS_LABEL[selectedCarga.status] || selectedCarga.status}</span></div><p className="text-sm text-slate-400 mt-1">{formatDate(loadDate(selectedCarga))} • {SHIFT_LABEL[selectedCarga.shift || ""] || ""} • Área/Pallet: <strong className="text-white">{selectedCarga.stagingLocation || "Não definida"}</strong></p></div><button onClick={() => setSelectedCargaId(null)} className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 self-end md:self-auto"><X size={20} /></button></div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {saveError && <div role="alert" className="rounded-xl border border-rose-600 bg-rose-950 p-3 text-rose-100 font-bold">{saveError}</div>}
              {(() => { const m = metrics(selectedCarga); return <div className="grid grid-cols-2 md:grid-cols-6 gap-3"><div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><span className="text-xs text-slate-400 font-black uppercase">Clientes</span><strong className="block text-2xl">{m.customerCount}</strong></div><div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><span className="text-xs text-slate-400 font-black uppercase">Pedidos</span><strong className="block text-2xl">{m.orderCount}</strong></div><div className="rounded-2xl bg-slate-900 border border-slate-800 p-3"><span className="text-xs text-slate-400 font-black uppercase">Necessário</span><strong className="block text-2xl">{m.required}</strong></div><div className="rounded-2xl bg-purple-950/50 border border-purple-900 p-3"><span className="text-xs text-purple-300 font-black uppercase">Faturado</span><strong className="block text-2xl text-purple-200">{m.invoiced}</strong></div><div className="rounded-2xl bg-blue-950/50 border border-blue-900 p-3"><span className="text-xs text-blue-300 font-black uppercase">Embalado</span><strong className="block text-2xl text-blue-200">{m.packed}</strong></div><div className="rounded-2xl bg-emerald-950/50 border border-emerald-900 p-3"><span className="text-xs text-emerald-300 font-black uppercase">Separado</span><strong className="block text-2xl text-emerald-200">{m.separated}</strong></div></div>; })()}

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
                      <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap"><div className="text-center min-w-[70px]"><span className="block text-xs uppercase text-slate-400 font-black">Carga</span><strong className="text-xl">{allocated}</strong></div><div className="text-center min-w-[70px]"><span className="block text-xs uppercase text-purple-300 font-black">Faturado</span><strong className="text-xl text-purple-200">{invoicedForLoad(selectedCarga, id)}</strong></div><div className="text-center min-w-[70px]"><span className="block text-xs uppercase text-blue-300 font-black">Embalado</span><strong className="text-xl text-blue-200">{packed}</strong></div><div className="text-center min-w-[70px]"><span className="block text-xs uppercase text-emerald-300 font-black">Separado</span><strong className="text-xl text-emerald-200">{separated}</strong></div>{canEdit && <div className="flex gap-2"><button onClick={() => updateSeparated(selectedCarga, id, allocated)} disabled={saving || separated >= allocated} className="h-10 px-3 rounded-xl bg-emerald-500 disabled:opacity-30 text-slate-950 text-xs font-black flex items-center gap-1"><CheckCircle2 size={15} /> Separar tudo</button><button disabled={saving} onClick={() => { const entered = prompt(`Quantidade separada para esta carga (0 a ${allocated}):`, String(separated)); if (entered !== null && entered.trim() !== "" && !isNaN(Number(entered))) updateSeparated(selectedCarga, id, Number(entered)); }} className="h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold disabled:opacity-50">Ajustar</button></div>}</div>
                    </div>
                  );
                })}
              </div>

              {canEdit && metrics(selectedCarga).percent >= 100 && ["LIBERADA", "EM_SEPARACAO", "FATURADA_PARCIAL"].includes(selectedCarga.status) && selectedCarga.preBillingStatus !== "PRONTA" && <div className="flex justify-end"><button onClick={() => markReady(selectedCarga)} disabled={saving} className="h-12 px-5 rounded-xl bg-emerald-400 text-emerald-950 font-black flex items-center gap-2 disabled:opacity-50"><CheckCircle2 size={18} /> Marcar carga como PRONTA</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
