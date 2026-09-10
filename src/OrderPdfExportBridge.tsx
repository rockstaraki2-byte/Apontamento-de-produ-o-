import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { CheckCircle2, FileDown, FolderOpen, X, AlertTriangle } from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { User } from "./types";
import { findCustomerForOrder } from "./searchUtils";

type PrintFilter = "NAO_IMPRESSOS" | "IMPRESSOS" | "TODOS";

type ExportedItem = {
  pedido: string;
  representante: string;
  arquivo: string;
};

type IgnoredItem = {
  pedido: string;
  motivo: string;
};

type ErrorItem = {
  pedido: string;
  erro: string;
};

type ExportSummary = {
  sucesso: boolean;
  processados: ExportedItem[];
  ignorados: IgnoredItem[];
  erros: ErrorItem[];
};

const DEFAULT_ROOT_PATH = "C:\\Users\\Micro\\Documents\\Exports Faturamento TekSystem";
const ALLOWED_ROLES = new Set(["ADMIN", "PCP", "GERENCIA"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeWindowsName(value: string, fallback: string) {
  const cleaned = (value || "")
    .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  return cleaned || fallback;
}

function normalizeRepresentativeName(raw: string) {
  return sanitizeWindowsName(
    (raw || "")
      .replace(/\s+-?\s*representante\s*$/i, "")
      .replace(/^representante\s+-?\s*/i, "")
      .trim(),
    "Sem Representante",
  );
}

function comparableOrderNumber(code: string) {
  const digits = String(code || "").replace(/\D/g, "");
  return digits ? Number(digits) : Number.NaN;
}

async function waitForRenderedOrder(code: string, timeoutMs = 8000): Promise<HTMLElement> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const sheet = document.getElementById("print-order-sheet") as HTMLElement | null;
    if (sheet && sheet.textContent?.includes(`#${code}`)) {
      const card = sheet.querySelector(".full-sheet-order-card") as HTMLElement | null;
      if (card) return card;
    }
    await sleep(80);
  }
  throw new Error("O espelho do pedido não ficou disponível para exportação.");
}

async function waitUntilPrintModalClosed(timeoutMs = 2500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!document.getElementById("print-order-sheet")) return;
    await sleep(60);
  }
}

function closePrintModal() {
  const sheet = document.getElementById("print-order-sheet");
  const overlay = sheet?.closest(".fixed.inset-0") as HTMLElement | null;
  if (!overlay) return;

  const buttons = Array.from(overlay.querySelectorAll("button")) as HTMLButtonElement[];
  const closeButton =
    buttons.find((button) => button.textContent?.trim() === "Fechar") ||
    buttons.find((button) => button.textContent?.trim() === "✕");
  closeButton?.click();
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 1800);
        }),
    ),
  );
}

async function orderCardToPdfBlob(sourceCard: HTMLElement): Promise<Blob> {
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed",
    top: "0px",
    left: "-12000px",
    width: "794px",
    background: "#ffffff",
    zIndex: "-10000",
    pointerEvents: "none",
  });

  const clone = sourceCard.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    width: "794px",
    maxWidth: "794px",
    boxSizing: "border-box",
    margin: "0",
    padding: "23px 30px",
    gap: "13px",
    borderRadius: "0",
    boxShadow: "none",
    background: "#ffffff",
    pageBreakAfter: "auto",
    breakAfter: "auto",
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    await waitForImages(clone);
    await sleep(120);

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
    });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const a4Width = 210;
    const a4Height = 297;
    const sourceRatio = canvas.width / canvas.height;
    let drawWidth = a4Width;
    let drawHeight = drawWidth / sourceRatio;

    if (drawHeight > a4Height) {
      drawHeight = a4Height;
      drawWidth = drawHeight * sourceRatio;
    }

    const x = (a4Width - drawWidth) / 2;
    const y = 0;
    const imageData = canvas.toDataURL("image/jpeg", 0.96);
    doc.addImage(imageData, "JPEG", x, y, drawWidth, drawHeight, undefined, "FAST");
    return doc.output("blob");
  } finally {
    wrapper.remove();
  }
}

