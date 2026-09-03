import React, { useState } from "react";
import { useDatabase } from "./useDatabase";
import {
  Layers,
  Search,
  Pencil,
  ChevronDown,
  ChevronUp,
  History,
  X,
  Plus,
  Boxes,
  Check,
  Printer,
  Download,
  FileText,
} from "lucide-react";
import { StockEntry, isSubTabAllowed } from "./types";
import {
  ScreenLayout,
  ScreenHeader,
  ScrollContainer,
  SectionBlock,
} from "./components/Layout";
import { EMPLOYEE_SIZES } from "./data/employeeSizes";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { RelatorioEpiPrintSheet, DistributionRecord, EmployeeReportData } from "./RelatorioEpiPrintSheet";
import { resolveCompanyInfo } from "./utils/companyUtils";

export function EstoqueScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: import("./types").User;
}) {
  const isImperio = db.activeTenantId === "imperio";
  const [epiHistoryLimit, setEpiHistoryLimit] = useState(50);
  const [uniformHistoryLimit, setUniformHistoryLimit] = useState(50);
  const epiHistory = React.useMemo(() => [...db.epiDistributions].sort((a, b) => b.date - a.date), [db.epiDistributions]);
  const uniformHistory = React.useMemo(() => [...db.uniformDistributions].sort((a, b) => b.date - a.date), [db.uniformDistributions]);
  const itemsById = React.useMemo(() => new Map(db.items.map((item) => [item.id, item])), [db.items]);
  const epiStocksByItem = React.useMemo(() => {
    const result = new Map<number, typeof db.stocks>();
    if (isImperio) db.stocks.forEach((stock) => {
      const entries = result.get(stock.itemId) || [];
      entries.push(stock);
      result.set(stock.itemId, entries);
    });
    return result;
  }, [isImperio, db.stocks]);
  const [activeTab, setActiveTab] = useState<
    "PRODUTOS" | "EPIS" | "COLABORADORES" | "UNIFORMES" | "RELATORIOS"
  >("PRODUTOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "RECENT_ENTRY" | "OLD_ENTRY" | "NAME_ASC" | "NAME_DESC" | "QTY_DESC"
  >("RECENT_ENTRY");
  const [limitTo20, setLimitTo20] = useState(true);

  // Relatórios States
  const [relatorioStartDate, setRelatorioStartDate] = useState("");
  const [relatorioEndDate, setRelatorioEndDate] = useState("");
  const [relatorioEmployeeName, setRelatorioEmployeeName] = useState("");
  const [isGeneratingRelatorio, setIsGeneratingRelatorio] = useState(false);
  const [isDirectPrintingRelatorio, setIsDirectPrintingRelatorio] = useState(false);
  const relatorioPrintRef = React.useRef<HTMLDivElement>(null);
  const [relatorioRecords, setRelatorioRecords] = useState<EmployeeReportData[]>([]);

  const companyInfo = resolveCompanyInfo(db.activeTenant, db.systemSettings, db.tenants);
  const logoUrl = companyInfo.logoUrl || "/icon.png";
  const companyName = companyInfo.companyName;

  const prepareRelatorioData = (): EmployeeReportData[] | null => {
    if (!relatorioStartDate || !relatorioEndDate) {
      alert("Preencha a data inicial e final.");
      return null;
    }

    const startTs = new Date(relatorioStartDate + "T00:00:00").getTime();
    const endTs = new Date(relatorioEndDate + "T23:59:59").getTime();

    if (startTs > endTs) {
      alert("A data inicial não pode ser posterior à data final.");
      return null;
    }

    const matchedReports: EmployeeReportData[] = [];

    // Se nenhum colaborador for selecionado, processa todos que tiveram movimentação
    const employeesToProcess = relatorioEmployeeName.trim()
      ? [db.employees.find((e) => e.name.toLowerCase() === relatorioEmployeeName.toLowerCase().trim()) || { id: "hardcoded", name: relatorioEmployeeName.trim(), sectorId: 0, isActive: true }]
      : [
          ...db.employees,
        ];

    let employeeIdsToProcess = new Set<string>();
    
    if (relatorioEmployeeName.trim()) {
      employeeIdsToProcess.add(employeesToProcess[0].id);
    } else {
      db.epiDistributions.filter(d => d.date >= startTs && d.date <= endTs).forEach(d => employeeIdsToProcess.add(d.employeeId));
      db.uniformDistributions.filter(d => d.date >= startTs && d.date <= endTs).forEach(d => employeeIdsToProcess.add(d.employeeId));
    }

    if (employeeIdsToProcess.size === 0) {
      alert("Nenhuma distribuição de EPI ou Uniforme encontrada para este período.");
      return null;
    }

    for (const empId of Array.from(employeeIdsToProcess)) {
      const records: DistributionRecord[] = [];
      const isHardcoded = empId === "hardcoded";
      const empName = isHardcoded
        ? relatorioEmployeeName.trim()
        : (db.employees.find(
            (e) =>
              String(e.id).trim() === String(empId).trim() ||
              e.name.toLowerCase() === String(empId).trim().toLowerCase()
          )?.name || empId);

      const empEpis = db.epiDistributions.filter(d => d.employeeId === empId && d.date >= startTs && d.date <= endTs);
      empEpis.forEach(d => {
        const item = db.items.find(i => i.id === d.itemId);
        if (item) {
          const caMatch = item.name.match(/c\.?a\.?\s*[:\-]?\s*(\d+)/i);
          records.push({
            type: "EPI",
            itemCode: item.code,
            itemName: item.name,
            caNumber: caMatch ? caMatch[1] : "",
            quantity: d.quantity,
            date: d.date
          });
        }
      });

      const empUnis = db.uniformDistributions.filter(d => d.employeeId === empId && d.date >= startTs && d.date <= endTs);
      empUnis.forEach(d => {
        const uni = db.uniforms.find(u => u.id === d.uniformId);
        if (uni) {
          const caMatch = uni.name.match(/c\.?a\.?\s*[:\-]?\s*(\d+)/i);
          records.push({
            type: "UNIFORME",
            itemCode: "-",
            itemName: uni.name,
            size: uni.size,
            caNumber: caMatch ? caMatch[1] : "",
            quantity: d.quantity,
            date: d.date
          });
        }
      });

      if (records.length > 0) {
        records.sort((a, b) => b.date - a.date);
        matchedReports.push({
          employeeName: empName,
          records
        });
      }
    }

    if (matchedReports.length === 0) {
      alert("Nenhum registro de entrega encontrado para o colaborador no período selecionado.");
      return null;
    }

    return matchedReports;
  };

  const handleGeneratePdf = async () => {
    const matchedReports = prepareRelatorioData();
    if (!matchedReports) return;

    setRelatorioRecords(matchedReports);
    setIsGeneratingRelatorio(true);

    try {
      await new Promise(r => setTimeout(r, 600));
      if (relatorioPrintRef.current) {
        const element = relatorioPrintRef.current;
        const pages = element.querySelectorAll(".print-page");
        
        if (pages.length === 0) {
          throw new Error("Nenhuma página foi gerada para impressão.");
        }

        const pdf = new jsPDF("p", "mm", "a4");

        for (let i = 0; i < pages.length; i++) {
          const pageEl = pages[i] as HTMLElement;
          const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 794, windowHeight: 1122, x: 0, y: 0, width: 794, height: 1122 });
          const imgData = canvas.toDataURL("image/jpeg", 1.0);
          
          if (i > 0) {
            pdf.addPage([210, 297], "p");
          }

          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        }

        const filename = relatorioEmployeeName.trim() 
          ? `Relatorio_EPI_${relatorioEmployeeName.trim().replace(/\s+/g, '_')}_${relatorioStartDate}.pdf`
          : `Relatorio_EPI_Geral_${relatorioStartDate}.pdf`;
          
        pdf.save(filename);
      }
    } catch (e: any) {
      alert("Erro ao gerar PDF: " + (e.message || ""));
    } finally {
      setIsGeneratingRelatorio(false);
    }
  };

  const handleDirectPrintRelatorio = async () => {
    const matchedReports = prepareRelatorioData();
    if (!matchedReports) return;

    setRelatorioRecords(matchedReports);
    setIsDirectPrintingRelatorio(true);

    try {
      // Allow state update to propagate and DOM to render the printable sheet
      await new Promise((resolve) => setTimeout(resolve, 400));

      const targetId = "relatorio-epi-print-container";
      const targetEl = document.getElementById(targetId);
      if (!targetEl) {
        throw new Error("Elemento de impressão do comprovante não foi encontrado no DOM.");
      }

      const docTitle = relatorioEmployeeName.trim()
        ? `Recibo_EPI_${relatorioEmployeeName.trim().replace(/\s+/g, '_')}_${relatorioStartDate}`
        : `Recibo_EPI_Geral_${relatorioStartDate}`;

      const { printElementById } = await import("./printUtils");
      printElementById(targetId, docTitle, true);
    } catch (err: any) {
      console.error("[Print Relatório EPI] erro:", err);
      alert(`Erro na impressão direta: ${err.message || err}`);
    } finally {
      setIsDirectPrintingRelatorio(false);
    }
  };

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [itemId, setItemId] = useState<number | "">("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [variation, setVariation] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [produtoBusca, setProdutoBusca] = useState("");
  const [stage, setStage] = useState<"INTERMEDIARIO" | "ACABADO">("ACABADO");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [selectedStockHistory, setSelectedStockHistory] =
    useState<StockEntry | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // States for EPI Manual Registration and Excel Import
  const [newEpiCode, setNewEpiCode] = useState("");
  const [newEpiName, setNewEpiName] = useState("");
  const [newEpiQty, setNewEpiQty] = useState<number | "">("");
  const [newEpiPrice, setNewEpiPrice] = useState<number | "">("");
  const [newEpiPoints, setNewEpiPoints] = useState<number | "">("");
  const [isEpiFormVisible, setIsEpiFormVisible] = useState(false);
  const [isEpiDistVisible, setIsEpiDistVisible] = useState(false);

  const [epiDistEmployeeName, setEpiDistEmployeeName] = useState("");
  const [epiDistEpiSearch, setEpiDistEpiSearch] = useState("");

  const [isEpiExcelModalOpen, setIsEpiExcelModalOpen] = useState(false);
  const [epiExcelData, setEpiExcelData] = useState("");
  const [epiExcelImportProgress, setEpiExcelImportProgress] = useState(0);
  const [epiExcelImportResult, setEpiExcelImportResult] = useState<
    string | null
  >(null);

  // States for Uniforms Tab
  const [uniformFormName, setUniformFormName] = useState("");
  const [uniformFormSize, setUniformFormSize] = useState("");
  const [uniformFormStock, setUniformFormStock] = useState<number | "">("");
  const [uniformFormMinStock, setUniformFormMinStock] = useState<number | "">("");

  const [uniformDistEmployeeName, setUniformDistEmployeeName] = useState("");
  const [uniformDistUniformId, setUniformDistUniformId] = useState("");
  const [uniformDistQty, setUniformDistQty] = useState<number | "">("");
  const [uniformDistNotes, setUniformDistNotes] = useState("");

  const [isUniformFormVisible, setIsUniformFormVisible] = useState(false);
  const [isUniformDistVisible, setIsUniformDistVisible] = useState(false);

  // States for inline edit/remove uniforms (avoids prompt/confirm iframe block)
  const [editingUniformId, setEditingUniformId] = useState<string | null>(null);
  const [editingUniformStock, setEditingUniformStock] = useState<string>("");
  const [removingUniformId, setRemovingUniformId] = useState<string | null>(null);
  const [stornoUniformDistId, setStornoUniformDistId] = useState<string | null>(null);

  const handleAddEpi = async () => {
    if (!newEpiCode) {
      alert("⚠️ Erro de formulário: O campo 'Código do EPI' é obrigatório.");
      console.warn("EPI registration prevented: missing 'code' field.");
      return;
    }
    if (!newEpiName) {
      alert("⚠️ Erro de formulário: O campo 'Nome do EPI' é obrigatório.");
      console.warn("EPI registration prevented: missing 'name' field.");
      return;
    }

    if (newEpiPrice !== "") {
      const parsedPrice = Number(newEpiPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        alert(
          `⚠️ Preço base inválido: "${newEpiPrice}" não é um preço válido. O valor deve ser um número positivo ou ficar em branco.`,
        );
        console.warn(`EPI save prevented: invalid basePrice "${newEpiPrice}".`);
        return;
      }
    }

    if (newEpiPoints !== "") {
      const parsedPoints = Number(newEpiPoints);
      if (isNaN(parsedPoints) || parsedPoints < 0) {
        alert(
          `⚠️ Pontos de produção inválidos: "${newEpiPoints}" não é válido. O valor deve ser maior ou igual a zero ou ficar em branco.`,
        );
        console.warn(
          `EPI save prevented: invalid productionPoints "${newEpiPoints}".`,
        );
        return;
      }
    }

    const existing = db.items.find(
      (i) =>
        i.code === newEpiCode ||
        i.name.toUpperCase() === newEpiName.toUpperCase(),
    );
    if (existing) {
      alert("⚠️ Esse EPI ou Código já está cadastrado.");
      return;
    }

    const price = newEpiPrice === "" ? undefined : Number(newEpiPrice);
    const points = newEpiPoints === "" ? undefined : Number(newEpiPoints);

    await db.addItem({
      code: newEpiCode,
      name: newEpiName,
      notes: "",
      type: "EPI",
      basePrice: price,
      productionPoints: points,
    });

    const qty = newEpiQty === "" ? 0 : Number(newEpiQty);
    if (qty > 0) {
      let attempts = 0;
      const interval = setInterval(() => {
        const newlyAdded = db.items.find((i) => i.code === newEpiCode);
        if (newlyAdded) {
          clearInterval(interval);
          const stockId = `${newlyAdded.id}|OUTROS|OUTROS|OUTROS|ACABADO`;
          db.updateStocks([
            {
              id: stockId,
              itemId: newlyAdded.id,
              color: "OUTROS",
              size: "OUTROS",
              variation: "OUTROS",
              stage: "ACABADO",
              quantity: qty,
            },
          ]);
          db.addStockMovement({
            itemId: newlyAdded.id,
            color: "OUTROS",
            size: "OUTROS",
            variation: "OUTROS",
            quantity: qty,
            type: "ENTRADA",
            description: `Cadastro inicial de EPI com estoque`,
          });
        }
        attempts++;
        if (attempts > 20) {
          clearInterval(interval);
        }
      }, 300);
    }

    setNewEpiCode("");
    setNewEpiName("");
    setNewEpiQty("");
    setNewEpiPrice("");
    setNewEpiPoints("");
    alert("EPI cadastrado com sucesso!");
  };

  const handleEpiImportExcel = async () => {
    if (!epiExcelData.trim()) return;

    setEpiExcelImportResult("Processando...");
    setEpiExcelImportProgress(0);

    const rows = epiExcelData.trim().split("\n");
    let addedCount = 0;
    let updatedCount = 0;

    const firstRowCols = rows[0].split("\t").map((c) => c.trim().toUpperCase());
    let startIdx = 0;

    let idxCode = 0;
    let idxName = 1;
    let idxPrice = 2;
    let idxPoints = 3;
    let idxQty = -1;

    if (
      firstRowCols.includes("CÓDIGO") ||
      firstRowCols.includes("COD") ||
      firstRowCols.includes("CÓD. ITEM") ||
      firstRowCols.includes("PRODUTO") ||
      firstRowCols.includes("ITEM") ||
      firstRowCols.includes("EPI") ||
      firstRowCols.includes("NOME")
    ) {
      startIdx = 1;
      const getCol = (names: string[]) =>
        firstRowCols.findIndex((c) => names.some((n) => c.includes(n)));

      idxCode = getCol(["CÓDIGO", "CÓD", "COD"]);
      idxName = getCol(["EPI", "PRODUTO", "ITEM", "NOME"]);
      idxPrice = getCol(["PREÇO", "PRECO", "VALOR"]);
      idxPoints = getCol(["PONTOS", "PONTUAÇÃO", "PONTUACAO"]);
      idxQty = getCol(["ESTOQUE", "QUANTIDADE", "SALDO", "QTD"]);
    }

    const itemsToCreate: {
      code: string;
      name: string;
      price?: number;
      points?: number;
      qty?: number;
    }[] = [];
    const stockUpdatesToMake: { itemId: number; quantity: number }[] = [];
    const validationWarnings: string[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      if (i % 25 === 0) {
        setEpiExcelImportProgress(
          Math.round(((i - startIdx) / (rows.length - startIdx)) * 100),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("\t").map((c) => c.trim());

      const rCode = idxCode >= 0 ? cols[idxCode] : "";
      const rName = idxName >= 0 ? cols[idxName] : "";
      const rPriceStr = idxPrice >= 0 ? cols[idxPrice] : "";
      const rPointsStr = idxPoints >= 0 ? cols[idxPoints] : "";
      const rQtyStr = idxQty >= 0 ? cols[idxQty] : "";

      if (!rCode && !rName) continue;

      const basePriceParsed = parseFloat((rPriceStr || "").replace(",", "."));
      const price = !isNaN(basePriceParsed) ? basePriceParsed : undefined;

      if (rPriceStr && (isNaN(basePriceParsed) || basePriceParsed < 0)) {
        const errorMsg = `Planilha Linha ${i + 1}: Preço base inválido ou malformado ("${rPriceStr}") para o EPI "${rCode || rName}"`;
        console.warn(errorMsg);
        validationWarnings.push(errorMsg);
      }

      const pointsParsed = parseFloat((rPointsStr || "").replace(",", "."));
      const points = !isNaN(pointsParsed) ? pointsParsed : undefined;

      if (rPointsStr && (isNaN(pointsParsed) || pointsParsed < 0)) {
        const errorMsg = `Planilha Linha ${i + 1}: Pontos de produção inválidos ("${rPointsStr}") para o EPI "${rCode || rName}"`;
        console.warn(errorMsg);
        validationWarnings.push(errorMsg);
      }

      const qtyParsed = parseFloat((rQtyStr || "").replace(",", "."));
      const qty = !isNaN(qtyParsed) ? qtyParsed : undefined;

      const existing = db.items.find(
        (it) =>
          (rCode && it.code === rCode) ||
          (rName && it.name.toUpperCase() === rName.toUpperCase()),
      );

      if (existing) {
        const updatedItem = {
          ...existing,
          code: rCode || existing.code,
          name: rName || existing.name,
          basePrice: price !== undefined ? price : existing.basePrice,
          productionPoints:
            points !== undefined ? points : existing.productionPoints,
          type: "EPI" as const,
        };
        await db.updateItem(updatedItem);
        updatedCount++;

        if (qty !== undefined) {
          stockUpdatesToMake.push({ itemId: existing.id, quantity: qty });
        }
      } else {
        if (rCode && rName) {
          itemsToCreate.push({
            code: rCode,
            name: rName,
            price,
            points,
            qty,
          });
          addedCount++;
        }
      }
    }

    for (const newItem of itemsToCreate) {
      await db.addItem({
        code: newItem.code,
        name: newItem.name,
        notes: "",
        type: "EPI",
        basePrice: newItem.price,
        productionPoints: newItem.points,
      });
    }

    setEpiExcelImportProgress(100);

    if (stockUpdatesToMake.length > 0) {
      const dbStocksList = [...db.stocks];
      const stocksToUpdate = stockUpdatesToMake.map((up) => {
        const existingStock = dbStocksList.find((s) => s.itemId === up.itemId);
        const oldQty = existingStock ? existingStock.quantity : 0;
        const diff = up.quantity - oldQty;

        if (diff !== 0) {
          db.addStockMovement({
            itemId: up.itemId,
            color: "OUTROS",
            size: "OUTROS",
            variation: "OUTROS",
            quantity: Math.abs(diff),
            type: diff > 0 ? "ENTRADA" : "SAIDA",
            description: `Importação de estoque via Excel (Anterior: ${oldQty} -> Novo: ${up.quantity})`,
          });
        }

        return {
          id: existingStock
            ? existingStock.id
            : `${up.itemId}|OUTROS|OUTROS|OUTROS|ACABADO`,
          itemId: up.itemId,
          color: existingStock ? existingStock.color : "OUTROS",
          size: existingStock ? existingStock.size : "OUTROS",
          variation: existingStock ? existingStock.variation : "OUTROS",
          stage: "ACABADO" as const,
          quantity: up.quantity,
        };
      });
      await db.updateStocks(stocksToUpdate);
    }

    const pendingWithQty = itemsToCreate.filter(
      (i) => i.qty !== undefined && i.qty > 0,
    );
    if (pendingWithQty.length > 0) {
      let attempts = 0;
      const interval = setInterval(() => {
        const freshItems = db.items;
        const foundList: { itemId: number; quantity: number }[] = [];
        pendingWithQty.forEach((pi) => {
          const matched = freshItems.find((i) => i.code === pi.code);
          if (matched) {
            foundList.push({ itemId: matched.id, quantity: pi.qty! });
          }
        });

        if (foundList.length === pendingWithQty.length || attempts > 20) {
          clearInterval(interval);
          if (foundList.length > 0) {
            const stocksToUpdate = foundList.map((up) => {
              db.addStockMovement({
                itemId: up.itemId,
                color: "OUTROS",
                size: "OUTROS",
                variation: "OUTROS",
                quantity: up.quantity,
                type: "ENTRADA",
                description: `Importação inicial de estoque via Excel`,
              });

              return {
                id: `${up.itemId}|OUTROS|OUTROS|OUTROS|ACABADO`,
                itemId: up.itemId,
                color: "OUTROS",
                size: "OUTROS",
                variation: "OUTROS",
                stage: "ACABADO" as const,
                quantity: up.quantity,
              };
            });
            db.updateStocks(stocksToUpdate);
          }
        }
        attempts++;
      }, 400);
    }

    const warningText =
      validationWarnings.length > 0
        ? `\n\n⚠️ Alerta de dados:\n${validationWarnings.slice(0, 5).join("\n")}${validationWarnings.length > 5 ? `\n...e mais ${validationWarnings.length - 5} alertas` : ""}`
        : "";

    setEpiExcelImportResult(
      `Concluído! ${addedCount} novos EPIs cadastrados, ${updatedCount} atualizados.${warningText}`,
    );
    setEpiExcelData("");

    setTimeout(() => {
      setIsEpiExcelModalOpen(false);
      setEpiExcelImportResult(null);
    }, 4500);
  };

  interface GroupedStock {
    itemId: number;
    stage: "INTERMEDIARIO" | "ACABADO";
    entries: typeof db.stocks;
  }
  const [selectedGroupItem, setSelectedGroupItem] =
    useState<GroupedStock | null>(null);

  const [employeeName, setEmployeeName] = useState("");
  const [employeeSectorId, setEmployeeSectorId] = useState<number | "">("");

  const getAverageMonthlyOutput = (itemId: number) => {
    const movementsOfItem = (db.stockMovements || []).filter(
      (m) => m.itemId === itemId && m.type === "SAIDA",
    );

    if (movementsOfItem.length === 0) {
      // Fallback: use completed/pending orders total to predict typical velocity
      const ordersOfItem = (db.orders || []).filter((o) => o.itemId === itemId);
      const totalOrderQty = ordersOfItem.reduce(
        (sum, o) => sum + o.totalQuantity,
        0,
      );
      return Math.max(20, totalOrderQty); // use 20 as floor
    }

    const timestamps = movementsOfItem.map((m) => m.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps, Date.now());
    const timeSpanMonths = Math.max(
      1,
      (maxTime - minTime) / (30 * 24 * 60 * 60 * 1000),
    );

    const totalOut = movementsOfItem.reduce((sum, m) => sum + m.quantity, 0);
    return Math.max(20, totalOut / timeSpanMonths);
  };

  const groupStocksByItem = (stocksList: typeof db.stocks): GroupedStock[] => {
    const groups: { [key: string]: GroupedStock } = {};
    stocksList.forEach((s) => {
      const key = `${s.itemId}|${s.stage}`;
      if (!groups[key]) {
        groups[key] = {
          itemId: s.itemId,
          stage: s.stage,
          entries: [],
        };
      }
      groups[key].entries.push(s);
    });
    return Object.values(groups);
  };

  const filteredStocks = React.useMemo(() => {
    // Distribution forms do not need the product stock grid or its expensive sorting.
    if (isImperio && activeTab !== "PRODUTOS") return [];
    return db.stocks
    .filter((s) => {
      const item = itemsById.get(s.itemId);
      if (item?.type === "EPI") return false;

      if (!debouncedSearchTerm) return true;
      const searchStr =
        `${item?.name || ""} ${s.color} ${s.size} ${s.variation} ${s.stage}`.toLowerCase();
      return searchStr.includes(debouncedSearchTerm.toLowerCase());
    })
    .filter(
      (s) =>
        s.quantity > 0 ||
        (s.itemId === itemId &&
          s.color === color &&
          s.size === size &&
          s.variation === variation &&
          s.stage === stage),
    );
  }, [isImperio, activeTab, db.stocks, itemsById, debouncedSearchTerm, itemId, color, size, variation, stage]);

  const recentStockEntries = React.useMemo(() => {
    const result = new Map<number, number>();
    if (isImperio && activeTab === "PRODUTOS") {
      (db.stockMovements || []).forEach((movement) => {
        if (movement.type === "ENTRADA") result.set(movement.itemId, Math.max(result.get(movement.itemId) || 0, movement.timestamp));
      });
    }
    return result;
  }, [isImperio, activeTab, db.stockMovements]);

  const getMostRecentStockInTimestamp = React.useCallback((g: GroupedStock) => {
    if (isImperio) return recentStockEntries.get(g.itemId) || 0;
    const movements = db.stockMovements || [];
    let maxTime = 0;
    movements.forEach((m) => {
      if (m.itemId === g.itemId && m.type === "ENTRADA") {
        if (m.timestamp > maxTime) {
          maxTime = m.timestamp;
        }
      }
    });
    return maxTime;
  }, [db.stockMovements, isImperio, recentStockEntries]);

  const sortedGroupedStocks = React.useMemo(() => {
    const rawGrouped = groupStocksByItem(filteredStocks);
    
    return rawGrouped.sort((a, b) => {
      if (sortBy === "RECENT_ENTRY") {
        return getMostRecentStockInTimestamp(b) - getMostRecentStockInTimestamp(a);
      }
      if (sortBy === "OLD_ENTRY") {
        return getMostRecentStockInTimestamp(a) - getMostRecentStockInTimestamp(b);
      }
      if (sortBy === "NAME_ASC") {
        const nameA = db.items.find((i) => i.id === a.itemId)?.name || "";
        const nameB = db.items.find((i) => i.id === b.itemId)?.name || "";
        return nameA.localeCompare(nameB);
      }
      if (sortBy === "NAME_DESC") {
        const nameA = db.items.find((i) => i.id === a.itemId)?.name || "";
        const nameB = db.items.find((i) => i.id === b.itemId)?.name || "";
        return nameB.localeCompare(nameA);
      }
      if (sortBy === "QTY_DESC") {
        const qtyA = a.entries.reduce((sum, s) => sum + s.quantity, 0);
        const qtyB = b.entries.reduce((sum, s) => sum + s.quantity, 0);
        return qtyB - qtyA;
      }
      return 0;
    });
  }, [filteredStocks, sortBy, getMostRecentStockInTimestamp, db.items]);

  const triggerSaveStock = () => {
    let matchedItemId: number | "" = itemId;

    // Only attempt lookup if itemId is not already specified
    if ((matchedItemId === "" || matchedItemId === undefined || matchedItemId === null) && produtoBusca) {
      const searchStrLower = produtoBusca.trim().toLowerCase();
      let mItem = db.items.find((i) => {
        const fullStr = `${i.code} - ${i.name}`.toLowerCase();
        return (
          fullStr === searchStrLower ||
          i.code.toLowerCase() === searchStrLower ||
          i.name.toLowerCase() === searchStrLower
        );
      });

      if (!mItem) {
        mItem = db.items.find((i) =>
          i.name.toLowerCase().includes(searchStrLower) ||
          searchStrLower.includes(i.name.toLowerCase())
        );
      }

      if (mItem) matchedItemId = mItem.id;
    }

    if ((matchedItemId === "" || matchedItemId === undefined || matchedItemId === null) || quantity === "") {
      alert(
        "Preencha corretamente o produto (selecionando na lista) e a quantidade.",
      );
      return;
    }
    setItemId(matchedItemId);
    setShowConfirmModal(true);
  };

  const handleConfirmSaveStock = async () => {
    let targetItemId: number | "" = itemId;

    if ((targetItemId === "" || targetItemId === undefined || targetItemId === null) && produtoBusca) {
      const searchStrLower = produtoBusca.trim().toLowerCase();
      let mItem = db.items.find((i) => {
        const fullStr = `${i.code} - ${i.name}`.toLowerCase();
        return (
          fullStr === searchStrLower ||
          i.code.toLowerCase() === searchStrLower ||
          i.name.toLowerCase() === searchStrLower
        );
      });

      if (!mItem) {
        mItem = db.items.find((i) =>
          i.name.toLowerCase().includes(searchStrLower) ||
          searchStrLower.includes(i.name.toLowerCase())
        );
      }

      if (mItem) targetItemId = mItem.id;
    }

    if ((targetItemId === "" || targetItemId === undefined || targetItemId === null) || quantity === "") {
      setShowConfirmModal(false);
      return;
    }

    const targetColor = color || "";
    const targetSize = size || "";
    const targetVariation = variation || "";
    const targetStage = stage || "ACABADO";
    const numQuantity = Number(quantity);

    const generatedStockId = `${targetItemId}|${targetColor}|${targetSize}|${targetVariation}|${targetStage}`;
    const stockId = editingStockId || generatedStockId;

    const existing = db.stocks.find(
      (s) =>
        s.id === stockId ||
        (s.itemId === Number(targetItemId) &&
          (s.color || "") === targetColor &&
          (s.size || "") === targetSize &&
          (s.variation || "") === targetVariation &&
          (s.stage || "ACABADO") === targetStage),
    );

    const actualStockId = existing ? existing.id : generatedStockId;
    const prevQty = existing?.quantity || 0;
    const diff = numQuantity - prevQty;

    await db.updateStocks([
      {
        id: actualStockId,
        itemId: Number(targetItemId),
        color: targetColor,
        size: targetSize,
        variation: targetVariation,
        quantity: Math.max(0, numQuantity),
        stage: targetStage,
      },
    ]);

    if (diff !== 0) {
      await db.addStockMovement?.({
        itemId: Number(targetItemId),
        color: targetColor,
        size: targetSize,
        variation: targetVariation,
        quantity: Math.abs(diff),
        type: diff > 0 ? "ENTRADA" : "SAIDA",
        description: `Ajuste manual de estoque (Anterior: ${prevQty} -> Novo: ${numQuantity})`,
      });
    }

    setItemId("");
    setProdutoBusca("");
    setColor("");
    setSize("");
    setVariation("");
    setQuantity("");
    setStage("ACABADO");
    setEditingStockId(null);
    setIsFormVisible(false);
    setShowConfirmModal(false);
  };

  const handleEdit = (s: (typeof db.stocks)[0]) => {
    setEditingStockId(s.id);
    setItemId(s.itemId);
    const itemObj = db.items.find((i) => i.id === s.itemId);
    if (itemObj) {
      setProdutoBusca(`${itemObj.code} - ${itemObj.name}`);
    } else {
      setProdutoBusca("");
    }
    setColor(s.color || "");
    setSize(s.size || "");
    setVariation(s.variation || "");
    setQuantity(s.quantity);
    setStage(s.stage || "ACABADO");
    setIsFormVisible(true);
  };

  const renderGroupedStockItem = (g: GroupedStock) => {
    const item = db.items.find((i) => i.id === g.itemId);
    const totalQuantity = g.entries.reduce((sum, s) => sum + s.quantity, 0);
    const totalDeclaredPackages = g.entries.reduce((sum, s) => sum + (s.declaredPackages || 0), 0);
    const mUnit = g.entries.find((s) => s.measurementUnit)?.measurementUnit;

    // Sum of all pending/active order quantities for this item
    const totalPendingInOrders = db.orders
      .filter(
        (o) => o.isActive && o.status !== "FATURADO" && o.itemId === g.itemId,
      )
      .reduce((sum, o) => sum + o.totalQuantity, 0);

    // Calculate oldest 2 orders that can be fully faturados with what we have in stock
    const matchingOrdersSorted = db.orders
      .filter(
        (o) => o.isActive && o.status !== "FATURADO" && o.itemId === g.itemId,
      )
      .sort((a, b) => {
        const dateA = new Date(a.deliveryDate).getTime() || a.createdAt;
        const dateB = new Date(b.deliveryDate).getTime() || b.createdAt;
        return dateA !== dateB ? dateA - dateB : a.createdAt - b.createdAt;
      });

    const stocksMap = new Map<string, number>();
    g.entries.forEach((e) => {
      const key = `${e.color || ""}|${e.size || ""}|${e.variation || ""}`;
      stocksMap.set(key, (stocksMap.get(key) || 0) + e.quantity);
    });

    const faturaveisEstoque: typeof db.orders = [];
    matchingOrdersSorted.forEach((o) => {
      if (faturaveisEstoque.length >= 2) return;
      const key = `${o.color || ""}|${o.size || ""}|${o.variation || ""}`;
      const avStock = stocksMap.get(key) || 0;
      if (avStock >= o.totalQuantity) {
        stocksMap.set(key, avStock - o.totalQuantity);
        faturaveisEstoque.push(o);
      }
    });

    const avgMonthly = getAverageMonthlyOutput(g.itemId);
    const alertLimit = avgMonthly * 0.1;
    const isLowStock = totalQuantity < alertLimit;

    return (
      <div
        key={`${g.itemId}|${g.stage}`}
        id={`grouped-stock-${g.itemId}-${g.stage}`}
        className={`bg-white p-3.5 sm:p-5 border rounded-xl flex flex-col gap-3 hover:shadow-md transition cursor-pointer relative group ${
          isLowStock
            ? "border-amber-300 bg-amber-50/10 shadow-[0_0_15px_rgba(245,158,11,0.03)] hover:border-amber-500"
            : "border-gray-150 hover:border-emerald-500 hover:shadow-md"
        }`}
        onClick={() => setSelectedGroupItem(g)}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-bold text-gray-850 text-sm sm:text-base flex flex-wrap items-center gap-1.5 group-hover:text-emerald-700 transition lg:max-w-full">
              <span className="break-words line-clamp-2">
                {item?.name || "Item Desconhecido"}
              </span>
              <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono shrink-0">
                {item?.code || "-"}
              </span>
            </span>
            <span className="text-gray-500 text-xs mt-1 font-semibold block">
              {g.entries.length} variação(ões) em estoque
            </span>
            <div className="flex gap-1.5 flex-wrap mt-2 items-center">
              <span
                className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded ${g.stage === "INTERMEDIARIO" ? "bg-orange-100 text-orange-850" : "bg-emerald-100 text-emerald-850"}`}
              >
                {g.stage === "INTERMEDIARIO"
                  ? "Estoque Intermediário"
                  : "Estoque Acabado"}
              </span>
              {isLowStock && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full animate-pulse border border-amber-200">
                  ⚠️{" "}
                  <span className="text-[9px] uppercase tracking-wider font-sans font-semibold">
                    Abaixo de 10% da Saída (Média: {Math.round(avgMonthly)} pçs)
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-start border-t sm:border-0 pt-2 sm:pt-0 shrink-0">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Total Físico
            </span>
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-600 flex flex-col items-end">
              {totalQuantity} <span className="text-[9px] text-gray-400 font-medium">pçs</span>
            </span>
            {totalDeclaredPackages > 0 && mUnit && (
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded mt-1">
                {totalDeclaredPackages} {mUnit.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* Allocation and surplus info */}
        <div className="bg-gray-50/50 p-2 sm:p-3 rounded-lg border border-gray-100 text-xs flex flex-col gap-2 min-w-0">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center bg-gray-100/50 p-1 px-2 rounded">
            <span>DEMANDAS & FATURAMENTO POTENCIAL</span>
            <span className="text-emerald-700 underline text-[8px] font-bold">
              Detalhes ↗
            </span>
          </span>

          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex justify-between items-center bg-white border border-gray-100 px-2 py-1.5 rounded shadow-xs text-gray-700 text-[10px] sm:text-[11px] min-w-0 gap-2">
              <span className="flex items-center gap-1 font-sans min-w-0 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span className="truncate font-semibold text-slate-700">
                  Total Solicitado em Pedidos Pendentes
                </span>
              </span>
              <span className="font-extrabold text-blue-700 font-mono shrink-0">
                {totalPendingInOrders} unid.
              </span>
            </div>

            {faturaveisEstoque.length > 0 ? (
              <div className="mt-1 space-y-1">
                <span className="text-[9px] font-semibold text-gray-400 block uppercase px-1">
                  Atendíveis com Estoque Atual (2 Mais Antigos):
                </span>
                {faturaveisEstoque.map((o) => (
                  <div
                    key={o.id}
                    className="flex justify-between items-center bg-emerald-50/60 border border-emerald-100 px-2 py-1.5 rounded text-[10px] sm:text-[11px] text-emerald-950 min-w-0 gap-2"
                  >
                    <span className="flex items-center gap-1 font-sans min-w-0 truncate">
                      <span className="w-1 h-1 rounded-full bg-emerald-600 shrink-0"></span>
                      <span className="truncate font-medium">
                        Pedido{" "}
                        <strong className="font-semibold">
                          #{o.orderCode}
                        </strong>{" "}
                        : {o.customerName}
                      </span>
                    </span>
                    <span className="font-extrabold font-mono shrink-0 text-emerald-850">
                      {o.totalQuantity} pçs
                    </span>
                  </div>
                ))}
              </div>
            ) : totalPendingInOrders > 0 ? (
              <span className="text-gray-400 italic text-[10px] px-1 block">
                Nenhum pedido atende integralmente às coordenadas do estoque
                atual.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ScreenLayout id="estoque-screen-layout">
      <ScreenHeader
        title="Controle de Estoque e EPIs"
        icon={<Layers size={20} className="text-emerald-700" />}
        actions={
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 shrink-0">
            {isSubTabAllowed(db.activeTenant, "estoque:produtos") && (
              <button
                onClick={() => setActiveTab("PRODUTOS")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === "PRODUTOS" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
              >
                Produtos
              </button>
            )}
            {isSubTabAllowed(db.activeTenant, "estoque:epis") && (
              <button
                onClick={() => setActiveTab("EPIS")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === "EPIS" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
              >
                EPI
              </button>
            )}
            {isSubTabAllowed(db.activeTenant, "estoque:uniformes") && (
              <button
                onClick={() => setActiveTab("UNIFORMES")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === "UNIFORMES" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
              >
                Uniformes
              </button>
            )}
            {isSubTabAllowed(db.activeTenant, "estoque:relatorios") && (
              <button
                onClick={() => setActiveTab("RELATORIOS")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${activeTab === "RELATORIOS" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
              >
                Ficha/Recibo
              </button>
            )}
          </div>
        }
      />

      <ScrollContainer paddingSize="dense" className="space-y-4">
        {activeTab === "PRODUTOS" && (
          <>
            {/* Top Action Header */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-gray-800 text-sm sm:text-base font-sans">
                  Gestão e Ajuste de Estoque
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Localize itens para ajustar saldos diretamente ou abra a janela de ajuste manual.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingStockId(null);
                  setItemId("");
                  setProdutoBusca("");
                  setColor("");
                  setSize("");
                  setVariation("");
                  setQuantity("");
                  setStage("ACABADO");
                  setIsFormVisible(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus size={16} />
                Ajuste Manual de Estoque
              </button>
            </div>

            {/* Modal Window Popup for Stock Editing */}
            {isFormVisible && (
              <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                  
                  {/* Header */}
                  <div className="bg-slate-900 text-white p-4 px-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Boxes className="text-emerald-400" size={20} />
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-white">
                          Ajuste de Item do Estoque
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">
                          Altere o saldo ou variação sem sair do lugar na tela
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsFormVisible(false);
                        setItemId("");
                        setProdutoBusca("");
                        setColor("");
                        setSize("");
                        setVariation("");
                        setQuantity("");
                      }}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Produto / Item
                        </label>
                        {itemId !== "" && itemId !== null && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ {db.items.find((i) => i.id === itemId)?.name || `ID: ${itemId}`}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={produtoBusca}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProdutoBusca(val);
                          const searchStrLower = val.trim().toLowerCase();
                          const found = db.items.find(
                            (it) =>
                              `${it.code} - ${it.name}`.toLowerCase() === searchStrLower ||
                              it.name.toLowerCase() === searchStrLower ||
                              it.code.toLowerCase() === searchStrLower
                          );
                          if (found) {
                            setItemId(found.id);
                          }
                        }}
                        className="border border-slate-300 p-2.5 rounded-lg bg-white text-slate-800 text-xs w-full focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                        placeholder="Digite para buscar um produto..."
                        list="stock-item-modal-list"
                      />
                      <datalist id="stock-item-modal-list">
                        {db.items.map((it) => (
                          <option key={it.id} value={`${it.code} - ${it.name}`} />
                        ))}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Cor</label>
                        <input
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          placeholder="Ex: PRETO"
                          className="border border-slate-300 p-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Tamanho</label>
                        <input
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="Ex: P / M"
                          className="border border-slate-300 p-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Variação</label>
                        <input
                          value={variation}
                          onChange={(e) => setVariation(e.target.value)}
                          placeholder="Ex: DIREITO"
                          className="border border-slate-300 p-2 rounded-lg text-xs w-full focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Qtd Total no Estoque</label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="0"
                          className="border border-slate-300 p-2.5 rounded-lg text-xs w-full font-extrabold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Estágio do Estoque</label>
                        <select
                          value={stage}
                          onChange={(e) => setStage(e.target.value as any)}
                          className="border border-slate-300 p-2.5 rounded-lg text-xs w-full bg-white font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="ACABADO">Estoque Acabado</option>
                          <option value="INTERMEDIARIO">Estoque Intermediário</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-slate-50 border-t border-slate-200 p-4 flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setIsFormVisible(false);
                        setItemId("");
                        setProdutoBusca("");
                        setColor("");
                        setSize("");
                        setVariation("");
                        setQuantity("");
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={triggerSaveStock}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      Salvar Estoque
                    </button>
                  </div>

                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2.5 flex-1">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Pesquisar no estoque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full focus:outline-none text-sm bg-transparent text-gray-800"
                />
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                >
                  <option value="RECENT_ENTRY">Mais Recentes em Estoque</option>
                  <option value="OLD_ENTRY">Mais Antigos em Estoque</option>
                  <option value="NAME_ASC">Nome (A - Z)</option>
                  <option value="NAME_DESC">Nome (Z - A)</option>
                  <option value="QTY_DESC">Maior Quantidade</option>
                </select>
              </div>

              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={limitTo20}
                    onChange={(e) => setLimitTo20(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Limitar a 20 itens</span>
                </label>
              </div>
            </div>

            {showConfirmModal && (
              <div className="fixed inset-0 bg-black/70 z-[250] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
                  <div className="bg-slate-900 text-white p-4 px-5 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Boxes className="text-emerald-400" size={18} />
                      Confirmar Ajuste de Estoque
                    </h3>
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-3 text-slate-800 text-xs font-sans">
                    <p className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                      {db.items.find((i) => i.id === Number(itemId))?.name || produtoBusca || "Produto Selecionado"}
                    </p>
                    {(color || size || variation) && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Variação: {color || "-"} / {size || "-"} / {variation || "-"}
                      </div>
                    )}
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 mt-1">
                      <span className="text-slate-600 font-semibold">Quantidade Atual:</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {db.stocks.find(
                          (s) =>
                            s.id === editingStockId ||
                            s.id === `${itemId}|${color}|${size}|${variation}|${stage}`
                        )?.quantity || 0} pçs
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-lg border border-emerald-200/80">
                      <span className="text-emerald-800 font-semibold">Nova Quantidade:</span>
                      <span className="font-extrabold text-emerald-700 text-base">
                        {quantity} pçs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Tem certeza que deseja atualizar o saldo em estoque para este item?
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2.5">
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmSaveStock}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg transition text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      Confirmar Ajuste
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="pb-4">
              {filteredStocks.length === 0 ? (
                <p className="text-gray-500 text-center mt-4 text-sm font-sans">
                  Estoque vazio ou nenhum item correspondente encontrado.
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Secao: Estoque Acabado */}
                  <div>
                    <h4 className="font-bold text-gray-700 bg-gray-100 p-2 rounded mb-3 flex items-center justify-between uppercase text-xs tracking-wider">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>{" "}
                        Acabado
                      </span>
                      <span className="text-[10px] text-gray-400 font-sans normal-case">
                        {limitTo20 ? "Exibindo 20 mais recentes" : `Exibindo ${sortedGroupedStocks.filter((s) => s.stage === "ACABADO").length} itens`}
                      </span>
                    </h4>
                    <div className="grid gap-4">
                      {sortedGroupedStocks.filter((s) => s.stage === "ACABADO").length === 0 ? (
                        <p className="text-gray-400 text-sm italic px-2">
                          Nenhum item acabado.
                        </p>
                      ) : (
                        sortedGroupedStocks
                          .filter((s) => s.stage === "ACABADO")
                          .slice(0, limitTo20 ? 20 : undefined)
                          .map(renderGroupedStockItem)
                      )}
                    </div>
                  </div>

                  {/* Secao: Estoque Intermediário */}
                  <div>
                    <h4 className="font-bold text-gray-700 bg-gray-100 p-2 rounded mb-3 flex items-center justify-between uppercase text-xs tracking-wider">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>{" "}
                        Intermediário
                      </span>
                      <span className="text-[10px] text-gray-400 font-sans normal-case">
                        {limitTo20 ? "Exibindo 20 mais recentes" : `Exibindo ${sortedGroupedStocks.filter((s) => s.stage === "INTERMEDIARIO").length} itens`}
                      </span>
                    </h4>
                    <div className="grid gap-4">
                      {sortedGroupedStocks.filter((s) => s.stage === "INTERMEDIARIO").length === 0 ? (
                        <p className="text-gray-400 text-sm italic px-2">
                          Nenhum item intermediário.
                        </p>
                      ) : (
                        sortedGroupedStocks
                          .filter((s) => s.stage === "INTERMEDIARIO")
                          .slice(0, limitTo20 ? 20 : undefined)
                          .map(renderGroupedStockItem)
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pop-up Modal showing the step-by-step history */}
            {selectedStockHistory &&
              (() => {
                const item = db.items.find(
                  (i) => i.id === selectedStockHistory.itemId,
                );
                const itemMovements = (db.stockMovements || [])
                  .filter(
                    (m) =>
                      m.itemId === selectedStockHistory.itemId &&
                      m.color === selectedStockHistory.color &&
                      m.size === selectedStockHistory.size &&
                      m.variation === selectedStockHistory.variation,
                  )
                  .sort((a, b) => b.timestamp - a.timestamp);

                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                      <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">
                            Histórico de Movimentações
                          </span>
                          <h3 className="font-bold text-lg leading-tight mt-0.5">
                            {item?.name || "Produto"}
                          </h3>
                          <span className="text-xs text-emerald-100/90 font-mono mt-0.5">
                            {selectedStockHistory.color || "-"} |{" "}
                            {selectedStockHistory.size || "-"} |{" "}
                            {selectedStockHistory.variation || "-"}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedStockHistory(null)}
                          className="bg-emerald-800/50 hover:bg-emerald-900/40 p-1.5 rounded-full text-white transition shrink-0"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="p-4 bg-emerald-50/50 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-emerald-800">
                          Saldo Atual em Estoque:
                        </span>
                        <span className="text-xl font-bold font-mono text-emerald-700">
                          {selectedStockHistory.quantity} unid.
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {itemMovements.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm italic font-sans">
                            Nenhuma movimentação registrada no histórico deste
                            item.
                          </div>
                        ) : (
                          itemMovements.map((m) => (
                            <div
                              key={m.id}
                              className="p-3 border border-gray-100 rounded-lg flex items-start gap-3 bg-gray-50/50"
                            >
                              <div
                                className={`p-1 px-2 rounded text-[10px] uppercase font-bold shrink-0 ${m.type === "ENTRADA" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                              >
                                {m.type === "ENTRADA" ? "Entrada" : "Saída"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                  <span
                                    className={`text-base font-bold font-mono leading-none ${m.type === "ENTRADA" ? "text-green-600" : "text-red-650"}`}
                                  >
                                    {m.type === "ENTRADA" ? "+" : "-"}
                                    {m.quantity}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {new Date(m.timestamp).toLocaleDateString()}{" "}
                                    {new Date(m.timestamp).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 font-sans">
                                  {m.description}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="bg-gray-50 p-3 border-t flex justify-end">
                        <button
                          onClick={() => setSelectedStockHistory(null)}
                          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition text-sm shadow-xs"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* Pop-up Modal showing detailed product allocations, client reservations, and physical stocks breakdown */}
            {selectedGroupItem &&
              (() => {
                const item = db.items.find(
                  (i) => i.id === selectedGroupItem.itemId,
                );

                // Compute detailed attributes breakdown and orders match
                const breakdownData = selectedGroupItem.entries.map((s) => {
                  const matchingOrders = db.orders
                    .filter(
                      (o) =>
                        o.isActive &&
                        o.status !== "FATURADO" &&
                        o.itemId === s.itemId &&
                        (o.color || "") === (s.color || "") &&
                        (o.size || "") === (s.size || "") &&
                        (o.variation || "") === (s.variation || ""),
                    )
                    .sort((a, b) => {
                      const dateA =
                        new Date(a.deliveryDate).getTime() || a.createdAt;
                      const dateB =
                        new Date(b.deliveryDate).getTime() || b.createdAt;
                      return dateA !== dateB
                        ? dateA - dateB
                        : a.createdAt - b.createdAt;
                    });

                  return {
                    entry: s,
                    attributes: `${s.color || "-"} | ${s.size || "-"} | ${s.variation || "-"}`,
                    totalQty: s.quantity,
                    matchingOrders,
                  };
                });

                const grandTotal = breakdownData.reduce(
                  (sum, d) => sum + d.totalQty,
                  0,
                );

                // Sum of all pending/active order quantities for this item
                const totalPendingInOrders = db.orders
                  .filter(
                    (o) =>
                      o.isActive &&
                      o.status !== "FATURADO" &&
                      o.itemId === selectedGroupItem.itemId,
                  )
                  .reduce((sum, o) => sum + o.totalQuantity, 0);

                // 2 oldest pending/active orders of this item that can be fully invoiced with the available physical stock of their specific coordinates/attributes
                const invoiceableOrders = db.orders
                  .filter(
                    (o) =>
                      o.isActive &&
                      o.status !== "FATURADO" &&
                      o.itemId === selectedGroupItem.itemId,
                  )
                  .filter((o) => {
                    const entry = selectedGroupItem.entries.find(
                      (e) =>
                        (e.color || "") === (o.color || "") &&
                        (e.size || "") === (o.size || "") &&
                        (e.variation || "") === (o.variation || ""),
                    );
                    return entry && entry.quantity >= o.totalQuantity;
                  })
                  .sort((a, b) => {
                    const dateA =
                      new Date(a.deliveryDate).getTime() || a.createdAt;
                    const dateB =
                      new Date(b.deliveryDate).getTime() || b.createdAt;
                    return dateA !== dateB
                      ? dateA - dateB
                      : a.createdAt - b.createdAt;
                  })
                  .slice(0, 2);

                return (
                  <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-250">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
                      <div className="bg-emerald-800 text-white p-5 flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] bg-emerald-900 border border-emerald-700 font-extrabold tracking-widest text-emerald-100 px-2 py-0.5 rounded w-max uppercase">
                            Detalhamento Completo do Produto
                          </span>
                          <h3 className="font-extrabold text-xl leading-snug mt-1">
                            {item?.name || "Produto Desconhecido"}
                          </h3>
                          <span className="text-xs text-emerald-100/90 font-mono mt-0.5">
                            Código Interno:{" "}
                            <span className="font-bold underline">
                              {item?.code || "-"}
                            </span>{" "}
                            | Etapa:{" "}
                            <span className="font-bold">
                              {selectedGroupItem.stage === "INTERMEDIARIO"
                                ? "Intermediário"
                                : "Acabado"}
                            </span>
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedGroupItem(null)}
                          className="bg-emerald-900/60 hover:bg-emerald-900 text-white p-2 rounded-full transition shrink-0 shadow-sm"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Summary Stats Grid */}
                      <div className="bg-slate-50 border-b border-gray-100 p-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/80">
                          <span className="text-gray-400 font-semibold block text-[10px] uppercase">
                            Geral em Estoque
                          </span>
                          <span className="text-xl font-extrabold text-slate-800">
                            {grandTotal}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/80">
                          <span className="text-gray-400 font-semibold block text-[10px] uppercase">
                            Em Pedidos (Pendente)
                          </span>
                          <span className="text-xl font-extrabold text-blue-600">
                            {totalPendingInOrders}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/80">
                          <span className="text-gray-400 font-semibold block text-[10px] uppercase">
                            Disponível
                          </span>
                          <span className="text-xl font-extrabold text-emerald-600">
                            {grandTotal}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                        {/* 1. BREAKDOWN OF STOCKS BY ATTRIBUTES */}
                        <div>
                          <h4 className="font-extrabold text-xs text-indigo-955 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-indigo-50/50 pb-1.5">
                            <span className="w-1.5 h-3 bg-indigo-600 rounded-xs"></span>
                            Relação de Estoque Físico por Atribuição
                          </h4>
                          <div className="flex flex-col gap-2.5">
                            {breakdownData.map((d, index) => (
                              <div
                                key={index}
                                className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                              >
                                <div className="flex-1">
                                  <span className="font-mono font-bold text-slate-700 text-xs block bg-white px-2 py-1 rounded border border-slate-200/60 w-max mb-1">
                                    🎨 {d.attributes}
                                  </span>
                                  <div className="flex gap-4 text-[11px] text-gray-500 font-medium">
                                    <span>
                                      Quantidade Física:{" "}
                                      <strong className="text-slate-800 font-bold">
                                        {d.totalQty} unid.
                                      </strong>
                                      {d.entry.declaredPackages ? ` (${d.entry.declaredPackages} ${d.entry.measurementUnit?.toLowerCase()})` : ""}
                                    </span>
                                  </div>
                                </div>

                                {/* Edit and history actions for this variation */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      setSelectedStockHistory(d.entry);
                                    }}
                                    className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-2.5 py-1.5 rounded-lg transition shadow-xs"
                                    title="Ver histórico desta variação"
                                  >
                                    <History size={13} />
                                    Histórico
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleEdit(d.entry);
                                      setSelectedGroupItem(null);
                                    }}
                                    className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 px-2.5 py-1.5 rounded-lg transition shadow-xs"
                                    title="Ajustar estoque para esta variação"
                                  >
                                    <Pencil size={13} />
                                    Ajustar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 2. INVOICEABLE OLD ORDERS WITH CURRENT STOCK */}
                        <div>
                          <h4 className="font-extrabold text-xs text-indigo-955 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-indigo-50/50 pb-1.5">
                            <span className="w-1.5 h-3 bg-blue-600 rounded-xs"></span>
                            Faturamento Sugerido (2 Pedidos Mais Antigos
                            Atendíveis)
                          </h4>
                          <div className="flex flex-col gap-2">
                            {invoiceableOrders.length === 0 ? (
                              <div className="text-center py-5 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                                Nenhum pedido pendente com estoque suficiente
                                pode ser faturado integralmente no momento.
                              </div>
                            ) : (
                              invoiceableOrders.map((o, idx) => {
                                const attributes = `${o.color || "-"} | ${o.size || "-"} | ${o.variation || "-"}`;
                                return (
                                  <div
                                    key={idx}
                                    className="p-3 border border-indigo-150 bg-indigo-50/30 rounded-xl flex items-center justify-between text-xs gap-3 shadow-xs"
                                  >
                                    <div className="flex flex-col gap-1 min-w-0">
                                      <span className="font-sans font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                        <span>{o.customerName}</span>
                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/50 px-1.5 py-0.5 rounded">
                                          Pedido {o.orderCode}
                                        </span>
                                      </span>
                                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                        <span className="font-mono text-[10px] bg-gray-150 px-1 py-0.5 rounded text-gray-700">
                                          [{attributes}]
                                        </span>
                                        <span>📅 Prazo: {o.deliveryDate}</span>
                                      </div>
                                    </div>
                                    <span className="text-right shrink-0">
                                      <span className="text-sm font-extrabold text-indigo-700 font-mono block">
                                        {o.totalQuantity}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-bold uppercase">
                                        unidades
                                      </span>
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* 3. PENDING ORDERS OVERVIEW */}
                        <div>
                          <h4 className="font-extrabold text-xs text-indigo-955 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-indigo-50/50 pb-1.5">
                            <span className="w-1.5 h-3 bg-emerald-600 rounded-xs"></span>
                            Todos os Pedidos Pendentes deste Produto
                          </h4>
                          <div className="flex flex-col gap-2">
                            {db.orders.filter(
                              (o) =>
                                o.isActive &&
                                o.status !== "FATURADO" &&
                                o.itemId === selectedGroupItem.itemId,
                            ).length === 0 ? (
                              <div className="text-center py-5 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                                Nenhum outro pedido pendente para este produto.
                              </div>
                            ) : (
                              db.orders
                                .filter(
                                  (o) =>
                                    o.isActive &&
                                    o.status !== "FATURADO" &&
                                    o.itemId === selectedGroupItem.itemId,
                                )
                                .sort((a, b) => {
                                  const dateA =
                                    new Date(a.deliveryDate).getTime() ||
                                    a.createdAt;
                                  const dateB =
                                    new Date(b.deliveryDate).getTime() ||
                                    b.createdAt;
                                  return dateA - dateB;
                                })
                                .map((o, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 border border-slate-100 bg-white rounded-xl flex items-center justify-between text-xs gap-3 shadow-xs"
                                  >
                                    <div className="flex flex-col gap-1 min-w-0">
                                      <span className="font-sans font-bold text-slate-700 flex items-center gap-2 flex-wrap">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                        <span>{o.customerName}</span>
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                          Pedido {o.orderCode}
                                        </span>
                                      </span>
                                      <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                                        <span className="font-mono text-[10px] bg-slate-50 px-1 py-0.5 rounded">
                                          [{o.color || "-"} | {o.size || "-"} |{" "}
                                          {o.variation || "-"}]
                                        </span>
                                        <span>📅 Prazo: {o.deliveryDate}</span>
                                      </div>
                                    </div>
                                    <span className="text-right shrink-0">
                                      <span className="text-sm font-extrabold text-slate-700 font-mono block">
                                        {o.totalQuantity}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-bold uppercase">
                                        unidades
                                      </span>
                                    </span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 px-5 py-4 border-t flex justify-between items-center">
                        <span className="text-[11px] text-gray-400 font-semibold">
                          • Clique em Ajustar acima para modificar esta variação
                          de estoque
                        </span>
                        <button
                          onClick={() => setSelectedGroupItem(null)}
                          className="px-5 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition text-xs shadow-sm cursor-pointer"
                        >
                          Fechar Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </>
        )}

        {activeTab === "EPIS" && (
          <div className="flex flex-col gap-6 mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cadastrar Novo EPI */}
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <div
                  className="flex justify-between items-center mb-4 border-b pb-2 cursor-pointer group"
                  onClick={() => setIsEpiFormVisible(!isEpiFormVisible)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-emerald-800 font-sans text-lg group-hover:text-emerald-600 transition-colors">
                      Cadastrar Novo EPI
                    </h3>
                    {isEpiFormVisible ? (
                      <ChevronUp size={18} className="text-emerald-700" />
                    ) : (
                      <ChevronDown size={18} className="text-emerald-700" />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEpiExcelModalOpen(true);
                    }}
                    className="bg-[#107c41] hover:bg-[#185c37] text-white text-xs font-bold py-1 px-3 rounded shadow transition flex items-center gap-1 cursor-pointer"
                  >
                    Importar do Excel
                  </button>
                </div>

                {isEpiFormVisible && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-0.5">
                          Código do EPI
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: EPI-01"
                          value={newEpiCode}
                          onChange={(e) => setNewEpiCode(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-0.5">
                          Nome do EPI
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Luva de Raspa"
                          value={newEpiName}
                          onChange={(e) => setNewEpiName(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-0.5">
                          Estoque Inicial
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={newEpiQty}
                          onChange={(e) =>
                            setNewEpiQty(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-0.5">
                          Preço Unit. (R$ - opcional)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newEpiPrice ?? ""}
                          onChange={(e) => {
                            const val =
                              e.target.value === ""
                                ? ""
                                : parseFloat(e.target.value);
                            setNewEpiPrice(val);
                            if (val !== "" && !isNaN(val as number)) {
                              setNewEpiPoints(
                                Number(((val as number) / 500).toFixed(5)),
                              );
                            } else {
                              setNewEpiPoints("");
                            }
                          }}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-0.5">
                          Pontuação (pts - opcional)
                        </label>
                        <input
                          type="number"
                          step="0.00001"
                          placeholder="0"
                          value={newEpiPoints ?? ""}
                          onChange={(e) =>
                            setNewEpiPoints(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            )
                          }
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          min="0"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddEpi}
                      className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition text-sm cursor-pointer"
                    >
                      Cadastrar EPI
                    </button>
                  </div>
                )}
              </div>

              {/* Distribuição de EPIs */}
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <div
                  className="flex justify-between items-center mb-4 border-b pb-2 cursor-pointer group"
                  onClick={() => setIsEpiDistVisible(!isEpiDistVisible)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-emerald-800 mb-0 font-sans text-lg group-hover:text-emerald-600 transition-colors">
                      Distribuir EPI para Colaborador
                    </h3>
                    {isEpiDistVisible ? (
                      <ChevronUp size={18} className="text-emerald-700" />
                    ) : (
                      <ChevronDown size={18} className="text-emerald-700" />
                    )}
                  </div>
                </div>

                {isEpiDistVisible && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-4">
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          Colaborador
                        </label>
                        <input
                          type="text"
                          value={epiDistEmployeeName}
                          onChange={(e) =>
                            setEpiDistEmployeeName(e.target.value)
                          }
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Digite o nome do colaborador..."
                          list="epi-employee-list"
                        />
                        <datalist id="epi-employee-list">
                          {db.employees.map((emp) => (
                            <option key={emp.id} value={emp.name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          EPI (Produto)
                        </label>
                        <input
                          type="text"
                          value={epiDistEpiSearch}
                          onChange={(e) => setEpiDistEpiSearch(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Código ou nome do EPI..."
                          list="epi-item-list"
                        />
                        <datalist id="epi-item-list">
                          {db.items
                            .filter((i) => i.type === "EPI")
                            .map((epi) => (
                              <option
                                key={epi.id}
                                value={`${epi.code} - ${epi.name}`}
                              />
                            ))}
                        </datalist>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50"
                          min="1"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        let matchedEmployeeId = "";
                        if (epiDistEmployeeName) {
                          const mEmp = db.employees.find(
                            (e) =>
                              e.name.toLowerCase() ===
                              epiDistEmployeeName.toLowerCase(),
                          );
                          if (mEmp) matchedEmployeeId = mEmp.id;
                        }

                        let matchedItemId: number | null = null;
                        if (epiDistEpiSearch) {
                          const searchStrLower = epiDistEpiSearch.toLowerCase();
                          const mItem = db.items.find(
                            (i) =>
                              i.type === "EPI" &&
                              `${i.code} - ${i.name}`.toLowerCase() ===
                                searchStrLower,
                          );
                          if (mItem) matchedItemId = mItem.id;
                        }

                        if (matchedEmployeeId && matchedItemId && quantity) {
                          const selectedEpi = db.items.find(
                            (i) => i.id === matchedItemId,
                          );
                          if (!selectedEpi) return;

                          // Calculate current stock to see if we have enough
                          const stockEntry = db.stocks.find(
                            (s) => s.itemId === matchedItemId,
                          );
                          const existingQty = stockEntry
                            ? stockEntry.quantity
                            : 0;

                          if (existingQty < Number(quantity)) {
                            alert(
                              `Atenção: Saldo de estoque insuficiente (${existingQty}). Reduza a quantidade ou ajuste o estoque primeiro.`,
                            );
                            return;
                          }

                          db.addEpiDistribution({
                            employeeId: matchedEmployeeId,
                            itemId: matchedItemId,
                            quantity: Number(quantity),
                            date: Date.now(),
                          });

                          const newStockId = stockEntry
                            ? stockEntry.id
                            : `${matchedItemId}|OUTROS|OUTROS|OUTROS|ACABADO`;

                          db.updateStocks([
                            {
                              id: newStockId,
                              itemId: matchedItemId,
                              color: stockEntry ? stockEntry.color : "OUTROS",
                              size: stockEntry ? stockEntry.size : "OUTROS",
                              variation: stockEntry
                                ? stockEntry.variation
                                : "OUTROS",
                              stage: stockEntry ? stockEntry.stage : "ACABADO",
                              quantity: existingQty - Number(quantity),
                            },
                          ]);

                          db.addStockMovement({
                            itemId: matchedItemId,
                            color: "OUTROS",
                            size: "OUTROS",
                            variation: "OUTROS",
                            quantity: Number(quantity),
                            type: "SAIDA",
                            description: `Distribuição de EPI para colaborador ID: ${matchedEmployeeId}`,
                          });

                          alert("EPI Distribuído com sucesso!");
                          setEpiDistEmployeeName("");
                          setEpiDistEpiSearch("");
                          setQuantity("");
                        } else {
                          alert(
                            "Preencha colaborador, EPI e quantidade corretamente selecionando um item da lista.",
                          );
                        }
                      }}
                      className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition text-sm cursor-pointer"
                    >
                      Registrar Entrega
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Estoque Atual de EPIs */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-2">
              <div className="bg-emerald-50/50 p-4 border-b flex justify-between items-center text-sm font-bold text-emerald-800">
                <span>
                  Estoque Atual de EPIs (Edição rápida de saldo ao mudar o
                  valor)
                </span>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {db.items.filter((i) => i.type === "EPI").length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    Nenhum EPI cadastrado.
                  </div>
                ) : (
                  db.items
                    .filter((i) => i.type === "EPI")
                    .map((epi) => {
                      const stockEntries = isImperio ? (epiStocksByItem.get(epi.id) || []) : db.stocks.filter(
                        (s) => s.itemId === epi.id,
                      );
                      const totalStock = stockEntries.reduce(
                        (sum, s) => sum + s.quantity,
                        0,
                      );
                      return (
                        <div
                          key={epi.id}
                          className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white hover:bg-gray-50 transition"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-850">
                              {epi.code} - {epi.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-semibold font-sans">
                              <span>EPI cadastrado</span>
                              {epi.basePrice !== undefined && (
                                <span className="bg-gray-100 px-1 rounded">
                                  R$ {epi.basePrice.toFixed(2)}
                                </span>
                              )}
                              {epi.productionPoints !== undefined && (
                                <span className="bg-gray-100 px-1 rounded">
                                  {Number(epi.productionPoints).toFixed(5)} pts
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg p-1 bg-gray-50 shadow-xs">
                              <span className="text-[10px] font-bold text-gray-400 px-1">
                                Saldo:
                              </span>
                              <input
                                type="number"
                                defaultValue={totalStock}
                                onBlur={async (e) => {
                                  const newQty = Number(e.target.value);
                                  if (
                                    newQty === totalStock ||
                                    isNaN(newQty) ||
                                    newQty < 0
                                  )
                                    return;

                                  const stockEntry = stockEntries[0];
                                  const oldQty = stockEntry
                                    ? stockEntry.quantity
                                    : 0;
                                  const diff = newQty - oldQty;
                                  const stockId = stockEntry
                                    ? stockEntry.id
                                    : `${epi.id}|OUTROS|OUTROS|OUTROS|ACABADO`;

                                  await db.updateStocks([
                                    {
                                      id: stockId,
                                      itemId: epi.id,
                                      color: stockEntry
                                        ? stockEntry.color
                                        : "OUTROS",
                                      size: stockEntry
                                        ? stockEntry.size
                                        : "OUTROS",
                                      variation: stockEntry
                                        ? stockEntry.variation
                                        : "OUTROS",
                                      stage: stockEntry
                                        ? stockEntry.stage
                                        : "ACABADO",
                                      quantity: newQty,
                                    },
                                  ]);

                                  if (diff !== 0) {
                                    db.addStockMovement({
                                      itemId: epi.id,
                                      color: "OUTROS",
                                      size: "OUTROS",
                                      variation: "OUTROS",
                                      quantity: Math.abs(diff),
                                      type: diff > 0 ? "ENTRADA" : "SAIDA",
                                      description: `Ajuste manual de saldo de EPI (Anterior: ${oldQty} -> Novo: ${newQty})`,
                                    });
                                  }
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="w-16 text-center text-sm font-bold bg-white border border-gray-300 rounded focus:border-emerald-500 focus:outline-none p-0.5"
                              />
                              <span className="text-xs font-semibold text-gray-500 pr-1">
                                un
                              </span>
                            </div>

                            <div className="flex flex-col items-end shrink-0 pl-2">
                              <span
                                className={`text-lg font-black ${totalStock > 0 ? "text-emerald-600" : "text-amber-500"}`}
                              >
                                {totalStock} un
                              </span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                Em Estoque
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-2">
              <div className="bg-emerald-50/50 p-4 border-b text-sm font-bold text-emerald-800 flex justify-between items-center">
                <span>Histórico de Entregas de EPIs</span>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {db.epiDistributions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    Nenhum EPI distribuído ainda.
                  </div>
                ) : (
                  epiHistory.slice(0, isImperio ? epiHistoryLimit : undefined)
                    .map((dist) => {
                      const emp = db.employees.find(
                        (e) =>
                          String(e.id).trim() === String(dist.employeeId).trim() ||
                          e.name.toLowerCase() === String(dist.employeeId).trim().toLowerCase()
                      );
                      const epi = db.items.find((i) => i.id === dist.itemId);
                      return (
                        <div
                          key={dist.id}
                          className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 transition"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">
                              {emp ? emp.name : "Desconhecido"}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              Entregou:{" "}
                              {epi
                                ? `${epi.code} - ${epi.name}`
                                : "Item Excluído"}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-emerald-600">
                              {dist.quantity} un
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(dist.date).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
              {isImperio && epiHistoryLimit < epiHistory.length && (
                <button type="button" onClick={() => setEpiHistoryLimit((limit) => limit + 50)} className="w-full p-3 text-sm font-bold text-emerald-700">
                  Carregar mais entregas ({Math.min(epiHistoryLimit, epiHistory.length)} de {epiHistory.length})
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "UNIFORMES" && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200" id="uniformes-panel-container">
            {/* Seção 1: Formulário de Cadastro de Uniforme */}
            <div className="bg-white p-5 rounded-xl shadow-sm border" id="registro-uniforme-block">
              <div
                className="flex justify-between items-center mb-4 border-b pb-2 cursor-pointer group"
                onClick={() => setIsUniformFormVisible(!isUniformFormVisible)}
                id="uniformes-form-header-toggle"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-emerald-800 mb-0 font-sans text-lg group-hover:text-emerald-600 transition-colors">
                    Ficha de Cadastro de Uniformes
                  </h3>
                  {isUniformFormVisible ? (
                    <ChevronUp size={18} className="text-emerald-700" id="chevron-up-form-epi" />
                  ) : (
                    <ChevronDown size={18} className="text-emerald-700" id="chevron-down-form-epi" />
                  )}
                </div>
              </div>

              {isUniformFormVisible && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end mb-4 animate-in fade-in slide-in-from-top-1 duration-150" id="form-uniforme-fields">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Nome / Descrição do Uniforme
                    </label>
                    <input
                      type="text"
                      value={uniformFormName}
                      onChange={(e) => setUniformFormName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                      placeholder="Ex: Camiseta Polo PCP Verde"
                      id="input-uniform-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Tamanho
                    </label>
                    <input
                      type="text"
                      list="uniform-sizes-list"
                      value={uniformFormSize}
                      onChange={(e) => setUniformFormSize(e.target.value.toUpperCase())}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                      placeholder="Ex: M, GG, 42..."
                      id="input-uniform-size"
                    />
                    <datalist id="uniform-sizes-list">
                      <option value="PP" />
                      <option value="P" />
                      <option value="M" />
                      <option value="G" />
                      <option value="GG" />
                      <option value="EXGG" />
                      <option value="EXGG2" />
                      <option value="G1" />
                      <option value="Único" />
                      <option value="36" />
                      <option value="38" />
                      <option value="40" />
                      <option value="42" />
                      <option value="44" />
                      <option value="46" />
                      <option value="48" />
                      <option value="50" />
                      <option value="52" />
                      <option value="54" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Estoque Inicial
                    </label>
                    <input
                      type="number"
                      value={uniformFormStock}
                      onChange={(e) => setUniformFormStock(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                      placeholder="Ex: 50"
                      id="input-uniform-stock-init"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Alerta Mínimo
                    </label>
                    <input
                      type="number"
                      value={uniformFormMinStock}
                      onChange={(e) => setUniformFormMinStock(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                      placeholder="Ex: 5"
                      id="input-uniform-min-stock"
                    />
                  </div>
                  <div className="sm:col-span-4 flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        if (!uniformFormName.trim() || !uniformFormSize) {
                          alert("Preencha o nome e o tamanho do uniforme.");
                          return;
                        }
                        db.addUniform({
                          name: uniformFormName,
                          size: uniformFormSize,
                          stock: Number(uniformFormStock) || 0,
                          minStock: Number(uniformFormMinStock) || 0,
                        });
                        setUniformFormName("");
                        setUniformFormSize("");
                        setUniformFormStock("");
                        setUniformFormMinStock("");
                        alert("Uniforme cadastrado com sucesso!");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm text-sm cursor-pointer"
                      id="btn-save-new-uniform"
                    >
                      Salvar Uniforme
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Seção 2: Distribuição de Uniformes */}
            <div className="bg-white p-5 rounded-xl shadow-sm border" id="bloco-distribuir-uniforme">
              <div
                className="flex justify-between items-center mb-4 border-b pb-2 cursor-pointer group"
                onClick={() => setIsUniformDistVisible(!isUniformDistVisible)}
                id="uniform-dist-header-toggle"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-emerald-800 mb-0 font-sans text-lg group-hover:text-emerald-600 transition-colors">
                    Distribuir Uniforme para Colaborador
                  </h3>
                  {isUniformDistVisible ? (
                    <ChevronUp size={18} className="text-emerald-700" id="chevron-up-dist" />
                  ) : (
                    <ChevronDown size={18} className="text-emerald-700" id="chevron-down-dist" />
                  )}
                </div>
              </div>

              {isUniformDistVisible && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-4 animate-in fade-in slide-in-from-top-1 duration-150" id="dist-fields">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Colaborador
                    </label>
                    <input
                      type="text"
                      value={uniformDistEmployeeName}
                      onChange={(e) => setUniformDistEmployeeName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                      placeholder="Digite o nome do colaborador..."
                      list="uniform-employee-list"
                      id="input-dist-employee-name"
                    />
                    <datalist id="uniform-employee-list">
                      {db.employees.map((emp) => (
                        <option key={emp.id} value={emp.name} />
                      ))}
                      {Object.keys(EMPLOYEE_SIZES).map(name => (
                        <option key={`hardcoded-${name}`} value={name} />
                      ))}
                    </datalist>
                    {uniformDistEmployeeName && EMPLOYEE_SIZES[uniformDistEmployeeName] && (
                      <div className="mt-2 text-[10px] sm:text-xs bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded-lg flex gap-3 text-indigo-800 font-medium">
                        {EMPLOYEE_SIZES[uniformDistEmployeeName].shirt && <span>👕 Camisa: <b>{EMPLOYEE_SIZES[uniformDistEmployeeName].shirt}</b></span>}
                        {EMPLOYEE_SIZES[uniformDistEmployeeName].pants && <span>👖 Calça: <b>{EMPLOYEE_SIZES[uniformDistEmployeeName].pants}</b></span>}
                        {EMPLOYEE_SIZES[uniformDistEmployeeName].boots && <span>👞 Botina: <b>{EMPLOYEE_SIZES[uniformDistEmployeeName].boots}</b></span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Uniforme a Entregar
                    </label>
                    <select
                      value={uniformDistUniformId}
                      onChange={(e) => setUniformDistUniformId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700 font-mono text-xs"
                      id="select-dist-uniform"
                    >
                      <option value="">Selecione um uniforme do estoque...</option>
                      {db.uniforms
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name) || a.size.localeCompare(b.size))
                        .map((uni) => (
                        <option key={uni.id} value={uni.id}>
                          {uni.name} (Tam: {uni.size}) - Saldo: {uni.stock}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Quantidade Entregue
                    </label>
                    <input
                      type="number"
                      value={uniformDistQty}
                      onChange={(e) => setUniformDistQty(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                      placeholder="Ex: 2"
                      id="input-dist-qty"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Observações / Notas
                    </label>
                    <input
                      type="text"
                      value={uniformDistNotes}
                      onChange={(e) => setUniformDistNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700 animate-fade-in"
                      placeholder="Ex: Peças para reposição de semestre"
                      id="input-dist-notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={async () => {
                        if (!uniformDistEmployeeName.trim() || !uniformDistUniformId || !uniformDistQty) {
                          alert("Preencha o colaborador, uniforme e quantidade correspondente.");
                          return;
                        }

                        let matchEmp = db.employees.find(
                          (e) => e.name.toLowerCase() === uniformDistEmployeeName.trim().toLowerCase()
                        );
                        if (!matchEmp) {
                          if (confirm(`Colaborador '${uniformDistEmployeeName}' não cadastrado. Deseja cadastrá-lo automaticamente agora?`)) {
                             await db.addEmployee({
                               name: uniformDistEmployeeName.trim(),
                               sectorId: 0,
                               isActive: true,
                             });
                             // Mock the matchEmp so the rest of the logic works locally without waiting for snapshot reload
                             matchEmp = { id: Date.now().toString(), name: uniformDistEmployeeName.trim(), sectorId: 0, isActive: true };
                          } else {
                             return;
                          }
                        }

                        const matchUni = db.uniforms.find((u) => u.id === uniformDistUniformId);
                        if (!matchUni) {
                          alert("Uniforme selecionado inválido!");
                          return;
                        }

                        const reqQty = Number(uniformDistQty);
                        if (matchUni.stock < reqQty) {
                          alert(`Saldo de estoque insuficiente para entrega (${matchUni.stock} disponíveis).`);
                          return;
                        }

                        await db.addUniformDistribution({
                          employeeId: matchEmp.id,
                          uniformId: matchUni.id,
                          quantity: reqQty,
                          date: Date.now(),
                          notes: uniformDistNotes || "",
                        });

                        await db.updateUniform(matchUni.id, {
                          stock: matchUni.stock - reqQty,
                        });

                        setUniformDistEmployeeName("");
                        setUniformDistUniformId("");
                        setUniformDistQty("");
                        setUniformDistNotes("");
                        alert("Entrega de uniforme registrada com sucesso!");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-sm text-sm cursor-pointer"
                      id="btn-confirm-uniform-dist"
                    >
                      Registrar Entrega
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Grid 2 Columnas de Estoque e Últimos Registros */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="uniforms-activity-grid">
              {/* Painel de Estoque Atual */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden" id="stock-count-box">
                <div className="bg-emerald-50/50 p-4 border-b flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-800">
                    Estoque de Uniformes
                  </span>
                  <span className="bg-emerald-100 text-emerald-700 py-0.5 px-2.5 rounded-full text-xs font-bold">
                    {db.uniforms.length} itens cadastrados
                  </span>
                </div>
                <div className="divide-y overflow-y-auto max-h-[50vh]">
                  {db.uniforms.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      Nenhum uniforme cadastrado no estoque.
                    </div>
                  ) : (
                    db.uniforms
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name) || a.size.localeCompare(b.size))
                      .map((uni) => {
                      const isLowStock = uni.stock <= uni.minStock;
                      return (
                        <div key={uni.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/55 transition gap-4" id={`stock-row-${uni.id}`}>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800 text-base">{uni.name}</span>
                            <div className="flex gap-2 items-center mt-1 text-xs text-gray-500 font-semibold">
                              <span>Tamanho: <strong className="text-slate-700">{uni.size}</strong></span>
                              <span>•</span>
                              <span>Alerta em: <strong className="text-slate-700">{uni.minStock} pçs</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] font-bold text-gray-400">ESTOQUE</span>
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className={`text-sm font-bold ${isLowStock ? "text-red-500 animate-pulse" : "text-emerald-700"}`}>
                                  {uni.stock} unid
                                </span>
                                {isLowStock && (
                                  <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded font-sans border border-red-200">
                                    COMPRAR
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 min-w-[120px] justify-end">
                              {editingUniformId === uni.id ? (
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="number"
                                    value={editingUniformStock}
                                    onChange={(e) => setEditingUniformStock(e.target.value)}
                                    className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-center font-bold"
                                  />
                                  <button
                                    onClick={async () => {
                                      const amt = Number(editingUniformStock);
                                      if (!isNaN(amt) && amt >= 0) {
                                        await db.updateUniform(uni.id, { stock: amt });
                                        setEditingUniformId(null);
                                      } else {
                                        alert("Insira um número inteiro válido.");
                                      }
                                    }}
                                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold p-1 rounded-lg transition text-xs cursor-pointer border border-emerald-200"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingUniformId(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-1 rounded-lg transition text-xs cursor-pointer border border-slate-200"
                                  >
                                    Canc.
                                  </button>
                                </div>
                              ) : removingUniformId === uni.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-red-600 mr-1">Tem certeza?</span>
                                  <button
                                    onClick={async () => {
                                      await db.deleteUniform(uni.id);
                                      setRemovingUniformId(null);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold p-1 rounded-lg transition text-xs cursor-pointer"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    onClick={() => setRemovingUniformId(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-1 rounded-lg transition text-xs cursor-pointer border border-slate-200"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingUniformStock(uni.stock.toString());
                                      setEditingUniformId(uni.id);
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1.5 rounded-lg transition text-xs cursor-pointer border border-slate-200"
                                    id={`btn-adjust-${uni.id}`}
                                  >
                                    Ajustar
                                  </button>
                                  <button
                                    onClick={() => setRemovingUniformId(uni.id)}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1.5 rounded-lg transition text-xs cursor-pointer border border-red-200"
                                    id={`btn-remove-${uni.id}`}
                                  >
                                    Remover
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Registro Histórico de Distribuição */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden" id="distributions-history-box">
                <div className="bg-emerald-50/50 p-4 border-b flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-800">
                    Histórico de Distribuições de Uniformes
                  </span>
                  <span className="bg-emerald-100 text-emerald-700 py-0.5 px-2.5 rounded-full text-xs font-bold">
                    {db.uniformDistributions.length} distribuições
                  </span>
                </div>
                <div className="divide-y overflow-y-auto max-h-[50vh]">
                  {db.uniformDistributions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      Nenhuma ficha de entrega no histórico.
                    </div>
                  ) : (
                    uniformHistory.slice(0, isImperio ? uniformHistoryLimit : undefined)
                      .map((dist) => {
                        const emp = db.employees.find(
                          (e) =>
                            String(e.id).trim() === String(dist.employeeId).trim() ||
                            e.name.toLowerCase() === String(dist.employeeId).trim().toLowerCase()
                        );
                        const uni = db.uniforms.find((u) => u.id === dist.uniformId);
                        return (
                          <div key={dist.id} className="p-4 hover:bg-gray-50/5 transition flex justify-between items-start gap-4" id={`dist-row-${dist.id}`}>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm">
                                {emp ? emp.name : "Colaborador não cadastrado"}
                              </span>
                              <p className="text-xs text-gray-600 mt-0.5">
                                Recebeu: <strong className="text-gray-800">{dist.quantity}x</strong> {uni ? `${uni.name} (Tamanho ${uni.size})` : "Uniforme deletado"}
                              </p>
                              {dist.notes && (
                                <span className="bg-slate-50 text-slate-500 text-[10px] font-medium p-1 rounded mt-1 shadow-2xs border border-gray-200">
                                  Nota: {dist.notes}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400 font-medium mt-1">
                                {new Date(dist.date).toLocaleString()}
                              </span>
                            </div>
                            {stornoUniformDistId === dist.id ? (
                                <div className="flex flex-col gap-1 items-end shrink-0">
                                  <span className="text-[10px] font-bold text-red-600">Confirma o estorno?</span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={async () => {
                                        if (uni) {
                                          await db.updateUniform(uni.id, { stock: uni.stock + dist.quantity });
                                        }
                                        await db.deleteUniformDistribution(dist.id);
                                        setStornoUniformDistId(null);
                                      }}
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded transition cursor-pointer"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      onClick={() => setStornoUniformDistId(null)}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded transition border border-slate-200 cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                            ) : (
                                <button
                                  onClick={() => setStornoUniformDistId(dist.id)}
                                  className="text-red-600 font-bold hover:text-red-800 bg-red-50 hover:bg-red-100 text-xs px-2.5 py-1.5 rounded transition shrink-0 border border-red-100 cursor-pointer"
                                  id={`btn-storno-${dist.id}`}
                                >
                                  Estorno
                                </button>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
                {isImperio && uniformHistoryLimit < uniformHistory.length && (
                  <button type="button" onClick={() => setUniformHistoryLimit((limit) => limit + 50)} className="w-full p-3 text-sm font-bold text-emerald-700">
                    Carregar mais entregas ({Math.min(uniformHistoryLimit, uniformHistory.length)} de {uniformHistory.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "RELATORIOS" && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-bold text-emerald-800 font-sans text-lg border-b border-emerald-50 pb-2">
              Relatório de Entrega de EPI e Uniforme (Comprovante / Recibo)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data Inicial</label>
                <input type="date" value={relatorioStartDate} onChange={e => setRelatorioStartDate(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 outline-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data Final</label>
                <input type="date" value={relatorioEndDate} onChange={e => setRelatorioEndDate(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 outline-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Colaborador</label>
                <input type="text" list="emp-list" value={relatorioEmployeeName} onChange={e => setRelatorioEmployeeName(e.target.value)} placeholder="Selecione o colaborador (ou deixe em branco para todos)" className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 outline-emerald-500" />
                <p className="text-[10px] text-slate-500 mt-1">
                  Se vazio, irá gerar as folhas de todos com distribuição nas datas.
                </p>
                <datalist id="emp-list">
                  {db.employees.map(e => <option key={e.id} value={e.name} />)}
                  {Object.keys(EMPLOYEE_SIZES).map(name => <option key={`rel-${name}`} value={name} />)}
                </datalist>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button 
                onClick={handleDirectPrintRelatorio} 
                disabled={isDirectPrintingRelatorio || isGeneratingRelatorio}
                id="btn-imprimir-direto-epi"
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {isDirectPrintingRelatorio ? "Preparando Impressão..." : "Imprimir Diretamente"}
              </button>

              <button 
                onClick={handleGeneratePdf} 
                disabled={isGeneratingRelatorio || isDirectPrintingRelatorio}
                id="btn-gerar-pdf-epi"
                className="bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isGeneratingRelatorio ? "Gerando PDF..." : "Baixar PDF (Meia Folha)"}
              </button>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Formato Oficial Otimizado:</span> O comprovante é gerado em padrão econômico de 2 recibos individuais por folha A4 com indicação tracejada de corte (meia folha), termos de responsabilidade de uso e campo para assinatura do colaborador.
              </div>
            </div>
          </div>
        )}
      </ScrollContainer>

      {/* Hidden Relatório Print Target */}
      {(isGeneratingRelatorio || isDirectPrintingRelatorio) && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none', opacity: 1, zIndex: -9999 }}>
          <img src={logoUrl} crossOrigin="anonymous" className="fixed top-0 left-0 w-[1px] h-[1px] opacity-0 pointer-events-none" alt="preload" />
          <RelatorioEpiPrintSheet
            ref={relatorioPrintRef}
            startDate={relatorioStartDate}
            endDate={relatorioEndDate}
            reports={relatorioRecords}
            logoUrl={logoUrl}
            companyName={companyName}
          />
        </div>
      )}

      {/* EPI Excel Import Modal */}
      {isEpiExcelModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-emerald-800">
                  Importação de EPIs via Excel
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Importe novos equipamentos ou atualize o estoque copiando
                  grids diretamente de planilhas.
                </p>
              </div>
              <button
                onClick={() => setIsEpiExcelModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-100 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 text-xs text-gray-600 space-y-1.5 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-gray-150">
              <span className="font-bold text-emerald-800 block mb-0.5">
                Como usar:
              </span>
              <p>
                1. No Excel/Google Sheets, organize as colunas como:{" "}
                <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  Código
                </strong>
                ,{" "}
                <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  Nome
                </strong>
                ,{" "}
                <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  Preço (opcional)
                </strong>
                ,{" "}
                <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  Pontuação (opcional)
                </strong>
                ,{" "}
                <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  Estoque (opcional)
                </strong>
                .
              </p>
              <p>
                2. Selecione e copie (
                <kbd className="bg-white border rounded px-1 py-0.2 shadow-xs">
                  Ctrl+C
                </kbd>
                ) as linhas incluindo ou não o cabeçalho.
              </p>
              <p>
                3. Cole no campo abaixo (
                <kbd className="bg-white border rounded px-1 py-0.2 shadow-xs">
                  Ctrl+V
                </kbd>
                ) e clique em{" "}
                <strong className="text-emerald-700">
                  Confirmar Importação
                </strong>
                .
              </p>
            </div>

            <div className="flex-1 flex flex-col min-h-0 mb-4">
              <textarea
                value={epiExcelData}
                onChange={(e) => setEpiExcelData(e.target.value)}
                placeholder="Cole as colunas separadas por tabulação aqui..."
                className="w-full flex-1 border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-gray-50 focus:bg-white resize-none"
              />
            </div>

            {epiExcelImportResult && (
              <div
                className={`p-3 rounded-lg text-sm mb-4 font-bold border ${
                  epiExcelImportResult.includes("erro") ||
                  epiExcelImportResult.includes("Preencha")
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {epiExcelImportResult}
                {epiExcelImportResult === "Processando..." && (
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${epiExcelImportProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => {
                  setIsEpiExcelModalOpen(false);
                  setEpiExcelImportResult(null);
                }}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition text-xs shadow-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEpiImportExcel}
                disabled={
                  !epiExcelData.trim() ||
                  epiExcelImportResult === "Processando..."
                }
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition text-xs shadow-xs cursor-pointer"
              >
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenLayout>
  );
}
