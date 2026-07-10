const fs = require('fs');

function updateTornoScreen(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Change initial state
  content = content.replace(
    /const \[processPerformed, setProcessPerformed\] = useState<string>\(".*?"\);/,
    'const [processPerformed, setProcessPerformed] = useState<string>("Torneamento");\n  const [otherProcess, setOtherProcess] = useState<string>("");'
  );

  // Use the actual process string
  content = content.replace(
    'const mProcess = options.processPerformed || processPerformed;',
    'const mProcess = options.processPerformed || (processPerformed === "Outro" ? otherProcess : processPerformed);'
  );

  content = content.replace(
    'customProductName: processPerformed,',
    'customProductName: processPerformed === "Outro" ? otherProcess : processPerformed,'
  );

  // Replace select block
  const oldSelectBlockRegex = /<label className="text-sm font-semibold text-gray-700">\s*Processo Executado\s*<\/label>\s*<select[\s\S]*?<\/select>/;
  const newSelectBlock = `<label className="text-sm font-semibold text-gray-700">
              Processo Executado
            </label>
            <select
              value={processPerformed}
              onChange={(e) => setProcessPerformed(e.target.value)}
              className="border p-2 rounded focus:outline-indigo-500 bg-white"
            >
              <option value="Torneamento">Torneamento</option>
              <option value="Corte Serra">Corte Serra</option>
              <option value="1ª Face">1ª Face</option>
              <option value="2ª Face">2ª Face</option>
              <option value="Rebaixo">Rebaixo</option>
              <option value="Facear">Facear</option>
              <option value="Outro">Outro</option>
            </select>
            {processPerformed === "Outro" && (
              <input 
                type="text" 
                placeholder="Qual processo?" 
                value={otherProcess} 
                onChange={(e) => setOtherProcess(e.target.value)} 
                className="border p-2 rounded mt-2 focus:outline-indigo-500"
              />
            )}`;

  content = content.replace(oldSelectBlockRegex, newSelectBlock);

  // Insert Lotes rendering block
  if (!content.includes('db.coilCuttingPlans')) {
    // Let's add a PCP section just above "Pedidos Pendentes"
    const roleType = file.includes('Willian') ? 'TORNO_CNC_WILLIAN' : 'TORNO_CNC_HENRIQUE';
    
    const viewButtonLogic = `
  const startPcpPlan = (planId: number) => {
    const plan = db.coilCuttingPlans?.find(p => p.id === planId);
    if (!plan) return;

    db.addActivePack({
      id: Date.now(),
      itemId: plan.targetItemIds[0] || 0,
      color: "N/A",
      size: "N/A",
      variation: "N/A",
      operatorId: currentUser.id,
      startTime: Date.now(),
      partName: plan.name,
      type: "${roleType}",
      taskId: plan.id,
    });
    db.updateCoilCuttingPlan({...plan, status: "EM_PRODUCAO"});
    setView("LIST_ACTIVE");
  };

  const myPcpPlans = db.coilCuttingPlans?.filter(p => p.type === "${roleType}" && p.status === "PENDENTE") || [];
`;
    // Add logic before the list filtering
    content = content.replace(
      'const activePacksList = db.activePacks.filter(',
      viewButtonLogic + '\n  const activePacksList = db.activePacks.filter('
    );

    const uiSection = `
        {/* Lotes do PCP Section */}
        {myPcpPlans.length > 0 && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mt-2 shadow-sm">
            <h3 className="font-extrabold text-amber-800 mb-3 flex items-center gap-2">
              ⚠️ Lotes PCP Aguardando ({myPcpPlans.length})
            </h3>
            <div className="flex flex-col gap-2">
              {myPcpPlans.map(plan => (
                <div key={plan.id} className="bg-white p-3 rounded-lg border border-amber-100 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{plan.name}</div>
                    <div className="text-xs text-slate-500">Qtd Alvo: {plan.targetQuantity || 'N/A'}</div>
                  </div>
                  <button 
                    onClick={() => startPcpPlan(plan.id)}
                    className="bg-indigo-600 font-bold text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700 transition"
                  >
                    Iniciar Processo
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
`;

    // Inject before ProductivityCard
    content = content.replace(
      '<ProductivityCard db={db} currentUser={currentUser} />',
      uiSection + '\n        <ProductivityCard db={db} currentUser={currentUser} />'
    );
  }

  // Finalize PCP process Finish coil Logic
  // Wait, the regular process uses `handleFinish` directly. It removes active pack. The PCP lote needs its status changed.
  // Oh, `activePack` in `handleFinish` calls `db.removeActivePack`.
  // I should check `activePack.taskId` and if so, update the coilCuttingPlan to CONCLUIDO!
  
  if (!content.includes('db.updateCoilCuttingPlan({ ...plan,')) {
      content = content.replace(
        'db.removeActivePack(activePack.id);',
        `db.removeActivePack(activePack.id);
    if (activePack.taskId) {
      const plan = db.coilCuttingPlans?.find(p => p.id === activePack.taskId);
      if (plan) {
         db.updateCoilCuttingPlan({ ...plan, status: "CONCLUIDO" });
      }
    }`
      );
  }

  fs.writeFileSync(file, content);
  console.log("Updated", file);
}

updateTornoScreen('src/TornoCncWillianScreen.tsx');
updateTornoScreen('src/TornoCncHenriqueScreen.tsx');
