import React, { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Download,
  FileText,
  Plus,
  Search,
  Settings2,
  Trash2,
  Pencil,
  X,
  Save,
  Package,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  SystemSettings,
  TubularPricingConfig,
  TubularQuote,
  TubularQuoteItemInput,
  User,
} from "./types";
import { useDatabase } from "./useDatabase";
import {
  calculateTubularQuoteItem,
  calculateTubularQuoteTotals,
  DEFAULT_TUBULAR_PRICING_CONFIG,
  mergeTubularPricingConfig,
  TUBULAR_DIAMETER_FACTOR_BANDS,
  TUBULAR_QUANTITY_TIER_LABELS,
  TUBULAR_WALL_FACTOR_BANDS,
} from "./utils/tubularPricing";

interface Props {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

type PdfMode = "AMBOS" | "COM_MATERIAL" | "SEM_MATERIAL";
type PricingFactorKey = "diameterFactors" | "wallThicknessFactors";

const SERVICE_LABELS: Record<TubularQuoteItemInput["serviceType"], string> = {
  CORTE: "Corte",
  CONIFICACAO: "Conificação",
  CORTE_E_CONIFICACAO: "Corte e conificação",
};

const STATUS_LABELS: Record<TubularQuote["status"], string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

const STATUS_STYLES: Record<TubularQuote["status"], string> = {
  RASCUNHO: "bg-amber-100 text-amber-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  APROVADO: "bg-emerald-100 text-emerald-800",
  REJEITADO: "bg-rose-100 text-rose-800",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatDate(date: string): string {
  if (!date) return "—";
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
}

function localDateInput(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function createBlankItem(): TubularQuoteItemInput {
  return {
    id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    description: "",
    serviceType: "CORTE",
    lengthCm: 80,
    diameterMm: 25.4,
    wallThicknessMm: 1.2,
    quantity: 1,
  };
}

function getSettingsRecord(settings: SystemSettings[]): SystemSettings {
  return settings.find((entry) => entry.id === "default") || { id: "default" };
}

export function OrcamentoTubularScreen({ db, currentUser }: Props) {
  const canManagePricing = currentUser.role === "ADMIN" || currentUser.role === "GERENCIA";
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [contactInfo, setContactInfo] = useState("");
  const [createdDate, setCreatedDate] = useState(localDateInput());
  const [validityDays, setValidityDays] = useState(10);
  const [status, setStatus] = useState<TubularQuote["status"]>("RASCUNHO");
  const [notes, setNotes] = useState("");
  const [draftItems, setDraftItems] = useState<TubularQuoteItemInput[]>([]);
  const [itemDraft, setItemDraft] = useState<TubularQuoteItemInput>(createBlankItem());
  const [pricingSettingsOpen, setPricingSettingsOpen] = useState(false);
  const [pricingSaveMessage, setPricingSaveMessage] = useState("");
  const [pricingConfig, setPricingConfig] = useState<TubularPricingConfig>(DEFAULT_TUBULAR_PRICING_CONFIG);

  const settingsRecord = useMemo(() => getSettingsRecord(db.systemSettings || []), [db.systemSettings]);
  const savedPricingConfig = settingsRecord.tubularPricingConfig;

  useEffect(() => {
    setPricingConfig(mergeTubularPricingConfig(savedPricingConfig));
  }, [savedPricingConfig]);

  const calculatedItems = useMemo(
    () => draftItems.map((item) => calculateTubularQuoteItem(item, pricingConfig)),
    [draftItems, pricingConfig],
  );
  const currentItemCalculation = useMemo(
    () => calculateTubularQuoteItem(itemDraft, pricingConfig),
    [itemDraft, pricingConfig],
  );
  const draftTotals = useMemo(() => calculateTubularQuoteTotals(calculatedItems), [calculatedItems]);

  const quotesList = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("pt-BR");
    return (db.tubularQuotes || [])
      .filter((quote) => {
        if (!term) return true;
        return (
          quote.customerName.toLocaleLowerCase("pt-BR").includes(term) ||
          quote.quoteCode.toLocaleLowerCase("pt-BR").includes(term) ||
          quote.items.some((item) => item.description.toLocaleLowerCase("pt-BR").includes(term))
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [db.tubularQuotes, searchTerm]);

  const currentQuoteCode = useMemo(() => {
    if (editingQuoteId) return (db.tubularQuotes || []).find((quote) => quote.id === editingQuoteId)?.quoteCode || "";
    const nextNumber = String((db.tubularQuotes || []).length + 1).padStart(4, "0");
    return "TUB-" + nextNumber + "-" + String(new Date(createdDate + "T12:00:00").getFullYear());
  }, [editingQuoteId, db.tubularQuotes, createdDate]);

  const beginNewQuote = () => {
    setEditingQuoteId(null);
    setCustomerName("");
    setCustomerId(undefined);
    setContactInfo("");
    setCreatedDate(localDateInput());
    setValidityDays(10);
    setStatus("RASCUNHO");
    setNotes("");
    setDraftItems([]);
    setItemDraft(createBlankItem());
    setIsEditing(true);
  };

  const beginEditQuote = (quote: TubularQuote) => {
    setEditingQuoteId(quote.id);
    setCustomerName(quote.customerName);
    setCustomerId(quote.customerId);
    setContactInfo(quote.contactInfo || "");
    setCreatedDate(quote.createdDate);
    setValidityDays(quote.validityDays || 10);
    setStatus(quote.status);
    setNotes(quote.notes || "");
    setDraftItems(
      quote.items.map((item) => ({
        id: item.id,
        description: item.description,
        serviceType: item.serviceType,
        lengthCm: item.lengthCm,
        diameterMm: item.diameterMm,
        wallThicknessMm: item.wallThicknessMm,
        quantity: item.quantity,
      })),
    );
    setItemDraft(createBlankItem());
    setIsEditing(true);
  };

  const addItem = () => {
    if (!itemDraft.description.trim()) {
      alert("Informe a descrição do item tubular.");
      return;
    }
    if (
      !Number.isFinite(itemDraft.lengthCm) || itemDraft.lengthCm <= 0 ||
      !Number.isFinite(itemDraft.diameterMm) || itemDraft.diameterMm <= 0 ||
      !Number.isFinite(itemDraft.wallThicknessMm) || itemDraft.wallThicknessMm <= 0 ||
      !Number.isInteger(itemDraft.quantity) || itemDraft.quantity <= 0
    ) {
      alert("Confira comprimento, diâmetro, parede e quantidade do item.");
      return;
    }
    setDraftItems((items) => [...items, { ...itemDraft, id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6) }]);
    setItemDraft({ ...createBlankItem(), serviceType: itemDraft.serviceType });
  };

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    const normalized = value.trim().toLocaleLowerCase("pt-BR");
    const match = (db.customers || []).find((customer) =>
      customer.name.trim().toLocaleLowerCase("pt-BR") === normalized ||
      (customer.tradeName || "").trim().toLocaleLowerCase("pt-BR") === normalized,
    );
    if (match) {
      setCustomerId(Number(match.id));
      setCustomerName(match.tradeName || match.name);
      setContactInfo(match.phone || "");
    } else {
      setCustomerId(undefined);
    }
  };

  const handleSaveQuote = async () => {
    if (!customerName.trim()) {
      alert("Informe o cliente do orçamento.");
      return;
    }
    if (!calculatedItems.length) {
      alert("Adicione ao menos um item tubular.");
      return;
    }
    if (db.activeTenantId === "global") {
      alert("Selecione uma empresa antes de salvar o orçamento.");
      return;
    }

    const totals = calculateTubularQuoteTotals(calculatedItems);
    const id = editingQuoteId || "tub_" + db.activeTenantId + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const previous = (db.tubularQuotes || []).find((quote) => quote.id === editingQuoteId);
    const quoteData: TubularQuote = {
      id,
      tenantId: db.activeTenantId,
      quoteCode: previous?.quoteCode || currentQuoteCode,
      customerId,
      customerName: customerName.trim(),
      contactInfo: contactInfo.trim(),
      createdDate,
      validityDays: Math.max(1, Math.floor(validityDays || 10)),
      createdBy: previous?.createdBy || currentUser.name,
      createdAt: previous?.createdAt || Date.now(),
      items: calculatedItems,
      totalWithMaterial: totals.totalWithMaterial,
      totalWithoutMaterial: totals.totalWithoutMaterial,
      materialTotal: totals.materialTotal,
      notes: notes.trim(),
      status,
    };

    try {
      if (editingQuoteId) {
        await db.updateTubularQuote(editingQuoteId, quoteData);
        alert("Orçamento tubular atualizado.");
      } else {
        await db.addTubularQuote(quoteData);
        alert("Orçamento tubular salvo.");
      }
      setIsEditing(false);
      setEditingQuoteId(null);
    } catch (error) {
      console.error("Erro ao salvar orçamento tubular:", error);
      alert("Não foi possível salvar o orçamento. Confira sua conexão e tente novamente.");
    }
  };

  const handleDeleteQuote = async (quote: TubularQuote) => {
    if (!window.confirm("Excluir o orçamento " + quote.quoteCode + " de " + quote.customerName + "?")) return;
    try {
      await db.deleteTubularQuote(quote.id);
    } catch (error) {
      console.error("Erro ao excluir orçamento tubular:", error);
      alert("Não foi possível excluir o orçamento.");
    }
  };

  const exportPdf = (quote: TubularQuote, mode: PdfMode = "AMBOS") => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const companyName = db.activeTenant?.name || "ApontaPRO";
    const dateText = formatDate(quote.createdDate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("ORÇAMENTO DE SERVIÇOS TUBULARES", 148.5, 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(companyName, 148.5, 20, { align: "center" });
    doc.setDrawColor(150);
    doc.line(10, 24, 287, 24);

    doc.setFont("helvetica", "bold");
    doc.text("ORÇAMENTO Nº:", 10, 31);
    doc.setFont("helvetica", "normal");
    doc.text(quote.quoteCode, 40, 31);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE:", 105, 31);
    doc.setFont("helvetica", "normal");
    doc.text(quote.customerName, 123, 31, { maxWidth: 90 });
    doc.setFont("helvetica", "bold");
    doc.text("DATA:", 222, 31);
    doc.setFont("helvetica", "normal");
    doc.text(dateText, 234, 31);
    doc.setFont("helvetica", "bold");
    doc.text("CONTATO:", 10, 38);
    doc.setFont("helvetica", "normal");
    doc.text(quote.contactInfo || "—", 32, 38);
    doc.setFont("helvetica", "bold");
    doc.text("VALIDADE:", 105, 38);
    doc.setFont("helvetica", "normal");
    doc.text(String(quote.validityDays) + " dias", 126, 38);
    doc.setFont("helvetica", "bold");
    doc.text("STATUS:", 222, 38);
    doc.setFont("helvetica", "normal");
    doc.text(STATUS_LABELS[quote.status], 238, 38);

    const headers =
      mode === "AMBOS"
        ? [["Item / serviço", "Comp. (cm)", "Ø tubo (mm)", "Parede (mm)", "Qtd.", "Unit. s/ mat.", "Total s/ mat.", "Unit. c/ mat.", "Total c/ mat."]]
        : [["Item / serviço", "Comp. (cm)", "Ø tubo (mm)", "Parede (mm)", "Qtd.", "Preço unitário", "Total"]];
    const rows = quote.items.map((item) => {
      const common = [
        item.description + " — " + SERVICE_LABELS[item.serviceType],
        String(item.lengthCm),
        String(item.diameterMm),
        String(item.wallThicknessMm),
        String(item.quantity),
      ];
      if (mode === "COM_MATERIAL") return [...common, formatCurrency(item.unitPriceWithMaterial), formatCurrency(item.totalWithMaterial)];
      if (mode === "SEM_MATERIAL") return [...common, formatCurrency(item.unitPriceWithoutMaterial), formatCurrency(item.totalWithoutMaterial)];
      return [
        ...common,
        formatCurrency(item.unitPriceWithoutMaterial),
        formatCurrency(item.totalWithoutMaterial),
        formatCurrency(item.unitPriceWithMaterial),
        formatCurrency(item.totalWithMaterial),
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: headers,
      body: rows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.2, overflow: "linebreak" },
      headStyles: { fillColor: [17, 55, 88], textColor: 255 },
      columnStyles: mode === "AMBOS"
        ? { 0: { cellWidth: 64 }, 1: { cellWidth: 20 }, 2: { cellWidth: 20 }, 3: { cellWidth: 18 }, 4: { cellWidth: 14 } }
        : { 0: { cellWidth: 80 }, 1: { cellWidth: 23 }, 2: { cellWidth: 23 }, 3: { cellWidth: 20 }, 4: { cellWidth: 16 } },
      margin: { left: 10, right: 10 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 55;
    let y = finalY + 10;
    if (mode !== "COM_MATERIAL") {
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL SEM MATERIAL: " + formatCurrency(quote.totalWithoutMaterial), 287, y, { align: "right" });
      y += 6;
    }
    if (mode !== "SEM_MATERIAL") {
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL COM MATERIAL: " + formatCurrency(quote.totalWithMaterial), 287, y, { align: "right" });
      y += 6;
    }
    if (quote.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize("Observações: " + quote.notes, 265);
      doc.text(noteLines, 10, y + 2);
    }
    doc.save("orcamento-tubular-" + quote.quoteCode + ".pdf");
  };

  const savePricingConfig = async () => {
    setPricingSaveMessage("");
    try {
      await db.saveSystemSettings({
        ...settingsRecord,
        id: "default",
        tubularPricingConfig: mergeTubularPricingConfig(pricingConfig),
      });
      setPricingSaveMessage("Parâmetros salvos nesta empresa.");
    } catch (error) {
      console.error("Erro ao salvar parâmetros tubulares:", error);
      setPricingSaveMessage("Não foi possível salvar os parâmetros.");
    }
  };

  const updateTier = (index: number, key: "cutPrice" | "conificationPrice", value: number) => {
    setPricingConfig((current) => ({
      ...current,
      quantityTiers: current.quantityTiers.map((tier, tierIndex) => tierIndex === index ? { ...tier, [key]: value } : tier),
    }));
  };

  const updateFactorPercent = (
    operation: "cutFactors" | "conificationFactors",
    key: PricingFactorKey,
    index: number,
    percent: number,
  ) => {
    const factor = Math.max(0.01, 1 + percent / 100);
    setPricingConfig((current) => ({
      ...current,
      [operation]: {
        ...current[operation],
        [key]: current[operation][key].map((value, factorIndex) => factorIndex === index ? factor : value),
      },
    }));
  };

  const renderFactorInputs = (
    operation: "cutFactors" | "conificationFactors",
    key: PricingFactorKey,
    labels: string[],
  ) => (
    <div className="space-y-2">
      {labels.map((label, index) => {
        const values = pricingConfig[operation][key];
        const percent = Math.round((values[index] - 1) * 100);
        return (
          <label key={label} className="grid grid-cols-[1fr_92px] items-center gap-3 text-xs text-slate-700">
            <span>{label}</span>
            <span className="relative">
              <input
                type="number"
                step="1"
                value={percent}
                onChange={(event) => updateFactorPercent(operation, key, index, Number(event.target.value))}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 pr-7 text-right font-bold"
              />
              <span className="absolute right-2 top-1.5 text-slate-400">%</span>
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-2 text-orange-700"><Package size={22} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Orçamentos Tubulares</h1>
              <p className="text-sm text-slate-500">Corte, conificação e fornecimento de material</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManagePricing && (
              <button
                onClick={() => setPricingSettingsOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
              >
                <Settings2 size={16} /> Parâmetros de preço
              </button>
            )}
            {!isEditing && (
              <button
                onClick={beginNewQuote}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-800"
              >
                <Plus size={17} /> Novo orçamento
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {canManagePricing && pricingSettingsOpen && (
          <section className="mb-5 rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-slate-900">Parâmetros desta empresa</h2>
                <p className="text-xs text-slate-500">Referência de complexidade: 25,4 mm × parede de 1,2 mm = fator 1,00.</p>
              </div>
              <button onClick={savePricingConfig} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white">
                <Save size={15} /> Salvar parâmetros
              </button>
            </div>
            {pricingSaveMessage && <p className="mb-3 text-sm font-semibold text-slate-600">{pricingSaveMessage}</p>}
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-bold text-slate-600">
                Material (R$/m)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricingConfig.materialPricePerMeter}
                  onChange={(event) => setPricingConfig((current) => ({ ...current, materialPricePerMeter: Number(event.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900"
                />
              </label>
              {pricingConfig.quantityTiers.map((tier, index) => (
                <div key={tier.minQuantity} className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2">
                  <span className="col-span-2 text-[11px] font-extrabold text-slate-600">{TUBULAR_QUANTITY_TIER_LABELS[index]}</span>
                  <label className="text-[10px] font-bold text-slate-500">Corte
                    <input type="number" step="0.01" min="0" value={tier.cutPrice} onChange={(event) => updateTier(index, "cutPrice", Number(event.target.value) || 0)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-bold text-slate-900" />
                  </label>
                  <label className="text-[10px] font-bold text-slate-500">Conificação
                    <input type="number" step="0.01" min="0" value={tier.conificationPrice} onChange={(event) => updateTier(index, "conificationPrice", Number(event.target.value) || 0)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-bold text-slate-900" />
                  </label>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {([
                ["Corte", "cutFactors"],
                ["Conificação", "conificationFactors"],
              ] as const).map(([label, operation]) => (
                <div key={operation} className="rounded-xl border border-slate-200 p-3">
                  <h3 className="mb-3 font-extrabold text-slate-800">{label}: ajuste de complexidade</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-black uppercase text-slate-500">Diâmetro do tubo</p>
                      {renderFactorInputs(operation, "diameterFactors", TUBULAR_DIAMETER_FACTOR_BANDS.map((band) => band.label))}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-black uppercase text-slate-500">Parede do tubo</p>
                      {renderFactorInputs(operation, "wallThicknessFactors", TUBULAR_WALL_FACTOR_BANDS.map((band) => band.label))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Os percentuais iniciais são estimativas de partida. O fator aplicado ao serviço é o percentual de diâmetro combinado com o percentual de parede; o material é calculado separadamente pelo comprimento.
            </p>
          </section>
        )}

        {isEditing ? (
          <section className="mx-auto max-w-6xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">{editingQuoteId ? "Editar orçamento" : "Novo orçamento tubular"}</h2>
                <p className="text-sm text-slate-500">Nº {currentQuoteCode}</p>
              </div>
              <button onClick={() => setIsEditing(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold">
                <X size={16} /> Fechar
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-bold text-slate-600 md:col-span-2">
                Cliente *
                <input
                  list="tubular-customers"
                  value={customerName}
                  onChange={(event) => handleCustomerNameChange(event.target.value)}
                  placeholder="Selecione ou digite o cliente"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                />
                <datalist id="tubular-customers">
                  {(db.customers || []).map((customer) => <option key={customer.id} value={customer.tradeName || customer.name} />)}
                </datalist>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Contato
                <input value={contactInfo} onChange={(event) => setContactInfo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Data
                <input type="date" value={createdDate} onChange={(event) => setCreatedDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Validade (dias)
                <input type="number" min="1" value={validityDays} onChange={(event) => setValidityDays(Number(event.target.value) || 1)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value as TubularQuote["status"])} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600 md:col-span-2 lg:col-span-4">
                Observações
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
              </label>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Calculator size={18} className="text-blue-700" />
                <h3 className="font-black text-slate-900">Adicionar item</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                <label className="text-xs font-bold text-slate-600 lg:col-span-2">
                  Produto / descrição *
                  <input value={itemDraft.description} onChange={(event) => setItemDraft((item) => ({ ...item, description: event.target.value }))} placeholder="Ex.: Tubo para conificação" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Serviço
                  <select value={itemDraft.serviceType} onChange={(event) => setItemDraft((item) => ({ ...item, serviceType: event.target.value as TubularQuoteItemInput["serviceType"] }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                    {Object.entries(SERVICE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Comprimento (cm)
                  <input type="number" min="0.01" step="0.01" value={itemDraft.lengthCm} onChange={(event) => setItemDraft((item) => ({ ...item, lengthCm: Number(event.target.value) || 0 }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Diâmetro (mm)
                  <input type="number" min="0.01" step="0.01" value={itemDraft.diameterMm} onChange={(event) => setItemDraft((item) => ({ ...item, diameterMm: Number(event.target.value) || 0 }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Parede (mm)
                  <input type="number" min="0.01" step="0.01" value={itemDraft.wallThicknessMm} onChange={(event) => setItemDraft((item) => ({ ...item, wallThicknessMm: Number(event.target.value) || 0 }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Quantidade
                  <input type="number" min="1" step="1" value={itemDraft.quantity} onChange={(event) => setItemDraft((item) => ({ ...item, quantity: Number(event.target.value) || 0 }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                </label>
                <div className="flex items-end">
                  <button onClick={addItem} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-800">
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                <span>Faixa: {currentItemCalculation.quantityTierLabel}</span>
                <span>Material: {formatCurrency(currentItemCalculation.materialCostPerUnit)} / peça</span>
                <span>Serviço sem material: {formatCurrency(currentItemCalculation.unitPriceWithoutMaterial)} / peça</span>
                <span>Com material: {formatCurrency(currentItemCalculation.unitPriceWithMaterial)} / peça</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3 font-black text-slate-900">Itens do orçamento ({calculatedItems.length})</div>
              {calculatedItems.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">Adicione os itens para calcular o orçamento.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-xs">
                    <thead className="bg-slate-50 uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Produto / serviço</th><th className="px-3 py-2">Medidas</th><th className="px-3 py-2">Qtd.</th><th className="px-3 py-2">Unit. s/ mat.</th><th className="px-3 py-2">Total s/ mat.</th><th className="px-3 py-2">Unit. c/ mat.</th><th className="px-3 py-2">Total c/ mat.</th><th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculatedItems.map((item, index) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-3"><div className="font-bold text-slate-900">{item.description}</div><div className="text-slate-500">{SERVICE_LABELS[item.serviceType]}</div></td>
                          <td className="px-3 py-3">{item.lengthCm} cm · Ø {item.diameterMm} mm · parede {item.wallThicknessMm} mm</td>
                          <td className="px-3 py-3">{item.quantity}</td>
                          <td className="px-3 py-3">{formatCurrency(item.unitPriceWithoutMaterial)}</td>
                          <td className="px-3 py-3 font-bold">{formatCurrency(item.totalWithoutMaterial)}</td>
                          <td className="px-3 py-3">{formatCurrency(item.unitPriceWithMaterial)}</td>
                          <td className="px-3 py-3 font-bold">{formatCurrency(item.totalWithMaterial)}</td>
                          <td className="px-3 py-3"><button onClick={() => setDraftItems((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remover item" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs font-bold text-slate-500">Total sem material</span><div className="mt-1 text-xl font-black">{formatCurrency(draftTotals.totalWithoutMaterial)}</div></div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><span className="text-xs font-bold text-orange-800">Material</span><div className="mt-1 text-xl font-black text-orange-900">{formatCurrency(draftTotals.materialTotal)}</div></div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><span className="text-xs font-bold text-blue-800">Total com material</span><div className="mt-1 text-xl font-black text-blue-900">{formatCurrency(draftTotals.totalWithMaterial)}</div></div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pb-4">
              <button onClick={() => setIsEditing(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold">Cancelar</button>
              <button onClick={handleSaveQuote} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-extrabold text-white hover:bg-emerald-800"><Save size={16} /> Salvar orçamento</button>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Orçamentos registrados</h2>
                <p className="text-sm text-slate-500">{quotesList.length} orçamento(s)</p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar cliente, número ou item..." className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" />
              </div>
            </div>

            {quotesList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <FileText size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="font-bold text-slate-700">Nenhum orçamento tubular encontrado.</p>
                <p className="mt-1 text-sm text-slate-500">Crie o primeiro orçamento para corte ou conificação de tubos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotesList.map((quote) => (
                  <article key={quote.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900">{quote.quoteCode}</h3>
                          <span className={"rounded-full px-2.5 py-1 text-[10px] font-extrabold " + STATUS_STYLES[quote.status]}>{STATUS_LABELS[quote.status]}</span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-700">{quote.customerName}</p>
                        <p className="text-xs text-slate-500">{formatDate(quote.createdDate)} · {quote.items.length} item(ns) · validade {quote.validityDays} dias</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => beginEditQuote(quote)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50"><Pencil size={14} /> Editar</button>
                        <button onClick={() => exportPdf(quote, "AMBOS")} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"><Download size={14} /> PDF completo</button>
                        <button onClick={() => exportPdf(quote, "COM_MATERIAL")} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50"><Download size={14} /> PDF c/ mat.</button>
                        <button onClick={() => exportPdf(quote, "SEM_MATERIAL")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download size={14} /> PDF s/ mat.</button>
                        <button onClick={() => handleDeleteQuote(quote)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 size={14} /> Excluir</button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
                      <div><span className="text-[10px] font-bold uppercase text-slate-500">Sem material</span><p className="font-black text-slate-800">{formatCurrency(quote.totalWithoutMaterial)}</p></div>
                      <div><span className="text-[10px] font-bold uppercase text-slate-500">Material</span><p className="font-black text-orange-800">{formatCurrency(quote.materialTotal)}</p></div>
                      <div><span className="text-[10px] font-bold uppercase text-slate-500">Com material</span><p className="font-black text-blue-800">{formatCurrency(quote.totalWithMaterial)}</p></div>
                    </div>
                    {quote.notes && <p className="mt-2 text-xs text-slate-500">{quote.notes}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
