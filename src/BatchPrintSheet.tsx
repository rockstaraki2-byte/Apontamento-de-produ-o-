import React, { forwardRef } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { ProductionBatch, Order, User } from "./types";

interface BatchPrintSheetProps {
  batch: ProductionBatch;
  orderIds: number[];
  customDeadline?: string;
  customNotes?: string;
  db: {
    orders: Order[];
    items: { id: number; name: string }[];
    customers?: any[];
  };
  currentUser: User;
}

// Helper block for safe and reliable canvas capture
export async function waitForFonts(): Promise<void> {
  console.log("[PDF] waiting fonts...");
  if (document.fonts) {
    try {
      await document.fonts.ready;
      console.log("[PDF] fonts ready");
    } catch (e) {
      console.warn("[PDF] font ready rejection:", e);
    }
  }
}

export async function waitForImages(container: HTMLElement): Promise<void> {
  console.log("[PDF] waiting images to load...");
  const imgs = Array.from(container.querySelectorAll("img"));
  const promises = imgs.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  await Promise.all(promises);
  console.log("[PDF] images loaded or checked");
}

export async function waitForStableLayout(element: HTMLElement): Promise<void> {
  console.log("[PDF] waiting stable layout...");
  // Wait at least two repaint ticks for browser styles and react reconciliations to fully settle
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 200));
}

export function assertPrintableElement(element: HTMLElement | null): { width: number; height: number } {
  if (!element) {
    throw new Error("Printable element node was not found in the DOM.");
  }
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  console.log(`[PDF] rect width/height: ${width}px x ${height}px`);
  console.log(`[PDF] scrollWidth/scrollHeight: ${element.scrollWidth}px x ${element.scrollHeight}px`);

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid dimensions for capture: width is ${width}px, height is ${height}px. Ensure the layout is fully rendered with visibility.`);
  }

  return { width, height };
}

const formatDateShort = (dateString?: string) => {
  if (!dateString) return "-";
  // Add time explicitly so it parses as local date correctly without timezone shift
  const d = new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00`);
  if (isNaN(d.getTime())) return dateString;
  const days = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  
  const dayName = days[d.getDay()];
  const dayNum = String(d.getDate()).padStart(2, "0");
  const monthName = months[d.getMonth()];
  
  return `${dayName}, ${dayNum}/${monthName}`;
};

