import React, { useState, useMemo, useRef } from "react";
import { useDatabase } from "./useDatabase";
import { User, Order, ProductionLog, Item } from "./types";
import { 
  Printer, 
  Search, 
  Calendar, 
  Check, 
  Copy, 
  FileText, 
  Grid, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  Boxes,
  CheckCircle
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { ScrollContainer } from "./components/Layout";

interface EtiquetasTabProps {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}

// Inline deterministic high-resolution Barcode renderer
function LocalSVGBarcode({ data }: { data: string }) {
  const bars = React.useMemo(() => {
    // extract code or relevant text
    const cleanData = data.split("|")[0] || data.replace(/[^a-zA-Z0-9]/g, "");
    const values = cleanData.split("").map((c) => c.charCodeAt(0));
    // Start guards
    const result: number[] = [1, 1, 1];
    for (let i = 0; i < Math.min(values.length, 12); i++) {
      const v = values[i];
      result.push((v % 3) + 1);
      result.push(((v >> 1) % 2) + 1);
      result.push(((v >> 2) % 3) + 1);
      result.push(((v >> 3) % 2) + 1);
    }
    // End guards
    result.push(1, 1, 1);
    return result;
  }, [data]);

  return (
    <div className="flex flex-col items-center justify-center select-none bg-white p-1 rounded border border-slate-200 shrink-0" style={{ width: "90px" }}>
      <svg
        width="82"
        height="36"
        viewBox={`0 0 ${bars.length * 2} 40`}
        className="shrink-0"
      >
        <g fill="#000000">
          {bars.map((width, idx) => {
            if (idx % 2 === 0) {
              const xValue = bars.slice(0, idx).reduce((sum, w) => sum + w * 2, 0);
              return (
                <rect
                  key={idx}
                  x={xValue}
                  y="1"
                  width={width * 1.8}
                  height="38"
                />
              );
            }
            return null;
          })}
        </g>
      </svg>
      <span className="text-[9px] font-mono font-black text-black mt-1 uppercase max-w-[82px] truncate block text-center leading-none">
        {data.split("|")[0] || data.slice(0, 10)}
      </span>
    </div>
  );
}

export function EtiquetasTab({ db, currentUser }: EtiquetasTabProps) {
  // Filters state
  const [selectedSector, setSelectedSector] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);

  // Selection state
  const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);

  // Grouped logs selected list for the hidden PDF templates and preview
  const selectedLogs = useMemo(() => {
    return db.logs.filter((l) => selectedLogIds.includes(l.id));
  }, [db.logs, selectedLogIds]);

  // Preview and customization modal states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [previewFormat, setPreviewFormat] = useState<"thermal" | "a4">("thermal");
  const [previewLabels, setPreviewLabels] = useState<any[]>([]);

  // Modal and custom overlay states
  const [modalZPL, setModalZPL] = useState<string | null>(null);
  const [isGeneratingZPL, setIsGeneratingZPL] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Link Order Modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [logToLink, setLogToLink] = useState<any>(null);
  const [linkOrderSearch, setLinkOrderSearch] = useState<string>("");
  const [selectedOrderToLink, setSelectedOrderToLink] = useState<any>(null);
  const [linkQuantity, setLinkQuantity] = useState<number | "">("");

  const handleOpenLinkModal = (log: any) => {
    setLogToLink(log);
    setLinkOrderSearch("");
    setSelectedOrderToLink(null);
    setLinkQuantity("");
    setIsLinkModalOpen(true);
  };

  const handleLinkOrderClick = (order: any) => {
    setSelectedOrderToLink(order);
    const details = getLogDetails(logToLink);
    setLinkQuantity(details.quantity);
  };

  const confirmLinkOrder = () => {
    if (!logToLink || !selectedOrderToLink) return;
    const details = getLogDetails(logToLink);
    const qtyToLinkNum = Number(linkQuantity);
    const maxQty = details.quantity;
    
    if (qtyToLinkNum <= 0 || qtyToLinkNum > maxQty) return;

    if (qtyToLinkNum < maxQty) {
      // split the log
      const originalUpdated = { ...logToLink };
      if (originalUpdated.quantityPacked) originalUpdated.quantityPacked -= qtyToLinkNum;
      else if (originalUpdated.quantityProcessed) originalUpdated.quantityProcessed -= qtyToLinkNum;
      else if (originalUpdated.quantityPainted) originalUpdated.quantityPainted -= qtyToLinkNum;
      else if (originalUpdated.quantityCut) originalUpdated.quantityCut -= qtyToLinkNum;
      else originalUpdated.quantityProcessed = 0; // fallback

      const newLinkedLog = {
          ...logToLink,
          id: Date.now() + Math.random(),
          orderId: selectedOrderToLink.id,
          skipInventoryUpdate: true
      };
      if (newLinkedLog.quantityPacked) newLinkedLog.quantityPacked = qtyToLinkNum;
      else if (newLinkedLog.quantityProcessed) newLinkedLog.quantityProcessed = qtyToLinkNum;
      else if (newLinkedLog.quantityPainted) newLinkedLog.quantityPainted = qtyToLinkNum;
      else if (newLinkedLog.quantityCut) newLinkedLog.quantityCut = qtyToLinkNum;
      else newLinkedLog.quantityProcessed = qtyToLinkNum;

      if (logToLink.packagesConfig && logToLink.packagesConfig.length > 0) {
        let originalConfig = JSON.parse(JSON.stringify(logToLink.packagesConfig));
        let linkedConfig: {boxes: number, itemsPerBox: number}[] = [];
        let remainingLinked = qtyToLinkNum;
        let newOriginalConfig: {boxes: number, itemsPerBox: number}[] = [];

        for (const grp of originalConfig) {
            let leftBoxes = grp.boxes;
            
            while(remainingLinked >= grp.itemsPerBox && leftBoxes > 0) {
               remainingLinked -= grp.itemsPerBox;
               leftBoxes--;
               
               let existingGroupLink = linkedConfig.find((c: any) => c.itemsPerBox === grp.itemsPerBox);
               if (existingGroupLink) {
                 existingGroupLink.boxes++;
               } else {
                 linkedConfig.push({ boxes: 1, itemsPerBox: grp.itemsPerBox });
               }
            }
            
            if (leftBoxes > 0) {
               newOriginalConfig.push({ boxes: leftBoxes, itemsPerBox: grp.itemsPerBox });
            }
        }
        
        if (remainingLinked > 0) {
            for (let i = 0; i < newOriginalConfig.length; i++) {
                if (remainingLinked <= 0) break;
                
                const grp = newOriginalConfig[i];
                if (grp.boxes > 0) {
                    grp.boxes--;
                    if (grp.boxes === 0) {
                       newOriginalConfig.splice(i, 1);
                       i--;
                    }
                    
                    const takeQty = Math.min(remainingLinked, grp.itemsPerBox);
                    const leftQty = grp.itemsPerBox - takeQty;
                    
                    let existingGroupLink = linkedConfig.find((c: any) => c.itemsPerBox === takeQty);
                    if (existingGroupLink) {
                      existingGroupLink.boxes++;
                    } else {
                      linkedConfig.push({ boxes: 1, itemsPerBox: takeQty });
                    }
                    
                    if (leftQty > 0) {
                       let existingGroupOriginal = newOriginalConfig.find((c: any) => c.itemsPerBox === leftQty);
                       if (existingGroupOriginal) {
                          existingGroupOriginal.boxes++;
                       } else {
                          newOriginalConfig.push({ boxes: 1, itemsPerBox: leftQty });
                       }
                    }
                    
                    remainingLinked -= takeQty;
                }
            }
        }
        
        originalUpdated.packagesConfig = newOriginalConfig;
        newLinkedLog.packagesConfig = linkedConfig;
      }

      db.updateLog(originalUpdated);
      // Wait to ensure we add properly, but `updateLog` and `addLogs` might run sync
      db.addLogs([newLinkedLog as unknown as ProductionLog]);
    } else {
      // link directly
      db.updateLog({ ...logToLink, orderId: selectedOrderToLink.id });
    }

    setIsLinkModalOpen(false);
    setLogToLink(null);
    setSelectedOrderToLink(null);
  };

  // Hidden print refs
  const thermalPrintContainerRef = useRef<HTMLDivElement | null>(null);
  const a4PrintContainerRef = useRef<HTMLDivElement | null>(null);

  const systemSettings = db.systemSettings?.[0] || {};
  const logoUrl = systemSettings.companyLogoUrl || "/icon.png";
  const companyName = systemSettings.companyName || "IMPÉRIO JOMARCI - ACESSÓRIOS PARA MOVÉIS";

  const handleOpenPreviewModal = () => {
    const list: any[] = [];
    selectedLogs.forEach((log) => {
      const details = getLogDetails(log);

      if (log.packagesConfig && log.packagesConfig.length > 0) {
         let totalBoxesCounter = 0;
         log.packagesConfig.forEach(config => {
            totalBoxesCounter += config.boxes;
         });

         let currentBoxIdx = 1;
         log.packagesConfig.forEach(config => {
            for (let i = 0; i < config.boxes; i++) {
                list.push({
                  id: `label-${log.id}-${i}-${Date.now()}-${Math.random()}`,
                  originalLogId: log.id,
                  name: details.name,
                  code: details.code,
                  quantity: config.itemsPerBox,
                  color: details.color,
                  size: details.size,
                  variation: details.variation,
                  orderCode: details.orderCode,
                  customer: details.customer,
                  sectorLabel: details.sectorLabel,
                  imageUrl: details.imageUrl,
                  operatorId: log.operatorId,
                  timestamp: log.timestamp,
                  splitCount: 1,
                  packageType: "Caixa",
                  splitQuantityMode: "fixed",
                  boxIndexOverride: currentBoxIdx,
                  totalBoxesOverride: totalBoxesCounter
                });
                currentBoxIdx++;
            }
         });
      } else {
         list.push({
            id: `label-${log.id}-${Date.now()}-${Math.random()}`,
            originalLogId: log.id,
            name: details.name,
            code: details.code,
            quantity: details.quantity,
            color: details.color,
            size: details.size,
            variation: details.variation,
            orderCode: details.orderCode,
            customer: details.customer,
            sectorLabel: details.sectorLabel,
            imageUrl: details.imageUrl,
            operatorId: log.operatorId,
            timestamp: log.timestamp,
            splitCount: 1,
            packageType: "Caixa",
            splitQuantityMode: "divide",
         });
      }
    });
    setPreviewLabels(list);
    setIsPreviewModalOpen(true);
  };

  const updatePreviewLabel = (id: string, field: string, value: any) => {
    setPreviewLabels((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const removePreviewLabel = (id: string) => {
    setPreviewLabels((prev) => prev.filter((p) => p.id !== id));
  };

  // Grouped inputs / logs to print
  const logsList = useMemo(() => {
    // We only process logs from relevant sectors/operators:
    // 1. EMBALAGEM: type == EMBALAGEM / operatorId == embalagem
    // 2. INJETORA: type == INJETORA / operatorId == injetora
    // 3. BANHO_QUIMICO: type == BANHO_QUIMICO / operatorId == banho_quimico
    // 4. CORTE_LASER: type == CORTE_LASER or operatorId starts with cortelaser
    // 5. MONTAGEM_RETRATIL: operatorId == montagem_retratil (role MONTAGEM_RETRATIL)
    
    return db.logs.filter((log) => {
      const isEmbalagem = log.type === "EMBALAGEM" || log.operatorId === "embalagem";
      const isInjetora = log.type === "INJETORA" || log.operatorId === "injetora";
      const isBanhoQuimico = log.type === "BANHO_QUIMICO" || log.operatorId === "banho_quimico";
      
      const isCorteLaser = log.type === "CORTE_LASER" || !!log.operatorId?.startsWith("cortelaser");

      const isMontagemRetratil = log.operatorId === "montagem_retratil" || log.type === "PRODUCAO" && log.operatorId === "montagem_retratil";

      // Apply sector filter
      if (selectedSector === "EMBALAGEM" && !isEmbalagem) return false;
      if (selectedSector === "INJETORA" && !isInjetora) return false;
      if (selectedSector === "BANHO_QUIMICO" && !isBanhoQuimico) return false;
      if (selectedSector === "CORTE_LASER" && !isCorteLaser) return false;
      if (selectedSector === "MONTAGEM_RETRATIL" && !isMontagemRetratil) return false;

      // If "ALL", it must belong to at least one of these relevant categories
      if (selectedSector === "ALL") {
        if (!isEmbalagem && !isInjetora && !isBanhoQuimico && !isCorteLaser && !isMontagemRetratil) {
          return false;
        }
      }

      // Filter by start date
      if (startDate) {
        const filterStart = new Date(`${startDate}T00:00:00`).getTime();
        if (log.timestamp < filterStart) return false;
      }

      // Filter by end date
      if (endDate) {
        const filterEnd = new Date(`${endDate}T23:59:59`).getTime();
        if (log.timestamp > filterEnd) return false;
      }

      // Match search term (Product name, Code, Order Code, Customer, Operator)
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const itemObj = log.orderId ? db.orders.find((o) => o.id === log.orderId) : null;
        const realItem = itemObj ? db.items.find((i) => i.id === itemObj.itemId) : db.items.find((i) => i.id === log.orderId); // fallback
        
        const itemName = realItem?.name?.toLowerCase() || log.customProductName?.toLowerCase() || "";
        const itemCode = realItem?.code?.toLowerCase() || "";
        const orderCode = itemObj?.orderCode?.toLowerCase() || "";
        const customerName = itemObj?.customerName?.toLowerCase() || "";
        const operatorId = log.operatorId?.toLowerCase() || "";
        const thirdParty = log.thirdPartyName?.toLowerCase() || "";

        if (
          !itemName.includes(s) &&
          !itemCode.includes(s) &&
          !orderCode.includes(s) &&
          !customerName.includes(s) &&
          !operatorId.includes(s) &&
          !thirdParty.includes(s)
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [db.logs, db.orders, db.items, selectedSector, searchTerm, startDate, endDate]);

  // Handle master checkbox toggle
  const handleSelectAll = () => {
    if (selectedLogIds.length === logsList.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(logsList.map((l) => l.id));
    }
  };

  // Toggle single row selection
  const handleToggleRow = (id: number) => {
    setSelectedLogIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Resolve standard descriptive details for a log
  const getLogDetails = (log: ProductionLog) => {
    let linkedOrder = log.orderId ? db.orders.find((o) => o.id === log.orderId) : null;
    let item = linkedOrder 
      ? db.items.find((i) => i.id === linkedOrder.itemId) 
      : db.items.find((i) => i.id === log.itemId || i.id === log.orderId); // fallback

    let orderCode = linkedOrder?.orderCode || "S/P";
    let customer = linkedOrder?.customerName || log.thirdPartyName || "-";
    let size = linkedOrder?.size || "-";
    
    if (log.type === "CORTE_LASER") {
      // In Corte Laser, log.orderId is the nestTask.id, NOT a real orderId.
      linkedOrder = null;
      item = null;
      
      const partName = log.nestedPartName || log.customProductName;
      
      if (partName) {
        item = db.items.find((i) => i.name === partName || i.code === partName) || null;
      }

      // Check if this part has active assignments to any orders (ESTOQUE DE PEÇAS CORTADAS)
      if (partName) {
        const assignedOrders = db.orders.filter(o => 
          o.laserAssignments?.some(la => la.partName === partName)
        );
        if (assignedOrders.length > 0) {
          orderCode = assignedOrders.map(o => o.orderCode || o.id.toString()).join(", ");
          customer = assignedOrders.map(o => o.customerName || "Diversos").join(" / ");
          
          // Get size from the first assignment
          const firstAssignment = assignedOrders[0].laserAssignments?.find(la => la.partName === partName);
          if (firstAssignment && firstAssignment.size) {
             size = firstAssignment.size;
          }
        }
      }
    }

    const name = item?.name || log.nestedPartName || log.customProductName || "Item Avulso/Manual";
    const code = item?.code || "S/C";
    const quantity = log.quantityPacked || log.quantityProcessed || log.quantityPainted || log.quantityCut || 0;
    const color = linkedOrder?.color || log.paintedColor || "-";
    const variation = linkedOrder?.variation || "-";
    const imageUrl = item?.imageUrl || null;

    let sectorLabel = "PRODUÇÃO";
    if (log.type === "EMBALAGEM" || log.operatorId === "embalagem") sectorLabel = "EMBALAGEM";
    else if (log.type === "INJETORA" || log.operatorId === "injetora") sectorLabel = "INJETORA";
    else if (log.type === "BANHO_QUIMICO" || log.operatorId === "banho_quimico") sectorLabel = "BANHO QUÍMICO";
    else if (log.type === "CORTE_LASER") sectorLabel = "CORTE LASER";
    else if (log.operatorId === "montagem_retratil") sectorLabel = "MONTAGEM RETRÁTIL";

    const resolvedCustomer = (() => {
      if (!customer || customer === "-") return "-";
      if (customer.includes(" / ")) {
        return customer
          .split(" / ")
          .map((part) => {
            const trimmed = part.trim();
            const match = db.customers?.find(
              (c) =>
                c.name.toLowerCase().trim() === trimmed.toLowerCase().trim() ||
                (c.tradeName && c.tradeName.toLowerCase().trim() === trimmed.toLowerCase().trim())
            );
            return match?.tradeName?.trim() || trimmed;
          })
          .join(" / ");
      }
      const match = db.customers?.find(
        (c) =>
          c.name.toLowerCase().trim() === customer.toLowerCase().trim() ||
          (c.tradeName && c.tradeName.toLowerCase().trim() === customer.toLowerCase().trim())
      );
      return match?.tradeName?.trim() || customer;
    })();

    return { name, code, quantity, color, size, variation, orderCode, customer: resolvedCustomer, sectorLabel, imageUrl };
  };

  // Resolved final labels structure (expands split records)
  const resolvedLabelsToPrint = useMemo(() => {
    const list: any[] = [];
    previewLabels.forEach((p) => {
      const splitCountVal = Math.max(Number(p.splitCount) || 1, 1);
      const qtyPerBox = p.splitQuantityMode === "divide" 
        ? Math.floor(Number(p.quantity) / splitCountVal)
        : Number(p.quantity);
      
      const remainder = p.splitQuantityMode === "divide"
        ? Number(p.quantity) % splitCountVal
        : 0;

      for (let c = 1; c <= splitCountVal; c++) {
        const isLast = c === splitCountVal;
        const finalQty = isLast ? (qtyPerBox + remainder) : qtyPerBox;
        
        let targetBoxIndex = c;
        let targetBoxTotal = splitCountVal;

        if (splitCountVal === 1 && p.boxIndexOverride !== undefined && p.totalBoxesOverride !== undefined) {
           targetBoxIndex = p.boxIndexOverride;
           targetBoxTotal = p.totalBoxesOverride;
        } else if (p.totalBoxesOverride !== undefined) {
           // If they manually split a box that came from a packagesConfig, we append the sub-index
           // Or simply fallback to overriding the whole thing. The easiest is to just use standard c/splitCountVal if they edit it.
           targetBoxIndex = c;
           targetBoxTotal = splitCountVal;
        }

        list.push({
          ...p,
          printQuantity: finalQty,
          boxIndex: targetBoxIndex,
          boxTotal: targetBoxTotal,
        });
      }
    });
    return list;
  }, [previewLabels]);

  // 1. GENERATE THERMAL PDF (100mm x 50mm landscape)
  const handleGenerateThermalPDF = async () => {
    if (resolvedLabelsToPrint.length === 0) {
      alert("Nenhum item disponível para emitir etiquetas.");
      return;
    }
    setIsPrinting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const element = thermalPrintContainerRef.current;
      if (!element) {
        throw new Error("Elemento do container térmico não foi localizado.");
      }

      if (typeof document !== "undefined" && (document as any).fonts) {
        await (document as any).fonts.ready;
      }

      const children = element.children;
      if (children.length === 0) {
        throw new Error("Nenhuma etiqueta térmica renderizada no DOM.");
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [100, 50]
      });

      for (let i = 0; i < children.length; i++) {
        const itemEl = children[i] as HTMLElement;

        // Render label to canvas using html2canvas-pro
        const canvas = await html2canvas(itemEl, {
          scale: 3, // High quality scale for crisp barcode scans
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: 378,  // width of 100mm at 96 DPI
          height: 189, // height of 50mm at 96 DPI
          windowWidth: 378,
          windowHeight: 189,
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        if (i > 0) {
          pdf.addPage([100, 50], "landscape");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 100, 50);
      }

      pdf.save(`Etiquetas_Termicas_10x5_${Date.now()}.pdf`);
      markLabelsAsPrinted();
      triggerNotification("Etiquetas geradas com sucesso para impressora térmica!");
    } catch (e: any) {
      alert(`Erro ao gerar PDF térmico: ${e.message || e}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // 2. GENERATE A4 SHEET PDF (portrait layout, grid of labels 2x5 or similar)
  const handleGenerateA4GridPDF = async () => {
    if (resolvedLabelsToPrint.length === 0) {
      alert("Nenhum item disponível para emitir etiquetas.");
      return;
    }
    setIsPrinting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const element = a4PrintContainerRef.current;
      if (!element) {
        throw new Error("Elemento do container A4 não foi localizado.");
      }

      if (typeof document !== "undefined" && (document as any).fonts) {
        await (document as any).fonts.ready;
      }

      const children = element.children;
      if (children.length === 0) {
        throw new Error("Nenhuma etiqueta/página A4 renderizada no DOM.");
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      for (let i = 0; i < children.length; i++) {
        const pageEl = children[i] as HTMLElement;

        // Render page using html2canvas-pro
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: 794,  // A4 width
          height: 1122, // A4 height
          windowWidth: 794, // Ensure mobile Chrome renders it exactly like desktop
          windowHeight: 1122,
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      pdf.save(`Etiquetas_A4_Grade_${Date.now()}.pdf`);
      markLabelsAsPrinted();
      triggerNotification("Etiquetas geradas em formato de Grade A4!");
    } catch (e: any) {
      alert(`Erro ao gerar PDF A4: ${e.message || e}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // --- Label Printing Tracking ---
  const markLabelsAsPrinted = async () => {
    try {
      const logsToUpdate = new Map<number, { qty: number; count: number }>();

      resolvedLabelsToPrint.forEach((lbl) => {
        if (!lbl.originalLogId) return;
        const current = logsToUpdate.get(lbl.originalLogId) || { qty: 0, count: 0 };
        current.qty += lbl.printQuantity || 0;
        current.count += 1;
        logsToUpdate.set(lbl.originalLogId, current);
      });

      for (const [logId, data] of logsToUpdate.entries()) {
        const log = db.logs.find((l) => String(l.id) === String(logId));
        if (log) {
          await db.updateLog({
            ...log,
            labelsPrintedAt: Date.now(),
            labelsPrintedCount: (log.labelsPrintedCount || 0) + data.count,
            labelsPrintedQuantity: (log.labelsPrintedQuantity || 0) + data.qty,
          });
        }
      }
    } catch (err) {
      console.error("Failed to mark labels as printed", err);
    }
  };

  const handleDirectPrintAll = (type: "thermal" | "a4") => {
    try {
      const container = type === "thermal" ? thermalPrintContainerRef.current : a4PrintContainerRef.current;
      if (!container) {
        alert("Nenhum item está pronto para impressão.");
        return;
      }
      
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        throw new Error("Não foi possível acessar o documento do iframe de impressão.");
      }

      doc.open();
      const originUrl = window.location.origin;
      const pagesHtml = Array.from(container.children).map((child: any) => {
        return '<div class="print-page">' + child.outerHTML + '</div>';
      }).join("");

      const styleBlock = type === "thermal" 
        ? `
          @page {
            size: 100mm 50mm;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100mm !important;
            height: 50mm !important;
          }
          .print-page {
            width: 100mm !important;
            height: 50mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            display: block !important;
            overflow: hidden !important;
          }
        `
        : `
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 210mm !important;
            height: 297mm !important;
          }
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            display: block !important;
            overflow: hidden !important;
          }
        `;

      doc.write(
        '<html>' +
          '<head>' +
            '<title>Imprimir Etiquetas</title>' +
            '<link rel="stylesheet" href="' + originUrl + '/index.css" />' +
            '<style>' +
              styleBlock +
              'body {' +
                'background: white;' +
                'color: black;' +
                'font-family: sans-serif;' +
              '}' +
              '* {' +
                '-webkit-print-color-adjust: exact !important;' +
                'print-color-adjust: exact !important;' +
                'box-sizing: border-box !important;' +
              '}' +
            '</style>' +
          '</head>' +
          '<body>' +
            '<div style="width: 100%;">' +
              pagesHtml +
            '</div>' +
            '<script>' +
              'window.onload = function() {' +
                'setTimeout(function() {' +
                  'window.print();' +
                  'setTimeout(function() {' +
                    'window.parent.document.body.removeChild(window.frameElement);' +
                  '}, 100);' +
                '}, 500);' +
              '};' +
            '</script>' +
          '</body>' +
        '</html>'
      );
      doc.close();
      
      // Update DB to mark as printed
      markLabelsAsPrinted();
    } catch (e: any) {
      alert("Erro na impressão direta: " + (e.message || e));
    }
  };

  // Helper to convert an image URL directly into a monochrome ZPL Hex code string
  const imageToZPLHex = (imageUrl: string, width: number, height: number): Promise<{ hex: string; bytesPerRow: number; byteCount: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          
          // Fill a clean solid white background for alpha transparency support
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          
          // Calculate contained drawing dimensions to keep exact aspect ratio
          const imgRatio = img.width / img.height;
          const targetRatio = width / height;
          let drawW = width;
          let drawH = height;
          let offsetX = 0;
          let offsetY = 0;
          
          if (imgRatio > targetRatio) {
            drawH = width / imgRatio;
            offsetY = (height - drawH) / 2;
          } else {
            drawW = height * imgRatio;
            offsetX = (width - drawW) / 2;
          }
          
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          
          const bytesPerRow = Math.ceil(width / 8);
          const byteCount = bytesPerRow * height;
          
          let hexString = "";
          for (let y = 0; y < height; y++) {
            let byteVal = 0;
            let bitsInByte = 0;
            let rowHex = "";
            
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];
              
              // Simple binarization algorithm (monochrome thresholded)
              const isBlack = a > 50 && (0.299 * r + 0.587 * g + 0.114 * b) < 128;
              
              if (isBlack) {
                byteVal |= (1 << (7 - bitsInByte));
              }
              bitsInByte++;
              
              if (bitsInByte === 8) {
                rowHex += byteVal.toString(16).padStart(2, "0").toUpperCase();
                byteVal = 0;
                bitsInByte = 0;
              }
            }
            
            if (bitsInByte > 0) {
              rowHex += byteVal.toString(16).padStart(2, "0").toUpperCase();
            }
            hexString += rowHex;
          }
          
          resolve({ hex: hexString, bytesPerRow, byteCount });
        } catch (e) {
          console.error("Error converting image to ZPL:", e);
          resolve(null);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = imageUrl;
    });
  };

  // 3. GENERATE RAW ZEBRA ZPL COMMANDS FORMATTED FOR 100x50mm
  const handleGenerateZPL = async () => {
    if (resolvedLabelsToPrint.length === 0) {
      alert("Nenhum item disponível para gerar códigos ZPL.");
      return;
    }

    setIsGeneratingZPL(true);

    try {
      let zplString = "";
      
      // Load corporate badge image once to paint high-resolution native logo inside labels
      let logoZPLCommand = "";
      if (logoUrl) {
        const logoImg = await imageToZPLHex(logoUrl, 44, 44);
        if (logoImg) {
          logoZPLCommand = `^FO40,15^GFA,${logoImg.byteCount},${logoImg.byteCount},${logoImg.bytesPerRow},${logoImg.hex}^FS`;
        }
      }
      
      const zplPromises = resolvedLabelsToPrint.map(async (label) => {
        const { name, code, printQuantity, color, size, variation, orderCode, customer, sectorLabel, boxIndex, boxTotal, packageType, imageUrl } = label;
        const dateStr = new Date(label.timestamp || Date.now()).toLocaleDateString("pt-BR");
        const timeStr = new Date(label.timestamp || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        // Clean words from accents for ZPL printing standard fonts
        const cleanName = removeAccents(name).toUpperCase().slice(0, 48);
        const cleanCustomer = removeAccents(customer).toUpperCase().slice(0, 36);
        const cleanColor = removeAccents(color).toUpperCase().slice(0, 24);
        const cleanSector = removeAccents(sectorLabel).toUpperCase();
        const cleanPkg = removeAccents(packageType).toUpperCase();

        const companyClean = removeAccents(companyName).toUpperCase();
        let compLine1 = companyClean;
        let compLine2 = "";
        if (companyClean.startsWith("IMPERIO JOMARCI")) {
          compLine1 = "IMPERIO JOMARCI - ACESSORIOS";
          compLine2 = "PARA MOVEIS";
        } else if (companyClean.includes(" - ")) {
          const parts = companyClean.split(" - ");
          compLine1 = parts[0].trim();
          compLine2 = parts.slice(1).join(" - ").trim();
        } else if (companyClean.length > 25) {
          const spaceIdx = companyClean.lastIndexOf(" ", 25);
          if (spaceIdx > 0) {
            compLine1 = companyClean.slice(0, spaceIdx);
            compLine2 = companyClean.slice(spaceIdx + 1);
          }
        }

        // Convert image to ZPL Graphic if available with a clean, perfectly square 240x240 size to remove stretching entirely!
        let imageZPLCommand = "";
        let hasImage = false;
        if (imageUrl) {
          const zplImg = await imageToZPLHex(imageUrl, 240, 240);
          if (zplImg) {
            imageZPLCommand = `^FO540,80^GFA,${zplImg.byteCount},${zplImg.byteCount},${zplImg.bytesPerRow},${zplImg.hex}^FS`;
            hasImage = true;
          }
        }

        const barcodeBlock = hasImage 
          ? imageZPLCommand
          : `^FO535,110^BY2,3,110^BCN,110,Y,N,N^FD${code}^FS`;

        // Calculate Pill Badge for the Sector (using narrowed sizes to absolutely prevent overlaps with titles!)
        const badgeWidth = Math.max(100, cleanSector.length * 13 + 18);
        const badgeX = 500 - badgeWidth;
        const badgeTextX = badgeX + 10;
        const sectorBadgeBlock = `^FO${badgeX},15^GB${badgeWidth},34,34,B,3^FS^FO${badgeTextX},23^A0N,18,16^FR^FD${cleanSector}^FS`;

        const logoBlock = logoZPLCommand 
          ? logoZPLCommand 
          : `^FO40,15^GB44,44,2,B,3^FS`;

        const maxTitleWidth = badgeX - 110;

        // Compiled ZPL standard 100x50mm label mirroring the PDF design style perfectly with bold condensed crisp readable text sizes!
        return `^XA
^PW800
^LL400
^CI28

${logoBlock}
^FO100,16^A0N,24,22^FB${maxTitleWidth},2,0,L^FD${companyClean}^FS

${sectorBadgeBlock}

^FO40,66^GB460,2,2^FS

^FO40,74^A0N,38,34^FB460,2,0,L^FD${cleanName}^FS

^FO40,146^A0N,24,24^FDCod: ${code}  |  Pedido: ${orderCode}^FS

^FO40,174^GB460,54,3,B,4^FS
^FO52,190^A0N,24,22^FDCor: ${cleanColor}^FS
^FO280,194^A0N,18,16^FB210,1,0,R^FDVar: ${variation}^FS

^FO40,242^A0N,28,28^FD${cleanSector}: ${boxIndex}/${boxTotal} (${cleanPkg})^FS

^FO40,282^GB460,3,3^FS

^FO40,294^A0N,26,24^FDData/Hora: ${dateStr} ${timeStr}^FS
^FO40,324^A0N,26,24^FDOperador: ${label.operatorId || "-"}^FS
^FO40,354^A0N,26,24^FDCliente: ${cleanCustomer}^FS

^FO300,294^A0N,20,18^FB190,1,0,R^FDQUANTIDADE^FS
^FO300,318^A0N,48,46^FB190,1,0,R^FD${printQuantity} UN^FS

^FO510,12^GB2,376,2^FS
${barcodeBlock}

^PQ1
^XZ
`;
      });

      const zplTemplates = await Promise.all(zplPromises);
      zplString = zplTemplates.join("");
      setModalZPL(zplString);
    } catch (err) {
      console.error(err);
      alert("Erro ao converter imagens para código Zebra ZPL.");
    } finally {
      setIsGeneratingZPL(false);
    }
  };

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  // Clipboard copy utility
  const handleCopyZPL = () => {
    if (!modalZPL) return;
    navigator.clipboard.writeText(modalZPL);
    markLabelsAsPrinted();
    triggerNotification("Código ZPL copiado para a área de transferência!");
    setModalZPL(null);
  };

  const triggerNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <ScrollContainer paddingSize="normal" className="bg-slate-100/40 min-h-0 flex-1 hover:scrollbar-thumb-slate-300">
      {/* Hidden preloaded images for html2canvas reliability */}
      <img src={logoUrl} crossOrigin="anonymous" className="fixed top-0 left-0 w-[1px] h-[1px] opacity-0 pointer-events-none" alt="preload" />
      <div className="flex flex-col gap-4">
        
        {/* SUCCESS FLYOUT BAR */}
        {successMsg && (
          <div className="fixed top-4 right-4 z-[999] bg-emerald-600 border border-emerald-500 text-white font-black p-4 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
            <Check className="bg-white text-emerald-600 rounded-full p-0.5" size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* HEADER SECTION WITH TITLE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-2.5" id="etiquetas-tab-title-container">
          <div>
            <h2 className="text-base sm:text-lg font-black text-black tracking-tight flex items-center gap-1.5">
              <Tag className="text-black" size={18} />
              Impressão de Etiquetas de Processo
            </h2>
          <p className="text-black text-xs mt-1">
            Gere etiquetas em PDF de Alta Definição (Térmico ou A4) e código Zebra ZPL nativo para os setores vinculados.
          </p>
        </div>
        
        {/* MASSIVE ACTION COUNTER */}
        {selectedLogIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-2 py-1.5 rounded-lg flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs text-black font-black">
              🗳️ {selectedLogIds.length} selecionados
            </span>
            <button 
              onClick={() => setSelectedLogIds([])}
              className="text-[10px] uppercase font-black text-red-600 hover:underline hover:cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        )}
      </div>

      {/* FILTERS ACCORDION LAYOUT */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0 flex flex-col transition-all duration-200">
        <div 
          className="flex justify-between items-center cursor-pointer select-none"
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <span className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal size={14} /> Filtros e Busca de Registros
          </span>
          <button type="button" className="text-black">
            {isFilterExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isFilterExpanded && (
          <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-slate-200/50 mt-2.5">
            {/* Sector Source Selection */}
            <div className="flex-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wide block mb-1">
                🏷️ Setor / Origem
              </label>
              <select
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  setSelectedLogIds([]); // clear selection when changing filters
                }}
                className="w-full border border-gray-300 p-2 text-xs rounded bg-white font-medium text-black focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Todos os Setores Elegíveis</option>
                <option value="EMBALAGEM">📦 Embalagem (Usuário Embalagem)</option>
                <option value="INJETORA">⚙️ Injetora (Produção do Setor)</option>
                <option value="BANHO_QUIMICO">🧪 Banho Químico (Produção)</option>
                <option value="CORTE_LASER">⚙️ Corte a Laser</option>
                <option value="MONTAGEM_RETRATIL">🛠️ Montagem de Retrátil (Produção)</option>
              </select>
            </div>

            {/* General Text Search */}
            <div className="flex-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wide block mb-1">
                🔎 Pesquisa Geral
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar por produto, código, pedido ou operador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 p-2 pl-8 text-xs rounded focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <Search className="absolute left-2.5 top-2.5 text-black" size={13} />
              </div>
            </div>

            {/* Date Range Start */}
            <div className="w-full md:w-[130px]">
              <label className="text-[10px] font-black text-black uppercase tracking-wide block mb-1">
                📅 Data De
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 p-2 text-xs rounded focus:ring-1 focus:ring-blue-500 bg-white text-black"
              />
            </div>

            {/* Date Range End */}
            <div className="w-full md:w-[130px]">
              <label className="text-[10px] font-black text-black uppercase tracking-wide block mb-1">
                📅 Data Até
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 p-2 text-xs rounded focus:ring-1 focus:ring-blue-500 bg-white text-black"
              />
            </div>
          </div>
        )}
      </div>

      {/* QUICK FLOATING ACTIONS BAR WHEN SELECTION ACTIVE */}
      {selectedLogIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2.5">
            <Boxes className="text-yellow-400" size={20} />
            <div>
              <p className="text-xs font-black font-sans">
                Ações de Lote: {selectedLogIds.length} itens selecionados para etiquetas.
              </p>
              <p className="text-[10px] text-black">
                Ajuste quantidades, particione em sacos/caixas e visualize a impressão em tempo real antes de exportar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleOpenPreviewModal}
              className="bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] text-white font-black text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
            >
              <Printer size={15} />
              Configurar & Visualizar Impressão
            </button>
          </div>
        </div>
      )}

      {/* RESULTS LIST TABLE */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-xs flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-black text-[10px] font-black uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={logsList.length > 0 && selectedLogIds.length === logsList.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-black rounded cursor-pointer"
                  />
                </th>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Setor Origem</th>
                <th className="p-3">Operador</th>
                <th className="p-3">Identificação Produto</th>
                <th className="p-3">Cor/Tam/Var</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3">Num Pedido / Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {logsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-black">
                    <p className="font-black font-sans">Nenhum registro de produção compatível foi encontrado.</p>
                    <p className="text-xs text-black mt-1">Refine seus filtros de setor e buscas no painel acima.</p>
                  </td>
                </tr>
              ) : (
                logsList.map((log) => {
                  const isSelected = selectedLogIds.includes(log.id);
                  const details = getLogDetails(log);
                  const { name, code, quantity, color, size, variation, orderCode, customer, sectorLabel } = details;

                  return (
                    <tr 
                      key={log.id}
                      onClick={() => handleToggleRow(log.id)}
                      className={`hover:bg-slate-50 border-b border-slate-100 cursor-pointer select-none transition-colors duration-100 ${isSelected ? "bg-blue-50/40" : ""}`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(log.id)}
                          className="w-4 h-4 text-black rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-black whitespace-nowrap">
                        <span className="font-black text-black">
                          {new Date(log.timestamp).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="block text-[10px] text-black font-medium">
                          {new Date(log.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black uppercase border ${
                          sectorLabel.includes("EMBALAGEM") ? "bg-emerald-50 text-emerald-700 border-emerald-150" :
                          sectorLabel.includes("INJETORA") ? "bg-orange-50 text-orange-700 border-orange-150" :
                          sectorLabel.includes("BANHO") ? "bg-purple-50 text-purple-700 border-purple-150" :
                          sectorLabel.includes("CORTE") ? "bg-indigo-50 text-indigo-700 border-indigo-150" :
                          "bg-sky-50 text-sky-700 border-sky-150"
                        }`}>
                          {sectorLabel}
                        </span>
                      </td>
                      <td className="p-3 font-black text-black">{log.operatorId}</td>
                      <td className="p-3">
                        <span className="font-black text-black block font-sans">{name}</span>
                        <span className="text-[10px] text-black font-mono">Código: {code}</span>
                        {log.packagesConfig && log.packagesConfig.length > 0 && (
                          <span className="block mt-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-100 px-1.5 py-0.5 rounded font-semibold w-fit">
                            📦 {log.packagesConfig.map((cnt: any) => `${cnt.boxes}cx de ${cnt.itemsPerBox}`).join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-black font-medium">
                        {color} | {size} | {variation}
                      </td>
                      <td className="p-3 text-right font-black text-black text-sm whitespace-nowrap">
                        {quantity} <span className="text-[10px] text-black font-black">un</span>
                        {log.labelsPrintedCount ? (
                          <div className="mt-1 flex flex-col items-end">
                             <span className="flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1 py-0.5 rounded font-bold" title={`Impresso em: ${new Date(log.labelsPrintedAt || 0).toLocaleString('pt-BR')}`}>
                               <CheckCircle size={10} />
                               {log.labelsPrintedCount} Etiq. / {log.labelsPrintedQuantity} un
                             </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <span className="font-black text-black font-mono block">#{orderCode}</span>
                        <span className="text-[10px] text-black truncate max-w-[150px] block mb-1" title={customer}>
                          {customer}
                        </span>
                        {orderCode === "S/P" && (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "PCP") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLinkModal(log);
                            }}
                            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[9px] font-bold px-2 py-1 rounded transition w-full text-center uppercase tracking-wide border border-indigo-200"
                          >
                            Vincular
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === LINK ORDER MODAL === */}
      {isLinkModalOpen && logToLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-lg flex flex-col p-5">
            <h3 className="font-bold text-lg mb-2 text-slate-800">Vincular Apontamento a Pedido</h3>
            
            {(() => {
              // Helper for localized statuses
              const getStatusLabelAndStyles = (status?: string) => {
                switch (status) {
                  case "FATURADO":
                    return { label: "Faturado", classes: "bg-emerald-50 text-emerald-700 border-emerald-250 text-[10px]" };
                  case "FATURADO_PARCIAL":
                    return { label: "Faturado Parcial", classes: "bg-amber-50 text-amber-700 border-amber-250 text-[10px]" };
                  case "PENDENTE":
                    return { label: "Pendente", classes: "bg-gray-100 text-gray-700 border-gray-250 text-[10px]" };
                  case "TEM_ESTOQUE":
                    return { label: "Tem Estoque", classes: "bg-teal-50 text-teal-700 border-teal-200 text-[10px]" };
                  case "EM_PRODUCAO":
                    return { label: "Em Produção", classes: "bg-blue-50 text-blue-700 border-blue-250 text-[10px]" };
                  case "PRODUZIDO":
                    return { label: "Produzido", classes: "bg-purple-50 text-purple-700 border-purple-200 text-[10px]" };
                  case "EMBALANDO":
                    return { label: "Embalando", classes: "bg-pink-50 text-pink-700 border-pink-200 text-[10px]" };
                  case "EMBALADO":
                    return { label: "Embalado", classes: "bg-purple-100 text-purple-800 border-purple-300 text-[10px]" };
                  case "AGUARDANDO_APROVACAO":
                    return { label: "Aguardando Aprovação", classes: "bg-yellow-50 text-yellow-750 border-yellow-200 text-[10px]" };
                  default:
                    return { label: status || "Pendente", classes: "bg-slate-100 text-slate-700 border-slate-200 text-[10px]" };
                }
              };

              if (!selectedOrderToLink) {
                // Filter logic matching the query (split by space)
                const queryParts = linkOrderSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
                const filteredOrdersList = db.orders.filter(o => {
                  const item = db.items.find(i => i.id === o.itemId);
                  const customer = db.customers.find(c => c.name === o.customerName || c.tradeName === o.customerName);
                  const searchStr = `${o.orderCode} ${o.customerName} ${customer?.tradeName || ""} ${item?.name || ""} ${item?.code || ""} ${o.status || ""}`.toLowerCase();
                  
                  if (queryParts.length === 0) return true;
                  return queryParts.every(part => searchStr.includes(part));
                });

                return (
                  <>
                    <p className="text-xs text-slate-500 mb-4 font-medium">
                      Esse apontamento foi feito de forma avulsa. Localize um pedido para vinculá-lo.
                    </p>
                    <input 
                      type="text" 
                      placeholder="Pesquisar por cliente, pedido, status ou produto..." 
                      value={linkOrderSearch} 
                      onChange={e => setLinkOrderSearch(e.target.value)} 
                      className="border border-slate-200 p-2 pl-3 rounded-lg mb-4 text-xs w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                    />

                    <div className="flex-1 max-h-[340px] overflow-y-auto border border-slate-150 rounded-xl bg-slate-50 p-2 flex flex-col gap-2 scrollbar-thin">
                      {filteredOrdersList.slice(0, 40).map(o => {
                        const item = db.items.find(i => i.id === o.itemId);
                        const statusObj = getStatusLabelAndStyles(o.status);
                        const qtyDisponivel = Math.max(0, o.totalQuantity - (o.invoicedQuantity || 0));

                        return (
                          <div 
                            key={o.id} 
                            onClick={() => handleLinkOrderClick(o)} 
                            className="bg-white border border-slate-100 hover:border-indigo-400 rounded-lg p-3 text-xs cursor-pointer hover:bg-slate-50/70 transition flex flex-col gap-2.5 shadow-2xs"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <div>
                                <span className="font-extrabold text-slate-800 text-xs">Ped: {o.orderCode}</span>
                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Cliente: {o.customerName}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded border font-bold shrink-0 text-[10px] ${statusObj.classes}`}>
                                {statusObj.label}
                              </span>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-md p-2 font-medium">
                              <p className="text-slate-700 font-bold truncate">{item?.name || "Produto manual"}</p>
                              <span className="text-[9px] text-slate-450 font-semibold block mt-0.5">Cód: {item?.code || "S/C"}</span>
                            </div>

                            {/* Info bar of quantities */}
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                              <div className="bg-slate-100 rounded-md py-1">
                                <span className="text-slate-400 text-[9px] block font-normal uppercase">Qtd Pedido</span>
                                <span className="text-slate-700">{o.totalQuantity} un</span>
                              </div>
                              <div className="bg-emerald-50 rounded-md py-1 text-emerald-800">
                                <span className="text-emerald-500 text-[9px] block font-normal uppercase">Faturado</span>
                                <span className="text-emerald-700">{o.invoicedQuantity || 0} un</span>
                              </div>
                              <div className="bg-indigo-50/80 rounded-md py-1 text-indigo-800">
                                <span className="text-indigo-500 text-[9px] block font-normal uppercase">Atrelável</span>
                                <span className="text-indigo-705">{qtyDisponivel} un</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredOrdersList.length === 0 && (
                        <div className="text-center text-xs text-slate-400 p-6 font-medium">Nenhum pedido encontrado.</div>
                      )}
                    </div>

                    <button 
                      onClick={() => { setIsLinkModalOpen(false); setLogToLink(null); }} 
                      className="mt-4 p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs w-full transition"
                    >
                      Cancelar
                    </button>
                  </>
                );
              } else {
                const statusObj = getStatusLabelAndStyles(selectedOrderToLink.status);
                const qtyDisponivel = Math.max(0, selectedOrderToLink.totalQuantity - (selectedOrderToLink.invoicedQuantity || 0));

                return (
                  <>
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 mb-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-extrabold text-indigo-950 text-sm">Ped: {selectedOrderToLink.orderCode}</span>
                          <span className="text-xs text-indigo-800 font-semibold block mt-0.5">Cliente: {selectedOrderToLink.customerName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded border font-bold shrink-0 text-[10px] ${statusObj.classes}`}>
                          {statusObj.label}
                        </span>
                      </div>

                      <div className="text-xs text-indigo-900 border-t border-indigo-100/50 pt-2 font-medium">
                        Produto: {(() => {
                          const item = db.items.find(i => i.id === selectedOrderToLink.itemId);
                          return `${item?.name || "Sem nome"} (${item?.code || "S/C"})`;
                        })()}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold mt-1 bg-white/80 p-2 rounded-lg border border-indigo-100/30">
                        <div>
                          <span className="text-slate-400 text-[9px] block font-normal uppercase">Qtd Pedido</span>
                          <span className="text-slate-800 font-extrabold">{selectedOrderToLink.totalQuantity} un</span>
                        </div>
                        <div>
                          <span className="text-emerald-500 text-[9px] block font-normal uppercase">Faturado</span>
                          <span className="text-emerald-700 font-extrabold">{selectedOrderToLink.invoicedQuantity || 0} un</span>
                        </div>
                        <div>
                          <span className="text-indigo-500 text-[9px] block font-normal uppercase">Atrelável</span>
                          <span className="text-indigo-700 font-extrabold">{qtyDisponivel} un</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-600 mb-1.5">
                      Quantidade a vincular:
                    </p>
                    <input 
                      type="number" 
                      value={linkQuantity} 
                      onChange={e => setLinkQuantity(Number(e.target.value) || "")} 
                      className="border border-slate-200 p-2.5 rounded-lg mb-4 text-sm w-full outline-indigo-500 font-extrabold text-lg"
                      max={getLogDetails(logToLink).quantity}
                    />
                    
                    <div className="flex gap-2.5 mt-2">
                      <button onClick={() => setSelectedOrderToLink(null)} className="flex-1 p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition">
                        Voltar
                      </button>
                      <button onClick={confirmLinkOrder} className="flex-1 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition">
                        Confirmar Vínculo
                      </button>
                    </div>
                  </>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- REUSABLE PRINT PREVIEW AND EDIT MODAL CONTAINER --- */}
      {/* ========================================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="text-black animate-pulse" size={22} />
                <div>
                  <h3 className="font-black text-black text-lg">Central de Visualização & Configuração de Etiquetas</h3>
                  <p className="text-xs text-black font-medium">Personalize volumes, embalagens e quantitativo total em tempo real antes de imprimir.</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-black hover:text-black bg-slate-200/50 p-2 rounded-full hover:bg-slate-200 transition cursor-pointer self-center"
              >
                ✕
              </button>
            </div>

            {/* Split Content Screen */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-100">
              
              {/* Left Config Panel: Scrollable list of items being edited */}
              <div className="w-full lg:w-1/2 p-4 overflow-y-auto border-r border-slate-200 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-black text-black text-sm flex items-center gap-1.5 uppercase tracking-wide">
                    <SlidersHorizontal size={14} className="text-black" />
                    Parâmetros das Etiquetas
                  </h4>
                  <span className="text-xs font-black bg-blue-100 text-black px-2.5 py-0.5 rounded-full">
                    {previewLabels.length} Itens Originais
                  </span>
                </div>

                {previewLabels.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-black">
                    <Boxes size={48} className="text-black mb-2" />
                    <p className="text-sm font-black">Nenhum item restando na lista de pré-impressão.</p>
                    <p className="text-xs mt-1">Selecione mais itens na tabela principal para reiniciar.</p>
                  </div>
                ) : (
                  previewLabels.map((p, idx) => (
                    <div key={p.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition duration-150 shadow-sm flex flex-col gap-3">
                      
                      {/* Name & Title Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <h5 className="font-black text-black text-xs tracking-tight line-clamp-1">{p.name}</h5>
                          <span className="text-[10px] font-mono bg-slate-100 text-black px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-1 font-black">
                            Código: {p.code}
                          </span>
                          {(p.boxIndexOverride !== undefined && p.totalBoxesOverride !== undefined) && (
                            <span className="ml-2 text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-1 font-black">
                              Volume Vinculado: {p.boxIndexOverride} de {p.totalBoxesOverride}
                            </span>
                          )}
                          {/* Fetch original log to see if printed */}
                          {(() => {
                            const originalLog = db.logs.find(l => String(l.id) === String(p.originalLogId));
                            if (originalLog?.labelsPrintedCount) {
                              return (
                                <span className="flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold w-max mt-1" title={`Impresso em: ${new Date(originalLog.labelsPrintedAt || 0).toLocaleString('pt-BR')}`}>
                                  <CheckCircle size={10} />
                                  Já Impresso ({originalLog.labelsPrintedCount}x)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <button
                          onClick={() => removePreviewLabel(p.id)}
                          title="Remover este item"
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 text-[10px] font-black rounded-lg transition"
                        >
                          Remover
                        </button>
                      </div>

                      {/* Editing Parameters Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        {/* Quantity input */}
                        <div>
                          <label className="block text-[10px] uppercase font-black text-black mb-1">Quantidade Total</label>
                          <input
                            type="number"
                            min="1"
                            value={p.quantity}
                            onChange={(e) => updatePreviewLabel(p.id, "quantity", Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full text-xs font-black text-black bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Split packet input */}
                        <div>
                          <label className="block text-[10px] uppercase font-black text-black mb-1">QTD de Embalagens</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={p.splitCount}
                            onChange={(e) => updatePreviewLabel(p.id, "splitCount", Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full text-xs font-black text-black bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Package type Select */}
                        <div>
                          <label className="block text-[10px] uppercase font-black text-black mb-1">Formato Embalagem</label>
                          <select
                            value={p.packageType}
                            onChange={(e) => updatePreviewLabel(p.id, "packageType", e.target.value)}
                            className="w-full text-xs font-black text-black bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="Caixa">Caixa</option>
                            <option value="Saco">Saco</option>
                            <option value="Fardo">Fardo</option>
                            <option value="Pacote">Pacote</option>
                            <option value="Palete">Palete</option>
                          </select>
                        </div>

                        {/* Split mode select */}
                        <div>
                          <label className="block text-[10px] uppercase font-black text-black mb-1">Rateio da Qtd</label>
                          <select
                            value={p.splitQuantityMode}
                            onChange={(e) => updatePreviewLabel(p.id, "splitQuantityMode", e.target.value)}
                            className="w-full text-xs font-black text-black bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="divide">Dividir Qtd total entre volumes</option>
                            <option value="replicate">Repetir Qtd total em cada volume</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* Right Visualizer Panel: Show instant high-fidelity live HTML preview */}
              <div className="w-full lg:w-1/2 p-4 overflow-y-auto bg-slate-900 text-white flex flex-col gap-4">
                
                {/* Visualizer header tabs */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="font-black text-yellow-500 text-sm uppercase flex items-center gap-1.5">
                    <Printer size={15} />
                    Pré-Visualização Realística
                  </h4>
                  <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-750">
                    <button
                      onClick={() => setPreviewFormat("thermal")}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-md uppercase transition cursor-pointer ${previewFormat === "thermal" ? "bg-blue-600 text-white" : "text-black hover:text-white"}`}
                    >
                      Térmica 10x5cm
                    </button>
                    <button
                      onClick={() => setPreviewFormat("a4")}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-md uppercase transition cursor-pointer ${previewFormat === "a4" ? "bg-purple-600 text-white" : "text-black hover:text-white"}`}
                    >
                      Grade Folha A4
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-black">
                  Esta é uma cópia exata do que será renderizado no arquivo final no formato selecionado, com as quantidades calculadas e códigos de barra inseridos.
                </p>

                {/* Simulated rendering area */}
                <div className="flex-1 flex flex-col items-center justify-start gap-4 p-2 overflow-y-auto">
                  {resolvedLabelsToPrint.length === 0 ? (
                    <div className="py-12 text-black text-xs text-center">Nenhum dado de etiqueta ativo. Ajuste as informações nas configurações ao lado.</div>
                  ) : previewFormat === "thermal" ? (
                    /* Render list of simulated thermal labels */
                    resolvedLabelsToPrint.map((lbl, idx) => (
                      <div
                        key={`prev-thm-${idx}-${lbl.id}`}
                        className="bg-white text-black rounded-lg p-3.5 flex gap-3 shadow-md relative w-full max-w-[380px] overflow-hidden select-none"
                        style={{ height: "160px" }}
                      >
                        <div className="flex-1 flex flex-col justify-between h-full text-left">
                          <div>
                            <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                              <span className="text-[8px] font-black tracking-wider text-black">IMPÉRIO ACESSÓRIOS</span>
                              <span className="text-[10px] font-black bg-slate-100 text-black px-1 py-0.2 rounded scale-90">{lbl.sectorLabel}</span>
                            </div>
                            <h5 className="text-[10px] font-black text-black leading-tight truncate">{lbl.name}</h5>
                            <p className="text-[10px] font-mono font-black text-black mt-1">Cod: {lbl.code} | Pedido: {lbl.orderCode}</p>
                            <p className="text-[10px] font-black text-black bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded inline-block mt-1">
                              Cor: {lbl.color || "-"} | Var: {lbl.variation || "-"}
                            </p>
                            <p className="text-[8px] text-black tracking-wide font-black uppercase mt-1">
                              Volume: {lbl.boxIndex} de {lbl.boxTotal} ({lbl.packageType})
                            </p>
                          </div>
                          <div className="border-t border-slate-100 pt-1 flex justify-between items-end">
                            <div className="text-[10px] text-black leading-tight flex-1 min-w-0 pr-2">
                              <span>Data: {new Date(lbl.timestamp || Date.now()).toLocaleDateString("pt-BR")}</span>
                              <span className="block truncate max-w-full">Ref: {lbl.customer}</span>
                            </div>
                            <div className="text-right shrink-0 pl-1">
                              <span className="text-[8px] block font-black text-black leading-none mb-0.5">QTD</span>
                              <strong className="text-[11px] font-black text-black block">{lbl.printQuantity} <span className="text-[9px]">UN</span></strong>
                            </div>
                          </div>
                        </div>
                        <div className="w-[94px] flex flex-col items-center shrink-0 border-l border-slate-100 pl-1 justify-center h-full overflow-hidden">
                          {lbl.imageUrl ? (
                            <div className="w-full h-full bg-white flex items-center justify-center grayscale min-h-0">
                              <img src={lbl.imageUrl} alt="img" className="w-full h-full object-contain" crossOrigin="anonymous" />
                            </div>
                          ) : (
                            <div className="w-full flex justify-center items-center scale-90">
                              <LocalSVGBarcode data={`${lbl.code}|${lbl.color}|${lbl.size}|${lbl.printQuantity}`} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Render A4 Grade Pages Simulation */
                    <div className="w-full flex flex-col gap-6 items-center">
                      {(() => {
                        const chunks: any[][] = [];
                        for (let i = 0; i < resolvedLabelsToPrint.length; i += 10) {
                          chunks.push(resolvedLabelsToPrint.slice(i, i + 10));
                        }
                        return chunks.map((chunk, pageI) => (
                          <div key={`thm-chk-${pageI}`} className="bg-slate-800 border border-slate-700 p-3 rounded-xl w-full max-w-[420px] shadow-lg">
                            <span className="text-[11px] font-black text-black mb-2 block border-b border-slate-700 pb-1 text-center font-sans tracking-wide">
                              SIMULAÇÃO DE PÁGINA A4 #{pageI + 1} ({chunk.length}/10 etiquetas)
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {chunk.map((lbl, idx) => (
                                <div key={idx} className="bg-white text-black border border-slate-200 rounded p-1.5 flex flex-col justify-between" style={{ height: "105px" }}>
                                  <div className="text-left">
                                    <div className="flex justify-between items-center text-[5.5px] border-b pb-0.5 mb-0.5">
                                      <div className="flex items-center gap-1">
                                        <img src={logoUrl} crossOrigin="anonymous" alt="logo" className="w-[12px] h-[12px] object-contain rounded-sm" loading="eager" />
                                        <span className="font-black text-black uppercase">{companyName}</span>
                                      </div>
                                      <span className="font-black text-black bg-slate-100 py-0.2 px-0.5 rounded uppercase scale-90">{lbl.sectorLabel}</span>
                                    </div>
                                    <h6 className="text-[8px] font-black text-black truncate">{lbl.name}</h6>
                                    <p className="text-[5.5px] text-black font-mono mt-0.5 line-clamp-1 w-full leading-tight">Cod: {lbl.code} | Ped: {lbl.orderCode} {lbl.customer && lbl.customer !== '-' ? `| Cli: ${lbl.customer}` : ''}</p>
                                    <p className="text-[10px] text-black font-black bg-slate-50 border px-0.5 mt-0.5 rounded leading-none inline-block">
                                      C: {lbl.color || "-"} | T: {lbl.size || "-"}
                                    </p>
                                    <p className="text-[5.5px] font-black text-black block mt-0.5 leading-none">
                                      V: {lbl.boxIndex}/{lbl.boxTotal}
                                    </p>
                                  </div>
                                  <div className="flex justify-between items-end border-t pt-0.5 mt-1">
                                    <span className="text-[5px] text-black">Qtd: <strong className="text-[11px] text-black font-black">{lbl.printQuantity}</strong></span>
                                    <div className="w-[64px] flex flex-col items-center shrink-0 border-l border-slate-100 pl-1 justify-center h-full overflow-hidden">
                                      {lbl.imageUrl ? (
                                        <div className="w-full h-full bg-white flex items-center justify-center grayscale min-h-0">
                                          <img src={lbl.imageUrl} alt="img" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                        </div>
                                      ) : (
                                        <div className="w-full flex justify-center items-center scale-[0.6]">
                                          <LocalSVGBarcode data={`${lbl.code}|${lbl.color}|${lbl.size}|${lbl.printQuantity}`} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Footer actions */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-black font-medium">
                Total de <strong className="text-black font-black">{resolvedLabelsToPrint.length} etiquetas</strong> serão geradas no lote atual.
              </span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                {/* ZPL Text */}
                <button
                  onClick={handleGenerateZPL}
                  disabled={isGeneratingZPL}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Copy size={14} className={isGeneratingZPL ? "animate-spin" : ""} />
                  {isGeneratingZPL ? "Gerando ZPL c/ Imagens..." : "Copias Comandos ZPL (Zebra)"}
                </button>
                {/* A4 Grid PDF */}
                <button
                  disabled={isPrinting}
                  onClick={handleGenerateA4GridPDF}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Grid size={14} className={isPrinting ? "animate-spin" : ""} />
                  Gerar PDF Grade A4
                </button>
                {/* Direct Print A4 */}
                <button
                  disabled={isPrinting}
                  onClick={() => handleDirectPrintAll("a4")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  Imprimir (Grade A4)
                </button>
                {/* Thermal PDF */}
                <button
                  disabled={isPrinting}
                  onClick={handleGenerateThermalPDF}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-5 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5 shadow-blue-500/20"
                >
                  <Printer size={14} className={isPrinting ? "animate-spin" : ""} />
                  Gerar PDF Térmico
                </button>
                {/* Direct Print Thermal */}
                <button
                  disabled={isPrinting}
                  onClick={() => handleDirectPrintAll("thermal")}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-black text-xs px-4 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5 shadow-teal-500/20"
                >
                  <Printer size={14} />
                  Imprimir (Térmico)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL DISPLAY FOR RAW ZEBRA ZPL --- */}
      {modalZPL && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[999] backdrop-blur-xs">
          <div className="bg-slate-900 text-black rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-slate-800 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base tracking-tight">🦓 Código de Impressão Zebra ZPL</h3>
                <p className="text-[10px] text-black mt-1">Copy and paste this raw stream directly towards standard thermal network printing ports (Raw TCP Port 9100) or utilities.</p>
              </div>
              <button 
                onClick={() => setModalZPL(null)}
                className="text-black hover:text-white font-black text-lg"
              >
                ✕
              </button>
            </div>

            <textarea
              readOnly
              value={modalZPL}
              className="bg-black/80 font-mono text-[11px] text-green-400 p-4 rounded-xl h-64 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-green-500 overflow-y-auto"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalZPL(null)}
                className="px-4 py-2 text-xs font-black text-black hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopyZPL}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                <Copy size={14} />
                Copiar Todos os Comandos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- HIDDEN CANVAS FOR THERMAL PRINT (100mm x 50mm) --- */}
      {/* ========================================================= */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          width: "auto",
          height: "auto",
          overflow: "visible",
          opacity: 1,
          pointerEvents: "none",
          zIndex: -9999,
          backgroundColor: "#ffffff",
        }}
      >
        <div ref={thermalPrintContainerRef} id="thermal-printable-wrapper" className="bg-white">
          {resolvedLabelsToPrint.map((label, index) => {
            const { name, code, printQuantity, color, size, variation, orderCode, customer, sectorLabel, boxIndex, boxTotal, packageType, imageUrl } = label;
            const dateStr = new Date(label.timestamp || Date.now()).toLocaleDateString("pt-BR");
            const timeStr = new Date(label.timestamp || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            return (
              <div
                key={`thermal-${index}-${label.id}`}
                className="relative bg-white font-sans text-black box-border p-4 flex gap-3 select-none overflow-hidden"
                style={{
                  width: "100mm",
                  height: "50mm",
                  maxHeight: "50mm",
                  overflowY: "hidden",
                  pageBreakAfter: "always",
                  fontFamily: "sans-serif"
                }}
              >
                {/* Information details */}
                <div className="flex-1 flex flex-col justify-between h-full">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <img src={logoUrl} crossOrigin="anonymous" alt="logo" className="w-[16px] h-[16px] object-contain rounded-sm" loading="eager" />
                        <span className="text-[7.5px] font-black tracking-wider text-black uppercase">
                          {companyName}
                        </span>
                      </div>
                      <span className="text-[7px] tracking-wide font-black bg-slate-100 text-black px-1 py-1 rounded font-sans leading-none">
                        {sectorLabel}
                      </span>
                    </div>

                    {/* Product Name */}
                    <div className="flex gap-2 items-start h-[30px] overflow-hidden">
                      <h3 className="text-[13px] font-black font-sans leading-tight text-black tracking-tight select-none line-clamp-2">
                        {name}
                      </h3>
                    </div>
                    
                    {/* Specs & Identifiers */}
                    <p className="text-[9.5px] font-mono font-black text-black mt-1">
                      Cod: {code} | Pedido: {orderCode}
                    </p>
                    
                    <p className="text-[9.5px] font-black text-black mt-1 bg-slate-50 border border-black p-0.5 rounded inline-block leading-tight">
                      Cor: {color} | Var: {variation}
                    </p>

                    <div className="text-[9px] font-black text-black uppercase tracking-wider mt-1 block">
                      Embalagem: {boxIndex}/{boxTotal} ({packageType})
                    </div>
                  </div>

                  {/* Quantity and meta timestamps */}
                  <div className="border-t border-slate-150 pt-1 flex justify-between items-end">
                    <div className="text-[8px] text-black font-black leading-tight mt-1 flex-1 min-w-0 pr-2">
                      <span>Data: {dateStr} {timeStr}</span>
                      <span className="block">Operador: {label.operatorId}</span>
                      {customer !== "-" && <span className="block truncate max-w-full">Cliente: {customer}</span>}
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-[7px] block font-black text-black uppercase leading-none mb-1">QTD</span>
                      <strong className="text-[12px] font-black tracking-tight text-black block leading-none">{printQuantity} <span className="text-[8px] font-black">UN</span></strong>
                    </div>
                  </div>
                </div>

                {/* Barcode section */}
                <div className="w-[104px] flex flex-col items-center shrink-0 border-l border-slate-100 pl-1 justify-center h-full overflow-hidden">
                  {imageUrl ? (
                    <div className="w-full h-full bg-white flex items-center justify-center grayscale min-h-0">
                      <img src={imageUrl} alt="img" className="w-full h-full object-contain" crossOrigin="anonymous" />
                    </div>
                  ) : (
                    <div className="w-full flex justify-center items-center scale-[0.9]">
                      <LocalSVGBarcode data={`${code}|${color}|${size}|${printQuantity}`} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* --- HIDDEN CANVAS FOR PORTRAIT GRADE A4 STICKERS --- */}
      {/* ========================================================= */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          width: "auto",
          height: "auto",
          overflow: "visible",
          opacity: 1,
          pointerEvents: "none",
          zIndex: -9999,
          backgroundColor: "#ffffff",
        }}
      >
        <div ref={a4PrintContainerRef} id="a4-grid-printable-wrapper" className="bg-white p-4" style={{ width: "210mm", minHeight: "297mm", fontFamily: "sans-serif" }}>
          {/* We chunk standard tags in 2-column by 5-row grids on each page */}
          {(() => {
            const chunkSize = 10;
            const pages: any[][] = [];
            for (let i = 0; i < resolvedLabelsToPrint.length; i += chunkSize) {
              pages.push(resolvedLabelsToPrint.slice(i, i + chunkSize));
            }

            return pages.map((pageLabels, pageIdx) => (
              <div 
                key={`a4-page-${pageIdx}`} 
                className="w-full box-border flex flex-col justify-between overflow-hidden relative"
                style={{
                  height: "287mm", // leaving margins
                  pageBreakAfter: "always",
                }}
              >
                <div>
                  {/* Page header indicator */}
                  <div className="flex justify-between items-center text-[11px] font-black text-black border-b pb-2 mb-4 uppercase tracking-widest font-sans">
                    <span>IMPÉRIO ACESSÓRIOS · ETIQUETAS DE PROCESSO</span>
                    <span>PÁGINA {pageIdx + 1} DE {pages.length}</span>
                  </div>

                  {/* 2-column label grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    {pageLabels.map((lbl, lblIdx) => {
                      const { name, code, printQuantity, color, size, variation, orderCode, customer, sectorLabel, boxIndex, boxTotal, packageType, imageUrl } = lbl;
                      const dateStr = new Date(lbl.timestamp || Date.now()).toLocaleDateString("pt-BR");
                      const timeStr = new Date(lbl.timestamp || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                      return (
                        <div
                          key={`a4grid-${pageIdx}-${lblIdx}`} 
                          className="bg-white border-2 border-slate-200 rounded-xl p-3 flex gap-3 h-[48mm] overflow-hidden justify-between shadow-xs select-none"
                        >
                          {/* Inner labels info */}
                          <div className="flex-1 flex flex-col justify-between h-full">
                            <div>
                              <div className="flex justify-between items-center border-b pb-1 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <img src={logoUrl} crossOrigin="anonymous" alt="logo" className="w-[14px] h-[14px] object-contain rounded-sm" loading="eager" />
                                  <span className="text-[6.5px] font-black text-black tracking-wider uppercase">{companyName}</span>
                                </div>
                                <span className="text-[6px] font-black bg-slate-100 text-black px-1 py-0.2 rounded uppercase lg:leading-none">{sectorLabel}</span>
                              </div>
                              <div className="flex gap-2 items-start h-[26px] overflow-hidden">
                                <h4 className="text-[10px] font-black text-black leading-tight tracking-tight font-sans line-clamp-2">
                                  {name}
                                </h4>
                              </div>
                              <p className="text-[8px] font-mono font-black text-black mt-0.5 leading-tight truncate w-full">
                                Cod: {code} | Ped.: {orderCode} {customer && customer !== '-' ? `| Cli: ${customer}` : ''}
                              </p>
                              <p className="text-[8px] text-black bg-slate-50 border border-black p-0.5 rounded inline-block mt-1 font-black">
                                Cor: {color} | Var: {variation}
                              </p>
                              <p className="text-[7.5px] text-black font-black uppercase mt-1">
                                Vol: {boxIndex}/{boxTotal} ({packageType})
                              </p>
                            </div>
                            <div className="flex justify-between items-end border-t border-slate-100 pt-1">
                              <div className="text-[6.5px] text-black font-black leading-tight font-sans flex-1 min-w-0 pr-2">
                                <span>Data: {dateStr} {timeStr}</span>
                                <span className="block truncate max-w-full">Operador: {lbl.operatorId}</span>
                              </div>
                              <div className="text-right leading-none shrink-0 pl-1">
                                <span className="text-[5.5px] text-black block font-black leading-none mb-0.5">QTD</span>
                                <strong className="text-[9.5px] font-black text-black leading-none">{printQuantity} <span className="text-[6px] font-black">UN</span></strong>
                              </div>
                            </div>
                          </div>

                          {/* Inner labels Barcode */}
                          <div className="w-[100px] flex flex-col items-center shrink-0 border-l border-slate-100 pl-1 justify-center h-full overflow-hidden">
                            {imageUrl ? (
                              <div className="w-full h-full bg-white flex items-center justify-center grayscale min-h-0">
                                <img src={imageUrl} alt="img" className="w-full h-full object-contain" crossOrigin="anonymous" />
                              </div>
                            ) : (
                              <div className="w-full flex justify-center items-center scale-[0.8]">
                                <LocalSVGBarcode data={`${code}|${color}|${size}|${printQuantity}`} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer identifier */}
                <div className="text-[10px] text-black text-center border-t pt-2 mt-4 select-none uppercase tracking-wider font-black">
                  IMPÉRIO ACESSÓRIOS LTDA · GESTÃO INTEGRADA DE PRODUÇÃO E LOGÍSTICA
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      </div>
    </ScrollContainer>
  );
}
