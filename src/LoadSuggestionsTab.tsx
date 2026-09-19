import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  MapPin,
  Plus,
  Route as RouteIcon,
  Sparkles,
  Target,
  Truck,
} from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { ExpeditionRoute, Item, Order, User } from "./types";
import { findCustomerForOrder } from "./searchUtils";

const DAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const SHIFT_LABEL: Record<string, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
};

type SuggestionRow = {
  order: Order;
  item?: Item;
  quantity: number;
  revenue: number;
  netUnitPrice: number;
  hasPrice: boolean;
  orderGroupKey: string;
  deliveryDate: string;
};

type LoadSuggestion = {
  key: string;
  scheduledDate: string;
  route: ExpeditionRoute;
  items: SuggestionRow[];
  projectedRevenue: number;
  missingPriceItems: number;
  customerCount: number;
  orderCount: number;
  totalQuantity: number;
  lateOrderCount: number;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
}

function parseLocalDate(value?: string) {
  if (!value) return null;
  const key = value.split("T")[0];
  const parts = key.split("-").map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

function formatDate(value?: string) {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "Sem data";
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeWords(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cityAcronym(city: string) {
  const ignored = new Set([
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "d",
  ]);

  return normalizeWords(city)
    .split(" ")
    .filter(function (word) {
      return word && !ignored.has(word);
    })
    .map(function (word) {
      return word[0] || "";
    })
    .join("");
}

function getCustomerCity(customer: any, order?: any) {
  const explicit =
    customer?.city ||
    customer?.cidade ||
    customer?.municipio ||
    customer?.municipality ||
    order?.customerCity ||
    order?.city ||
    order?.cidade ||
    order?.municipio ||
    order?.municipality ||
    "";

  if (explicit) return String(explicit).trim();

  const address = String(
    customer?.address ||
      order?.customerAddress ||
      order?.deliveryAddress ||
      order?.address ||
      order?.endereco ||
      "",
  ).trim();
  if (!address) return "";

  const cityStateMatch = address.match(
    /(?:^|,)\s*([^,]+?)\s*[-–/]\s*[A-Za-z]{2}\s*$/,
  );
  if (cityStateMatch?.[1]) return cityStateMatch[1].trim();

  return address;
}

function routeDestinationTokens(routeName: string) {
  const withoutSuffix = routeName.split(/\s+-\s+/)[0] || routeName;
  const withoutPrefix = withoutSuffix.replace(/^\s*rota\s+/i, "").trim();

  return withoutPrefix
    .split(/[\/|>,;]+/)
    .map(function (token) {
      return token.trim();
    })
    .filter(Boolean);
}

function routeMatchesCity(route: ExpeditionRoute, city: string) {
  if (!city) return false;

  const normalizedCity = normalizeWords(city);
  const acronym = cityAcronym(city);

  return routeDestinationTokens(route.name).some(function (token) {
    const normalizedToken = normalizeWords(token);
    if (!normalizedToken) return false;

    if (
      normalizedToken === normalizedCity ||
      normalizedToken.includes(normalizedCity) ||
      normalizedCity.includes(normalizedToken)
    ) {
      return true;
    }

    return acronym.length >= 2 && normalizedToken === acronym;
  });
}

function isCarrierDispatchRoute(route: ExpeditionRoute) {
  return (
    normalizeWords(route.name) ===
    normalizeWords("Cidades Despacho transportadoras")
  );
}

function nextRouteOccurrence(route: ExpeditionRoute, from: Date) {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const baseDate = date < today ? today : date;

  const delta = (route.weekday - baseDate.getDay() + 7) % 7;
  return addDays(baseDate, delta);
}

function shiftRank(shift?: string) {
  return shift === "MANHA" ? 0 : shift === "TARDE" ? 1 : 2;
}

export function LoadSuggestionsTab({
  db,
  currentUser,
}: {
  db: ReturnType<typeof useDatabase>;
  currentUser: User;
}) {
  const [targetPerShift, setTargetPerShift] = useState(25000);
  const [startDate, setStartDate] = useState(function () {
    return dateKey(addDays(new Date(), -14));
  });
  const [endDate, setEndDate] = useState(function () {
    return dateKey(addDays(new Date(), 30));
  });
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [creatingAll, setCreatingAll] = useState(false);

  const routes = useMemo(function () {
    return (db.expeditionRoutes || []).filter(function (route) {
      return route.active !== false;
    });
  }, [db.expeditionRoutes]);

  const itemsById = useMemo(function () {
    return new Map(
      db.items.map(function (item) {
        return [item.id, item] as const;
      }),
    );
  }, [db.items]);

  const ordersById = useMemo(function () {
    return new Map(
      db.orders.map(function (order) {
        return [order.id, order] as const;
      }),
    );
  }, [db.orders]);

  const allocationsByOrder = useMemo(function () {
    const map = new Map<number, number>();

    (db.cargas || []).forEach(function (load) {
      (load.orderIds || []).forEach(function (orderId) {
        const quantity = Number(load.orderQuantities?.[orderId] || 0);
        map.set(orderId, (map.get(orderId) || 0) + quantity);
      });
    });

    db.orders.forEach(function (order) {
      const allocated = map.get(order.id) || 0;
      if (allocated <= 0) return;

      map.set(
        order.id,
        Math.max(
          0,
          allocated - Math.max(0, Number(order.invoicedQuantity || 0)),
        ),
      );
    });

    return map;
  }, [db.cargas, db.orders]);

  const suggestionData = useMemo(function () {
    type GroupLine = {
      order: Order;
      item?: Item;
      open: number;
      allocated: number;
      available: number;
      revenue: number;
      netUnitPrice: number;
      hasPrice: boolean;
    };

    type OrderGroup = {
      key: string;
      customerName: string;
      orderCode: string;
      lines: GroupLine[];
      deliveryDate: string;
      customer: any;
      city: string;
    };

    const groupMap = new Map<string, OrderGroup>();

    db.orders.forEach(function (order) {
      if (order.status === "CANCELADO" || order.status === "FATURADO") return;

      const open = Math.max(
        0,
        Number(order.totalQuantity || 0) - Number(order.invoicedQuantity || 0),
      );
      if (open <= 0) return;

      const allocated = allocationsByOrder.get(order.id) || 0;
      const available = Math.max(0, open - allocated);
      const item = itemsById.get(order.itemId);

      const unitPrice =
        order.unitPrice !== undefined
          ? Number(order.unitPrice || 0)
          : Number(item?.unitPrice ?? item?.basePrice ?? 0);
      const discountPercent = Math.max(
        0,
        Math.min(100, Number(order.discountPercent || 0)),
      );
      const netUnitPrice = unitPrice * (1 - discountPercent / 100);
      const revenue = available * netUnitPrice;

      const customer = findCustomerForOrder(order, db.customers);
      const city = getCustomerCity(customer, order);
      const key =
        String(order.customerName || "").trim().toLowerCase() +
        "|" +
        String(order.orderCode || "").trim().toLowerCase();

      const existing = groupMap.get(key);
      const deliveryKey = (order.deliveryDate || "").split("T")[0];

      if (existing) {
        existing.lines.push({
          order,
          item,
          open,
          allocated,
          available,
          revenue,
          netUnitPrice,
          hasPrice: unitPrice > 0,
        });

        if (
          deliveryKey &&
          (!existing.deliveryDate || deliveryKey < existing.deliveryDate)
        ) {
          existing.deliveryDate = deliveryKey;
        }

        if (!existing.customer && customer) existing.customer = customer;
        if (!existing.city && city) existing.city = city;
      } else {
        groupMap.set(key, {
          key,
          customerName: order.customerName,
          orderCode: order.orderCode,
          lines: [
            {
              order,
              item,
              open,
              allocated,
              available,
              revenue,
              netUnitPrice,
              hasPrice: unitPrice > 0,
            },
          ],
          deliveryDate: deliveryKey,
          customer,
          city,
        });
      }
    });

    let missingDateOrderCount = 0;
    let noRouteOrderCount = 0;
    let partialOrderCount = 0;

    const assignments: Array<{
      group: OrderGroup;
      route: ExpeditionRoute;
      scheduledDate: string;
      rows: SuggestionRow[];
    }> = [];

    Array.from(groupMap.values()).forEach(function (group) {
      const linesWithOpen = group.lines.filter(function (line) {
        return line.open > 0;
      });

      const anyAvailable = linesWithOpen.some(function (line) {
        return line.available > 0;
      });

      if (!anyAvailable) return;

      const hasExistingAllocation = linesWithOpen.some(function (line) {
        return line.allocated > 0;
      });

      if (hasExistingAllocation) {
        partialOrderCount += 1;
        return;
      }

      if (!group.deliveryDate) {
        missingDateOrderCount += 1;
        return;
      }

      const dueDate = parseLocalDate(group.deliveryDate);
      if (!dueDate) {
        missingDateOrderCount += 1;
        return;
      }

      let matchingRoutes = routes.filter(function (route) {
        const customerMapped =
          group.customer &&
          (route.customerIds || []).includes(Number(group.customer.id));

        return customerMapped || routeMatchesCity(route, group.city);
      });

      if (matchingRoutes.length === 0) {
        matchingRoutes = routes.filter(isCarrierDispatchRoute);
      }

      if (matchingRoutes.length === 0) {
        noRouteOrderCount += 1;
        return;
      }

      const candidates = matchingRoutes
        .map(function (route) {
          const occurrence = nextRouteOccurrence(route, dueDate);
          return {
            route,
            occurrence,
            scheduledDate: dateKey(occurrence),
          };
        })
        .sort(function (a, b) {
          return (
            a.scheduledDate.localeCompare(b.scheduledDate) ||
            shiftRank(a.route.shift) - shiftRank(b.route.shift) ||
            a.route.name.localeCompare(b.route.name)
          );
        });

      const selected = candidates[0];

      const rows: SuggestionRow[] = linesWithOpen
        .filter(function (line) {
          return line.available > 0;
        })
        .map(function (line) {
          return {
            order: line.order,
            item: line.item,
            quantity: line.available,
            revenue: line.revenue,
            netUnitPrice: line.netUnitPrice,
            hasPrice: line.hasPrice,
            orderGroupKey: group.key,
            deliveryDate: group.deliveryDate,
          };
        });

      assignments.push({
        group,
        route: selected.route,
        scheduledDate: selected.scheduledDate,
        rows,
      });
    });

    const byRouteOccurrence = new Map<
      string,
      {
        route: ExpeditionRoute;
        scheduledDate: string;
        rows: SuggestionRow[];
      }
    >();

    assignments.forEach(function (assignment) {
      if (
        (startDate && assignment.scheduledDate < startDate) ||
        (endDate && assignment.scheduledDate > endDate)
      ) {
        return;
      }

      const key = assignment.route.id + "|" + assignment.scheduledDate;
      const existing = byRouteOccurrence.get(key);

      if (existing) {
        existing.rows.push(...assignment.rows);
      } else {
        byRouteOccurrence.set(key, {
          route: assignment.route,
          scheduledDate: assignment.scheduledDate,
          rows: assignment.rows.slice(),
        });
      }
    });

    const suggestions: LoadSuggestion[] = Array.from(
      byRouteOccurrence.entries(),
    )
      .map(function (entry) {
        const key = entry[0];
        const group = entry[1];
        const orderKeys = new Set(
          group.rows.map(function (row) {
            return row.orderGroupKey;
          }),
        );

        const lateOrderKeys = new Set(
          group.rows
            .filter(function (row) {
              return (
                Boolean(row.deliveryDate) &&
                group.scheduledDate > row.deliveryDate
              );
            })
            .map(function (row) {
              return row.orderGroupKey;
            }),
        );

        return {
          key,
          scheduledDate: group.scheduledDate,
          route: group.route,
          items: group.rows,
          projectedRevenue: group.rows.reduce(function (sum, row) {
            return sum + row.revenue;
          }, 0),
          missingPriceItems: group.rows.filter(function (row) {
            return !row.hasPrice;
          }).length,
          customerCount: new Set(
            group.rows.map(function (row) {
              return row.order.customerName;
            }),
          ).size,
          orderCount: orderKeys.size,
          totalQuantity: group.rows.reduce(function (sum, row) {
            return sum + row.quantity;
          }, 0),
          lateOrderCount: lateOrderKeys.size,
        };
      })
      .sort(function (a, b) {
        return (
          a.scheduledDate.localeCompare(b.scheduledDate) ||
          shiftRank(a.route.shift) - shiftRank(b.route.shift) ||
          a.route.name.localeCompare(b.route.name)
        );
      });

    return {
      suggestions,
      missingDateOrderCount,
      noRouteOrderCount,
      partialOrderCount,
    };
  }, [
    db.orders,
    db.customers,
    allocationsByOrder,
    itemsById,
    routes,
    startDate,
    endDate,
  ]);

  const suggestions = suggestionData.suggestions;

  const createSuggestedLoad = async function (
    suggestion: LoadSuggestion,
    silent = false,
  ) {
    setCreatingKey(suggestion.key);

    try {
      const orderIds: number[] = [];
      const orderQuantities: Record<number, number> = {};
      const orderKeys = new Set<string>();
      let adjusted = false;

      suggestion.items.forEach(function (row) {
        const order = ordersById.get(row.order.id);
        if (!order) return;

        const open = Math.max(
          0,
          Number(order.totalQuantity || 0) -
            Number(order.invoicedQuantity || 0),
        );
        const allocatedNow = allocationsByOrder.get(order.id) || 0;
        const availableNow = Math.max(0, open - allocatedNow);
        const quantity = Math.min(row.quantity, availableNow);

        if (quantity <= 0) return;
        if (quantity !== row.quantity) adjusted = true;

        orderIds.push(order.id);
        orderQuantities[order.id] = quantity;
        orderKeys.add(row.orderGroupKey);
      });

      const expectedOrderKeys = new Set(
        suggestion.items.map(function (row) {
          return row.orderGroupKey;
        }),
      );

      if (
        orderIds.length === 0 ||
        orderKeys.size !== expectedOrderKeys.size
      ) {
        if (!silent) {
          alert(
            "A sugestão mudou porque parte de um pedido já foi vinculada a outra carga. Atualize a tela antes de criar a carga para manter todos os itens do pedido juntos.",
          );
        }
        return;
      }

      const scheduled = parseLocalDate(suggestion.scheduledDate);
      const dayName = scheduled
        ? DAY_NAMES[scheduled.getDay()]
        : DAY_NAMES[suggestion.route.weekday];

      await db.addCarga({
        name: suggestion.route.name,
        routeId: suggestion.route.id,
        routeName: suggestion.route.name,
        route: [suggestion.route.name],
        shift: suggestion.route.shift,
        scheduledDate: suggestion.scheduledDate,
        departureDate: suggestion.scheduledDate,
        dayOfWeek: dayName,
        orderIds,
        orderQuantities,
        separatedQuantities: {},
        status: "ABERTA",
        createdAt: Date.now(),
        notes:
          "Carga pré-montada automaticamente pela rota cadastrada. Meta de faturamento do turno: " +
          formatCurrency(targetPerShift) +
          ".",
        auditTrail: [
          {
            timestamp: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            action:
              "Carga criada a partir da sugestão automática da rota " +
              suggestion.route.name,
          },
        ],
        tenantId: db.activeTenantId || undefined,
      });

      if (!silent) {
        alert(
          adjusted
            ? "Carga criada. Algumas quantidades foram atualizadas pelo saldo disponível, mantendo os itens de cada pedido na mesma carga."
            : "Carga sugerida criada com sucesso.",
        );
      }
    } finally {
      setCreatingKey(null);
    }
  };

  const createAllSuggestions = async function () {
    if (suggestions.length === 0) return;

    const confirmed = confirm(
      "Criar as " +
        suggestions.length +
        " cargas sugeridas deste período? Cada pedido será mantido inteiro na mesma rota sugerida.",
    );
    if (!confirmed) return;

    setCreatingAll(true);

    try {
      for (const suggestion of suggestions) {
        await createSuggestedLoad(suggestion, true);
      }

      alert(
        "Cargas sugeridas criadas. A visão semanal será atualizada automaticamente.",
      );
    } finally {
      setCreatingAll(false);
      setCreatingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-600" />
              <h3 className="font-extrabold text-slate-900">
                Sugestão automática por rota
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-4xl">
              O sistema mantém todos os itens do mesmo pedido juntos, procura a
              próxima ocorrência de uma rota cadastrada que contenha a cidade do
              cliente e sugere a carga nessa data. Se a entrega estiver na quarta
              e a próxima rota compatível for quinta, a sugestão será quinta.
            </p>
          </div>

          <button
            type="button"
            onClick={createAllSuggestions}
            disabled={creatingAll || suggestions.length === 0}
            className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            {creatingAll ? "Criando..." : "Criar todas as sugestões"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">
              Rotas sugeridas de
            </span>
            <input
              type="date"
              value={startDate}
              onChange={function (event) {
                setStartDate(event.target.value);
              }}
              className="mt-1 w-full h-9 border border-slate-300 rounded-lg px-2 text-xs"
            />
          </label>

          <label className="block">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">
              Até
            </span>
            <input
              type="date"
              value={endDate}
              onChange={function (event) {
                setEndDate(event.target.value);
              }}
              className="mt-1 w-full h-9 border border-slate-300 rounded-lg px-2 text-xs"
            />
          </label>

          <label className="block">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">
              Meta por turno (R$)
            </span>
            <div className="relative mt-1">
              <Target
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="number"
                min={1000}
                step={1000}
                value={targetPerShift}
                onChange={function (event) {
                  setTargetPerShift(
                    Math.max(1000, Number(event.target.value || 25000)),
                  );
                }}
                className="w-full h-9 pl-8 pr-2 border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 font-bold">
            {suggestions.length} rota(s)/carga(s) pré-montada(s)
          </span>

          {suggestionData.noRouteOrderCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              {suggestionData.noRouteOrderCount} pedido(s) sem rota compatível
            </span>
          )}

          {suggestionData.missingDateOrderCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-bold">
              {suggestionData.missingDateOrderCount} pedido(s) sem data de entrega
            </span>
          )}

          {suggestionData.partialOrderCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 font-bold">
              {suggestionData.partialOrderCount} pedido(s) parcialmente vinculados
              - revisão manual
            </span>
          )}
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <Truck size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-extrabold text-slate-700">
            Nenhuma sugestão para o período
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Verifique as datas de entrega, as cidades dos clientes e as rotas
            cadastradas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {suggestions.map(function (suggestion) {
            const target = Math.max(1, targetPerShift);
            const percent = Math.round(
              (suggestion.projectedRevenue / target) * 100,
            );
            const difference = suggestion.projectedRevenue - target;

            let badgeClass =
              "bg-blue-50 border-blue-200 text-blue-800";
            if (Math.abs(difference) <= target * 0.1) {
              badgeClass =
                "bg-emerald-50 border-emerald-200 text-emerald-800";
            } else if (difference < 0) {
              badgeClass =
                "bg-amber-50 border-amber-200 text-amber-800";
            }

            let progressClass = "bg-blue-500";
            if (percent >= 90 && percent <= 115) {
              progressClass = "bg-emerald-500";
            } else if (percent < 90) {
              progressClass = "bg-amber-500";
            }

            return (
              <div
                key={suggestion.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold flex items-center gap-1.5">
                      <CalendarDays size={12} />
                      {formatDate(suggestion.scheduledDate)} •{" "}
                      {SHIFT_LABEL[suggestion.route.shift]}
                    </span>
                    <h3 className="font-black text-slate-900 mt-1 break-words flex items-start gap-1.5">
                      <RouteIcon size={16} className="text-violet-600 shrink-0 mt-0.5" />
                      {suggestion.route.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {suggestion.customerCount} cliente(s) •{" "}
                      {suggestion.orderCount} pedido(s) •{" "}
                      {suggestion.totalQuantity} un
                    </p>
                  </div>

                  <span
                    className={
                      "px-2.5 py-1 rounded-full border text-[10px] font-extrabold whitespace-nowrap " +
                      badgeClass
                    }
                  >
                    {difference >= 0
                      ? "+ " + formatCurrency(difference)
                      : "Faltam " + formatCurrency(Math.abs(difference))}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[9px] uppercase font-bold text-emerald-700">
                      Faturamento previsto
                    </span>
                    <strong className="block text-lg text-emerald-800">
                      {formatCurrency(suggestion.projectedRevenue)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[9px] uppercase font-bold text-slate-500">
                      Meta do turno
                    </span>
                    <strong className="block text-lg text-slate-800">
                      {formatCurrency(target)}
                    </strong>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                    <span>Atingimento da meta</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={"h-full rounded-full " + progressClass}
                      style={{
                        width:
                          String(Math.min(100, Math.max(0, percent))) + "%",
                      }}
                    />
                  </div>
                </div>

                {suggestion.lateOrderCount > 0 && (
                  <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 font-bold flex items-start gap-1.5">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    {suggestion.lateOrderCount} pedido(s) serão sugeridos na
                    primeira rota compatível após a data prevista de entrega.
                  </p>
                )}

                <details className="border border-slate-200 rounded-xl overflow-hidden">
                  <summary className="cursor-pointer select-none px-3 py-2 bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-600">
                    Ver pedidos e todos os itens ({suggestion.items.length} itens)
                  </summary>
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                    {suggestion.items.map(function (row) {
                      const customer = findCustomerForOrder(
                        row.order,
                        db.customers,
                      );
                      const city = getCustomerCity(customer, row.order);

                      return (
                        <div
                          key={row.order.id}
                          className="p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate">
                              #{row.order.orderCode} •{" "}
                              {row.order.customerName}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {row.order.customProductName ||
                                row.item?.name ||
                                "Item"}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />
                              {city || "Cidade não identificada"} • entrega{" "}
                              {formatDate(row.deliveryDate)}
                            </span>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <strong className="block text-slate-800">
                              {row.quantity} un
                            </strong>
                            <span className="text-[10px] text-emerald-700 font-bold">
                              {formatCurrency(row.revenue)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>

                {suggestion.missingPriceItems > 0 && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-bold flex gap-1.5 items-start">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    {suggestion.missingPriceItems} item(ns) estão sem preço e entram
                    como R$ 0,00 na projeção.
                  </p>
                )}

                <button
                  type="button"
                  onClick={function () {
                    void createSuggestedLoad(suggestion);
                  }}
                  disabled={creatingKey === suggestion.key || creatingAll}
                  className="w-full h-9 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  {creatingKey === suggestion.key
                    ? "Criando carga..."
                    : "Criar carga com esta rota"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
