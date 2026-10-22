import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, CircleAlert, RefreshCcw } from "lucide-react";
import { auth } from "./firebase";
import { canManageExpedition } from "./expeditionAccess";
import type { Carga, Order, User } from "./types";

type ConnectionStatus = {
  configured: boolean;
  calendarAccessible: boolean;
  serviceAccountEmail?: string;
  error?: string;
};

type SyncResponse = {
  ok: boolean;
  created: number;
  updated: number;
  deleted: number;
  eligibleLoads: number;
  errors?: Array<{ error?: string }>;
};

async function callCalendarApi(path: string, method: "GET" | "POST") {
  const user = auth.currentUser;
  if (!user) throw new Error("UNAUTHORIZED");
  const token = await user.getIdToken();
  const response = await fetch(path, {
    method,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
  });
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(String(payload.error || "GOOGLE_CALENDAR_REQUEST_FAILED"));
  return payload;
}

function errorMessage(code: string): string {
  if (code === "GOOGLE_CALENDAR_NOT_CONFIGURED") {
    return "Configure as credenciais e o ID do calendário de entregas no projeto Vercel.";
  }
  if (code === "GOOGLE_CALENDAR_INVALID_CONFIG" || code === "GOOGLE_CALENDAR_AUTH_FAILED") {
    return "As credenciais da conta técnica estão inválidas. Confira a configuração no Vercel.";
  }
  if (code === "GOOGLE_CALENDAR_ACCESS_DENIED") {
    return "A conta técnica não acessa o calendário. Compartilhe a agenda com o e-mail indicado, com permissão para alterar eventos.";
  }
  if (code === "UNAUTHORIZED") return "Sua sessão expirou. Entre novamente no ApontaPRO.";
  if (code === "FORBIDDEN") return "Seu usuário não tem acesso à sincronização de cargas.";
  return "Não foi possível sincronizar agora. Tente novamente.";
}

export function GoogleCalendarSyncControl({
  activeTenantId,
  currentUser,
  cargas,
  orders,
  cargasSyncState,
}: {
  activeTenantId: string;
  currentUser: User;
  cargas: Carga[];
  orders: Order[];
  cargasSyncState: "loading" | "live" | "cache" | "error";
}) {
  const allowed = activeTenantId === "imperio" && canManageExpedition(activeTenantId, currentUser);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const lastAutoSyncFingerprint = useRef("");

  const ordersById = useMemo(
    () => new Map(orders.map((order) => [Number(order.id), order])),
    [orders],
  );
  const syncFingerprint = useMemo(() => {
    const summary = cargas.map((carga) => ({
      id: carga.id,
      tenantId: carga.tenantId,
      name: carga.name,
      routeName: carga.routeName,
      shift: carga.shift,
      scheduledDate: carga.scheduledDate,
      departureDate: carga.departureDate,
      status: carga.status,
      stagingLocation: carga.stagingLocation,
      notes: carga.notes,
      driverName: carga.driverName,
      vehiclePlate: carga.vehiclePlate,
      orderIds: carga.orderIds,
      orderQuantities: carga.orderQuantities,
      orders: (carga.orderIds || []).map((id) => {
        const order = ordersById.get(Number(id));
        return order ? [order.orderCode, order.customerName, order.totalQuantity] : [id];
      }),
    })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return JSON.stringify(summary);
  }, [cargas, ordersById]);

  const refreshStatus = useCallback(async () => {
    if (!allowed) return;
    setStatusLoading(true);
    try {
      const payload = await callCalendarApi("/api/integration/google-calendar/status", "GET");
      setStatus({
        configured: Boolean(payload.configured),
        calendarAccessible: Boolean(payload.calendarAccessible),
        serviceAccountEmail: payload.serviceAccountEmail ? String(payload.serviceAccountEmail) : undefined,
        error: payload.error ? String(payload.error) : undefined,
      });
    } catch (error) {
      setStatus({
        configured: false,
        calendarAccessible: false,
        error: String((error as any)?.message || "GOOGLE_CALENDAR_STATUS_FAILED"),
      });
    } finally {
      setStatusLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const syncNow = useCallback(async (automatic = false) => {
    if (!allowed || syncing) return;
    setSyncing(true);
    setMessage("");
    setMessageError(false);
    try {
      const result = await callCalendarApi("/api/integration/google-calendar/sync", "POST") as SyncResponse;
      const warningCount = Array.isArray(result.errors) ? result.errors.length : 0;
      const suffix = warningCount ? " · " + warningCount + " ponto(s) precisam de revisão." : "";
      setMessage(
        "Calendário atualizado: " + result.created + " novo(s), " +
        result.updated + " atualizado(s), " + result.deleted + " removido(s)." + suffix,
      );
      setMessageError(warningCount > 0 || result.ok === false);
      lastAutoSyncFingerprint.current = syncFingerprint;
    } catch (error) {
      const code = String((error as any)?.message || "GOOGLE_CALENDAR_SYNC_FAILED");
      setMessage(errorMessage(code));
      setMessageError(true);
    } finally {
      setSyncing(false);
      if (!automatic) void refreshStatus();
    }
  }, [allowed, syncing, syncFingerprint, refreshStatus]);

  useEffect(() => {
    if (
      !allowed ||
      statusLoading ||
      !status?.configured ||
      !status.calendarAccessible ||
      cargasSyncState !== "live" ||
      lastAutoSyncFingerprint.current === syncFingerprint
    ) return;

    const timer = window.setTimeout(() => {
      lastAutoSyncFingerprint.current = syncFingerprint;
      void syncNow(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [allowed, statusLoading, status, cargasSyncState, syncFingerprint, syncNow]);

  if (!allowed) return null;

  const connectionText = statusLoading
    ? "Verificando conexão com o Google Calendar..."
    : !status?.configured
      ? "Integração ainda não configurada. Defina GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY e GOOGLE_CALENDAR_ID no Vercel."
      : status.calendarAccessible
        ? "Conectado. As cargas futuras do Império são sincronizadas enquanto esta tela está aberta."
        : errorMessage(status.error || "GOOGLE_CALENDAR_ACCESS_DENIED");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <CalendarDays size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-slate-900">Calendário de entregas</h2>
          <p className="text-xs text-slate-600">{connectionText}</p>
          {status?.serviceAccountEmail && (
            <p className="mt-1 break-all text-[11px] text-slate-500">
              Compartilhe o calendário com <strong>{status.serviceAccountEmail}</strong> como editor.
            </p>
          )}
          {message && (
            <p className={"mt-1 text-xs font-semibold " + (messageError ? "text-amber-700" : "text-emerald-700")}>
              {messageError && <CircleAlert size={13} className="mr-1 inline" />}
              {!messageError && <CheckCircle2 size={13} className="mr-1 inline" />}
              {message}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void syncNow(false)}
        disabled={!status?.configured || syncing || statusLoading || cargasSyncState !== "live"}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        title="Sincroniza as cargas futuras do Império com o Google Calendar"
      >
        <RefreshCcw size={14} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Sincronizando..." : "Sincronizar agora"}
      </button>
    </section>
  );
}