function buildSystemFilename(orderCode: string, order: any, customers: any[]) {
  const customer = order ? findCustomerForOrder(order, customers) : null;
  const rawClientName =
    customer?.tradeName?.trim() ||
    customer?.name?.trim() ||
    order?.customerName?.trim() ||
    "";
  const cleanClientName = rawClientName
    .replace(/^\s*[\[\(]?\s*\d+\s*[\]\)]?\s*[-–—]?\s*/, "")
    .trim();

  const title = cleanClientName
    ? `Pedido ${orderCode} - ${cleanClientName}`
    : `Pedido ${orderCode}`;

  return `${sanitizeWindowsName(title, `Pedido ${orderCode}`)}.pdf`;
}

function resolveRepresentative(group: any[], users: any[]) {
  const byName = group.find((order) => order.representativeName)?.representativeName;
  if (byName) return normalizeRepresentativeName(byName);

  const repId = group.find((order) => order.representativeId)?.representativeId;
  const user = repId ? users.find((candidate) => candidate.id === repId) : null;
  return user?.name ? normalizeRepresentativeName(user.name) : "";
}

function OrderPdfExportPanel({ currentUser }: { currentUser: User }) {
  const db = useDatabase(currentUser);
  const [open, setOpen] = useState(false);
  const [pedidoInicial, setPedidoInicial] = useState("");
  const [pedidoFinal, setPedidoFinal] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<PrintFilter>("NAO_IMPRESSOS");
  const [rootPathLabel, setRootPathLabel] = useState(
    () => localStorage.getItem("order_pdf_export_root_path") || DEFAULT_ROOT_PATH,
  );
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [directoryName, setDirectoryName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ atual: 0, total: 0, pedido: "" });
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const cancelRequestedRef = useRef(false);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const order of db.orders || []) {
      if (!order?.orderCode) continue;
      const key = String(order.orderCode);
      const current = groups.get(key) || [];
      current.push(order);
      groups.set(key, current);
    }
    return groups;
  }, [db.orders]);

  const selectDirectory = async () => {
    const picker = (window as any).showDirectoryPicker;
    if (typeof picker !== "function") {
      alert("Este navegador não oferece acesso direto a pastas. Use Chrome ou Edge atualizado no Windows.");
      return;
    }

    try {
      const handle = await picker({ mode: "readwrite", id: "apontamento-order-pdf-export" });
      setDirectoryHandle(handle);
      setDirectoryName(handle.name || "Pasta selecionada");
      setSummary(null);
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error("Erro ao selecionar pasta de exportação:", error);
        alert("Não foi possível acessar a pasta selecionada.");
      }
    }
  };

  const getEligibleGroups = () => {
    const start = Number(pedidoInicial);
    const end = Number(pedidoFinal);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error("Informe números inicial e final válidos.");
    }

    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const selected = Array.from(groupedOrders.entries())
      .filter(([code]) => {
        const numeric = comparableOrderNumber(code);
        return Number.isFinite(numeric) && numeric >= min && numeric <= max;
      })
      .sort((a, b) => comparableOrderNumber(a[0]) - comparableOrderNumber(b[0]));

    return selected;
  };

  const runExport = async () => {
    if (!directoryHandle) {
      alert("Selecione primeiro a pasta principal de exportação.");
      return;
    }

    localStorage.setItem("order_pdf_export_root_path", rootPathLabel);

    let selectedGroups: Array<[string, any[]]> = [];
    try {
      selectedGroups = getEligibleGroups();
    } catch (error: any) {
      alert(error?.message || "Faixa de pedidos inválida.");
      return;
    }

    if (selectedGroups.length === 0) {
      setSummary({ sucesso: true, processados: [], ignorados: [], erros: [] });
      return;
    }

    const result: ExportSummary = {
      sucesso: true,
      processados: [],
      ignorados: [],
      erros: [],
    };

    setSummary(null);
    setIsExporting(true);
    cancelRequestedRef.current = false;
    setProgress({ atual: 0, total: selectedGroups.length, pedido: "" });

    try {
      for (let index = 0; index < selectedGroups.length; index++) {
        const [code, group] = selectedGroups[index];
        if (cancelRequestedRef.current) {
          result.ignorados.push({ pedido: code, motivo: "Exportação cancelada pelo usuário" });
          continue;
        }

        setProgress({ atual: index + 1, total: selectedGroups.length, pedido: code });

        const isPrinted = group.some((order) => Boolean(order.isPrinted));
        if (statusFiltro === "NAO_IMPRESSOS" && isPrinted) {
          result.ignorados.push({ pedido: code, motivo: "Pedido já impresso" });
          continue;
        }
        if (statusFiltro === "IMPRESSOS" && !isPrinted) {
          result.ignorados.push({ pedido: code, motivo: "Pedido ainda não impresso" });
          continue;
        }

        const representative = resolveRepresentative(group, db.users || db.allUsers || []);
        if (!representative) {
          result.ignorados.push({ pedido: code, motivo: "Representante não identificado" });
          continue;
        }

        try {
          closePrintModal();
          await waitUntilPrintModalClosed();

          window.dispatchEvent(
            new CustomEvent("print-order", {
              detail: {
                isBatch: true,
                orderCodes: [code],
                printSheetSize: "full",
              },
            }),
          );

          const card = await waitForRenderedOrder(code);
          const pdfBlob = await orderCardToPdfBlob(card);

          const activeOrder =
            group.find((order) => order.status !== "CANCELADO") || group[0];
          const fileName = buildSystemFilename(code, activeOrder, db.customers || []);
          const repFolderName = `Pedidos ${representative}`;
          const repFolder = await directoryHandle.getDirectoryHandle(repFolderName, { create: true });
          const fileHandle = await repFolder.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable({ keepExistingData: false });
          await writable.write(pdfBlob);
          await writable.close();

          const now = Date.now();
          const updated = group.map((order) => {
            const currentCount = order.printCount ?? (order.isPrinted ? 1 : 0);
            return {
              ...order,
              isPrinted: true,
              printedAt: now,
              printCount: currentCount + 1,
            };
          });
          await Promise.resolve(db.updateOrders(updated));

          const logicalPath = `${rootPathLabel.replace(/[\\/]+$/g, "")}\\${repFolderName}\\${fileName}`;
          result.processados.push({
            pedido: code,
            representante: representative,
            arquivo: logicalPath,
          });
        } catch (error: any) {
          console.error(`Erro ao exportar pedido ${code}:`, error);
          result.erros.push({
            pedido: code,
            erro: error?.message || "Erro desconhecido durante a exportação",
          });
          result.sucesso = false;
        } finally {
          closePrintModal();
          await waitUntilPrintModalClosed();
        }
      }
    } finally {
      setIsExporting(false);
      setProgress((current) => ({ ...current, pedido: "" }));
      setSummary(result);
      window.dispatchEvent(new CustomEvent("order-pdf-export-complete", { detail: result }));
      window.dispatchEvent(
        new CustomEvent("app_toast", {
          detail: {
            title: result.erros.length ? "Exportação concluída com alertas" : "Exportação de PDFs concluída",
            message: `${result.processados.length} processado(s), ${result.ignorados.length} ignorado(s), ${result.erros.length} erro(s).`,
            type: result.erros.length ? "warning" : "success",
          },
        }),
      );
    }
  };

  const canUseFileSystem = typeof (window as any).showDirectoryPicker === "function";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-[120] flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-xl hover:bg-slate-800 active:scale-95 transition"
        title="Exportar pedidos individualmente em PDF por representante"
      >
        <FileDown size={16} /> Exportar PDFs
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                  <FileDown size={18} /> Exportar pedidos em PDF
                </h2>
                <p className="mt-1 text-[10px] font-medium text-slate-300">
                  Um pedido por arquivo • Folha Inteira • pastas por representante
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isExporting && setOpen(false)}
                disabled={isExporting}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pedido inicial</span>
                  <input
                    value={pedidoInicial}
                    onChange={(e) => setPedidoInicial(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="67277"
                    disabled={isExporting}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pedido final</span>
                  <input
                    value={pedidoFinal}
                    onChange={(e) => setPedidoFinal(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="67279"
                    disabled={isExporting}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Status de impressão</span>
                  <select
                    value={statusFiltro}
                    onChange={(e) => setStatusFiltro(e.target.value as PrintFilter)}
                    disabled={isExporting}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="NAO_IMPRESSOS">Não Impresso</option>
                    <option value="IMPRESSOS">Já Impresso</option>
                    <option value="TODOS">Todos</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Layout PDF</span>
                  <input
                    value="Folha Inteira (A4)"
                    readOnly
                    className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pasta principal / caminho do relatório</span>
                    <input
                      value={rootPathLabel}
                      onChange={(e) => setRootPathLabel(e.target.value)}
                      disabled={isExporting}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={selectDirectory}
                    disabled={isExporting || !canUseFileSystem}
                    className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <FolderOpen size={15} /> Selecionar pasta
                  </button>
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                  {directoryHandle ? (
                    <span className="font-bold text-emerald-700">✓ Pasta autorizada no navegador: {directoryName}</span>
                  ) : canUseFileSystem ? (
                    <span>Selecione a pasta <strong>Exports Faturamento TekSystem</strong> para permitir a gravação dos PDFs.</span>
                  ) : (
                    <span className="font-bold text-rose-700">Este navegador não suporta gravação direta em pastas. Abra o sistema no Chrome ou Edge.</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[10px] font-bold text-emerald-900 sm:grid-cols-3">
                <span>✓ Um pedido por arquivo</span>
                <span>✓ Sobrescrever arquivo existente</span>
                <span>✓ Não imprimir fisicamente</span>
              </div>

              {isExporting && (
                <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-extrabold text-indigo-700">
                    <span>Processando pedido {progress.pedido || "..."}</span>
                    <span>{progress.atual}/{progress.total}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${progress.total ? Math.round((progress.atual / progress.total) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Cada pedido conclui geração, gravação e atualização do status antes de o próximo iniciar.
                  </p>
                </div>
              )}

              {summary && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 text-xs font-black text-emerald-700">
                      <CheckCircle2 size={15} /> {summary.processados.length} processado(s)
                    </span>
                    <span className="flex items-center gap-1 text-xs font-black text-amber-700">
                      <AlertTriangle size={15} /> {summary.ignorados.length} ignorado(s)
                    </span>
                    <span className="text-xs font-black text-rose-700">{summary.erros.length} erro(s)</span>
                  </div>

                  {summary.processados.length > 0 && (
                    <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg bg-emerald-50 p-3">
                      {summary.processados.map((item) => (
                        <div key={`${item.pedido}-${item.arquivo}`} className="text-[10px] text-emerald-950">
                          <strong>Pedido {item.pedido}</strong> • {item.representante}
                          <div className="break-all font-mono text-[9px] text-emerald-800">{item.arquivo}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {summary.ignorados.length > 0 && (
                    <div className="rounded-lg bg-amber-50 p-3 text-[10px] text-amber-950">
                      {summary.ignorados.map((item, index) => (
                        <div key={`${item.pedido}-${index}`}>Pedido {item.pedido}: {item.motivo}</div>
                      ))}
                    </div>
                  )}

                  {summary.erros.length > 0 && (
                    <div className="rounded-lg bg-rose-50 p-3 text-[10px] text-rose-950">
                      {summary.erros.map((item, index) => (
                        <div key={`${item.pedido}-${index}`}>Pedido {item.pedido}: {item.erro}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
              {isExporting ? (
                <button
                  type="button"
                  onClick={() => { cancelRequestedRef.current = true; }}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-100"
                >
                  Cancelar após o atual
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={runExport}
                    disabled={!directoryHandle || !pedidoInicial || !pedidoFinal}
                    className="flex items-center gap-2 rounded-lg bg-[#00b14f] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#009e46] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <FileDown size={15} /> Exportar pedidos
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OrderPdfExportBridge() {
  const [sessionState, setSessionState] = useState(() => ({
    userJson: localStorage.getItem("imperio_logged_user") || "",
    activeTenantId: localStorage.getItem("active_tenant_id") || "imperio",
    pathname: window.location.pathname,
  }));

  useEffect(() => {
    const refresh = () => {
      const next = {
        userJson: localStorage.getItem("imperio_logged_user") || "",
        activeTenantId: localStorage.getItem("active_tenant_id") || "imperio",
        pathname: window.location.pathname,
      };
      setSessionState((current) =>
        current.userJson === next.userJson &&
        current.activeTenantId === next.activeTenantId &&
        current.pathname === next.pathname
          ? current
          : next,
      );
    };

    refresh();
    const interval = window.setInterval(refresh, 500);
    window.addEventListener("popstate", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("popstate", refresh);
    };
  }, []);

  let currentUser: User | null = null;
  try {
    currentUser = sessionState.userJson ? JSON.parse(sessionState.userJson) : null;
  } catch {
    currentUser = null;
  }

  if (!currentUser || sessionState.pathname !== "/pedidos" || !ALLOWED_ROLES.has(currentUser.role)) {
    return null;
  }

  return (
    <OrderPdfExportPanel
      key={`${currentUser.id}:${currentUser.tenantId || "imperio"}:${sessionState.activeTenantId}`}
      currentUser={currentUser}
    />
  );
}
