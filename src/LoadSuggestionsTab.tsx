import React, { useMemo, useState } from "react";
import { AlertTriangle, Plus, Sparkles, Target, Truck } from "lucide-react";
import { useDatabase } from "./useDatabase";
import type { ExpeditionRoute, Item, Order, User } from "./types";
import { normalizeString } from "./searchUtils";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SHIFT_LABEL: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };
const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type SuggestionRow = {
  order: Order;
  item?: Item;
  quantity: number;
  revenue: number;
  netUnitPrice: number;
  route?: ExpeditionRoute;
  city: string;
  suggestedDate: string;
  hasPrice: boolean;
};

type LoadSuggestion = {
  key: string;
  scheduledDate: string;
  shift: "MANHA" | "TARDE";
  items: SuggestionRow[];
  projectedRevenue: number;
  missingPriceItems: number;
  customerCount: number;
  orderCount: number;
  totalQuantity: number;
  routeNames: string[];
  cityNames: string[];
};

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
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

function previousOrSameWeekday(weekday: number, from: Date) {
  const base = new Date(from);
  base.setHours(12, 0, 0, 0);
  const delta = (base.getDay() - weekday + 7) % 7;
  return addDays(base, -delta);
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

function getCityFromAddress(address: string, routes: ExpeditionRoute[]) {
  const normalizedAddress = normalizeString(address);
  const routeByAddress = routes.find(function (route) {
    const routeName = normalizeString(route.name);
    return Boolean(routeName) && normalizedAddress.includes(routeName);
  });
  if (routeByAddress) return routeByAddress.name;

  const match = address.match(/(?:^|,)\s*([^,]+?)\s*[-–/]\s*[A-Za-z]{2}\s*$/);
  if (match && match[1]) return match[1].trim();

  return address.trim() || "Sem cidade";
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
    return new Map(db.items.map(function (item) {
      return [item.id, item] as const;
    }));
  }, [db.items]);

  const ordersById = useMemo(function () {
    return new Map(db.orders.map(function (order) {
      return [order.id, order] as const;
    }));
  }, [db.orders]);

  const allocationsByOrder = useMemo(function () {
    const map = new Map<number, number>();

    (db.cargas || []).forEach(function (load) {
      (load.orderIds || []).forEach(function (orderId) {
        const qty = Number(load.orderQuantities?.[orderId] || 0);
        map.set(orderId, (map.get(orderId) || 0) + qty);
      });
    });

    db.orders.forEach(function (order) {
      const allocated = map.get(order.id) || 0;
      if (allocated <= 0) return;
      map.set(
        order.id,
        Math.max(0, allocated - Math.max(0, Number(order.invoicedQuantity || 0))),
      );
    });

    return map;
  }, [db.cargas, db.orders]);

  const findCustomer = function (order: Order) {
    return db.customers.find(function (customer) {
      return (
        normalizeString(customer.name) === normalizeString(order.customerName) ||
        normalizeString(customer.tradeName || "") === normalizeString(order.customerName)
      );
    });
  };

  const findSuggestedRoute = function (order: Order) {
    const customer = findCustomer(order);
    const address = normalizeString(customer?.address || "");
    const dueDate = parseLocalDate(order.deliveryDate);

    const linked = customer
      ? routes.filter(function (route) {
          return (route.customerIds || []).includes(customer.id);
        })
      : [];

    const byCity = routes.filter(function (route) {
      const routeName = normalizeString(route.name);
      return Boolean(routeName) && Boolean(address) && address.includes(routeName);
    });

    const candidates = linked.concat(byCity).filter(function (route, index, all) {
      return all.findIndex(function (item) {
        return item.id === route.id;
      }) === index;
    });

    if (candidates.length === 0) return undefined;
    if (!dueDate) return candidates[0];

    return candidates.slice().sort(function (a, b) {
      const aDays = (dueDate.getDay() - a.weekday + 7) % 7;
      const bDays = (dueDate.getDay() - b.weekday + 7) % 7;
      return aDays - bDays;
    })[0];
  };

  const suggestionData = useMemo(function () {
    const rows: SuggestionRow[] = db.orders
      .filter(function (order) {
        return (
          order.status !== "CANCELADO" &&
          order.status !== "FATURADO" &&
          Number(order.invoicedQuantity || 0) < Number(order.totalQuantity || 0)
        );
      })
      .map(function (order) {
        const open = Math.max(
          0,
          Number(order.totalQuantity || 0) - Number(order.invoicedQuantity || 0),
        );
        const allocated = allocationsByOrder.get(order.id) || 0;
        const quantity = Math.max(0, open - allocated);
        const item = itemsById.get(order.itemId);
        const route = findSuggestedRoute(order);
        const dueDate = parseLocalDate(order.deliveryDate);
        const customer = findCustomer(order);
        const address = customer?.address || "";
        const city = getCityFromAddress(address, routes);

        const unitPrice =
          order.unitPrice !== undefined
            ? Number(order.unitPrice || 0)
            : Number(item?.unitPrice ?? item?.basePrice ?? 0);
        const discountPercent = Math.max(
          0,
          Math.min(100, Number(order.discountPercent || 0)),
        );
        const netUnitPrice = unitPrice * (1 - discountPercent / 100);
        const revenue = quantity * netUnitPrice;

        let suggestedDate = order.deliveryDate ? order.deliveryDate.split("T")[0] : "";
        if (route && dueDate) {
          suggestedDate = dateKey(previousOrSameWeekday(route.weekday, dueDate));
        }

        return {
          order,
          item,
          quantity,
          revenue,
          netUnitPrice,
          route,
          city,
          suggestedDate,
          hasPrice: unitPrice > 0,
        };
      })
      .filter(function (row) {
        return row.quantity > 0;
      });

    const missingDateCount = rows.filter(function (row) {
      return !row.suggestedDate;
    }).length;

    const unmatchedRouteCount = rows.filter(function (row) {
      return !row.route;
    }).length;

    const byDay = new Map<string, SuggestionRow[]>();

    rows
      .filter(function (row) {
        return Boolean(row.suggestedDate);
      })
      .filter(function (row) {
        return (
          (!startDate || row.suggestedDate >= startDate) &&
          (!endDate || row.suggestedDate <= endDate)
        );
      })
      .forEach(function (row) {
        const existing = byDay.get(row.suggestedDate) || [];
        existing.push(row);
        byDay.set(row.suggestedDate, existing);
      });

    const suggestions: LoadSuggestion[] = [];

    Array.from(byDay.entries())
      .sort(function (a, b) {
        return a[0].localeCompare(b[0]);
      })
      .forEach(function (entry) {
        const scheduledDate = entry[0];
        const dayRows = entry[1];
        const morning: SuggestionRow[] = [];
        const afternoon: SuggestionRow[] = [];
        const unassigned: SuggestionRow[] = [];
        let morningValue = 0;
        let afternoonValue = 0;

        dayRows
          .slice()
          .sort(function (a, b) {
            const aRoute = a.route?.name || a.city;
            const bRoute = b.route?.name || b.city;
            return aRoute.localeCompare(bRoute) || a.order.orderCode.localeCompare(b.order.orderCode);
          })
          .forEach(function (row) {
            if (row.route?.shift === "MANHA") {
              morning.push(row);
              morningValue += row.revenue;
            } else if (row.route?.shift === "TARDE") {
              afternoon.push(row);
              afternoonValue += row.revenue;
            } else {
              unassigned.push(row);
            }
          });

        unassigned
          .slice()
          .sort(function (a, b) {
            return b.revenue - a.revenue;
          })
          .forEach(function (row) {
            const morningGap = targetPerShift - morningValue;
            const afternoonGap = targetPerShift - afternoonValue;
            if (
              morningValue < targetPerShift &&
              (morningGap >= afternoonGap || afternoonValue >= targetPerShift)
            ) {
              morning.push(row);
              morningValue += row.revenue;
            } else {
              afternoon.push(row);
              afternoonValue += row.revenue;
            }
          });

        const pushSuggestion = function (
          shift: "MANHA" | "TARDE",
          items: SuggestionRow[],
          projectedRevenue: number,
        ) {
          if (items.length === 0) return;

          const routeNames = Array.from(
            new Set(
              items
                .map(function (row) {
                  return row.route?.name || "";
                })
                .filter(Boolean),
            ),
          );
          const cityNames = Array.from(
            new Set(
              items
                .map(function (row) {
                  return row.city;
                })
                .filter(Boolean),
            ),
          );

          suggestions.push({
            key: scheduledDate + "|" + shift,
            scheduledDate,
            shift,
            items,
            projectedRevenue,
            missingPriceItems: items.filter(function (row) {
              return !row.hasPrice;
            }).length,
            customerCount: new Set(
              items.map(function (row) {
                return row.order.customerName;
              }),
            ).size,
            orderCount: new Set(
              items.map(function (row) {
                return row.order.orderCode;
              }),
            ).size,
            totalQuantity: items.reduce(function (sum, row) {
              return sum + row.quantity;
            }, 0),
            routeNames,
            cityNames,
          });
        };

        pushSuggestion("MANHA", morning, morningValue);
        pushSuggestion("TARDE", afternoon, afternoonValue);
      });

    return {
      suggestions,
      missingDateCount,
      unmatchedRouteCount,
    };
  }, [
    db.orders,
    db.customers,
    allocationsByOrder,
    itemsById,
    routes,
    startDate,
    endDate,
    targetPerShift,
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
      let adjusted = false;

      suggestion.items.forEach(function (row) {
        const order = ordersById.get(row.order.id);
        if (!order) return;

        const open = Math.max(
          0,
          Number(order.totalQuantity || 0) - Number(order.invoicedQuantity || 0),
        );
        const currentlyAllocated = allocationsByOrder.get(order.id) || 0;
        const available = Math.max(0, open - currentlyAllocated);
        const quantity = Math.min(row.quantity, available);

        if (quantity <= 0) return;
        if (quantity !== row.quantity) adjusted = true;

        orderIds.push(order.id);
        orderQuantities[order.id] = quantity;
      });

      if (orderIds.length === 0) {
        if (!silent) {
          alert("Os pedidos desta sugestão já foram alocados em outras cargas.");
        }
        return;
      }

      const scheduled = parseLocalDate(suggestion.scheduledDate);
      const pretty = scheduled
        ? String(scheduled.getDate()).padStart(2, "0") + "/" + MONTH_ABBR[scheduled.getMonth()]
        : suggestion.scheduledDate;

      const routeIds = Array.from(
        new Set(
          suggestion.items
            .map(function (row) {
              return row.route?.id || "";
            })
            .filter(Boolean),
        ),
      );

      const cityNames = suggestion.cityNames.filter(function (city) {
        return city !== "Sem cidade";
      });
      const routeLabel =
        cityNames.length > 0
          ? cityNames.join(" / ")
          : suggestion.routeNames.join(" / ") || "Sem rota definida";

      const name =
        "Carga " +
        pretty +
        " - " +
        SHIFT_LABEL[suggestion.shift] +
        " - " +
        routeLabel;

      await db.addCarga({
        name,
        routeId: routeIds.length === 1 ? routeIds[0] : undefined,
        routeName: routeLabel,
        route: suggestion.routeNames,
        shift: suggestion.shift,
        scheduledDate: suggestion.scheduledDate,
        departureDate: suggestion.scheduledDate,
        dayOfWeek: scheduled ? DAY_NAMES[scheduled.getDay()] : undefined,
        orderIds,
        orderQuantities,
        separatedQuantities: {},
        status: "ABERTA",
        createdAt: Date.now(),
        notes:
          "Carga pré-montada pelo sistema. Meta de faturamento por turno: " +
          formatCurrency(targetPerShift) +
          ".",
        auditTrail: [
          {
            timestamp: Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            action: "Carga criada a partir da sugestão automática",
          },
        ],
        tenantId: db.activeTenantId || undefined,
      });

      if (!silent) {
        alert(
          adjusted
            ? "Carga criada. Algumas quantidades foram ajustadas porque parte dos itens já havia sido alocada em outra carga."
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
        " cargas sugeridas deste período? O sistema usará somente os saldos ainda sem carga.",
    );
    if (!confirmed) return;

    setCreatingAll(true);
    try {
      for (const suggestion of suggestions) {
        await createSuggestedLoad(suggestion, true);
      }
      alert("Cargas sugeridas criadas. A visão semanal será atualizada automaticamente.");
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
                Sugestão automática de cargas
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              O sistema reúne pedidos com saldo ainda sem carga pela data prevista
              de entrega, rota/cidade do cliente e turno. A meta padrão é de R$ 25 mil
              de faturamento na manhã e R$ 25 mil à tarde. As sugestões não criam
              cargas até você confirmar.
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
              Embarques sugeridos de
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
            {suggestions.length} carga(s) pré-montada(s)
          </span>
          {suggestionData.unmatchedRouteCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              {suggestionData.unmatchedRouteCount} item(ns) sem rota fixa • balanceados entre os turnos
            </span>
          )}
          {suggestionData.missingDateCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-bold">
              {suggestionData.missingDateCount} item(ns) sem data de entrega • fora da sugestão
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
            Ajuste as datas ou verifique se existem pedidos com saldo ainda sem carga.
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
            const routeLabel =
              suggestion.cityNames.filter(function (city) {
                return city !== "Sem cidade";
              }).join(" / ") ||
              suggestion.routeNames.join(" / ") ||
              "Sem rota";

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
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
                      {formatDate(suggestion.scheduledDate)} •{" "}
                      {SHIFT_LABEL[suggestion.shift]}
                    </span>
                    <h3 className="font-black text-slate-900 mt-0.5 break-words">
                      {routeLabel}
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

                <details className="border border-slate-200 rounded-xl overflow-hidden">
                  <summary className="cursor-pointer select-none px-3 py-2 bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-600">
                    Ver itens pré-montados ({suggestion.items.length})
                  </summary>
                  <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">
                    {suggestion.items.map(function (row) {
                      return (
                        <div
                          key={row.order.id}
                          className="p-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate">
                              #{row.order.orderCode} • {row.order.customerName}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {row.order.customProductName ||
                                row.item?.name ||
                                "Item"}{" "}
                              • {row.city}
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
                  disabled={
                    creatingKey === suggestion.key || creatingAll
                  }
                  className="w-full h-9 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  {creatingKey === suggestion.key
                    ? "Criando carga..."
                    : "Criar esta carga sugerida"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
