const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function apply(relativePath, replacements) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  let changed = false;

  for (const r of replacements) {
    if (r.marker && source.includes(r.marker)) continue;
    if (!source.includes(r.find)) {
      throw new Error(`[expedition-hardening] trecho não encontrado em ${relativePath}: ${r.name}`);
    }
    source = source.replace(r.find, r.replace);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, source, "utf8");
    console.log(`[expedition-hardening] ${relativePath} atualizado.`);
  } else {
    console.log(`[expedition-hardening] ${relativePath} já estava atualizado.`);
  }
}

apply("src/App.tsx", [
  {
    name: "limpar carga selecionada ao trocar cliente",
    marker: "IMPERIO_LOAD_SELECTION_CUSTOMER_GUARD",
    find: `  const expeditionLoadsForCustomer = React.useMemo(() => {\n    const routeIds = new Set(expeditionRoutesForCustomer.map((r: any) => r.id));\n    return (db.cargas || [])\n      .filter((c: any) => c.routeId && routeIds.has(c.routeId))\n      .sort((a: any, b: any) => String(a.scheduledDate || a.departureDate || \"\").localeCompare(String(b.scheduledDate || b.departureDate || \"\")));\n  }, [db.cargas, expeditionRoutesForCustomer]);`,
    replace: `  const expeditionLoadsForCustomer = React.useMemo(() => {\n    const routeIds = new Set(expeditionRoutesForCustomer.map((r: any) => r.id));\n    return (db.cargas || [])\n      .filter((c: any) => c.routeId && routeIds.has(c.routeId))\n      .sort((a: any, b: any) => {\n        const dateCompare = String(a.scheduledDate || a.departureDate || \"\").localeCompare(String(b.scheduledDate || b.departureDate || \"\"));\n        if (dateCompare !== 0) return dateCompare;\n        const shiftRank = (shift?: string) => shift === \"MANHA\" ? 0 : shift === \"TARDE\" ? 1 : 2;\n        return shiftRank(a.shift) - shiftRank(b.shift) || Number(a.createdAt || 0) - Number(b.createdAt || 0);\n      });\n  }, [db.cargas, expeditionRoutesForCustomer]);\n\n  // IMPERIO_LOAD_SELECTION_CUSTOMER_GUARD\n  React.useEffect(() => {\n    if (\n      selectedExpeditionCargaId &&\n      !expeditionLoadsForCustomer.some((c: any) => c.id === selectedExpeditionCargaId)\n    ) {\n      setSelectedExpeditionCargaId(\"\");\n    }\n  }, [selectedExpeditionCargaId, expeditionLoadsForCustomer]);`,
  },
  {
    name: "restringir helper de vínculo a usuários autorizados",
    marker: "IMPERIO_LOAD_LINK_ACCESS_GUARD",
    find: `  const linkCreatedOrdersToSelectedCarga = async (createdItems: { id: number; qty: number }[]) => {\n    if (!selectedExpeditionCargaId || createdItems.length === 0) return;\n    const carga = (db.cargas || []).find((c: any) => c.id === selectedExpeditionCargaId);\n    if (!carga || !(carga.status === \"ABERTA\" || carga.status === \"PLANEJADA\")) return;`,
    replace: `  const linkCreatedOrdersToSelectedCarga = async (createdItems: { id: number; qty: number }[]) => {\n    // IMPERIO_LOAD_LINK_ACCESS_GUARD\n    if (\n      !canManageExpedition(db.activeTenantId, currentUser) ||\n      !selectedExpeditionCargaId ||\n      createdItems.length === 0\n    ) return;\n    const carga = (db.cargas || []).find((c: any) => c.id === selectedExpeditionCargaId);\n    const belongsToCustomerRoute = !!carga?.routeId && expeditionRoutesForCustomer.some((r: any) => r.id === carga.routeId);\n    if (\n      !carga ||\n      !belongsToCustomerRoute ||\n      !(carga.status === \"ABERTA\" || carga.status === \"PLANEJADA\")\n    ) return;`,
  },
  {
    name: "ocultar programação de carga no pedido para não autorizados",
    marker: "IMPERIO_ORDER_LOAD_PLANNER_AUTHORIZED_UI",
    find: `{db.activeTenantId === \"imperio\" && expeditionCustomer && (\n                    <div className=\"rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex flex-col gap-2\">`,
    replace: `{canManageExpedition(db.activeTenantId, currentUser) && expeditionCustomer && (\n                    <div className=\"rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex flex-col gap-2\" data-feature=\"IMPERIO_ORDER_LOAD_PLANNER_AUTHORIZED_UI\">`,
  },
]);

