const fs = require('fs');

function writeUpdates(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add state variables
  const stateInsert = `
  const [manualTargetSearch, setManualTargetSearch] = useState("");
  const [manualOrderSearch, setManualOrderSearch] = useState("");
  const [manualTargetQuantity, setManualTargetQuantity] = useState<number | "">("");
  const [selectedManualTargetId, setSelectedManualTargetId] = useState<number | null>(null);
  const [selectedManualOrderId, setSelectedManualOrderId] = useState<number | null>(null);
`;

  content = content.replace(
    '  const [manualProduct, setManualProduct] = useState("");',
    '  const [manualProduct, setManualProduct] = useState("");\n' + stateInsert
  );

  // Suggested values logic
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

  const handleStartManualProduction = () => {
    if ((!selectedManualTargetId && !selectedManualOrderId) || !manualTargetQuantity) return;

    const screenType = "${file.includes('Prensa') ? 'PRENSA_RAFAEL' : 'INJETORA'}";
    const targetName = selectedManualOrderId 
      ? db.orders.find(o => o.id === selectedManualOrderId)?.customerName 
      : db.items.find(i => i.id === selectedManualTargetId)?.name;

    db.addActivePack({
      id: Date.now(),
      itemId: 0, // Avulso
      originalLotQuantity: Number(manualTargetQuantity) || 0,
      startedAt: Date.now(),
      thirdPartyName: selectedManualOrderId ? \`Pedido: \${db.orders.find(o => o.id === selectedManualOrderId)?.orderCode}\` : \`Item: \${db.items.find(i => i.id === selectedManualTargetId)?.code}\`,
      customProductName: \`\${targetName} - Qtd \${manualTargetQuantity}\`,
      partName: file.includes('Prensa') ? "Corte Avulso" : "Injeção Plástica Manual",
      processName: screenType,
    });
    db.addNotification({
      id: Date.now().toString(),
      message: \`Lote Avulso de \${file.includes('Prensa') ? 'Prensa' : 'Injeção'} iniciado (\${targetName})\`,
      timestamp: Date.now(),
      read: false,
    });

    setManualTitle("");
    setManualProduct("");
    setManualTargetSearch("");
    setManualOrderSearch("");
    setManualTargetQuantity("");
    setSelectedManualTargetId(null);
    setSelectedManualOrderId(null);
    setView("LIST_ACTIVE");
  };
`;
  
  if (!content.includes('suggestedManualTargets')) {
    content = content.replace(
      'const handleStartManualProduction = () => {',
      suggestedLogic + '\n  // OMIT'
    );
     // remove old handleStartManualProduction
    content = content.replace(/\/\/ OMIT[\s\S]*?setView\("LIST_ACTIVE"\);\n  \};/, '');
  }

  // UI replace section
  const oldUI = file.includes('Prensa') ? `          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Cliente (Terceiro) ou Origem / Projeto
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500"
              placeholder="Ex: Bobinas Externas ABC"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Descrição das Peças / Produto
            </label>
            <input
              type="text"
              value={manualProduct}
              onChange={(e) => setManualProduct(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500"
              placeholder="Ex: Chapa 3mm Diversos"
            />
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={!manualTitle || !manualProduct}
            className="bg-indigo-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >` : `          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Referência do Cliente / Material Base
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500"
              placeholder="Ex: Pedido ABC Cliente Y"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Peça a ser produzida
            </label>
            <input
              type="text"
              value={manualProduct}
              onChange={(e) => setManualProduct(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500"
              placeholder="Ex: Posição 01 Tampinha Plástica"
            />
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={!manualTitle || !manualProduct}
            className="bg-indigo-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >`;

  const newUI = `          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Selecione Item ou Pedido</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input type="text" placeholder="Buscar componente..." className="border p-2 rounded w-full text-sm" value={manualTargetSearch} onChange={e => {setManualTargetSearch(e.target.value); setSelectedManualTargetId(null);}} />
                {suggestedManualTargets.length > 0 && !selectedManualTargetId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1">
                    {suggestedManualTargets.map(i => (
                      <button key={i.id} type="button" onClick={() => { setSelectedManualTargetId(i.id); setManualTargetSearch(i.name); setSelectedManualOrderId(null); setManualOrderSearch(""); }} className="block w-full text-left p-1 text-sm hover:bg-gray-100">{i.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <input type="text" placeholder="Buscar pedido..." className="border p-2 rounded w-full text-sm" value={manualOrderSearch} onChange={e => {setManualOrderSearch(e.target.value); setSelectedManualOrderId(null);}} />
                {suggestedManualOrders.length > 0 && !selectedManualOrderId && (
                  <div className="absolute left-0 right-0 border bg-white shadow-lg z-50 p-1">
                    {suggestedManualOrders.map(o => (
                      <button key={o.id} type="button" onClick={() => { setSelectedManualOrderId(o.id); setManualOrderSearch(o.customerName); setSelectedManualTargetId(null); setManualTargetSearch(""); }} className="block w-full text-left p-1 text-sm hover:bg-gray-100">{o.customerName}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-2">
              <label className="text-sm font-semibold text-gray-700">Qtd. a Produzir</label>
              <input type="number" value={manualTargetQuantity} onChange={e => setManualTargetQuantity(e.target.value === "" ? "" : Number(e.target.value))} className="border p-2 rounded w-full text-sm" min={1} />
            </div>
          </div>

          <button
            onClick={handleStartManualProduction}
            disabled={(!selectedManualTargetId && !selectedManualOrderId) || !manualTargetQuantity}
            className="bg-indigo-600 font-bold text-white py-3 rounded-lg mt-4 shadow hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >`;

  content = content.replace(oldUI, newUI);
  fs.writeFileSync(file, content);
  console.log("Updated", file);
}

writeUpdates('src/PrensaRafaelScreen.tsx');
writeUpdates('src/InjetoraScreen.tsx');
