const fs = require('fs');

function updateTornoFinishScreen(file) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Replace PRENSA_OPERATORS
  content = content.replace(
    /const PRENSA_OPERATORS = \[[\s\S]*?\];/g,
    `const PRENSA_OPERATORS = [
    "Willian",
    "Henrique",
    "Marcos",
  ];`
  );

  // 2. Update handleFinish's processPerformed parameter
  content = content.replace(
    /processPerformed: activePack\.processName \|\| "Produção Padrão",/g,
    `processPerformed: processPerformed === "Outro" ? otherProcess : processPerformed,`
  );

  // 3. Inject Process Selection into FINISH_PACK view
  // Search for the Quantity field area and inject before it
  const qtyLabelRegex = /<label className="text-sm font-semibold text-gray-700">\s*Quantidade Pçs Concluídas:\s*<\/label>/;
  const processSelector = `<label className="text-sm font-semibold text-gray-700 mt-2">
                Processo Executado (Finalização)
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
                  placeholder="Qual processo manual?" 
                  value={otherProcess} 
                  onChange={(e) => setOtherProcess(e.target.value)} 
                  className="border p-2 rounded mt-2 focus:outline-indigo-500"
                />
              )}
              <div className="h-2"></div>
              `;

  if (!content.includes('Processo Executado (Finalização)')) {
    content = content.replace(qtyLabelRegex, processSelector + '\n              <label className="text-sm font-semibold text-gray-700">\n                Quantidade Pçs Concluídas:\n              </label>');
  }

  // Also remove the old validation error if missing otherOperatorName (since it's gone)
  content = content.replace(
    /\(selectedOperator === "Outro" && !otherOperatorName\)/g,
    `false`
  );

  // Add processPerformed logic into handleFinish opening
  if (!content.includes('setProcessPerformed(activePack.processName')) {
    content = content.replace(
      /setView\("FINISH_PACK"\);/,
      `setProcessPerformed(activePack.processName || "Torneamento");
    setOtherProcess("");
    setView("FINISH_PACK");`
    );
  }

  fs.writeFileSync(file, content);
  console.log("Updated", file);
}

updateTornoFinishScreen('src/TornoCncWillianScreen.tsx');
updateTornoFinishScreen('src/TornoCncHenriqueScreen.tsx');