apply("src/ProgramacaoCargasScreen.tsx", [
  {
    name: "ordenar cargas por turno",
    marker: "function expeditionShiftRank",
    find: `function loadSort(a: Carga, b: Carga) {\n  return getLoadDate(a).localeCompare(getLoadDate(b)) || a.createdAt - b.createdAt;\n}`,
    replace: `function expeditionShiftRank(shift?: string) {\n  return shift === \"MANHA\" ? 0 : shift === \"TARDE\" ? 1 : 2;\n}\n\nfunction loadSort(a: Carga, b: Carga) {\n  return (\n    getLoadDate(a).localeCompare(getLoadDate(b)) ||\n    expeditionShiftRank(a.shift) - expeditionShiftRank(b.shift) ||\n    a.createdAt - b.createdAt\n  );\n}`,
  },
  {
    name: "manter alocação comprometida após despacho",
    marker: "IMPERIO_COMMITTED_LOAD_ALLOCATIONS",
    find: `  const allocationsByOrder = useMemo(() => {\n    const map = new Map<number, number>();\n    activeLoads.forEach((c) => {\n      (c.orderIds || []).forEach((id) => {\n        const qty = Number(c.orderQuantities?.[id] || 0);\n        map.set(id, (map.get(id) || 0) + qty);\n      });\n    });\n    return map;\n  }, [activeLoads]);`,
    replace: `  // IMPERIO_COMMITTED_LOAD_ALLOCATIONS\n  // Uma carga despachada continua comprometendo a quantidade até o faturamento\n  // reduzir o saldo do pedido. Isso evita que o mesmo item seja alocado duas vezes.\n  const allocationsByOrder = useMemo(() => {\n    const map = new Map<number, number>();\n    (db.cargas || []).forEach((c) => {\n      (c.orderIds || []).forEach((id) => {\n        const qty = Number(c.orderQuantities?.[id] || 0);\n        map.set(id, (map.get(id) || 0) + qty);\n      });\n    });\n    return map;\n  }, [db.cargas]);`,
  },
  {
    name: "distribuir embalagem acumulada sem duplicar entre cargas",
    marker: "const packedForLoad = (carga: Carga, orderId: number)",
    find: `  const selectedTotal = useMemo(\n    () => Object.values(selectedQuantities).reduce((sum, q) => sum + Number(q || 0), 0),\n    [selectedQuantities],\n  );\n\n  const loadMetrics = (carga: Carga) => {`,
    replace: `  const selectedTotal = useMemo(\n    () => Object.values(selectedQuantities).reduce((sum, q) => sum + Number(q || 0), 0),\n    [selectedQuantities],\n  );\n\n  const packedForLoad = (carga: Carga, orderId: number) => {\n    const order = ordersById.get(orderId);\n    if (!order) return 0;\n\n    let packedAvailable = Math.max(0, Number(order.packedQuantity || 0));\n    const relatedLoads = (db.cargas || [])\n      .filter((c) => (c.orderIds || []).includes(orderId))\n      .sort(loadSort);\n\n    for (const related of relatedLoads) {\n      const allocated = Math.max(0, Number(related.orderQuantities?.[orderId] || 0));\n      const packedHere = Math.min(allocated, packedAvailable);\n      if (related.id === carga.id) return packedHere;\n      packedAvailable = Math.max(0, packedAvailable - allocated);\n    }\n    return 0;\n  };\n\n  const loadMetrics = (carga: Carga) => {`,
  },
  {
    name: "usar embalagem distribuída nas métricas",
    marker: "const pack = packedForLoad(carga, id);",
    find: `      const pack = Math.min(qty, Number(order.packedQuantity || 0));`,
    replace: `      const pack = packedForLoad(carga, id);`,
  },
  {
    name: "usar embalagem distribuída no PDF",
    marker: "String(packedForLoad(carga, id))",
    find: `        String(Math.min(qty, Number(order?.packedQuantity || 0))),`,
    replace: `        String(packedForLoad(carga, id)),`,
  },
  {
    name: "usar embalagem distribuída no detalhe",
    marker: "{packedForLoad(selectedCarga, id)}",
    find: `{Math.min(qty, Number(o?.packedQuantity || 0))}</td><td className=\"p-3 text-xs text-emerald-700 font-black text-right\">`,
    replace: `{packedForLoad(selectedCarga, id)}</td><td className=\"p-3 text-xs text-emerald-700 font-black text-right\">`,
  },
]);

