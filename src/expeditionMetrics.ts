import type { Carga, Order } from "./types";

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
