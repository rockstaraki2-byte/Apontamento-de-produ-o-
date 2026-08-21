import React, { useState, useMemo, useRef } from "react";
import { useDatabase } from "./useDatabase";
import { ReportHeaderLogo } from "./components/ReportHeaderLogo";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  Play,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Clock,
  PlayCircle,
  Filter,
  AlertTriangle,
  X,
  Sparkles,
  RefreshCw,
  Printer,
  FileText,
  FileDown,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Tag,
  Copy
} from "lucide-react";
import { printHtml, printElementById } from "./printUtils";
import {
  ScreenLayout,
  ScreenHeader,
  ScrollContainer,
  SectionBlock
} from "./components/Layout";
import type { User, Order, ProductionBatch } from "./types";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BatchPrintSheet,
  waitForFonts,
  waitForImages,
  waitForStableLayout,
  assertPrintableElement
} from "./BatchPrintSheet";
import { AcompanhamentoPrintSheet } from "./AcompanhamentoPrintSheet";
import { BatchEtiquetasPrintSheet, buildBatchLabelItemsData } from "./BatchEtiquetasPrintSheet";
import { generateZPLFromBatchLabels } from "./utils/zplUtils";
import { getItemUnit } from "./utils/unitUtils";
import { resolveCompanyInfo } from "./utils/companyUtils";
import html2pdf from "html2pdf.js";

