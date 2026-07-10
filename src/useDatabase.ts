import { useState, useEffect, useRef, useMemo } from "react";
import type {
  User,
  Item,
  Order,
  ProductionLog,
  Employee,
  EpiDistribution,
  Uniform,
  UniformDistribution,
  ProductAttribute,
  ActiveTask,
  AppNotification,
  StockEntry,
  StockMovement,
  NestTask,
  Customer,
  Sector,
  ProductFlow,
  ProductionBatch,
  ProductionAgenda,
  CoilCuttingPlan,
  Carga,
  ProductionSchedule,
  ExtraHourEntry,
  ItemPriceHistory,
  SystemSettings,
  TornoEvent,
  MachineStop,
  PerformanceQuestion,
  PerformanceReview,
  Tenant,
} from "./types";
import { db } from "./firebase";
import {
  enqueueAction,
  getQueue,
  removeFromQueue,
  processQueueItem,
} from "./syncQueue";
import {
  collection,
  onSnapshot,
  setDoc as setDocFirebase,
  doc,
  deleteDoc,
  writeBatch,
  updateDoc as updateDocFirebase,
  disableNetwork,
  enableNetwork,
} from "firebase/firestore";

import { CUSTOMER_TRADE_NAMES } from "./data/customerTradeNames";

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
  }
  return cleaned as T;
}

let lastAssignedId = 0;
export function getUniqueNumericId(): number {
  const now = Date.now();
  if (now <= lastAssignedId) {
    lastAssignedId++;
  } else {
    lastAssignedId = now;
  }
  return lastAssignedId;
}

const INITIAL_USERS: User[] = [
  { id: "raul", name: "Raul", role: "ADMIN", password: "230213", tenantId: "global" },
  { id: "gerencia", name: "Gerência", role: "ADMIN", password: "1111", tenantId: "imperio" },
  { id: "romario", name: "Romario", role: "LEITURA", tenantId: "imperio" },
  { id: "alessandra", name: "Alessandra", role: "LEITURA", tenantId: "imperio" },
  { id: "pcp", name: "PCP", role: "PCP", password: "1111", tenantId: "imperio" },
  { id: "embalagem", name: "Embalagem", role: "EMBALAGEM", tenantId: "imperio" },
  {
    id: "dinei",
    name: "Encarregado - Dinei",
    role: "ENCARREGADO",
    password: "1111",
    tenantId: "imperio",
  },
  { id: "solda", name: "Solda", role: "SOLDA", password: "1111", tenantId: "imperio" },
  {
    id: "montagem_retratil",
    name: "Montagem de Retrátil",
    role: "MONTAGEM_RETRATIL",
    password: "1111",
    tenantId: "imperio",
  },
  {
    id: "montagem_rodrigo",
    name: "Renata - Pendurar Barra chata",
    role: "MONTAGEM_RODRIGO",
    password: "1111",
    tenantId: "imperio",
  },
  { id: "pintura", name: "Pintura", role: "PINTURA", tenantId: "imperio" },
  {
    id: "cortelaser_giovani",
    name: "Corte a Laser - Giovani",
    role: "CORTE_LASER",
    tenantId: "imperio",
  },
  {
    id: "cortelaser_clovis",
    name: "Corte a Laser - Clovis",
    role: "CORTE_LASER",
    tenantId: "imperio",
  },
  {
    id: "projetista_marcos",
    name: "Marcos (Projetista)",
    role: "PROJETISTA",
    password: "1111",
    tenantId: "imperio",
  },
  {
    id: "representante_kesse",
    name: "Kesse Representante",
    role: "REPRESENTANTE",
    phone: "",
    tenantId: "imperio",
  },
  {
    id: "representante_imperio",
    name: "Império Representante",
    role: "REPRESENTANTE",
    phone: "",
    tenantId: "imperio",
  },
  {
    id: "representante_andre",
    name: "André Representante",
    role: "REPRESENTANTE",
    phone: "",
    tenantId: "imperio",
  },
  {
    id: "representante_danilo",
    name: "Danilo Representante",
    role: "REPRESENTANTE",
    phone: "",
    tenantId: "imperio",
  },
  { id: "prensa_eduardo", name: "Prensa Eduardo", role: "PRENSA_EDUARDO", tenantId: "imperio" },
  { id: "prensa_rafael", name: "Prensa Rafael", role: "PRENSA_RAFAEL", tenantId: "imperio" },
  {
    id: "torno_cnc_willian",
    name: "Torno CNC Willian",
    role: "TORNO_CNC_WILLIAN",
    tenantId: "imperio",
  },
  {
    id: "torno_cnc_henrique",
    name: "Torno CNC Henrique",
    role: "TORNO_CNC_HENRIQUE",
    tenantId: "imperio",
  },
  { id: "injetora", name: "Injetora", role: "INJETORA", tenantId: "imperio" },
  { id: "banho_quimico", name: "Banho Químico", role: "BANHO_QUIMICO", tenantId: "imperio" },
];

