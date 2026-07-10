import { parse } from '@babel/parser';
import fs from 'fs';

const code = fs.readFileSync('src/App.tsx', 'utf8');

try {
  parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  console.log('Parsed successfully!');
} catch(e) {
  console.log('Parse error at line ' + e.loc.line + ' col ' + e.loc.column);
  console.log(e.message);
}
