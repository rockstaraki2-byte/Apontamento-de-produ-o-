import { Fragment, jsx, jsxs } from "react/jsx-runtime";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  BrowserRouter,
  Routes,
  Route,
  Link
} from "react-router-dom";
import {
  Box,
  Home,
  List,
  ShoppingCart,
  LogOut,
  BarChart2,
  Activity,
  ClipboardList,
  AlertCircle,
  Paintbrush,
  Scissors,
  Bell,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Crown,
  History,
  Users,
  Hammer,
  Beaker,
  X,
  FileDown,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Check,
  HelpCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { useDatabase } from "./useDatabase";
import { ProducaoScreen } from "./ProducaoScreen";
import { PinturaScreen } from "./PinturaScreen";
import { CorteLaserScreen } from "./CorteLaserScreen";
import { StatusScreen } from "./StatusScreen";
import { RelatoriosScreen } from "./RelatoriosScreen";
import { EmbalagemScreen } from "./EmbalagemScreen";
import { usePushNotifications } from "./usePushNotifications";
import { EstoqueScreen } from "./EstoqueScreen";
import { EstoqueNestingScreen } from "./EstoqueNestingScreen";
import { RepresentanteScreen } from "./RepresentanteScreen";
import { UploadNestScreen } from "./UploadNestScreen";
import { HistoricoProducaoScreen } from "./HistoricoProducaoScreen";
import { PCPScreen } from "./PCPScreen";
import { GestaoClientesScreen } from "./GestaoClientesScreen";
import { BanhoQuimicoScreen } from "./BanhoQuimicoScreen";
import { PrensaEduardoScreen } from "./PrensaEduardoScreen";
import { PrensaRafaelScreen } from "./PrensaRafaelScreen";
import { InjetoraScreen } from "./InjetoraScreen";
import { normalizeString } from "./searchUtils";
import {
  ScreenLayout,
  ScreenHeader,
  ScrollContainer
} from "./components/Layout";
import { EvolucaoEmbalagemTab } from "./EvolucaoEmbalagemTab";
function NavLink({
  to,
  icon,
  label
}) {
  return /* @__PURE__ */ jsxs(
    Link,
    {
      to,
      className: "flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[48px] text-gray-500 hover:text-blue-600 active:bg-blue-50 active:text-blue-700 rounded-lg transition-colors shrink-0",
      children: [
        icon,
        /* @__PURE__ */ jsx("span", { className: "text-xs mt-1 font-medium", children: label })
      ]
    }
  );
}
function Welcome({
  currentUser,
  db
}) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [infoModalData, setInfoModalData] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswer, setAiAnswer] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState(null);
  const askAi = async () => {
    if (!aiPrompt.trim()) return;
    setLoadingAi(true);
    setAiError(null);
    setAiAnswer(null);
    const currentDateStr = (/* @__PURE__ */ new Date()).toISOString();
    const ordersPayload = db.orders.slice(0, 100).map((o) => ({
      id: o.id,
      customerName: o.customerName,
      status: o.status,
      itemId: o.itemId,
      totalQuantity: o.totalQuantity,
      producedQuantity: o.producedQuantity
    }));
    try {
      const dbInfoStr = JSON.stringify(ordersPayload);
      const finalPrompt = `Hoje \xE9 ${currentDateStr}. Baseado nas informa\xE7\xF5es do sistema de produ\xE7\xE3o:

${dbInfoStr}

Responda em formato Markdown (seja bem claro, conciso e educado). A pergunta do operador ou gerente \xE9: "${aiPrompt}"`;
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          currentDate: currentDateStr,
          orders: ordersPayload
        })
      });
      let data = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (jsonErr) {
        console.error("Erro ao ler JSON da resposta:", jsonErr);
        data = {
          success: false,
          error: "Formato de resposta do servidor inv\xE1lido."
        };
      }
      if (data.success) {
        setAiAnswer(data.answer);
      } else {
        setAiError(data.error || "Erro ao consultar o assistente de IA.");
      }
    } catch (err) {
      console.error(err);
      setAiError("Ocorreu um erro ao conectar com o servidor.");
    } finally {
      setLoadingAi(false);
    }
  };
  const alerts = React.useMemo(() => {
    const isRomarioOrAlessandra = currentUser.name.toLowerCase().includes("romario") || currentUser.name.toLowerCase().includes("alessandra");
    if (isRomarioOrAlessandra) return [];
    if (currentUser.role !== "ADMIN" && currentUser.role !== "GERENCIA" && currentUser.role !== "LEITURA" && currentUser.role !== "PCP")
      return [];
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    return db.orders.filter((o) => {
      if (o.status === "EMBALADO" || o.status === "FATURADO") return false;
      const d = new Date(o.deliveryDate);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      return d.getTime() <= today.getTime();
    });
  }, [currentUser, db.orders]);
  const delayedOrders = React.useMemo(() => {
    const isRomarioOrAlessandra = currentUser.name.toLowerCase().includes("romario") || currentUser.name.toLowerCase().includes("alessandra");
    if (isRomarioOrAlessandra) return [];
    if (currentUser.role !== "ADMIN" && currentUser.role !== "GERENCIA" && currentUser.role !== "LEITURA" && currentUser.role !== "PCP")
      return [];
    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1e3;
    return db.orders.filter((o) => {
      return o.status === "PENDENTE" && o.createdAt < fortyEightHoursAgo;
    });
  }, [currentUser, db.orders]);
  const unreadNotifications = db.notifications.filter((n) => {
    if (n.read) return false;
    if (n.recipientId && n.recipientId !== currentUser?.id) {
      return false;
    }
    if (n.recipientId === currentUser?.id) return true;
    if (currentUser?.id === "projetista_marcos" || currentUser?.role === "PROJETISTA") {
      const msg = n.message.toLowerCase();
      const isLaser = msg.includes("laser") || msg.includes("corte") || msg.includes("nesting") || msg.includes("chapa");
      const isOtherSec = msg.includes("prensa") || msg.includes("injetora") || msg.includes("pintura") || msg.includes("banho") || msg.includes("embalagem") || msg.includes("solda");
      return isLaser && !isOtherSec;
    }
    return true;
  });
  const handleNotificationClick = (n) => {
    const match = n.message.match(/\b\d{4,8}\b/);
    let found = null;
    if (match) {
      found = db.orders.find((o) => o.orderCode === match[0]);
    }
    if (found) {
      setSelectedOrder(found);
    } else {
      const orderWithCustomer = db.orders.find(
        (o) => n.message.toLowerCase().includes(o.customerName.toLowerCase())
      );
      if (orderWithCustomer) {
        setSelectedOrder(orderWithCustomer);
      } else {
        setInfoModalData({
          title: "Notifica\xE7\xE3o Informativa",
          body: /* @__PURE__ */ jsxs("div", { className: "space-y-4 text-left", children: [
            /* @__PURE__ */ jsx("p", { className: "text-gray-750 font-medium text-sm border-l-4 border-blue-500 pl-3 py-1 bg-gray-50 rounded", children: n.message }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-500", children: [
              "Registrada em: ",
              new Date(n.createdAt).toLocaleString()
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 italic mt-2", children: "Dica: Marque como lida na listagem se este aviso j\xE1 tiver sido processado." })
          ] })
        });
      }
    }
  };
  const getOrderStatusBadgeColor = (status) => {
    switch (status) {
      case "PENDENTE":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "TEM_ESTOQUE":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "EM_PRODUCAO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PRODUZIDO":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "EM_CORTE":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "CORTADO":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "EM_PINTURA":
        return "bg-amber-500/10 text-amber-650 border-amber-500/20";
      case "PINTADO":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "EMBALANDO":
        return "bg-green-100 text-green-800 border-green-200";
      case "EMBALADO":
        return "bg-lime-105 text-lime-800 border-lime-200";
      case "FATURADO":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  const selectedOrderLogs = React.useMemo(() => {
    if (!selectedOrder) return [];
    return db.logs.filter((l) => l.orderId === selectedOrder.id).sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedOrder, db.logs]);
  const isAiEnabledForUser = false;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col flex-1 items-center justify-center p-4 text-center", children: [
    /* @__PURE__ */ jsxs("h2", { className: "text-2xl font-bold text-gray-800", children: [
      "Bem-vindo, ",
      currentUser.name,
      "!"
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-gray-500 mt-2 mb-4", children: "Escolha uma op\xE7\xE3o no menu inferior." }),
    (currentUser.role === "ADMIN" || currentUser.role === "GERENCIA" || currentUser.role === "LEITURA" || currentUser.role === "PCP" || currentUser.role === "REPRESENTANTE" || currentUser.role === "PROJETISTA") && unreadNotifications.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-6 text-left w-full max-w-md bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-blue-700 font-bold mb-2", children: [
        /* @__PURE__ */ jsx(Bell, { size: 20 }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Notifica\xE7\xF5es (",
          unreadNotifications.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-600 mb-2", children: "Dica: Clique em uma notifica\xE7\xE3o para ver os detalhes completos do pedido associado." }),
      /* @__PURE__ */ jsx("ul", { className: "text-sm text-blue-900 flex flex-col gap-2 max-h-48 overflow-auto", children: unreadNotifications.map((n) => /* @__PURE__ */ jsxs(
        "li",
        {
          onClick: () => handleNotificationClick(n),
          className: "bg-white p-3 rounded shadow-xs border border-blue-100 flex flex-col gap-2 cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition-all duration-150",
          children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium text-gray-700", children: n.message }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[10px] mt-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-gray-400", children: new Date(n.createdAt).toLocaleString() }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    db.markNotificationRead(n.id);
                  },
                  className: "text-blue-600 font-semibold hover:underline bg-blue-50 px-2 py-0.5 rounded cursor-pointer",
                  children: "Marcar como lido"
                }
              )
            ] })
          ]
        },
        n.id
      )) })
    ] }),
    alerts.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-8 text-left w-full max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-red-700 font-bold mb-2", children: [
        /* @__PURE__ */ jsx(AlertCircle, { size: 20 }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Alerta de Atrasos/Entregas Hoje (",
          alerts.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-red-600 mb-2", children: "Clique em um alerta abaixo para abrir a ficha do pedido." }),
      /* @__PURE__ */ jsx("ul", { className: "text-sm text-red-900 flex flex-col gap-2 max-h-48 overflow-auto", children: alerts.map((a) => /* @__PURE__ */ jsxs(
        "li",
        {
          onClick: () => setSelectedOrder(a),
          className: "bg-white p-3 rounded shadow-xs border border-red-100 flex flex-col gap-1 cursor-pointer hover:bg-red-50/40 hover:border-red-300 transition-all duration-150",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsxs("span", { className: "font-semibold text-gray-800", children: [
                "C\xF3d: ",
                a.orderCode
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-xs text-red-600 font-semibold bg-red-100/50 px-1.5 py-0.5 rounded", children: new Date(a.deliveryDate).toLocaleDateString() })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-600", children: [
              "Cliente: ",
              a.customerName
            ] })
          ]
        },
        a.id
      )) })
    ] }),
    delayedOrders.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-4 text-left w-full max-w-md bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-orange-700 font-bold mb-2", children: [
        /* @__PURE__ */ jsx(AlertCircle, { size: 20 }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Sem Iniciar Produ\xE7\xE3o h\xE1 > 48h (",
          delayedOrders.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-orange-600 mb-2", children: "Clique em um lote parado abaixo para ver seu progresso de logs." }),
      /* @__PURE__ */ jsx("ul", { className: "text-sm text-orange-900 flex flex-col gap-2 max-h-48 overflow-auto", children: delayedOrders.map((a) => /* @__PURE__ */ jsxs(
        "li",
        {
          onClick: () => setSelectedOrder(a),
          className: "bg-white p-3 rounded shadow-xs border border-orange-100 flex flex-col gap-1 cursor-pointer hover:bg-orange-50/40 hover:border-orange-300 transition-all duration-150",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsxs("span", { className: "font-semibold text-gray-800", children: [
                "C\xF3d: ",
                a.orderCode
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-xs text-orange-600 font-semibold bg-orange-100/50 px-1.5 py-0.5 rounded", children: new Date(a.createdAt).toLocaleDateString() })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-600", children: [
              "Cliente: ",
              a.customerName
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-400 italic", children: "Status: Parado em Pendente" })
          ]
        },
        a.id
      )) })
    ] }),
    selectedOrder && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 text-left animate-in zoom-in-95 duration-150", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-black text-white p-4 flex justify-between items-center border-b border-[#00b14f]/20", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Crown, { size: 20, className: "text-[#00b14f]" }),
          /* @__PURE__ */ jsxs("h3", { className: "font-bold text-lg tracking-tight", children: [
            "Ficha do Pedido: ",
            selectedOrder.orderCode
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setSelectedOrder(null),
            className: "text-gray-400 hover:text-white transition duration-150 text-xl font-bold px-2 py-1 rounded cursor-pointer",
            children: "\u2715"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-auto p-5 space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-4 rounded-lg border border-gray-200", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-gray-400 uppercase tracking-wider mb-2", children: "Informa\xE7\xF5es Gerais" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-x-4 gap-y-2 text-sm", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 block", children: "Cliente:" }),
              /* @__PURE__ */ jsx("strong", { className: "text-gray-800", children: selectedOrder.customerName })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 block", children: "Representante:" }),
              /* @__PURE__ */ jsx("strong", { className: "text-gray-800", children: selectedOrder.representativeName || "Venda Direta" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 block", children: "Data do Pedido:" }),
              /* @__PURE__ */ jsx("strong", { className: "text-gray-700", children: new Date(selectedOrder.createdAt).toLocaleDateString() })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 block", children: "Data Prometida:" }),
              /* @__PURE__ */ jsx("strong", { className: "text-red-650 font-semibold", children: selectedOrder.deliveryDate ? selectedOrder.deliveryDate.split("-").reverse().join("/") : "-" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 block", children: "Status Atual:" }),
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getOrderStatusBadgeColor(selectedOrder.status)}`,
                  children: selectedOrder.status || "PENDENTE"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 block", children: "Especifica\xE7\xF5es:" }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
                selectedOrder.isUrgent && /* @__PURE__ */ jsx("span", { className: "bg-red-100 text-red-800 border-red-200 border text-[9px] font-bold px-1.5 py-0.5 rounded", children: "\u26A0\uFE0F URGENTE" }),
                selectedOrder.isProgramacao && /* @__PURE__ */ jsx("span", { className: "bg-indigo-100 text-indigo-800 border-indigo-200 border text-[9px] font-bold px-1.5 py-0.5 rounded", children: "\u{1F4C8} PROGRAMA\xC7\xC3O" }),
                selectedOrder.isThirdPartyLaser && /* @__PURE__ */ jsx("span", { className: "bg-indigo-100 text-indigo-800 border-indigo-200 border text-[9px] font-bold px-1.5 py-0.5 rounded", children: "\u2699\uFE0F TERCEIRO LASER" }),
                !selectedOrder.isUrgent && !selectedOrder.isProgramacao && !selectedOrder.isThirdPartyLaser && /* @__PURE__ */ jsx("span", { className: "bg-gray-100 text-gray-650 border-gray-200 border text-[9px] font-medium px-1.5 py-0.5 rounded", children: "Padr\xE3o" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border border-gray-200 p-4 rounded-lg bg-emerald-50/20 border-emerald-500/10", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-gray-400 uppercase tracking-wider mb-2", children: "Item e Atributos" }),
          /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-450 block", children: "Produto Cadastrado:" }),
            /* @__PURE__ */ jsx("strong", { className: "text-gray-800 text-base", children: db.items.find((i) => i.id === selectedOrder.itemId)?.name || `ID Item: ${selectedOrder.itemId}` }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-100 text-xs font-mono text-gray-600", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-450 block", children: "Cor:" }),
                /* @__PURE__ */ jsx("span", { children: selectedOrder.color || "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-450 block", children: "Tamanho:" }),
                /* @__PURE__ */ jsx("span", { children: selectedOrder.size || "-" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-450 block", children: "Varia\xE7\xE3o:" }),
                /* @__PURE__ */ jsx("span", { children: selectedOrder.variation || "-" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border border-gray-200 p-4 rounded-lg bg-white space-y-3", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-gray-400 uppercase tracking-wider", children: "Acompanhamento de Produ\xE7\xE3o" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs font-bold text-gray-700", children: [
              /* @__PURE__ */ jsx("span", { children: "Meta Total do Lote:" }),
              /* @__PURE__ */ jsxs("span", { className: "text-indigo-700", children: [
                selectedOrder.totalQuantity,
                " Pe\xE7as"
              ] })
            ] }),
            [
              {
                label: "1. Corte Laser",
                qtyInStage: selectedOrder.cutQuantity || 0,
                color: "bg-indigo-600"
              },
              {
                label: "2. Produ\xE7\xE3o/Solda",
                qtyInStage: selectedOrder.producedQuantity || 0,
                color: "bg-blue-600"
              },
              {
                label: "3. Pintura",
                qtyInStage: selectedOrder.paintedQuantity || 0,
                color: "bg-amber-500"
              },
              {
                label: "4. Embalado",
                qtyInStage: selectedOrder.packedQuantity || 0,
                color: "bg-green-600"
              },
              {
                label: "5. Faturado/Entregue",
                qtyInStage: selectedOrder.invoicedQuantity || 0,
                color: "bg-gray-600"
              }
            ].map((phase, idx) => {
              const pct = Math.min(
                100,
                Math.max(
                  0,
                  phase.qtyInStage / selectedOrder.totalQuantity * 100
                )
              );
              return /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-semibold text-gray-700", children: phase.label }),
                  /* @__PURE__ */ jsxs("span", { className: "text-gray-500 font-medium", children: [
                    phase.qtyInStage,
                    " / ",
                    selectedOrder.totalQuantity,
                    " ",
                    "p\xE7s (",
                    Math.round(pct),
                    "%)"
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-100 rounded-full h-1.5 overflow-hidden", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: `h-full ${phase.color} transition-all duration-300`,
                    style: { width: `${pct}%` }
                  }
                ) })
              ] }, idx);
            })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border border-gray-200 p-4 rounded-lg bg-white space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(History, { size: 16, className: "text-gray-400" }),
            /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-gray-400 uppercase tracking-wider", children: "Hist\xF3rico de Opera\xE7\xF5es (Rastreabilidade)" })
          ] }),
          selectedOrderLogs.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 italic text-center py-2", children: "Nenhum registro de produ\xE7\xE3o inserido no banco hist\xF3rico ainda." }) : /* @__PURE__ */ jsx("div", { className: "space-y-3 max-h-52 overflow-auto pr-1", children: selectedOrderLogs.map((log) => {
            const opName = db.users.find((u) => u.id === log.operatorId)?.name || log.operatorId;
            let actionText = "";
            if (log.type === "CORTE_LASER")
              actionText = `Cortou ${log.quantityCut || 0} p\xE7s`;
            if (log.type === "PRODUCAO")
              actionText = `Processou ${log.quantityProcessed || 0} p\xE7s`;
            if (log.type === "PINTURA")
              actionText = `Pintou ${log.quantityPainted || 0} p\xE7s`;
            if (log.type === "EMBALAGEM")
              actionText = `Embalou ${log.quantityPacked || 0} p\xE7s`;
            if (log.type === "FATURAMENTO")
              actionText = `Faturou/Entregou ${log.quantityInvoiced || 0} p\xE7s`;
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: "text-xs border-l-2 border-[#00b14f] pl-3 py-1 space-y-0.5",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between font-semibold text-gray-700", children: [
                    /* @__PURE__ */ jsx("span", { children: log.type }),
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-400 font-normal", children: new Date(log.timestamp).toLocaleString() })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "text-gray-600 font-medium", children: [
                    actionText,
                    " \u2022 Operador:",
                    " ",
                    /* @__PURE__ */ jsx("span", { className: "font-semibold", children: opName })
                  ] }),
                  log.durationMillis > 0 && /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-gray-400", children: [
                    "Tempo ativo:",
                    " ",
                    Math.round(log.durationMillis / 6e4),
                    " min (",
                    Math.round(log.durationMillis / 1e3),
                    "s)"
                  ] })
                ]
              },
              log.id
            );
          }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-gray-50 p-3 border-t flex justify-end", children: /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setSelectedOrder(null),
          className: "bg-zinc-805 hover:bg-zinc-700 text-gray-700 hover:text-white border border-gray-300 font-bold py-1.5 px-4 rounded text-xs transition duration-150 cursor-pointer",
          children: "Fechar Ficha"
        }
      ) })
    ] }) }),
    infoModalData && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 text-left animate-in zoom-in-95 duration-150", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-black text-white p-4 flex justify-between items-center border-b border-[#00b14f]/20", children: [
        /* @__PURE__ */ jsx("h3", { className: "font-bold text-base tracking-tight", children: infoModalData.title }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setInfoModalData(null),
            className: "text-gray-400 hover:text-white transition duration-150 text-xl font-bold px-1 rounded cursor-pointer",
            children: "\u2715"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-5", children: infoModalData.body }),
      /* @__PURE__ */ jsx("div", { className: "bg-gray-50 p-3 border-t flex justify-end", children: /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setInfoModalData(null),
          className: "bg-[#00b14f] hover:bg-[#00913f] text-white font-bold py-1.5 px-4 rounded text-xs transition duration-150 cursor-pointer shadow-xs",
          children: "Fechar"
        }
      ) })
    ] }) })
  ] });
}
function LoginScreen({
  users,
  onLogin
}) {
  const [selectedID, setSelectedID] = useState(users[0]?.id || "");
  const [password, setPassword] = useState("");
  const handleLogin = () => {
    const user = users.find((u) => u.id === selectedID);
    if (user) {
      const userPass = user.password || "0000";
      if (password !== userPass) {
        alert("Senha Incorreta");
        return;
      }
      if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
      onLogin(user);
    } else alert("Usu\xE1rio Incorreto");
  };
  return /* @__PURE__ */ jsx("div", { className: "flex h-screen bg-zinc-950 items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-black border border-zinc-800 p-8 rounded-xl shadow-2xl w-full max-w-sm flex flex-col items-center", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-1 mb-8", children: [
      /* @__PURE__ */ jsx(Crown, { size: 48, className: "text-[#00b14f] mb-2" }),
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold tracking-tight text-[#00b14f]", children: "IMP\xC9RIO" }),
      /* @__PURE__ */ jsx("span", { className: "text-[0.65rem] text-gray-500 font-medium tracking-[0.2em]", children: "ACESS\xD3RIOS PARA M\xD3VEIS" })
    ] }),
    /* @__PURE__ */ jsx(
      "select",
      {
        value: selectedID,
        onChange: (e) => setSelectedID(e.target.value),
        className: "border border-zinc-700 p-3 w-full rounded-lg mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#00b14f] focus:border-transparent bg-zinc-900 text-white",
        children: users.map((u) => /* @__PURE__ */ jsx("option", { value: u.id, children: u.name }, u.id))
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "password",
        placeholder: "Senha",
        value: password,
        onChange: (e) => setPassword(e.target.value),
        className: "border border-zinc-700 p-3 w-full rounded-lg mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#00b14f] focus:border-transparent bg-zinc-900 text-white",
        onKeyDown: (e) => e.key === "Enter" && handleLogin()
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: handleLogin,
        className: "w-full bg-[#00b14f] text-black font-bold p-3 rounded-lg hover:bg-[#00c95a] transition text-lg mt-2 tracking-wide",
        children: "Entrar"
      }
    )
  ] }) });
}
function ItensScreen({ db }) {
  const [activeTab, setActiveTab] = useState(
    "PRODUTOS"
  );
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [productionPoints, setProductionPoints] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [currentBomProduct, setCurrentBomProduct] = useState(null);
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState(
    ""
  );
  const [componentQuantity, setComponentQuantity] = useState(1);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState("");
  const [excelImportProgress, setExcelImportProgress] = useState(0);
  const [excelImportResult, setExcelImportResult] = useState(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);
  React.useEffect(() => {
    const handleEvents = (e) => {
      if (e.key === "Escape") {
        setIsExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEvents);
    return () => window.removeEventListener("keydown", handleEvents);
  }, []);
  const filteredItems = db.items.filter((it) => {
    const isPeca = it.type === "PECA";
    const isEpi = it.type === "EPI";
    if (activeTab === "PRODUTOS" && (isPeca || isEpi)) return false;
    if (activeTab === "PECAS" && !isPeca) return false;
    if (activeTab === "EPIS" && !isEpi) return false;
    const term = normalizeString(debouncedSearchTerm);
    const searchTarget = normalizeString(`${it.code} ${it.name}`);
    return searchTarget.includes(term);
  });
  const searchedPecas = db.items.filter((it) => it.type === "PECA").filter((it) => {
    return normalizeString(`${it.code} ${it.name}`).includes(
      normalizeString(componentSearch)
    );
  }).slice(0, 10);
  const handleImportExcel = async () => {
    if (!excelData.trim()) return;
    setExcelImportResult("Processando...");
    setExcelImportProgress(0);
    const rows = excelData.trim().split("\n");
    let addedCount = 0;
    let updatedCount = 0;
    const firstRowCols = rows[0].split("	").map((c) => c.trim().toUpperCase());
    let startIdx = 0;
    let idxCode = 0;
    let idxName = 1;
    let idxPrice = 2;
    let idxPoints = 3;
    if (firstRowCols.includes("C\xD3DIGO") || firstRowCols.includes("COD") || firstRowCols.includes("C\xD3D. ITEM") || firstRowCols.includes("PRODUTO") || firstRowCols.includes("ITEM") || firstRowCols.includes("PE\xC7A")) {
      startIdx = 1;
      const getCol = (names) => firstRowCols.findIndex((c) => names.some((n) => c.includes(n)));
      idxCode = getCol(["C\xD3DIGO", "C\xD3D", "COD"]);
      idxName = getCol(["PRODUTO", "ITEM", "NOME", "PE\xC7A"]);
      idxPrice = getCol(["PRE\xC7O", "PRECO", "VALOR"]);
      idxPoints = getCol(["PONTOS", "PONTUA\xC7\xC3O", "PONTUACAO"]);
    }
    const updatedItems = [];
    for (let i = startIdx; i < rows.length; i++) {
      if (i % 25 === 0) {
        setExcelImportProgress(
          Math.round((i - startIdx) / (rows.length - startIdx) * 100)
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("	").map((c) => c.trim());
      const rCode = idxCode >= 0 ? cols[idxCode] : "";
      const rName = idxName >= 0 ? cols[idxName] : "";
      const rPriceStr = idxPrice >= 0 ? cols[idxPrice] : "";
      const rPointsStr = idxPoints >= 0 ? cols[idxPoints] : "";
      if (!rCode && !rName) continue;
      const basePriceParsed = parseFloat((rPriceStr || "").replace(",", "."));
      const price = !isNaN(basePriceParsed) ? basePriceParsed : void 0;
      const pointsParsed = parseFloat((rPointsStr || "").replace(",", "."));
      const points = !isNaN(pointsParsed) ? pointsParsed : void 0;
      const existing = db.items.find(
        (it) => rCode && it.code === rCode || rName && it.name.toUpperCase() === rName.toUpperCase()
      );
      if (existing) {
        updatedItems.push({
          ...existing,
          code: rCode || existing.code,
          name: rName || existing.name,
          basePrice: price !== void 0 ? price : existing.basePrice,
          productionPoints: points !== void 0 ? points : existing.productionPoints,
          type: activeTab === "PECAS" ? "PECA" : "PRODUTO"
        });
        updatedCount++;
      } else {
        if (rCode && rName) {
          db.addItem({
            code: rCode,
            name: rName,
            notes: "",
            basePrice: price,
            productionPoints: points,
            type: activeTab === "PECAS" ? "PECA" : "PRODUTO"
          });
          addedCount++;
        }
      }
    }
    setExcelImportProgress(100);
    for (const item of updatedItems) {
      db.updateItem(item);
    }
    setExcelImportResult(
      `Conclu\xEDdo! ${addedCount} novos, ${updatedCount} atualizados.`
    );
    setExcelData("");
    setTimeout(() => {
      setIsExcelModalOpen(false);
      setExcelImportResult(null);
    }, 4500);
  };
  const handleCadastrar = () => {
    if (!code || !name) return;
    const itemType = activeTab === "PECAS" ? "PECA" : activeTab === "EPIS" ? "EPI" : "PRODUTO";
    if (editingId) {
      const existing = db.items.find((i) => i.id === editingId);
      if (existing) {
        db.updateItem({
          ...existing,
          code,
          name,
          basePrice: basePrice === "" ? void 0 : basePrice,
          productionPoints: productionPoints === "" ? void 0 : productionPoints,
          type: itemType
        });
      }
      setEditingId(null);
    } else {
      db.addItem({
        code,
        name,
        notes: "",
        basePrice: basePrice === "" ? void 0 : basePrice,
        productionPoints: productionPoints === "" ? void 0 : productionPoints,
        type: itemType
      });
    }
    setCode("");
    setName("");
    setBasePrice("");
    setProductionPoints("");
  };
  const handleEdit = (it) => {
    setEditingId(it.id);
    setCode(it.code);
    setName(it.name);
    setBasePrice(it.basePrice !== void 0 ? it.basePrice : "");
    setProductionPoints(
      it.productionPoints !== void 0 ? it.productionPoints : ""
    );
    setActiveTab(
      it.type === "PECA" ? "PECAS" : it.type === "EPI" ? "EPIS" : "PRODUTOS"
    );
  };
  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja excluir?")) {
      db.deleteItem(id);
    }
  };
  const openBom = (prod) => {
    setCurrentBomProduct(prod);
    setIsBomModalOpen(true);
    setComponentQuantity(1);
    setSelectedComponentId("");
    setComponentSearch("");
  };
  const handleAddComponent = () => {
    if (!currentBomProduct || selectedComponentId === "" || componentQuantity <= 0)
      return;
    const comps = currentBomProduct.components || [];
    const updated = {
      ...currentBomProduct,
      components: [
        ...comps,
        { itemId: selectedComponentId, quantity: componentQuantity }
      ]
    };
    db.updateItem(updated);
    setCurrentBomProduct(updated);
    setSelectedComponentId("");
  };
  const handleRemoveComponent = (idx) => {
    if (!currentBomProduct) return;
    const comps = [...currentBomProduct.components || []];
    comps.splice(idx, 1);
    const updated = { ...currentBomProduct, components: comps };
    db.updateItem(updated);
    setCurrentBomProduct(updated);
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-gray-800", children: "Itens" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setIsExcelModalOpen(true),
            className: "bg-[#107c41] hover:bg-[#185c37] text-white text-xs font-bold py-1 px-3 rounded shadow transition w-fit",
            children: "Importar do Excel (com pre\xE7os)"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "relative", children: /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          placeholder: "Buscar itens...",
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          className: "border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 w-48"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex bg-white rounded-lg shadow-sm border p-1 mb-4", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setActiveTab("PRODUTOS"),
          className: `flex-1 py-1.5 text-sm font-bold rounded-md transition ${activeTab === "PRODUTOS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`,
          children: "Produtos"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setActiveTab("PECAS"),
          className: `flex-1 py-1.5 text-sm font-bold rounded-md transition ${activeTab === "PECAS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`,
          children: "Pe\xE7as"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setActiveTab("EPIS"),
          className: `flex-1 py-1.5 text-sm font-bold rounded-md transition ${activeTab === "EPIS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`,
          children: "EPIs"
        }
      )
    ] }),
    isExcelModalOpen && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-4", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-bold text-gray-800", children: [
          "Importa\xE7\xE3o de ",
          activeTab === "PECAS" ? "Pe\xE7as" : "Produtos",
          " via Excel"
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setIsExcelModalOpen(false),
            className: "text-gray-500 hover:text-gray-800",
            children: /* @__PURE__ */ jsx(X, { size: 24 })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 mb-2", children: [
        "Cole os dados diretamente do Excel. Colunas esperadas:",
        /* @__PURE__ */ jsx("br", {}),
        /* @__PURE__ */ jsx("span", { className: "font-mono bg-gray-100 px-1 py-0.5 rounded text-xs text-blue-800", children: "C\xF3digo | Nome | Pre\xE7o (opcional) | Pontua\xE7\xE3o (opcional)" })
      ] }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "w-full border border-gray-300 rounded p-2 text-xs font-mono mb-2 flex-1 overflow-auto bg-gray-50 focus:bg-white transition-colors whitespace-pre",
          rows: 12,
          placeholder: "Cole (Ctrl+V) as colunas do Excel/Google Sheets aqui...",
          value: excelData,
          onChange: (e) => setExcelData(e.target.value)
        }
      ),
      excelImportResult && /* @__PURE__ */ jsxs(
        "div",
        {
          className: `mt-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${excelImportResult.includes("Processando") ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`,
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
              /* @__PURE__ */ jsx("span", { children: excelImportResult }),
              excelImportResult.includes("Processando") && /* @__PURE__ */ jsxs("span", { className: "text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800", children: [
                excelImportProgress,
                "%"
              ] })
            ] }),
            excelImportResult.includes("Processando") && /* @__PURE__ */ jsx("div", { className: "w-full bg-blue-200 h-2.5 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: "bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out",
                style: { width: `${excelImportProgress}%` }
              }
            ) })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 mt-4 shrink-0", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setIsExcelModalOpen(false),
            className: "px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleImportExcel,
            disabled: !excelData.trim() || !!excelImportResult,
            className: "bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50",
            children: "Confirmar Importa\xE7\xE3o"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3 mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            value: code,
            onChange: (e) => setCode(e.target.value),
            placeholder: "C\xF3digo",
            className: "border border-gray-300 p-2 rounded"
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            value: name,
            onChange: (e) => setName(e.target.value),
            placeholder: "Nome",
            className: "border border-gray-300 p-2 rounded"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-2 text-gray-400 font-semibold", children: "R$" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              step: "0.01",
              value: basePrice,
              onChange: (e) => setBasePrice(e.target.value ? parseFloat(e.target.value) : ""),
              placeholder: "Pre\xE7o (Opcional)",
              className: "border border-gray-300 p-2 pl-9 rounded w-full"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-2 text-gray-400 text-xs font-semibold", children: "Pts" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              step: "1",
              value: productionPoints,
              onChange: (e) => setProductionPoints(
                e.target.value ? parseFloat(e.target.value) : ""
              ),
              placeholder: "Pontua\xE7\xE3o (Opcional)",
              className: "border border-gray-300 p-2 pl-10 rounded w-full"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleCadastrar,
          className: "bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition",
          children: editingId ? "Salvar Altera\xE7\xF5es" : "Adicionar Item"
        }
      ),
      editingId && /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            setEditingId(null);
            setCode("");
            setName("");
          },
          className: "bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 transition",
          children: "Cancelar"
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto w-full", children: filteredItems.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-center mt-4", children: "Nenhum item encontrado." }) : filteredItems.map((it) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: "bg-white p-3 border-b border-gray-100 flex justify-between items-center rounded mb-2 shadow-sm",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
            /* @__PURE__ */ jsx("span", { className: "font-bold text-gray-800", children: it.code }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-sm", children: it.name })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col text-right text-xs text-gray-500", children: [
              it.basePrice !== void 0 ? /* @__PURE__ */ jsxs("span", { children: [
                "R$ ",
                it.basePrice.toFixed(2)
              ] }) : /* @__PURE__ */ jsx("span", { children: "-" }),
              it.productionPoints !== void 0 ? /* @__PURE__ */ jsxs("span", { children: [
                it.productionPoints,
                " pts"
              ] }) : /* @__PURE__ */ jsx("span", { children: "-" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-l pl-3 border-gray-200", children: [
              activeTab === "PRODUTOS" && /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => openBom(it),
                  className: "text-purple-600 hover:text-purple-800 p-1 text-xs font-bold border border-purple-200 rounded px-2",
                  title: "Composi\xE7\xE3o (BOM)",
                  children: "Composi\xE7\xE3o"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => handleEdit(it),
                  className: "text-blue-500 hover:text-blue-700 p-1",
                  title: "Editar",
                  children: /* @__PURE__ */ jsx(Pencil, { size: 18 })
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => handleDelete(it.id),
                  className: "text-red-500 hover:text-red-700 p-1",
                  title: "Excluir",
                  children: /* @__PURE__ */ jsx(Trash2, { size: 18 })
                }
              )
            ] })
          ] })
        ]
      },
      it.id
    )) }),
    isBomModalOpen && currentBomProduct && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-4", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-bold text-gray-800", children: [
          "Composi\xE7\xE3o: ",
          currentBomProduct.name
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setIsBomModalOpen(false),
            className: "text-gray-500 hover:text-gray-800",
            children: /* @__PURE__ */ jsx(X, { size: 24 })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("h4", { className: "font-semibold text-gray-700 text-sm mb-2", children: "Adicionar Pe\xE7a:" }),
        /* @__PURE__ */ jsx("div", { className: "flex gap-2 mb-2", children: /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "Pesquisar pe\xE7a...",
            value: componentSearch,
            onChange: (e) => setComponentSearch(e.target.value),
            className: "border w-full p-2 text-sm rounded"
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: selectedComponentId,
              onChange: (e) => setSelectedComponentId(
                e.target.value ? parseInt(e.target.value) : ""
              ),
              className: "border p-2 rounded flex-1 text-sm bg-white",
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Selecione uma pe\xE7a" }),
                searchedPecas.map((p) => /* @__PURE__ */ jsxs("option", { value: p.id, children: [
                  p.code,
                  " - ",
                  p.name
                ] }, p.id))
              ]
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-sm", children: "Qtd:" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              value: componentQuantity,
              onChange: (e) => setComponentQuantity(parseInt(e.target.value) || 0),
              className: "border p-2 rounded w-16 text-sm",
              min: "1"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleAddComponent,
              className: "bg-blue-600 text-white font-bold p-2 text-sm rounded hover:bg-blue-700",
              disabled: !selectedComponentId || componentQuantity <= 0,
              children: "Adicionar"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto", children: [
        /* @__PURE__ */ jsx("h4", { className: "font-semibold text-gray-700 text-sm mb-2 border-b pb-1", children: "Pe\xE7as Inclusas:" }),
        !currentBomProduct.components || currentBomProduct.components.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-400 italic", children: "Nenhuma pe\xE7a cadastrada para este produto." }) : currentBomProduct.components.map((comp, idx) => {
          const cItem = db.items.find((i) => i.id === comp.itemId);
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex justify-between items-center py-2 border-b border-gray-100 last:border-none",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
                  /* @__PURE__ */ jsxs("span", { className: "font-bold", children: [
                    comp.quantity,
                    "x"
                  ] }),
                  " ",
                  cItem ? `${cItem.code} - ${cItem.name}` : "Pe\xE7a Exclu\xEDda"
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => handleRemoveComponent(idx),
                    className: "text-red-500 hover:text-red-700 p-1 bg-red-50 rounded",
                    children: /* @__PURE__ */ jsx(X, { size: 16 })
                  }
                )
              ]
            },
            idx
          );
        })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-4 pt-3 border-t text-right", children: /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setIsBomModalOpen(false),
          className: "bg-gray-200 px-4 py-2 rounded text-gray-700 font-bold hover:bg-gray-300",
          children: "Fechar"
        }
      ) })
    ] }) })
  ] });
}
function PedidosScreen({
  db,
  currentUser
}) {
  const [orderCode, setOrderCode] = useState("");
  const [itemId, setItemId] = useState("");
  const [orderItemSearch, setOrderItemSearch] = useState("");
  const suggestedOrderItems = React.useMemo(() => {
    const query = orderItemSearch.trim().toLowerCase();
    if (!query) {
      return db.items.slice(0, 5);
    }
    return db.items.filter((it) => `${it.code} - ${it.name}`.toLowerCase().includes(query)).slice(0, 5);
  }, [orderItemSearch, db.items]);
  const [customerName, setCustomerName] = useState("");
  const [customerSelected, setCustomerSelected] = useState(false);
  const [representativeName, setRepresentativeName] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [variation, setVariation] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentCondition, setPaymentCondition] = useState("");
  const selectedItemObj = React.useMemo(() => {
    return db.items.find((i) => i.id === itemId);
  }, [itemId, db.items]);
  const lastPrices = React.useMemo(() => {
    if (!customerName || !itemId) return [];
    return db.orders.filter(
      (o) => o.customerName === customerName && o.itemId === itemId && o.unitPrice !== void 0
    ).sort((a, b) => b.createdAt - a.createdAt).slice(0, 2).map((o) => o.unitPrice);
  }, [customerName, itemId, db.orders]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isProgramacao, setIsProgramacao] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLaserOnly, setFilterLaserOnly] = useState(false);
  React.useEffect(() => {
    if (currentUser?.id === "projetista_marcos" || currentUser?.role === "PROJETISTA" || currentUser?.name?.toLowerCase()?.includes("marcos")) {
      setFilterLaserOnly(true);
    }
  }, [currentUser]);
  const [isThirdPartyLaser, setIsThirdPartyLaser] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceModalData, setInvoiceModalData] = useState(null);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [selectedBatchInvoiceIds, setSelectedBatchInvoiceIds] = useState([]);
  const batchTotalQty = React.useMemo(() => {
    return selectedBatchInvoiceIds.reduce((sum, id) => {
      const o = db.orders.find((ord) => ord.id === id);
      return sum + (o ? o.totalQuantity || 0 : 0);
    }, 0);
  }, [selectedBatchInvoiceIds, db.orders]);
  const [lineItems, setLineItems] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("ABERTOS");
  const [isStatusBarOpen, setIsStatusBarOpen] = useState(false);
  const piecesByStatus = React.useMemo(() => {
    const counts = {};
    const activeOrders = db.orders.filter(
      (o) => o.status !== "FATURADO" && o.status !== "AGUARDANDO_APROVACAO" && o.isActive
    );
    activeOrders.forEach((o) => {
      const statusStr = o.status || "PENDENTE";
      const pendingQty = Math.max(
        0,
        o.totalQuantity - (o.invoicedQuantity || 0)
      );
      if (pendingQty > 0) {
        counts[statusStr] = (counts[statusStr] || 0) + pendingQty;
      }
    });
    const labelMap = {
      PENDENTE: "Pendentes",
      TEM_ESTOQUE: "Tem Estoque",
      EM_PRODUCAO: "Em Produ\xE7\xE3o",
      PRODUZIDO: "Produzidos",
      EM_CORTE: "Em Corte",
      CORTADO: "Cortados",
      EM_PINTURA: "Em Pintura",
      PINTADO: "Pintados",
      EMBALANDO: "Embalando",
      EMBALADO: "Embalados",
      PLANEJADO: "Planejados"
    };
    return Object.entries(counts).map(([status, qty]) => ({
      status,
      label: labelMap[status] || status,
      qty
    })).sort((a, b) => b.qty - a.qty);
  }, [db.orders]);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState("");
  const [excelImportProgress, setExcelImportProgress] = useState(0);
  const [excelImportResult, setExcelImportResult] = useState(
    null
  );
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfImportProgress, setPdfImportProgress] = useState(0);
  const [pdfImportResult, setPdfImportResult] = useState(null);
  const [pdfExtractedOrders, setPdfExtractedOrders] = useState([]);
  const [expandedOrderIdx, setExpandedOrderIdx] = useState(0);
  const pdfInputRef = React.useRef(null);
  React.useEffect(() => {
    const handleEvents = (e) => {
      if (e.key === "Escape") {
        setIsPdfModalOpen(false);
        setIsExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEvents);
    return () => window.removeEventListener("keydown", handleEvents);
  }, []);
  const handleExtractPdf = async () => {
    if (!pdfFile) return;
    setPdfImportResult("Extraindo dados com Intelig\xEAncia Artificial...");
    setPdfImportProgress(5);
    const extractionInterval = setInterval(() => {
      setPdfImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(extractionInterval);
          return prev;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 600);
    const formData = new FormData();
    formData.append("file", pdfFile);
    try {
      const resp = await fetch("/api/extract-orders-pdf", {
        method: "POST",
        body: formData
      });
      clearInterval(extractionInterval);
      const data = await resp.json();
      if (!data.success) {
        setPdfImportResult("Erro: " + data.error);
        setPdfImportProgress(0);
        return;
      }
      const matchedOrders = data.orders.map((order) => {
        const originalCustomerName = order.customerName || "DESCONHECIDO";
        const customerCodeStr = order.customerCode ? String(order.customerCode).trim() : "";
        let finalCustomerName = originalCustomerName;
        let matchedCustomer = null;
        let wasCustomerMatched = false;
        if (customerCodeStr) {
          const codeId = Number(customerCodeStr);
          if (!isNaN(codeId)) {
            matchedCustomer = db.customers.find((c) => c.id === codeId);
          }
        }
        if (!matchedCustomer) {
          const leadingCodeMatch = originalCustomerName.match(/^\s*[\[\(]?\s*(\d+)/);
          if (leadingCodeMatch) {
            const codeId = Number(leadingCodeMatch[1]);
            matchedCustomer = db.customers.find((c) => c.id === codeId);
          }
        }
        if (!matchedCustomer) {
          const cleanOcrName = originalCustomerName.toLowerCase().trim();
          matchedCustomer = db.customers.find((c) => {
            const dbIdStr = c.id.toString();
            if (cleanOcrName.includes(dbIdStr)) return true;
            const dbName = c.name.toLowerCase().trim();
            const dbTrade = c.tradeName ? c.tradeName.toLowerCase().trim() : "";
            if (cleanOcrName === dbName || cleanOcrName.includes(dbName) || dbName.includes(cleanOcrName)) return true;
            if (dbTrade && (cleanOcrName === dbTrade || cleanOcrName.includes(dbTrade) || dbTrade.includes(cleanOcrName))) return true;
            return false;
          });
        }
        if (matchedCustomer) {
          finalCustomerName = matchedCustomer.tradeName?.trim() || matchedCustomer.name;
          wasCustomerMatched = true;
        }
        let matchedRep = null;
        let wasRepMatched = false;
        const ocrRepName = order.representativeName ? order.representativeName.toLowerCase().trim() : "";
        if (ocrRepName) {
          const cleanRepName = ocrRepName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\brepresentante\b/gi, "").trim();
          matchedRep = db.users.find((u) => {
            if (u.role !== "REPRESENTANTE") return false;
            const dbNormalize = u.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\brepresentante\b/gi, "").trim();
            return cleanRepName === dbNormalize || dbNormalize.includes(cleanRepName) || cleanRepName.includes(dbNormalize);
          });
        }
        let finalRepresentativeName = order.representativeName || "";
        let finalRepresentativeId = "";
        if (matchedRep) {
          finalRepresentativeName = matchedRep.name;
          finalRepresentativeId = matchedRep.id;
          wasRepMatched = true;
        }
        const statusOriginalPdf = (order.statusOriginalPdf || order.status || "").trim().toUpperCase();
        let statusValidation = "REVISAO";
        let validationMessage = "";
        if (!statusOriginalPdf) {
          statusValidation = "REVISAO";
          validationMessage = "Status ausente ou n\xE3o identificado no PDF. Requer revis\xE3o manual.";
        } else if (statusOriginalPdf.includes("DOCUMENTO FATURADO") && !statusOriginalPdf.includes("PARCIAL")) {
          statusValidation = "BLOQUEADO";
          validationMessage = "BLOQUEADO: Pedido j\xE1 faturado no PDF. N\xE3o deve seguir para produ\xE7\xE3o.";
        } else if (statusOriginalPdf.includes("DOCUMENTO FATURADO PARCIAL") || statusOriginalPdf.includes("PARCIAL")) {
          statusValidation = "ALERTA";
          validationMessage = "ALERTA: Faturado parcial. Verifique se os itens pendentes realmente devem ir para produ\xE7\xE3o.";
        } else if (statusOriginalPdf.includes("PROCESSADO") || statusOriginalPdf.includes("PEDIDO DE VENDA") || statusOriginalPdf.includes("PEDIDO") || statusOriginalPdf.includes("APROVADO") || statusOriginalPdf.includes("PENDENTE") || statusOriginalPdf.includes("A FATURAR") || statusOriginalPdf.includes("EM_PRODUCAO") || statusOriginalPdf.includes("EM PRODUCAO") || statusOriginalPdf.includes("OR\xC7AMENTO APRESENTADO") || statusOriginalPdf === "AGUARDANDO_APROVACAO") {
          statusValidation = "APTO";
          validationMessage = "Pedido liberado para importa\xE7\xE3o.";
        } else {
          statusValidation = "REVISAO";
          validationMessage = "Status n\xE3o reconhecido. Requer revis\xE3o manual antes de faturar/produzir.";
        }
        let finalSystemStatus = "AGUARDANDO_APROVACAO";
        if (statusValidation === "APTO") {
          if (order.status === "EM_PRODUCAO" || order.status === "PENDENTE") {
            finalSystemStatus = order.status;
          } else {
            finalSystemStatus = "PENDENTE";
          }
        } else {
          finalSystemStatus = "AGUARDANDO_APROVACAO";
        }
        return {
          ...order,
          customerName: finalCustomerName,
          originalCustomerName,
          wasCustomerMatched,
          matchedCustomer,
          representativeName: finalRepresentativeName,
          representativeId: finalRepresentativeId,
          wasRepMatched,
          status: finalSystemStatus,
          statusOriginalPdf,
          statusValidation,
          validationMessage
        };
      });
      setPdfImportProgress(100);
      setPdfExtractedOrders(matchedOrders);
      setPdfImportResult(
        "Dados extra\xEDdos. Por favor, revise as informa\xE7\xF5es abaixo antes de confirmar."
      );
      setTimeout(() => setPdfImportProgress(0), 800);
    } catch (err) {
      clearInterval(extractionInterval);
      setPdfImportResult("Erro ao enviar PDF: " + err.message);
      setPdfImportProgress(0);
    }
  };
  const handleConfirmPdfImport = async () => {
    setPdfImportResult("Salvando pedidos no banco de dados...");
    setPdfImportProgress(5);
    let addedCount = 0;
    for (let i = 0; i < pdfExtractedOrders.length; i++) {
      const o = pdfExtractedOrders[i];
      const orderCode2 = o.orderCode || `PDF-${Date.now()}`;
      const finalCustomerName = o.customerName || "DESCONHECIDO";
      const extractedStatus = o.status ? o.status.trim().toUpperCase() : "";
      const allowedStatuses = ["AGUARDANDO_APROVACAO", "PENDENTE", "EM_PRODUCAO"];
      const orderStatus = allowedStatuses.includes(extractedStatus) ? extractedStatus : "AGUARDANDO_APROVACAO";
      for (const item of o.items) {
        let dbItemId = 0;
        if (item.itemCode) {
          const f = db.items.find((it) => it.code === item.itemCode);
          if (f) dbItemId = f.id;
        }
        if (dbItemId === 0 && item.itemName) {
          const f = db.items.find(
            (it) => it.name.trim().toLowerCase() === item.itemName.trim().toLowerCase()
          );
          if (f) dbItemId = f.id;
        }
        if (dbItemId === 0 && item.itemName) {
          const f = db.items.find(
            (it) => it.name.trim().toLowerCase().includes(item.itemName.trim().toLowerCase())
          );
          if (f) dbItemId = f.id;
        }
        const unitPriceNum = Number(item.unitPrice) || 0;
        await db.addOrder({
          orderCode: orderCode2,
          customerName: finalCustomerName,
          representativeName: o.representativeName || "",
          representativeId: o.representativeId || "",
          deliveryDate: o.deliveryDate || "",
          paymentCondition: o.paymentCondition || "",
          paymentTerms: o.paymentTerm || "",
          notes: o.notes || "",
          itemId: dbItemId,
          color: item.color || "-",
          size: item.size || "-",
          variation: "-",
          totalQuantity: Number(item.quantity) || 1,
          packedQuantity: 0,
          invoicedQuantity: 0,
          unitPrice: unitPriceNum,
          status: orderStatus,
          statusOriginalPdf: o.statusOriginalPdf || "",
          isActive: true,
          createdAt: Date.now()
        });
        if (unitPriceNum > 0 && dbItemId !== 0) {
          await db.addPriceHistory({
            itemId: dbItemId,
            customerName: finalCustomerName,
            unitPrice: unitPriceNum,
            orderCode: orderCode2,
            createdAt: Date.now(),
            source: "PDF"
          });
        }
        addedCount++;
      }
      setPdfImportProgress(
        Math.round((i + 1) / pdfExtractedOrders.length * 100)
      );
    }
    setPdfImportResult(
      `Importa\xE7\xE3o conclu\xEDda! ${addedCount} itens de pedidos criados.`
    );
    setTimeout(() => {
      setIsPdfModalOpen(false);
      setPdfExtractedOrders([]);
      setPdfFile(null);
      setPdfImportResult(null);
      setPdfImportProgress(0);
    }, 3e3);
  };
  const handleImportExcel = async () => {
    if (!excelData.trim()) return;
    setExcelImportResult("Processando...");
    const rows = excelData.trim().split("\n");
    let addedCount = 0;
    let updatedCount = 0;
    const updatedOrders = [];
    const firstRowCols = rows[0].split("	").map((c) => c.trim().toUpperCase());
    const hasDynamicHeaders = firstRowCols.some(
      (c) => c.includes("PEDIDO") || c.includes("C\xD3DIGO") || c.includes("CODIGO") || c.includes("NUMERO") || c.includes("N\xBA") || c.includes("O.V")
    ) && firstRowCols.some(
      (c) => c.includes("ITEM") || c.includes("PRODUTO") || c.includes("PECA") || c.includes("PE\xC7A") || c.includes("DESCRI")
    );
    let startIdx = 0;
    let idxCode = 0;
    let idxCustomer = 1;
    let idxRep = 2;
    let idxProductStr = 3;
    let idxColor = 4;
    let idxSize = 5;
    let idxVariation = 6;
    let idxQty = 7;
    let idxDate = 8;
    let idxStatusProd = -1;
    let idxStatusFat = -1;
    let idxStatusEnt = -1;
    let idxQtdEntregue = -1;
    if (hasDynamicHeaders) {
      startIdx = 1;
      const getColIndex = (names, exactOnly = false) => {
        let res = firstRowCols.findIndex(
          (c) => names.some((n) => c === n.toUpperCase())
        );
        if (res === -1 && !exactOnly) {
          res = firstRowCols.findIndex(
            (c) => names.some(
              (n) => c.includes(n.toUpperCase()) && !c.includes("COD. CLIENTE") && !c.includes("C\xD3D. CLIENTE")
            )
          );
        }
        return res;
      };
      idxCode = getColIndex([
        "PEDIDO",
        "N\xBA PEDIDO",
        "C\xD3D. O.V.",
        "C\xD3DIGO",
        "NUMERO",
        "N\xDAMERO",
        "N\xBA O.V.",
        "O.V."
      ]);
      idxCustomer = getColIndex([
        "RAZ\xC3O SOCIAL",
        "CLIENTE FANTASIA",
        "CLIENTE",
        "NOME DO CLIENTE"
      ]);
      idxRep = getColIndex(["CONSULTOR", "VENDEDOR", "REPRESENTANTE"], true);
      const codItemIdx = getColIndex([
        "C\xD3D. ITEM",
        "COD ITEM",
        "C\xD3DIGO DO PRODUTO"
      ]);
      idxProductStr = codItemIdx >= 0 ? codItemIdx : getColIndex([
        "ITEM",
        "PRODUTO",
        "DESCRI\xC7\xC3O",
        "DESCRI",
        "PE\xC7A",
        "NOME"
      ]);
      idxColor = getColIndex(["COR"], true);
      idxSize = getColIndex(["TAMANHO"], true);
      idxVariation = getColIndex(["VARIA\xC7\xC3O", "VARIACAO"], true);
      idxQty = getColIndex(["QUANTIDADE", "QTD"], true);
      idxDate = getColIndex(["DATA PARA ENTREGA", "ENTREGA"]);
      if (idxDate === -1) idxDate = getColIndex(["DATA"]);
      idxStatusProd = getColIndex(["STATUS DE PRODU"]);
      idxStatusFat = getColIndex(["STATUS DE FATURAMENTO", "STATUS DE FAT"]);
      idxStatusEnt = getColIndex(["STATUS DE ENTREGA", "STATUS DE ENT"]);
      idxQtdEntregue = getColIndex([
        "QTD. ENTREGUE",
        "QTD ENTREGUE",
        "QTD. FATURADA"
      ]);
    }
    const formatExcelDate = (dateStr) => {
      if (!dateStr || dateStr === "-") return "";
      const matchMonthStr = dateStr.toLowerCase();
      const months = [
        "jan",
        "fev",
        "mar",
        "abr",
        "mai",
        "jun",
        "jul",
        "ago",
        "set",
        "out",
        "nov",
        "dez"
      ];
      const foundMonthIdx = months.findIndex((m) => matchMonthStr.includes(m));
      if (foundMonthIdx !== -1) {
        const numbers = dateStr.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          const day = String(numbers[numbers.length - 1]).padStart(2, "0");
          const month = String(foundMonthIdx + 1).padStart(2, "0");
          let year = (/* @__PURE__ */ new Date()).getFullYear();
          if (dateStr.includes(String(year))) {
          } else if (dateStr.includes(String(year + 1))) {
            year++;
          }
          return `${year}-${month}-${day}`;
        }
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split("/");
        return `${y}-${m}-${d}`;
      }
      return dateStr;
    };
    setExcelImportProgress(0);
    for (let i = startIdx; i < rows.length; i++) {
      if (i % 25 === 0) {
        setExcelImportProgress(
          Math.round((i - startIdx) / (rows.length - startIdx) * 100)
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("	").map((c) => c.trim().toUpperCase());
      if (!hasDynamicHeaders && cols.length < 4) continue;
      const rCode = idxCode >= 0 && cols.length > idxCode ? cols[idxCode] : "";
      let rCustomer = idxCustomer >= 0 && cols.length > idxCustomer ? cols[idxCustomer] : cols[1] || "";
      const rRepRaw = idxRep >= 0 && cols.length > idxRep ? cols[idxRep] : cols.length > 2 && !hasDynamicHeaders ? cols[2] : "";
      const rRep = rRepRaw !== "-" && rRepRaw !== "" ? rRepRaw : "";
      const rProductStr = idxProductStr >= 0 && cols.length > idxProductStr ? cols[idxProductStr] : cols[3] || "";
      const rColor = idxColor >= 0 && cols.length > idxColor && cols[idxColor] ? cols[idxColor] : "-";
      const rSize = idxSize >= 0 && cols.length > idxSize && cols[idxSize] ? cols[idxSize] : "-";
      const rVariation = idxVariation >= 0 && cols.length > idxVariation && cols[idxVariation] ? cols[idxVariation] : "-";
      const rQtyStr = idxQty >= 0 && cols.length > idxQty ? cols[idxQty] : cols.length > 7 && !hasDynamicHeaders ? cols[7] : "1";
      let rDate = idxDate >= 0 && cols.length > idxDate && cols[idxDate] ? cols[idxDate] : cols.length > 8 && !hasDynamicHeaders ? cols[8] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      rDate = formatExcelDate(rDate);
      const rQtdEntStr = idxQtdEntregue >= 0 && cols.length > idxQtdEntregue ? cols[idxQtdEntregue] : "0";
      if (!rCode && !rProductStr) continue;
      const parsedQty = parseInt(
        (rQtyStr || "1").toString().replace(/\D/g, ""),
        10
      );
      if (isNaN(parsedQty) || parsedQty <= 0) continue;
      const parsedEnt = parseInt(
        (rQtdEntStr || "0").toString().replace(/\D/g, ""),
        10
      );
      const deliveredQty = isNaN(parsedEnt) ? 0 : parsedEnt;
      if (!rCustomer && hasDynamicHeaders && idxCustomer >= 0 && cols.length > idxCustomer + 1) {
        const tryNext = cols[idxCustomer + 1];
        if (tryNext && tryNext !== "-" && tryNext !== "") rCustomer = tryNext;
      }
      if (!rCustomer) rCustomer = "CONSUMIDOR FINAL";
      const query = rProductStr.toLowerCase();
      const itemDb = db.items.find(
        (i2) => String(i2.id) === query || String(i2.code).toLowerCase() === query || i2.name.toLowerCase() === query
      );
      const actualItemId = itemDb ? itemDb.id : null;
      if (!actualItemId) continue;
      let rStatus = "PENDENTE";
      if (hasDynamicHeaders) {
        const sProd = idxStatusProd >= 0 && cols.length > idxStatusProd ? cols[idxStatusProd] : "";
        const sFat = idxStatusFat >= 0 && cols.length > idxStatusFat ? cols[idxStatusFat] : "";
        const sEnt = idxStatusEnt >= 0 && cols.length > idxStatusEnt ? cols[idxStatusEnt] : "";
        if (sEnt.includes("ENTREGUE")) rStatus = "FATURADO";
        else if (sFat.includes("FATURADO")) rStatus = "FATURADO";
        else if (sProd.includes("PRONTO")) rStatus = "EMBALADO";
        else if (sProd.includes("PRODU") || sProd.includes("PROCESSO"))
          rStatus = "EM_PRODUCAO";
      }
      if (deliveredQty >= parsedQty) rStatus = "FATURADO";
      const existing = db.orders.find(
        (o) => o.orderCode === rCode && o.itemId === actualItemId && o.color === rColor && o.size === rSize && o.variation === rVariation
      );
      if (existing) {
        updatedOrders.push({
          ...existing,
          customerName: rCustomer || existing.customerName,
          representativeName: rRep !== "" ? rRep : existing.representativeName,
          totalQuantity: parsedQty,
          deliveryDate: rDate !== "" ? rDate : existing.deliveryDate,
          status: hasDynamicHeaders ? rStatus : existing.status,
          packedQuantity: hasDynamicHeaders && deliveredQty > 0 ? deliveredQty : existing.packedQuantity,
          invoicedQuantity: hasDynamicHeaders && deliveredQty > 0 ? deliveredQty : existing.invoicedQuantity
        });
        updatedCount++;
      } else {
        await db.addOrder({
          orderCode: rCode,
          itemId: actualItemId,
          customerName: rCustomer || "Desconhecido",
          representativeName: rRep || "",
          color: rColor,
          size: rSize,
          variation: rVariation,
          totalQuantity: parsedQty,
          packedQuantity: hasDynamicHeaders && (deliveredQty > 0 || rStatus === "EMBALADO" || rStatus === "FATURADO") ? Math.max(deliveredQty, parsedQty) : 0,
          invoicedQuantity: hasDynamicHeaders && (deliveredQty > 0 || rStatus === "FATURADO") ? Math.max(deliveredQty, parsedQty) : 0,
          isActive: true,
          createdAt: Date.now(),
          deliveryDate: rDate,
          status: rStatus
        });
        addedCount++;
      }
    }
    setExcelImportProgress(100);
    if (updatedOrders.length > 0) {
      db.updateOrders(updatedOrders);
    }
    setExcelImportResult(
      `Conclu\xEDdo! ${addedCount} novos adicionados, ${updatedCount} atualizados.`
    );
    setExcelData("");
    setTimeout(() => {
      setIsExcelModalOpen(false);
      setExcelImportResult(null);
    }, 4500);
  };
  const sendServerPush = async (title, body, targetRoles) => {
    const targetUsers = db.users.filter(
      (u) => targetRoles.includes(u.role) && u.fcmToken
    );
    const tokens = targetUsers.map((u) => u.fcmToken);
    if (tokens.length === 0) return;
    try {
      await fetch("/api/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, fcmTokens: tokens })
      });
    } catch (e) {
      console.error("Error triggering push:", e);
    }
  };
  const handleApproveOrder = async (orderToApprove) => {
    const stockId = `${orderToApprove.itemId}|${orderToApprove.color}|${orderToApprove.size}|${orderToApprove.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);
    let qtFromStock = 0;
    let newStatus = "PENDENTE";
    if (existingStock && existingStock.quantity > 0) {
      qtFromStock = Math.min(
        existingStock.quantity,
        orderToApprove.totalQuantity
      );
      const newStockQty = existingStock.quantity - qtFromStock;
      db.updateStocks([{ ...existingStock, quantity: newStockQty }]);
      if (qtFromStock >= orderToApprove.totalQuantity) {
        newStatus = "TEM_ESTOQUE";
      }
    }
    db.updateOrders([
      {
        ...orderToApprove,
        status: newStatus,
        packedQuantity: qtFromStock,
        producedQuantity: qtFromStock,
        paintedQuantity: qtFromStock,
        cutQuantity: qtFromStock,
        isActive: true
      }
    ]);
    db.addLogs([
      {
        id: Date.now(),
        orderId: orderToApprove.id,
        operatorId: currentUser.id,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
        customProductName: `Aprova\xE7\xE3o de Pedido (Status: ${newStatus})`
      }
    ]);
    alert(`Pedido ${orderToApprove.orderCode} aprovado com sucesso!`);
  };
  const handleRejectOrder = (orderId) => {
    if (confirm(
      "Deseja rejeitar e remover este pedido enviado pelo representante?"
    )) {
      db.deleteOrder(orderId);
    }
  };
  const handleConfirmInvoice = () => {
    if (!invoiceModalData) return;
    const { order: o, limit } = invoiceModalData;
    const qty = parseInt(invoiceInput, 10);
    if (isNaN(qty) || qty <= 0 || qty > limit) {
      alert("Quantidade inv\xE1lida. Deve ser maior que 0 e no m\xE1ximo " + limit);
      return;
    }
    const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);
    if (existingStock && (existingStock.reservedQuantity || 0) > 0) {
      const alternateReservedOrders = db.orders.filter(
        (ord) => ord.id !== o.id && ord.itemId === o.itemId && ord.color === o.color && ord.size === o.size && ord.variation === o.variation && (ord.status === "PLANEJADO" || ord.status === "EMBALADO") && ord.isActive
      );
      if (alternateReservedOrders.length > 0) {
        const primaryResOrder = alternateReservedOrders[0];
        const confirmResult = window.confirm(
          `ALERTA POPUP - PRODUTO RESERVADO PARA OUTRO PEDIDO:

O produto que voc\xEA est\xE1 faturando cont\xE9m unidades de estoque RESERVADAS para:
\u2022 Pedido: ${primaryResOrder.orderCode}
\u2022 Cliente: ${primaryResOrder.customerName}

Deseja CONTINUAR assim mesmo e desfazer a reserva do outro pedido ou clique em Cancelar para interromper?`
        );
        if (!confirmResult) {
          setInvoiceModalData(null);
          setInvoiceInput("");
          return;
        } else {
          db.updateOrders([
            {
              ...primaryResOrder,
              status: "PENDENTE",
              packedQuantity: 0
            }
          ]);
          const nextReservedQty = Math.max(
            0,
            (existingStock.reservedQuantity || 0) - (primaryResOrder.totalQuantity || 0)
          );
          db.updateStocks([
            {
              ...existingStock,
              reservedQuantity: nextReservedQty
            }
          ]);
          db.addLogs([
            {
              id: Date.now() + 5,
              orderId: primaryResOrder.id,
              operatorId: currentUser.id,
              timestamp: Date.now(),
              durationMillis: 0,
              customProductName: `Reserva desfeita (estoque direcionado para pedido ${o.orderCode})`
            }
          ]);
        }
      }
    }
    const newInvoiced = (o.invoicedQuantity || 0) + qty;
    const isNowFaturado = newInvoiced >= o.totalQuantity;
    const newStatus = isNowFaturado ? "FATURADO" : o.status || "PENDENTE";
    db.updateOrders([
      {
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: !isNowFaturado,
        isUrgent: isNowFaturado ? false : o.isUrgent,
        // automatically remove isUrgent!
        _alreadyDeducted: true
      }
    ]);
    if (existingStock) {
      const newStockQty = Math.max(0, existingStock.quantity - qty);
      const newReservedQty = Math.max(
        0,
        (existingStock.reservedQuantity || 0) - qty
      );
      db.updateStocks([
        {
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty
        }
      ]);
    }
    db.addStockMovement?.({
      itemId: o.itemId,
      color: o.color,
      size: o.size,
      variation: o.variation,
      quantity: qty,
      type: "SAIDA",
      description: `Sa\xEDda por faturamento do Pedido ${o.orderCode} (Cliente: ${o.customerName})`
    });
    db.addLogs([
      {
        id: Date.now(),
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0
      }
    ]);
    setInvoiceModalData(null);
    setInvoiceInput("");
  };
  const handleBatchInvoice = () => {
    if (selectedBatchInvoiceIds.length === 0) return;
    if (!confirm(
      `Deseja faturar em lote ${selectedBatchInvoiceIds.length} pedido(s) selecionado(s)?`
    )) {
      return;
    }
    const updatedOrders = [];
    const updatedStocks = [];
    const addedLogs = [];
    selectedBatchInvoiceIds.forEach((id, idx) => {
      const o = db.orders.find((ord) => ord.id === id);
      if (!o || o.status !== "EMBALADO") return;
      const qty = o.totalQuantity - (o.invoicedQuantity || 0);
      if (qty <= 0) return;
      const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
      const existingStock = db.stocks.find((s) => s.id === stockId);
      const newInvoiced = (o.invoicedQuantity || 0) + qty;
      const isNowFaturado = true;
      const newStatus = "FATURADO";
      updatedOrders.push({
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: false,
        isUrgent: false,
        _alreadyDeducted: true
      });
      if (existingStock) {
        const newStockQty = Math.max(0, existingStock.quantity - qty);
        const newReservedQty = Math.max(
          0,
          (existingStock.reservedQuantity || 0) - qty
        );
        updatedStocks.push({
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty
        });
      }
      db.addStockMovement?.({
        itemId: o.itemId,
        color: o.color,
        size: o.size,
        variation: o.variation,
        quantity: qty,
        type: "SAIDA",
        description: `Sa\xEDda por faturamento em LOTE do Pedido ${o.orderCode} (Cliente: ${o.customerName})`
      });
      addedLogs.push({
        id: Date.now() + idx + 100,
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
        customProductName: "Faturamento em Lote"
      });
    });
    if (updatedOrders.length > 0) {
      db.updateOrders(updatedOrders);
      if (updatedStocks.length > 0) {
        db.updateStocks(updatedStocks);
      }
      db.addLogs(addedLogs);
      setSelectedBatchInvoiceIds([]);
      alert(
        `Faturamento em lote conclu\xEDdo com sucesso para ${updatedOrders.length} pedido(s)!`
      );
    }
  };
  const handleAddProductToOrder = () => {
    if (!itemId || !totalQuantity) return;
    setLineItems([
      ...lineItems,
      {
        itemId: Number(itemId),
        color,
        size,
        variation,
        totalQuantity: Number(totalQuantity),
        isThirdPartyLaser,
        isUrgent,
        isProgramacao
      }
    ]);
    setItemId("");
    setOrderItemSearch("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
  };
  const handleCadastrar = () => {
    if (editingId) {
      if (!orderCode || !itemId || !customerName || !totalQuantity || !deliveryDate)
        return;
      const existing = db.orders.find((o) => o.id === editingId);
      if (existing) {
        db.updateOrders([
          {
            ...existing,
            orderCode,
            itemId: Number(itemId),
            customerName,
            representativeName,
            color,
            size,
            variation,
            totalQuantity: Number(totalQuantity),
            deliveryDate,
            isThirdPartyLaser,
            isUrgent,
            isProgramacao
          }
        ]);
        const todayMs = (/* @__PURE__ */ new Date()).setHours(12, 0, 0, 0);
        const oldDeliveryMs = existing.deliveryDate ? new Date(existing.deliveryDate).setUTCHours(12, 0, 0, 0) : null;
        const newDeliveryMs = new Date(deliveryDate).setUTCHours(12, 0, 0, 0);
        const wasLate = oldDeliveryMs ? oldDeliveryMs - todayMs < 0 : false;
        const isLate = newDeliveryMs - todayMs < 0;
        const isFinished = existing.status === "FATURADO" || existing.status === "EMBALADO";
        if (!wasLate && isLate && !isFinished) {
          sendServerPush(
            "Aten\xE7\xE3o: Pedido Atrasado",
            `O prazo do pedido ${orderCode} foi alterado ou venceu e encontra-se em atraso!`,
            ["ADMIN", "PCP", "PRODUCAO"]
          );
        }
      }
      setEditingId(null);
    } else {
      if (!orderCode || !customerName || !deliveryDate) return;
      const itemsToProcess = [...lineItems];
      if (itemId && totalQuantity) {
        itemsToProcess.push({
          itemId: Number(itemId),
          color,
          size,
          variation,
          totalQuantity: Number(totalQuantity),
          isThirdPartyLaser,
          isUrgent,
          isProgramacao
        });
      }
      if (itemsToProcess.length === 0) return;
      itemsToProcess.forEach((itemInfo) => {
        const numItemId = Number(itemInfo.itemId);
        const numTotalQuantity = Number(itemInfo.totalQuantity);
        const stockId = `${numItemId}|${itemInfo.color}|${itemInfo.size}|${itemInfo.variation}|ACABADO`;
        const existingStock = db.stocks.find((s) => s.id === stockId);
        let qtFromStock = 0;
        let status = "PENDENTE";
        if (existingStock && existingStock.quantity > 0) {
          qtFromStock = Math.min(existingStock.quantity, numTotalQuantity);
          const newStockQty = existingStock.quantity - qtFromStock;
          db.updateStocks([{ ...existingStock, quantity: newStockQty }]);
          if (qtFromStock >= numTotalQuantity) {
            status = "TEM_ESTOQUE";
          }
        }
        db.addOrder({
          orderCode,
          itemId: numItemId,
          customerName,
          representativeName,
          color: itemInfo.color,
          size: itemInfo.size,
          variation: itemInfo.variation,
          totalQuantity: numTotalQuantity,
          packedQuantity: qtFromStock,
          producedQuantity: qtFromStock,
          paintedQuantity: qtFromStock,
          cutQuantity: qtFromStock,
          isThirdPartyLaser: itemInfo.isThirdPartyLaser,
          isUrgent: itemInfo.isUrgent,
          isProgramacao: itemInfo.isProgramacao,
          isActive: status !== "TEM_ESTOQUE",
          createdAt: Date.now(),
          deliveryDate,
          status
        });
        if (itemInfo.isThirdPartyLaser) {
          db.addNotification({
            message: `Novo Pedido Corte Laser Terceirizado: ${orderCode}`,
            read: false
          });
        }
      });
      sendServerPush(
        "Novo Pedido Gerado",
        `Pedido ${orderCode} (Cliente: ${customerName}) foi adicionado ao sistema.`,
        itemsToProcess.some((it) => it.isThirdPartyLaser) ? ["ADMIN", "PCP", "PRODUCAO", "PROJETISTA"] : ["ADMIN", "PCP", "PRODUCAO"]
      );
    }
    setOrderCode("");
    setItemId("");
    setOrderItemSearch("");
    setCustomerName("");
    setRepresentativeName("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
    setLineItems([]);
    setIsFormVisible(false);
  };
  const handleEdit = (o) => {
    setEditingId(o.id);
    setOrderCode(o.orderCode);
    setItemId(o.itemId);
    const foundItem = db.items.find((i) => i.id === o.itemId);
    setOrderItemSearch(
      foundItem ? `${foundItem.code} - ${foundItem.name}` : ""
    );
    setCustomerName(o.customerName);
    setRepresentativeName(o.representativeName || "");
    setColor(o.color);
    setSize(o.size);
    setVariation(o.variation);
    setTotalQuantity(o.totalQuantity);
    setDeliveryDate(o.deliveryDate);
    setIsThirdPartyLaser(!!o.isThirdPartyLaser);
    setIsUrgent(!!o.isUrgent);
    setIsProgramacao(!!o.isProgramacao);
    setIsFormVisible(true);
  };
  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja excluir este pedido?")) {
      db.deleteOrder(id);
    }
  };
  const filteredOrders = db.orders.filter((o) => {
    const term = normalizeString(searchTerm);
    const customer = db.customers.find(
      (c) => c.name === o.customerName || c.tradeName === o.customerName
    );
    const item = db.items.find((i) => i.id === o.itemId);
    const searchTarget = normalizeString(
      `${o.orderCode} ${o.customerName} ${customer?.tradeName || ""} ${item?.name || ""} ${item?.code || ""}`
    );
    const matchesSearch = searchTarget.includes(term);
    if (!matchesSearch) return false;
    if (filterLaserOnly) {
      const nameRawLower = (item?.name || "").toLowerCase();
      if (nameRawLower.includes("barra chata") || nameRawLower.includes("barrachata")) {
        return false;
      }
      const itemNorm = normalizeString(item?.name || "");
      const isPeOrChapa = itemNorm.includes("pe") || itemNorm.includes("chapa");
      const isThirdParty = !!o.isThirdPartyLaser;
      if (!isPeOrChapa && !isThirdParty) return false;
    }
    if (activeSubTab === "APROVACAO") {
      return o.status === "AGUARDANDO_APROVACAO";
    } else if (activeSubTab === "FATURADOS") {
      return o.status === "FATURADO";
    } else {
      return o.status !== "FATURADO" && o.status !== "AGUARDANDO_APROVACAO";
    }
  }).sort((a, b) => b.createdAt - a.createdAt);
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relat\xF3rio de Pedidos", 14, 22);
    const tableColumn = [
      "Pedido",
      "Cliente",
      "Produto",
      "Tamanho/Cor",
      "Status",
      "Qtd"
    ];
    const tableRows = [];
    filteredOrders.forEach((o) => {
      const item = db.items.find((i) => i.id === o.itemId);
      const orderInfo = [
        o.orderCode,
        o.customerName,
        item?.name || "Desconhecido",
        `${o.size || "-"} / ${o.color || "-"}`,
        o.status || "PENDENTE",
        `${o.totalQuantity}`
      ];
      tableRows.push(orderInfo);
    });
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30
    });
    doc.save(`pedidos_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`);
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-4", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-xl font-bold text-gray-800", children: [
        "Pedidos ",
        currentUser.role === "PCP" && "(PCP)"
      ] }),
      piecesByStatus.length > 0 && /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setIsStatusBarOpen(!isStatusBarOpen),
          className: "flex items-center gap-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 rounded-full px-4 py-1.5 shadow-sm hover:bg-gray-50 transition",
          children: [
            /* @__PURE__ */ jsx(Layers, { size: 16, className: "text-indigo-600" }),
            "Vis\xE3o Geral de Pe\xE7as",
            isStatusBarOpen ? /* @__PURE__ */ jsx(ChevronUp, { size: 16 }) : /* @__PURE__ */ jsx(ChevronDown, { size: 16 })
          ]
        }
      )
    ] }),
    isStatusBarOpen && piecesByStatus.length > 0 && /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl shadow-inner border border-indigo-100 mb-6 flex flex-wrap gap-3 animate-in slide-in-from-top-4 fade-in duration-200", children: [
      /* @__PURE__ */ jsx("div", { className: "w-full mb-1", children: /* @__PURE__ */ jsx("h3", { className: "text-xs uppercase font-bold text-indigo-800 tracking-wider", children: "Total de Pe\xE7as por Status (Pedidos Abertos)" }) }),
      piecesByStatus.map((st) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "bg-white border border-indigo-100/60 shadow-sm rounded-lg px-3 py-2 flex flex-col min-w-[120px]",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-500 font-bold uppercase truncate", children: st.label }),
            /* @__PURE__ */ jsxs("span", { className: "text-lg font-black text-indigo-700", children: [
              st.qty,
              " ",
              /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-400 font-medium", children: "pe\xE7as" })
            ] })
          ]
        },
        st.status
      ))
    ] }),
    (currentUser.role === "PCP" || currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-3 mb-6 shrink-0 transition-all duration-300", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex-1 flex items-center cursor-pointer pointer-events-auto",
            onClick: () => {
              if (!editingId) setIsFormVisible(!isFormVisible);
            },
            children: [
              /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-800", children: editingId ? "Editando Pedido" : "Novo Pedido / Importar" }),
              !editingId && /* @__PURE__ */ jsx("button", { className: "text-gray-500 hover:text-blue-600 transition ml-2", children: isFormVisible ? /* @__PURE__ */ jsx(ChevronUp, { size: 20 }) : /* @__PURE__ */ jsx(ChevronDown, { size: 20 }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              setIsPdfModalOpen(true);
            },
            className: "bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded shadow transition text-xs flex items-center gap-1",
            children: [
              /* @__PURE__ */ jsx(FileDown, { size: 14 }),
              " Importar PDF"
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              setIsExcelModalOpen(true);
            },
            className: "bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-1 px-3 rounded shadow transition text-xs flex items-center gap-1",
            children: "Importar do Excel"
          }
        )
      ] }),
      isPdfModalOpen && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-2 sm:p-4 animate-fade-in backdrop-blur-xs", children: /* @__PURE__ */ jsxs("div", { id: "import-orders-pdf-modal", className: "bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden border border-slate-100", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "bg-red-50 p-2 rounded-lg text-red-600", children: /* @__PURE__ */ jsx(FileDown, { size: 22 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "text-base sm:text-lg font-extrabold text-slate-800 tracking-tight", children: "Importar Pedidos via PDF" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 font-medium", children: "Extraia e revise m\xFAltiplos pedidos do PDF usando Intelig\xEAncia Artificial" })
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setIsPdfModalOpen(false);
                setPdfExtractedOrders([]);
                setPdfFile(null);
                setPdfImportResult(null);
                setPdfImportProgress(0);
              },
              className: "text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition",
              title: "Fechar",
              children: /* @__PURE__ */ jsx(X, { size: 20 })
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6", children: !pdfExtractedOrders.length ? (
          /* Tela de Upload Inicial */
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center min-h-[50vh] bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 sm:p-12 transition hover:border-indigo-400", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "file",
                accept: "application/pdf",
                className: "hidden",
                ref: pdfInputRef,
                onChange: (e) => setPdfFile(e.target.files ? e.target.files[0] : null)
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "bg-red-50 p-4 rounded-full text-red-500 mb-4 animate-bounce", children: /* @__PURE__ */ jsx(FileDown, { size: 44 }) }),
            /* @__PURE__ */ jsx("h4", { className: "text-md font-bold text-slate-800 text-center mb-1", children: "Selecione o documento de Pedidos" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs sm:text-sm text-slate-500 text-center max-w-md mb-6 leading-relaxed", children: "Fa\xE7a upload do arquivo PDF contendo um ou mais pedidos de venda. Nossa IA far\xE1 a leitura, extrair\xE1 todos os dados de cabe\xE7alho, itens e efetuar\xE1 o cruzamento inteligente com o cadastro." }),
            pdfFile ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs max-w-sm w-full", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 pr-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs font-bold text-slate-700 truncate", children: [
                  /* @__PURE__ */ jsx(FileText, { size: 16, className: "text-red-500 shrink-0" }),
                  pdfFile.name
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-400 font-mono", children: [
                  (pdfFile.size / 1024).toFixed(1),
                  " KB"
                ] })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setPdfFile(null),
                  className: "bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition shrink-0",
                  title: "Remover arquivo",
                  children: /* @__PURE__ */ jsx(Trash2, { size: 15 })
                }
              )
            ] }) : /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => pdfInputRef.current?.click(),
                className: "bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-900 transition text-sm shadow-md",
                children: "Selecionar Arquivo PDF"
              }
            ),
            pdfFile && !pdfImportResult && /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleExtractPdf,
                className: "mt-4 bg-indigo-600 text-white font-bold py-2.5 px-8 rounded-lg hover:bg-indigo-700 transition text-sm shadow-md flex items-center gap-2",
                children: [
                  /* @__PURE__ */ jsx(FileText, { size: 16 }),
                  " Processar com IA"
                ]
              }
            ),
            pdfImportResult && /* @__PURE__ */ jsx("div", { className: "mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-lg w-full max-w-md text-center border-dashed", children: pdfImportResult }),
            pdfImportProgress > 0 && !pdfExtractedOrders.length && /* @__PURE__ */ jsxs("div", { className: "mt-5 w-full max-w-md bg-white border border-indigo-100 p-4 rounded-xl shadow-md", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-xs font-bold text-indigo-600 mb-1.5 uppercase tracking-wider", children: [
                /* @__PURE__ */ jsx("span", { children: "Processando e Mapeando Documento" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  pdfImportProgress,
                  "%"
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: "bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300 animate-pulse",
                  style: { width: `${pdfImportProgress}%` }
                }
              ) })
            ] })
          ] })
        ) : (
          /* Tela de Pré-Visualização / Conferência dos dados extraídos */
          /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
            /* @__PURE__ */ jsxs("div", { id: "import-orders-summary", className: "bg-white border border-slate-200 rounded-xl p-4 shadow-sm", children: [
              /* @__PURE__ */ jsxs("h4", { className: "text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx(Activity, { size: 14, className: "text-indigo-500" }),
                "Vis\xE3o Geral de Status e Valida\xE7\xE3o dos Pedidos"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-500 font-bold uppercase tracking-wider", children: "Total PDF" }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xl font-black text-slate-800 mt-1", children: [
                    pdfExtractedOrders.length,
                    " ",
                    pdfExtractedOrders.length === 1 ? "Pedido" : "Pedidos"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-400 mt-0.5", children: [
                    pdfExtractedOrders.reduce((acc, o) => acc + (o.items?.length || 0), 0),
                    " SKU itens"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50/75 border border-emerald-100 rounded-xl p-3 flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-emerald-700 font-bold uppercase tracking-wider", children: "Aptos" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xl font-black text-emerald-800 mt-1 block", children: pdfExtractedOrders.filter((o) => o.statusValidation === "APTO").length }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-emerald-600 mt-0.5 font-bold flex items-center gap-0.5", children: [
                    /* @__PURE__ */ jsx(CheckCircle2, { size: 11 }),
                    " Pronto p/ PCP"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-amber-50/75 border border-amber-150 rounded-xl p-3 flex flex-col border-dashed animate-pulse", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-amber-700 font-bold uppercase tracking-wider", children: "Em Alerta" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xl font-black text-amber-800 mt-1 block", children: pdfExtractedOrders.filter((o) => o.statusValidation === "ALERTA").length }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-amber-600 mt-0.5 font-bold flex items-center gap-0.5", children: [
                    /* @__PURE__ */ jsx(AlertTriangle, { size: 11 }),
                    " Revisar Parcial"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-rose-50/75 border border-rose-100 rounded-xl p-3 flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-rose-700 font-bold uppercase tracking-wider", children: "Bloqueados" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xl font-black text-rose-800 mt-1 block", children: pdfExtractedOrders.filter((o) => o.statusValidation === "BLOQUEADO").length }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-rose-600 mt-0.5 font-bold flex items-center gap-0.5", children: [
                    /* @__PURE__ */ jsx(AlertCircle, { size: 11 }),
                    " J\xE1 Faturados"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-indigo-700 font-bold uppercase tracking-wider", children: "Revis\xE3o Pendente" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xl font-black text-indigo-800 mt-1 block", children: pdfExtractedOrders.filter((o) => o.statusValidation === "REVISAO").length }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-indigo-600 mt-0.5 font-bold flex items-center gap-0.5", children: [
                    /* @__PURE__ */ jsx(HelpCircle, { size: 11 }),
                    " Status indefinido"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mt-3 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-600 flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("span", { className: "shrink-0 text-amber-500", children: /* @__PURE__ */ jsx(AlertTriangle, { size: 15 }) }),
                /* @__PURE__ */ jsxs("p", { children: [
                  /* @__PURE__ */ jsx("strong", { children: "Aten\xE7\xE3o:" }),
                  " Revise cada pedido no acorde\xE3o abaixo. Pedidos com sinalizador de representante ausente ou cliente n\xE3o cadastrado ser\xE3o importados, por\xE9m devem ser ajustados ou ser\xE3o criados em modo tempor\xE1rio."
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsxs("h4", { className: "text-xs font-black text-slate-400 uppercase tracking-widest pl-1", children: [
                "Lista de Pedidos (",
                pdfExtractedOrders.length,
                ")"
              ] }),
              pdfExtractedOrders.map((order, idx) => {
                const isExpanded = expandedOrderIdx === idx;
                const hasIssues = !order.wasCustomerMatched || !order.wasRepMatched;
                const hasFinanceAccess = currentUser && (currentUser.role === "PCP" || currentUser.role === "GERENCIA" || currentUser.role === "ADMIN");
                return /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: `bg-white border rounded-xl overflow-hidden shadow-xs transition duration-200 ${isExpanded ? "border-indigo-400 ring-2 ring-indigo-50/50" : "border-slate-200 hover:border-slate-300"}`,
                    children: [
                      /* @__PURE__ */ jsxs(
                        "div",
                        {
                          onClick: () => setExpandedOrderIdx(isExpanded ? null : idx),
                          className: "px-4 py-3.5 flex items-center justify-between cursor-pointer select-none gap-2 flex-wrap sm:flex-nowrap hover:bg-slate-50/50 transition",
                          children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0 flex-1", children: [
                              /* @__PURE__ */ jsx("div", { className: "text-slate-400 shrink-0", children: isExpanded ? /* @__PURE__ */ jsx(ChevronUp, { size: 20 }) : /* @__PURE__ */ jsx(ChevronDown, { size: 20 }) }),
                              /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                                  /* @__PURE__ */ jsxs("span", { className: "font-extrabold text-slate-900 text-sm", children: [
                                    "Pedido: ",
                                    order.orderCode || `Or\xE7amento #${idx + 1}`
                                  ] }),
                                  /* @__PURE__ */ jsxs("span", { className: `text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 tracking-tight shadow-sm shrink-0 ${order.statusValidation === "BLOQUEADO" ? "bg-red-100 text-red-900 border-red-300 animate-pulse" : order.statusValidation === "ALERTA" ? "bg-amber-100 text-amber-900 border-amber-300 border-dashed" : order.statusValidation === "APTO" ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-indigo-100 text-indigo-900 border-indigo-300"}`, title: "Status extra\xEDdo do PDF", children: [
                                    /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full ${order.statusValidation === "BLOQUEADO" ? "bg-red-600" : order.statusValidation === "ALERTA" ? "bg-amber-500" : order.statusValidation === "APTO" ? "bg-emerald-500" : "bg-indigo-500"}` }),
                                    "PDF: ",
                                    order.statusOriginalPdf || "STATUS AUSENTE"
                                  ] }),
                                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                                    order.wasCustomerMatched ? /* @__PURE__ */ jsxs("span", { className: "bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5", title: "Cliente reconhecido", children: [
                                      /* @__PURE__ */ jsx(Check, { size: 9 }),
                                      " Cliente OK"
                                    ] }) : /* @__PURE__ */ jsxs("span", { className: "bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse", title: "Cliente N\xC3O cadastrado", children: [
                                      /* @__PURE__ */ jsx(AlertTriangle, { size: 9 }),
                                      " Novo Cliente"
                                    ] }),
                                    order.wasRepMatched ? /* @__PURE__ */ jsxs("span", { className: "bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5", title: "Representante reconhecido", children: [
                                      /* @__PURE__ */ jsx(Check, { size: 9 }),
                                      " Rep. OK"
                                    ] }) : /* @__PURE__ */ jsxs("span", { className: "bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5", title: "Representante n\xE3o encontrado", children: [
                                      /* @__PURE__ */ jsx(AlertTriangle, { size: 9 }),
                                      " Sem Rep."
                                    ] })
                                  ] })
                                ] }),
                                /* @__PURE__ */ jsxs("div", { className: "text-xs text-slate-500 font-medium truncate mt-1 flex items-center gap-2.5 flex-wrap sm:flex-nowrap", children: [
                                  /* @__PURE__ */ jsx("span", { className: "text-slate-800 font-semibold", children: order.customerName }),
                                  /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: "|" }),
                                  /* @__PURE__ */ jsxs("span", { className: "truncate", children: [
                                    "Rep: ",
                                    order.representativeName || "Mapeamento pendente"
                                  ] }),
                                  /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: "|" }),
                                  /* @__PURE__ */ jsxs("span", { className: `font-bold flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-100/65 ${order.statusValidation === "BLOQUEADO" ? "text-red-700 font-extrabold" : order.statusValidation === "ALERTA" ? "text-amber-700 font-extrabold" : order.statusValidation === "APTO" ? "text-emerald-700 font-bold" : "text-indigo-700 font-bold"}`, children: [
                                    order.statusValidation === "BLOQUEADO" ? "\u{1F6D1} " : order.statusValidation === "ALERTA" ? "\u26A0\uFE0F " : "\u2705 ",
                                    order.validationMessage
                                  ] })
                                ] })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 shrink-0 mt-2 sm:mt-0 text-right", children: [
                              /* @__PURE__ */ jsxs("div", { className: "hidden md:flex flex-col text-right", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-bold uppercase", children: "Entrega" }),
                                /* @__PURE__ */ jsx("span", { className: "text-xs font-mono font-bold text-slate-705", children: order.deliveryDate || "-" })
                              ] }),
                              hasFinanceAccess && order.totalValue !== void 0 && /* @__PURE__ */ jsxs("div", { className: "flex flex-col text-right pr-2", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-bold uppercase", children: "Valor Total" }),
                                /* @__PURE__ */ jsxs("span", { className: "text-sm font-black text-emerald-700 font-mono", children: [
                                  "R$ ",
                                  Number(order.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                ] })
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition", children: /* @__PURE__ */ jsx(FileText, { size: 16 }) })
                            ] })
                          ]
                        }
                      ),
                      isExpanded && /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-150 bg-slate-50/30 p-4 sm:p-5 space-y-5 animate-slide-down", children: [
                        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3.5", children: [
                          /* @__PURE__ */ jsxs("div", { className: `p-3 rounded-lg border text-xs bg-white ${order.wasCustomerMatched ? "bg-emerald-50/10 border-emerald-100/80 text-slate-700" : "bg-red-50/10 border-red-105 text-slate-700"}`, children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 font-bold mb-1.5", children: [
                              order.wasCustomerMatched ? /* @__PURE__ */ jsx("span", { className: "text-emerald-600", children: /* @__PURE__ */ jsx(CheckCircle2, { size: 16 }) }) : /* @__PURE__ */ jsx("span", { className: "text-red-500 animate-pulse", children: /* @__PURE__ */ jsx(AlertTriangle, { size: 16 }) }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-850 uppercase tracking-wider text-[10px]", children: "Verifica\xE7\xE3o do Cliente" })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "space-y-1 bg-white p-2.5 rounded-lg border border-slate-100", children: [
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium", children: "Extra\xEDdo no PDF:" }),
                                /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-700", children: order.originalCustomerName || "N\xE3o Informado" })
                              ] }),
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium", children: "C\xF3digo Extra\xEDdo:" }),
                                /* @__PURE__ */ jsx("span", { className: "font-mono font-bold text-slate-705", children: order.customerCode || "N\xE3o Informado" })
                              ] }),
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1 text-xs", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium", children: "Cadastro Vinculado:" }),
                                /* @__PURE__ */ jsx("span", { className: `font-black ${order.wasCustomerMatched ? "text-emerald-700" : "text-red-650"}`, children: order.wasCustomerMatched ? `${order.customerName} (ID: ${order.matchedCustomer?.id})` : "Nenhum cadastro correspondente encontrado" })
                              ] })
                            ] }),
                            !order.wasCustomerMatched && /* @__PURE__ */ jsx("p", { className: "text-[10px] text-red-500 mt-1.5 italic font-medium", children: "\u26A0\uFE0F O pedido ser\xE1 importado com a raz\xE3o social extra\xEDda brutamente do PDF. \xC9 recomend\xE1vel cadastr\xE1-lo previamente no m\xF3dulo de clientes." })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: `p-3 rounded-lg border text-xs bg-white ${order.wasRepMatched ? "bg-emerald-50/10 border-emerald-100/80 text-slate-700" : "bg-amber-50/10 border-amber-105 text-slate-700"}`, children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 font-bold mb-1.5", children: [
                              order.wasRepMatched ? /* @__PURE__ */ jsx("span", { className: "text-emerald-600", children: /* @__PURE__ */ jsx(CheckCircle2, { size: 16 }) }) : /* @__PURE__ */ jsx("span", { className: "text-amber-500 animate-pulse", children: /* @__PURE__ */ jsx(AlertTriangle, { size: 16 }) }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-850 uppercase tracking-wider text-[10px]", children: "V\xEDnculo do Consultor/Representante" })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "space-y-1 bg-white p-2.5 rounded-lg border border-slate-100", children: [
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium font-sans", children: '"Consultor" no PDF:' }),
                                /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-705", children: order.representativeName || "Sem Representante" })
                              ] }),
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium", children: "Usu\xE1rio Vinculado:" }),
                                /* @__PURE__ */ jsx("span", { className: `font-black ${order.wasRepMatched ? "text-emerald-700" : "text-amber-600"}`, children: order.wasRepMatched ? `${order.representativeName} (ID: ${order.representativeId})` : "Nenhum representante correspondente" })
                              ] })
                            ] }),
                            !order.wasRepMatched && /* @__PURE__ */ jsx("p", { className: "text-[10px] text-amber-600 mt-1.5 italic font-medium", children: "\u26A0\uFE0F Sem representante vinculado automaticamente. Ele n\xE3o poder\xE1 ver o pedido em seu painel individual at\xE9 ser corrigido no PCP." })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: `p-3 rounded-lg border text-xs bg-white ${order.statusValidation === "BLOQUEADO" ? "bg-red-50/15 border-red-200 text-slate-700 animate-pulse" : order.statusValidation === "ALERTA" ? "bg-amber-50/15 border-amber-200 text-slate-700" : order.statusValidation === "APTO" ? "bg-emerald-50/15 border-emerald-200 text-slate-700" : "bg-indigo-50/15 border-indigo-200 text-slate-700"}`, children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 font-bold mb-1.5", children: [
                              order.statusValidation === "BLOQUEADO" ? /* @__PURE__ */ jsx("span", { className: "text-red-600", children: /* @__PURE__ */ jsx(AlertCircle, { size: 16 }) }) : order.statusValidation === "ALERTA" ? /* @__PURE__ */ jsx("span", { className: "text-amber-500", children: /* @__PURE__ */ jsx(AlertTriangle, { size: 16 }) }) : order.statusValidation === "APTO" ? /* @__PURE__ */ jsx("span", { className: "text-emerald-600", children: /* @__PURE__ */ jsx(CheckCircle2, { size: 16 }) }) : /* @__PURE__ */ jsx("span", { className: "text-indigo-600", children: /* @__PURE__ */ jsx(HelpCircle, { size: 16 }) }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-850 uppercase tracking-wider text-[10px]", children: "Valida\xE7\xE3o do Status comercial" })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "space-y-1 bg-white p-2.5 rounded-lg border border-slate-100", children: [
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium", children: "Status no PDF:" }),
                                /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-700 uppercase font-mono", children: order.statusOriginalPdf || "N\xE3o Informado" })
                              ] }),
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1 text-[11px]", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium", children: "Regra Aplicada:" }),
                                /* @__PURE__ */ jsx("span", { className: `font-black ${order.statusValidation === "BLOQUEADO" ? "text-red-700 font-black" : order.statusValidation === "ALERTA" ? "text-amber-700 font-black" : order.statusValidation === "APTO" ? "text-emerald-700 font-black" : "text-indigo-700 font-black"}`, children: order.statusValidation === "BLOQUEADO" ? "BLOQUEADO" : order.statusValidation === "ALERTA" ? "ALERTA DE REVIS\xC3O" : order.statusValidation === "APTO" ? "LIBERADO" : "REVIS\xC3O MANUAL" })
                              ] }),
                              /* @__PURE__ */ jsxs("p", { className: "flex justify-between text-xs pt-1", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-medium", children: "Status PCP Vinculado:" }),
                                /* @__PURE__ */ jsx("span", { className: "text-indigo-900 font-mono font-bold bg-indigo-50 px-1.5 rounded", children: order.status })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsx("p", { className: `text-[10px] mt-1.5 italic font-medium leading-normal p-1 px-1.5 rounded ${order.statusValidation === "BLOQUEADO" ? "text-red-700 bg-red-50 border border-red-100 font-bold" : order.statusValidation === "ALERTA" ? "text-amber-700 bg-amber-50 border border-amber-100 font-bold" : order.statusValidation === "APTO" ? "text-emerald-700 bg-emerald-50" : "text-indigo-700 bg-indigo-50"}`, children: order.validationMessage })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-150 p-4 rounded-xl shadow-xs", children: [
                          /* @__PURE__ */ jsx("h5", { className: "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3", children: "Informa\xE7\xF5es do Pedido" }),
                          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-xs", children: [
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5", children: "N\xFAmero Pedido" }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-800 font-extrabold text-sm", children: order.orderCode || "-" })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5", children: "Situa\xE7\xE3o / Forma Pgto" }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-800 font-semibold", children: order.paymentCondition || "-" })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5", children: "Prazo de Pagamento" }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-800 font-semibold", children: order.paymentTerm || "-" })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5", children: "Data Emiss\xE3o" }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-800 font-mono font-bold", children: order.emissionDate || "A ser definida" })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5", children: "Data Estimada Entrega" }),
                              /* @__PURE__ */ jsx("span", { className: "text-slate-900 font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded inline-block", children: order.deliveryDate || "Sem data" })
                            ] }),
                            hasFinanceAccess && /* @__PURE__ */ jsxs(Fragment, { children: [
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5", children: "Total Bruto" }),
                                /* @__PURE__ */ jsxs("span", { className: "text-slate-700 font-bold font-mono", children: [
                                  "R$ ",
                                  order.totalGrossValue ? Number(order.totalGrossValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "-"
                                ] })
                              ] }),
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5 text-emerald-700", children: "Total L\xEDquido" }),
                                /* @__PURE__ */ jsxs("span", { className: "text-emerald-700 font-extrabold font-mono text-sm", children: [
                                  "R$ ",
                                  order.totalValue ? Number(order.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "-"
                                ] })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5", children: "Quantidade de Itens" }),
                              /* @__PURE__ */ jsxs("span", { className: "text-slate-850 font-extrabold font-mono", children: [
                                order.items?.length || 0,
                                " itens extra\xEDdos"
                              ] })
                            ] }),
                            order.notes && /* @__PURE__ */ jsxs("div", { className: "col-span-2 md:col-span-4 bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-xs italic mt-2 text-slate-600", children: [
                              /* @__PURE__ */ jsx("strong", { children: "Observa\xE7\xF5es do Pedido:" }),
                              " ",
                              order.notes
                            ] })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs", children: [
                          /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 px-4 py-2 border-b border-slate-150 flex justify-between items-center", children: [
                            /* @__PURE__ */ jsxs("h5", { className: "text-[10px] font-black text-slate-400 uppercase tracking-widest", children: [
                              "Itens do Pedido (",
                              order.items?.length || 0,
                              ")"
                            ] }),
                            /* @__PURE__ */ jsx("span", { className: "bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold", children: "PDF Items Preview" })
                          ] }),
                          /* @__PURE__ */ jsx("div", { className: "hidden md:block overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-xs bg-white", children: [
                            /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-150", children: /* @__PURE__ */ jsxs("tr", { children: [
                              /* @__PURE__ */ jsx("th", { className: "p-3 font-bold", children: "C\xD3DIGO / SKU" }),
                              /* @__PURE__ */ jsx("th", { className: "p-3 font-bold", children: "DESCRI\xC7\xC3O DO ITEM" }),
                              /* @__PURE__ */ jsx("th", { className: "p-3 font-bold text-center", children: "COR/TAM" }),
                              /* @__PURE__ */ jsx("th", { className: "p-3 font-bold text-center", children: "UNIDADE" }),
                              /* @__PURE__ */ jsx("th", { className: "p-3 font-bold text-center", children: "QUANTIDADE" }),
                              hasFinanceAccess ? /* @__PURE__ */ jsxs(Fragment, { children: [
                                /* @__PURE__ */ jsx("th", { className: "p-3 font-bold text-right text-indigo-900", children: "VALOR UNIT." }),
                                /* @__PURE__ */ jsx("th", { className: "p-3 font-bold text-right text-emerald-950", children: "VALOR TOTAL" })
                              ] }) : /* @__PURE__ */ jsx("th", { className: "p-3 text-center text-slate-400 font-medium", children: "FINANCEIRO" })
                            ] }) }),
                            /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-150 text-slate-800", children: order.items.map((item, i2) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50/40 transition-colors", children: [
                              /* @__PURE__ */ jsx("td", { className: "p-3 font-mono font-bold text-slate-700 bg-slate-50/30", children: item.itemCode || /* @__PURE__ */ jsx("span", { className: "text-slate-400 italic font-normal", children: "S/ c\xF3digo" }) }),
                              /* @__PURE__ */ jsx("td", { className: "p-3 font-semibold text-slate-900", children: item.itemName }),
                              /* @__PURE__ */ jsxs("td", { className: "p-3 font-medium text-slate-650 text-center", children: [
                                item.color || "-",
                                " / ",
                                item.size || "-"
                              ] }),
                              /* @__PURE__ */ jsx("td", { className: "p-3 font-bold text-slate-500 text-center", children: item.unit || "UN" }),
                              /* @__PURE__ */ jsx("td", { className: "p-3 font-black text-slate-900 text-center bg-indigo-50/10", children: item.quantity }),
                              hasFinanceAccess ? /* @__PURE__ */ jsxs(Fragment, { children: [
                                /* @__PURE__ */ jsxs("td", { className: "p-3 text-right font-semibold text-indigo-700 font-mono", children: [
                                  "R$ ",
                                  item.unitPrice ? Number(item.unitPrice).toFixed(2) : "0.00"
                                ] }),
                                /* @__PURE__ */ jsxs("td", { className: "p-3 text-right font-black text-emerald-750 font-mono", children: [
                                  "R$ ",
                                  item.totalPrice ? Number(item.totalPrice).toFixed(2) : Number((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)
                                ] })
                              ] }) : /* @__PURE__ */ jsx("td", { className: "p-3 text-center text-slate-400", children: /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold", children: [
                                /* @__PURE__ */ jsx(Lock, { size: 10, className: "shrink-0" }),
                                " Oculto (Representante)"
                              ] }) })
                            ] }, i2)) })
                          ] }) }),
                          /* @__PURE__ */ jsx("div", { className: "block md:hidden divide-y divide-slate-150", children: order.items.map((item, i2) => /* @__PURE__ */ jsxs("div", { className: "p-3.5 space-y-2 bg-slate-55/10 font-sans", children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
                              /* @__PURE__ */ jsxs("div", { className: "min-w-0 pr-2", children: [
                                /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded", children: [
                                  "SKU: ",
                                  item.itemCode || "S/ c\xF3digo"
                                ] }),
                                /* @__PURE__ */ jsx("h6", { className: "font-semibold text-slate-800 text-xs mt-1 leading-normal", children: item.itemName })
                              ] }),
                              /* @__PURE__ */ jsxs("div", { className: "text-right shrink-0", children: [
                                /* @__PURE__ */ jsx("span", { className: "block text-[9px] text-slate-400 font-bold uppercase", children: "Unidade" }),
                                /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-700 text-xs", children: item.unit || "UN" })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-slate-100 text-[11px]", children: [
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("span", { className: "block text-[8px] text-slate-450 font-bold uppercase", children: "Qtd" }),
                                /* @__PURE__ */ jsx("span", { className: "font-extrabold text-slate-800", children: item.quantity })
                              ] }),
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("span", { className: "block text-[8px] text-slate-450 font-bold uppercase", children: "Atributos" }),
                                /* @__PURE__ */ jsxs("span", { className: "font-medium text-slate-600 truncate block max-w-full", children: [
                                  item.color || "-",
                                  " / ",
                                  item.size || "-"
                                ] })
                              ] }),
                              hasFinanceAccess ? /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                                /* @__PURE__ */ jsx("span", { className: "block text-[8px] text-slate-450 font-bold uppercase", children: "Total It." }),
                                /* @__PURE__ */ jsxs("span", { className: "font-black text-emerald-700 font-mono text-[10px] block", children: [
                                  "R$ ",
                                  Number(item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)
                                ] })
                              ] }) : /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                                /* @__PURE__ */ jsx("span", { className: "block text-[8px] text-slate-450 font-bold uppercase", children: "Valores" }),
                                /* @__PURE__ */ jsxs("span", { className: "text-[9px] text-slate-400 font-bold inline-flex items-center gap-0.5 leading-normal", children: [
                                  /* @__PURE__ */ jsx(Lock, { size: 9 }),
                                  " Bloqueado"
                                ] })
                              ] })
                            ] })
                          ] }, i2)) })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[10px] text-slate-400 bg-slate-100 p-2.5 rounded-lg border border-slate-150", children: [
                          /* @__PURE__ */ jsx("span", { children: "Extra\xE7\xE3o Auditada via Intelig\xEAncia Artificial do Sistema" }),
                          hasFinanceAccess && order.totalGrossValue && order.totalValue ? /* @__PURE__ */ jsxs("span", { children: [
                            "Desconto estimado: ",
                            ((order.totalGrossValue - order.totalValue) / order.totalGrossValue * 100).toFixed(1),
                            "%"
                          ] }) : null
                        ] })
                      ] })
                    ]
                  },
                  idx
                );
              })
            ] })
          ] })
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "px-5 py-4 border-t border-slate-150 bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]", children: [
          pdfExtractedOrders.length > 0 ? /* @__PURE__ */ jsxs("div", { id: "import-footer-actions", className: "flex flex-col sm:flex-row justify-between items-center gap-3", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 font-medium text-center sm:text-left", children: [
              "Total Geral pronto: ",
              /* @__PURE__ */ jsxs("strong", { className: "text-indigo-600", children: [
                pdfExtractedOrders.length,
                " pedidos"
              ] }),
              '. Clique em "Confirmar" para que ingressem na base de dados ativa do sistema.'
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2 w-full sm:w-auto shrink-0", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => {
                    setPdfExtractedOrders([]);
                    setPdfImportResult(null);
                    setPdfImportProgress(0);
                  },
                  className: "flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition text-xs uppercase tracking-wider",
                  children: "Cancelar e Reenviar"
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: handleConfirmPdfImport,
                  className: "flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2 rounded-lg shadow-md hover:shadow transition text-xs uppercase tracking-wider flex items-center justify-center gap-2",
                  children: [
                    /* @__PURE__ */ jsx(CheckCircle2, { size: 14 }),
                    " Confirmar Importa\xE7\xE3o"
                  ]
                }
              )
            ] })
          ] }) : /* @__PURE__ */ jsx("div", { className: "flex justify-end text-xs text-slate-400 font-medium", children: "Status: Pronto para upload e processamento de arquivo" }),
          pdfImportProgress > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-3 bg-indigo-50 border border-indigo-100 p-3 rounded-lg shadow-xs animate-pulse", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[10px] font-black text-indigo-700 mb-1 uppercase tracking-wider", children: [
              /* @__PURE__ */ jsx("span", { children: "Gravando registros no banco de dados" }),
              /* @__PURE__ */ jsxs("span", { children: [
                pdfImportProgress,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-full bg-indigo-200 rounded-full h-2 overflow-hidden", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: "bg-indigo-600 h-2 rounded-full transition-all duration-300",
                style: { width: `${pdfImportProgress}%` }
              }
            ) })
          ] })
        ] })
      ] }) }),
      isExcelModalOpen && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-gray-800", children: "Importa\xE7\xE3o de Pedidos via Excel" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setIsExcelModalOpen(false),
              className: "text-gray-500 hover:text-gray-800",
              children: /* @__PURE__ */ jsx(X, { size: 24 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 mb-2", children: [
          "Cole os dados diretamente do Excel. Ordens das colunas esperadas:",
          /* @__PURE__ */ jsx("br", {}),
          /* @__PURE__ */ jsx("span", { className: "font-mono bg-gray-100 px-1 py-0.5 rounded text-xs text-blue-800", children: "C\xF3digo do Pedido | Cliente | Representante | Produto | Cor | Tamanho | Varia\xE7\xE3o | Quantidade | Data Entrega" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: "* M\xEDnimo exigido: Pedido, Cliente, Representante, Produto. (A Quantidade assume 1 se vazia)" }) }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: excelData,
            onChange: (e) => setExcelData(e.target.value),
            placeholder: "Cole aqui as linhas do Excel...",
            className: "flex-1 w-full border border-gray-300 rounded p-3 min-h-[200px] text-sm overflow-auto focus:outline-[#107c41] font-mono whitespace-pre"
          }
        ),
        excelImportResult && /* @__PURE__ */ jsxs(
          "div",
          {
            className: `mt-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${excelImportResult.includes("Processando") ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsx("span", { children: excelImportResult }),
                excelImportResult.includes("Processando") && /* @__PURE__ */ jsxs("span", { className: "text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800", children: [
                  excelImportProgress,
                  "%"
                ] })
              ] }),
              excelImportResult.includes("Processando") && /* @__PURE__ */ jsx("div", { className: "w-full bg-blue-200 h-2.5 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: "bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out",
                  style: { width: `${excelImportProgress}%` }
                }
              ) })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 mt-4 shrink-0", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setIsExcelModalOpen(false),
              className: "px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition",
              children: "Cancelar"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleImportExcel,
              disabled: !excelData.trim() || !!excelImportResult,
              className: "bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50",
              children: "Confirmar Importa\xE7\xE3o"
            }
          )
        ] })
      ] }) }),
      isFormVisible && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 mt-2 animate-in slide-in-from-top-4 fade-in duration-200", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            value: orderCode,
            onChange: (e) => setOrderCode(e.target.value),
            placeholder: "C\xF3digo do Pedido (Ex: PED-001)",
            className: "border border-gray-300 p-2 rounded"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              value: customerName,
              onChange: (e) => {
                setCustomerName(e.target.value);
                setCustomerSelected(false);
              },
              placeholder: "Cliente",
              className: "border border-gray-300 p-2 rounded w-full"
            }
          ),
          !customerSelected && customerName.trim().length > 0 && (() => {
            const query = customerName.toLowerCase();
            const matches = db.customers.filter(
              (c) => String(c.id).includes(query) || (c.name || "").toLowerCase().includes(query) || (c.tradeName || "").toLowerCase().includes(query)
            ).slice(0, 10);
            if (matches.length === 0) return null;
            return /* @__PURE__ */ jsx("div", { className: "absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto", children: matches.map((c) => {
              const hasTrade = c.tradeName && c.tradeName !== c.name;
              return /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setCustomerName(c.name);
                    setCustomerSelected(true);
                  },
                  className: "w-full text-left p-2 hover:bg-blue-50 text-xs border-b last:border-0 flex flex-col gap-0.5",
                  children: [
                    /* @__PURE__ */ jsxs("span", { className: "font-semibold text-gray-800", children: [
                      c.id,
                      " - ",
                      c.name
                    ] }),
                    hasTrade && /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-100/50 px-1 py-0.5 rounded self-start", children: [
                      "Fantasia: ",
                      c.tradeName
                    ] })
                  ]
                },
                c.id
              );
            }) });
          })()
        ] }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: representativeName,
            onChange: (e) => setRepresentativeName(e.target.value),
            className: "border border-gray-300 p-2 rounded bg-white text-gray-800",
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "Representante (Opcional)" }),
              db.users.filter((u) => u.role === "REPRESENTANTE").map((u) => /* @__PURE__ */ jsx("option", { value: u.name, children: u.name }, u.id))
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              placeholder: "Pesquisar Item (C\xF3digo ou Nome)...",
              className: "border border-gray-300 p-2 rounded w-full bg-white text-gray-800 font-semibold",
              value: orderItemSearch,
              onChange: (e) => {
                const val = e.target.value;
                setOrderItemSearch(val);
                const found = db.items.find(
                  (it) => `${it.code} - ${it.name}`.toLowerCase() === val.trim().toLowerCase()
                );
                if (found) {
                  setItemId(found.id);
                } else {
                  setItemId("");
                }
              }
            }
          ),
          !itemId && orderItemSearch.trim().length > 0 && /* @__PURE__ */ jsxs("div", { className: "absolute left-0 right-0 z-50 mt-1 flex flex-col gap-1 border border-slate-200 rounded-lg p-1 bg-white shadow-lg max-h-40 overflow-y-auto", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-slate-400 px-2 pt-0.5 uppercase tracking-wider block bg-slate-50 py-1 border-b", children: "Cat\xE1logo de itens:" }),
            suggestedOrderItems.length === 0 ? /* @__PURE__ */ jsx("span", { className: "text-[11px] text-gray-500 px-2 py-1", children: "Nenhum item correspondente." }) : suggestedOrderItems.map((it) => /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  setOrderItemSearch(`${it.code} - ${it.name}`);
                  setItemId(it.id);
                },
                className: "text-left text-xs px-2.5 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors bg-white border border-slate-200 font-medium text-slate-700 flex items-center justify-between",
                children: [
                  /* @__PURE__ */ jsx("span", { children: it.name }),
                  /* @__PURE__ */ jsx("span", { className: "font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded", children: it.code })
                ]
              },
              it.id
            ))
          ] }),
          itemId && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between bg-emerald-50 border border-emerald-250 rounded-lg p-2 mt-1", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-xs text-emerald-800 font-bold", children: [
              "\u2713 Item selecionado:",
              " ",
              db.items.find((i) => i.id === itemId)?.name
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  setOrderItemSearch("");
                  setItemId("");
                },
                className: "text-emerald-700 hover:text-emerald-900 text-xs font-black px-2 py-0.5 bg-emerald-100 rounded hover:bg-emerald-200 transition",
                children: "Alterar"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              value: color,
              onChange: (e) => setColor(e.target.value),
              placeholder: "Cor",
              className: "border border-gray-300 p-2 rounded w-1/3"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              value: size,
              onChange: (e) => setSize(e.target.value),
              placeholder: "Tamanho",
              className: "border border-gray-300 p-2 rounded w-1/3"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              value: variation,
              onChange: (e) => setVariation(e.target.value),
              placeholder: "Varia\xE7\xE3o",
              className: "border border-gray-300 p-2 rounded w-1/3"
            }
          )
        ] }),
        itemId && /* @__PURE__ */ jsxs("div", { className: "text-sm font-semibold text-emerald-600 bg-emerald-50 p-2 rounded flex justify-between border border-emerald-100", children: [
          /* @__PURE__ */ jsx("span", { children: "Estoque Dispon\xEDvel:" }),
          /* @__PURE__ */ jsxs("span", { children: [
            db.stocks.find(
              (s) => s.id === `${itemId}|${color}|${size}|${variation}|ACABADO`
            )?.quantity || 0,
            " ",
            "unid."
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              value: totalQuantity,
              onChange: (e) => setTotalQuantity(Number(e.target.value)),
              placeholder: "Quantidade Total",
              className: "border border-gray-300 p-2 rounded w-1/2"
            }
          ),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "date",
              value: deliveryDate,
              onChange: (e) => setDeliveryDate(e.target.value),
              className: "border border-gray-300 p-2 rounded w-1/2 text-gray-600"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-4 mt-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                id: "laserTerc",
                checked: isThirdPartyLaser,
                onChange: (e) => setIsThirdPartyLaser(e.target.checked),
                className: "w-5 h-5 text-blue-600 rounded bg-gray-100 border-gray-300 focus:ring-blue-500"
              }
            ),
            /* @__PURE__ */ jsx(
              "label",
              {
                htmlFor: "laserTerc",
                className: "text-sm text-gray-700 font-semibold cursor-pointer",
                children: "Corte a Laser Terceirizado"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                id: "isUrgent",
                checked: isUrgent,
                onChange: (e) => setIsUrgent(e.target.checked),
                className: "w-5 h-5 text-red-600 rounded bg-red-100 border-red-300 focus:ring-red-500"
              }
            ),
            /* @__PURE__ */ jsx(
              "label",
              {
                htmlFor: "isUrgent",
                className: "text-sm text-red-700 font-bold cursor-pointer",
                children: "Pedido Urgente"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                id: "isProgramacao",
                checked: isProgramacao,
                onChange: (e) => setIsProgramacao(e.target.checked),
                className: "w-5 h-5 text-indigo-600 rounded bg-indigo-100 border-indigo-300 focus:ring-indigo-500"
              }
            ),
            /* @__PURE__ */ jsx(
              "label",
              {
                htmlFor: "isProgramacao",
                className: "text-sm text-indigo-700 font-bold cursor-pointer flex items-center gap-1",
                children: "\u{1F4C8} Pedido \xE9 Programa\xE7\xE3o"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 mt-2", children: [
          !editingId && lineItems.length > 0 && /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-2 border border-slate-200 rounded flex flex-col gap-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-gray-500 uppercase", children: "Produtos neste Pedido:" }),
            lineItems.map((li, idx) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "flex justify-between items-center text-sm border-b border-gray-100 pb-1",
                children: [
                  /* @__PURE__ */ jsxs("span", { children: [
                    db.items.find((i) => i.id === li.itemId)?.name,
                    " ",
                    /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-500", children: [
                      "(",
                      li.color,
                      " ",
                      li.size,
                      " ",
                      li.variation,
                      ")"
                    ] }),
                    " ",
                    "-",
                    " ",
                    /* @__PURE__ */ jsxs("span", { className: "font-bold", children: [
                      li.totalQuantity,
                      " p\xE7s"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
                    li.isUrgent && /* @__PURE__ */ jsx("span", { className: "bg-red-100 text-red-800 text-[10px] px-1 rounded font-bold", children: "URG" }),
                    li.isProgramacao && /* @__PURE__ */ jsx("span", { className: "bg-indigo-100 text-indigo-800 text-[10px] px-1 rounded font-bold", children: "PROG" }),
                    li.isThirdPartyLaser && /* @__PURE__ */ jsx("span", { className: "bg-blue-100 text-blue-800 text-[10px] px-1 rounded font-bold", children: "LASER" })
                  ] })
                ]
              },
              idx
            ))
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [
            !editingId && /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleAddProductToOrder,
                className: "flex-1 bg-emerald-600 text-white font-semibold p-2 rounded hover:bg-emerald-700 transition disabled:opacity-50",
                disabled: !itemId || !totalQuantity,
                children: "+ Outro Produto"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleCadastrar,
                className: `flex-1 ${editingId ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"} font-bold text-white p-2 rounded transition`,
                children: editingId ? "Salvar Altera\xE7\xF5es" : "Gerar Pedido"
              }
            )
          ] })
        ] }),
        editingId && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setEditingId(null);
              setIsFormVisible(false);
              setOrderCode("");
              setItemId("");
              setCustomerName("");
              setColor("");
              setSize("");
              setVariation("");
              setTotalQuantity("");
              setIsThirdPartyLaser(false);
              setIsUrgent(false);
            },
            className: "bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 transition",
            children: "Cancelar"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto w-full", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-2", children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700", children: "Fluxo de Pedidos" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleExportPDF,
            className: "bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1 px-3 rounded shadow transition",
            children: "Exportar PDF"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex rounded-lg overflow-hidden border border-indigo-600 mb-4 shrink-0 shadow-sm", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: `flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${activeSubTab === "ABERTOS" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 hover:bg-indigo-50/20"}`,
            onClick: () => setActiveSubTab("ABERTOS"),
            children: [
              "\u{1F4CB} Ativos (",
              db.orders.filter(
                (o) => o.status !== "FATURADO" && o.status !== "AGUARDANDO_APROVACAO"
              ).length,
              ")"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: `flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${activeSubTab === "APROVACAO" ? "bg-indigo-600 text-white animate-pulse" : "bg-white text-indigo-100 hover:bg-indigo-50/20"}`,
            onClick: () => setActiveSubTab("APROVACAO"),
            style: { color: activeSubTab === "APROVACAO" ? "#fff" : "#4f46e5" },
            children: [
              "\u23F3 Aprova\xE7\xE3o (",
              db.orders.filter((o) => o.status === "AGUARDANDO_APROVACAO").length,
              ")"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: `flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${activeSubTab === "FATURADOS" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 hover:bg-indigo-50/20"}`,
            onClick: () => setActiveSubTab("FATURADOS"),
            children: [
              "\u2705 Faturados (",
              db.orders.filter((o) => o.status === "FATURADO").length,
              ")"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          placeholder: "Pesquisar por C\xF3digo ou Cliente...",
          className: "border border-gray-300 p-2 rounded w-full mb-4 focus:outline-blue-500 bg-white"
        }
      ),
      (currentUser.id === "projetista_marcos" || currentUser.role === "PROJETISTA" || currentUser.role === "ADMIN") && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 mb-4 bg-emerald-50 border border-emerald-200/60 p-3 rounded-xl shadow-xs transition hover:bg-emerald-50/80", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            id: "filter-laser-only",
            checked: filterLaserOnly,
            onChange: (e) => setFilterLaserOnly(e.target.checked),
            className: "w-4.5 h-4.5 text-emerald-600 border-gray-350 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer transition"
          }
        ),
        /* @__PURE__ */ jsx(
          "label",
          {
            htmlFor: "filter-laser-only",
            className: "text-xs font-extrabold text-emerald-800 cursor-pointer select-none leading-none",
            children: "\u{1F3AF} Apenas Pedidos de Laser (P\xE9s, Chapas e Cortes Terceirizados)"
          }
        )
      ] }),
      filteredOrders.some((o) => o.status === "EMBALADO") && /* @__PURE__ */ jsxs("div", { className: "bg-indigo-50 border border-indigo-200 p-3 rounded-lg mb-4 flex items-center justify-between shadow-xs", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              id: "batch-select-all",
              className: "w-4 h-4 text-indigo-600 border-gray-200 rounded cursor-pointer",
              checked: filteredOrders.filter((o) => o.status === "EMBALADO").length > 0 && filteredOrders.filter((o) => o.status === "EMBALADO").every((o) => selectedBatchInvoiceIds.includes(o.id)),
              onChange: (e) => {
                const embalados = filteredOrders.filter(
                  (o) => o.status === "EMBALADO"
                );
                if (e.target.checked) {
                  setSelectedBatchInvoiceIds((prev) => [
                    ...prev,
                    ...embalados.map((o) => o.id).filter((id) => !prev.includes(id))
                  ]);
                } else {
                  setSelectedBatchInvoiceIds(
                    (prev) => prev.filter((id) => !embalados.some((o) => o.id === id))
                  );
                }
              }
            }
          ),
          /* @__PURE__ */ jsxs(
            "label",
            {
              htmlFor: "batch-select-all",
              className: "text-xs font-bold text-indigo-950 uppercase cursor-pointer select-none",
              children: [
                "Selecionar todos os Embalados (",
                filteredOrders.filter((o) => o.status === "EMBALADO").length,
                ")"
              ]
            }
          )
        ] }),
        selectedBatchInvoiceIds.length > 0 && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-emerald-100 border border-emerald-350 px-3 py-1.5 rounded-xl text-center shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider block leading-none", children: "Soma de Pe\xE7as" }),
            /* @__PURE__ */ jsxs("span", { className: "text-xs font-black text-emerald-950 block mt-0.5 leading-none", children: [
              batchTotalQty,
              " un."
            ] })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: handleBatchInvoice,
              className: "bg-emerald-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm hover:bg-emerald-700 transition active:scale-95",
              children: [
                "\u{1F4B0} Faturar em Lote (",
                selectedBatchInvoiceIds.length,
                ")"
              ]
            }
          )
        ] })
      ] }),
      filteredOrders.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-center mt-4", children: "Nenhum pedido encontrado nesta aba." }) : filteredOrders.map((o) => {
        const item = db.items.find((i) => i.id === o.itemId);
        return /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: () => setSelectedOrder(o),
            className: `cursor-pointer p-4 border flex flex-col rounded mb-2 shadow-sm gap-2 relative group transition-colors ${o.isUrgent ? "bg-red-50/90 hover:bg-red-100/90 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] ring-2 ring-red-500/10 animate-[pulse_3s_infinite] border-2" : "bg-white hover:bg-gray-50 border-gray-100 border-b-gray-200"}`,
            children: [
              o.isUrgent && /* @__PURE__ */ jsx("div", { className: "absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4", children: /* @__PURE__ */ jsx("span", { className: "bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse", children: "URGENTE" }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxs(
                  "span",
                  {
                    className: `font-bold ${o.isUrgent ? "text-red-900" : "text-gray-800"}`,
                    children: [
                      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
                        o.status === "EMBALADO" && /* @__PURE__ */ jsx(
                          "input",
                          {
                            type: "checkbox",
                            checked: selectedBatchInvoiceIds.includes(o.id),
                            onClick: (e) => e.stopPropagation(),
                            onChange: (e) => {
                              if (e.target.checked) {
                                setSelectedBatchInvoiceIds([
                                  ...selectedBatchInvoiceIds,
                                  o.id
                                ]);
                              } else {
                                setSelectedBatchInvoiceIds(
                                  selectedBatchInvoiceIds.filter(
                                    (id) => id !== o.id
                                  )
                                );
                              }
                            },
                            className: "w-4 h-4 mr-2 border-gray-300 rounded cursor-pointer shrink-0"
                          }
                        ),
                        o.isUrgent && /* @__PURE__ */ jsx(
                          AlertCircle,
                          {
                            className: "text-red-600 animate-bounce shrink-0",
                            size: 18
                          }
                        ),
                        o.orderCode,
                        " - ",
                        item?.name || "Desconhecido"
                      ] }),
                      o.representativeName && /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-normal text-slate-500 block", children: [
                        "Representante: ",
                        o.representativeName
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
                  /* @__PURE__ */ jsx("span", { className: "px-2 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-700", children: o.status || "PENDENTE" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsxs(
                      "span",
                      {
                        className: `px-2 py-1 rounded text-xs font-semibold ${(o.packedQuantity || 0) >= (o.totalQuantity || 0) ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`,
                        title: "Embalado / Total",
                        children: [
                          "Emb: ",
                          o.packedQuantity || 0,
                          "/",
                          o.totalQuantity || 0
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "span",
                      {
                        className: `px-2 py-1 rounded text-xs font-semibold ${(o.invoicedQuantity || 0) >= (o.totalQuantity || 0) ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`,
                        title: `Faturado: ${o.invoicedQuantity || 0}, Falta: ${o.totalQuantity - (o.invoicedQuantity || 0)}`,
                        children: [
                          "Fat: ",
                          o.invoicedQuantity || 0,
                          "/",
                          o.totalQuantity || 0
                        ]
                      }
                    )
                  ] }),
                  o.status === "AGUARDANDO_APROVACAO" ? /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: (currentUser.role === "ADMIN" || currentUser.role === "PCP") && /* @__PURE__ */ jsxs("div", { className: "flex gap-2 shrink-0", children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: (e) => {
                          e.stopPropagation();
                          handleApproveOrder(o);
                        },
                        className: "bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition",
                        children: "\u2713 Aprovar"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: (e) => {
                          e.stopPropagation();
                          handleRejectOrder(o.id);
                        },
                        className: "bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition",
                        children: "\u{10102} Recusar"
                      }
                    )
                  ] }) }) : (currentUser.role === "ADMIN" || currentUser.role === "PCP") && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    ((o.packedQuantity || 0) - (o.invoicedQuantity || 0) > 0 || o.status === "EMBALADO" && (o.invoicedQuantity || 0) < o.totalQuantity) && /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          const availableToInvoice = o.status === "EMBALADO" ? o.totalQuantity - (o.invoicedQuantity || 0) : (o.packedQuantity || 0) - (o.invoicedQuantity || 0);
                          const maxToInvoice = o.totalQuantity - (o.invoicedQuantity || 0);
                          const limit = Math.min(
                            availableToInvoice,
                            maxToInvoice
                          );
                          setInvoiceModalData({ order: o, limit });
                          setInvoiceInput(String(limit));
                        },
                        className: "bg-emerald-600 text-white text-xs px-2 py-1 rounded hover:bg-emerald-700 mr-2",
                        title: "Faturar Pedido",
                        children: "Faturar"
                      }
                    ),
                    (currentUser.role === "PCP" || currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          handleEdit(o);
                        },
                        className: "text-blue-500 hover:text-blue-700",
                        title: "Editar",
                        children: /* @__PURE__ */ jsx(Pencil, { size: 18 })
                      }
                    ),
                    (currentUser.role === "PCP" || currentUser.role === "ADMIN" || currentUser.role === "GERENCIA") && /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: (e) => {
                          e.stopPropagation();
                          handleDelete(o.id);
                        },
                        className: "text-red-500 hover:text-red-700",
                        title: "Excluir",
                        children: /* @__PURE__ */ jsx(Trash2, { size: 18 })
                      }
                    )
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-600 flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                  /* @__PURE__ */ jsxs("span", { children: [
                    "Cliente: ",
                    o.customerName
                  ] }),
                  /* @__PURE__ */ jsxs("span", { children: [
                    "Entrega:",
                    " ",
                    o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString("pt-BR", {
                      timeZone: "UTC"
                    }) : "-"
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "flex justify-between items-center mt-1", children: /* @__PURE__ */ jsxs("span", { children: [
                  "Cor: ",
                  o.color || "-",
                  " | Tamanho: ",
                  o.size || "-",
                  " | Var:",
                  " ",
                  o.variation || "-"
                ] }) }),
                o.isThirdPartyLaser && /* @__PURE__ */ jsx("span", { className: "text-pink-600 font-semibold text-xs bg-pink-50 px-2 py-1 rounded inline-block w-fit mt-1", children: "Corte a Laser Terceirizado" })
              ] })
            ]
          },
          o.id
        );
      })
    ] }),
    selectedOrder && /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto",
        onClick: () => setSelectedOrder(null),
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            className: "bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center p-5 border-b border-gray-100 shrink-0", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("h2", { className: "text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3 flex items-center gap-2 flex-wrap", children: [
                    "Pedido: ",
                    selectedOrder.orderCode,
                    selectedOrder.isUrgent && /* @__PURE__ */ jsx("span", { className: "bg-red-100 text-red-850 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse", children: "URGENTE" }),
                    selectedOrder.isProgramacao && /* @__PURE__ */ jsx("span", { className: "bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded", children: "\u{1F4C8} PROGRAMA\xC7\xC3O" })
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-500 font-medium pl-4 mt-1 bg-white", children: [
                    "Cliente: ",
                    selectedOrder.customerName
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setSelectedOrder(null),
                    className: "p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200",
                    children: /* @__PURE__ */ jsx("span", { className: "font-bold px-1", children: "X" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "p-5 flex-1 overflow-y-auto bg-gray-50", children: [
                /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col gap-3", children: [
                  /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-800 border-b pb-2", children: "Informa\xE7\xF5es Adicionais" }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm mt-1", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Produto" }),
                      /* @__PURE__ */ jsx("span", { className: "text-gray-800 font-semibold", children: db.items.find((i) => i.id === selectedOrder.itemId)?.name || "-" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Quantidade Total" }),
                      /* @__PURE__ */ jsxs("span", { className: "text-blue-700 font-bold", children: [
                        selectedOrder.totalQuantity,
                        " p\xE7s"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Cor / Tamanho / Var" }),
                      /* @__PURE__ */ jsxs("span", { className: "text-gray-700 font-mono", children: [
                        selectedOrder.color || "-",
                        " / ",
                        selectedOrder.size || "-",
                        " ",
                        "/ ",
                        selectedOrder.variation || "-"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Data de Entrega" }),
                      /* @__PURE__ */ jsx("span", { className: "text-gray-700 font-semibold", children: selectedOrder.deliveryDate ? new Date(
                        selectedOrder.deliveryDate
                      ).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-" })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100", children: [
                  /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-800 border-b pb-2 mb-4", children: "Linha do Tempo (Processamento)" }),
                  (() => {
                    const orderLogs = db.logs.filter((l) => l.orderId === selectedOrder.id).sort((a, b) => b.timestamp - a.timestamp);
                    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
                      orderLogs.map((log) => {
                        let actionLabel = "Processado";
                        let actionColor = "bg-gray-100 text-gray-800";
                        let actionQty = 0;
                        switch (log.type) {
                          case "PRODUCAO":
                            actionLabel = "Produzido";
                            actionColor = "bg-blue-50 text-blue-800";
                            actionQty = log.quantityProcessed || 0;
                            break;
                          case "CORTE_LASER":
                            actionLabel = "Corte a Laser";
                            actionColor = "bg-indigo-50 text-indigo-800";
                            actionQty = log.quantityCut || 0;
                            break;
                          case "PINTURA":
                            actionLabel = "Pintura";
                            actionColor = "bg-amber-50 text-amber-850";
                            actionQty = log.quantityPainted || 0;
                            break;
                          case "EMBALAGEM":
                            actionLabel = "Embalado";
                            actionColor = "bg-green-50 text-green-800 border bg-green-50 text-green-800";
                            actionQty = log.quantityPacked || 0;
                            break;
                          case "FATURAMENTO":
                            actionLabel = "Faturado";
                            actionColor = "bg-emerald-100 text-emerald-800";
                            actionQty = log.quantityInvoiced || 0;
                            break;
                        }
                        return /* @__PURE__ */ jsxs(
                          "div",
                          {
                            className: "flex gap-4 text-sm items-start border-b border-gray-100/50 pb-3 last:border-0 last:pb-0",
                            children: [
                              /* @__PURE__ */ jsx(
                                "div",
                                {
                                  className: `px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 w-28 text-center ${actionColor}`,
                                  children: actionLabel
                                }
                              ),
                              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 text-gray-700", children: [
                                /* @__PURE__ */ jsxs("span", { className: "font-bold text-gray-900", children: [
                                  "+",
                                  actionQty
                                ] }),
                                " ",
                                "un. por",
                                " ",
                                /* @__PURE__ */ jsx("span", { className: "font-semibold text-blue-700", children: db.users.find((u) => u.id === log.operatorId)?.name || log.operatorId }),
                                log.durationMillis > 0 && /* @__PURE__ */ jsxs("span", { className: "text-gray-400 text-xs block font-mono mt-1", children: [
                                  "Tempo:",
                                  " ",
                                  Math.round(log.durationMillis / 6e4),
                                  " min"
                                ] })
                              ] }),
                              /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-400 font-mono shrink-0 whitespace-nowrap", children: [
                                new Date(log.timestamp).toLocaleDateString(),
                                " ",
                                /* @__PURE__ */ jsx("br", {}),
                                " ",
                                new Date(log.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              ] })
                            ]
                          },
                          log.id
                        );
                      }),
                      /* @__PURE__ */ jsxs("div", { className: "flex gap-4 text-sm items-start mt-2 border-t pt-3", children: [
                        /* @__PURE__ */ jsx("div", { className: "px-2 py-1 w-28 text-center rounded text-[10px] font-bold uppercase shrink-0 bg-purple-100 text-purple-800", children: "Inclus\xE3o" }),
                        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 text-gray-700", children: [
                          /* @__PURE__ */ jsx("span", { className: "font-bold text-gray-900", children: selectedOrder.totalQuantity }),
                          " ",
                          "un. (Sistema)"
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-400 font-mono shrink-0 whitespace-nowrap mt-1", children: [
                          new Date(
                            selectedOrder.createdAt
                          ).toLocaleDateString(),
                          " ",
                          /* @__PURE__ */ jsx("br", {}),
                          " ",
                          new Date(selectedOrder.createdAt).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        ] })
                      ] })
                    ] });
                  })()
                ] })
              ] })
            ]
          }
        )
      }
    ),
    invoiceModalData && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-emerald-600 p-4 shrink-0", children: /* @__PURE__ */ jsx("h3", { className: "text-white font-bold text-lg", children: "Confirmar Faturamento" }) }),
      /* @__PURE__ */ jsxs("div", { className: "p-5 flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
          "O faturamento ir\xE1 deduzir pe\xE7as do seu",
          " ",
          /* @__PURE__ */ jsx("strong", { className: "text-gray-900 bg-gray-100 px-1 rounded", children: "estoque de itens acabados" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 border border-gray-100 p-3 rounded-lg flex flex-col gap-1", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 font-bold uppercase tracking-wide", children: "Pedido" }),
          /* @__PURE__ */ jsxs("span", { className: "font-bold text-gray-900", children: [
            invoiceModalData.order.orderCode,
            " -",
            " ",
            invoiceModalData.order.customerName
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxs("label", { className: "text-xs text-gray-600 font-bold uppercase", children: [
            "Quantidade a Faturar (M\xE1ximo: ",
            invoiceModalData.limit,
            ")"
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              value: invoiceInput,
              onChange: (e) => setInvoiceInput(e.target.value),
              className: "border-2 border-emerald-500 rounded p-2 text-xl font-bold bg-emerald-50 focus:outline-none w-full",
              max: invoiceModalData.limit,
              min: 1
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setInvoiceModalData(null),
            className: "px-4 py-2 font-bold text-gray-600 hover:bg-gray-200 rounded transition hidden sm:block",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleConfirmInvoice,
            className: "flex-1 sm:flex-none px-6 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-md transition",
            children: "Confirmar"
          }
        )
      ] })
    ] }) })
  ] });
}
const getProductKey = (itemId, color, size, variation) => `${itemId}|${color}|${size}|${variation}`;
export function SVGQRCode({ data }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      width: "68",
      height: "68",
      viewBox: "0 0 29 29",
      className: "bg-white p-1 rounded border border-gray-300",
      children: [
        /* @__PURE__ */ jsx("rect", { width: "29", height: "29", fill: "white" }),
        /* @__PURE__ */ jsx("rect", { x: "0", y: "0", width: "7", height: "7", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "1", y: "1", width: "5", height: "5", fill: "white" }),
        /* @__PURE__ */ jsx("rect", { x: "2", y: "2", width: "3", height: "3", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "22", y: "0", width: "7", height: "7", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "23", y: "1", width: "5", height: "5", fill: "white" }),
        /* @__PURE__ */ jsx("rect", { x: "24", y: "2", width: "3", height: "3", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "0", y: "22", width: "7", height: "7", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "1", y: "23", width: "5", height: "5", fill: "white" }),
        /* @__PURE__ */ jsx("rect", { x: "2", y: "24", width: "3", height: "3", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "22", y: "22", width: "3", height: "3", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "8", y: "1", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "10", y: "2", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "12", y: "0", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "15", y: "3", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "18", y: "1", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "8", y: "5", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "11", y: "4", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "14", y: "5", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "16", y: "4", width: "2", height: "2", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "0", y: "8", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "2", y: "10", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "3", y: "9", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "5", y: "12", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "7", y: "10", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "9", y: "8", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "13", y: "8", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "15", y: "9", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "17", y: "10", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "19", y: "8", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "21", y: "9", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "25", y: "8", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "27", y: "10", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "9", y: "12", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "11", y: "14", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "14", y: "12", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "17", y: "14", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "19", y: "13", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "23", y: "14", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "26", y: "12", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "10", y: "17", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "12", y: "18", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "15", y: "16", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "18", y: "19", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "20", y: "17", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "24", y: "18", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "8", y: "22", width: "2", height: "2", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "11", y: "24", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "14", y: "22", width: "1", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "16", y: "25", width: "2", height: "1", fill: "black" }),
        /* @__PURE__ */ jsx("rect", { x: "19", y: "23", width: "1", height: "1", fill: "black" })
      ]
    }
  );
}
function parseInline(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return /* @__PURE__ */ jsx("strong", { className: "font-extrabold text-blue-700", children: part.slice(2, -2) }, i);
    }
    return /* @__PURE__ */ jsx("span", { children: part }, i);
  });
}
function parseCustomMarkdown(text) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("### ")) {
      return /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold mt-3 mb-1 text-gray-800", children: parseInline(line.slice(4)) }, idx);
    }
    if (line.startsWith("- ")) {
      return /* @__PURE__ */ jsx(
        "li",
        {
          className: "ml-4 list-disc text-[13px] text-gray-700 leading-relaxed",
          children: parseInline(line.slice(2))
        },
        idx
      );
    }
    if (line.trim() === "") {
      return /* @__PURE__ */ jsx("div", { className: "h-2" }, idx);
    }
    return /* @__PURE__ */ jsx("p", { className: "text-[13px] text-gray-700 leading-relaxed", children: parseInline(line) }, idx);
  });
}
function InvoiceSuggestionsTab({
  db,
  setSelectedOrder,
  setInvoiceModalData,
  setInvoiceInput
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState("ALL");
  const getInvoiceSuggestions = () => {
    const candidates = db.orders.filter(
      (o) => o.status !== "FATURADO" && o.isActive !== false && o.totalQuantity - (o.invoicedQuantity || 0) > 0
    );
    const todayMs = (/* @__PURE__ */ new Date()).setHours(12, 0, 0, 0);
    const getBaseRank = (o) => {
      const isProg = !!o.isProgramacao;
      const deliveryMs = o.deliveryDate ? new Date(o.deliveryDate).setUTCHours(12, 0, 0, 0) : Date.now();
      const isLate = deliveryMs < todayMs;
      if (isProg) return 3;
      if (isLate) return 2;
      return 1;
    };
    const baselineSorted = [...candidates].sort((a, b) => {
      const rankA = getBaseRank(a);
      const rankB = getBaseRank(b);
      if (rankA !== rankB) return rankB - rankA;
      const delA = a.deliveryDate || "";
      const delB = b.deliveryDate || "";
      return delA.localeCompare(delB);
    });
    const simulatedStock = {};
    db.stocks.forEach((s) => {
      if (s.stage === "ACABADO") {
        simulatedStock[s.id] = s.quantity;
      }
    });
    const suggestions = baselineSorted.map((o) => {
      const remainingQty = o.totalQuantity - (o.invoicedQuantity || 0);
      const stockKey = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
      const availableStock = simulatedStock[stockKey] || 0;
      const allocated = Math.min(remainingQty, availableStock);
      simulatedStock[stockKey] = Math.max(0, availableStock - allocated);
      const coveragePercent = remainingQty > 0 ? allocated / remainingQty * 100 : 0;
      const isProg = !!o.isProgramacao;
      const deliveryMs = o.deliveryDate ? new Date(o.deliveryDate).setUTCHours(12, 0, 0, 0) : todayMs;
      const isLate = deliveryMs < todayMs;
      let tier = 5;
      let tierName = "Estoque Insuficiente";
      if (isProg) {
        tier = 1;
        tierName = "Pedido Programa\xE7\xE3o";
      } else if (isLate) {
        tier = 2;
        tierName = "Atrasado";
      } else if (coveragePercent >= 100) {
        tier = 3;
        tierName = "100% Estoque Acabado";
      } else if (coveragePercent >= 70) {
        tier = 4;
        tierName = "Estoque Parcial (>= 70%)";
      }
      return {
        order: o,
        remainingQty,
        availableStock,
        allocated,
        coveragePercent,
        isProg,
        isLate,
        tier,
        tierName
      };
    });
    suggestions.sort((a, b) => {
      const tierOrder = {
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5
      };
      const orderA = tierOrder[a.tier];
      const orderB = tierOrder[b.tier];
      if (orderA !== orderB) return orderA - orderB;
      const delA = a.order.deliveryDate || "";
      const delB = b.order.deliveryDate || "";
      return delA.localeCompare(delB);
    });
    return suggestions;
  };
  const allSuggestions = getInvoiceSuggestions();
  const progCount = allSuggestions.filter((s) => s.isProg).length;
  const lateCount = allSuggestions.filter((s) => s.isLate && !s.isProg).length;
  const fullStockCount = allSuggestions.filter((s) => s.coveragePercent >= 100 && !s.isProg && !s.isLate).length;
  const filteredSuggestions = allSuggestions.filter((s) => {
    const item = db.items.find((i) => i.id === s.order.itemId);
    const searchStr = `${s.order.orderCode} ${s.order.customerName} ${item?.name || ""}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    if (selectedTierFilter === "ALL") return matchesSearch;
    if (selectedTierFilter === "PROG") return matchesSearch && s.isProg;
    if (selectedTierFilter === "LATE") return matchesSearch && s.isLate && !s.isProg;
    if (selectedTierFilter === "100") return matchesSearch && s.coveragePercent >= 100 && !s.isProg && !s.isLate;
    if (selectedTierFilter === "70") return matchesSearch && s.coveragePercent >= 70 && s.coveragePercent < 100 && !s.isProg && !s.isLate;
    if (selectedTierFilter === "LOW") return matchesSearch && s.coveragePercent < 70 && !s.isProg && !s.isLate;
    return matchesSearch;
  });
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto w-full flex flex-col gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-xl border border-slate-100 shadow-sm", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-extrabold text-indigo-950 text-base flex items-center gap-2", children: "\u{1F4CA} Sugest\xE3o de Faturamento Induzido" }),
      /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-500 mt-1", children: "Lista din\xE2mica priorizada para apoiar a decis\xE3o de faturamento humana, cruzando prazos, programa\xE7\xF5es e o estoque livre atual." }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg flex flex-col", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xl", children: "\u{1F4C8}" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-indigo-750 font-bold uppercase tracking-wider mt-1", children: "Programa\xE7\xE3o" }),
          /* @__PURE__ */ jsxs("span", { className: "text-xl font-black text-indigo-950 mt-0.5", children: [
            progCount,
            " un."
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-red-50/50 border border-red-100 p-3 rounded-lg flex flex-col", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xl", children: "\u26A0\uFE0F" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-red-750 font-bold uppercase tracking-wider mt-1", children: "Atrasados" }),
          /* @__PURE__ */ jsxs("span", { className: "text-xl font-black text-red-950 mt-0.5", children: [
            lateCount,
            " un."
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg flex flex-col", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xl", children: "\u2728" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-emerald-750 font-bold uppercase tracking-wider mt-1", children: "100% Cobertos" }),
          /* @__PURE__ */ jsxs("span", { className: "text-xl font-black text-emerald-950 mt-0.5", children: [
            fullStockCount,
            " un."
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xl", children: "\u{1F4E6}" }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1", children: "Total Fila" }),
          /* @__PURE__ */ jsxs("span", { className: "text-xl font-black text-slate-900 mt-0.5", children: [
            allSuggestions.length,
            " un."
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row gap-3 bg-white p-3 rounded-lg border border-slate-100", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "Buscar por c\xF3digo, cliente ou produto...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: "flex-1 border p-2 rounded text-xs focus:ring-blue-500 bg-white"
          }
        ),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: selectedTierFilter,
            onChange: (e) => setSelectedTierFilter(e.target.value),
            className: "border p-2 rounded text-xs bg-white text-gray-700 cursor-pointer focus:ring-blue-500",
            children: [
              /* @__PURE__ */ jsx("option", { value: "ALL", children: "Todas as prioridades" }),
              /* @__PURE__ */ jsx("option", { value: "PROG", children: "\u{1F4C8} Apenas Programa\xE7\xE3o" }),
              /* @__PURE__ */ jsx("option", { value: "LATE", children: "\u26A0\uFE0F Atrasados comuns" }),
              /* @__PURE__ */ jsx("option", { value: "100", children: "\u2728 Estoque 100% Coberto" }),
              /* @__PURE__ */ jsx("option", { value: "70", children: "\u{1F3E0} Estoque Parcial (>= 70%)" }),
              /* @__PURE__ */ jsx("option", { value: "LOW", children: "\u274C Sem estoque m\xEDnimo (< 70%)" })
            ]
          }
        )
      ] }),
      filteredSuggestions.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-center text-sm text-gray-400 py-10 bg-white rounded-lg border border-dashed border-slate-200", children: "Nenhuma sugest\xE3o encontrada para os filtros selecionados." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: filteredSuggestions.map((s) => {
        const item = db.items.find((i) => i.id === s.order.itemId);
        const isEmbalado = s.order.status === "EMBALADO";
        let badgeBg = "bg-slate-100 text-slate-800 border-slate-200";
        let badgeLabel = s.tierName;
        let badgeIcon = "\u{1F4E6}";
        if (s.isProg) {
          badgeBg = "bg-indigo-100 text-indigo-800 border-indigo-200";
          badgeLabel = "\u{1F4C8} PROGRAMA\xC7\xC3O";
          badgeIcon = "\u{1F4C8}";
        } else if (s.isLate) {
          badgeBg = "bg-red-50/90 text-red-800 border-red-200";
          badgeLabel = "\u26A0\uFE0F ATRASADO";
          badgeIcon = "\u26A0\uFE0F";
        } else if (s.coveragePercent >= 100) {
          badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-200";
          badgeLabel = "\u2728 ESTOQUE 100%";
          badgeIcon = "\u2728";
        } else if (s.coveragePercent >= 70) {
          badgeBg = "bg-amber-100 text-amber-850 border-yellow-200";
          badgeLabel = `\u{1F3E0} PARCIAL (${Math.round(s.coveragePercent)}%)`;
          badgeIcon = "\u{1F3E0}";
        } else {
          badgeBg = "bg-gray-100 text-gray-500 border-gray-200";
          badgeLabel = `\u23F1\uFE0F INSUFICIENTE (${Math.round(s.coveragePercent)}%)`;
          badgeIcon = "\u23F1\uFE0F";
        }
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: "bg-white p-4 rounded-lg border border-slate-150 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3",
            onClick: () => setSelectedOrder(s.order),
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
                  /* @__PURE__ */ jsxs("span", { className: `px-2 py-0.5 rounded text-[10px] font-black border flex items-center gap-1 ${badgeBg}`, children: [
                    /* @__PURE__ */ jsx("span", { children: badgeIcon }),
                    " ",
                    badgeLabel
                  ] }),
                  isEmbalado && /* @__PURE__ */ jsx("span", { className: "bg-teal-50 text-teal-700 border border-teal-200 text-[10px] px-1.5 py-0.5 rounded font-black uppercase", children: "Pronto p/ Faturar" }),
                  /* @__PURE__ */ jsxs("span", { className: "font-mono font-black text-slate-900 text-sm", children: [
                    "Pedido #",
                    s.order.orderCode
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-500 font-semibold uppercase block tracking-wide mt-1", children: [
                  "Cliente: ",
                  /* @__PURE__ */ jsx("strong", { className: "text-slate-800", children: s.order.customerName })
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-800 font-bold block", children: [
                  "Produto: ",
                  item?.name || "-",
                  " ",
                  /* @__PURE__ */ jsxs("span", { className: "font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded ml-1 font-normal", children: [
                    s.order.color || "-",
                    " | ",
                    s.order.size || "-",
                    " | ",
                    s.order.variation || "-"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mt-1.5 w-full max-w-sm", children: [
                  /* @__PURE__ */ jsx("div", { className: "flex-1 bg-gray-150 rounded-full h-1.5", children: /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `h-1.5 rounded-full ${s.coveragePercent >= 100 ? "bg-emerald-500" : s.coveragePercent >= 70 ? "bg-amber-500" : "bg-gray-400"}`,
                      style: { width: `${Math.min(100, s.coveragePercent)}%` }
                    }
                  ) }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-slate-705 whitespace-nowrap", children: [
                    "Alocado: ",
                    Math.round(s.allocated),
                    " / ",
                    Math.round(s.remainingQty),
                    " un (",
                    Math.round(s.coveragePercent),
                    "%)"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-1 text-right self-stretch md:self-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0", children: [
                /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-550 font-semibold", children: [
                  "Entrega: ",
                  /* @__PURE__ */ jsx("strong", { className: s.isLate ? "text-red-600 animate-pulse font-extrabold" : "text-slate-700 font-bold", children: s.order.deliveryDate ? new Date(s.order.deliveryDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mt-2", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: (e) => {
                        e.stopPropagation();
                        setSelectedOrder(s.order);
                      },
                      className: "bg-slate-100 hover:bg-slate-205 text-slate-700 border border-slate-250 font-bold text-xs px-2.5 py-1 rounded transition",
                      children: "Ver Ficha"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: (e) => {
                        e.stopPropagation();
                        const availableToInvoice = s.order.status === "EMBALADO" ? s.order.totalQuantity - (s.order.invoicedQuantity || 0) : (s.order.packedQuantity || 0) - (s.order.invoicedQuantity || 0);
                        const maxToInvoice = s.order.totalQuantity - (s.order.invoicedQuantity || 0);
                        const limit = Math.max(0, Math.min(availableToInvoice, maxToInvoice));
                        setInvoiceModalData({ order: s.order, limit });
                        setInvoiceInput(String(limit));
                      },
                      className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 rounded transition shadow-xs flex items-center gap-1",
                      children: "\u{1F4B0} Faturar"
                    }
                  )
                ] })
              ] })
            ]
          },
          s.order.id
        );
      }) })
    ] })
  ] });
}
function AdminScreen({
  db,
  currentUser
}) {
  const [selectedItemId, setSelectedItemId] = useState("ALL");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [activeTab, setActiveTab] = useState("PAINEL");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceModalData, setInvoiceModalData] = useState(null);
  const [invoiceInput, setInvoiceInput] = useState("");
  const handleConfirmInvoice = () => {
    if (!invoiceModalData) return;
    const { order: o, limit } = invoiceModalData;
    const qty = parseInt(invoiceInput, 10);
    if (isNaN(qty) || qty <= 0 || qty > limit) {
      alert("Quantidade inv\xE1lida. Deve ser maior que 0 e no m\xE1ximo " + limit);
      return;
    }
    const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);
    if (existingStock && (existingStock.reservedQuantity || 0) > 0) {
      const alternateReservedOrders = db.orders.filter(
        (ord) => ord.id !== o.id && ord.itemId === o.itemId && ord.color === o.color && ord.size === o.size && ord.variation === o.variation && (ord.status === "PLANEJADO" || ord.status === "EMBALADO") && ord.isActive
      );
      if (alternateReservedOrders.length > 0) {
        const primaryResOrder = alternateReservedOrders[0];
        const confirmResult = window.confirm(
          `ALERTA POPUP - PRODUTO RESERVADO PARA OUTRO PEDIDO:

O produto que voc\xEA est\xE1 faturando cont\xE9m unidades de estoque RESERVADAS para:
\u2022 Pedido: ${primaryResOrder.orderCode}
\u2022 Cliente: ${primaryResOrder.customerName}

Deseja CONTINUAR assim mesmo e desfazer a reserva do outro pedido ou clique em Cancelar para interromper?`
        );
        if (!confirmResult) {
          setInvoiceModalData(null);
          setInvoiceInput("");
          return;
        } else {
          db.updateOrders([
            {
              ...primaryResOrder,
              status: "PENDENTE",
              packedQuantity: 0
            }
          ]);
          const nextReservedQty = Math.max(
            0,
            (existingStock.reservedQuantity || 0) - (primaryResOrder.totalQuantity || 0)
          );
          db.updateStocks([
            {
              ...existingStock,
              reservedQuantity: nextReservedQty
            }
          ]);
          db.addLogs([
            {
              id: Date.now() + 5,
              orderId: primaryResOrder.id,
              operatorId: currentUser.id,
              timestamp: Date.now(),
              durationMillis: 0,
              customProductName: `Reserva desfeita (estoque direcionado para pedido ${o.orderCode})`
            }
          ]);
        }
      }
    }
    const newInvoiced = (o.invoicedQuantity || 0) + qty;
    const isNowFaturado = newInvoiced >= o.totalQuantity;
    const newStatus = isNowFaturado ? "FATURADO" : o.status || "PENDENTE";
    db.updateOrders([
      {
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: !isNowFaturado,
        isUrgent: isNowFaturado ? false : o.isUrgent,
        _alreadyDeducted: true
      }
    ]);
    if (existingStock) {
      const newStockQty = Math.max(0, existingStock.quantity - qty);
      const newReservedQty = Math.max(
        0,
        (existingStock.reservedQuantity || 0) - qty
      );
      db.updateStocks([
        {
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty
        }
      ]);
    }
    db.addStockMovement?.({
      itemId: o.itemId,
      color: o.color,
      size: o.size,
      variation: o.variation,
      quantity: qty,
      type: "SAIDA",
      description: `Sa\xEDda por faturamento do Pedido ${o.orderCode} (Cliente: ${o.customerName})`
    });
    db.addLogs([
      {
        id: Date.now(),
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0
      }
    ]);
    setInvoiceModalData(null);
    setInvoiceInput("");
  };
  const [isMonitoringModalOpen, setIsMonitoringModalOpen] = useState(false);
  const [selectedMonitoringCard, setSelectedMonitoringCard] = useState(null);
  const handleOpenMonitoringModal = (pack) => {
    setSelectedMonitoringCard(pack);
    setIsMonitoringModalOpen(true);
  };
  useEffect(() => {
    const handleEvents = (e) => {
      if (e.key === "Escape") {
        setIsMonitoringModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEvents);
    return () => window.removeEventListener("keydown", handleEvents);
  }, []);
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    if (activeTab === "PAINEL") {
      const timer = setTimeout(() => {
        setChartsReady(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setChartsReady(false);
    }
  }, [activeTab]);
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 6e4);
    return () => clearInterval(timer);
  }, []);
  const now = /* @__PURE__ */ new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const yesterdayStart = todayStart - 864e5;
  const filteredLogs = React.useMemo(() => {
    let result = db.logs;
    if (selectedItemId !== "ALL") {
      result = result.filter((log) => {
        const order = db.orders.find((o) => o.id === log.orderId);
        return order && order.itemId === selectedItemId;
      });
    }
    if (selectedSector !== "ALL") {
      result = result.filter((l) => l.type === selectedSector);
    }
    return result;
  }, [db.logs, db.orders, selectedItemId, selectedSector]);
  const logsToday = filteredLogs.filter((l) => l.timestamp >= todayStart);
  const logsYesterday = filteredLogs.filter(
    (l) => l.timestamp >= yesterdayStart && l.timestamp < todayStart
  );
  const calcStats = (logs) => {
    const totalPacked = logs.reduce(
      (acc, log) => acc + (log.quantityPacked || log.quantityProcessed || log.quantityPainted || log.quantityCut || 0),
      0
    );
    const totalMillis = logs.reduce(
      (acc, log) => acc + (log.durationMillis || 0),
      0
    );
    const totalHours = totalMillis / 36e5;
    const pph = totalHours > 0 ? Math.round(totalPacked / totalHours) : 0;
    return { totalPacked, totalHours, pph };
  };
  const todayStats = calcStats(logsToday);
  const yesterdayStats = calcStats(logsYesterday);
  let comparisonMsg = "Sem base de compara\xE7\xE3o (ontem: 0 pe\xE7as).";
  let comparisonColor = "text-gray-500";
  if (yesterdayStats.pph > 0) {
    if (todayStats.pph > yesterdayStats.pph) {
      comparisonMsg = `Produtividade ${((todayStats.pph / yesterdayStats.pph - 1) * 100).toFixed(1)}% melhor que ontem! \u{1F680}`;
      comparisonColor = "text-green-600";
    } else if (todayStats.pph < yesterdayStats.pph) {
      comparisonMsg = `Produtividade ${((1 - todayStats.pph / yesterdayStats.pph) * 100).toFixed(1)}% menor que ontem. \u{1F4C9}`;
      comparisonColor = "text-red-500";
    } else {
      comparisonMsg = "Produtividade igual a de ontem.";
      comparisonColor = "text-blue-600";
    }
  }
  const groupedOrders = React.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    db.orders.forEach((o) => {
      const g = map.get(o.orderCode) || { total: 0, packed: 0 };
      g.total += o.totalQuantity || 0;
      g.packed += o.packedQuantity || 0;
      map.set(o.orderCode, g);
    });
    return Array.from(map.entries()).map(([code, data]) => ({ code, ...data }));
  }, [db.orders]);
  const statsTodaySector = React.useMemo(() => {
    let prod = 0;
    let corte = 0;
    let pint = 0;
    let emb = 0;
    db.logs.filter((l) => l.timestamp >= todayStart).forEach((l) => {
      if (l.type === "PRODUCAO") prod += l.quantityProcessed || 0;
      else if (l.type === "CORTE_LASER") corte += l.quantityCut || 0;
      else if (l.type === "PINTURA") pint += l.quantityPainted || 0;
      else if (l.type === "EMBALAGEM") emb += l.quantityPacked || 0;
    });
    return { prod, corte, pint, emb };
  }, [db.logs, todayStart]);
  const producaoActive = db.activePacks.filter(
    (p) => !["PINTURA", "EMBALAGEM", "CORTE_LASER"].includes(p.type)
  );
  const corteLaserActive = db.activePacks.filter(
    (p) => p.type === "CORTE_LASER"
  );
  const pinturaActive = db.activePacks.filter((p) => p.type === "PINTURA");
  const embalagemActive = db.activePacks.filter((p) => p.type === "EMBALAGEM");
  const efficiencyData = React.useMemo(() => {
    const earliestLog = db.logs.length > 0 ? Math.min(...db.logs.map((l) => l.timestamp)) : Date.now();
    const daysElapsed = Math.max(
      1,
      Math.ceil((Date.now() - earliestLog) / 864e5)
    );
    let totalProd = 0, totalCorte = 0, totalPint = 0, totalEmb = 0;
    db.logs.forEach((l) => {
      if (l.type === "PRODUCAO") totalProd += l.quantityProcessed || 0;
      else if (l.type === "CORTE_LASER") totalCorte += l.quantityCut || 0;
      else if (l.type === "PINTURA") totalPint += l.quantityPainted || 0;
      else if (l.type === "EMBALAGEM") totalEmb += l.quantityPacked || 0;
    });
    const getSectorAvg = (name, total) => {
      const sector = db.sectors.find(
        (s) => s.name.toLowerCase().includes(name.toLowerCase())
      );
      return {
        name: sector ? sector.name : name,
        "M\xE9dia Di\xE1ria": Math.round(total / daysElapsed),
        Capacidade: sector?.dailyCapacity || 1e3
      };
    };
    return [
      getSectorAvg("Corte", totalCorte),
      getSectorAvg("Produ", totalProd),
      getSectorAvg("Pintura", totalPint),
      getSectorAvg("Embalagem", totalEmb)
    ];
  }, [db.logs, db.sectors]);
  const sectorOccupancyData = React.useMemo(() => {
    return db.sectors.map((sector) => {
      const sectorBatches = db.productionBatches.filter(
        (b) => b.sectorId === sector.id && b.status !== "CONCLUIDO"
      );
      const sectorOrders = sectorBatches.flatMap(
        (b) => b.orderIds.map((oid) => db.orders.find((o) => o.id === oid))
      ).filter((o) => o !== void 0);
      const totalQuantity = sectorOrders.reduce(
        (sum, o) => sum + (o?.totalQuantity || 0),
        0
      );
      const capacity = sector.dailyCapacity || 1e3;
      return {
        name: sector.name,
        quantity: totalQuantity,
        capacity,
        isOverloaded: totalQuantity > capacity
      };
    });
  }, [db.sectors, db.productionBatches, db.orders]);
  const formatDuration = (startTime) => {
    const diff = Math.max(0, currentTime - startTime);
    const m = Math.floor(diff / 6e4);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };
  return /* @__PURE__ */ jsxs(ScreenLayout, { id: "admin-screen-layout", children: [
    /* @__PURE__ */ jsx(
      ScreenHeader,
      {
        title: currentUser.role === "PCP" ? "Painel PCP" : "Administra\xE7\xE3o",
        icon: /* @__PURE__ */ jsx(BarChart2, { className: "text-blue-600", size: 20 })
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "bg-slate-50 px-3 py-1.5 border-b border-slate-200 shrink-0", children: /* @__PURE__ */ jsxs("div", { className: "flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 overflow-x-auto scrollbar-none max-w-full gap-0.5 select-none", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          className: `px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "PAINEL" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`,
          onClick: () => setActiveTab("PAINEL"),
          children: "Painel Geral"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: `px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "MONITORAMENTO" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`,
          onClick: () => setActiveTab("MONITORAMENTO"),
          children: "Monitoramento"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "GERENCIA") && /* @__PURE__ */ jsx(
        "button",
        {
          className: `px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "SUGESTAO" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`,
          onClick: () => setActiveTab("SUGESTAO"),
          children: "\u{1F4CA} Sugest\xE3o de Faturamento"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "GERENCIA" || currentUser.name.toLowerCase().includes("romario") || currentUser.name.toLowerCase().includes("alessandra")) && /* @__PURE__ */ jsx(
        "button",
        {
          className: `px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "EVOLUCAO_EMBALAGEM" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`,
          onClick: () => setActiveTab("EVOLUCAO_EMBALAGEM"),
          children: "\u{1F4E6} Evolu\xE7\xE3o Embalagem"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP") && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            className: `px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "CADASTROS" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`,
            onClick: () => setActiveTab("CADASTROS"),
            children: "Cadastros"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            className: `px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "LOTES" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`,
            onClick: () => setActiveTab("LOTES"),
            children: "Lotes"
          }
        )
      ] })
    ] }) }),
    ["PAINEL", "MONITORAMENTO", "SUGESTAO"].includes(activeTab) ? /* @__PURE__ */ jsx(ScrollContainer, { paddingSize: "dense", className: "space-y-4", children: activeTab === "PAINEL" ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 border-b border-gray-100 pb-3 mt-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold text-gray-700", children: "Filtrar Produtividade por Produto:" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: selectedItemId,
                onChange: (e) => setSelectedItemId(
                  e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                ),
                className: "border border-gray-300 p-2 rounded bg-white text-gray-800 w-full md:w-64 focus:md:w-80 cursor-pointer text-sm transition-all duration-305",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "ALL", children: "Todos os Produtos (Geral)" }),
                  db.items.map((it) => /* @__PURE__ */ jsxs("option", { value: it.id, children: [
                    it.code,
                    " - ",
                    it.name
                  ] }, it.id))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold text-gray-700", children: "Filtrar Produtividade por Setor:" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: selectedSector,
                onChange: (e) => setSelectedSector(e.target.value),
                className: "border border-gray-300 p-2 rounded bg-white text-gray-800 w-full md:w-64 focus:md:w-80 cursor-pointer text-sm transition-all duration-305",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "ALL", children: "Todos os Setores (Geral)" }),
                  /* @__PURE__ */ jsx("option", { value: "CORTE_LASER", children: "Corte a Laser" }),
                  /* @__PURE__ */ jsx("option", { value: "PRODUCAO", children: "Produ\xE7\xE3o" }),
                  /* @__PURE__ */ jsx("option", { value: "PINTURA", children: "Pintura" }),
                  /* @__PURE__ */ jsx("option", { value: "EMBALAGEM", children: "Embalagem" })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("h3", { className: "font-semibold text-gray-700", children: [
          "Produtividade de Hoje",
          " ",
          (selectedItemId !== "ALL" || selectedSector !== "ALL") && "(Filtrada)"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-around text-center", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "Pe\xE7as Processadas" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-blue-600", children: Number.isNaN(todayStats.totalPacked) ? 0 : todayStats.totalPacked })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "Tempo Gasto" }),
            /* @__PURE__ */ jsxs("p", { className: "text-2xl font-bold text-orange-600", children: [
              Number.isNaN(todayStats.totalHours) ? 0 : Math.round(todayStats.totalHours * 10) / 10,
              "h"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "P\xE7s / Hora" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-green-600", children: Number.isNaN(todayStats.pph) ? 0 : todayStats.pph })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: `text-sm font-semibold text-center mt-2 ${comparisonColor}`,
            children: comparisonMsg
          }
        ),
        /* @__PURE__ */ jsx("hr", { className: "border-gray-100" }),
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700", children: "Efici\xEAncia Operacional (M\xE9dia Di\xE1ria vs Capacidade)" }),
        /* @__PURE__ */ jsx("div", { className: "w-full h-64 mt-2 bg-gray-50/30 rounded-lg flex items-center justify-center border border-gray-100 relative min-h-[16rem]", children: chartsReady ? /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(
          BarChart,
          {
            data: efficiencyData,
            margin: { top: 20, right: 30, left: 0, bottom: 0 },
            children: [
              /* @__PURE__ */ jsx(
                CartesianGrid,
                {
                  strokeDasharray: "3 3",
                  vertical: false,
                  stroke: "#E5E7EB"
                }
              ),
              /* @__PURE__ */ jsx(
                XAxis,
                {
                  dataKey: "name",
                  tick: { fontSize: 12 },
                  tickLine: false,
                  axisLine: false
                }
              ),
              /* @__PURE__ */ jsx(
                YAxis,
                {
                  tick: { fontSize: 12 },
                  tickLine: false,
                  axisLine: false
                }
              ),
              /* @__PURE__ */ jsx(
                Tooltip,
                {
                  cursor: { fill: "transparent" },
                  contentStyle: {
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }
                }
              ),
              /* @__PURE__ */ jsx(
                Legend,
                {
                  iconType: "circle",
                  wrapperStyle: { fontSize: "12px" }
                }
              ),
              /* @__PURE__ */ jsx(
                Bar,
                {
                  dataKey: "Capacidade",
                  fill: "#E5E7EB",
                  radius: [4, 4, 0, 0]
                }
              ),
              /* @__PURE__ */ jsx(
                Bar,
                {
                  dataKey: "M\xE9dia Di\xE1ria",
                  fill: "#3B82F6",
                  radius: [4, 4, 0, 0]
                }
              )
            ]
          }
        ) }) : /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-400 font-medium", children: "Carregando dados de efici\xEAncia..." })
        ] }) }),
        /* @__PURE__ */ jsx("hr", { className: "border-gray-100 mt-4" }),
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700", children: "Ocupa\xE7\xE3o dos Setores vs Capacidade Di\xE1ria (Lotes Pendentes)" }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-100 mb-2 mt-1", children: "\u{1F6A8} Vermelho indica acima de 100% de capacidade di\xE1ria" }),
        /* @__PURE__ */ jsx("div", { className: "w-full h-64 mt-2 mb-6 bg-gray-50/30 rounded-lg flex items-center justify-center border border-gray-100 relative min-h-[16rem]", children: chartsReady ? /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(
          BarChart,
          {
            data: sectorOccupancyData,
            margin: { top: 20, right: 30, left: 0, bottom: 0 },
            children: [
              /* @__PURE__ */ jsx(
                CartesianGrid,
                {
                  strokeDasharray: "3 3",
                  vertical: false,
                  stroke: "#E5E7EB"
                }
              ),
              /* @__PURE__ */ jsx(
                XAxis,
                {
                  dataKey: "name",
                  tick: { fontSize: 12 },
                  tickLine: false,
                  axisLine: false
                }
              ),
              /* @__PURE__ */ jsx(
                YAxis,
                {
                  tick: { fontSize: 12 },
                  tickLine: false,
                  axisLine: false
                }
              ),
              /* @__PURE__ */ jsx(
                Tooltip,
                {
                  cursor: { fill: "transparent" },
                  contentStyle: {
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }
                }
              ),
              /* @__PURE__ */ jsx(
                Legend,
                {
                  iconType: "circle",
                  wrapperStyle: { fontSize: "12px" }
                }
              ),
              /* @__PURE__ */ jsx(
                Bar,
                {
                  name: "Capacidade Di\xE1ria",
                  dataKey: "capacity",
                  fill: "#D1D5DB",
                  radius: [4, 4, 0, 0]
                }
              ),
              /* @__PURE__ */ jsx(
                Bar,
                {
                  name: "Carga Agrupada",
                  dataKey: "quantity",
                  radius: [4, 4, 0, 0],
                  children: sectorOccupancyData.map((entry, index) => /* @__PURE__ */ jsx(
                    Cell,
                    {
                      fill: entry.isOverloaded ? "#EF4444" : "#6366F1"
                    },
                    `cell-${index}`
                  ))
                }
              )
            ]
          }
        ) }) : /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-400 font-medium", children: "Carregando ocupa\xE7\xE3o por setor..." })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border mt-1", children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700 mb-4", children: "Pe\xE7as Produzidas Hoje (por Setor)" }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3", children: [
          {
            label: "Corte a Laser",
            value: statsTodaySector.corte,
            color: "bg-teal-500"
          },
          {
            label: "Produ\xE7\xE3o",
            value: statsTodaySector.prod,
            color: "bg-blue-500"
          },
          {
            label: "Pintura",
            value: statsTodaySector.pint,
            color: "bg-pink-500"
          },
          {
            label: "Embalagem",
            value: statsTodaySector.emb,
            color: "bg-orange-500"
          }
        ].map((s) => {
          const max = Math.max(
            statsTodaySector.corte,
            statsTodaySector.prod,
            statsTodaySector.pint,
            statsTodaySector.emb,
            1
          );
          const percent = s.value / max * 100;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex flex-col gap-1 w-full text-sm",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between font-medium text-gray-700", children: [
                  /* @__PURE__ */ jsx("span", { children: s.label }),
                  /* @__PURE__ */ jsxs("span", { children: [
                    s.value,
                    " p\xE7s"
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-100 rounded-full h-2", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: `h-2 rounded-full ${s.color} transition-all duration-500`,
                    style: { width: `${percent}%` }
                  }
                ) })
              ]
            },
            s.label
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto w-full", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-gray-500 mb-1 text-center", children: "Em Produ\xE7\xE3o" }),
            /* @__PURE__ */ jsx("span", { className: "text-3xl font-bold text-blue-600", children: db.orders.filter((o) => o.status === "EM_PRODUCAO").length })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-gray-500 mb-1 text-center", children: "Em Corte Laser" }),
            /* @__PURE__ */ jsx("span", { className: "text-3xl font-bold text-teal-600", children: db.orders.filter((o) => o.status === "EM_CORTE").length })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-gray-500 mb-1 text-center", children: "Em Pintura" }),
            /* @__PURE__ */ jsx("span", { className: "text-3xl font-bold text-pink-600", children: db.orders.filter((o) => o.status === "EM_PINTURA").length })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-gray-500 mb-1 text-center", children: "Embalando" }),
            /* @__PURE__ */ jsx("span", { className: "text-3xl font-bold text-orange-600", children: db.orders.filter((o) => o.status === "EMBALANDO").length })
          ] })
        ] }),
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700 mb-3", children: "Progresso dos Pedidos" }),
        groupedOrders.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-center", children: "Nenhum pedido cadastrado." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-4", children: groupedOrders.map((go, idx) => {
          const percRaw = go.total > 0 ? Math.min(100, Math.round(go.packed / go.total * 100)) : 0;
          const perc = Number.isNaN(percRaw) ? 0 : percRaw;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-end mb-2", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-gray-800", children: go.code }),
                  /* @__PURE__ */ jsxs("span", { className: "text-sm font-semibold text-blue-600", children: [
                    go.packed,
                    " / ",
                    go.total
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-200 rounded-full h-3", children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "bg-blue-600 h-3 rounded-full",
                    style: { width: `${perc}%` }
                  }
                ) }),
                /* @__PURE__ */ jsxs("p", { className: "text-xs text-gray-500 text-right mt-1", children: [
                  perc,
                  "% Conclu\xEDdo"
                ] })
              ]
            },
            go.code || `order-${idx}`
          );
        }) })
      ] })
    ] }) : activeTab === "SUGESTAO" ? /* @__PURE__ */ jsx(
      InvoiceSuggestionsTab,
      {
        db,
        setSelectedOrder,
        setInvoiceModalData,
        setInvoiceInput
      }
    ) : activeTab === "MONITORAMENTO" ? /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto w-full flex flex-col gap-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700 mb-3 border-b pb-2", children: "Em Produ\xE7\xE3o" }),
        producaoActive.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm", children: "Nenhuma produ\xE7\xE3o em andamento." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: producaoActive.map((pack) => {
          const item = db.items.find((i) => i.id === pack.itemId);
          return /* @__PURE__ */ jsx(
            "div",
            {
              onClick: () => handleOpenMonitoringModal(pack),
              className: "bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition",
              children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-gray-800", children: pack.partName || item?.name }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-600 mt-1", children: [
                    pack.color || "-",
                    " | ",
                    pack.size || "-",
                    " |",
                    " ",
                    pack.variation || "-"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-gray-500 mt-1", children: [
                    "Operador: ",
                    pack.operatorId
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded w-fit mt-1", children: pack.type.replace("_", " ") })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-1 text-blue-700 text-xs font-semibold", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                    /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-blue-500 animate-pulse" }),
                    "Em andamento"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { children: [
                    "(",
                    formatDuration(pack.startTime),
                    ")"
                  ] })
                ] })
              ] })
            },
            pack.id
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700 mb-3 border-b pb-2", children: "Em Corte Laser" }),
        corteLaserActive.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm", children: "Nenhum corte em andamento." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: corteLaserActive.map((pack) => {
          const item = db.items.find((i) => i.id === pack.itemId);
          return /* @__PURE__ */ jsx(
            "div",
            {
              onClick: () => handleOpenMonitoringModal(pack),
              className: "bg-teal-50 border border-teal-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-teal-300 transition",
              children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-gray-800", children: pack.partName || item?.name }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-600 mt-1", children: [
                    pack.color || "-",
                    " | ",
                    pack.size || "-",
                    " |",
                    " ",
                    pack.variation || "-"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-gray-500 mt-1", children: [
                    "Operador: ",
                    pack.operatorId
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-teal-700 text-xs font-semibold", children: [
                  /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-teal-500 animate-pulse" }),
                  "Cortando... (",
                  formatDuration(pack.startTime),
                  ")"
                ] })
              ] })
            },
            pack.id
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700 mb-3 border-b pb-2", children: "Em Pintura" }),
        pinturaActive.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm", children: "Nenhuma pintura em andamento." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: pinturaActive.map((pack) => {
          const item = db.items.find((i) => i.id === pack.itemId);
          return /* @__PURE__ */ jsx(
            "div",
            {
              onClick: () => handleOpenMonitoringModal(pack),
              className: "bg-pink-50 border border-pink-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-pink-300 transition",
              children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-gray-800", children: pack.partName || item?.name }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-600 mt-1", children: [
                    pack.color || "-",
                    " | ",
                    pack.size || "-",
                    " |",
                    " ",
                    pack.variation || "-"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-gray-500 mt-1", children: [
                    "Operador: ",
                    pack.operatorId
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-pink-700 text-xs font-semibold", children: [
                  /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-pink-500 animate-pulse" }),
                  "Pintando h\xE1... (",
                  formatDuration(pack.startTime),
                  ")"
                ] })
              ] })
            },
            pack.id
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-700 mb-3 border-b pb-2", children: "Em Embalagem" }),
        embalagemActive.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm", children: "Nenhuma embalagem em andamento." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: embalagemActive.map((pack) => {
          const item = db.items.find((i) => i.id === pack.itemId);
          return /* @__PURE__ */ jsx(
            "div",
            {
              onClick: () => handleOpenMonitoringModal(pack),
              className: "bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-green-300 transition",
              children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-gray-800", children: pack.partName || item?.name }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-600 mt-1", children: [
                    pack.color || "-",
                    " | ",
                    pack.size || "-",
                    " |",
                    " ",
                    pack.variation || "-"
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-gray-500 mt-1", children: [
                    "Operador: ",
                    pack.operatorId
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-green-700 text-xs font-semibold", children: [
                  /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-green-500 animate-pulse" }),
                  "Embalando... (",
                  formatDuration(pack.startTime),
                  ")"
                ] })
              ] })
            },
            pack.id
          );
        }) })
      ] })
    ] }) : null }) : null,
    activeTab === "CADASTROS" && /* @__PURE__ */ jsx(PCPScreen, { db, currentUser, subScreen: "CADASTROS" }),
    activeTab === "LOTES" && /* @__PURE__ */ jsx(PCPScreen, { db, currentUser, subScreen: "LOTES" }),
    activeTab === "EVOLUCAO_EMBALAGEM" && /* @__PURE__ */ jsx(EvolucaoEmbalagemTab, { db }),
    isMonitoringModalOpen && selectedMonitoringCard && (() => {
      const pack = db.activePacks.find((p) => p.id === selectedMonitoringCard.id) || selectedMonitoringCard;
      const item = db.items.find((i) => i.id === pack.itemId);
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: "fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs",
          onClick: () => setIsMonitoringModalOpen(false),
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: "bg-white p-6 rounded-lg shadow-xl w-full max-w-lg flex flex-col gap-4 animate-in zoom-in-95",
              onClick: (e) => e.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center mb-2", children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-gray-800", children: "Detalhes do Lote / Monitoramento" }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => setIsMonitoringModalOpen(false),
                      className: "text-gray-500 hover:text-gray-800",
                      children: /* @__PURE__ */ jsx(X, { size: 24 })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-indigo-50 border border-indigo-200 rounded p-4 flex flex-col gap-2 text-left", children: [
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
                    /* @__PURE__ */ jsx("strong", { children: "Setor:" }),
                    " ",
                    /* @__PURE__ */ jsx("span", { className: "uppercase text-indigo-700 font-bold", children: pack.type.replace("_", " ") })
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
                    /* @__PURE__ */ jsx("strong", { children: "Produto:" }),
                    " ",
                    pack.partName || item?.name
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
                    /* @__PURE__ */ jsx("strong", { children: "SKU/Varia\xE7\xE3o:" }),
                    " ",
                    pack.color || "-",
                    " | ",
                    pack.size || "-",
                    " | ",
                    pack.variation || "-"
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
                    /* @__PURE__ */ jsx("strong", { children: "Operador Atual:" }),
                    " ",
                    pack.operatorId
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700 mt-2", children: [
                    /* @__PURE__ */ jsx("strong", { children: "Tempo de Opera\xE7\xE3o:" }),
                    " ",
                    /* @__PURE__ */ jsx("span", { className: "font-bold text-indigo-700", children: formatDuration(pack.startTime) })
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setIsMonitoringModalOpen(false),
                    className: "mt-2 bg-gray-200 hover:bg-gray-300 font-bold p-2 rounded text-gray-800 transition",
                    children: "Fechar Detalhes"
                  }
                )
              ]
            }
          )
        }
      );
    })(),
    selectedOrder && /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto",
        onClick: () => setSelectedOrder(null),
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            className: "bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center p-5 border-b border-gray-100 shrink-0", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("h2", { className: "text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3 flex items-center gap-2 flex-wrap", children: [
                    "Pedido: ",
                    selectedOrder.orderCode,
                    selectedOrder.isUrgent && /* @__PURE__ */ jsx("span", { className: "bg-red-100 text-red-850 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse", children: "URGENTE" }),
                    selectedOrder.isProgramacao && /* @__PURE__ */ jsx("span", { className: "bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded", children: "\u{1F4C8} PROGRAMA\xC7\xC3O" })
                  ] }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-500 font-medium pl-4 mt-1 bg-white", children: [
                    "Cliente: ",
                    selectedOrder.customerName
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setSelectedOrder(null),
                    className: "p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200",
                    children: /* @__PURE__ */ jsx("span", { className: "font-bold px-1", children: "X" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "p-5 flex-1 overflow-y-auto bg-gray-50", children: [
                /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col gap-3", children: [
                  /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-800 border-b pb-2", children: "Informa\xE7\xF5es Adicionais" }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm mt-1", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Produto" }),
                      /* @__PURE__ */ jsx("span", { className: "text-gray-800 font-semibold", children: db.items.find((i) => i.id === selectedOrder.itemId)?.name || "-" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Quantidade Total" }),
                      /* @__PURE__ */ jsxs("span", { className: "text-blue-700 font-bold", children: [
                        selectedOrder.totalQuantity,
                        " p\xE7s"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Cor / Tamanho / Var" }),
                      /* @__PURE__ */ jsxs("span", { className: "text-gray-700 font-mono", children: [
                        selectedOrder.color || "-",
                        " / ",
                        selectedOrder.size || "-",
                        " ",
                        "/ ",
                        selectedOrder.variation || "-"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-bold uppercase text-[10px]", children: "Data de Entrega" }),
                      /* @__PURE__ */ jsx("span", { className: "text-gray-700 font-semibold", children: selectedOrder.deliveryDate ? new Date(
                        selectedOrder.deliveryDate
                      ).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-" })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100", children: [
                  /* @__PURE__ */ jsx("h3", { className: "font-semibold text-gray-800 border-b pb-2 mb-4", children: "Linha do Tempo (Processamento)" }),
                  (() => {
                    const orderLogs = db.logs.filter((l) => l.orderId === selectedOrder.id).sort((a, b) => b.timestamp - a.timestamp);
                    return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3", children: orderLogs.map((log) => {
                      let actionLabel = "Processado";
                      let actionColor = "bg-gray-100 text-gray-800";
                      let actionQty = 0;
                      switch (log.type) {
                        case "PRODUCAO":
                          actionLabel = "Produzido";
                          actionColor = "bg-blue-50 text-blue-800";
                          actionQty = log.quantityProcessed || 0;
                          break;
                        case "CORTE_LASER":
                          actionLabel = "Corte a Laser";
                          actionColor = "bg-indigo-50 text-indigo-800";
                          actionQty = log.quantityCut || 0;
                          break;
                        case "PINTURA":
                          actionLabel = "Pintura";
                          actionColor = "bg-amber-50 text-amber-850";
                          actionQty = log.quantityPainted || 0;
                          break;
                        case "EMBALAGEM":
                          actionLabel = "Embalado";
                          actionColor = "bg-green-50 text-green-800 border bg-green-50 text-green-800";
                          actionQty = log.quantityPacked || 0;
                          break;
                        case "FATURAMENTO":
                          actionLabel = "Faturado";
                          actionColor = "bg-emerald-100 text-emerald-800";
                          actionQty = log.quantityInvoiced || 0;
                          break;
                      }
                      return /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: "flex justify-between items-center border-b border-gray-100 pb-2 last:border-0",
                          children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                              /* @__PURE__ */ jsx(
                                "span",
                                {
                                  className: `text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${actionColor}`,
                                  children: actionLabel
                                }
                              ),
                              /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-800 font-bold", children: [
                                actionQty || log.customProductName || "",
                                " ",
                                "un. (Sistema)"
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-400 font-mono shrink-0 whitespace-nowrap mt-1", children: [
                              new Date(log.timestamp).toLocaleDateString(),
                              " ",
                              /* @__PURE__ */ jsx("br", {}),
                              " ",
                              new Date(log.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            ] })
                          ]
                        },
                        log.id
                      );
                    }) });
                  })()
                ] })
              ] })
            ]
          }
        )
      }
    ),
    invoiceModalData && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsx("div", { className: "bg-emerald-600 p-4 shrink-0", children: /* @__PURE__ */ jsx("h3", { className: "text-white font-bold text-lg", children: "Confirmar Faturamento" }) }),
      /* @__PURE__ */ jsxs("div", { className: "p-5 flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
          "O faturamento ir\xE1 deduzir pe\xE7as do seu",
          " ",
          /* @__PURE__ */ jsx("strong", { className: "text-gray-900 bg-gray-100 px-1 rounded", children: "estoque de itens acabados" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 border border-gray-100 p-3 rounded-lg flex flex-col gap-1", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 font-bold uppercase tracking-wide", children: "Pedido" }),
          /* @__PURE__ */ jsxs("span", { className: "font-bold text-gray-900", children: [
            invoiceModalData.order.orderCode,
            " -",
            " ",
            invoiceModalData.order.customerName
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxs("label", { className: "text-xs text-gray-600 font-bold uppercase", children: [
            "Quantidade a Faturar (M\xE1ximo: ",
            invoiceModalData.limit,
            ")"
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              value: invoiceInput,
              onChange: (e) => setInvoiceInput(e.target.value),
              className: "border-2 border-emerald-500 rounded p-2 text-xl font-bold bg-emerald-50 focus:outline-none w-full",
              max: invoiceModalData.limit,
              min: 1
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setInvoiceModalData(null),
            className: "px-4 py-2 font-bold text-gray-600 hover:bg-gray-200 rounded transition",
            children: "Cancelar"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleConfirmInvoice,
            className: "flex-1 sm:flex-none px-6 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-md transition",
            children: "Confirmar"
          }
        )
      ] })
    ] }) })
  ] });
}
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("imperio_logged_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const db = useDatabase();
  const originalUpdateOrders = React.useRef(db.updateOrders);
  originalUpdateOrders.current = db.updateOrders;
  db.updateOrders = React.useCallback(
    async (updatedOrders) => {
      const list = Array.isArray(updatedOrders) ? updatedOrders : [updatedOrders];
      const stocksToUpdate = [];
      for (const updated of list) {
        const current = db.orders.find((o) => o.id === updated.id);
        const isNowFaturado = updated.status === "FATURADO";
        const wasFaturado = current?.status === "FATURADO";
        if (isNowFaturado && !wasFaturado && !updated._alreadyDeducted) {
          const stockId = `${updated.itemId}|${updated.color}|${updated.size}|${updated.variation}|ACABADO`;
          const existingStock = db.stocks.find((s) => s.id === stockId);
          const qtyToDeduct = updated.totalQuantity || updated.invoicedQuantity || 0;
          if (qtyToDeduct > 0) {
            if (existingStock) {
              const alreadyStagedIdx = stocksToUpdate.findIndex(
                (s) => s.id === stockId
              );
              if (alreadyStagedIdx >= 0) {
                stocksToUpdate[alreadyStagedIdx].quantity = Math.max(
                  0,
                  stocksToUpdate[alreadyStagedIdx].quantity - qtyToDeduct
                );
                stocksToUpdate[alreadyStagedIdx].reservedQuantity = Math.max(
                  0,
                  (stocksToUpdate[alreadyStagedIdx].reservedQuantity || 0) - qtyToDeduct
                );
              } else {
                stocksToUpdate.push({
                  ...existingStock,
                  quantity: Math.max(0, existingStock.quantity - qtyToDeduct),
                  reservedQuantity: Math.max(
                    0,
                    (existingStock.reservedQuantity || 0) - qtyToDeduct
                  )
                });
              }
            }
            db.addStockMovement?.({
              itemId: updated.itemId,
              color: updated.color,
              size: updated.size,
              variation: updated.variation,
              quantity: qtyToDeduct,
              type: "SAIDA",
              description: `Dedu\xE7\xE3o de estoque por transi\xE7\xE3o para FATURADO (Pedido ${updated.orderCode})`
            });
          }
        }
      }
      if (stocksToUpdate.length > 0) {
        await db.updateStocks(stocksToUpdate);
      }
      return originalUpdateOrders.current(updatedOrders);
    },
    [db.orders, db.stocks, db.updateStocks, db.addStockMovement]
  );
  const [toasts, setToasts] = useState([]);
  React.useEffect(() => {
    if (currentUser) {
      localStorage.setItem("imperio_logged_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("imperio_logged_user");
    }
  }, [currentUser]);
  usePushNotifications(currentUser, db, setCurrentUser);
  React.useEffect(() => {
    const handleAppToast = (e) => {
      if (e.detail?.title && e.detail?.message) {
        if (e.detail?.type === "success") {
          playNotificationSound();
        }
        setToasts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            title: e.detail.title,
            message: e.detail.message,
            type: e.detail.type || "info"
          }
        ]);
        setTimeout(() => {
          setToasts((prev) => prev.slice(1));
        }, 5e3);
      }
    };
    window.addEventListener("app_toast", handleAppToast);
    return () => window.removeEventListener("app_toast", handleAppToast);
  }, []);
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(261.63, ctx.currentTime);
      osc2.frequency.setValueAtTime(329.63, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.4);
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Erro ao reproduzir som de notifica\xE7\xE3o:", e);
    }
  };
  const getOperatorSectorIds = (role, sectors) => {
    const roleLower = role.toLowerCase();
    if (roleLower === "corte_laser") {
      return sectors.filter(
        (s) => s.name.toLowerCase().includes("corte") || s.name.toLowerCase().includes("laser")
      ).map((s) => s.id);
    }
    if (roleLower === "pintura") {
      return sectors.filter(
        (s) => s.name.toLowerCase().includes("pint") || s.name.toLowerCase().includes("acabam")
      ).map((s) => s.id);
    }
    if (roleLower === "prensa_eduardo") {
      return sectors.filter(
        (s) => s.name.toLowerCase().includes("prensa") || s.name.toLowerCase().includes("eduardo")
      ).map((s) => s.id);
    }
    if (roleLower === "prensa_rafael") {
      return sectors.filter(
        (s) => s.name.toLowerCase().includes("prensa") || s.name.toLowerCase().includes("rafael")
      ).map((s) => s.id);
    }
    if (roleLower === "injetora") {
      return sectors.filter((s) => s.name.toLowerCase().includes("injet")).map((s) => s.id);
    }
    if (roleLower === "banho_quimico") {
      return sectors.filter(
        (s) => s.name.toLowerCase().includes("banho") || s.name.toLowerCase().includes("quim")
      ).map((s) => s.id);
    }
    if (roleLower === "embalagem") {
      return sectors.filter((s) => s.name.toLowerCase().includes("embal")).map((s) => s.id);
    }
    if (roleLower === "producao" || roleLower === "montagem_rodrigo") {
      return sectors.filter(
        (s) => s.name.toLowerCase().includes("produ") || s.name.toLowerCase().includes("montag")
      ).map((s) => s.id);
    }
    return [];
  };
  const prevBatchesRef = React.useRef([]);
  const isInitialBatchesRef = React.useRef(true);
  React.useEffect(() => {
    if (!currentUser || !db.productionBatches || db.productionBatches.length === 0) {
      if (db.productionBatches) {
        prevBatchesRef.current = db.productionBatches;
      }
      return;
    }
    if (isInitialBatchesRef.current) {
      prevBatchesRef.current = db.productionBatches;
      isInitialBatchesRef.current = false;
      return;
    }
    const prevIds = new Set(prevBatchesRef.current.map((b) => b.id));
    const newBatches = db.productionBatches.filter((b) => !prevIds.has(b.id));
    if (newBatches.length > 0) {
      const opSectorIds = getOperatorSectorIds(currentUser.role, db.sectors);
      newBatches.forEach((batch) => {
        let isAssignedToMe = batch.sectorId === 0 || opSectorIds.includes(batch.sectorId);
        if (currentUser.id === "projetista_marcos" || currentUser.role === "PROJETISTA") {
          const sName = db.sectors.find((s) => s.id === batch.sectorId)?.name || "";
          const isLaserSector = sName.toLowerCase().includes("laser") || sName.toLowerCase().includes("corte");
          const isLaserBatch = batch.name.toLowerCase().includes("laser") || batch.name.toLowerCase().includes("corte");
          isAssignedToMe = isLaserSector || isLaserBatch;
        }
        if (isAssignedToMe) {
          const sectorName = batch.sectorId === 0 ? "Geral (Sem Setor)" : db.sectors.find((s) => s.id === batch.sectorId)?.name || "Seu Setor";
          const toastId = `${batch.id}-${Date.now()}`;
          const title = `\u{1F4E6} Novo Lote Atribu\xEDdo ao seu Setor!`;
          const message = `O lote "${batch.name}" foi planejado e atribu\xEDdo para o setor "${sectorName}".`;
          setToasts((prev) => [
            ...prev,
            { id: toastId, title, message, type: "success" }
          ]);
          playNotificationSound();
          if (Notification.permission === "granted") {
            new Notification(title, { body: message, icon: "/icon.png" });
          }
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
          }, 8e3);
        }
      });
    }
    prevBatchesRef.current = db.productionBatches;
  }, [db.productionBatches, currentUser, db.sectors]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  React.useEffect(() => {
    if (currentUser) {
      const nameLower = currentUser.name.toLowerCase();
      const roleLower = currentUser.role.toLowerCase();
      const isMarcosOrEmbalagem = currentUser.id === "projetista_marcos" || roleLower === "projetista" || roleLower === "embalagem" || nameLower.includes("marcos") || nameLower.includes("embalagem");
      if (!isMarcosOrEmbalagem) {
        document.documentElement.style.fontSize = "17.5px";
      } else {
        document.documentElement.style.fontSize = "";
      }
    } else {
      document.documentElement.style.fontSize = "";
    }
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [currentUser]);
  if (!currentUser) {
    return /* @__PURE__ */ jsx(LoginScreen, { users: db.users, onLogin: setCurrentUser });
  }
  return /* @__PURE__ */ jsx(BrowserRouter, { children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-screen-safe w-screen bg-slate-50 overflow-hidden font-sans antialiased", children: [
    /* @__PURE__ */ jsx("div", { className: "fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none", children: toasts.map((toast) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: "pointer-events-auto bg-slate-900 border border-[#00b14f]/30 text-white rounded-xl shadow-2xl p-4 flex flex-col gap-1 transition-all duration-300 animate-in slide-in-from-right-5 fade-in duration-200",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 justify-between", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-extrabold text-[11px] text-[#00b14f] flex items-center gap-1", children: [
              /* @__PURE__ */ jsx("span", { children: "\u{1F514}" }),
              " ",
              toast.title
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setToasts((prev) => prev.filter((t) => t.id !== toast.id)),
                className: "text-slate-400 hover:text-white text-xs font-bold leading-none shrink-0",
                children: "\u2715"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-300", children: toast.message })
        ]
      },
      toast.id
    )) }),
    isOffline && /* @__PURE__ */ jsxs("div", { className: "bg-amber-500 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "w-2 h-2 bg-red-600 rounded-full animate-pulse" }),
      "Modo Offline (As altera\xE7\xF5es ser\xE3o sincronizadas quando reconectar)"
    ] }),
    /* @__PURE__ */ jsxs("header", { className: "bg-black text-[#00b14f] p-4 flex justify-between items-center shadow-md shrink-0 border-b border-[#00b14f]/20", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Crown, { size: 28, className: "text-[#00b14f]" }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col leading-none", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-xl font-bold tracking-tight", children: "IMP\xC9RIO" }),
          /* @__PURE__ */ jsx("span", { className: "text-[0.6rem] text-gray-400 font-medium tracking-widest", children: "ACESS\xD3RIOS PARA M\xD3VEIS" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-sm sm:text-base text-gray-300", children: [
        /* @__PURE__ */ jsxs("span", { className: "hidden sm:inline", children: [
          currentUser.name,
          " (",
          currentUser.role,
          ")"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "sm:hidden", children: currentUser.name.split(" ")[0] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setCurrentUser(null),
            className: "p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 hover:text-[#00b14f] transition",
            children: /* @__PURE__ */ jsx(LogOut, { size: 18 })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("main", { className: "flex-1 overflow-hidden w-full max-w-7xl mx-auto flex flex-col min-h-0 bg-slate-50 relative", children: /* @__PURE__ */ jsxs(Routes, { children: [
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/",
          element: /* @__PURE__ */ jsx(Welcome, { currentUser, db })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "LEITURA" || currentUser.role === "PCP" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/admin",
          element: /* @__PURE__ */ jsx(AdminScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "GERENCIA" || currentUser.role === "LEITURA" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/relatorios",
          element: /* @__PURE__ */ jsx(RelatoriosScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "LEITURA" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          Route,
          {
            path: "/status",
            element: /* @__PURE__ */ jsx(StatusScreen, { db, currentUser })
          }
        ),
        /* @__PURE__ */ jsx(Route, { path: "/itens", element: /* @__PURE__ */ jsx(ItensScreen, { db }) })
      ] }),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "LEITURA" || currentUser.role === "PROJETISTA") && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          Route,
          {
            path: "/pedidos",
            element: /* @__PURE__ */ jsx(PedidosScreen, { db, currentUser })
          }
        ),
        /* @__PURE__ */ jsx(
          Route,
          {
            path: "/nests",
            element: /* @__PURE__ */ jsx(UploadNestScreen, { db, currentUser })
          }
        )
      ] }),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "PROJETISTA" || currentUser.role === "LEITURA" || currentUser.role === "MONTAGEM_RODRIGO") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/estoque",
          element: currentUser.role === "PROJETISTA" ? /* @__PURE__ */ jsx(EstoqueNestingScreen, { db, currentUser }) : /* @__PURE__ */ jsx(EstoqueScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PRENSA_EDUARDO") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/prensa-eduardo",
          element: /* @__PURE__ */ jsx(PrensaEduardoScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PRENSA_RAFAEL" || currentUser.role === "INJETORA") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/prensa-rafael",
          element: currentUser.role === "INJETORA" ? /* @__PURE__ */ jsx(InjetoraScreen, { db, currentUser }) : /* @__PURE__ */ jsx(PrensaRafaelScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "BANHO_QUIMICO") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/banho-quimico",
          element: /* @__PURE__ */ jsx(BanhoQuimicoScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "EMBALAGEM") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/embalagem",
          element: /* @__PURE__ */ jsx(
            EmbalagemScreen,
            {
              db,
              currentUser,
              SVGQRCode
            }
          )
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PRODUCAO" || currentUser.role === "MONTAGEM_RODRIGO" || currentUser.role === "SOLDA" || currentUser.role === "MONTAGEM_RETRATIL" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/producao",
          element: /* @__PURE__ */ jsx(ProducaoScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "CORTE_LASER") && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          Route,
          {
            path: "/cortelaser",
            element: /* @__PURE__ */ jsx(CorteLaserScreen, { db, currentUser })
          }
        ),
        currentUser.role === "CORTE_LASER" && /* @__PURE__ */ jsx(
          Route,
          {
            path: "/nests",
            element: /* @__PURE__ */ jsx(UploadNestScreen, { db, currentUser })
          }
        )
      ] }),
      (currentUser.role === "ADMIN" || currentUser.role === "PINTURA") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/pintura",
          element: /* @__PURE__ */ jsx(PinturaScreen, { db, currentUser })
        }
      ),
      /* @__PURE__ */ jsx(
        Route,
        {
          path: "/historico",
          element: /* @__PURE__ */ jsx(HistoricoProducaoScreen, { db, currentUser })
        }
      ),
      currentUser.role === "REPRESENTANTE" && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/representante",
          element: /* @__PURE__ */ jsx(RepresentanteScreen, { db, currentUser })
        }
      ),
      currentUser.role === "PCP" && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/pcp",
          element: /* @__PURE__ */ jsx(PCPScreen, { db, currentUser })
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP") && /* @__PURE__ */ jsx(
        Route,
        {
          path: "/gestao-clientes",
          element: /* @__PURE__ */ jsx(GestaoClientesScreen, { db, currentUser })
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs("nav", { className: "bg-white border-t border-gray-200 flex justify-around p-3 pb-safe shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] overflow-x-auto", children: [
      /* @__PURE__ */ jsx(NavLink, { to: "/", icon: /* @__PURE__ */ jsx(Home, { size: 24 }), label: "In\xEDcio" }),
      (currentUser.role === "ADMIN" || currentUser.role === "LEITURA" || currentUser.role === "PCP" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/admin",
          icon: /* @__PURE__ */ jsx(BarChart2, { size: 24 }),
          label: "Monitor"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "GERENCIA" || currentUser.role === "LEITURA" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/relatorios",
          icon: /* @__PURE__ */ jsx(ClipboardList, { size: 24 }),
          label: "Produt."
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/gestao-clientes",
          icon: /* @__PURE__ */ jsx(Users, { size: 24 }),
          label: "Clientes"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP") && /* @__PURE__ */ jsx(NavLink, { to: "/itens", icon: /* @__PURE__ */ jsx(List, { size: 24 }), label: "Itens" }),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "LEITURA" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/status",
          icon: /* @__PURE__ */ jsx(ClipboardList, { size: 24 }),
          label: "Status"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "LEITURA" || currentUser.role === "PROJETISTA") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/pedidos",
          icon: /* @__PURE__ */ jsx(ShoppingCart, { size: 24 }),
          label: "Pedidos"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PCP" || currentUser.role === "LEITURA" || currentUser.role === "MONTAGEM_RODRIGO" || currentUser.role === "PROJETISTA") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/estoque",
          icon: /* @__PURE__ */ jsx(Layers, { size: 24 }),
          label: currentUser.role === "PROJETISTA" ? "Estoque de pe\xE7as cortadas" : "Estoque"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PROJETISTA" || currentUser.role === "PCP" || currentUser.role === "CORTE_LASER") && /* @__PURE__ */ jsx(NavLink, { to: "/nests", icon: /* @__PURE__ */ jsx(Scissors, { size: 24 }), label: "Nests" }),
      (currentUser.role === "ADMIN" || currentUser.role === "MONTAGEM_RODRIGO" || currentUser.role === "PRODUCAO" || currentUser.role === "SOLDA" || currentUser.role === "MONTAGEM_RETRATIL" || currentUser.role === "ENCARREGADO") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/producao",
          icon: /* @__PURE__ */ jsx(Activity, { size: 24 }),
          label: "Produ\xE7\xE3o"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "CORTE_LASER") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/cortelaser",
          icon: /* @__PURE__ */ jsx(Scissors, { size: 24 }),
          label: "Laser"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PINTURA") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/pintura",
          icon: /* @__PURE__ */ jsx(Paintbrush, { size: 24 }),
          label: "Pintura"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PRENSA_EDUARDO") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/prensa-eduardo",
          icon: /* @__PURE__ */ jsx(Hammer, { size: 24 }),
          label: "Prensa (E)"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "PRENSA_RAFAEL" || currentUser.role === "INJETORA") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/prensa-rafael",
          icon: /* @__PURE__ */ jsx(Scissors, { size: 24 }),
          label: currentUser.role === "INJETORA" ? "Injetora" : "Prensa (R)"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "BANHO_QUIMICO") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/banho-quimico",
          icon: /* @__PURE__ */ jsx(Beaker, { size: 24 }),
          label: "Banho/Zinc"
        }
      ),
      (currentUser.role === "ADMIN" || currentUser.role === "EMBALAGEM") && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/embalagem",
          icon: /* @__PURE__ */ jsx(Box, { size: 24 }),
          label: "Embalagem"
        }
      ),
      currentUser.role === "REPRESENTANTE" && /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/representante",
          icon: /* @__PURE__ */ jsx(ClipboardList, { size: 24 }),
          label: "Painel"
        }
      ),
      /* @__PURE__ */ jsx(
        NavLink,
        {
          to: "/historico",
          icon: /* @__PURE__ */ jsx(History, { size: 24 }),
          label: "Hist\xF3rico"
        }
      )
    ] })
  ] }) });
}