export const BatchPrintSheet = forwardRef<HTMLDivElement, BatchPrintSheetProps>((props, ref) => {
  const { batch, orderIds, customDeadline, customNotes, db, currentUser } = props;

  const logoUrl = db.activeTenant?.logoUrl || "/icon.png";
  const companyName = db.activeTenant?.name || "IMPÉRIO JOMARCI - ACESSÓRIOS PARA MÓVEIS";

  // Filter orders
  const ordersToPrint = batch.orderIds
    .filter((oid) => orderIds.includes(oid))
    .map((oid) => db.orders.find((x) => x.id === oid))
    .filter((o): o is Order => !!o);

  const totalQuantity = ordersToPrint.reduce((acc, o) => acc + (o.totalQuantity || 0), 0);
  const totalOrders = ordersToPrint.length;

  // Current formatted timestamp
  const dateStr = new Date().toLocaleDateString("pt-BR");
  const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const ITEMS_PER_FIRST_PAGE = 12;
  const ITEMS_PER_NEXT_PAGE = 16;

  const pages: Order[][] = [];
  const remainingOrders = [...ordersToPrint];

  if (remainingOrders.length > 0) {
    pages.push(remainingOrders.splice(0, ITEMS_PER_FIRST_PAGE));
  }
  while (remainingOrders.length > 0) {
    pages.push(remainingOrders.splice(0, ITEMS_PER_NEXT_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div ref={ref} id="batch-printable-sheet-container" className="flex flex-col gap-4 bg-slate-200">
      <style dangerouslySetInnerHTML={{ __html: `
        #batch-printable-sheet-container, #batch-printable-sheet-container * {
          color: #000000 !important;
        }
      `}} />
      {pages.map((pageOrders, pageIndex) => (
        <div
          key={pageIndex}
          className="pdf-page bg-white p-8 font-sans text-slate-800 box-border flex flex-col justify-between overflow-hidden"
          style={{
            width: "794px", // Standard A4 width at 96 DPI
            height: "1123px", // Standard A4 height exactly fixed to prevent canvas sizing issues
            backgroundColor: "#ffffff",
            color: "#1e293b",
          }}
        >
          <div className="w-full flex-1 flex flex-col">
            {/* Header Block exactly like preview */}
            <div className="border-b-2 border-slate-200 pb-4 mb-5 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Imperio Logo" className="w-10 h-10 object-contain" />
                <div>
                  <span className="text-[9px] font-black text-emerald-650 uppercase tracking-widest block mb-0.5">
                    {companyName}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {batch.name} {pages.length > 1 && `(Folha ${pageIndex + 1}/${pages.length})`}
                  </h2>
                </div>
              </div>
              <span className="text-[8px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-bold uppercase border border-sky-200 tracking-wider">
                Lote de Gerência
              </span>
            </div>

            {/* Meta Only on first page */}
            {pageIndex === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 text-[11px]">
                  <div>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide block mb-0.5">
                      ⏱️ Data Prevista (Prazo)
                    </span>
                    <strong className="text-slate-800 text-xs font-extrabold">
                      {customDeadline || "Não Informada"}
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
                      {totalOrders} pedidos
                    </strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide block mb-0.5">
                      🕒 Data de Geração do PDF
                    </span>
                    <strong className="text-slate-800 text-xs font-extrabold">
                      {dateStr} às {timeStr}
                    </strong>
                  </div>
                </div>

                {(customNotes || batch.notes) && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 mb-5">
                    <span className="text-[8px] text-amber-750 font-extrabold uppercase tracking-wider block mb-1">
                      📝 Observações do Lote
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                      {customNotes || batch.notes}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Main Items Grid Table */}
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
                  {pageOrders.map((o) => {
                    const item = db.items.find((i) => i.id === o.itemId);
                    const customerObj = db.customers?.find(
                      (c) =>
                        c.name === o.customerName ||
                        c.tradeName === o.customerName ||
                        String(c.id) === String(o.customerName)
                    );
                    const resolvedCustomerName = customerObj?.tradeName?.trim() || customerObj?.name?.trim() || o.customerName;

                    return (
                      <tr key={o.id} className="border-b border-slate-150">
                        <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                          #{o.orderCode}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-800">
                          <div>{resolvedCustomerName}</div>
                          <div className="text-[13px] text-[#1e40af] font-bold mt-0.5 whitespace-nowrap">
                            Prazo: {formatDateShort(o.deliveryDate)}
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
                          {o.totalQuantity}
                        </td>
                        <td className="py-3 px-3 text-center border-l border-slate-150">
                          <div className="w-5 h-5 border border-slate-400 rounded-sm mx-auto bg-transparent"></div>
                        </td>
                      </tr>
                    );
                  })}

                  {pageOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 uppercase font-black tracking-wider text-[10px]">
                        Nenhum pedido nesta página.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Sum / Totals section only on last page */}
            {pageIndex === pages.length - 1 && pageOrders.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-250 flex justify-between items-center">
                <span className="text-slate-450 uppercase font-bold text-[9px] tracking-wider">
                  Imperio Acessórios
                </span>
                <strong className="text-slate-900 text-sm font-black">
                  Total Geral: {totalQuantity}
                </strong>
              </div>
            )}
          </div>

          <div>
             {/* Signatures Areas */}
             <div className="mt-10 grid grid-cols-2 gap-12 text-center">
               <div className="border-t border-slate-300 pt-2 text-[9px] text-slate-500 uppercase font-bold tracking-wider font-sans">
                 Assinatura PCP / Gerência
               </div>
               <div className="border-t border-slate-300 pt-2 text-[9px] text-slate-500 uppercase font-bold tracking-wider font-sans">
                 Assinatura Responsável pela Fábrica
               </div>
             </div>

             {/* Footnote matching preview */}
             <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400">
               <div className="flex items-center gap-2">
                 <img src={logoUrl} alt="Imperio Logo" className="w-4 h-4 object-contain opacity-50" />
                 <span>Impresso por: {currentUser.name}</span>
               </div>
               <span>Página {pageIndex + 1}/{pages.length} &bull; © PCP Lotes de Gerência</span>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
});

BatchPrintSheet.displayName = "BatchPrintSheet";
