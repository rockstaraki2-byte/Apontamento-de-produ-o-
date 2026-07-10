const fs = require('fs');
let data = fs.readFileSync('server.ts', 'utf8');
data = data.replace(/gemini-3\.5-flash/g, 'gemini-3.5-flash');
fs.writeFileSync('server.ts', data);
console.log('done!');
