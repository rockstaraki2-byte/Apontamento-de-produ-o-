const fs = require('fs');
const babel = require('@babel/parser');
const { codeFrameColumns } = require('@babel/code-frame');
const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');

try {
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("Parse successful!");
} catch (e) {
  if (e.loc) {
     console.log(codeFrameColumns(code, { start: e.loc }, { highlightCode: false }));
  }
  console.log(e.message);
}
