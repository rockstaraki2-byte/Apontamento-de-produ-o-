const fs = require('fs');
const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');
let openCount = 0;
let closeCount = 0;
for (const char of code) {
  if (char === '{') openCount++;
  if (char === '}') closeCount++;
}
console.log(`{ : ${openCount}, } : ${closeCount}`);
