/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "motion/react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
} from "react-router-dom";
import {
  Box,
  Home,
  List,
  ShoppingCart,
  LogOut,
  ArrowLeft,
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
  Monitor,
  History,
  Calendar,
  Settings,
  Users,
  Hammer,
  Beaker,
  Package,
  X,
  FileDown,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  Check,
  HelpCircle,
  Filter,
  UploadCloud,
  Phone,
  DollarSign,
  Printer,
  Truck,
  Copy,
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
  Cell,
} from "recharts";
import { useDatabase } from "./useDatabase";
import type { User, OrderStatus, Role, Order, AppNotification } from "./types";
import { calculateWorkingMillis } from "./timeUtils";

import { ProducaoScreen } from "./ProducaoScreen";
import { PinturaScreen } from "./PinturaScreen";
import { CorteLaserScreen } from "./CorteLaserScreen";
import { StatusScreen } from "./StatusScreen";
import { RelatoriosScreen } from "./RelatoriosScreen";
import { EmbalagemScreen } from "./EmbalagemScreen";
import { LoteGeralWidget } from "./components/LoteGeralWidget";
import { usePushNotifications } from "./usePushNotifications";
import { EstoqueScreen } from "./EstoqueScreen";
import { EstoqueNestingScreen } from "./EstoqueNestingScreen";
import { RepresentanteScreen } from "./RepresentanteScreen";
import { UploadNestScreen } from "./UploadNestScreen";
import { HistoricoProducaoScreen } from "./HistoricoProducaoScreen";
import { PCPScreen } from "./PCPScreen";
import { PedidosSemLoteScreen } from "./PedidosSemLoteScreen";
import { GestaoClientesScreen } from "./GestaoClientesScreen";
import { LotesScreen } from "./LotesScreen";
import { EtiquetasTab } from "./EtiquetasTab";
import { FinanceiroScreen } from "./FinanceiroScreen";
import { SuperAdminScreen } from "./components/SuperAdminScreen";
import { ShieldAlert } from "lucide-react";

import { BanhoQuimicoScreen } from "./BanhoQuimicoScreen";
import { PrensaEduardoScreen } from "./PrensaEduardoScreen";
import { TornoCncWillianScreen } from "./TornoCncWillianScreen";
import { TornoCncHenriqueScreen } from "./TornoCncHenriqueScreen";
import { PrensaRafaelScreen } from "./PrensaRafaelScreen";
import { InjetoraScreen } from "./InjetoraScreen";
import { LogisticaScreen } from "./LogisticaScreen";
import { normalizeString } from "./searchUtils";

// Custom virtualization and metrics components
import { MonitoramentoMetricsSummary } from "./components/MonitoramentoMetricsSummary";
import { useVirtualScroll } from "./hooks/useVirtualScroll";
import {
  ScreenLayout,
  ScreenHeader,
  ScrollContainer,
  StickyActionsBar,
  ResponsiveCardGrid,
  SectionBlock,
  MobileCompactToolbar,
  CompactScreenHeader,
} from "./components/Layout";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

import { CatalogImportModal } from "./CatalogImportModal";
import { EvolucaoEmbalagemTab } from "./EvolucaoEmbalagemTab";
import { GestaoPessoasTab } from "./components/GestaoPessoasTab";
import { COLOR_MAP } from "./types";

function NavLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[48px] text-gray-500 hover:text-blue-600 active:bg-blue-50 active:text-blue-700 rounded-lg transition-colors shrink-0"
    >
      {icon}
      <span className="text-xs mt-1 font-medium">{label}</span>
    </Link>
  );
}

function Welcome({
  currentUser,
  db,
}: {
  currentUser: User;
  db: ReturnType<typeof useDatabase>;
}) {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [infoModalData, setInfoModalData] = useState<{
    title: string;
    body: React.ReactNode;
  } | null>(null);

  useEffect(() => {
    const role = currentUser.role;
    const hasRedirectedKey = `has_redirected_on_load_${currentUser.id}`;
    const alreadyRedirected = sessionStorage.getItem(hasRedirectedKey);

    if (!alreadyRedirected) {
      sessionStorage.setItem(hasRedirectedKey, "true");
      if (role === "PCP" || role === "ADMIN") {
        navigate("/status");
      } else if (role === "GERENCIA") {
        navigate("/relatorios");
      } else if (role === "EMBALAGEM") {
        navigate("/embalagem");
      } else if (role === "CORTE_LASER") {
        navigate("/corte-laser");
      } else if (role === "INJETORA") {
        navigate("/injetora");
      } else if (
        role === "PRENSA_RAFAEL" ||
        role === "PRENSA_EDUARDO" ||
        role === "TORNO_CNC_WILLIAN" ||
        role === "TORNO_CNC_HENRIQUE" ||
        role === "BANHO_QUIMICO"
      ) {
        navigate(
          role === "PRENSA_RAFAEL"
            ? "/prensa-rafael"
            : role === "PRENSA_EDUARDO"
              ? "/prensa-eduardo"
              : role === "TORNO_CNC_WILLIAN"
                ? "/torno-cnc-willian"
                : role === "TORNO_CNC_HENRIQUE"
                  ? "/torno-cnc-henrique"
                  : "/banho-quimico",
        );
      } else if (
        role === "PRODUCAO" ||
        role === "SOLDA" ||
        role === "MONTAGEM_RETRATIL" ||
        role === "MONTAGEM_RODRIGO" ||
        role === "PINTURA"
      ) {
        navigate("/producao");
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Force existing orders assignment rule
    const clientsForAndre = [
      "móveis bom pastor",
      "moveis bom pastor",
      "bom pastor",
      "Moveis B P LTDA",
      "lara moveis",
      "lara móveis",
      "artano",
      "grupo sier",
      "sier",
    ];
    let needsUpdate = false;
    const updatedOrders = db.orders
      .map((o) => {
        const isClientForAndre = clientsForAndre.some((clientName) =>
          (o.customerName || "").toLowerCase().includes(clientName),
        );
        if (
          isClientForAndre &&
          (!o.representativeName ||
            !o.representativeName.toLowerCase().includes("andr"))
        ) {
          const andreRep = db.users.find(
            (u) =>
              u.name.toLowerCase().includes("andré") ||
              u.name.toLowerCase().includes("andre"),
          );
          if (andreRep) {
            needsUpdate = true;
            return {
              ...o,
              representativeName: andreRep.name,
              representativeId: andreRep.id,
            };
          }
        }
        return null;
      })
      .filter((o) => o !== null) as typeof db.orders;

    if (needsUpdate && updatedOrders.length > 0) {
      db.updateOrders(updatedOrders);
    }
  }, [db.orders.length, db.users, db]); // Keep deps lightweight

  const alerts = React.useMemo(() => {
    const isRomarioOrAlessandra =
      currentUser.name.toLowerCase().includes("romario") ||
      currentUser.name.toLowerCase().includes("alessandra");
    if (isRomarioOrAlessandra) return [];

    // PCP, GERENCIA, ADMIN should NOT see alerts (they only want notifications)
    if (
      currentUser.role === "PCP" ||
      currentUser.role === "GERENCIA" ||
      currentUser.role === "ADMIN"
    ) {
      return [];
    }

    if (currentUser.role !== "LEITURA") return [];

    const today = new Date();
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
    const isRomarioOrAlessandra =
      currentUser.name.toLowerCase().includes("romario") ||
      currentUser.name.toLowerCase().includes("alessandra");
    if (isRomarioOrAlessandra) return [];

    // PCP, GERENCIA, ADMIN should NOT see delayed orders (they only want notifications)
    if (
      currentUser.role === "PCP" ||
      currentUser.role === "GERENCIA" ||
      currentUser.role === "ADMIN"
    ) {
      return [];
    }

    if (currentUser.role !== "LEITURA") return [];

    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
    return db.orders.filter((o) => {
      return o.status === "PENDENTE" && o.createdAt < fortyEightHoursAgo;
    });
  }, [currentUser, db.orders]);

  const unreadNotifications = React.useMemo(() => {
    return db.notifications.filter((n) => {
      if (n.read) return false;

      if (n.recipientId && n.recipientId !== currentUser?.id) {
        return false;
      }

      if (n.recipientId === currentUser?.id) return true;

      // REPRESENTANTE role: only show billing-related notifications for their linked orders
      if (currentUser?.role === "REPRESENTANTE") {
        const msgLower = n.message.toLowerCase();
        const isBillingRelated =
          msgLower.includes("fatur") ||
          msgLower.includes("nota fiscal") ||
          msgLower.includes("carga");
        if (!isBillingRelated) return false;

        // Find if this notification is linked to any order of this representative
        const repOrders = db.orders.filter((o) => {
          const isDirectMatch =
            o.representativeId === currentUser.id ||
            o.representativeName === currentUser.name;
          const isDaniloCheck =
            currentUser.id === "representante_danilo" &&
            ((o.representativeName &&
              o.representativeName.toLowerCase().includes("mapefor")) ||
              (o.representativeId && o.representativeId === "mapefor"));
          return isDirectMatch || isDaniloCheck;
        });

        // Match order by orderCode or customerName
        const matchCode = n.message.match(/\b\d{4,8}\b/);
        const isLinkedToRep = repOrders.some((o) => {
          const matchesCode = matchCode ? o.orderCode === matchCode[0] : false;
          const matchesTextCode =
            o.orderCode && msgLower.includes(o.orderCode.toLowerCase());
          const matchesCustomer =
            o.customerName && msgLower.includes(o.customerName.toLowerCase());
          return matchesCode || matchesTextCode || matchesCustomer;
        });

        return isLinkedToRep;
      }

      // Marcos (Projetista) receives only notifications related to Laser/Corte production
      if (
        currentUser?.id === "projetista_marcos" ||
        currentUser?.role === "PROJETISTA"
      ) {
        const msg = n.message.toLowerCase();
        const isLaser =
          msg.includes("laser") ||
          msg.includes("corte") ||
          msg.includes("nesting") ||
          msg.includes("chapa");
        const isOtherSec =
          msg.includes("prensa") ||
          msg.includes("injetora") ||
          msg.includes("pintura") ||
          msg.includes("banho") ||
          msg.includes("embalagem") ||
          msg.includes("solda");
        return isLaser && !isOtherSec;
      }

      return true;
    });
  }, [db.notifications, db.orders, currentUser]);

  const handleNotificationClick = React.useCallback(
    (n: AppNotification) => {
      const match = n.message.match(/\b\d{4,8}\b/);
      let found = null;
      if (match) {
        found = db.orders.find((o) => o.orderCode === match[0]);
      }
      if (found) {
        setSelectedOrder(found);
      } else {
        const orderWithCustomer = db.orders.find((o) =>
          n.message.toLowerCase().includes(o.customerName.toLowerCase()),
        );
        if (orderWithCustomer) {
          setSelectedOrder(orderWithCustomer);
        } else {
          setInfoModalData({
            title: "Notificação Informativa",
            body: (
              <div className="space-y-4 text-left">
                <p className="text-gray-750 font-medium text-sm border-l-4 border-blue-500 pl-3 py-1 bg-gray-50 rounded">
                  {n.message}
                </p>
                <div className="text-xs text-gray-500">
                  Registrada em: {new Date(n.createdAt).toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 italic mt-2">
                  Dica: Marque como lida na listagem se este aviso já tiver sido
                  processado.
                </p>
              </div>
            ),
          });
        }
      }
    },
    [db.orders],
  );

  const getOrderStatusBadgeColor = React.useCallback((status?: string) => {
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
  }, []);

  const selectedOrderLogs = React.useMemo(() => {
    if (!selectedOrder) return [];
    return db.logs
      .filter((l) => l.orderId === selectedOrder.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedOrder, db.logs]);

  const isAiEnabledForUser = false; // Removido globally for Welcome screen

  const isSpecialUser =
    currentUser.role === "PCP" ||
    currentUser.role === "GERENCIA" ||
    currentUser.role === "ADMIN";
  const notificationsToDisplay = unreadNotifications;

  return (
    <div className="flex flex-col flex-1 items-center justify-start p-4 text-center overflow-y-auto h-full w-full min-h-0 scrollbar-thin">
      <h2 className="text-2xl font-bold text-gray-800 mt-4">
        Bem-vindo, {currentUser.name}!
      </h2>
      <p className="text-gray-500 mt-2 mb-4">
        Escolha uma opção no menu inferior.
      </p>

      <div className="mt-8 mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 pb-8">
        {(currentUser.role === "ADMIN" ||
          currentUser.role === "GERENCIA" ||
          currentUser.role === "LEITURA" ||
          currentUser.role === "PCP" ||
          currentUser.role === "REPRESENTANTE" ||
          currentUser.role === "PROJETISTA" ||
          currentUser.role === "ENCARREGADO") &&
          unreadNotifications.length > 0 && (
            <div
              className={
                isSpecialUser
                  ? "text-left w-full h-auto flex flex-col bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm"
                  : "text-left w-full h-full flex flex-col bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              }
            >
              <div className="flex items-center justify-between font-bold mb-2 shrink-0">
                <div className="flex items-center gap-2 text-blue-700">
                  <Bell size={20} />
                  <span>Notificações ({unreadNotifications.length})</span>
                </div>
                <button
                  onClick={() => unreadNotifications.forEach(n => db.markNotificationRead(n.id))}
                  className="text-[10px] bg-blue-100/60 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded cursor-pointer transition-colors"
                >
                  Marcar todas como lidas
                </button>
              </div>
              <p className="text-xs text-blue-600 mb-3 shrink-0">
                Dica: Clique em uma notificação para ver os detalhes completos
                do pedido associado.
              </p>
              <ul className="text-sm text-blue-900 flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1 max-h-[285px] flex-1">
                {notificationsToDisplay.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="bg-white p-3 rounded-lg shadow-sm border border-blue-100 flex flex-col gap-2 cursor-pointer hover:bg-blue-100/50 hover:border-blue-300 transition-all duration-150"
                  >
                    <div className="font-medium text-gray-800">{n.message}</div>
                    <div className="flex justify-between items-center text-[10px] mt-1 space-x-2">
                      <span className="text-gray-500 font-semibold">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          db.markNotificationRead(n.id);
                        }}
                        className="text-blue-700 font-bold hover:underline bg-blue-100/60 px-2 py-1 rounded cursor-pointer transition-colors"
                      >
                        Marcar como lido
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {alerts.length > 0 && (
          <div className="text-left w-full h-full flex flex-col bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="flex items-center gap-2 text-red-700 font-bold mb-2 shrink-0">
              <AlertCircle size={20} />
              <span>Atrasos/Entregas Hoje ({alerts.length})</span>
            </div>
            <p className="text-xs text-red-600 mb-3 shrink-0">
              Clique em um alerta abaixo para abrir a ficha do pedido.
            </p>
            <ul className="text-sm text-red-900 flex flex-col gap-2 overflow-y-auto flex-1 styling-scrollbar pr-1">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  onClick={() => setSelectedOrder(a)}
                  className="bg-white p-2 rounded-lg shadow-sm border border-red-100 flex flex-col gap-1.5 cursor-pointer hover:bg-red-100/40 hover:border-red-300 transition-all duration-150"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-sm">
                      Cód: {a.orderCode}
                    </span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full border border-red-200/50">
                      {new Date(a.deliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 font-medium">
                    Cliente:{" "}
                    <span className="text-gray-800">{a.customerName}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {delayedOrders.length > 0 && (
          <div className="text-left w-full h-full flex flex-col bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="flex items-center gap-2 text-orange-700 font-bold mb-2 shrink-0">
              <AlertCircle size={20} />
              <span>Sem Iniciar há &gt; 48h ({delayedOrders.length})</span>
            </div>
            <p className="text-xs text-orange-600 mb-3 shrink-0">
              Clique em um lote parado abaixo para ver seu progresso de logs.
            </p>
            <ul className="text-sm text-orange-900 flex flex-col gap-2 overflow-y-auto flex-1 styling-scrollbar pr-1">
              {delayedOrders.map((a) => (
                <li
                  key={a.id}
                  onClick={() => setSelectedOrder(a)}
                  className="bg-white p-2 rounded-lg shadow-sm border border-orange-100 flex flex-col gap-1.5 cursor-pointer hover:bg-orange-100/40 hover:border-orange-300 transition-all duration-150"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-sm">
                      Cód: {a.orderCode}
                    </span>
                    <span className="text-[10px] text-orange-700 font-bold bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200/50">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 font-medium">
                    Cliente:{" "}
                    <span className="text-gray-800">{a.customerName}</span>
                  </div>
                  <div className="text-[10px] text-orange-600 font-bold bg-orange-50 rounded px-1.5 py-0.5 self-start border border-orange-100">
                    Status: Parado em Pendente
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* SECTION FOR OPERATOR BATCH CHECKLIST & LIBERATION (GERÊNCIA) */}
      {(currentUser.role === "ADMIN" ||
        currentUser.role === "PCP" ||
        currentUser.id === "gerencia" ||
        currentUser.id === "dinei" ||
        currentUser.id === "projetista_marcos") && (
        <div className="mt-8 w-full max-w-6xl text-left bg-white border border-slate-200 shadow-sm rounded-xl p-6 font-sans shrink-0">
          <div className="flex border-b border-slate-100 pb-3 justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold">
                  📋
                </span>
                Lotes de Gerência - Liberação de Produção
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lotes consolidados de Corte a Laser & Produção. Cheque os itens
                e faça a liberação para a fábrica.
              </p>
            </div>
            {/* Visual indicators legend and Full Screen navigation */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate("/lotes")}
                className="bg-emerald-50 text-[#00b14f] text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-emerald-150 cursor-pointer hover:bg-emerald-100/50 transition flex items-center gap-1 uppercase"
              >
                Tela Cheia ↗
              </button>
              <div className="flex gap-3 text-[10px] uppercase font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>{" "}
                  Checado
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-650"></span>{" "}
                  Liberado p/ Produção
                </span>
              </div>
            </div>
          </div>

          {/* Filter batches according to target permissions */}
          {(() => {
            const getBatches = () => {
              const baseList = db.productionBatches.filter(
                (b) => b.isGerenciaLote || b.sectorId === 999,
              );
              if (
                currentUser.role === "ADMIN" ||
                currentUser.role === "PCP" ||
                currentUser.id === "gerencia"
              ) {
                return baseList;
              }
              // Encarregado or Projetista
              return baseList.filter((b) =>
                b.assignedOperatorIds?.includes(currentUser.id),
              );
            };

            const batches = getBatches();

            if (batches.length === 0) {
              return (
                <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-150 rounded-xl mt-4 w-full">
                  <p className="text-slate-500 text-xs font-medium">
                    Nenhum lote de gerência encaminhado para você no momento.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-5 mt-5">
                {batches.map((b) => {
                  const checkCount = b.checkedOrderIds?.length || 0;
                  const libCount = b.liberatedOrderIds?.length || 0;
                  const totalOrders = b.orderIds.length;

                  return (
                    <div
                      key={b.id}
                      className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 sm:p-5 hover:border-slate-300 transition-colors bg-white"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-[#00b14f] text-base">
                              {b.name}
                            </h4>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                              Lote de Gerência
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Criado em {new Date(b.createdAt).toLocaleString()} |
                            Progresso: {checkCount}/{totalOrders} Checados,{" "}
                            {libCount}/{totalOrders} Liberados
                          </p>
                        </div>

                        {/* Status indicators */}
                        <div className="flex items-center gap-1.5">
                          {b.assignedOperatorIds &&
                            b.assignedOperatorIds.length > 0 && (
                              <div className="flex flex-wrap gap-1 text-[9px] font-bold text-slate-650 bg-white border px-2 py-1 rounded-lg">
                                <span>Setores Operadores:</span>
                                {b.assignedOperatorIds.map((op) => {
                                  const names: Record<string, string> = {
                                    dinei: "Dinei (Encarregado)",
                                    projetista_marcos: "Marcos Projetista",
                                    pcp: "PCP",
                                  };
                                  return (
                                    <span
                                      key={op}
                                      className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-200/60"
                                    >
                                      {names[op] || op}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Item list in Batch */}
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border-b border-slate-200">
                              <th className="p-3">Cód/Ped</th>
                              <th className="p-3">Cliente</th>
                              <th className="p-3">Produto / Item</th>
                              <th className="p-3 text-center">Qtd</th>
                              <th className="p-3 text-center">
                                Status Interno
                              </th>
                              <th className="p-3 text-right">
                                Ações de Liberação
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {b.orderIds.map((oid) => {
                              const o = db.orders.find((x) => x.id === oid);
                              if (!o) return null;
                              const item = db.items.find(
                                (i) => i.id === o.itemId,
                              );

                              const isChecked =
                                b.checkedOrderIds?.includes(oid) || false;
                              const isLiberated =
                                b.liberatedOrderIds?.includes(oid) || false;

                              return (
                                <tr
                                  key={oid}
                                  className={`hover:bg-slate-50/50 transition-colors ${isLiberated ? "bg-indigo-50/10" : ""}`}
                                >
                                  <td className="p-3 font-mono font-bold text-slate-850">
                                    <span
                                      onClick={() => setSelectedOrder(o)}
                                      className="hover:underline cursor-pointer text-indigo-700 block"
                                    >
                                      #{o.orderCode}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-700 font-semibold">
                                    {o.customerName}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-semibold text-slate-900">
                                      {item?.name || "Desconhecido"}
                                    </div>
                                    <div className="text-[10px] text-slate-405 font-semibold">
                                      Var: {o.color || "-"} | {o.size || "-"} |{" "}
                                      {o.variation || "-"}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                                    {o.totalQuantity} pçs
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex justify-center gap-1.5 pb-0.5">
                                      {isChecked ? (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-250 font-extrabold px-1.5 py-0.5 rounded">
                                          ✓ CHECADO
                                        </span>
                                      ) : (
                                        <span className="text-[9px] bg-amber-50 text-amber-800 font-extrabold px-1.5 py-0.5 rounded border border-amber-200">
                                          ◽ PENDENTE
                                        </span>
                                      )}

                                      {isLiberated ? (
                                        <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded border border-indigo-200">
                                          🚀 LIBERADO PROD.
                                        </span>
                                      ) : (
                                        <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                          ⏳ RETIDO
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                      {/* CHECK BUTTON */}
                                      <button
                                        onClick={async () => {
                                          const checked =
                                            b.checkedOrderIds || [];
                                          const isAlreadyChecked =
                                            checked.includes(oid);
                                          const newChecked = isAlreadyChecked
                                            ? checked.filter((id) => id !== oid)
                                            : [...checked, oid];

                                          await db.updateProductionBatch({
                                            ...b,
                                            checkedOrderIds: newChecked,
                                          });

                                          // Add a logging line for the checkout action
                                          await db.addLogs([
                                            {
                                              id: Date.now(),
                                              orderId: oid,
                                              operatorId:
                                                currentUser.id || "OPERADOR",
                                              processName:
                                                "CHECK LOTE DE GERÊNCIA",
                                              customProductName:
                                                isAlreadyChecked
                                                  ? `Item desmarcado como checado no lote ${b.name} por ${currentUser.name}`
                                                  : `Item checado com sucesso no lote ${b.name} por ${currentUser.name}`,
                                              timestamp: Date.now(),
                                              durationMillis: 0,
                                              type: "PRODUCAO" as any,
                                            },
                                          ]);
                                        }}
                                        className={`px-3 py-1.5 text-[11px] font-bold rounded cursor-pointer transition active:scale-95 flex items-center gap-1 ${isChecked ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                                      >
                                        {isChecked
                                          ? "✓ Checado"
                                          : "Checar Item"}
                                      </button>

                                      {/* LIBERATE BUTTON */}
                                      <button
                                        onClick={async () => {
                                          const liberated =
                                            b.liberatedOrderIds || [];
                                          const isAlreadyLiberated =
                                            liberated.includes(oid);
                                          const newLiberated =
                                            isAlreadyLiberated
                                              ? liberated.filter(
                                                  (id) => id !== oid,
                                                )
                                              : [...liberated, oid];

                                          await db.updateProductionBatch({
                                            ...b,
                                            liberatedOrderIds: newLiberated,
                                          });

                                          // If we are liberating, transition the order status to EM_PRODUCAO
                                          if (
                                            !isAlreadyLiberated &&
                                            o.status === "PENDENTE"
                                          ) {
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
                                              orderId: oid,
                                              operatorId:
                                                currentUser.id || "OPERADOR",
                                              processName:
                                                "LIBERAÇÃO LOTE DE GERÊNCIA",
                                              customProductName:
                                                isAlreadyLiberated
                                                  ? `Liberação para produção cancelada no lote ${b.name} por ${currentUser.name}`
                                                  : `Item liberado para produção e enviado à fábrica no lote ${b.name} por ${currentUser.name}`,
                                              timestamp: Date.now(),
                                              durationMillis: 0,
                                              type: "PRODUCAO" as any,
                                            },
                                          ]);
                                        }}
                                        className={`px-3 py-1.5 text-[11px] font-bold rounded cursor-pointer transition active:scale-95 flex items-center gap-1 ${isLiberated ? "bg-indigo-650 text-white hover:bg-indigo-700" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                                      >
                                        {isLiberated
                                          ? "🟢 Liberado"
                                          : "🚀 Liberar p/ Prod."}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {(currentUser.role === "ADMIN" ||
        currentUser.role === "GERENCIA" ||
        currentUser.role === "PCP") && (
        <div className="mt-6 w-full max-w-6xl text-left bg-white border border-slate-200 shadow-sm rounded-xl p-5 md:p-6 font-sans shrink-0">
          <div className="flex border-b border-slate-100 pb-3 justify-between items-center flex-wrap gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold">
                  <List size={16} />
                </span>
                Fila de Produção & PCP IA
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pedidos aguardando inserção em Lotes de Produção.
              </p>
            </div>
            <button
              onClick={() => navigate("/fila-producao")}
              className="bg-indigo-50 text-indigo-700 text-xs font-bold px-4 py-2 rounded-lg border border-indigo-150 shadow-sm hover:bg-indigo-100 transition whitespace-nowrap"
            >
              Abrir Gestor de Fila ↗
            </button>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-2">
            Acompanhe pedidos abertos sem lote gerado, verifique urgências
            sinalizadas e agrupamentos recomendados.
          </p>
        </div>
      )}

      {/* --- ORDER DETAILS POPUP MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 text-left animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-black text-white p-4 flex justify-between items-center border-b border-[#00b14f]/20">
              <div className="flex items-center gap-2">
                <Crown size={20} className="text-[#00b14f]" />
                <h3 className="font-bold text-lg tracking-tight">
                  Ficha do Pedido: {selectedOrder.orderCode}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-white transition duration-150 text-xl font-bold px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body (Scrollable) */}
            <div className="flex-1 overflow-auto p-5 space-y-5">
              {/* Box 1: General Info */}
              <div className="bg-slate-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Informações Gerais
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Cliente:
                    </span>
                    <strong className="text-gray-800">
                      {selectedOrder.customerName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Representante:
                    </span>
                    <strong className="text-gray-800">
                      {selectedOrder.representativeName || "Venda Direta"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Data do Pedido:
                    </span>
                    <strong className="text-gray-700">
                      {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Data Prometida:
                    </span>
                    <strong className="text-red-650 font-semibold">
                      {selectedOrder.deliveryDate
                        ? selectedOrder.deliveryDate
                            .split("-")
                            .reverse()
                            .join("/")
                        : "-"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">
                      Status Atual:
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getOrderStatusBadgeColor(selectedOrder.status)}`}
                    >
                      {selectedOrder.status || "PENDENTE"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 block">
                      Especificações:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedOrder.isUrgent && (
                        <span className="bg-red-100 text-red-800 border-red-200 border text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ⚠️ URGENTE
                        </span>
                      )}
                      {selectedOrder.isProgramacao && (
                        <span className="bg-indigo-100 text-indigo-800 border-indigo-200 border text-[9px] font-bold px-1.5 py-0.5 rounded">
                          📈 PROGRAMAÇÃO
                        </span>
                      )}
                      {selectedOrder.isThirdPartyLaser && (
                        <span className="bg-indigo-100 text-indigo-800 border-indigo-200 border text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ⚙️ TERCEIRO LASER
                        </span>
                      )}
                      {!selectedOrder.isUrgent &&
                        !selectedOrder.isProgramacao &&
                        !selectedOrder.isThirdPartyLaser && (
                          <span className="bg-gray-100 text-gray-650 border-gray-200 border text-[9px] font-medium px-1.5 py-0.5 rounded">
                            Padrão
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Product & Attributes */}
              <div className="border border-gray-200 p-4 rounded-lg bg-emerald-50/20 border-emerald-500/10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Item e Atributos
                </h4>
                <div className="text-sm">
                  <span className="text-xs text-gray-450 block">
                    Produto Cadastrado:
                  </span>
                  <strong className="text-gray-800 text-base">
                    {db.items.find((i) => i.id === selectedOrder.itemId)
                      ?.name || `ID Item: ${selectedOrder.itemId}`}
                  </strong>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-100 text-xs font-mono text-gray-600">
                    <div>
                      <span className="text-[10px] text-gray-450 block">
                        Cor:
                      </span>
                      <span>{selectedOrder.color || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-450 block">
                        Tamanho:
                      </span>
                      <span>{selectedOrder.size || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-450 block">
                        Variação:
                      </span>
                      <span>{selectedOrder.variation || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 3: Production Progress Slices */}
              <div className="border border-gray-200 p-4 rounded-lg bg-white space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Acompanhamento de Produção
                </h4>
                <div className="space-y-2.5">
                  {/* Total pieces header */}
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Meta Total do Lote:</span>
                    <span className="text-indigo-700">
                      {selectedOrder.totalQuantity} Peças
                    </span>
                  </div>

                  {/* Progressive phases */}
                  {[
                    {
                      label: "1. Corte Laser",
                      qtyInStage: selectedOrder.cutQuantity || 0,
                      color: "bg-indigo-600",
                    },
                    {
                      label: "2. Produção/Solda",
                      qtyInStage: selectedOrder.producedQuantity || 0,
                      color: "bg-blue-600",
                    },
                    {
                      label: "3. Pintura",
                      qtyInStage: selectedOrder.paintedQuantity || 0,
                      color: "bg-amber-500",
                    },
                    {
                      label: "4. Embalado",
                      qtyInStage: selectedOrder.packedQuantity || 0,
                      color: "bg-green-600",
                    },
                    {
                      label: "5. Faturado/Entregue",
                      qtyInStage: selectedOrder.invoicedQuantity || 0,
                      color: "bg-gray-600",
                    },
                  ].map((phase, idx) => {
                    const pct = Math.min(
                      100,
                      Math.max(
                        0,
                        (phase.qtyInStage / selectedOrder.totalQuantity) * 100,
                      ),
                    );
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-700">
                            {phase.label}
                          </span>
                          <span className="text-gray-500 font-medium">
                            {phase.qtyInStage} / {selectedOrder.totalQuantity}{" "}
                            pçs ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${phase.color} transition-all duration-300`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Box 4: Log Timelines */}
              <div className="border border-gray-200 p-4 rounded-lg bg-white space-y-3">
                <div className="flex items-center gap-1.5">
                  <History size={16} className="text-gray-400" />
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Histórico de Operações (Rastreabilidade)
                  </h4>
                </div>
                {selectedOrderLogs.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-2">
                    Nenhum registro de produção inserido no banco histórico
                    ainda.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-52 overflow-auto pr-1">
                    {selectedOrderLogs.map((log) => {
                      const opName =
                        db.users.find((u) => u.id === log.operatorId)?.name ||
                        log.operatorId;
                      let actionText = "";
                      if (log.type === "CORTE_LASER")
                        actionText = `Cortou ${log.quantityCut || 0} pçs`;
                      if (log.type === "PRODUCAO")
                        actionText = `Processou ${log.quantityProcessed || 0} pçs`;
                      if (log.type === "PINTURA")
                        actionText = `Pintou ${log.quantityPainted || 0} pçs`;
                      if (log.type === "EMBALAGEM")
                        actionText = `Embalou ${log.quantityPacked || 0} pçs`;
                      if (log.type === "FATURAMENTO")
                        actionText = `Faturou/Entregou ${log.quantityInvoiced || 0} pçs`;

                      return (
                        <div
                          key={log.id}
                          className="text-xs border-l-2 border-[#00b14f] pl-3 py-1 space-y-0.5"
                        >
                          <div className="flex justify-between font-semibold text-gray-700">
                            <span>{log.type}</span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-gray-600 font-medium">
                            {actionText} • Operador:{" "}
                            <span className="font-semibold">{opName}</span>
                          </div>
                          {log.durationMillis > 0 && (
                            <div className="text-[10px] text-gray-400">
                              Tempo ativo:{" "}
                              {Math.round(log.durationMillis / 60000)} min (
                              {Math.round(log.durationMillis / 1000)}s)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("print-order", { detail: selectedOrder }),
                  );
                  setSelectedOrder(null);
                }}
                className="bg-[#00b14f] hover:bg-[#009e46] text-white font-extrabold py-1.5 px-3.5 rounded text-xs transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 duration-100"
              >
                <Printer size={13} /> PDF do Pedido
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-zinc-805 hover:bg-zinc-700 text-gray-700 hover:text-white border border-gray-300 font-bold py-1.5 px-4 rounded text-xs transition duration-150 cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- INFO GENERAL POPUP MODAL --- */}
      {infoModalData && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100 text-left animate-in zoom-in-95 duration-150">
            <div className="bg-black text-white p-4 flex justify-between items-center border-b border-[#00b14f]/20">
              <h3 className="font-bold text-base tracking-tight">
                {infoModalData.title}
              </h3>
              <button
                onClick={() => setInfoModalData(null)}
                className="text-gray-400 hover:text-white transition duration-150 text-xl font-bold px-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5">{infoModalData.body}</div>
            <div className="bg-gray-50 p-3 border-t flex justify-end">
              <button
                onClick={() => setInfoModalData(null)}
                className="bg-[#00b14f] hover:bg-[#00913f] text-white font-bold py-1.5 px-4 rounded text-xs transition duration-150 cursor-pointer shadow-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginScreen({
  users,
  tenants,
  onLogin,
  deferredPrompt,
  setDeferredPrompt,
  isStandalone,
  isIOS,
  isInIframe,
  handleInstallClick,
}: {
  users: User[];
  tenants?: import('./types').Tenant[];
  onLogin: (u: User) => void;
  deferredPrompt: any;
  setDeferredPrompt: React.Dispatch<React.SetStateAction<any>>;
  isStandalone: boolean;
  isIOS: boolean;
  isInIframe: boolean;
  handleInstallClick: () => Promise<void>;
}) {
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");

  const [selectedLoginTenantId, setSelectedLoginTenantId] = useState(() => {
    return localStorage.getItem("login_tenant_id") || "imperio";
  });

  const detectedTenant = React.useMemo(() => {
    const typed = (usernameInput || "").trim().toLowerCase();
    const parts = typed.split(".");
    if (parts.length > 1) {
      const suffix = parts[parts.length - 1];
      const found = tenants?.find((t) => t && t.id && (t.id === suffix || t.id.toLowerCase() === suffix));
      if (found) return found;
    }
    return tenants?.find((t) => t && t.id === selectedLoginTenantId) || tenants?.find((t) => t && t.id === "imperio") || { id: "imperio", name: "Império Jomarci", logoUrl: "/icon.png", primaryColor: "#00b14f", systemName: "Apontador de Produção" };
  }, [usernameInput, tenants, selectedLoginTenantId]);

  // Synchronize selected login tenant with typed suffix if detected
  useEffect(() => {
    const typed = (usernameInput || "").trim().toLowerCase();
    const parts = typed.split(".");
    if (parts.length > 1) {
      const suffix = parts[parts.length - 1];
      const found = tenants?.find((t) => t && t.id && (t.id === suffix || t.id.toLowerCase() === suffix));
      if (found && found.id !== selectedLoginTenantId) {
        setSelectedLoginTenantId(found.id);
        localStorage.setItem("login_tenant_id", found.id);
      }
    }
  }, [usernameInput, tenants, selectedLoginTenantId]);

  const handleLogin = () => {
    const typed = (usernameInput || "").trim().toLowerCase();
    if (!typed) {
      alert("Por favor, digite o usuário.");
      return;
    }

    let user;

    // 1. Try finding by exact typed ID
    user = users.find((u) => u && u.id && u.id.toLowerCase() === typed);

    // 2. If not found and there's no suffix, try finding with suffix of selected tenant
    if (!user && !typed.includes(".")) {
      const typedWithSuffix = `${typed}.${selectedLoginTenantId}`;
      user = users.find((u) => u && u.id && u.id.toLowerCase() === typedWithSuffix);
    }

    // 3. Try stripping .imp
    if (!user) {
      const stripped = typed.replace(/\.imp$/i, "");
      user = users.find((u) => u && u.id && u.id.toLowerCase() === stripped);
    }
    
    // 4. Also support checking other company suffixes if they typed a suffix
    if (!user) {
      const parts = typed.split(".");
      if (parts.length > 1) {
        const suffix = parts[parts.length - 1];
        const tenant = tenants?.find(t => t && t.id && (t.id === suffix || t.id.toLowerCase() === suffix));
        if (tenant) {
          const baseUsername = parts.slice(0, -1).join(".");
          user = users.find(u => u && u.id && u.id.toLowerCase() === baseUsername && u.tenantId === tenant.id);
        }
      }
    }

    // 5. If still not found, try searching by username and tenant ID directly
    if (!user) {
      user = users.find(u => u && u.name && u.name.toLowerCase() === typed && u.tenantId === selectedLoginTenantId);
    }

    if (user) {
      const userPass = user.password || "0000";
      const isRaulOverride = user.id === "raul" && password === "230213";
      if (password !== userPass && !isRaulOverride) {
        alert("Senha Incorreta");
        return;
      }
      if (user.id === "raul") {
        user.role = "ADMIN";
        user.tenantId = "global";
      }
      if (
        "Notification" in window &&
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        Notification.requestPermission();
      }
      onLogin({ ...user });
    } else {
      alert("Usuário Incorreto");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 items-center justify-center p-4">
      <div className="bg-black border border-zinc-800 p-8 rounded-xl shadow-2xl w-full max-w-sm flex flex-col items-center">
        <div className="flex flex-col items-center gap-1 mb-8">
          {detectedTenant.logoUrl && detectedTenant.logoUrl !== "/icon.png" && detectedTenant.id !== "imperio" ? (
            <img src={detectedTenant.logoUrl} alt="Logo" className="h-16 object-contain mb-2 max-w-[200px]" />
          ) : (
            <Monitor size={48} className="text-[#00b14f] mb-2" style={{ color: detectedTenant.primaryColor || '#00b14f' }} />
          )}
          <h1 className="text-2xl font-bold tracking-tight text-center text-[#00b14f]" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
            Apontador de Produção
          </h1>
          <span className="text-[0.65rem] text-gray-400 font-medium tracking-[0.1em] text-center uppercase">
            {detectedTenant.name && detectedTenant.id !== "imperio" ? detectedTenant.name : "Acesso ao Sistema"}
          </span>
        </div>

        <input
          type="text"
          placeholder="Usuário (Ex: gerencia)"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          className="border border-zinc-750 p-3 w-full rounded-lg mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:border-transparent bg-zinc-900 text-white placeholder-zinc-500"
          style={{ '--tw-ring-color': detectedTenant.primaryColor || '#00b14f' } as any}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-zinc-750 p-3 w-full rounded-lg mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:border-transparent bg-zinc-900 text-white placeholder-zinc-500"
          style={{ '--tw-ring-color': detectedTenant.primaryColor || '#00b14f' } as any}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <button
          onClick={handleLogin}
          className="w-full text-black font-bold p-3 rounded-lg hover:brightness-110 transition text-lg mt-2 tracking-wide"
          style={{ backgroundColor: detectedTenant.primaryColor || '#00b14f' }}
        >
          Entrar
        </button>
      </div>

      {!isStandalone && (
        <div className="mt-6 w-full max-w-sm bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
            <span className="text-lg">📲</span>
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-zinc-300">
              Instalar Aplicativo (Tela Cheia)
            </h3>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Instale o aplicativo de apontamento de produção para funcionar em{" "}
            <strong>tela inteira sem as barras do navegador</strong> e com o ícone direto no seu celular ou computador.
          </p>

          {isInIframe ? (
            <div className="bg-amber-950/40 p-3 rounded-lg border border-amber-900/40 text-[10px] text-zinc-300 flex flex-col gap-1.5 leading-snug">
              <span className="font-bold uppercase tracking-wide block text-amber-400">
                ⚠️ Executando dentro do Editor
              </span>
              <p>
                Por segurança, o navegador <strong>bloqueia a instalação de aplicativos (PWA)</strong> quando o sistema é visualizado dentro do painel de testes do editor (iframe).
              </p>
              <p>
                Para instalar o sistema como App no seu celular ou computador, por favor, clique no botão abaixo para abrir em uma aba cheia:
              </p>
              <button
                onClick={() => window.open(window.location.href, "_blank")}
                className="w-full flex items-center justify-center gap-1.5 hover:opacity-95 text-black text-xs font-bold py-2 px-3 rounded transition-all cursor-pointer mt-1"
                style={{ backgroundColor: detectedTenant.primaryColor || '#00b14f' }}
              >
                Abrir em Nova Aba ↗
              </button>
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 hover:bg-opacity-90 text-black text-xs font-bold py-2.5 px-3 rounded-lg transition-all cursor-pointer shadow-md"
              style={{ backgroundColor: detectedTenant.primaryColor || '#00b14f' }}
            >
              <span>📥</span> Instalar Aplicativo
            </button>
          ) : isIOS ? (
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/40 text-[10px] text-zinc-400 flex flex-col gap-1.5 leading-snug">
              <span className="font-bold uppercase tracking-wide block" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
                Instruções para iPhone:
              </span>
              <p>
                1. Toque no botão de <strong>Compartilhar</strong> (ícone{" "}
                <span className="text-zinc-200">📤</span> na barra inferior do
                Safari).
              </p>
              <p>
                2. Role a lista e toque em{" "}
                <strong>"Adicionar à Tela de Início"</strong> (ícone{" "}
                <span className="text-zinc-200">➕</span>).
              </p>
              <p>
                3. Toque em "Adicionar" no canto superior direito para confirmar.
              </p>
            </div>
          ) : (
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/40 text-[10px] text-zinc-400 flex flex-col gap-1.5 leading-snug">
              <span className="font-bold uppercase tracking-wide block text-zinc-300">
                Como Instalar no Celular:
              </span>
              <p>
                1. Clique no menu de <strong className="text-zinc-200">três pontinhos</strong> no canto superior do navegador (ou toque no ícone de instalar na barra de endereço).
              </p>
              <p>
                2. Selecione <strong className="text-zinc-200">"Instalar aplicativo"</strong> ou <strong className="text-zinc-200">"Adicionar à tela inicial"</strong>.
              </p>
              <p className="text-[9px] block mt-1" style={{ color: detectedTenant.primaryColor || '#00b14f' }}>
                ✓ O ícone "Apontador" será adicionado à tela do seu dispositivo!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItensScreen({ db }: { db: ReturnType<typeof useDatabase> }) {
  const [activeTab, setActiveTab] = useState<"PRODUTOS" | "PECAS" | "EPIS">(
    "PRODUTOS",
  );
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [productionPoints, setProductionPoints] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null);

  // Components (BOM - Bill of Materials) modal
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [currentBomProduct, setCurrentBomProduct] = useState<
    (typeof db.items)[0] | null
  >(null);
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState<number | "">(
    "",
  );
  const [componentQuantity, setComponentQuantity] = useState<number>(1);

  // Excel Modal State for Items
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState("");
  const [excelImportProgress, setExcelImportProgress] = useState<number>(0);
  const [excelImportResult, setExcelImportResult] = useState<string | null>(
    null,
  );

  // Batch Image Import State
  const [isBatchImageModalOpen, setIsBatchImageModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [batchImageFiles, setBatchImageFiles] = useState<FileList | null>(null);
  const [batchImageProgress, setBatchImageProgress] = useState(0);
  const [batchImageResult, setBatchImageResult] = useState("");
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  React.useEffect(() => {
    const handleEvents = (e: KeyboardEvent) => {
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

  const searchedPecas = db.items
    .filter((it) => it.type === "PECA")
    .filter((it) => {
      return normalizeString(`${it.code} ${it.name}`).includes(
        normalizeString(componentSearch),
      );
    })
    .slice(0, 10);

  const handleImportExcel = async () => {
    if (!excelData.trim()) return;

    setExcelImportResult("Processando...");
    setExcelImportProgress(0);

    const rows = excelData.trim().split("\n");
    let addedCount = 0;
    let updatedCount = 0;

    const firstRowCols = rows[0].split("\t").map((c) => c.trim().toUpperCase());
    let startIdx = 0;

    let idxCode = 0;
    let idxName = 1;
    let idxPrice = 2;
    let idxPoints = 3;

    if (
      firstRowCols.includes("CÓDIGO") ||
      firstRowCols.includes("COD") ||
      firstRowCols.includes("CÓD. ITEM") ||
      firstRowCols.includes("PRODUTO") ||
      firstRowCols.includes("ITEM") ||
      firstRowCols.includes("PEÇA")
    ) {
      startIdx = 1;
      const getCol = (names: string[]) =>
        firstRowCols.findIndex((c) => names.some((n) => c.includes(n)));

      idxCode = getCol(["CÓDIGO", "CÓD", "COD"]);
      idxName = getCol(["PRODUTO", "ITEM", "NOME", "PEÇA"]);
      idxPrice = getCol(["PREÇO", "PRECO", "VALOR"]);
      idxPoints = getCol(["PONTOS", "PONTUAÇÃO", "PONTUACAO"]);
    }

    const updatedItems = [];
    const validationWarnings: string[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      if (i % 25 === 0) {
        setExcelImportProgress(
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

      if (!rCode && !rName) continue;

      const basePriceParsed = parseFloat((rPriceStr || "").replace(",", "."));
      const price = !isNaN(basePriceParsed) ? basePriceParsed : undefined;

      if (rPriceStr && (isNaN(basePriceParsed) || basePriceParsed < 0)) {
        const errorMsg = `Planilha Linha ${i + 1}: Preço base inválido ou malformado ("${rPriceStr}") para o código "${rCode || rName}"`;
        console.warn(errorMsg);
        validationWarnings.push(errorMsg);
      }

      const pointsParsed = parseFloat((rPointsStr || "").replace(",", "."));
      const points = !isNaN(pointsParsed) ? pointsParsed : undefined;

      if (rPointsStr && (isNaN(pointsParsed) || pointsParsed < 0)) {
        const errorMsg = `Planilha Linha ${i + 1}: Pontos de produção inválidos ("${rPointsStr}") para o código "${rCode || rName}"`;
        console.warn(errorMsg);
        validationWarnings.push(errorMsg);
      }

      const existing = db.items.find(
        (it) =>
          (rCode && it.code === rCode) ||
          (rName && it.name.toUpperCase() === rName.toUpperCase()),
      );

      if (existing) {
        updatedItems.push({
          ...existing,
          code: rCode || existing.code,
          name: rName || existing.name,
          basePrice: price !== undefined ? price : existing.basePrice,
          productionPoints:
            points !== undefined ? points : existing.productionPoints,
          type:
            activeTab === "PECAS"
              ? "PECA"
              : activeTab === "EPIS"
                ? "EPI"
                : "PRODUTO",
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
            type:
              activeTab === "PECAS"
                ? "PECA"
                : activeTab === "EPIS"
                  ? "EPI"
                  : "PRODUTO",
          });
          addedCount++;
        }
      }
    }

    setExcelImportProgress(100);

    for (const item of updatedItems) {
      db.updateItem(item);
    }

    const warningText =
      validationWarnings.length > 0
        ? `\n\n⚠️ Alertas de importação:\n${validationWarnings.slice(0, 5).join("\n")}${validationWarnings.length > 5 ? `\n...e mais ${validationWarnings.length - 5} alertas` : ""}`
        : "";

    setExcelImportResult(
      `Concluído! ${addedCount} novos, ${updatedCount} atualizados.${warningText}`,
    );
    setExcelData("");
    setTimeout(() => {
      setIsExcelModalOpen(false);
      setExcelImportResult(null);
    }, 4500);
  };

  const handleBatchImageUploadClick = async () => {
    if (!batchImageFiles || batchImageFiles.length === 0) return;

    setIsUploadingBatch(true);
    setBatchImageProgress(0);
    setBatchImageResult("");

    let successCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < batchImageFiles.length; i++) {
      const file = batchImageFiles[i];

      // Extract product code from filename without extension
      const fileNameWithoutExt =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;

      // Match by exact code or name (case insensitive)
      const matchedItem = db.items.find(
        (it) =>
          it.code.toUpperCase() === fileNameWithoutExt.toUpperCase() ||
          it.name.toUpperCase() === fileNameWithoutExt.toUpperCase(),
      );

      if (matchedItem) {
        try {
          const storageRef = ref(
            storage,
            `products/${Date.now()}_${file.name}`,
          );
          await new Promise((resolve) => {
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTask.on(
              "state_changed",
              null,
              (err) => {
                console.warn(
                  "Storage upload failed in batch, falling back to compressed local Base64 for file: " +
                    file.name,
                  err,
                );
                const reader = new FileReader();
                reader.onloadend = () => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 450;
                    const MAX_HEIGHT = 450;
                    let width = img.width;
                    let height = img.height;
                    if (
                      width > height ? width > MAX_WIDTH : height > MAX_HEIGHT
                    ) {
                      const ratio =
                        width > height
                          ? MAX_WIDTH / width
                          : MAX_HEIGHT / height;
                      width *= ratio;
                      height *= ratio;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      const compressed = canvas.toDataURL("image/jpeg", 0.7);
                      db.updateItem({ ...matchedItem, imageUrl: compressed });
                      successCount++;
                      resolve(null);
                    } else {
                      db.updateItem({
                        ...matchedItem,
                        imageUrl: reader.result as string,
                      });
                      successCount++;
                      resolve(null);
                    }
                  };
                  img.src = reader.result as string;
                };
                reader.onerror = () => {
                  resolve(null); // resolve anyway to avoid block
                };
                reader.readAsDataURL(file);
              },
              async () => {
                try {
                  const downloadURL = await getDownloadURL(
                    uploadTask.snapshot.ref,
                  );
                  db.updateItem({ ...matchedItem, imageUrl: downloadURL });
                  successCount++;
                  resolve(null);
                } catch (err) {
                  console.error(
                    "Download URL failed, using base64 direct fallback",
                    err,
                  );
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    db.updateItem({
                      ...matchedItem,
                      imageUrl: reader.result as string,
                    });
                    successCount++;
                    resolve(null);
                  };
                  reader.readAsDataURL(file);
                }
              },
            );
          });
        } catch (err) {
          console.error("Failed to upload image", file.name, err);
        }
      } else {
        notFoundCount++;
      }

      setBatchImageProgress(
        Math.round(((i + 1) / batchImageFiles.length) * 100),
      );
    }

    setBatchImageResult(
      `Concluído! ${successCount} imagens associadas com sucesso. ${notFoundCount} não encontraram produtos.`,
    );
    setIsUploadingBatch(false);

    setTimeout(() => {
      setIsBatchImageModalOpen(false);
      setBatchImageResult("");
      setBatchImageFiles(null);
    }, 5000);
  };

  const handleCadastrar = () => {
    if (!code) {
      alert("⚠️ Erro de formulário: O campo 'Código' é obrigatório.");
      console.warn("Item save prevented: missing 'code' field.");
      return;
    }
    if (!name) {
      alert("⚠️ Erro de formulário: O campo 'Nome' é obrigatório.");
      console.warn("Item save prevented: missing 'name' field.");
      return;
    }

    // Validate basePrice if specified
    if (basePrice !== "") {
      const parsedPrice = Number(basePrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        alert(
          `⚠️ Preço base inválido: "${basePrice}" não é um preço válido. O valor deve ser um número positivo ou ficar em branco.`,
        );
        console.warn(`Item save prevented: invalid basePrice "${basePrice}".`);
        return;
      }
    }

    // Validate productionPoints if specified
    if (productionPoints !== "") {
      const parsedPoints = Number(productionPoints);
      if (isNaN(parsedPoints) || parsedPoints < 0) {
        alert(
          `⚠️ Pontos de produção inválidos: "${productionPoints}" não é válido. O valor deve ser maior ou igual a zero ou ficar em branco.`,
        );
        console.warn(
          `Item save prevented: invalid productionPoints "${productionPoints}".`,
        );
        return;
      }
    }

    const itemType =
      activeTab === "PECAS" ? "PECA" : activeTab === "EPIS" ? "EPI" : "PRODUTO";

    if (editingId) {
      const existing = db.items.find((i) => i.id === editingId);
      if (existing) {
        db.updateItem({
          ...existing,
          code,
          name,
          basePrice: basePrice === "" ? undefined : basePrice,
          productionPoints:
            productionPoints === "" ? undefined : productionPoints,
          type: itemType,
          imageUrl: imageUrl || existing.imageUrl || "",
        });
      }
      setEditingId(null);
    } else {
      db.addItem({
        code,
        name,
        notes: "",
        basePrice: basePrice === "" ? undefined : basePrice,
        productionPoints:
          productionPoints === "" ? undefined : productionPoints,
        type: itemType,
        imageUrl: imageUrl || "",
      });
    }
    setCode("");
    setName("");
    setBasePrice("");
    setProductionPoints("");
    setImageUrl("");
  };

  const handleEdit = (it: (typeof db.items)[0]) => {
    setEditingId(it.id);
    setCode(it.code);
    setName(it.name);
    setBasePrice(it.basePrice !== undefined ? it.basePrice : "");
    setProductionPoints(
      it.productionPoints !== undefined ? it.productionPoints : "",
    );
    setImageUrl(it.imageUrl || "");
    setActiveTab(
      it.type === "PECA" ? "PECAS" : it.type === "EPI" ? "EPIS" : "PRODUTOS",
    );
    setIsFormCollapsed(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setIsUploadingImage(true);
    setImageUploadProgress(50);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // Updated typical size
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setImageUrl(compressedBase64);
        } else {
          setImageUrl((event.target?.result as string) || "");
        }
        setIsUploadingImage(false);
        setImageUploadProgress(100);
      };
      img.onerror = () => {
        setIsUploadingImage(false);
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir?")) {
      db.deleteItem(id);
    }
  };

  const openBom = (prod: (typeof db.items)[0]) => {
    setCurrentBomProduct(prod);
    setIsBomModalOpen(true);
    setComponentQuantity(1);
    setSelectedComponentId("");
    setComponentSearch("");
  };

  const handleAddComponent = () => {
    if (
      !currentBomProduct ||
      selectedComponentId === "" ||
      componentQuantity <= 0
    )
      return;
    const comps = currentBomProduct.components || [];
    const updated = {
      ...currentBomProduct,
      components: [
        ...comps,
        { itemId: selectedComponentId as number, quantity: componentQuantity },
      ],
    };
    db.updateItem(updated);
    setCurrentBomProduct(updated);
    setSelectedComponentId("");
  };

  const handleRemoveComponent = (idx: number) => {
    if (!currentBomProduct) return;
    const comps = [...(currentBomProduct.components || [])];
    comps.splice(idx, 1);
    const updated = { ...currentBomProduct, components: comps };
    db.updateItem(updated);
    setCurrentBomProduct(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-gray-800">Itens</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="bg-[#107c41] hover:bg-[#185c37] text-white text-xs font-bold py-1 px-3 rounded shadow transition w-fit"
            >
              Importar do Excel (com preços)
            </button>
            <button
              onClick={() => setIsBatchImageModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1 px-3 rounded shadow transition w-fit"
            >
              Importar Lote Imagens
            </button>
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded shadow transition w-fit flex items-center gap-1"
            >
              <FileText size={14} /> Importar Catálogo PDF
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:border-blue-500 w-48"
          />
        </div>
      </div>

      <div className="flex bg-white rounded-lg shadow-sm border p-1 mb-4">
        <button
          onClick={() => setActiveTab("PRODUTOS")}
          className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${activeTab === "PRODUTOS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Produtos
        </button>
        <button
          onClick={() => setActiveTab("PECAS")}
          className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${activeTab === "PECAS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          Peças
        </button>
        <button
          onClick={() => setActiveTab("EPIS")}
          className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${activeTab === "EPIS" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          EPIs
        </button>
      </div>

      {/* Modal Importar */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Importação de{" "}
                {activeTab === "PECAS"
                  ? "Peças"
                  : activeTab === "EPIS"
                    ? "EPIs"
                    : "Produtos"}{" "}
                via Excel
              </h3>
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Cole os dados diretamente do Excel. Colunas esperadas:
              <br />
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs text-blue-800">
                Código | Nome | Preço (opcional) | Pontuação (opcional)
              </span>
            </p>

            <textarea
              className="w-full border border-gray-300 rounded p-2 text-xs font-mono mb-2 flex-1 overflow-auto bg-gray-50 focus:bg-white transition-colors whitespace-pre"
              rows={12}
              placeholder="Cole (Ctrl+V) as colunas do Excel/Google Sheets aqui..."
              value={excelData}
              onChange={(e) => setExcelData(e.target.value)}
            />

            {excelImportResult && (
              <div
                className={`mt-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${excelImportResult.includes("Processando") ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`}
              >
                <div className="flex justify-between items-center">
                  <span>{excelImportResult}</span>
                  {excelImportResult.includes("Processando") && (
                    <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                      {excelImportProgress}%
                    </span>
                  )}
                </div>
                {excelImportResult.includes("Processando") && (
                  <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${excelImportProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 shrink-0">
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportExcel}
                disabled={!excelData.trim() || !!excelImportResult}
                className="bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50"
              >
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog PDF Import Modal */}
      <CatalogImportModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        db={db}
      />

      {/* Modal Lote Imagens */}
      {isBatchImageModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Importação em Lote de Imagens
              </h3>
              <button
                onClick={() => setIsBatchImageModalOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Selecione as imagens correspondentes aos produtos. O sistema usará
              o nome do arquivo (ex:{" "}
              <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">
                SAP-GIR-01.jpg
              </span>
              ) para buscar o código ou nome do produto automaticamente.
            </p>

            <div className="flex-1 overflow-auto p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 mb-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setBatchImageFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                disabled={isUploadingBatch}
              />
              {batchImageFiles && batchImageFiles.length > 0 && (
                <p className="mt-4 font-semibold text-gray-700 shrink-0">
                  {batchImageFiles.length} arquivo(s) selecionado(s).
                </p>
              )}
            </div>

            {batchImageResult && (
              <div
                className={`mt-2 mb-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${isUploadingBatch ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`}
              >
                <div className="flex justify-between items-center">
                  <span>{batchImageResult || "Processando..."}</span>
                  {isUploadingBatch && (
                    <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                      {batchImageProgress}%
                    </span>
                  )}
                </div>
                {isUploadingBatch && (
                  <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${batchImageProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsBatchImageModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchImageUploadClick}
                disabled={!batchImageFiles || isUploadingBatch}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50"
              >
                Iniciar Upload
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
        <button
          onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 border-b hover:bg-gray-100/80 transition text-left cursor-pointer"
        >
          <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
            <span>
              {editingId
                ? `Editando Item: ${code || ""}`
                : `Cadastrar Novo(a) ${activeTab === "PECAS" ? "Peça" : activeTab === "EPIS" ? "EPI" : "Produto"}`}
            </span>
            {editingId && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                Modo Edição
              </span>
            )}
          </span>
          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-xs">
              {isFormCollapsed ? "Expandir" : "Minimizar"}
            </span>
            {isFormCollapsed ? (
              <ChevronDown size={18} />
            ) : (
              <ChevronUp size={18} />
            )}
          </div>
        </button>

        {!isFormCollapsed && (
          <div className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código"
                className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome"
                className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 font-semibold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => {
                    const newPrice = e.target.value
                      ? parseFloat(e.target.value)
                      : "";
                    setBasePrice(newPrice);
                    if (newPrice !== "" && !isNaN(newPrice as number)) {
                      setProductionPoints(
                        Number(((newPrice as number) / 500).toFixed(5)),
                      );
                    } else {
                      setProductionPoints("");
                    }
                  }}
                  placeholder="Preço (Opcional)"
                  className="border border-gray-300 p-2 pl-9 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-xs font-semibold">
                  Pts
                </span>
                <input
                  type="number"
                  step="0.00001"
                  value={productionPoints}
                  onChange={(e) =>
                    setProductionPoints(
                      e.target.value ? parseFloat(e.target.value) : "",
                    )
                  }
                  placeholder="Pontuação (Opcional)"
                  className="border border-gray-300 p-2 pl-10 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-1 bg-gray-50 p-2.5 rounded border border-gray-100">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Produto"
                  className="w-16 h-16 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:opacity-80 transition"
                  onClick={() => setFullSizeImage(imageUrl)}
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded border border-gray-200 text-gray-400">
                  <Package size={24} />
                </div>
              )}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Imagem do Produto (Opcional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  disabled={isUploadingImage}
                />
                {isUploadingImage && (
                  <div className="text-xs text-blue-600 mt-1 font-semibold">
                    Fazendo upload... {imageUploadProgress}%
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCadastrar}
                className="flex-1 bg-blue-600 text-white font-bold p-2 rounded hover:bg-blue-700 transition shadow-sm text-sm"
              >
                {editingId ? "Salvar Alterações" : "Adicionar Item"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setCode("");
                    setName("");
                    setBasePrice("");
                    setProductionPoints("");
                    setImageUrl("");
                  }}
                  className="bg-gray-200 text-gray-700 font-bold p-2 rounded hover:bg-gray-300 transition text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto w-full">
        {filteredItems.length === 0 ? (
          <p className="text-gray-500 text-center mt-4">
            Nenhum item encontrado.
          </p>
        ) : (
          filteredItems.map((it) => (
            <div
              key={it.id}
              className="bg-white p-3 border-b border-gray-100 flex justify-between items-center rounded mb-2 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt={it.name}
                    className="w-10 h-10 object-cover rounded shadow-sm border border-gray-200 cursor-pointer hover:opacity-80 transition"
                    onClick={() => setFullSizeImage(it.imageUrl || null)}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded border border-gray-200 text-gray-400">
                    <Package size={20} />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-gray-800">{it.code}</span>
                  <span className="text-gray-600 text-sm">{it.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col text-right text-xs text-gray-500">
                  {it.basePrice !== undefined ? (
                    <span>R$ {it.basePrice.toFixed(2)}</span>
                  ) : (
                    <span>-</span>
                  )}
                  {it.productionPoints !== undefined ? (
                    <span>{Number(it.productionPoints).toFixed(5)} pts</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                  {activeTab === "PRODUTOS" && (
                    <button
                      onClick={() => openBom(it)}
                      className="text-purple-600 hover:text-purple-800 p-1 text-xs font-bold border border-purple-200 rounded px-2"
                      title="Composição (BOM)"
                    >
                      Composição
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(it)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Editar"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(it.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* BOM Modal */}
      {isBomModalOpen && currentBomProduct && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Composição: {currentBomProduct.name}
              </h3>
              <button
                onClick={() => setIsBomModalOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">
                Adicionar Peça:
              </h4>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Pesquisar peça..."
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  className="border w-full p-2 text-sm rounded"
                />
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={selectedComponentId}
                  onChange={(e) =>
                    setSelectedComponentId(
                      e.target.value ? parseInt(e.target.value) : "",
                    )
                  }
                  className="border p-2 rounded flex-1 text-sm bg-white"
                >
                  <option value="">Selecione uma peça</option>
                  {searchedPecas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
                <span className="text-sm">Qtd:</span>
                <input
                  type="number"
                  value={componentQuantity}
                  onChange={(e) =>
                    setComponentQuantity(parseInt(e.target.value) || 0)
                  }
                  className="border p-2 rounded w-16 text-sm"
                  min="1"
                />
                <button
                  onClick={handleAddComponent}
                  className="bg-blue-600 text-white font-bold p-2 text-sm rounded hover:bg-blue-700"
                  disabled={!selectedComponentId || componentQuantity <= 0}
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h4 className="font-semibold text-gray-700 text-sm mb-2 border-b pb-1">
                Peças Inclusas:
              </h4>
              {!currentBomProduct.components ||
              currentBomProduct.components.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Nenhuma peça cadastrada para este produto.
                </p>
              ) : (
                currentBomProduct.components.map((comp, idx) => {
                  const cItem = db.items.find((i) => i.id === comp.itemId);
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-none"
                    >
                      <div className="text-sm">
                        <span className="font-bold">{comp.quantity}x</span>{" "}
                        {cItem
                          ? `${cItem.code} - ${cItem.name}`
                          : "Peça Excluída"}
                      </div>
                      <button
                        onClick={() => handleRemoveComponent(idx)}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t text-right">
              <button
                onClick={() => setIsBomModalOpen(false)}
                className="bg-gray-200 px-4 py-2 rounded text-gray-700 font-bold hover:bg-gray-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {fullSizeImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setFullSizeImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setFullSizeImage(null)}
              className="absolute -top-10 right-0 text-white font-bold text-xl hover:text-gray-300 transition"
            >
              Fechar &times;
            </button>
            <img
              src={fullSizeImage}
              alt="Ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PedidosScreen({
  db,
  currentUser,
  defaultViewMode,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
  defaultViewMode?: "ITENS" | "STATUS_PEDIDOS";
}) {
  const [viewMode, setViewMode] = useState<"ITENS" | "STATUS_PEDIDOS">(
    defaultViewMode || "ITENS",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Deduplication system states
  const [isDeduplicateModalOpen, setIsDeduplicateModalOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  useEffect(() => {
    if (defaultViewMode) {
      setViewMode(defaultViewMode);
    }
  }, [defaultViewMode]);

  // Status Screen Mode States
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [filterDeadlines, setFilterDeadlines] = useState<string[]>([
    "NO_PRAZO",
    "RISCO",
    "ATRASADO",
    "SEM_PRAZO",
    "FATURADO",
    "FATURADO_PARCIAL",
  ]);
  const [filterBatchState, setFilterBatchState] = useState<
    "TODOS" | "COM_LOTE" | "SEM_LOTE" | number
  >("TODOS");
  const [filterNotInvoicedOnly, setFilterNotInvoicedOnly] = useState(false);
  const [deliveryDateStart, setDeliveryDateStart] = useState<string>("");
  const [deliveryDateEnd, setDeliveryDateEnd] = useState<string>("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState<boolean>(false);

  const getDeliveryStatus = React.useCallback((o: any) => {
    if (o.status === "FATURADO") return "Faturado";
    if (!o.deliveryDate) return "Sem Prazo";

    const delivery = new Date(o.deliveryDate);
    delivery.setUTCHours(12, 0, 0, 0);
    const deliveryMs = delivery.getTime();

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayMs = today.getTime();

    const diffTime = deliveryMs - todayMs;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Atrasado";
    if (diffDays >= 0 && diffDays <= 2) return "Com risco de atraso";
    return "No prazo";
  }, []);

  const getStatusColor = React.useCallback((status: string | undefined) => {
    switch (status) {
      case "PENDENTE":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "EM_PRODUCAO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PRODUZIDO":
        return "bg-yellow-100 text-yellow-850 border-yellow-200";
      case "EM_CORTE":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "CORTADO":
        return "bg-cyan-150 text-cyan-850 border-cyan-300";
      case "EM_PINTURA":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "PINTADO":
        return "bg-indigo-100 text-indigo-805 border-indigo-200";
      case "EMBALANDO":
        return "bg-orange-100 text-orange-850 border-orange-200";
      case "EMBALADO":
        return "bg-green-100 text-green-800 border-green-200";
      case "FATURADO_PARCIAL":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "FATURADO":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const handleStatusChange = React.useCallback((orderId: number, newStatus: any) => {
    setIsUpdating(orderId);

    setTimeout(() => {
      const orders = [...db.orders];
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        const order = orders[idx];
        const remainingToInvoice =
          order.totalQuantity - (order.invoicedQuantity || 0);

        if (
          newStatus === "FATURADO" &&
          order.status !== "FATURADO" &&
          remainingToInvoice > 0
        ) {
          const stockId = `${order.itemId}|${order.color}|${order.size}|${order.variation}|ACABADO`;
          const currentStock = db.stocks.find((s) => s.id === stockId);

          if (currentStock) {
            const newStock = {
              ...currentStock,
              quantity: Math.max(0, currentStock.quantity - remainingToInvoice),
              reservedQuantity: Math.max(
                0,
                (currentStock.reservedQuantity || 0) - remainingToInvoice,
              ),
            };
            db.updateStocks([newStock]);

            db.addStockMovement?.({
              itemId: order.itemId,
              color: order.color,
              size: order.size,
              variation: order.variation,
              quantity: remainingToInvoice,
              type: "SAIDA",
              description: `Faturamento Pedido #${order.orderCode || order.id}`,
            });
          }
        }

        orders[idx] = {
          ...order,
          status: newStatus,
          packedQuantity:
            newStatus === "EMBALADO" || newStatus === "FATURADO"
              ? order.totalQuantity
              : order.packedQuantity,
          invoicedQuantity:
            newStatus === "FATURADO"
              ? order.totalQuantity
              : order.invoicedQuantity || 0,
          isActive: newStatus !== "FATURADO",
          isUrgent: newStatus === "FATURADO" ? false : order.isUrgent,
        };
        db.updateOrders([orders[idx]]);
      }
      setIsUpdating(null);
    }, 400);
  }, [db.orders, db.stocks, db.addStockMovement, db.updateStocks, db.updateOrders]);

  const groupedOrders = React.useMemo(() => {
    const map = new Map<string, typeof db.orders>();
    const term = debouncedSearchTerm.trim().toLowerCase();

    const filtered = db.orders.filter((o) => {
      if (currentUser?.role === "PROJETISTA" && !o.isThirdPartyLaser) {
        return false;
      }

      // Check text filter match
      const customerObj = db.customers.find(
        (c) => c.name === o.customerName || c.tradeName === o.customerName,
      );
      const itemObj = db.items.find((i) => i.id === o.itemId);

      const searchTarget =
        `${o.orderCode} ${o.customerName} ${customerObj?.tradeName || ""} ${itemObj?.name || ""} ${itemObj?.code || ""}`.toLowerCase();

      const textMatch = searchTarget.includes(term);
      if (!textMatch) return false;

      // Multi-select status and delivery filters
      if (filterBatchState !== "TODOS") {
        const isLinkedToAnyBatch = db.productionBatches.some((b) =>
          b.orderIds.includes(o.id),
        );
        if (filterBatchState === "COM_LOTE" && !isLinkedToAnyBatch)
          return false;
        if (filterBatchState === "SEM_LOTE" && isLinkedToAnyBatch) return false;

        if (typeof filterBatchState === "number") {
          const isLinkedToSpecific = db.productionBatches
            .find((b) => b.id === filterBatchState)
            ?.orderIds.includes(o.id);
          if (!isLinkedToSpecific) return false;
        }
      }

      if (filterNotInvoicedOnly && o.status === "FATURADO") {
        return false;
      }

      if (deliveryDateStart || deliveryDateEnd) {
        if (!o.deliveryDate) return false;
        const itemDate = o.deliveryDate.split("T")[0];
        
        if (deliveryDateStart && itemDate < deliveryDateStart) {
          return false;
        }
        if (deliveryDateEnd && itemDate > deliveryDateEnd) {
          return false;
        }
      }

      const deliveryStatus = getDeliveryStatus(o);
      const isFaturadoParcial = o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity);
      const isFaturado = o.status === "FATURADO" || (o.invoicedQuantity || 0) >= o.totalQuantity;

      let dKey = "";
      if (isFaturado) dKey = "FATURADO";
      else if (isFaturadoParcial) dKey = "FATURADO_PARCIAL";
      else if (deliveryStatus === "No prazo") dKey = "NO_PRAZO";
      else if (deliveryStatus === "Com risco de atraso") dKey = "RISCO";
      else if (deliveryStatus === "Atrasado") dKey = "ATRASADO";
      else if (deliveryStatus === "Sem Prazo") dKey = "SEM_PRAZO";

      if (!filterDeadlines.includes(dKey)) {
        return false;
      }

      return true;
    });

    filtered.forEach((o) => {
      if (!map.has(o.orderCode)) map.set(o.orderCode, []);
      map.get(o.orderCode)!.push(o);
    });

    return Array.from(map.entries()).sort(
      (a, b) => b[1][0].createdAt - a[1][0].createdAt,
    );
  }, [
    db.orders,
    debouncedSearchTerm,
    filterDeadlines,
    filterBatchState,
    filterNotInvoicedOnly,
    deliveryDateStart,
    deliveryDateEnd,
    currentUser,
    db.productionBatches,
  ]);

  const getDuplicatesDiagnostic = React.useCallback(() => {
    const ordersByCode: Record<string, typeof db.orders> = {};
    db.orders.forEach((o) => {
      if (!o.isActive) return;
      const code = (o.orderCode || "").trim().toUpperCase();
      if (!code) return;
      if (!ordersByCode[code]) {
        ordersByCode[code] = [];
      }
      ordersByCode[code].push(o);
    });

    const duplicatesFound: {
      orderCode: string;
      itemCode: string;
      itemName: string;
      color: string;
      size: string;
      variation: string;
      quantity: number;
      records: typeof db.orders;
      toKeep: (typeof db.orders)[0];
      toDelete: typeof db.orders;
    }[] = [];

    let totalSavings = 0;

    Object.entries(ordersByCode).forEach(([orderCode, group]) => {
      const itemGroups: Record<string, typeof db.orders> = {};
      group.forEach((o) => {
        const key = `${o.itemId}|${(o.color || "-").trim().toUpperCase()}|${(o.size || "-").trim().toUpperCase()}|${(o.variation || "-").trim().toUpperCase()}|${o.totalQuantity}`;
        if (!itemGroups[key]) {
          itemGroups[key] = [];
        }
        itemGroups[key].push(o);
      });

      Object.entries(itemGroups).forEach(([key, itemsList]) => {
        if (itemsList.length > 1) {
          const getProgressScore = (o: (typeof db.orders)[0]) => {
            return (
              (o.packedQuantity || 0) +
              (o.invoicedQuantity || 0) +
              (o.producedQuantity || 0) +
              (o.paintedQuantity || 0) +
              (o.cutQuantity || 0)
            );
          };

          const sorted = [...itemsList].sort((a, b) => {
            const scoreA = getProgressScore(a);
            const scoreB = getProgressScore(b);
            if (scoreB !== scoreA) {
              return scoreB - scoreA;
            }
            return a.id - b.id; // oldest first
          });

          const toKeep = sorted[0];
          const toDelete = sorted.slice(1);

          const itemObj = db.items.find((it) => it.id === toKeep.itemId);

          duplicatesFound.push({
            orderCode,
            itemCode: itemObj?.code || "COD-ERRO",
            itemName: itemObj?.name || "Produto Desconhecido",
            color: toKeep.color,
            size: toKeep.size,
            variation: toKeep.variation,
            quantity: toKeep.totalQuantity,
            records: itemsList,
            toKeep,
            toDelete,
          });

          totalSavings += toDelete.length;
        }
      });
    });

    return {
      duplicates: duplicatesFound,
      totalDuplicatesCount: totalSavings,
      affectedOrdersCount: new Set(duplicatesFound.map((d) => d.orderCode))
        .size,
    };
  }, [db.orders, db.items]);

  const handleExecuteDeduplication = React.useCallback(async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    try {
      const diagnostic = getDuplicatesDiagnostic();
      const idsToDelete: number[] = [];
      diagnostic.duplicates.forEach((dup) => {
        dup.toDelete.forEach((td) => {
          idsToDelete.push(td.id);
        });
      });

      if (idsToDelete.length === 0) {
        setCleanupResult("Nenhuma duplicidade detectada no sistema.");
        setIsCleaningUp(false);
        return;
      }

      for (const id of idsToDelete) {
        await db.deleteOrder(id);
      }

      setCleanupResult(
        `Sucesso: ${idsToDelete.length} registros de itens duplicados foram eliminados e a integridade dos pedidos foi estabelecida.`,
      );
    } catch (err: any) {
      setCleanupResult(`Erro ao executar a limpeza: ${err.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  }, [getDuplicatesDiagnostic, db.deleteOrder]);

  const [orderCode, setOrderCode] = useState("");
  const [itemId, setItemId] = useState<number | "">("");
  const [orderItemSearch, setOrderItemSearch] = useState("");
  const [customerName, setCustomerName] = useState("");

  const clientBoughtStatsMap = React.useMemo(() => {
    const stats: Record<number, number> = {};
    if (!customerName || !customerName.trim()) return stats;
    const clientOrders = db.orders.filter(
      (o) =>
        o.customerName.toLowerCase().trim() ===
        customerName.toLowerCase().trim(),
    );
    clientOrders.forEach((o) => {
      stats[o.itemId] = (stats[o.itemId] || 0) + (o.totalQuantity || 1);
    });
    return stats;
  }, [customerName, db.orders]);

  const clientMostBoughtItems = React.useMemo(() => {
    const itemIds = Object.keys(clientBoughtStatsMap).map(Number);
    if (itemIds.length === 0) return [];

    const sortedItemIds = itemIds.sort(
      (a, b) => clientBoughtStatsMap[b] - clientBoughtStatsMap[a],
    );
    return sortedItemIds
      .map((id) => db.items.find((it) => it.id === id))
      .filter((it): it is NonNullable<typeof it> => !!it);
  }, [clientBoughtStatsMap, db.items]);

  const suggestedOrderItems = React.useMemo(() => {
    const query = orderItemSearch.trim().toLowerCase();

    // If no text typed yet, suggest the client's most bought items first!
    if (!query) {
      if (clientMostBoughtItems.length > 0) {
        return clientMostBoughtItems.slice(0, 10);
      }
      return db.items.slice(0, 5);
    }

    // Normalizing text helper to ignore accents
    const normalize = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normQuery = normalize(query);

    // Filter and score similarity for all items
    const scored = db.items.map((it) => {
      const normName = normalize(`${it.code} - ${it.name}`);
      // Check for exact substring matches first (score infinite/highest)
      let score = 0;
      if (normName.includes(normQuery)) {
        score = 1000;
      } else {
        // Calculate word overlap
        const queryWords = normQuery.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
        const itemWords = normName.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
        
        let matchCount = 0;
        for (const qWord of queryWords) {
          if (itemWords.some(iWord => iWord.includes(qWord) || qWord.includes(iWord))) {
            matchCount++;
          }
        }
        score = matchCount;
      }
      return { item: it, score };
    });

    // Filter items with score > 0
    const matches = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);

    // Sort matches: put items in clientMostBoughtItems first if score is same
    const clientBoughtIds = new Set(clientMostBoughtItems.map((i) => i.id));
    matches.sort((a, b) => {
      const aBought = clientBoughtIds.has(a.id) ? 1 : 0;
      const bBought = clientBoughtIds.has(b.id) ? 1 : 0;
      return bBought - aBought; // 1 (true) sorted before 0 (false)
    });

    return matches.slice(0, 10);
  }, [orderItemSearch, db.items, clientMostBoughtItems]);

  const [customerSelected, setCustomerSelected] = useState(false);
  const [representativeName, setRepresentativeName] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [variation, setVariation] = useState("");
  const [totalQuantity, setTotalQuantity] = useState<number | "">("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paymentCondition, setPaymentCondition] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [customPaymentCondition, setCustomPaymentCondition] = useState("");
  const [paymentType, setPaymentType] = useState<
    "pix" | "boleto" | "deposito" | "carteira" | "outro"
  >("boleto");
  const [billingRule, setBillingRule] = useState<"cadastro" | "ultimo_pedido">(
    "cadastro",
  );

  const selectedItemObj = React.useMemo(() => {
    return db.items.find((i) => i.id === itemId);
  }, [itemId, db.items]);

  const lastPrices = React.useMemo(() => {
    if (!customerName || !itemId) return [];
    return db.orders
      .filter(
        (o) =>
          o.customerName === customerName &&
          o.itemId === itemId &&
          o.unitPrice !== undefined,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 2)
      .map((o) => o.unitPrice as number);
  }, [customerName, itemId, db.orders]);

  const lastOrderForClient = React.useMemo(() => {
    if (!customerName.trim()) return null;
    const matches = db.orders.filter(
      (o) => o.customerName.toLowerCase() === customerName.trim().toLowerCase(),
    );
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [customerName, db.orders]);

  React.useEffect(() => {
    if (billingRule === "ultimo_pedido" && lastOrderForClient) {
      const cond = lastOrderForClient.paymentCondition || "";
      if (
        ["PIX", "BOLETO", "DEPÓSITO", "CARTEIRA"].includes(cond.toUpperCase())
      ) {
        const typeMap: Record<
          string,
          "pix" | "boleto" | "deposito" | "carteira"
        > = {
          PIX: "pix",
          BOLETO: "boleto",
          DEPÓSITO: "deposito",
          CARTEIRA: "carteira",
        };
        setPaymentType(typeMap[cond.toUpperCase()]);
        setCustomPaymentCondition("");
      } else {
        setPaymentType("outro");
        setCustomPaymentCondition(cond);
      }
      setPaymentTerms(lastOrderForClient.paymentTerms || "");
    } else if (billingRule === "cadastro") {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
      setPaymentTerms("");
    }
  }, [billingRule, lastOrderForClient]);

  const [isUrgent, setIsUrgent] = useState(false);
  const [isProgramacao, setIsProgramacao] = useState(false);
  const [filterLaserOnly, setFilterLaserOnly] = useState(false);

  React.useEffect(() => {
    if (
      currentUser?.id === "projetista_marcos" ||
      currentUser?.role === "PROJETISTA" ||
      currentUser?.name?.toLowerCase()?.includes("marcos")
    ) {
      setFilterLaserOnly(true);
    }
  }, [currentUser]);
  const [isThirdPartyLaser, setIsThirdPartyLaser] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<
    (typeof db.orders)[0] | null
  >(null);
  const [invoiceModalData, setInvoiceModalData] = useState<{
    order: (typeof db.orders)[0];
    limit: number;
  } | null>(null);
  const [invoiceInput, setInvoiceInput] = useState("");

  const [faturamentoWhatsAppShareData, setFaturamentoWhatsAppShareData] =
    useState<{
      orderCode: string;
      customerName: string;
      productDescription: string;
      quantity: number;
      phone: string;
      representativeName: string;
      customerEmail?: string;
      representativeEmail?: string;
      totalValue?: number;
      deliveryDate?: string;
    } | null>(null);
  const [selectedBatchInvoiceIds, setSelectedBatchInvoiceIds] = useState<
    number[]
  >([]);

  const [recipientEmailInput, setRecipientEmailInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (faturamentoWhatsAppShareData) {
      const emails = [
        faturamentoWhatsAppShareData.customerEmail,
        faturamentoWhatsAppShareData.representativeEmail,
      ]
        .filter((e) => e && e.trim() !== "")
        .join(", ");
      setRecipientEmailInput(emails);
      setEmailDeliveryStatus(null);
    }
  }, [faturamentoWhatsAppShareData]);

  const batchTotalQty = React.useMemo(() => {
    return selectedBatchInvoiceIds.reduce((sum, id) => {
      const o = db.orders.find((ord) => ord.id === id);
      return sum + (o ? o.totalQuantity || 0 : 0);
    }, 0);
  }, [selectedBatchInvoiceIds, db.orders]);

  const [lineItems, setLineItems] = useState<
    {
      itemId: number;
      color: string;
      size: string;
      variation: string;
      totalQuantity: number;
      isThirdPartyLaser: boolean;
      isUrgent: boolean;
      isProgramacao: boolean;
      unitPrice?: number;
    }[]
  >([]);

  const [activeSubTab, setActiveSubTab] = useState<
    "ABERTOS" | "APROVACAO" | "FATURADOS"
  >("ABERTOS");

  const [isStatusBarOpen, setIsStatusBarOpen] = useState(false);

  const piecesByStatus = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const activeOrders = db.orders.filter(
      (o) =>
        o.status !== "FATURADO" &&
        o.status !== "AGUARDANDO_APROVACAO" &&
        o.isActive,
    );

    activeOrders.forEach((o) => {
      const statusStr = o.status || "PENDENTE";
      const pendingQty = Math.max(
        0,
        o.totalQuantity - (o.invoicedQuantity || 0),
      );
      if (pendingQty > 0) {
        counts[statusStr] = (counts[statusStr] || 0) + pendingQty;
      }
    });

    const labelMap: Record<string, string> = {
      PENDENTE: "Pendentes",
      TEM_ESTOQUE: "Tem Estoque",
      EM_PRODUCAO: "Em Produção",
      PRODUZIDO: "Produzidos",
      EM_CORTE: "Em Corte",
      CORTADO: "Cortados",
      EM_PINTURA: "Em Pintura",
      PINTADO: "Pintados",
      EMBALANDO: "Embalando",
      EMBALADO: "Embalados",
      PLANEJADO: "Planejados",
    };

    return Object.entries(counts)
      .map(([status, qty]) => ({
        status,
        label: labelMap[status] || status,
        qty,
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [db.orders]);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelData, setExcelData] = useState("");
  const [excelImportProgress, setExcelImportProgress] = useState<number>(0);
  const [excelImportResult, setExcelImportResult] = useState<string | null>(
    null,
  );

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingFiles, setBillingFiles] = useState<File[]>([]);
  const [billingProgress, setBillingProgress] = useState(0);
  const [billingResult, setBillingResult] = useState<string | null>(null);
  const [billedItems, setBilledItems] = useState<any[]>([]);
  const billingInputRef = React.useRef<HTMLInputElement>(null);
  const [pdfImportProgress, setPdfImportProgress] = useState<number>(0);
  const [pdfImportResult, setPdfImportResult] = useState<string | null>(null);
  const [pdfExtractedOrders, setPdfExtractedOrders] = useState<any[]>([]);
  const [expandedOrderIdx, setExpandedOrderIdx] = useState<
    string | number | null
  >(0);
  const [editingOrderIdx, setEditingOrderIdx] = useState<
    string | number | null
  >(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdateExtractedOrder = (
    idx: number,
    field: string,
    value: any,
  ) => {
    setPdfExtractedOrders((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "status") {
        if (value === "FATURADO") {
          updated[idx].statusValidation = "APTO";
          updated[idx].validationMessage =
            "Liberado para subir como Faturado no sistema.";
        }
      }
      return updated;
    });
  };

  const handleUpdateExtractedOrderItem = (
    orderIdx: number,
    itemIdx: number,
    field: string,
    value: any,
  ) => {
    setPdfExtractedOrders((prev) => {
      const updated = [...prev];
      const updatedItems = [...updated[orderIdx].items];
      updatedItems[itemIdx] = { ...updatedItems[itemIdx], [field]: value };

      if (field === "quantity" || field === "unitPrice") {
        const q =
          field === "quantity"
            ? Number(value) || 0
            : Number(updatedItems[itemIdx].quantity) || 0;
        const p =
          field === "unitPrice"
            ? Number(value) || 0
            : Number(updatedItems[itemIdx].unitPrice) || 0;
        updatedItems[itemIdx].totalPrice = q * p;
      }

      updated[orderIdx] = {
        ...updated[orderIdx],
        items: updatedItems,
        totalValue: updatedItems.reduce(
          (sum: number, it: any) =>
            sum +
            (Number(it.totalPrice) ||
              (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)),
          0,
        ),
        totalGrossValue: updatedItems.reduce(
          (sum: number, it: any) =>
            sum +
            (Number(it.totalPrice) ||
              (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0)),
          0,
        ),
      };
      return updated;
    });
  };

  React.useEffect(() => {
    const handleEvents = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPdfModalOpen(false);
        setIsExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEvents);
    return () => window.removeEventListener("keydown", handleEvents);
  }, []);

  const handleExtractBilling = async () => {
    if (billingFiles.length === 0) return;
    setBillingResult("Extraindo faturamento com IA...");
    setBillingProgress(5);

    const extractionInterval = setInterval(() => {
      setBillingProgress((prev) =>
        prev >= 90 ? prev : prev + Math.floor(Math.random() * 10) + 5,
      );
    }, 600);

    const formData = new FormData();
    billingFiles.forEach((f) => formData.append("files", f));

    try {
      const resp = await fetch("/api/extract-billing-pdf", {
        method: "POST",
        body: formData,
      });
      clearInterval(extractionInterval);

      let responseText = "";
      let data: any = {};
      try {
        responseText = await resp.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (jsonErr) {
        console.error("Erro ao decodificar JSON de faturamento:", jsonErr);
        if (
          resp.status === 504 ||
          resp.status === 502 ||
          resp.status === 503 ||
          (responseText &&
            (responseText.toLowerCase().includes("timeout") ||
              responseText.toLowerCase().includes("<html")))
        ) {
          data = {
            success: false,
            error:
              "Limite de tempo excedido (Timeout). O arquivo PDF enviado é muito grande, pesado ou o servidor levou muito tempo para processar os dados por IA. Por favor, divida o PDF em partes menores ou utilize a Adição Manual/Planilha.",
          };
        } else {
          data = {
            success: false,
            error: "Resposta em formato inválido recebida do servidor (não é um JSON válido).",
          };
        }
      }

      if (!resp.ok || !data.success) {
        setBillingResult("Erro: " + (data.error || "Erro desconhecido"));
        setBillingProgress(0);
        return;
      }
      setBilledItems(data.billedItems || []);
      setBillingProgress(100);
      setBillingResult(null);
    } catch (e: any) {
      clearInterval(extractionInterval);
      setBillingResult("Falha na rede: " + e.message);
      setBillingProgress(0);
    }
  };

  const confirmarFaturamento = async () => {
    setBillingResult("Atualizando estoque e faturando itens...");
    let allOrderItemsCount = 0;
    for (const billed of billedItems) {
      // try to find order by code
      const order = db.orders.find((o) => o.code === billed.orderCode);
      if (order && order.items) {
        for (const oi of order.items) {
          if (
            oi.partName === billed.partName ||
            (oi.partName && oi.partName.includes(billed.partName))
          ) {
            // decrement stock
            const dbItem = db.items.find(
              (i) => i.code === oi.itemCode || i.name === oi.partName,
            );
            if (dbItem && dbItem.stock !== undefined) {
              await db.updateItem({
                ...dbItem,
                stock: Math.max(0, dbItem.stock - billed.quantity),
              });
            }
            // update order item status (a shortcut, usually we need a full update logic)
            // to do it right:
            const updatedItems = order.items.map((it) => {
              if (it.id === oi.id) {
                return { ...it, status: "FATURADO" } as typeof it;
              }
              return it;
            });
            // if all items billed -> order billed
            const newStatus = updatedItems.every((i) => i.status === "FATURADO")
              ? "FATURADO"
              : order.status;
            await db.updateOrders([
              {
                ...order,
                items: updatedItems,
                status: newStatus,
              },
            ]);
            allOrderItemsCount++;
            break;
          }
        }
      }
    }

    alert(allOrderItemsCount + " itens faturados baseados no documento!");
    setIsBillingModalOpen(false);
    setBilledItems([]);
    setBillingFiles([]);
  };

  const handleExtractPdf = async () => {
    if (pdfFiles.length === 0) return;
    setPdfImportResult("Extraindo dados com Inteligência Artificial...");
    setPdfImportProgress(5);

    // Simulate progress during extraction to give outstanding visual feedback
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
    pdfFiles.forEach((f) => formData.append("files", f));

    try {
      const resp = await fetch("/api/extract-orders-pdf", {
        method: "POST",
        body: formData,
      });
      clearInterval(extractionInterval);

      let responseText = "";
      let data: any = {};
      try {
        responseText = await resp.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (jsonErr) {
        console.error("Erro ao decodificar JSON de extração de pedidos:", jsonErr);
        if (
          resp.status === 504 ||
          resp.status === 502 ||
          resp.status === 503 ||
          (responseText &&
            (responseText.toLowerCase().includes("timeout") ||
              responseText.toLowerCase().includes("<html")))
        ) {
          data = {
            success: false,
            error:
              "Limite de tempo excedido (Timeout). O arquivo PDF enviado é muito grande, pesado ou o servidor levou muito tempo para processar os dados por IA. Por favor, tente enviar um PDF menor (menos páginas) ou utilize a Adição Manual/Planilha para cadastrar sem bloqueio.",
          };
        } else {
          data = {
            success: false,
            error: "Resposta em formato inválido recebida do servidor (não é um JSON válido).",
          };
        }
      }

      if (!resp.ok || !data.success) {
        setPdfImportResult("Erro: " + (data.error || "Erro desconhecido ao processar arquivo."));
        setPdfImportProgress(0);
        return;
      }

      // Perform matching and database cross-referencing on the extracted orders
      const matchedOrders = data.orders.map((order: any, idx: number) => {
        const originalCustomerName = order.customerName || "DESCONHECIDO";
        const customerCodeStr = order.customerCode
          ? String(order.customerCode).trim()
          : "";
        let finalCustomerName = originalCustomerName;
        let matchedCustomer = null;
        let wasCustomerMatched = false;

        // 1. Try to match by customerCode if provided
        if (customerCodeStr) {
          const codeId = Number(customerCodeStr);
          if (!isNaN(codeId)) {
            matchedCustomer = db.customers.find((c) => c.id === codeId);
          }
        }

        // 2. Try to match by a numeric customer code at the beginning of the name (e.g. "123 - CLIENTE" or "[123] CLIENTE")
        if (!matchedCustomer) {
          const leadingCodeMatch =
            originalCustomerName.match(/^\s*[\[\(]?\s*(\d+)/);
          if (leadingCodeMatch) {
            const codeId = Number(leadingCodeMatch[1]);
            matchedCustomer = db.customers.find((c) => c.id === codeId);
          }
        }

        // 3. Fallback: match by scanning numeric sequences or similarity with database names/tradeNames
        if (!matchedCustomer) {
          const cleanOcrName = originalCustomerName.toLowerCase().trim();
          matchedCustomer = db.customers.find((c) => {
            const dbIdStr = c.id.toString();
            if (cleanOcrName.includes(dbIdStr)) return true;

            const dbName = c.name.toLowerCase().trim();
            const dbTrade = c.tradeName ? c.tradeName.toLowerCase().trim() : "";

            if (
              cleanOcrName === dbName ||
              cleanOcrName.includes(dbName) ||
              dbName.includes(cleanOcrName)
            )
              return true;
            if (
              dbTrade &&
              (cleanOcrName === dbTrade ||
                cleanOcrName.includes(dbTrade) ||
                dbTrade.includes(cleanOcrName))
            )
              return true;

            return false;
          });
        }

        // Opt for tradeName (nome fantasia) if client is identified and has tradeName, else reason social
        if (matchedCustomer) {
          finalCustomerName =
            matchedCustomer.tradeName?.trim() || matchedCustomer.name;
          wasCustomerMatched = true;
        }

        // Match Representative (Consultor) from PDF
        let matchedRep = null;
        let wasRepMatched = false;
        const ocrRepName = order.representativeName
          ? order.representativeName.toLowerCase().trim()
          : "";

        if (ocrRepName) {
          const cleanRepName = ocrRepName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/\brepresentante\b/gi, "") // Remove 'representante' word
            .trim();

          if (
            cleanRepName.toLowerCase().includes("mapefor") ||
            ocrRepName.toLowerCase().includes("mapefor")
          ) {
            matchedRep =
              db.users.find((u) => u.id === "representante_danilo") || null;
          } else {
            matchedRep = db.users.find((u) => {
              if (u.role !== "REPRESENTANTE") return false;
              const dbNormalize = u.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\brepresentante\b/gi, "")
                .trim();

              return (
                cleanRepName === dbNormalize ||
                dbNormalize.includes(cleanRepName) ||
                cleanRepName.includes(dbNormalize)
              );
            });
          }
        }

        let finalRepresentativeName = order.representativeName || "";
        let finalRepresentativeId = "";

        // NEW RULE: Force representative to "André" for specific clients
        const clientsForAndre = [
          "móveis bom pastor",
          "moveis bom pastor",
          "bom pastor",
          "Moveis B P LTDA",
          "lara moveis",
          "lara móveis",
          "artano",
          "grupo sier",
          "sier",
        ];

        const isClientForAndre = clientsForAndre.some(
          (clientName) =>
            originalCustomerName.toLowerCase().includes(clientName) ||
            (matchedCustomer?.name || "").toLowerCase().includes(clientName) ||
            (matchedCustomer?.tradeName || "")
              .toLowerCase()
              .includes(clientName),
        );

        if (isClientForAndre) {
          matchedRep =
            db.users.find(
              (u) =>
                u.name.toLowerCase().includes("andré") ||
                u.name.toLowerCase().includes("andre"),
            ) || matchedRep;
        }

        if (matchedRep) {
          finalRepresentativeName = matchedRep.name;
          finalRepresentativeId = matchedRep.id;
          wasRepMatched = true;
        }

        // Normalize status original and validate rules
        const statusOriginalPdf = (
          order.statusOriginalPdf ||
          order.status ||
          ""
        )
          .trim()
          .toUpperCase();

        const orderCodeStr = order.orderCode
          ? String(order.orderCode).trim().toUpperCase()
          : "";
        const orderExists = db.orders.some(
          (x) =>
            x.orderCode &&
            String(x.orderCode).trim().toUpperCase() === orderCodeStr,
        );

        let statusValidation: "APTO" | "ALERTA" | "BLOQUEADO" | "REVISAO" =
          "REVISAO";
        let validationMessage = "";

        if (orderExists) {
          statusValidation = "BLOQUEADO";
          validationMessage =
            "BLOQUEADO: Este pedido já existe no sistema. A importação automática foi bloqueada para evitar duplicidade. Novos itens só podem ser adicionados manualmente.";
        } else if (!statusOriginalPdf) {
          statusValidation = "REVISAO";
          validationMessage =
            "Status ausente ou não identificado no PDF. Requer revisão manual.";
        } else if (
          statusOriginalPdf.includes("DOCUMENTO FATURADO") &&
          !statusOriginalPdf.includes("PARCIAL")
        ) {
          statusValidation = "APTO";
          validationMessage =
            "Pedido faturado no PDF. Será importado com status FATURADO e fará consumo de estoque.";
        } else if (
          statusOriginalPdf.includes("DOCUMENTO FATURADO PARCIAL") ||
          statusOriginalPdf.includes("PARCIAL")
        ) {
          statusValidation = "ALERTA";
          validationMessage =
            "ALERTA: Faturado parcial. Será importado como pendente, verifique se os itens realmente devem ir para produção.";
        } else if (
          statusOriginalPdf.includes("PROCESSADO") ||
          statusOriginalPdf.includes("PEDIDO DE VENDA") ||
          statusOriginalPdf.includes("PEDIDO") ||
          statusOriginalPdf.includes("APROVADO") ||
          statusOriginalPdf.includes("PENDENTE") ||
          statusOriginalPdf.includes("A FATURAR") ||
          statusOriginalPdf.includes("EM_PRODUCAO") ||
          statusOriginalPdf.includes("EM PRODUCAO") ||
          statusOriginalPdf.includes("ORÇAMENTO APRESENTADO") ||
          statusOriginalPdf === "AGUARDANDO_APROVACAO"
        ) {
          statusValidation = "APTO";
          validationMessage = "Pedido liberado para importação.";
        } else {
          statusValidation = "REVISAO";
          validationMessage =
            "Status não reconhecido. Requer revisão manual antes de faturar/produzir.";
        }

        // Determine system status mapping following strict user rules:
        // "Se o status for “DOCUMENTO FATURADO”, o pedido não deve seguir como pendente ou para produção." -> map to AGUARDANDO_APROVACAO
        let finalSystemStatus:
          | "AGUARDANDO_APROVACAO"
          | "PENDENTE"
          | "EM_PRODUCAO"
          | "FATURADO" = "AGUARDANDO_APROVACAO";
        if (statusValidation === "APTO") {
          if (
            statusOriginalPdf.includes("DOCUMENTO FATURADO") &&
            !statusOriginalPdf.includes("PARCIAL")
          ) {
            finalSystemStatus = "FATURADO";
          } else if (
            order.status === "EM_PRODUCAO" ||
            order.status === "PENDENTE"
          ) {
            finalSystemStatus = order.status;
          } else {
            finalSystemStatus = "PENDENTE";
          }
        } else {
          finalSystemStatus = "AGUARDANDO_APROVACAO";
        }

        const mappedItems = (order.items || []).map((it: any) => {
          let c = it.color;
          const strCode = String(it.itemCode || "").trim();
          let processedCode = it.itemCode;

          if (strCode.includes(".")) {
            const parts = strCode.split(".");
            const possibleColorCode = parts[parts.length - 1].trim();

            if (COLOR_MAP[possibleColorCode]) {
              c = COLOR_MAP[possibleColorCode];
              // Remapeia o código base removendo o sufixo numérico da cor
              processedCode = parts.slice(0, -1).join(".");
            }
          }

          return {
            ...it,
            color: c,
            itemCode: processedCode,
          };
        });

        return {
          ...order,
          items: mappedItems,
          tempId:
            order.tempId ||
            `temp_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
          validationMessage,
        };
      });

      setPdfImportProgress(100);
      setPdfExtractedOrders(matchedOrders);
      setPdfImportResult(
        "Dados extraídos. Por favor, revise as informações abaixo antes de confirmar.",
      );

      // Clear the progress state shortly after completion
      setTimeout(() => setPdfImportProgress(0), 800);
    } catch (err: any) {
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
      const orderCode = o.orderCode || `PDF-${Date.now()}`;
      const orderCodeStr = orderCode.trim().toUpperCase();

      // Prevention safety rule: if order code exists, block/skip automatic import
      const alreadyExists = db.orders.some(
        (x) => x.orderCode && x.orderCode.trim().toUpperCase() === orderCodeStr,
      );
      if (alreadyExists) {
        console.warn(
          `[IMPORT BLOCK LOG] Importação automática do pedido ${orderCode} bloqueada: pedido já existente no sistema.`,
        );
        continue;
      }

      // Use the already matched customer name resolved from extraction
      const finalCustomerName = o.customerName || "DESCONHECIDO";

      // Check extracted/mapped status
      const extractedStatus = o.status ? o.status.trim().toUpperCase() : "";
      const allowedStatuses = [
        "AGUARDANDO_APROVACAO",
        "PENDENTE",
        "TEM_ESTOQUE",
        "EM_PRODUCAO",
        "PRODUZIDO",
        "EM_CORTE",
        "CORTADO",
        "EM_PINTURA",
        "PINTADO",
        "EMBALANDO",
        "EMBALADO",
        "PLANEJADO",
        "FATURADO",
      ];
      const orderStatus = allowedStatuses.includes(extractedStatus)
        ? (extractedStatus as any)
        : "AGUARDANDO_APROVACAO";

      for (const item of o.items) {
        let dbItemId = 0;
        if (item.itemCode) {
          const f = db.items.find((it) => it.code === item.itemCode);
          if (f) dbItemId = f.id;
        }
        if (dbItemId === 0 && item.itemName) {
          const f = db.items.find(
            (it) =>
              it.name.trim().toLowerCase() ===
              item.itemName.trim().toLowerCase(),
          );
          if (f) dbItemId = f.id;
        }
        if (dbItemId === 0 && item.itemName) {
          const f = db.items.find((it) =>
            it.name
              .trim()
              .toLowerCase()
              .includes(item.itemName.trim().toLowerCase()),
          );
          if (f) dbItemId = f.id;
        }

        const unitPriceNum = Number(item.unitPrice) || 0;
        const quantity = Number(item.quantity) || 1;

        await db.addOrder({
          orderCode: orderCode,
          customerName: finalCustomerName,
          representativeName: o.representativeName || "",
          representativeId: o.representativeId || "",
          deliveryDate:
            o.deliveryDate || new Date().toISOString().split("T")[0],
          paymentCondition: o.paymentCondition || "",
          paymentTerms: o.paymentTerm || o.paymentTerms || "",
          notes: o.notes || "",
          isProgramacao: o.isProgramacao || false,
          isUrgent: o.isUrgent || false,
          isThirdPartyLaser: o.isThirdPartyLaser || false,
          itemId: dbItemId,
          color: item.color || "-",
          size: item.size || "-",
          variation: "-",
          totalQuantity: quantity,
          packedQuantity: orderStatus === "FATURADO" ? quantity : 0,
          invoicedQuantity: orderStatus === "FATURADO" ? quantity : 0,
          unitPrice: unitPriceNum,
          status: orderStatus,
          statusOriginalPdf: o.statusOriginalPdf || "",
          isActive: orderStatus !== "FATURADO",
          createdAt: Date.now(),
          customProductName: item.itemName,
        });

        if (orderStatus === "FATURADO" && dbItemId !== 0) {
          const stockId = `${dbItemId}|${item.color || "-"}|${item.size || "-"}|-|ACABADO`;
          const existingStock = db.stocks.find((s) => s.id === stockId);
          if (existingStock) {
            await db.updateStocks([
              {
                ...existingStock,
                quantity: Math.max(0, existingStock.quantity - quantity),
                reservedQuantity: Math.max(
                  0,
                  (existingStock.reservedQuantity || 0) - quantity,
                ),
              },
            ]);
            db.addStockMovement?.({
              itemId: dbItemId,
              color: item.color || "-",
              size: item.size || "-",
              variation: "-",
              quantity: quantity,
              type: "SAIDA",
              description: `Dedução de estoque por importação direta de pedido FATURADO via PDF (${orderCode})`,
            });
          }
        }

        if (unitPriceNum > 0 && dbItemId !== 0) {
          await db.addPriceHistory({
            itemId: dbItemId,
            customerName: finalCustomerName,
            unitPrice: unitPriceNum,
            orderCode: orderCode,
            createdAt: Date.now(),
            source: "PDF",
          });
        }
        addedCount++;
      }
      setPdfImportProgress(
        Math.round(((i + 1) / pdfExtractedOrders.length) * 100),
      );
    }

    setPdfImportResult(
      `Importação concluída! ${addedCount} itens de pedidos criados.`,
    );
    setTimeout(() => {
      setIsPdfModalOpen(false);
      setPdfExtractedOrders([]);
      setPdfFiles([]);
      setPdfImportResult(null);
      setPdfImportProgress(0);
      setEditingOrderIdx(null);
    }, 3000);
  };

  const handleImportExcel = async () => {
    if (!excelData.trim()) return;

    setExcelImportResult("Processando...");

    const rows = excelData.trim().split("\n");
    let addedCount = 0;
    let updatedCount = 0;

    const updatedOrders: any[] = [];

    // Check if the first row looks like a header row
    const firstRowCols = rows[0].split("\t").map((c) => c.trim().toUpperCase());
    const hasDynamicHeaders =
      firstRowCols.some(
        (c) =>
          c.includes("PEDIDO") ||
          c.includes("CÓDIGO") ||
          c.includes("CODIGO") ||
          c.includes("NUMERO") ||
          c.includes("Nº") ||
          c.includes("O.V"),
      ) &&
      firstRowCols.some(
        (c) =>
          c.includes("ITEM") ||
          c.includes("PRODUTO") ||
          c.includes("PECA") ||
          c.includes("PEÇA") ||
          c.includes("DESCRI"),
      );

    let startIdx = 0;

    // Fallback static indices
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
      startIdx = 1; // skip header

      const getColIndex = (names: string[], exactOnly = false) => {
        let res = firstRowCols.findIndex((c) =>
          names.some((n) => c === n.toUpperCase()),
        );
        if (res === -1 && !exactOnly) {
          res = firstRowCols.findIndex((c) =>
            names.some(
              (n) =>
                c.includes(n.toUpperCase()) &&
                !c.includes("COD. CLIENTE") &&
                !c.includes("CÓD. CLIENTE"),
            ),
          );
        }
        return res;
      };

      idxCode = getColIndex([
        "PEDIDO",
        "Nº PEDIDO",
        "CÓD. O.V.",
        "CÓDIGO",
        "NUMERO",
        "NÚMERO",
        "Nº O.V.",
        "O.V.",
      ]);
      idxCustomer = getColIndex([
        "RAZÃO SOCIAL",
        "CLIENTE FANTASIA",
        "CLIENTE",
        "NOME DO CLIENTE",
      ]);

      idxRep = getColIndex(["CONSULTOR", "VENDEDOR", "REPRESENTANTE"], true); // Do not fallback to Cidade

      const codItemIdx = getColIndex([
        "CÓD. ITEM",
        "COD ITEM",
        "CÓDIGO DO PRODUTO",
      ]);
      idxProductStr =
        codItemIdx >= 0
          ? codItemIdx
          : getColIndex([
              "ITEM",
              "PRODUTO",
              "DESCRIÇÃO",
              "DESCRI",
              "PEÇA",
              "NOME",
            ]);

      idxColor = getColIndex(["COR"], true);
      idxSize = getColIndex(["TAMANHO"], true);
      idxVariation = getColIndex(["VARIAÇÃO", "VARIACAO"], true);
      idxQty = getColIndex(["QUANTIDADE", "QTD"], true);

      // Date can be 'Data para Entrega'
      idxDate = getColIndex(["DATA PARA ENTREGA", "ENTREGA"]);
      if (idxDate === -1) idxDate = getColIndex(["DATA"]);

      idxStatusProd = getColIndex(["STATUS DE PRODU"]);
      idxStatusFat = getColIndex(["STATUS DE FATURAMENTO", "STATUS DE FAT"]);
      idxStatusEnt = getColIndex(["STATUS DE ENTREGA", "STATUS DE ENT"]);

      idxQtdEntregue = getColIndex([
        "QTD. ENTREGUE",
        "QTD ENTREGUE",
        "QTD. FATURADA",
      ]);
    }

    // Helper for Excel dates
    const formatExcelDate = (dateStr: string) => {
      if (!dateStr || dateStr === "-") return "";

      // Handle something like "seg., 20 de abr." or "18/nov."
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
        "dez",
      ];

      const foundMonthIdx = months.findIndex((m) => matchMonthStr.includes(m));

      if (foundMonthIdx !== -1) {
        // extract numbers
        const numbers = dateStr.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          const day = String(numbers[numbers.length - 1]).padStart(2, "0");
          const month = String(foundMonthIdx + 1).padStart(2, "0");
          let year = new Date().getFullYear();

          // Simple heuristic: if month is earlier than current month by a lot without year, it might be next year. We just use current year.
          if (dateStr.includes(String(year))) {
            // already has year
          } else if (dateStr.includes(String(year + 1))) {
            year++;
          }

          return `${year}-${month}-${day}`;
        }
      }

      // Handle normal dd/mm/yyyy
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split("/");
        return `${y}-${m}-${d}`;
      }

      return dateStr;
    };

    const incomingOrderCodes: string[] = [];
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("\t").map((c) => c.trim().toUpperCase());
      const rCode = idxCode >= 0 && cols.length > idxCode ? cols[idxCode] : "";
      if (rCode && !incomingOrderCodes.includes(rCode)) {
        incomingOrderCodes.push(rCode);
      }
    }

    const preExistingCodes = db.orders.reduce((acc, o) => {
      if (o.orderCode) {
        acc.add(o.orderCode.trim().toUpperCase());
      }
      return acc;
    }, new Set<string>());

    const blockedCodes = incomingOrderCodes.filter((code) =>
      preExistingCodes.has(code.trim().toUpperCase()),
    );
    const anyBlocked = blockedCodes.length > 0;

    setExcelImportProgress(0);

    for (let i = startIdx; i < rows.length; i++) {
      if (i % 25 === 0) {
        setExcelImportProgress(
          Math.round(((i - startIdx) / (rows.length - startIdx)) * 100),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const row = rows[i];
      if (!row.trim()) continue;
      const cols = row.split("\t").map((c) => c.trim().toUpperCase());

      // Only reject if it lacks at least something resembling an ID, unless dynamic headers are found
      if (!hasDynamicHeaders && cols.length < 4) continue;

      const rCode = idxCode >= 0 && cols.length > idxCode ? cols[idxCode] : "";

      // Prevention safety rule: if order code exists in database, block/skip automatic import
      if (rCode && preExistingCodes.has(rCode.trim().toUpperCase())) {
        console.warn(
          `[IMPORT BLOCK LOG] Importação automática do pedido ${rCode} bloqueada: pedido já existente no sistema.`,
        );
        continue;
      }

      let rCustomer =
        idxCustomer >= 0 && cols.length > idxCustomer
          ? cols[idxCustomer]
          : cols[1] || "";
      const rRepRaw =
        idxRep >= 0 && cols.length > idxRep
          ? cols[idxRep]
          : cols.length > 2 && !hasDynamicHeaders
            ? cols[2]
            : "";
      let rRep = rRepRaw !== "-" && rRepRaw !== "" ? rRepRaw : "";
      if (rRep.toLowerCase().includes("mapefor")) {
        rRep = "Danilo Representante";
      }

      const rProductStr =
        idxProductStr >= 0 && cols.length > idxProductStr
          ? cols[idxProductStr]
          : cols[3] || "";
      const rColor =
        idxColor >= 0 && cols.length > idxColor && cols[idxColor]
          ? cols[idxColor]
          : "-";
      const rSize =
        idxSize >= 0 && cols.length > idxSize && cols[idxSize]
          ? cols[idxSize]
          : "-";
      const rVariation =
        idxVariation >= 0 && cols.length > idxVariation && cols[idxVariation]
          ? cols[idxVariation]
          : "-";

      const rQtyStr =
        idxQty >= 0 && cols.length > idxQty
          ? cols[idxQty]
          : cols.length > 7 && !hasDynamicHeaders
            ? cols[7]
            : "1";
      let rDate =
        idxDate >= 0 && cols.length > idxDate && cols[idxDate]
          ? cols[idxDate]
          : cols.length > 8 && !hasDynamicHeaders
            ? cols[8]
            : new Date().toISOString().split("T")[0];

      rDate = formatExcelDate(rDate);

      const rQtdEntStr =
        idxQtdEntregue >= 0 && cols.length > idxQtdEntregue
          ? cols[idxQtdEntregue]
          : "0";

      if (!rCode && !rProductStr) continue;

      const parsedQty = parseInt(
        (rQtyStr || "1").toString().replace(/\D/g, ""),
        10,
      );
      if (isNaN(parsedQty) || parsedQty <= 0) continue;

      const parsedEnt = parseInt(
        (rQtdEntStr || "0").toString().replace(/\D/g, ""),
        10,
      );
      const deliveredQty = isNaN(parsedEnt) ? 0 : parsedEnt;

      // se nao achou cliente, tenta pegar o Cliente Fantasia (coluna seguinte se for do padrao deles)
      if (
        !rCustomer &&
        hasDynamicHeaders &&
        idxCustomer >= 0 &&
        cols.length > idxCustomer + 1
      ) {
        const tryNext = cols[idxCustomer + 1];
        if (tryNext && tryNext !== "-" && tryNext !== "") rCustomer = tryNext;
      }
      if (!rCustomer) rCustomer = "CONSUMIDOR FINAL";

      const query = rProductStr.toLowerCase();
      const itemDb = db.items.find(
        (i) =>
          String(i.id) === query ||
          String(i.code).toLowerCase() === query ||
          i.name.toLowerCase() === query,
      );

      const actualItemId = itemDb ? itemDb.id : null;
      if (!actualItemId) continue;

      let rStatus: any = "PENDENTE";
      if (hasDynamicHeaders) {
        const sProd =
          idxStatusProd >= 0 && cols.length > idxStatusProd
            ? cols[idxStatusProd]
            : "";
        const sFat =
          idxStatusFat >= 0 && cols.length > idxStatusFat
            ? cols[idxStatusFat]
            : "";
        const sEnt =
          idxStatusEnt >= 0 && cols.length > idxStatusEnt
            ? cols[idxStatusEnt]
            : "";

        if (sEnt.includes("ENTREGUE")) rStatus = "FATURADO";
        else if (sFat.includes("FATURADO")) rStatus = "FATURADO";
        else if (sProd.includes("PRONTO")) rStatus = "EMBALADO";
        else if (sProd.includes("PRODU") || sProd.includes("PROCESSO"))
          rStatus = "EM_PRODUCAO";
      }

      if (deliveredQty >= parsedQty) rStatus = "FATURADO";

      const existing = db.orders.find(
        (o) =>
          o.orderCode === rCode &&
          o.itemId === actualItemId &&
          o.color === rColor &&
          o.size === rSize &&
          o.variation === rVariation,
      );

      if (existing) {
        const isFaturado = hasDynamicHeaders
          ? rStatus === "FATURADO"
          : existing.status === "FATURADO";
        updatedOrders.push({
          ...existing,
          customerName: rCustomer || existing.customerName,
          representativeName: rRep !== "" ? rRep : existing.representativeName,
          totalQuantity: parsedQty,
          deliveryDate:
            rDate !== ""
              ? rDate
              : isFaturado
                ? new Date().toISOString().split("T")[0]
                : existing.deliveryDate,
          status: hasDynamicHeaders ? rStatus : existing.status,
          packedQuantity:
            hasDynamicHeaders && deliveredQty > 0
              ? deliveredQty
              : existing.packedQuantity,
          invoicedQuantity:
            hasDynamicHeaders && deliveredQty > 0
              ? deliveredQty
              : existing.invoicedQuantity,
          isActive: !isFaturado,
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
          packedQuantity:
            hasDynamicHeaders &&
            (deliveredQty > 0 ||
              rStatus === "EMBALADO" ||
              rStatus === "FATURADO")
              ? Math.max(deliveredQty, parsedQty)
              : 0,
          invoicedQuantity:
            hasDynamicHeaders && (deliveredQty > 0 || rStatus === "FATURADO")
              ? Math.max(deliveredQty, parsedQty)
              : 0,
          isActive: rStatus !== "FATURADO",
          createdAt: Date.now(),
          deliveryDate:
            rDate ||
            (rStatus === "FATURADO"
              ? new Date().toISOString().split("T")[0]
              : ""),
          status: rStatus,
        });
        addedCount++;
      }
    }

    setExcelImportProgress(100);

    if (updatedOrders.length > 0) {
      db.updateOrders(updatedOrders);
    }

    if (anyBlocked) {
      if (addedCount === 0) {
        setExcelImportResult(
          `Este pedido já existe no sistema. A importação automática foi bloqueada para evitar duplicidade. Novos itens só podem ser adicionados manualmente. (Pedidos bloqueados: ${blockedCodes.join(", ")})`,
        );
      } else {
        setExcelImportResult(
          `Importação concluída parcialmente! ${addedCount} novos itens adicionados de novos pedidos. Pedidos já existentes [${blockedCodes.join(", ")}] foram bloqueados para evitar duplicidade. Novos itens neles só podem ser adicionados manualmente.`,
        );
      }
    } else {
      setExcelImportResult(
        `Concluído! ${addedCount} novos adicionados, ${updatedCount} atualizados.`,
      );
    }
    setExcelData("");
    setTimeout(() => {
      setIsExcelModalOpen(false);
      setExcelImportResult(null);
    }, 6000);
  };

  const sendServerPush = async (
    title: string,
    body: string,
    targetRoles: Role[],
  ) => {
    // Find users with these roles
    const targetUsers = db.users.filter(
      (u) => targetRoles.includes(u.role) && u.fcmToken,
    );
    const tokens = targetUsers.map((u) => u.fcmToken);

    if (tokens.length === 0) return;

    try {
      await fetch("/api/send-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, fcmTokens: tokens }),
      });
    } catch (e) {
      console.error("Error triggering push:", e);
    }
  };

  const handleApproveOrder = async (orderToApprove: (typeof db.orders)[0]) => {
    const stockId = `${orderToApprove.itemId}|${orderToApprove.color}|${orderToApprove.size}|${orderToApprove.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);

    let qtFromStock = 0;
    let newStatus: OrderStatus = "PENDENTE";

    if (existingStock && existingStock.quantity > 0) {
      qtFromStock = Math.min(
        existingStock.quantity,
        orderToApprove.totalQuantity,
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
        isActive: true,
      },
    ]);

    db.addLogs([
      {
        id: Date.now(),
        orderId: orderToApprove.id,
        operatorId: currentUser.id,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
        customProductName: `Aprovação de Pedido (Status: ${newStatus})`,
      },
    ]);

    alert(`Pedido ${orderToApprove.orderCode} aprovado com sucesso!`);
  };

  const handleRejectOrder = (orderId: number) => {
    if (
      confirm(
        "Deseja rejeitar e remover este pedido enviado pelo representante?",
      )
    ) {
      db.deleteOrder(orderId);
    }
  };

  const handleConfirmInvoice = () => {
    if (!invoiceModalData) return;
    const { order: o, limit } = invoiceModalData;
    const qty = parseInt(invoiceInput, 10);

    if (isNaN(qty) || qty <= 0 || qty > limit) {
      alert("Quantidade inválida. Deve ser maior que 0 e no máximo " + limit);
      return;
    }

    const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);

    // Stolen reservation popup alert check
    if (existingStock && (existingStock.reservedQuantity || 0) > 0) {
      const alternateReservedOrders = db.orders.filter(
        (ord) =>
          ord.id !== o.id &&
          ord.itemId === o.itemId &&
          ord.color === o.color &&
          ord.size === o.size &&
          ord.variation === o.variation &&
          (ord.status === "PLANEJADO" || ord.status === "EMBALADO") &&
          ord.isActive,
      );

      if (alternateReservedOrders.length > 0) {
        const primaryResOrder = alternateReservedOrders[0];
        const confirmResult = window.confirm(
          `ALERTA POPUP - PRODUTO RESERVADO PARA OUTRO PEDIDO:\n\n` +
            `O produto que você está faturando contém unidades de estoque RESERVADAS para:\n` +
            `• Pedido: ${primaryResOrder.orderCode}\n` +
            `• Cliente: ${primaryResOrder.customerName}\n\n` +
            `Deseja CONTINUAR assim mesmo e desfazer a reserva do outro pedido ou clique em Cancelar para interromper?`,
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
              packedQuantity: 0,
            },
          ]);

          const nextReservedQty = Math.max(
            0,
            (existingStock.reservedQuantity || 0) -
              (primaryResOrder.totalQuantity || 0),
          );
          db.updateStocks([
            {
              ...existingStock,
              reservedQuantity: nextReservedQty,
            },
          ]);

          db.addLogs([
            {
              id: Date.now() + 5,
              orderId: primaryResOrder.id,
              operatorId: currentUser.id,
              timestamp: Date.now(),
              durationMillis: 0,
              customProductName: `Reserva desfeita (estoque direcionado para pedido ${o.orderCode})`,
            },
          ]);
        }
      }
    }

    const newInvoiced = (o.invoicedQuantity || 0) + qty;
    const isNowFaturado = newInvoiced >= o.totalQuantity;
    const newStatus = isNowFaturado
      ? ("FATURADO" as const)
      : (newInvoiced > 0 ? ("FATURADO_PARCIAL" as const) : (o.status || "PENDENTE"));

    db.updateOrders([
      {
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: !isNowFaturado,
        isUrgent: isNowFaturado ? false : o.isUrgent, // automatically remove isUrgent!
        _alreadyDeducted: true,
      },
    ]);

    if (existingStock) {
      const newStockQty = Math.max(0, existingStock.quantity - qty);
      const newReservedQty = Math.max(
        0,
        (existingStock.reservedQuantity || 0) - qty,
      );
      db.updateStocks([
        {
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty,
        },
      ]);
    }

    db.addStockMovement?.({
      itemId: o.itemId,
      color: o.color,
      size: o.size,
      variation: o.variation,
      quantity: qty,
      type: "SAIDA",
      description: `Saída por faturamento do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
    });

    db.addLogs([
      {
        id: Date.now(),
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
      },
    ]);

    // Triga WhatsApp Share Modal
    const rep = db.users.find(
      (u) =>
        u.role === "REPRESENTANTE" &&
        (u.name === o.representativeName || u.id === o.representativeId),
    );
    const customer = db.customers.find((c) => c.name === o.customerName);
    const clientDisplayName = customer?.tradeName || o.customerName;
    const item = db.items.find((i) => i.id === o.itemId);
    const productDescr = `${item?.name || "Produto"} (Cor: ${o.color || "-"}, Tam: ${o.size || "-"}, Var: ${o.variation || "-"})`;

    setInvoiceModalData(null);
    setInvoiceInput("");

    setFaturamentoWhatsAppShareData({
      orderCode: o.orderCode || `${o.id}`,
      customerName: clientDisplayName,
      productDescription: productDescr,
      quantity: qty,
      phone: rep?.phone || "",
      representativeName: rep?.name || o.representativeName || "não definido",
      customerEmail: customer?.email || "",
      representativeEmail: rep?.email || "",
      totalValue: qty * (o.unitPrice || 0),
      deliveryDate: o.deliveryDate || "",
    });
  };

  const handleInvoiceEntireOrder = async (orderCode: string) => {
    const itemsToInvoice = db.orders.filter(
      (o: any) =>
        o.orderCode === orderCode &&
        o.isActive !== false &&
        (o.invoicedQuantity || 0) < o.totalQuantity,
    );

    const itemsWithQtyToInvoice = itemsToInvoice.filter((o: any) => {
      const qtyToInvoice = o.totalQuantity - (o.invoicedQuantity || 0);
      return qtyToInvoice > 0;
    });

    if (itemsWithQtyToInvoice.length === 0) {
      alert("Todos os itens deste pedido já estão com faturamento completo.");
      return;
    }

    const confirmResult = window.confirm(
      `Tem certeza que deseja faturar todo o pedido ${orderCode} de uma única vez?`,
    );
    if (!confirmResult) return;

    const updatedOrders: any[] = [];
    const newLogs: any[] = [];

    const stocksMapToUpdate = new Map<string, any>();
    db.stocks.forEach((s: any) => {
      stocksMapToUpdate.set(s.id, { ...s });
    });

    itemsWithQtyToInvoice.forEach((o: any, idx: number) => {
      const qtyToInvoice = o.totalQuantity - (o.invoicedQuantity || 0);
      const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;

      updatedOrders.push({
        ...o,
        invoicedQuantity: o.totalQuantity,
        status: "FATURADO" as const,
        isActive: false,
        isUrgent: false,
        _alreadyDeducted: true,
      });

      const existingStock = stocksMapToUpdate.get(stockId);
      if (existingStock) {
        existingStock.quantity = Math.max(
          0,
          existingStock.quantity - qtyToInvoice,
        );
        existingStock.reservedQuantity = Math.max(
          0,
          (existingStock.reservedQuantity || 0) - qtyToInvoice,
        );
      }

      db.addStockMovement?.({
        itemId: o.itemId,
        color: o.color,
        size: o.size,
        variation: o.variation,
        quantity: qtyToInvoice,
        type: "SAIDA",
        description: `Saída por faturamento total do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
      });

      newLogs.push({
        id: Date.now() + idx,
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qtyToInvoice,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
      });
    });

    await db.updateOrders(updatedOrders);

    const stocksArrToUpdate = Array.from(stocksMapToUpdate.values()).filter(
      (s: any) => {
        const originalStock = db.stocks.find((os: any) => os.id === s.id);
        return (
          originalStock &&
          (originalStock.quantity !== s.quantity ||
            originalStock.reservedQuantity !== s.reservedQuantity)
        );
      },
    );

    if (stocksArrToUpdate.length > 0) {
      await db.updateStocks(stocksArrToUpdate);
    }

    if (newLogs.length > 0) {
      await db.addLogs(newLogs);
    }

    // Capture representative and customer info for the entire order to trigger communication flow
    const firstItem = itemsWithQtyToInvoice[0];
    const rep = db.users.find(
      (u) =>
        u.role === "REPRESENTANTE" &&
        (u.name === firstItem.representativeName ||
          u.id === firstItem.representativeId),
    );
    const customer = db.customers.find(
      (c) => c.name === firstItem.customerName,
    );
    const clientDisplayName = customer?.tradeName || firstItem.customerName;

    const totalQty = itemsWithQtyToInvoice.reduce(
      (sum, item) => sum + (item.totalQuantity - (item.invoicedQuantity || 0)),
      0,
    );
    const totalVal = itemsWithQtyToInvoice.reduce(
      (sum, item) =>
        sum +
        (item.totalQuantity - (item.invoicedQuantity || 0)) *
          (item.unitPrice || 0),
      0,
    );

    const productDescr = itemsWithQtyToInvoice
      .map((item) => {
        const dbItem = db.items.find((i) => i.id === item.itemId);
        const name = dbItem?.name || item.customProductName || "Produto";
        const q = item.totalQuantity - (item.invoicedQuantity || 0);
        return `${name} (Cor: ${item.color || "-"}, Tam: ${item.size || "-"}, Var: ${item.variation || "-"}) [Qtd: ${q}]`;
      })
      .join(" | ");

    setFaturamentoWhatsAppShareData({
      orderCode: orderCode,
      customerName: clientDisplayName,
      productDescription: productDescr,
      quantity: totalQty,
      phone: rep?.phone || "",
      representativeName:
        rep?.name || firstItem.representativeName || "não definido",
      customerEmail: customer?.email || "",
      representativeEmail: rep?.email || "",
      totalValue: totalVal,
      deliveryDate: firstItem.deliveryDate || "",
    });

    alert(`Pedido ${orderCode} faturado com sucesso!`);
    setSelectedOrderCode(null);
  };

  const handleBatchInvoice = () => {
    if (selectedBatchInvoiceIds.length === 0) return;

    if (
      !confirm(
        `Deseja faturar em lote ${selectedBatchInvoiceIds.length} pedido(s) selecionado(s)?`,
      )
    ) {
      return;
    }

    const updatedOrders: typeof db.orders = [];
    const updatedStocks: typeof db.stocks = [];
    const addedLogs: any[] = [];

    selectedBatchInvoiceIds.forEach((id, idx) => {
      const o = db.orders.find((ord) => ord.id === id);
      if (!o || o.status !== "EMBALADO") return;

      const qty = o.totalQuantity - (o.invoicedQuantity || 0);
      if (qty <= 0) return;

      const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
      const existingStock = db.stocks.find((s) => s.id === stockId);

      const newInvoiced = (o.invoicedQuantity || 0) + qty;
      const isNowFaturado = true;
      const newStatus = "FATURADO" as const;

      updatedOrders.push({
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: false,
        isUrgent: false,
        _alreadyDeducted: true,
      });

      if (existingStock) {
        const newStockQty = Math.max(0, existingStock.quantity - qty);
        const newReservedQty = Math.max(
          0,
          (existingStock.reservedQuantity || 0) - qty,
        );
        updatedStocks.push({
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty,
        });
      }

      db.addStockMovement?.({
        itemId: o.itemId,
        color: o.color,
        size: o.size,
        variation: o.variation,
        quantity: qty,
        type: "SAIDA",
        description: `Saída por faturamento em LOTE do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
      });

      addedLogs.push({
        id: Date.now() + idx + 100,
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
        customProductName: "Faturamento em Lote",
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
        `Faturamento em lote concluído com sucesso para ${updatedOrders.length} pedido(s)!`,
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
        unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
        isThirdPartyLaser,
        isUrgent,
        isProgramacao,
      },
    ]);
    setItemId("");
    setOrderItemSearch("");
    setColor("");
    setSize("");
    setVariation("");
    setTotalQuantity("");
    setUnitPrice("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
  };

  const [orderToastMessage, setOrderToastMessage] = useState("");

  const handleCadastrar = async () => {
    if (editingId) {
      if (
        !orderCode ||
        !itemId ||
        !customerName ||
        !totalQuantity ||
        !deliveryDate
      )
        return;
      const existing = db.orders.find((o) => o.id === editingId);
      if (existing) {
        const finalPaymentCondition =
          paymentType === "outro"
            ? customPaymentCondition
            : paymentType.toUpperCase();

        await db.updateOrders([
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
            unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
            deliveryDate,
            paymentCondition: finalPaymentCondition,
            paymentTerms,
            billingRule,
            isThirdPartyLaser,
            isUrgent,
            isProgramacao,
          },
        ]);

        // Evaluate if modified to Atrasado
        const todayMs = new Date().setHours(12, 0, 0, 0);
        const oldDeliveryMs = existing.deliveryDate
          ? new Date(existing.deliveryDate).setUTCHours(12, 0, 0, 0)
          : null;
        const newDeliveryMs = new Date(deliveryDate).setUTCHours(12, 0, 0, 0);

        const wasLate = oldDeliveryMs ? oldDeliveryMs - todayMs < 0 : false;
        const isLate = newDeliveryMs - todayMs < 0;
        const isFinished =
          existing.status === "FATURADO" || existing.status === "EMBALADO";

        if (!wasLate && isLate && !isFinished) {
          sendServerPush(
            "Atenção: Pedido Atrasado",
            `O prazo do pedido ${orderCode} foi alterado ou venceu e encontra-se em atraso!`,
            ["ADMIN", "PCP", "PRODUCAO"],
          );
        }
      }
      setEditingId(null);
      setOrderToastMessage("Pedido atualizado com sucesso!");
      setTimeout(() => setOrderToastMessage(""), 4000);
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
          unitPrice: unitPrice === "" ? undefined : Number(unitPrice),
          isThirdPartyLaser,
          isUrgent,
          isProgramacao,
        });
      }

      if (itemsToProcess.length === 0) return;

      const invalidItems = itemsToProcess.filter(it => !it.itemId || !it.totalQuantity || it.totalQuantity <= 0);
      if (invalidItems.length > 0) {
        alert("Existem itens inválidos na lista (sem produto ou com quantidade zerada).");
        return;
      }

      const finalPaymentCondition =
        paymentType === "outro"
          ? customPaymentCondition
          : paymentType.toUpperCase();

      let successCount = 0;
      for (const itemInfo of itemsToProcess) {
        const numItemId = Number(itemInfo.itemId);
        const numTotalQuantity = Number(itemInfo.totalQuantity);

        const stockId = `${numItemId}|${itemInfo.color}|${itemInfo.size}|${itemInfo.variation}|ACABADO`;
        const existingStock = db.stocks.find((s) => s.id === stockId);

        let qtFromStock = 0;
        let status: OrderStatus = "PENDENTE";

        if (existingStock && existingStock.quantity > 0) {
          qtFromStock = Math.min(existingStock.quantity, numTotalQuantity);
          const newStockQty = existingStock.quantity - qtFromStock;
          await db.updateStocks([{ ...existingStock, quantity: newStockQty }]);

          if (qtFromStock >= numTotalQuantity) {
            status = "TEM_ESTOQUE"; // fully covered by stock
          }
        }

        await db.addOrder({
          orderCode,
          itemId: numItemId,
          customerName,
          representativeName,
          color: itemInfo.color,
          size: itemInfo.size,
          variation: itemInfo.variation,
          totalQuantity: numTotalQuantity,
          unitPrice: itemInfo.unitPrice,
          paymentCondition: finalPaymentCondition,
          paymentTerms,
          billingRule,
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
          status: status,
        });

        if (itemInfo.isThirdPartyLaser) {
          await db.addNotification({
            message: `Novo Pedido Corte Laser Terceirizado: ${orderCode}`,
            read: false,
          });
        }
        successCount++;
      }

      // Trigger FCM Push notification
      sendServerPush(
        "Novo Pedido Gerado",
        `Pedido ${orderCode} (Cliente: ${customerName}) foi adicionado ao sistema.`,
        itemsToProcess.some((it) => it.isThirdPartyLaser)
          ? ["ADMIN", "PCP", "PRODUCAO", "PROJETISTA"]
          : ["ADMIN", "PCP", "PRODUCAO"],
      );
      
      setOrderToastMessage(`${successCount} ${successCount > 1 ? 'itens foram inseridos' : 'item foi inserido'} com sucesso!`);
      setTimeout(() => setOrderToastMessage(""), 4000);
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
    setUnitPrice("");
    setPaymentCondition("");
    setPaymentTerms("");
    setCustomPaymentCondition("");
    setIsThirdPartyLaser(false);
    setIsUrgent(false);
    setIsProgramacao(false);
    setLineItems([]);
    setIsFormVisible(false);
  };

  const handleEdit = (o: (typeof db.orders)[0]) => {
    setEditingId(o.id);
    setOrderCode(o.orderCode);
    setItemId(o.itemId);
    const foundItem = db.items.find((i) => i.id === o.itemId);
    setOrderItemSearch(
      foundItem ? `${foundItem.code} - ${foundItem.name}` : "",
    );
    setCustomerName(o.customerName);
    setRepresentativeName(o.representativeName || "");
    setColor(o.color);
    setSize(o.size);
    setVariation(o.variation);
    setTotalQuantity(o.totalQuantity);
    setUnitPrice(o.unitPrice ?? "");
    setDeliveryDate(o.deliveryDate);

    // Payment stuff
    const cdt = o.paymentCondition || "";
    if (["PIX", "BOLETO", "DEPÓSITO", "CARTEIRA"].includes(cdt.toUpperCase())) {
      const typeMap: Record<
        string,
        "pix" | "boleto" | "deposito" | "carteira"
      > = {
        PIX: "pix",
        BOLETO: "boleto",
        DEPÓSITO: "deposito",
        CARTEIRA: "carteira",
      };
      setPaymentType(typeMap[cdt.toUpperCase()]);
      setCustomPaymentCondition("");
    } else if (cdt) {
      setPaymentType("outro");
      setCustomPaymentCondition(cdt);
    } else {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
    }
    setPaymentTerms(o.paymentTerms || "");
    setBillingRule(o.billingRule || "cadastro");

    setIsThirdPartyLaser(!!o.isThirdPartyLaser);
    setIsUrgent(!!o.isUrgent);
    setIsProgramacao(!!o.isProgramacao);
    setIsFormVisible(true);
  };

  const handleReplicate = (o: (typeof db.orders)[0]) => {
    setEditingId(null);
    setOrderCode(`${o.orderCode}-COPIA`);
    setItemId(o.itemId);
    const foundItem = db.items.find((i) => i.id === o.itemId);
    setOrderItemSearch(
      foundItem ? `${foundItem.code} - ${foundItem.name}` : "",
    );
    setCustomerName(o.customerName);
    setRepresentativeName(o.representativeName || "");
    setColor(o.color);
    setSize(o.size);
    setVariation(o.variation);
    setTotalQuantity(o.totalQuantity);
    setUnitPrice(o.unitPrice ?? "");
    setDeliveryDate(o.deliveryDate);

    // Payment stuff
    const cdt = o.paymentCondition || "";
    if (["PIX", "BOLETO", "DEPÓSITO", "CARTEIRA"].includes(cdt.toUpperCase())) {
      const typeMap: Record<
        string,
        "pix" | "boleto" | "deposito" | "carteira"
      > = {
        PIX: "pix",
        BOLETO: "boleto",
        DEPÓSITO: "deposito",
        CARTEIRA: "carteira",
      };
      setPaymentType(typeMap[cdt.toUpperCase()]);
      setCustomPaymentCondition("");
    } else if (cdt) {
      setPaymentType("outro");
      setCustomPaymentCondition(cdt);
    } else {
      setPaymentType("boleto");
      setCustomPaymentCondition("");
    }
    setPaymentTerms(o.paymentTerms || "");
    setBillingRule(o.billingRule || "cadastro");

    setIsThirdPartyLaser(!!o.isThirdPartyLaser);
    setIsUrgent(!!o.isUrgent);
    setIsProgramacao(!!o.isProgramacao);
    setIsFormVisible(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este pedido?")) {
      db.deleteOrder(id);
    }
  };

  const handleDeleteOrderGroup = async (code: string) => {
    if (currentUser.role === "LEITURA") return;
    const ordersInGroup = db.orders.filter((o) => o.orderCode === code);
    if (ordersInGroup.length === 0) return;

    const msg =
      ordersInGroup.length > 1
        ? `Tem certeza que deseja excluir o pedido #${code} por completo (contendo ${ordersInGroup.length} itens)?`
        : `Tem certeza que deseja excluir o pedido #${code}?`;

    if (confirm(msg)) {
      for (const o of ordersInGroup) {
        await db.deleteOrder(o.id);
      }
      if (selectedOrderCode === code) {
        setSelectedOrderCode(null);
      }
    }
  };

  const handleReplicateGroup = async (code: string) => {
    if (currentUser.role === "LEITURA") return;
    const ordersInGroup = db.orders.filter((o) => o.orderCode === code);
    if (ordersInGroup.length === 0) return;

    if (confirm(`Deseja replicar o pedido #${code} (com todos os seus ${ordersInGroup.length} itens)?`)) {
      const newCode = `${code}-COPIA`;
      for (const o of ordersInGroup) {
        const { id, ...rest } = o as any;
        delete rest.tempId;
        await db.addOrder({
          ...rest,
          orderCode: newCode,
        });
      }
      alert(`Pedido ${code} replicado com sucesso como ${newCode}!`);
      setSelectedOrderCode(newCode);
    }
  };

  const handleDeleteIndividualOrder = async (id: number, code: string) => {
    if (currentUser.role === "LEITURA") return;
    if (confirm("Tem certeza que deseja excluir este item do pedido?")) {
      await db.deleteOrder(id);
      const remainingForCode = db.orders.filter(
        (o) => o.orderCode === code && o.id !== id,
      );
      if (remainingForCode.length === 0) {
        setSelectedOrderCode(null);
      }
    }
  };

  const [visibleCount, setVisibleCount] = useState(30);

  const filteredOrders = db.orders
    .filter((o) => {
      const term = normalizeString(debouncedSearchTerm);

      const customer = db.customers.find(
        (c) => c.name === o.customerName || c.tradeName === o.customerName,
      );
      const item = db.items.find((i) => i.id === o.itemId);

      const searchTarget = normalizeString(
        `${o.orderCode} ${o.customerName} ${customer?.tradeName || ""} ${item?.name || ""} ${item?.code || ""}`,
      );

      const matchesSearch = searchTarget.includes(term);
      if (!matchesSearch) return false;

      if (filterLaserOnly) {
        const itemNorm = normalizeString(item?.name || "");
        const isPeOrChapa =
          itemNorm.includes("pe") || itemNorm.includes("chapa") || itemNorm.includes("barrachata") || itemNorm.includes("barra chata");
        const isThirdParty = !!o.isThirdPartyLaser;
        if (!isPeOrChapa && !isThirdParty) return false;
      }

      // Filter by delivery date range
      if (deliveryDateStart || deliveryDateEnd) {
        if (!o.deliveryDate) return false;
        const itemDate = o.deliveryDate.split("T")[0];
        if (deliveryDateStart && itemDate < deliveryDateStart) return false;
        if (deliveryDateEnd && itemDate > deliveryDateEnd) return false;
      }

      // Filter by custom customer field
      if (filterCustomer) {
        const matchesCust = normalizeString(o.customerName).includes(normalizeString(filterCustomer)) || 
          normalizeString(customer?.tradeName || "").includes(normalizeString(filterCustomer));
        if (!matchesCust) return false;
      }

      // Filter by item status
      if (filterStatus && o.status !== filterStatus) {
        return false;
      }

      // Filter by urgency
      if (filterUrgentOnly && !o.isUrgent) {
        return false;
      }

      // Filter based on activeSubTab
      if (activeSubTab === "APROVACAO") {
        return o.status === "AGUARDANDO_APROVACAO";
      } else if (activeSubTab === "FATURADOS") {
        return o.status === "FATURADO";
      } else {
        // Abertos tabs: everything else that's active/pending
        return o.status !== "FATURADO" && o.status !== "AGUARDANDO_APROVACAO";
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  const [listOffsetTop, setListOffsetTop] = useState(0);

  // Re-measure list coordinates when orders change
  useEffect(() => {
    if (listContainerRef.current) {
      setListOffsetTop(listContainerRef.current.offsetTop);
    }
  }, [filteredOrders]);

  const { getIndices } = useVirtualScroll({
    itemCount: filteredOrders.length,
    itemHeight: 160, // card height 152px + 8px gap
    containerRef: scrollContainerRef,
    buffer: 5,
  });

  const { startIndex, endIndex } = getIndices(listOffsetTop);

  // Reset pagination when tab or search changes
  useEffect(() => {
    setVisibleCount(30);
  }, [activeSubTab, debouncedSearchTerm]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Relatório de Pedidos", 14, 20);

    // Filter metadata
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    
    const filterInfo: string[] = [];
    if (debouncedSearchTerm) filterInfo.push(`Pesquisa: "${debouncedSearchTerm}"`);
    if (deliveryDateStart || deliveryDateEnd) {
      const startFmt = deliveryDateStart ? deliveryDateStart.split("-").reverse().join("/") : "início";
      const endFmt = deliveryDateEnd ? deliveryDateEnd.split("-").reverse().join("/") : "fim";
      filterInfo.push(`Entrega: ${startFmt} a ${endFmt}`);
    }
    if (filterCustomer) filterInfo.push(`Cliente: "${filterCustomer}"`);
    if (filterStatus) filterInfo.push(`Status: ${filterStatus}`);
    if (filterUrgentOnly) filterInfo.push("Apenas Urgentes");
    if (filterLaserOnly) filterInfo.push("Apenas Laser");
    
    const filterText = filterInfo.length > 0 ? `Filtros: ${filterInfo.join(" | ")}` : "Sem filtros ativos (Todos)";
    doc.text(filterText, 14, 26);

    const tableColumn = [
      "Pedido",
      "Cliente",
      "Produto",
      "Tamanho/Cor",
      "Entrega",
      "Status",
      "Qtd",
    ];
    const tableRows: any[] = [];

    filteredOrders.forEach((o) => {
      const item = db.items.find((i) => i.id === o.itemId);
      const deliveryDateStr = o.deliveryDate
        ? o.deliveryDate.substring(0, 10).split("-").reverse().join("/")
        : "Sem prazo";
      const orderInfo = [
        o.orderCode,
        o.customerName,
        item?.name || "Desconhecido",
        `${o.size || "-"} / ${o.color || "-"}`,
        deliveryDateStr,
        o.status || "PENDENTE",
        `${o.totalQuantity}`,
      ];
      tableRows.push(orderInfo);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    });
    doc.save(`pedidos_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm w-full mx-auto border overflow-hidden p-4">
      {/* Unified Screen Mode Selector Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 lg:max-w-md shrink-0 mb-4 shadow-inner">
        <button
          type="button"
          onClick={() => setViewMode("ITENS")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            viewMode === "ITENS"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-indigo-605"
          }`}
        >
          📋 Modo Operacional (Itens)
        </button>
        <button
          type="button"
          onClick={() => setViewMode("STATUS_PEDIDOS")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            viewMode === "STATUS_PEDIDOS"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-indigo-650"
          }`}
        >
          🔍 Modo Status e Prazos (Pedidos)
        </button>
      </div>

      {viewMode === "ITENS" ? (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full pr-1 px-0.5 scrollbar-thin">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Pedidos {currentUser.role === "PCP" && "(PCP)"}
            </h2>

            {piecesByStatus.length > 0 && (
              <button
                onClick={() => setIsStatusBarOpen(!isStatusBarOpen)}
                className="flex items-center gap-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 rounded-full px-4 py-1.5 shadow-sm hover:bg-gray-50 transition"
              >
                <Layers size={16} className="text-indigo-600" />
                Visão Geral de Peças
                {isStatusBarOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            )}
          </div>

          {isStatusBarOpen && piecesByStatus.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl shadow-inner border border-indigo-100 mb-6 flex flex-wrap gap-3 animate-in slide-in-from-top-4 fade-in duration-200">
              <div className="w-full mb-1">
                <h3 className="text-xs uppercase font-bold text-indigo-800 tracking-wider">
                  Total de Peças por Status (Pedidos Abertos)
                </h3>
              </div>
              {piecesByStatus.map((st) => (
                <div
                  key={st.status}
                  className="bg-white border border-indigo-100/60 shadow-sm rounded-lg px-3 py-2 flex flex-col min-w-[120px]"
                >
                  <span className="text-[10px] text-gray-500 font-bold uppercase truncate">
                    {st.label}
                  </span>
                  <span className="text-lg font-black text-indigo-700">
                    {st.qty}{" "}
                    <span className="text-xs text-gray-400 font-medium">
                      peças
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {(currentUser.role === "PCP" ||
            currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA") && (
            <div className={editingId ? "fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden" : "bg-white p-3 rounded-xl shadow-xs border flex flex-col gap-2.5 mb-4 shrink-0 transition-all duration-300"}>
              <div className={editingId ? "bg-white p-5 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200" : "contents"}>
                <div className="flex justify-between items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div
                    className="flex-1 flex items-center cursor-pointer pointer-events-auto select-none"
                    onClick={() => {
                      if (!editingId) setIsFormVisible(!isFormVisible);
                    }}
                  >
                    <h3 className={`font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1 ${editingId ? 'text-lg' : 'text-xs sm:text-sm'}`}>
                      📑{" "}
                      {editingId ? "Editando Pedido" : "Novo Pedido / Importar"}
                    </h3>
                    {!editingId && (
                      <span className="text-slate-400 hover:text-indigo-605 transition ml-1">
                        {isFormVisible ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </span>
                    )}
                  </div>

                  {editingId ? (
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition ml-auto flex-shrink-0"
                    >
                      <X size={24} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBillingFiles([]);
                          setBillingProgress(0);
                          setBillingResult(null);
                          setBilledItems([]);
                          setIsBillingModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded shadow-xs transition text-[10px] md:text-xs flex items-center gap-1 leading-none"
                      >
                        <FileText size={12} /> Faturamento PDF
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPdfModalOpen(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2.5 rounded shadow-xs transition text-[10px] md:text-xs flex items-center gap-1 leading-none"
                      >
                        <FileDown size={12} /> Importar PDF
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExcelModalOpen(true);
                        }}
                        className="bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-1 px-2.5 rounded shadow-xs transition text-[10px] md:text-xs flex items-center gap-1 leading-none"
                      >
                        Importar do Excel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCleanupResult(null);
                          setIsDeduplicateModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-2.5 rounded shadow-xs transition text-[10px] md:text-xs flex items-center gap-1 leading-none"
                      >
                        🧹 Limpar Duplicados
                      </button>
                    </div>
                  )}
                </div>

              {isBillingModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
                    <div className="flex justify-between items-center bg-white px-6 py-4 border-b border-slate-200 shadow-sm relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 shadow-inner block">
                          <FileText size={22} className="drop-shadow-sm" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                            Importar Faturamento via IA
                          </h2>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Extração automática de itens e pedidos faturados.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsBillingModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                      {billingFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-12 w-full max-w-lg flex flex-col items-center transition hover:bg-indigo-100/50 group hover:border-indigo-300">
                            <div className="bg-white p-4 rounded-full shadow-sm text-indigo-500 mb-4 group-hover:scale-110 transition-transform duration-300">
                              <UploadCloud size={48} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">
                              Arraste um PDF ou selecione
                            </h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-sm">
                              Suporta PDFs múltiplos (notas fiscais ou espelhos
                              de faturamento)
                            </p>

                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              ref={billingInputRef}
                              multiple
                              onChange={(e) =>
                                setBillingFiles(
                                  e.target.files
                                    ? Array.from(e.target.files)
                                    : [],
                                )
                              }
                            />

                            <button
                              onClick={() => billingInputRef.current?.click()}
                              className="bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-900 transition text-sm shadow-md"
                            >
                              Selecionar Arquivos
                            </button>
                          </div>
                        </div>
                      ) : billedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                          <div className="flex flex-col gap-2 w-full max-w-sm">
                            {billingFiles.map((f, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs w-full"
                              >
                                <span className="text-xs truncate">
                                  {f.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {(f.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setBillingFiles([])}
                            className="text-xs text-red-500 font-bold hover:underline mb-8 mt-2"
                          >
                            Limpar Seleção
                          </button>

                          {billingProgress === 0 && (
                            <button
                              onClick={handleExtractBilling}
                              className="mt-4 bg-indigo-600 text-white font-bold py-2.5 px-8 rounded-lg hover:bg-indigo-700 transition text-sm shadow-md flex items-center gap-2"
                            >
                              <FileText size={16} /> Processar Faturamento com
                              IA
                            </button>
                          )}

                          {billingResult && (
                            <div className="mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-lg w-full max-w-md text-center border-dashed">
                              {billingResult}
                            </div>
                          )}

                          {billingProgress > 0 && (
                            <div className="mt-5 w-full max-w-md bg-white border border-indigo-100 p-4 rounded-xl shadow-md">
                              <div className="flex justify-between items-center text-xs font-bold text-indigo-600 mb-1.5 uppercase tracking-wider">
                                <span>Mapeando Faturamento</span>
                                <span>{billingProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300 animate-pulse"
                                  style={{ width: billingProgress + "%" }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-bold text-slate-800 mb-4">
                            {billedItems.length} itens faturados encontrados:
                          </h3>
                          <div className="space-y-2 max-h-[60vh] overflow-auto">
                            {billedItems.map((item, i) => (
                              <div
                                key={i}
                                className="flex flex-col bg-white border p-3 rounded-lg text-sm"
                              >
                                <div className="font-bold">
                                  {item.partName}{" "}
                                  <span className="text-slate-500 font-medium text-xs">
                                    x{item.quantity}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Pedido:{" "}
                                  <span className="font-bold text-slate-700">
                                    {item.orderCode}
                                  </span>{" "}
                                  | Cliente: {item.customerName}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-6 flex justify-end gap-3">
                            <button
                              onClick={() => {
                                setBillingFiles([]);
                                setBilledItems([]);
                                setBillingProgress(0);
                                setBillingResult(null);
                              }}
                              className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-50 font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={confirmarFaturamento}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700 transition"
                            >
                              Confirmar Faturamento
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isPdfModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-2 sm:p-4 animate-fade-in backdrop-blur-xs">
                  <div
                    id="import-orders-pdf-modal"
                    className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden border border-slate-100"
                  >
                    {/* Cabeçalho Fixo */}
                    <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-50 p-2 rounded-lg text-red-600">
                          <FileDown size={22} />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
                            Importar Pedidos via PDF
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Extraia e revise múltiplos pedidos do PDF usando
                            Inteligência Artificial
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsPdfModalOpen(false);
                          setPdfExtractedOrders([]);
                          setPdfFiles([]);
                          setPdfImportResult(null);
                          setPdfImportProgress(0);
                          setEditingOrderIdx(null);
                        }}
                        className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition"
                        title="Fechar"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Área Interna de Conteúdo (Rolável) */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
                      {!pdfExtractedOrders.length ? (
                        /* Tela de Upload Inicial */
                        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white border-2 border-dashed border-slate-200 rounded-xl p-6 sm:p-12 transition hover:border-indigo-400">
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={pdfInputRef}
                            onChange={(e) =>
                              setPdfFiles(
                                e.target.files
                                  ? Array.from(e.target.files)
                                  : [],
                              )
                            }
                            multiple
                          />
                          <div className="bg-red-50 p-4 rounded-full text-red-500 mb-4 animate-bounce">
                            <FileDown size={44} />
                          </div>
                          <h4 className="text-md font-bold text-slate-800 text-center mb-1">
                            Selecione o documento de Pedidos
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-500 text-center max-w-md mb-6 leading-relaxed">
                            Faça upload do arquivo PDF contendo um ou mais
                            pedidos de venda. Nossa IA fará a leitura, extrairá
                            todos os dados de cabeçalho, itens e efetuará o
                            cruzamento inteligente com o cadastro.
                          </p>

                          {pdfFiles.length > 0 ? (
                            <div className="flex flex-col gap-2 w-full max-w-sm">
                              {pdfFiles.map((f, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 shadow-xs w-full"
                                >
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
                                      <FileText
                                        size={16}
                                        className="text-red-500 shrink-0"
                                      />
                                      {f.name}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {(f.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => setPdfFiles([])}
                                className="text-xs text-red-500 font-bold hover:underline self-end"
                              >
                                Limpar Seleção
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => pdfInputRef.current?.click()}
                              className="bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-900 transition text-sm shadow-md"
                            >
                              Selecionar Arquivo PDF
                            </button>
                          )}

                          {pdfFiles.length > 0 && !pdfImportResult && (
                            <button
                              onClick={handleExtractPdf}
                              className="mt-4 bg-indigo-600 text-white font-bold py-2.5 px-8 rounded-lg hover:bg-indigo-700 transition text-sm shadow-md flex items-center gap-2"
                            >
                              <FileText size={16} /> Processar com IA
                            </button>
                          )}

                          {pdfImportResult && (
                            <div className="mt-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-lg w-full max-w-md text-center border-dashed">
                              {pdfImportResult}
                            </div>
                          )}

                          {pdfImportProgress > 0 &&
                            !pdfExtractedOrders.length && (
                              <div className="mt-5 w-full max-w-md bg-white border border-indigo-100 p-4 rounded-xl shadow-md">
                                <div className="flex justify-between items-center text-xs font-bold text-indigo-600 mb-1.5 uppercase tracking-wider">
                                  <span>Processando e Mapeando Documento</span>
                                  <span>{pdfImportProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                                  <div
                                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-300 animate-pulse"
                                    style={{ width: `${pdfImportProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                        </div>
                      ) : (
                        /* Tela de Pré-Visualização / Conferência dos dados extraídos */
                        <div className="space-y-6">
                          {/* 1. RESUMO GERAL NO TOPO */}
                          <div
                            id="import-orders-summary"
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                          >
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <Activity size={14} className="text-indigo-500" />
                              Visão Geral de Status e Validação dos Pedidos
                            </h4>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                  Total PDF
                                </span>
                                <span className="text-xl font-black text-slate-800 mt-1">
                                  {pdfExtractedOrders.length}{" "}
                                  {pdfExtractedOrders.length === 1
                                    ? "Pedido"
                                    : "Pedidos"}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {pdfExtractedOrders.reduce(
                                    (acc, o) => acc + (o.items?.length || 0),
                                    0,
                                  )}{" "}
                                  SKU itens
                                </span>
                              </div>

                              <div className="bg-emerald-50/75 border border-emerald-100 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                                  Aptos
                                </span>
                                <span className="text-xl font-black text-emerald-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "APTO",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-emerald-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 size={11} /> Pronto p/ PCP
                                </span>
                              </div>

                              <div className="bg-amber-50/75 border border-amber-150 rounded-xl p-3 flex flex-col border-dashed animate-pulse">
                                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                                  Em Alerta
                                </span>
                                <span className="text-xl font-black text-amber-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "ALERTA",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-amber-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <AlertTriangle size={11} /> Revisar Parcial
                                </span>
                              </div>

                              <div className="bg-rose-50/75 border border-rose-100 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">
                                  Bloqueados
                                </span>
                                <span className="text-xl font-black text-rose-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "BLOQUEADO",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-rose-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <AlertCircle size={11} /> Já Faturados
                                </span>
                              </div>

                              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex flex-col">
                                <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                                  Revisão Pendente
                                </span>
                                <span className="text-xl font-black text-indigo-800 mt-1 block">
                                  {
                                    pdfExtractedOrders.filter(
                                      (o) => o.statusValidation === "REVISAO",
                                    ).length
                                  }
                                </span>
                                <span className="text-[10px] text-indigo-600 mt-0.5 font-bold flex items-center gap-0.5">
                                  <HelpCircle size={11} /> Status indefinido
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-600 flex items-center gap-2">
                              <span className="shrink-0 text-amber-500">
                                <AlertTriangle size={15} />
                              </span>
                              <p>
                                <strong>Atenção:</strong> Revise cada pedido no
                                acordeão abaixo. Pedidos com sinalizador de
                                representante ausente ou cliente não cadastrado
                                serão importados, porém devem ser ajustados ou
                                serão criados em modo temporário.
                              </p>
                            </div>
                          </div>

                          {/* 2. PEDIDO EM ACCORDION / CARD EXPANSÍVEL */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                              Lista de Pedidos ({pdfExtractedOrders.length})
                            </h4>

                            {pdfExtractedOrders.map((order, idx) => {
                              const orderKey = order.tempId || idx;
                              const isExpanded = expandedOrderIdx === orderKey;
                              const isEditing = editingOrderIdx === orderKey;
                              const hasIssues =
                                !order.wasCustomerMatched ||
                                !order.wasRepMatched;
                              const hasFinanceAccess =
                                currentUser &&
                                (currentUser.role === "PCP" ||
                                  currentUser.role === "GERENCIA" ||
                                  currentUser.role === "ADMIN");

                              return (
                                <div
                                  key={order.tempId || idx}
                                  className={`bg-white border rounded-xl overflow-hidden shadow-xs transition duration-200 ${
                                    isExpanded
                                      ? "border-indigo-400 ring-2 ring-indigo-50/50"
                                      : "border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  {/* Cabeçalho do Card (Acordeão) */}
                                  <div
                                    onClick={() =>
                                      setExpandedOrderIdx(
                                        isExpanded ? null : orderKey,
                                      )
                                    }
                                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer select-none gap-2 flex-wrap sm:flex-nowrap hover:bg-slate-50/50 transition"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="text-slate-400 shrink-0">
                                        {isExpanded ? (
                                          <ChevronUp size={20} />
                                        ) : (
                                          <ChevronDown size={20} />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-extrabold text-slate-900 text-sm">
                                            Pedido:{" "}
                                            {order.orderCode ||
                                              `Orçamento #${idx + 1}`}
                                          </span>

                                          {/* Status do Pedido no PDF - Com super destaque conforme solicitado */}
                                          <span
                                            className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 tracking-tight shadow-sm shrink-0 ${
                                              order.statusValidation ===
                                              "BLOQUEADO"
                                                ? "bg-red-100 text-red-900 border-red-300 animate-pulse"
                                                : order.statusValidation ===
                                                    "ALERTA"
                                                  ? "bg-amber-100 text-amber-900 border-amber-300 border-dashed"
                                                  : order.statusValidation ===
                                                      "APTO"
                                                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                                    : "bg-indigo-100 text-indigo-900 border-indigo-300"
                                            }`}
                                            title="Status extraído do PDF"
                                          >
                                            <span
                                              className={`w-2 h-2 rounded-full ${
                                                order.statusValidation ===
                                                "BLOQUEADO"
                                                  ? "bg-red-600"
                                                  : order.statusValidation ===
                                                      "ALERTA"
                                                    ? "bg-amber-500"
                                                    : order.statusValidation ===
                                                        "APTO"
                                                      ? "bg-emerald-500"
                                                      : "bg-indigo-500"
                                              }`}
                                            />
                                            PDF:{" "}
                                            {order.statusOriginalPdf ||
                                              "STATUS AUSENTE"}
                                          </span>

                                          {/* Alertas Rápidos de Validação */}
                                          <div className="flex items-center gap-1">
                                            {/* Badge de Cliente */}
                                            {order.wasCustomerMatched ? (
                                              <span
                                                className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                                title="Cliente reconhecido"
                                              >
                                                <Check size={9} /> Cliente OK
                                              </span>
                                            ) : (
                                              <span
                                                className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse"
                                                title="Cliente NÃO cadastrado"
                                              >
                                                <AlertTriangle size={9} /> Novo
                                                Cliente
                                              </span>
                                            )}

                                            {/* Badge de Representante */}
                                            {order.wasRepMatched ? (
                                              <span
                                                className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                                title="Representante reconhecido"
                                              >
                                                <Check size={9} /> Rep. OK
                                              </span>
                                            ) : (
                                              <span
                                                className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                                title="Representante não encontrado"
                                              >
                                                <AlertTriangle size={9} /> Sem
                                                Rep.
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-xs text-slate-500 font-medium truncate mt-1 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                                          <span className="text-slate-800 font-semibold">
                                            {order.customerName}
                                          </span>
                                          <span className="text-slate-300">
                                            |
                                          </span>
                                          <span className="truncate">
                                            Rep:{" "}
                                            {order.representativeName ||
                                              "Mapeamento pendente"}
                                          </span>
                                          <span className="text-slate-300">
                                            |
                                          </span>
                                          <span
                                            className={`font-bold flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-100/65 ${
                                              order.statusValidation ===
                                              "BLOQUEADO"
                                                ? "text-red-700 font-extrabold"
                                                : order.statusValidation ===
                                                    "ALERTA"
                                                  ? "text-amber-700 font-extrabold"
                                                  : order.statusValidation ===
                                                      "APTO"
                                                    ? "text-emerald-700 font-bold"
                                                    : "text-indigo-700 font-bold"
                                            }`}
                                          >
                                            {order.statusValidation ===
                                            "BLOQUEADO"
                                              ? "🛑 "
                                              : order.statusValidation ===
                                                  "ALERTA"
                                                ? "⚠️ "
                                                : "✅ "}
                                            {order.validationMessage}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Direita: Datas e Resumo financeiro rápido */}
                                    <div className="flex items-center gap-4 shrink-0 mt-2 sm:mt-0 text-right">
                                      <div className="hidden md:flex flex-col text-right">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                                          Entrega
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-705">
                                          {order.deliveryDate || "-"}
                                        </span>
                                      </div>

                                      {hasFinanceAccess &&
                                        order.totalValue !== undefined && (
                                          <div className="flex flex-col text-right pr-2">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                                              Valor Total
                                            </span>
                                            <span className="text-sm font-black text-emerald-700 font-mono">
                                              R${" "}
                                              {Number(
                                                order.totalValue,
                                              ).toLocaleString("pt-BR", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })}
                                            </span>
                                          </div>
                                        )}

                                      <div className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition">
                                        <FileText size={16} />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Corpo Expandido */}
                                  {isExpanded && (
                                    <div className="border-t border-slate-150 bg-slate-50/30 p-4 sm:p-5 space-y-5 animate-slide-down">
                                      {order.status === "FATURADO" && (
                                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-start gap-3.5 shadow-xs animate-in fade-in duration-250">
                                          <div className="text-xl shrink-0">
                                            ✨
                                          </div>
                                          <div className="space-y-1">
                                            <h4 className="font-black text-sm uppercase tracking-wide text-emerald-950 flex items-center gap-2">
                                              Pedido Faturado e Concluído
                                            </h4>
                                            <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                                              Este pedido encontra-se
                                              oficialmente faturado e
                                              consolidado no sistema.
                                              Atribuições de peças cortadas de
                                              laser feitas agora abatem
                                              imediatamente do saldo físico
                                              atual em estoque.
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Barra Superior para Ativar/Desativar Edição */}
                                      <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 align-middle">
                                          <Settings
                                            size={14}
                                            className="text-indigo-600"
                                          />{" "}
                                          Revisão e Ajuste de Informações
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isEditing) {
                                                setEditingOrderIdx(null);
                                              } else {
                                                setEditingOrderIdx(orderKey);
                                                setExpandedOrderIdx(orderKey);
                                              }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer select-none ${
                                              isEditing
                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                            }`}
                                          >
                                            {isEditing ? (
                                              <>
                                                <Check size={14} /> Concluir
                                                Edição
                                              </>
                                            ) : (
                                              <>
                                                <Pencil size={14} /> Editar este
                                                Pedido
                                              </>
                                            )}
                                          </button>

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (
                                                confirm(
                                                  `Excluir o pedido ${order.orderCode || ""} (${order.customerName || "Cliente"}) da lista de importação?`,
                                                )
                                              ) {
                                                setPdfExtractedOrders((prev) =>
                                                  prev.filter(
                                                    (o) =>
                                                      (o.tempId || "") !==
                                                      (order.tempId || ""),
                                                  ),
                                                );
                                                setEditingOrderIdx(null);
                                                setExpandedOrderIdx(null);
                                              }
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-xs select-none"
                                          >
                                            <Trash2 size={14} /> Excluir Pedido
                                          </button>
                                        </div>
                                      </div>
                                      {/* Quadros de validação (Visual Alert Boxes) */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                        {/* Validação de Cliente */}
                                        <div
                                          className={`p-3 rounded-lg border text-xs bg-white ${
                                            order.wasCustomerMatched
                                              ? "bg-emerald-50/10 border-emerald-100/80 text-slate-700"
                                              : "bg-red-50/10 border-red-105 text-slate-700"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                                            {order.wasCustomerMatched ? (
                                              <span className="text-emerald-600">
                                                <CheckCircle2 size={16} />
                                              </span>
                                            ) : (
                                              <span className="text-red-500 animate-pulse">
                                                <AlertTriangle size={16} />
                                              </span>
                                            )}
                                            <span className="text-slate-850 uppercase tracking-wider text-[10px]">
                                              Verificação do Cliente
                                            </span>
                                          </div>
                                          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium">
                                                Extraído no PDF:
                                              </span>
                                              <span className="font-bold text-slate-700">
                                                {order.originalCustomerName ||
                                                  "Não Informado"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium">
                                                Código Extraído:
                                              </span>
                                              <span className="font-mono font-bold text-slate-705">
                                                {order.customerCode ||
                                                  "Não Informado"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1 text-xs">
                                              <span className="text-slate-400 font-medium">
                                                Cadastro Vinculado:
                                              </span>
                                              <span
                                                className={`font-black ${order.wasCustomerMatched ? "text-emerald-700" : "text-red-650"}`}
                                              >
                                                {order.wasCustomerMatched
                                                  ? `${order.customerName} (ID: ${order.matchedCustomer?.id})`
                                                  : "Nenhum cadastro correspondente encontrado"}
                                              </span>
                                            </p>
                                          </div>
                                          {!order.wasCustomerMatched && (
                                            <p className="text-[10px] text-red-500 mt-1.5 italic font-medium">
                                              ⚠️ O pedido será importado com a
                                              razão social extraída brutamente
                                              do PDF. É recomendável cadastrá-lo
                                              previamente no módulo de clientes.
                                            </p>
                                          )}
                                        </div>

                                        {/* Validação de Representante */}
                                        <div
                                          className={`p-3 rounded-lg border text-xs bg-white ${
                                            order.wasRepMatched
                                              ? "bg-emerald-50/10 border-emerald-100/80 text-slate-700"
                                              : "bg-amber-50/10 border-amber-105 text-slate-700"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                                            {order.wasRepMatched ? (
                                              <span className="text-emerald-600">
                                                <CheckCircle2 size={16} />
                                              </span>
                                            ) : (
                                              <span className="text-amber-500 animate-pulse">
                                                <AlertTriangle size={16} />
                                              </span>
                                            )}
                                            <span className="text-slate-850 uppercase tracking-wider text-[10px]">
                                              Vínculo do Consultor/Representante
                                            </span>
                                          </div>
                                          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium font-sans">
                                                "Consultor" no PDF:
                                              </span>
                                              <span className="font-bold text-slate-705">
                                                {order.representativeName ||
                                                  "Sem Representante"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1">
                                              <span className="text-slate-400 font-medium">
                                                Usuário Vinculado:
                                              </span>
                                              <span
                                                className={`font-black ${order.wasRepMatched ? "text-emerald-700" : "text-amber-600"}`}
                                              >
                                                {order.wasRepMatched
                                                  ? `${order.representativeName} (ID: ${order.representativeId})`
                                                  : "Nenhum representante correspondente"}
                                              </span>
                                            </p>
                                          </div>
                                          {!order.wasRepMatched && (
                                            <p className="text-[10px] text-amber-600 mt-1.5 italic font-medium">
                                              ⚠️ Sem representante vinculado
                                              automaticamente. Ele não poderá
                                              ver o pedido em seu painel
                                              individual até ser corrigido no
                                              PCP.
                                            </p>
                                          )}
                                        </div>

                                        {/* Validação de Status do Pedido vindo do PDF */}
                                        <div
                                          className={`p-3 rounded-lg border text-xs bg-white ${
                                            order.statusValidation ===
                                            "BLOQUEADO"
                                              ? "bg-red-50/15 border-red-200 text-slate-700 animate-pulse"
                                              : order.statusValidation ===
                                                  "ALERTA"
                                                ? "bg-amber-50/15 border-amber-200 text-slate-700"
                                                : order.statusValidation ===
                                                    "APTO"
                                                  ? "bg-emerald-50/15 border-emerald-200 text-slate-700"
                                                  : "bg-indigo-50/15 border-indigo-200 text-slate-700"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 font-bold mb-1.5">
                                            {order.statusValidation ===
                                            "BLOQUEADO" ? (
                                              <span className="text-red-600">
                                                <AlertCircle size={16} />
                                              </span>
                                            ) : order.statusValidation ===
                                              "ALERTA" ? (
                                              <span className="text-amber-500">
                                                <AlertTriangle size={16} />
                                              </span>
                                            ) : order.statusValidation ===
                                              "APTO" ? (
                                              <span className="text-emerald-600">
                                                <CheckCircle2 size={16} />
                                              </span>
                                            ) : (
                                              <span className="text-indigo-600">
                                                <HelpCircle size={16} />
                                              </span>
                                            )}
                                            <span className="text-slate-850 uppercase tracking-wider text-[10px]">
                                              Validação do Status comercial
                                            </span>
                                          </div>
                                          <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                                            <p className="flex justify-between">
                                              <span className="text-slate-400 font-medium">
                                                Status no PDF:
                                              </span>
                                              <span className="font-extrabold text-slate-700 uppercase font-mono">
                                                {order.statusOriginalPdf ||
                                                  "Não Informado"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between border-t border-dashed border-slate-200 pt-1 mt-1 text-[11px]">
                                              <span className="text-slate-400 font-medium">
                                                Regra Aplicada:
                                              </span>
                                              <span
                                                className={`font-black ${
                                                  order.statusValidation ===
                                                  "BLOQUEADO"
                                                    ? "text-red-700 font-black"
                                                    : order.statusValidation ===
                                                        "ALERTA"
                                                      ? "text-amber-700 font-black"
                                                      : order.statusValidation ===
                                                          "APTO"
                                                        ? "text-emerald-700 font-black"
                                                        : "text-indigo-700 font-black"
                                                }`}
                                              >
                                                {order.statusValidation ===
                                                "BLOQUEADO"
                                                  ? "BLOQUEADO"
                                                  : order.statusValidation ===
                                                      "ALERTA"
                                                    ? "ALERTA DE REVISÃO"
                                                    : order.statusValidation ===
                                                        "APTO"
                                                      ? "LIBERADO"
                                                      : "REVISÃO MANUAL"}
                                              </span>
                                            </p>
                                            <p className="flex justify-between text-xs pt-1">
                                              <span className="text-slate-400 font-medium">
                                                Status PCP Vinculado:
                                              </span>
                                              <span className="text-indigo-900 font-mono font-bold bg-indigo-50 px-1.5 rounded">
                                                {isEditing ? (
                                                  <select
                                                    value={
                                                      order.status ||
                                                      "AGUARDANDO_APROVACAO"
                                                    }
                                                    onChange={(e) =>
                                                      handleUpdateExtractedOrder(
                                                        idx,
                                                        "status",
                                                        e.target.value,
                                                      )
                                                    }
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                    className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-1.5 py-0.5 rounded focus:ring-1 focus:ring-indigo-500"
                                                  >
                                                    <option value="AGUARDANDO_APROVACAO">
                                                      AGUARDANDO_APROVACAO
                                                    </option>
                                                    <option value="PENDENTE">
                                                      PENDENTE
                                                    </option>
                                                    <option value="TEM_ESTOQUE">
                                                      TEM_ESTOQUE
                                                    </option>
                                                    <option value="EM_PRODUCAO">
                                                      EM_PRODUCAO
                                                    </option>
                                                    <option value="PRODUZIDO">
                                                      PRODUZIDO
                                                    </option>
                                                    <option value="EM_CORTE">
                                                      EM_CORTE
                                                    </option>
                                                    <option value="CORTADO">
                                                      CORTADO
                                                    </option>
                                                    <option value="EM_PINTURA">
                                                      EM_PINTURA
                                                    </option>
                                                    <option value="PINTADO">
                                                      PINTADO
                                                    </option>
                                                    <option value="EMBALANDO">
                                                      EMBALANDO
                                                    </option>
                                                    <option value="EMBALADO">
                                                      EMBALADO
                                                    </option>
                                                    <option value="PLANEJADO">
                                                      PLANEJADO
                                                    </option>
                                                    <option value="FATURADO_PARCIAL">
                                                      FATURADO_PARCIAL
                                                    </option>
                                                    <option value="FATURADO">
                                                      FATURADO
                                                    </option>
                                                  </select>
                                                ) : (
                                                  order.status
                                                )}
                                              </span>
                                            </p>
                                          </div>
                                          <p
                                            className={`text-[10px] mt-1.5 italic font-medium leading-normal p-1 px-1.5 rounded ${
                                              order.statusValidation ===
                                              "BLOQUEADO"
                                                ? "text-red-700 bg-red-50 border border-red-100 font-bold"
                                                : order.statusValidation ===
                                                    "ALERTA"
                                                  ? "text-amber-700 bg-amber-50 border border-amber-100 font-bold"
                                                  : order.statusValidation ===
                                                      "APTO"
                                                    ? "text-emerald-700 bg-emerald-50"
                                                    : "text-indigo-700 bg-indigo-50"
                                            }`}
                                          >
                                            {order.validationMessage}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Dados de Cabeçalho Avançados */}
                                      <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                          Informações do Pedido
                                        </h5>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                          <div>
                                            <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                              Número Pedido
                                            </span>
                                            <span className="text-slate-800 font-extrabold text-sm">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={order.orderCode || ""}
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "orderCode",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.orderCode || "-"
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                              Situação / Forma Pgto
                                            </span>
                                            <span className="text-slate-800 font-semibold">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={
                                                    order.paymentCondition || ""
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "paymentCondition",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.paymentCondition || "-"
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                              Prazo de Pagamento
                                            </span>
                                            <span className="text-slate-800 font-semibold">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={
                                                    order.paymentTerm || ""
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "paymentTerm",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.paymentTerm || "-"
                                              )}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5">
                                              Data Emissão
                                            </span>
                                            <span className="text-slate-800 font-mono font-bold">
                                              {order.emissionDate ||
                                                "A ser definida"}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5">
                                              Data Estimada Entrega
                                            </span>
                                            <span className="text-slate-900 font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded inline-block">
                                              {isEditing ? (
                                                <input
                                                  type="text"
                                                  value={
                                                    order.deliveryDate || ""
                                                  }
                                                  placeholder="ex: DD/MM/AAAA"
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "deliveryDate",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 font-mono text-xs font-bold px-2 py-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                />
                                              ) : (
                                                order.deliveryDate || "Sem data"
                                              )}
                                            </span>
                                          </div>
                                          {hasFinanceAccess && (
                                            <>
                                              <div>
                                                <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5">
                                                  Total Bruto
                                                </span>
                                                <span className="text-slate-700 font-bold font-mono">
                                                  R${" "}
                                                  {order.totalGrossValue
                                                    ? Number(
                                                        order.totalGrossValue,
                                                      ).toLocaleString(
                                                        "pt-BR",
                                                        {
                                                          minimumFractionDigits: 2,
                                                        },
                                                      )
                                                    : "-"}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="block text-[10px] text-slate-450 font-extrabold uppercase mb-0.5 text-emerald-700">
                                                  Total Líquido
                                                </span>
                                                <span className="text-emerald-700 font-extrabold font-mono text-sm">
                                                  R${" "}
                                                  {order.totalValue
                                                    ? Number(
                                                        order.totalValue,
                                                      ).toLocaleString(
                                                        "pt-BR",
                                                        {
                                                          minimumFractionDigits: 2,
                                                        },
                                                      )
                                                    : "-"}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                          <div>
                                            <span className="block text-[10px] text-slate-455 font-extrabold uppercase mb-0.5">
                                              Quantidade de Itens
                                            </span>
                                            <span className="text-slate-850 font-extrabold font-mono">
                                              {order.items?.length || 0} itens
                                              extraídos
                                            </span>
                                          </div>

                                          {isEditing ? (
                                            <div className="col-span-2 md:col-span-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition bg-white/50 border border-transparent hover:border-slate-200">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    order.isProgramacao || false
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "isProgramacao",
                                                      e.target.checked,
                                                    )
                                                  }
                                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700">
                                                  Programação
                                                </span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition bg-white/50 border border-transparent hover:border-slate-200">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    order.isUrgent || false
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "isUrgent",
                                                      e.target.checked,
                                                    )
                                                  }
                                                  className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                                                />
                                                <span className="text-xs font-bold text-red-700">
                                                  Marcar como Urgente
                                                </span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition bg-white/50 border border-transparent hover:border-slate-200">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    order.isThirdPartyLaser ||
                                                    false
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "isThirdPartyLaser",
                                                      e.target.checked,
                                                    )
                                                  }
                                                  className="w-4 h-4 text-slate-800 rounded border-slate-300 focus:ring-slate-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                                  Corte Terceirizado
                                                </span>
                                              </label>
                                            </div>
                                          ) : (
                                            <div className="col-span-2 md:col-span-4 mt-2 flex flex-wrap gap-2">
                                              {order.isProgramacao && (
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                                                  Programação
                                                </span>
                                              )}
                                              {order.isUrgent && (
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase text-red-700 bg-red-50 border border-red-200 rounded">
                                                  Pedido Urgente
                                                </span>
                                              )}
                                              {order.isThirdPartyLaser && (
                                                <span className="px-2 py-0.5 text-[10px] font-black uppercase text-slate-700 bg-slate-100 border border-slate-200 rounded">
                                                  Corte Terceirizado
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {(order.notes || isEditing) && (
                                            <div className="col-span-2 md:col-span-4 bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-xs italic mt-2 text-slate-600">
                                              <strong>
                                                Observações do Pedido:
                                              </strong>{" "}
                                              {isEditing ? (
                                                <textarea
                                                  value={order.notes || ""}
                                                  onChange={(e) =>
                                                    handleUpdateExtractedOrder(
                                                      idx,
                                                      "notes",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="bg-white border border-slate-300 text-slate-800 text-xs p-1.5 rounded w-full focus:ring-1 focus:ring-indigo-500 mt-1 font-sans italic"
                                                  rows={2}
                                                />
                                              ) : (
                                                order.notes
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Tab de Itens do Pedido */}
                                      <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-150 flex justify-between items-center">
                                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Itens do Pedido (
                                            {order.items?.length || 0})
                                          </h5>
                                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                            PDF Items Preview
                                          </span>
                                        </div>

                                        {/* Exibição Desktop (Tabela) */}
                                        <div className="hidden md:block overflow-x-auto">
                                          <table className="w-full text-left text-xs bg-white">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-150">
                                              <tr>
                                                <th className="p-3 font-bold">
                                                  CÓDIGO / SKU
                                                </th>
                                                <th className="p-3 font-bold">
                                                  DESCRIÇÃO DO ITEM
                                                </th>
                                                <th className="p-3 font-bold text-center">
                                                  COR/TAM
                                                </th>
                                                <th className="p-3 font-bold text-center">
                                                  UNIDADE
                                                </th>
                                                <th className="p-3 font-bold text-center">
                                                  QUANTIDADE
                                                </th>
                                                {hasFinanceAccess ? (
                                                  <>
                                                    <th className="p-3 font-bold text-right text-indigo-900">
                                                      VALOR UNIT.
                                                    </th>
                                                    <th className="p-3 font-bold text-right text-emerald-950">
                                                      VALOR TOTAL
                                                    </th>
                                                  </>
                                                ) : (
                                                  <th className="p-3 text-center text-slate-400 font-medium">
                                                    FINANCEIRO
                                                  </th>
                                                )}
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-150 text-slate-800">
                                              {order.items.map(
                                                (item: any, i2: number) => (
                                                  <tr
                                                    key={i2}
                                                    className="hover:bg-slate-50/40 transition-colors"
                                                  >
                                                    <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50/30">
                                                      {isEditing ? (
                                                        <input
                                                          type="text"
                                                          value={
                                                            item.itemCode || ""
                                                          }
                                                          onChange={(e) =>
                                                            handleUpdateExtractedOrderItem(
                                                              idx,
                                                              i2,
                                                              "itemCode",
                                                              e.target.value,
                                                            )
                                                          }
                                                          className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-24 focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      ) : (
                                                        item.itemCode || (
                                                          <span className="text-slate-400 italic font-normal">
                                                            S/ código
                                                          </span>
                                                        )
                                                      )}
                                                    </td>
                                                    <td className="p-3 font-semibold text-slate-900">
                                                      {isEditing ? (
                                                        <div className="relative">
                                                          <input
                                                            type="text"
                                                            value={
                                                              item.itemName || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "itemName",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-full focus:ring-1 focus:ring-indigo-500"
                                                          />
                                                          {/* Sugestão de Itens */}
                                                          {item.itemName && (() => {
                                                            const query = (item.itemName || "").toLowerCase().trim();
                                                            const minLen = 3;
                                                            if (query.length < minLen) return null;

                                                            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                            const normQuery = normalize(query);
                                                            
                                                            const scored = db.items.map((it) => {
                                                              const normName = normalize(`${it.code} - ${it.name}`);
                                                              let score = 0;
                                                              if (normName === normQuery) score = 2000;
                                                              else if (normName.includes(normQuery)) score = 1000;
                                                              else {
                                                                const queryWords = normQuery.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
                                                                const itemWords = normName.split(/[^a-z0-9]+/).filter(w => w.length >= 2);
                                                                let matchCount = 0;
                                                                for (const qWord of queryWords) {
                                                                  if (itemWords.some(iWord => iWord.includes(qWord) || qWord.includes(iWord))) matchCount++;
                                                                }
                                                                score = matchCount;
                                                              }
                                                              return { item: it, score };
                                                            });
                                                            
                                                            const matches = scored.filter(s => s.score > 0).sort((a,b) => b.score - a.score).map(s => s.item).slice(0, 5);
                                                            
                                                            // If exact match doesn't need suggestion logic (already matches code)
                                                            if (matches.length > 0 && matches[0].name.toUpperCase().trim() === (item.itemName||"").toUpperCase().trim()) return null;

                                                            return matches.length > 0 ? (
                                                              <div className="absolute left-0 right-0 top-full z-50 mt-1 flex flex-col gap-0.5 border border-slate-200 rounded p-1 bg-white shadow-lg w-full min-w-[250px] max-h-32 overflow-y-auto">
                                                                <span className="text-[9px] font-bold text-indigo-700 px-1 pt-0.5 uppercase tracking-wider block bg-indigo-50 leading-tight border-b">
                                                                  Sugestões baseadas no nome:
                                                                </span>
                                                                {matches.map((it) => (
                                                                  <button
                                                                    type="button"
                                                                    key={it.id}
                                                                    onClick={() => {
                                                                      handleUpdateExtractedOrderItem(idx, i2, "itemCode", it.code);
                                                                      handleUpdateExtractedOrderItem(idx, i2, "itemName", it.name);
                                                                    }}
                                                                    className="text-left text-[10px] px-1 py-1 rounded hover:bg-indigo-600 hover:text-white transition-colors bg-white font-medium text-slate-700 flex justify-between gap-2"
                                                                  >
                                                                    <span className="truncate">{it.name}</span>
                                                                    <span className="font-mono text-[8px] bg-slate-100 text-slate-600 px-1 rounded font-semibold shrink-0">
                                                                      {it.code}
                                                                    </span>
                                                                  </button>
                                                                ))}
                                                              </div>
                                                            ) : null;
                                                          })()}
                                                        </div>
                                                      ) : (
                                                        item.itemName
                                                      )}
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-650 text-center">
                                                      {isEditing ? (
                                                        <div className="flex gap-1 justify-center">
                                                          <select
                                                            value={
                                                              item.color || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "color",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-28 focus:ring-1 focus:ring-indigo-500"
                                                          >
                                                            <option value="">
                                                              Cor
                                                            </option>
                                                            <option value="-">
                                                              -
                                                            </option>
                                                            {Object.values(
                                                              COLOR_MAP,
                                                            ).map((cName) => (
                                                              <option
                                                                key={cName}
                                                                value={cName}
                                                              >
                                                                {cName}
                                                              </option>
                                                            ))}
                                                          </select>
                                                          <input
                                                            type="text"
                                                            placeholder="Tam"
                                                            value={
                                                              item.size || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "size",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-12 text-center focus:ring-1 focus:ring-indigo-500"
                                                          />
                                                        </div>
                                                      ) : (
                                                        `${item.color || "-"} / ${item.size || "-"}`
                                                      )}
                                                    </td>
                                                    <td className="p-3 font-bold text-slate-500 text-center">
                                                      {item.unit || "UN"}
                                                    </td>
                                                    <td className="p-3 font-black text-slate-900 text-center bg-indigo-50/10">
                                                      {isEditing ? (
                                                        <input
                                                          type="number"
                                                          value={
                                                            item.quantity ===
                                                            undefined
                                                              ? ""
                                                              : item.quantity
                                                          }
                                                          onChange={(e) =>
                                                            handleUpdateExtractedOrderItem(
                                                              idx,
                                                              i2,
                                                              "quantity",
                                                              e.target.value,
                                                            )
                                                          }
                                                          className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-16 text-center focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      ) : (
                                                        item.quantity
                                                      )}
                                                    </td>

                                                    {hasFinanceAccess ? (
                                                      <>
                                                        <td className="p-3 text-right font-semibold text-indigo-700 font-mono">
                                                          {isEditing ? (
                                                            <div className="flex items-center gap-1 justify-end">
                                                              <span>R$</span>
                                                              <input
                                                                type="number"
                                                                step="0.01"
                                                                value={
                                                                  item.unitPrice ===
                                                                  undefined
                                                                    ? ""
                                                                    : item.unitPrice
                                                                }
                                                                onChange={(e) =>
                                                                  handleUpdateExtractedOrderItem(
                                                                    idx,
                                                                    i2,
                                                                    "unitPrice",
                                                                    e.target
                                                                      .value,
                                                                  )
                                                                }
                                                                className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-16 text-right focus:ring-1 focus:ring-indigo-500"
                                                              />
                                                            </div>
                                                          ) : (
                                                            `R$ ${item.unitPrice ? Number(item.unitPrice).toFixed(2) : "0.00"}`
                                                          )}
                                                        </td>
                                                        <td className="p-3 text-right font-black text-emerald-750 font-mono">
                                                          R${" "}
                                                          {item.totalPrice
                                                            ? Number(
                                                                item.totalPrice,
                                                              ).toFixed(2)
                                                            : Number(
                                                                (item.unitPrice ||
                                                                  0) *
                                                                  (item.quantity ||
                                                                    1),
                                                              ).toFixed(2)}
                                                        </td>
                                                      </>
                                                    ) : (
                                                      <td className="p-3 text-center text-slate-400">
                                                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">
                                                          <Lock
                                                            size={10}
                                                            className="shrink-0"
                                                          />{" "}
                                                          Oculto (Representante)
                                                        </span>
                                                      </td>
                                                    )}
                                                  </tr>
                                                ),
                                              )}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Exibição Mobile (Lista Empilhada por Item) */}
                                        <div className="block md:hidden divide-y divide-slate-150">
                                          {order.items.map(
                                            (item: any, i2: number) => (
                                              <div
                                                key={i2}
                                                className="p-3.5 space-y-2 bg-slate-55/10 font-sans"
                                              >
                                                <div className="flex justify-between items-start">
                                                  <div className="min-w-0 pr-2">
                                                    <span className="text-[10px] font-mono font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                      SKU:{" "}
                                                      {item.itemCode ||
                                                        "S/ código"}
                                                    </span>
                                                    <h6 className="font-semibold text-slate-800 text-xs mt-1 leading-normal">
                                                      {item.itemName}
                                                    </h6>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <span className="block text-[9px] text-slate-400 font-bold uppercase">
                                                      Unidade
                                                    </span>
                                                    <span className="font-extrabold text-slate-700 text-xs">
                                                      {item.unit || "UN"}
                                                    </span>
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-slate-100 text-[11px]">
                                                  <div>
                                                    <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                      Qtd
                                                    </span>
                                                    <span className="font-extrabold text-slate-800">
                                                      {isEditing ? (
                                                        <input
                                                          type="number"
                                                          value={
                                                            item.quantity ===
                                                            undefined
                                                              ? ""
                                                              : item.quantity
                                                          }
                                                          onChange={(e) =>
                                                            handleUpdateExtractedOrderItem(
                                                              idx,
                                                              i2,
                                                              "quantity",
                                                              e.target.value,
                                                            )
                                                          }
                                                          className="bg-white border border-slate-300 text-slate-800 text-xs font-bold p-1 rounded w-16 text-center focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      ) : (
                                                        item.quantity
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                      Atributos
                                                    </span>
                                                    <span className="font-medium text-slate-600 truncate block max-w-full">
                                                      {isEditing ? (
                                                        <div className="flex gap-1 justify-center">
                                                          <select
                                                            value={
                                                              item.color || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "color",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-[10px] font-bold p-0.5 rounded w-20 focus:ring-1 focus:ring-indigo-500"
                                                          >
                                                            <option value="">
                                                              Cor
                                                            </option>
                                                            <option value="-">
                                                              -
                                                            </option>
                                                            {Object.values(
                                                              COLOR_MAP,
                                                            ).map((cName) => (
                                                              <option
                                                                key={cName}
                                                                value={cName}
                                                              >
                                                                {cName}
                                                              </option>
                                                            ))}
                                                          </select>
                                                          <input
                                                            type="text"
                                                            placeholder="Tam"
                                                            value={
                                                              item.size || ""
                                                            }
                                                            onChange={(e) =>
                                                              handleUpdateExtractedOrderItem(
                                                                idx,
                                                                i2,
                                                                "size",
                                                                e.target.value,
                                                              )
                                                            }
                                                            className="bg-white border border-slate-300 text-slate-800 text-[10px] font-bold p-0.5 rounded w-8 text-center focus:ring-1 focus:ring-indigo-500"
                                                          />
                                                        </div>
                                                      ) : (
                                                        `${item.color || "-"} / ${item.size || "-"}`
                                                      )}
                                                    </span>
                                                  </div>
                                                  {hasFinanceAccess ? (
                                                    <div className="text-right">
                                                      <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                        Total It.
                                                      </span>
                                                      <span className="font-black text-emerald-700 font-mono text-[10px] block">
                                                        R${" "}
                                                        {Number(
                                                          item.totalPrice ||
                                                            (item.unitPrice ||
                                                              0) *
                                                              (item.quantity ||
                                                                1),
                                                        ).toFixed(2)}
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <div className="text-right">
                                                      <span className="block text-[8px] text-slate-450 font-bold uppercase">
                                                        Valores
                                                      </span>
                                                      <span className="text-[9px] text-slate-400 font-bold inline-flex items-center gap-0.5 leading-normal">
                                                        <Lock size={9} />{" "}
                                                        Bloqueado
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>

                                      {/* Rodapé Interno do Acordeão */}
                                      <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-100 p-2.5 rounded-lg border border-slate-150">
                                        <span>
                                          Extração Auditada via Inteligência
                                          Artificial do Sistema
                                        </span>
                                        {hasFinanceAccess &&
                                        order.totalGrossValue &&
                                        order.totalValue ? (
                                          <span>
                                            Desconto estimado:{" "}
                                            {(
                                              ((order.totalGrossValue -
                                                order.totalValue) /
                                                order.totalGrossValue) *
                                              100
                                            ).toFixed(1)}
                                            %
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rodapé Fixo de Ação */}
                    <div className="px-5 py-4 border-t border-slate-150 bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                      {pdfExtractedOrders.length > 0 ? (
                        <div
                          id="import-footer-actions"
                          className="flex flex-col sm:flex-row justify-between items-center gap-3"
                        >
                          <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                            Total Geral pronto:{" "}
                            <strong className="text-indigo-600">
                              {pdfExtractedOrders.length} pedidos
                            </strong>
                            . Clique em "Confirmar" para que ingressem na base
                            de dados ativa do sistema.
                          </p>

                          <div className="flex gap-2 w-full sm:w-auto shrink-0">
                            <button
                              onClick={() => {
                                setPdfExtractedOrders([]);
                                setPdfImportResult(null);
                                setPdfImportProgress(0);
                                setEditingOrderIdx(null);
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition text-xs uppercase tracking-wider"
                            >
                              Cancelar e Reenviar
                            </button>
                            <button
                              onClick={handleConfirmPdfImport}
                              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-2 rounded-lg shadow-md hover:shadow transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={14} /> Confirmar Importação
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end text-xs text-slate-400 font-medium">
                          Status: Pronto para upload e processamento de arquivo
                        </div>
                      )}

                      {pdfImportProgress > 0 && (
                        <div className="mt-3 bg-indigo-50 border border-indigo-100 p-3 rounded-lg shadow-xs animate-pulse">
                          <div className="flex justify-between items-center text-[10px] font-black text-indigo-700 mb-1 uppercase tracking-wider">
                            <span>Gravando registros no banco de dados</span>
                            <span>{pdfImportProgress}%</span>
                          </div>
                          <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${pdfImportProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isExcelModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800">
                        Importação de Pedidos via Excel
                      </h3>
                      <button
                        onClick={() => setIsExcelModalOpen(false)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      Cole os dados diretamente do Excel. Ordens das colunas
                      esperadas:
                      <br />
                      <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs text-blue-800">
                        Código do Pedido | Cliente | Representante | Produto |
                        Cor | Tamanho | Variação | Quantidade | Data Entrega
                      </span>
                    </p>
                    <div className="mb-4">
                      <span className="text-xs text-gray-500">
                        * Mínimo exigido: Pedido, Cliente, Representante,
                        Produto. (A Quantidade assume 1 se vazia)
                      </span>
                    </div>

                    <textarea
                      value={excelData}
                      onChange={(e) => setExcelData(e.target.value)}
                      placeholder="Cole aqui as linhas do Excel..."
                      className="flex-1 w-full border border-gray-300 rounded p-3 min-h-[200px] text-sm overflow-auto focus:outline-[#107c41] font-mono whitespace-pre"
                    />

                    {excelImportResult && (
                      <div
                        className={`mt-4 p-3 rounded text-sm font-semibold flex flex-col gap-2 ${excelImportResult.includes("Processando") ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700 border border-green-200"}`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{excelImportResult}</span>
                          {excelImportResult.includes("Processando") && (
                            <span className="text-xs font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                              {excelImportProgress}%
                            </span>
                          )}
                        </div>
                        {excelImportResult.includes("Processando") && (
                          <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                              style={{ width: `${excelImportProgress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 shrink-0">
                      <button
                        onClick={() => setIsExcelModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleImportExcel}
                        disabled={!excelData.trim() || !!excelImportResult}
                        className="bg-[#107c41] hover:bg-[#185c37] text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50"
                      >
                        Confirmar Importação
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isDeduplicateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
                  <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <span className="text-xl">🧹</span>
                        <h3 className="text-lg font-extrabold tracking-tight text-slate-800">
                          Diagnóstico e Higienização de Duplicidades
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setIsDeduplicateModalOpen(false);
                          setCleanupResult(null);
                        }}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer transition"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 text-sm text-slate-600 space-y-4 scrollbar-thin">
                      {cleanupResult ? (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-5 flex flex-col gap-2 shadow-sm">
                          <h4 className="font-bold text-base flex items-center gap-2">
                            ✅ Limpeza Estrutural Concluída!
                          </h4>
                          <p className="text-sm leading-relaxed">
                            {cleanupResult}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 leading-relaxed text-slate-700">
                            <strong className="text-slate-900 font-bold text-xs uppercase block mb-1">
                              📝 Regra de Deduplicação Adotada:
                            </strong>
                            <span className="text-xs">
                              Mapeamos itens repetidos que compartilham o mesmo{" "}
                              <strong>Código do Pedido</strong>,{" "}
                              <strong>ID do Produto (Catálogo)</strong>,{" "}
                              <strong>Cor</strong>, <strong>Tamanho</strong>,{" "}
                              <strong>Variação</strong> e{" "}
                              <strong>Quantidade</strong>. Para preservar a
                              consistência, mantemos intacto o registro com o{" "}
                              <strong>
                                maior progresso na linha de produção
                              </strong>{" "}
                              (quantidade cortada, pintada, embalada ou
                              faturada) ou de criação mais antiga, removendo
                              apenas os registros duplicados excedentes. Itens
                              distintos dentro de um mesmo pedido nunca são
                              tocados.
                            </span>
                          </div>

                          {(() => {
                            const diag = getDuplicatesDiagnostic();
                            if (diag.totalDuplicatesCount === 0) {
                              return (
                                <div className="text-center py-8 flex flex-col items-center justify-center gap-2">
                                  <span className="text-4xl">🌟</span>
                                  <h4 className="font-bold text-slate-800 text-base">
                                    Sua base de dados está 100% limpa!
                                  </h4>
                                  <p className="text-xs text-slate-500 max-w-sm">
                                    Nenhum item duplicado ou redundante foi
                                    localizado nos pedidos ativos do sistema.
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-3">
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-805 rounded-lg flex flex-col gap-0.5 shadow-3xs">
                                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                    ⚠️ DIAGNÓSTICO ENCONTRADO
                                  </span>
                                  <p className="text-sm font-semibold text-amber-900">
                                    Foram identificados{" "}
                                    <strong>
                                      {diag.totalDuplicatesCount} itens
                                      duplicados
                                    </strong>{" "}
                                    redundantes distribuídos por um total de{" "}
                                    <strong>
                                      {diag.affectedOrdersCount} pedidos
                                    </strong>{" "}
                                    afetados.
                                  </p>
                                </div>

                                <div className="border border-slate-100 rounded-lg overflow-hidden shrink-0">
                                  <div className="bg-slate-104 px-3 py-2 text-[10px] font-bold text-slate-600 uppercase grid grid-cols-12 gap-1.5 border-b border-slate-100 bg-slate-100">
                                    <span className="col-span-3">
                                      Cód. Pedido
                                    </span>
                                    <span className="col-span-4">Produto</span>
                                    <span className="col-span-3">Cor/Tam</span>
                                    <span className="col-span-2 text-right">
                                      Duplicatas
                                    </span>
                                  </div>
                                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs bg-white scrollbar-thin">
                                    {diag.duplicates.map((dup, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-2 grid grid-cols-12 gap-1.5 text-slate-700 hover:bg-slate-50 transition"
                                      >
                                        <span className="col-span-3 font-semibold text-slate-900">
                                          {dup.orderCode}
                                        </span>
                                        <span className="col-span-4 truncate">
                                          {dup.itemName} ({dup.itemCode})
                                        </span>
                                        <span className="col-span-3 font-mono text-[11px] text-slate-500">
                                          {dup.color}/{dup.size}
                                        </span>
                                        <span className="col-span-2 text-right font-bold text-red-600 font-sans">
                                          +{dup.toDelete.length}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 shrink-0">
                      <button
                        onClick={() => {
                          setIsDeduplicateModalOpen(false);
                          setCleanupResult(null);
                        }}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition active:scale-95"
                      >
                        {cleanupResult ? "Fechar" : "Cancelar"}
                      </button>

                      {!cleanupResult &&
                        getDuplicatesDiagnostic().totalDuplicatesCount > 0 && (
                          <button
                            onClick={handleExecuteDeduplication}
                            disabled={isCleaningUp}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            {isCleaningUp
                              ? "Higienizando base..."
                              : `Executar Limpeza Segura (${getDuplicatesDiagnostic().totalDuplicatesCount} registros)`}
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {(isFormVisible || editingId) && (
                <div className={`${editingId ? "flex-1 min-h-0 overflow-y-auto mb-2 custom-scrollbar pr-3 pb-2 flex flex-col gap-4 mt-4" : "max-h-[55vh] overflow-y-auto pr-1 sm:pr-2 flex flex-col gap-3.5 mt-2 animate-in slide-in-from-top-4 fade-in duration-200 scrollbar-thin"}`}>
                  {/* Row 1: Identification & client info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Código do Pedido
                      </label>
                      <input
                        value={orderCode}
                        onChange={(e) => setOrderCode(e.target.value)}
                        placeholder="Ex: PED-001"
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Cliente
                      </label>
                      <input
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setCustomerSelected(false);
                        }}
                        placeholder="Buscar ou Digitar Cliente"
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                      />
                      {!customerSelected &&
                        customerName.trim().length > 0 &&
                        (() => {
                          const query = customerName.toLowerCase();
                          const matches = db.customers
                            .filter(
                              (c) =>
                                String(c.id).includes(query) ||
                                (c.name || "").toLowerCase().includes(query) ||
                                (c.tradeName || "")
                                  .toLowerCase()
                                  .includes(query),
                            )
                            .slice(0, 10);

                          if (matches.length === 0) return null;

                          return (
                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-40 overflow-y-auto w-full">
                              {matches.map((c) => {
                                const hasTrade =
                                  c.tradeName && c.tradeName !== c.name;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setCustomerName(c.tradeName ? `${c.id} - ${c.tradeName}` : `${c.id} - ${c.name}`);
                                      setCustomerSelected(true);
                                    }}
                                    className="w-full text-left p-2 hover:bg-indigo-50 text-[11px] border-b border-slate-100 last:border-0 flex flex-col gap-0.5"
                                  >
                                    <span className="font-bold text-slate-800">
                                      {c.id} - {c.name}
                                    </span>
                                    {hasTrade && (
                                      <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100/50 px-1 py-0.5 rounded self-start">
                                        Fantasia: {c.tradeName}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Representante
                      </label>
                      <select
                        value={representativeName}
                        onChange={(e) => setRepresentativeName(e.target.value)}
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="">Nenhum (Opcional)</option>
                        {db.users
                          .filter((u: User) => u.role === "REPRESENTANTE")
                          .map((u: User) => (
                            <option key={u.id} value={u.name}>
                              {u.name}
                            </option>
                          ))}
                        <option value="Lilian Representante">Lilian Representante</option>
                        <option value="Angelo Representante">Angelo Representante</option>
                        <option value="Pedidos LOJA Imperio">Pedidos LOJA Imperio</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 1B: Billing Rules & Payment Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Regra de Pagamento / Histórico
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBillingRule("cadastro")}
                          className={`flex-1 py-1 px-2 border rounded text-[10px] font-bold transition ${
                            billingRule === "cadastro"
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          Manual / Cadastro
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingRule("ultimo_pedido")}
                          className={`flex-1 py-1 px-2 border rounded text-[10px] font-bold transition ${
                            billingRule === "ultimo_pedido"
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                          }`}
                          title={
                            lastOrderForClient
                              ? `Último pedido: ${lastOrderForClient.paymentCondition}`
                              : "Nenhum pedido anterior localizado"
                          }
                        >
                          Repetir Último Pedido
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                          Condição / Forma
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={paymentType}
                            onChange={(e) => {
                              setPaymentType(e.target.value as any);
                              if (e.target.value !== "outro") {
                                setCustomPaymentCondition("");
                              }
                            }}
                            className="border border-slate-300 text-[10px] p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="boleto">Boleto Bancário</option>
                            <option value="pix">PIX</option>
                            <option value="deposito">Depósito em Conta</option>
                            <option value="carteira">Carteira</option>
                            <option value="outro">-- Outra Forma --</option>
                          </select>
                          {paymentType === "outro" && (
                            <input
                              type="text"
                              value={customPaymentCondition}
                              onChange={(e) =>
                                setCustomPaymentCondition(e.target.value)
                              }
                              placeholder="Especifique a opção"
                              className="border border-slate-300 text-[10px] p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 w-1/3">
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                          Prazos
                        </label>
                        <input
                          type="text"
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                          placeholder="Ex: 30/60/90"
                          className="border border-slate-300 text-[10px] p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Item Select & Attributes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-0.5 relative md:col-span-1">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Item / Produto
                      </label>
                      <input
                        type="text"
                        placeholder="Digitar código ou nome..."
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-850 placeholder-slate-400 font-medium"
                        value={orderItemSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOrderItemSearch(val);
                          const found = db.items.find(
                            (it) =>
                              `${it.code} - ${it.name}`.toLowerCase() ===
                              val.trim().toLowerCase(),
                          );
                          if (found) {
                            setItemId(found.id);
                          } else {
                            setItemId("");
                          }
                        }}
                      />

                      {!itemId &&
                        (orderItemSearch.trim().length > 0 ||
                          (customerName.trim().length > 0 &&
                            clientMostBoughtItems.length > 0)) && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 flex flex-col gap-0.5 border border-slate-200 rounded-lg p-1 bg-white shadow-lg max-h-36 overflow-y-auto w-full">
                            <span className="text-[9px] font-bold text-indigo-700 px-2 pt-0.5 uppercase tracking-wider block bg-indigo-50 py-1 border-b">
                              {orderItemSearch.trim().length === 0 &&
                              clientMostBoughtItems.length > 0
                                ? "⭐ Itens mais comprados por este cliente:"
                                : "Catálogo de itens:"}
                            </span>
                            {suggestedOrderItems.length === 0 ? (
                              <span className="text-[10px] text-gray-500 px-2 py-1">
                                Nenhum item correspondente.
                              </span>
                            ) : (
                              suggestedOrderItems.map((it) => (
                                <button
                                  type="button"
                                  key={it.id}
                                  onClick={() => {
                                    setOrderItemSearch(
                                      `${it.code} - ${it.name}`,
                                    );
                                    setItemId(it.id);
                                  }}
                                  className="text-left text-[11px] px-2 py-1 rounded hover:bg-indigo-600 hover:text-white transition-colors bg-white border border-slate-100 font-medium text-slate-700 flex items-center justify-between"
                                >
                                  <span className="truncate pr-1 flex items-center gap-1.5 flex-wrap">
                                    <span>{it.name}</span>
                                    {clientBoughtStatsMap[it.id] !==
                                      undefined && (
                                      <span className="text-[7.5px] sm:text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded-sm shrink-0">
                                        ⭐ {clientBoughtStatsMap[it.id]} un.
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-semibold shrink-0">
                                    {it.code}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}

                      {itemId && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded p-1.5 mt-1">
                          <span className="text-[10px] text-emerald-800 font-bold truncate max-w-[80%]">
                            ✓ Selecionado:{" "}
                            {db.items.find((i) => i.id === itemId)?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setOrderItemSearch("");
                              setItemId("");
                            }}
                            className="text-emerald-700 hover:text-emerald-900 text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 rounded transition shrink-0"
                          >
                            Mudar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 md:col-span-2">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Atributos (Cor / Tamanho / Variação)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 font-medium"
                        >
                          <option value="">Cor (opcional)</option>
                          <option value="-">-</option>
                          {Object.values(COLOR_MAP).map((cName) => (
                            <option key={cName} value={cName}>
                              {cName}
                            </option>
                          ))}
                        </select>
                        <input
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="Tamanho"
                          className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-450 font-medium"
                        />
                        <input
                          value={variation}
                          onChange={(e) => setVariation(e.target.value)}
                          placeholder="Variação"
                          className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-450 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Quantities, dates, prices & stock status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Quantidade Total
                      </label>
                      <input
                        type="number"
                        value={totalQuantity}
                        onChange={(e) =>
                          setTotalQuantity(Number(e.target.value))
                        }
                        placeholder="Qtd de Peças"
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Preço Unitário (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-semibold text-[11px]">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) =>
                            setUnitPrice(
                              e.target.value ? parseFloat(e.target.value) : "",
                            )
                          }
                          placeholder="0,00"
                          className="border border-slate-300 text-xs pl-8 pr-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-800 placeholder-slate-400 font-medium"
                        />
                      </div>
                      {selectedItemObj &&
                        (selectedItemObj.basePrice ||
                          lastPrices.length > 0) && (
                          <div className="absolute top-full left-0 mt-1 bg-indigo-50 border border-indigo-200 shadow-md p-1.5 rounded text-[10px] text-indigo-800 z-10 w-full flex flex-col gap-1">
                            {selectedItemObj.basePrice && (
                              <div>
                                <span className="font-bold">Tabela:</span> R${" "}
                                {selectedItemObj.basePrice.toFixed(2)}
                              </div>
                            )}
                            {lastPrices.length > 0 && (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-700">
                                  Últimos Preços:
                                </span>
                                {lastPrices.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="text-slate-600 font-medium"
                                  >
                                    - R$ {p.toFixed(2)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                        Data Limite
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="border border-slate-300 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white text-slate-600 font-medium cursor-pointer"
                      />
                    </div>

                    {itemId && (
                      <div className="flex flex-col gap-0.5 justify-end">
                        <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 border border-emerald-150 rounded flex justify-between items-center h-[34px]">
                          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 truncate pr-1">
                            📦 Estoque Acabado:
                          </span>
                          <span className="font-bold font-mono">
                            {db.stocks.find(
                              (s) =>
                                s.id ===
                                `${itemId}|${color}|${size}|${variation}|ACABADO`,
                            )?.quantity || 0}{" "}
                            un
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 4: Config flags & status indicators */}
                  <div className="flex flex-wrap items-center gap-4 py-1.5 border-t border-b border-slate-100/80 my-1 justify-start">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="laserTerc"
                        checked={isThirdPartyLaser}
                        onChange={(e) => setIsThirdPartyLaser(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded bg-gray-100 border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label
                        htmlFor="laserTerc"
                        className="text-xs text-slate-700 font-semibold cursor-pointer select-none"
                      >
                        Laser Terceirizado
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isUrgent"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="w-4 h-4 text-red-650 rounded bg-red-50 border-red-200 focus:ring-red-500 cursor-pointer"
                      />
                      <label
                        htmlFor="isUrgent"
                        className="text-xs text-red-700 font-bold cursor-pointer select-none"
                      >
                        Pedido Urgente ⚠️
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isProgramacao"
                        checked={isProgramacao}
                        onChange={(e) => setIsProgramacao(e.target.checked)}
                        className="w-4 h-4 text-indigo-650 rounded bg-indigo-50 border-indigo-200 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label
                        htmlFor="isProgramacao"
                        className="text-xs text-indigo-700 font-bold cursor-pointer flex items-center gap-0.5 select-none"
                      >
                        📈 É Programação
                      </label>
                    </div>
                  </div>

                  {/* Products in this current order list section (multi product workflow) */}
                  <div className="flex flex-col gap-2 mt-1">
                    {!editingId && lineItems.length > 0 && (
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-lg flex flex-col gap-1.5 shadow-inner">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block border-b border-slate-200 pb-1">
                          Produtos neste Pedido ({lineItems.length}):
                        </span>
                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                          {lineItems.map((li, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs border-b border-slate-100 last:border-0 pb-1 pt-0.5 text-slate-700"
                            >
                              <span className="truncate pr-2">
                                <strong className="text-slate-800">
                                  {
                                    db.items.find((i) => i.id === li.itemId)
                                      ?.name
                                  }
                                </strong>{" "}
                                <span className="text-slate-500 font-mono text-[10px]">
                                  ({li.color} | {li.size} | {li.variation})
                                </span>{" "}
                                -{" "}
                                <span className="font-extrabold text-indigo-600">
                                  {li.totalQuantity} un
                                </span>
                              </span>
                              <div className="flex gap-1 shrink-0 items-center">
                                {li.unitPrice !== undefined && (
                                  <span className="text-indigo-700 font-semibold bg-indigo-50 px-1 py-0.5 rounded text-[9px] mr-1 border border-indigo-150">
                                    R$ {li.unitPrice.toFixed(2)} / un
                                  </span>
                                )}
                                {li.isUrgent && (
                                  <span className="bg-red-50 text-red-700 text-[9px] px-1 rounded font-bold border border-red-200">
                                    URG
                                  </span>
                                )}
                                {li.isProgramacao && (
                                  <span className="bg-indigo-50 text-indigo-700 text-[9px] px-1 rounded font-bold border border-indigo-150">
                                    PROG
                                  </span>
                                )}
                                {li.isThirdPartyLaser && (
                                  <span className="bg-blue-50 text-blue-700 text-[9px] px-1 rounded font-bold border border-blue-150">
                                    LASER
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-row gap-2.5 mt-1 shrink-0">
                      {!editingId && (
                        <button
                          type="button"
                          onClick={handleAddProductToOrder}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded shadow-xs transition text-xs disabled:opacity-40 leading-none"
                          disabled={!itemId || !totalQuantity}
                        >
                          + Outro Produto
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCadastrar}
                        className={`flex-1 ${
                          editingId
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-indigo-600 hover:bg-indigo-700"
                        } font-bold text-white py-2 rounded shadow-xs transition text-xs leading-none`}
                      >
                        {editingId ? "Salvar Alterações" : "Gerar Pedido"}
                      </button>
                    </div>
                  </div>

                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setIsFormVisible(false);
                        setOrderCode("");
                        setItemId("");
                        setOrderItemSearch("");
                        setCustomerName("");
                        setColor("");
                        setSize("");
                        setVariation("");
                        setTotalQuantity("");
                        setUnitPrice("");
                        setPaymentCondition("");
                        setPaymentTerms("");
                        setCustomPaymentCondition("");
                        setIsThirdPartyLaser(false);
                        setIsUrgent(false);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded shadow-xs transition text-xs leading-none mt-1 shrink-0"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>
          )}

          <div className="w-full flex-1 mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">Fluxo de Pedidos</h3>
              <button
                onClick={handleExportPDF}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1 px-3 rounded shadow transition"
              >
                Exportar PDF
              </button>
            </div>

            {/* SUB-ABAS DE STATUS DOS PEDIDOS */}
            <div className="flex rounded-lg overflow-hidden border border-indigo-600 mb-4 shrink-0 shadow-sm">
              <button
                type="button"
                className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${activeSubTab === "ABERTOS" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 hover:bg-indigo-50/20"}`}
                onClick={() => setActiveSubTab("ABERTOS")}
              >
                📋 Ativos (
                {
                  db.orders.filter(
                    (o) =>
                      o.status !== "FATURADO" &&
                      o.status !== "AGUARDANDO_APROVACAO",
                  ).length
                }
                )
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${activeSubTab === "APROVACAO" ? "bg-indigo-600 text-white animate-pulse" : "bg-white text-indigo-100 hover:bg-indigo-50/20"}`}
                onClick={() => setActiveSubTab("APROVACAO")}
                style={{
                  color: activeSubTab === "APROVACAO" ? "#fff" : "#4f46e5",
                }}
              >
                ⏳ Aprovação (
                {
                  db.orders.filter((o) => o.status === "AGUARDANDO_APROVACAO")
                    .length
                }
                )
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${activeSubTab === "FATURADOS" ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 hover:bg-indigo-50/20"}`}
                onClick={() => setActiveSubTab("FATURADOS")}
              >
                ✅ Faturados (
                <motion.span
                  key={`faturados-count-${db.orders.filter((o) => o.status === "FATURADO").length}`}
                  initial={{ scale: 1.5, color: "#10b981" }}
                  animate={{ scale: 1, color: "inherit" }}
                  transition={{ duration: 0.5 }}
                  className="inline-block"
                >
                  {db.orders.filter((o) => o.status === "FATURADO").length}
                </motion.span>
                )
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <span>⚙️ Filtros de Exportação & Compilação</span>
                </div>
                {(searchTerm || deliveryDateStart || deliveryDateEnd || filterCustomer || filterStatus || filterUrgentOnly || filterLaserOnly) && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setDeliveryDateStart("");
                      setDeliveryDateEnd("");
                      setFilterCustomer("");
                      setFilterStatus("");
                      setFilterUrgentOnly(false);
                      setFilterLaserOnly(false);
                    }}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-0.5"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Campo de Busca Geral */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Busca Geral</label>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Código ou Cliente..."
                    className="border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition text-slate-700 placeholder-slate-400"
                  />
                </div>

                {/* Campo de Cliente Específico */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cliente</label>
                  <input
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    placeholder="Filtrar por cliente..."
                    className="border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition text-slate-700 placeholder-slate-400"
                  />
                </div>

                {/* Filtro de Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Status do Item</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition text-slate-700"
                  >
                    <option value="">Todos os Status</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_PRODUCAO">Em Produção</option>
                    <option value="PRODUZIDO">Produzido</option>
                    <option value="EM_CORTE">Em Corte</option>
                    <option value="CORTADO">Cortado</option>
                    <option value="EM_PINTURA">Em Pintura</option>
                    <option value="PINTADO">Pintado</option>
                    <option value="EMBALANDO">Embalando</option>
                    <option value="EMBALADO">Embalado</option>
                    <option value="FATURADO_PARCIAL">Faturado Parcial</option>
                    <option value="FATURADO">Faturado</option>
                  </select>
                </div>

                {/* Filtro de Período de Entrega */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Prazo de Entrega (De / Até)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={deliveryDateStart}
                      onChange={(e) => setDeliveryDateStart(e.target.value)}
                      className="border border-slate-200 bg-white px-1.5 py-1 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500 transition text-slate-700 w-full"
                    />
                    <span className="text-[10px] font-bold text-slate-400">à</span>
                    <input
                      type="date"
                      value={deliveryDateEnd}
                      onChange={(e) => setDeliveryDateEnd(e.target.value)}
                      className="border border-slate-200 bg-white px-1.5 py-1 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-indigo-500 transition text-slate-700 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-1 pt-2 border-t border-slate-200/60">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterUrgentOnly}
                    onChange={(e) => setFilterUrgentOnly(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 transition cursor-pointer"
                  />
                  🚨 Apenas Urgentes
                </label>

                {(currentUser.id === "projetista_marcos" ||
                  currentUser.role === "PROJETISTA" ||
                  currentUser.role === "ADMIN") && (
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filterLaserOnly}
                      onChange={(e) => setFilterLaserOnly(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 transition cursor-pointer"
                    />
                    🎯 Apenas Laser (Pés, Chapas, Cortes)
                  </label>
                )}
              </div>
            </div>

            {/* Faturamento em Lote Panel */}
            {filteredOrders.some((o) => o.status === "EMBALADO") && (
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mb-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="batch-select-all"
                    className="w-4 h-4 text-indigo-600 border-gray-200 rounded cursor-pointer"
                    checked={
                      filteredOrders.filter((o) => o.status === "EMBALADO")
                        .length > 0 &&
                      filteredOrders
                        .filter((o) => o.status === "EMBALADO")
                        .every((o) => selectedBatchInvoiceIds.includes(o.id))
                    }
                    onChange={(e) => {
                      const embalados = filteredOrders.filter(
                        (o) => o.status === "EMBALADO",
                      );
                      if (e.target.checked) {
                        setSelectedBatchInvoiceIds((prev) => [
                          ...prev,
                          ...embalados
                            .map((o) => o.id)
                            .filter((id) => !prev.includes(id)),
                        ]);
                      } else {
                        setSelectedBatchInvoiceIds((prev) =>
                          prev.filter(
                            (id) => !embalados.some((o) => o.id === id),
                          ),
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor="batch-select-all"
                    className="text-xs font-bold text-indigo-950 uppercase cursor-pointer select-none"
                  >
                    Selecionar todos os Embalados (
                    {
                      filteredOrders.filter((o) => o.status === "EMBALADO")
                        .length
                    }
                    )
                  </label>
                </div>
                {selectedBatchInvoiceIds.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-100 border border-emerald-350 px-3 py-1.5 rounded-xl text-center shadow-xs">
                      <span className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider block leading-none">
                        Soma de Peças
                      </span>
                      <span className="text-xs font-black text-emerald-950 block mt-0.5 leading-none">
                        {batchTotalQty} un.
                      </span>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleBatchInvoice}
                      className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm hover:bg-emerald-700 transition"
                    >
                      💰 Faturar em Lote ({selectedBatchInvoiceIds.length})
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            {filteredOrders.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">
                Nenhum pedido encontrado nesta aba.
              </p>
            ) : (
              <div 
                ref={listContainerRef} 
                className="relative w-full"
                style={{ height: `${filteredOrders.length * 160}px` }}
              >
                {filteredOrders.slice(startIndex, endIndex).map((o, relativeIdx) => {
                  const absoluteIdx = startIndex + relativeIdx;
                  const item = db.items.find((i) => i.id === o.itemId);
                  const absoluteStyle = {
                    position: "absolute" as const,
                    top: `${absoluteIdx * 160}px`,
                    height: "152px",
                    left: 0,
                    right: 0,
                  };
                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      style={absoluteStyle}
                      className={`cursor-pointer p-4 border flex flex-col rounded shadow-sm gap-2 relative group transition-colors ${o.isUrgent ? "bg-red-50/90 hover:bg-red-100/90 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] ring-2 ring-red-500/10 animate-[pulse_3s_infinite] border-2" : "bg-white hover:bg-gray-50 border-gray-100 border-b-gray-200"}`}
                    >
                      {o.isUrgent && (
                        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                            URGENTE
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span
                          className={`font-bold ${o.isUrgent ? "text-red-900" : "text-gray-800"}`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {o.status === "EMBALADO" && (
                              <input
                                type="checkbox"
                                checked={selectedBatchInvoiceIds.includes(o.id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBatchInvoiceIds([
                                      ...selectedBatchInvoiceIds,
                                      o.id,
                                    ]);
                                  } else {
                                    setSelectedBatchInvoiceIds(
                                      selectedBatchInvoiceIds.filter(
                                        (id) => id !== o.id,
                                      ),
                                    );
                                  }
                                }}
                                className="w-4.5 h-4.5 mr-2 border-gray-300 rounded cursor-pointer shrink-0"
                              />
                            )}
                            {o.isUrgent && (
                              <AlertCircle
                                className="text-red-600 shrink-0"
                                size={18}
                              />
                            )}
                            {o.orderCode} - {item?.name || "Desconhecido"}
                          </span>
                          {o.representativeName && (
                            <span className="text-[10px] font-normal text-slate-500 block">
                              Representante: {o.representativeName}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {o.status || "PENDENTE"}
                          </span>
                          <div className="flex gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${(o.packedQuantity || 0) >= (o.totalQuantity || 0) ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                              title="Embalado / Total"
                            >
                              Emb: {o.packedQuantity || 0}/
                              {o.totalQuantity || 0}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${(o.invoicedQuantity || 0) >= (o.totalQuantity || 0) ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}
                              title={`Faturado: ${o.invoicedQuantity || 0}, Falta: ${o.totalQuantity - (o.invoicedQuantity || 0)}`}
                            >
                              Fat: {o.invoicedQuantity || 0}/
                              {o.totalQuantity || 0}
                            </span>
                          </div>
                          {o.status === "AGUARDANDO_APROVACAO" ? (
                            <div className="flex items-center gap-2">
                              {(currentUser.role === "ADMIN" ||
                                currentUser.role === "PCP") && (
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveOrder(o);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition"
                                  >
                                    ✓ Aprovar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectOrder(o.id);
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition"
                                  >
                                    𐄂 Recusar
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            (currentUser.role === "ADMIN" ||
                              currentUser.role === "PCP") && (
                              <div className="flex items-center gap-2">
                                {(Math.max(
                                  o.packedQuantity || 0,
                                  o.producedQuantity || 0,
                                ) -
                                  (o.invoicedQuantity || 0) >
                                  0 ||
                                  ((o.status === "EMBALADO" ||
                                    o.status === "EM_PRODUCAO") &&
                                    (o.invoicedQuantity || 0) <
                                      o.totalQuantity)) && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const availableToInvoice =
                                        o.status === "EMBALADO" ||
                                        o.status === "EM_PRODUCAO"
                                          ? o.totalQuantity -
                                            (o.invoicedQuantity || 0)
                                          : Math.max(
                                              o.packedQuantity || 0,
                                              o.producedQuantity || 0,
                                            ) - (o.invoicedQuantity || 0);
                                      const maxToInvoice =
                                        o.totalQuantity -
                                        (o.invoicedQuantity || 0);

                                      const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
                                      const physicalStock =
                                        db.stocks.find((s) => s.id === stockId)
                                          ?.quantity || 0;

                                      const defaultLimit = Math.min(
                                        availableToInvoice,
                                        maxToInvoice,
                                      );
                                      const limit = Math.max(
                                        defaultLimit,
                                        physicalStock,
                                      );
                                      setInvoiceModalData({ order: o, limit });
                                      setInvoiceInput(String(limit));
                                    }}
                                    className="bg-emerald-600 text-white font-bold text-xs px-2 py-1 rounded hover:bg-emerald-700 mr-2 transition-colors"
                                    title="Faturar Pedido"
                                  >
                                    Faturar
                                  </motion.button>
                                )}
                                {(currentUser.role === "PCP" ||
                                  currentUser.role === "ADMIN" ||
                                  currentUser.role === "GERENCIA") && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(o);
                                    }}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="Editar"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                )}
                                {(currentUser.role === "PCP" ||
                                  currentUser.role === "ADMIN" ||
                                  currentUser.role === "GERENCIA") && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(o.id);
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                    title="Excluir"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span>Cliente: {o.customerName}</span>
                          <span>
                            Entrega:{" "}
                            {o.deliveryDate
                              ? new Date(o.deliveryDate).toLocaleDateString(
                                  "pt-BR",
                                  {
                                    timeZone: "UTC",
                                  },
                                )
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span>
                            Cor: {o.color || "-"} | Tamanho: {o.size || "-"} |
                            Var: {o.variation || "-"}
                          </span>
                        </div>
                        {o.isThirdPartyLaser && (
                          <span className="text-pink-600 font-semibold text-xs bg-pink-50 px-2 py-1 rounded inline-block w-fit mt-1">
                            Corte a Laser Terceirizado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200/50 p-2 sm:p-3 mt-1 text-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 mb-3 shrink-0">
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">
                Status e Prazos dos Pedidos Agrupados
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Filtre por prazos de entrega e gerencie o progresso de cada item
              </p>
            </div>

            <div className="w-full md:w-auto flex flex-col xl:flex-row items-stretch xl:items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por Código, Cliente ou Produto..."
                  className="w-full border border-slate-200 text-[11px] font-semibold rounded-lg p-1.5 pl-3 pr-7 bg-white text-slate-700 placeholder-slate-400 focus:outline-indigo-500 shadow-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Limpar pesquisa"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-white border border-slate-200 shadow-xs rounded-lg px-2 overflow-hidden h-[30px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">De</span>
                  <input
                    type="date"
                    value={deliveryDateStart}
                    onChange={(e) => setDeliveryDateStart(e.target.value)}
                    className="bg-transparent text-[11px] text-slate-700 font-medium outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center bg-white border border-slate-200 shadow-xs rounded-lg px-2 overflow-hidden h-[30px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Até</span>
                  <input
                    type="date"
                    value={deliveryDateEnd}
                    onChange={(e) => setDeliveryDateEnd(e.target.value)}
                    className="bg-transparent text-[11px] text-slate-700 font-medium outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="relative shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="flex items-center gap-1.5 border border-slate-200 text-[11px] font-bold rounded-lg p-1.5 px-2.5 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs select-none"
                >
                  <Filter
                    size={12}
                    className={
                      filterDeadlines.length < 5 ||
                      filterBatchState !== "TODOS" ||
                      filterNotInvoicedOnly ||
                      deliveryDateStart || deliveryDateEnd
                        ? "text-indigo-600 animate-pulse"
                        : "text-slate-500"
                    }
                  />
                  <span>Filtros</span>
                  {(filterDeadlines.length < 5 ? 1 : 0) +
                    (filterBatchState !== "TODOS" ? 1 : 0) +
                    (filterNotInvoicedOnly ? 1 : 0) +
                    (deliveryDateStart || deliveryDateEnd ? 1 : 0) >
                    0 && (
                    <span className="bg-indigo-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                      {(filterDeadlines.length < 5 ? 1 : 0) +
                        (filterBatchState !== "TODOS" ? 1 : 0) +
                        (filterNotInvoicedOnly ? 1 : 0) +
                        (deliveryDateStart || deliveryDateEnd ? 1 : 0)}
                    </span>
                  )}
                  <ChevronDown size={12} className="text-slate-400" />
                </button>

                {isFilterDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setIsFilterDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 z-40 flex flex-col gap-3 text-slate-850 text-left">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                          Filtrar Pedidos
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterDeadlines([
                              "NO_PRAZO",
                              "RISCO",
                              "ATRASADO",
                              "SEM_PRAZO",
                              "FATURADO",
                            ]);
                            setFilterBatchState("TODOS");
                            setFilterNotInvoicedOnly(false);
                            setDeliveryDateStart("");
                            setDeliveryDateEnd("");
                          }}
                          className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>

                      {/* Section 1: Prazos / Entrega */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                            Prazos / Entrega
                          </label>
                          <div className="flex gap-1.5 text-[8px] font-semibold text-slate-500 uppercase">
                            <button
                              type="button"
                              onClick={() =>
                                setFilterDeadlines([
                                  "NO_PRAZO",
                                  "RISCO",
                                  "ATRASADO",
                                  "SEM_PRAZO",
                                  "FATURADO",
                                ])
                              }
                              className="hover:text-indigo-600"
                            >
                              Tudo
                            </button>
                            <span>|</span>
                            <button
                              type="button"
                              onClick={() => setFilterDeadlines([])}
                              className="hover:text-indigo-600"
                            >
                              Nenhum
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 pl-0.5 mt-1">
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("NO_PRAZO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("NO_PRAZO")
                                    ? prev.filter((x) => x !== "NO_PRAZO")
                                    : [...prev, "NO_PRAZO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>No Prazo (+ 2 dias)</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("RISCO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("RISCO")
                                    ? prev.filter((x) => x !== "RISCO")
                                    : [...prev, "RISCO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Risco de Atraso (Até 2 dias)</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("ATRASADO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("ATRASADO")
                                    ? prev.filter((x) => x !== "ATRASADO")
                                    : [...prev, "ATRASADO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Atrasado (Vencido)</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("SEM_PRAZO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("SEM_PRAZO")
                                    ? prev.filter((x) => x !== "SEM_PRAZO")
                                    : [...prev, "SEM_PRAZO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Sem data prazo</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("FATURADO_PARCIAL")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("FATURADO_PARCIAL")
                                    ? prev.filter((x) => x !== "FATURADO_PARCIAL")
                                    : [...prev, "FATURADO_PARCIAL"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Faturado Parcial</span>
                          </label>

                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                            <input
                              type="checkbox"
                              checked={filterDeadlines.includes("FATURADO")}
                              onChange={() => {
                                setFilterDeadlines((prev) =>
                                  prev.includes("FATURADO")
                                    ? prev.filter((x) => x !== "FATURADO")
                                    : [...prev, "FATURADO"],
                                );
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Faturado</span>
                          </label>
                        </div>
                      </div>

                      {/* Section 2: Vínculo */}
                      {(currentUser.role === "GERENCIA" ||
                        currentUser.role === "ADMIN" ||
                        currentUser.role === "PCP") && (
                        <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Vínculo de Lote
                          </label>
                          <select
                            value={filterBatchState.toString()}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (
                                val === "TODOS" ||
                                val === "COM_LOTE" ||
                                val === "SEM_LOTE"
                              ) {
                                setFilterBatchState(val);
                              } else {
                                setFilterBatchState(Number(val));
                              }
                            }}
                            className="w-full border border-slate-200 text-[11px] font-medium rounded p-1.5 bg-slate-50 text-slate-700 outline-none"
                          >
                            <option value="TODOS">Todos os Pedidos</option>
                            <option value="COM_LOTE">Com Lote Vinculado</option>
                            <option value="SEM_LOTE">Sem Lote Vinculado</option>
                            {db.productionBatches.map((b) => (
                              <option key={b.id} value={b.id.toString()}>
                                Lote: {b.name} ({b.status})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Section 3: Faturamento */}
                      <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          Faturamento
                        </label>
                        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-sm">
                          <input
                            type="checkbox"
                            checked={filterNotInvoicedOnly}
                            onChange={(e) =>
                              setFilterNotInvoicedOnly(e.target.checked)
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="flex items-center gap-1">
                            💸 Apenas Não Faturados
                          </span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {(filterDeadlines.length < 6 ? 1 : 0) +
            (filterBatchState !== "TODOS" ? 1 : 0) +
            (filterNotInvoicedOnly ? 1 : 0) +
            (deliveryDateStart || deliveryDateEnd ? 1 : 0) >
            0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2 mb-2 border-b border-slate-150 shrink-0">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mr-1">
                Filtros:
              </span>

              {filterDeadlines.length < 6 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-150/60 px-2 py-0.5 rounded-full shadow-2xs">
                  ⏰ Prazos ({filterDeadlines.length}/6)
                  <button
                    type="button"
                    onClick={() =>
                      setFilterDeadlines([
                        "NO_PRAZO",
                        "RISCO",
                        "ATRASADO",
                        "SEM_PRAZO",
                        "FATURADO",
                        "FATURADO_PARCIAL",
                      ])
                    }
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de prazos"
                  >
                    &times;
                  </button>
                </span>
              )}

              {filterBatchState !== "TODOS" && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-amber-50 text-amber-850 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                  🛠️ Filtro de Lote
                  <button
                    type="button"
                    onClick={() => setFilterBatchState("TODOS")}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de lote"
                  >
                    &times;
                  </button>
                </span>
              )}

              {filterNotInvoicedOnly && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-emerald-50 text-emerald-850 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                  💸 Não Faturados
                  <button
                    type="button"
                    onClick={() => setFilterNotInvoicedOnly(false)}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro não faturados"
                  >
                    &times;
                  </button>
                </span>
              )}

              {(deliveryDateStart || deliveryDateEnd) && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-blue-50 text-blue-850 border border-blue-200 px-2 py-0.5 rounded-full shadow-2xs">
                  🗓️ {(() => {
                    let label = "";
                    if (deliveryDateStart) {
                      const d1 = deliveryDateStart.split("-");
                      label += `${d1[2]}/${d1[1]}`;
                    }
                    if (deliveryDateStart && deliveryDateEnd) label += " - ";
                    if (deliveryDateEnd) {
                      const d2 = deliveryDateEnd.split("-");
                      label += `${d2[2]}/${d2[1]}`;
                    }
                    return label;
                  })()}
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryDateStart("");
                      setDeliveryDateEnd("");
                    }}
                    className="hover:text-red-500 font-extrabold text-[12px] leading-none ml-1 transition cursor-pointer"
                    title="Remover filtro de data"
                  >
                    &times;
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setFilterDeadlines([
                    "NO_PRAZO",
                    "RISCO",
                    "ATRASADO",
                    "SEM_PRAZO",
                    "FATURADO",
                  ]);
                  setFilterBatchState("TODOS");
                  setFilterNotInvoicedOnly(false);
                  setDeliveryDateStart("");
                  setDeliveryDateEnd("");
                }}
                className="text-[9px] font-black text-slate-400 hover:text-slate-650 uppercase tracking-widest ml-auto hover:underline cursor-pointer py-1"
              >
                Limpar Todos
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1">
            {groupedOrders.length === 0 ? (
              <p className="text-slate-500 text-center text-xs font-sans italic py-10 bg-white rounded-xl border border-dashed border-slate-200">
                Nenhum pedido condizente com os filtros selecionados.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pb-4">
                {groupedOrders.map(([code, orders]) => {
                  const firstOrder = orders[0];
                  const dStatus = getDeliveryStatus(firstOrder);
                  let badgeColor = "";
                  if (dStatus === "Atrasado") {
                    badgeColor =
                      "bg-red-50 text-red-700 border-red-200 animate-pulse font-semibold";
                  } else if (dStatus === "Com risco de atraso") {
                    badgeColor =
                      "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
                  } else if (dStatus === "No prazo") {
                    badgeColor =
                      "bg-emerald-50 text-emerald-800 border-emerald-250 font-medium";
                  } else if (dStatus === "Faturado") {
                    badgeColor =
                      "bg-purple-50 text-purple-700 border-purple-200 font-medium";
                  } else {
                    badgeColor = "bg-slate-50 text-slate-500 border-slate-200";
                  }

                  const clientObj = db.customers.find(
                    (c) =>
                      c.name.trim().toLowerCase() ===
                      firstOrder.customerName.trim().toLowerCase(),
                  );
                  const clientDisplayName = clientObj?.tradeName || firstOrder.customerName;
                  const clientCode = clientObj?.id || "-";

                  return (
                    <div
                      key={code}
                      onClick={() => setSelectedOrderCode(code)}
                      className="border border-slate-200 rounded-xl shadow-xs hover:shadow-md bg-white hover:-translate-y-0.5 transition-all p-2.5 sm:p-3 cursor-pointer shrink-0"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col min-w-0 bg-white">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 leading-tight">
                            Pedido: {code}
                          </h4>
                          <span className="text-[9px] sm:text-[10px] text-slate-700 font-semibold mt-0.5 truncate max-w-[210px]" title={firstOrder.customerName}>
                            Cliente: {clientDisplayName} <span className="ml-1 text-[8px] font-mono leading-none bg-slate-100 text-slate-500 font-extrabold px-1 rounded border border-slate-200 block sm:inline-block w-max mt-0.5 sm:mt-0">Cód: {clientCode}</span>
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-indigo-600 font-bold mt-1.5 bg-indigo-50/50 px-1.5 py-0.5 rounded w-max inline-block">
                            {orders.length}{" "}
                            {orders.length === 1 ? "Item" : "Itens"}
                          </span>

                          {(() => {
                            const statusCounts = orders.reduce((acc, o) => {
                              const effSt = (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity))
                                ? "FATURADO_PARCIAL"
                                : (o.status || "PENDENTE");
                              acc[effSt] = (acc[effSt] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);

                            const uniqueStatuses = Object.keys(statusCounts);
                            return (
                              <div className="flex flex-wrap gap-1 mt-2 max-w-[240px]">
                                {uniqueStatuses.map((st) => {
                                  let bgStyle = "bg-slate-100 text-slate-800 border-slate-200 text-[8px] sm:text-[9px]";
                                  if (st === "FATURADO_PARCIAL") {
                                    bgStyle = "bg-amber-100 text-amber-800 border-amber-250 font-bold shadow-3xs text-[8px] sm:text-[9px]";
                                  } else if (st === "FATURADO") {
                                    bgStyle = "bg-purple-100 text-purple-800 border-purple-250 font-semibold shadow-3xs text-[8px] sm:text-[9px]";
                                  } else if (st === "EM_PRODUCAO") {
                                    bgStyle = "bg-blue-100 text-blue-800 border-blue-200 text-[8px] sm:text-[9px]";
                                  } else if (st === "PRODUZIDO") {
                                    bgStyle = "bg-green-100 text-green-800 border-green-200 text-[8px] sm:text-[9px]";
                                  } else if (st === "EMBALADO") {
                                    bgStyle = "bg-emerald-100 text-emerald-800 border-emerald-250 text-[8px] sm:text-[9px]";
                                  }
                                  return (
                                    <span
                                      key={st}
                                      className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] border uppercase tracking-wider font-semibold whitespace-nowrap shadow-xs ${bgStyle}`}
                                    >
                                      {st.replace("_", " ")} ({statusCounts[st]})
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {firstOrder.deliveryDate && (
                            <>
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] border uppercase tracking-wider shrink-0 ${badgeColor}`}
                              >
                                {dStatus}
                              </span>
                              {(() => {
                                try {
                                  const dateParts = firstOrder.deliveryDate.split("T")[0].split("-");
                                  if (dateParts.length === 3) {
                                    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                                    const day = String(dateObj.getDate()).padStart(2, '0');
                                    const monthStr = dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase();
                                    const dateFormatted = `${day}/${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)}`;
                                    return (
                                      <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 rounded uppercase tracking-wider flex items-center gap-0.5 shrink-0 shadow-3xs">
                                        🗓️ {dateFormatted}
                                      </span>
                                    );
                                  }
                                } catch(e) {}
                                return null;
                              })()}
                            </>
                          )}
                          {currentUser.role !== "LEITURA" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrderGroup(code);
                              }}
                              className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg hover:text-rose-700 transition"
                              title="Excluir pedido completo"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Order Grouped Items Drawer / Modal */}
      {selectedOrderCode && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in z-50 animate-in fade-in zoom-in-95 duration-200"
          onClick={() => setSelectedOrderCode(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border"
          >
            <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800">
                  Detalhes do Pedido: {selectedOrderCode}
                </h3>
                {(() => {
                  const rawCustName = groupedOrders.find(
                    ([code]) => code === selectedOrderCode,
                  )?.[1][0]?.customerName || "";
                  const clientObj = db.customers.find(
                    (c) => c.name.toLowerCase().trim() === rawCustName.toLowerCase().trim()
                  );
                  const clientCode = clientObj?.id || "-";
                  const clientDisplayName = clientObj?.tradeName || rawCustName || "-";
                  return (
                    <span className="text-[10px] sm:text-xs text-slate-700 font-bold font-sans">
                      Cliente: {clientDisplayName} <span className="ml-1 text-[9px] font-mono leading-none bg-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded border border-indigo-200">Cód: {clientCode}</span>
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {currentUser.role !== "LEITURA" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReplicateGroup(selectedOrderCode)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 leading-none cursor-pointer"
                      title="Replicar todos os itens deste pedido"
                    >
                      <Copy size={13} /> Replicar Pedido
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrderGroup(selectedOrderCode)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-rose-550 shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 leading-none cursor-pointer"
                      title="Excluir todos os itens deste pedido"
                    >
                      <Trash2 size={13} /> Excluir Pedido Completo
                    </button>
                  </>
                )}
                {(currentUser.role === "ADMIN" ||
                  currentUser.role === "PCP" ||
                  currentUser.role === "GERENCIA") &&
                  (() => {
                    const orderItemsForCode = db.orders.filter(
                      (o) =>
                        o.orderCode === selectedOrderCode &&
                        o.isActive !== false &&
                        (o.invoicedQuantity || 0) < o.totalQuantity,
                    );
                    if (orderItemsForCode.length > 0) {
                      return (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() =>
                            handleInvoiceEntireOrder(selectedOrderCode)
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-550 shadow-xs hover:shadow-sm transition-all flex items-center gap-1 leading-none cursor-pointer"
                        >
                          💰 Faturar Pedido Inteiro
                        </motion.button>
                      );
                    }
                    return null;
                  })()}
                <button
                  type="button"
                  onClick={() => {
                    const group = groupedOrders.find(
                      ([code]) => code === selectedOrderCode,
                    )?.[1];
                    if (group && group[0]) {
                      window.dispatchEvent(
                        new CustomEvent("print-order", { detail: group[0] }),
                      );
                      setSelectedOrderCode(null);
                    }
                  }}
                  className="bg-indigo-605 hover:bg-slate-900 bg-slate-950 text-white font-extrabold text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-50 border-white/20 shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1 leading-none cursor-pointer"
                >
                  <Printer size={13} /> PDF do Pedido
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderCode(null)}
                  className="p-1 rounded-full hover:bg-slate-200 transition cursor-pointer"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-2.5 sm:gap-3 bg-slate-50/50">
              {groupedOrders
                .find(([code]) => code === selectedOrderCode)?.[1]
                .map((o) => {
                  const item = db.items.find((i) => i.id === o.itemId);

                  if (isUpdating === o.id) {
                    return (
                      <div
                        key={`skeleton-${o.id}`}
                        className="bg-white p-3 rounded-lg shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-pulse"
                      >
                        <div className="flex flex-col gap-2 w-full md:w-1/2">
                          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                          <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                        </div>
                        <div className="h-8 w-24 bg-slate-200 rounded-lg"></div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={o.id}
                      className="bg-white p-2.5 sm:p-3 rounded-xl shadow-xs border border-slate-150 flex flex-col gap-2.5 relative hover:border-indigo-150 transition-colors text-slate-800"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Item Thumbnail */}
                          {item?.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-slate-50 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100/60 flex items-center justify-center shrink-0 text-xs">
                              📦
                            </div>
                          )}
                          <div className="min-w-0 animate-in fade-in duration-300">
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm block truncate">
                              {item?.name || o.customProductName} <span className="ml-1 text-[9px] font-mono font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">Ref: {item?.code || o.itemId}</span>
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-450 font-mono mt-0.5 block">
                              {o.color || "-"} | {o.size || "-"} |{" "}
                              {o.variation || "-"}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap font-sans">
                              <span className="text-[8px] sm:text-[10px] text-indigo-650 font-bold bg-indigo-50 px-1.5 py-0.5 rounded leading-none">
                                Total: {o.totalQuantity || 0} un
                              </span>
                              <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                                Emb: {o.packedQuantity || 0} un
                              </span>
                              <span className="text-[8px] sm:text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                                Fat: {o.invoicedQuantity || 0} un
                              </span>
                              {(() => {
                                const batch = db.productionBatches.find((b) =>
                                  b.orderIds.includes(o.id),
                                );
                                if (batch) {
                                  return (
                                    <span className="text-[8px] sm:text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded leading-none border border-amber-200">
                                      Lote: {batch.name} ({batch.status})
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-none border border-slate-200">
                                    Sem Lote
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 select-none">
                          {(() => {
                            const itemEffSt = (o.status === "FATURADO_PARCIAL" || ((o.invoicedQuantity || 0) > 0 && (o.invoicedQuantity || 0) < o.totalQuantity))
                              ? "FATURADO_PARCIAL"
                              : (o.status || "PENDENTE");
                            return (
                              <span
                                className={`px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold border uppercase tracking-wider shrink-0 ${getStatusColor(itemEffSt)}`}
                              >
                                {itemEffSt.replace("_", " ")}
                              </span>
                            );
                          })()}

                          {/* Status Select Box */}
                          <select
                            value={o.status || "PENDENTE"}
                            disabled={currentUser.role === "LEITURA"}
                            onChange={(e) =>
                              handleStatusChange(o.id, e.target.value as any)
                            }
                            className="border border-slate-250 rounded-lg text-[10px] sm:text-[11px] font-semibold py-1 px-1.5 text-slate-700 bg-white focus:outline-indigo-500 cursor-pointer disabled:opacity-50 disabled:bg-slate-100 transition shadow-xs"
                          >
                            <option value="PENDENTE">Pendente</option>
                            <option value="EM_PRODUCAO">Em Produção</option>
                            <option value="PRODUZIDO">Produzido</option>
                            <option value="EM_CORTE">Em Corte</option>
                            <option value="CORTADO">Cortado</option>
                            <option value="EM_PINTURA">Em Pintura</option>
                            <option value="PINTADO">Pintado</option>
                            <option value="EMBALANDO">Embalando</option>
                            <option value="EMBALADO">Embalado</option>
                            <option value="FATURADO_PARCIAL">Faturado Parcial</option>
                            <option value="FATURADO">Faturado</option>
                          </select>

                          {/* Dynamic item-level Partial Invoicing trigger button inside detail view */}
                          {(currentUser.role === "ADMIN" ||
                            currentUser.role === "PCP" ||
                            currentUser.role === "GERENCIA") &&
                            (o.invoicedQuantity || 0) < o.totalQuantity && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
                                  const physicalStock =
                                    db.stocks.find((s) => s.id === stockId)
                                      ?.quantity || 0;
                                  const limit = Math.max(
                                    o.totalQuantity - (o.invoicedQuantity || 0),
                                    physicalStock,
                                  );
                                  setInvoiceModalData({ order: o, limit });
                                  setInvoiceInput(String(limit));
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] sm:text-[10px] px-2.5 py-1.5 rounded shadow-xs shrink-0 transition"
                                title="Faturamento Parcial"
                              >
                                Faturar
                              </button>
                            )}

                          {currentUser.role !== "LEITURA" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteIndividualOrder(
                                  o.id,
                                  selectedOrderCode,
                                )
                              }
                              className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition border border-transparent hover:border-rose-100 cursor-pointer shrink-0"
                              title="Excluir este item"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {(() => {
                        let label = "";
                        let qty = 0;
                        let color = "";
                        if (o.status === "EM_CORTE" || o.status === "CORTADO") {
                          label = "Cortado";
                          qty = o.cutQuantity || 0;
                          color = "bg-indigo-500";
                        } else if (
                          o.status === "EM_PRODUCAO" ||
                          o.status === "PRODUZIDO"
                        ) {
                          label = "Produzido / Zincado";
                          qty = o.producedQuantity || 0;
                          color = "bg-amber-500";
                        } else if (
                          o.status === "EM_PINTURA" ||
                          o.status === "PINTADO"
                        ) {
                          label = "Pintado";
                          qty = o.paintedQuantity || 0;
                          color = "bg-pink-500";
                        } else if (
                          o.status === "EMBALANDO" ||
                          o.status === "EMBALADO"
                        ) {
                          label = "Embalado";
                          qty = o.packedQuantity || 0;
                          color = "bg-emerald-500";
                        }

                        if (!label) return null;

                        const pct = Math.min(
                          100,
                          Math.round((qty / (o.totalQuantity || 1)) * 100),
                        );

                        return (
                          <div className="bg-white p-2 rounded border border-slate-100">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
                              <span>Progresso ({label})</span>
                              <span>
                                {qty} / {o.totalQuantity}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${color} transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Timeline / Cronograma Estimado de Produção */}
                      {(() => {
                        const itemAgendas = (db.productionAgendas || [])
                          .filter((a) => a.orderId === o.id)
                          .sort(
                            (a, b) =>
                              new Date(a.estimatedDate).getTime() -
                              new Date(b.estimatedDate).getTime(),
                          );

                        if (itemAgendas.length === 0) return null;

                        return (
                          <div className="w-full mt-1 pt-2 border-t border-slate-100">
                            <h4 className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              <span>⏱️</span> Cronograma de Produção Estimado
                            </h4>
                            <div className="flex items-center flex-wrap gap-1.5">
                              {itemAgendas.map((agenda, idx) => {
                                const sector = db.sectors.find(
                                  (s) => s.id === agenda.sectorId,
                                );
                                return (
                                  <div
                                    key={agenda.id}
                                    className="flex items-center gap-1 shrink-0"
                                  >
                                    <div className="flex flex-col border border-indigo-100 bg-indigo-50/20 rounded px-1.5 py-0.5 text-center min-w-[65px] transition-all hover:bg-indigo-50">
                                      <span
                                        className="text-[8px] font-extrabold text-indigo-900 truncate max-w-[70px] uppercase block"
                                        title={sector?.name || "Setor"}
                                      >
                                        {sector?.name || "Setor"}
                                      </span>
                                      <span className="text-[9px] font-mono text-indigo-600 font-bold block mt-0.5">
                                        {agenda.estimatedDate
                                          .split("-")
                                          .reverse()
                                          .join("/")}
                                      </span>
                                    </div>
                                    {idx < itemAgendas.length - 1 && (
                                      <span className="text-slate-300 text-[9px] font-bold">
                                        →
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3 flex items-center gap-2 flex-wrap">
                  Pedido: {selectedOrder.orderCode}
                  {selectedOrder.isUrgent && (
                    <span className="bg-red-100 text-red-850 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                      URGENTE
                    </span>
                  )}
                  {selectedOrder.isProgramacao && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                      📈 PROGRAMAÇÃO
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 font-medium pl-4 mt-1 bg-white">
                  Cliente: {selectedOrder.customerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(currentUser.role === "PCP" ||
                  currentUser.role === "ADMIN" ||
                  currentUser.role === "GERENCIA") && (
                  <>
                    <button
                      onClick={() => {
                        const orderToEdit = selectedOrder;
                        setSelectedOrder(null);
                        handleEdit(orderToEdit);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition shadow-sm cursor-pointer"
                      title="Editar Pedido"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => {
                        const orderToReplicate = selectedOrder;
                        setSelectedOrder(null);
                        handleReplicate(orderToReplicate);
                      }}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition shadow-sm cursor-pointer"
                      title="Replicar Pedido"
                    >
                      <Copy size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 cursor-pointer"
                >
                  <span className="font-bold px-1">X</span>
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-gray-50">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800 border-b pb-2">
                  Informações Adicionais
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-1">
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Produto
                    </span>
                    <span className="text-gray-800 font-semibold">
                      {db.items.find((i) => i.id === selectedOrder.itemId)
                        ?.name || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Quantidade Total
                    </span>
                    <span className="text-blue-700 font-bold">
                      {selectedOrder.totalQuantity} pçs
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Cor / Tamanho / Var
                    </span>
                    <span className="text-gray-700 font-mono">
                      {selectedOrder.color || "-"} / {selectedOrder.size || "-"}{" "}
                      / {selectedOrder.variation || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Data de Entrega
                    </span>
                    <span className="text-gray-700 font-semibold">
                      {selectedOrder.deliveryDate
                        ? new Date(
                            selectedOrder.deliveryDate,
                          ).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">
                  Linha do Tempo (Processamento)
                </h3>
                {(() => {
                  const orderLogs = db.logs
                    .filter((l) => l.orderId === selectedOrder.id)
                    .sort((a, b) => b.timestamp - a.timestamp);
                  return (
                    <div className="flex flex-col gap-3">
                      {orderLogs.map((log) => {
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
                            actionColor =
                              "bg-green-50 text-green-800 border bg-green-50 text-green-800";
                            actionQty = log.quantityPacked || 0;
                            break;
                          case "FATURAMENTO":
                            actionLabel = "Faturado";
                            actionColor = "bg-emerald-100 text-emerald-800";
                            actionQty = log.quantityInvoiced || 0;
                            break;
                        }

                        return (
                          <div
                            key={log.id}
                            className="flex gap-4 text-sm items-start border-b border-gray-100/50 pb-3 last:border-0 last:pb-0"
                          >
                            <div
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 w-28 text-center ${actionColor}`}
                            >
                              {actionLabel}
                            </div>
                            <div className="flex-1 min-w-0 text-gray-700">
                              <span className="font-bold text-gray-900">
                                +{actionQty}
                              </span>{" "}
                              un. por{" "}
                              <span className="font-semibold text-blue-700">
                                {db.users.find((u) => u.id === log.operatorId)
                                  ?.name || log.operatorId}
                              </span>
                              {log.durationMillis > 0 && (
                                <span className="text-gray-400 text-xs block font-mono mt-1">
                                  Tempo:{" "}
                                  {Math.round(log.durationMillis / 60000)} min
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono shrink-0 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleDateString()}{" "}
                              <br />{" "}
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex gap-4 text-sm items-start mt-2 border-t pt-3">
                        <div className="px-2 py-1 w-28 text-center rounded text-[10px] font-bold uppercase shrink-0 bg-purple-100 text-purple-800">
                          Inclusão
                        </div>
                        <div className="flex-1 min-w-0 text-gray-700">
                          <span className="font-bold text-gray-900">
                            {selectedOrder.totalQuantity}
                          </span>{" "}
                          un. (Sistema)
                        </div>
                        <div className="text-xs text-gray-400 font-mono shrink-0 whitespace-nowrap mt-1">
                          {new Date(
                            selectedOrder.createdAt,
                          ).toLocaleDateString()}{" "}
                          <br />{" "}
                          {new Date(selectedOrder.createdAt).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {invoiceModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-emerald-600 p-4 shrink-0">
              <h3 className="text-white font-bold text-lg">
                Confirmar Faturamento
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-gray-700">
                O faturamento irá deduzir peças do seu{" "}
                <strong className="text-gray-900 bg-gray-100 px-1 rounded">
                  estoque de itens acabados
                </strong>
                .
              </p>
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                  Pedido
                </span>
                <span className="font-bold text-gray-900">
                  {invoiceModalData.order.orderCode} -{" "}
                  {invoiceModalData.order.customerName}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600 font-bold uppercase">
                  Quantidade a Faturar (Máximo: {invoiceModalData.limit})
                </label>
                <input
                  type="number"
                  value={invoiceInput}
                  onChange={(e) => setInvoiceInput(e.target.value)}
                  className="border-2 border-emerald-500 rounded p-2 text-xl font-bold bg-emerald-50 focus:outline-none w-full"
                  max={invoiceModalData.limit}
                  min={1}
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setInvoiceModalData(null)}
                className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-200 rounded transition hidden sm:block"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmInvoice}
                className="flex-1 sm:flex-none px-6 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-md transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const handleSendFaturamentoEmail = async () => {
          if (!faturamentoWhatsAppShareData) return;
          setIsSendingEmail(true);
          setEmailDeliveryStatus(null);
          try {
            const response = await fetch("/api/send-invoice-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderCode: faturamentoWhatsAppShareData.orderCode,
                customerName: faturamentoWhatsAppShareData.customerName,
                deliveryDate: faturamentoWhatsAppShareData.deliveryDate,
                itemsText: `${faturamentoWhatsAppShareData.productDescription} - Qtd: ${faturamentoWhatsAppShareData.quantity}`,
                totalValue: faturamentoWhatsAppShareData.totalValue,
                recipientEmail: recipientEmailInput,
              }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
              setEmailDeliveryStatus({
                type: "success",
                text: `E-mail enviado com sucesso! (${data.mode === "smtp" ? "Enviado por SMTP Real" : "Log Simulado no Servidor"})`,
              });
            } else {
              setEmailDeliveryStatus({
                type: "error",
                text: `Falha ao enviar e-mail: ${data.error || "Erro desconhecido"}`,
              });
            }
          } catch (error: any) {
            setEmailDeliveryStatus({
              type: "error",
              text: `Erro de rede ao enviar e-mail: ${error?.message || String(error)}`,
            });
          } finally {
            setIsSendingEmail(false);
          }
        };

        if (!faturamentoWhatsAppShareData) return null;

        const dateStr = (() => {
          const date = new Date();
          const day = String(date.getDate()).padStart(2, "0");
          const months = [
            "Jan",
            "Fev",
            "Mar",
            "Abr",
            "Mai",
            "Jun",
            "Jul",
            "Ago",
            "Set",
            "Out",
            "Nov",
            "Dez",
          ];
          const month = months[date.getMonth()];
          const year = String(date.getFullYear()).slice(-2);
          return `${day}/${month}/${year}`;
        })();

        // Formatação final da mensagem
        const messageText = `*FATURAMENTO DE PEDIDO* 🚀

*Nº Pedido:* ${faturamentoWhatsAppShareData.orderCode}
*Cliente:* ${faturamentoWhatsAppShareData.customerName}
*Data Faturamento:* ${dateStr}

*Itens Enviados:*
• ${faturamentoWhatsAppShareData.productDescription} - Qtd: *${faturamentoWhatsAppShareData.quantity}*

_Mensagem do Sistema Império Jomarci_`;

        return (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs text-left">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
              <div className="bg-slate-900 text-[#00b14f] p-4 flex items-center justify-between border-b border-[#00b14f]/20">
                <div className="flex items-center gap-2">
                  <DollarSign size={22} className="text-[#00b14f]" />
                  <h3 className="font-bold text-base text-white">
                    Notificar Faturamento
                  </h3>
                </div>
                <span className="text-[9px] bg-[#00b14f]/15 text-[#00b14f] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Pedido #{faturamentoWhatsAppShareData.orderCode}
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4 text-gray-800 overflow-y-auto max-h-[70vh]">
                <p className="text-xs text-gray-500 font-medium">
                  Selecione as opções abaixo para comunicar o faturamento do
                  pedido{" "}
                  <strong>#{faturamentoWhatsAppShareData.orderCode}</strong> do
                  cliente{" "}
                  <strong>{faturamentoWhatsAppShareData.customerName}</strong>.
                </p>

                {/* EMAIL NOTIFICATION BLOCK */}
                <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 border-b border-slate-200/50 pb-1.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1">
                      📧 Notificação por E-mail
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                      E-mails (Cliente / Representante - Separar por vírgula)
                    </label>
                    <input
                      type="email"
                      value={recipientEmailInput}
                      placeholder="Ex: cliente@email.com, rep@email.com"
                      onChange={(e) => setRecipientEmailInput(e.target.value)}
                      className="w-full border p-2 text-xs rounded bg-white focus:ring-1 focus:ring-[#00b14f] outline-none text-gray-800 font-medium"
                    />
                  </div>

                  <div className="text-[9px] text-gray-400 font-medium leading-tight">
                    O e-mail será enviado de{" "}
                    <strong>gerencia.imperiojomarci@gmail.com</strong> com cópia
                    para <strong>imperiojomarci@gmail.com</strong>.
                  </div>

                  <button
                    type="button"
                    disabled={isSendingEmail || !recipientEmailInput.trim()}
                    onClick={handleSendFaturamentoEmail}
                    className="w-full py-1.5 bg-black hover:bg-zinc-800 text-white rounded text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingEmail
                      ? "Enviando e-mail..."
                      : "Enviar E-mail de Faturamento"}
                  </button>

                  {emailDeliveryStatus && (
                    <div
                      className={`p-2 rounded text-[11px] font-bold leading-tight ${
                        emailDeliveryStatus.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500"
                          : "bg-rose-50 text-rose-800 border-l-2 border-rose-500"
                      }`}
                    >
                      {emailDeliveryStatus.text}
                    </div>
                  )}
                </div>

                {/* WHATSAPP CONTAINER */}
                <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 border-b border-slate-200/50 pb-1.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1">
                      💬 Compartilhar pelo WhatsApp
                    </span>
                  </div>

                  {/* Campo Celular do Representante */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                      WhatsApp do Representante
                    </label>
                    <input
                      type="text"
                      value={faturamentoWhatsAppShareData.phone}
                      placeholder="Ex: 5511999998888"
                      onChange={(e) =>
                        setFaturamentoWhatsAppShareData((prev) =>
                          prev
                            ? {
                                ...prev,
                                phone: e.target.value.replace(/\D/g, ""),
                              }
                            : null,
                        )
                      }
                      className="w-full border p-2 text-xs font-mono rounded bg-white focus:ring-1 focus:ring-teal-500 outline-none text-gray-800"
                    />
                    {!faturamentoWhatsAppShareData.phone && (
                      <span className="text-[9px] text-amber-600 font-extrabold">
                        ⚠️ Insira o número do celular acima para enviar.
                      </span>
                    )}
                  </div>

                  {/* Preview da Mensagem */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                      Mensagem Copiada
                    </label>
                    <pre className="text-[10px] bg-slate-900 text-green-400 p-3 rounded font-mono overflow-x-auto whitespace-pre-wrap leading-tight select-all">
                      {messageText}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3.5 flex justify-end gap-2 border-t border-gray-150 shrink-0">
                <button
                  type="button"
                  onClick={() => setFaturamentoWhatsAppShareData(null)}
                  className="px-3.5 py-1.5 border rounded text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(messageText);
                    alert(
                      "Mensagem copiada com sucesso para a área de transferência!",
                    );
                  }}
                  className="px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-bold transition cursor-pointer"
                >
                  Copiar Mensagem
                </button>
                <button
                  type="button"
                  disabled={!faturamentoWhatsAppShareData.phone}
                  onClick={() => {
                    const clean = faturamentoWhatsAppShareData.phone.replace(
                      /\D/g,
                      "",
                    );
                    const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(messageText)}`;
                    window.open(url, "_blank");
                    setFaturamentoWhatsAppShareData(null);
                  }}
                  className="px-3.5 py-1.5 bg-[#00b14f] hover:bg-[#009e46] text-white rounded text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone size={13} className="text-white" /> Abrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {orderToastMessage && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-[200]">
          <div className="bg-white/20 p-1.5 rounded-full">
            <CheckCircle2 size={18} />
          </div>
          <span className="font-semibold text-sm">{orderToastMessage}</span>
        </div>
      )}
    </div>
  );
}

const getProductKey = (
  itemId: number,
  color: string,
  size: string,
  variation: string,
) => `${itemId}|${color}|${size}|${variation}`;

export function SVGQRCode({ data }: { data: string }) {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 29 29"
      className="bg-white p-1 rounded border border-gray-300"
    >
      <rect width="29" height="29" fill="white" />
      <rect x="0" y="0" width="7" height="7" fill="black" />
      <rect x="1" y="1" width="5" height="5" fill="white" />
      <rect x="2" y="2" width="3" height="3" fill="black" />
      <rect x="22" y="0" width="7" height="7" fill="black" />
      <rect x="23" y="1" width="5" height="5" fill="white" />
      <rect x="24" y="2" width="3" height="3" fill="black" />
      <rect x="0" y="22" width="7" height="7" fill="black" />
      <rect x="1" y="23" width="5" height="5" fill="white" />
      <rect x="2" y="24" width="3" height="3" fill="black" />
      <rect x="22" y="22" width="3" height="3" fill="black" />
      <rect x="8" y="1" width="1" height="1" fill="black" />
      <rect x="10" y="2" width="1" height="1" fill="black" />
      <rect x="12" y="0" width="1" height="1" fill="black" />
      <rect x="15" y="3" width="1" height="1" fill="black" />
      <rect x="18" y="1" width="2" height="1" fill="black" />
      <rect x="8" y="5" width="2" height="1" fill="black" />
      <rect x="11" y="4" width="1" height="1" fill="black" />
      <rect x="14" y="5" width="1" height="1" fill="black" />
      <rect x="16" y="4" width="2" height="2" fill="black" />
      <rect x="0" y="8" width="1" height="1" fill="black" />
      <rect x="2" y="10" width="1" height="1" fill="black" />
      <rect x="3" y="9" width="2" height="1" fill="black" />
      <rect x="5" y="12" width="1" height="1" fill="black" />
      <rect x="7" y="10" width="1" height="1" fill="black" />
      <rect x="9" y="8" width="2" height="1" fill="black" />
      <rect x="13" y="8" width="1" height="1" fill="black" />
      <rect x="15" y="9" width="1" height="1" fill="black" />
      <rect x="17" y="10" width="1" height="1" fill="black" />
      <rect x="19" y="8" width="1" height="1" fill="black" />
      <rect x="21" y="9" width="1" height="1" fill="black" />
      <rect x="25" y="8" width="1" height="1" fill="black" />
      <rect x="27" y="10" width="1" height="1" fill="black" />
      <rect x="9" y="12" width="1" height="1" fill="black" />
      <rect x="11" y="14" width="1" height="1" fill="black" />
      <rect x="14" y="12" width="2" height="1" fill="black" />
      <rect x="17" y="14" width="1" height="1" fill="black" />
      <rect x="19" y="13" width="1" height="1" fill="black" />
      <rect x="23" y="14" width="1" height="1" fill="black" />
      <rect x="26" y="12" width="2" height="1" fill="black" />
      <rect x="10" y="17" width="1" height="1" fill="black" />
      <rect x="12" y="18" width="2" height="1" fill="black" />
      <rect x="15" y="16" width="1" height="1" fill="black" />
      <rect x="18" y="19" width="1" height="1" fill="black" />
      <rect x="20" y="17" width="1" height="1" fill="black" />
      <rect x="24" y="18" width="2" height="1" fill="black" />
      <rect x="8" y="22" width="2" height="2" fill="black" />
      <rect x="11" y="24" width="1" height="1" fill="black" />
      <rect x="14" y="22" width="1" height="1" fill="black" />
      <rect x="16" y="25" width="2" height="1" fill="black" />
      <rect x="19" y="23" width="1" height="1" fill="black" />
    </svg>
  );
}

function parseInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-extrabold text-blue-700">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function parseCustomMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-sm font-bold mt-3 mb-1 text-gray-800">
          {parseInline(line.slice(4))}
        </h4>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li
          key={idx}
          className="ml-4 list-disc text-[13px] text-gray-700 leading-relaxed"
        >
          {parseInline(line.slice(2))}
        </li>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-2"></div>;
    }
    return (
      <p key={idx} className="text-[13px] text-gray-700 leading-relaxed">
        {parseInline(line)}
      </p>
    );
  });
}

interface InvoiceSuggestionsTabProps {
  db: any;
  setSelectedOrder: (order: any) => void;
  setInvoiceModalData: (data: any) => void;
  setInvoiceInput: (input: string) => void;
}

function InvoiceSuggestionsTab({
  db,
  setSelectedOrder,
  setInvoiceModalData,
  setInvoiceInput,
}: InvoiceSuggestionsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState("ALL");

  const getInvoiceSuggestions = () => {
    const candidates = db.orders.filter(
      (o: any) =>
        o.status !== "FATURADO" &&
        o.isActive !== false &&
        o.totalQuantity - (o.invoicedQuantity || 0) > 0,
    );

    const todayMs = new Date().setHours(12, 0, 0, 0);

    const getBaseRank = (o: any) => {
      const isProg = !!o.isProgramacao;
      const deliveryMs = o.deliveryDate
        ? new Date(o.deliveryDate).setUTCHours(12, 0, 0, 0)
        : Date.now();
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

    const simulatedStock: Record<string, number> = {};
    db.stocks.forEach((s: any) => {
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

      const coveragePercent =
        remainingQty > 0 ? (allocated / remainingQty) * 100 : 0;

      const isProg = !!o.isProgramacao;
      const deliveryMs = o.deliveryDate
        ? new Date(o.deliveryDate).setUTCHours(12, 0, 0, 0)
        : todayMs;
      const isLate = deliveryMs < todayMs;

      let tier = 5;
      let tierName = "Estoque Insuficiente";

      if (isProg) {
        tier = 1;
        tierName = "Pedido Programação";
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
        tierName,
      };
    });

    suggestions.sort((a, b) => {
      const tierOrder: Record<number, number> = {
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5,
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
  const fullStockCount = allSuggestions.filter(
    (s) => s.coveragePercent >= 100 && !s.isProg && !s.isLate,
  ).length;

  const filteredSuggestions = allSuggestions.filter((s) => {
    const item = db.items.find((i: any) => i.id === s.order.itemId);
    const searchStr =
      `${s.order.orderCode} ${s.order.customerName} ${item?.name || ""}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());

    if (selectedTierFilter === "ALL") return matchesSearch;
    if (selectedTierFilter === "PROG") return matchesSearch && s.isProg;
    if (selectedTierFilter === "LATE")
      return matchesSearch && s.isLate && !s.isProg;
    if (selectedTierFilter === "100")
      return (
        matchesSearch && s.coveragePercent >= 100 && !s.isProg && !s.isLate
      );
    if (selectedTierFilter === "70")
      return (
        matchesSearch &&
        s.coveragePercent >= 70 &&
        s.coveragePercent < 100 &&
        !s.isProg &&
        !s.isLate
      );
    if (selectedTierFilter === "LOW")
      return matchesSearch && s.coveragePercent < 70 && !s.isProg && !s.isLate;
    return matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto w-full flex flex-col gap-4">
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="font-extrabold text-indigo-950 text-base flex items-center gap-2">
          📊 Sugestão de Faturamento Induzido
        </h3>
        <p className="text-[11px] text-slate-500 mt-1">
          Lista dinâmica priorizada para apoiar a decisão de faturamento humana,
          cruzando prazos, programações e o estoque livre atual.
        </p>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg flex flex-col">
            <span className="text-xl">📈</span>
            <span className="text-[10px] text-indigo-750 font-bold uppercase tracking-wider mt-1">
              Programação
            </span>
            <span className="text-xl font-black text-indigo-950 mt-0.5">
              {progCount} un.
            </span>
          </div>
          <div className="bg-red-50/50 border border-red-100 p-3 rounded-lg flex flex-col">
            <span className="text-xl">⚠️</span>
            <span className="text-[10px] text-red-750 font-bold uppercase tracking-wider mt-1">
              Atrasados
            </span>
            <span className="text-xl font-black text-red-950 mt-0.5">
              {lateCount} un.
            </span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg flex flex-col">
            <span className="text-xl">✨</span>
            <span className="text-[10px] text-emerald-750 font-bold uppercase tracking-wider mt-1">
              100% Cobertos
            </span>
            <span className="text-xl font-black text-emerald-950 mt-0.5">
              {fullStockCount} un.
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col">
            <span className="text-xl">📦</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              Total Fila
            </span>
            <span className="text-xl font-black text-slate-900 mt-0.5">
              {allSuggestions.length} un.
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-lg border border-slate-100">
          <input
            type="text"
            placeholder="Buscar por código, cliente ou produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border p-2 rounded text-xs focus:ring-blue-500 bg-white"
          />
          <select
            value={selectedTierFilter}
            onChange={(e) => setSelectedTierFilter(e.target.value)}
            className="border p-2 rounded text-xs bg-white text-gray-700 cursor-pointer focus:ring-blue-500"
          >
            <option value="ALL">Todas as prioridades</option>
            <option value="PROG">📈 Apenas Programação</option>
            <option value="LATE">⚠️ Atrasados comuns</option>
            <option value="100">✨ Estoque 100% Coberto</option>
            <option value="70">🏠 Estoque Parcial (&gt;= 70%)</option>
            <option value="LOW">❌ Sem estoque mínimo (&lt; 70%)</option>
          </select>
        </div>

        {filteredSuggestions.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10 bg-white rounded-lg border border-dashed border-slate-200">
            Nenhuma sugestão encontrada para os filtros selecionados.
          </p>
        ) : (
          <div className="grid gap-3">
            {filteredSuggestions.map((s) => {
              const item = db.items.find((i: any) => i.id === s.order.itemId);
              const isEmbalado = s.order.status === "EMBALADO";

              let badgeBg = "bg-slate-100 text-slate-800 border-slate-200";
              let badgeLabel = s.tierName;
              let badgeIcon = "📦";

              if (s.isProg) {
                badgeBg = "bg-indigo-100 text-indigo-800 border-indigo-200";
                badgeLabel = "📈 PROGRAMAÇÃO";
                badgeIcon = "📈";
              } else if (s.isLate) {
                badgeBg = "bg-red-50/90 text-red-800 border-red-200";
                badgeLabel = "⚠️ ATRASADO";
                badgeIcon = "⚠️";
              } else if (s.coveragePercent >= 100) {
                badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-200";
                badgeLabel = "✨ ESTOQUE 100%";
                badgeIcon = "✨";
              } else if (s.coveragePercent >= 70) {
                badgeBg = "bg-amber-100 text-amber-850 border-yellow-200";
                badgeLabel = `🏠 PARCIAL (${Math.round(s.coveragePercent)}%)`;
                badgeIcon = "🏠";
              } else {
                badgeBg = "bg-gray-100 text-gray-500 border-gray-200";
                badgeLabel = `⏱️ INSUFICIENTE (${Math.round(s.coveragePercent)}%)`;
                badgeIcon = "⏱️";
              }

              return (
                <div
                  key={s.order.id}
                  className="bg-white p-4 rounded-lg border border-slate-150 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                  onClick={() => setSelectedOrder(s.order)}
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border flex items-center gap-1 ${badgeBg}`}
                      >
                        <span>{badgeIcon}</span> {badgeLabel}
                      </span>
                      {isEmbalado && (
                        <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">
                          Pronto p/ Faturar
                        </span>
                      )}
                      <span className="font-mono font-black text-slate-900 text-sm">
                        Pedido #{s.order.orderCode}
                      </span>
                    </div>

                    <span className="text-xs text-gray-500 font-semibold uppercase block tracking-wide mt-1">
                      Cliente:{" "}
                      <strong className="text-slate-800">
                        {s.order.customerName}
                      </strong>
                    </span>

                    <span className="text-xs text-slate-800 font-bold block">
                      Produto: {item?.name || "-"}{" "}
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded ml-1 font-normal">
                        {s.order.color || "-"} | {s.order.size || "-"} |{" "}
                        {s.order.variation || "-"}
                      </span>
                    </span>

                    {/* Stock progress */}
                    <div className="flex items-center gap-3 mt-1.5 w-full max-w-sm">
                      <div className="flex-1 bg-gray-150 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${s.coveragePercent >= 100 ? "bg-emerald-500" : s.coveragePercent >= 70 ? "bg-amber-500" : "bg-gray-400"}`}
                          style={{
                            width: `${Math.min(100, s.coveragePercent)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-705 whitespace-nowrap">
                        Alocado: {Math.round(s.allocated)} /{" "}
                        {Math.round(s.remainingQty)} un (
                        {Math.round(s.coveragePercent)}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-right self-stretch md:self-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <span className="text-xs text-slate-550 font-semibold">
                      Entrega:{" "}
                      <strong
                        className={
                          s.isLate
                            ? "text-red-600 animate-pulse font-extrabold"
                            : "text-slate-700 font-bold"
                        }
                      >
                        {s.order.deliveryDate
                          ? new Date(s.order.deliveryDate).toLocaleDateString(
                              "pt-BR",
                              { timeZone: "UTC" },
                            )
                          : "-"}
                      </strong>
                    </span>

                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(s.order);
                        }}
                        className="bg-slate-100 hover:bg-slate-205 text-slate-700 border border-slate-250 font-bold text-xs px-2.5 py-1 rounded transition"
                      >
                        Ver Ficha
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const availableToInvoice =
                            s.order.status === "EMBALADO" ||
                            s.order.status === "EM_PRODUCAO"
                              ? s.order.totalQuantity -
                                (s.order.invoicedQuantity || 0)
                              : Math.max(
                                  s.order.packedQuantity || 0,
                                  s.order.producedQuantity || 0,
                                ) - (s.order.invoicedQuantity || 0);
                          const maxToInvoice =
                            s.order.totalQuantity -
                            (s.order.invoicedQuantity || 0);
                          const stockId = `${s.order.itemId}|${s.order.color}|${s.order.size}|${s.order.variation}|ACABADO`;
                          const physicalStock =
                            db.stocks.find((st) => st.id === stockId)
                              ?.quantity || 0;
                          const limit = Math.max(
                            Math.max(
                              0,
                              Math.min(availableToInvoice, maxToInvoice),
                            ),
                            physicalStock,
                          );
                          setInvoiceModalData({ order: s.order, limit });
                          setInvoiceInput(String(limit));
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 rounded transition shadow-xs flex items-center gap-1"
                      >
                        💰 Faturar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminScreen({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [selectedItemId, setSelectedItemId] = useState<number | "ALL">("ALL");
  const [selectedSector, setSelectedSector] = useState<
    "ALL" | "CORTE_LASER" | "PRODUCAO" | "PINTURA" | "EMBALAGEM"
  >("ALL");
  const [activeTab, setActiveTab] = useState<
    | "PAINEL"
    | "MONITORAMENTO"
    | "CADASTROS"
    | "LOTES"
    | "FATURAMENTO"
    | "SUGESTAO"
    | "EVOLUCAO_EMBALAGEM"
    | "ETIQUETAS"
    | "GESTAO_PESSOAS"
  >("PAINEL");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [dailyProductionGoal, setDailyProductionGoal] = useState<number>(() => {
    const saved = localStorage.getItem("producao_daily_production_goal");
    return saved ? parseInt(saved, 10) : 3000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalInput, setTempGoalInput] = useState(String(dailyProductionGoal));

  // States to optimize the general panel order list rendering (eliminates UI freeze)
  const [panelOrdersSearch, setPanelOrdersSearch] = useState("");
  const [panelOrdersFilter, setPanelOrdersFilter] = useState<"ATIVOS" | "TODOS">("ATIVOS");
  const [panelOrdersLimit, setPanelOrdersLimit] = useState(12);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [invoiceModalData, setInvoiceModalData] = useState<{
    order: any;
    limit: number;
  } | null>(null);
  const [invoiceInput, setInvoiceInput] = useState("");

  const [adminWhatsAppShareData, setAdminWhatsAppShareData] = useState<{
    orderCode: string;
    customerName: string;
    productDescription: string;
    quantity: number;
    phone: string;
    representativeName: string;
  } | null>(null);

  const handleConfirmInvoice = () => {
    if (!invoiceModalData) return;
    const { order: o, limit } = invoiceModalData;
    const qty = parseInt(invoiceInput, 10);

    if (isNaN(qty) || qty <= 0 || qty > limit) {
      alert("Quantidade inválida. Deve ser maior que 0 e no máximo " + limit);
      return;
    }

    const stockId = `${o.itemId}|${o.color}|${o.size}|${o.variation}|ACABADO`;
    const existingStock = db.stocks.find((s) => s.id === stockId);

    if (existingStock && (existingStock.reservedQuantity || 0) > 0) {
      const alternateReservedOrders = db.orders.filter(
        (ord) =>
          ord.id !== o.id &&
          ord.itemId === o.itemId &&
          ord.color === o.color &&
          ord.size === o.size &&
          ord.variation === o.variation &&
          (ord.status === "PLANEJADO" || ord.status === "EMBALADO") &&
          ord.isActive,
      );

      if (alternateReservedOrders.length > 0) {
        const primaryResOrder = alternateReservedOrders[0];
        const confirmResult = window.confirm(
          `ALERTA POPUP - PRODUTO RESERVADO PARA OUTRO PEDIDO:\n\n` +
            `O produto que você está faturando contém unidades de estoque RESERVADAS para:\n` +
            `• Pedido: ${primaryResOrder.orderCode}\n` +
            `• Cliente: ${primaryResOrder.customerName}\n\n` +
            `Deseja CONTINUAR assim mesmo e desfazer a reserva do outro pedido ou clique em Cancelar para interromper?`,
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
              packedQuantity: 0,
            },
          ]);

          const nextReservedQty = Math.max(
            0,
            (existingStock.reservedQuantity || 0) -
              (primaryResOrder.totalQuantity || 0),
          );
          db.updateStocks([
            {
              ...existingStock,
              reservedQuantity: nextReservedQty,
            },
          ]);

          db.addLogs([
            {
              id: Date.now() + 5,
              orderId: primaryResOrder.id,
              operatorId: currentUser.id,
              timestamp: Date.now(),
              durationMillis: 0,
              customProductName: `Reserva desfeita (estoque direcionado para pedido ${o.orderCode})`,
            },
          ]);
        }
      }
    }

    const newInvoiced = (o.invoicedQuantity || 0) + qty;
    const isNowFaturado = newInvoiced >= o.totalQuantity;
    const newStatus = isNowFaturado
      ? ("FATURADO" as const)
      : (newInvoiced > 0 ? ("FATURADO_PARCIAL" as const) : (o.status || "PENDENTE"));

    db.updateOrders([
      {
        ...o,
        invoicedQuantity: newInvoiced,
        status: newStatus,
        isActive: !isNowFaturado,
        isUrgent: isNowFaturado ? false : o.isUrgent,
        _alreadyDeducted: true,
      },
    ]);

    if (existingStock) {
      const newStockQty = Math.max(0, existingStock.quantity - qty);
      const newReservedQty = Math.max(
        0,
        (existingStock.reservedQuantity || 0) - qty,
      );
      db.updateStocks([
        {
          ...existingStock,
          quantity: newStockQty,
          reservedQuantity: newReservedQty,
        },
      ]);
    }

    db.addStockMovement?.({
      itemId: o.itemId,
      color: o.color,
      size: o.size,
      variation: o.variation,
      quantity: qty,
      type: "SAIDA",
      description: `Saída por faturamento do Pedido ${o.orderCode} (Cliente: ${o.customerName})`,
    });

    db.addLogs([
      {
        id: Date.now(),
        orderId: o.id,
        operatorId: currentUser.id,
        quantityInvoiced: qty,
        type: "FATURAMENTO",
        timestamp: Date.now(),
        durationMillis: 0,
      },
    ]);

    // Triga WhatsApp Share Modal de Admin
    const rep = db.users.find(
      (u) =>
        u.role === "REPRESENTANTE" &&
        (u.name === o.representativeName || u.id === o.representativeId),
    );
    const customer = db.customers.find((c) => c.name === o.customerName);
    const clientDisplayName = customer?.tradeName || o.customerName;
    const item = db.items.find((i) => i.id === o.itemId);
    const productDescr = `${item?.name || "Produto"} (Cor: ${o.color || "-"}, Tam: ${o.size || "-"}, Var: ${o.variation || "-"})`;

    setInvoiceModalData(null);
    setInvoiceInput("");

    setAdminWhatsAppShareData({
      orderCode: o.orderCode || `${o.id}`,
      customerName: clientDisplayName,
      productDescription: productDescr,
      quantity: qty,
      phone: rep?.phone || "",
      representativeName: rep?.name || o.representativeName || "não definido",
    });
  };

  const [isMonitoringModalOpen, setIsMonitoringModalOpen] = useState(false);
  const [selectedMonitoringCard, setSelectedMonitoringCard] = useState<
    any | null
  >(null);
  const [finalizeQuantity, setFinalizeQuantity] = useState<string>("");

  const handleOpenMonitoringModal = (pack: any) => {
    setSelectedMonitoringCard(pack);
    setFinalizeQuantity("");
    setIsMonitoringModalOpen(true);
  };

  const handleFinalizeActivePackByManager = (pack: any) => {
    const qty = parseInt(finalizeQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      alert("Por favor, digite uma quantidade válida (deve ser 0 ou maior).");
      return;
    }

    if (
      !confirm(
        `Deseja realmente finalizar o apontamento de ${pack.operatorId} para o produto "${pack.partName || "Item"}" com a quantidade ${qty}?`,
      )
    ) {
      return;
    }

    const endTime = Date.now();
    const durationMillis = endTime - pack.startTime;

    if (pack.itemId === 0) {
      // Manual/Avulso task
      const singleLog: any = {
        id: Date.now() + Math.random(),
        operatorId: pack.operatorId,
        type: pack.type,
        timestamp: endTime,
        durationMillis,
        thirdPartyName: pack.thirdPartyName,
        customProductName: pack.customProductName,
      };
      if (pack.type === "EMBALAGEM") {
        singleLog.quantityPacked = qty;
      } else if (pack.type === "PINTURA") {
        singleLog.quantityPainted = qty;
      } else if (pack.type === "CORTE_LASER") {
        singleLog.quantityCut = qty;
      } else {
        singleLog.quantityProcessed = qty;
      }
      db.addLogs([singleLog]);
      db.removeActivePack(pack.id);
      setIsMonitoringModalOpen(false);
      return;
    }

    // Standard task linking to orders
    let qtyToAllocate = qty;
    const targetQty = qty;

    const matchedOrders = db.orders
      .filter(
        (o) =>
          o.status !== "EMBALADO" &&
          o.status !== "FATURADO" &&
          o.itemId === pack.itemId &&
          (pack.type === "EMBALAGEM"
            ? (o.paintedColor || o.color) === pack.color
            : o.color === pack.color) &&
          o.size === pack.size &&
          o.variation === pack.variation,
      )
      .sort((a, b) => {
        const dateA = new Date(a.deliveryDate).getTime() || a.createdAt;
        const dateB = new Date(b.deliveryDate).getTime() || b.createdAt;
        if (dateA !== dateB) return dateA - dateB;
        return a.createdAt - b.createdAt;
      });

    let totalAssignedQty = 0;
    let logsToAdd: any[] = [];
    let updatedOrders = [...db.orders];

    for (let o of matchedOrders) {
      if (qtyToAllocate <= 0) break;

      let needed = 0;
      if (pack.type === "EMBALAGEM") {
        needed = o.totalQuantity - (o.packedQuantity || 0);
      } else if (pack.type === "PINTURA") {
        needed = o.totalQuantity - (o.paintedQuantity || 0);
      } else if (pack.type === "CORTE_LASER") {
        needed = o.totalQuantity - (o.cutQuantity || 0);
      } else {
        needed = o.totalQuantity - (o.producedQuantity || 0);
      }

      const allocate = Math.min(needed, qtyToAllocate);
      if (allocate > 0) {
        const oIndex = updatedOrders.findIndex((uo) => uo.id === o.id);
        if (oIndex >= 0) {
          const targetOrder = updatedOrders[oIndex];

          if (pack.type === "EMBALAGEM") {
            const newPacked = (targetOrder.packedQuantity || 0) + allocate;
            const status =
              newPacked >= targetOrder.totalQuantity ? "EMBALADO" : "EMBALANDO";
            updatedOrders[oIndex] = {
              ...targetOrder,
              packedQuantity: newPacked,
              status,
              isActive: newPacked < targetOrder.totalQuantity,
            };
          } else if (pack.type === "PINTURA") {
            const newPainted = (targetOrder.paintedQuantity || 0) + allocate;
            const status =
              newPainted >= targetOrder.totalQuantity
                ? "PINTADO"
                : "EM_PINTURA";
            updatedOrders[oIndex] = {
              ...targetOrder,
              paintedQuantity: newPainted,
              status,
            };
          } else if (pack.type === "CORTE_LASER") {
            const newCut = (targetOrder.cutQuantity || 0) + allocate;
            const status =
              newCut >= targetOrder.totalQuantity ? "CORTADO" : "EM_CORTE";
            updatedOrders[oIndex] = {
              ...targetOrder,
              cutQuantity: newCut,
              status,
            };
          } else {
            const newProduced = (targetOrder.producedQuantity || 0) + allocate;
            const status =
              newProduced >= targetOrder.totalQuantity
                ? "PRODUZIDO"
                : "EM_PRODUCAO";
            updatedOrders[oIndex] = {
              ...targetOrder,
              producedQuantity: newProduced,
              status,
            };
          }
        }

        qtyToAllocate -= allocate;
        totalAssignedQty += allocate;

        const baseLog: any = {
          orderId: o.id,
          operatorId: pack.operatorId,
          type: pack.type,
          timestamp: endTime,
          durationMillis: 0,
          processName: pack.processName,
        };
        if (pack.type === "EMBALAGEM") {
          baseLog.quantityPacked = allocate;
        } else if (pack.type === "PINTURA") {
          baseLog.quantityPainted = allocate;
        } else if (pack.type === "CORTE_LASER") {
          baseLog.quantityCut = allocate;
        } else {
          baseLog.quantityProcessed = allocate;
        }
        logsToAdd.push(baseLog);
      }
    }

    if (pack.type === "EMBALAGEM" && targetQty > 0) {
      const stockId = `${pack.itemId}|${pack.color}|${pack.size}|${pack.variation}|ACABADO`;
      const existingStock = db.stocks.find((s) => s.id === stockId);
      if (existingStock) {
        db.updateStocks([
          {
            ...existingStock,
            quantity: existingStock.quantity + targetQty,
          },
        ]);
      } else {
        db.updateStocks([
          {
            id: stockId,
            itemId: pack.itemId,
            color: pack.color,
            size: pack.size,
            variation: pack.variation,
            quantity: targetQty,
            stage: "ACABADO",
          },
        ]);
      }
      db.addStockMovement?.({
        itemId: pack.itemId,
        color: pack.color,
        size: pack.size,
        variation: pack.variation,
        quantity: targetQty,
        type: "ENTRADA",
        description: `Embalagem finalizada via Gerência - entrada automática no estoque (Operador: ${pack.operatorId} | Finalizado por: ${currentUser.name})`,
      });
    } else if (pack.type === "PRODUCAO" && targetQty > 0) {
      if (qtyToAllocate > 0) {
        const stockId = `${pack.itemId}|${pack.color}|${pack.size}|${pack.variation}|INTERMEDIARIO`;
        const existingStock = db.stocks.find((s) => s.id === stockId);
        if (existingStock) {
          db.updateStocks([
            {
              ...existingStock,
              quantity: existingStock.quantity + qtyToAllocate,
            },
          ]);
        } else {
          db.updateStocks([
            {
              id: stockId,
              itemId: pack.itemId,
              color: pack.color,
              size: pack.size,
              variation: pack.variation,
              quantity: qtyToAllocate,
              stage: "INTERMEDIARIO",
            },
          ]);
        }
        db.addStockMovement?.({
          itemId: pack.itemId,
          color: pack.color,
          size: pack.size,
          variation: pack.variation,
          quantity: qtyToAllocate,
          type: "ENTRADA",
          description: `Sobra de Produção finalizada via Gerência - entrada no estoque intermediário (Operador: ${pack.operatorId} | Finalizado por: ${currentUser.name})`,
        });
      }
    }

    if (totalAssignedQty > 0) {
      logsToAdd.forEach((log) => {
        log.durationMillis =
          totalAssignedQty > 0
            ? Math.round(
                ((log.quantityPacked ||
                  log.quantityProcessed ||
                  log.quantityPainted ||
                  log.quantityCut ||
                  0) /
                  totalAssignedQty) *
                  durationMillis,
              )
            : durationMillis;
        log.id = Date.now() + Math.random();
      });
      db.addLogs(logsToAdd);
    } else {
      const singleLog: any = {
        id: Date.now(),
        operatorId: pack.operatorId,
        type: pack.type,
        timestamp: endTime,
        durationMillis,
        processName: pack.processName,
      };
      if (pack.type === "EMBALAGEM") {
        singleLog.quantityPacked = targetQty;
      } else if (pack.type === "PINTURA") {
        singleLog.quantityPainted = targetQty;
      } else if (pack.type === "CORTE_LASER") {
        singleLog.quantityCut = targetQty;
      } else {
        singleLog.quantityProcessed = targetQty;
      }
      db.addLogs([singleLog]);
    }

    const itemDb = db.items.find((i) => i.id === pack.itemId);
    db.addNotification?.({
      message: `Apontamento finalizado por Gerência (${pack.type.replace("_", " ")}): ${targetQty} de ${itemDb?.name || "Item"} (${pack.color || "-"} | ${pack.size || "-"}) do Operador ${pack.operatorId}`,
      read: false,
    });

    db.updateOrders(updatedOrders);
    db.removeActivePack(pack.id);
    setIsMonitoringModalOpen(false);
  };

  useEffect(() => {
    const handleEvents = (e: KeyboardEvent) => {
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
      // Pequeno timeout de 150ms garante que o layout do navegador esteja pintado e com dimensões calculadas antes de montar o Recharts
      const timer = setTimeout(() => {
        setChartsReady(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setChartsReady(false);
    }
  }, [activeTab]);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterdayStart = todayStart - 86400000;

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
    (l) => l.timestamp >= yesterdayStart && l.timestamp < todayStart,
  );

  const calcStats = (logs: any[]) => {
    const totalPacked = logs.reduce(
      (acc, log) =>
        acc +
        (log.quantityPacked ||
          log.quantityProcessed ||
          log.quantityPainted ||
          log.quantityCut ||
          0),
      0,
    );
    const totalMillis = logs.reduce(
      (acc, log) => acc + (log.durationMillis || 0),
      0,
    );
    const totalHours = totalMillis / 3600000;
    const pph = totalHours > 0 ? Math.round(totalPacked / totalHours) : 0;
    return { totalPacked, totalHours, pph };
  };

  const todayStats = calcStats(logsToday);
  const yesterdayStats = calcStats(logsYesterday);

  const todayFaturamento = React.useMemo(() => {
    return db.logs
      .filter((l) => l.type === "FATURAMENTO" && l.timestamp >= todayStart)
      .reduce((acc, log) => {
        let price = 0;
        if (log.orderId) {
          const o = db.orders.find((ord) => ord.id === log.orderId);
          if (o) price = o.unitPrice || 0;
        }
        return (
          acc + (log.quantityInvoiced || log.quantityProcessed || 0) * price
        );
      }, 0);
  }, [db.logs, db.orders, todayStart]);

  const todayProducedQuantity = React.useMemo(() => {
    return db.logs
      .filter((l) => l.type === "PRODUCAO" && l.timestamp >= todayStart)
      .reduce((acc, log) => acc + (log.quantityProcessed || 0), 0);
  }, [db.logs, todayStart]);

  const pendingOrdersDeliverToday = React.useMemo(() => {
    const d = new Date(todayStart);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return db.orders.filter((o) => o.isActive && o.deliveryDate === todayStr)
      .length;
  }, [db.orders, todayStart]);

  let comparisonMsg = "Sem base de comparação (ontem: 0 peças).";
  let comparisonColor = "text-gray-500";
  if (yesterdayStats.pph > 0) {
    if (todayStats.pph > yesterdayStats.pph) {
      comparisonMsg = `Produtividade ${((todayStats.pph / yesterdayStats.pph - 1) * 100).toFixed(1)}% melhor que ontem! 🚀`;
      comparisonColor = "text-green-600";
    } else if (todayStats.pph < yesterdayStats.pph) {
      comparisonMsg = `Produtividade ${((1 - todayStats.pph / yesterdayStats.pph) * 100).toFixed(1)}% menor que ontem. 📉`;
      comparisonColor = "text-red-500";
    } else {
      comparisonMsg = "Produtividade igual a de ontem.";
      comparisonColor = "text-blue-600";
    }
  }

  const groupedOrders = React.useMemo(() => {
    const map = new Map<string, { total: number; packed: number; customerName: string; isActive: boolean }>();
    db.orders.forEach((o) => {
      const g = map.get(o.orderCode) || { total: 0, packed: 0, customerName: o.customerName || "", isActive: false };
      g.total += o.totalQuantity || 0;
      g.packed += o.packedQuantity || 0;
      if (o.customerName && !g.customerName) {
        g.customerName = o.customerName;
      }
      // If order is active and not fully packed
      if (o.isActive && o.status !== "FATURADO" && (o.packedQuantity || 0) < o.totalQuantity) {
        g.isActive = true;
      }
      map.set(o.orderCode, g);
    });
    return Array.from(map.entries()).map(([code, data]) => ({ code, ...data }));
  }, [db.orders]);

  const filteredGroupedOrders = React.useMemo(() => {
    let result = groupedOrders;

    // 1. Filter by Active status vs All
    if (panelOrdersFilter === "ATIVOS") {
      result = result.filter((g) => g.isActive && g.packed < g.total);
    }

    // 2. Filter by Search term
    if (panelOrdersSearch.trim() !== "") {
      const term = panelOrdersSearch.trim().toLowerCase();
      result = result.filter(
        (g) =>
          g.code.toLowerCase().includes(term) ||
          g.customerName.toLowerCase().includes(term),
      );
    }

    return result;
  }, [groupedOrders, panelOrdersFilter, panelOrdersSearch]);

  const statsTodaySector = React.useMemo(() => {
    let prod = 0;
    let corte = 0;
    let pint = 0;
    let emb = 0;

    db.logs
      .filter((l) => l.timestamp >= todayStart)
      .forEach((l) => {
        if (l.type === "PRODUCAO") prod += l.quantityProcessed || 0;
        else if (l.type === "CORTE_LASER") corte += l.quantityCut || 0;
        else if (l.type === "PINTURA") pint += l.quantityPainted || 0;
        else if (l.type === "EMBALAGEM") emb += l.quantityPacked || 0;
      });

    return { prod, corte, pint, emb };
  }, [db.logs, todayStart]);

  const producaoActive = db.activePacks.filter(
    (p) => !["PINTURA", "EMBALAGEM", "CORTE_LASER"].includes(p.type),
  );
  const corteLaserActive = db.activePacks.filter(
    (p) => p.type === "CORTE_LASER",
  );
  const pinturaActive = db.activePacks.filter((p) => p.type === "PINTURA");
  const embalagemActive = db.activePacks.filter((p) => p.type === "EMBALAGEM");

  const efficiencyData = React.useMemo(() => {
    const earliestLog =
      db.logs.length > 0
        ? Math.min(...db.logs.map((l) => l.timestamp))
        : Date.now();
    const daysElapsed = Math.max(
      1,
      Math.ceil((Date.now() - earliestLog) / 86400000),
    );

    let totalProd = 0,
      totalCorte = 0,
      totalPint = 0,
      totalEmb = 0;
    db.logs.forEach((l) => {
      if (l.type === "PRODUCAO") totalProd += l.quantityProcessed || 0;
      else if (l.type === "CORTE_LASER") totalCorte += l.quantityCut || 0;
      else if (l.type === "PINTURA") totalPint += l.quantityPainted || 0;
      else if (l.type === "EMBALAGEM") totalEmb += l.quantityPacked || 0;
    });

    const getSectorAvg = (name: string, total: number) => {
      const sector = db.sectors.find((s) =>
        s.name.toLowerCase().includes(name.toLowerCase()),
      );
      return {
        name: sector ? sector.name : name,
        "Média Diária": Math.round(total / daysElapsed),
        Capacidade: sector?.dailyCapacity || 1000,
      };
    };

    return [
      getSectorAvg("Corte", totalCorte),
      getSectorAvg("Produ", totalProd),
      getSectorAvg("Pintura", totalPint),
      getSectorAvg("Embalagem", totalEmb),
    ];
  }, [db.logs, db.sectors]);

  const sectorOccupancyData = React.useMemo(() => {
    return db.sectors.map((sector) => {
      const sectorBatches = db.productionBatches.filter(
        (b) => b.sectorId === sector.id && b.status !== "CONCLUIDO",
      );
      const sectorOrders = sectorBatches
        .flatMap((b) =>
          b.orderIds.map((oid) => db.orders.find((o) => o.id === oid)),
        )
        .filter((o): o is any => o !== undefined);
      const totalQuantity = sectorOrders.reduce(
        (sum, o) => sum + (o?.totalQuantity || 0),
        0,
      );
      const capacity = sector.dailyCapacity || 1000;
      return {
        name: sector.name,
        quantity: totalQuantity,
        capacity: capacity,
        isOverloaded: totalQuantity > capacity,
      };
    });
  }, [db.sectors, db.productionBatches, db.orders]);

  const formatDuration = (startTime: number) => {
    const diff = Math.max(0, currentTime - startTime);
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <ScreenLayout id="admin-screen-layout">
      <ScreenHeader
        title={currentUser.role === "PCP" ? "Painel PCP" : "Administração"}
        icon={<BarChart2 className="text-blue-600" size={20} />}
      />

      <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 shrink-0">
        <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 overflow-x-auto scrollbar-none max-w-full gap-0.5 select-none">
          <button
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "PAINEL" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
            onClick={() => setActiveTab("PAINEL")}
          >
            Painel Geral
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "MONITORAMENTO" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
            onClick={() => setActiveTab("MONITORAMENTO")}
          >
            Monitoramento
          </button>
          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA") && (
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "GESTAO_PESSOAS" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
              onClick={() => setActiveTab("GESTAO_PESSOAS")}
            >
              👥 Gestão de Pessoas
            </button>
          )}
          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA") && (
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "SUGESTAO" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
              onClick={() => setActiveTab("SUGESTAO")}
            >
              📊 Sugestão de Faturamento
            </button>
          )}
          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.name.toLowerCase().includes("romario") ||
            currentUser.name.toLowerCase().includes("alessandra")) && (
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "EVOLUCAO_EMBALAGEM" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
              onClick={() => setActiveTab("EVOLUCAO_EMBALAGEM")}
            >
              📦 Evolução Embalagem
            </button>
          )}

          <button
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "ETIQUETAS" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
            onClick={() => setActiveTab("ETIQUETAS")}
          >
            🏷️ Etiquetas
          </button>

          {(currentUser.role === "ADMIN" || currentUser.role === "PCP") && (
            <>
              <button
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "CADASTROS" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
                onClick={() => setActiveTab("CADASTROS")}
              >
                Cadastros
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap cursor-pointer ${activeTab === "LOTES" ? "bg-blue-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-800"}`}
                onClick={() => setActiveTab("LOTES")}
              >
                Lotes
              </button>
            </>
          )}
        </div>
      </div>

      {["PAINEL", "MONITORAMENTO", "SUGESTAO"].includes(activeTab) ? (
        <ScrollContainer paddingSize="dense" className="space-y-4">
          {activeTab === "PAINEL" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center">
                  <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Faturamento Hoje
                  </div>
                  <div className="text-2xl font-black text-green-600">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(todayFaturamento)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center">
                  <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Peças Produzidas Hoje
                  </div>
                  <div className="text-2xl font-black text-blue-600">
                    {todayProducedQuantity}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center">
                  <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Pedidos p/ Entrega Hoje
                  </div>
                  <div className="text-2xl font-black text-orange-500">
                    {pendingOrdersDeliverToday} pendentes
                  </div>
                </div>
                {/* Meta Diária Card */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-[10px] font-extrabold uppercase tracking-wider">
                      Progresso Meta Diária
                    </div>
                    {isEditingGoal ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempGoalInput}
                          onChange={(e) => setTempGoalInput(e.target.value)}
                          className="w-16 border border-indigo-200 rounded px-1 py-0.5 text-xs text-indigo-900 font-bold focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = Math.max(1, parseInt(tempGoalInput, 10) || 1);
                              setDailyProductionGoal(val);
                              localStorage.setItem("producao_daily_production_goal", String(val));
                              setIsEditingGoal(false);
                            } else if (e.key === "Escape") {
                              setIsEditingGoal(false);
                              setTempGoalInput(String(dailyProductionGoal));
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const val = Math.max(1, parseInt(tempGoalInput, 10) || 1);
                            setDailyProductionGoal(val);
                            localStorage.setItem("producao_daily_production_goal", String(val));
                            setIsEditingGoal(false);
                          }}
                          className="bg-emerald-500 text-white p-0.5 rounded text-xs hover:bg-emerald-600 cursor-pointer"
                          title="Salvar"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingGoal(false);
                            setTempGoalInput(String(dailyProductionGoal));
                          }}
                          className="bg-gray-400 text-white p-0.5 rounded text-xs hover:bg-gray-500 cursor-pointer"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setTempGoalInput(String(dailyProductionGoal));
                          setIsEditingGoal(true);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Ajustar Meta"
                      >
                        ✏️ Meta: {dailyProductionGoal}
                      </button>
                    )}
                  </div>

                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-black text-indigo-950">
                      {todayProducedQuantity} <span className="text-xs font-semibold text-gray-400">/ {dailyProductionGoal}</span>
                    </span>
                    <span className="text-xs font-extrabold text-indigo-600">
                      {Math.round((todayProducedQuantity / dailyProductionGoal) * 100) || 0}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1.5 border border-gray-200/50">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((todayProducedQuantity / dailyProductionGoal) * 100) || 0)}%`,
                      }}
                    />
                  </div>

                  <span className="text-[9px] text-gray-500 font-medium mt-1 truncate block">
                    {todayProducedQuantity >= dailyProductionGoal ? (
                      <span className="text-emerald-600 font-bold">🎉 Meta diária atingida! Parabéns!</span>
                    ) : (
                      <span>Falta(m) {dailyProductionGoal - todayProducedQuantity} peças para concluir a meta.</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col gap-4">
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 mt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Filtrar Produtividade por Produto:
                    </label>
                    <select
                      value={selectedItemId}
                      onChange={(e) =>
                        setSelectedItemId(
                          e.target.value === "ALL"
                            ? "ALL"
                            : Number(e.target.value),
                        )
                      }
                      className="border border-gray-300 p-2 rounded bg-white text-gray-800 w-full md:w-64 focus:md:w-80 cursor-pointer text-sm transition-all duration-305"
                    >
                      <option value="ALL">Todos os Produtos (Geral)</option>
                      {db.items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.code} - {it.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-gray-700">
                      Filtrar Produtividade por Setor:
                    </label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value as any)}
                      className="border border-gray-300 p-2 rounded bg-white text-gray-800 w-full md:w-64 focus:md:w-80 cursor-pointer text-sm transition-all duration-305"
                    >
                      <option value="ALL">Todos os Setores (Geral)</option>
                      <option value="CORTE_LASER">Corte a Laser</option>
                      <option value="PRODUCAO">Produção</option>
                      <option value="PINTURA">Pintura</option>
                      <option value="EMBALAGEM">Embalagem</option>
                    </select>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-700">
                  Produtividade de Hoje{" "}
                  {(selectedItemId !== "ALL" || selectedSector !== "ALL") &&
                    "(Filtrada)"}
                </h3>
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-sm text-gray-500">Peças Processadas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Number.isNaN(todayStats.totalPacked)
                        ? 0
                        : todayStats.totalPacked}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tempo Gasto</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {Number.isNaN(todayStats.totalHours)
                        ? 0
                        : Math.round(todayStats.totalHours * 10) / 10}
                      h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pçs / Hora</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Number.isNaN(todayStats.pph) ? 0 : todayStats.pph}
                    </p>
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold text-center mt-2 ${comparisonColor}`}
                >
                  {comparisonMsg}
                </div>

                <hr className="border-gray-100" />
                <h3 className="font-semibold text-gray-700">
                  Eficiência Operacional (Média Diária vs Capacidade)
                </h3>
                <div className="w-full h-64 mt-2 bg-gray-50/30 rounded-lg flex items-center justify-center border border-gray-100 relative min-h-[16rem]">
                  {chartsReady ? (
                    <ResponsiveContainer
                      width="100%"
                      height={240}
                      minWidth={0}
                      minHeight={0}
                      initialDimension={{ width: 1, height: 1 }}
                    >
                      <BarChart
                        data={efficiencyData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E5E7EB"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: "12px" }}
                        />
                        <Bar
                          dataKey="Capacidade"
                          fill="#E5E7EB"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="Média Diária"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                      <span className="text-xs text-gray-400 font-medium">
                        Carregando dados de eficiência...
                      </span>
                    </div>
                  )}
                </div>

                <hr className="border-gray-100 mt-4" />
                <h3 className="font-semibold text-gray-700">
                  Ocupação dos Setores vs Capacidade Diária (Lotes Pendentes)
                </h3>
                <div className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-100 mb-2 mt-1">
                  🚨 Vermelho indica acima de 100% de capacidade diária
                </div>
                <div className="w-full h-64 mt-2 mb-6 bg-gray-50/30 rounded-lg flex items-center justify-center border border-gray-100 relative min-h-[16rem]">
                  {chartsReady ? (
                    <ResponsiveContainer
                      width="100%"
                      height={240}
                      minWidth={0}
                      minHeight={0}
                      initialDimension={{ width: 1, height: 1 }}
                    >
                      <BarChart
                        data={sectorOccupancyData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E5E7EB"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: "12px" }}
                        />
                        <Bar
                          name="Capacidade Diária"
                          dataKey="capacity"
                          fill="#D1D5DB"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          name="Carga Agrupada"
                          dataKey="quantity"
                          radius={[4, 4, 0, 0]}
                        >
                          {sectorOccupancyData.map(
                            (entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.isOverloaded ? "#EF4444" : "#6366F1"
                                }
                              />
                            ),
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                      <span className="text-xs text-gray-400 font-medium">
                        Carregando ocupação por setor...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border mt-1">
                <h3 className="font-semibold text-gray-700 mb-4">
                  Peças Produzidas Hoje (por Setor)
                </h3>
                <div className="flex flex-col gap-3">
                  {[
                    {
                      label: "Corte a Laser",
                      value: statsTodaySector.corte,
                      color: "bg-teal-500",
                    },
                    {
                      label: "Produção",
                      value: statsTodaySector.prod,
                      color: "bg-blue-500",
                    },
                    {
                      label: "Pintura",
                      value: statsTodaySector.pint,
                      color: "bg-pink-500",
                    },
                    {
                      label: "Embalagem",
                      value: statsTodaySector.emb,
                      color: "bg-orange-500",
                    },
                  ].map((s) => {
                    const max = Math.max(
                      statsTodaySector.corte,
                      statsTodaySector.prod,
                      statsTodaySector.pint,
                      statsTodaySector.emb,
                      1,
                    );
                    const percent = (s.value / max) * 100;
                    return (
                      <div
                        key={s.label}
                        className="flex flex-col gap-1 w-full text-sm"
                      >
                        <div className="flex justify-between font-medium text-gray-700">
                          <span>{s.label}</span>
                          <span>{s.value} pçs</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${s.color} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto w-full">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm font-semibold text-gray-500 mb-1 text-center">
                      Em Produção
                    </span>
                    <span className="text-3xl font-bold text-blue-600">
                      {
                        db.orders.filter((o) => o.status === "EM_PRODUCAO")
                          .length
                      }
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm font-semibold text-gray-500 mb-1 text-center">
                      Em Corte Laser
                    </span>
                    <span className="text-3xl font-bold text-teal-600">
                      {db.orders.filter((o) => o.status === "EM_CORTE").length}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm font-semibold text-gray-500 mb-1 text-center">
                      Em Pintura
                    </span>
                    <span className="text-3xl font-bold text-pink-600">
                      {
                        db.orders.filter((o) => o.status === "EM_PINTURA")
                          .length
                      }
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm font-semibold text-gray-500 mb-1 text-center">
                      Embalando
                    </span>
                    <span className="text-3xl font-bold text-orange-600">
                      {db.orders.filter((o) => o.status === "EMBALANDO").length}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-gray-100">
                  <h3 className="font-extrabold text-gray-800 text-sm uppercase tracking-wider">
                    📋 Progresso dos Pedidos ({filteredGroupedOrders.length})
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    {/* Search Input */}
                    <input
                      type="text"
                      placeholder="Buscar por Código ou Cliente..."
                      value={panelOrdersSearch}
                      onChange={(e) => {
                        setPanelOrdersSearch(e.target.value);
                        setPanelOrdersLimit(12); // reset pagination when searching
                      }}
                      className="border border-gray-250 rounded-lg p-1.5 px-3 text-xs bg-white text-gray-800 focus:outline-none focus:border-indigo-500 font-medium w-full sm:w-56"
                    />

                    {/* Status Filter Toggle */}
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      <button
                        onClick={() => {
                          setPanelOrdersFilter("ATIVOS");
                          setPanelOrdersLimit(12);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition whitespace-nowrap cursor-pointer ${
                          panelOrdersFilter === "ATIVOS"
                            ? "bg-white text-indigo-950 shadow-xs"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Em Andamento
                      </button>
                      <button
                        onClick={() => {
                          setPanelOrdersFilter("TODOS");
                          setPanelOrdersLimit(12);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition whitespace-nowrap cursor-pointer ${
                          panelOrdersFilter === "TODOS"
                            ? "bg-white text-indigo-950 shadow-xs"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Todos os Pedidos
                      </button>
                    </div>
                  </div>
                </div>

                {filteredGroupedOrders.length === 0 ? (
                  <p className="text-gray-450 text-center text-xs py-8 font-medium">
                    {panelOrdersSearch
                      ? "Nenhum pedido encontrado para a busca especificada."
                      : "Nenhum pedido cadastrado ou em andamento."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredGroupedOrders.slice(0, panelOrdersLimit).map((go, idx) => {
                        const percRaw =
                          go.total > 0
                            ? Math.min(
                                100,
                                Math.round((go.packed / go.total) * 100),
                              )
                            : 0;
                        const perc = Number.isNaN(percRaw) ? 0 : percRaw;
                        return (
                          <div
                            key={go.code || `order-${idx}`}
                            className="bg-white p-4 rounded-xl shadow-xs border border-gray-150 flex flex-col justify-between hover:border-indigo-200 transition-colors"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-1.5">
                                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                                  #{go.code}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                  {go.packed} / {go.total} pçs
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 font-bold truncate uppercase tracking-tight mb-3">
                                {go.customerName || "Cliente Geral"}
                              </p>
                            </div>

                            <div>
                              <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200/40">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${perc}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center mt-1.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">
                                  {go.total - go.packed > 0 ? `${go.total - go.packed} pendentes` : "Completo"}
                                </span>
                                <span className="text-[10px] font-extrabold text-slate-800">
                                  {perc}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredGroupedOrders.length > panelOrdersLimit && (
                      <div className="flex justify-center mt-2">
                        <button
                          onClick={() => setPanelOrdersLimit((prev) => prev + 12)}
                          className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-5 py-2 rounded-xl shadow-3xs cursor-pointer transition flex items-center gap-1"
                        >
                          🔄 Mostrar Mais Pedidos (Exibindo {Math.min(panelOrdersLimit, filteredGroupedOrders.length)} de {filteredGroupedOrders.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : activeTab === "SUGESTAO" ? (
            <InvoiceSuggestionsTab
              db={db}
              setSelectedOrder={setSelectedOrder}
              setInvoiceModalData={setInvoiceModalData}
              setInvoiceInput={setInvoiceInput}
            />
          ) : activeTab === "MONITORAMENTO" ? (
            <div className="flex-1 overflow-y-auto w-full flex flex-col gap-6">
              <MonitoramentoMetricsSummary logs={db.logs} />
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">
                  Em Produção
                </h3>
                {producaoActive.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nenhuma produção em andamento.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {producaoActive.map((pack) => {
                      const item = db.items.find((i) => i.id === pack.itemId);
                      return (
                        <div
                          key={pack.id}
                          onClick={() => handleOpenMonitoringModal(pack)}
                          className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">
                                {pack.partName || item?.name}
                              </span>
                              <span className="text-xs text-gray-600 mt-1">
                                {pack.color || "-"} | {pack.size || "-"} |{" "}
                                {pack.variation || "-"}
                              </span>
                              <span className="text-xs font-semibold text-gray-500 mt-1">
                                Operador: {pack.operatorId}
                              </span>
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded w-fit mt-1">
                                {pack.type.replace("_", " ")}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-blue-700 text-xs font-semibold">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Em andamento
                              </div>
                              <span>({formatDuration(pack.startTime)})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">
                  Em Corte Laser
                </h3>
                {corteLaserActive.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nenhum corte em andamento.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {corteLaserActive.map((pack) => {
                      const item = db.items.find((i) => i.id === pack.itemId);
                      return (
                        <div
                          key={pack.id}
                          onClick={() => handleOpenMonitoringModal(pack)}
                          className="bg-teal-50 border border-teal-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-teal-300 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">
                                {pack.partName || item?.name}
                              </span>
                              <span className="text-xs text-gray-600 mt-1">
                                {pack.color || "-"} | {pack.size || "-"} |{" "}
                                {pack.variation || "-"}
                              </span>
                              <span className="text-xs font-semibold text-gray-500 mt-1">
                                Operador: {pack.operatorId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-teal-700 text-xs font-semibold">
                              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                              Cortando... ({formatDuration(pack.startTime)})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">
                  Em Pintura
                </h3>
                {pinturaActive.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nenhuma pintura em andamento.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {pinturaActive.map((pack) => {
                      const item = db.items.find((i) => i.id === pack.itemId);
                      return (
                        <div
                          key={pack.id}
                          onClick={() => handleOpenMonitoringModal(pack)}
                          className="bg-pink-50 border border-pink-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-pink-300 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">
                                {pack.partName || item?.name}
                              </span>
                              <span className="text-xs text-gray-600 mt-1">
                                {pack.color || "-"} | {pack.size || "-"} |{" "}
                                {pack.variation || "-"}
                              </span>
                              <span className="text-xs font-semibold text-gray-500 mt-1">
                                Operador: {pack.operatorId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-pink-700 text-xs font-semibold">
                              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                              Pintando há... ({formatDuration(pack.startTime)})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">
                  Em Embalagem
                </h3>
                {embalagemActive.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nenhuma embalagem em andamento.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {embalagemActive.map((pack) => {
                      const item = db.items.find((i) => i.id === pack.itemId);
                      return (
                        <div
                          key={pack.id}
                          onClick={() => handleOpenMonitoringModal(pack)}
                          className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-green-300 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">
                                {pack.partName || item?.name}
                              </span>
                              <span className="text-xs text-gray-600 mt-1">
                                {pack.color || "-"} | {pack.size || "-"} |{" "}
                                {pack.variation || "-"}
                              </span>
                              <span className="text-xs font-semibold text-gray-500 mt-1">
                                Operador: {pack.operatorId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-green-700 text-xs font-semibold">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              Embalando... ({formatDuration(pack.startTime)})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </ScrollContainer>
      ) : null}

      {activeTab === "CADASTROS" && (
        <PCPScreen db={db} currentUser={currentUser} subScreen="CADASTROS" />
      )}
      {activeTab === "LOTES" && (
        <PCPScreen db={db} currentUser={currentUser} subScreen="LOTES" />
      )}
      {activeTab === "EVOLUCAO_EMBALAGEM" && <EvolucaoEmbalagemTab db={db} />}
      {activeTab === "ETIQUETAS" && (
        <EtiquetasTab db={db} currentUser={currentUser} />
      )}
      {activeTab === "GESTAO_PESSOAS" && (
        <GestaoPessoasTab db={db} currentUser={currentUser} />
      )}

      {isMonitoringModalOpen &&
        selectedMonitoringCard &&
        (() => {
          const pack =
            db.activePacks.find((p) => p.id === selectedMonitoringCard.id) ||
            selectedMonitoringCard;
          const item = db.items.find((i) => i.id === pack.itemId);
          return (
            <div
              className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs"
              onClick={() => setIsMonitoringModalOpen(false)}
            >
              <div
                className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg flex flex-col gap-4 animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-gray-800">
                    Detalhes do Lote / Monitoramento
                  </h3>
                  <button
                    onClick={() => setIsMonitoringModalOpen(false)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded p-4 flex flex-col gap-2 text-left">
                  <p className="text-sm text-gray-700">
                    <strong>Setor:</strong>{" "}
                    <span className="uppercase text-indigo-700 font-bold">
                      {pack.type.replace("_", " ")}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Produto:</strong> {pack.partName || item?.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>SKU/Variação:</strong> {pack.color || "-"} |{" "}
                    {pack.size || "-"} | {pack.variation || "-"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Operador Atual:</strong> {pack.operatorId}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Tempo de Operação:</strong>{" "}
                    <span className="font-bold text-indigo-700">
                      {formatDuration(pack.startTime)}
                    </span>
                  </p>
                </div>

                {(currentUser.role === "GERENCIA" ||
                  currentUser.role === "ADMIN") && (
                  <div className="border-t border-slate-200 pt-4 mt-2 flex flex-col gap-3 text-left">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5 text-blue-700">
                      <span>🔧 Área do Gestor: Finalizar Apontamento</span>
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Como gestor, você pode encerrar este apontamento iniciado
                      por qualquer usuário, registrando a quantidade
                      correspondente e atualizando as ordens de serviço
                      correspondentes automaticamente.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Quantidade Produzida / Embalada:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={finalizeQuantity}
                          onChange={(e) => setFinalizeQuantity(e.target.value)}
                          placeholder="Ex: 50"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                        />
                        <button
                          onClick={() =>
                            handleFinalizeActivePackByManager(pack)
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-lg text-xs transition uppercase tracking-wider cursor-pointer shadow-sm"
                        >
                          Confirmar e Finalizar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setIsMonitoringModalOpen(false)}
                  className="mt-2 bg-slate-100 hover:bg-slate-200 font-bold p-2.5 rounded-lg text-slate-700 transition text-xs border border-slate-200/50 cursor-pointer text-center"
                >
                  Fechar Detalhes
                </button>
              </div>
            </div>
          );
        })()}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-500 pl-3 flex items-center gap-2 flex-wrap">
                  Pedido: {selectedOrder.orderCode}
                  {selectedOrder.isUrgent && (
                    <span className="bg-red-100 text-red-850 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                      URGENTE
                    </span>
                  )}
                  {selectedOrder.isProgramacao && (
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                      📈 PROGRAMAÇÃO
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 font-medium pl-4 mt-1 bg-white">
                  Cliente: {selectedOrder.customerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 cursor-pointer"
                >
                  <span className="font-bold px-1">X</span>
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-gray-50">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col gap-3">
                <h3 className="font-semibold text-gray-800 border-b pb-2">
                  Informações Adicionais
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-1">
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Produto
                    </span>
                    <span className="text-gray-800 font-semibold">
                      {db.items.find((i: any) => i.id === selectedOrder.itemId)
                        ?.name || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Quantidade Total
                    </span>
                    <span className="text-blue-700 font-bold">
                      {selectedOrder.totalQuantity} pçs
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Cor / Tamanho / Var
                    </span>
                    <span className="text-gray-700 font-mono">
                      {selectedOrder.color || "-"} / {selectedOrder.size || "-"}{" "}
                      / {selectedOrder.variation || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 font-bold uppercase text-[10px]">
                      Data de Entrega
                    </span>
                    <span className="text-gray-700 font-semibold">
                      {selectedOrder.deliveryDate
                        ? new Date(
                            selectedOrder.deliveryDate,
                          ).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">
                  Linha do Tempo (Processamento)
                </h3>
                {(() => {
                  const orderLogs = db.logs
                    .filter((l: any) => l.orderId === selectedOrder.id)
                    .sort((a: any, b: any) => b.timestamp - a.timestamp);
                  return (
                    <div className="flex flex-col gap-3">
                      {orderLogs.map((log: any) => {
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
                            actionColor =
                              "bg-green-50 text-green-800 border bg-green-50 text-green-800";
                            actionQty = log.quantityPacked || 0;
                            break;
                          case "FATURAMENTO":
                            actionLabel = "Faturado";
                            actionColor = "bg-emerald-100 text-emerald-800";
                            actionQty = log.quantityInvoiced || 0;
                            break;
                        }

                        return (
                          <div
                            key={log.id}
                            className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${actionColor}`}
                              >
                                {actionLabel}
                              </span>
                              <span className="text-xs text-slate-800 font-bold">
                                {actionQty || log.customProductName || ""} un.
                                (Sistema)
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 font-mono shrink-0 whitespace-nowrap mt-1">
                              {new Date(log.timestamp).toLocaleDateString()}{" "}
                              <br />{" "}
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {invoiceModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 min-h-screen">
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-emerald-600 p-4 shrink-0">
              <h3 className="text-white font-bold text-lg">
                Confirmar Faturamento
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-gray-700">
                O faturamento irá deduzir peças do seu{" "}
                <strong className="text-gray-900 bg-gray-100 px-1 rounded">
                  estoque de itens acabados
                </strong>
                .
              </p>
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                  Pedido
                </span>
                <span className="font-bold text-gray-900">
                  {invoiceModalData.order.orderCode} -{" "}
                  {invoiceModalData.order.customerName}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600 font-bold uppercase">
                  Quantidade a Faturar (Máximo: {invoiceModalData.limit})
                </label>
                <input
                  type="number"
                  value={invoiceInput}
                  onChange={(e) => setInvoiceInput(e.target.value)}
                  className="border-2 border-emerald-500 rounded p-2 text-xl font-bold bg-emerald-50 focus:outline-none w-full"
                  max={invoiceModalData.limit}
                  min={1}
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setInvoiceModalData(null)}
                className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-200 rounded transition"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmInvoice}
                className="flex-1 sm:flex-none px-6 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-md transition"
              >
                Confirmar
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {adminWhatsAppShareData &&
        (() => {
          const dateStr = (() => {
            const date = new Date();
            const day = String(date.getDate()).padStart(2, "0");
            const months = [
              "Jan",
              "Fev",
              "Mar",
              "Abr",
              "Mai",
              "Jun",
              "Jul",
              "Ago",
              "Set",
              "Out",
              "Nov",
              "Dez",
            ];
            const month = months[date.getMonth()];
            const year = String(date.getFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
          })();

          // Formatação final da mensagem
          const messageText = `*FATURAMENTO DE PEDIDO* 🚀

*Nº Pedido:* ${adminWhatsAppShareData.orderCode}
*Cliente:* ${adminWhatsAppShareData.customerName}
*Data Faturamento:* ${dateStr}

*Itens Enviados:*
• ${adminWhatsAppShareData.productDescription} - Qtd: *${adminWhatsAppShareData.quantity}*

_Mensagem do Sistema Império Jomarci_`;

          return (
            <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs text-left">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 text-left">
                <div className="bg-teal-600 text-white p-4 flex items-center gap-2">
                  <Phone size={24} className="text-white" />
                  <h3 className="font-bold text-lg text-white">
                    Compartilhar no WhatsApp
                  </h3>
                </div>

                <div className="p-5 flex flex-col gap-4 text-gray-800">
                  <p className="text-sm">
                    O pedido{" "}
                    <strong>#{adminWhatsAppShareData.orderCode}</strong> foi
                    faturado com sucesso! Deseja notificar o representante{" "}
                    <strong>
                      {adminWhatsAppShareData.representativeName ||
                        "não definido"}
                    </strong>
                    ?
                  </p>

                  {/* Campo Celular do Representante */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Telefone do Destinatário (País + DDD + Número)
                    </label>
                    <input
                      type="text"
                      value={adminWhatsAppShareData.phone}
                      placeholder="Ex: 5511999998888"
                      onChange={(e) =>
                        setAdminWhatsAppShareData((prev) =>
                          prev
                            ? {
                                ...prev,
                                phone: e.target.value.replace(/\D/g, ""),
                              }
                            : null,
                        )
                      }
                      className="w-full border p-2 text-sm font-mono rounded bg-gray-50 focus:ring-1 focus:ring-teal-500 outline-none text-gray-850"
                    />
                    {!adminWhatsAppShareData.phone && (
                      <span className="text-[11px] text-amber-600 font-bold">
                        ⚠️ Telefone não cadastrado. Insira acima para
                        compartilhar!
                      </span>
                    )}
                  </div>

                  {/* Preview da Mensagem */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Mensagem Gerada
                    </label>
                    <pre className="text-[11px] bg-gray-900 text-green-400 p-4 rounded font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                      {messageText}
                    </pre>
                  </div>
                </div>

                <div className="bg-gray-50 px-5 py-3.5 flex justify-end gap-2 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setAdminWhatsAppShareData(null)}
                    className="px-4 py-2 border rounded text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  >
                    Fechar sem enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(messageText);
                      alert(
                        "Mensagem copiada com sucesso para a área de transferência!",
                      );
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-bold transition cursor-pointer"
                  >
                    Copiar Mensagem
                  </button>
                  <button
                    type="button"
                    disabled={!adminWhatsAppShareData.phone}
                    onClick={() => {
                      const clean = adminWhatsAppShareData.phone.replace(
                        /\D/g,
                        "",
                      );
                      const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(messageText)}`;
                      window.open(url, "_blank");
                      setAdminWhatsAppShareData(null);
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Phone size={14} className="text-white" /> Abrir WhatsApp
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </ScreenLayout>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
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
  const db = useDatabase(currentUser);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");
      setIsStandalone(!!isStandaloneMode);
    };

    checkStandalone();
    setIsInIframe(window.self !== window.top);

    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("PWA installation accepted");
    }
    setDeferredPrompt(null);
  };

  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);
  const [emailToCustomerPrint, setEmailToCustomerPrint] = useState("");
  const [isSendingOrderPrintEmail, setIsSendingOrderPrintEmail] =
    useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      setOrderToPrint(e.detail);
      setEmailToCustomerPrint("");
    };
    window.addEventListener("print-order", handler);
    return () => {
      window.removeEventListener("print-order", handler);
    };
  }, []);

  // Intercept db.updateOrders to automatically deduct physical stock when status transitions to "FATURADO"
  const originalUpdateOrders = React.useRef(db.updateOrders);
  originalUpdateOrders.current = db.updateOrders;

  db.updateOrders = React.useCallback(
    async (updatedOrders: any) => {
      const list = Array.isArray(updatedOrders)
        ? updatedOrders
        : [updatedOrders];
      const stocksToUpdate: any[] = [];

      for (const updated of list) {
        const current = db.orders.find((o) => o.id === updated.id);
        const isNowFaturado = updated.status === "FATURADO";
        const wasFaturado = current?.status === "FATURADO";

        if (isNowFaturado && !wasFaturado && !updated._alreadyDeducted) {
          const stockId = `${updated.itemId}|${updated.color}|${updated.size}|${updated.variation}|ACABADO`;
          const existingStock = db.stocks.find((s) => s.id === stockId);
          const qtyToDeduct =
            updated.totalQuantity || updated.invoicedQuantity || 0;

          if (qtyToDeduct > 0) {
            if (existingStock) {
              const alreadyStagedIdx = stocksToUpdate.findIndex(
                (s) => s.id === stockId,
              );
              if (alreadyStagedIdx >= 0) {
                stocksToUpdate[alreadyStagedIdx].quantity = Math.max(
                  0,
                  stocksToUpdate[alreadyStagedIdx].quantity - qtyToDeduct,
                );
                stocksToUpdate[alreadyStagedIdx].reservedQuantity = Math.max(
                  0,
                  (stocksToUpdate[alreadyStagedIdx].reservedQuantity || 0) -
                    qtyToDeduct,
                );
              } else {
                stocksToUpdate.push({
                  ...existingStock,
                  quantity: Math.max(0, existingStock.quantity - qtyToDeduct),
                  reservedQuantity: Math.max(
                    0,
                    (existingStock.reservedQuantity || 0) - qtyToDeduct,
                  ),
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
              description: `Dedução de estoque por transição para FATURADO (Pedido ${updated.orderCode})`,
            });
          }
        }
      }

      if (stocksToUpdate.length > 0) {
        await db.updateStocks(stocksToUpdate);
      }

      // Deduct from laser cut stock if there are assigned laser parts
      let updatedNestTasks = [...db.nestTasks];
      let madeNestChanges = false;
      for (const updated of list) {
        const current = db.orders.find((o) => o.id === updated.id);
        const isNowFaturado = updated.status === "FATURADO";
        const wasFaturado = current?.status === "FATURADO";
        if (
          isNowFaturado &&
          updated.laserAssignments &&
          updated.laserAssignments.length > 0
        ) {
          for (const assignment of updated.laserAssignments) {
            let qtyToAbate = 0;
            if (!wasFaturado) {
              // Transitioning of order to FATURADO - deduct whole assignment
              qtyToAbate = assignment.quantity;
            } else {
              // Order was already FATURADO - deduct only the new/extra assignment difference
              const currentAssignment = current?.laserAssignments?.find(
                (la: any) =>
                  la.partName === assignment.partName &&
                  la.size === assignment.size,
              );
              const currentQty = currentAssignment
                ? currentAssignment.quantity
                : 0;
              qtyToAbate = assignment.quantity - currentQty;
            }

            if (qtyToAbate > 0) {
              for (let i = 0; i < updatedNestTasks.length; i++) {
                if (qtyToAbate <= 0) break;
                const t = updatedNestTasks[i];
                if (
                  t.partName === assignment.partName &&
                  t.size === assignment.size &&
                  t.cutQuantity > 0 &&
                  t.status === "CORTADO"
                ) {
                  const canTake = Math.min(qtyToAbate, t.cutQuantity);
                  updatedNestTasks[i] = {
                    ...t,
                    cutQuantity: t.cutQuantity - canTake,
                  };
                  qtyToAbate -= canTake;
                  madeNestChanges = true;
                }
              }
            }
          }
        }
      }
      if (madeNestChanges) {
        await db.updateNestTasks(updatedNestTasks);
      }

      return originalUpdateOrders.current(updatedOrders);
    },
    [
      db.orders,
      db.stocks,
      db.updateStocks,
      db.addStockMovement,
      db.nestTasks,
      db.updateNestTasks,
    ],
  );

  const [toasts, setToasts] = useState<
    {
      id: string;
      title: string;
      message: string;
      type: "info" | "warning" | "success";
    }[]
  >([]);

  React.useEffect(() => {
    if (currentUser) {
      localStorage.setItem("imperio_logged_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("imperio_logged_user");
    }
  }, [currentUser]);

  usePushNotifications(currentUser, db, setCurrentUser);

  React.useEffect(() => {
    const handleAppToast = (e: any) => {
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
            type: e.detail.type || "info",
          },
        ]);
        setTimeout(() => {
          setToasts((prev) => prev.slice(1));
        }, 5000);
      }
    };
    window.addEventListener("app_toast", handleAppToast);
    return () => window.removeEventListener("app_toast", handleAppToast);
  }, []);

  // Sound alert synthesizer
  const playNotificationSound = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
      osc2.frequency.setValueAtTime(329.63, ctx.currentTime + 0.15); // E4

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);

      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Erro ao reproduzir som de notificação:", e);
    }
  };

  // Sector identification mapper for users
  const getOperatorSectorIds = (role: string, sectors: any[]): number[] => {
    const roleLower = role.toLowerCase();
    if (roleLower === "corte_laser") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("corte") ||
            s.name.toLowerCase().includes("laser"),
        )
        .map((s) => s.id);
    }
    if (roleLower === "pintura") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("pint") ||
            s.name.toLowerCase().includes("acabam"),
        )
        .map((s) => s.id);
    }
    if (roleLower === "prensa_eduardo") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("prensa") ||
            s.name.toLowerCase().includes("eduardo"),
        )
        .map((s) => s.id);
    }
    if (roleLower === "prensa_rafael") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("prensa") ||
            s.name.toLowerCase().includes("rafael"),
        )
        .map((s) => s.id);
    }
    if (roleLower === "injetora") {
      return sectors
        .filter((s) => s.name.toLowerCase().includes("injet"))
        .map((s) => s.id);
    }
    if (roleLower === "banho_quimico") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("banho") ||
            s.name.toLowerCase().includes("quim"),
        )
        .map((s) => s.id);
    }
    if (roleLower === "torno_cnc_willian") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("torno") ||
            s.name.toLowerCase().includes("willian"),
        )
        .map((s) => s.id);
    }
    if (roleLower === "torno_cnc_henrique") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("torno") ||
            s.name.toLowerCase().includes("henrique"),
        )
        .map((s) => s.id);
    }
    if (roleLower === "embalagem") {
      return sectors
        .filter((s) => s.name.toLowerCase().includes("embal"))
        .map((s) => s.id);
    }
    if (roleLower === "producao" || roleLower === "montagem_rodrigo") {
      return sectors
        .filter(
          (s) =>
            s.name.toLowerCase().includes("produ") ||
            s.name.toLowerCase().includes("montag"),
        )
        .map((s) => s.id);
    }
    return [];
  };

  const prevBatchesRef = React.useRef<typeof db.productionBatches>([]);
  const isInitialBatchesRef = React.useRef(true);

  React.useEffect(() => {
    if (
      !currentUser ||
      !db.productionBatches ||
      db.productionBatches.length === 0
    ) {
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
        // match either direct sector id or general 0 sector
        let isAssignedToMe =
          batch.sectorId === 0 || opSectorIds.includes(batch.sectorId);

        if (
          currentUser.id === "projetista_marcos" ||
          currentUser.role === "PROJETISTA"
        ) {
          const sName =
            db.sectors.find((s) => s.id === batch.sectorId)?.name || "";
          const isLaserSector =
            sName.toLowerCase().includes("laser") ||
            sName.toLowerCase().includes("corte");
          const isLaserBatch =
            batch.name.toLowerCase().includes("laser") ||
            batch.name.toLowerCase().includes("corte");
          isAssignedToMe = isLaserSector || isLaserBatch;
        }

        if (isAssignedToMe) {
          const sectorName =
            batch.sectorId === 0
              ? "Geral (Sem Setor)"
              : db.sectors.find((s) => s.id === batch.sectorId)?.name ||
                "Seu Setor";

          const toastId = `${batch.id}-${Date.now()}`;
          const title = `📦 Novo Lote Atribuído ao seu Setor!`;
          const message = `O lote "${batch.name}" foi planejado e atribuído para o setor "${sectorName}".`;

          setToasts((prev) => [
            ...prev,
            { id: toastId, title, message, type: "success" },
          ]);
          playNotificationSound();

          if (Notification.permission === "granted") {
            new Notification(title, { body: message, icon: "/icon.png" });
          }

          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
          }, 8000);
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
      const isMarcosOrEmbalagem =
        currentUser.id === "projetista_marcos" ||
        roleLower === "projetista" ||
        roleLower === "embalagem" ||
        nameLower.includes("marcos") ||
        nameLower.includes("embalagem");

      if (isMarcosOrEmbalagem) {
        // Aumenta ligeiramente para Marcos/Embalagem (não tão grande)
        document.documentElement.style.fontSize = "16.5px";
      } else {
        // Aumenta para os demais usuários (e.g. Gerência)
        document.documentElement.style.fontSize = "17.5px";
      }
    } else {
      document.documentElement.style.fontSize = ""; // Padrão
    }
    return () => {
      document.documentElement.style.fontSize = ""; // Padrão
    };
  }, [currentUser]);

  if (!currentUser) {
    return (
      <LoginScreen
        users={db.allUsers}
        tenants={db.tenants}
        onLogin={setCurrentUser}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
        isStandalone={isStandalone}
        isIOS={isIOS}
        isInIframe={isInIframe}
        handleInstallClick={handleInstallClick}
      />
    );
  }

  const hasSector = (nameKeyword: string) => {
    return db.sectors.some((s) => s.name.toLowerCase().includes(nameKeyword.toLowerCase()));
  };

  const hasMachine = (nameKeyword: string) => {
    const machines = db.activeTenant?.machines || [];
    return machines.some((m) => m.toLowerCase().includes(nameKeyword.toLowerCase()));
  };

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen-safe w-screen bg-slate-50 overflow-hidden font-sans antialiased">
        {/* Real-time Toast Alerts Stack */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-slate-900 border border-[#00b14f]/30 text-white rounded-xl shadow-2xl p-4 flex flex-col gap-1 transition-all duration-300 animate-in slide-in-from-right-5 fade-in duration-200"
            >
              <div className="flex items-center gap-1.5 justify-between">
                <span className="font-extrabold text-[11px] text-[#00b14f] flex items-center gap-1">
                  <span>🔔</span> {toast.title}
                </span>
                <button
                  onClick={() =>
                    setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                  }
                  className="text-slate-400 hover:text-white text-xs font-bold leading-none shrink-0"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-300">{toast.message}</p>
            </div>
          ))}
        </div>

        {isOffline && (
          <div className="bg-amber-500 text-white text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
            Modo Offline (As alterações serão sincronizadas quando reconectar)
          </div>
        )}

        {db.permissionError && (
          <div className="bg-red-600 text-white text-xs font-bold text-center py-2 px-4 flex items-center justify-center gap-2 animate-bounce">
            <span>⚠️ ALERTA DO FIRESTORE: {db.permissionError}</span>
            <button
              onClick={() => db.triggerSyncQueue(true)}
              className="bg-white text-red-700 hover:bg-red-100 px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm transition ml-2 cursor-pointer"
            >
              Tentar Reconectar
            </button>
          </div>
        )}
        {/* Top Navbar */}
        <header className="bg-black text-[#00b14f] p-4 flex justify-between items-center shadow-md shrink-0 border-b border-[#00b14f]/20" style={{ borderBottomColor: (db.activeTenant?.primaryColor || '#00b14f') + '40', color: db.activeTenant?.primaryColor || '#00b14f' }}>
          <div className="flex items-center gap-2">
            {db.activeTenant?.logoUrl && db.activeTenant.logoUrl !== "/icon.png" ? (
              <img src={db.activeTenant.logoUrl} alt="Logo" className="h-8 object-contain max-w-[120px]" />
            ) : (
              <Crown size={28} className="text-[#00b14f]" style={{ color: db.activeTenant?.primaryColor || '#00b14f' }} />
            )}
            <div className="flex flex-col leading-none">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: db.activeTenant?.primaryColor || '#00b14f' }}>
                {db.activeTenant?.name || "IMPÉRIO"}
              </h1>
              <span className="text-[0.6rem] text-gray-400 font-medium tracking-widest uppercase">
                {db.activeTenant?.systemName || "Apontador de Produção"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm sm:text-base text-gray-300">
            {!isStandalone && (
              <button
                onClick={() => setShowPWAModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 hover:text-[#00b14f] transition cursor-pointer text-xs font-semibold animate-pulse shadow-md"
                style={{ color: db.activeTenant?.primaryColor || '#00b14f' }}
              >
                <span>📲</span>
                <span className="hidden md:inline">Instalar App</span>
              </button>
            )}
            <span className="hidden sm:inline">
              {currentUser.name} ({currentUser.role})
            </span>
            <span className="sm:hidden">{currentUser.name.split(" ")[0]}</span>
            <button
              onClick={() => setCurrentUser(null)}
              className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 hover:text-[#00b14f] transition"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden w-full max-w-7xl mx-auto flex flex-col min-h-0 bg-slate-50 relative">
          <Routes>
            <Route
              path="/"
              element={<Welcome currentUser={currentUser} db={db} />}
            />
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "LEITURA" ||
              currentUser.role === "PCP" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "ENCARREGADO") && (
              <Route
                path="/admin"
                element={<AdminScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "PCP" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "LEITURA" ||
              currentUser.role === "ENCARREGADO") && (
              <Route
                path="/relatorios"
                element={<RelatoriosScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "PCP" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "LEITURA" ||
              currentUser.role === "ENCARREGADO") && (
              <>
                <Route
                  path="/status"
                  element={
                    <PedidosScreen
                      db={db}
                      currentUser={currentUser}
                      defaultViewMode="STATUS_PEDIDOS"
                    />
                  }
                />
                <Route path="/itens" element={<ItensScreen db={db} />} />
              </>
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "PCP" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "LEITURA" ||
              currentUser.role === "PROJETISTA") && (
              <>
                <Route
                  path="/pedidos"
                  element={
                    <PedidosScreen
                      db={db}
                      currentUser={currentUser}
                      defaultViewMode="ITENS"
                    />
                  }
                />
                <Route
                  path="/nests"
                  element={
                    <UploadNestScreen db={db} currentUser={currentUser} />
                  }
                />
              </>
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "PCP" ||
              currentUser.role === "LEITURA" ||
              currentUser.role === "ENCARREGADO") && (
              <Route
                path="/estoque"
                element={<EstoqueScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "PCP" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "PROJETISTA") && (
              <Route
                path="/estoque-laser"
                element={
                  <EstoqueNestingScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "PRENSA_EDUARDO") && (
              <Route
                path="/prensa-eduardo"
                element={
                  <PrensaEduardoScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "TORNO_CNC_WILLIAN") && (
              <Route
                path="/torno-cnc-willian"
                element={
                  <TornoCncWillianScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "TORNO_CNC_HENRIQUE") && (
              <Route
                path="/torno-cnc-henrique"
                element={
                  <TornoCncHenriqueScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "PRENSA_RAFAEL") && (
              <Route
                path="/prensa-rafael"
                element={
                  <PrensaRafaelScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "INJETORA") && (
              <Route
                path="/injetora"
                element={<InjetoraScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "BANHO_QUIMICO") && (
              <Route
                path="/banho-quimico"
                element={
                  <BanhoQuimicoScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "EMBALAGEM") && (
              <Route
                path="/embalagem"
                element={
                  <EmbalagemScreen
                    db={db}
                    currentUser={currentUser}
                    SVGQRCode={SVGQRCode}
                  />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "PRODUCAO" ||
              currentUser.role === "MONTAGEM_RODRIGO" ||
              currentUser.role === "SOLDA" ||
              currentUser.role === "MONTAGEM_RETRATIL" ||
              currentUser.role === "ENCARREGADO") && (
              <Route
                path="/producao"
                element={<ProducaoScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "CORTE_LASER") && (
              <>
                <Route
                  path="/cortelaser"
                  element={
                    <CorteLaserScreen db={db} currentUser={currentUser} />
                  }
                />
                {(currentUser.role === "CORTE_LASER" || currentUser.role === "GERENCIA") && (
                  <Route
                    path="/nests"
                    element={
                      <UploadNestScreen db={db} currentUser={currentUser} />
                    }
                  />
                )}
              </>
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "PINTURA") && (
              <Route
                path="/pintura"
                element={<PinturaScreen db={db} currentUser={currentUser} />}
              />
            )}
            <Route
              path="/historico"
              element={
                <HistoricoProducaoScreen db={db} currentUser={currentUser} />
              }
            />
            {currentUser.role === "REPRESENTANTE" && (
              <Route
                path="/representante"
                element={
                  <RepresentanteScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {currentUser.role === "PCP" && (
              <Route
                path="/pcp"
                element={<PCPScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" || currentUser.role === "PCP") && (
              <Route
                path="/gestao-clientes"
                element={
                  <GestaoClientesScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "PCP") && (
              <Route
                path="/logistica"
                element={<LogisticaScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "PCP" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "ENCARREGADO" ||
              currentUser.role === "PROJETISTA" ||
              currentUser.id === "dinei" ||
              currentUser.id === "projetista_marcos") && (
              <Route
                path="/lotes"
                element={<LotesScreen db={db} currentUser={currentUser} />}
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA" ||
              currentUser.role === "PCP") && (
              <Route
                path="/fila-producao"
                element={
                  <PedidosSemLoteScreen db={db} currentUser={currentUser} />
                }
              />
            )}
            {(currentUser.role === "ADMIN" ||
              currentUser.role === "GERENCIA") && (
              <Route
                path="/financeiro"
                element={<FinanceiroScreen db={db} currentUser={currentUser} />}
              />
            )}
            {currentUser.id === "raul" && (
              <Route
                path="/superadmin"
                element={<SuperAdminScreen db={db} />}
              />
            )}
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 flex justify-around p-3 pb-safe shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] overflow-x-auto">
          {currentUser.id === "raul" && (
            <NavLink
              to="/superadmin"
              icon={<ShieldAlert size={24} className="text-red-650" />}
              label="SuperAdmin"
            />
          )}
          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "PCP" ||
            currentUser.id === "projetista_marcos" ||
            currentUser.id === "dinei" ||
            currentUser.id === "romario" ||
            currentUser.id === "alessandra") && (
            <NavLink to="/" icon={<Home size={24} />} label="Início" />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA") && (
            <NavLink
              to="/financeiro"
              icon={<DollarSign size={24} />}
              label="Financeiro"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "LEITURA" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "ENCARREGADO") && (
            <NavLink
              to="/admin"
              icon={<BarChart2 size={24} />}
              label="Monitor"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA") && (
            <NavLink
              to="/fila-producao"
              icon={<List size={24} />}
              label="Fila Prod."
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "LEITURA" ||
            currentUser.role === "ENCARREGADO") && (
            <NavLink
              to="/relatorios"
              icon={<ClipboardList size={24} />}
              label="Relatórios"
            />
          )}

          {(currentUser.role === "ADMIN" || currentUser.role === "PCP") && (
            <NavLink
              to="/gestao-clientes"
              icon={<Users size={24} />}
              label="Clientes"
            />
          )}

          {(currentUser.role === "ADMIN" || currentUser.role === "PCP") && (
            <NavLink to="/itens" icon={<List size={24} />} label="Itens" />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "LEITURA" ||
            currentUser.role === "ENCARREGADO") && (
            <NavLink
              to="/status"
              icon={<ClipboardList size={24} />}
              label="Status"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "LEITURA" ||
            currentUser.role === "PROJETISTA") && (
            <NavLink
              to="/pedidos"
              icon={<ShoppingCart size={24} />}
              label="Pedidos"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "LEITURA" ||
            currentUser.role === "ENCARREGADO") && (
            <NavLink
              to="/estoque"
              icon={<Layers size={24} />}
              label="Estoque"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "PROJETISTA") && (
            <NavLink
              to="/estoque-laser"
              icon={<Layers size={24} />}
              label="Estoque Pç Cortadas"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PROJETISTA" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "CORTE_LASER") && 
            (currentUser.id === "raul" || hasSector("laser") || hasSector("corte")) && (
            <NavLink to="/nests" icon={<Scissors size={24} />} label="Nests" />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "MONTAGEM_RODRIGO" ||
            currentUser.role === "PRODUCAO" ||
            currentUser.role === "SOLDA" ||
            currentUser.role === "MONTAGEM_RETRATIL" ||
            currentUser.role === "ENCARREGADO") && (
            <NavLink
              to="/producao"
              icon={<Activity size={24} />}
              label="Produção"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "CORTE_LASER") && 
            (currentUser.id === "raul" || hasSector("laser") || hasSector("corte")) && (
            <NavLink
              to="/cortelaser"
              icon={<Scissors size={24} />}
              label="Laser"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "PINTURA") && 
            (currentUser.id === "raul" || hasSector("pintura")) && (
            <NavLink
              to="/pintura"
              icon={<Paintbrush size={24} />}
              label="Pintura"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "PRENSA_EDUARDO") && 
            (currentUser.id === "raul" || hasMachine("eduardo") || hasMachine("prensa") || hasSector("prensa")) && (
            <NavLink
              to="/prensa-eduardo"
              icon={<Hammer size={24} />}
              label="Prensa (E)"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "TORNO_CNC_WILLIAN") && 
            (currentUser.id === "raul" || hasMachine("willian") || hasMachine("torno") || hasSector("torno")) && (
            <NavLink
              to="/torno-cnc-willian"
              icon={<Hammer size={24} />}
              label="Torno Willian"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "TORNO_CNC_HENRIQUE") && 
            (currentUser.id === "raul" || hasMachine("henrique") || hasMachine("torno") || hasSector("torno")) && (
            <NavLink
              to="/torno-cnc-henrique"
              icon={<Hammer size={24} />}
              label="Torno Henrique"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "PRENSA_RAFAEL") && 
            (currentUser.id === "raul" || hasMachine("rafael") || hasMachine("prensa") || hasSector("prensa")) && (
            <NavLink
              to="/prensa-rafael"
              icon={<Scissors size={24} />}
              label="Prensa (R)"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "INJETORA") && 
            (currentUser.id === "raul" || hasMachine("injetora") || hasSector("injetora")) && (
            <NavLink
              to="/injetora"
              icon={<Scissors size={24} />}
              label="Injetora"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "BANHO_QUIMICO") && 
            (currentUser.id === "raul" || hasMachine("banho") || hasMachine("zinc") || hasSector("banho") || hasSector("zinc") || hasSector("quimico")) && (
            <NavLink
              to="/banho-quimico"
              icon={<Beaker size={24} />}
              label="Banho/Zinc"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "EMBALAGEM") && 
            (currentUser.id === "raul" || hasSector("embalagem")) && (
            <NavLink
              to="/embalagem"
              icon={<Box size={24} />}
              label="Embalagem"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "PCP") && (
            <NavLink
              to="/logistica"
              icon={<Truck size={24} />}
              label="Logística"
            />
          )}

          {currentUser.role === "REPRESENTANTE" && (
            <NavLink
              to="/representante"
              icon={<ClipboardList size={24} />}
              label="Painel"
            />
          )}

          {(currentUser.role === "ADMIN" ||
            currentUser.role === "PCP" ||
            currentUser.role === "GERENCIA" ||
            currentUser.role === "ENCARREGADO" ||
            currentUser.role === "PROJETISTA" ||
            currentUser.id === "dinei" ||
            currentUser.id === "projetista_marcos") && (
            <NavLink
              to="/lotes"
              icon={<ClipboardList size={24} />}
              label="Lotes"
            />
          )}

          <NavLink
            to="/historico"
            icon={<History size={24} />}
            label="Histórico"
          />
        </nav>
      </div>

      {orderToPrint &&
        (() => {
          const allOrdersInGroup = db.orders.filter(
            (o) =>
              o.orderCode === orderToPrint.orderCode && o.isActive !== false,
          );
          const allOrderIds = allOrdersInGroup.map((o) => o.id);
          const logs = db.logs.filter(
            (l) => l.orderId && allOrderIds.includes(l.orderId),
          );

          return (
            <div className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs text-left text-slate-800">
              <style>{`
              @media print {
                .non-printable {
                  display: none !important;
                }
                #print-order-sheet {
                  display: block !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  min-height: 0 !important;
                  height: auto !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
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
              }
            `}</style>

              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 leading-normal">
                {/* Header (non-printable) */}
                <div className="bg-slate-900 text-[#00b14f] p-4 flex items-center justify-between border-b border-[#00b14f]/20 non-printable shrink-0">
                  <div className="flex items-center gap-2">
                    <Printer size={18} />
                    <h3 className="font-bold text-xs sm:text-sm text-white">
                      Espelho do Pedido (PDF / Impressão)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderToPrint(null)}
                    className="text-gray-400 hover:text-white transition duration-150 text-base font-bold px-1.5 focus:outline-none"
                  >
                    ✕
                  </button>
                </div>

                {/* Main Content (Scrollable Container) */}
                <div className="overflow-y-auto p-6 bg-slate-50 flex-1">
                  {/* Print Sheet Target */}
                  <div
                    id="print-order-sheet"
                    className="bg-white border rounded-xl shadow-xs p-6 max-w-xl mx-auto flex flex-col font-sans text-slate-800"
                    style={{ width: "100%", boxSizing: "border-box" }}
                  >
                    {/* Brand Branding Block */}
                    <div className="flex items-center justify-between border-b pb-4 border-slate-200 print-block">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-slate-950 p-2 rounded-lg border border-[#00b14f]/20 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-[#00b14f]"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M2 19h20v2H2v-2zm2-2.5h16L18 7l-4 4.5L12 4l-2 7.5L6 7 4 16.5z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">
                            IMPÉRIO JOMARCI
                          </h2>
                          <span className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider block mt-1">
                            Acessórios para Móveis e Artefatos de Metal
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] bg-[#00b14f]/10 text-[#00b14f] px-2 py-0.5 rounded font-black uppercase tracking-wider inline-block">
                          Espelho do Pedido
                        </span>
                      </div>
                    </div>

                    {/* Info Blocks Grid (Formatted as block-style cards) */}
                    <div className="grid grid-cols-2 gap-3 mt-4 print-block">
                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block">
                          Nº de Controle
                        </span>
                        <span className="text-sm font-black text-[#00b14f] font-mono block">
                          #{orderToPrint.orderCode}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block">
                          Status do Processo
                        </span>
                        <span className="text-xs font-black text-slate-850 block uppercase mt-0.5">
                          {orderToPrint.status || "PENDENTE"}
                        </span>
                      </div>

                      <div className="col-span-2 bg-slate-50 border border-slate-200/60 p-3 rounded-lg">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block">
                          Razão Social / Cliente
                        </span>
                        <span className="text-xs font-black text-slate-800 block mt-0.5">
                          {orderToPrint.customerName}
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block">
                          Representante Carteira
                        </span>
                        <span className="text-xs font-bold text-slate-705 block mt-0.5">
                          {orderToPrint.representativeName || "Venda Direta"}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block">
                          Previsão Prometida
                        </span>
                        <span className="text-xs font-bold text-rose-600 block mt-0.5 font-mono">
                          {orderToPrint.deliveryDate
                            ? orderToPrint.deliveryDate
                                .split("-")
                                .reverse()
                                .join("/")
                            : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Product Specification Section - Lists all items in the order group */}
                    <div className="mt-4 space-y-4 flex-container-to-block">
                      <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        Itens do Pedido ({allOrdersInGroup.length})
                      </h4>

                      {allOrdersInGroup.map((ordInGroup, index) => {
                        const itemInGroup = db.items.find(
                          (i) => i.id === ordInGroup.itemId,
                        );
                        const prodLabel =
                          itemInGroup?.name ||
                          ordInGroup.customProductName ||
                          `Produto #${ordInGroup.itemId}`;

                        return (
                          <div
                            key={ordInGroup.id}
                            className="border border-emerald-500/10 bg-emerald-50/15 p-3.5 rounded-lg print-block"
                          >
                            <span className="text-[8px] text-emerald-800 font-black uppercase tracking-wider block">
                              Item #{index + 1} - Produto & Atributos
                            </span>
                            <span className="text-xs font-black text-slate-900 block mt-0.5">
                              {prodLabel}
                            </span>

                            <div className="grid grid-cols-4 gap-2 mt-2.5 pt-2 border-t border-emerald-500/10 text-[10px] text-slate-705">
                              <div>
                                <span className="text-[8px] text-gray-450 block">
                                  Cor:
                                </span>
                                <strong className="block truncate">
                                  {ordInGroup.color || "-"}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-gray-450 block">
                                  Tamanho:
                                </span>
                                <strong className="block truncate">
                                  {ordInGroup.size || "-"}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-gray-450 block">
                                  Variação:
                                </span>
                                <strong className="block truncate">
                                  {ordInGroup.variation || "-"}
                                </strong>
                              </div>
                              <div className="bg-white/80 p-1.5 rounded border border-emerald-150 text-center">
                                <span className="text-[7px] text-[#00b14f] font-black block leading-none uppercase">
                                  Meta Lote
                                </span>
                                <strong className="text-xs font-black text-[#00b14f] mt-0.5 block leading-none">
                                  {ordInGroup.totalQuantity} pç
                                </strong>
                              </div>
                            </div>

                            {/* Progressive phases summary for this specific item */}
                            <div className="mt-3 bg-white/70 border border-slate-200/50 rounded-lg p-2 bg-slate-50/30">
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                                Resumo de Estágios Processados
                              </span>
                              <div className="grid grid-cols-5 gap-1 text-center text-[8px]">
                                <div className="bg-white border rounded py-0.5">
                                  <span className="text-gray-450 block text-[6px] uppercase">
                                    Cortado
                                  </span>
                                  <strong className="font-mono text-slate-700">
                                    {ordInGroup.cutQuantity || 0}
                                  </strong>
                                </div>
                                <div className="bg-white border rounded py-0.5">
                                  <span className="text-gray-450 block text-[6px] uppercase">
                                    Soldado
                                  </span>
                                  <strong className="font-mono text-slate-700">
                                    {ordInGroup.producedQuantity || 0}
                                  </strong>
                                </div>
                                <div className="bg-white border rounded py-0.5">
                                  <span className="text-gray-450 block text-[6px] uppercase">
                                    Pintado
                                  </span>
                                  <strong className="font-mono text-slate-700">
                                    {ordInGroup.paintedQuantity || 0}
                                  </strong>
                                </div>
                                <div className="bg-white border rounded py-0.5 bg-green-50/10">
                                  <span className="text-green-700 block text-[6px] uppercase">
                                    Embalado
                                  </span>
                                  <strong className="font-mono text-green-705">
                                    {ordInGroup.packedQuantity || 0}
                                  </strong>
                                </div>
                                <div className="bg-white border rounded py-0.5 bg-purple-50/10">
                                  <span className="text-purple-700 block text-[6px] uppercase">
                                    Faturado
                                  </span>
                                  <strong className="font-mono text-purple-755">
                                    {ordInGroup.invoicedQuantity || 0}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rastreabilidade logs */}
                    <div className="mt-4 border border-slate-200 p-3.5 rounded-lg bg-white print-block">
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block border-b pb-1.5 border-slate-100">
                        Rastreabilidade de PCP (Etapas Combinadas)
                      </span>
                      {logs.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic mt-2 text-center pb-1">
                          Nenhuma etapa física registrada para esses lotes.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                          {logs.slice(0, 15).map((log) => {
                            const op =
                              db.users.find((u) => u.id === log.operatorId)
                                ?.name || log.operatorId;
                            let act = "";
                            if (log.type === "CORTE_LASER")
                              act = `Corte de ${log.quantityCut || 0} pçs`;
                            if (log.type === "PRODUCAO")
                              act = `Solda/Processo de ${log.quantityProcessed || 0} pçs`;
                            if (log.type === "PINTURA")
                              act = `Pintura de ${log.quantityPainted || 0} pçs`;
                            if (log.type === "EMBALAGEM")
                              act = `Embalagem de ${log.quantityPacked || 0} pçs`;
                            if (log.type === "FATURAMENTO")
                              act = `Faturamento de ${log.quantityInvoiced || 0} pçs`;

                            return (
                              <div
                                key={log.id}
                                className="text-[9px] border-l-2 border-[#00b14f] pl-2 py-0.5"
                              >
                                <span className="text-slate-705 font-bold">
                                  {act}
                                </span>
                                <div className="text-[8px] text-gray-400">
                                  {new Date(log.timestamp).toLocaleString(
                                    "pt-BR",
                                  )}{" "}
                                  • Op: {op}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer - Interactions & Email Sender (non-printable) */}
                <div className="bg-gray-50 p-4 border-t flex flex-col gap-3 non-printable shrink-0">
                  {/* Email inputs */}
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-white border p-2.5 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block">
                        Enviar Cópia do Pedido por E-mail
                      </span>
                      <input
                        type="email"
                        placeholder="E-mail do Cliente (ex: cliente@dominio.com)"
                        value={emailToCustomerPrint}
                        onChange={(e) =>
                          setEmailToCustomerPrint(e.target.value)
                        }
                        className="w-full text-xs font-semibold focus:outline-none border-b border-transparent focus:border-[#00b14f] py-1 bg-transparent text-slate-800 placeholder-slate-400 mt-0.5"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSendingOrderPrintEmail}
                      onClick={async () => {
                        if (
                          !emailToCustomerPrint ||
                          !emailToCustomerPrint.includes("@")
                        ) {
                          alert("Por favor, digite um e-mail válido.");
                          return;
                        }
                        setIsSendingOrderPrintEmail(true);
                        try {
                          const itemsPayload = allOrdersInGroup.map((ord) => {
                            const itemInGroup = db.items.find(
                              (i) => i.id === ord.itemId,
                            );
                            const prodLabel =
                              itemInGroup?.name ||
                              ord.customProductName ||
                              `Produto #${ord.itemId}`;
                            return {
                              productDescription: prodLabel,
                              color: ord.color || "-",
                              size: ord.size || "-",
                              variation: ord.variation || "-",
                              totalQuantity: ord.totalQuantity || 0,
                            };
                          });

                          const textLogs =
                            logs
                              .map((l) => {
                                const opName =
                                  db.users.find((u) => u.id === l.operatorId)
                                    ?.name || l.operatorId;
                                return (
                                  `[${new Date(l.timestamp).toLocaleDateString("pt-BR")} ${new Date(l.timestamp).toLocaleTimeString("pt-BR")}] ` +
                                  `${l.type} - Qtd: ${l.quantityCut || l.quantityProcessed || l.quantityPainted || l.quantityPacked || l.quantityInvoiced || 0} • Operador: ${opName}`
                                );
                              })
                              .join("\n") ||
                            "Nenhum histórico físico registrado.";

                          const response = await fetch(
                            "/api/send-order-print-email",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                orderCode: orderToPrint.orderCode,
                                customerName: orderToPrint.customerName,
                                representativeName:
                                  orderToPrint.representativeName,
                                createdAt: orderToPrint.createdAt,
                                deliveryDate: orderToPrint.deliveryDate,
                                status: orderToPrint.status,
                                logsText: textLogs,
                                recipientEmail: emailToCustomerPrint,
                                items: itemsPayload,
                              }),
                            },
                          );
                          const resData = await response.json();
                          if (response.ok && resData.success) {
                            alert(
                              `Sucesso! E-mail com a cópia enviado para ${emailToCustomerPrint} (${resData.mode === "smtp" ? "SMTP Real" : "Log Simulado"})`,
                            );
                          } else {
                            alert(
                              "Erro ao processar: " +
                                (resData.error || "Erro desconhecido"),
                            );
                          }
                        } catch (err: any) {
                          alert("Erro de requisição: " + String(err));
                        } finally {
                          setIsSendingOrderPrintEmail(false);
                        }
                      }}
                      className={`bg-slate-900 hover:bg-zinc-800 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg transition whitespace-nowrap self-end select-none ${isSendingOrderPrintEmail ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {isSendingOrderPrintEmail
                        ? "Enviando..."
                        : "✉ Enviar E-mail"}
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOrderToPrint(null)}
                      className="px-4 py-1.5 border rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer bg-white"
                    >
                      Fechar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        import("./printUtils").then(({ printElementById }) => {
                          printElementById(
                            "print-order-sheet",
                            `Pedido_${orderToPrint.orderCode}`,
                            true,
                          );
                        });
                      }}
                      className="px-4 py-1.5 bg-[#00b14f] hover:bg-[#009e46] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/15"
                    >
                      <Printer size={13} /> Imprimir PDF do Pedido
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* PWA Installation Instruction Dialog / Modal */}
      {showPWAModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative text-left"
          >
            <button
              onClick={() => setShowPWAModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white cursor-pointer p-1 rounded-full hover:bg-zinc-800 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4" style={{ color: db.activeTenant?.primaryColor || '#00b14f' }}>
              <span className="text-2xl">📲</span>
              <h3 className="text-sm uppercase tracking-wider font-extrabold text-zinc-100">
                Instalar Apontador
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Instale o aplicativo de apontamento de produção para rodar em{" "}
              <strong>tela cheia sem as barras do navegador</strong> e ter acesso rápido pelo ícone no seu dispositivo.
            </p>

            {isInIframe ? (
              <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-900/40 text-xs text-zinc-300 flex flex-col gap-2.5 leading-snug">
                <span className="font-extrabold uppercase tracking-wider text-[10px] text-amber-400 block">
                  ⚠️ Executando no Editor de Testes
                </span>
                <p>
                  Por segurança, navegadores bloqueiam a instalação de PWAs quando exibidos dentro de um iframe.
                </p>
                <p>
                  Para instalar, por favor abra o sistema em uma nova aba fora do editor de testes:
                </p>
                <button
                  onClick={() => window.open(window.location.href, "_blank")}
                  className="w-full flex items-center justify-center gap-1.5 hover:opacity-90 text-black text-xs font-bold py-2.5 px-4 rounded-lg transition-all cursor-pointer mt-1"
                  style={{ backgroundColor: db.activeTenant?.primaryColor || '#00b14f' }}
                >
                  Abrir em Nova Aba ↗
                </button>
              </div>
            ) : deferredPrompt ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-zinc-300 font-medium">
                  Clique no botão abaixo para iniciar a instalação nativa do aplicativo:
                </p>
                <button
                  onClick={async () => {
                    await handleInstallClick();
                    setShowPWAModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 hover:opacity-90 text-black text-xs font-bold py-2.5 px-4 rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-950/30 animate-bounce"
                  style={{ backgroundColor: db.activeTenant?.primaryColor || '#00b14f' }}
                >
                  <span>📥</span> Instalar Aplicativo
                </button>
              </div>
            ) : isIOS ? (
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/40 text-xs text-zinc-400 flex flex-col gap-2 leading-relaxed">
                <span className="font-bold uppercase tracking-wide block text-zinc-200" style={{ color: db.activeTenant?.primaryColor || '#00b14f' }}>
                  Instruções para iPhone / iPad:
                </span>
                <p>
                  1. Toque no botão de <strong>Compartilhar</strong> (ícone{" "}
                  <span className="text-zinc-200">📤</span> na barra inferior do Safari).
                </p>
                <p>
                  2. Role para baixo e selecione{" "}
                  <strong>"Adicionar à Tela de Início"</strong> (ícone{" "}
                  <span className="text-zinc-200">➕</span>).
                </p>
                <p>
                  3. Clique em <strong>"Adicionar"</strong> no canto superior direito para confirmar.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/40 text-xs text-zinc-400 flex flex-col gap-2.5 leading-relaxed">
                <span className="font-bold uppercase tracking-wide block text-zinc-300">
                  Como Instalar Manualmente:
                </span>
                <p>
                  1. Clique no menu de <strong className="text-zinc-200">três pontinhos</strong> no canto superior do seu navegador.
                </p>
                <p>
                  2. Toque em <strong className="text-zinc-200">"Instalar aplicativo"</strong> ou <strong className="text-zinc-200">"Adicionar à tela inicial"</strong>.
                </p>
                <p className="text-[10px] block mt-1" style={{ color: db.activeTenant?.primaryColor || '#00b14f' }}>
                  ✓ Um ícone direto será criado para acesso instantâneo em tela cheia!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}
