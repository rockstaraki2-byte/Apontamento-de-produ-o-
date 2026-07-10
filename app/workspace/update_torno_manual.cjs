const fs = require('fs');

function writeUpdates(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add state variables
  const stateInsert = `
  const [manualTargetSearch, setManualTargetSearch] = useState("");
  const [manualOrderSearch, setManualOrderSearch] = useState("");
  const [selectedManualTargetId, setSelectedManualTargetId] = useState<number | null>(null);
  const [selectedManualOrderId, setSelectedManualOrderId] = useState<number | null>(null);
`;

  if (!content.includes('manualTargetSearch')) {
    content = content.replace(
      'const [manualQty, setManualQty] = useState<number | "">("");',
      'const [manualQty, setManualQty] = useState<number | "">("");\n' + stateInsert
    );
  }

  // Define logic
  const logicId = file.includes('Willian') ? 'TORNO_CNC_WILLIAN' : 'TORNO_CNC_HENRIQUE';
  const roleName = file.includes('Willian') ? 'Torno CNC Willian' : 'Torno CNC Henrique';

  const suggestedLogic = `
  const suggestedManualTargets = React.useMemo(() => {
    const query = manualTargetSearch.trim().toLowerCase();
    if (!query) return [];
    return db.items
      .filter((i) => \`\${i.code} - \${i.name}\`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [manualTargetSearch, db.items]);

  const suggestedManualOrders = React.useMemo(() => {
    const query = manualOrderSearch.trim().toLowerCase();
    if (!query) return [];
    return db.orders
      .filter((o) => \`\${o.orderCode} - \${o.customerName}\`.toLowerCase().includes(query))
      .slice(0, 5);
  }, [manualOrderSearch, db.orders]);

  const handleManualProduction = () => {
    if ((!selectedManualTargetId && !selectedManualOrderId) || !manualQty) return;

    const targetName = selectedManualOrderId 
      ? db.orders.find(o => o.id === selectedManualOrderId)?.customerName 
      : db.items.find(i => i.id === selectedManualTargetId)?.name;

    const mProcess = processPerformed === "Outro" ? otherProcess : processPerformed;

    db.addActivePack({
      id: Date.now(),
      itemId: 0,
      color: "N/A",
      size: "N/A",
      variation: "N/A",
      operatorId: currentUser.id,
      startTime: Date.now(),
      type: "${logicId}",
      partName: mProcess,
      customProductName: \`\${targetName} - Qtd \${manualQty}\`,
      thirdPartyName: selectedManualOrderId ? \`Pedido: \${db.orders.find(o => o.id === selectedManualOrderId)?.orderCode}\` : \`Item: \${db.items.find(i => i.id === selectedManualTargetId)?.code}\`,
    });
    
    db.addNotification({
      message: \`Lote Avulso de ${roleName} iniciado (\${targetName})\`,
      read: false,
    });

    setManualTitle("");
    setManualParentItemId(null);
    setManualProductSearch("");
    setManualTargetSearch("");
    setManualOrderSearch("");
    setManualQty("");
    setSelectedManualTargetId(null);
    setSelectedManualOrderId(null);
    setView("LIST_ACTIVE");
  };
`;

  // Swap out old handleManualProduction logic
  const oldHandleManualProductionRegex = /const handleManualProduction = \(\) => \{[\s\S]*?setView\("LIST_ACTIVE"\);\n  \};/m;

  content = content.replace(oldHandleManualProductionRegex, suggestedLogic);

  // Update UI Block
  const replacementUI = `<div className="flex flex-col gap-2 relative">
            <label className="text-sm font-semibold text-gray-700">Selecione Item ou Pedido</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input type="text" placeholder="Buscar componente..." className="border p-2 rounded w-full text-sm" value={manualTargetSearch} onChange={e => {setManualTargetSearch(e.target.value); setSelectedManualTargetId(null);}} />
                {suggestedManualTargets.length > 0 && !selectedManualTargetId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1 mt-1 rounded max-h-40 overflow-y-auto">
                    {suggestedManualTargets.map(i => (
                      <button key={i.id} type="button" onClick={() => { setSelectedManualTargetId(i.id); setManualTargetSearch(\`\${i.code} - \${i.name}\`); setSelectedManualOrderId(null); setManualOrderSearch(""); }} className="block w-full text-left p-1.5 text-xs hover:bg-gray-100">{i.name} ({i.code})</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <input type="text" placeholder="Buscar pedido..." className="border p-2 rounded w-full text-sm" value={manualOrderSearch} onChange={e => {setManualOrderSearch(e.target.value); setSelectedManualOrderId(null);}} />
                {suggestedManualOrders.length > 0 && !selectedManualOrderId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1 mt-1 rounded max-h-40 overflow-y-auto">
                    {suggestedManualOrders.map(o => (
                      <button key={o.id} type="button" onClick={() => { setSelectedManualOrderId(o.id); setManualOrderSearch(\`\${o.orderCode} - \${o.customerName}\`); setSelectedManualTargetId(null); setManualTargetSearch(""); }} className="block w-full text-left p-1.5 text-xs hover:bg-gray-100">{o.customerName} ({o.orderCode})</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-2">
              <label className="text-sm font-semibold text-gray-700">Qtd. a Produzir</label>
              <input type="number" value={manualQty} onChange={e => setManualQty(e.target.value === "" ? "" : Number(e.target.value))} className="border p-2 rounded w-full text-sm focus:outline-indigo-500" min={1} />
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <label className="text-sm font-semibold text-gray-700">
              Processo Executado`;

  const regex = /<div className="flex flex-col gap-1">\s*<label className="text-sm font-semibold text-gray-700">\s*Nome da Peça \/ Componente[\s\S]*?<label className="text-sm font-semibold text-gray-700">\s*Processo Executado/m;
  content = content.replace(regex, replacementUI);

  // Fix button disabled check
  content = content.replace(
    /disabled=\{\!manualTitle \|\| \!manualParentItemId\}/g,
    'disabled={(!selectedManualTargetId && !selectedManualOrderId) || !manualQty}'
  );

  fs.writeFileSync(file, content);
  console.log("Updated UI for", file);
}

writeUpdates('src/TornoCncWillianScreen.tsx');
writeUpdates('src/TornoCncHenriqueScreen.tsx');
