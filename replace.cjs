const fs = require('fs');
let content = fs.readFileSync('src/TornoCncWillianScreen.tsx', 'utf8');
content = content.replace(/PrensaEduardo/g, 'TornoCncWillian');
content = content.replace(/PRENSA_EDUARDO/g, 'TORNO_CNC_WILLIAN');
content = content.replace(/Prensa Eduardo/g, 'Torno CNC Willian');
fs.writeFileSync('src/TornoCncWillianScreen.tsx', content);

let contentH = fs.readFileSync('src/TornoCncHenriqueScreen.tsx', 'utf8');
contentH = contentH.replace(/PrensaEduardo/g, 'TornoCncHenrique');
contentH = contentH.replace(/PRENSA_EDUARDO/g, 'TORNO_CNC_HENRIQUE');
contentH = contentH.replace(/Prensa Eduardo/g, 'Torno CNC Henrique');
fs.writeFileSync('src/TornoCncHenriqueScreen.tsx', contentH);
