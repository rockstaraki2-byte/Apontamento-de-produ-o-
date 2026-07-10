const fs = require('fs');

function updateTornoStartOs(file) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add otherStartProcess and set default startProcess to "Torneamento"
  const startProcessRegex = /const \[startProcess, setStartProcess\] = useState<string>\(".*?"\);/;
  if (content.match(startProcessRegex)) {
    content = content.replace(
      startProcessRegex,
      `const [startProcess, setStartProcess] = useState<string>("Torneamento");
  const [otherStartProcess, setOtherStartProcess] = useState<string>("");`
    );
  }

  // 2. Change the array of processes
  const oldProcessesArray = `[
                    "Corte",
                    "1ª Dobra",
                    "2ª Dobra",
                    "3ª Dobra",
                    "Dobra Completa",
                    "Repuxo",
                    "Estampo",
                  ]`;
  const newProcessesArray = `[
                    "Torneamento",
                    "Corte Serra",
                    "1ª Face",
                    "2ª Face",
                    "Rebaixo",
                    "Facear",
                    "Outro",
                  ]`;
  content = content.replace(oldProcessesArray, newProcessesArray);

  // 3. Inject the input field for "Outro"
  const processButtonsEndRegex = /<\/div>\s*<\/div>\s*<\/div>\s*<div className="border-t pt-3 flex flex-col gap-2 mt-2 shrink-0">/;
  const processButtonsEndMatch = content.match(processButtonsEndRegex);

  if (processButtonsEndMatch && !content.includes('value={otherStartProcess}')) {
    content = content.replace(
      processButtonsEndRegex,
      `</div>
                {startProcess === "Outro" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      className="w-full border border-slate-300 p-2 text-sm rounded bg-white text-slate-800 focus:outline-indigo-500"
                      placeholder="Descreva o processo a executar"
                      value={otherStartProcess}
                      onChange={(e) => setOtherStartProcess(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="border-t pt-3 flex flex-col gap-2 mt-2 shrink-0">`
    );
  }

  // 4. Update the logic that uses startProcess to save "Outro" -> otherStartProcess
  const createActivePackRegex = /processName: startProcess,/;
  if (content.match(createActivePackRegex)) {
    content = content.replace(
      createActivePackRegex,
      `processName: startProcess === "Outro" ? otherStartProcess : startProcess,`
    );
  }

  // 5. Replace validation logic
  content = content.replace(
    /disabled=\{\s*!startOperator \|\|\s*\(startOperator === "Outro" && !otherStartOperator\) \|\|\s*!startProcess\s*\}/g,
    `disabled={
                    !startOperator ||
                    (startOperator === "Outro" && !otherStartOperator) ||
                    (!startProcess || (startProcess === "Outro" && !otherStartProcess))
                  }`
  );

  content = content.replace(
    /startOperator &&\s*\(startOperator !== "Outro" \|\| otherStartOperator\) &&\s*startProcess/g,
    `startOperator &&
                    (startOperator !== "Outro" || otherStartOperator) &&
                    (startProcess && (startProcess !== "Outro" || !!otherStartProcess))`
  );
  
  fs.writeFileSync(file, content);
  console.log("Updated", file);
}

updateTornoStartOs('src/TornoCncWillianScreen.tsx');
updateTornoStartOs('src/TornoCncHenriqueScreen.tsx');
