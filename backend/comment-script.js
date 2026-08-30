const fs = require('fs');
const file = 'server-minimo.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 269; i < 388; i++) {
  lines[i] = '// MIGRADO: ' + lines[i];
}

for (let i = 1016; i < 1040; i++) {
  lines[i] = '// MIGRADO: ' + lines[i];
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Comentado con éxito.');