apply("src/ExpedicaoTVScreen.tsx", [
  {
    name: "ordenar cargas por turno na TV",
    marker: "function tvLoadSort",
    find: `function loadDate(carga: Carga) {\n  return carga.scheduledDate || carga.departureDate || \"\";\n}`,
    replace: `function loadDate(carga: Carga) {\n  return carga.scheduledDate || carga.departureDate || \"\";\n}\n\nfunction tvShiftRank(shift?: string) {\n  return shift === \"MANHA\" ? 0 : shift === \"TARDE\" ? 1 : 2;\n}\n\nfunction tvLoadSort(a: Carga, b: Carga) {\n  return (\n    loadDate(a).localeCompare(loadDate(b)) ||\n    tvShiftRank(a.shift) - tvShiftRank(b.shift) ||\n    a.createdAt - b.createdAt\n  );\n}`,
  },
  {
    name: "usar ordenação consistente na TV",
    marker: ".sort(tvLoadSort)",
    find: `.sort((a, b) => loadDate(a).localeCompare(loadDate(b)) || a.createdAt - b.createdAt),`,
    replace: `.sort(tvLoadSort),`,
  },
  {
    name: "distribuir embalagem entre cargas na TV",
    marker: "const packedForLoad = (carga: Carga, orderId: number)",
    find: `  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);\n  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);\n\n  const metrics = (carga: Carga) => {`,
    replace: `  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);\n  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);\n\n  const packedForLoad = (carga: Carga, orderId: number) => {\n    const order = ordersById.get(orderId);\n    if (!order) return 0;\n\n    let packedAvailable = Math.max(0, Number(order.packedQuantity || 0));\n    const relatedLoads = (db.cargas || [])\n      .filter((c) => (c.orderIds || []).includes(orderId))\n      .sort(tvLoadSort);\n\n    for (const related of relatedLoads) {\n      const allocated = Math.max(0, Number(related.orderQuantities?.[orderId] || 0));\n      const packedHere = Math.min(allocated, packedAvailable);\n      if (related.id === carga.id) return packedHere;\n      packedAvailable = Math.max(0, packedAvailable - allocated);\n    }\n    return 0;\n  };\n\n  const metrics = (carga: Carga) => {`,
  },
  {
    name: "usar embalagem distribuída na métrica TV",
    marker: "const pack = packedForLoad(carga, id);",
    find: `      const pack = Math.min(qty, Number(o.packedQuantity || 0));`,
    replace: `      const pack = packedForLoad(carga, id);`,
  },
  {
    name: "usar embalagem distribuída no detalhe TV",
    marker: "const packed = packedForLoad(selectedCarga, id);",
    find: `                  const packed = Math.min(allocated, Number(o?.packedQuantity || 0));`,
    replace: `                  const packed = packedForLoad(selectedCarga, id);`,
  },
]);
