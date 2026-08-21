import React, { forwardRef } from "react";
import { ProductionBatch, Order } from "./types";
import { useDatabase } from "./useDatabase";
import { getItemUnit } from "./utils/unitUtils";
import { resolveCompanyInfo, CompanyLogo } from "./utils/companyUtils";

interface BatchEtiquetasPrintSheetProps {
  batch: ProductionBatch;
  orderIds: number[];
  db: ReturnType<typeof useDatabase>;
  layoutFormat: "thermal" | "a4";
  destrincharComposicoes?: boolean;
  ocultarPaiComposicao?: boolean;
  showImage?: boolean;
}

// Inline deterministic SVG Barcode renderer for crisp label scans
export function LocalSVGBarcode({ data, codeText }: { data: string; codeText?: string }) {
  const displayCode = React.useMemo(() => {
    if (codeText && codeText !== "S/C") return codeText;
    const parts = data.split("|");
    return parts[0] || data;
  }, [data, codeText]);

  const bars = React.useMemo(() => {
    const cleanData = displayCode.replace(/[^a-zA-Z0-9]/g, "") || "123456";
    const values = cleanData.split("").map((c) => c.charCodeAt(0));
    const result: number[] = [1, 1, 1];
    for (let i = 0; i < Math.min(values.length, 14); i++) {
      const v = values[i];
      result.push((v % 3) + 1);
      result.push(((v >> 1) % 2) + 1);
      result.push(((v >> 2) % 3) + 1);
      result.push(((v >> 3) % 2) + 1);
    }
    result.push(1, 1, 1);
    return result;
  }, [displayCode]);

  return (
    <div className="flex flex-col items-center justify-center select-none bg-white p-1 rounded border border-slate-200 w-full shrink-0">
      <svg
        width="100%"
        height="32"
        viewBox={`0 0 ${bars.length * 2} 40`}
        preserveAspectRatio="none"
        className="w-full h-[32px]"
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
      <span className="text-[10px] font-mono font-black text-slate-900 mt-1 uppercase text-center leading-none tracking-wider whitespace-nowrap">
        {displayCode}
      </span>
    </div>
  );
}

export interface LabelItemData {
  id: string;
  orderCode: string;
  batchName: string;
  customerName: string;
  itemName: string;
  itemCode: string;
  color: string;
  size: string;
  variation: string;
  quantity: number;
  unitLabel?: string;
  imageUrl?: string | null;
  barcodeData: string;
  dateStr: string;
}

export function buildBatchLabelItemsData({
  batch,
  orderIds = [],
  db,
  destrincharComposicoes = false,
  ocultarPaiComposicao = false,
}: {
  batch: ProductionBatch;
  orderIds: number[];
  db: ReturnType<typeof useDatabase>;
  destrincharComposicoes?: boolean;
  ocultarPaiComposicao?: boolean;
}): LabelItemData[] {
  const list: LabelItemData[] = [];
  const dateToday = new Date().toLocaleDateString("pt-BR");

  (orderIds || []).forEach((oid) => {
    const order = (db.orders || []).find((o) => o && (o.id === oid || String(o.id) === String(oid)));
    if (!order) return;

    const item = (db.items || []).find((i) => i && (i.id === order.itemId || String(i.id) === String(order.itemId)));

    const resolvedCustomerName = (() => {
      if (!order.customerName) return "CLIENTE NÃO INFORMADO";
      const targetCustomerName = (order.customerName || "").toLowerCase().trim();
      const foundCust = (db.customers || []).find(
        (c) =>
          c &&
          ((c.name && c.name.toLowerCase().trim() === targetCustomerName) ||
          (c.tradeName && c.tradeName.toLowerCase().trim() === targetCustomerName))
      );
      return foundCust?.tradeName || foundCust?.name || order.customerName;
    })();

    const hasComponents = Array.isArray(item?.components) && item.components.length > 0;

    if (destrincharComposicoes && hasComponents && item) {
      if (!ocultarPaiComposicao) {
        list.push({
          id: `ord-${order.id}-parent`,
          orderCode: order.orderCode || `${order.id}`,
          batchName: batch?.name || `LOTE #${batch?.id || ''}`,
          customerName: resolvedCustomerName,
          itemName: item?.name || "Produto Sem Nome",
          itemCode: item?.code || "S/C",
          color: order.color || "-",
          size: order.size || "-",
          variation: order.variation || "-",
          quantity: order.totalQuantity || 0,
          unitLabel: getItemUnit(item, order),
          imageUrl: item?.imageUrl || null,
          barcodeData: `${item?.code || 'ITEM'}|${order.orderCode || order.id}|${order.totalQuantity || 0}`,
          dateStr: dateToday,
        });
      }

      item.components!.forEach((comp, idx) => {
        if (!comp) return;
        const compItem = (db.items || []).find((i) => i && (i.id === comp.itemId || String(i.id) === String(comp.itemId)));
        const compQty = (order.totalQuantity || 0) * (comp.quantity || 1);

        list.push({
          id: `ord-${order.id}-comp-${comp.itemId}-${idx}`,
          orderCode: order.orderCode || `${order.id}`,
          batchName: batch?.name || `LOTE #${batch?.id || ''}`,
          customerName: resolvedCustomerName,
          itemName: compItem?.name ? `[COMP] ${compItem.name}` : `Componente #${comp.itemId}`,
          itemCode: compItem?.code || "S/C",
          color: order.color || "-",
          size: order.size || "-",
          variation: order.variation || "-",
          quantity: compQty,
          unitLabel: getItemUnit(compItem, order),
          imageUrl: compItem?.imageUrl || null,
          barcodeData: `${compItem?.code || 'COMP'}|${order.orderCode || order.id}|${compQty}`,
          dateStr: dateToday,
        });
      });
    } else {
      list.push({
        id: `ord-${order.id}`,
        orderCode: order.orderCode || `${order.id}`,
        batchName: batch?.name || `LOTE #${batch?.id || ''}`,
        customerName: resolvedCustomerName,
        itemName: item?.name || "Produto Sem Nome",
        itemCode: item?.code || "S/C",
        color: order.color || "-",
        size: order.size || "-",
        variation: order.variation || "-",
        quantity: order.totalQuantity || 0,
        unitLabel: getItemUnit(item, order),
        imageUrl: item?.imageUrl || null,
        barcodeData: `${item?.code || 'ITEM'}|${order.orderCode || order.id}|${order.totalQuantity || 0}`,
        dateStr: dateToday,
      });
    }
  });

  return list;
}

