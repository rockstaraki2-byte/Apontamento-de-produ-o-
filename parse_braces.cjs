const fs = require('fs');
const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');

// A very naive brace matcher skipping comments and strings.
let inString = false;
let stringChar = '';
let inBlockComment = false;
let inLineComment = false;
let braces = [];
let lines = code.split('\n');

for (let r = 0; r < lines.length; r++) {
  let line = lines[r];
  for (let c = 0; c < line.length; c++) {
    let char = line[c];
    let nextChar = line[c+1];

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        c++;
      }
      continue;
    }
    if (inLineComment) {
      break; // next line
    }
    if (inString) {
      if (char === '\\') { c++; continue; }
      if (char === stringChar) { inString = false; }
      continue;
    }

    if (char === '/' && nextChar === '*') { inBlockComment = true; c++; continue; }
    if (char === '/' && nextChar === '/') { inLineComment = true; break; }
    if (char === '"' || char === "'" || char === '`') { inString = true; stringChar = char; continue; }

    if (char === '{') braces.push({r: r+1, c: c+1});
    if (char === '}') {
      if (braces.length === 0) {
         console.log(`Unmatched } at line ${r+1}`);
         process.exit(1);
      }
      braces.pop();
    }
  }
  inLineComment = false;
}
if (braces.length > 0) {
  console.log(`Unmatched { at line ${braces[braces.length-1].r}`);
} else {
  console.log("Braces matched.");
}
