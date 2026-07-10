const fs = require('fs');
function replaceInFile(path, search, replacement) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(search, replacement);
  fs.writeFileSync(path, content);
}

replaceInFile('src/HistoricoProducaoScreen.tsx', /\| "PRENSA_EDUARDO"\n    \| "INJETORA"/g, '| "PRENSA_EDUARDO"\n    | "TORNO_CNC_WILLIAN"\n    | "TORNO_CNC_HENRIQUE"\n    | "INJETORA"');
replaceInFile('src/HistoricoProducaoScreen.tsx', /\| "PRENSA_EDUARDO"\n        \| "INJETORA"/g, '| "PRENSA_EDUARDO"\n        | "TORNO_CNC_WILLIAN"\n        | "TORNO_CNC_HENRIQUE"\n        | "INJETORA"');

let his = fs.readFileSync('src/HistoricoProducaoScreen.tsx', 'utf8');
his = his.replace('<option value="PRENSA_EDUARDO">\n                    PROCESSO ( Prensa Eduardo )\n                  </option>\n                  <option value="INJETORA">', '<option value="PRENSA_EDUARDO">\n                    PROCESSO ( Prensa Eduardo )\n                  </option>\n                  <option value="TORNO_CNC_WILLIAN">\n                    TORNO CNC ( Willian )\n                  </option>\n                  <option value="TORNO_CNC_HENRIQUE">\n                    TORNO CNC ( Henrique )\n                  </option>\n                  <option value="INJETORA">');

his = his.replace('case "PRENSA_EDUARDO":\n              qtyLabel = "Qtd. Prensada (Eduardo)";\n              colorTheme = "teal";\n              break;\n            case "INJETORA":', 'case "PRENSA_EDUARDO":\n              qtyLabel = "Qtd. Prensada (Eduardo)";\n              colorTheme = "teal";\n              break;\n            case "TORNO_CNC_WILLIAN":\n              qtyLabel = "Qtd. Torno (Willian)";\n              colorTheme = "amber";\n              break;\n            case "TORNO_CNC_HENRIQUE":\n              qtyLabel = "Qtd. Torno (Henrique)";\n              colorTheme = "amber";\n              break;\n            case "INJETORA":');
fs.writeFileSync('src/HistoricoProducaoScreen.tsx', his);
