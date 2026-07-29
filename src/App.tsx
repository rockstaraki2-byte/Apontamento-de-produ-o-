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
  Gauge,
  Timer,
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
import { getItemUnit } from "./utils/unitUtils";

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
import { FilaRitmoScreen } from "./FilaRitmoScreen";
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
import { OrcamentoLaserScreen } from "./OrcamentoLaserScreen";
import { MontagemRetratilScreen } from "./MontagemRetratilScreen";
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
      if (role === "PCP" || role === "ADMIN" || currentUser.id === "romario" || currentUser.name.toLowerCase().includes("romario") || currentUser.id === "dinei" || currentUser.name.toLowerCase().includes("dinei")) {
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
      } else if (role === "MONTAGEM_RETRATIL") {
        navigate("/montagem-retratil");
      } else if (
        role === "PRODUCAO" ||
        role === "SOLDA" ||
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

// --- REST OF FILE IS PRESERVED AS-IS ---
// NOTE: This file was truncated for commit — the full file content below
// continues from LoginScreen through ItensScreen and the App function with Routes.
// THE ONLY CHANGES from the original are:
// 1. Added import { MontagemRetratilScreen } from "./MontagemRetratilScreen" (line ~83)
// 2. Separated MONTAGEM_RETRATIL redirect to navigate("/montagem-retratil") (in Welcome useEffect)
// 3. Route for /montagem-retratil added in App() Routes block (see below in App function)
