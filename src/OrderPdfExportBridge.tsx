import React, { useEffect, useMemo, useState } from "react";
import { useDatabase } from "./useDatabase";
import type { User } from "./types";
import { findCustomerForOrder } from "./searchUtils";

type PrintFilter = "NAO_IMPRESSOS" | "IMPRESSOS" | "TODOS";

type ExportCommand = {
  pedidoInicial: number | string;
  pedidoFinal: number | string;
  statusImpressao?: string;
  layoutPdf?: string;
  umPedidoPorArquivo?: boolean;
  imprimirFisicamente?: boolean;
};

type AutomationWindow = Window & {
  __imperioPdfAutomation?: {
    version: number;
    getBatch: (command: ExportCommand) => Promise<any>;
    prepareOrder: (orderCode: string) => Promise<any>;
    waitForOrder: (orderCode: string, timeoutMs?: number) => Promise<boolean>;
    markSaved: (orderCode: string) => Promise<void>;
    closePreview: () => void;
  };
};

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
      .replace(/^pedidos\s+/i, "")
      .replace(/\s+-?\s*representante\s*$/i, "")
      .replace(/^representante\s+-?\s*/i, "")
      .trim(),
    "",
  );
}

function comparableOrderNumber(code: string) {
  const digits = String(code || "").replace(/\D/g, "");
  return digits ? Number(digits) : Number.NaN;
}

function normalizePrintFilter(raw?: string): PrintFilter {
  const value = String(raw || "NAO_IMPRESSOS")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (value.includes("NAO") && value.includes("IMPRESS")) return "NAO_IMPRESSOS";
  if (value.includes("IMPRESS")) return "IMPRESSOS";
  return "TODOS";
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

function AutomationController({ currentUser }: { currentUser: User }) {
  const db = useDatabase(currentUser);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const order of db.orders || []) {
      if (!order?.orderCode) continue;
      const code = String(order.orderCode);
      const group = groups.get(code) || [];
      group.push(order);
      groups.set(code, group);
    }
    return groups;
  }, [db.orders]);

  useEffect(() => {
    const win = window as AutomationWindow;

    win.__imperioPdfAutomation = {
      version: 2,

      async getBatch(command: ExportCommand) {
        const start = Number(command.pedidoInicial);
        const end = Number(command.pedidoFinal);
        if (!Number.isFinite(start) || !Number.isFinite(end)) {
          throw new Error("Faixa de pedidos inválida.");
        }

        const min = Math.min(start, end);
        const max = Math.max(start, end);
        const filter = normalizePrintFilter(command.statusImpressao);
        const selected = Array.from(groupedOrders.entries())
          .filter(([code]) => {
            const numeric = comparableOrderNumber(code);
            return Number.isFinite(numeric) && numeric >= min && numeric <= max;
          })
          .sort((a, b) => comparableOrderNumber(a[0]) - comparableOrderNumber(b[0]));

        const eligible: any[] = [];
        const ignored: any[] = [];

        for (const [code, group] of selected) {
          const isPrinted = group.some((order) => Boolean(order.isPrinted));
          if (filter === "NAO_IMPRESSOS" && isPrinted) {
            ignored.push({ pedido: code, motivo: "Pedido já impresso" });
            continue;
          }
          if (filter === "IMPRESSOS" && !isPrinted) {
            ignored.push({ pedido: code, motivo: "Pedido ainda não impresso" });
            continue;
          }

          const representative = resolveRepresentative(group, db.users || db.allUsers || []);
          if (!representative) {
            ignored.push({ pedido: code, motivo: "Representante não identificado" });
            continue;
          }

          const activeOrder = group.find((order) => order.status !== "CANCELADO") || group[0];
          eligible.push({
            pedido: code,
            representante: representative,
            pastaRepresentante: `Pedidos ${representative}`,
            arquivo: buildSystemFilename(code, activeOrder, db.customers || []),
          });
        }

        return {
          totalEncontrados: selected.length,
          eligible,
          ignored,
        };
      },

      async prepareOrder(orderCode: string) {
        const code = String(orderCode);
        const group = groupedOrders.get(code);
        if (!group?.length) throw new Error(`Pedido ${code} não encontrado.`);

        const representative = resolveRepresentative(group, db.users || db.allUsers || []);
        if (!representative) throw new Error(`Representante do pedido ${code} não identificado.`);

        const activeOrder = group.find((order) => order.status !== "CANCELADO") || group[0];
        const fileName = buildSystemFilename(code, activeOrder, db.customers || []);

        closePrintModal();
        window.dispatchEvent(
          new CustomEvent("print-order", {
            detail: {
              isBatch: true,
              orderCodes: [code],
              printSheetSize: "full",
            },
          }),
        );

        return {
          pedido: code,
          representante: representative,
          pastaRepresentante: `Pedidos ${representative}`,
          arquivo: fileName,
        };
      },

      async waitForOrder(orderCode: string, timeoutMs = 10000) {
        const code = String(orderCode);
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
          const sheet = document.getElementById("print-order-sheet");
          const card = sheet?.querySelector(".full-sheet-order-card");
          if (sheet?.textContent?.includes(`#${code}`) && card) {
            const images = Array.from(card.querySelectorAll("img"));
            if (images.every((img) => (img as HTMLImageElement).complete)) return true;
          }
          await sleep(100);
        }
        throw new Error(`Espelho do pedido ${code} não ficou pronto a tempo.`);
      },

      async markSaved(orderCode: string) {
        const code = String(orderCode);
        const group = groupedOrders.get(code);
        if (!group?.length) throw new Error(`Pedido ${code} não encontrado para atualização.`);

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
      },

      closePreview() {
        closePrintModal();
      },
    };

    window.dispatchEvent(new CustomEvent("imperio-pdf-automation-ready"));

    return () => {
      delete win.__imperioPdfAutomation;
    };
  }, [groupedOrders, db.users, db.allUsers, db.customers, db.updateOrders]);

  return null;
}

export function OrderPdfExportBridge() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const syncUser = () => {
      try {
        const raw = localStorage.getItem("imperio_logged_user");
        const next = raw ? (JSON.parse(raw) as User) : null;
        setCurrentUser((previous) => {
          if (!next && !previous) return previous;
          if (!next) return null;
          if (
            previous?.id === next.id &&
            previous?.tenantId === next.tenantId &&
            previous?.role === next.role
          ) {
            return previous;
          }
          return next;
        });
      } catch {
        setCurrentUser(null);
      }
    };

    syncUser();
    const timer = window.setInterval(syncUser, 750);
    return () => window.clearInterval(timer);
  }, []);

  if (!currentUser) return null;
  return <AutomationController currentUser={currentUser} />;
}
