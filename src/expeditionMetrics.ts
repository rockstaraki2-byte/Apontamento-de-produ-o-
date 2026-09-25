import type { Carga, Order } from "./types";

export const ORDER_ALLOCATION_ALLOWED_STATUSES = new Set<Carga["status"]>([
  "PLANEJADA",
  "ABERTA",
  "FECHADA",
  "LIBERADA",
  "EM_SEPARACAO",
  "FATURADA_PARCIAL",
]);

export type CargaOrderAllocationRequest = {
  orderId: number;
  quantity: number;
  availableQuantity: number;
  targetQuantityAtSelection: number;
};

export function mergeCargaOrderAllocations(
  carga: Carga,
  requests: CargaOrderAllocationRequest[],
) {
  if (!ORDER_ALLOCATION_ALLOWED_STATUSES.has(carga.status)) {
    throw new Error("Esta carga não aceita novos pedidos. Atualize a tela e tente novamente.");
  }
  if (requests.length === 0) {
    throw new Error("Selecione ao menos um pedido e uma quantidade.");
  }

  const orderIds = new Set(carga.orderIds || []);
  const orderQuantities = { ...(carga.orderQuantities || {}) } as Record<number, number>;
  const requestedOrderIds = new Set<number>();

  for (const request of requests) {
    const orderId = Number(request.orderId);
    const quantity = Number(request.quantity);
    const availableQuantity = Number(request.availableQuantity);
    const targetQuantityAtSelection = Number(request.targetQuantityAtSelection);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new Error("Um dos pedidos selecionados não é válido. Atualize a tela e tente novamente.");
    }
    if (requestedOrderIds.has(orderId)) {
      throw new Error(`O pedido ${orderId} foi selecionado mais de uma vez.`);
    }
    requestedOrderIds.add(orderId);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Informe uma quantidade inteira válida para o pedido ${orderId}.`);
    }
    if (!Number.isInteger(availableQuantity) || availableQuantity < 0) {
      throw new Error(`O saldo do pedido ${orderId} mudou. Atualize a tela e tente novamente.`);
    }

    const currentTargetQuantity = Math.max(
      0,
      Number(orderQuantities[orderId] || 0),
    );
    const previousTargetQuantity = Math.max(
      0,
      Number.isFinite(targetQuantityAtSelection) ? targetQuantityAtSelection : 0,
    );
    const concurrentTargetIncrease = Math.max(
      0,
      currentTargetQuantity - previousTargetQuantity,
    );
    const availableNow = Math.max(0, availableQuantity - concurrentTargetIncrease);

    if (quantity > availableNow) {
      throw new Error(
        `O pedido ${orderId} não tem mais saldo suficiente para esta carga. Disponível agora: ${availableNow}. Atualize a tela e revise a quantidade.`,
      );
    }

    orderIds.add(orderId);
    orderQuantities[orderId] = currentTargetQuantity + quantity;
  }

  return {
    orderIds: Array.from(orderIds),
    orderQuantities,
  };
}

export function loadDate(carga: Carga) {
  return (carga.scheduledDate || carga.departureDate || "").split("T")[0];
}

export function sortLoads(a: Carga, b: Carga) {
  const rank = (shift?: string) => shift === "MANHA" ? 0 : shift === "TARDE" ? 1 : 2;
  return loadDate(a).localeCompare(loadDate(b)) ||
    rank(a.shift) - rank(b.shift) || a.createdAt - b.createdAt;
}

export function isFullySeparated(carga: Carga) {
  const ids = carga.orderIds || [];
  return ids.length > 0 && ids.every((id) => {
    const allocated = Math.max(0, Number(carga.orderQuantities?.[id] || 0));
    return allocated > 0 && Number(carga.separatedQuantities?.[id] || 0) >= allocated;
  });
}

// A quantidade no pedido é total; distribua-a pelas cargas em ordem de saída.
// O mesmo cálculo alimenta planejamento e TV, inclusive no faturamento parcial.
export function createLoadMetrics(cargas: Carga[], orders: Order[]) {
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const loadsByOrder = new Map<number, Carga[]>();
  cargas.forEach((carga) => (carga.orderIds || []).forEach((id) => {
    const related = loadsByOrder.get(id) || [];
    related.push(carga);
    loadsByOrder.set(id, related);
  }));

  const packedByLoad = new Map<string, Record<number, number>>();
  const invoicedByLoad = new Map<string, Record<number, number>>();
  loadsByOrder.forEach((related, id) => {
    const order = ordersById.get(id);
    let remainingPacked = Math.max(0, Number(order?.packedQuantity || 0));
    let remainingInvoiced = Math.max(0, Number(order?.invoicedQuantity || 0));
    [...related].sort(sortLoads).forEach((carga) => {
      const allocated = Math.max(0, Number(carga.orderQuantities?.[id] || 0));
      packedByLoad.set(carga.id, {
        ...packedByLoad.get(carga.id),
        [id]: Math.min(allocated, remainingPacked),
      });
      invoicedByLoad.set(carga.id, {
        ...invoicedByLoad.get(carga.id),
        [id]: Math.min(allocated, remainingInvoiced),
      });
      remainingPacked = Math.max(0, remainingPacked - allocated);
      remainingInvoiced = Math.max(0, remainingInvoiced - allocated);
    });
  });

  const packedForLoad = (carga: Carga, id: number) => packedByLoad.get(carga.id)?.[id] || 0;
  const invoicedForLoad = (carga: Carga, id: number) => invoicedByLoad.get(carga.id)?.[id] || 0;
  const metrics = (carga: Carga) => {
    let required = 0, packed = 0, separated = 0, invoiced = 0, incompleteOrders = 0;
    const customers = new Set<string>();
    const orderCodes = new Set<string>();
    (carga.orderIds || []).forEach((id) => {
      const order = ordersById.get(id);
      const allocated = Math.max(0, Number(carga.orderQuantities?.[id] || 0));
      const separatedHere = Math.max(0, Math.min(allocated, Number(carga.separatedQuantities?.[id] || 0)));
      required += allocated;
      packed += packedForLoad(carga, id);
      invoiced += invoicedForLoad(carga, id);
      separated += separatedHere;
      if (separatedHere < allocated) incompleteOrders += 1;
      if (order) {
        customers.add(order.customerName);
        orderCodes.add(order.orderCode);
      }
    });
    return {
      required, packed, separated, invoiced, incompleteOrders,
      customerCount: customers.size, orderCount: orderCodes.size,
      percent: required > 0 ? Math.round((separated / required) * 100) : 0,
    };
  };
  return { packedForLoad, invoicedForLoad, metrics };
}
