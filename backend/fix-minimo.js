const fs = require('fs');

const file = 'server-minimo.js';
let content = fs.readFileSync(file, 'utf8');

// The user wants me to comment out code blocks that I already migrated.
// I migrated: Inventory, Dashboard, Movements, AI, etc.
// But the backend uses `server.js` now! Wait, does the user run `server-minimo.js` directly?
// In `server-minimo.js`, I'll find `/api/inventory`, `/api/dashboard`, `/api/movements`, `/api/reports/analyze`.
// Since there's 3600 lines, maybe I just replace `app.get('/api/inventory'` with `// app.get('/api/inventory'`

const routesToComment = [
  '/api/inventory',
  '/api/movements',
  '/api/dashboard',
  '/api/reports/analyze'
];

for (const route of routesToComment) {
  content = content.replace(new RegExp(`app\\.(get|post|put|delete)\\('${route}`, 'g'), '// app.$1(\'' + route);
  content = content.replace(new RegExp(`app\\.use\\('${route}`, 'g'), '// app.use(\'' + route);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed server-minimo.js');
