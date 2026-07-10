const fs = require('fs');

let will = fs.readFileSync('src/TornoCncWillianScreen.tsx', 'utf8');
will = will.replace(/"Eduardo"/g, '"Willian"');
will = will.replace(/Máquina Eduardo Ativa/g, 'Máquina Willian Ativa');
fs.writeFileSync('src/TornoCncWillianScreen.tsx', will);

let hen = fs.readFileSync('src/TornoCncHenriqueScreen.tsx', 'utf8');
hen = hen.replace(/"Eduardo"/g, '"Henrique"');
hen = hen.replace(/Máquina Eduardo Ativa/g, 'Máquina Henrique Ativa');
fs.writeFileSync('src/TornoCncHenriqueScreen.tsx', hen);
