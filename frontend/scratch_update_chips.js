const fs = require('fs');
const file = 'c:\\controlab-desa\\frontend\\src\\pages\\CajasFrascos\\GestionCajasFrascos.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update filter logic
content = content.replace(
  /return eq\.includes\('CM 260i'\) \|\| marca\.includes\('wiener'\);/g,
  "if (equipoFiltro === 'Mindray CL-900i') return eq.includes('CL-900i');\n        if (equipoFiltro === 'WONDFO ACCRE') return eq.includes('WONDFO ACCRE');\n        return eq.includes('CM 260i') || marca.includes('wiener');"
);

// 2. Add chips UI
const chipsRegex = /<Chip\s+size="small"\s+label="Mindray BS-230"[^>]+>[^<]*<\/Chip>/m;
const chipMatch = content.match(chipsRegex);

if (chipMatch) {
  const newChips = `
              <Chip
                size="small"
                label="Mindray BS-230"
                clickable
                color={equipoFiltro === 'Mindray BS-230' ? 'info' : 'default'}
                variant={equipoFiltro === 'Mindray BS-230' ? 'filled' : 'outlined'}
                onClick={() => setEquipoFiltro('Mindray BS-230')}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                size="small"
                label="Mindray CL-900i"
                clickable
                color={equipoFiltro === 'Mindray CL-900i' ? 'secondary' : 'default'}
                variant={equipoFiltro === 'Mindray CL-900i' ? 'filled' : 'outlined'}
                onClick={() => setEquipoFiltro('Mindray CL-900i')}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                size="small"
                label="WONDFO ACCRE"
                clickable
                color={equipoFiltro === 'WONDFO ACCRE' ? 'warning' : 'default'}
                variant={equipoFiltro === 'WONDFO ACCRE' ? 'filled' : 'outlined'}
                onClick={() => setEquipoFiltro('WONDFO ACCRE')}
                sx={{ fontWeight: 600 }}
              />
  `;
  content = content.replace(chipMatch[0], newChips);
}

// 3. Rename "Todos Química" to "Todos los Equipos"
content = content.replace(/label="Todos Química"/g, 'label="Todos los Equipos"');

fs.writeFileSync(file, content);
console.log("Frontend UI updated successfully!");
