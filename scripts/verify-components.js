const fs = require('fs');
const path = require('path');

const componentsToCheck = [
  'src/pages/Auth/Login.js',
  'src/pages/Dashboard/Dashboard.js',
  'src/pages/Inventory/Inventory.js',
  'src/pages/Movements/Movements.js',
  'src/pages/Reagents/Reagents.js',
  'src/pages/Recipes/Recipes.js',
  'src/pages/Reports/Reports.js',
  'src/pages/Users/Users.js',
  'src/components/Layout/Layout.js',
  'src/components/Layout/Sidebar.js',
  'src/components/Layout/Header.js'
];

console.log('🔍 Verificando componentes...\n');

let allExist = true;

componentsToCheck.forEach(componentPath => {
  const fullPath = path.join('frontend', componentPath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${componentPath}`);
    
    // Verificar que tenga export default
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes('export default')) {
      console.log(`   ⚠️  Posible problema: falta export default`);
      allExist = false;
    }
  } else {
    console.log(`❌ ${componentPath} - NO EXISTE`);
    allExist = false;
  }
});

console.log('\n' + (allExist ? '🎉 Todos los componentes verificados!' : '⚠️  Hay componentes faltantes o con problemas'));