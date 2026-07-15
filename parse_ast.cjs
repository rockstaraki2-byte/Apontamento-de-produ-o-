const fs = require('fs');
const babel = require('@babel/parser');
const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');

const ast = babel.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
  errorRecovery: true
});

for (const node of ast.program.body) {
  if (node.type === 'VariableDeclaration') {
    console.log("Top-level variable:", node.declarations[0].id.name, "at line", node.loc.start.line);
  }
}