export function useDatabase(currentUser?: User | null) {
  const [selectedTenantId, setSelectedTenantIdState] = useState<string>(() => {
    return localStorage.getItem("active_tenant_id") || "imperio";
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const activeTenantId = currentUser?.tenantId === "global" ? selectedTenantId : (currentUser?.tenantId || "imperio");

  const setSelectedTenantId = (id: string) => {
    setSelectedTenantIdState(id);
    localStorage.setItem("active_tenant_id", id);
  };

  const setDoc = async (ref: any, data: any, options?: any) => {
    const collName = ref.parent?.id;
    if (collName && collName !== "tenants" && collName !== "users") {
      data = { tenantId: activeTenantId, ...data };
    }
    return options ? setDocFirebase(ref, data, options) : setDocFirebase(ref, data);
  };

  const updateDoc = async (ref: any, data: any) => {
    const collName = ref.parent?.id;
    if (collName && collName !== "tenants" && collName !== "users") {
      data = { tenantId: activeTenantId, ...data };
    }
    return updateDocFirebase(ref, data);
  };

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("producao_users_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garante que novos campos nos INITIAL_USERS sejam mesclados caso não existam no salvo
        return INITIAL_USERS.map((initU) => {
          const match = parsed.find((p: User) => p.id === initU.id);
          const merged = match ? { ...initU, ...match } : initU;
          if (initU.id === "raul") {
            merged.password = "230213";
            merged.role = "ADMIN";
            merged.tenantId = "global";
          }
          return merged;
        });
      } catch (e) {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const quotaExceededRef = useRef(false);
  const isSyncingRef = useRef(false);
  const syncRetriesRef = useRef<{
    [id: number]: { attempts: number; nextRetryTime: number };
  }>({});
  const retryTimerRef = useRef<any>(null);

  const updateQueueCount = async () => {
    try {
      const q = await getQueue();
      setSyncQueueCount(q.length);
    } catch (e) {
      console.error("Error reading sync queue length:", e);
    }
  };

  const runSync = async (force = false) => {
    if (force) {
      quotaExceededRef.current = false;
      setQuotaExceeded(false);
      try {
        await enableNetwork(db);
        console.log("Firestore network re-enabled manually.");
      } catch (e) {
        console.error("Failed to re-enable network manually:", e);
      }
    }

    if (quotaExceededRef.current && !force) {
      console.warn(
        "Skip syncing queue items because Firestore quota is currently exceeded.",
      );
      return;
    }

    if (isSyncingRef.current || isSyncing) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      let q = await getQueue();
      while (q.length > 0) {
        const item = q[0];

        // Check backoff condition
        const retryInfo = syncRetriesRef.current[item.id];
        if (retryInfo && retryInfo.nextRetryTime > Date.now()) {
          const delay = retryInfo.nextRetryTime - Date.now();
          console.warn(
            `Skip syncing queue item ${item.id} (type ${item.type}) due to active backoff. Retrying in ${Math.round(delay / 1000)}s.`,
          );
          if (!retryTimerRef.current) {
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              runSync();
            }, delay + 50);
          }
          break; // Stop syncing for now to maintain chronological sequence
        }

        try {
          await processQueueItem(item);
          await removeFromQueue(item.id);
          if (syncRetriesRef.current[item.id]) {
            delete syncRetriesRef.current[item.id];
          }
          if (quotaExceededRef.current) {
            quotaExceededRef.current = false;
            setQuotaExceeded(false);
            try {
              await enableNetwork(db);
              console.log(
                "Firestore network re-enabled successfully on successful write.",
              );
            } catch (e) {
              console.error("Failed to re-enable firestore network:", e);
            }
          }
          q = await getQueue();
          setSyncQueueCount(q.length);
        } catch (error: any) {
          console.error("Queue sync error for item:", item, "Error:", error);

          const isQuota =
            error?.code === "resource-exhausted" ||
            (error?.message &&
              (error.message.toLowerCase().includes("quota") ||
                error.message.toLowerCase().includes("resource-exhausted") ||
                error.message.toLowerCase().includes("exhausted")));

          if (isQuota) {
            setQuotaExceeded(true);
            quotaExceededRef.current = true;
            try {
              await disableNetwork(db);
              console.warn(
                "Firestore network disabled due to quota exhaustion.",
              );
            } catch (netErr) {
              console.error("Failed to disable Firestore network:", netErr);
            }

            // On quota exhaustion, do not increment attempts count (never discard item). Just lock with 5-minute backoff.
            const backoffDelay = 300000; // 5 minutes
            syncRetriesRef.current[item.id] = {
              attempts: syncRetriesRef.current[item.id]?.attempts || 0,
              nextRetryTime: Date.now() + backoffDelay,
            };
            console.warn(
              `Quota limit exceeded. Retrying queue item ${item.id} of type ${item.type} in 5 minutes. Item preserved in queue.`,
            );

            if (!retryTimerRef.current) {
              retryTimerRef.current = setTimeout(async () => {
                retryTimerRef.current = null;
                try {
                  quotaExceededRef.current = false;
                  setQuotaExceeded(false);
                  await enableNetwork(db);
                  console.info(
                    "Firestore network re-enabled automatically after 5-minute quota backoff.",
                  );
                } catch (netErr) {
                  console.error(
                    "Failed to re-enable network automatically after backoff:",
                    netErr,
                  );
                }
                runSync();
              }, backoffDelay + 50);
            }
            break;
          }

          const prev = syncRetriesRef.current[item.id] || {
            attempts: 0,
            nextRetryTime: 0,
          };
          const currentAttempts = prev.attempts + 1;

          // Exponential backoff formulation: 1s, 2s, 4s, 8s, 16s...
          const backoffDelay = 1000 * Math.pow(2, currentAttempts);
          syncRetriesRef.current[item.id] = {
            attempts: currentAttempts,
            nextRetryTime: Date.now() + backoffDelay,
          };

          if (currentAttempts >= 5) {
            console.error(
              `Discarding stuck queue item ${item.id} of type ${item.type} after ${currentAttempts} failed attempts to avoid blocking database sync.`,
            );
            await removeFromQueue(item.id);
            delete syncRetriesRef.current[item.id];

            // Show alert/notification warning of discarded incorrect item
            alert(
              `Aviso: Um registro inválido do tipo "${item.type}" falhou nas dezenas de tentativas de sincronização e foi descartado para não travar o sistema. Detalhes: ${error?.message || error}`,
            );

            q = await getQueue();
            setSyncQueueCount(q.length);
          } else {
            console.warn(
              `Retrying sync item ${item.id} of type ${item.type} later. Attempt ${currentAttempts}/5. Backoff delay is ${backoffDelay}ms`,
            );

            if (!retryTimerRef.current) {
              retryTimerRef.current = setTimeout(() => {
                retryTimerRef.current = null;
                runSync();
              }, backoffDelay + 50);
            }
            break;
          }
        }
      }
    } catch (e) {
      console.error("Queue sync processing failed:", e);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      updateQueueCount();
    }
  };
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const runWrite = async (
    operationName: string,
    operation: () => Promise<void>,
  ) => {
    try {
      await operation();
    } catch (e: any) {
      console.error(`Error during Firestore write [${operationName}]:`, e);
      const msg = e?.message || String(e);
      setPermissionError(
        `Erro ao salvar no Firestore [${operationName}]: ${msg}`,
      );
      alert(
        `⚠️ Falha ao salvar dados (${operationName}). Detalhes: ${msg}. Por favor, verifique se a conexão com o Firestore está ativa.`,
      );
      throw e;
    }
  };

  const handleSnapshotError = (collectionName: string, error: any) => {
    console.error(
      `onSnapshot error for collection "${collectionName}":`,
      error,
    );
    const msg = error?.message || String(error);
    if (error && error.code === "permission-denied") {
      setPermissionError(
        `Sem permissão para ler a coleção "${collectionName}". Por favor, verifique regras de acesso ou faça login novamente.`,
      );
    } else if (msg.includes("not-found") || error?.code === "not-found") {
      setPermissionError(
        `Banco de dados Firestore ou coleção "${collectionName}" não encontrado na nuvem. Verifique o provisionamento.`,
      );
    } else if (error && error.code) {
      setPermissionError(
        `Erro de conexão com o Firestore na coleção "${collectionName}": [${error.code}] ${msg}`,
      );
    } else {
      setPermissionError(
        `Erro de inicialização ou leitura do Firestore na coleção "${collectionName}".`,
      );
    }
  };

  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [logs, setLogsState] = useState<ProductionLog[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [activePacks, setActivePacksState] = useState<ActiveTask[]>([]);
  const [nestTasks, setNestTasksState] = useState<NestTask[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [epiDistributions, setEpiDistributions] = useState<EpiDistribution[]>(
    [],
  );
  const [uniforms, setUniforms] = useState<Uniform[]>([]);
  const [uniformDistributions, setUniformDistributions] = useState<
    UniformDistribution[]
  >([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [productFlows, setProductFlows] = useState<ProductFlow[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>(
    [],
  );
  const [productionAgendas, setProductionAgendas] = useState<
    ProductionAgenda[]
  >([]);
  const [coilCuttingPlans, setCoilCuttingPlans] = useState<CoilCuttingPlan[]>(
    [],
  );
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [productionSchedules, setProductionSchedules] = useState<
    ProductionSchedule[]
  >([]);
  const [extraHours, setExtraHours] = useState<ExtraHourEntry[]>([]);
  const [priceHistories, setPriceHistories] = useState<ItemPriceHistory[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings[]>([]);
  const [agentReports, setAgentReports] = useState<any[]>([]);

  // New collections for CNC Torno, Machine stops, and performance evaluations
  const [tornoEvents, setTornoEvents] = useState<TornoEvent[]>([]);
  const [machineStops, setMachineStops] = useState<MachineStop[]>([]);
  const [performanceQuestions, setPerformanceQuestions] = useState<
    PerformanceQuestion[]
  >([]);
  const [performanceReviews, setPerformanceReviews] = useState<
    PerformanceReview[]
  >([]);
  const [attendances, setAttendances] = useState<import("./types").AttendanceRecord[]>([]);

  useEffect(() => {
    updateQueueCount();
    runSync();

    const handleOnline = () => {
      runSync();
    };
    window.addEventListener("online", handleOnline);

    const interval = setInterval(() => {
      runSync();
    }, 15000);

    const unsubTenants = onSnapshot(
      collection(db, "tenants"),
      (snap) => {
        let list = snap.docs.map((d) => d.data() as Tenant);
        const imperioIndex = list.findIndex((t) => t.id === "imperio");
        if (imperioIndex !== -1) {
          const imperio = list[imperioIndex];
          if (imperio.systemName === "Império Produção") {
            imperio.systemName = "Apontador de Produção";
            setDoc(doc(db, "tenants", "imperio"), { systemName: "Apontador de Produção" }, { merge: true }).catch(console.error);
          }
        } else if (list.length === 0) {
          const imperioTenant = { id: "imperio", name: "Império Jomarci", logoUrl: "/icon.png", primaryColor: "#00b14f", systemName: "Apontador de Produção" };
          setDoc(doc(db, "tenants", "imperio"), imperioTenant).catch(console.error);
          list = [imperioTenant];
        }
        setTenants(list);
      },
      (err) => handleSnapshotError("tenants", err),
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as User);
        setUsers((prev) => {
          const merged = INITIAL_USERS.map((initU) => {
            const dbUser = list.find((u) => u.id === initU.id);
            const mergedUser = dbUser ? { ...initU, ...dbUser } : initU;
            if (initU.id === "raul") {
              mergedUser.password = "230213";
              mergedUser.role = "ADMIN";
              mergedUser.tenantId = "global";
            }
            return mergedUser;
          });
          list.forEach((dbUser) => {
            if (!merged.some((u) => u.id === dbUser.id)) {
              merged.push(dbUser);
            }
          });
          localStorage.setItem("producao_users_v2", JSON.stringify(merged));
          return merged;
        });
      },
      (err) => handleSnapshotError("users", err),
    );

    const unsubItems = onSnapshot(
      collection(db, "items"),
      (snap) => setItems(snap.docs.map((d) => d.data() as Item)),
      (err) => handleSnapshotError("items", err),
    );
    const unsubOrders = onSnapshot(
      collection(db, "orders"),
      (snap) => {
        const loadedOrders = snap.docs.map((d) => {
          const ord = d.data() as Order;
          if (
            ord.representativeName &&
            ord.representativeName.toLowerCase().includes("mapefor")
          ) {
            return {
              ...ord,
              representativeName: "Danilo Representante",
              representativeId: "representante_danilo",
            };
          }
          return ord;
        });
        setOrdersState(loadedOrders);
      },
      (err) => handleSnapshotError("orders", err),
    );
    const unsubLogs = onSnapshot(
      collection(db, "logs"),
      (snap) => setLogsState(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as ProductionLog)),
      (err) => handleSnapshotError("logs", err),
    );
    const unsubAttrs = onSnapshot(
      collection(db, "attributes"),
      (snap) =>
        setAttributes(snap.docs.map((d) => d.data() as ProductAttribute)),
      (err) => handleSnapshotError("attributes", err),
    );
    const unsubActivePacks = onSnapshot(
      collection(db, "activePacks"),
      (snap) =>
        setActivePacksState(snap.docs.map((d) => d.data() as ActiveTask)),
      (err) => handleSnapshotError("activePacks", err),
    );
    const unsubNestTasks = onSnapshot(
      collection(db, "nestTasks"),
      (snap) => setNestTasksState(snap.docs.map((d) => d.data() as NestTask)),
      (err) => handleSnapshotError("nestTasks", err),
    );
    const unsubNotifications = onSnapshot(
      collection(db, "notifications"),
      (snap) =>
        setNotifications(
          snap.docs
            .map((d) => d.data() as AppNotification)
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      (err) => handleSnapshotError("notifications", err),
    );
    const unsubStocks = onSnapshot(
      collection(db, "stocks"),
      (snap) => setStocks(snap.docs.map((d) => d.data() as StockEntry)),
      (err) => handleSnapshotError("stocks", err),
    );
    const unsubMovements = onSnapshot(
      collection(db, "stock_movements"),
      (snap) =>
        setStockMovements(snap.docs.map((d) => d.data() as StockMovement)),
      (err) => handleSnapshotError("stock_movements", err),
    );
    const unsubEmployees = onSnapshot(
      collection(db, "employees"),
      (snap) => setEmployees(snap.docs.map((d) => d.data() as Employee)),
      (err) => handleSnapshotError("employees", err),
    );
    const unsubEpiDistributions = onSnapshot(
      collection(db, "epiDistributions"),
      (snap) =>
        setEpiDistributions(snap.docs.map((d) => d.data() as EpiDistribution)),
      (err) => handleSnapshotError("epiDistributions", err),
    );
    const unsubUniforms = onSnapshot(
      collection(db, "uniforms"),
      (snap) => setUniforms(snap.docs.map((d) => d.data() as Uniform)),
      (err) => handleSnapshotError("uniforms", err),
    );
    const unsubUniformDistributions = onSnapshot(
      collection(db, "uniformDistributions"),
      (snap) =>
        setUniformDistributions(
          snap.docs.map((d) => d.data() as UniformDistribution),
        ),
      (err) => handleSnapshotError("uniformDistributions", err),
    );
    const unsubCustomers = onSnapshot(
      collection(db, "customers"),
      (snap) =>
        setCustomers(
          snap.docs.map((d) => {
            const data = d.data() as Customer;
            return {
              ...data,
              tradeName: data.tradeName || CUSTOMER_TRADE_NAMES[data.id] || "",
            };
          }),
        ),
      (err) => handleSnapshotError("customers", err),
    );
    const unsubSectors = onSnapshot(
      collection(db, "sectors"),
      (snap) => setSectors(snap.docs.map((d) => d.data() as Sector)),
      (err) => handleSnapshotError("sectors", err),
    );
    const unsubProductFlows = onSnapshot(
      collection(db, "productFlows"),
      (snap) => setProductFlows(snap.docs.map((d) => d.data() as ProductFlow)),
      (err) => handleSnapshotError("productFlows", err),
    );
    const unsubBatches = onSnapshot(
      collection(db, "productionBatches"),
      (snap) =>
        setProductionBatches(snap.docs.map((d) => d.data() as ProductionBatch)),
      (err) => handleSnapshotError("productionBatches", err),
    );
    const unsubAgendas = onSnapshot(
      collection(db, "productionAgendas"),
      (snap) =>
        setProductionAgendas(
          snap.docs.map((d) => d.data() as ProductionAgenda),
        ),
      (err) => handleSnapshotError("productionAgendas", err),
    );
    const unsubCoilPlans = onSnapshot(
      collection(db, "coilCuttingPlans"),
      (snap) =>
        setCoilCuttingPlans(snap.docs.map((d) => d.data() as CoilCuttingPlan)),
      (err) => handleSnapshotError("coilCuttingPlans", err),
    );
    const unsubCargas = onSnapshot(
      collection(db, "cargas"),
      (snap) => setCargas(snap.docs.map((d) => d.data() as Carga)),
      (err) => handleSnapshotError("cargas", err),
    );
    const unsubSchedules = onSnapshot(
      collection(db, "productionSchedules"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ProductionSchedule);
        setProductionSchedules(list);
        const globalSched = list.find((s) => s.id === "global");
        if (globalSched) {
          localStorage.setItem(
            "production_schedule",
            JSON.stringify(globalSched),
          );
        }
      },
      (err) => handleSnapshotError("productionSchedules", err),
    );
    const unsubExtraHours = onSnapshot(
      collection(db, "extraHours"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ExtraHourEntry);
        setExtraHours(list);
        localStorage.setItem("extra_hours", JSON.stringify(list));
      },
      (err) => handleSnapshotError("extraHours", err),
    );
    const unsubSystemSettings = onSnapshot(
      collection(db, "systemSettings"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as SystemSettings);
        setSystemSettings(list);
      },
      (err) => handleSnapshotError("systemSettings", err),
    );

    const unsubAgentReports = onSnapshot(
      collection(db, "agentReports"),
      (snap) => {
        const list = snap.docs.map((d) => d.data());
        setAgentReports(list);
      },
      (err) => handleSnapshotError("agentReports", err),
    );

    const unsubTornoEvents = onSnapshot(
      collection(db, "tornoEvents"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as TornoEvent);
        setTornoEvents(list);
      },
      (err) => handleSnapshotError("tornoEvents", err),
    );

    const unsubMachineStops = onSnapshot(
      collection(db, "machineStops"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as MachineStop);
        setMachineStops(list);
      },
      (err) => handleSnapshotError("machineStops", err),
    );

    const unsubPerformanceQuestions = onSnapshot(
      collection(db, "performanceQuestions"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as PerformanceQuestion);
        setPerformanceQuestions(list);
      },
      (err) => handleSnapshotError("performanceQuestions", err),
    );

    const unsubPerformanceReviews = onSnapshot(
      collection(db, "performanceReviews"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as PerformanceReview);
        setPerformanceReviews(list);
      },
      (err) => handleSnapshotError("performanceReviews", err),
    );

    const unsubAttendances = onSnapshot(
      collection(db, "attendances"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as import("./types").AttendanceRecord);
        setAttendances(list);
      },
      (err) => handleSnapshotError("attendances", err),
    );

    let unsubPriceHistories = () => {};
    if (
      currentUser &&
      (currentUser.role === "ADMIN" ||
        currentUser.role === "GERENCIA" ||
        currentUser.role === "REPRESENTANTE" ||
        currentUser.role === "PCP")
    ) {
      unsubPriceHistories = onSnapshot(
        collection(db, "priceHistories"),
        (snap) =>
          setPriceHistories(snap.docs.map((d) => d.data() as ItemPriceHistory)),
        (err) => handleSnapshotError("priceHistories", err),
      );
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
      unsubTenants();
      unsubUsers();
      unsubItems();
      unsubOrders();
      unsubLogs();
      unsubAttrs();
      unsubActivePacks();
      unsubNestTasks();
      unsubNotifications();
      unsubStocks();
      unsubMovements();
      unsubEmployees();
      unsubEpiDistributions();
      unsubUniforms();
      unsubUniformDistributions();
      unsubCustomers();
      unsubSectors();
      unsubProductFlows();
      unsubBatches();
      unsubAgendas();
      unsubCoilPlans();
      unsubCargas();
      unsubSchedules();
      unsubExtraHours();
      unsubSystemSettings();
      unsubAgentReports();
      unsubPriceHistories();
      unsubTornoEvents();
      unsubMachineStops();
      unsubPerformanceQuestions();
      unsubPerformanceReviews();
      unsubAttendances();
    };
  }, [currentUser]);

  const updateStocks = async (updatedStocks: StockEntry[]) => {
    const changed = updatedStocks.filter((updated) => {
      const current = stocks.find((s) => s.id === updated.id);
      if (!current) return true;
      return JSON.stringify(current) !== JSON.stringify(updated);
    });
    if (changed.length === 0) {
      console.log("updateStocks: No stocks actually changed. Skipping write.");
      return;
    }
    const changedWithTenant = changed.map((s) => ({
      tenantId: activeTenantId,
      ...s,
    }));
    await enqueueAction("UPDATE_STOCKS", { stocks: changedWithTenant });
    runSync();
  };

  const addItem = async (item: Omit<Item, "id">) => {
    const id = getUniqueNumericId();
    await runWrite("Cadastrar Item", async () => {
      await setDoc(
        doc(db, "items", id.toString()),
        cleanUndefined({ ...item, id }),
      );
    });
  };

  const updateItem = async (updatedItem: Item) => {
    const current = items.find((i) => i.id === updatedItem.id);
    if (current && JSON.stringify(current) === JSON.stringify(updatedItem)) {
      return;
    }
    await runWrite("Atualizar Item", async () => {
      await setDoc(
        doc(db, "items", updatedItem.id.toString()),
        cleanUndefined(updatedItem),
        { merge: true },
      );
    });
  };

  const deleteItem = async (id: number) => {
    await runWrite("Excluir Item", async () => {
      await deleteDoc(doc(db, "items", id.toString()));
    });
  };

  const addOrder = async (order: Omit<Order, "id">) => {
    const id = getUniqueNumericId();
    let updatedOrder = { ...order };

    if (updatedOrder.representativeName) {
      const searchName = updatedOrder.representativeName.toLowerCase();
      if (searchName.includes("mapefor")) {
        updatedOrder.representativeName = "Danilo Representante";
        updatedOrder.representativeId = "representante_danilo";
      } else {
        const rep = users.find(
          (u) =>
            u.role === "REPRESENTANTE" &&
            (u.name.toLowerCase().includes(searchName) ||
              searchName.includes(u.name.toLowerCase())),
        );
        if (rep) {
          updatedOrder.representativeId = rep.id;
        }
      }
    }

    await runWrite("Adicionar Pedido", async () => {
      await setDoc(
        doc(db, "orders", id.toString()),
        cleanUndefined({ ...updatedOrder, id }),
      );
    });

    if (updatedOrder.representativeId) {
      addNotification({
        message: `Novo pedido #${updatedOrder.orderCode} recebido para o cliente ${updatedOrder.customerName}.`,
        read: false,
        type: "novo_pedido",
        recipientId: updatedOrder.representativeId,
        orderId: id,
        details: {
          customerName: updatedOrder.customerName,
          status: updatedOrder.status,
        },
      });
    }
  };

  const deleteOrder = async (id: number) => {
    await runWrite("Excluir Pedido", async () => {
      await deleteDoc(doc(db, "orders", id.toString()));
    });
  };

  const updateOrders = async (updatedOrders: Order[] | Order) => {
    const list = Array.isArray(updatedOrders) ? updatedOrders : [updatedOrders];
    const normalizedList = list.map((o) => {
      let updated = { ...o };
      if (updated.representativeName) {
        const searchName = updated.representativeName.toLowerCase();
        if (searchName.includes("mapefor")) {
          updated.representativeName = "Danilo Representante";
          updated.representativeId = "representante_danilo";
        }
      }
      return updated;
    });

    const changed = normalizedList.filter((updated) => {
      const current = orders.find((o) => o.id === updated.id);
      if (!current) return true;
      return JSON.stringify(current) !== JSON.stringify(updated);
    });
    if (changed.length === 0) {
      console.log("updateOrders: No orders actually changed. Skipping write.");
      return;
    }
    const changedWithTenant = changed.map((o) => ({
      tenantId: activeTenantId,
      ...o,
    }));
    await enqueueAction("UPDATE_ORDERS", { orders: changedWithTenant });
    runSync();
  };

  const addNestTasks = async (tasks: any[]) => {
    const batch = writeBatch(db);
    const now = Date.now();
    tasks.forEach((t, i) => {
      const id = now + i;
      const fullTask: NestTask = {
        cutQuantity: 0,
        status: "PLANEJAMENTO",
        isActive: true,
        ...t,
        id,
        createdAt: t.createdAt || now,
      };
      batch.set(doc(db, "nestTasks", id.toString()), cleanUndefined(fullTask));
    });
    await batch.commit();
  };

  const updateNestTasks = async (updated: NestTask[]) => {
    const changed = updated.filter((updatedTask) => {
      const current = nestTasks.find((t) => t.id === updatedTask.id);
      if (!current) return true;
      return JSON.stringify(current) !== JSON.stringify(updatedTask);
    });
    if (changed.length === 0) {
      console.log(
        "updateNestTasks: No nestTasks actually changed. Skipping write.",
      );
      return;
    }
    const changedWithTenant = changed.map((t) => ({
      tenantId: activeTenantId,
      ...t,
    }));
    await enqueueAction("UPDATE_NEST_TASKS", { tasks: changedWithTenant });
    runSync();
  };

  const deleteNestTask = async (id: number) => {
    await deleteDoc(doc(db, "nestTasks", id.toString()));
  };

  const updateUser = async (id: string, partial: Partial<User>) => {
    try {
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === id ? { ...u, ...partial } : u));
        localStorage.setItem("producao_users_v2", JSON.stringify(next));
        return next;
      });
      await setDoc(doc(db, "users", id), partial, { merge: true });
    } catch (e) {
      console.error("Error updating user:", e);
    }
  };

  const addUser = async (user: any) => {
    try {
      const newId = user.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const tenantToAssign = user.tenantId || activeTenantId;
      const newUser = { ...user, id: newId, tenantId: tenantToAssign } as User;
      setUsers((prev) => {
        const next = [...prev, newUser];
        localStorage.setItem("producao_users_v2", JSON.stringify(next));
        return next;
      });
      await setDoc(doc(db, "users", newId), newUser);
    } catch (e) {
      console.error("Error adding user:", e);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setUsers((prev) => {
        const next = prev.filter((u) => u.id !== id);
        localStorage.setItem("producao_users_v2", JSON.stringify(next));
        return next;
      });
      await deleteDoc(doc(db, "users", id));
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  };

  const completeProductionInBatch = async (
    batchId: number,
    itemId: number,
    color?: string,
    size?: string,
    variation?: string,
    customName?: string,
  ) => {
    try {
      const b = productionBatches.find((batch) => batch.id === batchId);
      if (!b) return;

      const batchOrders = orders.filter((o) => b.orderIds.includes(o.id));
      const matchingOrders = batchOrders.filter((order) => {
        if (itemId && itemId !== 0) {
          const matchesId = order.itemId === itemId;
          const matchesColor =
            !color ||
            color === "-" ||
            !order.color ||
            order.color === "-" ||
            order.color === color;
          const matchesSize =
            !size ||
            size === "-" ||
            !order.size ||
            order.size === "-" ||
            order.size === size;
          const matchesVariation =
            !variation ||
            variation === "-" ||
            !order.variation ||
            order.variation === "-" ||
            order.variation === variation;
          return matchesId && matchesColor && matchesSize && matchesVariation;
        } else if (customName) {
          const packName = customName.toLowerCase().trim();
          const orderName = (order.customProductName || "")
            .toLowerCase()
            .trim();
          return (
            packName &&
            orderName &&
            (orderName.includes(packName) || packName.includes(orderName))
          );
        }
        return false;
      });

      if (matchingOrders.length > 0) {
        const updatedChecked = [...(b.checkedOrderIds || [])];
        matchingOrders.forEach((mo) => {
          if (!updatedChecked.includes(mo.id)) {
            updatedChecked.push(mo.id);
          }
        });

        const allChecked = b.orderIds.every((oid) =>
          updatedChecked.includes(oid),
        );
        const updatedStatus = allChecked ? "CONCLUIDO" : b.status;

        const updatedBatch = {
          ...b,
          checkedOrderIds: updatedChecked,
          status: updatedStatus,
        };

        await setDoc(
          doc(db, "productionBatches", b.id.toString()),
          cleanUndefined(updatedBatch),
          { merge: true },
        );
        console.log(
          `[BatchAutoCompleter] Lote ${b.name}: Itens finalizados automáticamente:`,
          matchingOrders.map((mo) => mo.id),
        );
      }
    } catch (e) {
      console.error("Erro ao auto-concluir lote:", e);
    }
  };

  const addActivePack = async (pack: ActiveTask) => {
    pack.tenantId = activeTenantId;
    try {
      const matchBatch = productionBatches.find((b) => {
        if (b.status === "CONCLUIDO") return false;

        const batchOrders = orders.filter((o) => b.orderIds.includes(o.id));
        return batchOrders.some((order) => {
          const isLiberated = b.liberatedOrderIds?.includes(order.id);
          if (!isLiberated) return false;

          if (pack.itemId && pack.itemId !== 0) {
            const matchesId = order.itemId === pack.itemId;
            const matchesColor =
              !pack.color ||
              pack.color === "-" ||
              !order.color ||
              order.color === "-" ||
              order.color === pack.color;
            const matchesSize =
              !pack.size ||
              pack.size === "-" ||
              !order.size ||
              order.size === "-" ||
              order.size === pack.size;
            const matchesVariation =
              !pack.variation ||
              pack.variation === "-" ||
              !order.variation ||
              order.variation === "-" ||
              order.variation === pack.variation;
            return matchesId && matchesColor && matchesSize && matchesVariation;
          } else {
            const packName = (pack.customProductName || pack.partName || "")
              .toLowerCase()
              .trim();
            const orderName = (order.customProductName || "")
              .toLowerCase()
              .trim();
            return (
              packName &&
              orderName &&
              (orderName.includes(packName) || packName.includes(orderName))
            );
          }
        });
      });

      if (matchBatch) {
        const confirmMsg = `Aba de Confirmação:\nIdentificamos que este item pertence ao Lote "${matchBatch.name}" (liberado pela gerência/PCP).\nDeseja associar o início deste trabalho a este lote?`;
        if (window.confirm(confirmMsg)) {
          pack.associatedBatchId = matchBatch.id;
          pack.associatedBatchName = matchBatch.name;
        }
      }
    } catch (err) {
      console.error("Erro ao verificar lote associado:", err);
    }

    await enqueueAction("ADD_ACTIVE_PACK", { pack });
    runSync();
  };

  const removeActivePack = async (id: number) => {
    const pack = activePacks.find((p) => p.id === id);
    const isEmbalagem = pack?.type === "EMBALAGEM";

    if (pack) {
      if (pack.associatedBatchId) {
        await completeProductionInBatch(
          pack.associatedBatchId,
          pack.itemId,
          pack.color,
          pack.size,
          pack.variation,
          pack.customProductName || pack.partName,
        );
      } else {
        try {
          const matchBatch = productionBatches.find((b) => {
            if (b.status === "CONCLUIDO") return false;
            const batchOrders = orders.filter((o) => b.orderIds.includes(o.id));
            return batchOrders.some((order) => {
              const isLiberated = b.liberatedOrderIds?.includes(order.id);
              if (!isLiberated) return false;
              if (pack.itemId && pack.itemId !== 0) {
                return (
                  order.itemId === pack.itemId &&
                  (!pack.color ||
                    pack.color === "-" ||
                    !order.color ||
                    order.color === "-" ||
                    order.color === pack.color) &&
                  (!pack.size ||
                    pack.size === "-" ||
                    !order.size ||
                    order.size === "-" ||
                    order.size === pack.size) &&
                  (!pack.variation ||
                    pack.variation === "-" ||
                    !order.variation ||
                    order.variation === "-" ||
                    order.variation === pack.variation)
                );
              } else {
                const packName = (pack.customProductName || pack.partName || "")
                  .toLowerCase()
                  .trim();
                const orderName = (order.customProductName || "")
                  .toLowerCase()
                  .trim();
                return (
                  packName &&
                  orderName &&
                  (orderName.includes(packName) || packName.includes(orderName))
                );
              }
            });
          });
          if (matchBatch) {
            await completeProductionInBatch(
              matchBatch.id,
              pack.itemId,
              pack.color,
              pack.size,
              pack.variation,
              pack.customProductName || pack.partName,
            );
          }
        } catch (err) {
          console.error("Erro na auto-conclusão automática:", err);
        }
      }
    }

    await enqueueAction("REMOVE_ACTIVE_PACK", { id, isEmbalagem });
    runSync();
  };

  const addLogs = async (newLogs: ProductionLog[]) => {
    let earnedPoints = 0;
    const stockUpdates: StockEntry[] = [...stocks];
    const stockMovementsToAdd: Omit<StockMovement, "id" | "timestamp">[] = [];

    // Calcula pontos ganhos com esses logs, and update inventory if not skipped
    newLogs.forEach((log) => {
      // Points are still important to calculate even if we skip inventory here?
      // Actually, if we are just splitting a log, we shouldn't recount points either!
      if (log.skipInventoryUpdate) return;

      const qty =
        (log.quantityProcessed || 0) +
        (log.quantityCut || 0) +
        (log.quantityPainted || 0) +
        (log.quantityPacked || 0);
      if (qty > 0) {
        let itemId: number | undefined;
        let color = log.paintedColor || "";
        let size = "";
        let variation = "";

        if (log.type === "CORTE_LASER" && log.orderId) {
          const nestTask = nestTasks.find((t) => t.id === log.orderId);
          if (nestTask) {
            const itemsWithSameName = items.filter((i) =>
              i.name.toLowerCase().includes(nestTask.partName.toLowerCase()),
            );
            itemId = itemsWithSameName[0]?.id;
            size = nestTask.size || "";
          }
        } else if (log.orderId) {
          const order = orders.find((o) => o.id === log.orderId);
          if (order) {
            itemId = order.itemId;
            color = color || order.color || "";
            size = order.size || "";
            variation = order.variation || "";
          }
        } else if (log.parentItemId) {
          itemId = log.parentItemId;
        } else if (log.customProductName) {
          const matched = items.find(
            (i) =>
              i.name.toLowerCase() === log.customProductName?.toLowerCase(),
          );
          if (matched) itemId = matched.id;
        }

        if (itemId) {
          const item = items.find((i) => i.id === itemId);
          if (item) {
            if (item.productionPoints) {
              earnedPoints += item.productionPoints * qty;
            }

            // If it is a Piece: result in standard/intermediate stock entry
            if (item.type === "PECA") {
              const stockId = `${item.id}|${color}|||INTERMEDIARIO`;
              const existingIdx = stockUpdates.findIndex(
                (s) => s.id === stockId,
              );
              if (existingIdx >= 0) {
                stockUpdates[existingIdx] = {
                  ...stockUpdates[existingIdx],
                  quantity: stockUpdates[existingIdx].quantity + qty,
                };
              } else {
                stockUpdates.push({
                  id: stockId,
                  itemId: item.id,
                  color: color,
                  size: size,
                  variation: variation,
                  quantity: qty,
                  stage: "INTERMEDIARIO",
                });
              }
              stockMovementsToAdd.push({
                itemId: item.id,
                color: color,
                size: size,
                variation: variation,
                quantity: qty,
                type: "ENTRADA",
                description: `Produção de Peça finalizada: ${qty} un. (Setor/Fluxo: ${log.type || "Processo"})`,
              });
            } else {
              // If it is a Product: consume its pieces from intermediate stock (BOM)
              if (item.components && item.components.length > 0) {
                item.components.forEach((comp) => {
                  const compItem = items.find((i) => i.id === comp.itemId);
                  if (!compItem) return;

                  const consumeQty = comp.quantity * qty;
                  const compStockId = `${comp.itemId}|${color}|||INTERMEDIARIO`;
                  const existingIdx = stockUpdates.findIndex(
                    (s) => s.id === compStockId,
                  );

                  if (existingIdx >= 0) {
                    stockUpdates[existingIdx] = {
                      ...stockUpdates[existingIdx],
                      quantity: Math.max(
                        0,
                        stockUpdates[existingIdx].quantity - consumeQty,
                      ),
                    };
                  } else {
                    stockUpdates.push({
                      id: compStockId,
                      itemId: comp.itemId,
                      color: color,
                      size: "",
                      variation: "",
                      quantity: 0,
                      stage: "INTERMEDIARIO",
                    });
                  }
                  stockMovementsToAdd.push({
                    itemId: comp.itemId,
                    color: color,
                    size: "",
                    variation: "",
                    quantity: consumeQty,
                    type: "SAIDA",
                    description: `Consumo automático de peça pelo produto acabado: -${consumeQty} un. (Produto: ${item.code})`,
                  });
                });
              }

              // If it is Injetora or Torno, enter as Acabado
              if (
                log.type === "INJETORA" ||
                log.type === "TORNO_CNC_WILLIAN" ||
                log.type === "TORNO_CNC_HENRIQUE"
              ) {
                const stockId = `${item.id}|${color}|||ACABADO`;
                const existingIdx = stockUpdates.findIndex(
                  (s) => s.id === stockId,
                );
                if (existingIdx >= 0) {
                  stockUpdates[existingIdx] = {
                    ...stockUpdates[existingIdx],
                    quantity: stockUpdates[existingIdx].quantity + qty,
                  };
                } else {
                  stockUpdates.push({
                    id: stockId,
                    itemId: item.id,
                    color: color,
                    size: size,
                    variation: variation,
                    quantity: qty,
                    stage: "ACABADO",
                  });
                }
                stockMovementsToAdd.push({
                  itemId: item.id,
                  color: color,
                  size: size,
                  variation: variation,
                  quantity: qty,
                  type: "ENTRADA",
                  description: `Produção de Produto finalizada: ${qty} un. (Setor: ${log.type})`,
                });
              }
            }
          }
        }
      }
    });

    if (stockUpdates.length > 0) {
      await updateStocks(stockUpdates);
    }

    for (const mov of stockMovementsToAdd) {
      await addStockMovement(mov);
    }

    // Auto-complete associated or matching open batch when logs are added
    newLogs.forEach((unboundLog) => {
      try {
        let itemId: number | undefined;
        let color = unboundLog.paintedColor || "";
        let size = "";
        let variation = "";
        let customName = unboundLog.customProductName || "";

        if (unboundLog.type === "CORTE_LASER" && unboundLog.orderId) {
          const nestTask = nestTasks.find((t) => t.id === unboundLog.orderId);
          if (nestTask) {
            const itemsWithSameName = items.filter((i) =>
              i.name.toLowerCase().includes(nestTask.partName.toLowerCase()),
            );
            itemId = itemsWithSameName[0]?.id;
            size = nestTask.size || "";
            customName = nestTask.partName;
          }
        } else if (unboundLog.orderId) {
          const order = orders.find((o) => o.id === unboundLog.orderId);
          if (order) {
            itemId = order.itemId;
            color = color || order.color || "";
            size = order.size || "";
            variation = order.variation || "";
          }
        } else if (unboundLog.parentItemId) {
          itemId = unboundLog.parentItemId;
        }

        if ((itemId && itemId !== 0) || customName) {
          const matchBatch = productionBatches.find((b) => {
            if (b.status === "CONCLUIDO") return false;
            const batchOrders = orders.filter((o) => b.orderIds.includes(o.id));
            return batchOrders.some((order) => {
              const isLiberated = b.liberatedOrderIds?.includes(order.id);
              if (!isLiberated) return false;
              if (itemId && itemId !== 0) {
                return (
                  order.itemId === itemId &&
                  (!color ||
                    color === "-" ||
                    !order.color ||
                    order.color === "-" ||
                    order.color === color) &&
                  (!size ||
                    size === "-" ||
                    !order.size ||
                    order.size === "-" ||
                    order.size === size) &&
                  (!variation ||
                    variation === "-" ||
                    !order.variation ||
                    order.variation === "-" ||
                    order.variation === variation)
                );
              } else {
                const pName = customName.toLowerCase().trim();
                const oName = (order.customProductName || "")
                  .toLowerCase()
                  .trim();
                return (
                  pName &&
                  oName &&
                  (oName.includes(pName) || pName.includes(oName))
                );
              }
            });
          });

          if (matchBatch) {
            completeProductionInBatch(
              matchBatch.id,
              itemId || 0,
              color,
              size,
              variation,
              customName,
            );
          }
        }
      } catch (err) {
        console.error("Erro no auto-completar do lote por logs:", err);
      }
    });

    const logsWithTenant = newLogs.map((l) => ({
      tenantId: activeTenantId,
      ...l,
    }));
    await enqueueAction("ADD_LOGS", { logs: logsWithTenant });
    runSync();
  };

  const updateLog = async (updatedLog: ProductionLog) => {
    const logWithTenant = {
      tenantId: activeTenantId,
      ...updatedLog,
    };
    await enqueueAction("UPDATE_LOG", { log: logWithTenant });
    runSync();
  };

  const deleteLog = async (logId: number) => {
    await enqueueAction("DELETE_LOG", { id: logId });
    runSync();
  };

  const addNotification = async (
    notification: Omit<AppNotification, "id" | "createdAt">,
  ) => {
    const id = getUniqueNumericId();
    await setDoc(
      doc(db, "notifications", id.toString()),
      cleanUndefined({
        ...notification,
        id,
        createdAt: id,
      }),
    );
  };

  const markNotificationRead = async (id: number) => {
    await setDoc(
      doc(db, "notifications", id.toString()),
      cleanUndefined({ read: true }),
      { merge: true },
    );
  };

  const addStockMovement = async (
    movement: Omit<StockMovement, "id" | "timestamp">,
  ) => {
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const fullMovement = {
      tenantId: activeTenantId,
      ...movement,
      id,
      timestamp: Date.now(),
    };
    await enqueueAction("ADD_STOCK_MOVEMENT", { movement: fullMovement });

    // Check if this is a SAIDA (outgoing) movement caused by invoicing or dispatching
    const isSaida = movement.type === "SAIDA";
    const descLower = (movement.description || "").toLowerCase();
    const isFaturamento =
      descLower.includes("fatur") ||
      descLower.includes("despacho") ||
      descLower.includes("saída por") ||
      descLower.includes("carga") ||
      descLower.includes("lotação");

    if (isSaida && isFaturamento) {
      // Find the parent item to see if it has components associated
      const parentItem = items.find((it) => it.id === movement.itemId);
      if (parentItem && parentItem.components && parentItem.components.length > 0) {
        const stockUpdates: StockEntry[] = [];
        
        for (const comp of parentItem.components) {
          const childQtyToDeduct = movement.quantity * comp.quantity;
          
          // Seek existing stock entries for this component
          const childStocks = stocks.filter((s) => s.itemId === comp.itemId);
          let matchingStock = childStocks.find(
            (s) =>
              s.color === movement.color &&
              s.size === movement.size &&
              s.variation === movement.variation
          );
          
          if (!matchingStock && childStocks.length > 0) {
            // Find a generic/standard entry if specialized is not available
            matchingStock =
              childStocks.find(
                (s) =>
                  s.color === "Padrão" ||
                  s.color === "Sem Cor" ||
                  s.color === "OUTROS" ||
                  s.color === ""
              ) || childStocks[0];
          }

          const resolvedColor = matchingStock ? matchingStock.color : (movement.color || "Padrão");
          const resolvedSize = matchingStock ? matchingStock.size : (movement.size || "Único");
          const resolvedVariation = matchingStock ? matchingStock.variation : (movement.variation || "Padrão");
          const resolvedStage = matchingStock ? matchingStock.stage : "ACABADO";
          
          const childStockId = matchingStock
            ? matchingStock.id
            : `${comp.itemId}|${resolvedColor}|${resolvedSize}|${resolvedVariation}|${resolvedStage}`;

          const existingQty = matchingStock ? (matchingStock.quantity || 0) : 0;
          const newQty = existingQty - childQtyToDeduct;

          // Push updated stock entry (can go negative or zero depending on balance)
          stockUpdates.push({
            id: childStockId,
            itemId: comp.itemId,
            color: resolvedColor,
            size: resolvedSize,
            variation: resolvedVariation,
            quantity: newQty,
            stage: resolvedStage,
          });

          // Enqueue a stock movement for the consumed component
          const childDesc = `Consumo autom. de componente (Faturamento do pai: ${parentItem.code} - ${parentItem.name}) [Ref: ${movement.description}]`;
          const childId =
            Date.now().toString() + Math.random().toString(36).substring(2, 7);
          const childMovement = {
            tenantId: activeTenantId,
            id: childId,
            itemId: comp.itemId,
            color: resolvedColor,
            size: resolvedSize,
            variation: resolvedVariation,
            quantity: childQtyToDeduct,
            type: "SAIDA" as const,
            description: childDesc,
            timestamp: Date.now(),
          };
          await enqueueAction("ADD_STOCK_MOVEMENT", { movement: childMovement });
        }

        if (stockUpdates.length > 0) {
          const stockUpdatesWithTenant = stockUpdates.map((s) => ({
            tenantId: activeTenantId,
            ...s,
          }));
          await enqueueAction("UPDATE_STOCKS", { stocks: stockUpdatesWithTenant });
        }
      }
    }

    runSync();
  };

  const filteredUsers = useMemo(() => {
    if (currentUser?.tenantId === "global") return users;
    return users.filter((u) => (u.tenantId || "imperio") === activeTenantId);
  }, [users, currentUser, activeTenantId]);

  const filteredItems = useMemo(() => items.filter((x) => (x.tenantId || "imperio") === activeTenantId), [items, activeTenantId]);
  const filteredOrders = useMemo(() => orders.filter((x) => (x.tenantId || "imperio") === activeTenantId), [orders, activeTenantId]);
  const filteredLogs = useMemo(() => logs.filter((x) => (x.tenantId || "imperio") === activeTenantId), [logs, activeTenantId]);
  const filteredAttributes = useMemo(() => attributes.filter((x) => (x.tenantId || "imperio") === activeTenantId), [attributes, activeTenantId]);
  const filteredActivePacks = useMemo(() => activePacks.filter((x) => (x.tenantId || "imperio") === activeTenantId), [activePacks, activeTenantId]);
  const filteredNestTasks = useMemo(() => nestTasks.filter((x) => (x.tenantId || "imperio") === activeTenantId), [nestTasks, activeTenantId]);
  const filteredNotifications = useMemo(() => notifications.filter((x) => (x.tenantId || "imperio") === activeTenantId), [notifications, activeTenantId]);
  const filteredStocks = useMemo(() => stocks.filter((x) => (x.tenantId || "imperio") === activeTenantId), [stocks, activeTenantId]);
  const filteredStockMovements = useMemo(() => stockMovements.filter((x) => (x.tenantId || "imperio") === activeTenantId), [stockMovements, activeTenantId]);
  const filteredEmployees = useMemo(() => employees.filter((x) => (x.tenantId || "imperio") === activeTenantId), [employees, activeTenantId]);
  const filteredEpiDistributions = useMemo(() => epiDistributions.filter((x) => (x.tenantId || "imperio") === activeTenantId), [epiDistributions, activeTenantId]);
  const filteredUniforms = useMemo(() => uniforms.filter((x) => (x.tenantId || "imperio") === activeTenantId), [uniforms, activeTenantId]);
  const filteredUniformDistributions = useMemo(() => uniformDistributions.filter((x) => (x.tenantId || "imperio") === activeTenantId), [uniformDistributions, activeTenantId]);
  const filteredCustomers = useMemo(() => customers.filter((x) => (x.tenantId || "imperio") === activeTenantId), [customers, activeTenantId]);
  const filteredSectors = useMemo(() => sectors.filter((x) => (x.tenantId || "imperio") === activeTenantId), [sectors, activeTenantId]);
  const filteredProductFlows = useMemo(() => productFlows.filter((x) => (x.tenantId || "imperio") === activeTenantId), [productFlows, activeTenantId]);
  const filteredProductionBatches = useMemo(() => productionBatches.filter((x) => (x.tenantId || "imperio") === activeTenantId), [productionBatches, activeTenantId]);
  const filteredProductionAgendas = useMemo(() => productionAgendas.filter((x) => (x.tenantId || "imperio") === activeTenantId), [productionAgendas, activeTenantId]);
  const filteredCoilCuttingPlans = useMemo(() => coilCuttingPlans.filter((x) => (x.tenantId || "imperio") === activeTenantId), [coilCuttingPlans, activeTenantId]);
  const filteredCargas = useMemo(() => cargas.filter((x) => (x.tenantId || "imperio") === activeTenantId), [cargas, activeTenantId]);
  const filteredExtraHours = useMemo(() => extraHours.filter((x) => (x.tenantId || "imperio") === activeTenantId), [extraHours, activeTenantId]);
  const filteredPriceHistories = useMemo(() => priceHistories.filter((x) => (x.tenantId || "imperio") === activeTenantId), [priceHistories, activeTenantId]);
  const filteredSystemSettings = useMemo(() => systemSettings.filter((x) => (x.tenantId || "imperio") === activeTenantId), [systemSettings, activeTenantId]);
  const filteredTornoEvents = useMemo(() => tornoEvents.filter((x) => (x.tenantId || "imperio") === activeTenantId), [tornoEvents, activeTenantId]);
  const filteredMachineStops = useMemo(() => machineStops.filter((x) => (x.tenantId || "imperio") === activeTenantId), [machineStops, activeTenantId]);
  const filteredPerformanceQuestions = useMemo(() => performanceQuestions.filter((x) => (x.tenantId || "imperio") === activeTenantId), [performanceQuestions, activeTenantId]);
  const filteredPerformanceReviews = useMemo(() => performanceReviews.filter((x) => (x.tenantId || "imperio") === activeTenantId), [performanceReviews, activeTenantId]);
  const filteredAttendances = useMemo(() => attendances.filter((x) => (x.tenantId || "imperio") === activeTenantId), [attendances, activeTenantId]);

  const activeTenant = useMemo(() => {
    return tenants.find((t) => t.id === activeTenantId) || tenants.find((t) => t.id === "imperio") || { id: "imperio", name: "Império Jomarci", logoUrl: "/icon.png", primaryColor: "#00b14f", systemName: "Apontador de Produção" };
  }, [tenants, activeTenantId]);

  const addTenant = async (tenant: Tenant) => {
    await setDocFirebase(doc(db, "tenants", tenant.id), cleanUndefined(tenant));
  };

  const deleteTenant = async (id: string) => {
    await deleteDoc(doc(db, "tenants", id));
  };

  return {
    permissionError,
    users: filteredUsers,
    allUsers: users,
    updateUser,
    addUser,
    deleteUser,
    items: filteredItems,
    addItem,
    updateItem,
    deleteItem,
    orders: filteredOrders,
    addOrder,
    deleteOrder,
    updateOrders,
    nestTasks: filteredNestTasks,
    addNestTasks,
    updateNestTasks,
    deleteNestTask,
    logs: filteredLogs,
    addLogs,
    updateLog,
    deleteLog,
    attributes: filteredAttributes,
    setAttributes,
    activePacks: filteredActivePacks,
    addActivePack,
    removeActivePack,
    notifications: filteredNotifications,
    addNotification,
    markNotificationRead,
    stocks: filteredStocks,
    updateStocks,
    stockMovements: filteredStockMovements,
    addStockMovement,
    employees: filteredEmployees,
    addEmployee: async (employee: Omit<Employee, "id">) => {
      const id = getUniqueNumericId().toString();
      await runWrite("Cadastrar Colaborador", async () => {
        await setDoc(
          doc(db, "employees", id),
          cleanUndefined({ ...employee, id }),
        );
      });
    },
    updateEmployee: async (id: string, updates: Partial<Employee>) => {
      await runWrite("Atualizar Colaborador", async () => {
        await updateDoc(doc(db, "employees", id), cleanUndefined(updates));
      });
    },
    deleteEmployee: async (id: string) => {
      await runWrite("Deletar Colaborador", async () => {
        await deleteDoc(doc(db, "employees", id));
      });
    },
    epiDistributions: filteredEpiDistributions,
    addEpiDistribution: async (dist: Omit<EpiDistribution, "id">) => {
      const id = Date.now().toString();
      await runWrite("Distribuir EPI", async () => {
        await setDoc(
          doc(db, "epiDistributions", id),
          cleanUndefined({ ...dist, id }),
        );
      });
    },
    uniforms: filteredUniforms,
    addUniform: async (u: Omit<Uniform, "id">) => {
      const id = Date.now().toString();
      await runWrite("Cadastrar Uniforme", async () => {
        await setDoc(doc(db, "uniforms", id), cleanUndefined({ ...u, id }));
      });
    },
    updateUniform: async (id: string, updates: Partial<Uniform>) => {
      await runWrite("Atualizar Uniforme", async () => {
        await updateDoc(doc(db, "uniforms", id), cleanUndefined(updates));
      });
    },
    deleteUniform: async (id: string) => {
      await runWrite("Deletar Uniforme", async () => {
        await deleteDoc(doc(db, "uniforms", id));
      });
    },
    uniformDistributions: filteredUniformDistributions,
    addUniformDistribution: async (dist: Omit<UniformDistribution, "id">) => {
      const id = Date.now().toString();
      await runWrite("Distribuir Uniforme", async () => {
        await setDoc(
          doc(db, "uniformDistributions", id),
          cleanUndefined({ ...dist, id }),
        );
      });
    },
    deleteUniformDistribution: async (id: string) => {
      await runWrite("Deletar Distribuição de Uniforme", async () => {
        await deleteDoc(doc(db, "uniformDistributions", id));
      });
    },
    priceHistories: filteredPriceHistories,
    addPriceHistory: async (ph: Omit<ItemPriceHistory, "id">) => {
      const id = `${ph.itemId}|${getUniqueNumericId()}`;
      await runWrite("Histórico de Preço", async () => {
        await setDoc(
          doc(db, "priceHistories", id),
          cleanUndefined({ ...ph, id }),
        );
      });
    },
    syncQueueCount,
    isSyncing,
    quotaExceeded,
    triggerSyncQueue: (force = false) => runSync(force),

    customers: filteredCustomers,
    addCustomer: async (customer: Omit<Customer, "id"> & { id?: number }) => {
      const id = customer.id || Date.now();
      let tradeName = customer.tradeName?.trim();
      if (!tradeName) {
        const words = customer.name.trim().split(/\s+/);
        tradeName = words.slice(0, 3).join(" ");
      }
      await setDoc(
        doc(db, "customers", id.toString()),
        cleanUndefined({ ...customer, tradeName, id }),
      );
    },
    updateCustomer: async (customer: Customer, oldId?: number) => {
      let tradeName = customer.tradeName?.trim();
      if (!tradeName) {
        const words = customer.name.trim().split(/\s+/);
        tradeName = words.slice(0, 3).join(" ");
      }
      const updated = { ...customer, tradeName };
      const actualOldId = oldId !== undefined ? oldId : customer.id;
      
      if (actualOldId !== customer.id) {
        // ID has changed. Delete the old document and write the new document
        await deleteDoc(doc(db, "customers", actualOldId.toString()));
        await setDoc(
          doc(db, "customers", customer.id.toString()),
          cleanUndefined(updated)
        );
      } else {
        const current = customers.find((c) => c.id === customer.id);
        if (current && JSON.stringify(current) === JSON.stringify(updated))
          return;
        await setDoc(
          doc(db, "customers", customer.id.toString()),
          cleanUndefined(updated),
          { merge: true },
        );
      }
    },
    deleteCustomer: async (id: number) => {
      await deleteDoc(doc(db, "customers", id.toString()));
    },

    sectors: filteredSectors,
    addSector: async (sector: Omit<Sector, "id">) => {
      const id = getUniqueNumericId();
      await setDoc(
        doc(db, "sectors", id.toString()),
        cleanUndefined({ ...sector, id }),
      );
    },
    updateSector: async (sector: Sector) => {
      const current = sectors.find((s) => s.id === sector.id);
      if (current && JSON.stringify(current) === JSON.stringify(sector)) return;
      await setDoc(
        doc(db, "sectors", sector.id.toString()),
        cleanUndefined(sector),
        { merge: true },
      );
    },
    deleteSector: async (id: number) => {
      await deleteDoc(doc(db, "sectors", id.toString()));
    },

    productFlows: filteredProductFlows,
    addProductFlow: async (flow: Omit<ProductFlow, "id">) => {
      const id = getUniqueNumericId();
      await setDoc(
        doc(db, "productFlows", id.toString()),
        cleanUndefined({ ...flow, id }),
      );
    },
    updateProductFlow: async (flow: ProductFlow) => {
      const current = productFlows.find((f) => f.id === flow.id);
      if (current && JSON.stringify(current) === JSON.stringify(flow)) return;
      await setDoc(
        doc(db, "productFlows", flow.id.toString()),
        cleanUndefined(flow),
        { merge: true },
      );
    },
    deleteProductFlow: async (id: number) => {
      await deleteDoc(doc(db, "productFlows", id.toString()));
    },

    productionBatches: filteredProductionBatches,
    addProductionBatch: async (batch: Omit<ProductionBatch, "id">) => {
      const id = getUniqueNumericId();
      await setDoc(
        doc(db, "productionBatches", id.toString()),
        cleanUndefined({ ...batch, id }),
      );
    },
    updateProductionBatch: async (batch: ProductionBatch) => {
      const current = productionBatches.find((b) => b.id === batch.id);
      if (current && JSON.stringify(current) === JSON.stringify(batch)) return;
      await setDoc(
        doc(db, "productionBatches", batch.id.toString()),
        cleanUndefined(batch),
        { merge: true },
      );
    },
    deleteProductionBatch: async (id: number) => {
      await deleteDoc(doc(db, "productionBatches", id.toString()));
    },

    productionAgendas: filteredProductionAgendas,
    addProductionAgenda: async (agenda: Omit<ProductionAgenda, "id">) => {
      const id = getUniqueNumericId();
      await setDoc(
        doc(db, "productionAgendas", id.toString()),
        cleanUndefined({ ...agenda, id }),
      );
    },
    updateProductionAgenda: async (agenda: ProductionAgenda) => {
      const current = productionAgendas.find((a) => a.id === agenda.id);
      if (current && JSON.stringify(current) === JSON.stringify(agenda)) return;
      await setDoc(
        doc(db, "productionAgendas", agenda.id.toString()),
        cleanUndefined(agenda),
        { merge: true },
      );
    },
    deleteProductionAgenda: async (id: number) => {
      await deleteDoc(doc(db, "productionAgendas", id.toString()));
    },

    coilCuttingPlans: filteredCoilCuttingPlans,
    addCoilCuttingPlan: async (plan: Omit<CoilCuttingPlan, "id">) => {
      const id = getUniqueNumericId();
      await setDoc(
        doc(db, "coilCuttingPlans", id.toString()),
        cleanUndefined({ ...plan, id }),
      );
    },
    updateCoilCuttingPlan: async (plan: CoilCuttingPlan) => {
      const current = coilCuttingPlans.find((p) => p.id === plan.id);
      if (current && JSON.stringify(current) === JSON.stringify(plan)) return;
      await setDoc(
        doc(db, "coilCuttingPlans", plan.id.toString()),
        cleanUndefined(plan),
        { merge: true },
      );
    },
    deleteCoilCuttingPlan: async (id: number) => {
      await deleteDoc(doc(db, "coilCuttingPlans", id.toString()));
    },

    cargas: filteredCargas,
    addCarga: async (carga: Omit<Carga, "id"> & { id?: string }) => {
      const id =
        carga.id ||
        Date.now().toString() + Math.random().toString(36).substring(2, 6);
      await setDoc(doc(db, "cargas", id), cleanUndefined({ ...carga, id }));
    },
    updateCarga: async (carga: Carga) => {
      const current = cargas.find((c) => c.id === carga.id);
      if (current && JSON.stringify(current) === JSON.stringify(carga)) return;
      await setDoc(doc(db, "cargas", carga.id), cleanUndefined(carga), {
        merge: true,
      });
    },
    deleteCarga: async (id: string) => {
      await deleteDoc(doc(db, "cargas", id));
    },

    productionSchedules,
    saveProductionSchedule: async (sched: ProductionSchedule) => {
      await setDoc(
        doc(db, "productionSchedules", sched.id),
        cleanUndefined(sched),
      );
      localStorage.setItem("production_schedule", JSON.stringify(sched));
    },
    extraHours: filteredExtraHours,
    addExtraHour: async (entry: Omit<ExtraHourEntry, "id">) => {
      const id = Date.now().toString();
      const full = { ...entry, id };
      await setDoc(doc(db, "extraHours", id), cleanUndefined(full));
    },
    deleteExtraHour: async (id: string) => {
      await deleteDoc(doc(db, "extraHours", id));
    },

    agentReports,
    systemSettings: filteredSystemSettings,
    saveSystemSettings: async (settings: SystemSettings) => {
      const id = settings.id || "default";
      await setDoc(
        doc(db, "systemSettings", id),
        cleanUndefined({ ...settings, id }),
        { merge: true },
      );
    },

    tornoEvents: filteredTornoEvents,
    addTornoEvent: async (event: Omit<TornoEvent, "id">) => {
      const id = Date.now().toString();
      await setDoc(
        doc(db, "tornoEvents", id),
        cleanUndefined({ ...event, id }),
      );
    },

    machineStops: filteredMachineStops,
    addMachineStop: async (stop: Omit<MachineStop, "id">) => {
      const id = Date.now().toString();
      await setDoc(
        doc(db, "machineStops", id),
        cleanUndefined({ ...stop, id }),
      );
    },
    updateMachineStop: async (id: string, updates: Partial<MachineStop>) => {
      await updateDoc(doc(db, "machineStops", id), cleanUndefined(updates));
    },

    performanceQuestions: filteredPerformanceQuestions,
    addPerformanceQuestion: async (q: Omit<PerformanceQuestion, "id">) => {
      const id = Date.now().toString();
      await setDoc(
        doc(db, "performanceQuestions", id),
        cleanUndefined({ ...q, id }),
      );
    },
    deletePerformanceQuestion: async (id: string) => {
      await deleteDoc(doc(db, "performanceQuestions", id));
    },

    performanceReviews: filteredPerformanceReviews,
    addPerformanceReview: async (review: Omit<PerformanceReview, "id">) => {
      const id = Date.now().toString();
      await setDoc(
        doc(db, "performanceReviews", id),
        cleanUndefined({ ...review, id }),
      );
    },

    attendances: filteredAttendances,
    saveAttendance: async (attendance: import("./types").AttendanceRecord) => {
      await setDoc(doc(db, "attendances", attendance.id), cleanUndefined(attendance));
    },
    tenants,
    allSectors: sectors,
    addTenant,
    deleteTenant,
    activeTenantId,
    selectedTenantId,
    setSelectedTenantId,
    activeTenant,
  };
}
