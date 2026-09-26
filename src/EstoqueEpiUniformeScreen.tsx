import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, Bell, Boxes, ClipboardList, Package, Plus, Settings2, Shirt, ShieldCheck, X } from "lucide-react";
import type { Item, User } from "./types";
import { useDatabase } from "./useDatabase";
import { buildEpiReplacementDashboard, summarizeEpiConsumption } from "./ppeMetrics";

interface Props {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

function dateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function EstoqueEpiUniformeScreen({ db, currentUser }: Props) {
  const navigate = useNavigate();
  const today = dateInputValue(new Date());
  const monthStart = dateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [entryOpen, setEntryOpen] = useState(false);
  const [settingsItem, setSettingsItem] = useState<Item | null>(null);
  const [minStockValue, setMinStockValue] = useState("");
  const [replacementDaysValue, setReplacementDaysValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState({
    inventoryType: "EPI" as "EPI" | "UNIFORME",
    itemId: "",
    uniformId: "",
    quantity: "",
    unitPrice: "",
    purchaseOrderNumber: "",
    invoiceNumber: "",
    supplier: "",
    color: "",
    size: "",
    variation: "",
    notes: "",
  });

  const epiItems = useMemo(() => db.items.filter((item) => item.type === "EPI").sort((a, b) => a.name.localeCompare(b.name)), [db.items]);
  const itemsById = useMemo(() => new Map(db.items.map((item) => [item.id, item])), [db.items]);
  const stockTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (const stock of db.stocks) totals.set(stock.itemId, (totals.get(stock.itemId) || 0) + Number(stock.quantity || 0));
    return totals;
  }, [db.stocks]);
  const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
  const endTimestamp = new Date(`${endDate}T23:59:59.999`).getTime();
  const consumption = useMemo(
    () => summarizeEpiConsumption(db.items, db.epiDistributions, startTimestamp, endTimestamp),
    [db.items, db.epiDistributions, startTimestamp, endTimestamp],
  );
  const replacements = useMemo(
    () => buildEpiReplacementDashboard(db.epiDistributions, db.items, db.employees),
    [db.epiDistributions, db.items, db.employees],
  );
  const lowStockEpis = epiItems.filter((item) => Number(item.minStock || 0) > 0 && (stockTotals.get(item.id) || 0) <= Number(item.minStock));
  const lowStockUniforms = db.uniforms.filter((uniform) => Number(uniform.minStock || 0) > 0 && uniform.stock <= uniform.minStock);
  const orderedMovements = useMemo(() => db.stockMovements
    .filter((movement) => movement.inventoryType === "EPI" || movement.inventoryType === "UNIFORME" || (movement.itemId > 0 && itemsById.get(movement.itemId)?.type === "EPI"))
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100), [db.stockMovements, itemsById]);

  const startDistribution = (tab: "EPIS" | "UNIFORMES") => {
    navigate("/estoque", { state: { initialTab: tab } });
  };

  const saveEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!entry.quantity || Number(entry.quantity) <= 0 || entry.unitPrice === "" || Number(entry.unitPrice) < 0 || !entry.purchaseOrderNumber.trim() || !entry.invoiceNumber.trim() || !entry.supplier.trim()) {
      alert("Informe o pedido de compra, a NF/notinha, o fornecedor, a quantidade e o preço unitário.");
      return;
    }
    if (entry.inventoryType === "EPI" && !entry.itemId) {
      alert("Selecione o EPI que recebeu a entrada.");
      return;
    }
    if (entry.inventoryType === "UNIFORME" && !entry.uniformId) {
      alert("Selecione o uniforme que recebeu a entrada.");
      return;
    }

    setSaving(true);
    try {
      await db.addPpeStockEntry({
        inventoryType: entry.inventoryType,
        itemId: entry.inventoryType === "EPI" ? Number(entry.itemId) : undefined,
        uniformId: entry.inventoryType === "UNIFORME" ? entry.uniformId : undefined,
        quantity: Number(entry.quantity),
        unitPrice: Number(entry.unitPrice),
        purchaseOrderNumber: entry.purchaseOrderNumber.trim(),
        invoiceNumber: entry.invoiceNumber.trim(),
        supplier: entry.supplier.trim(),
        color: entry.color.trim() || undefined,
        size: entry.size.trim() || undefined,
        variation: entry.variation.trim() || undefined,
        notes: entry.notes.trim() || undefined,
        operatorName: currentUser.name,
      });
      setEntryOpen(false);
      setEntry({ inventoryType: "EPI", itemId: "", uniformId: "", quantity: "", unitPrice: "", purchaseOrderNumber: "", invoiceNumber: "", supplier: "", color: "", size: "", variation: "", notes: "" });
      alert("Entrada registrada. O saldo e o histórico foram atualizados juntos.");
    } catch (error: any) {
      alert(error?.message || "Não foi possível registrar a entrada.");
    } finally {
      setSaving(false);
    }
  };

  const saveEpiSettings = async () => {
    if (!settingsItem) return;
    const minimum = Number(minStockValue);
    const replacementDays = replacementDaysValue === "" ? undefined : Number(replacementDaysValue);
    if (!Number.isFinite(minimum) || minimum < 0 || (replacementDays !== undefined && (!Number.isFinite(replacementDays) || replacementDays <= 0))) {
      alert("O estoque mínimo deve ser zero ou maior, e o prazo de troca deve ser um número de dias maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await db.updateItem({ ...settingsItem, minStock: minimum, replacementIntervalDays: replacementDays });
      setSettingsItem(null);
    } catch (error: any) {
      alert(error?.message || "Não foi possível salvar as configurações do EPI.");
    } finally {
      setSaving(false);
    }
  };

  const fmtMoney = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (timestamp: number) => new Date(timestamp).toLocaleDateString("pt-BR");
  const totalEpiStock = epiItems.reduce((sum, item) => sum + (stockTotals.get(item.id) || 0), 0);
  const totalUniformStock = db.uniforms.reduce((sum, uniform) => sum + uniform.stock, 0);
  const dueSoonCount = replacements.filter((row) => row.status !== "NO PRAZO").length;

  return (
    <div id="estoque-epis-scroll" role="region" aria-label="Controle de EPIs e Uniformes" tabIndex={0} className="flex-1 min-h-0 w-full overflow-y-auto overscroll-y-contain touch-pan-y bg-slate-50 px-3 py-5 text-slate-800 focus:outline-none sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 pb-8">
        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-800 p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={16} /> Voltar</button>
            <h1 className="flex items-center gap-3 text-2xl font-black sm:text-3xl"><ShieldCheck className="text-emerald-400" /> Controle de EPIs e Uniformes</h1>
            <p className="mt-1 text-sm text-slate-300">Entradas rastreáveis, consumo por EPI e previsões de reposição.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => startDistribution("EPIS")} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15"><ArrowRightLeft size={17} /> Distribuir EPI</button>
            <button onClick={() => startDistribution("UNIFORMES")} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15"><Shirt size={17} /> Distribuir uniforme</button>
            <button onClick={() => setEntryOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"><Plus size={18} /> Registrar entrada</button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Package />} title="EPIs em estoque" value={`${totalEpiStock.toLocaleString("pt-BR")} un`} tone="emerald" />
          <MetricCard icon={<Shirt />} title="Uniformes em estoque" value={`${totalUniformStock.toLocaleString("pt-BR")} un`} tone="blue" />
          <MetricCard icon={<Bell />} title="Itens no mínimo" value={`${lowStockEpis.length + lowStockUniforms.length}`} tone={lowStockEpis.length + lowStockUniforms.length ? "amber" : "slate"} />
          <MetricCard icon={<ClipboardList />} title="Trocas atrasadas ou próximas" value={`${dueSoonCount}`} tone={dueSoonCount ? "rose" : "slate"} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><Boxes className="text-emerald-600" size={20} /> Consumo de EPI por período</h2>
              <p className="mt-1 text-xs text-slate-500">Quantidade entregue por item. Cada tipo de EPI é contabilizado separadamente.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-[360px]">
              <label className="text-xs font-bold text-slate-500">De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-500">Até<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={`${inputClass} mt-1`} /></label>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">EPI</th><th className="px-4 py-3 text-right">Entregas</th><th className="px-4 py-3 text-right">Quantidade utilizada</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {consumption.length ? consumption.map((row) => <tr key={row.itemId}><td className="px-4 py-3 font-mono text-xs">{row.code || "—"}</td><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3 text-right">{row.deliveries}</td><td className="px-4 py-3 text-right font-black text-emerald-700">{row.quantity}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Nenhuma entrega de EPI no período selecionado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold">Previsão de troca por colaborador</h2><p className="mt-1 text-xs text-slate-500">Prazo calculado pela última entrega e intervalo definido no cadastro de cada EPI.</p></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{dueSoonCount} atenção</span></div>
            <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Colaborador</th><th className="px-3 py-3">EPI</th><th className="px-3 py-3">Última entrega</th><th className="px-3 py-3">Próxima troca</th><th className="px-3 py-3">Situação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {replacements.length ? replacements.map((row) => <tr key={`${row.employeeId}-${row.itemId}`}><td className="px-3 py-3 font-semibold">{row.employeeName}</td><td className="px-3 py-3">{row.itemName}</td><td className="px-3 py-3">{fmtDate(row.lastDeliveryAt)}</td><td className="px-3 py-3">{fmtDate(row.dueAt)}<span className="block text-[10px] text-slate-500">{row.daysRemaining < 0 ? `${Math.abs(row.daysRemaining)} dias atrasado` : `em ${row.daysRemaining} dias`}</span></td><td className="px-3 py-3"><StatusPill status={row.status} /></td></tr>) : <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Defina um prazo de troca no cadastro do EPI para começar a acompanhar.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4"><h2 className="text-lg font-extrabold">Estoque e parâmetros dos EPIs</h2><p className="mt-1 text-xs text-slate-500">Configure estoque mínimo e prazo de troca para cada equipamento.</p></div>
            <div className="max-h-[430px] space-y-2 overflow-auto">
              {epiItems.length ? epiItems.map((item) => {
                const total = stockTotals.get(item.id) || 0;
                const isLow = Number(item.minStock || 0) > 0 && total <= Number(item.minStock);
                return <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{item.code} · {item.name}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500"><span>Saldo: <b className={isLow ? "text-rose-600" : "text-emerald-700"}>{total}</b></span><span>Mínimo: {item.minStock || 0}</span><span>Troca: {item.replacementIntervalDays ? `${item.replacementIntervalDays} dias` : "não definida"}</span></div></div><button onClick={() => { setSettingsItem(item); setMinStockValue(String(item.minStock || 0)); setReplacementDaysValue(item.replacementIntervalDays ? String(item.replacementIntervalDays) : ""); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"><Settings2 size={15} /> Configurar</button></div>;
              }) : <p className="py-8 text-center text-sm text-slate-400">Nenhum EPI cadastrado.</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <LowStockTable title="EPIs para repor" icon={<ShieldCheck size={18} />} rows={lowStockEpis.map((item) => ({ id: String(item.id), name: `${item.code} · ${item.name}`, stock: stockTotals.get(item.id) || 0, minimum: Number(item.minStock || 0) }))} />
          <LowStockTable title="Uniformes para repor" icon={<Shirt size={18} />} rows={lowStockUniforms.map((uniform) => ({ id: uniform.id, name: `${uniform.name} · ${uniform.size}`, stock: uniform.stock, minimum: Number(uniform.minStock || 0) }))} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4"><h2 className="text-lg font-extrabold">Rastreabilidade de entradas e saídas</h2><p className="mt-1 text-xs text-slate-500">Movimentos mais recentes, com pedido de compra, NF/notinha, fornecedor e custo quando disponíveis.</p></div>
          <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Data</th><th className="px-3 py-3">Movimento / item</th><th className="px-3 py-3">Pedido / documento</th><th className="px-3 py-3">Fornecedor / colaborador</th><th className="px-3 py-3 text-right">Quantidade</th><th className="px-3 py-3 text-right">Valor total</th><th className="px-3 py-3">Responsável</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {orderedMovements.length ? orderedMovements.map((movement) => {
                  const item = itemsById.get(movement.itemId);
                  const uniform = db.uniforms.find((candidate) => candidate.id === movement.uniformId);
                  const employee = db.employees.find((candidate) => candidate.id === movement.employeeId);
                  const title = movement.inventoryType === "UNIFORME" ? (uniform ? `${uniform.name} · ${uniform.size}` : "Uniforme") : item?.name || "EPI";
                  return <tr key={movement.id}><td className="px-3 py-3 whitespace-nowrap">{new Date(movement.timestamp).toLocaleString("pt-BR")}</td><td className="px-3 py-3"><span className={`mr-2 rounded px-1.5 py-1 text-[10px] font-black ${movement.type === "ENTRADA" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{movement.type}</span>{title}</td><td className="px-3 py-3">{movement.purchaseOrderNumber || "—"}<span className="block text-[10px] text-slate-500">NF: {movement.invoiceNumber || "—"}</span></td><td className="px-3 py-3">{movement.supplier || employee?.name || "—"}</td><td className="px-3 py-3 text-right font-bold">{movement.type === "SAIDA" ? "−" : "+"}{movement.quantity}</td><td className="px-3 py-3 text-right">{movement.totalValue != null ? fmtMoney(movement.totalValue) : movement.unitPrice != null ? fmtMoney(movement.unitPrice * movement.quantity) : "—"}</td><td className="px-3 py-3">{movement.operatorName || "—"}</td></tr>;
                }) : <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Nenhuma movimentação registrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {entryOpen && <Modal title="Registrar entrada no estoque" onClose={() => setEntryOpen(false)}><form className="space-y-4" onSubmit={saveEntry}>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Tipo de item<select className={`${inputClass} mt-1`} value={entry.inventoryType} onChange={(event) => setEntry({ ...entry, inventoryType: event.target.value as "EPI" | "UNIFORME", itemId: "", uniformId: "" })}><option value="EPI">EPI</option><option value="UNIFORME">Uniforme</option></select></label>
          {entry.inventoryType === "EPI" ? <label className="text-xs font-bold text-slate-600">EPI<select className={`${inputClass} mt-1`} value={entry.itemId} onChange={(event) => setEntry({ ...entry, itemId: event.target.value })}><option value="">Selecione</option>{epiItems.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label> : <label className="text-xs font-bold text-slate-600">Uniforme / tamanho<select className={`${inputClass} mt-1`} value={entry.uniformId} onChange={(event) => setEntry({ ...entry, uniformId: event.target.value })}><option value="">Selecione</option>{db.uniforms.map((uniform) => <option key={uniform.id} value={uniform.id}>{uniform.name} · {uniform.size}</option>)}</select></label>}
        </div>
        {entry.inventoryType === "EPI" && <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Cor (opcional)<input className={`${inputClass} mt-1`} value={entry.color} onChange={(event) => setEntry({ ...entry, color: event.target.value })} placeholder="OUTROS" /></label><label className="text-xs font-bold text-slate-600">Tamanho (opcional)<input className={`${inputClass} mt-1`} value={entry.size} onChange={(event) => setEntry({ ...entry, size: event.target.value })} placeholder="OUTROS" /></label><label className="text-xs font-bold text-slate-600">Variação (opcional)<input className={`${inputClass} mt-1`} value={entry.variation} onChange={(event) => setEntry({ ...entry, variation: event.target.value })} placeholder="OUTROS" /></label></div>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Pedido de compra *<input required className={`${inputClass} mt-1`} value={entry.purchaseOrderNumber} onChange={(event) => setEntry({ ...entry, purchaseOrderNumber: event.target.value })} /></label><label className="text-xs font-bold text-slate-600">NF / notinha *<input required className={`${inputClass} mt-1`} value={entry.invoiceNumber} onChange={(event) => setEntry({ ...entry, invoiceNumber: event.target.value })} /></label><label className="text-xs font-bold text-slate-600">Fornecedor *<input required className={`${inputClass} mt-1`} value={entry.supplier} onChange={(event) => setEntry({ ...entry, supplier: event.target.value })} /></label><label className="text-xs font-bold text-slate-600">Quantidade *<input required type="number" min="1" step="1" className={`${inputClass} mt-1`} value={entry.quantity} onChange={(event) => setEntry({ ...entry, quantity: event.target.value })} /></label><label className="text-xs font-bold text-slate-600">Preço unitário (R$) *<input required type="number" min="0" step="0.01" className={`${inputClass} mt-1`} value={entry.unitPrice} onChange={(event) => setEntry({ ...entry, unitPrice: event.target.value })} /></label><label className="text-xs font-bold text-slate-600">Observação<input className={`${inputClass} mt-1`} value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} /></label></div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-sm text-slate-500">Valor total: <b className="text-slate-800">{fmtMoney((Number(entry.quantity) || 0) * (Number(entry.unitPrice) || 0))}</b></span><button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Salvando..." : "Confirmar entrada"}</button></div>
      </form></Modal>}

      {settingsItem && <Modal title={`Parâmetros: ${settingsItem.name}`} onClose={() => setSettingsItem(null)}><div className="space-y-4"><p className="text-sm text-slate-500">Esses dados alimentam os avisos de reposição e a previsão individual de troca.</p><label className="block text-xs font-bold text-slate-600">Estoque mínimo<input type="number" min="0" step="1" className={`${inputClass} mt-1`} value={minStockValue} onChange={(event) => setMinStockValue(event.target.value)} /></label><label className="block text-xs font-bold text-slate-600">Intervalo para troca (dias)<input type="number" min="1" step="1" className={`${inputClass} mt-1`} value={replacementDaysValue} onChange={(event) => setReplacementDaysValue(event.target.value)} placeholder="Deixe em branco se não se aplica" /></label><button onClick={saveEpiSettings} disabled={saving} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar parâmetros"}</button></div></Modal>}
    </div>
  );
}

function MetricCard({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: string; tone: "emerald" | "blue" | "amber" | "rose" | "slate" }) {
  const toneClasses = { emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", slate: "bg-slate-100 text-slate-700" };
  return <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></div><span className={`grid h-11 w-11 place-items-center rounded-xl ${toneClasses[tone]}`}>{icon}</span></div>;
}

function StatusPill({ status }: { status: "ATRASADO" | "PRÓXIMO" | "NO PRAZO" }) {
  const styles = status === "ATRASADO" ? "bg-rose-100 text-rose-800" : status === "PRÓXIMO" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-black ${styles}`}>{status}</span>;
}

function LowStockTable({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: Array<{ id: string; name: string; stock: number; minimum: number }> }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">{icon}{title}</h2>{rows.length ? <div className="space-y-2">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/70 px-3 py-2.5"><span className="text-sm font-semibold">{row.name}</span><span className="whitespace-nowrap text-xs font-black text-rose-700">{row.stock} / mín. {row.minimum}</span></div>)}</div> : <p className="rounded-xl bg-emerald-50 px-3 py-4 text-center text-sm font-semibold text-emerald-800">Nenhum item abaixo do estoque mínimo.</p>}</div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-900">{title}</h2><button onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>{children}</section></div>;
}
