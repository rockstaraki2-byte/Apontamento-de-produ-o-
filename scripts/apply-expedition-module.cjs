const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function patchFile(relativePath, patches) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  let changed = false;

  for (const patch of patches) {
    if (patch.marker && source.includes(patch.marker)) continue;
    if (!source.includes(patch.find)) {
      throw new Error(`[expedition-module] alvo não encontrado em ${relativePath}: ${patch.name}`);
    }
    source = source.replace(patch.find, patch.replace);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, source, "utf8");
    console.log(`[expedition-module] ${relativePath} atualizado.`);
  } else {
    console.log(`[expedition-module] ${relativePath} já estava atualizado.`);
  }
}

patchFile("src/types.ts", [
  {
    name: "tipos de programação de cargas",
    marker: "export interface ExpeditionRoute",
    find: `export interface Carga {\n  id: string;\n  name: string;\n  dayOfWeek?: string;\n  orderIds: number[];\n  orderQuantities?: Record<number, number>;\n  stockEntries?: {\n    id: string; // \`${'${itemId}|${color}|${size}|${variation}|${stage}'}\`\n    itemId: number;\n    color: string;\n    size: string;\n    variation: string;\n    quantity: number;\n  }[];\n  route?: string[];\n  status: \"PLANEJADA\" | \"EM_TRANSITO\" | \"ENTREGUE\" | \"FATURADA\";\n  createdAt: number;\n  notes?: string;\n  driverName?: string;\n  vehiclePlate?: string;\n  departureDate?: string;\n}`,
    replace: `export type ExpeditionShift = \"MANHA\" | \"TARDE\";\n\nexport interface ExpeditionRoute {\n  id: string;\n  name: string;\n  weekday: number; // 0=Domingo ... 6=Sábado\n  shift: ExpeditionShift;\n  cutoffTime?: string;\n  customerIds: number[];\n  active: boolean;\n  notes?: string;\n  createdAt: number;\n  tenantId?: string;\n}\n\nexport interface CargaAuditEntry {\n  timestamp: number;\n  userId: string;\n  userName: string;\n  action: string;\n  reason?: string;\n}\n\nexport interface Carga {\n  id: string;\n  name: string;\n  dayOfWeek?: string;\n  routeId?: string;\n  routeName?: string;\n  shift?: ExpeditionShift;\n  scheduledDate?: string;\n  orderIds: number[];\n  orderQuantities?: Record<number, number>;\n  separatedQuantities?: Record<number, number>;\n  stagingLocation?: string;\n  stockEntries?: {\n    id: string; // \`${'${itemId}|${color}|${size}|${variation}|${stage}'}\`\n    itemId: number;\n    color: string;\n    size: string;\n    variation: string;\n    quantity: number;\n  }[];\n  route?: string[];\n  status:\n    | \"PLANEJADA\"\n    | \"ABERTA\"\n    | \"FECHADA\"\n    | \"LIBERADA\"\n    | \"EM_SEPARACAO\"\n    | \"PRONTA\"\n    | \"CARREGADA\"\n    | \"DESPACHADA\"\n    | \"EM_TRANSITO\"\n    | \"ENTREGUE\"\n    | \"FATURADA\";\n  createdAt: number;\n  closedAt?: number;\n  releasedAt?: number;\n  notes?: string;\n  driverName?: string;\n  vehiclePlate?: string;\n  departureDate?: string;\n  auditTrail?: CargaAuditEntry[];\n  tenantId?: string;\n}`,
  },
  {
    name: "telas de cargas no catálogo de permissões",
    marker: `{ key: \"cargas\", label: \"Programação de Cargas\"`,
    find: `  { key: \"lotes\", label: \"Gestão de Lotes\", category: \"PCP e Pedidos\", path: \"/lotes\" },`,
    replace: `  { key: \"lotes\", label: \"Gestão de Lotes\", category: \"PCP e Pedidos\", path: \"/lotes\" },\n  { key: \"cargas\", label: \"Programação de Cargas\", category: \"PCP e Pedidos\", path: \"/cargas\" },\n  { key: \"cargas-tv\", label: \"Expedição - Modo TV\", category: \"Produção e Setores\", path: \"/cargas-tv\" },`,
  },
]);

