import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

let stack = [];
for (let i = 345; i < 786; i++) {
  const line = lines[i];
  let opens = (line.match(/<div/g) || []).length;
  let closes = (line.match(/<\/div>/g) || []).length;
  
  for(let k=0; k<opens; k++) stack.push(i+1);
  for(let k=0; k<closes; k++) stack.pop();
}
console.log("Unclosed divs opened at lines:", stack);
