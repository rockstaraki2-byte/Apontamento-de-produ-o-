import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

let stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // A rough approximation just to find lines with <div or </div
  let j = 0;
  while(j < line.length) {
    let openIdx = line.indexOf('<div', j);
    let closeIdx = line.indexOf('</div', j);
    
    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
      stack.push(i + 1);
      j = openIdx + 4;
    } else if (closeIdx !== -1) {
      if (stack.length > 0) stack.pop();
      else console.log("Extra closing div at line", i + 1);
      j = closeIdx + 5;
    } else {
      break;
    }
  }
}
console.log("Unclosed divs opened at lines:", stack);
