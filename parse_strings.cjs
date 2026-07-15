const fs = require('fs');
const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');

let inString = false;
let stringChar = '';

for (let i = 0; i < code.length; i++) {
  let char = code[i];
  if (inString) {
    if (char === '\\') { i++; continue; }
    if (char === stringChar) { inString = false; }
  } else {
    if (char === '"' || char === "'" || char === '`') { inString = true; stringChar = char; }
  }
}
if (inString) {
  console.log("Unclosed string:", stringChar);
} else {
  console.log("All strings closed.");
}
