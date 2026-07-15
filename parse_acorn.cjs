const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');
const ts = require('acorn-typescript');

const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');

try {
  acorn.Parser.extend(jsx(), ts()).parse(code, {
    sourceType: 'module',
    ecmaVersion: 2020,
    locations: true
  });
  console.log("Parse successful!");
} catch (e) {
  console.log(e.message);
  console.log(e.loc);
}
