const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
const str = lines.slice(5590 - 1, 5937).join('\n'); // carefully extract lines 5590 to 5937

// Let's print out lines that have tags, counting opens and closes
let c = 0;
for (let i = 5590 - 1; i < 5937; i++) {
  const line = lines[i];
  const opens = (line.match(/<div[ >]/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  c += opens - closes;
  if(opens > 0 || closes > 0) {
    console.log(`L${i+1} [count: ${c}] (+${opens}/-${closes}) ${line.trim()}`);
  }
}
console.log(`Final count: ${c}`);
