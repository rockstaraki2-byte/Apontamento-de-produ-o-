const fs = require('fs');
const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');

let stack = [];
let i = 0;
while (i < code.length) {
  if (code.slice(i, i+2) === '</') {
    let j = i + 2;
    while (code[j] !== '>') j++;
    const tag = code.slice(i+2, j).split(' ')[0];
    const expected = stack.pop();
    if (tag !== expected) {
      console.log(`Mismatch at index ${i}: expected </${expected}> but found </${tag}>`);
      const lines = code.slice(0, i).split('\n');
      console.log(`Line: ${lines.length}`);
      process.exit(1);
    }
    i = j + 1;
  } else if (code[i] === '<' && code.slice(i, i+2) !== '<!' && code[i+1] !== undefined && !code[i+1].match(/[\s=\/0-9]/)) {
    // maybe opening tag
    let j = i + 1;
    let tagName = "";
    while (code[j] && !code[j].match(/[\s>]/)) {
      tagName += code[j];
      j++;
    }
    // check self-closing
    let k = j;
    while (code[k] !== '>') k++;
    if (code[k-1] !== '/') {
      stack.push(tagName);
    }
    i = k + 1;
  } else {
    i++;
  }
}
console.log("Remaining stack:", stack);