export function LotesScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "IN_PRODUCTION" | "COMPLETED">("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [previewBatch, setPreviewBatch] = useState<ProductionBatch | null>(null);
  const [pdfItems, setPdfItems] = useState<number[]>([]);
  const [customPrintDeadline, setCustomPrintDeadline] = useState("");
  const [customPrintNotes, setCustomPrintNotes] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDirectPrinting, setIsDirectPrinting] = useState(false);
  const [isDirectPrintingAcomp, setIsDirectPrintingAcomp] = useState(false);
  const [collapsedBatches, setCollapsedBatches] = useState<Record<number, boolean>>({});
  const printRef = useRef<HTMLDivElement | null>(null);

  const [isGeneratingAcomp, setIsGeneratingAcomp] = useState(false);
  const [acompBatch, setAcompBatch] = useState<ProductionBatch | null>(null);
  const acompPrintRef = useRef<HTMLDivElement | null>(null);

  const [isPreviewAcompOpen, setIsPreviewAcompOpen] = useState(false);
  const [previewAcompBatch, setPreviewAcompBatch] = useState<ProductionBatch | null>(null);
  const [acompSelectedOrderIds, setAcompSelectedOrderIds] = useState<number[]>([]);
  const [destrincharComposicoes, setDestrincharComposicoes] = useState(false);
  const [ocultarPaiComposicao, setOcultarPaiComposicao] = useState(false);

  // Batch Etiquetas State
  const [isPreviewEtiquetasOpen, setIsPreviewEtiquetasOpen] = useState(false);
  const [previewEtiquetasBatch, setPreviewEtiquetasBatch] = useState<ProductionBatch | null>(null);
  const [etiquetasSelectedOrderIds, setEtiquetasSelectedOrderIds] = useState<number[]>([]);
  const [etiquetasLayoutFormat, setEtiquetasLayoutFormat] = useState<"thermal" | "a4">("thermal");
  const [etiquetasShowImage, setEtiquetasShowImage] = useState(() => localStorage.getItem("etiquetas_show_image") === "true");
  const [etiquetasDestrinchar, setEtiquetasDestrinchar] = useState(false);
  const [etiquetasOcultarPai, setEtiquetasOcultarPai] = useState(false);
  const [isDirectPrintingEtiquetas, setIsDirectPrintingEtiquetas] = useState(false);
  const [isGeneratingEtiquetasPdf, setIsGeneratingEtiquetasPdf] = useState(false);
  const [isGeneratingEtiquetasZPL, setIsGeneratingEtiquetasZPL] = useState(false);
  const [modalZPL, setModalZPL] = useState<string | null>(null);
  const [etiquetasSearchTerm, setEtiquetasSearchTerm] = useState("");

  // Pagination for batch list: show 10 batches by default
  const [visibleCount, setVisibleCount] = useState(10);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilterStatus, setExportFilterStatus] = useState<"TODOS" | "PRODUZIDOS" | "EM_PRODUCAO" | "FALTA_PRODUZIR">("TODOS");
  const [exportFormat, setExportFormat] = useState<"EXCEL" | "PDF">("EXCEL");

  React.useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, statusFilter]);

  const canChangeStatus = useMemo(() => {
    if (!currentUser) return false;
    const nameLower = currentUser.name?.toLowerCase() || "";
    return (
      currentUser.id === "gerencia" ||
      currentUser.id === "projetista_marcos" ||
      currentUser.id === "dinei" ||
      currentUser.role === "ADMIN" ||
      nameLower.includes("marcos") ||
      nameLower.includes("dinei") ||
      nameLower.includes("gerencia")
    );
  }, [currentUser]);

  const getOrderSectorTracking = (order: Order, batchId: number) => {
    if (!order) {
      return {
        isActive: false,
        hasHistory: false,
        sectorName: "",
        operatorName: "",
        timestamp: "",
      };
    }

    // 1. Check if the order/item is currently active in db.activePacks
    const activeTask = (db.activePacks || []).find((t) => {
      if (!t) return false;
      if (t.taskId && (t.taskId === order.id || String(t.taskId) === String(order.id))) return true;
      if (t.associatedBatchId === batchId && t.itemId === order.itemId) return true;
      if (t.itemId === order.itemId && (!t.associatedBatchId || t.associatedBatchId === batchId)) return true;
      return false;
    });

    if (activeTask) {
      const rawOp = String(activeTask.operatorId || "").trim().toLowerCase();
      const baseOp = rawOp.split(" - ")[0].trim();
      const operator = (db.users || []).find(
        (u) =>
          u &&
          (String(u.id || "").toLowerCase() === baseOp ||
            String(u.id || "").toLowerCase() === rawOp ||
            (u.name && u.name.toLowerCase() === baseOp) ||
            (u.name && u.name.toLowerCase() === rawOp))
      );

      let sectorName = activeTask.sectorName;
      if (!sectorName && activeTask.sectorId) {
        const sec = (db.sectors || []).find((s) => s && String(s.id) === String(activeTask.sectorId));
        if (sec) sectorName = sec.name;
      }
      if (!sectorName && operator && Array.isArray(operator.sectorIds) && operator.sectorIds.length > 0) {
        const sec = (db.sectors || []).find((s) => s && operator.sectorIds?.some((sid) => String(sid) === String(s.id)));
        if (sec) sectorName = sec.name;
      }
      if (!sectorName && operator?.role) {
        const roleMap: Record<string, string> = {
          SOLDA: "Solda",
          PINTURA: "Pintura",
          EMBALAGEM: "Embalagem",
          CORTE_LASER: "Corte Laser",
          PRENSA_EDUARDO: "Prensa (Eduardo)",
          PRENSA_RAFAEL: "Prensa (Rafael)",
          TORNO_CNC_WILLIAN: "Torno CNC (Willian)",
          TORNO_CNC_HENRIQUE: "Torno CNC (Henrique)",
          INJETORA: "Injetora",
          BANHO_QUIMICO: "Banho Químico",
          MONTAGEM_RETRATIL: "Montagem Retrátil",
          QUALIDADE: "Controle de Qualidade",
        };
        if (roleMap[operator.role]) sectorName = roleMap[operator.role];
      }
      if (!sectorName && activeTask.type) {
        const typeMap: Record<string, string> = {
          PINTURA: "Pintura",
          CORTE_LASER: "Corte Laser",
          EMBALAGEM: "Embalagem",
          PRENSA_EDUARDO: "Prensa (Eduardo)",
          PRENSA_RAFAEL: "Prensa (Rafael)",
          TORNO_CNC_WILLIAN: "Torno CNC (Willian)",
          TORNO_CNC_HENRIQUE: "Torno CNC (Henrique)",
          BANHO_QUIMICO: "Banho Químico",
          INJETORA: "Injetora",
          MONTAGEM_RETRATIL: "Montagem Retrátil",
          SOLDA: "Solda",
        };
        sectorName = typeMap[activeTask.type] || activeTask.processName || "Produção";
      }

      return {
        isActive: true,
        hasHistory: true,
        sectorName: sectorName || "Fábrica",
        operatorName: operator?.name || activeTask.operatorId || "Operador",
        timestamp: "",
      };
    }

    // 2. Check the most recent production log in db.logs
    const relevantLogs = (db.logs || []).filter(
      (l) => l && (l.orderId === order.id || l.itemId === order.itemId)
    );

    if (relevantLogs.length > 0) {
      const lastLog = [...relevantLogs].sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0))[0];
      const rawOp = String(lastLog?.operatorId || "").trim().toLowerCase();
      const baseOp = rawOp.split(" - ")[0].trim();
      const operator = (db.users || []).find(
        (u) =>
          u &&
          (String(u.id || "").toLowerCase() === baseOp ||
            String(u.id || "").toLowerCase() === rawOp ||
            (u.name && u.name.toLowerCase() === baseOp) ||
            (u.name && u.name.toLowerCase() === rawOp))
      );

      let sectorName = "";
      if (operator && Array.isArray(operator.sectorIds) && operator.sectorIds.length > 0) {
        const sec = (db.sectors || []).find((s) => s && operator.sectorIds?.some((sid) => String(sid) === String(s.id)));
        if (sec) sectorName = sec.name;
      }
      if (!sectorName && operator?.role) {
        const roleMap: Record<string, string> = {
          SOLDA: "Solda",
          PINTURA: "Pintura",
          EMBALAGEM: "Embalagem",
          CORTE_LASER: "Corte Laser",
          PRENSA_EDUARDO: "Prensa (Eduardo)",
          PRENSA_RAFAEL: "Prensa (Rafael)",
          TORNO_CNC_WILLIAN: "Torno CNC (Willian)",
          TORNO_CNC_HENRIQUE: "Torno CNC (Henrique)",
          INJETORA: "Injetora",
          BANHO_QUIMICO: "Banho Químico",
          MONTAGEM_RETRATIL: "Montagem Retrátil",
          QUALIDADE: "Controle de Qualidade",
        };
        if (roleMap[operator.role]) sectorName = roleMap[operator.role];
      }
      if (!sectorName && lastLog?.type) {
        const typeMap: Record<string, string> = {
          PINTURA: "Pintura",
          CORTE_LASER: "Corte Laser",
          EMBALAGEM: "Embalagem",
          PRENSA_EDUARDO: "Prensa (Eduardo)",
          PRENSA_RAFAEL: "Prensa (Rafael)",
          TORNO_CNC_WILLIAN: "Torno CNC (Willian)",
          TORNO_CNC_HENRIQUE: "Torno CNC (Henrique)",
          BANHO_QUIMICO: "Banho Químico",
          INJETORA: "Injetora",
          MONTAGEM_RETRATIL: "Montagem Retrátil",
          SOLDA: "Solda",
        };
        sectorName = typeMap[lastLog.type] || lastLog.processName || "Produção";
      }

      let formattedTime = "";
      if (lastLog?.timestamp) {
        try {
          const d = new Date(lastLog.timestamp);
          if (!isNaN(d.getTime())) {
            formattedTime = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
          }
        } catch {
          formattedTime = "";
        }
      }

      return {
        isActive: false,
        hasHistory: true,
        sectorName: sectorName || "Produção",
        operatorName: operator?.name || lastLog?.operatorId || "Operador",
        timestamp: formattedTime,
      };
    }

    return {
      isActive: false,
      hasHistory: false,
      sectorName: "",
      operatorName: "",
      timestamp: "",
    };
  };

  const handleGenerateAcompPdf = async (b: ProductionBatch, selectedIds?: number[]) => {
    setIsGeneratingAcomp(true);
    setAcompBatch(b);
    if (selectedIds) {
      setAcompSelectedOrderIds(selectedIds);
    }
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const element = document.getElementById("acomp-print-root");
      if (!element) {
        throw new Error("Elemento de impressão externa não pôde ser encontrado.");
      }

      await waitForFonts();

      const pages = element.querySelectorAll(".acomp-page");
      if (pages.length === 0) {
        throw new Error("Nenhuma página de acompanhamento foi gerada para exportação.");
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        
        console.log(`[Acomp PDF] html2canvas start page ${i + 1}`);
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: 794,
          height: 1080,
          windowWidth: 794,
          windowHeight: 1080,
        });
        console.log(`[Acomp PDF] html2canvas done page ${i + 1}`);

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pageHeight);
      }

      const sanitizedName = b.name.replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`Ficha_Acompanhamento_Lote_${sanitizedName}.pdf`);
    } catch (e: any) {
      alert(`Erro ao salvar PDF de acompanhamento: ${e.message || e}`);
    } finally {
      setIsGeneratingAcomp(false);
      setAcompBatch(null);
    }
  };

  // Filter batches according to target user permissions
  const batches = useMemo(() => {
    const baseList = Array.isArray(db.productionBatches) ? db.productionBatches : [];

    if (
      !currentUser ||
      currentUser.role === "ADMIN" ||
      currentUser.role === "PCP" ||
      currentUser.role === "GERENCIA" ||
      currentUser.id === "gerencia"
    ) {
      return baseList;
    }
    
    // For operators with assigned batches, show assigned, otherwise show baseList
    const assigned = baseList.filter((b) => b && Array.isArray(b.assignedOperatorIds) && b.assignedOperatorIds.includes(currentUser.id));
    return assigned.length > 0 ? assigned : baseList;
  }, [db.productionBatches, currentUser]);

  // Apply search term and status filters
  const filteredBatches = useMemo(() => {
    let result = Array.isArray(batches) ? batches : [];

    if (statusFilter !== "ALL") {
      result = result.filter((b) => {
        if (!b) return false;
        if (statusFilter === "PENDING") return b.status === "PENDENTE" || !b.status;
        if (statusFilter === "IN_PRODUCTION") return b.status === "EM_PRODUCAO";
        if (statusFilter === "COMPLETED") return b.status === "CONCLUIDO";
        return true;
      });
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter((b) => {
        if (!b) return false;
        const matchesBatchName = (b.name || "").toLowerCase().includes(term);
        const matchesOrders = Array.isArray(b.orderIds) && b.orderIds.some((oid) => {
          const o = (db.orders || []).find((x) => x && x.id === oid);
          if (!o) return false;
          
          const item = (db.items || []).find((i) => i && i.id === o.itemId);
          return (
            (o.orderCode || "").toLowerCase().includes(term) ||
            (o.customerName || "").toLowerCase().includes(term) ||
            (item?.name && item.name.toLowerCase().includes(term))
          );
        });

        return matchesBatchName || matchesOrders;
      });
    }

    if (dateStart || dateEnd) {
      result = result.filter((b) => {
        if (!b || !b.createdAt) return false;
        try {
          const d = new Date(b.createdAt);
          if (isNaN(d.getTime())) return false;
          const batchDate = d.toISOString().split("T")[0];
          if (dateStart && batchDate < dateStart) return false;
          if (dateEnd && batchDate > dateEnd) return false;
          return true;
        } catch {
          return false;
        }
      });
    }

    // Sort: Active/non-completed batches first (newest to oldest), completed batches last (newest to oldest)
    return [...result].sort((a, b) => {
      if (!a || !b) return 0;
      const compA = a.status === "CONCLUIDO";
      const compB = b.status === "CONCLUIDO";
      if (compA !== compB) {
        return compA ? 1 : -1; // Completed goes to the bottom
      }
      const timeA = typeof a.createdAt === "number" ? a.createdAt : (new Date(a.createdAt || 0).getTime() || 0);
      const timeB = typeof b.createdAt === "number" ? b.createdAt : (new Date(b.createdAt || 0).getTime() || 0);
      return timeB - timeA; // Within same group, show newest first
    });
  }, [batches, searchTerm, statusFilter, db.orders, db.items, dateStart, dateEnd]);

  const paginatedBatches = useMemo(() => {
    return (filteredBatches || []).slice(0, visibleCount);
  }, [filteredBatches, visibleCount]);

  // General Statistics
  const stats = useMemo(() => {
    let totalItems = 0;
    let checkedItems = 0;
    let liberatedItems = 0;

    (batches || []).forEach((b) => {
      if (!b) return;
      const orderCount = Array.isArray(b.orderIds) ? b.orderIds.length : 0;
      totalItems += orderCount;
      checkedItems += Array.isArray(b.checkedOrderIds) ? b.checkedOrderIds.length : 0;
      liberatedItems += Array.isArray(b.liberatedOrderIds) ? b.liberatedOrderIds.length : 0;
    });

    return {
      activeBatches: (batches || []).length,
      pendingLiberation: Math.max(0, totalItems - liberatedItems),
      liberatedItems,
      checkedItems,
      totalItems
    };
  }, [batches]);

  const handleToggleCheck = async (batch: ProductionBatch, orderId: number) => {
    const checked = batch.checkedOrderIds || [];
    const isAlreadyChecked = checked.includes(orderId);
    const newChecked = isAlreadyChecked
      ? checked.filter((id) => id !== orderId)
      : [...checked, orderId];

    await db.updateProductionBatch({
      ...batch,
      checkedOrderIds: newChecked,
    });

    // Notify/Log this action
    await db.addLogs([
      {
        id: Date.now(),
        orderId: orderId,
        operatorId: currentUser.id || "OPERADOR",
        processName: "CHECK LOTE DE GERÊNCIA",
        customProductName: isAlreadyChecked
          ? `Item desmarcado como checado no lote ${batch.name} por ${currentUser.name}`
          : `Item checado com sucesso no lote ${batch.name} por ${currentUser.name}`,
        timestamp: Date.now(),
        durationMillis: 0,
        type: "PRODUCAO" as any,
      },
    ]);
  };

  const handleToggleLiberate = async (batch: ProductionBatch, orderId: number) => {
    const liberated = batch.liberatedOrderIds || [];
    const isAlreadyLiberated = liberated.includes(orderId);
    const newLiberated = isAlreadyLiberated
      ? liberated.filter((id) => id !== orderId)
      : [...liberated, orderId];

    await db.updateProductionBatch({
      ...batch,
      liberatedOrderIds: newLiberated,
    });

    // If we are liberating, transition the order status to EM_PRODUCAO
    const o = db.orders.find((x) => x.id === orderId);
    if (o && !isAlreadyLiberated && o.status === "PENDENTE") {
      await db.updateOrders([
        {
          ...o,
          status: "EM_PRODUCAO",
        },
      ]);
    }

    await db.addLogs([
      {
        id: Date.now(),
        orderId: orderId,
        operatorId: currentUser.id || "OPERADOR",
        processName: "LIBERAÇÃO LOTE DE GERÊNCIA",
        customProductName: isAlreadyLiberated
          ? `Liberação para produção cancelada no lote ${batch.name} por ${currentUser.name}`
          : `Item liberado para produção e enviado à fábrica no lote ${batch.name} por ${currentUser.name}`,
        timestamp: Date.now(),
        durationMillis: 0,
        type: "PRODUCAO" as any,
      },
    ]);
  };

  const handleExportBatchExcel = (batch: ProductionBatch) => {
    // Collect orders
    const orders = batch.orderIds
      .map((oid) => db.orders.find((x) => x.id === oid))
      .filter(Boolean) as Order[];

    if (orders.length === 0) {
      alert("Este lote não possui pedidos para exportar.");
      return;
    }

    // Build CSV contents with sep=; declaration for seamless Excel opening in Brazilian / standard locales
    let csvContent = "sep=;\n";
    csvContent += `INFORMAÇÕES DO LOTE\n`;
    csvContent += `Nome do Lote:;"${batch.name.replace(/"/g, '""')}"\n`;
    csvContent += `Prazo:;"${(batch.deadline || "-").replace(/"/g, '""')}"\n`;
    csvContent += `Data de Criação:;"${new Date(batch.createdAt).toLocaleString()}"\n`;
    csvContent += `Notas:;"${(batch.notes || "-").replace(/"/g, '""')}"\n\n`;

    // Table Column Headers
    const headers = [
      "Código do Pedido",
      "Cliente",
      "Representante",
      "Item",
      "Cor",
      "Tamanho",
      "Variação",
      "Unidade",
      "Quantidade",
      "Checado",
      "Liberado Fábrica",
      "Status Geral"
    ];
    csvContent += headers.map(h => `"${h}"`).join(";") + "\n";

    // Row parsing
    orders.forEach((o) => {
      const item = db.items.find((i) => i.id === o.itemId);
      const isChecked = batch.checkedOrderIds?.includes(o.id) ? "Sim" : "Não";
      const isLiberated = batch.liberatedOrderIds?.includes(o.id) ? "Sim" : "Não";
      const unit = getItemUnit(item, o);

      const r = [
        `#${o.orderCode || ""}`,
        o.customerName || "",
        o.representativeName || "",
        item?.name || "Desconhecido",
        o.color || "-",
        o.size || "-",
        o.variation || "-",
        unit,
        o.totalQuantity,
        isChecked,
        isLiberated,
        o.status || ""
      ];

      csvContent += r.map((val) => {
        const text = String(val).replace(/"/g, '""');
        return `"${text}"`;
      }).join(";") + "\n";
    });

    // Generate blob with UTF-8 BOM for perfect double-click parsing in Microsoft Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedBatchName = batch.name.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `Lote_${sanitizedBatchName}_tabela.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDirectPrint = async () => {
    if (!previewBatch) return;

    const ordersToPrint = previewBatch.orderIds
      .filter((oid) => pdfItems.includes(oid))
      .map((oid) => db.orders.find((x) => x.id === oid))
      .filter(Boolean);

    if (ordersToPrint.length === 0) {
      alert("Por favor, selecione pelo menos um pedido para imprimir.");
      return;
    }

    console.log("[Print] starting direct printing flow using printElementById...");
    setIsDirectPrinting(true);

    try {
      // Allow state update to propagate so React can mount the hidden print component
      await new Promise((resolve) => setTimeout(resolve, 500));

      const element = printRef.current;
      if (!element) {
        throw new Error("Elemento de impressão da folha não foi encontrado no DOM.");
      }

      const targetId = "batch-printable-sheet-container";
      const targetEl = document.getElementById(targetId);
      if (!targetEl) {
        throw new Error("A folha de impressão não pôde ser encontrada no DOM.");
      }

      // Execute direct print with our centralized print utility
      printElementById(targetId, previewBatch.name, true);

    } catch (err: any) {
      console.error("[Print] failed:", err);
      alert(`Erro na impressão direta: ${err.message || err}`);
    } finally {
      setIsDirectPrinting(false);
    }
  };

  const handleDirectPrintAcomp = async () => {
    if (!previewAcompBatch) return;

    console.log("[Print Acomp] starting direct printing flow using printElementById...");
    setIsDirectPrintingAcomp(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const targetId = "acompanhamento-printable-sheet-container";
      const targetEl = document.getElementById(targetId);
      if (!targetEl) {
        throw new Error("A ficha de acompanhamento não pôde ser encontrada no DOM.");
      }

      printElementById(targetId, `Acompanhamento_Lote_${previewAcompBatch.name}`, true);

    } catch (err: any) {
      console.error("[Print Acomp] failed:", err);
      alert(`Erro na impressão direta da ficha: ${err.message || err}`);
    } finally {
      setIsDirectPrintingAcomp(false);
    }
  };

  const handleDirectPrintEtiquetas = async () => {
    if (!previewEtiquetasBatch) return;

    console.log("[Print Etiquetas] starting direct printing flow using printElementById...");
    setIsDirectPrintingEtiquetas(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const targetId = "batch-etiquetas-printable-wrapper";
      const targetEl = document.getElementById(targetId);
      if (!targetEl) {
        throw new Error("O container de etiquetas do lote não foi encontrado no DOM.");
      }

      printElementById(targetId, `Etiquetas_Lote_${previewEtiquetasBatch.name}`, true);

    } catch (err: any) {
      console.error("[Print Etiquetas] failed:", err);
      alert(`Erro na impressão direta de etiquetas: ${err.message || err}`);
    } finally {
      setIsDirectPrintingEtiquetas(false);
    }
  };

  const handleGenerateEtiquetasPdf = async () => {
    if (!previewEtiquetasBatch) return;

    setIsGeneratingEtiquetasPdf(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const element = document.getElementById("batch-etiquetas-printable-wrapper");
      if (!element) {
        throw new Error("Elemento de etiquetas não foi localizado no DOM.");
      }

      await waitForFonts();

      const sanitizedName = previewEtiquetasBatch.name.replace(/[^a-zA-Z0-9]/g, "_");

      if (etiquetasLayoutFormat === "thermal") {
        const labelBoxes = element.querySelectorAll<HTMLElement>("[style*='100mm']");
        if (labelBoxes.length === 0) {
          throw new Error("Nenhuma etiqueta térmica foi encontrada para gerar o PDF.");
        }

        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [100, 50],
        });

        for (let i = 0; i < labelBoxes.length; i++) {
          const box = labelBoxes[i];
          const canvas = await html2canvas(box, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          const imgData = canvas.toDataURL("image/jpeg", 1.0);
          if (i > 0) {
            pdf.addPage([100, 50], "landscape");
          }
          pdf.addImage(imgData, "JPEG", 0, 0, 100, 50);
        }

        pdf.save(`Etiquetas_Termicas_10x5_Lote_${sanitizedName}.pdf`);
      } else {
        const a4Pages = element.querySelectorAll<HTMLElement>("[style*='210mm']");
        if (a4Pages.length === 0) {
          throw new Error("Nenhuma folha A4 de etiquetas foi encontrada para gerar o PDF.");
        }

        const pdf = new jsPDF("p", "mm", "a4");

        for (let i = 0; i < a4Pages.length; i++) {
          const page = a4Pages[i];
          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          const imgData = canvas.toDataURL("image/jpeg", 1.0);
          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        }

        pdf.save(`Etiquetas_A4_Lote_${sanitizedName}.pdf`);
      }
    } catch (e: any) {
      console.error("Erro ao gerar PDF de etiquetas:", e);
      alert(`Erro ao salvar PDF de etiquetas do lote: ${e.message || e}`);
    } finally {
      setIsGeneratingEtiquetasPdf(false);
    }
  };

  const handleGenerateEtiquetasZPL = async () => {
    if (!previewEtiquetasBatch || etiquetasSelectedOrderIds.length === 0) {
      alert("Nenhum pedido selecionado para gerar código ZPL.");
      return;
    }

    setIsGeneratingEtiquetasZPL(true);

    try {
      const labelItems = buildBatchLabelItemsData({
        batch: previewEtiquetasBatch,
        orderIds: etiquetasSelectedOrderIds,
        db,
        destrincharComposicoes: etiquetasDestrinchar,
        ocultarPaiComposicao: etiquetasOcultarPai,
      });

      const companyInfo = resolveCompanyInfo(db.activeTenant, db.systemSettings?.[0], db.tenants);
      const logoUrl = companyInfo.logoUrl || undefined;
      const companyName = companyInfo.companyName;
      const companySubtitle = companyInfo.companySubtitle;

      const zplString = await generateZPLFromBatchLabels(labelItems, logoUrl, companyName, etiquetasShowImage, companySubtitle);

      if (!zplString) {
        alert("Não foi possível gerar código ZPL para os itens selecionados.");
        return;
      }

      setModalZPL(zplString);
    } catch (err: any) {
      console.error("Erro ao gerar código ZPL do lote:", err);
      alert(`Erro ao gerar comandos ZPL das etiquetas: ${err.message || err}`);
    } finally {
      setIsGeneratingEtiquetasZPL(false);
    }
  };

  const handleCopyZPL = () => {
    if (!modalZPL) return;
    navigator.clipboard.writeText(modalZPL);
    alert("Código ZPL do lote copiado para a área de transferência com sucesso!");
    setModalZPL(null);
  };

  const handleGenerateReport = () => {
    let ordersToExport: { batch: ProductionBatch; order: Order; item: any; produced: number; missing: number; inProductionString: string; sectorName: string }[] = [];

    filteredBatches.forEach(batch => {
      const batchOrders = batch.orderIds
        .map(oid => db.orders.find(o => o.id === oid))
        .filter(Boolean) as Order[];
      
      batchOrders.forEach(o => {
        const item = db.items.find(i => i.id === o.itemId);
        const produced = o.producedQuantity || 0;
        const missing = Math.max(0, o.totalQuantity - produced);
        
        // Check active production
        const activePack = db.activePacks.find(p => 
          p.associatedBatchId === batch.id && 
          p.itemId === o.itemId &&
          p.color === o.color &&
          p.size === o.size &&
          p.variation === o.variation
        );
        
        let inProductionString = "-";
        if (activePack) {
          inProductionString = activePack.processName || activePack.type || "Sim";
        }

        const sectorName = db.sectors.find(s => s.id === batch.sectorId)?.name || "Geral";

        // Apply filters
        let include = true;
        if (exportFilterStatus === "PRODUZIDOS" && missing > 0) include = false;
        if (exportFilterStatus === "EM_PRODUCAO" && inProductionString === "-") include = false;
        if (exportFilterStatus === "FALTA_PRODUZIR" && missing === 0) include = false;

        if (include) {
          ordersToExport.push({ batch, order: o, item, produced, missing, inProductionString, sectorName });
        }
      });
    });

    if (ordersToExport.length === 0) {
      alert("Não há produtos nos lotes filtrados para exportar com os filtros atuais.");
      return;
    }

    const headers = [
      "Lote",
      "Setor Responsável",
      "Pedido",
      "Cliente",
      "Item",
      "Cor",
      "Tamanho",
      "Unidade",
      "Qtd. Solicitada",
      "Qtd. Produzida",
      "Faltante",
      "Em Produção"
    ];

    const getRowData = (o: any) => [
      o.batch.name,
      o.sectorName,
      `#${o.order.orderCode || ""}`,
      o.order.customerName || "",
      o.item?.name || "Desconhecido",
      o.order.color || "-",
      o.order.size || "-",
      getItemUnit(o.item, o.order),
      o.order.totalQuantity,
      o.produced,
      o.missing,
      o.inProductionString
    ];

    if (exportFormat === "EXCEL") {
      let csvContent = "sep=;\nRELATÓRIO GERAL DE PRODUTOS EM LOTES\n\n";
      csvContent += headers.map(h => `"${h}"`).join(";") + "\n";

      ordersToExport.forEach(o => {
        csvContent += getRowData(o).map(val => `"${String(val).replace(/"/g, '""')}"`).join(";") + "\n";
      });

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Relatorio_Lotes_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const pdf = new jsPDF("l", "pt", "a4");
      pdf.setFontSize(16);
      pdf.text("Relatório Geral de Produtos em Lotes", 40, 40);
      
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`, 40, 60);

      autoTable(pdf, {
        startY: 80,
        head: [headers],
        body: ordersToExport.map(getRowData),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });

      pdf.save(`Relatorio_Lotes_${new Date().toISOString().split("T")[0]}.pdf`);
    }

    setIsExportModalOpen(false);
  };

  return (
    <ScreenLayout id="lotes-screen-layout">
      <ScreenHeader
        title="Lotes de Gerência"
        description="Controle de liberação de lotes de produção encaminhados para você pela gerência."
        icon={<ClipboardList className="text-emerald-600" size={24} />}
      />

      <ScrollContainer paddingSize="dense" className="space-y-6">
        {/* Statistics Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Lotes Vinculados
              </span>
              <p className="text-2xl font-black text-slate-800">
                {stats.activeBatches}
              </p>
            </div>
            <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-lg">
              <Layers size={21} />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total de Itens
              </span>
              <p className="text-2xl font-black text-slate-800">
                {stats.totalItems}
              </p>
            </div>
            <div className="bg-slate-50 text-slate-600 p-2.5 rounded-lg">
              <Package size={21} />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ✓ Checados
              </span>
              <p className="text-2xl font-black text-emerald-600">
                {stats.checkedItems}
                <span className="text-xs text-slate-400 ml-1 font-semibold">
                  / {stats.totalItems}
                </span>
              </p>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg">
              <CheckCircle2 size={21} />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                🚀 Liberados para Fábrica
              </span>
              <p className="text-2xl font-black text-[#00b14f]">
                {stats.liberatedItems}
                <span className="text-xs text-slate-400 ml-1 font-semibold">
                  / {stats.totalItems}
                </span>
              </p>
            </div>
            <div className="bg-green-50 text-[#00b14f] p-2.5 rounded-lg font-bold">
              🚀
            </div>
          </div>
        </div>

        {/* Toolbar Filter / Search */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col gap-4 shadow-xs">
          <div className="flex flex-col 2xl:flex-row gap-4 items-start 2xl:items-center justify-between w-full">
            <div className="flex flex-col xl:flex-row gap-3 w-full xl:w-auto">
              <div className="relative w-full xl:w-80 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar lote, pedido, produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 overflow-hidden h-9">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">De</span>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 overflow-hidden h-9">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Até</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 font-medium outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full xl:w-auto overflow-x-auto select-none py-0.5 scrollbar-none shrink-0">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${statusFilter === "ALL" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                Todos Lotes
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${statusFilter === "PENDING" ? "bg-amber-500 text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                <Clock size={14} />
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter("IN_PRODUCTION")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${statusFilter === "IN_PRODUCTION" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                <PlayCircle size={14} />
                Em Produção
              </button>
              <button
                onClick={() => setStatusFilter("COMPLETED")}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${statusFilter === "COMPLETED" ? "bg-[#00b14f] text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                <CheckCircle2 size={14} />
                Concluídos
              </button>
              
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs ml-auto xl:ml-4"
                title="Exportar Relatório dos Lotes"
              >
                <FileSpreadsheet size={14} />
                Exportar Relatório
              </button>
            </div>
          </div>
        </div>

        {/* Lotes container */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredBatches.length === 0 ? (
            <div className="xl:col-span-2 py-16 text-center bg-white border border-dashed border-slate-200 rounded-xl shadow-xs">
              <ClipboardList className="mx-auto text-slate-350 mb-3" size={48} />
              <p className="text-slate-700 font-bold text-sm">Nenhum lote de gerência encontrado</p>
              <p className="text-slate-400 text-xs mt-1 font-medium">Você não possui lotes encaminhados ou nenhum atende aos filtros atuais.</p>
            </div>
          ) : (
            paginatedBatches.map((b) => {
              if (!b) return null;
              const batchOrderIds = Array.isArray(b.orderIds) ? b.orderIds : [];
              const total = batchOrderIds.length;
              const checkCount = Array.isArray(b.checkedOrderIds) ? b.checkedOrderIds.length : 0;
              const libCount = Array.isArray(b.liberatedOrderIds) ? b.liberatedOrderIds.length : 0;
              const isFullyLiberated = total > 0 && libCount === total;

              let formattedCreatedAt = "-";
              if (b.createdAt) {
                try {
                  const d = new Date(b.createdAt);
                  if (!isNaN(d.getTime())) {
                    formattedCreatedAt = d.toLocaleString();
                  }
                } catch {
                  formattedCreatedAt = "-";
                }
              }

              return (
                <div
                  key={b.id}
                  className={`bg-white border rounded-xl overflow-hidden shadow-xs transition-colors ${isFullyLiberated ? "border-emerald-100" : "border-slate-200"}`}
                >
                  {/* Card Header */}
                  <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between border-b gap-3 ${isFullyLiberated ? "bg-emerald-50/20 border-emerald-100" : "bg-slate-50/50 border-slate-100"}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-800 text-base font-extrabold tracking-tight">
                          {b.name || "Lote sem nome"}
                        </strong>
                        <span className="text-[10px] bg-indigo-150 text-indigo-850 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                          LOTE DE GERÊNCIA
                        </span>
                        {isFullyLiberated && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                            ✓ TOTALMENTE LIBERADO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 text-[10px] uppercase font-bold tracking-tight">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          Enviado em {formattedCreatedAt}
                        </span>
                        {b.notes && (
                          <span className="text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded italic">
                            Nota: {b.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Botão de Impressão de Lote */}
                      <button
                        onClick={() => {
                          setPreviewBatch(b);
                          setPdfItems(batchOrderIds);
                          setCustomPrintDeadline(b.deadline || "");
                          setCustomPrintNotes(b.notes || "");
                        }}
                        className="bg-slate-100 border border-slate-205/80 text-slate-700 hover:bg-slate-200/80 text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 uppercase tracking-wide"
                      >
                        <Printer size={13} />
                        Visualizar / Imprimir
                      </button>

                      {/* Botão de Impressão do Acompanhamento de Peça */}
                      <button
                        disabled={isGeneratingAcomp}
                        onClick={() => {
                          setPreviewAcompBatch(b);
                          setAcompSelectedOrderIds(batchOrderIds);
                          setIsPreviewAcompOpen(true);
                        }}
                        className={`border text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98] uppercase tracking-wide bg-indigo-50 border-indigo-200/80 text-indigo-855 hover:bg-indigo-100/80`}
                      >
                        <FileText size={13} className="text-indigo-600" />
                        Acompanhamento de Peça
                      </button>

                      {/* Botão de Impressão de Etiquetas do Lote */}
                      <button
                        onClick={() => {
                          setPreviewEtiquetasBatch(b);
                          setEtiquetasSelectedOrderIds(batchOrderIds);
                          setEtiquetasSearchTerm("");
                          setIsPreviewEtiquetasOpen(true);
                        }}
                        className={`border text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition active:scale-[0.98] uppercase tracking-wide bg-amber-50 border-amber-200/80 text-amber-900 hover:bg-amber-100/80`}
                      >
                        <Tag size={13} className="text-amber-600" />
                        Etiquetas do Lote
                      </button>

                      {/* Botão de Exportação para Excel */}
                      <button
                        onClick={() => handleExportBatchExcel(b)}
                        className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100 text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 uppercase tracking-wide"
                      >
                        <FileSpreadsheet size={13} className="text-emerald-600" />
                        Exportar Excel
                      </button>

                      {/* Botão Minimizar / Expandir */}
                      <button
                        onClick={() => {
                          setCollapsedBatches((prev) => ({
                            ...prev,
                            [b.id]: !prev[b.id]
                          }));
                        }}
                        className="bg-slate-105 border border-slate-205 text-slate-755 hover:bg-slate-200 text-[10px] font-black px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 uppercase tracking-wide"
                        title={collapsedBatches[b.id] ? "Expandir Lote" : "Minimizar Lote"}
                      >
                        {collapsedBatches[b.id] ? (
                          <>
                            <ChevronDown size={13} />
                            Expandir
                          </>
                        ) : (
                          <>
                            <ChevronUp size={13} />
                            Minimizar
                          </>
                        )}
                      </button>

                      {/* Check & Liberation Counters */}
                      <div className="flex gap-4">
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                            Checagem
                          </span>
                          <strong className="text-xs font-extrabold text-slate-700">
                            {checkCount} / {total} <span className="text-slate-400 font-normal">({total > 0 ? Math.round((checkCount / total) * 100) : 0}%)</span>
                          </strong>
                        </div>
                        <div className="text-right border-l pl-4 border-slate-200">
                          <span className="text-[9px] uppercase font-bold text-[#00b14f] block tracking-wider">
                            Liberação Fábrica
                          </span>
                          <strong className="text-xs font-extrabold text-[#00b14f]">
                            {libCount} / {total} <span className="text-slate-400 font-normal">({total > 0 ? Math.round((libCount / total) * 100) : 0}%)</span>
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Orders Content */}
                  {!collapsedBatches[b.id] && (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/30 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-3.5 pl-5">Nº Pedido</th>
                          <th className="p-3.5">Cliente</th>
                          <th className="p-3.5">Produto</th>
                          <th className="p-3.5 text-center">Peças</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-right pr-5">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {batchOrderIds.map((oid) => {
                          const o = (db.orders || []).find((x) => x && x.id === oid);
                          if (!o) return null;
                          const item = (db.items || []).find((i) => i && i.id === o.itemId);

                          const isChecked = (Array.isArray(b.checkedOrderIds) && b.checkedOrderIds.includes(oid)) || false;
                          const isLiberated = (Array.isArray(b.liberatedOrderIds) && b.liberatedOrderIds.includes(oid)) || false;
                          const sectorInfo = getOrderSectorTracking(o, b.id);

                          return (
                            <tr
                              key={oid}
                              className={`hover:bg-slate-50/50 transition-colors ${isLiberated ? "bg-emerald-50/10" : ""}`}
                            >
                              {/* Order Code */}
                              <td className="p-3.5 pl-5 font-mono font-black text-indigo-700 transition">
                                <button
                                  onClick={() => setSelectedOrder(o)}
                                  className="hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                >
                                  #{o.orderCode}
                                  <Eye size={12} className="text-slate-400" />
                                </button>
                              </td>

                              {/* Customer name */}
                              <td className="p-3.5 text-slate-700 font-extrabold max-w-[160px] truncate">
                                <div>{o.customerName}</div>
                                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                  Entrega: {o.deliveryDate || "-"}
                                </div>
                              </td>

                              {/* Product & variations */}
                              <td className="p-3.5">
                                <div className="font-extrabold text-slate-900 leading-tight">
                                  {item?.name || "Desconhecido"}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 space-x-1">
                                  {o.color && <span>Cor: {o.color}</span>}
                                  {o.size && <span>| Tam: {o.size}</span>}
                                  {o.variation && <span>| Var: {o.variation}</span>}
                                </div>
                              </td>

                              {/* Total Quantity */}
                              <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                                {o.totalQuantity} {getItemUnit(item, o) === "PAR" ? "PAR" : "pçs"}
                              </td>

                              {/* Action statuses */}
                              <td className="p-3.5">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {isChecked ? (
                                      <span className="text-[9px] bg-emerald-150 text-emerald-950 font-black px-2 py-0.5 rounded border border-emerald-250 uppercase">
                                        ✓ Checado
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                                        Pendente
                                      </span>
                                    )}

                                    {isLiberated ? (
                                      <span className="text-[9px] bg-indigo-150 text-indigo-950 font-black px-2 py-0.5 rounded border border-indigo-250 uppercase">
                                        ✓ Liberado
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                                        Retido
                                      </span>
                                    )}
                                  </div>

                                  {/* Current status & active / last produced sector */}
                                  <div className="text-[9px] bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 w-full max-w-[160px] text-center shadow-3xs flex flex-col gap-1">
                                    <span className="text-[8px] text-slate-400 block font-extrabold uppercase tracking-wider leading-none">
                                      Status / Setor:
                                    </span>

                                    {sectorInfo.isActive ? (
                                      <div className="bg-amber-500 text-white font-black px-1.5 py-1 rounded shadow-2xs text-[9px] uppercase leading-tight animate-pulse flex flex-col items-center">
                                        <span>⚡ EM PRODUÇÃO</span>
                                        <span className="text-[8px] font-bold text-amber-100 mt-0.5">
                                          Setor: {sectorInfo.sectorName}
                                        </span>
                                        {sectorInfo.operatorName && (
                                          <span className="text-[7.5px] font-medium text-amber-200">
                                            Op: {sectorInfo.operatorName}
                                          </span>
                                        )}
                                      </div>
                                    ) : sectorInfo.hasHistory ? (
                                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-1.5 py-1 rounded text-[8.5px] font-extrabold flex flex-col items-center leading-tight">
                                        <span className="text-[9px] font-black text-emerald-800">
                                          {o.status === "PRODUZIDO" ? "✓ PRODUZIDO" : "✓ ÚLTIMO SETOR"}
                                        </span>
                                        <span className="text-[8px] font-bold text-emerald-700 mt-0.5">
                                          {sectorInfo.sectorName}
                                        </span>
                                        {sectorInfo.operatorName && (
                                          <span className="text-[7.5px] text-slate-500 font-medium">
                                            por {sectorInfo.operatorName} {sectorInfo.timestamp ? `(${sectorInfo.timestamp})` : ""}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className={`text-[9px] font-black uppercase inline-block px-1.5 py-0.5 rounded border ${
                                        o.status === "PRODUZIDO" ? "bg-green-100 text-green-800 border-green-200" :
                                        o.status === "EM_PRODUCAO" ? "bg-amber-100 text-amber-800 border-amber-250 animate-pulse" :
                                        o.status === "CORTADO" ? "bg-teal-100 text-teal-800 border-teal-250" :
                                        "bg-slate-100 text-slate-650 border-slate-200"
                                      }`}>
                                        {o.status === "PRODUZIDO" ? "PRODUZIDO" :
                                         o.status === "EM_PRODUCAO" ? "EM PRODUÇÃO" :
                                         o.status === "CORTADO" ? "CORTADO" :
                                         (o.status || "PENDENTE")}
                                      </span>
                                    )}
                                  </div>

                                  {/* Authorization transition buttons */}
                                  {canChangeStatus && (
                                    <div className="flex flex-col gap-1 w-full max-w-[130px]">
                                      <button
                                        onClick={async () => {
                                          const updated = { ...o, status: "EM_PRODUCAO" as const };
                                          await db.updateOrders([updated]);
                                        }}
                                        title="Colocar o item em produção"
                                        className={`px-1.5 py-1 text-[8.5px] font-black rounded-md cursor-pointer transition active:scale-95 border uppercase text-center w-full transition duration-150 ${
                                          o.status === "EM_PRODUCAO"
                                            ? "bg-amber-500 text-white border-amber-600 cursor-default opacity-90 shadow-2xs"
                                            : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                                        }`}
                                      >
                                        Já em produção
                                      </button>
                                      <button
                                        onClick={async () => {
                                          const updated = { ...o, status: "PRODUZIDO" as const };
                                          await db.updateOrders([updated]);
                                        }}
                                        title="Marcar o item como já produzido"
                                        className={`px-1.5 py-1 text-[8.5px] font-black rounded-md cursor-pointer transition active:scale-95 border uppercase text-center w-full transition duration-150 ${
                                          o.status === "PRODUZIDO"
                                            ? "bg-emerald-600 text-white border-emerald-700 cursor-default opacity-90 shadow-2xs"
                                            : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                                        }`}
                                      >
                                        Item já prodzido
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Check vs Release toggles */}
                              <td className="p-3.5 text-right pr-5">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleToggleCheck(b, oid)}
                                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg cursor-pointer transition active:scale-95 border flex items-center gap-1 ${isChecked ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                                  >
                                    {isChecked ? "Desmarcar" : "Checar Item"}
                                  </button>

                                  <button
                                    onClick={() => handleToggleLiberate(b, oid)}
                                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg cursor-pointer transition active:scale-95 flex items-center gap-1 shadow-xs ${isLiberated ? "bg-[#00b14f] text-white hover:bg-[#009d44]" : "bg-emerald-50 text-[#00b14f] border border-emerald-100 hover:bg-emerald-100/50"}`}
                                  >
                                    {isLiberated ? "🟢 Liberado" : "🚀 Liberar p/ Prod."}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              );
            })
          )}

          {filteredBatches.length > visibleCount && (
            <div className="xl:col-span-2 flex justify-center pt-4 pb-8">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition active:scale-95 duration-100 cursor-pointer"
              >
                <RefreshCw size={14} className="animate-spin-slow text-indigo-500" />
                Carregar Mais Lotes ({filteredBatches.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </div>
      </ScrollContainer>

      {/* --- ORDER DETAILS POPUP MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 text-left animate-in zoom-in-95 duration-150 font-sans">
            {/* Header */}
            <div className="p-5 border-b bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-[#00b14f] uppercase tracking-widest flex items-center gap-1">
                  <Sparkles size={12} /> Detalhes do Pedido
                </span>
                <span className="font-mono text-lg font-black text-slate-850">
                  #{selectedOrder.orderCode}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 px-1.5 text-xs text-slate-500 rounded-lg hover:bg-gray-250 cursor-pointer bg-slate-100 hover:text-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Cliente / Comprador
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedOrder.customerName}
                  </p>
                </div>

                <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Status do Pedido
                  </span>
                  <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded border inline-block ${selectedOrder.status === 'EM_PRODUCAO' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  Especificações do Produto
                </h4>
                {(() => {
                  const it = db.items.find((i) => i.id === selectedOrder.itemId);
                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-xs text-slate-900 block font-extrabold">
                            {it?.name || "Produto Desconhecido"}
                          </strong>
                          <span className="text-[9px] font-mono text-slate-400">
                            ID / Cód: {it?.code || "MANUAL"}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-slate-700">
                          {selectedOrder.totalQuantity} Peças
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t pt-2 mt-2 text-[10px] text-slate-500 font-semibold uppercase">
                        <div>
                          <span className="block text-[8px] text-slate-400 tracking-wider">
                            Cor
                          </span>
                          <span className="text-slate-800">{selectedOrder.color || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 tracking-wider">
                            Tamanho
                          </span>
                          <span className="text-slate-800">{selectedOrder.size || "-"}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400 tracking-wider">
                            Variação
                          </span>
                          <span className="text-slate-800">{selectedOrder.variation || "-"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Delivery info */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Data de Emissão
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    {new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Entrega Prevista
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    {selectedOrder.deliveryDate 
                      ? new Date(selectedOrder.deliveryDate).toLocaleDateString("pt-BR") 
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-bold bg-white text-slate-600 rounded-lg border border-slate-200 hover:bg-gray-100 cursor-pointer transition active:scale-95"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINT PREVIEW WYSIWYG MODAL --- */}
      {previewBatch && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col border border-slate-700 animate-in zoom-in-95 duration-200 font-sans">
            
            {/* Header */}
            <div className="p-4 px-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
                  <Printer size={18} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    PCP · Impressão Comercial
                  </span>
                  <span className="font-sans text-base font-black text-white">
                    Visualização Prévia do PDF · {previewBatch.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setPreviewBatch(null);
                  setPdfItems([]);
                }}
                className="p-1 px-2 text-xs text-slate-450 bg-slate-800 hover:bg-slate-705 hover:text-white rounded-lg cursor-pointer transition uppercase font-bold"
              >
                Cancelar ✕
              </button>
            </div>

            {/* Content Body - Dual Column */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
              
              {/* Left Column - Customizer Controls */}
              <div className="w-full md:w-1/3 p-5 overflow-y-auto bg-slate-950 text-left space-y-5">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    ⚙️ Customizar Dados
                  </h3>
                  <p className="text-slate-450 text-[11px]">
                    Altere os dados abaixo apenas para a impressão do PDF se necessário.
                  </p>
                </div>

                {/* Prazo / Data Prevista */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">
                    Data Prevista (Prazo)
                  </label>
                  <input
                    type="text"
                    value={customPrintDeadline}
                    onChange={(e) => setCustomPrintDeadline(e.target.value)}
                    placeholder="Ex: 10/06/2026, Imediato, etc"
                    className="w-full px-3 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 bg-slate-900 focus:outline-hidden focus:border-emerald-500 transition"
                  />
                </div>

                {/* Observações de Impressão */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider block">
                    Observações no Lote
                  </label>
                  <textarea
                    rows={3}
                    value={customPrintNotes}
                    onChange={(e) => setCustomPrintNotes(e.target.value)}
                    placeholder="Instruções para a fábrica..."
                    className="w-full px-3 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 bg-slate-900 focus:outline-hidden focus:border-emerald-500 transition resize-none"
                  />
                </div>

                {/* Items selection check List */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      Pedidos Incluídos no PDF
                    </span>
                    <button
                      onClick={() => {
                        const batchOrderIds = Array.isArray(previewBatch?.orderIds) ? previewBatch.orderIds : [];
                        if (pdfItems.length === batchOrderIds.length) {
                          setPdfItems([]);
                        } else {
                          setPdfItems(batchOrderIds);
                        }
                      }}
                      className="text-[9px] text-emerald-400 font-black hover:underline uppercase cursor-pointer bg-transparent border-0"
                    >
                      {pdfItems.length === (Array.isArray(previewBatch?.orderIds) ? previewBatch.orderIds.length : 0) ? "Nenhum" : "Todos"}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 bg-slate-900/50 p-2 rounded-lg border border-slate-900">
                    {(Array.isArray(previewBatch?.orderIds) ? previewBatch.orderIds : []).map((oid) => {
                      const o = (db.orders || []).find((x) => x && x.id === oid);
                      if (!o) return null;
                      const it = (db.items || []).find((i) => i && i.id === o.itemId);
                      const isIncluded = pdfItems.includes(oid);

                      return (
                        <label
                          key={oid}
                          className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition select-none ${isIncluded ? "bg-slate-800/40 border border-slate-800" : "opacity-55 hover:opacity-80"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => {
                              if (isIncluded) {
                                setPdfItems(pdfItems.filter((x) => x !== oid));
                              } else {
                                setPdfItems([...pdfItems, oid]);
                              }
                            }}
                            className="mt-0.5 border-slate-700 rounded text-emerald-600 focus:ring-emerald-505/20"
                          />
                          <div className="text-[11px] leading-tight text-left">
                            <strong className="font-mono text-white text-xs">#{o.orderCode}</strong>
                            <div className="text-slate-300 font-bold max-w-[170px] truncate">{o.customerName}</div>
                            <div className="text-[10px] text-slate-450 truncate max-w-[170px]">{it?.name || "Desconhecido"}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column - A4 Sheet Live WYSIWYG preview */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-800 flex justify-center items-start">
                
                {/* Simulated A4 white sheet container */}
                <div 
                  id="a4-sheet-preview-container"
                  className="bg-white w-full max-w-[720px] min-h-[850px] p-8 text-left text-slate-800 flex flex-col font-sans rounded-sm shadow-2xl border border-slate-300"
                >
                  {/* Internal A4 elements mimicking real printed layout */}
                  <div className="border-b-2 border-slate-200 pb-4 mb-5 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <ReportHeaderLogo logoUrl={db.activeTenant?.logoUrl} className="w-10 h-10 object-contain" alt="Logo Império" />
                      <div>
                        <span className="text-[9px] font-black text-emerald-650 uppercase tracking-widest block mb-0.5">
                          {db.activeTenant?.name || "SUA EMPRESA"}
                        </span>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                          {previewBatch.name}
                        </h2>
                      </div>
                    </div>
                    <span className="text-[8px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-bold uppercase border border-sky-200 tracking-wider">
                      Lote de Gerência
                    </span>
                  </div>

                  {/* Metal Information Area */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 text-[11px]">
                    <div>
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide block mb-0.5">
                        ⏱️ Data Prevista (Prazo)
                      </span>
                      <strong className="text-slate-800 text-xs font-extrabold">
                        {customPrintDeadline || "Não Informada"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide block mb-0.5">
                        🏭 Origem do Lote
                      </span>
                      <strong className="text-slate-800 text-xs font-extrabold">
                        Setor Planejamento (PCP)
                      </strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide block mb-0.5">
                        📦 Total de Pedidos Incluídos
                      </span>
                      <strong className="text-slate-800 text-xs font-extrabold">
                        {pdfItems.length} pedidos
                      </strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide block mb-0.5">
                        🕒 Data de Geração do PDF
                      </span>
                      <strong className="text-slate-800 text-xs font-extrabold">
                        {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
                      </strong>
                    </div>
                  </div>

                  {/* Notes box */}
                  {customPrintNotes && (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 mb-5">
                      <span className="text-[8px] text-amber-750 font-extrabold uppercase tracking-wider block mb-1">
                        📝 Observações do Lote
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                        {customPrintNotes}
                      </p>
                    </div>
                  )}

                  {/* Print preview table */}
                  <div className="flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[9px] tracking-wider border-b border-slate-350">
                          <th className="py-2.5 px-3">Pedido</th>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3">Produto</th>
                          <th className="py-2.5 px-3">Cor</th>
                          <th className="py-2.5 px-2 text-center">Qtd.</th>
                          <th className="py-2.5 px-3 text-center border-l border-slate-200" style={{ width: "80px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {(Array.isArray(previewBatch?.orderIds) ? previewBatch.orderIds : [])
                          .filter((oid) => pdfItems.includes(oid))
                          .map((oid) => {
                            const o = (db.orders || []).find((x) => x && x.id === oid);
                            if (!o) return null;
                            const item = (db.items || []).find((i) => i && i.id === o.itemId);

                            return (
                              <tr key={oid} className="hover:bg-slate-50/50">
                                <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                                  #{o.orderCode}
                                </td>
                                <td className="py-3 px-3 font-extrabold text-slate-800">
                                  <div>{o.customerName}</div>
                                  <div className="text-[10px] text-[#1e40af] font-bold mt-0.5 whitespace-nowrap">
                                    Prazo: {o.deliveryDate || "-"}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-extrabold text-slate-900">
                                    {item?.name || "Desconhecido"}
                                  </div>
                                  {(o.size || o.variation) && (
                                    <div className="text-[10px] text-slate-450 font-semibold mt-0.5">
                                      Tam: {o.size || "-"} | Var: {o.variation || "-"}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-bold text-slate-700">
                                  {o.color || "-"}
                                </td>
                                <td className="py-3 px-2 text-center font-bold text-slate-900">
                                  {o.totalQuantity} pçs
                                </td>
                                <td className="py-3 px-3 text-center border-l border-slate-150">
                                  <div className="w-5 h-5 border border-slate-400 rounded-sm mx-auto bg-transparent"></div>
                                </td>
                              </tr>
                            );
                          })}

                        {pdfItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 uppercase font-black tracking-wider text-[10px]">
                              Nenhum pedido selecionado para impressão.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary row */}
                  {pdfItems.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-250 flex justify-between items-center">
                      <span className="text-slate-450 uppercase font-bold text-[9px] tracking-wider">
                        Metalúrgica PCP
                      </span>
                      <strong className="text-slate-900 text-sm font-black">
                        Total Geral:{" "}
                        {(Array.isArray(previewBatch?.orderIds) ? previewBatch.orderIds : [])
                          .filter((oid) => pdfItems.includes(oid))
                          .map((oid) => (db.orders || []).find((x) => x && x.id === oid))
                          .filter(Boolean)
                          .reduce((sum, o) => sum + (o?.totalQuantity || 0), 0)}{" "}
                        pçs
                      </strong>
                    </div>
                  )}

                  {/* Signature areas */}
                  <div className="mt-14 grid grid-cols-2 gap-12 text-center">
                    <div className="border-t border-slate-300 pt-2 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                      Assinatura PCP / Gerência
                    </div>
                    <div className="border-t border-slate-300 pt-2 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                      Assinatura Responsável pela Fábrica
                    </div>
                  </div>

                  {/* System Footnote */}
                  <div className="mt-12 pt-3 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400">
                    <span>Impresso por: {currentUser.name}</span>
                    <span>© PCP Lotes de Gerência</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer triggers */}
            <div className="p-4 px-6 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
              <span className="text-[11px] font-semibold text-slate-500">
                Lote ID: #{previewBatch.id} · Certifique-se de que a impressora está configurada corretamente para papel A4.
              </span>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPreviewBatch(null);
                    setPdfItems([]);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-800 hover:bg-slate-705 border border-slate-700/60 rounded-xl cursor-pointer hover:text-white transition active:scale-95"
                >
                  Fechar Visualizador
                </button>

                <button
                  disabled={isGeneratingPdf}
                  onClick={async () => {
                    const ordersToPrint = (Array.isArray(previewBatch?.orderIds) ? previewBatch.orderIds : [])
                      .filter((oid) => pdfItems.includes(oid))
                      .map((oid) => (db.orders || []).find((x) => x && x.id === oid))
                      .filter(Boolean) as Order[];

                    if (ordersToPrint.length === 0) {
                      alert("Por favor, selecione pelo menos um pedido para imprimir.");
                      return;
                    }

                    console.log("[PDF] starting pdf generation flow...");
                    setIsGeneratingPdf(true);

                    try {
                      // Allow state update to propagate and React to render the printable sheet
                      await new Promise((resolve) => setTimeout(resolve, 200));

                      await waitForFonts();
                      
                      const element = printRef.current;
                      if (!element) {
                        throw new Error("Elemento de impressão da folha não foi encontrado no DOM (ref retornou nula).");
                      }

                      await waitForImages(element);
                      await waitForStableLayout(element);

                      const pages = element.querySelectorAll('.pdf-page');
                      if (pages.length === 0) {
                        throw new Error("Nenhuma página foi renderizada para exportação.");
                      }

                      const pdf = new jsPDF("p", "mm", "a4");
                      const imgWidth = 210;
                      const pageHeight = 297;

                      for (let i = 0; i < pages.length; i++) {
                        const pageEl = pages[i] as HTMLElement;
                        
                        console.log(`[PDF] html2canvas start page ${i + 1}`);
                        const canvas = await html2canvas(pageEl, {
                          scale: 2,
                          useCORS: true,
                          backgroundColor: "#ffffff",
                          logging: false,
                          scrollX: 0,
                          scrollY: 0,
                          x: 0,
                          y: 0,
                          width: 794,
                          height: 1123,
                          windowWidth: 794,
                          windowHeight: 1123,
                        });
                        console.log(`[PDF] html2canvas done page ${i + 1}`);

                        const imgData = canvas.toDataURL("image/jpeg", 1.0);
                        
                        if (i > 0) {
                          pdf.addPage();
                        }
                        
                        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pageHeight);
                      }

                      const sanitizedName = previewBatch.name.replace(/[^a-zA-Z0-9]/g, "_");
                      pdf.save(`Lote_${sanitizedName}_A4.pdf`);
                      console.log("[PDF] pdf saved successfully");
                    } catch (err: any) {
                      console.error("[PDF] failed:", err);
                      alert(`Erro ao emitir o PDF: ${err.message || err}`);
                    } finally {
                      setIsGeneratingPdf(false);
                    }
                  }}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow-lg ${isGeneratingPdf ? "bg-emerald-800 cursor-not-allowed opacity-75" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-700/20"}`}
                >
                  <Printer size={14} className={isGeneratingPdf ? "animate-spin" : ""} />
                  {isGeneratingPdf ? "Gerando PDF..." : "Emitir & Baixar PDF A4"}
                </button>

                <button
                  disabled={isGeneratingPdf || isDirectPrinting}
                  onClick={handleDirectPrint}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow-lg ${isDirectPrinting ? "bg-sky-800 cursor-not-allowed opacity-75" : "bg-sky-600 hover:bg-sky-500 shadow-sky-700/20"}`}
                >
                  <Printer size={14} className={isDirectPrinting ? "animate-spin" : ""} />
                  {isDirectPrinting ? "Preparando..." : "Imprimir Direto"}
                </button>

                <button
                  disabled={isGeneratingPdf || isDirectPrinting}
                  onClick={() => handleExportBatchExcel(previewBatch)}
                  className="px-5 py-2.5 text-xs font-black text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition active:scale-95 bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-700/20"
                >
                  <FileSpreadsheet size={14} />
                  Exportar Excel (.csv)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Hidden React Print Container fully loaded in DOM but layered beneath viewports */}
      {(isGeneratingPdf || isDirectPrinting) && previewBatch && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: -9999,
            width: "794px",
            height: "auto",
            overflow: "visible",
            opacity: 1,
            pointerEvents: "none",
          }}
        >
          <BatchPrintSheet
            ref={printRef}
            batch={previewBatch}
            orderIds={pdfItems}
            customDeadline={customPrintDeadline}
            customNotes={customPrintNotes}
            db={db}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* --- PREVIEW MODAL FOR ACOMPANHAMENTO DE PEÇA --- */}
      {/* ========================================================= */}
      {isPreviewAcompOpen && previewAcompBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="text-indigo-600" size={22} />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Pré-Visualização: Ficha de Acompanhamento</h3>
                  <p className="text-xs text-slate-500 font-medium">Lote: {previewAcompBatch.name || `Lote #${previewAcompBatch.id}`} — Escolha quais peças/pedidos deseja imprimir e configure a ficha.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPreviewAcompOpen(false);
                  setPreviewAcompBatch(null);
                }}
                className="text-slate-400 hover:text-slate-700 bg-slate-200/50 p-2 rounded-full hover:bg-slate-200 transition cursor-pointer self-center"
              >
                ✕
              </button>
            </div>

            {/* Content Body - Dual Column */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
              
              {/* Left Column - Options & Items Selection Controls */}
              <div className="w-full md:w-80 lg:w-96 p-4 overflow-y-auto bg-slate-50 text-left space-y-4 shrink-0 flex flex-col justify-between">
                <div className="space-y-4">
                  
                  {/* Options Section */}
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-2xs space-y-2.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      ⚙️ Configurações da Ficha
                    </span>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={destrincharComposicoes}
                        onChange={(e) => setDestrincharComposicoes(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700 leading-tight">
                        Destrinchar kits/composições (BOM)
                      </span>
                    </label>

                    {destrincharComposicoes && (
                      <label className="flex items-start gap-2.5 cursor-pointer select-none pl-3 border-l-2 border-indigo-200 animate-in slide-in-from-left-2 duration-150">
                        <input
                          type="checkbox"
                          checked={ocultarPaiComposicao}
                          onChange={(e) => setOcultarPaiComposicao(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700 leading-tight">
                          Ocultar produto principal (Kits pais)
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Items selection check List */}
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-2xs space-y-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                          Peças / Pedidos na Ficha
                        </span>
                        <span className="text-[11px] text-indigo-600 font-bold">
                          {acompSelectedOrderIds.length} de {(Array.isArray(previewAcompBatch?.orderIds) ? previewAcompBatch.orderIds.length : 0)} selecionados
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAcompSelectedOrderIds(Array.isArray(previewAcompBatch?.orderIds) ? previewAcompBatch.orderIds : [])}
                          className="text-[10px] text-indigo-600 font-extrabold hover:underline uppercase cursor-pointer bg-indigo-50 px-2 py-1 rounded"
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setAcompSelectedOrderIds([])}
                          className="text-[10px] text-slate-500 font-extrabold hover:underline uppercase cursor-pointer bg-slate-100 px-2 py-1 rounded"
                        >
                          Nenhum
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {(Array.isArray(previewAcompBatch?.orderIds) ? previewAcompBatch.orderIds : []).map((oid) => {
                        const o = (db.orders || []).find((x) => x && x.id === oid);
                        if (!o) return null;
                        const it = (db.items || []).find((i) => i && i.id === o.itemId);
                        const isIncluded = acompSelectedOrderIds.includes(oid);

                        return (
                          <label
                            key={oid}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition select-none border ${
                              isIncluded
                                ? "bg-indigo-50/60 border-indigo-200 text-indigo-950 shadow-2xs"
                                : "bg-slate-50/50 border-slate-200 text-slate-400 opacity-60 hover:opacity-90"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => {
                                if (isIncluded) {
                                  setAcompSelectedOrderIds(acompSelectedOrderIds.filter((x) => x !== oid));
                                } else {
                                  setAcompSelectedOrderIds([...acompSelectedOrderIds, oid]);
                                }
                              }}
                              className="mt-0.5 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="text-xs leading-tight min-w-0 flex-1">
                              <div className="flex justify-between items-center gap-1">
                                <strong className="font-mono text-indigo-700 text-xs font-extrabold">#{o.orderCode}</strong>
                                <span className="font-bold text-[11px] text-slate-800 bg-white border px-1.5 py-0.5 rounded shadow-2xs">
                                  {o.totalQuantity} {getItemUnit(it, o)}
                                </span>
                              </div>
                              <div className="text-slate-900 font-bold truncate mt-0.5">{o.customerName}</div>
                              <div className="text-[11px] text-slate-600 truncate mt-0.5">{it?.name || "Desconhecido"}</div>
                              {(o.color || o.size || o.variation) && (
                                <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-1">
                                  {o.color && <span>Cor: <strong>{o.color}</strong></span>}
                                  {o.size && <span>Tam: <strong>{o.size}</strong></span>}
                                  {o.variation && <span>Var: <strong>{o.variation}</strong></span>}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}

                      {(!Array.isArray(previewAcompBatch?.orderIds) || previewAcompBatch.orderIds.length === 0) && (
                        <div className="text-center p-4 text-slate-400 text-xs italic">
                          Nenhum pedido encontrado neste lote.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column - Scrollable Visual A4 Workspace */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center items-start">
                {acompSelectedOrderIds.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md my-12 shadow-sm">
                    <Layers className="mx-auto text-slate-300 mb-3" size={40} />
                    <h4 className="font-bold text-slate-700 text-sm mb-1">Nenhuma peça selecionada</h4>
                    <p className="text-xs text-slate-500">
                      Marque pelo menos uma peça ou pedido na lista ao lado para visualizar e gerar a ficha de acompanhamento.
                    </p>
                  </div>
                ) : (
                  <div className="shadow-2xl bg-white border border-slate-200 p-2 rounded-xl h-fit">
                    {/* Visual A4 Mock */}
                    <AcompanhamentoPrintSheet
                      batch={previewAcompBatch}
                      orderIds={acompSelectedOrderIds}
                      db={db}
                      destrincharComposicoes={destrincharComposicoes}
                      ocultarPaiComposicao={ocultarPaiComposicao}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wide">
                IMPÉRIO ACESSÓRIOS · {acompSelectedOrderIds.length} {acompSelectedOrderIds.length === 1 ? "pedido selecionado" : "pedidos selecionados"}
              </span>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsPreviewAcompOpen(false);
                    setPreviewAcompBatch(null);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Fechar Prévia
                </button>

                <button
                  disabled={isDirectPrintingAcomp || acompSelectedOrderIds.length === 0}
                  onClick={handleDirectPrintAcomp}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow-lg ${
                    isDirectPrintingAcomp || acompSelectedOrderIds.length === 0
                      ? "bg-slate-300 cursor-not-allowed text-slate-500"
                      : "bg-sky-600 hover:bg-sky-500 shadow-sky-700/20"
                  }`}
                >
                  <Printer size={14} className={isDirectPrintingAcomp ? "animate-spin" : ""} />
                  {isDirectPrintingAcomp ? "Preparando..." : "Imprimir Direto"}
                </button>

                <button
                  disabled={acompSelectedOrderIds.length === 0}
                  onClick={() => {
                    const b = previewAcompBatch;
                    const ids = acompSelectedOrderIds;
                    setIsPreviewAcompOpen(false);
                    setPreviewAcompBatch(null);
                    handleGenerateAcompPdf(b, ids);
                  }}
                  className={`font-extrabold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center gap-2 ${
                    acompSelectedOrderIds.length === 0
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-550 text-white shadow-indigo-600/10 hover:scale-[1.01]"
                  }`}
                >
                  <FileText size={15} />
                  Confirmar & Baixar PDF Ficha
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- PREVIEW MODAL FOR ETIQUETAS DE PRODUTOS DO LOTE --- */}
      {/* ========================================================= */}
      {isPreviewEtiquetasOpen && previewEtiquetasBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Tag className="text-amber-600" size={22} />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Impressão de Etiquetas de Produtos do Lote</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Lote: {previewEtiquetasBatch.name || `Lote #${previewEtiquetasBatch.id}`} — Identificação prévia para cortes terceirizados e rotulagem.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPreviewEtiquetasOpen(false);
                  setPreviewEtiquetasBatch(null);
                }}
                className="text-slate-400 hover:text-slate-700 bg-slate-200/50 p-2 rounded-full hover:bg-slate-200 transition cursor-pointer self-center"
              >
                ✕
              </button>
            </div>

            {/* Content Body - Dual Column */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
              
              {/* Left Column - Controls & Selection List */}
              <div className="w-full md:w-80 lg:w-96 p-4 overflow-y-auto bg-slate-50 text-left space-y-4 shrink-0 flex flex-col justify-between">
                <div className="space-y-4">
                  
                  {/* Formato do Layout */}
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-2xs space-y-3">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      📐 Formato da Etiqueta
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEtiquetasLayoutFormat("thermal")}
                        className={`p-2.5 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition border ${
                          etiquetasLayoutFormat === "thermal"
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        <Tag size={16} />
                        <span>Térmica 10x5 cm</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEtiquetasLayoutFormat("a4")}
                        className={`p-2.5 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition border ${
                          etiquetasLayoutFormat === "a4"
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        <FileText size={16} />
                        <span>Grade A4</span>
                      </button>
                    </div>
                  </div>

                  {/* Configurações da Etiqueta */}
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-2xs space-y-2.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      🖼️ Conteúdo Visual da Etiqueta
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEtiquetasShowImage(true);
                          localStorage.setItem("etiquetas_show_image", "true");
                        }}
                        className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition border ${
                          etiquetasShowImage
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        🖼️ Imagem do Produto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEtiquetasShowImage(false);
                          localStorage.setItem("etiquetas_show_image", "false");
                        }}
                        className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition border ${
                          !etiquetasShowImage
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        📊 Somente Cód. Barras + Código
                      </button>
                    </div>

                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block pt-2 border-t border-slate-100">
                      ⚙️ Opções de Kits / Peças
                    </span>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={etiquetasDestrinchar}
                        onChange={(e) => setEtiquetasDestrinchar(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700 leading-tight">
                        Destrinchar kits/composições em peças individuais (BOM)
                      </span>
                    </label>

                    {etiquetasDestrinchar && (
                      <label className="flex items-start gap-2.5 cursor-pointer select-none pl-3 border-l-2 border-amber-300 animate-in slide-in-from-left-2 duration-150">
                        <input
                          type="checkbox"
                          checked={etiquetasOcultarPai}
                          onChange={(e) => setEtiquetasOcultarPai(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700 leading-tight">
                          Ocultar produto principal (Kits pais)
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Items Selection List */}
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-2xs space-y-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                          Peças no Lote
                        </span>
                        <span className="text-[11px] text-amber-700 font-bold">
                          {etiquetasSelectedOrderIds.length} de {(Array.isArray(previewEtiquetasBatch?.orderIds) ? previewEtiquetasBatch.orderIds.length : 0)} selecionados
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEtiquetasSelectedOrderIds(Array.isArray(previewEtiquetasBatch?.orderIds) ? previewEtiquetasBatch.orderIds : [])}
                          className="text-[10px] text-amber-700 font-extrabold hover:underline uppercase cursor-pointer bg-amber-50 px-2 py-1 rounded"
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setEtiquetasSelectedOrderIds([])}
                          className="text-[10px] text-slate-500 font-extrabold hover:underline uppercase cursor-pointer bg-slate-100 px-2 py-1 rounded"
                        >
                          Nenhum
                        </button>
                      </div>
                    </div>

                    {/* Search filter in modal */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                      <input
                        type="text"
                        value={etiquetasSearchTerm}
                        onChange={(e) => setEtiquetasSearchTerm(e.target.value)}
                        placeholder="Buscar item ou pedido..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {(Array.isArray(previewEtiquetasBatch?.orderIds) ? previewEtiquetasBatch.orderIds : [])
                        .filter((oid) => {
                          if (!etiquetasSearchTerm.trim()) return true;
                          const o = (db.orders || []).find((x) => x && x.id === oid);
                          if (!o) return false;
                          const it = (db.items || []).find((i) => i && i.id === o.itemId);
                          const term = etiquetasSearchTerm.toLowerCase();
                          return (
                            (o.orderCode && o.orderCode.toLowerCase().includes(term)) ||
                            (o.customerName && o.customerName.toLowerCase().includes(term)) ||
                            (it?.name && it.name.toLowerCase().includes(term)) ||
                            (it?.code && it.code.toLowerCase().includes(term))
                          );
                        })
                        .map((oid) => {
                          const o = (db.orders || []).find((x) => x && x.id === oid);
                          if (!o) return null;
                          const it = (db.items || []).find((i) => i && i.id === o.itemId);
                          const isIncluded = etiquetasSelectedOrderIds.includes(oid);

                          return (
                            <label
                              key={oid}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition select-none border ${
                                isIncluded
                                  ? "bg-amber-50/70 border-amber-300 text-amber-950 shadow-2xs"
                                  : "bg-slate-50/50 border-slate-200 text-slate-400 opacity-60 hover:opacity-90"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => {
                                  if (isIncluded) {
                                    setEtiquetasSelectedOrderIds(etiquetasSelectedOrderIds.filter((x) => x !== oid));
                                  } else {
                                    setEtiquetasSelectedOrderIds([...etiquetasSelectedOrderIds, oid]);
                                  }
                                }}
                                className="mt-0.5 border-slate-300 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                              />
                              <div className="text-xs leading-tight min-w-0 flex-1">
                                <div className="flex justify-between items-center gap-1">
                                  <strong className="font-mono text-amber-800 text-xs font-extrabold">#{o.orderCode}</strong>
                                  <span className="font-bold text-[11px] text-slate-800 bg-white border px-1.5 py-0.5 rounded shadow-2xs">
                                    {o.totalQuantity} {getItemUnit(it, o)}
                                  </span>
                                </div>
                                <div className="text-slate-900 font-bold truncate mt-0.5">{o.customerName}</div>
                                <div className="text-[11px] text-slate-600 truncate mt-0.5">{it?.name || "Desconhecido"}</div>
                                {(o.color || o.size || o.variation) && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-1">
                                    {o.color && <span>Cor: <strong>{o.color}</strong></span>}
                                    {o.size && <span>Tam: <strong>{o.size}</strong></span>}
                                    {o.variation && <span>Var: <strong>{o.variation}</strong></span>}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}

                      {(!Array.isArray(previewEtiquetasBatch?.orderIds) || previewEtiquetasBatch.orderIds.length === 0) && (
                        <div className="text-center p-4 text-slate-400 text-xs italic">
                          Nenhum pedido encontrado neste lote.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column - Scrollable Visual Preview */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center items-start">
                {etiquetasSelectedOrderIds.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md my-12 shadow-sm">
                    <Tag className="mx-auto text-slate-300 mb-3" size={40} />
                    <h4 className="font-bold text-slate-700 text-sm mb-1">Nenhuma etiqueta selecionada</h4>
                    <p className="text-xs text-slate-500">
                      Marque pelo menos uma peça/pedido na lista ao lado para visualizar e gerar as etiquetas do lote.
                    </p>
                  </div>
                ) : (
                  <div className="shadow-2xl bg-white border border-slate-200 p-4 rounded-xl h-fit">
                    <BatchEtiquetasPrintSheet
                      batch={previewEtiquetasBatch}
                      orderIds={etiquetasSelectedOrderIds}
                      db={db}
                      layoutFormat={etiquetasLayoutFormat}
                      destrincharComposicoes={etiquetasDestrinchar}
                      ocultarPaiComposicao={etiquetasOcultarPai}
                      showImage={etiquetasShowImage}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wide">
                IMPÉRIO ACESSÓRIOS · {etiquetasSelectedOrderIds.length} {etiquetasSelectedOrderIds.length === 1 ? "pedido selecionado" : "pedidos selecionados"}
              </span>
              <div className="flex gap-3 justify-end flex-wrap">
                <button
                  onClick={() => {
                    setIsPreviewEtiquetasOpen(false);
                    setPreviewEtiquetasBatch(null);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Fechar Prévia
                </button>

                <button
                  disabled={isGeneratingEtiquetasZPL || etiquetasSelectedOrderIds.length === 0}
                  onClick={handleGenerateEtiquetasZPL}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow-lg ${
                    isGeneratingEtiquetasZPL || etiquetasSelectedOrderIds.length === 0
                      ? "bg-slate-300 cursor-not-allowed text-slate-500"
                      : "bg-amber-600 hover:bg-amber-500 shadow-amber-700/20"
                  }`}
                >
                  <Copy size={14} className={isGeneratingEtiquetasZPL ? "animate-spin" : ""} />
                  {isGeneratingEtiquetasZPL ? "Gerando ZPL c/ Imagens..." : "Copiar Comandos ZPL (Zebra)"}
                </button>

                <button
                  disabled={isDirectPrintingEtiquetas || etiquetasSelectedOrderIds.length === 0}
                  onClick={handleDirectPrintEtiquetas}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition active:scale-95 shadow-lg ${
                    isDirectPrintingEtiquetas || etiquetasSelectedOrderIds.length === 0
                      ? "bg-slate-300 cursor-not-allowed text-slate-500"
                      : "bg-blue-600 hover:bg-blue-500 shadow-blue-700/20"
                  }`}
                >
                  <Printer size={14} className={isDirectPrintingEtiquetas ? "animate-spin" : ""} />
                  {isDirectPrintingEtiquetas ? "Preparando..." : "Imprimir Direto"}
                </button>

                <button
                  disabled={isGeneratingEtiquetasPdf || etiquetasSelectedOrderIds.length === 0}
                  onClick={handleGenerateEtiquetasPdf}
                  className={`font-extrabold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center gap-2 text-white ${
                    isGeneratingEtiquetasPdf || etiquetasSelectedOrderIds.length === 0
                      ? "bg-slate-300 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 hover:bg-emerald-550 shadow-emerald-600/10 hover:scale-[1.01]"
                  }`}
                >
                  <FileDown size={15} className={isGeneratingEtiquetasPdf ? "animate-spin" : ""} />
                  {isGeneratingEtiquetasPdf ? "Gerando PDF..." : "Confirmar & Baixar PDF Etiquetas"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Hidden Acompanhamento de Peça print targets */}
      {isGeneratingAcomp && acompBatch && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            zIndex: -9999,
            width: "794px",
            height: "auto",
            overflow: "visible",
            opacity: 1,
            pointerEvents: "none",
          }}
        >
          <div id="acomp-print-root">
            <AcompanhamentoPrintSheet
              ref={acompPrintRef}
              batch={acompBatch}
              orderIds={acompSelectedOrderIds}
              db={db}
              destrincharComposicoes={destrincharComposicoes}
              ocultarPaiComposicao={ocultarPaiComposicao}
            />
          </div>
        </div>
      )}

      {/* Export Report Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-indigo-600" />
                Exportar Relatório
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full p-1.5 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Filtrar Produtos:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setExportFilterStatus("TODOS")}
                    className={`px-4 py-2.5 rounded-lg font-bold text-sm text-left transition border ${exportFilterStatus === "TODOS" ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    Todos os Produtos
                  </button>
                  <button
                    onClick={() => setExportFilterStatus("FALTA_PRODUZIR")}
                    className={`px-4 py-2.5 rounded-lg font-bold text-sm text-left transition border ${exportFilterStatus === "FALTA_PRODUZIR" ? "bg-amber-50 border-amber-200 text-amber-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    Apenas: Faltando Produzir
                  </button>
                  <button
                    onClick={() => setExportFilterStatus("EM_PRODUCAO")}
                    className={`px-4 py-2.5 rounded-lg font-bold text-sm text-left transition border ${exportFilterStatus === "EM_PRODUCAO" ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    Apenas: Atualmente em Produção
                  </button>
                  <button
                    onClick={() => setExportFilterStatus("PRODUZIDOS")}
                    className={`px-4 py-2.5 rounded-lg font-bold text-sm text-left transition border ${exportFilterStatus === "PRODUZIDOS" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    Apenas: Totalmente Produzidos
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Formato de Exportação:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportFormat("EXCEL")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm text-center transition border ${exportFormat === "EXCEL" ? "bg-green-50 border-green-200 text-green-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    CSV (Excel)
                  </button>
                  <button
                    onClick={() => setExportFormat("PDF")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm text-center transition border ${exportFormat === "PDF" ? "bg-red-50 border-red-200 text-red-700 shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-150 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateReport}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Gerar {exportFormat === "EXCEL" ? "Excel" : "PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DISPLAY FOR RAW ZEBRA ZPL --- */}
      {modalZPL && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9999] backdrop-blur-xs">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-slate-800 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base tracking-tight">🦓 Código de Impressão Zebra ZPL (Lote de Produção)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Copie e envie este fluxo diretamente para impressoras térmicas Zebra em portas RAW TCP 9100 ou utilitários.
                </p>
              </div>
              <button 
                onClick={() => setModalZPL(null)}
                className="text-slate-400 hover:text-white font-black text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <textarea
              readOnly
              value={modalZPL}
              className="bg-black/80 font-mono text-[11px] text-green-400 p-4 rounded-xl h-64 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-green-500 overflow-y-auto select-all"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalZPL(null)}
                className="px-4 py-2 text-xs font-black text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopyZPL}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <Copy size={14} />
                Copiar Todos os Comandos ZPL
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}
