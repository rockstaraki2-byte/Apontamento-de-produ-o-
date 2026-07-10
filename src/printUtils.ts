import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function printHtml(htmlContent: string, layout: "THERMAL" | "A4" = "THERMAL") {
  const container = document.createElement("div");
  container.innerHTML = htmlContent;
  
  // Position it offscreen using a far-left offset.
  // This ensures html2canvas renders the layout perfectly with full opacity, avoiding paint-omitting optimizations.
  Object.assign(container.style, {
    position: "fixed",
    top: "0px",
    left: "-9999px",
    opacity: "1",
    background: "#ffffff",
    color: "#000000",
    pointerEvents: "none",
    zIndex: "-9999"
  });

  if (layout === "THERMAL") {
    // 10cm x 5cm -> approximate 378px x 189px at 96 DPI
    container.style.width = "378px";
  } else {
    // A4 width
    container.style.width = "794px";
  }

  document.body.appendChild(container);

  // Allow elements/images to render and styles to settle
  await new Promise(resolve => setTimeout(resolve, 350));

  try {
    if (typeof document !== "undefined" && (document as any).fonts) {
      await (document as any).fonts.ready;
    }

    if (layout === "THERMAL") {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [100, 50]
      });

      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: 378,
        height: 189,
        windowWidth: 378,
        windowHeight: 189
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      pdf.addImage(imgData, "JPEG", 0, 0, 100, 50);
      pdf.save("etiqueta_10x5.pdf");
    } else {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const canvas = await html2canvas(container, {
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
        windowHeight: 1123
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      pdf.save("etiquetas_A4.pdf");
    }
  } catch (err) {
    console.error("Error generating PDF:", err);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function printElementById(elementId: string, docTitle: string = "Documento", isA4Document: boolean = false) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }
  
  const originalTitle = document.title;
  document.title = docTitle;
  
  // Remove existing print container to prevent style leaking/accumulation
  let printContainer = document.getElementById("print-container-wrapper");
  if (printContainer) {
    printContainer.parentNode?.removeChild(printContainer);
  }

  printContainer = document.createElement("div");
  printContainer.id = "print-container-wrapper";
  
  const style = document.createElement("style");
  
  const printMarginStyle = isA4Document 
    ? `
      @page {
        size: A4 portrait;
        margin: 0 !important;
      }
      #print-container-wrapper {
        display: block !important;
        position: relative !important;
        width: 210mm !important;
        max-width: 210mm !important;
        height: auto !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #print-container-wrapper .pdf-page {
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        page-break-after: always !important;
        break-after: page !important;
        background: white !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
      }
      #print-container-wrapper .acomp-page {
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 6mm 10mm !important;
        box-sizing: border-box !important;
        page-break-after: always !important;
        break-after: page !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        background: white !important;
      }
      /* Fallback padding for other standard A4 documents that are not pre-paged */
      #print-container-wrapper > *:not(#batch-printable-sheet-container):not(#acompanhamento-printable-sheet-container) {
        padding: 12mm !important;
        box-sizing: border-box !important;
      }
      #print-report-modal {
        display: block !important;
        min-height: 0 !important;
        height: auto !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        background: white !important;
      }
      .flex-container-to-block {
        display: block !important;
      }
      .print-block {
        display: block !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 20px !important;
      }
    `
    : `
      @page {
        margin: 0 !important;
      }
      #print-container-wrapper {
        display: block !important;
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 10mm !important;
        box-sizing: border-box !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;

  style.innerHTML = `
    @media print {
      body > *:not(#print-container-wrapper) {
        display: none !important;
      }
      ${printMarginStyle}
      #print-container-wrapper * {
        visibility: visible;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
    @media screen {
      #print-container-wrapper {
        display: none !important;
      }
    }
  `;
  
  printContainer.appendChild(style);
  document.body.appendChild(printContainer);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'relative';
  clone.style.width = '100%';
  clone.style.height = 'auto';
  clone.style.maxWidth = '100%';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.boxShadow = 'none';
  clone.style.margin = '0';
  clone.style.transform = 'none';
  
  const allChildren = clone.querySelectorAll('*');
  allChildren.forEach(child => {
      const htmlChild = child as HTMLElement;
      if (htmlChild.style) {
          if (htmlChild.style.overflow) htmlChild.style.overflow = 'visible';
          if (htmlChild.style.overflowY) htmlChild.style.overflowY = 'visible';
          if (htmlChild.style.maxHeight) htmlChild.style.maxHeight = 'none';
          if (htmlChild.style.transform) htmlChild.style.transform = 'none';
      }
  });

  printContainer.appendChild(clone);

  // Wait for all images inside the cloned container to be fully loaded
  const imgs = Array.from(clone.querySelectorAll("img"));
  const loadPromises = imgs.map((img) => {
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }
    // For cloned image elements, re-setting src to its current value can trigger loading in some browsers
    const src = img.src;
    if (src) {
      img.src = "";
      img.src = src;
    }
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });

  Promise.all(loadPromises).then(() => {
    // A small buffer for rendering/layout stabilization
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }, 300);
  }).catch((err) => {
    console.error("Error waiting for images to load:", err);
    window.print();
    document.title = originalTitle;
  });
}

export function exportRepresentativeBillingPdf(
  repName: string,
  summaryDate: string,
  details: {
    representativeName: string;
    orders: any[];
    totalValue: number;
    totalItems: number;
  },
  dbItems: any[],
  getInvoicedQtyOnDay: (o: any, date: string) => number
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Header Design
  // Green accent bar on left top
  doc.setFillColor(0, 177, 79); // #00b14f
  doc.rect(14, 12, 182, 1.5, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text("IMPÉRIO JOMARCI", 14, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("RELATÓRIO DE FATURAMENTO CONSOLIDADO", 14, 27);

  // Metadata block (Date and Representative)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Data do Faturado: ${formatDate(summaryDate)}`, 14, 35);
  doc.text(`Representante: ${repName}`, 14, 40);

  // Print generation date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Gerado digitalmente em: ${new Date().toLocaleString("pt-BR")}`, 14, 45);

  // Horizontal divider
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);

  // Helper values block - Draw beautiful cards using rectangles
  // Order Count Card
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(241, 245, 249); // Slate-100
  doc.rect(14, 52, 88, 18, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("PEDIDOS FATURADOS", 18, 57);
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${details.orders.length}`, 18, 64);

  // Item Count Card
  doc.rect(108, 52, 88, 18, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL DE PEÇAS", 112, 57);
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${details.totalItems} un`, 112, 64);

  // Main table data construction
  const tableColumn = [
    "Pedido",
    "Cliente",
    "Produto",
    "C/T/V",
    "Qtd. Fat"
  ];

  const tableRows: any[] = [];

  details.orders.forEach((o) => {
    const item = dbItems.find((i) => String(i.id) === String(o.itemId));
    const prodName = item?.name || o.customProductName || `Produto #${o.itemId}`;
    const prodCode = item?.code ? `[${item.code}] ` : "";
    const fullProdName = `${prodCode}${prodName}`;
    
    const qtyFatToday = getInvoicedQtyOnDay(o, summaryDate);
    const accumFat = o.status === "FATURADO" ? (o.totalQuantity || 0) : (o.invoicedQuantity || 0);
    const totalQty = o.totalQuantity || 0;

    const ctvDescr = `${o.color || "-"} / ${o.size || "-"} / ${o.variation || "-"}`;

    tableRows.push([
      `#${o.orderCode}`,
      o.customerName,
      fullProdName,
      ctvDescr,
      `${qtyFatToday} (${accumFat}/${totalQty})`
    ]);
  });

  // Render the autoTable with customized styling
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 76,
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: "helvetica",
      textColor: [51, 65, 85] // Slate-700
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left"
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [0, 177, 79], cellWidth: 20 }, // Pedido
      1: { cellWidth: 45 }, // Cliente
      2: { cellWidth: 67 }, // Produto
      3: { cellWidth: 30 }, // C/T/V
      4: { fontStyle: "bold", halign: "center", cellWidth: 20 } // Qtd Fat
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate-50
    },
    margin: { left: 14, right: 14, top: 15, bottom: 20 },
    didDrawPage: (data) => {
      // Add a page footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }
  });

  // Calculate final coordinate to check if drawing signature lines is safe or needs a new page
  const finalY = (doc as any).lastAutoTable.finalY || 80;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (finalY + 40 > pageHeight - 15) {
    doc.addPage();
    // green header line on the new page
    doc.setFillColor(0, 177, 79);
    doc.rect(14, 12, 182, 1.5, "F");
    drawSignatures(doc, 25, details.totalValue, details.orders.length, details.totalItems);
  } else {
    drawSignatures(doc, finalY + 10, details.totalValue, details.orders.length, details.totalItems);
  }

  // Save the PDF
  doc.save(`Fechamento_${repName.replace(/\s+/g, "_")}_${summaryDate}.pdf`);
}

function drawSignatures(doc: jsPDF, startY: number, totalValue: number, countOrders: number, countItems: number) {
  // Mini terms/notes section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text("Notas e Termos de Expedição:", 14, startY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("O faturamento consolidado acima reflete a conferência física e liberação das peças finalizadas.", 14, startY + 4.5);
  doc.text("As baixas de estoque foram processadas de forma irrevogável conforme regimento interno Império Jomarci.", 14, startY + 8);

  // Draw signature lines
  const sigY = startY + 24;
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.5);
  
  // Left: Manager Signature
  doc.line(14, sigY, 80, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Assinatura Gerencial", 14, sigY + 4);

  // Right: Company label
  doc.line(130, sigY, 196, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PCP Império Jomarci", 130, sigY + 4);
}