patchFile("src/useDatabase.ts", [
  {
    name: "import ExpeditionRoute",
    marker: "  ExpeditionRoute,",
    find: `  Carga,\n  ProductionSchedule,`,
    replace: `  Carga,\n  ExpeditionRoute,\n  ProductionSchedule,`,
  },
  {
    name: "estado expeditionRoutes",
    marker: "const [expeditionRoutes, setExpeditionRoutes]",
    find: `  const [cargas, setCargas] = useState<Carga[]>([]);\n  const [productionSchedules, setProductionSchedules]`,
    replace: `  const [cargas, setCargas] = useState<Carga[]>([]);\n  const [expeditionRoutes, setExpeditionRoutes] = useState<ExpeditionRoute[]>([]);\n  const [productionSchedules, setProductionSchedules]`,
  },
  {
    name: "snapshot expeditionRoutes",
    marker: "const unsubExpeditionRoutes = onSnapshot",
    find: `    const unsubCargas = onSnapshot(\n      collection(db, \"cargas\"),\n      (snap) => setCargas(snap.docs.map((d) => d.data() as Carga)),\n      (err) => handleSnapshotError(\"cargas\", err),\n    );\n    const unsubSchedules = onSnapshot(`,
    replace: `    const unsubCargas = onSnapshot(\n      collection(db, \"cargas\"),\n      (snap) => setCargas(snap.docs.map((d) => d.data() as Carga)),\n      (err) => handleSnapshotError(\"cargas\", err),\n    );\n    const unsubExpeditionRoutes = onSnapshot(\n      collection(db, \"expeditionRoutes\"),\n      (snap) => setExpeditionRoutes(snap.docs.map((d) => d.data() as ExpeditionRoute)),\n      (err) => handleSnapshotError(\"expeditionRoutes\", err),\n    );\n    const unsubSchedules = onSnapshot(`,
  },
  {
    name: "cleanup expeditionRoutes",
    marker: "      unsubExpeditionRoutes();",
    find: `      unsubCargas();\n      unsubSchedules();`,
    replace: `      unsubCargas();\n      unsubExpeditionRoutes();\n      unsubSchedules();`,
  },
  {
    name: "tenant filter expeditionRoutes",
    marker: "const filteredExpeditionRoutes = useMemo",
    find: `  const filteredCargas = useMemo(() => cargas.filter((x) => matchesTenant(x.tenantId || (x as any).companyId)), [cargas, matchesTenant]);\n  const filteredExtraHours`,
    replace: `  const filteredCargas = useMemo(() => cargas.filter((x) => matchesTenant(x.tenantId || (x as any).companyId)), [cargas, matchesTenant]);\n  const filteredExpeditionRoutes = useMemo(() => expeditionRoutes.filter((x) => matchesTenant(x.tenantId || (x as any).companyId)), [expeditionRoutes, matchesTenant]);\n  const filteredExtraHours`,
  },
  {
    name: "CRUD expeditionRoutes",
    marker: "    expeditionRoutes: filteredExpeditionRoutes,",
    find: `    deleteCarga: async (id: string) => {\n      await deleteDoc(doc(db, \"cargas\", id));\n    },\n\n    productionSchedules,`,
    replace: `    deleteCarga: async (id: string) => {\n      await deleteDoc(doc(db, \"cargas\", id));\n    },\n\n    expeditionRoutes: filteredExpeditionRoutes,\n    addExpeditionRoute: async (route: Omit<ExpeditionRoute, \"id\"> & { id?: string }) => {\n      const id = route.id || \`route_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;\n      await setDoc(\n        doc(db, \"expeditionRoutes\", id),\n        cleanUndefined({ ...route, id, tenantId: (route as any).tenantId || activeTenantId }),\n      );\n      return id;\n    },\n    updateExpeditionRoute: async (route: ExpeditionRoute) => {\n      const current = expeditionRoutes.find((r) => r.id === route.id);\n      const updated = { ...route, tenantId: route.tenantId || (current as any)?.tenantId || activeTenantId };\n      if (current && JSON.stringify(current) === JSON.stringify(updated)) return;\n      await setDoc(doc(db, \"expeditionRoutes\", route.id), cleanUndefined(updated), { merge: true });\n    },\n    deleteExpeditionRoute: async (id: string) => {\n      await deleteDoc(doc(db, \"expeditionRoutes\", id));\n    },\n\n    productionSchedules,`,
  },
]);

