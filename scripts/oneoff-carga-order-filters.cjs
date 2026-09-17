const fs = require('fs');

const path = 'src/ProgramacaoCargasScreen.tsx';
let source = fs.readFileSync(path, 'utf8');
const lines = (...items) => items.join('\n');

function patchExact(find, replace, label) {
  if (!source.includes(find)) throw new Error(`Alvo não encontrado: ${label}`);
  source = source.replace(find, replace);
  console.log(`OK: ${label}`);
}

function patchRegex(regex, replace, label) {
  if (!regex.test(source)) throw new Error(`Alvo regex não encontrado: ${label}`);
  source = source.replace(regex, replace);
  console.log(`OK: ${label}`);
}

patchExact(
  lines(
    'function formatDate(value?: string) {',
    '  const dt = parseLocalDate(value);',
    '  return dt ? dt.toLocaleDateString("pt-BR") : "Sem data";',
    '}',
    ''
  ),
  lines(
    'function formatDate(value?: string) {',
    '  const dt = parseLocalDate(value);',
    '  return dt ? dt.toLocaleDateString("pt-BR") : "Sem data";',
    '}',
    '',
    'function timestampDateKey(value?: number) {',
    '  if (!value) return "";',
    '  const dt = new Date(value);',
    '  if (Number.isNaN(dt.getTime())) return "";',
    '  return dateKey(dt);',
    '}',
    '',
    'function formatTimestampDate(value?: number) {',
    '  if (!value) return "Sem data";',
    '  const dt = new Date(value);',
    '  return Number.isNaN(dt.getTime()) ? "Sem data" : dt.toLocaleDateString("pt-BR");',
    '}',
    ''
  ),
  'helpers de data de lançamento'
);

patchExact(
  lines(
    '  const [orderSearch, setOrderSearch] = useState("");',
    '  const [targetCargaId, setTargetCargaId] = useState("");',
    '  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});',
    ''
  ),
  lines(
    '  const [orderSearch, setOrderSearch] = useState("");',
    '  const [targetCargaId, setTargetCargaId] = useState("");',
    '  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});',
    '  const [orderDeliveryStart, setOrderDeliveryStart] = useState("");',
    '  const [orderDeliveryEnd, setOrderDeliveryEnd] = useState("");',
    '  const [orderCreatedStart, setOrderCreatedStart] = useState("");',
    '  const [orderCreatedEnd, setOrderCreatedEnd] = useState("");',
    '  const [orderBatchFilter, setOrderBatchFilter] = useState<"TODOS" | "COM_LOTE" | "SEM_LOTE" | number>("TODOS");',
    ''
  ),
  'estados dos filtros'
);

patchExact(
  lines(
    '  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);',
    '  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);',
    ''
  ),
  lines(
    '  const itemsById = useMemo(() => new Map(db.items.map((i) => [i.id, i])), [db.items]);',
    '  const ordersById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);',
    '  const batchIdsByOrder = useMemo(() => {',
    '    const map = new Map<number, number[]>();',
    '    (db.productionBatches || []).forEach((batch) => {',
    '      (batch.orderIds || []).forEach((orderId) => {',
    '        const ids = map.get(orderId) || [];',
    '        if (!ids.includes(batch.id)) ids.push(batch.id);',
    '        map.set(orderId, ids);',
    '      });',
    '    });',
    '    return map;',
    '  }, [db.productionBatches]);',
    ''
  ),
  'mapa de lotes por item de pedido'
);

