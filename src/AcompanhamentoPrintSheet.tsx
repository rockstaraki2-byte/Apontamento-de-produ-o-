import React, { forwardRef } from "react";
import { useDatabase } from "./useDatabase";
import { Order, ProductionBatch } from "./types";
import { ClipboardList, Layers, Grid } from "lucide-react";

interface AcompanhamentoPrintSheetProps {
  batch: ProductionBatch;
  orderIds: number[];
  db: ReturnType<typeof useDatabase>;
}

export const AcompanhamentoPrintSheet = forwardRef<
  HTMLDivElement,
  AcompanhamentoPrintSheetProps
>(({ batch, orderIds = [], db }, ref) => {
  const logoUrl = db.activeTenant?.logoUrl || "/icon.png";
  const companyName = db.activeTenant?.name || "IMPÉRIO ACESSÓRIOS | METALURGIA";

  // Group batch orders by unique item characteristics: itemId, color, size, variation
  const groupedProducts = React.useMemo(() => {
    const list: {
      itemId: number;
      color: string;
      size: string;
      variation: string;
      totalQuantity: number;
      orders: Order[];
    }[] = [];

    (orderIds || []).forEach((oid) => {
      const order = db.orders.find((o) => o.id === oid);
      if (!order) return;

      const existing = list.find(
        (p) =>
          p.itemId === order.itemId &&
          p.color === order.color &&
          p.size === order.size &&
          p.variation === order.variation
      );

      if (existing) {
        existing.totalQuantity += order.totalQuantity;
        existing.orders.push(order);
      } else {
        list.push({
          itemId: order.itemId,
          color: order.color,
          size: order.size,
          variation: order.variation,
          totalQuantity: order.totalQuantity,
          orders: [order]
        });
      }
    });

    return list;
  }, [orderIds, db.orders]);

  const chunks = React.useMemo(() => {
    const list: typeof groupedProducts[] = [];
    for (let i = 0; i < groupedProducts.length; i += 2) {
      list.push(groupedProducts.slice(i, i + 2));
    }
    return list;
  }, [groupedProducts]);

  return (
    <div
      ref={ref}
      id="acompanhamento-printable-sheet-container"
      className="bg-white p-6 leading-normal font-sans text-slate-900 selection:bg-slate-100"
      style={{
        width: "794px",     // Exactly A4 standard printable width at 96 DPI
        boxSizing: "border-box"
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        #acompanhamento-printable-sheet-container, #acompanhamento-printable-sheet-container *:not(.text-white):not(.text-white-force) {
          color: #000000 !important;
        }
        #acompanhamento-printable-sheet-container .text-white, #acompanhamento-printable-sheet-container .text-white-force {
          color: #ffffff !important;
        }
      `}} />
      {groupedProducts.length === 0 ? (
        <div className="text-center p-8 border border-dashed text-slate-400">
          Nenhum item selecionado ou disponível para o acompanhamento.
        </div>
      ) : (
        chunks.map((chunk, chunkIdx) => {
          return (
            <div
              key={`acomp-page-chunk-${chunkIdx}`}
              className="acomp-page flex flex-col justify-between overflow-hidden relative"
              style={{
                height: "1080px",        // fits tightly on a single printed A4 page height
                pageBreakAfter: "always",
                boxSizing: "border-box"
              }}
            >
              {chunk.map((p, indexInChunk) => {
                const globalIndex = chunkIdx * 2 + indexInChunk;
                const item = db.items.find((it) => it.id === p.itemId);
                const sector = db.sectors.find((s) => s.id === batch.sectorId);

                return (
                  <React.Fragment key={`acomp-item-frag-${globalIndex}`}>
                    <div
                      className="flex flex-col justify-between border-4 border-double border-slate-350 p-4 rounded-xl relative"
                      style={{
                        height: "520px",
                        boxSizing: "border-box",
                        backgroundColor: "#ffffff"
                      }}
                    >
                      {/* TOP COMPACT HEADER */}
                      <div className="shrink-0">
                        <div className="flex justify-between items-start border-b border-slate-200 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                            <div>
                              <span className="text-[10px] font-black tracking-widest text-blue-800 uppercase block leading-none mb-0.5">
                                {companyName}
                              </span>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                                Ficha de Acompanhamento de Peça
                              </h4>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[8.5px] border border-slate-950 text-slate-950 bg-slate-50 px-2.5 py-1 rounded-md font-extrabold uppercase inline-block tracking-wide leading-none shadow-sm text-center">
                              {batch.name || "GERAL"}
                            </span>
                            <p className="text-[8px] text-slate-400 font-semibold mt-1.5 leading-none">
                              Item #{globalIndex + 1} de {groupedProducts.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* SIDE-BY-SIDE SIDEBARS */}
                      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 items-stretch">
                        {/* LEFT COLUMN (specifications and composition) */}
                        <div className="col-span-7 flex flex-col justify-between gap-1.5 min-h-0">
                          {/* Product identification brand box */}
                          <div className="border border-slate-200 bg-slate-50/50 p-2.5 rounded-lg shrink-0">
                            <span className="text-[8px] font-mono font-black text-slate-400 block tracking-wider uppercase mb-0.5">
                              ESPECIFICAÇÕES DO PRODUTO
                            </span>
                            <h2 className="text-xs font-black text-slate-900 tracking-tight font-sans uppercase line-clamp-1 leading-snug">
                              {item?.name || "Item Avulso/Manual"}
                            </h2>
                            <p className="text-[10px] font-mono font-extrabold text-indigo-700 leading-none mt-1">
                              Código: {item?.code || "N/A"}
                            </p>

                            {/* ATTRIBUTES GRIDS */}
                            <div className="flex flex-wrap gap-2.5 mt-2 pt-1 border-t border-dashed border-slate-200 text-[10px]">
                              <div>
                                <span className="text-slate-400 font-bold block text-[8px] uppercase leading-none">Cor</span>
                                <strong className="text-slate-800 leading-none">{p.color}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block text-[8px] uppercase leading-none">Tamanho</span>
                                <strong className="text-slate-800 leading-none">{p.size}</strong>
                              </div>
                              <div>
                                <span className="text-slate-405 font-bold block text-[8px] uppercase leading-none">Variação</span>
                                <strong className="text-slate-800 leading-none">{p.variation}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Connected orders composition table */}
                          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex-1 flex flex-col min-h-0 justify-between">
                            <div className="flex flex-col min-h-0">
                              <span className="text-[8px] uppercase text-slate-404 font-extrabold block tracking-wider mb-1">
                                📦 COMPOSIÇÃO DOS PEDIDOS NO LOTE ({p.orders.length} PEDIDOS)
                              </span>
                              <div className="grid grid-cols-1 gap-y-1 text-[9px] overflow-y-auto max-h-[160px] pr-1">
                                {p.orders.map((o, oIdx) => {
                                  const customerObj = db.customers?.find(
                                    (c) =>
                                      c.name === o.customerName ||
                                      c.tradeName === o.customerName ||
                                      String(c.id) === String(o.customerName)
                                  );
                                  const resolvedCustomerName = customerObj?.tradeName?.trim() || customerObj?.name?.trim() || o.customerName;

                                  return (
                                    <div key={oIdx} className="flex justify-between items-center bg-white border border-slate-150 p-1.5 px-2 rounded-md shadow-2xs gap-2 min-w-0">
                                      <div className="font-mono text-slate-800 leading-normal min-w-0 flex-1 break-words">
                                        <div className="font-bold">
                                          #{o.orderCode} <span className="text-slate-500 font-normal text-[9px]">({resolvedCustomerName})</span>
                                        </div>
                                        <div className="text-[8.5px] text-indigo-700 font-semibold mt-0.5">
                                          📅 Prazo: {o.deliveryDate ? o.deliveryDate.split("-").reverse().join("/") : "-"}
                                        </div>
                                      </div>
                                      <span className="font-extrabold text-slate-900 border-l pl-2 border-slate-200 shrink-0 leading-none">
                                        {o.totalQuantity} un
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="border-t border-dashed border-slate-200 pt-1 mt-1 flex justify-between items-center text-[7.5px] text-slate-400 font-mono leading-none">
                              <span>Ficha de controle de processo e estoque</span>
                              <span>Império Acessórios</span>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN (drawing, points, total) */}
                        <div className="col-span-5 flex flex-col justify-between gap-1.5 min-h-0">
                          {/* General metadata box */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg text-[9.5px] font-medium leading-tight select-none shrink-0">
                            <div className="col-span-2">
                              <span className="text-[7.5px] uppercase text-slate-400 font-extrabold block">Setor Responsável</span>
                              <strong className="text-slate-800 truncate block">
                                {batch.isGerenciaLote || batch.sectorId === 999 
                                  ? "⚡ Corte a Laser (Gerência)" 
                                  : (sector ? sector.name : "📦 Geral / Sem Setor")}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[7.5px] uppercase text-slate-400 font-extrabold block">Criação</span>
                              <strong className="text-slate-800">
                                {new Date(batch.createdAt).toLocaleDateString("pt-BR")}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[7.5px] uppercase text-slate-400 font-extrabold block">Total Produzir</span>
                              <span className="text-blue-800 font-black">
                                {p.totalQuantity} <span className="text-[8px] font-bold">un</span>
                              </span>
                            </div>
                            <div className="col-span-2 border-t border-dashed border-slate-200 pt-1 mt-1">
                              <span className="text-[7.5px] uppercase text-indigo-500 font-black block leading-none">PRAZO DE ENTREGA (PEDIDO)</span>
                              <strong className="text-indigo-700 text-[10px] font-black font-mono mt-1 block">
                                {p.orders.map(o => o.deliveryDate).filter(Boolean).sort()[0]?.split("-").reverse().join("/") || "Não Definido"}
                              </strong>
                            </div>
                            {item?.productionPoints && (
                              <div className="col-span-2 border-t border-slate-200 pt-1 mt-1.5 flex justify-between items-end">
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 block leading-none">PONTOS TOTAL</span>
                                  <span className="text-[10px] text-indigo-700 font-black font-mono leading-none">
                                    {(Number(item.productionPoints) * p.totalQuantity).toLocaleString("pt-BR")} pts
                                  </span>
                                </div>
                                <span className="text-[7px] text-slate-400 font-semibold mb-0.5 leading-none">
                                  ({item.productionPoints} pts/un)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Embedded drawing visualizer */}
                          <div 
                            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/30 rounded-lg p-1.5 overflow-hidden select-none relative"
                            style={{
                              minHeight: "150px"
                            }}
                          >
                            {item?.imageUrl ? (
                              <div className="flex flex-col items-center justify-center w-full h-full p-0.5 relative">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="max-w-full max-h-[130px] object-contain rounded-lg shadow-sm border border-slate-100"
                                />
                                <span className="absolute bottom-1 text-[6.5px] text-slate-400 font-extrabold uppercase bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs tracking-wider leading-none">
                                  DESENHO TÉCNICO
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-450 text-center p-2 gap-1">
                                <Layers size={18} className="text-slate-400 opacity-70" />
                                <div>
                                  <p className="font-extrabold text-[8px] text-slate-700 uppercase tracking-wide leading-none">
                                    Ficha Visual manual
                                  </p>
                                  <p className="text-[7.5px] text-slate-400 max-w-[130px] leading-tight mt-1">
                                    Espaço para croqui manual ou colagem visual.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dotted half-page delimiter separator */}
                    {indexInChunk === 0 && chunk.length === 2 && (
                      <div className="w-full flex items-center justify-center gap-2 py-1 my-1 select-none opacity-50 shrink-0">
                        <div className="flex-1 border-t border-dashed border-slate-400"></div>
                        <span className="text-[8px] font-mono font-bold uppercase text-slate-500 tracking-wider bg-white px-2 leading-none flex items-center gap-1 shrink-0">
                          ✂️ SERRA DE CORTE DE FOLHA (DOBRA OU CORTE AO MEIO)
                        </span>
                        <div className="flex-1 border-t border-dashed border-slate-400"></div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
});

AcompanhamentoPrintSheet.displayName = "AcompanhamentoPrintSheet";