patchFile("src/App.tsx", [
  {
    name: "import access expedition",
    marker: `from \"./expeditionAccess\"`,
    find: `import { isImperioPackagingUser } from \"./utils/imperioPackagingUtils\";`,
    replace: `import { isImperioPackagingUser } from \"./utils/imperioPackagingUtils\";\nimport { canManageExpedition, canViewExpeditionTV } from \"./expeditionAccess\";`,
  },
  {
    name: "lazy expedition screens",
    marker: "const ProgramacaoCargasScreen = lazyNamed",
    find: `const LogisticaScreen = lazyNamed(() => import(\"./LogisticaScreen\"), \"LogisticaScreen\");`,
    replace: `const LogisticaScreen = lazyNamed(() => import(\"./LogisticaScreen\"), \"LogisticaScreen\");\nconst ProgramacaoCargasScreen = lazyNamed(() => import(\"./ProgramacaoCargasScreen\"), \"ProgramacaoCargasScreen\");\nconst ExpedicaoTVScreen = lazyNamed(() => import(\"./ExpedicaoTVScreen\"), \"ExpedicaoTVScreen\");`,
  },
  {
    name: "rotas cargas",
    marker: `path=\"/cargas\"`,
    find: `            {(currentUser.role === \"ADMIN\" ||\n              currentUser.role === \"GERENCIA\") && (\n              <Route\n                path=\"/financeiro\"`,
    replace: `            {canManageExpedition(db.activeTenantId, currentUser) && (\n              <Route\n                path=\"/cargas\"\n                element={<ProgramacaoCargasScreen db={db} currentUser={currentUser} />}\n              />\n            )}\n            {canViewExpeditionTV(db.activeTenantId, currentUser) && (\n              <Route\n                path=\"/cargas-tv\"\n                element={<ExpedicaoTVScreen db={db} currentUser={currentUser} />}\n              />\n            )}\n            {(currentUser.role === \"ADMIN\" ||\n              currentUser.role === \"GERENCIA\") && (\n              <Route\n                path=\"/financeiro\"`,
  },
  {
    name: "nav cargas",
    marker: `label=\"Cargas\"`,
    find: `          {isScreenAllowed(\"estoque\") && (currentUser.role === \"ADMIN\" ||`,
    replace: `          {canManageExpedition(db.activeTenantId, currentUser) && (\n            <NavLink\n              to=\"/cargas\"\n              icon={<Truck size={24} />}\n              label=\"Cargas\"\n            />\n          )}\n\n          {currentUser.role === \"EMBALAGEM\" && canViewExpeditionTV(db.activeTenantId, currentUser) && (\n            <NavLink\n              to=\"/cargas-tv\"\n              icon={<Monitor size={24} />}\n              label=\"Cargas TV\"\n            />\n          )}\n\n          {isScreenAllowed(\"estoque\") && (currentUser.role === \"ADMIN\" ||`,
  },
  {
    name: "estado e recomendação de carga no lançamento",
    marker: "IMPERIO_ORDER_LOAD_PLANNER_STATE",
    find: `  const [orderToastMessage, setOrderToastMessage] = useState(\"\");\n\n  const handleCadastrar = async () => {`,
    replace: `  const [orderToastMessage, setOrderToastMessage] = useState(\"\");\n\n  // IMPERIO_ORDER_LOAD_PLANNER_STATE\n  const [selectedExpeditionCargaId, setSelectedExpeditionCargaId] = useState(\"\");\n  const expeditionCustomer = React.useMemo(() => {\n    const normalized = normalizeString(customerName || \"\");\n    if (!normalized) return null;\n    return db.customers.find((c) => {\n      const full = normalizeString(\`\${c.id} \${c.name} \${c.tradeName || \"\"}\`);\n      return (\n        normalizeString(c.name) === normalized ||\n        normalizeString(c.tradeName || \"\") === normalized ||\n        full.includes(normalized) ||\n        normalized.includes(normalizeString(c.name)) ||\n        (c.tradeName && normalized.includes(normalizeString(c.tradeName)))\n      );\n    }) || null;\n  }, [customerName, db.customers]);\n\n  const expeditionRoutesForCustomer = React.useMemo(() => {\n    if (!expeditionCustomer || db.activeTenantId !== \"imperio\") return [];\n    return (db.expeditionRoutes || []).filter(\n      (r: any) => r.active !== false && (r.customerIds || []).includes(expeditionCustomer.id),\n    );\n  }, [expeditionCustomer, db.expeditionRoutes, db.activeTenantId]);\n\n  const expeditionLoadsForCustomer = React.useMemo(() => {\n    const routeIds = new Set(expeditionRoutesForCustomer.map((r: any) => r.id));\n    return (db.cargas || [])\n      .filter((c: any) => c.routeId && routeIds.has(c.routeId))\n      .sort((a: any, b: any) => String(a.scheduledDate || a.departureDate || \"\").localeCompare(String(b.scheduledDate || b.departureDate || \"\")));\n  }, [db.cargas, expeditionRoutesForCustomer]);\n\n  const expeditionSuggestedLoad = React.useMemo(() => {\n    const today = new Date().toISOString().split(\"T\")[0];\n    return expeditionLoadsForCustomer.find((c: any) =>\n      (c.status === \"ABERTA\" || c.status === \"PLANEJADA\") &&\n      String(c.scheduledDate || c.departureDate || \"\") >= today\n    ) || null;\n  }, [expeditionLoadsForCustomer]);\n\n  const expeditionLastLoad = React.useMemo(() => {\n    const today = new Date().toISOString().split(\"T\")[0];\n    return [...expeditionLoadsForCustomer]\n      .filter((c: any) => String(c.scheduledDate || c.departureDate || \"\") < today)\n      .sort((a: any, b: any) => String(b.scheduledDate || b.departureDate || \"\").localeCompare(String(a.scheduledDate || a.departureDate || \"\")))[0] || null;\n  }, [expeditionLoadsForCustomer]);\n\n  const linkCreatedOrderToSelectedCarga = async (createdOrderId: number, qty: number) => {\n    if (!selectedExpeditionCargaId) return;\n    const carga = (db.cargas || []).find((c: any) => c.id === selectedExpeditionCargaId);\n    if (!carga || !(carga.status === \"ABERTA\" || carga.status === \"PLANEJADA\")) return;\n    const ids = Array.from(new Set([...(carga.orderIds || []), createdOrderId]));\n    const quantities = { ...(carga.orderQuantities || {}), [createdOrderId]: qty };\n    await db.updateCarga({\n      ...carga,\n      orderIds: ids,\n      orderQuantities: quantities,\n      auditTrail: [\n        ...(carga.auditTrail || []),\n        {\n          timestamp: Date.now(),\n          userId: currentUser.id,\n          userName: currentUser.name,\n          action: \`Pedido \${orderCode} vinculado no lançamento (\${qty} un)\`,\n        },\n      ],\n    });\n  };\n\n  const handleCadastrar = async () => {`,
  },
  {
    name: "vincular itens criados à carga escolhida",
    marker: "await linkCreatedOrderToSelectedCarga(createdOrderId, numTotalQuantity);",
    find: `        await db.addOrder({\n          orderCode,\n          itemId: numItemId,\n          customerName,\n          representativeName,\n          color: itemInfo.color,\n          size: itemInfo.size,\n          variation: itemInfo.variation,\n          totalQuantity: numTotalQuantity,\n          unitPrice: itemInfo.unitPrice,\n          paymentCondition: finalPaymentCondition,\n          paymentTerms,\n          fiscalType,\n          billingRule,\n          discountPercent: discountPercent === \"\" ? undefined : Number(discountPercent),\n          hasRET,\n          packedQuantity: qtFromStock,\n          producedQuantity: qtFromStock,\n          paintedQuantity: qtFromStock,\n          cutQuantity: qtFromStock,\n          isThirdPartyLaser: itemInfo.isThirdPartyLaser,\n          isUrgent: itemInfo.isUrgent,\n          isProgramacao: itemInfo.isProgramacao,\n          isActive: true,\n          createdAt: Date.now(),\n          deliveryDate,\n          status: status,\n        });\n\n        if (itemInfo.isThirdPartyLaser) {`,
    replace: `        const createdOrderId = await db.addOrder({\n          orderCode,\n          itemId: numItemId,\n          customerName,\n          representativeName,\n          color: itemInfo.color,\n          size: itemInfo.size,\n          variation: itemInfo.variation,\n          totalQuantity: numTotalQuantity,\n          unitPrice: itemInfo.unitPrice,\n          paymentCondition: finalPaymentCondition,\n          paymentTerms,\n          fiscalType,\n          billingRule,\n          discountPercent: discountPercent === \"\" ? undefined : Number(discountPercent),\n          hasRET,\n          packedQuantity: qtFromStock,\n          producedQuantity: qtFromStock,\n          paintedQuantity: qtFromStock,\n          cutQuantity: qtFromStock,\n          isThirdPartyLaser: itemInfo.isThirdPartyLaser,\n          isUrgent: itemInfo.isUrgent,\n          isProgramacao: itemInfo.isProgramacao,\n          isActive: true,\n          createdAt: Date.now(),\n          deliveryDate,\n          status: status,\n        });\n        await linkCreatedOrderToSelectedCarga(createdOrderId, numTotalQuantity);\n\n        if (itemInfo.isThirdPartyLaser) {`,
  },
  {
    name: "reset carga escolhida após lançamento",
    marker: "setSelectedExpeditionCargaId(\"\"); // IMPERIO_ORDER_LOAD_PLANNER_RESET",
    find: `    setLineItems([]);\n    setIsFormVisible(false);`,
    replace: `    setLineItems([]);\n    setSelectedExpeditionCargaId(\"\"); // IMPERIO_ORDER_LOAD_PLANNER_RESET\n    setIsFormVisible(false);`,
  },
  {
    name: "card programação de carga no formulário",
    marker: "IMPERIO_ORDER_LOAD_PLANNER_UI",
    find: `                  {/* Row 4: Config flags & status indicators */}`,
    replace: `                  {/* IMPERIO_ORDER_LOAD_PLANNER_UI */}\n                  {db.activeTenantId === \"imperio\" && expeditionCustomer && (\n                    <div className=\"rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex flex-col gap-2\">\n                      <div className=\"flex flex-col sm:flex-row sm:items-center justify-between gap-2\">\n                        <div>\n                          <span className=\"text-[10px] uppercase tracking-wider font-extrabold text-blue-700\">🚚 Programação de carga</span>\n                          <p className=\"text-[10px] text-slate-600 mt-0.5\">Cliente: <strong>{expeditionCustomer.tradeName || expeditionCustomer.name}</strong></p>\n                        </div>\n                        <button type=\"button\" onClick={() => window.open(\"/cargas\", \"_blank\")} className=\"px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-[10px] font-extrabold hover:bg-blue-100\">Abrir programação</button>\n                      </div>\n                      {expeditionRoutesForCustomer.length === 0 ? (\n                        <div className=\"text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2\">Cliente ainda não está vinculado a uma rota de carga. O pedido poderá ser vinculado depois em Programação de Cargas.</div>\n                      ) : (\n                        <>\n                          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]\">\n                            <div className=\"bg-white border border-blue-100 rounded-lg px-2.5 py-2 text-slate-600\">Última carga: <strong className=\"text-slate-800\">{expeditionLastLoad ? \`\${expeditionLastLoad.routeName || expeditionLastLoad.name} • \${expeditionLastLoad.scheduledDate || expeditionLastLoad.departureDate || \"-\"}\` : \"Nenhuma carga anterior\"}</strong></div>\n                            <div className=\"bg-white border border-blue-100 rounded-lg px-2.5 py-2 text-slate-600\">Próxima aberta: <strong className=\"text-blue-700\">{expeditionSuggestedLoad ? \`\${expeditionSuggestedLoad.routeName || expeditionSuggestedLoad.name} • \${expeditionSuggestedLoad.scheduledDate || expeditionSuggestedLoad.departureDate || \"-\"}\` : \"Nenhuma carga programada\"}</strong></div>\n                          </div>\n                          <div className=\"flex flex-col sm:flex-row gap-2\">\n                            <select value={selectedExpeditionCargaId} onChange={(e) => setSelectedExpeditionCargaId(e.target.value)} className=\"flex-1 h-8 rounded-lg border border-blue-200 bg-white px-2 text-[10px] font-semibold text-slate-700\">\n                              <option value=\"\">Não vincular agora / escolher depois</option>\n                              {expeditionLoadsForCustomer.filter((c: any) => c.status === \"ABERTA\" || c.status === \"PLANEJADA\").map((c: any) => (\n                                <option key={c.id} value={c.id}>{c.scheduledDate || c.departureDate || \"Sem data\"} • {c.routeName || c.name}</option>\n                              ))}\n                            </select>\n                            {expeditionSuggestedLoad && (\n                              <button type=\"button\" onClick={() => setSelectedExpeditionCargaId(expeditionSuggestedLoad.id)} className=\"h-8 px-3 rounded-lg bg-blue-600 text-white text-[10px] font-extrabold hover:bg-blue-700\">Usar próxima carga</button>\n                            )}\n                          </div>\n                          {selectedExpeditionCargaId && <p className=\"text-[9px] text-blue-800 font-bold\">✓ Todos os itens adicionados neste lançamento serão vinculados à carga selecionada com suas respectivas quantidades.</p>}\n                        </>\n                      )}\n                    </div>\n                  )}\n\n                  {/* Row 4: Config flags & status indicators */}`,
  },
]);