const pendingReplacement = lines(
  '  const pendingRows = useMemo(() => {',
  '    const q = normalizeString(orderSearch);',
  '    return db.orders',
  '      .filter((o) => o.status !== "CANCELADO" && o.status !== "FATURADO")',
  '      .filter((o) => Number(o.invoicedQuantity || 0) < Number(o.totalQuantity || 0))',
  '      .map((o) => {',
  '        const open = Math.max(0, Number(o.totalQuantity || 0) - Number(o.invoicedQuantity || 0));',
  '        const allocated = allocationsByOrder.get(o.id) || 0;',
  '        const unallocated = Math.max(0, open - allocated);',
  '        const item = itemsById.get(o.itemId);',
  '        const batchIds = batchIdsByOrder.get(o.id) || [];',
  '        return { order: o, open, allocated, unallocated, item, batchIds };',
  '      })',
  '      .filter((row) => row.unallocated > 0)',
  '      .filter((row) => {',
  '        const deliveryKey = (row.order.deliveryDate || "").split("T")[0];',
  '        if (orderDeliveryStart && (!deliveryKey || deliveryKey < orderDeliveryStart)) return false;',
  '        if (orderDeliveryEnd && (!deliveryKey || deliveryKey > orderDeliveryEnd)) return false;',
  '',
  '        const createdKey = timestampDateKey(row.order.createdAt);',
  '        if (orderCreatedStart && (!createdKey || createdKey < orderCreatedStart)) return false;',
  '        if (orderCreatedEnd && (!createdKey || createdKey > orderCreatedEnd)) return false;',
  '',
  '        if (orderBatchFilter === "COM_LOTE" && row.batchIds.length === 0) return false;',
  '        if (orderBatchFilter === "SEM_LOTE" && row.batchIds.length > 0) return false;',
  '        if (typeof orderBatchFilter === "number" && !row.batchIds.includes(orderBatchFilter)) return false;',
  '        return true;',
  '      })',
  '      .filter((row) => {',
  '        if (!q) return true;',
  '        return normalizeString(',
  '          `${row.order.orderCode} ${row.order.customerName} ${row.item?.code || ""} ${row.item?.name || row.order.customProductName || ""}`,',
  '        ).includes(q);',
  '      })',
  '      .sort((a, b) => (a.order.deliveryDate || "9999").localeCompare(b.order.deliveryDate || "9999"));',
  '  }, [',
  '    db.orders,',
  '    allocationsByOrder,',
  '    itemsById,',
  '    batchIdsByOrder,',
  '    orderSearch,',
  '    orderDeliveryStart,',
  '    orderDeliveryEnd,',
  '    orderCreatedStart,',
  '    orderCreatedEnd,',
  '    orderBatchFilter,',
  '  ]);',
  '',
  '  const pendingRowIds = useMemo(() => new Set(pendingRows.map((row) => row.order.id)), [pendingRows]);',
  '  const selectedVisibleCount = useMemo(',
  '    () => Object.keys(selectedQuantities).filter((id) => pendingRowIds.has(Number(id))).length,',
  '    [selectedQuantities, pendingRowIds],',
  '  );',
  '  const selectedTotal = useMemo(',
  '    () => Object.entries(selectedQuantities).reduce(',
  '      (sum, [id, qty]) => pendingRowIds.has(Number(id)) ? sum + Number(qty || 0) : sum,',
  '      0,',
  '    ),',
  '    [selectedQuantities, pendingRowIds],',
  '  );',
  '',
  '  const clearOrderFilters = () => {',
  '    setOrderSearch("");',
  '    setOrderDeliveryStart("");',
  '    setOrderDeliveryEnd("");',
  '    setOrderCreatedStart("");',
  '    setOrderCreatedEnd("");',
  '    setOrderBatchFilter("TODOS");',
  '  };',
  ''
);

