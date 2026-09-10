import React, { useMemo, useState } from "react";
import { FileText, RotateCcw, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { OrderStatus, User } from "./types";
import { useDatabase } from "./useDatabase";
import { normalizeString } from "./searchUtils";

type ReportMode = "SIMPLIFICADO" | "COMPLETO";

type CompleteRow = {
  id: number;
  orderCode: string;
  description: string;
  ordered: number;
  invoiced: number;
  open: number;
  status: OrderStatus;
  createdAt: number;
  deliveryDate: string;
};

const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Aguardando Aprovação",
  PENDENTE: "Pendente",
  TEM_ESTOQUE: "Tem Estoque",
  EM_PRODUCAO: "Em Produção",
  PRODUZIDO: "Produzido",
  EM_CORTE: "Em Corte",
  CORTADO: "Cortado",
  EM_PINTURA: "Em Pintura",
  PINTADO: "Pintado",
  EMBALANDO: "Embalando",
  EMBALADO: "Embalado",
  PLANEJADO: "Planejado",
  FATURADO_PARCIAL: "Faturado Parcial",
  FATURADO: "Faturado",
  CANCELADO: "Cancelado",
};

const STATUS_OPTIONS: OrderStatus[] = [
  "AGUARDANDO_APROVACAO",
  "PENDENTE",
  "TEM_ESTOQUE",
  "EM_PRODUCAO",
  "PRODUZIDO",
  "EM_CORTE",
  "CORTADO",
  "EM_PINTURA",
  "PINTADO",
  "EMBALANDO",
  "EMBALADO",
  "PLANEJADO",
  "FATURADO_PARCIAL",
];

const toLocalDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDeliveryDate = (value?: string) => {
  if (!value) return "";
  return value.split("T")[0];
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("pt-BR");

const formatDeliveryDate = (value?: string) => {
  if (!value) return "-";
  const key = normalizeDeliveryDate(value);
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
};

export function RepresentativeOpenOrdersReportTab({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [customerFilter, setCustomerFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [createdStart, setCreatedStart] = useState("");
  const [createdEnd, setCreatedEnd] = useState("");
  const [deliveryStart, setDeliveryStart] = useState("");
  const [deliveryEnd, setDeliveryEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [reportMode, setReportMode] = useState<ReportMode>("SIMPLIFICADO");

  const isImperio = db.activeTenantId === "imperio";

  const rows = useMemo<CompleteRow[]>(() => {
    if (!isImperio) return [];

    const customerNeedle = normalizeString(customerFilter.trim());
    const orderNeedle = normalizeString(orderFilter.trim());
    const productNeedle = normalizeString(productFilter.trim());

    return db.orders
      .filter((order) => {
        const isDirectMatch =
          order.representativeId === currentUser.id ||
          order.representativeName === currentUser.name;
        const isDaniloCheck =
          currentUser.id === "representante_danilo" &&
          ((order.representativeName || "").toLowerCase().includes("mapefor") ||
            order.representativeId === "mapefor");
        if (!isDirectMatch && !isDaniloCheck) return false;

        if (order.status === "CANCELADO") return false;

        const invoiced = Math.max(0, Number(order.invoicedQuantity || 0));
        const ordered = Math.max(0, Number(order.totalQuantity || 0));
        const open = Math.max(0, ordered - invoiced);
        if (open <= 0) return false;

        const item = db.items.find((candidate) => candidate.id === order.itemId);
        const description = order.customProductName || item?.name || "Item sem descrição";
        const productSearchText = normalizeString(
          `${item?.code || ""} ${description} ${order.color || ""} ${order.size || ""} ${order.variation || ""}`,
        );

        if (
          customerNeedle &&
          !normalizeString(order.customerName || "").includes(customerNeedle)
        ) {
          return false;
        }
        if (orderNeedle && !normalizeString(order.orderCode || "").includes(orderNeedle)) {
          return false;
        }
        if (productNeedle && !productSearchText.includes(productNeedle)) return false;

        const createdKey = toLocalDateKey(order.createdAt);
        if (createdStart && createdKey < createdStart) return false;
        if (createdEnd && createdKey > createdEnd) return false;

        const deliveryKey = normalizeDeliveryDate(order.deliveryDate);
        if (deliveryStart && (!deliveryKey || deliveryKey < deliveryStart)) return false;
        if (deliveryEnd && (!deliveryKey || deliveryKey > deliveryEnd)) return false;

        const effectiveStatus = (order.status || "PENDENTE") as OrderStatus;
        if (statusFilter && effectiveStatus !== statusFilter) return false;

        return true;
      })
      .map((order) => {
        const item = db.items.find((candidate) => candidate.id === order.itemId);
        const ordered = Math.max(0, Number(order.totalQuantity || 0));
        const invoiced = Math.max(0, Number(order.invoicedQuantity || 0));
        return {
          id: order.id,
          orderCode: order.orderCode,
          description: order.customProductName || item?.name || "Item sem descrição",
          ordered,
          invoiced,
          open: Math.max(0, ordered - invoiced),
          status: (order.status || "PENDENTE") as OrderStatus,
          createdAt: order.createdAt,
          deliveryDate: order.deliveryDate,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt || a.orderCode.localeCompare(b.orderCode));
  }, [
    isImperio,
    db.orders,
    db.items,
    currentUser,
    customerFilter,
    orderFilter,
    productFilter,
    createdStart,
    createdEnd,
    deliveryStart,
    deliveryEnd,
    statusFilter,
  ]);

  const simplifiedRows = useMemo(() => {
    const grouped = new Map<string, number>();
    rows.forEach((row) => {
      grouped.set(row.description, (grouped.get(row.description) || 0) + row.open);
    });
    return Array.from(grouped.entries())
      .map(([description, open]) => ({ description, open }))
      .sort((a, b) => a.description.localeCompare(b.description, "pt-BR"));
  }, [rows]);

  const totalOpen = useMemo(
    () => rows.reduce((sum, row) => sum + row.open, 0),
    [rows],
  );

  const activeFiltersText = useMemo(() => {
    const filters = [
      customerFilter && `Cliente: ${customerFilter}`,
      orderFilter && `Pedido: ${orderFilter}`,
      productFilter && `Produto: ${productFilter}`,
      createdStart && `Pedido de ${formatDeliveryDate(createdStart)}`,
      createdEnd && `Pedido até ${formatDeliveryDate(createdEnd)}`,
      deliveryStart && `Entrega de ${formatDeliveryDate(deliveryStart)}`,
      deliveryEnd && `Entrega até ${formatDeliveryDate(deliveryEnd)}`,
      statusFilter && `Status: ${STATUS_LABELS[statusFilter] || statusFilter}`,
    ].filter(Boolean);
    return filters.length > 0 ? filters.join(" | ") : "Sem filtros adicionais";
  }, [
    customerFilter,
    orderFilter,
    productFilter,
    createdStart,
    createdEnd,
    deliveryStart,
    deliveryEnd,
    statusFilter,
  ]);

  const clearFilters = () => {
    setCustomerFilter("");
    setOrderFilter("");
    setProductFilter("");
    setCreatedStart("");
    setCreatedEnd("");
    setDeliveryStart("");
    setDeliveryEnd("");
    setStatusFilter("");
  };

  const exportPDF = () => {
    if (rows.length === 0) {
      alert("Não há itens em aberto para os filtros selecionados.");
      return;
    }

    const isComplete = reportMode === "COMPLETO";
    const doc = new jsPDF(isComplete ? "landscape" : "portrait");
    const title = isComplete
      ? "Relatório Completo de Itens em Aberto"
      : "Relatório de Itens em Aberto";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Representante: ${currentUser.name}`, 14, 21);
    doc.text(
      `Gerado em: ${new Date().toLocaleString("pt-BR")} | Quantidade total em aberto: ${totalOpen}`,
      14,
      26,
    );
    const filtersLine = activeFiltersText.length > 155
      ? `${activeFiltersText.slice(0, 152)}...`
      : activeFiltersText;
    doc.text(filtersLine, 14, 31);

    if (isComplete) {
      autoTable(doc, {
        startY: 36,
        head: [[
          "Cód. Pedido",
          "Descrição do item",
          "Qtd. Pedido",
          "Qtd. Faturada",
          "Qtd. em Aberto",
          "Status do Pedido",
          "Data do Pedido",
          "Entrega Prevista",
        ]],
        body: rows.map((row) => [
          row.orderCode,
          row.description,
          String(row.ordered),
          String(row.invoiced),
          String(row.open),
          STATUS_LABELS[row.status] || row.status,
          formatDate(row.createdAt),
          formatDeliveryDate(row.deliveryDate),
        ]),
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
        headStyles: { fillColor: [37, 99, 235], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 75 },
          2: { cellWidth: 22, halign: "right" },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 24, halign: "right" },
          5: { cellWidth: 32 },
          6: { cellWidth: 24 },
          7: { cellWidth: 27 },
        },
      });
    } else {
      autoTable(doc, {
        startY: 36,
        head: [["Descrição do item", "Quantidade em aberto"]],
        body: simplifiedRows.map((row) => [row.description, String(row.open)]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2.2 },
        headStyles: { fillColor: [37, 99, 235] },
        columnStyles: {
          0: { cellWidth: 145 },
          1: { cellWidth: 35, halign: "right" },
        },
      });
    }

    doc.save(
      `itens_em_aberto_${isComplete ? "completo" : "simplificado"}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`,
    );
  };

  if (!isImperio) return null;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Relatório de Itens em Aberto</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Considera somente os seus pedidos com saldo pendente de faturamento.
            </p>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-blue-200 bg-blue-50 p-0.5">
            <button
              type="button"
              onClick={() => setReportMode("SIMPLIFICADO")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                reportMode === "SIMPLIFICADO"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-700 hover:bg-blue-100"
              }`}
            >
              Simplificado
            </button>
            <button
              type="button"
              onClick={() => setReportMode("COMPLETO")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                reportMode === "COMPLETO"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-700 hover:bg-blue-100"
              }`}
            >
              Completo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Cliente</span>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={customerFilter}
                onChange={(event) => setCustomerFilter(event.target.value)}
                placeholder="Nome do cliente..."
                className="w-full h-9 pl-8 pr-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Pedido</span>
            <input
              value={orderFilter}
              onChange={(event) => setOrderFilter(event.target.value)}
              placeholder="Número/código do pedido..."
              className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Produto</span>
            <input
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              placeholder="Código, descrição, cor..."
              className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Pedido de</span>
            <input type="date" value={createdStart} onChange={(e) => setCreatedStart(e.target.value)} className="h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Pedido até</span>
            <input type="date" value={createdEnd} onChange={(e) => setCreatedEnd(e.target.value)} className="h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Entrega de</span>
            <input type="date" value={deliveryStart} onChange={(e) => setDeliveryStart(e.target.value)} className="h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Entrega até</span>
            <input type="date" value={deliveryEnd} onChange={(e) => setDeliveryEnd(e.target.value)} className="h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white" />
          </label>
          <label className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Status de produção</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
              className="h-9 px-2 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
              {rows.length} linha(s) em aberto
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              Saldo total: {totalOpen} un
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Limpar filtros
            </button>
            <button
              type="button"
              onClick={exportPDF}
              disabled={rows.length === 0}
              className="h-9 px-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <FileText size={15} /> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-3">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">
              Prévia — {reportMode === "COMPLETO" ? "relatório completo" : "relatório simplificado"}
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">O PDF exportado respeita exatamente os filtros acima.</p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[560px]">
          {reportMode === "SIMPLIFICADO" ? (
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead className="bg-white sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 border-b">Descrição do item</th>
                  <th className="p-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 border-b text-right">Quantidade em aberto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {simplifiedRows.map((row) => (
                  <tr key={row.description} className="hover:bg-slate-50">
                    <td className="p-3 text-xs font-medium text-slate-800">{row.description}</td>
                    <td className="p-3 text-xs font-extrabold text-amber-700 text-right">{row.open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1120px]">
              <thead className="bg-white sticky top-0 shadow-sm z-10">
                <tr>
                  {[
                    "Cód. do pedido",
                    "Descrição do item",
                    "Qtd. do pedido",
                    "Qtd. faturada",
                    "Quantidade em aberto",
                    "Status do pedido",
                    "Data do pedido",
                    "Entrega prevista",
                  ].map((label) => (
                    <th key={label} className="p-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 border-b whitespace-nowrap">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 text-xs font-mono font-bold text-slate-700">{row.orderCode}</td>
                    <td className="p-3 text-xs font-medium text-slate-800">{row.description}</td>
                    <td className="p-3 text-xs text-slate-600">{row.ordered}</td>
                    <td className="p-3 text-xs text-emerald-700 font-bold">{row.invoiced}</td>
                    <td className="p-3 text-xs text-amber-700 font-extrabold">{row.open}</td>
                    <td className="p-3 text-xs text-slate-600">{STATUS_LABELS[row.status] || row.status}</td>
                    <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                    <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{formatDeliveryDate(row.deliveryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {rows.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              Nenhum item em aberto encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
