import React, { useState, useMemo } from "react";
import { useDatabase } from "./useDatabase";
import { User, LaserQuote, LaserQuoteItem } from "./types";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Calculator,
  UserCheck,
  Scale,
  Sparkles,
  ArrowRight,
  Copy,
  Printer,
  ChevronDown,
  ChevronUp,
  Eye,
  Percent
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

// Common steel thickness fractions and mm equivalents
const THICKNESS_PRESETS = [
  { label: "1/16\" (1.5mm)", mm: 1.5, fraction: "1/16" },
  { label: "1/8\" (3.17mm)", mm: 3.17, fraction: "1/8" },
  { label: "3/16\" (4.76mm)", mm: 4.76, fraction: "3/16" },
  { label: "1/4\" (6.35mm)", mm: 6.35, fraction: "1/4" },
  { label: "5/16\" (7.94mm)", mm: 7.94, fraction: "5/16" },
  { label: "3/8\" (9.52mm)", mm: 9.52, fraction: "3/8" },
  { label: "1/2\" (12.7mm)", mm: 12.7, fraction: "1/2" },
  { label: "5/8\" (15.87mm)", mm: 15.87, fraction: "5/8" },
  { label: "3/4\" (19.05mm)", mm: 19.05, fraction: "3/4" },
  { label: "1\" (25.4mm)", mm: 25.4, fraction: "1\"" },
];

// Helper to format thickness into fraction or inch notation e.g. "1/8\"", "3/16\"", "1/4\"", "1/2\""
export const formatThicknessString = (thicknessMm: number, thicknessLabel?: string) => {
  if (thicknessLabel && thicknessLabel.trim()) {
    const lbl = thicknessLabel.trim();
    if (lbl.endsWith('"') || lbl.toLowerCase().endsWith('mm')) {
      return lbl;
    }
    if (/^\d+(\/\d+)?$/.test(lbl)) {
      return `${lbl}"`;
    }
    return lbl;
  }
  const preset = THICKNESS_PRESETS.find((p) => Math.abs(p.mm - thicknessMm) < 0.05);
  if (preset) {
    const frac = preset.fraction;
    return frac.endsWith('"') ? frac : `${frac}"`;
  }
  return `${thicknessMm}mm`;
};

// Helper to format measures string in requested pattern: "chapa [espessura] x [comprimento] mm x [largura] mm"
export const formatItemMeasures = (it: {
  lengthMm?: number;
  widthMm?: number;
  thicknessMm?: number;
  thicknessLabel?: string;
  measures?: string;
}) => {
  if (it.lengthMm && it.widthMm && (it.thicknessMm || it.thicknessLabel)) {
    const thick = formatThicknessString(it.thicknessMm || 0, it.thicknessLabel);
    return `chapa ${thick} x ${it.lengthMm} mm x ${it.widthMm} mm`;
  }
  if (it.measures && it.measures.trim()) {
    const raw = it.measures.trim();
    if (raw.toLowerCase().startsWith("chapa ")) {
      return raw;
    }
    const parts = raw.split("x");
    if (parts.length === 3) {
      const len = parts[0].trim();
      const wid = parts[1].trim();
      let thick = parts[2].trim();
      if (/^\d+(\/\d+)?$/.test(thick)) {
        thick = `${thick}"`;
      }
      return `chapa ${thick} x ${len} mm x ${wid} mm`;
    }
    return raw;
  }
  return "-";
};

// Helper to format customer slug for quote code e.g. "ORC-001-RANGEL-2026"
const formatCustomerSlug = (name: string) => {
  if (!name || !name.trim()) return "CLIENTE";
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "CLIENTE";
};

const generateQuoteCode = (num: number, clientName: string, dateStr?: string) => {
  const numStr = String(num).padStart(3, "0");
  const slug = formatCustomerSlug(clientName);
  const year = dateStr ? dateStr.split("-")[0] : String(new Date().getFullYear());
  return `ORC-${numStr}-${slug}-${year}`;
};