patchRegex(
  /  const pendingRows = useMemo\(\(\) => \{[\s\S]*?\n  const selectedTotal = useMemo\([\s\S]*?\n  \);\n/,
  pendingReplacement,
  'aplicar filtros e seleção visível'
);

patchExact(
  lines(
    '            <div className="flex items-center justify-between border-t border-slate-100 pt-3">',
    '              <span className="text-xs text-slate-600"><strong>{Object.keys(selectedQuantities).length}</strong> item(ns) selecionado(s) • <strong>{selectedTotal}</strong> un</span>',
    '              <button onClick={attachSelectedOrders} disabled={!targetCargaId || selectedTotal <= 0} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold">Vincular à carga</button>',
    '            </div>',
    ''
  ),
  lines(
    '            <div className="border-t border-slate-100 pt-3 space-y-2.5">',
    '              <div className="flex items-center justify-between gap-2">',
    '                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Filtros de pedidos</span>',
    '                <button type="button" onClick={clearOrderFilters} className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800 hover:underline">Limpar filtros</button>',
    '              </div>',
    '              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_1fr_auto] gap-2.5 items-end">',
    '                <div>',
    '                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Data de entrega</label>',
    '                  <div className="grid grid-cols-2 gap-1.5">',
    '                    <input type="date" value={orderDeliveryStart} onChange={(e) => setOrderDeliveryStart(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Entrega a partir de" />',
    '                    <input type="date" value={orderDeliveryEnd} onChange={(e) => setOrderDeliveryEnd(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Entrega até" />',
    '                  </div>',
    '                </div>',
    '                <div>',
    '                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Data de lançamento do pedido</label>',
    '                  <div className="grid grid-cols-2 gap-1.5">',
    '                    <input type="date" value={orderCreatedStart} onChange={(e) => setOrderCreatedStart(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Lançado a partir de" />',
    '                    <input type="date" value={orderCreatedEnd} onChange={(e) => setOrderCreatedEnd(e.target.value)} className="h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white" title="Lançado até" />',
    '                  </div>',
    '                </div>',
    '                <div>',
    '                  <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Vínculo de lote</label>',
    '                  <select',
    '                    value={String(orderBatchFilter)}',
    '                    onChange={(e) => {',
    '                      const value = e.target.value;',
    '                      if (value === "TODOS" || value === "COM_LOTE" || value === "SEM_LOTE") setOrderBatchFilter(value);',
    '                      else setOrderBatchFilter(Number(value));',
    '                    }}',
    '                    className="w-full h-9 border border-slate-300 rounded-lg px-2 text-xs bg-white"',
    '                  >',
    '                    <option value="TODOS">Todos os pedidos</option>',
    '                    <option value="COM_LOTE">Com lote vinculado</option>',
    '                    <option value="SEM_LOTE">Sem lote vinculado</option>',
    '                    {(db.productionBatches || []).map((batch) => <option key={batch.id} value={batch.id}>Lote: {batch.name} ({batch.status})</option>)}',
    '                  </select>',
    '                </div>',
    '                <div className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center whitespace-nowrap text-[10px] font-bold text-slate-600">',
    '                  {pendingRows.length} item(ns) encontrado(s)',
    '                </div>',
    '              </div>',
    '              <p className="text-[9px] text-slate-400 font-medium">Pedidos totalmente faturados são ocultados automaticamente. Pedidos faturados parcialmente aparecem somente pelo saldo ainda em aberto.</p>',
    '            </div>',
    '            <div className="flex items-center justify-between border-t border-slate-100 pt-3">',
    '              <span className="text-xs text-slate-600"><strong>{selectedVisibleCount}</strong> item(ns) selecionado(s) • <strong>{selectedTotal}</strong> un</span>',
    '              <button onClick={attachSelectedOrders} disabled={!targetCargaId || selectedTotal <= 0} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold">Vincular à carga</button>',
    '            </div>',
    ''
  ),
  'painel visual de filtros'
);

patchExact(
  '                  <tr><th className="p-3">Sel.</th><th className="p-3">Pedido</th><th className="p-3">Cliente / Produto</th><th className="p-3">Entrega</th><th className="p-3 text-right">Aberto</th><th className="p-3 text-right">Já em carga</th><th className="p-3 text-right">Sem carga</th><th className="p-3">Programação sugerida</th></tr>\n',
  '                  <tr><th className="p-3">Sel.</th><th className="p-3">Pedido</th><th className="p-3">Cliente / Produto</th><th className="p-3">Lançamento</th><th className="p-3">Entrega</th><th className="p-3">Lote</th><th className="p-3 text-right">Aberto</th><th className="p-3 text-right">Já em carga</th><th className="p-3 text-right">Sem carga</th><th className="p-3">Programação sugerida</th></tr>\n',
  'colunas lançamento e lote'
);

patchExact(
  lines(
    '                        <td className="p-3 text-xs text-slate-600">{formatDate(row.order.deliveryDate)}</td>',
    '                        <td className="p-3 text-xs font-bold text-right">{row.open}</td>',
    ''
  ),
  lines(
    '                        <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{formatTimestampDate(row.order.createdAt)}</td>',
    '                        <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(row.order.deliveryDate)}</td>',
    '                        <td className="p-3 text-[10px]">',
    '                          {row.batchIds.length > 0 ? (',
    '                            <span className="inline-flex px-2 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold" title={row.batchIds.map((id) => db.productionBatches.find((b) => b.id === id)?.name || `Lote ${id}`).join(", ")}>Com lote ({row.batchIds.length})</span>',
    '                          ) : (',
    '                            <span className="inline-flex px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-extrabold">Sem lote</span>',
    '                          )}',
    '                        </td>',
    '                        <td className="p-3 text-xs font-bold text-right">{row.open}</td>',
    ''
  ),
  'indicador visual de lote e data de lançamento'
);

patchExact(
  '              <table className="w-full min-w-[980px] text-left">\n',
  '              <table className="w-full min-w-[1220px] text-left">\n',
  'largura da tabela para novas colunas'
);

patchExact(
  '              {pendingRows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Todos os saldos em aberto já estão vinculados a cargas ativas.</div>}\n',
  '              {pendingRows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Nenhum pedido disponível para os filtros informados. Pedidos totalmente faturados não são exibidos.</div>}\n',
  'mensagem vazia compatível com filtros'
);

fs.writeFileSync(path, source, 'utf8');
console.log('Patch concluído.');