export const BatchEtiquetasPrintSheet = forwardRef<
  HTMLDivElement,
  BatchEtiquetasPrintSheetProps
>(({ batch, orderIds = [], db, layoutFormat = "thermal", destrincharComposicoes = false, ocultarPaiComposicao = false, showImage = true }, ref) => {
  const companyInfo = React.useMemo(() => {
    return resolveCompanyInfo(db.activeTenant, db.systemSettings?.[0], db.tenants);
  }, [db.activeTenant, db.systemSettings, db.tenants]);

  const companyName = companyInfo.companyName;
  const companySubtitle = companyInfo.companySubtitle;
  const logoUrl = companyInfo.logoUrl;

  // Build the list of labels to render for the selected orders in the batch
  const labelItems = React.useMemo(() => {
    return buildBatchLabelItemsData({
      batch,
      orderIds,
      db,
      destrincharComposicoes,
      ocultarPaiComposicao,
    });
  }, [batch, orderIds, db, destrincharComposicoes, ocultarPaiComposicao]);

  // Render Single Label Component (100mm x 50mm landscape)
  const renderSingleLabel = (label: LabelItemData, index: number) => {
    return (
      <div
        key={`${label.id}-${index}`}
        className="bg-white font-sans text-black box-border p-3 flex gap-2 select-none overflow-hidden border border-slate-300 rounded-sm relative"
        style={{
          width: "100mm",
          height: "50mm",
          maxHeight: "50mm",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
          pageBreakInside: "avoid"
        }}
      >
        {/* Left Column: Information details */}
        <div className="flex-1 flex flex-col justify-between h-full min-w-0 pr-1">
          <div>
            {/* Header: Company & Batch */}
            <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                <CompanyLogo logoUrl={logoUrl} companyName={companyName} className="w-4 h-4" />
                <div className="flex flex-col min-w-0 leading-none">
                  <span className="text-[8.5px] font-black tracking-tight text-black uppercase truncate leading-tight">
                    {companyName}
                  </span>
                  {companySubtitle && (
                    <span className="text-[6.5px] font-bold text-slate-600 uppercase truncate leading-tight">
                      {companySubtitle}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[7px] tracking-tight font-extrabold bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase shrink-0 max-w-[110px] truncate">
                {label.batchName}
              </span>
            </div>

            {/* Product Name */}
            <div className="h-[28px] overflow-hidden mb-1">
              <h3 className="text-[12px] font-black font-sans leading-tight text-black tracking-tight line-clamp-2 uppercase">
                {label.itemName}
              </h3>
            </div>

            {/* Specs & Identifiers */}
            <div className="text-[9.5px] font-mono font-black text-black leading-tight flex items-center gap-1">
              <span>Cód: <span className="bg-slate-100 px-1 py-0.5 rounded text-black">{label.itemCode}</span></span>
              <span>|</span>
              <span>Pedido: <span className="font-bold text-indigo-900">#{label.orderCode}</span></span>
            </div>

            <div className="text-[8.5px] font-black text-black mt-1 leading-tight flex flex-wrap gap-1">
              <span>Cor: <strong>{label.color}</strong></span>
              {label.size !== "-" && <span>| Tam: <strong>{label.size}</strong></span>}
              {label.variation !== "-" && <span>| Var: <strong>{label.variation}</strong></span>}
            </div>
          </div>

          {/* Footer: Customer, Date & Quantity */}
          <div className="border-t border-slate-200 pt-1 flex justify-between items-end mt-auto">
            <div className="text-[7.5px] text-slate-800 font-bold leading-tight flex-1 min-w-0 pr-1">
              <span className="block truncate font-black text-slate-900">Cliente: {label.customerName}</span>
              <span className="text-[7px] text-slate-500">Emissão: {label.dateStr}</span>
            </div>
            <div className="text-right shrink-0 pl-1">
              <span className="text-[6.5px] block font-black text-slate-500 uppercase leading-none">Qtd Total</span>
              <strong className="text-[12px] font-black tracking-tight text-black block leading-none bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded mt-0.5">
                {label.quantity} <span className="text-[7.5px]">{label.unitLabel || "UN"}</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Barcode or Image */}
        <div className="w-[105px] flex flex-col items-center shrink-0 border-l border-slate-200 pl-2 justify-center h-full overflow-hidden">
          {showImage && label.imageUrl ? (
            <div className="w-full h-full bg-white flex flex-col items-center justify-center min-h-0 p-0.5">
              <img 
                src={label.imageUrl} 
                alt="img" 
                className="w-full h-full object-contain" 
                crossOrigin="anonymous" 
              />
            </div>
          ) : (
            <div className="w-full flex flex-col justify-center items-center">
              <LocalSVGBarcode data={label.barcodeData} codeText={label.itemCode} />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (labelItems.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium text-xs italic">
        Nenhuma peça/pedido selecionado para emitir etiquetas do lote.
      </div>
    );
  }

  // A4 Layout: Chunk into pages of 10 labels each (2 columns x 5 rows)
  const chunkedA4Pages = React.useMemo(() => {
    const pages: LabelItemData[][] = [];
    const pageSize = 10;
    for (let i = 0; i < labelItems.length; i += pageSize) {
      pages.push(labelItems.slice(i, i + pageSize));
    }
    return pages;
  }, [labelItems]);

  return (
    <div ref={ref} id="batch-etiquetas-printable-wrapper" className="bg-white">
      {layoutFormat === "thermal" ? (
        /* THERMAL MODE: Vertical sequence of 10x5cm label cards */
        <div className="flex flex-col gap-3 p-2 bg-slate-50/50 items-center justify-center">
          {labelItems.map((item, idx) => renderSingleLabel(item, idx))}
        </div>
      ) : (
        /* A4 SHEET MODE: 2 columns x 5 rows per A4 Page */
        <div className="flex flex-col gap-8 p-4 items-center justify-center">
          {chunkedA4Pages.map((pageItems, pageIdx) => (
            <div
              key={`a4-page-${pageIdx}`}
              className="bg-white shadow-md border border-slate-300 p-4 box-border flex flex-col justify-between"
              style={{
                width: "210mm",
                height: "297mm",
                minWidth: "210mm",
                minHeight: "297mm",
                pageBreakAfter: "always",
                boxSizing: "border-box"
              }}
            >
              {/* Header on A4 page */}
              <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-2 text-xs">
                <div className="flex items-center gap-2">
                  <CompanyLogo logoUrl={logoUrl} companyName={companyName} className="w-6 h-6" />
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-800 uppercase tracking-wide leading-tight">{companyName}</span>
                    {companySubtitle && (
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">{companySubtitle}</span>
                    )}
                  </div>
                </div>
                <span className="font-black text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                  Etiquetas do Lote: {batch.name} (Pág {pageIdx + 1}/{chunkedA4Pages.length})
                </span>
              </div>

              {/* 2x5 Grid of 10x5 cm Labels */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-3 flex-1">
                {pageItems.map((item, idx) => renderSingleLabel(item, idx))}
              </div>

              {/* Footer on A4 page */}
              <div className="border-t border-slate-200 pt-1.5 mt-2 flex justify-between items-center text-[9px] text-slate-400 font-bold">
                <span>Impressão de Etiquetas Identificadoras de Peças do Lote</span>
                <span>Página {pageIdx + 1} de {chunkedA4Pages.length}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

BatchEtiquetasPrintSheet.displayName = "BatchEtiquetasPrintSheet";