export function OrcamentoLaserScreen({ db, currentUser }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<LaserQuote | null>(null);

  // Form State for Quote Header
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [contactInfo, setContactInfo] = useState("");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [createdDate, setCreatedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [validityDays, setValidityDays] = useState<number>(10);
  const [quoteStatus, setQuoteStatus] = useState<"RASCUNHO" | "ENVIADO" | "APROVADO" | "APROVADO_COM_MATERIAL" | "APROVADO_SEM_MATERIAL" | "REJEITADO">("RASCUNHO");
  const [notes, setNotes] = useState("");
  const [additionPercent, setAdditionPercent] = useState<number>(0);
  const [extraCosts, setExtraCosts] = useState<number>(0);
  const [viewingQuote, setViewingQuote] = useState<LaserQuote | null>(null);

  // PDF Export Modal State
  const [pdfModalQuote, setPdfModalQuote] = useState<LaserQuote | null>(null);
  const [selectedReportMode, setSelectedReportMode] = useState<"AMBOS" | "COM_MATERIAL" | "SEM_MATERIAL">("AMBOS");

  // Status badge styling helper
  const getStatusBadge = (st: string) => {
    switch (st) {
      case "APROVADO_COM_MATERIAL":
        return { label: "APROVADO C/ MAT.", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" };
      case "APROVADO_SEM_MATERIAL":
        return { label: "APROVADO S/ MAT.", bg: "bg-cyan-100 text-cyan-800 border-cyan-300" };
      case "APROVADO":
        return { label: "APROVADO", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" };
      case "ENVIADO":
        return { label: "ENVIADO", bg: "bg-blue-100 text-blue-800 border-blue-300" };
      case "REJEITADO":
        return { label: "REJEITADO", bg: "bg-rose-100 text-rose-800 border-rose-300" };
      default:
        return { label: "RASCUNHO", bg: "bg-amber-100 text-amber-800 border-amber-300" };
    }
  };

  // Filter registered customers
  const filteredCustomersList = useMemo(() => {
    if (!customerSearchTerm.trim()) return db.customers.slice(0, 15);
    const term = customerSearchTerm.toLowerCase();
    return db.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term))
    );
  }, [db.customers, customerSearchTerm]);

  // Default Calculation Parameters for Quote
  const [defaultRatePerSec, setDefaultRatePerSec] = useState<number>(0.35); // R$ 0.15 a R$ 0.60
  const [defaultPricePerKg, setDefaultPricePerKg] = useState<number>(10.0);  // R$ / kg
  const [defaultBendingRatePerKg, setDefaultBendingRatePerKg] = useState<number>(2.0); // R$ 2,00 / kg padrão para Dobra

  // Dynamic Quote Code preview
  const currentQuoteCode = useMemo(() => {
    if (editingQuote) return editingQuote.quoteCode;
    const nextNum = (db.laserQuotes?.length || 0) + 1;
    return generateQuoteCode(nextNum, customerName, createdDate);
  }, [editingQuote, db.laserQuotes, customerName, createdDate]);

  // Items State
  const [items, setItems] = useState<LaserQuoteItem[]>([]);

  // Item Editor State (Modal or inline drawer)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [itemLengthMm, setItemLengthMm] = useState<number>(500);
  const [itemWidthMm, setItemWidthMm] = useState<number>(300);
  const [itemThicknessMm, setItemThicknessMm] = useState<number>(6.35);
  const [itemThicknessLabel, setItemThicknessLabel] = useState<string>("1/4");
  const [itemMaterialType, setItemMaterialType] = useState<string>("Aço carbono");
  const [itemCuttingTimeSeconds, setItemCuttingTimeSeconds] = useState<number>(120);
  const [itemCuttingRatePerSec, setItemCuttingRatePerSec] = useState<number>(0.35);
  const [itemPricePerKg, setItemPricePerKg] = useState<number>(10.0);
  const [itemHasBending, setItemHasBending] = useState<boolean>(false);
  const [itemBendingQuantity, setItemBendingQuantity] = useState<number>(1);
  const [itemBendingRatePerKg, setItemBendingRatePerKg] = useState<number>(2.0);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [showAdvancedItemCalc, setShowAdvancedItemCalc] = useState(false);

  // Filter quotes
  const quotesList = useMemo(() => {
    return (db.laserQuotes || []).filter((q) => {
      const matchSearch =
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.quoteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.items.some((it) => it.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus =
        statusFilter === "TODOS" ||
        q.status === statusFilter ||
        (statusFilter === "APROVADO" &&
          (q.status === "APROVADO" || q.status === "APROVADO_COM_MATERIAL" || q.status === "APROVADO_SEM_MATERIAL"));
      return matchSearch && matchStatus;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [db.laserQuotes, searchTerm, statusFilter]);

  // Handle open modal for new quote
  const handleNewQuote = () => {
    setEditingQuote(null);
    setCustomerName("");
    setSelectedCustomerId(undefined);
    setContactInfo("");
    setCustomerSearchTerm("");
    setIsCustomerDropdownOpen(false);
    setCreatedDate(new Date().toISOString().split("T")[0]);
    setValidityDays(10);
    setQuoteStatus("RASCUNHO");
    setNotes("");
    setExtraCosts(0);
    setAdditionPercent(0);
    setDefaultRatePerSec(0.35);
    setDefaultPricePerKg(10.0);
    setDefaultBendingRatePerKg(2.0);
    setItems([]);
    resetItemForm();
    setIsModalOpen(true);
  };

  // Handle Edit existing quote
  const handleEditQuote = (quote: LaserQuote) => {
    setEditingQuote(quote);
    setCustomerName(quote.customerName);
    setSelectedCustomerId(quote.customerId);
    setContactInfo(quote.contactInfo || "");
    setCustomerSearchTerm(quote.customerName);
    setIsCustomerDropdownOpen(false);
    setCreatedDate(quote.createdDate);
    setValidityDays(quote.validityDays || 10);
    setQuoteStatus(quote.status);
    setNotes(quote.notes || "");
    setExtraCosts(quote.extraCosts || 0);
    setAdditionPercent(quote.additionPercent || 0);
    setItems(quote.items || []);
    resetItemForm();
    setIsModalOpen(true);
  };

  // Select customer from db.customers
  const handleSelectCustomer = (custName: string) => {
    setCustomerName(custName);
    const found = db.customers.find((c) => c.name === custName);
    if (found) {
      setSelectedCustomerId(found.id);
      const contactText = [found.phone, found.email].filter(Boolean).join(" - ");
      setContactInfo(contactText);
    } else {
      setSelectedCustomerId(undefined);
    }
  };

  // Helper: Reset Item form
  const resetItemForm = () => {
    setEditingItemIndex(null);
    setItemDescription("");
    setItemLengthMm(500);
    setItemWidthMm(300);
    setItemThicknessMm(6.35);
    setItemThicknessLabel("1/4");
    setItemMaterialType("Aço carbono");
    setItemCuttingTimeSeconds(120);
    setItemCuttingRatePerSec(defaultRatePerSec);
    setItemPricePerKg(defaultPricePerKg);
    setItemHasBending(false);
    setItemBendingQuantity(1);
    setItemBendingRatePerKg(defaultBendingRatePerKg);
    setItemQuantity(1);
    setShowAdvancedItemCalc(false);
  };

  // Calculate item figures
  const currentItemCalculations = useMemo(() => {
    // Formula: (Length_mm * Width_mm * Thickness_mm * 7.92) / 1,000,000
    const calculatedWeightKg =
      (itemLengthMm * itemWidthMm * itemThicknessMm * 7.92) / 1000000;
    
    const cuttingCost = itemCuttingTimeSeconds * itemCuttingRatePerSec;
    const materialCost = calculatedWeightKg * itemPricePerKg;
    const bendingCost = itemHasBending
      ? (calculatedWeightKg * itemBendingRatePerKg * Math.max(1, itemBendingQuantity))
      : 0;

    const unitPriceWithMaterial = cuttingCost + materialCost + bendingCost;
    const unitPriceWithoutMaterial = cuttingCost + bendingCost;

    const totalWithMaterial = unitPriceWithMaterial * itemQuantity;
    const totalWithoutMaterial = unitPriceWithoutMaterial * itemQuantity;

    // Formatted measures string, e.g., "chapa 1/2" x 200 mm x 580 mm"
    const measures = formatItemMeasures({
      lengthMm: itemLengthMm,
      widthMm: itemWidthMm,
      thicknessMm: itemThicknessMm,
      thicknessLabel: itemThicknessLabel,
    });

    return {
      calculatedWeightKg,
      cuttingCost,
      materialCost,
      bendingCost,
      unitPriceWithMaterial,
      unitPriceWithoutMaterial,
      totalWithMaterial,
      totalWithoutMaterial,
      measures,
    };
  }, [
    itemLengthMm,
    itemWidthMm,
    itemThicknessMm,
    itemThicknessLabel,
    itemCuttingTimeSeconds,
    itemCuttingRatePerSec,
    itemPricePerKg,
    itemHasBending,
    itemBendingRatePerKg,
    itemBendingQuantity,
    itemQuantity,
  ]);

  // Save Item to Items Array
  const handleAddOrUpdateItem = () => {
    if (!itemDescription.trim()) {
      alert("Por favor, preencha a descrição do item.");
      return;
    }

    const calc = currentItemCalculations;

    const newItem: LaserQuoteItem = {
      id: editingItemIndex !== null ? items[editingItemIndex].id : Date.now().toString(),
      description: itemDescription.trim(),
      measures: calc.measures,
      lengthMm: itemLengthMm,
      widthMm: itemWidthMm,
      thicknessMm: itemThicknessMm,
      materialType: itemMaterialType,
      cuttingTimeSeconds: itemCuttingTimeSeconds,
      cuttingRatePerSec: itemCuttingRatePerSec,
      hasBending: itemHasBending,
      bendingQuantity: itemHasBending ? itemBendingQuantity : undefined,
      bendingRatePerKg: itemHasBending ? itemBendingRatePerKg : undefined,
      bendingCost: calc.bendingCost,
      steelDensityFactor: 7.92,
      materialPricePerKg: itemPricePerKg,
      calculatedWeightKg: calc.calculatedWeightKg,
      cuttingCost: calc.cuttingCost,
      materialCost: calc.materialCost,
      unitPriceWithMaterial: calc.unitPriceWithMaterial,
      unitPriceWithoutMaterial: calc.unitPriceWithoutMaterial,
      quantity: itemQuantity,
      totalWithMaterial: calc.totalWithMaterial,
      totalWithoutMaterial: calc.totalWithoutMaterial,
    };

    if (editingItemIndex !== null) {
      const updated = [...items];
      updated[editingItemIndex] = newItem;
      setItems(updated);
    } else {
      setItems([...items, newItem]);
    }

    resetItemForm();
  };

  const handleEditItemRow = (index: number) => {
    const item = items[index];
    setEditingItemIndex(index);
    setItemDescription(item.description);
    setItemLengthMm(item.lengthMm);
    setItemWidthMm(item.widthMm);
    setItemThicknessMm(item.thicknessMm);
    setItemMaterialType(item.materialType);
    setItemCuttingTimeSeconds(item.cuttingTimeSeconds);
    setItemCuttingRatePerSec(item.cuttingRatePerSec);
    setItemPricePerKg(item.materialPricePerKg);
    setItemHasBending(item.hasBending || false);
    setItemBendingQuantity(item.bendingQuantity ?? 1);
    setItemBendingRatePerKg(item.bendingRatePerKg ?? defaultBendingRatePerKg);
    setItemQuantity(item.quantity);

    // Extract fraction or label from measures
    const parts = item.measures.split("x");
    if (parts.length >= 3) {
      setItemThicknessLabel(parts[2]);
    } else {
      setItemThicknessLabel(`${item.thicknessMm}mm`);
    }

    setShowAdvancedItemCalc(true);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      resetItemForm();
    }
  };

  // Dynamic recalculation of items incorporating extraCosts proration AND additionPercent markup in UNIT PRICES
  const computedItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    // 1. Calculate raw base values for each item
    const baseItems = items.map((it) => {
      const calcWeight = (it.lengthMm * it.widthMm * it.thicknessMm * 7.92) / 1000000;
      const cutCost = it.cuttingTimeSeconds * it.cuttingRatePerSec;
      const matCost = calcWeight * it.materialPricePerKg;
      const bendQty = it.hasBending ? (it.bendingQuantity ?? 1) : 0;
      const bendRate = it.bendingRatePerKg ?? 2.0;
      const bendCost = it.hasBending ? (calcWeight * bendRate * bendQty) : 0;

      const baseUnitWithMat = cutCost + matCost + bendCost;
      const baseUnitWithoutMat = cutCost + bendCost;

      const qty = Math.max(1, it.quantity || 1);
      const baseTotalWithMat = baseUnitWithMat * qty;
      const baseTotalWithoutMat = baseUnitWithoutMat * qty;

      return {
        it,
        calcWeight,
        cutCost,
        matCost,
        bendQty,
        bendRate,
        bendCost,
        baseUnitWithMat,
        baseUnitWithoutMat,
        qty,
        baseTotalWithMat,
        baseTotalWithoutMat,
      };
    });

    // 2. Sum base totals
    const sumBaseTotalWithMat = baseItems.reduce((acc, d) => acc + d.baseTotalWithMat, 0);
    const sumBaseTotalWithoutMat = baseItems.reduce((acc, d) => acc + d.baseTotalWithoutMat, 0);

    // 3. Markup multiplier from additionPercent
    const markupFactor = 1 + (additionPercent || 0) / 100;

    // 4. Prorate extraCosts and apply markup to unit prices
    return baseItems.map((d) => {
      const shareWithMat = sumBaseTotalWithMat > 0 ? (d.baseTotalWithMat / sumBaseTotalWithMat) : (1 / items.length);
      const proratedExtraTotalWithMat = (extraCosts || 0) * shareWithMat;
      const proratedExtraUnitWithMat = proratedExtraTotalWithMat / d.qty;

      const shareWithoutMat = sumBaseTotalWithoutMat > 0 ? (d.baseTotalWithoutMat / sumBaseTotalWithoutMat) : (1 / items.length);
      const proratedExtraTotalWithoutMat = (extraCosts || 0) * shareWithoutMat;
      const proratedExtraUnitWithoutMat = proratedExtraTotalWithoutMat / d.qty;

      // Unit prices incorporate prorated extra costs AND +additionPercent% markup directly
      const unitPriceWithMaterial = (d.baseUnitWithMat + proratedExtraUnitWithMat) * markupFactor;
      const unitPriceWithoutMaterial = (d.baseUnitWithoutMat + proratedExtraUnitWithoutMat) * markupFactor;

      const totalWithMaterial = unitPriceWithMaterial * d.qty;
      const totalWithoutMaterial = unitPriceWithoutMaterial * d.qty;

      return {
        ...d.it,
        calculatedWeightKg: d.calcWeight,
        cuttingCost: d.cutCost,
        materialCost: d.matCost,
        bendingCost: d.bendCost,
        bendingQuantity: d.bendQty,
        bendingRatePerKg: d.bendRate,
        proratedExtraCostWithMat: proratedExtraUnitWithMat,
        proratedExtraCostWithoutMat: proratedExtraUnitWithoutMat,
        unitPriceWithMaterial,
        unitPriceWithoutMaterial,
        totalWithMaterial,
        totalWithoutMaterial,
      };
    });
  }, [items, extraCosts, additionPercent]);

  // Base Subtotals from Items (before extra costs & markup)
  const baseSubtotalWithMaterial = useMemo(
    () => computedItems.reduce((acc, it) => acc + (it.cuttingCost + it.materialCost + (it.bendingCost || 0)) * it.quantity, 0),
    [computedItems]
  );

  const baseSubtotalWithoutMaterial = useMemo(
    () => computedItems.reduce((acc, it) => acc + (it.cuttingCost + (it.bendingCost || 0)) * it.quantity, 0),
    [computedItems]
  );

  // Grand Totals (Sum of computed item totals)
  const grandTotalWithMaterial = useMemo(
    () => computedItems.reduce((acc, it) => acc + it.totalWithMaterial, 0),
    [computedItems]
  );

  const grandTotalWithoutMaterial = useMemo(
    () => computedItems.reduce((acc, it) => acc + it.totalWithoutMaterial, 0),
    [computedItems]
  );

  const grandTotalWeightKg = useMemo(
    () => computedItems.reduce((acc, it) => acc + (it.calculatedWeightKg * it.quantity), 0),
    [computedItems]
  );

  const grandTotalBendingCost = useMemo(
    () => computedItems.reduce((acc, it) => acc + ((it.bendingCost || 0) * it.quantity), 0),
    [computedItems]
  );

  // Save Quote to Database
  const handleSaveQuote = async () => {
    if (!customerName.trim()) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }

    if (computedItems.length === 0) {
      alert("Adicione pelo menos 1 item ao orçamento.");
      return;
    }

    const quoteCode = currentQuoteCode;

    const quoteData: Omit<LaserQuote, "id"> & { id?: string } = {
      id: editingQuote?.id || Date.now().toString(),
      quoteCode,
      customerId: selectedCustomerId,
      customerName: customerName.trim(),
      contactInfo: contactInfo.trim(),
      createdDate,
      validityDays,
      createdBy: currentUser.name || "Marcos (Projetista)",
      createdAt: editingQuote?.createdAt || Date.now(),
      items: computedItems,
      totalWithMaterial: grandTotalWithMaterial,
      totalWithoutMaterial: grandTotalWithoutMaterial,
      totalWeightKg: grandTotalWeightKg,
      totalBendingCost: grandTotalBendingCost,
      extraCosts: extraCosts || 0,
      additionPercent: additionPercent || 0,
      notes,
      status: quoteStatus,
    };

    if (editingQuote) {
      await db.updateLaserQuote(editingQuote.id, quoteData);
      alert("Orçamento atualizado com sucesso!");
    } else {
      await db.addLaserQuote(quoteData);
      alert("Orçamento gerado e salvo com sucesso!");
    }

    setIsModalOpen(false);
  };

  // Delete Quote
  const handleDeleteQuote = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
      await db.deleteLaserQuote(id);
    }
  };

  // Export PDF Report with flexible display mode options
  const handleExportPDF = (
    quote: LaserQuote,
    reportMode: "AMBOS" | "COM_MATERIAL" | "SEM_MATERIAL" = "AMBOS"
  ) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const formattedDate = new Date(quote.createdDate + "T12:00:00").toLocaleDateString("pt-BR");

    // Header Império
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text("IMPÉRIO JOMARCI INDUSTRIA E COMERCIO LTDA", 105, 14, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Avenida Jesus Brandao, 121 (San Raphael I) Ubá MG", 105, 18.5, { align: "center" });
    doc.text("CNPJ: 02.411.952/0001-23", 105, 22.5, { align: "center" });

    // Header Lines & Customer Box
    doc.setLineWidth(0.4);
    doc.line(10, 26, 200, 26);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("ORÇAMENTO Nº:", 10, 31);
    doc.setFont("helvetica", "normal");
    doc.text(quote.quoteCode || "-", 48, 31);
    doc.line(48, 32, 200, 32);

    doc.setFont("helvetica", "bold");
    doc.text("NOME DO CLIENTE:", 10, 37);
    doc.setFont("helvetica", "normal");
    doc.text(quote.customerName || "-", 48, 37);
    doc.line(48, 38, 200, 38);

    doc.setFont("helvetica", "bold");
    doc.text("CONTATO:", 10, 43);
    doc.setFont("helvetica", "normal");
    doc.text(quote.contactInfo || "-", 48, 43);
    doc.line(48, 44, 200, 44);

    doc.setFont("helvetica", "bold");
    doc.text("DATA:", 10, 49);
    doc.setFont("helvetica", "normal");
    doc.text(formattedDate, 48, 49);
    doc.line(48, 50, 200, 50);

    let headRow: any[] = [];
    let tableRows: any[] = [];
    let totalsRow: any[] = [];
    let columnStyles: any = {};

    if (reportMode === "COM_MATERIAL") {
      headRow = [
        [
          { content: "DESCRIÇÃO", styles: { halign: "center", valign: "middle" } },
          { content: "MEDIDAS", styles: { halign: "center", valign: "middle" } },
          { content: "MATERIAL", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR UNITÁRIO", styles: { halign: "center", valign: "middle" } },
          { content: "Qtd.", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR TOTAL POR PEÇA", styles: { halign: "center", valign: "middle" } },
        ],
      ];

      tableRows = quote.items.map((it) => {
        const desc = it.hasBending
          ? `${it.description} [C/ ${it.bendingQuantity || 1} DOBRA(S)]`
          : it.description;
        return [
          desc,
          formatItemMeasures(it),
          it.materialType,
          `R$ ${it.unitPriceWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          it.quantity.toString(),
          `R$ ${it.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ];
      });

      const targetRows = Math.max(12, tableRows.length);
      while (tableRows.length < targetRows) {
        tableRows.push(["", "", "", "R$ -", "", "R$ -"]);
      }

      totalsRow = [
        {
          content: "VALOR TOTAL DO SERVIÇO (COM MATERIAL)",
          colSpan: 5,
          styles: { fontStyle: "bold", halign: "right", fillColor: [255, 255, 0] },
        },
        {
          content: `R$ ${quote.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          styles: { fontStyle: "bold", halign: "center", fillColor: [168, 230, 207] },
        },
      ];

      columnStyles = {
        0: { cellWidth: 62 },
        1: { cellWidth: 42, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 30, halign: "right", fillColor: [224, 247, 250] },
      };

    } else if (reportMode === "SEM_MATERIAL") {
      headRow = [
        [
          { content: "DESCRIÇÃO", styles: { halign: "center", valign: "middle" } },
          { content: "MEDIDAS", styles: { halign: "center", valign: "middle" } },
          { content: "MATERIAL", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR UNITÁRIO (SERVIÇO)", styles: { halign: "center", valign: "middle" } },
          { content: "Qtd.", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR TOTAL POR PEÇA", styles: { halign: "center", valign: "middle" } },
        ],
      ];

      tableRows = quote.items.map((it) => {
        const desc = it.hasBending
          ? `${it.description} [C/ ${it.bendingQuantity || 1} DOBRA(S)]`
          : it.description;
        return [
          desc,
          formatItemMeasures(it),
          it.materialType,
          `R$ ${it.unitPriceWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          it.quantity.toString(),
          `R$ ${it.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ];
      });

      const targetRows = Math.max(12, tableRows.length);
      while (tableRows.length < targetRows) {
        tableRows.push(["", "", "", "R$ -", "", "R$ -"]);
      }

      totalsRow = [
        {
          content: "VALOR TOTAL DO SERVIÇO (SEM MATERIAL)",
          colSpan: 5,
          styles: { fontStyle: "bold", halign: "right", fillColor: [255, 255, 0] },
        },
        {
          content: `R$ ${quote.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          styles: { fontStyle: "bold", halign: "center", fillColor: [255, 204, 153] },
        },
      ];

      columnStyles = {
        0: { cellWidth: 62 },
        1: { cellWidth: 42, halign: "center" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 30, halign: "right", fillColor: [255, 243, 224] },
      };

    } else {
      // AMBOS (Com e Sem Material)
      headRow = [
        [
          { content: "DESCRIÇÃO", styles: { halign: "center", valign: "middle" } },
          { content: "MEDIDAS", styles: { halign: "center", valign: "middle" } },
          { content: "MATERIAL", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR UNITÁRIO COM MATERIAL", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR UNITÁRIO SEM MATERIAL", styles: { halign: "center", valign: "middle" } },
          { content: "Qtd.", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR TOTAL POR PEÇA COM MATERIAL", styles: { halign: "center", valign: "middle" } },
          { content: "VALOR TOTAL POR PEÇA SEM MATERIAL", styles: { halign: "center", valign: "middle" } },
        ],
      ];

      tableRows = quote.items.map((it) => {
        const desc = it.hasBending
          ? `${it.description} [C/ ${it.bendingQuantity || 1} DOBRA(S)]`
          : it.description;
        return [
          desc,
          formatItemMeasures(it),
          it.materialType,
          `R$ ${it.unitPriceWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `R$ ${it.unitPriceWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          it.quantity.toString(),
          `R$ ${it.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `R$ ${it.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ];
      });

      const targetRows = Math.max(12, tableRows.length);
      while (tableRows.length < targetRows) {
        tableRows.push(["", "", "", "R$ -", "R$ -", "", "R$ -", "R$ -"]);
      }

      totalsRow = [
        {
          content: "VALOR TOTAL DO SERVIÇO",
          colSpan: 6,
          styles: { fontStyle: "bold", halign: "right", fillColor: [255, 255, 0] },
        },
        {
          content: `R$ ${quote.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          styles: { fontStyle: "bold", halign: "center", fillColor: [168, 230, 207] },
        },
        {
          content: `R$ ${quote.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          styles: { fontStyle: "bold", halign: "center", fillColor: [255, 204, 153] },
        },
      ];

      columnStyles = {
        0: { cellWidth: 42 },
        1: { cellWidth: 35, halign: "center" },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 20, halign: "right" },
        5: { cellWidth: 10, halign: "center" },
        6: { cellWidth: 23.5, halign: "right", fillColor: [224, 247, 250] },
        7: { cellWidth: 23.5, halign: "right", fillColor: [255, 243, 224] },
      };
    }

    autoTable(doc, {
      head: headRow,
      body: [...tableRows, totalsRow as any],
      startY: 53,
      margin: { left: 10, right: 10, top: 53, bottom: 15 },
      theme: "grid",
      styles: {
        fontSize: 7,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        cellPadding: 1.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [168, 230, 207],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 6.5,
      },
      columnStyles,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`ORÇAMENTO VÁLIDO POR ${quote.validityDays || 10} DIAS`, 105, finalY, { align: "center" });

    const reportSuffix =
      reportMode === "COM_MATERIAL"
        ? "_Com_Material"
        : reportMode === "SEM_MATERIAL"
        ? "_Sem_Material"
        : "";

    doc.save(`Orcamento_Corte_Laser_${quote.quoteCode}_${quote.customerName.replace(/\s+/g, "_")}${reportSuffix}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-widest mb-1">
            <Calculator size={16} /> Módulo de Engenharia & Custos
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Orçamentos de Corte a Laser
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Gerenciador de cálculo assertivo com e sem material • Marcos Projetista, PCP e Gerência
          </p>
        </div>

        <button
          onClick={handleNewQuote}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <Plus size={18} /> Novo Orçamento Laser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Total Orçamentos
            </span>
            <span className="text-2xl font-black text-slate-800">
              {db.laserQuotes?.length || 0}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Em Rascunho / Análise
            </span>
            <span className="text-2xl font-black text-amber-600">
              {(db.laserQuotes || []).filter((q) => q.status === "RASCUNHO" || q.status === "ENVIADO").length}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Taxa de Conversão
            </span>
            {(() => {
              const totalCount = db.laserQuotes?.length || 0;
              const approvedCount = (db.laserQuotes || []).filter(
                (q) =>
                  q.status === "APROVADO" ||
                  q.status === "APROVADO_COM_MATERIAL" ||
                  q.status === "APROVADO_SEM_MATERIAL"
              ).length;
              const rate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : "0.0";
              return (
                <div>
                  <span className="text-2xl font-black text-emerald-600">{rate}%</span>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {approvedCount} de {totalCount} aprovados
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter and List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por cliente, código ou item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            {[
              { id: "TODOS", label: "TODOS" },
              { id: "RASCUNHO", label: "RASCUNHO" },
              { id: "ENVIADO", label: "ENVIADO" },
              { id: "APROVADO_COM_MATERIAL", label: "APROVADO C/ MAT." },
              { id: "APROVADO_SEM_MATERIAL", label: "APROVADO S/ MAT." },
              { id: "REJEITADO", label: "REJEITADO" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === st.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quotes Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100/80 text-[10px] uppercase tracking-widest text-slate-500 font-extrabold border-b border-slate-200">
                <th className="p-3">Código</th>
                <th className="p-3">Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-center">Qtd. Itens</th>
                <th className="p-3 text-right">Com Material</th>
                <th className="p-3 text-right">Sem Material</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Criado Por</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {quotesList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 font-medium">
                    Nenhum orçamento encontrado. Clique em "+ Novo Orçamento Laser" para criar.
                  </td>
                </tr>
              ) : (
                quotesList.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-indigo-600">{q.quoteCode}</td>
                    <td className="p-3 text-slate-600 font-medium">
                      {new Date(q.createdDate + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{q.customerName}</td>
                    <td className="p-3 text-center font-bold text-slate-600">{q.items?.length || 0}</td>
                    <td className="p-3 text-right font-bold text-emerald-700 bg-emerald-50/50">
                      R$ {q.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-bold text-blue-700 bg-blue-50/50">
                      R$ {q.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const badge = getStatusBadge(q.status);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-slate-500 font-medium">{q.createdBy}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingQuote(q)}
                          title="Visualizar Orçamento"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReportMode("AMBOS");
                            setPdfModalQuote(q);
                          }}
                          title="Emitir Relatório PDF"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleEditQuote(q)}
                          title="Editar Orçamento"
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuote(q.id)}
                          title="Excluir"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Calculator size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg text-white">
                      {editingQuote ? `Editar Orçamento #${editingQuote.quoteCode}` : "Novo Orçamento de Corte a Laser"}
                    </h2>
                    <span className="font-mono text-xs px-2.5 py-0.5 bg-emerald-500/30 text-emerald-300 rounded-md border border-emerald-500/40 font-bold">
                      {currentQuoteCode}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Calculadora Oficial Império Jomarci
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Company Banner */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div>
                  <h3 className="font-black text-emerald-900 text-sm tracking-wide">
                    IMPÉRIO JOMARCI INDUSTRIA E COMERCIO LTDA
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Avenida Jesus Brandao, 121 (San Raphael I) Ubá MG • CNPJ: 02.411.952/0001-23
                  </p>
                </div>
                <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
                  Modelo Espelho Oficial
                </div>
              </div>

              {/* Quote Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="relative">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Cliente Cadastrado (Buscar)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    <input
                      type="text"
                      placeholder="Pesquisar cliente..."
                      value={customerSearchTerm}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      className="w-full pl-8 pr-7 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                    />
                    {customerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchTerm("");
                          setIsCustomerDropdownOpen(true);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isCustomerDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsCustomerDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredCustomersList.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            Nenhum cliente cadastrado encontrado
                          </div>
                        ) : (
                          filteredCustomersList.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCustomerName(c.name);
                                setSelectedCustomerId(c.id);
                                const contactText = [c.phone, c.email].filter(Boolean).join(" - ");
                                setContactInfo(contactText);
                                setCustomerSearchTerm(c.name);
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="w-full text-left p-2.5 hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div>
                                <span className="block text-xs font-bold text-slate-800">{c.name}</span>
                                {c.tradeName && c.tradeName !== c.name && (
                                  <span className="block text-[10px] text-slate-500">{c.tradeName}</span>
                                )}
                              </div>
                              {c.phone && (
                                <span className="text-[10px] font-mono text-slate-400">{c.phone}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Nome do Cliente (Livre)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Trestec"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Contato
                  </label>
                  <input
                    type="text"
                    placeholder="Telefone / Email"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">
                    Data e Validade (Dias)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={createdDate}
                      onChange={(e) => setCreatedDate(e.target.value)}
                      className="w-2/3 p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-800"
                    />
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="w-1/3 p-2 border border-slate-200 rounded-lg text-xs font-bold text-center bg-white text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Global Default Calculation Sliders */}
              <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <Sparkles size={16} className="text-indigo-600" /> Parâmetros do Orçamento:
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Taxa Tempo (R$/s):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.15"
                      max="0.60"
                      value={defaultRatePerSec}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDefaultRatePerSec(val);
                        setItemCuttingRatePerSec(val);
                      }}
                      className="w-16 p-1.5 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 bg-white text-center"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Valor Chapa (R$/KG):</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={defaultPricePerKg}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDefaultPricePerKg(val);
                        setItemPricePerKg(val);
                      }}
                      className="w-16 p-1.5 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 bg-white text-center"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Taxa Dobra (R$/KG):</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={defaultBendingRatePerKg}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDefaultBendingRatePerKg(val);
                        setItemBendingRatePerKg(val);
                      }}
                      className="w-16 p-1.5 border border-indigo-200 rounded-lg text-xs font-bold text-amber-700 bg-white text-center"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-slate-100 p-1 px-2 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      Custos Extra (R$):
                    </span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      placeholder="0.00"
                      value={extraCosts || ""}
                      onChange={(e) => setExtraCosts(Math.max(0, Number(e.target.value)))}
                      className="w-20 p-1 border border-slate-300 rounded text-xs font-extrabold text-slate-900 bg-white text-center"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-amber-100/60 p-1 px-2 rounded-lg border border-amber-200">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                      <Percent size={13} className="text-amber-700" /> Acréscimo (%):
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={additionPercent}
                      onChange={(e) => setAdditionPercent(Math.max(0, Number(e.target.value)))}
                      className="w-16 p-1 border border-amber-300 rounded text-xs font-extrabold text-amber-950 bg-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Item Calculator / Form Drawer */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-extrabold text-xs uppercase text-slate-700 flex items-center gap-2">
                    <Plus size={14} className="text-emerald-600" />
                    {editingItemIndex !== null ? `Editar Item #${editingItemIndex + 1}` : "Adicionar Item ao Orçamento"}
                  </h4>
                  {editingItemIndex !== null && (
                    <button
                      onClick={resetItemForm}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

                {/* Main Item Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Descrição do Item / Peça
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: EUROPA CHAPA LATERAL DE SECCIONADORA CORTE LASER PÇ1"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Tipo de Material
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Aço carbono"
                      value={itemMaterialType}
                      onChange={(e) => setItemMaterialType(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* Thickness Presets */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Atalho de Espessura da Chapa
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {THICKNESS_PRESETS.map((p) => (
                      <button
                        type="button"
                        key={p.fraction}
                        onClick={() => {
                          setItemThicknessMm(p.mm);
                          setItemThicknessLabel(p.fraction);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                          itemThicknessLabel === p.fraction || itemThicknessMm === p.mm
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {p.fraction} ({p.mm}mm)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dobra Option Card */}
                <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={itemHasBending}
                      onChange={(e) => setItemHasBending(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Possui Serviço de Dobra?</span>
                  </label>

                  {itemHasBending && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-600">Qtd. Dobras:</span>
                        <input
                          type="number"
                          min="1"
                          value={itemBendingQuantity}
                          onChange={(e) => setItemBendingQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-16 p-1 border border-amber-300 rounded-md text-xs font-bold text-amber-900 bg-white text-center focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-600">Valor Dobra (R$/KG):</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={itemBendingRatePerKg}
                          onChange={(e) => setItemBendingRatePerKg(Number(e.target.value))}
                          className="w-20 p-1 border border-amber-300 rounded-md text-xs font-bold text-amber-900 bg-white text-center focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <span className="text-xs font-mono text-amber-800 bg-amber-100/80 px-2 py-1 rounded border border-amber-300">
                        Custo Dobra: <strong>R$ {currentItemCalculations.bendingCost.toFixed(2)}</strong> ({currentItemCalculations.calculatedWeightKg.toFixed(2)} kg × R$ {itemBendingRatePerKg.toFixed(2)} × {itemBendingQuantity} dobra{itemBendingQuantity > 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>

                {/* Dimensions & Time Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Comprimento (mm)
                    </label>
                    <input
                      type="number"
                      value={itemLengthMm}
                      onChange={(e) => setItemLengthMm(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-bold text-center text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Largura (mm)
                    </label>
                    <input
                      type="number"
                      value={itemWidthMm}
                      onChange={(e) => setItemWidthMm(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-bold text-center text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Espessura (mm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemThicknessMm}
                      onChange={(e) => {
                        setItemThicknessMm(Number(e.target.value));
                        setItemThicknessLabel(`${e.target.value}mm`);
                      }}
                      className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-bold text-center text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Tempo Corte (s)
                    </label>
                    <input
                      type="number"
                      value={itemCuttingTimeSeconds}
                      onChange={(e) => setItemCuttingTimeSeconds(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-bold text-center text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Qtd. Peças
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value))}
                      className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-bold text-center text-slate-800"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddOrUpdateItem}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      {editingItemIndex !== null ? "Salvar Item" : "+ Add Item"}
                    </button>
                  </div>
                </div>

                {/* Live Formula Preview Card */}
                <div className="bg-slate-900 text-white p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Medidas</span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {currentItemCalculations.measures}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Peso Unit.</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {currentItemCalculations.calculatedWeightKg.toFixed(2)} KG
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Custo Corte</span>
                    <span className="text-xs font-mono font-bold text-blue-300">
                      R$ {currentItemCalculations.cuttingCost.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Custo Material</span>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      R$ {currentItemCalculations.materialCost.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Custo Dobra</span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      R$ {currentItemCalculations.bendingCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-emerald-950/80 p-1.5 rounded-lg border border-emerald-800">
                    <span className="text-[9px] text-emerald-300 uppercase font-bold block">Unit. c/ Material</span>
                    <span className="text-xs font-mono font-extrabold text-emerald-200">
                      R$ {currentItemCalculations.unitPriceWithMaterial.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-blue-950/80 p-1.5 rounded-lg border border-blue-800">
                    <span className="text-[9px] text-blue-300 uppercase font-bold block">Unit. s/ Material</span>
                    <span className="text-xs font-mono font-extrabold text-blue-200">
                      R$ {currentItemCalculations.unitPriceWithoutMaterial.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Spreadsheet Table (Exact visual layout as reference image) */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs uppercase text-slate-700">
                  Espelho da Tabela do Orçamento ({items.length} itens)
                </h4>

                <div className="overflow-x-auto border-2 border-slate-900 rounded-xl shadow-md">
                  <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                    <thead>
                      <tr className="bg-[#a8e6cf] text-slate-900 font-extrabold border-b-2 border-slate-900 text-[10px] uppercase">
                        <th className="p-2.5 border-r border-slate-900">DESCRIÇÃO</th>
                        <th className="p-2.5 border-r border-slate-900 text-center w-28">MEDIDAS</th>
                        <th className="p-2.5 border-r border-slate-900 text-center w-24">MATERIAL</th>
                        <th className="p-2.5 border-r border-slate-900 text-right w-32">VALOR UNITÁRIO COM MATERIAL</th>
                        <th className="p-2.5 border-r border-slate-900 text-right w-32">VALOR UNITÁRIO SEM MATERIAL</th>
                        <th className="p-2.5 border-r border-slate-900 text-center w-16">Qtd.</th>
                        <th className="p-2.5 border-r border-slate-900 text-right w-36 bg-[#e0f7fa]">VALOR TOTAL POR PEÇA COM MATERIAL</th>
                        <th className="p-2.5 border-r border-slate-900 text-right w-36 bg-[#fff3e0]">VALOR TOTAL POR PEÇA SEM MATERIAL</th>
                        <th className="p-2.5 text-center w-16">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-medium text-slate-800">
                      {computedItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-6 text-slate-400">
                            Nenhum item adicionado. Utilize o formulário acima para adicionar os itens.
                          </td>
                        </tr>
                      ) : (
                        computedItems.map((it, idx) => (
                          <tr key={it.id} className="hover:bg-slate-100 transition">
                            <td className="p-2 border-r border-slate-300 font-bold">
                              {it.description}
                              {it.hasBending && (
                                <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-100 text-amber-800 rounded border border-amber-300">
                                  c/ {it.bendingQuantity || 1} Dobra{(it.bendingQuantity || 1) > 1 ? "s" : ""}
                                </span>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-center font-mono">{formatItemMeasures(it)}</td>
                            <td className="p-2 border-r border-slate-300 text-center">{it.materialType}</td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono">
                              R$ {it.unitPriceWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono">
                              R$ {it.unitPriceWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-center font-bold">{it.quantity}</td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono font-bold bg-[#e0f7fa]">
                              R$ {it.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono font-bold bg-[#fff3e0]">
                              R$ {it.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditItemRow(idx)}
                                  className="text-indigo-600 hover:text-indigo-900 p-1"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-rose-600 hover:text-rose-900 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      {(extraCosts > 0 || additionPercent > 0) && (
                        <tr className="bg-slate-200/80 border-t-2 border-slate-900 font-bold text-xs text-slate-800">
                          <td colSpan={6} className="p-2 text-right uppercase border-r border-slate-900">
                            SOMA BASE DOS ITENS (SUBTOTAL)
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-900">
                            R$ {baseSubtotalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-900">
                            R$ {baseSubtotalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      )}
                      {extraCosts > 0 && (
                        <tr className="bg-slate-100 border-t border-slate-900 font-bold text-xs text-slate-800">
                          <td colSpan={6} className="p-2 text-right uppercase border-r border-slate-900">
                            CUSTOS EXTRA RATEADOS NOS VALORES UNITÁRIOS
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-900 text-indigo-900">
                            + R$ {extraCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-900 text-indigo-900">
                            + R$ {extraCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      )}
                      {additionPercent > 0 && (
                        <tr className="bg-amber-100/90 border-t border-slate-900 font-bold text-xs text-amber-950">
                          <td colSpan={6} className="p-2 text-right uppercase border-r border-slate-900">
                            ACRÉSCIMO MARGEM (+{additionPercent}% INCORPORADO NO UNITÁRIO)
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-900 text-amber-900">
                            + R$ {(grandTotalWithMaterial - (baseSubtotalWithMaterial + extraCosts)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-900 text-amber-900">
                            + R$ {(grandTotalWithoutMaterial - (baseSubtotalWithoutMaterial + extraCosts)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      )}
                      <tr className="bg-yellow-300 border-t-2 border-slate-900 font-black text-xs text-slate-900">
                        <td colSpan={6} className="p-2.5 text-right uppercase border-r border-slate-900">
                          VALOR TOTAL DO SERVIÇO {additionPercent > 0 ? `(C/ +${additionPercent}%)` : ""}
                        </td>
                        <td className="p-2.5 text-right font-mono text-sm border-r border-slate-900 bg-[#a8e6cf]">
                          R$ {grandTotalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-sm bg-[#ffcc80]">
                          R$ {grandTotalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="text-center font-bold text-xs text-slate-700 uppercase tracking-widest pt-2">
                  ORÇAMENTO VÁLIDO POR {validityDays} DIAS
                </div>
              </div>

              {/* Additional Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Status do Orçamento
                  </label>
                  <select
                    value={quoteStatus}
                    onChange={(e) => setQuoteStatus(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800"
                  >
                    <option value="RASCUNHO">RASCUNHO</option>
                    <option value="ENVIADO">ENVIADO AO CLIENTE</option>
                    <option value="APROVADO_COM_MATERIAL">APROVADO C/ MATERIAL</option>
                    <option value="APROVADO_SEM_MATERIAL">APROVADO S/ MATERIAL</option>
                    <option value="APROVADO">APROVADO (GERAL)</option>
                    <option value="REJEITADO">REJEITADO</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Observações Internas (Engenharia / PCP)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cliente vai fornecer chapa de 1/2 em 15/08"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-semibold">
                Peso total estimado do lote de chapa: <strong className="text-slate-800">{grandTotalWeightKg.toFixed(2)} KG</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuote}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle size={16} /> Salvar Orçamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW POPUP MODAL (OLHINHO) */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Eye size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg text-white">
                      Visualizar Orçamento #{viewingQuote.quoteCode}
                    </h2>
                    {(() => {
                      const badge = getStatusBadge(viewingQuote.status);
                      return (
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <span className="text-xs text-slate-400">
                    Império Jomarci • Criado por {viewingQuote.createdBy}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingQuote(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Customer & Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Cliente</span>
                  <span className="font-bold text-slate-800 text-sm">{viewingQuote.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Contato</span>
                  <span className="font-semibold text-slate-700">{viewingQuote.contactInfo || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Data Emissão</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(viewingQuote.createdDate + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Validade</span>
                  <span className="font-semibold text-slate-700">{viewingQuote.validityDays || 10} dias</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-extrabold text-xs uppercase text-slate-700 mb-2">
                  Itens do Orçamento ({viewingQuote.items?.length || 0})
                </h4>
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-extrabold text-[10px] uppercase text-slate-600 border-b border-slate-300">
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 text-center">Medidas</th>
                        <th className="p-2.5 text-center">Material</th>
                        <th className="p-2.5 text-right">Unit. c/ Mat</th>
                        <th className="p-2.5 text-right">Unit. s/ Mat</th>
                        <th className="p-2.5 text-center">Qtd</th>
                        <th className="p-2.5 text-right bg-emerald-50 text-emerald-900">Total c/ Mat</th>
                        <th className="p-2.5 text-right bg-blue-50 text-blue-900">Total s/ Mat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(viewingQuote.items || []).map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">
                            {it.description}
                            {it.hasBending && (
                              <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-amber-100 text-amber-800 rounded border border-amber-300">
                                c/ Dobra
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">{formatItemMeasures(it)}</td>
                          <td className="p-2.5 text-center text-slate-700">{it.materialType}</td>
                          <td className="p-2.5 text-right font-mono">
                            R$ {it.unitPriceWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            R$ {it.unitPriceWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right font-mono font-bold bg-emerald-50/50 text-emerald-800">
                            R$ {it.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold bg-blue-50/50 text-blue-800">
                            R$ {it.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Peso Total Lote</span>
                    <span className="text-sm font-mono font-bold text-amber-300">{(viewingQuote.totalWeightKg || 0).toFixed(2)} KG</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Custo Dobra</span>
                    <span className="text-sm font-mono font-bold text-amber-400">R$ {(viewingQuote.totalBendingCost || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Acréscimo Adicional</span>
                    <span className="text-sm font-mono font-bold text-amber-300">+{viewingQuote.additionPercent || 0}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase">{viewingQuote.status}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">TOTAL FINAL COM MATERIAL:</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      R$ {viewingQuote.totalWithMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">TOTAL FINAL SEM MATERIAL:</span>
                    <span className="text-2xl font-black text-blue-400 font-mono">
                      R$ {viewingQuote.totalWithoutMaterial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes if any */}
              {viewingQuote.notes && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs">
                  <strong className="text-amber-900 block mb-0.5">Observações Internas:</strong>
                  <p className="text-amber-800">{viewingQuote.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setViewingQuote(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const q = viewingQuote;
                    setViewingQuote(null);
                    handleEditQuote(q);
                  }}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit size={14} /> Editar Orçamento
                </button>
                <button
                  onClick={() => {
                    const q = viewingQuote;
                    setSelectedReportMode("AMBOS");
                    setPdfModalQuote(q);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Download size={14} /> Emitir PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF REPORT MODE MODAL */}
      {pdfModalQuote && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Opções de Emissão de Relatório PDF</h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {pdfModalQuote.quoteCode} - {pdfModalQuote.customerName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPdfModalQuote(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Selecione quais valores devem ser exibidos nas colunas e totais do relatório oficial em PDF enviado para o cliente:
            </p>

            <div className="space-y-2.5">
              <label
                onClick={() => setSelectedReportMode("AMBOS")}
                className={`p-3.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition ${
                  selectedReportMode === "AMBOS"
                    ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="reportMode"
                    checked={selectedReportMode === "AMBOS"}
                    onChange={() => setSelectedReportMode("AMBOS")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-xs font-extrabold">Com e Sem Material (Padrão Completo)</span>
                    <span className="block text-[11px] text-slate-500">
                      Exibe ambas as colunas de valor unitário e totais
                    </span>
                  </div>
                </div>
              </label>

              <label
                onClick={() => setSelectedReportMode("COM_MATERIAL")}
                className={`p-3.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition ${
                  selectedReportMode === "COM_MATERIAL"
                    ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="reportMode"
                    checked={selectedReportMode === "COM_MATERIAL"}
                    onChange={() => setSelectedReportMode("COM_MATERIAL")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-xs font-extrabold">Somente com o Valor COM Material</span>
                    <span className="block text-[11px] text-slate-500">
                      Ideal para clientes que compram a peça pronta (chapa + corte)
                    </span>
                  </div>
                </div>
              </label>

              <label
                onClick={() => setSelectedReportMode("SEM_MATERIAL")}
                className={`p-3.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition ${
                  selectedReportMode === "SEM_MATERIAL"
                    ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="reportMode"
                    checked={selectedReportMode === "SEM_MATERIAL"}
                    onChange={() => setSelectedReportMode("SEM_MATERIAL")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-xs font-extrabold">Somente com o Valor SEM Material</span>
                    <span className="block text-[11px] text-slate-500">
                      Ideal para prestação de serviço em chapa enviada pelo cliente
                    </span>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPdfModalQuote(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const q = pdfModalQuote;
                  const mode = selectedReportMode;
                  setPdfModalQuote(null);
                  handleExportPDF(q, mode);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} /> Gerar e Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
