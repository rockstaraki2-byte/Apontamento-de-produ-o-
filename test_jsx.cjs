const fs = require('fs');
const babel = require('@babel/core');
const code = fs.readFileSync('src/FilaRitmoScreen.tsx', 'utf8');

// try parsing subsets
let lines = code.split('\n');
for (let i = lines.length; i >= 0; i -= 50) {
   let subset = lines.slice(0, i).join('\n');
   try {
      babel.parseSync(subset, { filename: 'a.tsx', presets: ['@babel/preset-typescript', '@babel/preset-react'] });
      console.log('Passed up to', i);
   } catch(e) {
      if (e.message.includes('Unexpected token')) {
         // expected at EOF
      } else {
         console.log(i, e.message);
      }
   }
}
